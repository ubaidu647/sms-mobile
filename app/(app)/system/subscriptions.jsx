import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useUserStore } from '../../../src/store/userStore';
import { isSuperAdmin } from '../../../src/utils/permissions';
import { useOrganizations } from '../../../src/hooks/useOrganizations';
import {
  useCurrentSubscription,
  useSubscriptionHistory,
  useInvoiceSummary,
  useCancelSubscription,
  useSchoolInvoices,
  useRemoveAddon,
  useMarkInvoicePaid,
} from '../../../src/hooks/useSubscriptions';
import {
  fmtMoney,
  fmtDate,
  graceCutoff,
  platformList,
  SUB_STATUS_PILL,
} from '../../../src/constants/billing';
import AssignSubscriptionModal from '../../../src/component/system/AssignSubscriptionModal';
import ChangePlanModal from '../../../src/component/system/ChangePlanModal';
import InvoiceModal from '../../../src/component/system/InvoiceModal';
import ConfirmModal from '../../../src/component/system/ConfirmModal';
import RenewSubscriptionModal from '../../../src/component/system/RenewSubscriptionModal';
import QueryErrorState from '../../../src/component/QueryErrorState';
import SubscriptionDetailModal from '../../../src/component/billing/SubscriptionDetailModal';
import AddonModal from '../../../src/component/system/AddonModal';
import AddonList, { addonText } from '../../../src/component/billing/AddonList';
import LimitGrid from '../../../src/component/billing/LimitGrid';
import StorageUsage from '../../../src/component/billing/StorageUsage';
import { PriceLockBadge, priceLockText } from '../../../src/component/billing/PriceLock';
import { addonModuleKeys, addonsWithInvoices } from '../../../src/utils/planAddons';
import { useColors } from '../../../src/theme/useColors';
import { COLORS } from '../../../src/theme/colors';
import { describePlanFeatures } from '../../../src/utils/planFeatures';
import { isPaymentOverdue } from '../../../src/utils/paymentDue';
import { OverdueBadge, paymentWindowText } from '../../../src/component/billing/PaymentDueInfo';
import { useTranslations } from '../../../src/i18n';

function StatusPill({ status, C }) {
  const cfg = SUB_STATUS_PILL[status] || { bg: '#f3f4f6', fg: '#374151' };
  return (
    <View style={[styles.pill, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.pillText, { color: cfg.fg }]}>{status || 'unknown'}</Text>
    </View>
  );
}

