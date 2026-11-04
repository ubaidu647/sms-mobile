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
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useBranchesDropdown } from '../hooks/useBranchProfilesList';
import { useRolesDropdown } from '../hooks/useStaff';
import {
  STAFF_TYPES,
  EMPLOYMENT_TYPES,
  GENDERS,
  MARITAL_STATUSES,
  BLOOD_GROUPS,
  SELF_ALLOWED_SCALARS,
  titleCase,
} from '../constants/staff';
import {
  createStaffSchema,
  selfEditSchema,
  editStaffSchema,
} from '../validation/staffSchema';
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

export default function StaffForm({
  mode = 'create', // 'create' | 'edit'
  staff = null,
  isSelf = false,
  canCreateAllBranch = false,
  defaultBranchId = '',
  onSubmit,
  isPending,
  submitLabel,
}) {
  const C = useColors();
  const schema = isSelf
    ? selfEditSchema
    : mode === 'create'
      ? createStaffSchema
      : editStaffSchema;

  const defaultValues = isSelf
    ? {
        name: staff?.user?.name || '',
        phone: staff?.phone || '',
        dob: staff?.dob ? String(staff.dob).slice(0, 10) : '',
        cnic: staff?.cnic || '',
        bloodGroup: staff?.bloodGroup || '',
        qualification: staff?.qualification || '',
        maritalStatus: staff?.maritalStatus || '',
      }
    : mode === 'create'
      ? {
          name: staff?.user?.name || '',
          email: staff?.user?.email || '',
          password: '',
          phone: staff?.phone || '',
          branchId:
            (typeof staff?.branchId === 'string'
              ? staff.branchId
              : staff?.branchId?._id) ||
            staff?.branch?._id ||
            defaultBranchId ||
            '',
          roleId:
            (typeof staff?.role === 'object' ? staff?.role?._id : staff?.role) ||
            (typeof staff?.roleId === 'string'
              ? staff.roleId
              : staff?.roleId?._id) ||
            '',
          designation: staff?.designation || '',
          staffType: staff?.staffType || '',
          employmentType: staff?.employmentType || '',
          gender: staff?.gender || '',
          joiningDate: staff?.joiningDate ? String(staff.joiningDate).slice(0, 10) : '',
          qualification: staff?.qualification || '',
          experienceYears: staff?.experienceYears ? String(staff.experienceYears) : '',
          salary: staff?.salary ? String(staff.salary) : '',
          dob: staff?.dob ? String(staff.dob).slice(0, 10) : '',
          cnic: staff?.cnic || '',
          bloodGroup: staff?.bloodGroup || '',
          maritalStatus: staff?.maritalStatus || '',
          street: staff?.address?.street || '',
          city: staff?.address?.city || '',
          state: staff?.address?.state || '',
          emergencyName: staff?.emergencyContact?.name || '',
          emergencyPhone: staff?.emergencyContact?.phone || '',
          emergencyRelation: staff?.emergencyContact?.relation || '',
          isActive: 'true',
          leavingDate: '',
          leavingReason: '',
        }
      : {
          // HR edit — no email/password/branch/role (immutable after creation)
          name: staff?.user?.name || '',
          phone: staff?.phone || '',
          designation: staff?.designation || '',
          staffType: staff?.staffType || '',
          employmentType: staff?.employmentType || '',
          gender: staff?.gender || '',
          joiningDate: staff?.joiningDate ? String(staff.joiningDate).slice(0, 10) : '',
          qualification: staff?.qualification || '',
          experienceYears: staff?.experienceYears != null ? String(staff.experienceYears) : '',
          salary: staff?.salary != null ? String(staff.salary) : '',
          dob: staff?.dob ? String(staff.dob).slice(0, 10) : '',
          cnic: staff?.cnic || '',
          bloodGroup: staff?.bloodGroup || '',
          maritalStatus: staff?.maritalStatus || '',
          street: staff?.address?.street || '',
          city: staff?.address?.city || '',
          state: staff?.address?.state || '',
          emergencyName: staff?.emergencyContact?.name || '',
          emergencyPhone: staff?.emergencyContact?.phone || '',
          emergencyRelation: staff?.emergencyContact?.relation || '',
          isActive: staff?.isActive === false ? 'false' : 'true',
          leavingDate: staff?.leavingDate ? String(staff.leavingDate).slice(0, 10) : '',
          leavingReason: staff?.leavingReason || '',
        };

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({ resolver: yupResolver(schema), defaultValues });

  const [photo, setPhoto] = useState(null);

  const branchId = watch('branchId');

  const { data: branchesData } = useBranchesDropdown({ enabled: !isSelf });
  const branches = branchesData?.data || [];
  const { data: rolesData } = useRolesDropdown({
    branchId,
    enabled: !isSelf && !!branchId,
  });
  const roles = rolesData?.data || [];

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

    // Pick which scalar fields are allowed on this submit. Mirrors the web:
    //   self  → only the 7 SELF_ALLOWED_SCALARS the backend accepts
    //   edit  → name + mutable HR fields (no email/password/branch/role)
    //   create → everything including identifiers
    const scalarFields = isSelf
      ? SELF_ALLOWED_SCALARS
      : mode === 'edit'
        ? [
            'name',
            'designation',
            'staffType',
            'employmentType',
            'gender',
            'maritalStatus',
            'bloodGroup',
            'cnic',
            'dob',
            'phone',
            'qualification',
            'experienceYears',
            'salary',
            'joiningDate',
            'leavingDate',
            'leavingReason',
            'isActive',
          ]
        : [
            'name',
            'email',
            'password',
            'phone',
            'branchId',
            'roleId',
            'designation',
            'staffType',
            'employmentType',
            'gender',
            'joiningDate',
            'qualification',
            'experienceYears',
            'salary',
            'dob',
            'cnic',
            'bloodGroup',
            'maritalStatus',
          ];

    for (const k of scalarFields) {
      const v = data[k];
      if (v !== '' && v !== null && v !== undefined) fd.append(k, String(v));
    }

    if (!isSelf) {
      const address = {
        street: data.street || '',
        city: data.city || '',
        state: data.state || '',
      };
      if (address.street || address.city || address.state) {
        fd.append('address', JSON.stringify(address));
      }
      const emerg = {
        name: data.emergencyName || '',
        phone: data.emergencyPhone || '',
        relation: data.emergencyRelation || '',
      };
      if (emerg.name || emerg.phone || emerg.relation) {
        fd.append('emergencyContact', JSON.stringify(emerg));
      }
    }

    if (photo?.uri) {
      fd.append('photo', {
        uri: photo.uri,
        name: photo.name,
        type: photo.type,
      });
    }
    onSubmit(fd);
  };

  // ───── render ─────

  if (isSelf) {
    return (
      <View style={{ gap: 14 }}>
        <View style={[styles.warnBanner, { borderColor: '#fde68a' }]}>
          <Feather name="info" size={16} color="#92400e" />
          <Text style={styles.warnBannerText}>
            You can only edit your personal information. Employment and account
            fields require HR.
          </Text>
        </View>

        <Section title="Personal">
          <Field label="Name" required error={errors.name?.message}>
            <TextFieldCtl control={control} name="name" placeholder="Full name" error={errors.name} />
          </Field>
          <Field label="Phone">
            <TextFieldCtl control={control} name="phone" placeholder="Phone" keyboardType="phone-pad" />
          </Field>
          <Field label="Date of Birth">
            <TextFieldCtl control={control} name="dob" placeholder="YYYY-MM-DD" />
          </Field>
          <Field label="CNIC">
            <TextFieldCtl control={control} name="cnic" placeholder="00000-0000000-0" />
          </Field>
          <Field label="Blood Group">
            <ChipPickerCtl
              control={control}
              name="bloodGroup"
              options={[{ value: '', label: 'None' }, ...BLOOD_GROUPS.map((v) => ({ value: v, label: v }))]}
            />
          </Field>
          <Field label="Marital Status">
            <ChipPickerCtl
              control={control}
              name="maritalStatus"
              options={[{ value: '', label: 'None' }, ...MARITAL_STATUSES.map((v) => ({ value: v, label: titleCase(v) }))]}
            />
          </Field>
          <Field label="Qualification">
            <TextFieldCtl control={control} name="qualification" placeholder="e.g. M.Sc Mathematics" />
          </Field>
        </Section>

        <SubmitButton
          onPress={handleSubmit(submit, onValidationError)}
          isPending={isPending}
          label={submitLabel || 'Save Changes'}
        />
      </View>
    );
  }

  return (
    <View style={{ gap: 14 }}>
      {mode === 'edit' && (
        <View style={[styles.warnBanner, { borderColor: '#fde68a' }]}>
          <Feather name="info" size={16} color="#92400e" />
          <Text style={styles.warnBannerText}>
            Email, password, role and branch cannot be changed after creation.
          </Text>
        </View>
      )}

      <Section title="Account">
        <Field label="Name" required={mode === 'create'} error={errors.name?.message}>
          <TextFieldCtl control={control} name="name" placeholder="Full name" autoCapitalize="words" error={errors.name} />
        </Field>
        {mode === 'create' && (
          <Field label="Email" required error={errors.email?.message}>
            <TextFieldCtl
              control={control}
              name="email"
              placeholder="you@school.com"
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
            />
          </Field>
        )}
        {mode === 'create' && (
          <Field label="Password" required error={errors.password?.message}>
            <TextFieldCtl
              control={control}
              name="password"
              placeholder={`At least ${PASSWORD_MIN} characters`}
              secureTextEntry
              autoCapitalize="none"
              error={errors.password}
            />
          </Field>
        )}
        <Field label="Phone">
          <TextFieldCtl control={control} name="phone" placeholder="+92 300 0000000" keyboardType="phone-pad" />
        </Field>
      </Section>

      {mode === 'create' && (
        <Section title="Branch & Role">
          {canCreateAllBranch && (
            <Field label="Branch" required error={errors.branchId?.message}>
              <ChipPickerCtl
                control={control}
                name="branchId"
                options={branches.map((b) => ({ value: b._id, label: b.name }))}
              />
            </Field>
          )}
          <Field label="Role" required error={errors.roleId?.message}>
            {branchId ? (
              roles.length > 0 ? (
                <ChipPickerCtl
                  control={control}
                  name="roleId"
                  options={roles.map((r) => ({ value: r._id, label: r.name }))}
                />
              ) : (
                <Text style={{ color: C.muted, fontSize: 12, fontStyle: 'italic' }}>
                  Loading roles…
                </Text>
              )
            ) : (
              <Text style={{ color: C.muted, fontSize: 12, fontStyle: 'italic' }}>
                Pick a branch first.
              </Text>
            )}
          </Field>
        </Section>
      )}

      <Section title="Employment">
        <Field label="Designation" required={mode === 'create'} error={errors.designation?.message}>
          <TextFieldCtl control={control} name="designation" placeholder="e.g. Math Teacher" error={errors.designation} />
        </Field>
        <Field label="Staff Type" required={mode === 'create'} error={errors.staffType?.message}>
          <ChipPickerCtl
            control={control}
            name="staffType"
            options={STAFF_TYPES.map((v) => ({ value: v, label: titleCase(v) }))}
          />
        </Field>
        <Field label="Employment Type" required={mode === 'create'} error={errors.employmentType?.message}>
          <ChipPickerCtl
            control={control}
            name="employmentType"
            options={EMPLOYMENT_TYPES.map((v) => ({ value: v, label: titleCase(v) }))}
          />
        </Field>
        <Field label="Joining Date">
          <TextFieldCtl control={control} name="joiningDate" placeholder="YYYY-MM-DD" />
        </Field>
        <Field label="Qualification">
          <TextFieldCtl control={control} name="qualification" placeholder="e.g. M.Sc" />
        </Field>
        <Field label="Experience (years)">
          <TextFieldCtl control={control} name="experienceYears" placeholder="0" keyboardType="numeric" />
        </Field>
        <Field label="Salary (PKR)">
          <TextFieldCtl control={control} name="salary" placeholder="0" keyboardType="numeric" />
        </Field>
      </Section>

      <Section title="Personal">
        <Field label="Gender" required={mode === 'create'} error={errors.gender?.message}>
          <ChipPickerCtl
            control={control}
            name="gender"
            options={GENDERS.map((v) => ({ value: v, label: titleCase(v) }))}
          />
        </Field>
        <Field label="Date of Birth">
          <TextFieldCtl control={control} name="dob" placeholder="YYYY-MM-DD" />
        </Field>
        <Field label="CNIC">
          <TextFieldCtl control={control} name="cnic" placeholder="00000-0000000-0" />
        </Field>
        <Field label="Blood Group">
          <ChipPickerCtl
            control={control}
            name="bloodGroup"
            options={[{ value: '', label: 'None' }, ...BLOOD_GROUPS.map((v) => ({ value: v, label: v }))]}
          />
        </Field>
        <Field label="Marital Status">
          <ChipPickerCtl
            control={control}
            name="maritalStatus"
            options={[{ value: '', label: 'None' }, ...MARITAL_STATUSES.map((v) => ({ value: v, label: titleCase(v) }))]}
          />
        </Field>
      </Section>

      <Section title="Address">
        <Field label="Street">
          <TextFieldCtl control={control} name="street" placeholder="Street" multiline />
        </Field>
        <Field label="City">
          <TextFieldCtl control={control} name="city" placeholder="City" />
        </Field>
        <Field label="State / Province">
          <TextFieldCtl control={control} name="state" placeholder="State" />
        </Field>
      </Section>

      <Section title="Emergency Contact">
        <Field label="Name">
          <TextFieldCtl control={control} name="emergencyName" placeholder="Full name" />
        </Field>
        <Field label="Phone">
          <TextFieldCtl control={control} name="emergencyPhone" placeholder="+92 …" keyboardType="phone-pad" />
        </Field>
        <Field label="Relation">
          <TextFieldCtl control={control} name="emergencyRelation" placeholder="Father / Spouse / etc." />
        </Field>
      </Section>

      <Section title="Photo">
        <PhotoField
          value={photo}
          currentUrl={staff?.photo}
          onChange={setPhoto}
        />
      </Section>

      {mode === 'edit' && (
        <Section title="Leaving (optional)">
          <Field label="Leaving Date">
            <TextFieldCtl control={control} name="leavingDate" placeholder="YYYY-MM-DD" />
          </Field>
          <Field label="Leaving Reason">
            <TextFieldCtl control={control} name="leavingReason" placeholder="Reason" multiline />
          </Field>
          <Field label="Status">
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

      <SubmitButton
        onPress={handleSubmit(submit, onValidationError)}
        isPending={isPending}
        label={submitLabel || (mode === 'create' ? 'Create Staff' : 'Save Changes')}
      />
    </View>
  );
}

function SubmitButton({ onPress, isPending, label }) {
  return (
    <Pressable
      onPress={onPress}
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
          <Text style={styles.submitText}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 12,
  },
  sectionTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },

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
