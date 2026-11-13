import { useEffect, useMemo, useState } from 'react';
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
import {
  useChangePackage,
  useInvoiceBySubscription,
  useSchoolInvoices,
} from '../../hooks/useSubscriptions';
import { fmtMoney, validateGraceDays } from '../../constants/billing';
import { useColors } from '../../theme/useColors';
import { COLORS } from '../../theme/colors';
import { estimatePlanChange } from '../../utils/planChangeEstimate';
import { addonsWithInvoices } from '../../utils/planAddons';
import { initialBlockEnabled, paymentDueFields } from '../../utils/paymentDue';
import { useTranslations } from '../../i18n';
import PaymentDueField from './PaymentDueField';
import LaunchOfferSwitch, { launchOfferField } from './LaunchOfferSwitch';
import { startPrice } from '../../utils/launchOffer';

export default function ChangePlanModal({ open, onClose, schoolId, schoolName, current }) {
  const C = useColors();
  const t = useTranslations('subscription');
  const { data: pkgData } = usePackages({ limit: 100, filters: { isActive: true }, enabled: open });
  const packages = pkgData?.data ?? [];
  const change = useChangePackage({ onSuccess: () => onClose() });
  const invoiceQuery = useInvoiceBySubscription(open ? current?._id : null);
  // A package change drops the add-ons, crediting the paid ones' unused value.
  const hasAddons = (current?.addons?.length ?? 0) > 0;
  const addonInvoices = useSchoolInvoices(schoolId, { enabled: open && hasAddons });
  const addonRows = useMemo(
    () => addonsWithInvoices(current?.addons, addonInvoices.data?.data),
    [current?.addons, addonInvoices.data],
  );

  const [packageId, setPackageId] = useState('');
  const [method, setMethod] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [grace, setGrace] = useState('');
  const [blockUnpaid, setBlockUnpaid] = useState(true);
  const [dueDays, setDueDays] = useState('');
  const [applyOffer, setApplyOffer] = useState(true);

  useEffect(() => {
    if (open) {
      setPackageId('');
      setMethod('');
      setTransactionId('');
      setGrace(current?.gracePeriodInDays != null ? String(current.gracePeriodInDays) : '');
      setBlockUnpaid(initialBlockEnabled(current));
      setDueDays('');
      setApplyOffer(true);
    }
  }, [open, current]);

  const selected = packages.find((p) => p._id === packageId);

  // Client-side proration preview; backend is authoritative. Whether the current
  // invoice was paid decides the credit, so no figure shows until that is known.
  const invoiceKnown = invoiceQuery.isSuccess && (!hasAddons || addonInvoices.isSuccess);
  const invoice = invoiceQuery.data?.data ?? null;
  const estimate = useMemo(() => {
    if (!selected || !invoiceKnown) return null;
    // The launch-offer price when it applies (see LaunchOfferSwitch).
    return estimatePlanChange({
      current,
      invoice,
      newPrice: startPrice(selected, applyOffer),
      addons: addonRows,
    });
  }, [selected, current, invoice, invoiceKnown, addonRows, applyOffer]);

  const submit = () => {
    if (!packageId) return Toast.show({ type: 'error', text1: 'Please choose the new package' });
    if (current?.packageId === packageId || current?.packageSnapshot?.name === selected?.name)
      return Toast.show({ type: 'error', text1: 'That is already the current plan. Use Renew instead.' });
    const graceErr = validateGraceDays(grace);
    if (graceErr) return Toast.show({ type: 'error', text1: graceErr });
    const due = paymentDueFields({
      enabled: blockUnpaid,
      raw: dueDays,
      carriedOff: current?.paymentDueInDays === null,
    });
    if (due.error)
      return Toast.show({
        type: 'error',
        text1: t(due.error === 'required' ? 'payment.errRequired' : 'payment.errRange'),
      });

    const payload = { schoolId, packageId };
    if (method || transactionId) {
      payload.paymentInfo = { method: method || undefined, transactionId: transactionId || undefined };
    }
    if (grace !== '' && grace != null) payload.gracePeriodInDays = Number(grace);
    Object.assign(payload, due.fields, launchOfferField(selected, applyOffer));
    change.mutate(payload);
  };

  return (
    <ToastModal visible={open} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safe, { backgroundColor: C.card }]} edges={['top', 'bottom']}>
        <View style={[styles.header, { borderBottomColor: C.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: C.text }]}>Change Plan</Text>
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
            {current?.packageSnapshot && (
              <View style={[styles.infoBox, { backgroundColor: C.bg, borderColor: C.border }]}>
                <Text style={[styles.infoText, { color: C.muted }]}>
                  Current plan: <Text style={{ fontWeight: '800', color: C.text }}>{current.packageSnapshot.name}</Text>
                  {' — '}{fmtMoney(current.packageSnapshot.price)} / {current.packageSnapshot.durationInDays}d
                </Text>
              </View>
            )}

            {hasAddons && (
              <Text style={[styles.infoText, { color: '#b45309' }]}>{t('addons.changeNote')}</Text>
            )}

            <Text style={[styles.label, { color: C.muted }]}>NEW PACKAGE *</Text>
            {packages.length === 0 ? (
              <Text style={[styles.infoText, { color: C.mutedSoft }]}>No active packages.</Text>
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

            <LaunchOfferSwitch pkg={selected} value={applyOffer} onChange={setApplyOffer} C={C} />

            {selected && invoiceQuery.isError && (
              <Text style={[styles.infoText, { color: C.mutedSoft }]}>
                Could not load the current invoice, so no estimate is shown. The server calculates the final amount.
              </Text>
            )}

            {estimate && (
              <View style={[styles.estBox, { borderColor: '#99f6e4', backgroundColor: '#f0fdfa' }]}>
                <Text style={styles.estTitle}>Estimated billing ({estimate.direction})</Text>
                <View style={styles.estRow}>
                  <Text style={styles.estLabel}>Credit</Text>
                  <Text style={styles.estLabel}>−{fmtMoney(estimate.credit)}</Text>
                </View>
                {estimate.carriedForward > 0 && (
                  <View style={styles.estRow}>
                    <Text style={styles.estLabel}>Carried to the new plan</Text>
                    <Text style={styles.estLabel}>{fmtMoney(estimate.carriedForward)}</Text>
                  </View>
                )}
                <View style={styles.estRow}>
                  <Text style={styles.estStrong}>Amount due</Text>
                  <Text style={styles.estStrong}>{fmtMoney(estimate.amountDue)}</Text>
                </View>
                {estimate.invoiceUnpaid && (
                  <Text style={styles.estNote}>
                    The current invoice is not paid, so its unused time earns no credit{invoice?.status === 'unpaid' ? ' and the invoice is voided' : ''}.
                  </Text>
                )}
                <Text style={styles.estNote}>
                  Estimate only — a fresh {selected?.durationInDays}-day cycle starts on confirm. The server calculates the final amount.
                </Text>
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
              <Text style={[styles.infoText, { color: C.mutedSoft }]}>Leave unchanged to keep the current grace period.</Text>
            </View>

            <PaymentDueField
              enabled={blockUnpaid}
              onEnabledChange={setBlockUnpaid}
              value={dueDays}
              onChangeText={setDueDays}
              placeholder={current?.paymentDueInDays > 0 ? String(current.paymentDueInDays) : undefined}
              canCarry
              C={C}
            />

            <Pressable onPress={submit} disabled={change.isPending} style={({ pressed }) => [styles.submit, (change.isPending || pressed) && { opacity: 0.85 }]}>
              {change.isPending ? <ActivityIndicator size="small" color="#fff" /> : (
                <>
                  <Feather name="refresh-cw" size={16} color="#fff" />
                  <Text style={styles.submitText}>{estimate ? estimate.direction : 'Change Plan'}</Text>
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
  input: { height: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 14 },
  row2: { flexDirection: 'row', gap: 10 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, maxWidth: 260 },
  chipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText: { fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#fff' },

  infoBox: { borderRadius: 10, borderWidth: 1, padding: 10 },
  infoText: { fontSize: 12, lineHeight: 18 },

  estBox: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 4 },
  estTitle: { fontSize: 13, fontWeight: '800', color: '#115e59' },
  estRow: { flexDirection: 'row', justifyContent: 'space-between' },
  estLabel: { fontSize: 13, color: '#334155' },
  estStrong: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  estNote: { fontSize: 11, color: '#475569', marginTop: 2 },

  submit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.brand, height: 48, borderRadius: 12, marginTop: 8 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
