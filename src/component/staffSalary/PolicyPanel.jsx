import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useUserStore } from '../../store/userStore';
import { useBranchesDropdown } from '../../hooks/useBranchProfilesList';
import {
  useSalaryPolicy,
  useUpsertSalaryPolicy,
} from '../../hooks/useStaffSalary';
import {
  ABSENT_DEDUCTION_MODES,
  POLICY_DEFAULTS,
  STAFF_TYPES,
  STAFF_TYPE_LABELS,
  validatePolicyForm,
} from '../../constants/staffSalary';
import { hasAnyAction, resolveScope } from '../../utils/permissions';
import { useColors } from '../../theme/useColors';
import { COLORS } from '../../theme/colors';

const toForm = (policy) => {
  const base = { ...POLICY_DEFAULTS };
  if (!policy) return base;
  for (const k of Object.keys(POLICY_DEFAULTS)) {
    if (policy[k] !== undefined && policy[k] !== null) base[k] = policy[k];
  }
  return base;
};

function Field({ label, hint, children, C }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={[styles.fieldLabel, { color: C.muted }]}>{label}</Text>
      {children}
      {!!hint && <Text style={[styles.hint, { color: C.mutedSoft }]}>{hint}</Text>}
    </View>
  );
}

function NumberInput({ value, onChange, disabled, C, step = 1 }) {
  return (
    <TextInput
      value={String(value ?? '')}
      onChangeText={(v) => {
        const clean = step === 1 ? v.replace(/[^0-9]/g, '') : v.replace(/[^0-9.]/g, '');
        onChange(clean === '' ? '' : Number(clean));
      }}
      editable={!disabled}
      keyboardType="decimal-pad"
      style={[
        styles.input,
        {
          color: C.text,
          borderColor: C.border,
          backgroundColor: disabled ? C.bg : C.bg,
          opacity: disabled ? 0.6 : 1,
        },
      ]}
    />
  );
}

function Section({ title, children, C }) {
  return (
    <View style={[styles.section, { backgroundColor: C.card, borderColor: C.border }]}>
      <Text style={[styles.sectionTitle, { color: C.muted }]}>{title.toUpperCase()}</Text>
      <View style={{ gap: 12 }}>{children}</View>
    </View>
  );
}

