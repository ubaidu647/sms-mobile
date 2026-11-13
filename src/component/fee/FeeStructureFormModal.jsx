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
import KeyboardAvoidingView from '../KeyboardAvoidingView';
import ToastModal from '../ToastModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useUserStore } from '../../store/userStore';
import { useBranchesDropdown } from '../../hooks/useBranchProfilesList';
import {
  useClassesForFee,
  useCreateFeeStructure,
  useUpdateFeeStructure,
} from '../../hooks/useFees';
import {
  FEE_FREQUENCIES,
  MONTH_OPTIONS,
  currentAcademicYear,
  formatMoney,
  titleCase,
} from '../../constants/fee';
import { useColors } from '../../theme/useColors';
import { COLORS } from '../../theme/colors';
import { useSchoolCurrency } from '../../hooks/useSchoolCurrency';

const blankComponent = () => ({
  name: '',
  amount: '',
  frequency: 'monthly',
  billingMonth: '',
  isOptional: false,
  appliesDiscount: true,
  description: '',
});

export default function FeeStructureFormModal({ open, structure, onClose }) {
  const { symbol: currencySymbol } = useSchoolCurrency();
  const isEdit = !!structure;
  const C = useColors();
  const { user } = useUserStore();

  const isAdmin = !!user?.role?.isPredefined;
  const canAllBranch =
    isAdmin || !!user?.role?.actions?.includes('create-all-branch-fee');
  const userBranchId =
    (typeof user?.branchId === 'string' && user.branchId) ||
    user?.branchId?._id ||
    user?.branch?._id ||
    '';

  const [name, setName] = useState('');
  const [branchId, setBranchId] = useState('');
  const [academicYear, setAcademicYear] = useState(currentAcademicYear());
  const [classId, setClassId] = useState('');
  const [components, setComponents] = useState([blankComponent()]);
  const [defaultDueDay, setDefaultDueDay] = useState('10');
  const [lateFeePerDay, setLateFeePerDay] = useState('0');

  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      setName(structure.name || '');
      setBranchId(structure.branchId || '');
      setAcademicYear(structure.academicYear || currentAcademicYear());
      setClassId(structure.classId?._id || structure.classId || '');
      setComponents(
        (structure.components || []).map((c) => ({
          name: c.name || '',
          amount: c.amount != null ? String(c.amount) : '',
          frequency: c.frequency || 'monthly',
          billingMonth: c.billingMonth != null ? String(c.billingMonth) : '',
          isOptional: !!c.isOptional,
          appliesDiscount: c.appliesDiscount !== false,
          description: c.description || '',
        })),
      );
      setDefaultDueDay(String(structure.defaultDueDay ?? 10));
      setLateFeePerDay(String(structure.lateFeePerDay ?? 0));
    } else {
      setName('');
      setBranchId(canAllBranch ? '' : userBranchId);
      setAcademicYear(currentAcademicYear());
      setClassId('');
      setComponents([blankComponent()]);
      setDefaultDueDay('10');
      setLateFeePerDay('0');
    }
  }, [open, isEdit, structure, canAllBranch, userBranchId]);

  useEffect(() => {
    if (!isEdit) {
      setClassId('');
    }
  }, [branchId, academicYear, isEdit]);

  const { data: branchData } = useBranchesDropdown({
    enabled: canAllBranch && open && !isEdit,
  });
  const branches = branchData?.data || [];

  const { data: classData } = useClassesForFee({
    branchId: branchId || undefined,
    academicYear,
    enabled: open && !isEdit && !!branchId,
  });
  const classes = classData?.data || [];

  const totals = useMemo(() => {
    let monthly = 0;
    let annual = 0;
    let oneTime = 0;
    let quarterly = 0;
    components.forEach((c) => {
      const amt = Number(c.amount) || 0;
      if (c.frequency === 'monthly') monthly += amt;
      else if (c.frequency === 'annual') annual += amt;
      else if (c.frequency === 'quarterly') quarterly += amt;
      else oneTime += amt;
    });
    return { monthly, annual, oneTime, quarterly };
  }, [components]);

  const create = useCreateFeeStructure({ onSuccess: () => onClose() });
  const update = useUpdateFeeStructure({ id: structure?._id, onSuccess: () => onClose() });
  const mut = isEdit ? update : create;

  const addComponent = () => setComponents((prev) => [...prev, blankComponent()]);
  const removeComponent = (idx) =>
    setComponents((prev) => prev.filter((_, i) => i !== idx));
  const updateComponent = (idx, patch) =>
    setComponents((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));

  const validate = () => {
    if (!name.trim()) return 'Name is required';
    if (!isEdit && !classId) return 'Class is required';
    if (!academicYear.trim()) return 'Academic year is required';
    if (!components.length) return 'Add at least one component';
    for (let i = 0; i < components.length; i++) {
      const c = components[i];
      if (!c.name.trim()) return `Component #${i + 1}: name required`;
      if (c.amount === '' || Number(c.amount) < 0)
        return `Component #${i + 1}: amount must be ≥ 0`;
      if ((c.frequency === 'annual' || c.frequency === 'quarterly') && !c.billingMonth)
        return `Component #${i + 1}: billing month required for ${c.frequency}`;
    }
    const dueDay = Number(defaultDueDay);
    if (!Number.isFinite(dueDay) || dueDay < 1 || dueDay > 31)
      return 'Default due day must be 1–31';
    if (lateFeePerDay !== '' && Number(lateFeePerDay) < 0)
      return 'Late fee per day must be ≥ 0';
    return null;
  };

  const submit = () => {
    const err = validate();
    if (err) {
      Toast.show({ type: 'error', text1: 'Invalid', text2: err });
      return;
    }
    const clean = components.map((c) => {
      const out = {
        name: c.name.trim(),
        amount: Number(c.amount),
        frequency: c.frequency,
        isOptional: !!c.isOptional,
        appliesDiscount: !!c.appliesDiscount,
      };
      if (c.billingMonth) out.billingMonth = Number(c.billingMonth);
      if (c.description?.trim()) out.description = c.description.trim();
      return out;
    });
    const payload = {
      name: name.trim(),
      components: clean,
      defaultDueDay: Number(defaultDueDay),
    };
    if (lateFeePerDay !== '') payload.lateFeePerDay = Number(lateFeePerDay);
    if (!isEdit) {
      payload.classId = classId;
      payload.academicYear = academicYear;
    }
    mut.mutate(payload);
  };

  return (
    <ToastModal
      visible={open}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.safe, { backgroundColor: C.card }]} edges={['top', 'bottom']}>
        <View style={[styles.header, { borderBottomColor: C.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: C.text }]}>
              {isEdit ? 'Edit Fee Structure' : 'New Fee Structure'}
            </Text>
            <Text style={[styles.subtitle, { color: C.muted }]}>
              {isEdit
                ? 'Update components, due day and late fee'
                : 'Define components for a class for an academic year'}
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={10}
            style={({ pressed }) => [
              styles.closeBtn,
              { backgroundColor: C.bg },
              pressed && { opacity: 0.6 },
            ]}
          >
            <Feather name="x" size={20} color={C.text} />
          </Pressable>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View>
              <Text style={[styles.label, { color: C.muted }]}>NAME *</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Grade 5 — 2025-26 Fee Structure"
                placeholderTextColor={C.mutedSoft}
                style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
              />
            </View>

            {!isEdit && (
              <>
                {canAllBranch && branches.length > 0 && (
                  <View>
                    <Text style={[styles.label, { color: C.muted }]}>BRANCH *</Text>
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

                <View>
                  <Text style={[styles.label, { color: C.muted }]}>ACADEMIC YEAR *</Text>
                  <TextInput
                    value={academicYear}
                    onChangeText={setAcademicYear}
                    placeholder="2025-2026"
                    placeholderTextColor={C.mutedSoft}
                    keyboardType="numbers-and-punctuation"
                    autoCapitalize="none"
                    style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
                  />
                </View>

                <View>
                  <Text style={[styles.label, { color: C.muted }]}>CLASS *</Text>
                  {!branchId || classes.length === 0 ? (
                    <Text style={[styles.helper, { color: C.mutedSoft }]}>
                      {!branchId ? 'Pick branch first.' : 'No classes available.'}
                    </Text>
                  ) : (
                    <View style={styles.chipRow}>
                      {classes.map((c) => {
                        const active = classId === c._id;
                        return (
                          <Pressable
                            key={c._id}
                            onPress={() => setClassId(c._id)}
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
                              {c.name}
                              {c.grade ? ` · Gr ${c.grade}` : ''}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>
              </>
            )}

            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: C.muted }]}>DEFAULT DUE DAY *</Text>
                <TextInput
                  value={defaultDueDay}
                  onChangeText={(v) => setDefaultDueDay(v.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  placeholder="10"
                  placeholderTextColor={C.mutedSoft}
                  style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: C.muted }]}>LATE FEE / DAY</Text>
                <TextInput
                  value={lateFeePerDay}
                  onChangeText={(v) => setLateFeePerDay(v.replace(/[^0-9.]/g, ''))}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={C.mutedSoft}
                  style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
                />
              </View>
            </View>

            <View style={styles.componentsHeader}>
              <Text style={[styles.label, { color: C.muted, marginBottom: 0 }]}>
                COMPONENTS ({components.length})
              </Text>
              <Pressable
                onPress={addComponent}
                style={({ pressed }) => [
                  styles.addBtn,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Feather name="plus" size={12} color="#fff" />
                <Text style={styles.addBtnText}>Add</Text>
              </Pressable>
            </View>

            {components.map((c, idx) => (
              <View
                key={idx}
                style={[styles.componentCard, { backgroundColor: C.bg, borderColor: C.border }]}
              >
                <View style={styles.compHeader}>
                  <TextInput
                    value={c.name}
                    onChangeText={(v) => updateComponent(idx, { name: v })}
                    placeholder={`Component #${idx + 1} name`}
                    placeholderTextColor={C.mutedSoft}
                    style={[
                      styles.compName,
                      { color: C.text, borderColor: C.border, backgroundColor: C.card },
                    ]}
                  />
                  <Pressable
                    onPress={() => removeComponent(idx)}
                    hitSlop={6}
                    style={({ pressed }) => [styles.removeBtn, pressed && { opacity: 0.6 }]}
                  >
                    <Feather name="trash-2" size={16} color="#dc2626" />
                  </Pressable>
                </View>

                <View style={styles.compRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.miniLabel, { color: C.mutedSoft }]}>AMOUNT</Text>
                    <TextInput
                      value={c.amount}
                      onChangeText={(v) => updateComponent(idx, { amount: v.replace(/[^0-9.]/g, '') })}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor={C.mutedSoft}
                      style={[
                        styles.timeInput,
                        { color: C.text, borderColor: C.border, backgroundColor: C.card },
                      ]}
                    />
                  </View>
                  <View style={{ flex: 1.5 }}>
                    <Text style={[styles.miniLabel, { color: C.mutedSoft }]}>FREQUENCY</Text>
                    <View style={styles.chipRow}>
                      {FEE_FREQUENCIES.map((f) => {
                        const active = c.frequency === f;
                        return (
                          <Pressable
                            key={f}
                            onPress={() => updateComponent(idx, { frequency: f })}
                            style={({ pressed }) => [
                              styles.miniChip,
                              { backgroundColor: C.card, borderColor: C.border },
                              active && {
                                backgroundColor: COLORS.brand,
                                borderColor: COLORS.brand,
                              },
                              pressed && { opacity: 0.85 },
                            ]}
                          >
                            <Text
                              style={[
                                styles.miniChipText,
                                { color: active ? '#fff' : C.text },
                              ]}
                            >
                              {titleCase(f)}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                </View>

                {(c.frequency === 'annual' || c.frequency === 'quarterly') && (
                  <View>
                    <Text style={[styles.miniLabel, { color: C.mutedSoft }]}>BILLING MONTH</Text>
                    <View style={styles.chipRow}>
                      {MONTH_OPTIONS.map((m) => {
                        const active = String(c.billingMonth) === String(m.value);
                        return (
                          <Pressable
                            key={m.value}
                            onPress={() => updateComponent(idx, { billingMonth: m.value })}
                            style={({ pressed }) => [
                              styles.miniChip,
                              { backgroundColor: C.card, borderColor: C.border },
                              active && {
                                backgroundColor: COLORS.brand,
                                borderColor: COLORS.brand,
                              },
                              pressed && { opacity: 0.85 },
                            ]}
                          >
                            <Text
                              style={[
                                styles.miniChipText,
                                { color: active ? '#fff' : C.text },
                              ]}
                            >
                              {m.label.slice(0, 3)}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                )}

                <View style={styles.toggleRow}>
                  <Pressable
                    onPress={() => updateComponent(idx, { isOptional: !c.isOptional })}
                    style={({ pressed }) => [
                      styles.toggle,
                      {
                        backgroundColor: c.isOptional ? '#fef3c7' : C.card,
                        borderColor: c.isOptional ? '#fde68a' : C.border,
                      },
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Feather
                      name={c.isOptional ? 'check-square' : 'square'}
                      size={13}
                      color={c.isOptional ? '#92400e' : C.mutedSoft}
                    />
                    <Text style={[styles.toggleText, { color: c.isOptional ? '#92400e' : C.text }]}>
                      Optional
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => updateComponent(idx, { appliesDiscount: !c.appliesDiscount })}
                    style={({ pressed }) => [
                      styles.toggle,
                      {
                        backgroundColor: c.appliesDiscount ? '#dcfce7' : C.card,
                        borderColor: c.appliesDiscount ? '#86efac' : C.border,
                      },
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Feather
                      name={c.appliesDiscount ? 'check-square' : 'square'}
                      size={13}
                      color={c.appliesDiscount ? '#166534' : C.mutedSoft}
                    />
                    <Text style={[styles.toggleText, { color: c.appliesDiscount ? '#166534' : C.text }]}>
                      Applies Discount
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}

            <View style={[styles.totalsCard, { borderColor: '#99f6e4', backgroundColor: '#f0fdfa' }]}>
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Monthly</Text>
                <Text style={styles.totalsValue}>{formatMoney(totals.monthly, currencySymbol)}</Text>
              </View>
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>One-time</Text>
                <Text style={styles.totalsValue}>{formatMoney(totals.oneTime, currencySymbol)}</Text>
              </View>
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Annual</Text>
                <Text style={styles.totalsValue}>{formatMoney(totals.annual, currencySymbol)}</Text>
              </View>
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Quarterly</Text>
                <Text style={styles.totalsValue}>{formatMoney(totals.quarterly, currencySymbol)}</Text>
              </View>
            </View>

            <Pressable
              onPress={submit}
              disabled={mut.isPending}
              style={({ pressed }) => [
                styles.submit,
                (mut.isPending || pressed) && { opacity: 0.85 },
              ]}
            >
              {mut.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="check" size={16} color="#fff" />
                  <Text style={styles.submitText}>
                    {isEdit ? 'Save Changes' : 'Create Structure'}
                  </Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ToastModal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  title: { fontSize: 19, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 4 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: 16, paddingBottom: 32, gap: 14 },

  label: { fontSize: 10, letterSpacing: 1.1, fontWeight: '700', marginBottom: 6 },
  miniLabel: { fontSize: 9, letterSpacing: 1.1, fontWeight: '700', marginBottom: 4 },
  helper: { fontSize: 12 },

  input: {
    height: 42,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  row2: { flexDirection: 'row', gap: 10 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: 220,
  },
  chipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText: { fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#fff' },

  componentsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    height: 30,
    borderRadius: 999,
    backgroundColor: COLORS.brand,
  },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 11 },

  componentCard: { borderRadius: 12, padding: 10, borderWidth: 1, gap: 8 },
  compHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  compName: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 13,
    fontWeight: '600',
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compRow: { flexDirection: 'row', gap: 8 },
  timeInput: {
    height: 36,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 13,
    fontWeight: '700',
  },
  miniChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  miniChipText: { fontSize: 11, fontWeight: '700' },

  toggleRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  toggleText: { fontSize: 11, fontWeight: '700' },

  totalsCard: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalsLabel: { fontSize: 12, color: '#0f766e', fontWeight: '700' },
  totalsValue: { fontSize: 13, color: '#0f766e', fontWeight: '800' },

  submit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.brand,
    height: 48,
    borderRadius: 12,
    marginTop: 8,
  },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
