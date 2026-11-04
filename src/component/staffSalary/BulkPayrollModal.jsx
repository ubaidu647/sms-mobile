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
import { useBranchesDropdown } from '../../hooks/useBranchProfilesList';
import { useGenerateBulkPayslips } from '../../hooks/useStaffSalary';
import {
  STAFF_TYPES,
  previousMonth,
  titleCase,
} from '../../constants/staffSalary';
import { payslipMonthError } from '../../utils/payslipInput';
import { useColors } from '../../theme/useColors';
import { COLORS } from '../../theme/colors';

export default function BulkPayrollModal({ open, onClose }) {
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

  const [branchId, setBranchId] = useState('');
  const [month, setMonth] = useState(previousMonth());
  const [staffType, setStaffType] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!open) return;
    setBranchId(canAllBranch ? '' : userBranchId);
    setMonth(previousMonth());
    setStaffType('');
    setResult(null);
  }, [open, canAllBranch, userBranchId]);

  const { data: branchData } = useBranchesDropdown({ enabled: canAllBranch && open });
  const branches = branchData?.data || [];

  const bulk = useGenerateBulkPayslips({
    onSuccess: (data) => setResult(data),
  });

  const handleSubmit = () => {
    if (!branchId) {
      Toast.show({ type: 'error', text1: 'Branch is required' });
      return;
    }
    const monthError = payslipMonthError(month);
    if (monthError) {
      Toast.show({ type: 'error', text1: monthError });
      return;
    }
    const payload = { branchId, month: month.trim() };
    if (staffType) payload.staffType = staffType;
    bulk.mutate(payload);
  };

  const created = useMemo(
    () => (result?.results || []).filter((r) => r.status === 'created'),
    [result],
  );
  const skipped = useMemo(
    () => (result?.results || []).filter((r) => r.status === 'skipped'),
    [result],
  );

  return (
    <Modal visible={open} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safe, { backgroundColor: C.card }]} edges={['top', 'bottom']}>
        <View style={[styles.header, { borderBottomColor: C.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: C.text }]}>Run Payroll (Bulk)</Text>
            <Text style={[styles.subtitle, { color: C.muted }]}>
              Generate payslips for an entire branch in one go
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
            {!result ? (
              <>
                {canAllBranch ? (
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
                ) : (
                  <View style={styles.infoBox}>
                    <Feather name="info" size={14} color="#0f766e" />
                    <Text style={styles.infoText}>
                      Branch: <Text style={{ fontWeight: '800' }}>your branch</Text>
                    </Text>
                  </View>
                )}

                <View style={styles.row2}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: C.muted }]}>MONTH *</Text>
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
                </View>

                <View>
                  <Text style={[styles.label, { color: C.muted }]}>STAFF TYPE</Text>
                  <View style={styles.chipRow}>
                    <Pressable
                      onPress={() => setStaffType('')}
                      style={({ pressed }) => [
                        styles.chip,
                        { backgroundColor: C.bg, borderColor: C.border },
                        !staffType && styles.chipActive,
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: C.text },
                          !staffType && styles.chipTextActive,
                        ]}
                      >
                        All
                      </Text>
                    </Pressable>
                    {STAFF_TYPES.map((t) => {
                      const active = staffType === t;
                      return (
                        <Pressable
                          key={t}
                          onPress={() => setStaffType(t)}
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
                            {titleCase(t)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <Pressable
                  onPress={handleSubmit}
                  disabled={bulk.isPending}
                  style={({ pressed }) => [
                    styles.submit,
                    (bulk.isPending || pressed) && { opacity: 0.85 },
                  ]}
                >
                  {bulk.isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Feather name="play" size={16} color="#fff" />
                      <Text style={styles.submitText}>Run Bulk</Text>
                    </>
                  )}
                </Pressable>
              </>
            ) : (
              <>
                <View style={styles.statsRow}>
                  <Stat label="Total" value={result.total ?? 0} bg="#f3f4f6" fg="#374151" />
                  <Stat
                    label="Created"
                    value={result.created ?? 0}
                    bg="#dcfce7"
                    fg="#166534"
                  />
                  <Stat
                    label="Skipped"
                    value={result.skipped ?? 0}
                    bg="#fef3c7"
                    fg="#92400e"
                  />
                </View>

                {skipped.length > 0 && (
                  <View>
                    <Text style={[styles.label, { color: C.muted }]}>
                      SKIPPED ({skipped.length})
                    </Text>
                    <View style={[styles.skippedList, { borderColor: '#fde68a' }]}>
                      {skipped.map((r, i) => (
                        <View key={i} style={styles.skippedRow}>
                          <Text style={styles.skippedId} numberOfLines={1}>
                            {r.staffId}
                          </Text>
                          <Text style={styles.skippedReason} numberOfLines={2}>
                            {r.reason || '—'}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {created.length > 0 && (
                  <View style={styles.infoBox}>
                    <Feather name="check-circle" size={14} color="#166534" />
                    <Text style={[styles.infoText, { color: '#166534' }]}>
                      Generated {created.length} draft payslips. Review them in the Payslips tab.
                    </Text>
                  </View>
                )}

                <Pressable
                  onPress={onClose}
                  style={({ pressed }) => [
                    styles.submit,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Feather name="check" size={16} color="#fff" />
                  <Text style={styles.submitText}>Close</Text>
                </Pressable>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function Stat({ label, value, bg, fg }) {
  return (
    <View style={[styles.stat, { backgroundColor: bg }]}>
      <Text style={[styles.statLabel, { color: fg }]}>{label.toUpperCase()}</Text>
      <Text style={[styles.statValue, { color: fg }]}>{value}</Text>
    </View>
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

  statsRow: { flexDirection: 'row', gap: 8 },
  stat: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  statLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1.1 },
  statValue: { fontSize: 22, fontWeight: '800', marginTop: 2 },

  skippedList: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  skippedRow: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#fde68a',
    gap: 2,
  },
  skippedId: { fontFamily: 'System', fontSize: 11, color: '#374151', fontWeight: '600' },
  skippedReason: { fontSize: 11, color: '#6b7280' },

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
