import { useEffect, useState } from 'react';
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
  useClassesForExam,
  useCreateExam,
  useUpdateExam,
} from '../../hooks/useExams';
import {
  ACADEMIC_YEAR_REGEX,
  EXAM_STATUSES,
  EXAM_TYPES,
  currentAcademicYear,
  titleCase,
  toYMD,
} from '../../constants/exam';
import { useColors } from '../../theme/useColors';
import { COLORS } from '../../theme/colors';

export default function ExamFormModal({ open, exam, onClose }) {
  const isEdit = !!exam;
  const C = useColors();
  const { user } = useUserStore();

  const isAdmin = !!user?.role?.isPredefined;
  const canActAllBranch =
    isAdmin ||
    !!user?.role?.actions?.includes('create-all-branch-exam') ||
    !!user?.role?.actions?.includes('update-all-branch-exam');
  const userBranchId =
    (typeof user?.branchId === 'string' && user.branchId) ||
    user?.branchId?._id ||
    user?.branch?._id ||
    '';

  const [name, setName] = useState('');
  const [type, setType] = useState('mid-term');
  const [branchId, setBranchId] = useState(canActAllBranch ? '' : userBranchId);
  const [academicYear, setAcademicYear] = useState(currentAcademicYear());
  const [classId, setClassId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [passingPercentage, setPassingPercentage] = useState('40');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('planned');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      setName(exam.name || '');
      setType(exam.type || 'mid-term');
      setBranchId(exam.branchId || exam.branch?._id || '');
      setAcademicYear(exam.academicYear || currentAcademicYear());
      setClassId(exam.class?._id || exam.classId || '');
      setStartDate(toYMD(exam.startDate));
      setEndDate(toYMD(exam.endDate));
      setPassingPercentage(String(exam.passingPercentage ?? 40));
      setDescription(exam.description || '');
      setStatus(exam.status || 'planned');
      setIsActive(exam.isActive !== false);
    } else {
      setName('');
      setType('mid-term');
      setBranchId(canActAllBranch ? '' : userBranchId);
      setAcademicYear(currentAcademicYear());
      setClassId('');
      setStartDate('');
      setEndDate('');
      setPassingPercentage('40');
      setDescription('');
      setStatus('planned');
      setIsActive(true);
    }
  }, [open, isEdit, exam, canActAllBranch, userBranchId]);

  const { data: branchData } = useBranchesDropdown({
    enabled: canActAllBranch && open,
  });
  const branches = branchData?.data || [];

  const { data: classData } = useClassesForExam({
    branchId: branchId || undefined,
    academicYear,
    enabled: open && !!branchId && !!academicYear,
  });
  const classes = classData?.data || [];

  const create = useCreateExam({ onSuccess: () => onClose() });
  const update = useUpdateExam({ id: exam?._id, onSuccess: () => onClose() });
  const mut = isEdit ? update : create;

  // Blank means "not given", as on the web: an edit keeps the stored value and
  // a new exam gets the API's default. `Number('')` would have saved 0.
  const passingBlank = String(passingPercentage ?? '').trim() === '';

  const validate = () => {
    if (!name?.trim()) return 'Name is required';
    if (!EXAM_TYPES.includes(type)) return 'Pick a valid type';
    if (!isEdit && !classId) return 'Class is required';
    if (!ACADEMIC_YEAR_REGEX.test(academicYear || '')) return 'Year must be YYYY-YYYY';
    if (!startDate) return 'Start date is required';
    if (!endDate) return 'End date is required';
    const p = Number(passingPercentage);
    if (!passingBlank && (Number.isNaN(p) || p < 0 || p > 100))
      return 'Passing percentage must be 0–100';
    return null;
  };

  const handleSubmit = () => {
    const err = validate();
    if (err) {
      Toast.show({ type: 'error', text1: 'Invalid', text2: err });
      return;
    }
    if (isEdit) {
      const payload = {
        name: name.trim(),
        type,
        startDate,
        endDate,
        // Sent even when blank: left out, the API keeps the old text.
        description: description.trim(),
        status,
        isActive,
      };
      if (!passingBlank) payload.passingPercentage = Number(passingPercentage);
      update.mutate(payload);
    } else {
      const payload = {
        name: name.trim(),
        type,
        classId,
        academicYear,
        startDate,
        endDate,
      };
      if (!passingBlank) payload.passingPercentage = Number(passingPercentage);
      if (description.trim()) payload.description = description.trim();
      create.mutate(payload);
    }
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
              {isEdit ? 'Edit Exam' : 'New Exam'}
            </Text>
            <Text style={[styles.subtitle, { color: C.muted }]}>
              {isEdit
                ? 'Update exam info, schedule and status'
                : 'Schedule a new exam for a class'}
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
            {isEdit && (
              <View style={styles.note}>
                <Feather name="info" size={14} color="#92400e" />
                <Text style={styles.noteText}>
                  Class and academic year can't be changed after creation.
                </Text>
              </View>
            )}

            <View>
              <Text style={[styles.label, { color: C.muted }]}>NAME *</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Mid-Term Exam — Sept 2025"
                placeholderTextColor={C.mutedSoft}
                style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
              />
            </View>

            <View>
              <Text style={[styles.label, { color: C.muted }]}>TYPE *</Text>
              <View style={styles.chipRow}>
                {EXAM_TYPES.map((t) => {
                  const active = type === t;
                  return (
                    <Pressable
                      key={t}
                      onPress={() => setType(t)}
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

            {!isEdit && (
              <>
                {canActAllBranch ? (
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
                  {!branchId ? (
                    <Text style={[styles.helper, { color: C.mutedSoft }]}>
                      Pick a branch first.
                    </Text>
                  ) : classes.length === 0 ? (
                    <Text style={[styles.helper, { color: C.mutedSoft }]}>
                      No classes found.
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
                <Text style={[styles.label, { color: C.muted }]}>START *</Text>
                <TextInput
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="2026-06-01"
                  placeholderTextColor={C.mutedSoft}
                  keyboardType="numbers-and-punctuation"
                  autoCapitalize="none"
                  style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: C.muted }]}>END *</Text>
                <TextInput
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="2026-06-15"
                  placeholderTextColor={C.mutedSoft}
                  keyboardType="numbers-and-punctuation"
                  autoCapitalize="none"
                  style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
                />
              </View>
            </View>

            <View>
              <Text style={[styles.label, { color: C.muted }]}>PASSING %</Text>
              <TextInput
                value={passingPercentage}
                onChangeText={(v) => setPassingPercentage(v.replace(/[^0-9.]/g, ''))}
                keyboardType="decimal-pad"
                placeholder="40"
                placeholderTextColor={C.mutedSoft}
                style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
              />
            </View>

            {isEdit && (
              <>
                <View>
                  <Text style={[styles.label, { color: C.muted }]}>STATUS</Text>
                  <View style={styles.chipRow}>
                    {/* Publishing has its own endpoint: the update route refuses it. */}
                    {EXAM_STATUSES.filter((s) => s !== 'published').map((s) => {
                      const active = status === s;
                      return (
                        <Pressable
                          key={s}
                          onPress={() => setStatus(s)}
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
                            {titleCase(s)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <Pressable
                  onPress={() => setIsActive((v) => !v)}
                  style={({ pressed }) => [
                    styles.toggleRow,
                    {
                      backgroundColor: isActive ? '#dcfce7' : C.bg,
                      borderColor: isActive ? '#86efac' : C.border,
                    },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Feather
                    name={isActive ? 'check-square' : 'square'}
                    size={14}
                    color={isActive ? '#166534' : C.mutedSoft}
                  />
                  <Text style={[styles.toggleText, { color: isActive ? '#166534' : C.text }]}>
                    Active
                  </Text>
                </Pressable>
              </>
            )}

            <View>
              <Text style={[styles.label, { color: C.muted }]}>DESCRIPTION</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                multiline
                placeholder="Optional"
                placeholderTextColor={C.mutedSoft}
                style={[
                  styles.input,
                  {
                    height: 70,
                    textAlignVertical: 'top',
                    paddingTop: 10,
                    color: C.text,
                    borderColor: C.border,
                    backgroundColor: C.bg,
                  },
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
                    {isEdit ? 'Save Changes' : 'Create Exam'}
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

  note: {
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
  noteText: { color: '#92400e', fontSize: 12, flex: 1 },

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

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  toggleText: { fontSize: 13, fontWeight: '700' },

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
