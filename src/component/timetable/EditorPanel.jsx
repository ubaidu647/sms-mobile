import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useUserStore } from '../../store/userStore';
import { useBranchesDropdown } from '../../hooks/useBranchProfilesList';
import {
  useBulkSaveSlots,
  useClassesForTT,
  useSectionTimetable,
  useSectionsForTT,
  useSubjectsForTT,
  useTeachingStaffForTT,
} from '../../hooks/useTimetable';
import { hasAnyAction } from '../../utils/permissions';
import {
  buildTimetableSlots,
  describeIncomplete,
  incompleteKeys,
} from '../../utils/timetableSlots';
import {
  DAYS,
  DAY_LABELS,
  DAY_SHORT,
  PERIOD_PILL,
  currentAcademicYear,
  titleCase,
} from '../../constants/timetable';
import { useColors } from '../../theme/useColors';
import { COLORS } from '../../theme/colors';

function PickerField({ label, options, value, onChange, disabled, placeholder, C }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={[styles.label, { color: C.muted }]}>{label}</Text>
      {disabled ? (
        <Text style={[styles.helper, { color: C.mutedSoft }]}>{placeholder}</Text>
      ) : options.length === 0 ? (
        <Text style={[styles.helper, { color: C.mutedSoft }]}>No options.</Text>
      ) : (
        <View style={styles.chipRow}>
          {options.map((opt) => {
            const active = value === opt.value;
            return (
              <Pressable
                key={opt.value || '__all'}
                onPress={() => onChange(opt.value)}
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
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

function LessonCell({ cell, subjects, teachers, disabled, onChange, C }) {
  const c = cell || {};
  const [subjectPickerOpen, setSubjectPickerOpen] = useState(false);
  const [teacherPickerOpen, setTeacherPickerOpen] = useState(false);

  const subject = subjects.find((s) => s._id === c.subjectId);
  const teacher = teachers.find((t) => t._id === c.staffId);

  return (
    <View style={{ gap: 6 }}>
      <Pressable
        onPress={() => !disabled && setSubjectPickerOpen((v) => !v)}
        disabled={disabled}
        style={({ pressed }) => [
          styles.cellBtn,
          { borderColor: C.border, backgroundColor: C.bg },
          pressed && { opacity: 0.85 },
        ]}
      >
        <Feather name="book-open" size={12} color={COLORS.brand} />
        <Text style={[styles.cellBtnText, { color: subject ? C.text : C.mutedSoft }]} numberOfLines={1}>
          {subject ? `${subject.name}${subject.code ? ` (${subject.code})` : ''}` : 'Pick subject…'}
        </Text>
        <Feather name={subjectPickerOpen ? 'chevron-up' : 'chevron-down'} size={12} color={C.mutedSoft} />
      </Pressable>
      {subjectPickerOpen && (
        <View style={[styles.cellChipWrap, { backgroundColor: C.card, borderColor: C.border }]}>
          {subjects.length === 0 ? (
            <Text style={[styles.helper, { color: C.mutedSoft }]}>
              No subjects for this class.
            </Text>
          ) : (
            <View style={styles.chipRow}>
              <Pressable
                onPress={() => {
                  onChange({ subjectId: '' });
                  setSubjectPickerOpen(false);
                }}
                style={({ pressed }) => [
                  styles.miniChip,
                  { backgroundColor: C.bg, borderColor: C.border },
                  !c.subjectId && styles.chipActive,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={[styles.miniChipText, { color: !c.subjectId ? '#fff' : C.text }]}>
                  None
                </Text>
              </Pressable>
              {subjects.map((s) => {
                const active = c.subjectId === s._id;
                return (
                  <Pressable
                    key={s._id}
                    onPress={() => {
                      onChange({ subjectId: s._id });
                      setSubjectPickerOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.miniChip,
                      { backgroundColor: C.bg, borderColor: C.border },
                      active && styles.chipActive,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Text style={[styles.miniChipText, { color: active ? '#fff' : C.text }]}>
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

      <Pressable
        onPress={() => !disabled && setTeacherPickerOpen((v) => !v)}
        disabled={disabled}
        style={({ pressed }) => [
          styles.cellBtn,
          { borderColor: C.border, backgroundColor: C.bg },
          pressed && { opacity: 0.85 },
        ]}
      >
        <Feather name="user" size={12} color={COLORS.brand} />
        <Text style={[styles.cellBtnText, { color: teacher ? C.text : C.mutedSoft }]} numberOfLines={1}>
          {teacher ? teacher.user?.name || teacher.designation || 'Teacher' : 'Pick teacher…'}
        </Text>
        <Feather name={teacherPickerOpen ? 'chevron-up' : 'chevron-down'} size={12} color={C.mutedSoft} />
      </Pressable>
      {teacherPickerOpen && (
        <View style={[styles.cellChipWrap, { backgroundColor: C.card, borderColor: C.border }]}>
          {teachers.length === 0 ? (
            <Text style={[styles.helper, { color: C.mutedSoft }]}>
              No teaching staff.
            </Text>
          ) : (
            <View style={styles.chipRow}>
              <Pressable
                onPress={() => {
                  onChange({ staffId: '' });
                  setTeacherPickerOpen(false);
                }}
                style={({ pressed }) => [
                  styles.miniChip,
                  { backgroundColor: C.bg, borderColor: C.border },
                  !c.staffId && styles.chipActive,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={[styles.miniChipText, { color: !c.staffId ? '#fff' : C.text }]}>
                  None
                </Text>
              </Pressable>
              {teachers.map((t) => {
                const active = c.staffId === t._id;
                return (
                  <Pressable
                    key={t._id}
                    onPress={() => {
                      onChange({ staffId: t._id });
                      setTeacherPickerOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.miniChip,
                      { backgroundColor: C.bg, borderColor: C.border },
                      active && styles.chipActive,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Text style={[styles.miniChipText, { color: active ? '#fff' : C.text }]}>
                      {t.user?.name || t.designation || '?'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      )}

      <TextInput
        value={c.room || ''}
        editable={!disabled}
        onChangeText={(v) => onChange({ room: v })}
        placeholder="Room (optional)"
        placeholderTextColor={C.mutedSoft}
        style={[
          styles.roomInput,
          { color: C.text, borderColor: C.border, backgroundColor: C.bg },
        ]}
      />
    </View>
  );
}

export default function EditorPanel() {
  const C = useColors();
  const { user } = useUserStore();

  const isAdmin = !!user?.role?.isPredefined;
  const canEdit = hasAnyAction(user?.role, [
    'create-timetable',
    'update-timetable',
    'create-all-branch-timetable',
    'update-all-branch-timetable',
  ]);
  const isOrgLevel = isAdmin || !!user?.role?.actions?.includes('view-all-branch-timetable');
  const userBranchId =
    (typeof user?.branchId === 'string' && user.branchId) ||
    user?.branchId?._id ||
    user?.branch?._id ||
    '';

  const [academicYear, setAcademicYear] = useState(currentAcademicYear());
  const [branchId, setBranchId] = useState(isOrgLevel ? '' : userBranchId);
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [day, setDay] = useState('mon');
  const [grid, setGrid] = useState({});

  const effectiveBranchId = isOrgLevel ? branchId : userBranchId;

  const { data: branchData } = useBranchesDropdown({ enabled: isOrgLevel });
  const branches = branchData?.data || [];

  const { data: classData } = useClassesForTT({
    branchId: effectiveBranchId || undefined,
    academicYear,
    enabled: !!effectiveBranchId && !!academicYear,
  });
  const classes = classData?.data || [];

  const { data: sectionData } = useSectionsForTT({
    classId,
    enabled: !!classId,
  });
  const sections = sectionData?.data || [];

  useEffect(() => {
    setClassId('');
    setSectionId('');
  }, [effectiveBranchId, academicYear]);
  useEffect(() => {
    setSectionId('');
  }, [classId]);

  const { data: ttRes, isFetching: ttLoading } = useSectionTimetable({
    sectionId,
    academicYear,
    enabled: !!sectionId,
  });
  const periodConfig = ttRes?.data?.periodConfig;
  const remoteGrid = ttRes?.data?.grid;

  const { data: subjectData } = useSubjectsForTT({
    classId,
    academicYear,
    enabled: !!classId,
  });
  const subjects = subjectData?.data || [];

  const { data: staffData } = useTeachingStaffForTT({
    branchId: effectiveBranchId || undefined,
    enabled: !!effectiveBranchId,
  });
  const teachers = staffData?.data || [];

  // Initialise local grid from server
  useEffect(() => {
    if (!remoteGrid || !periodConfig) {
      setGrid({});
      return;
    }
    const next = {};
    periodConfig.workingDays.forEach((d) => {
      next[d] = {};
      periodConfig.periods.forEach((p) => {
        const cell = remoteGrid?.[d]?.[p.number];
        if (cell) {
          next[d][p.number] = {
            slotType: cell.slotType,
            subjectId:
              typeof cell.subject === 'object' ? cell.subject?._id : cell.subjectId || '',
            staffId: typeof cell.staff === 'object' ? cell.staff?._id : cell.staffId || '',
            customLabel: cell.customLabel || '',
            room: cell.room || '',
            notes: cell.notes || '',
          };
        }
      });
    });
    setGrid(next);
  }, [remoteGrid, periodConfig]);

  // Ensure active day is in working days
  useEffect(() => {
    if (periodConfig?.workingDays?.length && !periodConfig.workingDays.includes(day)) {
      setDay(periodConfig.workingDays[0]);
    }
  }, [periodConfig?.workingDays, day]);

  const updateCell = (d, periodNumber, patch) => {
    setGrid((prev) => ({
      ...prev,
      [d]: {
        ...(prev[d] || {}),
        [periodNumber]: { ...(prev[d]?.[periodNumber] || {}), ...patch },
      },
    }));
  };

  const save = useBulkSaveSlots();

  // Half-filled lesson cells (subject without teacher or vice versa). The save
  // replaces the whole week, so dropping one would delete that lesson.
  const { incomplete } = useMemo(
    () => buildTimetableSlots(grid, periodConfig),
    [grid, periodConfig],
  );
  const incompleteSet = useMemo(() => incompleteKeys(incomplete), [incomplete]);

  const handleSave = () => {
    if (!sectionId || !periodConfig) return;
    const built = buildTimetableSlots(grid, periodConfig);
    if (built.incomplete.length) {
      const first = built.incomplete[0];
      if (first.day !== day) setDay(first.day);
      Toast.show({
        type: 'error',
        text1: `${built.incomplete.length} lesson${built.incomplete.length === 1 ? ' is' : 's are'} incomplete — not saved`,
        text2: describeIncomplete(built.incomplete, DAY_LABELS),
      });
      return;
    }
    const { slots } = built;
    if (!slots.length) {
      Toast.show({ type: 'error', text1: 'Add at least one slot before saving' });
      return;
    }
    save.mutate({
      sectionId,
      academicYear,
      mode: 'replace',
      slots,
    });
  };

  const periodsForDay = periodConfig?.periods || [];

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
        {isOrgLevel && (
          <PickerField
            label="BRANCH"
            value={branchId}
            onChange={setBranchId}
            options={branches.map((b) => ({ value: b._id, label: b.name }))}
            C={C}
          />
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

        <PickerField
          label="CLASS"
          value={classId}
          onChange={setClassId}
          disabled={!effectiveBranchId}
          placeholder="Pick branch first"
          options={classes.map((c) => ({
            value: c._id,
            label: `${c.name}${c.grade ? ` · Gr ${c.grade}` : ''}`,
          }))}
          C={C}
        />

        <PickerField
          label="SECTION"
          value={sectionId}
          onChange={setSectionId}
          disabled={!classId}
          placeholder="Pick class first"
          options={sections.map((s) => ({ value: s._id, label: s.name }))}
          C={C}
        />

        {canEdit && sectionId && periodConfig && (
          <Pressable
            onPress={handleSave}
            disabled={save.isPending}
            style={({ pressed }) => [
              styles.primary,
              (save.isPending || pressed) && { opacity: 0.85 },
            ]}
          >
            {save.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Feather name="save" size={16} color="#fff" />
                <Text style={styles.primaryText}>Save Whole Week</Text>
              </>
            )}
          </Pressable>
        )}
      </View>

      {!sectionId ? (
        <View style={[styles.empty, { backgroundColor: C.card, borderColor: C.border }]}>
          <Feather name="calendar" size={28} color={C.mutedSoft} />
          <Text style={[styles.emptyText, { color: C.muted }]}>
            Pick a section to load its timetable.
          </Text>
        </View>
      ) : ttLoading ? (
        <View style={[styles.empty, { backgroundColor: C.card, borderColor: C.border }]}>
          <ActivityIndicator size="large" color={COLORS.brand} />
        </View>
      ) : !periodConfig ? (
        <View style={[styles.warnBox, { backgroundColor: '#fef3c7', borderColor: '#fde68a' }]}>
          <Feather name="alert-circle" size={14} color="#92400e" />
          <Text style={[styles.warnText, { color: '#92400e' }]}>
            This branch has no default period config yet. Create one in the Configs tab first.
          </Text>
        </View>
      ) : (
        <>
          {/* Day picker */}
          <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[styles.label, { color: C.muted }]}>DAY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={[styles.chipRow, { paddingRight: 8 }]}>
                {periodConfig.workingDays.map((d) => {
                  const active = day === d;
                  return (
                    <Pressable
                      key={d}
                      onPress={() => setDay(d)}
                      style={({ pressed }) => [
                        styles.dayChip,
                        { backgroundColor: C.bg, borderColor: C.border },
                        active && styles.chipActive,
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayChipText,
                          { color: active ? '#fff' : C.text },
                        ]}
                      >
                        {DAY_LABELS[d]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          {periodsForDay.map((p) => {
            const cfg = PERIOD_PILL[p.type] || PERIOD_PILL.other;
            const isLesson = p.type === 'lesson';
            const cell = grid?.[day]?.[p.number];
            const isIncomplete = isLesson && incompleteSet.has(`${day}:${p.number}`);
            return (
              <View
                key={p.number}
                style={[
                  styles.periodCard,
                  { backgroundColor: C.card, borderColor: C.border },
                  isIncomplete && styles.periodCardIncomplete,
                ]}
              >
                <View style={styles.periodHeader}>
                  <View style={styles.numBadge}>
                    <Text style={styles.numBadgeText}>{p.number}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.periodName, { color: C.text }]} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <Text style={[styles.periodTime, { color: C.muted }]}>
                      {p.startTime} – {p.endTime}
                    </Text>
                  </View>
                  <View style={[styles.typePill, { backgroundColor: cfg.bg }]}>
                    <Text style={[styles.typePillText, { color: cfg.fg }]}>
                      {titleCase(p.type)}
                    </Text>
                  </View>
                </View>

                {isIncomplete && (
                  <Text style={styles.incompleteText}>
                    {cell?.subjectId ? 'Pick a teacher' : 'Pick a subject'} — or clear both
                    for no lesson.
                  </Text>
                )}

                {isLesson ? (
                  <LessonCell
                    cell={cell}
                    subjects={subjects}
                    teachers={teachers}
                    disabled={!canEdit}
                    onChange={(patch) => updateCell(day, p.number, patch)}
                    C={C}
                  />
                ) : (
                  <Text style={[styles.nonLesson, { color: C.muted, backgroundColor: C.bg }]}>
                    {p.name}
                  </Text>
                )}
              </View>
            );
          })}

          {!canEdit && (
            <Text style={[styles.helper, { color: C.mutedSoft, textAlign: 'center' }]}>
              You have read-only access to timetables.
            </Text>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, paddingBottom: 32, gap: 12 },

  card: { borderRadius: 14, padding: 12, borderWidth: 1, gap: 10 },
  empty: {
    borderRadius: 14,
    paddingVertical: 36,
    paddingHorizontal: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: { fontSize: 13, textAlign: 'center' },

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

  label: { fontSize: 10, letterSpacing: 1.1, fontWeight: '700', marginBottom: 4 },
  helper: { fontSize: 11 },

  input: {
    height: 42,
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
    maxWidth: 220,
  },
  chipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText: { fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  dayChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  dayChipText: { fontSize: 13, fontWeight: '700' },

  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.brand,
  },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  periodCard: { borderRadius: 14, padding: 12, borderWidth: 1, gap: 10 },
  periodCardIncomplete: { borderColor: '#dc2626', borderWidth: 2 },
  incompleteText: { color: '#b91c1c', fontSize: 12, fontWeight: '700' },
  periodHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  numBadge: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numBadgeText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  periodName: { fontSize: 14, fontWeight: '800' },
  periodTime: { fontSize: 11, marginTop: 1 },

  typePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  typePillText: { fontSize: 10, fontWeight: '800' },

  nonLesson: {
    fontSize: 12,
    fontStyle: 'italic',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    textAlign: 'center',
  },

  cellBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
  },
  cellBtnText: { flex: 1, fontSize: 12, fontWeight: '700' },
  cellChipWrap: { borderRadius: 10, padding: 10, borderWidth: 1, gap: 6 },
  miniChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: 220,
  },
  miniChipText: { fontSize: 11, fontWeight: '700' },
  roomInput: {
    height: 36,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 12,
  },
});
