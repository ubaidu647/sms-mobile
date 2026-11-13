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
import { useTeachingStaffDropdown } from '../hooks/useClasses';
import {
  createSectionSchema,
  editSectionSchema,
} from '../validation/classSchema';
import { useColors } from '../theme/useColors';
import { COLORS } from '../theme/colors';

function Field({ label, required, error, children, C }) {
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

function TextFieldCtl({ control, name, error, C, ...rest }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange, onBlur } }) => (
        <TextInput
          value={value != null ? String(value) : ''}
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

function ChipPickerCtl({ control, name, options, C }) {
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

export default function SectionForm({
  mode = 'create',
  cls,
  section = null,
  onSubmit,
  isPending,
  submitLabel,
}) {
  const C = useColors();
  const schema = mode === 'create' ? createSectionSchema : editSectionSchema;
  const branchId = cls?.branch?._id || (typeof cls?.branchId === 'string' ? cls.branchId : cls?.branchId?._id);

  const defaultValues =
    mode === 'create'
      ? {
          name: '',
          academicYear: cls?.academicYear || '',
          capacity: '',
          classTeacher: '',
          status: 'active',
        }
      : {
          name: section?.name || '',
          capacity: section?.capacity != null ? String(section.capacity) : '',
          classTeacher:
            (typeof section?.classTeacher === 'object'
              ? section?.classTeacher?._id
              : section?.classTeacher) ||
            section?.classTeacherInfo?._id ||
            '',
          status: section?.isActive === false ? 'inactive' : 'active',
        };

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: yupResolver(schema), defaultValues });

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
        ? ['name', 'academicYear', 'capacity', 'classTeacher', 'status']
        : ['name', 'capacity', 'classTeacher', 'status'];
    for (const k of fields) {
      const v = data[k];
      if (v !== '' && v !== null && v !== undefined) {
        if (k === 'capacity') payload[k] = Number(v);
        else payload[k] = v;
      }
    }
    if (mode === 'edit' && (data.classTeacher === '' || data.classTeacher == null)) {
      payload.classTeacher = null;
    }
    if (mode === 'edit' && section?.currentStrength > 0 && payload.capacity != null) {
      if (payload.capacity < section.currentStrength) {
        Toast.show({
          type: 'error',
          text1: 'Capacity too low',
          text2: `Cannot reduce below current strength (${section.currentStrength}).`,
        });
        return;
      }
    }
    onSubmit(payload);
  };

  return (
    <View style={{ gap: 14 }}>
      {mode === 'edit' && section?.currentStrength > 0 && (
        <View style={[styles.warnBanner, { borderColor: '#fde68a' }]}>
          <Feather name="info" size={16} color="#92400e" />
          <Text style={styles.warnBannerText}>
            {section.currentStrength} student{section.currentStrength !== 1 ? 's' : ''}{' '}
            enrolled — capacity can't drop below this number.
          </Text>
        </View>
      )}

      <Field label="Section Name" required={mode === 'create'} error={errors.name?.message} C={C}>
        <TextFieldCtl control={control} name="name" placeholder="A" error={errors.name} C={C} />
      </Field>

      {mode === 'create' && (
        <Field
          label="Academic Year"
          required
          error={errors.academicYear?.message}
          C={C}
        >
          <TextFieldCtl
            control={control}
            name="academicYear"
            placeholder="2025-2026"
            error={errors.academicYear}
            C={C}
          />
        </Field>
      )}

      <Field
        label="Capacity"
        required={mode === 'create'}
        error={errors.capacity?.message}
        C={C}
      >
        <TextFieldCtl
          control={control}
          name="capacity"
          placeholder="40"
          keyboardType="numeric"
          error={errors.capacity}
          C={C}
        />
      </Field>

      <Field label="Status" C={C}>
        <ChipPickerCtl
          control={control}
          name="status"
          C={C}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ]}
        />
      </Field>

      <Field label="Section Teacher (optional)" C={C}>
        {teachers.length > 0 ? (
          <ChipPickerCtl
            control={control}
            name="classTeacher"
            C={C}
            options={[
              { value: '', label: 'None' },
              ...teachers.map((s) => ({
                value: s._id,
                label: s.user?.name || s.serialNumber || s._id,
              })),
            ]}
          />
        ) : (
          <Text style={{ color: C.muted, fontSize: 12, fontStyle: 'italic' }}>
            No teaching staff loaded.
          </Text>
        )}
      </Field>

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
              {submitLabel || (mode === 'create' ? 'Create Section' : 'Save Changes')}
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
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
    height: 48,
    borderRadius: 999,
    backgroundColor: COLORS.brand,
  },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 14 },
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