export default function SubscriptionsScreen() {
  const C = useColors();
  const t = useTranslations('subscription');
  const tm = useTranslations('planModules');
  const moduleLabel = (k) => tm(`modules.${k}`);
  const { user } = useUserStore();
  const allowed = isSuperAdmin(user?.role);

  const { data: schoolsData, isLoading: schoolsLoading } = useOrganizations({});
  const schools = schoolsData?.data ?? [];

  const [schoolId, setSchoolId] = useState('');
  const [schoolSearch, setSchoolSearch] = useState('');
  const selectedSchool = schools.find((s) => s._id === schoolId);

  const current = useCurrentSubscription(schoolId);
  const sub = current.data?.data ?? null;
  const history = useSubscriptionHistory(schoolId);
  const historyRows = history.data?.data ?? [];
  const summary = useInvoiceSummary(schoolId);
  const dues = summary.data?.data ?? null;

  const cancel = useCancelSubscription({ onSuccess: () => setCancelOpen(false) });

  // Add-ons, joined to their invoices to tell which can still be removed.
  const hasAddons = (sub?.addons?.length ?? 0) > 0;
  const invoices = useSchoolInvoices(schoolId, { enabled: hasAddons });
  const addonRows = useMemo(
    () => addonsWithInvoices(sub?.addons, invoices.data?.data),
    [sub?.addons, invoices.data],
  );
  const [addonOpen, setAddonOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [removeError, setRemoveError] = useState('');
  const [payingId, setPayingId] = useState(null);
  const removeAddon = useRemoveAddon({ onSuccess: () => setRemoveTarget(null) });
  const markPaid = useMarkInvoicePaid(schoolId, { onSuccess: () => setPayingId(null) });
  const confirmRemove = () => {
    setRemoveError('');
    removeAddon.mutate(
      { schoolId, addonId: removeTarget._id },
      { onError: (err) => setRemoveError(err?.message || t('addons.removeFailed')) },
    );
  };
  const payAddon = (a) => {
    if (!a.invoice?._id) return;
    setPayingId(a._id);
    markPaid.mutate({ id: a.invoice._id }, { onError: () => setPayingId(null) });
  };

  const [assignOpen, setAssignOpen] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [subTarget, setSubTarget] = useState(null);
  const [invoiceTarget, setInvoiceTarget] = useState(null);

  const filteredSchools = useMemo(() => {
    if (!schoolSearch.trim()) return schools;
    const q = schoolSearch.toLowerCase();
    return schools.filter((s) => s.name?.toLowerCase().includes(q));
  }, [schools, schoolSearch]);

  if (!allowed) {
    return (
      <View style={[styles.root, { backgroundColor: C.bg }]}>
        <View style={styles.center}><Feather name="lock" size={36} color={COLORS.red || '#dc2626'} /><Text style={[styles.title, { color: C.text }]}>No access</Text></View>
      </View>
    );
  }

  const grace = sub?.gracePeriodInDays ?? 0;
  const refreshing = current.isFetching || history.isFetching || summary.isFetching;

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: C.bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        schoolId ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { current.refetch(); history.refetch(); summary.refetch(); if (hasAddons) invoices.refetch(); }}
            tintColor={COLORS.brand}
          />
        ) : undefined
      }
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: C.text }]}>Subscriptions</Text>
        <Text style={[styles.sub, { color: C.muted }]}>View and manage each school's subscription.</Text>
      </View>

      {/* School picker */}
      {!schoolId ? (
        <>
          <View style={[styles.searchBox, { backgroundColor: C.card, borderColor: C.border }]}>
            <Feather name="search" size={16} color={C.mutedSoft} />
            <TextInput
              value={schoolSearch}
              onChangeText={setSchoolSearch}
              placeholder="Search schools..."
              placeholderTextColor={C.mutedSoft}
              style={[styles.searchInput, { color: C.text }]}
            />
          </View>
          {schoolsLoading ? (
            <ActivityIndicator color={COLORS.brand} style={{ marginTop: 20 }} />
          ) : (
            filteredSchools.map((s) => (
              <Pressable
                key={s._id}
                onPress={() => setSchoolId(s._id)}
                style={({ pressed }) => [styles.schoolRow, { backgroundColor: C.card, borderColor: C.border }, pressed && { opacity: 0.9 }]}
              >
                <Feather name="home" size={16} color={COLORS.brand} />
                <Text style={[styles.schoolName, { color: C.text }]} numberOfLines={1}>{s.name}</Text>
                <Feather name="chevron-right" size={18} color={C.mutedSoft} />
              </Pressable>
            ))
          )}
        </>
      ) : (
        <>
          <Pressable
            onPress={() => setSchoolId('')}
            style={({ pressed }) => [styles.schoolHeader, { backgroundColor: C.card, borderColor: C.border }, pressed && { opacity: 0.9 }]}
          >
            <Feather name="home" size={16} color={COLORS.brand} />
            <Text style={[styles.schoolName, { color: C.text }]} numberOfLines={1}>{selectedSchool?.name}</Text>
            <Text style={[styles.changeLink, { color: COLORS.brand }]}>Change</Text>
          </Pressable>

          {current.isLoading ? (
            <ActivityIndicator color={COLORS.brand} style={{ marginTop: 24 }} />
          ) : (
            <>
              {/* Current subscription */}
              <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
                {sub ? (
                  <>
                    <View style={styles.planTitleRow}>
                      <Text style={[styles.planName, { color: C.text }]} numberOfLines={1}>
                        {sub.packageSnapshot?.name ?? 'Subscription'}
                      </Text>
                      <StatusPill status={sub.status} C={C} />
                      {isPaymentOverdue(sub) && <OverdueBadge />}
                      <PriceLockBadge t={t} sub={sub} />
                    </View>
                    <Text style={[styles.sub, { color: C.muted }]}>
                      {fmtMoney(sub.packageSnapshot?.price)} · {sub.packageSnapshot?.durationInDays}d cycle
                    </Text>
                    {!!sub.priceLock && (
                      <Text style={[styles.subSmall, { color: '#6d28d9', fontWeight: '700' }]}>
                        {priceLockText(t, sub)}
                      </Text>
                    )}
                    <Text style={[styles.subSmall, { color: C.muted }]}>
                      {fmtDate(sub.startDate)} → {fmtDate(sub.endDate)}
                    </Text>
                    <Text style={[styles.subSmall, { color: C.muted }]}>
                      Grace: {grace} {grace === 1 ? 'day' : 'days'}
                      {grace > 0 ? ` · blocked after ${fmtDate(graceCutoff(sub.endDate, grace))}` : ''}
                    </Text>
                    <Text style={[styles.subSmall, { color: isPaymentOverdue(sub) ? '#b91c1c' : C.muted }]}>
                      {t('payment.windowLabel')}: {paymentWindowText(t, sub)}
                      {sub.paymentDueAt ? ` · ${t('payment.dueOn')}: ${fmtDate(sub.paymentDueAt)}` : ''}
                    </Text>

                    <LimitGrid sub={sub} C={C} style={{ marginTop: 10 }} />
                    <StorageUsage storage={sub.storage} C={C} warn style={{ marginTop: 10 }} />

                    <View style={[styles.planMeta, { borderTopColor: C.border }]}>
                      <Text style={[styles.kv, { color: C.muted }]}>
                        Platforms: <Text style={{ color: C.text, textTransform: 'capitalize' }}>{platformList(sub.packageSnapshot?.platforms)}</Text>
                      </Text>
                      <Text style={[styles.kv, { color: C.muted, marginTop: 4 }]}>
                        Modules: <Text style={{ color: C.text }}>{describePlanFeatures(sub.packageSnapshot?.features)}</Text>
                      </Text>
                      {addonModuleKeys(sub).length > 0 && (
                        <Text style={[styles.kv, { color: C.muted, marginTop: 4 }]}>
                          {t('addons.modulesOpened', { modules: addonModuleKeys(sub).map(moduleLabel).join(', ') })}
                        </Text>
                      )}
                    </View>
                    {sub.customLimits && Object.keys(sub.customLimits).length > 0 && (
                      <Text style={[styles.warn, { color: '#b45309' }]}>This school has custom limit overrides applied.</Text>
                    )}

                    <View style={[styles.planMeta, { borderTopColor: C.border, gap: 8 }]}>
                      <View style={styles.addonHead}>
                        <Text style={[styles.addonTitle, { color: C.text }]}>{t('addons.title')}</Text>
                        <Pressable
                          onPress={() => setAddonOpen(true)}
                          hitSlop={6}
                          style={({ pressed }) => [styles.addonBtn, pressed && { opacity: 0.85 }]}
                        >
                          <Feather name="plus" size={13} color="#fff" />
                          <Text style={styles.addonBtnText}>{t('addons.add')}</Text>
                        </Pressable>
                      </View>
                      <AddonList
                        addons={addonRows}
                        C={C}
                        onRemove={(a) => { setRemoveError(''); setRemoveTarget(a); }}
                        onMarkPaid={payAddon}
                        busyId={payingId}
                      />
                    </View>

                    <View style={styles.actionRow}>
                      <Pressable onPress={() => setChangeOpen(true)} style={({ pressed }) => [styles.primaryAction, pressed && { opacity: 0.9 }]}>
                        <Feather name="refresh-cw" size={14} color="#fff" />
                        <Text style={styles.primaryActionText}>Change</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setRenewOpen(true)}
                        style={({ pressed }) => [styles.ghostAction, { borderColor: C.border, backgroundColor: C.bg }, pressed && { opacity: 0.85 }]}
                      >
                        <Feather name="rotate-cw" size={14} color={C.text} />
                        <Text style={[styles.ghostActionText, { color: C.text }]}>Renew</Text>
                      </Pressable>
                      <Pressable onPress={() => setCancelOpen(true)} style={({ pressed }) => [styles.ghostAction, { borderColor: '#fecaca', backgroundColor: '#fef2f2' }, pressed && { opacity: 0.85 }]}>
                        <Feather name="slash" size={14} color="#991b1b" />
                        <Text style={[styles.ghostActionText, { color: '#991b1b' }]}>Cancel</Text>
                      </Pressable>
                    </View>
                  </>
                ) : current.isError ? (
                  <QueryErrorState
                    error={current.error}
                    fallback="Could not load the subscription"
                    onRetry={() => current.refetch()}
                    style={styles.cardError}
                  />
                ) : (
                  <View style={{ gap: 12, alignItems: 'center', paddingVertical: 8 }}>
                    <Feather name="credit-card" size={32} color={C.mutedSoft} />
                    <Text style={[styles.emptyTitle, { color: C.text }]}>No active subscription</Text>
                    <Text style={[styles.sub, { color: C.muted, textAlign: 'center' }]}>
                      {selectedSchool?.name} has no active plan. Assign one to get started.
                    </Text>
                    <Pressable onPress={() => setAssignOpen(true)} style={({ pressed }) => [styles.assignBtn, pressed && { opacity: 0.9 }]}>
                      <Feather name="plus" size={16} color="#fff" />
                      <Text style={styles.primaryActionText}>Assign Subscription</Text>
                    </Pressable>
                  </View>
                )}
              </View>

              {/* Billing & dues */}
              <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
                <View style={styles.sectionHead}>
                  <Feather name="file-text" size={18} color={COLORS.brand} />
                  <Text style={[styles.sectionTitle, { color: C.text }]}>Billing & Dues</Text>
                </View>
                {summary.isError && !dues ? (
                  <QueryErrorState
                    error={summary.error}
                    fallback="Could not load billing"
                    onRetry={() => summary.refetch()}
                    style={styles.cardError}
                  />
                ) : (
                  <View style={styles.duesGrid}>
                    <DueStat value={fmtMoney(dues?.totalDue ?? 0)} label="Outstanding dues" bg="#fee2e2" fg="#991b1b" />
                    <DueStat value={fmtMoney(dues?.totalPaid ?? 0)} label="Total paid" bg="#dcfce7" fg="#166534" />
                    <DueStat value={`${dues?.unpaidCount ?? 0}`} label="Unpaid invoices" bg={C.bg} fg={C.text} />
                    <DueStat value={`${dues?.invoiceCount ?? 0}`} label="Total invoices" bg={C.bg} fg={C.text} />
                  </View>
                )}
                <Text style={[styles.hint, { color: C.mutedSoft }]}>
                  Open a plan below and choose “View Invoice” to see line items or mark it paid.
                </Text>
              </View>

              {/* History */}
              <Text style={[styles.listHeading, { color: C.text }]}>History</Text>
              {history.isLoading ? (
                <ActivityIndicator color={COLORS.brand} style={{ marginVertical: 16 }} />
              ) : historyRows.length === 0 ? (
                <Text style={[styles.emptyLine, { color: C.muted }]}>No subscription history.</Text>
              ) : (
                historyRows.map((row) => (
                  <View key={row._id} style={[styles.histRow, { backgroundColor: C.card, borderColor: C.border }]}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.histTitle, { color: C.text }]} numberOfLines={1}>{row.packageSnapshot?.name ?? '-'}</Text>
                      <Text style={[styles.histMeta, { color: C.muted }]} numberOfLines={1}>
                        {fmtMoney(row.packageSnapshot?.price)} · {fmtDate(row.startDate)} → {fmtDate(row.endDate)}
                      </Text>
                      {!!row.paymentDueAt && (
                        <Text style={[styles.histMeta, { color: isPaymentOverdue(row) ? '#b91c1c' : C.muted }]} numberOfLines={1}>
                          {t('payment.dueOn')}: {fmtDate(row.paymentDueAt)}
                        </Text>
                      )}
                      {isPaymentOverdue(row) && <View style={{ marginTop: 4, alignSelf: 'flex-start' }}><OverdueBadge /></View>}
                    </View>
                    <StatusPill status={row.status} C={C} />
                    <View style={styles.histActions}>
                      <Pressable onPress={() => setSubTarget(row)} hitSlop={6} style={({ pressed }) => [styles.histIconBtn, { backgroundColor: C.bg }, pressed && { opacity: 0.7 }]}>
                        <Feather name="eye" size={15} color={C.text} />
                      </Pressable>
                      <Pressable onPress={() => setInvoiceTarget(row)} hitSlop={6} style={({ pressed }) => [styles.histIconBtn, { backgroundColor: C.bg }, pressed && { opacity: 0.7 }]}>
                        <Feather name="file-text" size={15} color={C.text} />
                      </Pressable>
                    </View>
                  </View>
                ))
              )}
            </>
          )}
        </>
      )}

      {/* Modals */}
      <AssignSubscriptionModal open={assignOpen} onClose={() => setAssignOpen(false)} schoolId={schoolId} schoolName={selectedSchool?.name} />
      <ChangePlanModal open={changeOpen} onClose={() => setChangeOpen(false)} schoolId={schoolId} schoolName={selectedSchool?.name} current={sub} />
      <RenewSubscriptionModal open={renewOpen} onClose={() => setRenewOpen(false)} schoolId={schoolId} schoolName={selectedSchool?.name} current={sub} />
      <AddonModal open={addonOpen} onClose={() => setAddonOpen(false)} schoolId={schoolId} schoolName={selectedSchool?.name} current={sub} />
      <ConfirmModal
        open={!!removeTarget}
        title={t('addons.removeTitle')}
        message={removeTarget ? t('addons.removeMessage', { label: addonText(t, removeTarget, moduleLabel) }) : ''}
        confirmLabel={t('addons.remove')}
        confirmTone="danger"
        loading={removeAddon.isPending}
        onClose={() => setRemoveTarget(null)}
        onConfirm={confirmRemove}
      >
        {!!removeError && <Text style={styles.removeError}>{removeError}</Text>}
      </ConfirmModal>
      <ConfirmModal
        open={cancelOpen}
        title="Cancel Subscription"
        message={selectedSchool ? `Cancel the active subscription for "${selectedSchool.name}"? The school will be left without an active plan.` : ''}
        confirmLabel="Cancel Subscription"
        confirmTone="danger"
        loading={cancel.isPending}
        onClose={() => setCancelOpen(false)}
        onConfirm={() => cancel.mutate(schoolId)}
      />
      <SubscriptionDetailModal open={!!subTarget} subscription={subTarget} onClose={() => setSubTarget(null)} />
      <InvoiceModal open={!!invoiceTarget} subscription={invoiceTarget} schoolId={schoolId} onClose={() => setInvoiceTarget(null)} />
    </ScrollView>
  );
}

