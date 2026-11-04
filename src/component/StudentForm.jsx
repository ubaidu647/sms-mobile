import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useBranchesDropdown } from '../hooks/useBranchProfilesList';
import { useClassesDropdown, useSectionsDropdown } from '../hooks/useStudents';
import {
  GENDERS,
  BLOOD_GROUPS,
  ADMISSION_TYPES,
  ACADEMIC_STATUSES,
  titleCase,
  currentAcademicYear,
  todayISO,
} from '../constants/students';
import {
  createStudentSchema,
  editStudentSchema,
} from '../validation/studentSchema';
import { useColors } from '../theme/useColors';
import { COLORS } from '../theme/colors';
import { PASSWORD_MIN } from '../utils/changePassword';

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
                key={String(opt.value || '__none')}
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

function PhotoField({ value, currentUrl, onChange }) {
  const C = useColors();
  const showUri = value?.uri || currentUrl;

  const pick = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Toast.show({ type: 'info', text1: 'Permission required to pick photo' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset) return;
    const filename = asset.uri.split('/').pop() || `photo-${Date.now()}.jpg`;
    const extMatch = /\.(jpg|jpeg|png|webp)$/i.exec(filename);
    const ext = (extMatch?.[1] || 'jpg').toLowerCase();
    onChange({
      uri: asset.uri,
      name: filename,
      type: ext === 'jpg' ? 'image/jpeg' : `image/${ext}`,
    });
  };

  return (
    <View style={[styles.photoBox, { borderColor: C.border }]}>
      <View style={[styles.photoPreview, { backgroundColor: C.bg }]}>
        {showUri ? (
          <Image source={{ uri: showUri }} style={styles.photoImg} resizeMode="cover" />
        ) : (
          <Feather name="user" size={36} color={C.mutedSoft} />
        )}
      </View>
      <View style={styles.photoActions}>
        <Pressable
          onPress={pick}
          style={({ pressed }) => [
            styles.photoBtn,
            styles.photoBtnPrimary,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Feather name="upload" size={14} color="#fff" />
          <Text style={styles.photoBtnPrimaryText}>
            {showUri ? 'Replace' : 'Choose'}
          </Text>
        </Pressable>
        {!!value && (
          <Pressable
            onPress={() => onChange(null)}
            style={({ pressed }) => [
              styles.photoBtn,
              styles.photoBtnGhost,
              { backgroundColor: C.bg, borderColor: C.border },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Feather name="x" size={14} color={C.text} />
            <Text style={[styles.photoBtnGhostText, { color: C.text }]}>Clear</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function StudentForm({
  mode = 'create',
  student = null,
  canCreateAllBranch = false,
  defaultBranchId = '',
  onSubmit,
  isPending,
  submitLabel,
}) {
  const C = useColors();
  const schema = mode === 'create' ? createStudentSchema : editStudentSchema;

  const defaultValues =
    mode === 'create'
      ? {
          name: '',
          email: '',
          password: '',
          phone: '',
          branchId: defaultBranchId || '',
          academicYear: currentAcademicYear(),
          classId: '',
          sectionId: '',
          admissionDate: todayISO(),
          admissionType: 'new',
          dob: '',
          gender: '',
          bloodGroup: '',
          nationality: 'Pakistani',
          religion: '',
          bForm: '',
          placeOfBirth: '',
          fatherName: '',
          fatherCnic: '',
          fatherPhone: '',
          fatherEmail: '',
          fatherOccupation: '',
          fatherMonthlyIncome: '',
          motherName: '',
          motherCnic: '',
          motherPhone: '',
          motherOccupation: '',
          emergencyName: '',
          emergencyPhone: '',
          emergencyRelation: '',
          street: '',
          city: '',
          state: '',
          postalCode: '',
          country: 'Pakistan',
          prevSchoolName: '',
          prevLastClass: '',
          prevReasonForLeaving: '',
          feeDiscount: '',
          feeWaiver: 'false',
          feeNotes: '',
        }
      : {
          name: student?.user?.name || '',
          phone: student?.phone || '',
          dob: student?.dob ? String(student.dob).slice(0, 10) : '',
          gender: student?.gender || '',
          bloodGroup: student?.bloodGroup || '',
          nationality: student?.nationality || '',
          religion: student?.religion || '',
          bForm: student?.bForm || '',
          placeOfBirth: student?.placeOfBirth || '',
          fatherName: student?.father?.name || '',
          fatherCnic: student?.father?.cnic || '',
          fatherPhone: student?.father?.phone || '',
          fatherEmail: student?.father?.email || '',
          fatherOccupation: student?.father?.occupation || '',
          fatherMonthlyIncome:
            student?.father?.monthlyIncome != null
              ? String(student.father.monthlyIncome)
              : '',
          motherName: student?.mother?.name || '',
          motherCnic: student?.mother?.cnic || '',
          motherPhone: student?.mother?.phone || '',
          motherOccupation: student?.mother?.occupation || '',
          emergencyName: student?.emergencyContact?.name || '',
          emergencyPhone: student?.emergencyContact?.phone || '',
          emergencyRelation: student?.emergencyContact?.relation || '',
          street: student?.address?.street || '',
          city: student?.address?.city || '',
          state: student?.address?.state || '',
          postalCode: student?.address?.postalCode || '',
          country: student?.address?.country || '',
          academicStatus: student?.academicStatus || 'enrolled',
          isActive: student?.isActive === false ? 'false' : 'true',
          feeDiscount:
            student?.feeDiscount != null ? String(student.feeDiscount) : '',
          feeWaiver: student?.feeWaiver ? 'true' : 'false',
          feeNotes: student?.feeNotes || '',
        };

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({ resolver: yupResolver(schema), defaultValues });

  // Dependent dropdowns
  const branchId = useWatch({ control, name: 'branchId' });
  const academicYear = useWatch({ control, name: 'academicYear' });
  const classId = useWatch({ control, name: 'classId' });
  const admissionType = useWatch({ control, name: 'admissionType' });

  const effectiveBranch =
    mode === 'create' ? (canCreateAllBranch ? branchId : defaultBranchId) : null;

  const { data: branchesData } = useBranchesDropdown({
    enabled: mode === 'create' && canCreateAllBranch,
  });
  const branches = branchesData?.data || [];

  const { data: classesData } = useClassesDropdown({
    branchId: effectiveBranch,
    academicYear,
    enabled: mode === 'create' && !!effectiveBranch && !!academicYear,
  });
  const classes = classesData?.data || [];

  const { data: sectionsData } = useSectionsDropdown(classId, {
    enabled: mode === 'create' && !!classId,
  });
  const sections = sectionsData?.data || [];

  // Reset class/section when their parent changes
  useEffect(() => {
    if (mode === 'create') setValue('classId', '');
  }, [effectiveBranch, academicYear, mode, setValue]);

  useEffect(() => {
    if (mode === 'create') setValue('sectionId', '');
  }, [classId, mode, setValue]);

  const [photo, setPhoto] = useState(null);

  const onValidationError = (errs) => {
    const first = Object.values(errs || {}).find((e) => e?.message)?.message;
    Toast.show({
      type: 'error',
      text1: 'Please fix the highlighted fields',
      text2: first || 'Some fields are invalid',
    });
  };

  const submit = (data) => {
    const fd = new FormData();

    const appendIfSet = (key, value) => {
      if (value !== '' && value !== null && value !== undefined)
        fd.append(key, String(value));
    };

    const scalars =
      mode === 'create'
        ? [
            'name',
            'email',
            'password',
            'phone',
            'branchId',
            'classId',
            'sectionId',
            'academicYear',
            'admissionDate',
            'admissionType',
            'dob',
            'gender',
            'bloodGroup',
            'nationality',
            'religion',
            'bForm',
            'placeOfBirth',
            'feeDiscount',
            'feeWaiver',
            'feeNotes',
          ]
        : [
            'name',
            'phone',
            'dob',
            'gender',
            'bloodGroup',
            'nationality',
            'religion',
            'bForm',
            'placeOfBirth',
            'academicStatus',
            'isActive',
            'feeDiscount',
            'feeWaiver',
            'feeNotes',
          ];

    for (const k of scalars) appendIfSet(k, data[k]);

    // Drop branchId on create when not allowed
    if (mode === 'create' && !canCreateAllBranch) {
      // backend infers from token
      // (we sent it above, but if it was empty we'd skip; if user has defaultBranchId we keep it)
    }

    // Nested objects
    const father = {
      name: data.fatherName || '',
      cnic: data.fatherCnic || '',
      phone: data.fatherPhone || '',
      email: data.fatherEmail || '',
      occupation: data.fatherOccupation || '',
      ...(data.fatherMonthlyIncome
        ? { monthlyIncome: Number(data.fatherMonthlyIncome) }
        : {}),
    };
    if (Object.values(father).some((v) => v !== '' && v != null)) {
      fd.append('father', JSON.stringify(father));
    }

    const mother = {
      name: data.motherName || '',
      cnic: data.motherCnic || '',
      phone: data.motherPhone || '',
      occupation: data.motherOccupation || '',
    };
    if (Object.values(mother).some((v) => v !== '' && v != null)) {
      fd.append('mother', JSON.stringify(mother));
    }

    const emerg = {
      name: data.emergencyName || '',
      phone: data.emergencyPhone || '',
      relation: data.emergencyRelation || '',
    };
    if (Object.values(emerg).some((v) => v !== '')) {
      fd.append('emergencyContact', JSON.stringify(emerg));
    }

    const address = {
      street: data.street || '',
      city: data.city || '',
      state: data.state || '',
      postalCode: data.postalCode || '',
      country: data.country || '',
    };
    if (Object.values(address).some((v) => v !== '')) {
      fd.append('address', JSON.stringify(address));
    }

    if (
      mode === 'create' &&
      data.admissionType === 'transfer' &&
      (data.prevSchoolName || data.prevLastClass || data.prevReasonForLeaving)
    ) {
      fd.append(
        'previousSchool',
        JSON.stringify({
          name: data.prevSchoolName || '',
          lastClass: data.prevLastClass || '',
          reasonForLeaving: data.prevReasonForLeaving || '',
        }),
      );
    }

    if (photo?.uri) {
      fd.append('photo', { uri: photo.uri, name: photo.name, type: photo.type });
    }

    onSubmit(fd);
  };

  // ───── render ─────

  return (
    <View style={{ gap: 14 }}>
      {mode === 'edit' && (
        <View style={[styles.warnBanner, { borderColor: '#fde68a' }]}>
          <Feather name="info" size={16} color="#92400e" />
          <Text style={styles.warnBannerText}>
            Email, password, class, section, academic year, admission number and roll
            number cannot be changed from here. Use Transfer to move the student.
          </Text>
        </View>
      )}

      <Section title="Account">
        <Field label="Name" required={mode === 'create'} error={errors.name?.message}>
          <TextFieldCtl
            control={control}
            name="name"
            placeholder="Full name"
            autoCapitalize="words"
            error={errors.name}
          />
        </Field>
        {mode === 'create' && (
          <Field label="Email" required error={errors.email?.message}>
            <TextFieldCtl
              control={control}
              name="email"
              placeholder="student@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
            />
          </Field>
        )}
        {mode === 'create' && (
          <Field label="Password" error={errors.password?.message}>
            <TextFieldCtl
              control={control}
              name="password"
              placeholder={`Min ${PASSWORD_MIN} chars — defaults to admission number`}
              secureTextEntry
              autoCapitalize="none"
              error={errors.password}
            />
          </Field>
        )}
        <Field label="Phone">
          <TextFieldCtl control={control} name="phone" placeholder="+92 …" keyboardType="phone-pad" />
        </Field>
      </Section>

      {mode === 'create' && (
        <Section title="Enrollment">
          {canCreateAllBranch && (
            <Field label="Branch" required error={errors.branchId?.message}>
              <ChipPickerCtl
                control={control}
                name="branchId"
                options={branches.map((b) => ({ value: b._id, label: b.name }))}
              />
            </Field>
          )}
          <Field
            label="Academic Year"
            required
            error={errors.academicYear?.message}
          >
            <TextFieldCtl
              control={control}
              name="academicYear"
              placeholder="2025-2026"
              error={errors.academicYear}
            />
          </Field>
          <Field label="Class" required error={errors.classId?.message}>
            {effectiveBranch && academicYear ? (
              classes.length > 0 ? (
                <ChipPickerCtl
                  control={control}
                  name="classId"
                  options={classes.map((c) => ({
                    value: c._id,
                    label: `${c.name} (${c.grade?.toUpperCase()})`,
                  }))}
                />
              ) : (
                <Text style={{ color: C.muted, fontSize: 12, fontStyle: 'italic' }}>
                  No active classes for this branch/year.
                </Text>
              )
            ) : (
              <Text style={{ color: C.muted, fontSize: 12, fontStyle: 'italic' }}>
                Pick a branch and academic year first.
              </Text>
            )}
          </Field>
          <Field label="Section" required error={errors.sectionId?.message}>
            {classId ? (
              sections.length > 0 ? (
                <ChipPickerCtl
                  control={control}
                  name="sectionId"
                  options={sections.map((s) => {
                    const cap = s.capacity ?? 0;
                    const cur = s.currentStrength ?? 0;
                    const full = cap > 0 && cur >= cap;
                    return {
                      value: s._id,
                      label: `${s.name} · ${cur}/${cap}${full ? ' · Full' : ''}`,
                    };
                  })}
                />
              ) : (
                <Text style={{ color: C.muted, fontSize: 12, fontStyle: 'italic' }}>
                  No sections in this class yet.
                </Text>
              )
            ) : (
              <Text style={{ color: C.muted, fontSize: 12, fontStyle: 'italic' }}>
                Pick a class first.
              </Text>
            )}
          </Field>
          <Field label="Admission Date" required error={errors.admissionDate?.message}>
            <TextFieldCtl
              control={control}
              name="admissionDate"
              placeholder="YYYY-MM-DD"
              error={errors.admissionDate}
            />
          </Field>
          <Field label="Admission Type">
            <ChipPickerCtl
              control={control}
              name="admissionType"
              options={ADMISSION_TYPES.map((v) => ({
                value: v,
                label: titleCase(v),
              }))}
            />
          </Field>
        </Section>
      )}

      {mode === 'edit' && (
        <Section title="Academic Status">
          <Field label="Status">
            <ChipPickerCtl
              control={control}
              name="academicStatus"
              options={ACADEMIC_STATUSES.map((v) => ({
                value: v,
                label: titleCase(v),
              }))}
            />
          </Field>
          <Field label="Active / Blocked">
            <ChipPickerCtl
              control={control}
              name="isActive"
              options={[
                { value: 'true', label: 'Active' },
                { value: 'false', label: 'Blocked' },
              ]}
            />
          </Field>
        </Section>
      )}

      <Section title="Personal">
        <Field label="Date of Birth" required={mode === 'create'} error={errors.dob?.message}>
          <TextFieldCtl control={control} name="dob" placeholder="YYYY-MM-DD" error={errors.dob} />
        </Field>
        <Field label="Gender" required={mode === 'create'} error={errors.gender?.message}>
          <ChipPickerCtl
            control={control}
            name="gender"
            options={GENDERS.map((v) => ({ value: v, label: titleCase(v) }))}
          />
        </Field>
        <Field label="Blood Group">
          <ChipPickerCtl
            control={control}
            name="bloodGroup"
            options={[
              { value: '', label: 'None' },
              ...BLOOD_GROUPS.map((v) => ({ value: v, label: v })),
            ]}
          />
        </Field>
        <Field label="Nationality">
          <TextFieldCtl control={control} name="nationality" placeholder="Pakistani" />
        </Field>
        <Field label="Religion">
          <TextFieldCtl control={control} name="religion" placeholder="Islam" />
        </Field>
        <Field label="B-Form / Birth Certificate #">
          <TextFieldCtl control={control} name="bForm" placeholder="00000-0000000-0" />
        </Field>
        <Field label="Place of Birth">
          <TextFieldCtl control={control} name="placeOfBirth" placeholder="Karachi" />
        </Field>
      </Section>

      <Section title="Father">
        <Field label="Name" required={mode === 'create'} error={errors.fatherName?.message}>
          <TextFieldCtl control={control} name="fatherName" placeholder="Full name" error={errors.fatherName} />
        </Field>
        <Field label="CNIC">
          <TextFieldCtl control={control} name="fatherCnic" placeholder="00000-0000000-0" />
        </Field>
        <Field label="Phone">
          <TextFieldCtl control={control} name="fatherPhone" placeholder="+92 …" keyboardType="phone-pad" />
        </Field>
        <Field label="Email" error={errors.fatherEmail?.message}>
          <TextFieldCtl
            control={control}
            name="fatherEmail"
            placeholder="father@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.fatherEmail}
          />
        </Field>
        <Field label="Occupation">
          <TextFieldCtl control={control} name="fatherOccupation" placeholder="Engineer" />
        </Field>
        <Field label="Monthly Income (PKR)" error={errors.fatherMonthlyIncome?.message}>
          <TextFieldCtl
            control={control}
            name="fatherMonthlyIncome"
            placeholder="80000"
            keyboardType="numeric"
            error={errors.fatherMonthlyIncome}
          />
        </Field>
      </Section>

      <Section title="Mother">
        <Field label="Name" required={mode === 'create'} error={errors.motherName?.message}>
          <TextFieldCtl control={control} name="motherName" placeholder="Full name" error={errors.motherName} />
        </Field>
        <Field label="CNIC">
          <TextFieldCtl control={control} name="motherCnic" placeholder="00000-0000000-0" />
        </Field>
        <Field label="Phone">
          <TextFieldCtl control={control} name="motherPhone" placeholder="+92 …" keyboardType="phone-pad" />
        </Field>
        <Field label="Occupation">
          <TextFieldCtl control={control} name="motherOccupation" placeholder="Teacher" />
        </Field>
      </Section>

      <Section title="Emergency Contact">
        <Field
          label="Name"
          required={mode === 'create'}
          error={errors.emergencyName?.message}
        >
          <TextFieldCtl control={control} name="emergencyName" placeholder="Full name" error={errors.emergencyName} />
        </Field>
        <Field
          label="Phone"
          required={mode === 'create'}
          error={errors.emergencyPhone?.message}
        >
          <TextFieldCtl
            control={control}
            name="emergencyPhone"
            placeholder="+92 …"
            keyboardType="phone-pad"
            error={errors.emergencyPhone}
          />
        </Field>
        <Field
          label="Relation"
          required={mode === 'create'}
          error={errors.emergencyRelation?.message}
        >
          <TextFieldCtl
            control={control}
            name="emergencyRelation"
            placeholder="Uncle / Aunt / etc."
            error={errors.emergencyRelation}
          />
        </Field>
      </Section>

      <Section title="Address">
        <Field label="Street">
          <TextFieldCtl control={control} name="street" placeholder="House, Street" multiline />
        </Field>
        <Field label="City">
          <TextFieldCtl control={control} name="city" placeholder="City" />
        </Field>
        <Field label="State / Province">
          <TextFieldCtl control={control} name="state" placeholder="State" />
        </Field>
        <Field label="Postal Code">
          <TextFieldCtl control={control} name="postalCode" placeholder="75500" />
        </Field>
        <Field label="Country">
          <TextFieldCtl control={control} name="country" placeholder="Pakistan" />
        </Field>
      </Section>

      {mode === 'create' && admissionType === 'transfer' && (
        <Section title="Previous School">
          <Field label="School Name">
            <TextFieldCtl control={control} name="prevSchoolName" placeholder="ABC School" />
          </Field>
          <Field label="Last Class Attended">
            <TextFieldCtl control={control} name="prevLastClass" placeholder="Grade 4" />
          </Field>
          <Field label="Reason for Leaving">
            <TextFieldCtl
              control={control}
              name="prevReasonForLeaving"
              placeholder="Family relocation"
              multiline
            />
          </Field>
        </Section>
      )}

      <Section title="Fees (optional)">
        <Field label="Discount (%)" error={errors.feeDiscount?.message}>
          <TextFieldCtl
            control={control}
            name="feeDiscount"
            placeholder="0"
            keyboardType="numeric"
            error={errors.feeDiscount}
          />
        </Field>
        <Field label="Fee Waiver">
          <ChipPickerCtl
            control={control}
            name="feeWaiver"
            options={[
              { value: 'false', label: 'No' },
              { value: 'true', label: 'Yes' },
            ]}
          />
        </Field>
        <Field label="Notes">
          <TextFieldCtl
            control={control}
            name="feeNotes"
            placeholder="Sibling discount / scholarship reason"
            multiline
          />
        </Field>
      </Section>

      <Section title="Photo">
        <PhotoField value={photo} currentUrl={student?.photo} onChange={setPhoto} />
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
              {submitLabel || (mode === 'create' ? 'Enroll Student' : 'Save Changes')}
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
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText: { fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#fff' },

  photoBox: { borderWidth: 1, borderRadius: 12, padding: 10, gap: 10 },
  photoPreview: {
    height: 140,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoImg: { width: '100%', height: '100%' },
  photoActions: { flexDirection: 'row', gap: 8 },
  photoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 10,
  },
  photoBtnPrimary: { backgroundColor: COLORS.brand },
  photoBtnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  photoBtnGhost: { borderWidth: 1 },
  photoBtnGhostText: { fontWeight: '700', fontSize: 13 },

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
