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
import {
  useAddExamSubject,
  useSubjectsForExam,
  useUpdateExamSubject,
} from '../../hooks/useExams';
import { toYMD } from '../../constants/exam';
import { clearableNumber } from '../../utils/clearableNumber';
import { useColors } from '../../theme/useColors';
import { COLORS } from '../../theme/colors';

export default function ExamSubjectFormModal({
  open,
  examId,
  classId,
  academicYear,
  examSubject,
  onClose,
}) {
  const isEdit = !!examSubject;
  const C = useColors();

  const [subjectId, setSubjectId] = useState('');
  const [examDate, setExamDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [totalMarks, setTotalMarks] = useState('');
  const [passingMarks, setPassingMarks] = useState('');
  const [theoryMarks, setTheoryMarks] = useState('');
  const [practicalMarks, setPracticalMarks] = useState('');

  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      setSubjectId(examSubject.subject?._id || examSubject.subjectId || '');
      setExamDate(toYMD(examSubject.examDate));
      setStartTime(examSubject.startTime || '');
      setEndTime(examSubject.endTime || '');
      setTotalMarks(String(examSubject.totalMarks ?? ''));
      setPassingMarks(String(examSubject.passingMarks ?? ''));
      setTheoryMarks(
        examSubject.theoryMarks != null ? String(examSubject.theoryMarks) : '',
      );
      setPracticalMarks(
        examSubject.practicalMarks != null ? String(examSubject.practicalMarks) : '',
      );
    } else {
      setSubjectId('');
      setExamDate('');
      setStartTime('');
      setEndTime('');
      setTotalMarks('');
      setPassingMarks('');
      setTheoryMarks('');
      setPracticalMarks('');
    }
  }, [open, isEdit, examSubject]);

  const { data: subjectData } = useSubjectsForExam({
    classId,
    academicYear,
    enabled: open && !isEdit && !!classId,
  });
  const subjects = subjectData?.data || [];

  const add = useAddExamSubject({ examId, onSuccess: () => onClose() });
  const update = useUpdateExamSubject({
    examId,
    id: examSubject?._id,
    onSuccess: () => onClose(),
  });
  const mut = isEdit ? update : add;

  const validate = () => {
    if (!isEdit && !subjectId) return 'Subject is required';
    if (!examDate) return 'Exam date is required';
    if (!totalMarks) return 'Total marks is required';
    if (!passingMarks) return 'Passing marks is required';
    const t = Number(totalMarks);
    const p = Number(passingMarks);
    if (!Number.isFinite(t) || t < 1) return 'Total marks must be ≥ 1';
    if (!Number.isFinite(p) || p < 0) return 'Passing marks must be ≥ 0';
    if (p > t) return 'Passing marks cannot exceed total';
    if (theoryMarks !== '' && practicalMarks !== '') {
      const sum = Number(theoryMarks) + Number(practicalMarks);
      if (sum !== t) return 'Theory + Practical must equal Total';
    }
    return null;
  };

  const handleSubmit = () => {
    const err = validate();
    if (err) {
      Toast.show({ type: 'error', text1: 'Invalid', text2: err });
      return;
    }
    const payload = {
      examDate,
      totalMarks: Number(totalMarks),
      passingMarks: Number(passingMarks),
    };
    if (!isEdit) payload.subjectId = subjectId;
    if (isEdit) {
      // Blank means clear on an edit: left out, the API keeps the old value.
      payload.startTime = startTime || null;
      payload.endTime = endTime || null;
      payload.theoryMarks = clearableNumber(theoryMarks);
      payload.practicalMarks = clearableNumber(practicalMarks);
    } else {
      if (startTime) payload.startTime = startTime;
      if (endTime) payload.endTime = endTime;
      if (theoryMarks !== '') payload.theoryMarks = Number(theoryMarks);
      if (practicalMarks !== '') payload.practicalMarks = Number(practicalMarks);
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
              {isEdit ? 'Edit Subject Paper' : 'Add Subject Paper'}
            </Text>
            <Text style={[styles.subtitle, { color: C.muted }]}>
              {isEdit
                ? 'Adjust date, time and marks distribution'
                : 'Schedule a subject for this exam'}
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
            {!isEdit && (
              <View>
                <Text style={[styles.label, { color: C.muted }]}>SUBJECT *</Text>
                {subjects.length === 0 ? (
                  <Text style={[styles.helper, { color: C.mutedSoft }]}>
                    No subjects available for this class/year.
                  </Text>
                ) : (
                  <View style={styles.chipRow}>
                    {subjects.map((s) => {
                      const active = subjectId === s._id;
                      return (
                        <Pressable
                          key={s._id}
                          onPress={() => {
                            setSubjectId(s._id);
                            // Prefill marks from subject defaults
                            if (s.totalMarks != null && !totalMarks)
                              setTotalMarks(String(s.totalMarks));
                            if (s.passingMarks != null && !passingMarks)
                              setPassingMarks(String(s.passingMarks));
                            if (s.theoryMarks != null && !theoryMarks)
                              setTheoryMarks(String(s.theoryMarks));
                            if (s.practicalMarks != null && !practicalMarks)
                              setPracticalMarks(String(s.practicalMarks));
                          }}
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
                            {s.code ? ` (${s.code})` : ''}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            )}

            <View>
              <Text style={[styles.label, { color: C.muted }]}>EXAM DATE *</Text>
              <TextInput
                value={examDate}
                onChangeText={setExamDate}
                placeholder="2026-06-05"
                placeholderTextColor={C.mutedSoft}
                keyboardType="numbers-and-punctuation"
                autoCapitalize="none"
                style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
              />
            </View>

            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: C.muted }]}>START TIME</Text>
                <TextInput
                  value={startTime}
                  onChangeText={setStartTime}
                  placeholder="09:00"
                  placeholderTextColor={C.mutedSoft}
                  keyboardType="numbers-and-punctuation"
                  autoCapitalize="none"
                  style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: C.muted }]}>END TIME</Text>
                <TextInput
                  value={endTime}
                  onChangeText={setEndTime}
                  placeholder="12:00"
                  placeholderTextColor={C.mutedSoft}
                  keyboardType="numbers-and-punctuation"
                  autoCapitalize="none"
                  style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
                />
              </View>
            </View>

            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: C.muted }]}>TOTAL MARKS *</Text>
                <TextInput
                  value={totalMarks}
                  onChangeText={(v) => setTotalMarks(v.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  placeholder="100"
                  placeholderTextColor={C.mutedSoft}
                  style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: C.muted }]}>PASSING *</Text>
                <TextInput
                  value={passingMarks}
                  onChangeText={(v) => setPassingMarks(v.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  placeholder="40"
                  placeholderTextColor={C.mutedSoft}
                  style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
                />
              </View>
            </View>

            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: C.muted }]}>THEORY</Text>
                <TextInput
                  value={theoryMarks}
                  onChangeText={(v) => setTheoryMarks(v.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  placeholder="optional"
                  placeholderTextColor={C.mutedSoft}
                  style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: C.muted }]}>PRACTICAL</Text>
                <TextInput
                  value={practicalMarks}
                  onChangeText={(v) => setPracticalMarks(v.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  placeholder="optional"
                  placeholderTextColor={C.mutedSoft}
                  style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
                />
              </View>
            </View>

            <Text style={[styles.helper, { color: C.mutedSoft }]}>
              If you provide both Theory + Practical, they must sum to Total Marks.
            </Text>

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
                    {isEdit ? 'Save Changes' : 'Add Subject Paper'}
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
  helper: { fontSize: 11 },
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
});