function DueStat({ value, label, bg, fg }) {
  return (
    <View style={[styles.dueCard, { backgroundColor: bg }]}>
      <Text style={[styles.dueValue, { color: fg }]} numberOfLines={1}>{value}</Text>
      <Text style={[styles.dueLabel, { color: fg, opacity: 0.7 }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 14, paddingBottom: 36, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },

  header: { gap: 4 },
  title: { fontSize: 24, fontWeight: '800' },
  sub: { fontSize: 13, marginTop: 2 },
  subSmall: { fontSize: 12, marginTop: 4 },

  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12 },
  searchInput: { flex: 1, fontSize: 14 },

  schoolRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  schoolHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  schoolName: { flex: 1, fontSize: 15, fontWeight: '800' },
  changeLink: { fontSize: 13, fontWeight: '800' },

  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 6 },
  planTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  planName: { fontSize: 18, fontWeight: '800', flexShrink: 1 },

  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  pillText: { fontSize: 10, fontWeight: '800', textTransform: 'capitalize' },

  planMeta: { marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  kv: { fontSize: 13, fontWeight: '600' },
  warn: { fontSize: 12, fontWeight: '600', marginTop: 8 },
  addonHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  addonTitle: { fontSize: 14, fontWeight: '800' },
  addonBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 30, paddingHorizontal: 10, borderRadius: 8, backgroundColor: COLORS.brand },
  addonBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  removeError: { fontSize: 12, fontWeight: '600', color: '#b91c1c', marginTop: 10 },

  emptyTitle: { fontSize: 16, fontWeight: '800' },
  cardError: { flex: 0, padding: 8 },

  actionRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  primaryAction: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 42, borderRadius: 10, backgroundColor: COLORS.brand },
  primaryActionText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  ghostAction: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 42, borderRadius: 10, borderWidth: 1 },
  ghostActionText: { fontWeight: '700', fontSize: 13 },
  assignBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, paddingHorizontal: 20, borderRadius: 12, backgroundColor: COLORS.brand, marginTop: 4 },

  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  duesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dueCard: { flexBasis: '47%', flexGrow: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  dueValue: { fontSize: 20, fontWeight: '800' },
  dueLabel: { fontSize: 11, marginTop: 2 },
  hint: { fontSize: 11, marginTop: 8 },

  listHeading: { fontSize: 16, fontWeight: '800', marginBottom: 2, marginTop: 4 },
  emptyLine: { fontSize: 13, paddingVertical: 12, textAlign: 'center' },

  histRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 8 },
  histTitle: { fontSize: 14, fontWeight: '800' },
  histMeta: { fontSize: 11, marginTop: 2 },
  histActions: { flexDirection: 'row', gap: 6 },
  histIconBtn: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
