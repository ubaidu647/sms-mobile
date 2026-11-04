import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import {
  useExamDetail,
  useSectionSummary,
  useSectionsForExam,
} from '../../../../../src/hooks/useExams';
import { useColors } from '../../../../../src/theme/useColors';
import { COLORS } from '../../../../../src/theme/colors';
import { formatDate, titleCase } from '../../../../../src/constants/exam';
import { sectionResultLabel } from '../../../../../src/utils/examResult';

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

export default function SectionSummaryPage() {
  const { examId } = useLocalSearchParams();
  const router = useRouter();
  const C = useColors();

  const [sectionId, setSectionId] = useState('');

  const { data: exam } = useExamDetail({ id: examId });
  const classId = exam?.class?._id || exam?.classId;

  const { data: sectionData } = useSectionsForExam({ classId, enabled: !!classId });
  const sections = sectionData?.data || [];

  const { data: summary, isFetching } = useSectionSummary({
    examId,
    sectionId,
    enabled: !!sectionId,
  });

  const students = summary?.students || [];
  // With electives a student is scored out of their own total, which can be
  // less than the exam's — say so under the header figure.
  const hasOwnTotals = students.some(
    (s) => s.totalMarks != null && Number(s.totalMarks) !== Number(summary?.totalMarks),
  );
  const sectionMeta = sections.find((s) => s._id === sectionId);

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
              Section Summary
            </Text>
            <Text style={[styles.subtitle, { color: C.muted }]} numberOfLines={1}>
              {exam?.name || '—'} · {exam?.academicYear || ''}
            </Text>
          </View>
        </View>

        {/* Section picker */}
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[styles.label, { color: C.muted }]}>SECTION</Text>
          {sections.length === 0 ? (
            <Text style={[styles.helper, { color: C.mutedSoft }]}>No sections available.</Text>
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

        {!sectionId ? (
          <View style={[styles.empty, { backgroundColor: C.card, borderColor: C.border }]}>
            <Feather name="users" size={28} color={C.mutedSoft} />
            <Text style={[styles.emptyText, { color: C.muted }]}>
              Pick a section to view the ranked summary.
            </Text>
          </View>
        ) : isFetching && !summary ? (
          <View style={[styles.empty, { backgroundColor: C.card, borderColor: C.border }]}>
            <ActivityIndicator size="large" color={COLORS.brand} />
          </View>
        ) : !students.length ? (
          <View style={[styles.empty, { backgroundColor: C.card, borderColor: C.border }]}>
            <Feather name="inbox" size={28} color={C.mutedSoft} />
            <Text style={[styles.emptyText, { color: C.muted }]}>
              No marks recorded for this section yet.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.metaPills}>
              <Text style={[styles.metaText, { color: C.muted }]}>
                Class <Text style={{ fontWeight: '800', color: C.text }}>{exam?.class?.name}</Text>
                {sectionMeta?.name ? (
                  <Text>
                    {'  ·  '}Section{' '}
                    <Text style={{ fontWeight: '800', color: C.text }}>{sectionMeta.name}</Text>
                  </Text>
                ) : null}
              </Text>
            </View>

            <View style={styles.statsRow}>
              <Stat label="Type" value={titleCase(exam?.type)} C={C} />
              <Stat label="Total marks" value={summary.totalMarks} C={C} />
              <Stat label="Students" value={students.length} C={C} />
              <Stat
                label="Schedule"
                value={`${formatDate(exam?.startDate)} → ${formatDate(exam?.endDate)}`}
                C={C}
              />
            </View>

            {hasOwnTotals ? (
              <Text style={[styles.metaText, { color: C.muted }]}>
                Students who don’t take an elective are marked out of their own total (shown on
                each row).
              </Text>
            ) : null}

            {students.map((s) => (
              <Pressable
                key={s.studentId}
                onPress={() =>
                  router.push(`/(app)/exams/${examId}/result-card/${s.studentId}`)
                }
                style={({ pressed }) => [
                  styles.row,
                  {
                    backgroundColor: !s.isPassed ? '#fef2f2' : C.card,
                    borderColor: !s.isPassed ? '#fecaca' : C.border,
                  },
                  pressed && { opacity: 0.92 },
                ]}
              >
                <View style={styles.position}>
                  <Text style={styles.positionText}>{s.position}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.studentName, { color: C.text }]} numberOfLines={1}>
                    {s.name}
                  </Text>
                  <Text style={[styles.studentMeta, { color: C.muted }]} numberOfLines={1}>
                    Roll {s.rollNumber || '—'}
                    {s.admissionNumber ? ` · ${s.admissionNumber}` : ''}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <Text style={[styles.totalText, { color: C.text }]}>
                    {s.totalObtained} / {s.totalMarks ?? summary.totalMarks}
                  </Text>
                  <Text style={[styles.pctText, { color: C.muted }]}>{s.percentage}%</Text>
                  <View
                    style={[
                      styles.resultPill,
                      {
                        backgroundColor: s.isPassed ? '#dcfce7' : '#fee2e2',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.resultPillText,
                        { color: s.isPassed ? '#166534' : '#991b1b' },
                      ]}
                    >
                      {sectionResultLabel(s)}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 14, paddingBottom: 32, gap: 12 },

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

  card: { borderRadius: 14, padding: 12, borderWidth: 1, gap: 8 },
  label: { fontSize: 10, letterSpacing: 1.1, fontWeight: '700' },
  helper: { fontSize: 12 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText: { fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#fff' },

  empty: {
    borderRadius: 14,
    paddingVertical: 36,
    paddingHorizontal: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: { fontSize: 13, textAlign: 'center' },

  metaPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metaText: { fontSize: 13 },

  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  stat: {
    flexBasis: '23%',
    flexGrow: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  statLabel: { fontSize: 9, letterSpacing: 1.1, fontWeight: '800' },
  statValue: { fontSize: 13, fontWeight: '800', marginTop: 2 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  position: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  studentName: { fontSize: 14, fontWeight: '700' },
  studentMeta: { fontSize: 11, marginTop: 2 },

  totalText: { fontSize: 13, fontWeight: '800' },
  pctText: { fontSize: 11 },
  resultPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  resultPillText: { fontSize: 10, fontWeight: '800' },
});
