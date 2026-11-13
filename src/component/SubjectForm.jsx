import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useUserStore } from '../store/userStore';
import { useTeachingStaffDropdown } from '../hooks/useClasses';
import { useClassesDropdown } from '../hooks/useSubjects';
import { useColors } from '../theme/useColors';
import { COLORS } from '../theme/colors';
import { clearableNumber } from '../utils/clearableNumber';
import {
  SUBJECT_CATEGORIES,
  SUBJECT_CODE_REGEX,
  SUBJECT_TYPES,
  titleCase,
} from '../constants/subject';

const initial = {
  classId: '',
  name: '',
  code: '',
  subjectType: '',
  category: '',
  totalMarks: '',
  passingMarks: '',
  theoryMarks: '',
  practicalMarks: '',
  creditHours: '',
  defaultTeacher: '',
  status: 'active',
};

export default function SubjectForm({
  mode = 'create',
  subject,
  onSubmit,
  isPending,
  submitLabel,
}) {
  const C = useColors();
  const { user } = useUserStore();

  const isAdmin = !!user?.role?.isPredefined;
  const canCreateAllBranch =
    isAdmin || !!user?.role?.actions?.includes('create-all-branch-subject');
  const userBranchId =
    (typeof user?.branchId === 'string' && user.branchId) ||
    user?.branchId?._id ||
    user?.branch?._id ||
    '';

  // For create: scope classes to user's branch unless org-level.
  // For edit: class isn't changeable, so we don't need a class list.
  const { data: classData, isLoading: classesLoading } = useClassesDropdown({
    branchId: canCreateAllBranch ? undefined : userBranchId || undefined,
    enabled: mode === 'create',
  });
  const classes = classData?.data || [];

  const { data: staffData, isLoading: staffLoading } = useTeachingStaffDropdown({
    branchId: canCreateAllBranch ? undefined : userBranchId || undefined,
  });
  const teachingStaff = staffData?.data || [];

  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (mode === 'edit' && subject) {
      setForm({
        classId: subject.classId || subject.class?._id || '',
        name: subject.name || '',
        code: subject.code || '',
        subjectType: subject.subjectType || '',
        category: subject.category || '',
        totalMarks: subject.totalMarks?.toString() ?? '',
        passingMarks: subject.passingMarks?.toString() ?? '',
        theoryMarks: subject.theoryMarks?.toString() ?? '',
        practicalMarks: subject.practicalMarks?.toString() ?? '',
        creditHours: subject.creditHours?.toString() ?? '',
        defaultTeacher:
          subject.defaultTeacher || subject.teacherInfo?._id || '',
        status: subject.isActive === false ? 'inactive' : 'active',
      });
      setErrors({});
    } else if (mode === 'create') {
      setForm(initial);
      setErrors({});
    }
  }, [mode, subject]);

  const setField = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  const selectedClass = useMemo(
    () => classes.find((c) => c._id === form.classId),
    [classes, form.classId],
  );

  const sumMismatch = useMemo(() => {
    const t = Number(form.theoryMarks);
    const p = Number(form.practicalMarks);
    const total = Number(form.totalMarks);
    if (
      form.theoryMarks !== '' &&
      form.practicalMarks !== '' &&
      form.totalMarks !== '' &&
      !Number.isNaN(t) &&
      !Number.isNaN(p) &&
      !Number.isNaN(total)
    ) {
      return t + p !== total;
    }
    return false;
  }, [form.theoryMarks, form.practicalMarks, form.totalMarks]);

  const validate = () => {
    const e = {};
    if (mode === 'create' && !form.classId) e.classId = 'Class is required';
    if (mode === 'create' && !form.name?.trim()) e.name = 'Subject name is required';
    if (mode === 'create') {
      if (!form.code?.trim()) e.code = 'Code is required';
      else if (!SUBJECT_CODE_REGEX.test(form.code))
        e.code = 'Code must be 2–10 chars, letters/numbers/dashes only';
      if (!form.subjectType) e.subjectType = 'Type is required';
      if (!form.category) e.category = 'Category is required';
      if (!form.totalMarks) e.totalMarks = 'Total marks is required';
      if (!form.passingMarks) e.passingMarks = 'Passing marks is required';
    } else {
      if (form.code && !SUBJECT_CODE_REGEX.test(form.code))
        e.code = 'Code must be 2–10 chars, letters/numbers/dashes only';
    }

    if (form.totalMarks !== '' && Number(form.totalMarks) < 1)
      e.totalMarks = 'Min 1';
    if (form.passingMarks !== '' && Number(form.passingMarks) < 0)
      e.passingMarks = 'Min 0';
    if (
      form.totalMarks !== '' &&
      form.passingMarks !== '' &&
      Number(form.passingMarks) > Number(form.totalMarks)
    )
      e.passingMarks = 'Passing marks cannot exceed total';

    if (sumMismatch) e.practicalMarks = 'Theory + Practical must equal Total';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const payload = {};
    if (mode === 'create') {
      payload.classId = form.classId;
      payload.name = form.name.trim();
      payload.code = form.code.toUpperCase();
      payload.subjectType = form.subjectType;
      payload.category = form.category;
      payload.totalMarks = Number(form.totalMarks);
      payload.passingMarks = Number(form.passingMarks);
      if (form.theoryMarks !== '') payload.theoryMarks = Number(form.theoryMarks);
      if (form.practicalMarks !== '')
        payload.practicalMarks = Number(form.practicalMarks);
      if (form.creditHours !== '') payload.creditHours = Number(form.creditHours);
      if (form.defaultTeacher) payload.defaultTeacher = form.defaultTeacher;
      if (form.status) payload.status = form.status;
    } else {
      if (form.name?.trim()) payload.name = form.name.trim();
      if (form.code?.trim()) payload.code = form.code.toUpperCase();
      if (form.subjectType) payload.subjectType = form.subjectType;
      if (form.category) payload.category = form.category;
      if (form.totalMarks !== '') payload.totalMarks = Number(form.totalMarks);
      if (form.passingMarks !== '')
        payload.passingMarks = Number(form.passingMarks);
      // Blank clears these three: left out, the API keeps the old value.
      payload.theoryMarks = clearableNumber(form.theoryMarks);
      payload.practicalMarks = clearableNumber(form.practicalMarks);
      payload.creditHours = clearableNumber(form.creditHours);
      // Allow clearing teacher with null
      payload.defaultTeacher = form.defaultTeacher || null;
      if (form.status) payload.status = form.status;
    }
    onSubmit?.(payload);
  };

  return (
    <View style={{ gap: 18 }}>
      {mode === 'edit' && (
        <View style={styles.note}>
          <Feather name="info" size={14} color="#92400e" />
          <Text style={styles.noteText}>
            Class, branch and academic year cannot be changed after creation.
          </Text>
        </View>
      )}

      {/* Class */}
      {mode === 'create' && (
        <View>
          <Text style={[styles.label, { color: C.muted }]}>
            CLASS <Text style={{ color: COLORS.red }}>*</Text>
          </Text>
          {classesLoading ? (
            <View
              style={[
                styles.input,
                {
                  borderColor: C.border,
                  backgroundColor: C.bg,
                  justifyContent: 'center',
                },
              ]}
            >
              <ActivityIndicator size="small" color={COLORS.brand} />
            </View>
          ) : classes.length === 0 ? (
            <Text style={[styles.helper, { color: C.mutedSoft }]}>
              No classes available — create a class first.
            </Text>
          ) : (
            <View style={styles.chipWrap}>
              {classes.map((c) => {
                const active = form.classId === c._id;
                return (
                  <Pressable
                    key={c._id}
                    onPress={() => setField('classId', c._id)}
                    style={({ pressed }) => [
                      styles.classChip,
                      { backgroundColor: C.bg, borderColor: C.border },
                      active && styles.classChipActive,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.classChipText,
                        { color: C.text },
                        active && styles.classChipTextActive,
                      ]}
                    >
                      {c.name}
                      {c.grade ? ` · Gr ${c.grade}` : ''}
                      {c.academicYear ? ` · ${c.academicYear}` : ''}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
          {!!errors.classId && <Text style={styles.error}>{errors.classId}</Text>}
          {!!selectedClass?.academicYear && (
            <Text style={[styles.helper, { color: C.mutedSoft }]}>
              Academic Year: {selectedClass.academicYear}
            </Text>
          )}
        </View>
      )}

      {/* Identity */}
      <View style={styles.row2}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: C.muted }]}>
            NAME {mode === 'create' && <Text style={{ color: COLORS.red }}>*</Text>}
          </Text>
          <TextInput
            value={form.name}
            onChangeText={(v) => setField('name', v)}
            placeholder="Mathematics"
            placeholderTextColor={C.mutedSoft}
            style={[
              styles.input,
              {
                color: C.text,
                borderColor: errors.name ? COLORS.red : C.border,
                backgroundColor: C.bg,
              },
            ]}
          />
          {!!errors.name && <Text style={styles.error}>{errors.name}</Text>}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: C.muted }]}>
            CODE {mode === 'create' && <Text style={{ color: COLORS.red }}>*</Text>}
          </Text>
          <TextInput
            value={form.code}
            onChangeText={(v) => setField('code', v.toUpperCase())}
            placeholder="MATH"
            placeholderTextColor={C.mutedSoft}
            autoCapitalize="characters"
            style={[
              styles.input,
              {
                color: C.text,
                borderColor: errors.code ? COLORS.red : C.border,
                backgroundColor: C.bg,
              },
            ]}
          />
          {!!errors.code && <Text style={styles.error}>{errors.code}</Text>}
        </View>
      </View>

      {/* Type + Category */}
      <View>
        <Text style={[styles.label, { color: C.muted }]}>
          TYPE {mode === 'create' && <Text style={{ color: COLORS.red }}>*</Text>}
        </Text>
        <View style={styles.chipWrap}>
          {SUBJECT_TYPES.map((t) => {
            const active = form.subjectType === t;
            return (
              <Pressable
                key={t}
                onPress={() => setField('subjectType', t)}
                style={({ pressed }) => [
                  styles.pillChip,
                  { backgroundColor: C.bg, borderColor: C.border },
                  active && styles.pillChipActive,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text
                  style={[
                    styles.pillChipText,
                    { color: C.text },
                    active && styles.pillChipTextActive,
                  ]}
                >
                  {titleCase(t)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {!!errors.subjectType && (
          <Text style={styles.error}>{errors.subjectType}</Text>
        )}
      </View>

      <View>
        <Text style={[styles.label, { color: C.muted }]}>
          CATEGORY {mode === 'create' && <Text style={{ color: COLORS.red }}>*</Text>}
        </Text>
        <View style={styles.chipWrap}>
          {SUBJECT_CATEGORIES.map((c) => {
            const active = form.category === c;
            return (
              <Pressable
                key={c}
                onPress={() => setField('category', c)}
                style={({ pressed }) => [
                  styles.pillChip,
                  { backgroundColor: C.bg, borderColor: C.border },
                  active && styles.pillChipActive,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text
                  style={[
                    styles.pillChipText,
                    { color: C.text },
                    active && styles.pillChipTextActive,
                  ]}
                >
                  {titleCase(c)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {!!errors.category && <Text style={styles.error}>{errors.category}</Text>}
      </View>

      {/* Marks */}
      <View style={styles.row2}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: C.muted }]}>
            TOTAL MARKS {mode === 'create' && <Text style={{ color: COLORS.red }}>*</Text>}
          </Text>
          <TextInput
            value={form.totalMarks}
            onChangeText={(v) => setField('totalMarks', v.replace(/[^0-9]/g, ''))}
            placeholder="100"
            keyboardType="number-pad"
            placeholderTextColor={C.mutedSoft}
            style={[
              styles.input,
              {
                color: C.text,
                borderColor: errors.totalMarks ? COLORS.red : C.border,
                backgroundColor: C.bg,
              },
            ]}
          />
          {!!errors.totalMarks && (
            <Text style={styles.error}>{errors.totalMarks}</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: C.muted }]}>
            PASSING {mode === 'create' && <Text style={{ color: COLORS.red }}>*</Text>}
          </Text>
          <TextInput
            value={form.passingMarks}
            onChangeText={(v) => setField('passingMarks', v.replace(/[^0-9]/g, ''))}
            placeholder="40"
            keyboardType="number-pad"
            placeholderTextColor={C.mutedSoft}
            style={[
              styles.input,
              {
                color: C.text,
                borderColor: errors.passingMarks ? COLORS.red : C.border,
                backgroundColor: C.bg,
              },
            ]}
          />
          {!!errors.passingMarks && (
            <Text style={styles.error}>{errors.passingMarks}</Text>
          )}
        </View>
      </View>

      <View style={styles.row2}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: C.muted }]}>THEORY</Text>
          <TextInput
            value={form.theoryMarks}
            onChangeText={(v) => setField('theoryMarks', v.replace(/[^0-9]/g, ''))}
            placeholder="75"
            keyboardType="number-pad"
            placeholderTextColor={C.mutedSoft}
            style={[
              styles.input,
              { color: C.text, borderColor: C.border, backgroundColor: C.bg },
            ]}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: C.muted }]}>PRACTICAL</Text>
          <TextInput
            value={form.practicalMarks}
            onChangeText={(v) => setField('practicalMarks', v.replace(/[^0-9]/g, ''))}
            placeholder="25"
            keyboardType="number-pad"
            placeholderTextColor={C.mutedSoft}
            style={[
              styles.input,
              {
                color: C.text,
                borderColor: errors.practicalMarks ? COLORS.red : C.border,
                backgroundColor: C.bg,
              },
            ]}
          />
          {!!errors.practicalMarks && (
            <Text style={styles.error}>{errors.practicalMarks}</Text>
          )}
        </View>
      </View>
      <Text style={[styles.helper, { color: C.mutedSoft }]}>
        If both Theory and Practical are provided, they must add up to Total Marks.
      </Text>

      <View style={styles.row2}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: C.muted }]}>CREDIT HOURS</Text>
          <TextInput
            value={form.creditHours}
            onChangeText={(v) => setField('creditHours', v.replace(/[^0-9]/g, ''))}
            placeholder="5"
            keyboardType="number-pad"
            placeholderTextColor={C.mutedSoft}
            style={[
              styles.input,
              { color: C.text, borderColor: C.border, backgroundColor: C.bg },
            ]}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: C.muted }]}>STATUS</Text>
          <View style={styles.chipWrap}>
            {['active', 'inactive'].map((s) => {
              const active = form.status === s;
              return (
                <Pressable
                  key={s}
                  onPress={() => setField('status', s)}
                  style={({ pressed }) => [
                    styles.pillChip,
                    { backgroundColor: C.bg, borderColor: C.border },
                    active && styles.pillChipActive,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text
                    style={[
                      styles.pillChipText,
                      { color: C.text },
                      active && styles.pillChipTextActive,
                    ]}
                  >
                    {titleCase(s)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      {/* Default teacher */}
      <View>
        <Text style={[styles.label, { color: C.muted }]}>DEFAULT TEACHER</Text>
        {staffLoading ? (
          <View
            style={[
              styles.input,
              {
                borderColor: C.border,
                backgroundColor: C.bg,
                justifyContent: 'center',
              },
            ]}
          >
            <ActivityIndicator size="small" color={COLORS.brand} />
          </View>
        ) : teachingStaff.length === 0 ? (
          <Text style={[styles.helper, { color: C.mutedSoft }]}>
            No teaching staff available.
          </Text>
        ) : (
          <View style={styles.chipWrap}>
            <Pressable
              onPress={() => setField('defaultTeacher', '')}
              style={({ pressed }) => [
                styles.pillChip,
                { backgroundColor: C.bg, borderColor: C.border },
                !form.defaultTeacher && styles.pillChipActive,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text
                style={[
                  styles.pillChipText,
                  { color: C.text },
                  !form.defaultTeacher && styles.pillChipTextActive,
                ]}
              >
                None
              </Text>
            </Pressable>
            {teachingStaff.map((s) => {
              const active = form.defaultTeacher === s._id;
              return (
                <Pressable
                  key={s._id}
                  onPress={() => setField('defaultTeacher', s._id)}
                  style={({ pressed }) => [
                    styles.pillChip,
                    { backgroundColor: C.bg, borderColor: C.border },
                    active && styles.pillChipActive,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text
                    style={[
                      styles.pillChipText,
                      { color: C.text },
                      active && styles.pillChipTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {s.user?.name || '—'}
                    {s.designation ? ` · ${s.designation}` : ''}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {sumMismatch && (
        <View style={styles.errorBox}>
          <Feather name="alert-triangle" size={14} color="#991b1b" />
          <Text style={styles.errorBoxText}>
            Theory + Practical must equal Total Marks.
          </Text>
        </View>
      )}

      <Pressable
        onPress={handleSubmit}
        disabled={isPending}
        style={({ pressed }) => [
          styles.submit,
          (isPending || pressed) && { opacity: 0.8 },
        ]}
      >
        {isPending ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Feather name="check" size={16} color="#fff" />
            <Text style={styles.submitText}>{submitLabel || 'Save'}</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 11, letterSpacing: 1.1, fontWeight: '700', marginBottom: 8 },
  helper: { fontSize: 11, marginTop: 4 },
  error: { color: COLORS.red, fontSize: 11, marginTop: 4 },

  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
  },

  row2: { flexDirection: 'row', gap: 10 },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pillChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillChipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  pillChipText: { fontSize: 12, fontWeight: '600' },
  pillChipTextActive: { color: '#fff' },

  classChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  classChipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  classChipText: { fontSize: 12, fontWeight: '600' },
  classChipTextActive: { color: '#fff' },

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

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fee2e2',
    borderColor: '#fecaca',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  errorBoxText: { color: '#991b1b', fontSize: 12, flex: 1, fontWeight: '600' },

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
