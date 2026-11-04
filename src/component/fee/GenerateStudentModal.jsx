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
  useGenerateForStudent,
  useSectionsForFee,
  useStudentsForFee,
} from '../../hooks/useFees';
import { currentAcademicYear, currentMonth } from '../../constants/fee';
import { useColors } from '../../theme/useColors';
import { COLORS } from '../../theme/colors';

export default function GenerateStudentModal({ open, onClose }) {
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
  const [studentId, setStudentId] = useState('');
  const [month, setMonth] = useState(currentMonth());
  const [dueDate, setDueDate] = useState('');
  // A refusal (409 etc.) or a "not generated" reason, shown in full in the form.
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (!open) return;
    setBranchId(canAllBranch ? '' : userBranchId);
    setAcademicYear(currentAcademicYear());
    setClassId('');
    setSectionId('');
    setStudentId('');
    setMonth(currentMonth());
    setDueDate('');
    setNotice(null);
  }, [open, canAllBranch, userBranchId]);

  useEffect(() => {
    setClassId('');
    setSectionId('');
    setStudentId('');
  }, [branchId, academicYear]);
  useEffect(() => {
    setSectionId('');
    setStudentId('');
  }, [classId]);
  useEffect(() => {
    setStudentId('');
  }, [sectionId]);

  const { data: branchData } = useBranchesDropdown({ enabled: canAllBranch && open });
  const branches = branchData?.data || [];

  const { data: classData } = useClassesForFee({
    branchId: branchId || undefined,
    academicYear,
    enabled: open && !!branchId,
  });
  const classes = classData?.data || [];

  const { data: sectionData } = useSectionsForFee({ classId, enabled: open && !!classId });
  const sections = sectionData?.data || [];

  const { data: studentRes } = useStudentsForFee({
    sectionId,
    enabled: open && !!sectionId,
  });
  const students = studentRes?.data || [];

  const gen = useGenerateForStudent({
    onSuccess: () => onClose(),
    onSkipped: (reason) => setNotice({ kind: 'skipped', message: reason }),
    onError: (message) => setNotice({ kind: 'error', message }),
  });

  const submit = () => {
    if (!studentId) {
      Toast.show({ type: 'error', text1: 'Student is required' });
      return;
    }
    if (!month) {
      Toast.show({ type: 'error', text1: 'Month is required' });
      return;
    }
    const payload = { studentId, month };
    if (dueDate) payload.dueDate = dueDate;
    setNotice(null);
    gen.mutate(payload);
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
            <Text style={[styles.title, { color: C.text }]}>Generate Single Student Voucher</Text>
            <Text style={[styles.subtitle, { color: C.muted }]}>
              Create a voucher for one student for a month
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
              {!branchId || classes.length === 0 ? (
                <Text style={[styles.helper, { color: C.mutedSoft }]}>
                  {!branchId ? 'Pick branch first.' : 'No classes.'}
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
              {!classId || sections.length === 0 ? (
                <Text style={[styles.helper, { color: C.mutedSoft }]}>
                  {!classId ? 'Pick class first.' : 'No sections.'}
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

            <View>
              <Text style={[styles.label, { color: C.muted }]}>STUDENT *</Text>
              {!sectionId || students.length === 0 ? (
                <Text style={[styles.helper, { color: C.mutedSoft }]}>
                  {!sectionId ? 'Pick section first.' : 'No students.'}
                </Text>
              ) : (
                <View style={styles.chipRow}>
                  {students.map((s) => {
                    const active = studentId === s._id;
                    return (
                      <Pressable
                        key={s._id}
                        onPress={() => setStudentId(s._id)}
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
                          numberOfLines={1}
                        >
                          {s.user?.name || s.name || '?'}
                          {s.rollNumber ? ` · Roll ${s.rollNumber}` : ''}
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

            {notice && (
              <View
                style={[
                  styles.noticeBox,
                  notice.kind === 'error'
                    ? { backgroundColor: '#fee2e2', borderColor: '#fecaca' }
                    : { backgroundColor: '#fef3c7', borderColor: '#fde68a' },
                ]}
              >
                <Feather
                  name={notice.kind === 'error' ? 'alert-circle' : 'alert-triangle'}
                  size={14}
                  color={notice.kind === 'error' ? '#991b1b' : '#92400e'}
                />
                <Text
                  style={[
                    styles.noticeText,
                    { color: notice.kind === 'error' ? '#991b1b' : '#92400e' },
                  ]}
                >
                  {notice.kind === 'skipped'
                    ? `Voucher not generated: ${notice.message}`
                    : notice.message}
                </Text>
              </View>
            )}

            <Pressable
              onPress={submit}
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
                  <Feather name="plus" size={16} color="#fff" />
                  <Text style={styles.submitText}>Generate Voucher</Text>
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

  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  noticeText: { fontSize: 12, flex: 1, lineHeight: 17 },
});
