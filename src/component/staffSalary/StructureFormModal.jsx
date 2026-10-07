import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useUserStore } from '../../store/userStore';
import {
  useCreateStructure,
  useStaffDropdown,
  useUpdateStructure,
} from '../../hooks/useStaffSalary';
import { COMPONENT_TYPES, formatMoney, toYMD } from '../../constants/staffSalary';
import { componentTotal, round2 } from '../../utils/money';
import { useColors } from '../../theme/useColors';
import { COLORS } from '../../theme/colors';

const blank = () => ({ name: '', amount: '', type: 'fixed' });

export default function StructureFormModal({ open, onClose, structure }) {
  const isEdit = !!structure;
  const C = useColors();
  const { user } = useUserStore();

  const isAdmin = !!user?.role?.isPredefined;
  const canCreateAllBranch =
    isAdmin || !!user?.role?.actions?.includes('create-all-branch-staff-salary');
  const userBranchId =
    (typeof user?.branchId === 'string' && user.branchId) ||
    user?.branchId?._id ||
    user?.branch?._id ||
    '';

  const [staffId, setStaffId] = useState('');
  const [basicSalary, setBasicSalary] = useState('');
  const [currency, setCurrency] = useState('PKR');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [effectiveTo, setEffectiveTo] = useState('');
  const [allowances, setAllowances] = useState([]);
  const [deductions, setDeductions] = useState([]);
  const [notes, setNotes] = useState('');

  const { data: staffData } = useStaffDropdown({
    branchId: canCreateAllBranch ? undefined : userBranchId,
    enabled: open && !isEdit,
  });
  const staffList = useMemo(() => staffData?.data || [], [staffData]);

  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      setStaffId(structure.staffId?._id || structure.staffId || '');
      setBasicSalary(structure.basicSalary != null ? String(structure.basicSalary) : '');
      setCurrency(structure.currency || 'PKR');
      setEffectiveFrom(toYMD(structure.effectiveFrom));
      setEffectiveTo(toYMD(structure.effectiveTo));
      setAllowances(
        (structure.allowances || []).map((a) => ({
          name: a.name || '',
          amount: a.amount != null ? String(a.amount) : '',
          type: a.type || 'fixed',
        })),
      );
      setDeductions(
        (structure.deductions || []).map((d) => ({
          name: d.name || '',
          amount: d.amount != null ? String(d.amount) : '',
          type: d.type || 'fixed',
        })),
      );
      setNotes(structure.notes || '');
    } else {
      setStaffId('');
      setBasicSalary('');
      setCurrency('PKR');
      setEffectiveFrom('');
      setEffectiveTo('');
      setAllowances([]);
      setDeductions([]);
      setNotes('');
    }
  }, [open, isEdit, structure]);

  // Prefill basic salary from staff record once a staff is picked.
  useEffect(() => {
    if (isEdit || !staffId) return;
    const s = staffList.find((x) => x._id === staffId);
    if (!s) return;
    if (s.salary != null) setBasicSalary(String(s.salary));
  }, [staffId, staffList, isEdit]);

  const totals = useMemo(() => {
    // Same maths as the API's payroll, rounded to paisa.
    const basic = Number(basicSalary) || 0;
    const totalAllowance = componentTotal(basic, allowances);
    const totalDeduction = componentTotal(basic, deductions);
    return {
      gross: round2(basic + totalAllowance),
      net: round2(basic + totalAllowance - totalDeduction),
      totalAllowance,
      totalDeduction,
    };
  }, [basicSalary, allowances, deductions]);

  const create = useCreateStructure({ onSuccess: () => onClose() });
  const update = useUpdateStructure({ id: structure?._id, onSuccess: () => onClose() });
  const mut = isEdit ? update : create;

  const validate = () => {
    if (!isEdit && !staffId) return 'Staff is required';
    if (basicSalary === '' || Number(basicSalary) < 0) return 'Basic salary must be ≥ 0';
    if (!effectiveFrom) return 'Effective from date is required';
    for (let i = 0; i < allowances.length; i++) {
      const a = allowances[i];
      if (!a.name?.trim()) return `Allowance #${i + 1}: name required`;
      if (a.amount === '' || Number(a.amount) < 0)
        return `Allowance #${i + 1}: amount must be ≥ 0`;
      if (a.type === 'percent' && Number(a.amount) > 100)
        return `Allowance #${i + 1}: percent cannot exceed 100`;
    }
    for (let i = 0; i < deductions.length; i++) {
      const d = deductions[i];
      if (!d.name?.trim()) return `Deduction #${i + 1}: name required`;
      if (d.amount === '' || Number(d.amount) < 0)
        return `Deduction #${i + 1}: amount must be ≥ 0`;
      if (d.type === 'percent' && Number(d.amount) > 100)
        return `Deduction #${i + 1}: percent cannot exceed 100`;
    }
    return null;
  };

  const handleSubmit = () => {
    const err = validate();
    if (err) {
      Toast.show({ type: 'error', text1: 'Invalid', text2: err });
      return;
    }
    const clean = (arr) =>
      arr.map((c) => ({ name: c.name.trim(), amount: Number(c.amount), type: c.type }));

    const payload = {
      basicSalary: Number(basicSalary),
      currency: currency || 'PKR',
      effectiveFrom,
      allowances: clean(allowances),
      deductions: clean(deductions),
    };
    if (effectiveTo) payload.effectiveTo = effectiveTo;
    if (notes?.trim()) payload.notes = notes.trim();
    if (!isEdit) payload.staffId = staffId;

    mut.mutate(payload);
  };

  const renderComponentRows = (list, setList, kind) => (
    <View style={{ gap: 8 }}>
      {list.map((c, i) => (
        <View key={i} style={styles.componentRow}>
          <TextInput
            value={c.name}
            onChangeText={(v) =>
              setList((prev) => prev.map((x, idx) => (idx === i ? { ...x, name: v } : x)))
            }
            placeholder="Name (e.g. HRA)"
            placeholderTextColor={C.mutedSoft}
            style={[
              styles.input,
              styles.inputName,
              { color: C.text, borderColor: C.border, backgroundColor: C.bg },
            ]}
          />
          <TextInput
            value={c.amount}
            onChangeText={(v) =>
              setList((prev) =>
                prev.map((x, idx) =>
                  idx === i ? { ...x, amount: v.replace(/[^0-9.]/g, '') } : x,
                ),
              )
            }
            placeholder="Amount"
            placeholderTextColor={C.mutedSoft}
            keyboardType="decimal-pad"
            style={[
              styles.input,
              styles.inputAmount,
              { color: C.text, borderColor: C.border, backgroundColor: C.bg },
            ]}
          />
          <View style={[styles.typePicker, { backgroundColor: C.bg, borderColor: C.border }]}>
            {COMPONENT_TYPES.map((t) => {
              const active = c.type === t;
              return (
                <Pressable
                  key={t}
                  onPress={() =>
                    setList((prev) => prev.map((x, idx) => (idx === i ? { ...x, type: t } : x)))
                  }
                  style={[
                    styles.typeBtn,
                    active && { backgroundColor: COLORS.brand },
                  ]}
                >
                  <Text style={[styles.typeBtnText, { color: active ? '#fff' : C.text }]}>
                    {t === 'percent' ? '%' : 'PKR'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable
            onPress={() => setList((prev) => prev.filter((_, idx) => idx !== i))}
            hitSlop={6}
            style={({ pressed }) => [styles.removeBtn, pressed && { opacity: 0.6 }]}
          >
            <Feather name="trash-2" size={16} color="#dc2626" />
          </Pressable>
        </View>
      ))}
      <Pressable
        onPress={() => setList((prev) => [...prev, blank()])}
        style={({ pressed }) => [
          styles.addBtn,
          { borderColor: C.border },
          pressed && { opacity: 0.85 },
        ]}
      >
        <Feather name="plus" size={14} color={COLORS.brand} />
        <Text style={[styles.addBtnText, { color: COLORS.brand }]}>Add {kind}</Text>
      </Pressable>
    </View>
  );

  return (
    <Modal visible={open} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safe, { backgroundColor: C.card }]} edges={['top', 'bottom']}>
        <View style={[styles.header, { borderBottomColor: C.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: C.text }]}>
              {isEdit ? 'Edit Salary Structure' : 'New Salary Structure'}
            </Text>
            <Text style={[styles.subtitle, { color: C.muted }]}>
              {isEdit
                ? 'Update breakdown and effective dates'
                : 'Define basic, allowances, and deductions'}
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={10}
            style={({ pressed }) => [styles.closeBtn, { backgroundColor: C.bg }, pressed && { opacity: 0.6 }]}
          >
            <Feather name="x" size={20} color={C.text} />
          </Pressable>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.section, { color: C.muted }]}>BASICS</Text>

            {!isEdit && (
              <View>
                <Text style={[styles.label, { color: C.muted }]}>STAFF *</Text>
                {staffList.length === 0 ? (
                  <ActivityIndicator size="small" color={COLORS.brand} />
                ) : (
                  <View style={styles.chipRow}>
                    {staffList.map((s) => {
                      const active = staffId === s._id;
                      const label = s.user?.name || s.userId?.name || s.name || 'Staff';
                      return (
                        <Pressable
                          key={s._id}
                          onPress={() => setStaffId(s._id)}
                          style={({ pressed }) => [
                            styles.staffChip,
                            { backgroundColor: C.bg, borderColor: C.border },
                            active && styles.staffChipActive,
                            pressed && { opacity: 0.85 },
                          ]}
                        >
                          <Text
                            style={[
                              styles.staffChipText,
                              { color: C.text },
                              active && styles.staffChipTextActive,
                            ]}
                            numberOfLines={1}
                          >
                            {label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            )}

            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: C.muted }]}>BASIC SALARY *</Text>
                <TextInput
                  value={basicSalary}
                  onChangeText={(v) => setBasicSalary(v.replace(/[^0-9.]/g, ''))}
                  keyboardType="decimal-pad"
                  placeholder="80000"
                  placeholderTextColor={C.mutedSoft}
                  style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: C.muted }]}>CURRENCY</Text>
                <TextInput
                  value={currency}
                  onChangeText={(v) => setCurrency(v.toUpperCase().slice(0, 6))}
                  placeholder="PKR"
                  placeholderTextColor={C.mutedSoft}
                  autoCapitalize="characters"
                  style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
                />
              </View>
            </View>

            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: C.muted }]}>EFFECTIVE FROM *</Text>
                <TextInput
                  value={effectiveFrom}
                  onChangeText={setEffectiveFrom}
                  placeholder="2026-06-01"
                  placeholderTextColor={C.mutedSoft}
                  keyboardType="numbers-and-punctuation"
                  autoCapitalize="none"
                  style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: C.muted }]}>EFFECTIVE TO</Text>
                <TextInput
                  value={effectiveTo}
                  onChangeText={setEffectiveTo}
                  placeholder="optional"
                  placeholderTextColor={C.mutedSoft}
                  keyboardType="numbers-and-punctuation"
                  autoCapitalize="none"
                  style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
                />
              </View>
            </View>

            <Text style={[styles.section, { color: C.muted }]}>
              ALLOWANCES ({allowances.length})
            </Text>
            {renderComponentRows(allowances, setAllowances, 'Allowance')}

            <Text style={[styles.section, { color: C.muted }]}>
              DEDUCTIONS ({deductions.length})
            </Text>
            {renderComponentRows(deductions, setDeductions, 'Deduction')}

            <View style={[styles.totalsCard, { borderColor: '#99f6e4', backgroundColor: '#f0fdfa' }]}>
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Total Allowances</Text>
                <Text style={styles.totalsValue}>
                  + {totals.totalAllowance.toLocaleString()}
                </Text>
              </View>
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Total Deductions</Text>
                <Text style={styles.totalsValue}>
                  − {totals.totalDeduction.toLocaleString()}
                </Text>
              </View>
              <View style={[styles.totalsRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#99f6e4', paddingTop: 6 }]}>
                <Text style={[styles.totalsLabel, { fontWeight: '800' }]}>Net (estimate)</Text>
                <Text style={[styles.totalsValue, { color: '#0f766e', fontSize: 16 }]}>
                  {formatMoney(totals.net, currency)}
                </Text>
              </View>
            </View>

            <View>
              <Text style={[styles.label, { color: C.muted }]}>NOTES</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                multiline
                placeholder="Optional"
                placeholderTextColor={C.mutedSoft}
                style={[
                  styles.input,
                  { height: 70, color: C.text, borderColor: C.border, backgroundColor: C.bg, textAlignVertical: 'top', paddingTop: 10 },
                ]}
              />
            </View>

            <Pressable
              onPress={handleSubmit}
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
    </Modal>
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

  section: { fontSize: 11, letterSpacing: 1.1, fontWeight: '800', marginTop: 8 },
  label: { fontSize: 10, letterSpacing: 1.1, fontWeight: '700', marginBottom: 6 },

  input: {
    height: 42,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },

  row2: { flexDirection: 'row', gap: 10 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  staffChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: 200,
  },
  staffChipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  staffChipText: { fontSize: 12, fontWeight: '600' },
  staffChipTextActive: { color: '#fff' },

  componentRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  inputName: { flex: 2 },
  inputAmount: { flex: 1.2 },
  typePicker: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
    height: 42,
  },
  typeBtn: {
    paddingHorizontal: 10,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBtnText: { fontSize: 11, fontWeight: '700' },
  removeBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: 'flex-start',
    borderStyle: 'dashed',
  },
  addBtnText: { fontSize: 12, fontWeight: '700' },

  totalsCard: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 6 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalsLabel: { fontSize: 12, color: '#0f766e', fontWeight: '700' },
  totalsValue: { fontSize: 14, color: '#0f766e', fontWeight: '800' },

  submit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.brand,
    height: 48,
    borderRadius: 12,
    marginTop: 12,
  },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
