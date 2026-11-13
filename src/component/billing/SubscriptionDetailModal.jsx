import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import {
  fmtMoney,
  fmtDate,
  graceCutoff,
  platformList,
  SUB_STATUS_PILL,
} from '../../constants/billing';
import { useColors } from '../../theme/useColors';
import { describePlanFeatures } from '../../utils/planFeatures';
import { isPaymentOverdue } from '../../utils/paymentDue';
import { useTranslations } from '../../i18n';
import { OverdueBadge, paymentWindowText } from './PaymentDueInfo';
import AddonList from './AddonList';
import LimitGrid from './LimitGrid';
import { PriceLockBadge, priceLockText } from './PriceLock';

// Read-only detail view for a single subscription row in the history list.
// Mirrors web system/subscriptions/SubscriptionDetailModal.
export default function SubscriptionDetailModal({ open, subscription, onClose }) {
  const C = useColors();
  const t = useTranslations('subscription');
  const sub = subscription;
  const snap = sub?.packageSnapshot;
  const cfg = SUB_STATUS_PILL[sub?.status] || { bg: '#f3f4f6', fg: '#374151' };
  const graceDays = sub?.gracePeriodInDays ?? 0;

  return (
    <Modal
      visible={open}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.safe, { backgroundColor: C.card }]} edges={['top', 'bottom']}>
        <View style={[styles.header, { borderBottomColor: C.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: C.text }]} numberOfLines={1}>
              {snap?.name || 'Subscription'}
            </Text>
            {!!sub?.serialNumber && (
              <Text style={[styles.subtitle, { color: C.muted }]}>#{sub.serialNumber}</Text>
            )}
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

        {!sub ? (
          <View style={styles.center}>
            <Text style={[styles.subtitle, { color: C.muted }]}>No subscription selected.</Text>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.statusRow}>
              <View style={[styles.pill, { backgroundColor: cfg.bg }]}>
                <Text style={[styles.pillText, { color: cfg.fg }]}>{sub.status || 'unknown'}</Text>
              </View>
              {isPaymentOverdue(sub) && <OverdueBadge />}
              <PriceLockBadge t={t} sub={sub} />
              <Text style={[styles.subtitle, { color: C.muted }]}>
                {fmtMoney(snap?.price)} · {snap?.durationInDays}d cycle
              </Text>
            </View>
            {!!sub.priceLock && (
              <Text style={[styles.subtitle, { color: '#6d28d9' }]}>{priceLockText(t, sub)}</Text>
            )}

            <View style={[styles.card, { backgroundColor: C.bg, borderColor: C.border }]}>
              <Row label="Start date" value={fmtDate(sub.startDate)} C={C} />
              <Row label="End date" value={fmtDate(sub.endDate)} C={C} />
              <Row
                label="Grace period"
                value={`${graceDays} ${graceDays === 1 ? 'day' : 'days'}`}
                C={C}
              />
              {graceDays > 0 && (
                <Row
                  label="Access blocked after"
                  value={fmtDate(graceCutoff(sub.endDate, sub.gracePeriodInDays))}
                  C={C}
                />
              )}
              <Row label={t('payment.windowLabel')} value={paymentWindowText(t, sub)} C={C} />
              {!!sub.paymentDueAt && (
                <Row label={t('payment.dueOn')} value={fmtDate(sub.paymentDueAt)} C={C} />
              )}
              <Row label="Created" value={fmtDate(sub.createdAt)} C={C} last />
            </View>

            <Text style={[styles.sectionTitle, { color: C.mutedSoft }]}>EFFECTIVE LIMITS</Text>
            <LimitGrid sub={sub} C={C} bordered />
            {sub.customLimits && Object.keys(sub.customLimits).length > 0 && (
              <Text style={[styles.hint, { color: '#92400e' }]}>
                Custom limit overrides are applied to this school.
              </Text>
            )}

            {sub.addons?.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: C.mutedSoft }]}>
                  {t('addons.title').toUpperCase()}
                </Text>
                <AddonList addons={sub.addons} C={C} />
              </>
            )}

            <View style={[styles.card, { backgroundColor: C.bg, borderColor: C.border, padding: 14 }]}>
              <Text style={[styles.kv, { color: C.muted }]}>
                Platforms:{' '}
                <Text style={{ color: C.text, textTransform: 'capitalize' }}>
                  {platformList(snap?.platforms)}
                </Text>
              </Text>
              <Text style={[styles.kv, { color: C.muted, marginTop: 8 }]}>
                Modules:{' '}
                <Text style={{ color: C.text }}>
                  {describePlanFeatures(snap?.features)}
                </Text>
              </Text>
            </View>

            {(sub.paymentInfo?.method || sub.paymentInfo?.transactionId) && (
              <View style={[styles.card, { backgroundColor: C.bg, borderColor: C.border }]}>
                <Text style={[styles.sectionTitle, { color: C.mutedSoft, paddingHorizontal: 14, paddingTop: 12 }]}>
                  PAYMENT
                </Text>
                <Row label="Method" value={sub.paymentInfo.method || '-'} C={C} />
                <Row label="Transaction ID" value={sub.paymentInfo.transactionId || '-'} C={C} last />
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

function Row({ label, value, C, last }) {
  return (
    <View style={[styles.row, last && { borderBottomWidth: 0 }, { borderBottomColor: C.border }]}>
      <Text style={[styles.rowLabel, { color: C.muted }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: C.text }]} numberOfLines={2}>
        {value}
      </Text>
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
  subtitle: { fontSize: 13, marginTop: 2 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  body: { padding: 16, paddingBottom: 40, gap: 12 },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  pill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
  pillText: { fontSize: 11, fontWeight: '800', textTransform: 'capitalize' },

  card: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },

  sectionTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, paddingHorizontal: 2, marginTop: 4 },

  hint: { fontSize: 12, fontWeight: '600', paddingHorizontal: 2 },
  kv: { fontSize: 13, fontWeight: '600' },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: { fontSize: 12, fontWeight: '600' },
  rowValue: { fontSize: 13, fontWeight: '700', flex: 1, textAlign: 'right' },
});
