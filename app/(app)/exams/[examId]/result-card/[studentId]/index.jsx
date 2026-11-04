import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useResultCard } from '../../../../../../src/hooks/useExams';
import { useColors } from '../../../../../../src/theme/useColors';
import { COLORS } from '../../../../../../src/theme/colors';
import {
  GRADE_PILL,
  formatDate,
  titleCase,
} from '../../../../../../src/constants/exam';
import { missingPapersReason } from '../../../../../../src/utils/examResult';

function Info({ label, value, C }) {
  return (
    <View style={[styles.info, { backgroundColor: C.bg, borderColor: C.border }]}>
      <Text style={[styles.infoLabel, { color: C.mutedSoft }]}>{label.toUpperCase()}</Text>
      <Text style={[styles.infoValue, { color: C.text }]} numberOfLines={2}>
        {value || '—'}
      </Text>
    </View>
  );
}

function SubjectRow({ s, C }) {
  const grade = GRADE_PILL[s.grade];
  return (
    <View style={[styles.subjectRow, { borderColor: C.border, backgroundColor: C.card }]}>
      <View style={styles.subjectHeader}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.subjectName, { color: C.text }]} numberOfLines={1}>
            {s.subject?.name || '—'}
            {s.subject?.code ? (
              <Text style={[styles.subjectCode, { color: C.mutedSoft }]}>
                {' '}
                ({s.subject.code})
              </Text>
            ) : null}
          </Text>
        </View>
        {s.isAbsent ? (
          <View style={[styles.resultPill, { backgroundColor: '#f3f4f6' }]}>
            <Text style={[styles.resultPillText, { color: '#374151' }]}>ABSENT</Text>
          </View>
        ) : (
          <View
            style={[
              styles.resultPill,
              { backgroundColor: s.isPassed ? '#dcfce7' : '#fee2e2' },
            ]}
          >
            <Text
              style={[
                styles.resultPillText,
                { color: s.isPassed ? '#166534' : '#991b1b' },
              ]}
            >
              {s.isPassed ? 'PASS' : 'FAIL'}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.subjectGrid}>
        <Cell label="Total" value={s.examSubject?.totalMarks ?? '—'} C={C} />
        <Cell label="Theory" value={s.theoryObtained ?? '—'} C={C} />
        <Cell label="Practical" value={s.practicalObtained ?? '—'} C={C} />
        <Cell label="Obtained" value={s.isAbsent ? 'AB' : s.totalObtained} bold C={C} />
        <Cell label="%" value={s.isAbsent ? '—' : `${s.percentage}%`} C={C} />
        {!s.isAbsent && grade && (
          <View style={[styles.gradePill, { backgroundColor: grade.bg }]}>
            <Text style={[styles.gradePillText, { color: grade.fg }]}>{s.grade}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function Cell({ label, value, bold, C }) {
  return (
    <View style={styles.cell}>
      <Text style={[styles.cellLabel, { color: C.mutedSoft }]}>{label.toUpperCase()}</Text>
      <Text style={[styles.cellValue, { color: C.text, fontWeight: bold ? '800' : '600' }]}>
        {value ?? '—'}
      </Text>
    </View>
  );
}

export default function ResultCardPage() {
  const { examId, studentId } = useLocalSearchParams();
  const router = useRouter();
  const C = useColors();

  const { data: card, isLoading, error } = useResultCard({ examId, studentId });

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: C.bg }]}>
        <ActivityIndicator size="large" color={COLORS.brand} />
      </View>
    );
  }

  if (error || !card) {
    return (
      <View style={[styles.center, { backgroundColor: C.bg }]}>
        <Feather name="alert-circle" size={36} color={COLORS.red} />
        <Text style={[styles.errorText, { color: C.muted, textAlign: 'center' }]}>
          {error?.response?.data?.message ||
            error?.message ||
            'Result card not available'}
        </Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const { student, exam, subjects = [], summary } = card;
  const summaryGrade = GRADE_PILL[summary?.grade];
  const missingReason = missingPapersReason(summary);

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
              Result Card
            </Text>
            <Text style={[styles.subtitle, { color: C.muted }]} numberOfLines={1}>
              {exam.name} · {exam.academicYear}
            </Text>
          </View>
        </View>

        <View style={[styles.studentCard, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={styles.studentRow}>
            {student.photo ? (
              <Image source={{ uri: student.photo }} style={styles.photo} />
            ) : (
              <View style={[styles.photoFallback, { backgroundColor: COLORS.brand }]}>
                <Text style={styles.photoFallbackText}>
                  {(student.name?.[0] || '?').toUpperCase()}
                </Text>
              </View>
            )}
            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <Text style={[styles.studentName, { color: C.text }]} numberOfLines={1}>
                {student.name}
              </Text>
              <Text style={[styles.studentMeta, { color: C.muted }]} numberOfLines={1}>
                {student.class?.name || ''}
                {student.section?.name ? ` · ${student.section.name}` : ''}
              </Text>
              <Text style={[styles.studentMeta, { color: C.mutedSoft }]} numberOfLines={1}>
                Roll {student.rollNumber || '—'}
                {student.admissionNumber ? ` · ${student.admissionNumber}` : ''}
              </Text>
            </View>
          </View>

          <View style={styles.infoGrid}>
            <Info label="Exam Type" value={titleCase(exam.type)} C={C} />
            <Info
              label="Schedule"
              value={`${formatDate(exam.startDate)} → ${formatDate(exam.endDate)}`}
              C={C}
            />
          </View>
        </View>

        {/* Subjects */}
        <View style={{ gap: 10 }}>
          {subjects.map((s, idx) => (
            <SubjectRow key={s.subjectId || idx} s={s} C={C} />
          ))}
        </View>

        {/* Grand total banner */}
        <View
          style={[
            styles.grandBanner,
            {
              backgroundColor: COLORS.brand + '10',
              borderColor: COLORS.brand + '40',
            },
          ]}
        >
          <View>
            <Text style={[styles.grandLabel, { color: COLORS.brand }]}>GRAND TOTAL</Text>
            <Text style={[styles.grandValue, { color: COLORS.brand }]}>
              {summary.totalObtained} / {summary.totalMarks}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Text style={[styles.grandPct, { color: C.text }]}>{summary.percentage}%</Text>
            {summaryGrade && (
              <View style={[styles.gradePill, { backgroundColor: summaryGrade.bg }]}>
                <Text style={[styles.gradePillText, { color: summaryGrade.fg }]}>
                  {summary.grade}
                </Text>
              </View>
            )}
            <View
              style={[
                styles.resultPillBig,
                { backgroundColor: summary.isPassed ? '#dcfce7' : '#fee2e2' },
              ]}
            >
              <Text
                style={[
                  styles.resultPillBigText,
                  { color: summary.isPassed ? '#166534' : '#991b1b' },
                ]}
              >
                {summary.isPassed ? 'PASSED' : 'FAILED'}
              </Text>
            </View>
          </View>
        </View>

        {!!missingReason && (
          <View style={styles.missingBox}>
            <Feather name="alert-circle" size={16} color="#991b1b" />
            <Text style={styles.missingText}>{missingReason}</Text>
          </View>
        )}

        {summary.position != null && (
          <View style={[styles.infoBox, { backgroundColor: C.card, borderColor: C.border }]}>
            <Info
              label="Position"
              value={
                !summary.position
                  ? '—'
                  : summary.totalStudentsInSection
                    ? `${summary.position} of ${summary.totalStudentsInSection}`
                    : `${summary.position}`
              }
              C={C}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
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

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtnIcon: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 20, fontWeight: '800' },
  subtitle: { fontSize: 12, marginTop: 2 },

  studentCard: { borderRadius: 14, padding: 12, borderWidth: 1, gap: 12 },
  studentRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  photo: {
    width: 70,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
  },
  photoFallback: {
    width: 70,
    height: 80,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoFallbackText: { color: '#fff', fontSize: 24, fontWeight: '800' },
  studentName: { fontSize: 17, fontWeight: '800' },
  studentMeta: { fontSize: 12, marginTop: 2 },

  infoGrid: { flexDirection: 'row', gap: 8 },
  info: { flex: 1, padding: 10, borderRadius: 10, borderWidth: 1, gap: 4 },
  infoLabel: { fontSize: 9, letterSpacing: 1.1, fontWeight: '800' },
  infoValue: { fontSize: 13, fontWeight: '700' },

  subjectRow: { borderRadius: 12, padding: 12, borderWidth: 1, gap: 8 },
  subjectHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  subjectName: { fontSize: 14, fontWeight: '800' },
  subjectCode: { fontSize: 11, fontWeight: '500' },

  resultPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  resultPillText: { fontSize: 10, fontWeight: '800' },

  subjectGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'flex-end' },
  cell: { flexBasis: '18%', flexGrow: 1, gap: 2 },
  cellLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  cellValue: { fontSize: 13 },

  gradePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  gradePillText: { fontSize: 11, fontWeight: '800' },

  grandBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  grandLabel: { fontSize: 10, letterSpacing: 1.1, fontWeight: '800' },
  grandValue: { fontSize: 22, fontWeight: '800', marginTop: 2 },
  grandPct: { fontSize: 18, fontWeight: '800' },
  resultPillBig: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  resultPillBigText: { fontSize: 12, fontWeight: '800' },

  infoBox: { borderRadius: 14, padding: 12, borderWidth: 1 },
  missingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    backgroundColor: '#fee2e2',
    borderColor: '#fecaca',
  },
  missingText: { flex: 1, color: '#991b1b', fontSize: 13, fontWeight: '700' },
});
