import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signInSchema } from '../../src/validation/signInSchema';
import { useSignIn } from '../../src/hooks/useSignIn';

export default function SignIn() {
  const [showPassword, setShowPassword] = useState(false);
  // Platform (super-admin) accounts sign in through a separate endpoint.
  const [platform, setPlatform] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const { mutate, isPending } = useSignIn();

  const onSubmit = (data) => mutate({ ...data, platform });

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brand}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.brandTitle}>nodeCampus</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.heading}>
              {platform ? 'Platform admin sign in' : 'Sign in'}
            </Text>
            <Text style={styles.subheading}>
              {platform
                ? 'Sign in to the platform console with your super-admin account.'
                : 'Welcome back. Enter your credentials to continue.'}
            </Text>

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <Controller
                control={control}
                name="email"
                render={({ field: { value, onChange, onBlur } }) => (
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="you@school.com"
                    placeholderTextColor="#9ca3af"
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    style={[styles.input, errors.email && styles.inputError]}
                  />
                )}
              />
              {errors.email && (
                <Text style={styles.errorText}>{errors.email.message}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordRow}>
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="••••••••"
                      placeholderTextColor="#9ca3af"
                      autoCapitalize="none"
                      autoComplete="current-password"
                      secureTextEntry={!showPassword}
                      style={[
                        styles.input,
                        { flex: 1, paddingRight: 64 },
                        errors.password && styles.inputError,
                      ]}
                    />
                  )}
                />
                <Pressable
                  onPress={() => setShowPassword((v) => !v)}
                  style={styles.showToggle}
                  hitSlop={10}
                >
                  <Text style={styles.showToggleText}>
                    {showPassword ? 'Hide' : 'Show'}
                  </Text>
                </Pressable>
              </View>
              {errors.password && (
                <Text style={styles.errorText}>{errors.password.message}</Text>
              )}
            </View>

            <Pressable
              onPress={handleSubmit(onSubmit)}
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
                <Text style={styles.submitText}>Sign in</Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => setPlatform((v) => !v)}
              disabled={isPending}
              style={styles.modeToggle}
              hitSlop={8}
              accessibilityRole="button"
            >
              <Text style={styles.modeToggleText}>
                {platform ? 'School staff? Sign in here' : 'Platform admin? Sign in here'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  brand: { alignItems: 'center', marginBottom: 24 },
  logo: { width: 72, height: 72 },
  brandTitle: { fontSize: 28, fontWeight: '800', color: '#0f766e', marginTop: 8 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  heading: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subheading: { fontSize: 13, color: '#6b7280', marginTop: 4, marginBottom: 18 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    height: 46,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#f9fafb',
  },
  inputError: { borderColor: '#ef4444' },
  passwordRow: { position: 'relative', justifyContent: 'center' },
  showToggle: { position: 'absolute', right: 12, padding: 6 },
  showToggleText: { color: '#0f766e', fontWeight: '600', fontSize: 13 },
  errorText: { color: '#ef4444', fontSize: 12, marginTop: 6 },
  submit: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#0d9488',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modeToggle: { alignSelf: 'center', marginTop: 14, padding: 6 },
  modeToggleText: { color: '#0f766e', fontWeight: '600', fontSize: 13 },
});
