import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useUserStore } from '../../src/store/userStore';
import { canSee } from '../../src/utils/permissions';
import {
  useMyCurrentSubscription,
  useMySubscriptionHistory,
  useMyInvoiceSummary,
  useMyInvoices,
} from '../../src/hooks/useBilling';
import {
  fmtMoney,
  fmtDate,
  graceCutoff,
  platformList,
  SUB_STATUS_PILL,
  INVOICE_STATUS_PILL,
  invoiceTypeLabel,
} from '../../src/constants/billing';
import AddonList from '../../src/component/billing/AddonList';
import LimitGrid from '../../src/component/billing/LimitGrid';
import StorageUsage from '../../src/component/billing/StorageUsage';
import { PriceLockBadge, priceLockText } from '../../src/component/billing/PriceLock';
import {
  addonModuleKeys,
  addonsWithInvoices,
  buyableModuleOffers,
  listedAddonPrices,
} from '../../src/utils/planAddons';
import MyInvoiceModal from '../../src/component/billing/MyInvoiceModal';
import SubscriptionDetailModal from '../../src/component/billing/SubscriptionDetailModal';
import { useColors } from '../../src/theme/useColors';
import { COLORS } from '../../src/theme/colors';
import { describePlanFeatures } from '../../src/utils/planFeatures';
import { useSubscriptionGuard } from '../../src/hooks/useSubscriptionGuard';
import { paymentDueSoon } from '../../src/utils/subscriptionState';
import { useTranslations } from '../../src/i18n';

function StatusPill({ status, map, C }) {
  const cfg = map[status] || { bg: '#f3f4f6', fg: '#374151' };
  return (
    <View style={[styles.pill, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.pillText, { color: cfg.fg }]}>{status || 'unknown'}</Text>
    </View>
  );
}

