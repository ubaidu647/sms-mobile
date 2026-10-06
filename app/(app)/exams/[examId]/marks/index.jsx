import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import {
  useEnterMarks,
  useExamDetail,
  useExamResults,
  useSectionsForExam,
  useStudentsBySection,
} from '../../../../../src/hooks/useExams';
import { useUserStore } from '../../../../../src/store/userStore';
import { useColors } from '../../../../../src/theme/useColors';
import { COLORS } from '../../../../../src/theme/colors';
import { hasAnyAction } from '../../../../../src/utils/permissions';
import { buildMarkEntries, toMark } from '../../../../../src/utils/marksEntries';
import {
  EXAM_STATUS_PILL,
  GRADE_PILL,
  formatDate,
  gradeFromPercentage,
} from '../../../../../src/constants/exam';

// Stable fallbacks: a fresh `[]` default on every render would change the
// effect deps below each render and re-seed (and wipe) the marks forever.
const EMPTY = Object.freeze([]);

const seedEntry = (r) => ({
  theoryObtained: r?.theoryObtained != null ? String(r.theoryObtained) : '',
  practicalObtained: r?.practicalObtained != null ? String(r.practicalObtained) : '',
  isAbsent: r?.isAbsent ?? false,
  remarks: r?.remarks ?? '',
});

