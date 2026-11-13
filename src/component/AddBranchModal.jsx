import { useEffect } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import KeyboardAvoidingView from './KeyboardAvoidingView';
import ToastModal from './ToastModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Feather } from '@expo/vector-icons';
import { branchSchema } from '../validation/branchSchema';
import { useCreateBranch } from '../hooks/useCreateBranch';
import { COLORS } from '../theme/colors';
import { useColors } from '../theme/useColors';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

function Field({ control, name, label, errors, required, ...inputProps }) {
  const C = useColors();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: C.text }]}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { value, onChange, onBlur } }) => (
          <TextInput
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholderTextColor={C.mutedSoft}
            style={[
              styles.input,
              { color: C.text, backgroundColor: C.bg, borderColor: C.border },
              errors[name] && styles.inputError,
            ]}
            {...inputProps}
          />
        )}
      />
      {errors[name] && (
        <Text style={styles.errorText}>{errors[name].message}</Text>
      )}
    </View>
  );
}

export default function AddBranchModal({ open, onClose }) {
  const C = useColors();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(branchSchema),
    defaultValues: {
      name: '',
      address: '',
      email: '',
      phone: '',
      status: 'active',
    },
  });

  const { mutate, isPending } = useCreateBranch({
    onSuccess: () => {
      reset();
      onClose();
    },
  });

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const onSubmit = (data) => mutate(data);

  return (
    <ToastModal
      visible={open}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.safe, { backgroundColor: C.card }]} edges={['top', 'bottom']}>
        <View style={[styles.header, { borderBottomColor: C.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: C.text }]}>Create New Branch</Text>
            <Text style={[styles.subtitle, { color: C.muted }]}>
              Fill in the details to add a new branch
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
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Field
              control={control}
              name="name"
              label="Branch Name"
              errors={errors}
              required
              placeholder="e.g. Main Campus"
              autoCapitalize="words"
              returnKeyType="next"
            />
            <Field
              control={control}
              name="address"
              label="Address"
              errors={errors}
              required
              placeholder="Street, city"
              multiline
              numberOfLines={2}
            />
            <Field
              control={control}
              name="email"
              label="Email"
              errors={errors}
              placeholder="branch@school.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <Field
              control={control}
              name="phone"
              label="Phone"
              errors={errors}
              placeholder="+92 300 0000000"
              keyboardType="phone-pad"
            />

            <View style={styles.field}>
              <Text style={[styles.label, { color: C.text }]}>
                Status<Text style={styles.required}> *</Text>
              </Text>
              <Controller
                control={control}
                name="status"
                render={({ field: { value, onChange } }) => (
                  <View style={styles.statusRow}>
                    {STATUS_OPTIONS.map((opt) => {
                      const active = value === opt.value;
                      return (
                        <Pressable
                          key={opt.value}
                          onPress={() => onChange(opt.value)}
                          style={[
                            styles.statusChip,
                            { backgroundColor: C.bg, borderColor: C.border },
                            active && styles.statusChipActive,
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
                )}
              />
            </View>
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: C.border, backgroundColor: C.card }]}>
            <Pressable
              onPress={onClose}
              disabled={isPending}
              style={({ pressed }) => [
                styles.btn,
                styles.btnSecondary,
                { backgroundColor: C.bg, borderColor: C.border },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={[styles.btnSecondaryText, { color: C.text }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSubmit(onSubmit)}
              disabled={isPending}
              style={({ pressed }) => [
                styles.btn,
                styles.btnPrimary,
                pressed && { opacity: 0.9 },
                isPending && { opacity: 0.7 },
              ]}
            >
              {isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.btnPrimaryText}>Create Branch</Text>
                  <Feather name="arrow-right" size={16} color="#fff" />
                </>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ToastModal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.card },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  title: { fontSize: 19, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.muted, marginTop: 4 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
  },

  body: { padding: 18, gap: 14, paddingBottom: 28 },
  field: { gap: 8 },
  label: { fontSize: 13, fontWeight: '700', color: '#374151' },
  required: { color: COLORS.red },
  input: {
    height: 48,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: '#fafafa',
  },
  inputError: { borderColor: COLORS.red },
  errorText: { color: COLORS.red, fontSize: 12, marginTop: -2 },

  statusRow: { flexDirection: 'row', gap: 8 },
  statusChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#fafafa',
    alignItems: 'center',
  },
  statusChipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  statusChipText: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  statusChipTextActive: { color: '#fff' },

  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  btnSecondary: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  btnSecondaryText: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  btnPrimary: { backgroundColor: '#111827' },
  btnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