export default function BillingScreen() {
  const C = useColors();
  const t = useTranslations('subscription');
  const tm = useTranslations('planModules');
  const moduleLabel = (k) => tm(`modules.${k}`);
  const { user } = useUserStore();
  // The status endpoint carries the access state (incl. `unpaid`) and due date.
  const guard = useSubscriptionGuard();
  const allowed = canSee(user?.role, 'view-billing');

  const current = useMyCurrentSubscription();
  const summary = useMyInvoiceSummary();
  const invoices = useMyInvoices();
  const history = useMySubscriptionHistory();

  const [invoiceTarget, setInvoiceTarget] = useState(null);
  const [subTarget, setSubTarget] = useState(null);

  const planData = current.data?.data ?? null;
  const addonRows = useMemo(
    () => addonsWithInvoices(planData?.addons, invoices.data?.data),
    [planData?.addons, invoices.data],
  );

  if (!allowed) {
    return (
      <View style={[styles.root, { backgroundColor: C.bg }]}>
        <View style={styles.center}>
          <Feather name="lock" size={36} color={COLORS.red || '#dc2626'} />
          <Text style={[styles.title, { color: C.text }]}>No access</Text>
          <Text style={[styles.sub, { color: C.muted, textAlign: 'center' }]}>
            You don't have permission to view billing.
          </Text>
        </View>
      </View>
    );
  }

  const plan = current.data?.data ?? null;
  const dues = summary.data?.data ?? null;
  const invoiceRows = invoices.data?.data ?? [];
  const historyRows = history.data?.data ?? [];

  const refreshing =
    current.isFetching || summary.isFetching || invoices.isFetching || history.isFetching;
  const refetchAll = () => {
    current.refetch();
    summary.refetch();
    invoices.refetch();
    history.refetch();
  };

  const grace = plan?.gracePeriodInDays ?? 0;
  const moduleOffers = buyableModuleOffers(plan);
  const openedModules = addonModuleKeys(plan);
  const paymentDueAt = guard.paymentDueAt ?? plan?.paymentDueAt ?? null;
  const unpaid = guard.state === 'unpaid';
  const dueSoon = paymentDueSoon(guard);

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: C.bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refetchAll} tintColor={COLORS.brand} />
      }
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: C.text }]}>Billing & Subscription</Text>
        <Text style={[styles.sub, { color: C.muted }]}>
          Your current plan, outstanding balance and invoice history.
        </Text>
      </View>

      {(unpaid || dueSoon) && (
        <View style={[styles.notice, unpaid ? styles.noticeRed : styles.noticeAmber]}>
          <Feather name={unpaid ? 'lock' : 'clock'} size={16} color={unpaid ? '#b91c1c' : '#b45309'} />
          <View style={{ flex: 1, gap: 2 }}>
            {unpaid && <Text style={[styles.noticeTitle, { color: '#b91c1c' }]}>{t('school.unpaidTitle')}</Text>}
            <Text style={[styles.noticeText, { color: unpaid ? '#b91c1c' : '#b45309' }]}>
              {unpaid
                ? t('school.unpaidMessage', { date: fmtDate(paymentDueAt) })
                : t('school.dueSoon', { date: fmtDate(paymentDueAt) })}
            </Text>
          </View>
        </View>
      )}

      {/* Current plan */}
      <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
        {current.isLoading ? (
          <View style={styles.cardLoading}>
            <ActivityIndicator color={COLORS.brand} />
          </View>
        ) : plan ? (
          <>
            <View style={styles.planTitleRow}>
              <Text style={[styles.planName, { color: C.text }]} numberOfLines={1}>
                {plan.packageSnapshot?.name ?? 'Subscription'}
              </Text>
              <StatusPill status={plan.status} map={SUB_STATUS_PILL} C={C} />
              <PriceLockBadge t={t} sub={plan} />
            </View>
            <Text style={[styles.sub, { color: C.muted }]}>
              {fmtMoney(plan.packageSnapshot?.price)} · {plan.packageSnapshot?.durationInDays}d cycle
            </Text>
            {!!plan.priceLock && (
              <Text style={[styles.subSmall, { color: '#6d28d9', fontWeight: '700' }]}>
                {priceLockText(t, plan)}
              </Text>
            )}
            <Text style={[styles.subSmall, { color: C.muted }]}>
              {fmtDate(plan.startDate)} → {fmtDate(plan.endDate)}
            </Text>
            <Text style={[styles.subSmall, { color: C.muted }]}>
              Grace period: {grace} {grace === 1 ? 'day' : 'days'}
              {grace > 0 ? ` · blocked after ${fmtDate(graceCutoff(plan.endDate, grace))}` : ''}
            </Text>
            {!!paymentDueAt && (
              <Text style={[styles.subSmall, { color: unpaid ? '#b91c1c' : C.muted, fontWeight: unpaid ? '700' : '400' }]}>
                {t('school.invoiceDue')}: {fmtDate(paymentDueAt)}
              </Text>
            )}

            <LimitGrid sub={plan} C={C} style={{ marginTop: 10 }} />
            <StorageUsage storage={plan.storage} C={C} warn style={{ marginTop: 10 }} />

            <View style={[styles.planMeta, { borderTopColor: C.border }]}>
              <Text style={[styles.kv, { color: C.muted }]}>
                Platforms:{' '}
                <Text style={{ color: C.text, textTransform: 'capitalize' }}>
                  {platformList(plan.packageSnapshot?.platforms)}
                </Text>
              </Text>
              <Text style={[styles.kv, { color: C.muted, marginTop: 4 }]}>
                Modules:{' '}
                <Text style={{ color: C.text }}>
                  {describePlanFeatures(plan.packageSnapshot?.features)}
                </Text>
              </Text>
            </View>

            {addonRows.length > 0 && (
              <View style={[styles.planMeta, { borderTopColor: C.border, gap: 8 }]}>
                <Text style={[styles.blockTitle, { color: C.text }]}>{t('addons.activeTitle')}</Text>
                <AddonList addons={addonRows} C={C} />
              </View>
            )}

            {listedAddonPrices(plan.addonPrices).length > 0 && (
              <View style={[styles.planMeta, { borderTopColor: C.border, gap: 4 }]}>
                <Text style={[styles.blockTitle, { color: C.text }]}>{t('addons.pricesTitle')}</Text>
                {listedAddonPrices(plan.addonPrices).map(([key, price]) => (
                  <Text key={key} style={[styles.kv, { color: C.text }]}>
                    {t('addons.priceLine', {
                      unit: t(`addons.unit.${key}`),
                      price: fmtMoney(price),
                      days: plan.packageSnapshot?.durationInDays ?? '-',
                    })}
                  </Text>
                ))}
                <Text style={[styles.subSmall, { color: C.muted }]}>{t('addons.pricesNote')}</Text>
              </View>
            )}

            {(moduleOffers.length > 0 || openedModules.length > 0) && (
              <View style={[styles.planMeta, { borderTopColor: C.border, gap: 4 }]}>
                <Text style={[styles.blockTitle, { color: C.text }]}>{t('addons.modulesTitle')}</Text>
                {openedModules.length > 0 && (
                  <Text style={[styles.kv, { color: '#0f766e' }]}>
                    {t('addons.modulesOpened', { modules: openedModules.map(moduleLabel).join(', ') })}
                  </Text>
                )}
                {moduleOffers.map(({ key, price }) => (
                  <Text key={key} style={[styles.kv, { color: C.text }]}>
                    {price != null
                      ? t('addons.modulePriceLine', {
                          module: moduleLabel(key),
                          price: fmtMoney(price),
                          days: plan.packageSnapshot?.durationInDays ?? '-',
                        })
                      : t('addons.modulePriceNone', { module: moduleLabel(key) })}
                  </Text>
                ))}
                {moduleOffers.length > 0 && (
                  <Text style={[styles.subSmall, { color: C.muted }]}>{t('addons.modulesNote')}</Text>
                )}
              </View>
            )}
          </>
        ) : (
          <View style={styles.cardLoading}>
            <Feather name="credit-card" size={36} color={C.mutedSoft} />
            <Text style={[styles.emptyTitle, { color: C.text }]}>No active subscription</Text>
            <Text style={[styles.sub, { color: C.muted, textAlign: 'center' }]}>
              Your school has no active plan. Please contact your administrator to set one up.
            </Text>
          </View>
        )}
      </View>

      {/* Billing & dues */}
      <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
        <View style={styles.sectionHead}>
          <Feather name="file-text" size={18} color={COLORS.brand} />
          <Text style={[styles.sectionTitle, { color: C.text }]}>Billing & Dues</Text>
        </View>
        <View style={styles.duesGrid}>
          <DueStat value={fmtMoney(dues?.totalDue ?? 0)} label="Outstanding dues" bg="#fee2e2" fg="#991b1b" />
          <DueStat value={fmtMoney(dues?.totalPaid ?? 0)} label="Total paid" bg="#dcfce7" fg="#166534" />
          <DueStat value={`${dues?.unpaidCount ?? 0}`} label="Unpaid invoices" bg={C.bg} fg={C.text} />
          <DueStat value={`${dues?.invoiceCount ?? 0}`} label="Total invoices" bg={C.bg} fg={C.text} />
        </View>
        {(dues?.totalDue ?? 0) > 0 && (
          <Text style={[styles.warn, { color: '#b45309' }]}>
            You have an outstanding balance. Invoices are settled by your administrator.
          </Text>
        )}
      </View>

      {/* Invoices */}
      <Text style={[styles.listHeading, { color: C.text }]}>Invoices</Text>
      {invoices.isLoading ? (
        <ActivityIndicator color={COLORS.brand} style={{ marginVertical: 16 }} />
      ) : invoiceRows.length === 0 ? (
        <Text style={[styles.emptyLine, { color: C.muted }]}>No invoices yet.</Text>
      ) : (
        invoiceRows.map((inv) => (
          <Pressable
            key={inv._id}
            onPress={() => setInvoiceTarget(inv)}
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: C.card, borderColor: C.border },
              pressed && { opacity: 0.9 },
            ]}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.rowTitle, { color: C.text }]} numberOfLines={1}>
                #{inv.serialNumber ?? '-'}
                <Text style={{ color: C.muted, fontWeight: '500' }}>  · {invoiceTypeLabel(inv.type, t('addons.invoiceType'))}</Text>
              </Text>
              <Text style={[styles.rowMeta, { color: C.muted }]}>{fmtDate(inv.createdAt)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <Text style={[styles.rowAmount, { color: C.text }]}>{fmtMoney(inv.amountDue)}</Text>
              <StatusPill status={inv.status} map={INVOICE_STATUS_PILL} C={C} />
            </View>
            <Feather name="chevron-right" size={18} color={C.mutedSoft} style={{ marginLeft: 8 }} />
          </Pressable>
        ))
      )}

      {/* Plan history */}
      <Text style={[styles.listHeading, { color: C.text, marginTop: 18 }]}>Plan History</Text>
      {history.isLoading ? (
        <ActivityIndicator color={COLORS.brand} style={{ marginVertical: 16 }} />
      ) : historyRows.length === 0 ? (
        <Text style={[styles.emptyLine, { color: C.muted }]}>No subscription history.</Text>
      ) : (
        historyRows.map((sub) => (
          <Pressable
            key={sub._id}
            onPress={() => setSubTarget(sub)}
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: C.card, borderColor: C.border },
              pressed && { opacity: 0.9 },
            ]}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.rowTitle, { color: C.text }]} numberOfLines={1}>
                {sub.packageSnapshot?.name ?? '-'}
              </Text>
              <Text style={[styles.rowMeta, { color: C.muted }]} numberOfLines={1}>
                {fmtDate(sub.startDate)} → {fmtDate(sub.endDate)}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <Text style={[styles.rowAmount, { color: C.text }]}>
                {fmtMoney(sub.packageSnapshot?.price)}
              </Text>
              <StatusPill status={sub.status} map={SUB_STATUS_PILL} C={C} />
            </View>
            <Feather name="chevron-right" size={18} color={C.mutedSoft} style={{ marginLeft: 8 }} />
          </Pressable>
        ))
      )}

      <MyInvoiceModal
        open={!!invoiceTarget}
        invoice={invoiceTarget}
        onClose={() => setInvoiceTarget(null)}
      />
      <SubscriptionDetailModal
        open={!!subTarget}
        subscription={subTarget}
        onClose={() => setSubTarget(null)}
      />
    </ScrollView>
  );
}