export default function PolicyPanel() {
  const C = useColors();
  const { user } = useUserStore();

  const scope = resolveScope(user?.role, 'view-staff-salary-policy');
  const isOrgLevel = scope === 'all';
  const canView = scope !== 'none';
  const canEdit = hasAnyAction(user?.role, [
    'update-staff-salary-policy',
    'update-all-branch-staff-salary-policy',
    'create-staff-salary-policy',
    'create-all-branch-staff-salary-policy',
  ]);

  const userBranchId =
    (typeof user?.branchId === 'string' && user.branchId) ||
    user?.branchId?._id ||
    user?.branch?._id ||
    '';

  const [tab, setTab] = useState(STAFF_TYPES[0]);
  const [branchId, setBranchId] = useState(isOrgLevel ? '' : userBranchId);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(toForm(null));

  const { data: branchData } = useBranchesDropdown({ enabled: isOrgLevel });
  const branches = branchData?.data || [];
  const effectiveBranchId = isOrgLevel ? branchId : userBranchId;

  const { data: policyResp, isFetching } = useSalaryPolicy({
    branchId: effectiveBranchId,
    staffType: tab,
    enabled: canView,
  });
  const policy = policyResp?.data ?? null;

  useEffect(() => {
    setCreating(false);
    setForm(toForm(policy));
  }, [policy, effectiveBranchId, tab]);

  const initialForm = useMemo(() => toForm(policy), [policy]);
  const isDirty = useMemo(
    () =>
      Object.keys(POLICY_DEFAULTS).some(
        (k) => String(form[k]) !== String(initialForm[k]),
      ),
    [form, initialForm],
  );

  const upsert = useUpsertSalaryPolicy();

  const onSave = () => {
    if (!effectiveBranchId) {
      Toast.show({ type: 'error', text1: 'Pick a branch first' });
      return;
    }
    const err = validatePolicyForm(form);
    if (err) {
      Toast.show({ type: 'error', text1: 'Invalid', text2: err });
      return;
    }
    upsert.mutate(
      {
        branchId: effectiveBranchId,
        staffType: tab,
        ...form,
      },
      { onSuccess: () => setCreating(false) },
    );
  };

  if (!canView) {
    return (
      <View style={[styles.empty, { backgroundColor: C.card, borderColor: C.border, margin: 14 }]}>
        <Feather name="lock" size={28} color={COLORS.red} />
        <Text style={[styles.emptyText, { color: C.muted }]}>
          You don't have permission to view salary policies.
        </Text>
      </View>
    );
  }

  const showForm = !!policy || creating;
  const formDisabled = !canEdit;

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {isOrgLevel && (
        <View style={[styles.section, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[styles.sectionTitle, { color: C.muted }]}>BRANCH</Text>
          <View style={styles.chipRow}>
            {branches.map((b) => {
              const active = branchId === b._id;
              return (
                <Pressable
                  key={b._id}
                  onPress={() => setBranchId(b._id)}
                  style={({ pressed }) => [
                    styles.chip,
                    { backgroundColor: C.bg, borderColor: C.border },
                    active && styles.chipActive,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: C.text },
                      active && styles.chipTextActive,
                    ]}
                  >
                    {b.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* Staff type tabs */}
      <View style={[styles.tabsRow, { borderBottomColor: C.border }]}>
        {STAFF_TYPES.map((t) => {
          const active = tab === t;
          return (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={[
                styles.tabBtn,
                { borderBottomColor: active ? COLORS.brand : 'transparent' },
              ]}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  { color: active ? COLORS.brand : C.muted },
                ]}
              >
                {STAFF_TYPE_LABELS[t]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {!effectiveBranchId ? (
        <View style={[styles.empty, { backgroundColor: C.card, borderColor: C.border }]}>
          <Feather name="briefcase" size={28} color={C.mutedSoft} />
          <Text style={[styles.emptyText, { color: C.muted }]}>
            Pick a branch to view or edit its policy.
          </Text>
        </View>
      ) : isFetching && !policy && !creating ? (
        <View style={[styles.empty, { backgroundColor: C.card, borderColor: C.border }]}>
          <ActivityIndicator size="large" color={COLORS.brand} />
        </View>
      ) : !showForm ? (
        <View style={[styles.empty, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={styles.emptyIcon}>
            <Feather name="layers" size={24} color={COLORS.brand} />
          </View>
          <Text style={[styles.emptyTitle, { color: C.text }]}>
            No {STAFF_TYPE_LABELS[tab].toLowerCase()} policy yet
          </Text>
          <Text style={[styles.emptyText, { color: C.muted }]}>
            Until a policy is set, payslip generation falls back to a simple pro-rate
            (basic / 26 × unpaid days; absences and unpaid leave count 1, half-days ½).
          </Text>
          {canEdit && (
            <Pressable
              onPress={() => {
                setForm(toForm(null));
                setCreating(true);
              }}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && { opacity: 0.9 },
              ]}
            >
              <Feather name="plus" size={14} color="#fff" />
              <Text style={styles.primaryBtnText}>Create Policy</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <>
          {creating && (
            <View style={styles.infoBox}>
              <Feather name="info" size={14} color="#0f766e" />
              <Text style={styles.infoText}>
                Defaults shown below — adjust and tap{' '}
                <Text style={{ fontWeight: '800' }}>Create Policy</Text> to save.
              </Text>
            </View>
          )}

          <Section title="Working days" C={C}>
            <Field
              label="Working days per month"
              hint="Used as denominator for per-day rate (basic ÷ working days)."
              C={C}
            >
              <NumberInput
                value={form.workingDaysPerMonth}
                onChange={(v) => setForm((p) => ({ ...p, workingDaysPerMonth: v }))}
                disabled={formDisabled}
                C={C}
              />
            </Field>
          </Section>

          <Section title="Absent rules" C={C}>
            <Field
              label="Free absences per month"
              hint="The first N absences each month don't deduct from pay."
              C={C}
            >
              <NumberInput
                value={form.freeAbsencesPerMonth}
                onChange={(v) => setForm((p) => ({ ...p, freeAbsencesPerMonth: v }))}
                disabled={formDisabled}
                C={C}
              />
            </Field>

            <Field label="Deduction mode" C={C}>
              <View style={styles.chipRow}>
                {ABSENT_DEDUCTION_MODES.map((m) => {
                  const active = form.absentDeductionMode === m;
                  return (
                    <Pressable
                      key={m}
                      onPress={() =>
                        !formDisabled &&
                        setForm((p) => ({ ...p, absentDeductionMode: m }))
                      }
                      disabled={formDisabled}
                      style={({ pressed }) => [
                        styles.chip,
                        { backgroundColor: C.bg, borderColor: C.border },
                        active && styles.chipActive,
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: C.text },
                          active && styles.chipTextActive,
                        ]}
                      >
                        {m === 'per-day' ? 'Per-day rate' : 'Fixed amount'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Field>

            {form.absentDeductionMode === 'per-day' ? (
              <Field
                label="Per-day multiplier"
                hint="Each billable absence = perDayRate × multiplier. 1.0 means full day."
                C={C}
              >
                <NumberInput
                  value={form.absentDeductionMultiplier}
                  onChange={(v) =>
                    setForm((p) => ({ ...p, absentDeductionMultiplier: v }))
                  }
                  disabled={formDisabled}
                  C={C}
                  step={0.1}
                />
              </Field>
            ) : (
              <Field
                label="Fixed amount per absence"
                hint="Each billable absence deducts this exact amount."
                C={C}
              >
                <NumberInput
                  value={form.absentDeductionAmount}
                  onChange={(v) =>
                    setForm((p) => ({ ...p, absentDeductionAmount: v }))
                  }
                  disabled={formDisabled}
                  C={C}
                />
              </Field>
            )}
          </Section>

          <Section title="Late rules" C={C}>
            <Field
              label="Free lates per month"
              hint="This many or fewer lates per month don't deduct."
              C={C}
            >
              <NumberInput
                value={form.freeLatesPerMonth}
                onChange={(v) => setForm((p) => ({ ...p, freeLatesPerMonth: v }))}
                disabled={formDisabled}
                C={C}
              />
            </Field>
            <Field
              label="Lates per group"
              hint="Every N billable lates count as one late-group."
              C={C}
            >
              <NumberInput
                value={form.lateGroupSize}
                onChange={(v) => setForm((p) => ({ ...p, lateGroupSize: v }))}
                disabled={formDisabled}
                C={C}
              />
            </Field>
            <Field
              label="Days deducted per group"
              hint="0.5 = half-day deduction per group."
              C={C}
            >
              <NumberInput
                value={form.lateDeductionDays}
                onChange={(v) => setForm((p) => ({ ...p, lateDeductionDays: v }))}
                disabled={formDisabled}
                C={C}
                step={0.1}
              />
            </Field>
          </Section>

          <Section title="Half-day & leaves" C={C}>
            <Field
              label="Half-day factor"
              hint="0.5 = each half-day deducts half a day's pay."
              C={C}
            >
              <NumberInput
                value={form.halfDayDeductionFactor}
                onChange={(v) => setForm((p) => ({ ...p, halfDayDeductionFactor: v }))}
                disabled={formDisabled}
                C={C}
                step={0.1}
              />
            </Field>
            <Field
              label="Unpaid-leave factor"
              hint="1.0 = unpaid leave deducts full day's pay."
              C={C}
            >
              <NumberInput
                value={form.unpaidLeaveDeductionFactor}
                onChange={(v) =>
                  setForm((p) => ({ ...p, unpaidLeaveDeductionFactor: v }))
                }
                disabled={formDisabled}
                C={C}
                step={0.1}
              />
            </Field>
            <Field
              label="Paid-leave factor"
              hint="0 = paid leave doesn't deduct."
              C={C}
            >
              <NumberInput
                value={form.paidLeaveDeductionFactor}
                onChange={(v) =>
                  setForm((p) => ({ ...p, paidLeaveDeductionFactor: v }))
                }
                disabled={formDisabled}
                C={C}
                step={0.1}
              />
            </Field>
          </Section>

          <Section title="Bonuses" C={C}>
            <Field label="Overtime bonus per hour" C={C}>
              <NumberInput
                value={form.overtimeBonusPerHour}
                onChange={(v) => setForm((p) => ({ ...p, overtimeBonusPerHour: v }))}
                disabled={formDisabled}
                C={C}
              />
            </Field>
            <Field
              label="Perfect attendance bonus"
              hint="Awarded when the month has zero absences and zero lates."
              C={C}
            >
              <NumberInput
                value={form.perfectAttendanceBonus}
                onChange={(v) => setForm((p) => ({ ...p, perfectAttendanceBonus: v }))}
                disabled={formDisabled}
                C={C}
              />
            </Field>
          </Section>

          {canEdit && (
            <View style={styles.actionRow}>
              {creating && (
                <Pressable
                  onPress={() => {
                    setCreating(false);
                    setForm(toForm(policy));
                  }}
                  style={({ pressed }) => [
                    styles.ghostBtn,
                    { borderColor: C.border, backgroundColor: C.card },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text style={[styles.ghostBtnText, { color: C.text }]}>Cancel</Text>
                </Pressable>
              )}
              <Pressable
                onPress={onSave}
                disabled={formDisabled || upsert.isPending || (!creating && !isDirty)}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  styles.saveBtn,
                  (upsert.isPending || pressed || (!creating && !isDirty)) && {
                    opacity: 0.85,
                  },
                ]}
              >
                {upsert.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Feather name="save" size={14} color="#fff" />
                    <Text style={styles.primaryBtnText}>
                      {policy ? 'Save Changes' : 'Create Policy'}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, paddingBottom: 32, gap: 12 },

  section: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 12,
  },
  sectionTitle: { fontSize: 11, letterSpacing: 1.1, fontWeight: '800' },

  fieldLabel: { fontSize: 11, fontWeight: '700' },
  hint: { fontSize: 11 },

  input: {
    height: 42,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText: { fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#fff' },

  tabsRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 2,
  },
  tabBtnText: { fontSize: 13, fontWeight: '700' },

  empty: {
    borderRadius: 14,
    paddingVertical: 28,
    paddingHorizontal: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 10,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: COLORS.brand + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 15, fontWeight: '800' },
  emptyText: { fontSize: 12, textAlign: 'center', lineHeight: 18 },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ccfbf1',
    borderColor: '#99f6e4',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  infoText: { color: '#0f766e', fontSize: 12, flex: 1 },

  actionRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 999,
    backgroundColor: COLORS.brand,
  },
  saveBtn: { flex: 1 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  ghostBtn: {
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostBtnText: { fontWeight: '700', fontSize: 13 },
});