export default function MarksEntryPage() {
  const router = useRouter();
  const { examId, examSubjectId: initialExamSubjectId, view } = useLocalSearchParams();
  const C = useColors();
  const { user } = useUserStore();

  const canEnter = hasAnyAction(user?.role, ['enter-marks', 'enter-all-branch-marks']);
  const isViewOnly = view === '1';

  const { data: exam, isLoading: examLoading, error: examError } = useExamDetail({ id: examId });

  const [examSubjectId, setExamSubjectId] = useState(initialExamSubjectId || '');
  const [sectionId, setSectionId] = useState('');
  const [marks, setMarks] = useState({});

  const examSubjects = exam?.subjects || [];
  const isLocked = exam?.status === 'published';
  const examSubject = examSubjects.find((s) => s._id === examSubjectId);
  const classId = exam?.class?._id || exam?.classId;
  const hasTheory = examSubject?.theoryMarks != null;
  const hasPractical = examSubject?.practicalMarks != null;

  const { data: sectionData } = useSectionsForExam({
    classId,
    enabled: !!classId,
  });
  const sections = sectionData?.data || [];

  const { data: students, isLoading: studentsLoading } = useStudentsByList({
    sectionId,
  });

  const { data: resultsData, isFetching: resultsLoading } = useExamResults({
    examId,
    examSubjectId,
    sectionId,
  });
  const existingResults = resultsData || EMPTY;

  // Students the user has typed into for the current subject+section. Their
  // entries are never overwritten by a refetch; only untouched rows are
  // (re)seeded from the server. Switching subject/section starts fresh.
  const editedRef = useRef(new Set());
  const seededScopeRef = useRef(null);
  const scopeKey = `${examId}|${examSubjectId}|${sectionId}`;

  useEffect(() => {
    const scopeChanged = seededScopeRef.current !== scopeKey;
    if (scopeChanged) {
      seededScopeRef.current = scopeKey;
      editedRef.current = new Set();
    }
    const byStudent = new Map();
    existingResults.forEach((er) => {
      const sid = typeof er.studentId === 'object' ? er.studentId?._id : er.studentId;
      if (sid) byStudent.set(sid, er);
    });
    setMarks((prev) => {
      const base = scopeChanged ? {} : prev;
      const next = {};
      students.forEach((s) => {
        next[s._id] =
          editedRef.current.has(s._id) && base[s._id]
            ? base[s._id]
            : seedEntry(byStudent.get(s._id));
      });
      return next;
    });
  }, [scopeKey, students, existingResults]);

  const updateMark = (studentId, patch) => {
    editedRef.current.add(studentId);
    setMarks((prev) => ({ ...prev, [studentId]: { ...prev[studentId], ...patch } }));
  };

  const computedRow = (studentId) => {
    const m = marks[studentId] || {};
    if (m.isAbsent) return { total: 0, pct: 0, grade: '—', passed: false };
    // Nothing typed yet: no grade, rather than a 0 / F preview.
    if (toMark(m.theoryObtained) === null && toMark(m.practicalObtained) === null)
      return { total: '—', pct: '—', grade: '—', passed: true };
    const t = Number(m.theoryObtained) || 0;
    const p = Number(m.practicalObtained) || 0;
    const total = t + p;
    const totalMax = examSubject?.totalMarks || 100;
    const pct = totalMax ? Math.round((total / totalMax) * 100) : 0;
    return {
      total,
      pct,
      grade: gradeFromPercentage(pct),
      passed: total >= (examSubject?.passingMarks ?? 0),
    };
  };

  const counts = useMemo(() => {
    let absent = 0;
    let entered = 0;
    Object.values(marks).forEach((m) => {
      if (m?.isAbsent) absent += 1;
      else if (m?.theoryObtained !== '' || m?.practicalObtained !== '') entered += 1;
    });
    return { absent, entered, total: students.length };
  }, [marks, students.length]);

  // Once saved, the server copy is authoritative again — let the post-save
  // refetch re-seed every row.
  const enter = useEnterMarks({
    examId,
    onSuccess: () => {
      editedRef.current = new Set();
    },
  });

  const handleSave = () => {
    if (!examSubjectId || !sectionId) {
      Toast.show({ type: 'error', text1: 'Pick subject and section first' });
      return;
    }
    if (!students.length) {
      Toast.show({ type: 'error', text1: 'No students in this section' });
      return;
    }
    const entries = buildMarkEntries(students, marks, { hasTheory, hasPractical });
    if (!entries.length) {
      Toast.show({ type: 'error', text1: 'Enter at least one mark (or mark a student absent)' });
      return;
    }
    enter.mutate({ examSubjectId, sectionId, entries });
  };

  if (examLoading) {
    return (
      <View style={[styles.center, { backgroundColor: C.bg }]}>
        <ActivityIndicator size="large" color={COLORS.brand} />
      </View>
    );
  }

  if (!exam) {
    const forbidden = examError?.response?.status === 403;
    return (
      <View style={[styles.center, { backgroundColor: C.bg }]}>
        <Feather name="alert-circle" size={36} color={COLORS.red} />
        <Text style={[styles.errorText, { color: C.muted, textAlign: 'center' }]}>
          {forbidden
            ? examError?.response?.data?.message || 'You are not assigned to this exam class'
            : 'Exam not found'}
        </Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  if (!canEnter && !isViewOnly) {
    return (
      <View style={[styles.center, { backgroundColor: C.bg }]}>
        <Feather name="lock" size={36} color={COLORS.red} />
        <Text style={[styles.errorText, { color: C.muted, textAlign: 'center' }]}>
          You do not have permission to enter marks.
        </Text>
      </View>
    );
  }

  const cfg = EXAM_STATUS_PILL[exam.status] || EXAM_STATUS_PILL.planned;
  const editingDisabled = isLocked || !canEnter || isViewOnly;

  return (
    <View style={[styles.safe, { backgroundColor: C.bg }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={({ pressed }) => [styles.backBtnIcon, pressed && { opacity: 0.6 }]}
          >
            <Feather name="arrow-left" size={20} color={C.text} />
          </Pressable>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.title, { color: C.text }]} numberOfLines={1}>
              {isViewOnly ? 'View Results' : 'Enter Marks'}
            </Text>
            <Text style={[styles.subtitle, { color: C.muted }]} numberOfLines={1}>
              {exam.name} · {exam.class?.name} · {exam.academicYear}
            </Text>
          </View>
          <View style={[styles.pill, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.pillText, { color: cfg.fg }]}>{cfg.label}</Text>
          </View>
        </View>

        {isLocked && (
          <View style={[styles.banner, { backgroundColor: '#ede9fe', borderColor: '#ddd6fe' }]}>
            <Feather name="lock" size={14} color="#5b21b6" />
            <Text style={[styles.bannerText, { color: '#5b21b6' }]}>
              Exam is published. Marks are locked. Unpublish to edit.
            </Text>
          </View>
        )}

        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <View>
            <Text style={[styles.label, { color: C.muted }]}>SUBJECT PAPER</Text>
            {examSubjects.length === 0 ? (
              <Text style={[styles.helper, { color: C.mutedSoft }]}>
                No subjects scheduled for this exam yet.
              </Text>
            ) : (
              <View style={styles.chipRow}>
                {examSubjects.map((s) => {
                  const active = examSubjectId === s._id;
                  return (
                    <Pressable
                      key={s._id}
                      onPress={() => setExamSubjectId(s._id)}
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
                        {s.subject?.name} ({s.subject?.code}) · {formatDate(s.examDate)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          <View>
            <Text style={[styles.label, { color: C.muted }]}>SECTION</Text>
            {!classId || sections.length === 0 ? (
              <Text style={[styles.helper, { color: C.mutedSoft }]}>
                No sections found.
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

          {examSubject && (
            <View style={styles.statsRow}>
              <Stat label="Total" value={examSubject.totalMarks} C={C} />
              <Stat label="Passing" value={examSubject.passingMarks} C={C} />
              <Stat label="Theory Max" value={examSubject.theoryMarks ?? '—'} C={C} />
              <Stat label="Practical Max" value={examSubject.practicalMarks ?? '—'} C={C} />
            </View>
          )}
        </View>

        {!examSubjectId || !sectionId ? (
          <View style={[styles.empty, { backgroundColor: C.card, borderColor: C.border }]}>
            <Feather name="users" size={28} color={C.mutedSoft} />
            <Text style={[styles.emptyText, { color: C.muted }]}>
              Pick a subject paper and section to load the roster.
            </Text>
          </View>
        ) : studentsLoading || resultsLoading ? (
          <View style={[styles.empty, { backgroundColor: C.card, borderColor: C.border }]}>
            <ActivityIndicator size="large" color={COLORS.brand} />
          </View>
        ) : students.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: C.card, borderColor: C.border }]}>
            <Feather name="inbox" size={28} color={C.mutedSoft} />
            <Text style={[styles.emptyText, { color: C.muted }]}>
              No students in this section.
            </Text>
          </View>
        ) : (
          <>
            <View style={[styles.summaryBar, { backgroundColor: C.card, borderColor: C.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.summaryText, { color: C.muted }]}>
                  <Text style={{ fontWeight: '800', color: C.text }}>{counts.total}</Text>{' '}
                  students · {counts.entered} entered ·{' '}
                  <Text style={{ color: '#dc2626' }}>{counts.absent} absent</Text>
                </Text>
              </View>
              {canEnter && !isViewOnly && (
                <Pressable
                  onPress={handleSave}
                  disabled={editingDisabled || enter.isPending}
                  style={({ pressed }) => [
                    styles.saveBtn,
                    (editingDisabled || enter.isPending || pressed) && { opacity: 0.85 },
                  ]}
                >
                  {enter.isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Feather name="save" size={14} color="#fff" />
                      <Text style={styles.saveBtnText}>Save</Text>
                    </>
                  )}
                </Pressable>
              )}
            </View>

            {students.map((s) => {
              const m = marks[s._id] || {};
              const c = computedRow(s._id);
              const grade = GRADE_PILL[c.grade];
              const showSingle = !hasTheory && !hasPractical;
              return (
                <View
                  key={s._id}
                  style={[styles.studentRow, { backgroundColor: C.card, borderColor: C.border }]}
                >
                  <View style={styles.studentHeader}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.studentName, { color: C.text }]} numberOfLines={1}>
                        {s.user?.name || '—'}
                      </Text>
                      <Text style={[styles.studentMeta, { color: C.muted }]} numberOfLines={1}>
                        Roll {s.rollNumber || '—'}
                        {s.admissionNumber ? ` · ${s.admissionNumber}` : ''}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      {m.isAbsent ? (
                        <Text style={[styles.absentBadge, { color: '#991b1b' }]}>ABSENT</Text>
                      ) : (
                        <>
                          <Text style={[styles.totalText, { color: C.text }]}>{c.total}</Text>
                          <Text style={[styles.pctText, { color: C.muted }]}>{c.pct === '—' ? '—' : `${c.pct}%`}</Text>
                        </>
                      )}
                      {!m.isAbsent && grade && (
                        <View style={[styles.gradePill, { backgroundColor: grade.bg }]}>
                          <Text style={[styles.gradePillText, { color: grade.fg }]}>
                            {c.grade}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.inputRow}>
                    {hasTheory && (
                      <MarkInput
                        label={`Theory (${examSubject.theoryMarks})`}
                        value={m.theoryObtained}
                        max={examSubject.theoryMarks}
                        disabled={editingDisabled || m.isAbsent}
                        onChange={(v) => updateMark(s._id, { theoryObtained: v })}
                        C={C}
                      />
                    )}
                    {hasPractical && (
                      <MarkInput
                        label={`Practical (${examSubject.practicalMarks})`}
                        value={m.practicalObtained}
                        max={examSubject.practicalMarks}
                        disabled={editingDisabled || m.isAbsent}
                        onChange={(v) => updateMark(s._id, { practicalObtained: v })}
                        C={C}
                      />
                    )}
                    {showSingle && (
                      <MarkInput
                        label={`Marks (${examSubject.totalMarks})`}
                        value={m.theoryObtained}
                        max={examSubject.totalMarks}
                        disabled={editingDisabled || m.isAbsent}
                        onChange={(v) => updateMark(s._id, { theoryObtained: v })}
                        C={C}
                      />
                    )}
                  </View>

                  <View style={styles.rowActions}>
                    <Pressable
                      onPress={() => updateMark(s._id, { isAbsent: !m.isAbsent })}
                      disabled={editingDisabled}
                      style={({ pressed }) => [
                        styles.absentToggle,
                        {
                          backgroundColor: m.isAbsent ? '#fee2e2' : C.bg,
                          borderColor: m.isAbsent ? '#fecaca' : C.border,
                        },
                        (editingDisabled || pressed) && { opacity: 0.85 },
                      ]}
                    >
                      <Feather
                        name={m.isAbsent ? 'check-square' : 'square'}
                        size={13}
                        color={m.isAbsent ? '#991b1b' : C.mutedSoft}
                      />
                      <Text
                        style={[
                          styles.absentToggleText,
                          { color: m.isAbsent ? '#991b1b' : C.text },
                        ]}
                      >
                        Absent
                      </Text>
                    </Pressable>
                    <TextInput
                      value={m.remarks || ''}
                      onChangeText={(v) => updateMark(s._id, { remarks: v })}
                      editable={!editingDisabled}
                      placeholder="Remarks (optional)"
                      placeholderTextColor={C.mutedSoft}
                      style={[
                        styles.remarksInput,
                        { color: C.text, borderColor: C.border, backgroundColor: C.bg },
                      ]}
                    />
                  </View>
                </View>
              );
            })}

            {canEnter && !isViewOnly && (
              <Pressable
                onPress={handleSave}
                disabled={editingDisabled || enter.isPending}
                style={({ pressed }) => [
                  styles.submitBtn,
                  (editingDisabled || enter.isPending || pressed) && { opacity: 0.85 },
                ]}
              >
                {enter.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Feather name="save" size={16} color="#fff" />
                    <Text style={styles.submitBtnText}>Save Marks</Text>
                  </>
                )}
              </Pressable>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function MarkInput({ label, value, max, disabled, onChange, C }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={[styles.markLabel, { color: C.mutedSoft }]}>{label}</Text>
      <TextInput
        value={value || ''}
        onChangeText={(v) => onChange(v.replace(/[^0-9.]/g, ''))}
        editable={!disabled}
        keyboardType="decimal-pad"
        style={[
          styles.markInput,
          {
            color: C.text,
            borderColor: C.border,
            backgroundColor: disabled ? C.bg : C.card,
          },
        ]}
      />
    </View>
  );
}

function Stat({ label, value, C }) {
  return (
    <View style={[styles.stat, { backgroundColor: C.bg, borderColor: C.border }]}>
      <Text style={[styles.statLabel, { color: C.mutedSoft }]}>{label.toUpperCase()}</Text>
      <Text style={[styles.statValue, { color: C.text }]} numberOfLines={1}>
        {value ?? '—'}
      </Text>
    </View>
  );
}

// Adapter to keep the call site short: unwrap data array from the api response.
function useStudentsByList({ sectionId }) {
  const q = useStudentsBySection({ sectionId });
  const list = q.data?.data;
  const data = useMemo(() => (Array.isArray(list) ? list : EMPTY), [list]);
  return {
    data,
    isLoading: q.isLoading,
    refetch: q.refetch,
  };
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 14, paddingBottom: 32, gap: 12 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  errorText: { fontSize: 14 },
  backBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: COLORS.brand,
    borderRadius: 999,
    marginTop: 8,
  },
  backBtnText: { color: '#fff', fontWeight: '700' },
  backBtnIcon: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 20, fontWeight: '800' },
  subtitle: { fontSize: 12, marginTop: 2 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillText: { fontSize: 10, fontWeight: '800' },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  bannerText: { fontSize: 12, flex: 1 },

  card: { borderRadius: 14, padding: 12, borderWidth: 1, gap: 12 },
  label: { fontSize: 10, letterSpacing: 1.1, fontWeight: '700', marginBottom: 6 },
  helper: { fontSize: 12 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: 260,
  },
  chipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText: { fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#fff' },

  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  stat: {
    flexBasis: '23%',
    flexGrow: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  statLabel: { fontSize: 9, letterSpacing: 1.1, fontWeight: '800' },
  statValue: { fontSize: 14, fontWeight: '800', marginTop: 2 },

  empty: {
    borderRadius: 14,
    paddingVertical: 36,
    paddingHorizontal: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: { fontSize: 13, textAlign: 'center' },

  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  summaryText: { fontSize: 12 },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 999,
    backgroundColor: COLORS.brand,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  studentRow: { borderRadius: 14, padding: 12, borderWidth: 1, gap: 10 },
  studentHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  studentName: { fontSize: 14, fontWeight: '800' },
  studentMeta: { fontSize: 11, marginTop: 2 },

  absentBadge: { fontSize: 11, fontWeight: '800' },
  totalText: { fontSize: 16, fontWeight: '800' },
  pctText: { fontSize: 11, marginTop: 2 },
  gradePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, marginTop: 2 },
  gradePillText: { fontSize: 10, fontWeight: '800' },

  inputRow: { flexDirection: 'row', gap: 8 },
  markLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1.1, marginBottom: 4 },
  markInput: {
    height: 38,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 13,
    fontWeight: '700',
  },

  rowActions: { flexDirection: 'row', gap: 8 },
  absentToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
  },
  absentToggleText: { fontSize: 11, fontWeight: '700' },
  remarksInput: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 12,
  },

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.brand,
    height: 48,
    borderRadius: 12,
    marginTop: 8,
  },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
