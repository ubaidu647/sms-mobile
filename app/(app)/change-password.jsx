import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '../../src/theme/useColors';
import { COLORS } from '../../src/theme/colors';
import { useChangePassword } from '../../src/hooks/useChangePassword';
import { useAuth } from '../../src/hooks/useAuth';
import { useUserStore } from '../../src/store/userStore';
import { FORCED_PASSWORD_BANNER } from '../../src/utils/authErrors';
import {
  PASSWORD_MIN,
  changePasswordErrorMessage,
  validateChangePassword,
} from '../../src/utils/changePassword';

const FIELDS = [
  { key: 'currentPassword', label: 'Current password', autoComplete: 'current-password' },
  { key: 'newPassword', label: 'New password', autoComplete: 'new-password' },
  { key: 'confirmPassword', label: 'Confirm new password', autoComplete: 'new-password' },
];

export default function ChangePasswordScreen() {
  const C = useColors();
  const [values, setValues] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [show, setShow] = useState(false);
  const { mutate, isPending } = useChangePassword();
  // Set when the account must change its password before anything else.
  const forced = useUserStore((st) => st.user?.mustChangePassword === true);
  // The forced screen has no top bar or drawer, so it needs its own way out
  // (wrong account, shared phone).
  const { logout } = useAuth();

  const setField = (key, value) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
    if (serverError) setServerError('');
  };

  const onSubmit = () => {
    const found = validateChangePassword(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setServerError('');
    mutate(
      { currentPassword: values.currentPassword, newPassword: values.newPassword },
      { onError: (err) => setServerError(changePasswordErrorMessage(err)) },
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: C.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {forced ? (
          <View style={styles.forcedBanner} accessibilityRole="alert">
            <Feather name="alert-triangle" size={16} color="#92400e" />
            <Text style={styles.forcedBannerText}>{FORCED_PASSWORD_BANNER}</Text>
          </View>
        ) : null}

        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Feather name="lock" size={20} color={COLORS.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.heroTitle, { color: C.text }]}>Change password</Text>
            <Text style={[styles.heroSub, { color: C.muted }]}>
              Other devices signed in to your account will be signed out.
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          {FIELDS.map((f) => (
            <View key={f.key} style={styles.field}>
              <Text style={[styles.label, { color: C.text }]}>{f.label}</Text>
              <TextInput
                value={values[f.key]}
                onChangeText={(v) => setField(f.key, v)}
                secureTextEntry={!show}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete={f.autoComplete}
                editable={!isPending}
                placeholderTextColor={C.mutedSoft}
                style={[
                  styles.input,
                  { color: C.text, borderColor: errors[f.key] ? '#ef4444' : C.border, backgroundColor: C.bg },
                ]}
              />
              {errors[f.key] ? <Text style={styles.errorText}>{errors[f.key]}</Text> : null}
            </View>
          ))}

          <Text style={[styles.hint, { color: C.muted }]}>
            At least {PASSWORD_MIN} characters, different from your current password.
          </Text>

          <Pressable
            onPress={() => setShow((v) => !v)}
            style={styles.showToggle}
            hitSlop={8}
            accessibilityRole="button"
          >
            <Feather name={show ? 'eye-off' : 'eye'} size={14} color={COLORS.brand} />
            <Text style={styles.showToggleText}>{show ? 'Hide passwords' : 'Show passwords'}</Text>
          </Pressable>

          {serverError ? (
            <View style={styles.serverError}>
              <Feather name="alert-circle" size={14} color="#b91c1c" />
              <Text style={styles.serverErrorText}>{serverError}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={onSubmit}
            disabled={isPending}
            style={({ pressed }) => [
              styles.submit,
              pressed && { opacity: 0.85 },
              isPending && { opacity: 0.6 },
            ]}
          >
            {isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Change password</Text>
            )}
          </Pressable>

          {forced ? (
            <Pressable
              onPress={logout}
              disabled={isPending}
              style={styles.signOut}
              hitSlop={8}
              accessibilityRole="button"
            >
              <Feather name="log-out" size={14} color={C.muted} />
              <Text style={[styles.signOutText, { color: C.muted }]}>Sign out</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 32, gap: 16 },
  forcedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fcd34d',
    backgroundColor: '#fffbeb',
  },
  forcedBannerText: { color: '#92400e', fontSize: 14, fontWeight: '600', flex: 1 },
  hero: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 4 },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#ccfbf1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { fontSize: 22, fontWeight: '800' },
  heroSub: { fontSize: 13, marginTop: 2 },
  card: { borderRadius: 18, borderWidth: 1, padding: 16 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: {
    height: 46,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  errorText: { color: '#ef4444', fontSize: 12, marginTop: 6 },
  hint: { fontSize: 12, marginBottom: 10 },
  showToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  showToggleText: { color: COLORS.brand, fontWeight: '600', fontSize: 13 },
  serverError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#fee2e2',
    marginBottom: 14,
  },
  serverErrorText: { color: '#b91c1c', fontSize: 13, flex: 1 },
  submit: {
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  signOut: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  signOutText: { fontSize: 14, fontWeight: '600' },
});
