import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useBranchesDropdown } from '../../hooks/useBranchProfilesList';
import { useClassesDropdown, useSectionsDropdown } from '../../hooks/useStudents';
import { useUserStore } from '../../store/userStore';
import { useMyAttendanceSections } from '../../hooks/useAttendance';
import { hasAnyAction } from '../../utils/permissions';
import { currentAcademicYear } from '../../constants/attendance';
import { useColors } from '../../theme/useColors';
import { COLORS } from '../../theme/colors';

/**
 * Reusable cascade for branch → academic-year → class → section.
 * Controlled component: pass the current values + onChange handlers.
 */
export default function AttendancePickers({
  branchId,
  setBranchId,
  academicYear,
  setAcademicYear,
  classId,
  setClassId,
  sectionId,
  setSectionId,
  showSection = true,
  showAcademicYear = true,
  markableOnly = false, // limit class/section chips to what the caller may mark
  extraSlot, // e.g. a date picker rendered alongside
}) {
  const C = useColors();
  const { user } = useUserStore();

  const isOrgLevel =
    !!user?.role?.isPredefined || hasAnyAction(user?.role, ['view-all-branch-attendance']);
  const userBranchId =
    typeof user?.branchId === 'string' ? user.branchId : user?.branchId?._id || null;

  const effectiveBranchId = isOrgLevel ? branchId : userBranchId;

  const { data: branchesData } = useBranchesDropdown({ enabled: isOrgLevel });
  const branches = branchesData?.data || [];

  const { data: classesData } = useClassesDropdown({
    branchId: effectiveBranchId,
    academicYear: academicYear || currentAcademicYear(),
    enabled: !!effectiveBranchId && !!academicYear,
  });
  const { data: markable } = useMyAttendanceSections({ enabled: markableOnly });
  // null/undefined = endpoint missing or still loading → no filtering.
  const markableIds = useMemo(() => {
    if (!markableOnly || !Array.isArray(markable)) return null;
    return {
      classIds: new Set(markable.map((m) => String(m.classId))),
      sectionIds: new Set(markable.map((m) => String(m.sectionId))),
    };
  }, [markableOnly, markable]);

  const allClasses = classesData?.data || [];
  const classes = markableIds
    ? allClasses.filter((c) => markableIds.classIds.has(String(c._id)))
    : allClasses;

  const { data: sectionsData } = useSectionsDropdown(classId, {
    enabled: showSection && !!classId,
  });
  const allSections = sectionsData?.data || [];
  const sections = markableIds
    ? allSections.filter((s) => markableIds.sectionIds.has(String(s._id)))
    : allSections;

  // Cascade resets
  useEffect(() => {
    setClassId('');
    if (showSection) setSectionId('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveBranchId, academicYear]);

  useEffect(() => {
    if (showSection) setSectionId('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  return (
    <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
      {isOrgLevel && branches.length > 0 && (
        <Block label="Branch" C={C}>
          <Chips
            value={branchId}
            options={branches.map((b) => ({ value: b._id, label: b.name }))}
            onChange={setBranchId}
            C={C}
          />
        </Block>
      )}

      {showAcademicYear && (
        <Block label="Academic Year" C={C}>
          <TextInput
            value={academicYear}
            onChangeText={setAcademicYear}
            placeholder="2025-2026"
            placeholderTextColor={C.mutedSoft}
            style={[styles.input, { color: C.text, backgroundColor: C.bg, borderColor: C.border }]}
          />
        </Block>
      )}

      <Block label="Class" C={C}>
        {!effectiveBranchId || !academicYear ? (
          <Hint C={C}>Pick a branch and academic year first.</Hint>
        ) : classes.length > 0 ? (
          <Chips
            value={classId}
            options={classes.map((c) => ({
              value: c._id,
              label: `${c.name} (${c.grade?.toUpperCase()})`,
            }))}
            onChange={setClassId}
            C={C}
          />
        ) : (
          <Hint C={C}>
            {markableIds
              ? 'No classes you can mark attendance for in this branch/year.'
              : 'No active classes for this branch/year.'}
          </Hint>
        )}
      </Block>

      {showSection && (
        <Block label="Section" C={C}>
          {!classId ? (
            <Hint C={C}>Pick a class first.</Hint>
          ) : sections.length > 0 ? (
            <Chips
              value={sectionId}
              options={sections.map((s) => ({
                value: s._id,
                label: `${s.name} (${s.currentStrength ?? 0}/${s.capacity ?? 0})`,
              }))}
              onChange={setSectionId}
              C={C}
            />
          ) : (
            <Hint C={C}>No sections in this class.</Hint>
          )}
        </Block>
      )}

      {extraSlot}
    </View>
  );
}

function Block({ label, children, C }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={[styles.label, { color: C.muted }]}>{label.toUpperCase()}</Text>
      {children}
    </View>
  );
}

function Hint({ children, C }) {
  return <Text style={{ color: C.mutedSoft, fontSize: 12, fontStyle: 'italic' }}>{children}</Text>;
}

function Chips({ value, options, onChange, C }) {
  return (
    <View style={styles.chipRow}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[
              styles.chip,
              { backgroundColor: C.bg, borderColor: C.border },
              active && styles.chipActive,
            ]}
          >
            <Text style={[styles.chipText, { color: C.text }, active && styles.chipTextActive]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 12,
    gap: 12,
    borderWidth: 1,
  },
  label: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  input: {
    height: 40,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },
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
});
