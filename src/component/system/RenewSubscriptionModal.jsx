import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import ConfirmModal from './ConfirmModal';
import PaymentDueField from './PaymentDueField';
import { usePackages } from '../../hooks/usePackages';
import {
  useInvoiceBySubscription,
  useRenewSubscription,
  useSchoolInvoices,
} from '../../hooks/useSubscriptions';
import { fmtDate, fmtMoney, validateGraceDays } from '../../constants/billing';
import { estimatePlanChange } from '../../utils/planChangeEstimate';
import { addonRenewalTotal, addonsWithInvoices, carriedAddons } from '../../utils/planAddons';
import { livePriceLock, renewalPrice } from '../../utils/launchOffer';
import { initialBlockEnabled, paymentDueFields } from '../../utils/paymentDue';
import { useTranslations } from '../../i18n';
import { COLORS } from '../../theme/colors';
import { useColors } from '../../theme/useColors';

const OPTIONS = [
  { key: 'today', title: 'renew.fromToday', desc: 'renew.fromTodayDesc' },
  { key: 'endDate', title: 'renew.fromEnd', desc: 'renew.fromEndDesc' },
];

const idOf = (v) => (v && typeof v === 'object' ? v._id : v);

// Renew the current plan: grace period, payment window, and where the new
// period starts (today, crediting the unused days; or after the current end
// date, keeping them), and whether add-ons carry over (billed for the full new
// period) or are dropped (their unused paid value credited). Previews each
// option's end date and amount; the server is authoritative and its refusal
// is shown inline.
export default function RenewSubscriptionModal({ open, onClose, schoolId, schoolName, current }) {
  const C = useColors();
  const t = useTranslations('subscription');
  const [grace, setGrace] = useState('');
  const [startFrom, setStartFrom] = useState('today');
  const [blockUnpaid, setBlockUnpaid] = useState(true);
  const [dueDays, setDueDays] = useState('');
  const [keepAddons, setKeepAddons] = useState(true);
  const [error, setError] = useState('');

  const renew = useRenewSubscription({ onSuccess: () => onClose() });
  const invoiceQuery = useInvoiceBySubscription(open ? current?._id : null);
  // Which add-ons are paid decides their credit, so read the school's invoices.
  const hasAddons = (current?.addons?.length ?? 0) > 0;
  const addonInvoices = useSchoolInvoices(schoolId, { enabled: open && hasAddons });
  const addonRows = useMemo(
    () => addonsWithInvoices(current?.addons, addonInvoices.data?.data),
    [current?.addons, addonInvoices.data],
  );
  // Renewal re-prices from the catalog package, so preview with its price.
  const { data: pkgData } = usePackages({ limit: 100, enabled: open });

  useEffect(() => {
    if (open) {
      setGrace(current?.gracePeriodInDays != null ? String(current.gracePeriodInDays) : '');
      setStartFrom('today');
      setBlockUnpaid(initialBlockEnabled(current));
      setDueDays('');
      setKeepAddons(true);
      setError('');
    }
  }, [open, current]);

  const snap = current?.packageSnapshot;
  const pkg = (pkgData?.data ?? []).find((p) => p._id === idOf(current?.packageId));
  // The locked launch price while the lock lasts, else the catalog price.
  const price = renewalPrice(current, pkg);
  const lock = livePriceLock(current);
  const duration = pkg?.durationInDays ?? snap?.durationInDays;
  // The renewed plan's modules: a module add-on it now includes is not carried.
  const newFeatures = pkg?.features ?? snap?.features;
  const invoiceKnown = invoiceQuery.isSuccess && (!hasAddons || addonInvoices.isSuccess);
  const invoice = invoiceQuery.data?.data ?? null;

  const estimates = useMemo(() => {
    if (!open || !current || !invoiceKnown) return {};
    const base = {
      current,
      invoice,
      newPrice: price,
      newDurationInDays: duration,
      addons: addonRows,
      keepAddons: hasAddons && keepAddons,
      newFeatures,
    };
    return {
      today: estimatePlanChange({ ...base, startFrom: 'today' }),
      endDate: estimatePlanChange({ ...base, startFrom: 'endDate' }),
    };
  }, [open, current, invoice, invoiceKnown, price, duration, addonRows, hasAddons, keepAddons, newFeatures]);
  const addonCharge = hasAddons
    ? addonRenewalTotal(carriedAddons(addonRows, newFeatures), snap?.durationInDays, duration)
    : 0;
  const ended = !!estimates.endDate && !estimates.endDate.extendsPlan;

  const submit = () => {
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

    const payload = { schoolId, startFrom, ...due.fields };
    if (hasAddons) payload.keepAddons = keepAddons;
    if (grace !== '' && grace != null) payload.gracePeriodInDays = Number(grace);
    setError('');
    renew.mutate(payload, { onError: (err) => setError(err?.message || 'Renewal failed') });
  };

  return (
    <ConfirmModal
      open={open}
      title="Renew Subscription"
      message={
        current
          ? `Renew "${snap?.name}" for ${schoolName}? A ${duration}-day cycle at current pricing.`
          : ''
      }
      confirmLabel="Renew"
      confirmTone="primary"
      loading={renew.isPending}
      onClose={onClose}
      onConfirm={submit}
    >
      <ScrollView style={{ maxHeight: 440 }} contentContainerStyle={{ gap: 12 }} keyboardShouldPersistTaps="handled">
        {!!lock && (
          <Text style={[styles.hint, { color: '#6d28d9', fontWeight: '700' }]}>
            {t('launchOffer.renewNote', { price: fmtMoney(lock.price), date: fmtDate(lock.until) })}
          </Text>
        )}
        <View style={{ gap: 6 }}>
          <Text style={[styles.label, { color: C.muted }]}>{t('renew.startLabel').toUpperCase()}</Text>
          {OPTIONS.map((opt) => {
            const active = startFrom === opt.key;
            const est = estimates[opt.key];
            return (
              <Pressable
                key={opt.key}
                onPress={() => { setStartFrom(opt.key); setError(''); }}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                style={({ pressed }) => [
                  styles.option,
                  { borderColor: active ? COLORS.brand : C.border, backgroundColor: C.bg },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Feather name={active ? 'check-circle' : 'circle'} size={18} color={active ? COLORS.brand : C.mutedSoft} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.optTitle, { color: C.text }]}>{t(opt.title)}</Text>
                  <Text style={[styles.optDesc, { color: C.muted }]}>{t(opt.desc)}</Text>
                  {est?.endDate && (
                    <Text style={[styles.optDesc, { color: C.text }]}>
                      {t('renew.newEnd', { date: fmtDate(est.endDate) })}
                    </Text>
                  )}
                  {est && !est.refused && (
                    <Text style={[styles.optDesc, { color: C.text }]}>
                      {t('renew.amountDue', { amount: fmtMoney(est.amountDue) })}
                    </Text>
                  )}
                  {est?.refused && (
                    <Text style={[styles.optDesc, { color: '#b45309' }]}>
                      {t(est.invoiceUnpaid ? 'renew.unpaidNote' : 'addons.unpaidNote')}
                    </Text>
                  )}
                </View>
              </Pressable>
            );
          })}
          {ended && <Text style={[styles.hint, { color: C.mutedSoft }]}>{t('renew.ended')}</Text>}
          {(estimates.today || estimates.endDate) && (
            <Text style={[styles.hint, { color: C.mutedSoft }]}>{t('renew.estimateNote')}</Text>
          )}
        </View>

        {hasAddons && (
          <View style={{ gap: 4 }}>
            <View style={styles.switchRow}>
              <Text style={[styles.label, { color: C.muted, flex: 1 }]}>
                {t('addons.keepLabel').toUpperCase()}
              </Text>
              <Switch
                value={keepAddons}
                onValueChange={(v) => { setKeepAddons(v); setError(''); }}
                trackColor={{ true: COLORS.brand }}
                accessibilityLabel={t('addons.keepLabel')}
              />
            </View>
            <Text style={[styles.hint, { color: C.mutedSoft }]}>
              {keepAddons
                ? t('addons.keepOn', { amount: fmtMoney(addonCharge) })
                : t('addons.keepOff')}
            </Text>
          </View>
        )}

        <View style={{ gap: 6 }}>
          <Text style={[styles.label, { color: C.muted }]}>GRACE PERIOD (DAYS AFTER EXPIRY)</Text>
          <TextInput
            value={grace}
            onChangeText={setGrace}
            placeholder="0"
            placeholderTextColor={C.mutedSoft}
            keyboardType="number-pad"
            style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
          />
          <Text style={[styles.hint, { color: C.mutedSoft }]}>Leave unchanged to keep the current grace period.</Text>
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

        {!!error && (
          <View style={styles.errorBox}>
            <Feather name="alert-circle" size={15} color="#b91c1c" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>
    </ConfirmModal>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 10, letterSpacing: 1.1, fontWeight: '700' },
  input: { height: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 14 },
  hint: { fontSize: 11, lineHeight: 16 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  option: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1.5, borderRadius: 12, padding: 12 },
  optTitle: { fontSize: 13, fontWeight: '800' },
  optDesc: { fontSize: 12, lineHeight: 17 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  errorText: { flex: 1, fontSize: 12, fontWeight: '600', color: '#b91c1c', lineHeight: 17 },
});
