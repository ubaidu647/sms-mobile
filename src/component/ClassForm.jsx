import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useBranchesDropdown } from '../hooks/useBranchProfilesList';
import { useTeachingStaffDropdown } from '../hooks/useClasses';
import {
  GRADES,
  CLASS_TYPES,
  MEDIUMS,
  titleCase,
  currentAcademicYear,
} from '../constants/classes';
import {
  createClassSchema,
  editClassSchema,
} from '../validation/classSchema';
import { useColors } from '../theme/useColors';
import { COLORS } from '../theme/colors';
import { clearableNumber } from '../utils/clearableNumber';

function Section({ title, children }) {
  const C = useColors();
  return (
    <View style={[styles.section, { backgroundColor: C.card, borderColor: C.border }]}>
      <Text style={[styles.sectionTitle, { color: COLORS.brand }]}>{title}</Text>
      <View style={{ gap: 12 }}>{children}</View>
    </View>
  );
}

function Field({ label, required, error, children }) {
  const C = useColors();
  return (
    <View style={{ gap: 6 }}>
      <Text style={[styles.label, { color: C.text }]}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      {children}
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

function TextFieldCtl({ control, name, error, ...rest }) {
  const C = useColors();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange, onBlur } }) => (
        <TextInput
          value={value ?? ''}
          onChangeText={onChange}
          onBlur={onBlur}
          placeholderTextColor={C.mutedSoft}
          style={[
            styles.input,
            { color: C.text, backgroundColor: C.bg, borderColor: C.border },
            error && { borderColor: COLORS.red },
          ]}
          {...rest}
        />
      )}
    />
  );
}

