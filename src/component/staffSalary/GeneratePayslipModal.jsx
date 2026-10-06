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
  useActiveStructure,
  useGeneratePayslip,
  useStaffDropdown,
} from '../../hooks/useStaffSalary';
import { formatMoney, previousMonth } from '../../constants/staffSalary';
import { useColors } from '../../theme/useColors';
import { COLORS } from '../../theme/colors';

export default function GeneratePayslipModal({ open, onClose }) {
  const C = useColors();
  const { user } = useUserStore();

  const isAdmin = !!user?.role?.isPredefined;
  const canAllBranch =
    isAdmin || !!user?.role?.actions?.includes('generate-all-branch-payslip');
  const userBranchId =
    (typeof user?.branchId === 'string' && user.branchId) ||
    user?.branchId?._id ||
    user?.branch?._id ||
    '';

  const [staffId, setStaffId] = useState('');
  const [month, setMonth] = useState(previousMonth());
  const [bonus, setBonus] = useState('');
  const [tax, setTax] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    setStaffId('');
    setMonth(previousMonth());
    setBonus('');
    setTax('');
    setNotes('');
  }, [open]);

  const { data: staffData } = useStaffDropdown({
    branchId: canAllBranch ? undefined : userBranchId,
    enabled: open,
  });
  const staffList = useMemo(() => staffData?.data || [], [staffData]);

  const { data: activeStruct, isFetching: structLoading } = useActiveStructure({
    staffId,
    enabled: open && !!staffId,
  });
  // The hook resolves to the structure or null (none active) — never the envelope.
  const struct = activeStruct || null;
  const noStruct = !!staffId && !structLoading && !struct;

  const gen = useGeneratePayslip({ onSuccess: () => onClose() });

  const handleSubmit = () => {
    if (!staffId) {
      Toast.show({ type: 'error', text1: 'Staff is required' });
      return;
    }
    if (!month) {
      Toast.show({ type: 'error', text1: 'Month is required' });
      return;
    }
    const payload = { staffId, month };
    if (bonus !== '' && !Number.isNaN(Number(bonus))) payload.bonus = Number(bonus);
    if (tax !== '' && !Number.isNaN(Number(tax))) payload.tax = Number(tax);
    if (notes?.trim()) payload.notes = notes.trim();
    gen.mutate(payload);
  };

  return (
    <Modal visible={open} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safe, { backgroundColor: C.card }]} edges={['top', 'bottom']}>
        <View style={[styles.header, { borderBottomColor: C.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: C.text }]}>Generate Payslip</Text>
            <Text style={[styles.subtitle, { color: C.muted }]}>
              Create a draft payslip for a staff member for a specific month
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
            <View>
              <Text style={[styles.label, { color: C.muted }]}>STAFF *</Text>
              {staffList.length === 0 ? (
                <ActivityIndicator size="small" color={COLORS.brand} />
              ) : (
                <View style={styles.chipRow}>
                  {staffList.map((s) => {
                    const active = staffId === s._id;
                    const name = s.user?.name || s.userId?.name || s.name || '?';
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
                          {name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            {staffId && (
              <>
                {structLoading ? (
                  <ActivityIndicator size="small" color={COLORS.brand} />
                ) : noStruct ? (
                  <View style={styles.warnBox}>
                    <Feather name="alert-triangle" size={14} color="#92400e" />
                    <Text style={styles.warnText}>
                      No active salary structure for this staff. Define one in Structures first.
                    </Text>
                  </View>
                ) : struct ? (
                  <View style={styles.infoBox}>
                    <Feather name="info" size={14} color="#0f766e" />
                    <Text style={styles.infoText}>
                      Basic: <Text style={{ fontWeight: '800' }}>{formatMoney(struct.basicSalary, struct.currency)}</Text>
                      {' · '}Allowances: <Text style={{ fontWeight: '800' }}>{(struct.allowances || []).length}</Text>
                      {' · '}Deductions: <Text style={{ fontWeight: '800' }}>{(struct.deductions || []).length}</Text>
                    </Text>
                  </View>
                ) : null}
              </>
            )}

            <View>
              <Text style={[styles.label, { color: C.muted }]}>MONTH (YYYY-MM) *</Text>
              <TextInput
                value={month}
                onChangeText={setMonth}
                placeholder="2026-05"
                placeholderTextColor={C.mutedSoft}
                keyboardType="numbers-and-punctuation"
                autoCapitalize="none"
                style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
              />
            </View>

            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: C.muted }]}>BONUS</Text>
                <TextInput
                  value={bonus}
                  onChangeText={(v) => setBonus(v.replace(/[^0-9.]/g, ''))}
                  keyboardType="decimal-pad"
                  placeholder="optional"
                  placeholderTextColor={C.mutedSoft}
                  style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: C.muted }]}>TAX</Text>
                <TextInput
                  value={tax}
                  onChangeText={(v) => setTax(v.replace(/[^0-9.]/g, ''))}
                  keyboardType="decimal-pad"
                  placeholder="optional"
                  placeholderTextColor={C.mutedSoft}
                  style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
                />
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
              disabled={gen.isPending}
              style={({ pressed }) => [
                styles.submit,
                (gen.isPending || pressed) && { opacity: 0.85 },
              ]}
            >
              {gen.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="check" size={16} color="#fff" />
                  <Text style={styles.submitText}>Generate Payslip</Text>
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
    maxWidth: 220,
  },
  staffChipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  staffChipText: { fontSize: 12, fontWeight: '600' },
  staffChipTextActive: { color: '#fff' },

  warnBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef3c7',
    borderColor: '#fde68a',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  warnText: { color: '#92400e', fontSize: 12, flex: 1 },

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
