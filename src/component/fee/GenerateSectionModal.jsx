import { useEffect, useState } from 'react';
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
import {
  useClassesForFee,
  useGenerateForSection,
  useRegenerateForSection,
  useSectionsForFee,
} from '../../hooks/useFees';
import {
  currentAcademicYear,
  currentMonth,
} from '../../constants/fee';
import { useColors } from '../../theme/useColors';
import { COLORS } from '../../theme/colors';

export default function GenerateSectionModal({ open, mode = 'generate', onClose }) {
  const isRegenerate = mode === 'regenerate';
  const C = useColors();
  const { user } = useUserStore();

  const isAdmin = !!user?.role?.isPredefined;
  const canAllBranch =
    isAdmin || !!user?.role?.actions?.includes('generate-all-branch-voucher');
  const userBranchId =
    (typeof user?.branchId === 'string' && user.branchId) ||
    user?.branchId?._id ||
    user?.branch?._id ||
    '';

  const [branchId, setBranchId] = useState(canAllBranch ? '' : userBranchId);
  const [academicYear, setAcademicYear] = useState(currentAcademicYear());
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [month, setMonth] = useState(currentMonth());
  const [dueDate, setDueDate] = useState('');
  const [reason, setReason] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setBranchId(canAllBranch ? '' : userBranchId);
    setAcademicYear(currentAcademicYear());
    setClassId('');
    setSectionId('');
    setMonth(currentMonth());
    setDueDate('');
    setReason('');
    setResult(null);
    setError('');
  }, [open, canAllBranch, userBranchId]);

  useEffect(() => {
    setClassId('');
    setSectionId('');
  }, [branchId, academicYear]);
  useEffect(() => {
    setSectionId('');
  }, [classId]);

  const { data: branchData } = useBranchesDropdown({ enabled: canAllBranch && open });
  const branches = branchData?.data || [];

  const { data: classData } = useClassesForFee({
    branchId: branchId || undefined,
    academicYear,
    enabled: open && !!branchId,
  });
  const classes = classData?.data || [];

  const { data: sectionData } = useSectionsForFee({
    classId,
    enabled: open && !!classId,
  });
  const sections = sectionData?.data || [];

  const gen = useGenerateForSection({ onSuccess: setResult, onError: setError });
  const regen = useRegenerateForSection({ onSuccess: setResult, onError: setError });
  const mut = isRegenerate ? regen : gen;

  const submit = () => {
    if (!sectionId) {
      Toast.show({ type: 'error', text1: 'Section is required' });
      return;
    }
    if (!month) {
      Toast.show({ type: 'error', text1: 'Month is required' });
      return;
    }
    if (isRegenerate && !reason.trim()) {
      Toast.show({ type: 'error', text1: 'Reason is required' });
      return;
    }
    const payload = { sectionId, month };
    if (dueDate) payload.dueDate = dueDate;
    if (isRegenerate) payload.reason = reason.trim();
    setError('');
    mut.mutate(payload);
  };

  return (
    <Modal
      visible={open}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.safe, { backgroundColor: C.card }]} edges={['top', 'bottom']}>
        <View style={[styles.header, { borderBottomColor: C.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: C.text }]}>
              {isRegenerate ? 'Regenerate Section' : 'Generate Section Vouchers'}
            </Text>
            <Text style={[styles.subtitle, { color: C.muted }]}>
              {isRegenerate
                ? 'Void unpaid vouchers and create new ones for the section'
                : 'Create monthly vouchers for every student in a section'}
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
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {result ? (
              <View style={styles.resultCard}>
                <View style={styles.statRow}>
                  {result.regenerated != null && (
                    <Stat
                      label="Regenerated"
                      value={result.regenerated}
                      bg="#dbeafe"
                      fg="#1e40af"
                    />
                  )}
                  <Stat label="Created" value={result.created} bg="#dcfce7" fg="#166534" />
                  <Stat label="Skipped" value={result.skippedCount} bg="#fef3c7" fg="#92400e" />
                </View>

                {result.skipped.length > 0 && (
                  <View
                    style={[
                      styles.warnBox,
                      styles.skipBox,
                      { backgroundColor: '#fef3c7', borderColor: '#fde68a' },
                    ]}
                  >
                    <View style={styles.skipHead}>
                      <Feather name="alert-triangle" size={14} color="#92400e" />
                      <Text style={[styles.warnText, { color: '#92400e', fontWeight: '700' }]}>
                        {result.skipped.length === 1
                          ? '1 student was skipped'
                          : `${result.skipped.length} students were skipped`}
                      </Text>
                    </View>
                    {result.skipped.map((s, i) => (
                      <View key={`${s.studentId}-${i}`} style={styles.skipRow}>
                        <Text style={[styles.skipName, { color: '#78350f' }]}>
                          {s.name || `Student ${s.studentId.slice(-6)}`}
                        </Text>
                        <Text style={[styles.warnText, { color: '#92400e' }]}>{s.reason}</Text>
                      </View>
                    ))}
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
                  <Text style={styles.submitText}>Done</Text>
                </Pressable>
              </View>
            ) : (
              <>
                {canAllBranch && branches.length > 0 && (
                  <View>
                    <Text style={[styles.label, { color: C.muted }]}>BRANCH</Text>
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
                  <Text style={[styles.label, { color: C.muted }]}>ACADEMIC YEAR</Text>
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
                  {!branchId ? (
                    <Text style={[styles.helper, { color: C.mutedSoft }]}>
                      Pick branch first.
                    </Text>
                  ) : classes.length === 0 ? (
                    <Text style={[styles.helper, { color: C.mutedSoft }]}>
                      No classes for this year.
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

                <View>
                  <Text style={[styles.label, { color: C.muted }]}>SECTION *</Text>
                  {!classId ? (
                    <Text style={[styles.helper, { color: C.mutedSoft }]}>
                      Pick class first.
                    </Text>
                  ) : sections.length === 0 ? (
                    <Text style={[styles.helper, { color: C.mutedSoft }]}>
                      No sections.
                    </Text>
                  ) : (
                    <View style={styles.chipRow}>
                      {sections.map((s) => {
                        const active = sectionId === s._id;
                        return (
                          <Pressable
                            key={s._id}
                            onPress={() => setSectionId(s._id)}
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
                              {s.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>

                <View style={styles.row2}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: C.muted }]}>MONTH *</Text>
                    <TextInput
                      value={month}
                      onChangeText={setMonth}
                      placeholder="2026-06"
                      placeholderTextColor={C.mutedSoft}
                      keyboardType="numbers-and-punctuation"
                      autoCapitalize="none"
                      style={[
                        styles.input,
                        { color: C.text, borderColor: C.border, backgroundColor: C.bg },
                      ]}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: C.muted }]}>DUE DATE</Text>
                    <TextInput
                      value={dueDate}
                      onChangeText={setDueDate}
                      placeholder="optional"
                      placeholderTextColor={C.mutedSoft}
                      keyboardType="numbers-and-punctuation"
                      autoCapitalize="none"
                      style={[
                        styles.input,
                        { color: C.text, borderColor: C.border, backgroundColor: C.bg },
                      ]}
                    />
                  </View>
                </View>

                {isRegenerate && (
                  <View>
                    <Text style={[styles.label, { color: C.muted }]}>REASON *</Text>
                    <TextInput
                      value={reason}
                      onChangeText={setReason}
                      placeholder="e.g. fee revision"
                      placeholderTextColor={C.mutedSoft}
                      style={[
                        styles.input,
                        { color: C.text, borderColor: C.border, backgroundColor: C.bg },
                      ]}
                    />
                  </View>
                )}

                {!!error && <ErrorBox message={error} />}

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
                      <Feather name={isRegenerate ? 'refresh-cw' : 'plus'} size={16} color="#fff" />
                      <Text style={styles.submitText}>
                        {isRegenerate ? 'Regenerate' : 'Generate'}
                      </Text>
                    </>
                  )}
                </Pressable>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function ErrorBox({ message }) {
  return (
    <View style={[styles.warnBox, { backgroundColor: '#fee2e2', borderColor: '#fecaca' }]}>
      <Feather name="alert-circle" size={14} color="#991b1b" />
      <Text style={[styles.warnText, { color: '#991b1b' }]}>{message}</Text>
    </View>
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

  resultCard: { gap: 12 },
  statRow: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 10, alignItems: 'center' },
  statLabel: { fontSize: 9, letterSpacing: 1.1, fontWeight: '800' },
  statValue: { fontSize: 22, fontWeight: '800', marginTop: 2 },

  warnBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  warnText: { fontSize: 12, flex: 1 },
  skipBox: { flexDirection: 'column', alignItems: 'stretch' },
  skipHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  skipRow: { gap: 2, paddingTop: 6 },
  skipName: { fontSize: 12, fontWeight: '700' },
});