function ChipPickerCtl({ control, name, options }) {
  const C = useColors();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange } }) => (
        <View style={styles.chipRow}>
          {options.map((opt) => {
            const active = value === opt.value;
            return (
              <Pressable
                key={opt.value || '__none'}
                onPress={() => onChange(opt.value)}
                style={[
                  styles.chip,
                  { backgroundColor: C.bg, borderColor: C.border },
                  active && styles.chipActive,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: C.text },
                    active && styles.chipTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    />
  );
}

export default function ClassForm({
  mode = 'create',
  cls = null,
  canCreateAllBranch = false,
  defaultBranchId = '',
  onSubmit,
  isPending,
  submitLabel,
}) {
  const schema = mode === 'create' ? createClassSchema : editClassSchema;

  const defaultValues =
    mode === 'create'
      ? {
          name: '',
          grade: '',
          classType: '',
          academicYear: currentAcademicYear(),
          medium: 'english',
          classTeacher: '',
          totalCapacity: '',
          status: 'active',
          branchId: defaultBranchId || '',
        }
      : {
          name: cls?.name || '',
          classType: cls?.classType || '',
          medium: cls?.medium || '',
          classTeacher:
            (typeof cls?.classTeacher === 'object'
              ? cls?.classTeacher?._id
              : cls?.classTeacher) ||
            cls?.classTeacherInfo?._id ||
            '',
          totalCapacity: cls?.totalCapacity != null ? String(cls.totalCapacity) : '',
          status: cls?.isActive === false ? 'inactive' : 'active',
        };

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({ resolver: yupResolver(schema), defaultValues });

  // For non-admin or limited users, branch is pinned in create mode.
  const branchId = watch('branchId') || cls?.branch?._id || defaultBranchId;

  const { data: branchesData } = useBranchesDropdown({
    enabled: mode === 'create' && canCreateAllBranch,
  });
  const branches = branchesData?.data || [];

  const { data: teachersData } = useTeachingStaffDropdown({
    branchId,
    enabled: !!branchId,
  });
  const teachers = teachersData?.data || [];

  const onValidationError = (errs) => {
    const first = Object.values(errs || {}).find((e) => e?.message)?.message;
    Toast.show({
      type: 'error',
      text1: 'Please fix the highlighted fields',
      text2: first || 'Some fields are invalid',
    });
  };

  const submit = (data) => {
    const payload = {};
    const fields =
      mode === 'create'
        ? [
            'name',
            'grade',
            'classType',
            'academicYear',
            'medium',
            'classTeacher',
            'totalCapacity',
            'status',
            'branchId',
          ]
        : [
            'name',
            'classType',
            'medium',
            'classTeacher',
            'totalCapacity',
            'status',
          ];
    for (const k of fields) {
      const v = data[k];
      if (v !== '' && v !== null && v !== undefined) {
        if (k === 'totalCapacity') payload[k] = Number(v);
        else payload[k] = v;
      }
    }
    // Drop branchId on create when user can't pick one (backend infers from user).
    if (mode === 'create' && !canCreateAllBranch) delete payload.branchId;
    // Explicitly null teacher if cleared on edit.
    if (mode === 'edit' && (data.classTeacher === '' || data.classTeacher == null)) {
      payload.classTeacher = null;
    }
    // Blank clears the capacity: left out, the API keeps the old value.
    if (mode === 'edit') payload.totalCapacity = clearableNumber(data.totalCapacity);
    onSubmit(payload);
  };

  return (
    <View style={{ gap: 14 }}>
      {mode === 'edit' && (
        <View style={[styles.warnBanner, { borderColor: '#fde68a' }]}>
          <Feather name="info" size={16} color="#92400e" />
          <Text style={styles.warnBannerText}>
            Grade and academic year cannot be changed after creation.
          </Text>
        </View>
      )}

      <Section title="Identity">
        <Field label="Class Name" required={mode === 'create'} error={errors.name?.message}>
          <TextFieldCtl control={control} name="name" placeholder="e.g. Grade 5 — A" error={errors.name} />
        </Field>
        {mode === 'create' && (
          <Field label="Grade" required error={errors.grade?.message}>
            <ChipPickerCtl
              control={control}
              name="grade"
              options={GRADES.map((v) => ({ value: v, label: titleCase(v) }))}
            />
          </Field>
        )}
        <Field label="Class Type" required={mode === 'create'} error={errors.classType?.message}>
          <ChipPickerCtl
            control={control}
            name="classType"
            options={CLASS_TYPES.map((v) => ({ value: v, label: titleCase(v) }))}
          />
        </Field>
        {mode === 'create' && (
          <Field label="Academic Year" required error={errors.academicYear?.message}>
            <TextFieldCtl
              control={control}
              name="academicYear"
              placeholder="2025-2026"
              error={errors.academicYear}
            />
          </Field>
        )}
        <Field label="Medium">
          <ChipPickerCtl
            control={control}
            name="medium"
            options={MEDIUMS.map((v) => ({ value: v, label: titleCase(v) }))}
          />
        </Field>
      </Section>

      <Section title="Capacity & Status">
        <Field label="Total Capacity (across sections)">
          <TextFieldCtl
            control={control}
            name="totalCapacity"
            placeholder="120"
            keyboardType="numeric"
          />
        </Field>
        <Field label="Status">
          <ChipPickerCtl
            control={control}
            name="status"
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
        </Field>
      </Section>

      {mode === 'create' && canCreateAllBranch && (
        <Section title="Branch">
          <Field label="Branch" error={errors.branchId?.message}>
            <ChipPickerCtl
              control={control}
              name="branchId"
              options={branches.map((b) => ({ value: b._id, label: b.name }))}
            />
          </Field>
        </Section>
      )}

      <Section title="Class Teacher (optional)">
        <Field label="Teacher">
          {teachers.length > 0 ? (
            <ChipPickerCtl
              control={control}
              name="classTeacher"
              options={[
                { value: '', label: 'None' },
                ...teachers.map((s) => ({
                  value: s._id,
                  label: s.user?.name || s.serialNumber || s._id,
                })),
              ]}
            />
          ) : (
            <Text style={{ color: '#9ca3af', fontSize: 12, fontStyle: 'italic' }}>
              No teaching staff loaded — pick a branch first or check that
              teachers exist.
            </Text>
          )}
        </Field>
      </Section>

      <Pressable
        onPress={handleSubmit(submit, onValidationError)}
        disabled={isPending}
        style={({ pressed }) => [
          styles.submitBtn,
          pressed && { opacity: 0.9 },
          isPending && { opacity: 0.7 },
        ]}
      >
        {isPending ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Feather name="save" size={16} color="#fff" />
            <Text style={styles.submitText}>
              {submitLabel || (mode === 'create' ? 'Create Class' : 'Save Changes')}
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { borderRadius: 14, padding: 14, borderWidth: 1, gap: 12 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  label: { fontSize: 12, fontWeight: '700' },
  required: { color: COLORS.red },
  errorText: { color: COLORS.red, fontSize: 11 },
  input: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 10,
    fontSize: 14,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  chipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText: { fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 999,
    backgroundColor: COLORS.brand,
  },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  warnBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  warnBannerText: { color: '#92400e', fontSize: 12, flex: 1, lineHeight: 18 },
});
