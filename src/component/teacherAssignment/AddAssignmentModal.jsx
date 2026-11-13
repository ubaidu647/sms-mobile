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
import KeyboardAvoidingView from '../KeyboardAvoidingView';
import ToastModal from '../ToastModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useUserStore } from '../../store/userStore';
import { useBranchesDropdown } from '../../hooks/useBranchProfilesList';
import {
  useBulkCreateAssignments,
  useClassesForFilter,
  useCreateAssignment,
  useSectionsForClass,
  useSubjectsForClass,
  useTeachingStaffForFilter,
} from '../../hooks/useTeacherAssignments';
import {
  ACADEMIC_YEAR_REGEX,
  TEACHING_ROLES,
  currentAcademicYear,
  titleCase,
} from '../../constants/teacherAssignment';
import { useColors } from '../../theme/useColors';
import { COLORS } from '../../theme/colors';

export default function AddAssignmentModal({ open, mode = 'single', onClose }) {
  const C = useColors();
  const { user } = useUserStore();

  const isAdmin = !!user?.role?.isPredefined;
  const canCreateAllBranch =
    isAdmin || !!user?.role?.actions?.includes('create-all-branch-teaching-assignment');
  const userBranchId =
    (typeof user?.branchId === 'string' && user.branchId) ||
    user?.branchId?._id ||
    user?.branch?._id ||
    '';

  const isBulk = mode === 'bulk';

  const [branchId, setBranchId] = useState(canCreateAllBranch ? '' : userBranchId);
  const [academicYear, setAcademicYear] = useState(currentAcademicYear());
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [role, setRole] = useState('teacher');
  const [isPrimary, setIsPrimary] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedSectionIds, setSelectedSectionIds] = useState([]);
  const [bulkResult, setBulkResult] = useState(null);

  useEffect(() => {
    if (open) return;
    // reset
    setBranchId(canCreateAllBranch ? '' : userBranchId);
    setAcademicYear(currentAcademicYear());
    setClassId('');
    setSectionId('');
    setSubjectId('');
    setStaffId('');
    setRole('teacher');
    setIsPrimary(true);
    setStartDate('');
    setEndDate('');
    setNotes('');
    setSelectedSectionIds([]);
    setBulkResult(null);
  }, [open, canCreateAllBranch, userBranchId]);

  // Cascading resets when scope changes
  useEffect(() => {
    setClassId('');
    setSectionId('');
    setSubjectId('');
    setStaffId('');
    setSelectedSectionIds([]);
  }, [branchId, academicYear]);

  useEffect(() => {
    setSectionId('');
    setSubjectId('');
    setSelectedSectionIds([]);
  }, [classId]);

  const { data: branchData } = useBranchesDropdown({ enabled: canCreateAllBranch && open });
  const branches = branchData?.data || [];

  const { data: classData } = useClassesForFilter({
    branchId: branchId || undefined,
    academicYear: academicYear || undefined,
    enabled: open && !!branchId && !!academicYear,
  });
  const classes = classData?.data || [];

  const { data: sectionData } = useSectionsForClass({
    classId,
    enabled: open && !!classId,
  });
  const sections = sectionData?.data || [];

  const { data: subjectData } = useSubjectsForClass({
    classId,
    academicYear,
    enabled: open && !!classId,
  });
  const subjects = subjectData?.data || [];

  const { data: staffData } = useTeachingStaffForFilter({
    branchId: branchId || undefined,
    enabled: open && !!branchId,
  });
  const teachers = staffData?.data || [];

  const single = useCreateAssignment({
    onSuccess: () => onClose(),
  });
  const bulk = useBulkCreateAssignments({
    onSuccess: (data) => setBulkResult(data),
  });

  const toggleSection = (id) =>
    setSelectedSectionIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );

  const validate = () => {
    if (!branchId) return 'Branch is required';
    if (!ACADEMIC_YEAR_REGEX.test(academicYear || ''))
      return 'Academic year must be in format YYYY-YYYY';
    if (!classId) return 'Class is required';
    if (!subjectId) return 'Subject is required';
    if (!staffId) return 'Teacher is required';
    if (isBulk) {
      if (selectedSectionIds.length === 0) return 'Select at least one section';
    } else {
      if (!sectionId) return 'Section is required';
    }
    return null;
  };

  const handleSubmit = () => {
    const err = validate();
    if (err) {
      Toast.show({ type: 'error', text1: 'Invalid', text2: err });
      return;
    }
    const base = {
      staffId,
      subjectId,
      role,
      isPrimary,
    };
    if (startDate) base.startDate = startDate;
    if (endDate) base.endDate = endDate;
    if (notes.trim()) base.notes = notes.trim();
    if (isBulk) {
      bulk.mutate({ ...base, sectionIds: selectedSectionIds });
    } else {
      single.mutate({ ...base, sectionId });
    }
  };

  return (
    <ToastModal visible={open} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safe, { backgroundColor: C.card }]} edges={['top', 'bottom']}>
        <View style={[styles.header, { borderBottomColor: C.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: C.text }]}>
              {isBulk ? 'Bulk Assign Teacher' : 'Assign Teacher'}
            </Text>
            <Text style={[styles.subtitle, { color: C.muted }]}>
              {isBulk
                ? 'Assign one teacher to a subject across multiple sections'
                : 'Map a teacher to a subject for a specific section'}
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
            {bulkResult ? (
              <BulkResultView result={bulkResult} sections={sections} onClose={onClose} C={C} />
            ) : (
              <>
                <Text style={[styles.section, { color: C.muted }]}>SCOPE</Text>

                {canCreateAllBranch ? (
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
                    style={[
                      styles.input,
                      { color: C.text, borderColor: C.border, backgroundColor: C.bg },
                    ]}
                  />
                </View>

                <View>
                  <Text style={[styles.label, { color: C.muted }]}>CLASS *</Text>
                  {!branchId ? (
                    <Text style={[styles.helper, { color: C.mutedSoft }]}>
                      Select branch first.
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
                              numberOfLines={1}
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

                {!isBulk && (
                  <View>
                    <Text style={[styles.label, { color: C.muted }]}>SECTION *</Text>
                    {!classId ? (
                      <Text style={[styles.helper, { color: C.mutedSoft }]}>
                        Select class first.
                      </Text>
                    ) : sections.length === 0 ? (
                      <Text style={[styles.helper, { color: C.mutedSoft }]}>
                        No sections in this class.
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
                                {s.name} ({s.currentStrength}/{s.capacity})
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    )}
                  </View>
                )}

                {isBulk && (
                  <View>
                    <View style={styles.bulkHeader}>
                      <Text style={[styles.label, { color: C.muted, marginBottom: 0 }]}>
                        SECTIONS ({selectedSectionIds.length} SELECTED)
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <Pressable onPress={() => setSelectedSectionIds(sections.map((s) => s._id))}>
                          <Text style={[styles.linkText, { color: COLORS.brand }]}>Select all</Text>
                        </Pressable>
                        <Pressable onPress={() => setSelectedSectionIds([])}>
                          <Text style={[styles.linkText, { color: C.muted }]}>Clear</Text>
                        </Pressable>
                      </View>
                    </View>
                    {!classId ? (
                      <Text style={[styles.helper, { color: C.mutedSoft }]}>
                        Select a class to load sections.
                      </Text>
                    ) : sections.length === 0 ? (
                      <Text style={[styles.helper, { color: C.mutedSoft }]}>
                        No sections in this class.
                      </Text>
                    ) : (
                      <View
                        style={[
                          styles.bulkList,
                          { backgroundColor: C.bg, borderColor: C.border },
                        ]}
                      >
                        {sections.map((s) => {
                          const checked = selectedSectionIds.includes(s._id);
                          return (
                            <Pressable
                              key={s._id}
                              onPress={() => toggleSection(s._id)}
                              style={({ pressed }) => [
                                styles.bulkRow,
                                {
                                  backgroundColor: checked ? '#ccfbf1' : C.card,
                                  borderColor: checked ? '#99f6e4' : C.border,
                                },
                                pressed && { opacity: 0.85 },
                              ]}
                            >
                              <Feather
                                name={checked ? 'check-square' : 'square'}
                                size={16}
                                color={checked ? '#0f766e' : C.mutedSoft}
                              />
                              <Text
                                style={[
                                  styles.bulkRowText,
                                  { color: checked ? '#0f766e' : C.text },
                                ]}
                              >
                                Section {s.name}
                              </Text>
                              <Text style={[styles.bulkRowMeta, { color: C.muted }]}>
                                {s.currentStrength}/{s.capacity}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    )}
                  </View>
                )}

                <Text style={[styles.section, { color: C.muted }]}>SUBJECT & TEACHER</Text>

                <View>
                  <Text style={[styles.label, { color: C.muted }]}>SUBJECT *</Text>
                  {!classId ? (
                    <Text style={[styles.helper, { color: C.mutedSoft }]}>
                      Select class first.
                    </Text>
                  ) : subjects.length === 0 ? (
                    <Text style={[styles.helper, { color: C.mutedSoft }]}>
                      No subjects in this class.
                    </Text>
                  ) : (
                    <View style={styles.chipRow}>
                      {subjects.map((s) => {
                        const active = subjectId === s._id;
                        return (
                          <Pressable
                            key={s._id}
                            onPress={() => setSubjectId(s._id)}
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

                <View>
                  <Text style={[styles.label, { color: C.muted }]}>TEACHER *</Text>
                  {!branchId ? (
                    <Text style={[styles.helper, { color: C.mutedSoft }]}>
                      Select branch first.
                    </Text>
                  ) : teachers.length === 0 ? (
                    <Text style={[styles.helper, { color: C.mutedSoft }]}>
                      No teaching staff available.
                    </Text>
                  ) : (
                    <View style={styles.chipRow}>
                      {teachers.map((t) => {
                        const active = staffId === t._id;
                        const name = t.user?.name || t.userId?.name || t.name || '?';
                        return (
                          <Pressable
                            key={t._id}
                            onPress={() => setStaffId(t._id)}
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
                              {name}
                              {t.designation ? ` · ${t.designation}` : ''}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>

                <Text style={[styles.section, { color: C.muted }]}>ROLE</Text>

                <View>
                  <Text style={[styles.label, { color: C.muted }]}>ROLE</Text>
                  <View style={styles.chipRow}>
                    {TEACHING_ROLES.map((r) => {
                      const active = role === r;
                      return (
                        <Pressable
                          key={r}
                          onPress={() => setRole(r)}
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
                            {titleCase(r)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <Pressable
                  onPress={() => setIsPrimary((v) => !v)}
                  style={({ pressed }) => [
                    styles.primaryToggle,
                    {
                      backgroundColor: isPrimary ? '#fef3c7' : C.bg,
                      borderColor: isPrimary ? '#fde68a' : C.border,
                    },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Feather
                    name={isPrimary ? 'check-square' : 'square'}
                    size={14}
                    color={isPrimary ? '#92400e' : C.mutedSoft}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.primaryToggleText, { color: isPrimary ? '#92400e' : C.text }]}>
                      Primary teacher
                    </Text>
                    <Text style={[styles.primaryToggleHint, { color: isPrimary ? '#92400e' : C.muted }]}>
                      Will demote any existing primary for this subject + section.
                    </Text>
                  </View>
                </Pressable>

                <View style={styles.row2}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: C.muted }]}>START DATE</Text>
                    <TextInput
                      value={startDate}
                      onChangeText={setStartDate}
                      placeholder="2026-06-01"
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
                    <Text style={[styles.label, { color: C.muted }]}>END DATE</Text>
                    <TextInput
                      value={endDate}
                      onChangeText={setEndDate}
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

                <View>
                  <Text style={[styles.label, { color: C.muted }]}>NOTES</Text>
                  <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    placeholder="Optional internal note"
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
                  disabled={single.isPending || bulk.isPending}
                  style={({ pressed }) => [
                    styles.submit,
                    (single.isPending || bulk.isPending || pressed) && { opacity: 0.85 },
                  ]}
                >
                  {single.isPending || bulk.isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Feather name="check" size={16} color="#fff" />
                      <Text style={styles.submitText}>
                        {isBulk
                          ? `Assign to ${selectedSectionIds.length} section${
                              selectedSectionIds.length === 1 ? '' : 's'
                            }`
                          : 'Assign Teacher'}
                      </Text>
                    </>
                  )}
                </Pressable>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ToastModal>
  );
}

function BulkResultView({ result, sections, onClose, C }) {
  const sectionLookup = new Map((sections || []).map((s) => [s._id, s.name]));
  return (
    <View style={{ gap: 14 }}>
      <View style={[styles.resultBanner, { backgroundColor: '#dcfce7', borderColor: '#86efac' }]}>
        <Feather name="check-circle" size={20} color="#16a34a" />
        <View style={{ flex: 1 }}>
          <Text style={styles.resultTitle}>Bulk assignment complete</Text>
          <Text style={styles.resultSub}>
            Created {result.createdCount} of {result.total} requested.
          </Text>
        </View>
      </View>

      {result.created?.length > 0 && (
        <View>
          <Text style={[styles.label, { color: C.muted }]}>CREATED</Text>
          <View style={[styles.resultList, { borderColor: '#86efac' }]}>
            {result.created.map((c) => (
              <View key={c._id} style={styles.resultRow}>
                <Feather name="check-circle" size={14} color="#16a34a" />
                <Text style={[styles.resultText, { color: C.text }]} numberOfLines={1}>
                  Section {sectionLookup.get(c.sectionId) || c.sectionId}
                </Text>
                <Text style={[styles.resultMeta, { color: C.mutedSoft }]} numberOfLines={1}>
                  {c.serialNumber}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {result.skipped?.length > 0 && (
        <View>
          <Text style={[styles.label, { color: C.muted }]}>SKIPPED</Text>
          <View style={[styles.resultList, { borderColor: '#fde68a' }]}>
            {result.skipped.map((s, i) => (
              <View key={i} style={styles.resultRow}>
                <Feather name="alert-triangle" size={14} color="#f59e0b" />
                <Text style={[styles.resultText, { color: C.text }]} numberOfLines={1}>
                  Section {sectionLookup.get(s.sectionId) || s.sectionId}
                </Text>
                <Text style={[styles.resultMeta, { color: C.muted }]} numberOfLines={2}>
                  — {s.reason}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <Pressable
        onPress={onClose}
        style={({ pressed }) => [styles.submit, pressed && { opacity: 0.85 }]}
      >
        <Feather name="check" size={16} color="#fff" />
        <Text style={styles.submitText}>Done</Text>
      </Pressable>
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

  section: { fontSize: 11, letterSpacing: 1.1, fontWeight: '800', marginTop: 6 },
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

  bulkHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  linkText: { fontSize: 11, fontWeight: '700' },
  bulkList: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 8,
    gap: 6,
    maxHeight: 240,
  },
  bulkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  bulkRowText: { fontSize: 13, fontWeight: '700', flex: 1 },
  bulkRowMeta: { fontSize: 11, fontWeight: '600' },

  primaryToggle: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  primaryToggleText: { fontSize: 13, fontWeight: '700' },
  primaryToggleHint: { fontSize: 11, marginTop: 2 },

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

  resultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  resultTitle: { color: '#166534', fontSize: 14, fontWeight: '800' },
  resultSub: { color: '#166534', fontSize: 12, marginTop: 2 },

  resultList: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  resultText: { fontSize: 12, fontWeight: '600', flex: 1 },
  resultMeta: { fontSize: 11, flex: 1, textAlign: 'right' },
});