function DueStat({ value, label, bg, fg }) {
  return (
    <View style={[styles.dueCard, { backgroundColor: bg }]}>
      <Text style={[styles.dueValue, { color: fg }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.dueLabel, { color: fg, opacity: 0.7 }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 14, paddingBottom: 36, gap: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },

  header: { gap: 4 },
  title: { fontSize: 24, fontWeight: '800' },
  sub: { fontSize: 13, marginTop: 2 },
  subSmall: { fontSize: 12, marginTop: 4 },

  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 6 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 14, borderWidth: 1, padding: 12 },
  noticeRed: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  noticeAmber: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  noticeTitle: { fontSize: 14, fontWeight: '800' },
  noticeText: { fontSize: 12, fontWeight: '600', lineHeight: 17 },
  cardLoading: { alignItems: 'center', justifyContent: 'center', paddingVertical: 24, gap: 10 },

  planTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  planName: { fontSize: 18, fontWeight: '800', flexShrink: 1 },

  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  pillText: { fontSize: 10, fontWeight: '800', textTransform: 'capitalize' },

  planMeta: { marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  kv: { fontSize: 13, fontWeight: '600' },
  blockTitle: { fontSize: 14, fontWeight: '800' },

  emptyTitle: { fontSize: 16, fontWeight: '800' },

  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  sectionTitle: { fontSize: 16, fontWeight: '800' },

  duesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dueCard: { flexBasis: '47%', flexGrow: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  dueValue: { fontSize: 20, fontWeight: '800' },
  dueLabel: { fontSize: 11, marginTop: 2 },
  warn: { fontSize: 12, fontWeight: '600', marginTop: 8 },

  listHeading: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  emptyLine: { fontSize: 13, paddingVertical: 12, textAlign: 'center' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  rowTitle: { fontSize: 14, fontWeight: '800' },
  rowMeta: { fontSize: 12, marginTop: 2 },
  rowAmount: { fontSize: 14, fontWeight: '800' },
});
