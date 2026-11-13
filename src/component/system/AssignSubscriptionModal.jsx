import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import KeyboardAvoidingView from '../KeyboardAvoidingView';
import ToastModal from '../ToastModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { usePackages } from '../../hooks/usePackages';
import { useAssignSubscription } from '../../hooks/useSubscriptions';
import { fmtMoney, validateGraceDays, LIMIT_KEYS } from '../../constants/billing';
import { useColors } from '../../theme/useColors';
import { COLORS } from '../../theme/colors';
import { paymentDueFields } from '../../utils/paymentDue';
import { useTranslations } from '../../i18n';
import PaymentDueField from './PaymentDueField';
import LaunchOfferSwitch, { launchOfferField } from './LaunchOfferSwitch';

export default function AssignSubscriptionModal({ open, onClose, schoolId, schoolName }) {
  const C = useColors();
  const t = useTranslations('subscription');
  const { data: pkgData } = usePackages({ limit: 100, filters: { isActive: true }, enabled: open });
  const packages = pkgData?.data ?? [];
  const assign = useAssignSubscription({ onSuccess: () => onClose() });

  const [packageId, setPackageId] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [customLimits, setCustomLimits] = useState({});
  const [method, setMethod] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [grace, setGrace] = useState('0');
  const [blockUnpaid, setBlockUnpaid] = useState(true);
  const [dueDays, setDueDays] = useState('');
  const [applyOffer, setApplyOffer] = useState(true);

  useEffect(() => {
    if (open) {
      setPackageId('');
      setUseCustom(false);
      setCustomLimits({});
      setMethod('');
      setTransactionId('');
      setGrace('0');
      setBlockUnpaid(true);
      setDueDays('');
      setApplyOffer(true);
    }
  }, [open]);

  const selected = packages.find((p) => p._id === packageId);

  const submit = () => {
    if (!packageId) return Toast.show({ type: 'error', text1: 'Please choose a package' });
    const graceErr = validateGraceDays(grace);
    if (graceErr) return Toast.show({ type: 'error', text1: graceErr });
    const due = paymentDueFields({ enabled: blockUnpaid, raw: dueDays });
    if (due.error) return Toast.show({ type: 'error', text1: t('payment.errRange') });

    const payload = { schoolId, packageId };
    if (useCustom) {
      const limits = Object.fromEntries(
        Object.entries(customLimits)
          .filter(([, v]) => v !== '' && v != null)
          .map(([k, v]) => [k, Number(v)]),
      );
      if (Object.keys(limits).length) payload.customLimits = limits;
    }
    if (method || transactionId) {
      payload.paymentInfo = { method: method || undefined, transactionId: transactionId || undefined };
    }
    if (grace !== '' && grace != null) payload.gracePeriodInDays = Number(grace);
    Object.assign(payload, due.fields, launchOfferField(selected, applyOffer));
    assign.mutate(payload);
  };

  return (
    <ToastModal visible={open} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safe, { backgroundColor: C.card }]} edges={['top', 'bottom']}>
        <View style={[styles.header, { borderBottomColor: C.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: C.text }]}>Assign Subscription</Text>
            {!!schoolName && <Text style={[styles.subtitle, { color: C.muted }]}>For {schoolName}</Text>}
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={10}
            style={({ pressed }) => [styles.closeBtn, { backgroundColor: C.bg }, pressed && { opacity: 0.6 }]}
          >
            <Feather name="x" size={20} color={C.text} />
          </Pressable>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }}>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={[styles.label, { color: C.muted }]}>PACKAGE *</Text>
            {packages.length === 0 ? (
              <Text style={[styles.helper, { color: C.mutedSoft }]}>No active packages.</Text>
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

            {selected && (
              <View style={[styles.infoBox, { backgroundColor: C.bg, borderColor: C.border }]}>
                <Text style={[styles.infoText, { color: C.muted }]}>
                  Default limits — Students {selected.limits?.noOfStudents}, Branches{' '}
                  {selected.limits?.noOfBranches}, Staff {selected.limits?.noOfStaffs}, Sections{' '}
                  {selected.limits?.noOfSections}
                </Text>
              </View>
            )}

            <LaunchOfferSwitch pkg={selected} value={applyOffer} onChange={setApplyOffer} C={C} />

            <Pressable
              onPress={() => setUseCustom((v) => !v)}
              style={[styles.checkRow]}
            >
              <Feather name={useCustom ? 'check-square' : 'square'} size={18} color={useCustom ? COLORS.brand : C.mutedSoft} />
              <Text style={[styles.checkText, { color: C.text }]}>Override limits for this school</Text>
            </Pressable>

            {useCustom && (
              <View style={styles.row2wrap}>
                {LIMIT_KEYS.map(([key, lbl]) => (
                  <View key={key} style={{ flexBasis: '47%', flexGrow: 1, gap: 6 }}>
                    <Text style={[styles.label, { color: C.muted }]}>{lbl.toUpperCase()}</Text>
                    <TextInput
                      value={customLimits[key] ?? ''}
                      onChangeText={(v) => setCustomLimits((prev) => ({ ...prev, [key]: v }))}
                      placeholder={String(selected?.limits?.[key] ?? '')}
                      placeholderTextColor={C.mutedSoft}
                      keyboardType="number-pad"
                      style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
                    />
                  </View>
                ))}
              </View>
            )}

            <View style={styles.row2}>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={[styles.label, { color: C.muted }]}>PAYMENT METHOD</Text>
                <TextInput value={method} onChangeText={setMethod} placeholder="e.g. bank" placeholderTextColor={C.mutedSoft} style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]} />
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={[styles.label, { color: C.muted }]}>TRANSACTION ID</Text>
                <TextInput value={transactionId} onChangeText={setTransactionId} placeholder="e.g. TX1" placeholderTextColor={C.mutedSoft} autoCapitalize="none" style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]} />
              </View>
            </View>

            <View style={{ gap: 6 }}>
              <Text style={[styles.label, { color: C.muted }]}>GRACE PERIOD (DAYS AFTER EXPIRY)</Text>
              <TextInput value={grace} onChangeText={setGrace} placeholder="0" placeholderTextColor={C.mutedSoft} keyboardType="number-pad" style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]} />
            </View>

            <PaymentDueField
              enabled={blockUnpaid}
              onEnabledChange={setBlockUnpaid}
              value={dueDays}
              onChangeText={setDueDays}
              C={C}
            />

            <Pressable onPress={submit} disabled={assign.isPending} style={({ pressed }) => [styles.submit, (assign.isPending || pressed) && { opacity: 0.85 }]}>
              {assign.isPending ? <ActivityIndicator size="small" color="#fff" /> : (
                <>
                  <Feather name="plus" size={16} color="#fff" />
                  <Text style={styles.submitText}>Assign</Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ToastModal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  title: { fontSize: 19, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 4 },
  closeBtn: { width: 36, height: 36, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 16, paddingBottom: 36, gap: 12 },

  label: { fontSize: 10, letterSpacing: 1.1, fontWeight: '700' },
  helper: { fontSize: 12 },
  input: { height: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 14 },
  row2: { flexDirection: 'row', gap: 10 },
  row2wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, maxWidth: 260 },
  chipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText: { fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#fff' },

  infoBox: { borderRadius: 10, borderWidth: 1, padding: 10 },
  infoText: { fontSize: 12, lineHeight: 18 },

  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 },
  checkText: { fontSize: 13, fontWeight: '600' },

  submit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.brand, height: 48, borderRadius: 12, marginTop: 8 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
