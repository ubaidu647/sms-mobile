import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { usePackages } from '../../hooks/usePackages';
import { useCreateSchool } from '../../hooks/useOrganizations';
import { validateGraceDays, fmtMoney } from '../../constants/billing';
import { useColors } from '../../theme/useColors';
import { COLORS } from '../../theme/colors';
import { PASSWORD_MIN, PASSWORD_MAX } from '../../utils/changePassword';

const STATUSES = ['active', 'pending', 'suspended'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AddOrganizationModal({ open, onClose }) {
  const C = useColors();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [packageId, setPackageId] = useState('');
  const [status, setStatus] = useState('active');
  const [grace, setGrace] = useState('0');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  const { data: pkgData, isLoading: pkgLoading } = usePackages({
    limit: 100,
    filters: { isActive: true },
    enabled: open,
  });
  const packages = pkgData?.data ?? [];

  const create = useCreateSchool({ onSuccess: () => onClose() });

  useEffect(() => {
    if (open) {
      setName('');
      setEmail('');
      setPhone('');
      setPackageId('');
      setStatus('active');
      setGrace('0');
      setPassword('');
      setShowPw(false);
    }
  }, [open]);

  // Default to the first active package once the catalog loads.
  useEffect(() => {
    if (open && !packageId && packages.length > 0) setPackageId(packages[0]._id);
  }, [open, packageId, packages]);

  const submit = () => {
    if (!name.trim()) return Toast.show({ type: 'error', text1: 'School name is required' });
    if (!email.trim() || !EMAIL_RE.test(email.trim()))
      return Toast.show({ type: 'error', text1: 'A valid email is required' });
    if (!packageId) return Toast.show({ type: 'error', text1: 'Please choose a package' });
    // The school admin's first password — required, and the API's rule (8–128).
    if (!password) return Toast.show({ type: 'error', text1: 'Admin password is required' });
    if (password.length < PASSWORD_MIN)
      return Toast.show({
        type: 'error',
        text1: `Password must be at least ${PASSWORD_MIN} characters`,
      });
    if (password.length > PASSWORD_MAX)
      return Toast.show({
        type: 'error',
        text1: `Password must be at most ${PASSWORD_MAX} characters`,
      });
    const graceErr = validateGraceDays(grace);
    if (graceErr) return Toast.show({ type: 'error', text1: graceErr });

    const payload = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      packageId,
      status,
    };
    if (password) payload.password = password;
    if (grace !== '' && grace != null) payload.gracePeriodInDays = Number(grace);
    create.mutate(payload);
  };

  return (
    <Modal visible={open} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safe, { backgroundColor: C.card }]} edges={['top', 'bottom']}>
        <View style={[styles.header, { borderBottomColor: C.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: C.text }]}>Create New School</Text>
            <Text style={[styles.subtitle, { color: C.muted }]}>
              Add a new school to your system
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={10}
            style={({ pressed }) => [styles.closeBtn, { backgroundColor: C.bg }, pressed && { opacity: 0.6 }]}
          >
            <Feather name="x" size={20} color={C.text} />
          </Pressable>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Field label="School Name *" C={C}>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Greenwood High"
                placeholderTextColor={C.mutedSoft}
                style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
              />
            </Field>

            <Field label="Email Address *" C={C}>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="admin@school.com"
                placeholderTextColor={C.mutedSoft}
                keyboardType="email-address"
                autoCapitalize="none"
                style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
              />
            </Field>

            <Field label="Phone Number" C={C}>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="optional"
                placeholderTextColor={C.mutedSoft}
                keyboardType="phone-pad"
                style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
              />
            </Field>

            <Field label="Package *" C={C}>
              {pkgLoading ? (
                <Text style={[styles.helper, { color: C.mutedSoft }]}>Loading packages…</Text>
              ) : packages.length === 0 ? (
                <Text style={[styles.helper, { color: C.mutedSoft }]}>
                  No active packages — create one first.
                </Text>
              ) : (
                <View style={styles.chipRow}>
                  {packages.map((p) => {
                    const active = packageId === p._id;
                    return (
                      <Pressable
                        key={p._id}
                        onPress={() => setPackageId(p._id)}
                        style={({ pressed }) => [
                          styles.chip,
                          { backgroundColor: C.bg, borderColor: C.border },
                          active && styles.chipActive,
                          pressed && { opacity: 0.85 },
                        ]}
                      >
                        <Text style={[styles.chipText, { color: C.text }, active && styles.chipTextActive]}>
                          {p.name} · {fmtMoney(p.price)}/{p.durationInDays}d
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </Field>

            <Field label="Status *" C={C}>
              <View style={styles.chipRow}>
                {STATUSES.map((s) => {
                  const active = status === s;
                  return (
                    <Pressable
                      key={s}
                      onPress={() => setStatus(s)}
                      style={({ pressed }) => [
                        styles.chip,
                        { backgroundColor: C.bg, borderColor: C.border },
                        active && styles.chipActive,
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <Text style={[styles.chipText, { color: C.text }, active && styles.chipTextActive]}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Field>

            <Field label="Grace Period (days after expiry)" C={C}>
              <TextInput
                value={grace}
                onChangeText={setGrace}
                placeholder="0"
                placeholderTextColor={C.mutedSoft}
                keyboardType="number-pad"
                style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
              />
              <Text style={[styles.helper, { color: C.mutedSoft }]}>
                Days the school keeps access after expiry before writes are blocked. 0 = cut off at expiry.
              </Text>
            </Field>

            <Field label="Password" C={C}>
              <View style={[styles.pwWrap, { borderColor: C.border, backgroundColor: C.bg }]}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder={`At least ${PASSWORD_MIN} characters`}
                  placeholderTextColor={C.mutedSoft}
                  secureTextEntry={!showPw}
                  autoCapitalize="none"
                  style={[styles.pwInput, { color: C.text }]}
                />
                <Pressable onPress={() => setShowPw((v) => !v)} hitSlop={8}>
                  <Feather name={showPw ? 'eye-off' : 'eye'} size={18} color={C.mutedSoft} />
                </Pressable>
              </View>
            </Field>

            <Pressable
              onPress={submit}
              disabled={create.isPending}
              style={({ pressed }) => [styles.submit, (create.isPending || pressed) && { opacity: 0.85 }]}
            >
              {create.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="plus" size={16} color="#fff" />
                  <Text style={styles.submitText}>Create School</Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function Field({ label, children, C }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={[styles.label, { color: C.muted }]}>{label.toUpperCase()}</Text>
      {children}
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
  closeBtn: { width: 36, height: 36, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 16, paddingBottom: 36, gap: 14 },

  label: { fontSize: 10, letterSpacing: 1.1, fontWeight: '700' },
  helper: { fontSize: 11 },
  input: { height: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 14 },

  pwWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  pwInput: { flex: 1, fontSize: 14 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, maxWidth: 260 },
  chipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText: { fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#fff' },

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
