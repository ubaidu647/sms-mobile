import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import { useUpsertBranchProfile } from '../hooks/useUpsertBranchProfile';
import { useUserStore } from '../store/userStore';
import { canEditBranchProfile } from '../utils/branchProfileAccess';
import {
  SOCIAL_NETWORKS,
  IMAGE_FIELDS,
  buildUpsertFormData,
  validateProfile,
} from '../constants/branchProfile';
import { COLORS } from '../theme/colors';
import { useColors } from '../theme/useColors';

const blank = {
  displayName: '',
  tagline: '',
  printAddress: '',
  printPhone: '',
  printEmail: '',
  website: '',
  primaryColor: '',
  secondaryColor: '',
  registrationNumber: '',
  taxId: '',
  status: 'active',
  principal: { name: '', designation: 'Principal', email: '', phone: '' },
  socialLinks: {},
};

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const IMAGE_LABELS = {
  logo: { label: 'Logo', hint: 'Square or wide; max 5MB.' },
  stamp: { label: 'Stamp', hint: 'Official stamp on printed reports.' },
  letterhead: { label: 'Letterhead', hint: 'Wide banner at the top of letters.' },
  signature: {
    label: 'Principal Signature',
    hint: "In the footer above the principal's name.",
  },
};

function Section({ title, children }) {
  const C = useColors();
  return (
    <View style={[styles.section, { backgroundColor: C.card, borderColor: C.border }]}>
      <Text style={[styles.sectionTitle, { color: COLORS.brand }]}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Field({ label, required, children }) {
  const C = useColors();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: C.text }]}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      {children}
    </View>
  );
}

function TextField({ value, onChange, disabled, style, ...rest }) {
  const C = useColors();
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      editable={!disabled}
      placeholderTextColor={C.mutedSoft}
      style={[
        styles.input,
        { color: C.text, backgroundColor: C.bg, borderColor: C.border },
        disabled && [styles.inputDisabled, { backgroundColor: C.border, color: C.muted }],
        style,
      ]}
      {...rest}
    />
  );
}

function StatusPicker({ value, onChange, disabled }) {
  const C = useColors();
  return (
    <View style={styles.chipRow}>
      {STATUS_OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => !disabled && onChange(opt.value)}
            style={[
              styles.statusChip,
              { backgroundColor: C.bg, borderColor: C.border },
              active && styles.statusChipActive,
              disabled && { opacity: 0.6 },
            ]}
          >
            <Text
              style={[
                styles.statusChipText,
                { color: C.text },
                active && styles.statusChipTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ColorPickerField({ label, value, onChange, disabled }) {
  return (
    <Field label={label}>
      <View style={styles.colorRow}>
        <View
          style={[
            styles.colorSwatch,
            {
              backgroundColor: /^#[0-9A-Fa-f]{6}$/.test(value) ? value : '#ffffff',
            },
          ]}
        />
        <TextField
          value={value || ''}
          onChange={onChange}
          placeholder="#0066cc"
          autoCapitalize="characters"
          disabled={disabled}
          style={{ flex: 1 }}
        />
      </View>
    </Field>
  );
}

function ImageCard({ field, currentUrl, pendingUri, onPick, onClear, disabled }) {
  const labelInfo = IMAGE_LABELS[field];
  const showUri = pendingUri || currentUrl;
  const C = useColors();

  return (
    <View style={[styles.imgCard, { borderColor: C.border }]}>
      <View style={styles.imgHeader}>
        <Text style={[styles.imgLabel, { color: C.text }]}>{labelInfo.label}</Text>
        {!!pendingUri && <Text style={styles.imgPending}>Pending</Text>}
      </View>

      <View style={[styles.imgPreview, { backgroundColor: C.bg, borderColor: C.border }]}>
        {showUri ? (
          <Image source={{ uri: showUri }} style={styles.imgImage} resizeMode="contain" />
        ) : (
          <View style={styles.imgPlaceholder}>
            <Feather name="image" size={28} color={C.mutedSoft} />
            <Text style={[styles.imgHint, { color: C.muted }]}>{labelInfo.hint}</Text>
          </View>
        )}
      </View>

      <View style={styles.imgActions}>
        <Pressable
          onPress={onPick}
          disabled={disabled}
          style={({ pressed }) => [
            styles.imgBtn,
            styles.imgBtnPrimary,
            pressed && { opacity: 0.85 },
            disabled && { opacity: 0.5 },
          ]}
        >
          <Feather name="upload" size={14} color="#fff" />
          <Text style={styles.imgBtnPrimaryText}>
            {showUri ? 'Replace' : 'Choose'}
          </Text>
        </Pressable>
        {!!pendingUri && (
          <Pressable
            onPress={onClear}
            disabled={disabled}
            style={({ pressed }) => [
              styles.imgBtn,
              styles.imgBtnGhost,
              { backgroundColor: C.bg, borderColor: C.border },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Feather name="x" size={14} color={C.text} />
            <Text style={[styles.imgBtnGhostText, { color: C.text }]}>Clear</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function BranchProfileForm({
  initialProfile,
  branchId,
  branchLabel,
}) {
  const { user } = useUserStore();

  // Update vs create and own-branch vs any-branch, exactly as the API checks.
  const canEdit = canEditBranchProfile(user, {
    profileExists: !!initialProfile,
    targetBranchId: branchId,
  });

  const [profile, setProfile] = useState(blank);
  const [files, setFiles] = useState({});

  useEffect(() => {
    if (initialProfile) {
      setProfile({
        ...blank,
        ...initialProfile,
        principal: {
          ...blank.principal,
          ...(initialProfile.principal || {}),
        },
        socialLinks: { ...(initialProfile.socialLinks || {}) },
      });
    } else {
      setProfile(blank);
    }
    setFiles({});
  }, [initialProfile]);

  const set = (patch) => setProfile((p) => ({ ...p, ...patch }));
  const setPrincipal = (patch) =>
    setProfile((p) => ({ ...p, principal: { ...p.principal, ...patch } }));
  const setSocial = (key, value) =>
    setProfile((p) => ({ ...p, socialLinks: { ...p.socialLinks, [key]: value } }));

  const upsert = useUpsertBranchProfile({
    onSuccess: () => setFiles({}),
  });

  const pickImage = async (field) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Permission needed',
        'Please allow photo library access to choose an image.',
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset) return;
    setFiles((s) => ({ ...s, [field]: asset }));
  };

  const clearImage = (field) =>
    setFiles((s) => {
      const next = { ...s };
      delete next[field];
      return next;
    });

  const handleSave = () => {
    const err = validateProfile(profile);
    if (err) {
      Toast.show({ type: 'error', text1: 'Validation', text2: err });
      return;
    }
    const fd = buildUpsertFormData(profile, files, branchId);
    upsert.mutate(fd);
  };

  return (
    <View style={{ gap: 14 }}>
      {!!branchLabel && (
        <View style={styles.branchBanner}>
          <Feather name="info" size={16} color={COLORS.brand} />
          <Text style={styles.branchBannerText}>
            Editing profile for{' '}
            <Text style={{ fontWeight: '800' }}>{branchLabel}</Text>
          </Text>
        </View>
      )}

      {/* Identity */}
      <Section title="Identity">
        <Field label="Display Name" required>
          <TextField
            value={profile.displayName}
            onChange={(v) => set({ displayName: v })}
            placeholder="e.g. Hogwarts School — Karachi Campus"
            disabled={!canEdit}
          />
        </Field>
        <Field label="Tagline">
          <TextField
            value={profile.tagline || ''}
            onChange={(v) => set({ tagline: v })}
            placeholder="Excellence in Education"
            disabled={!canEdit}
          />
        </Field>
        <Field label="Status">
          <StatusPicker
            value={profile.status || 'active'}
            onChange={(v) => set({ status: v })}
            disabled={!canEdit}
          />
        </Field>
      </Section>

      {/* Branding */}
      <Section title="Branding">
        {IMAGE_FIELDS.map((field) => (
          <ImageCard
            key={field}
            field={field}
            currentUrl={
              field === 'signature'
                ? profile.principal?.signature
                : profile[field]
            }
            pendingUri={files[field]?.uri}
            onPick={() => pickImage(field)}
            onClear={() => clearImage(field)}
            disabled={!canEdit}
          />
        ))}
        <ColorPickerField
          label="Primary Color"
          value={profile.primaryColor || ''}
          onChange={(v) => set({ primaryColor: v })}
          disabled={!canEdit}
        />
        <ColorPickerField
          label="Secondary Color"
          value={profile.secondaryColor || ''}
          onChange={(v) => set({ secondaryColor: v })}
          disabled={!canEdit}
        />
      </Section>

      {/* Contact */}
      <Section title="Contact (printed on reports)">
        <Field label="Print Address">
          <TextField
            value={profile.printAddress || ''}
            onChange={(v) => set({ printAddress: v })}
            placeholder="Street, area, city — multiline supported"
            multiline
            numberOfLines={3}
            disabled={!canEdit}
            style={styles.textarea}
          />
        </Field>
        <Field label="Phone">
          <TextField
            value={profile.printPhone || ''}
            onChange={(v) => set({ printPhone: v })}
            placeholder="+92-21-1234-5678"
            keyboardType="phone-pad"
            disabled={!canEdit}
          />
        </Field>
        <Field label="Email">
          <TextField
            value={profile.printEmail || ''}
            onChange={(v) => set({ printEmail: v })}
            placeholder="info@school.edu"
            keyboardType="email-address"
            autoCapitalize="none"
            disabled={!canEdit}
          />
        </Field>
        <Field label="Website">
          <TextField
            value={profile.website || ''}
            onChange={(v) => set({ website: v })}
            placeholder="https://school.edu"
            keyboardType="url"
            autoCapitalize="none"
            disabled={!canEdit}
          />
        </Field>
      </Section>

      {/* Principal */}
      <Section title="Principal">
        <Field label="Name">
          <TextField
            value={profile.principal?.name || ''}
            onChange={(v) => setPrincipal({ name: v })}
            disabled={!canEdit}
            autoCapitalize="words"
          />
        </Field>
        <Field label="Designation">
          <TextField
            value={profile.principal?.designation || ''}
            onChange={(v) => setPrincipal({ designation: v })}
            disabled={!canEdit}
          />
        </Field>
        <Field label="Email">
          <TextField
            value={profile.principal?.email || ''}
            onChange={(v) => setPrincipal({ email: v })}
            keyboardType="email-address"
            autoCapitalize="none"
            disabled={!canEdit}
          />
        </Field>
        <Field label="Phone">
          <TextField
            value={profile.principal?.phone || ''}
            onChange={(v) => setPrincipal({ phone: v })}
            keyboardType="phone-pad"
            disabled={!canEdit}
          />
        </Field>
      </Section>

      {/* Legal */}
      <Section title="Legal">
        <Field label="Registration #">
          <TextField
            value={profile.registrationNumber || ''}
            onChange={(v) => set({ registrationNumber: v })}
            placeholder="REG-2020-1234"
            disabled={!canEdit}
          />
        </Field>
        <Field label="Tax ID">
          <TextField
            value={profile.taxId || ''}
            onChange={(v) => set({ taxId: v })}
            placeholder="NTN-1234567"
            disabled={!canEdit}
          />
        </Field>
      </Section>

      {/* Social */}
      <Section title="Social Links">
        {SOCIAL_NETWORKS.map((net) => (
          <Field key={net} label={net.charAt(0).toUpperCase() + net.slice(1)}>
            <TextField
              value={profile.socialLinks?.[net] || ''}
              onChange={(v) => setSocial(net, v)}
              placeholder={`https://${net}.com/yourschool`}
              keyboardType="url"
              autoCapitalize="none"
              disabled={!canEdit}
            />
          </Field>
        ))}
      </Section>

      {canEdit && (
        <Pressable
          onPress={handleSave}
          disabled={upsert.isPending}
          style={({ pressed }) => [
            styles.saveBtn,
            pressed && { opacity: 0.9 },
            upsert.isPending && { opacity: 0.7 },
          ]}
        >
          {upsert.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Feather name="save" size={16} color="#fff" />
              <Text style={styles.saveBtnText}>Save Profile</Text>
            </>
          )}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  branchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ecfeff',
    borderColor: '#a5f3fc',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  branchBannerText: { color: '#0e7490', fontSize: 13, flex: 1 },

  section: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.brand,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: '#ecfeff',
  },
  sectionBody: { padding: 14, gap: 14 },

  field: { gap: 6 },
  label: { fontSize: 12, fontWeight: '700', color: '#374151' },
  required: { color: COLORS.red },

  input: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: '#fafafa',
  },
  textarea: { minHeight: 88, textAlignVertical: 'top' },
  inputDisabled: { backgroundColor: '#f3f4f6', color: COLORS.muted },

  chipRow: { flexDirection: 'row', gap: 8 },
  statusChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#fafafa',
    alignItems: 'center',
  },
  statusChipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  statusChipText: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  statusChipTextActive: { color: '#fff' },

  colorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  imgCard: {
    backgroundColor: '#fafafa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    gap: 10,
  },
  imgHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  imgLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  imgPending: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.brand,
    backgroundColor: '#ecfeff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  imgPreview: {
    height: 120,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imgImage: { width: '100%', height: '100%' },
  imgPlaceholder: { alignItems: 'center', gap: 6, padding: 12 },
  imgHint: { fontSize: 11, color: COLORS.muted, textAlign: 'center' },

  imgActions: { flexDirection: 'row', gap: 8 },
  imgBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  imgBtnPrimary: { backgroundColor: COLORS.brand },
  imgBtnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  imgBtnGhost: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  imgBtnGhostText: { color: COLORS.text, fontWeight: '700', fontSize: 13 },

  saveBtn: {
    height: 50,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.brand,
    marginTop: 4,
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
