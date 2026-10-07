import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useUserStore } from '../../store/userStore';
import { useBranchesDropdown } from '../../hooks/useBranchProfilesList';
import {
  usePaymentsList,
  useVoidPayment,
} from '../../hooks/useFees';
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_PILL,
  formatDate,
  formatMoney,
  titleCase,
} from '../../constants/fee';
import { hasAnyAction, resolveScope } from '../../utils/permissions';
import { pageCount } from '../../utils/pagination';
import { useColors } from '../../theme/useColors';
import { COLORS } from '../../theme/colors';
import SmallActionModal from './SmallActionModal';
import PaymentDetailModal from './PaymentDetailModal';

function PaymentCard({ p, canVoid, onVoid, onView, C }) {
  const cfg = PAYMENT_METHOD_PILL[p.method] || PAYMENT_METHOD_PILL.other;
  return (
    <Pressable
      onPress={onView}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: C.card,
          borderColor: C.border,
          opacity: p.isVoid ? 0.7 : 1,
        },
        pressed && { opacity: p.isVoid ? 0.6 : 0.92 },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.receipt, { color: C.text }]} numberOfLines={1}>
            {p.receiptNumber}
            {p.isVoid && <Text style={{ color: '#991b1b', fontSize: 12 }}> · VOID</Text>}
          </Text>
          <Text style={[styles.meta, { color: C.muted }]} numberOfLines={1}>
            {p.student?.user?.name || '—'}
            {p.student?.admissionNumber ? ` · ${p.student.admissionNumber}` : ''}
          </Text>
          {!!p.voucher?.voucherNumber && (
            <Text style={[styles.meta, { color: C.mutedSoft }]} numberOfLines={1}>
              for {p.voucher.voucherNumber}
            </Text>
          )}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.amount, { color: p.isVoid ? '#991b1b' : C.text }]}>
            {formatMoney(p.amount)}
          </Text>
          <View style={[styles.pill, { backgroundColor: cfg.bg, marginTop: 4 }]}>
            <Text style={[styles.pillText, { color: cfg.fg }]}>{cfg.label}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.footerRow, { borderTopColor: C.border }]}>
        <Text style={[styles.footerText, { color: C.muted }]}>
          {formatDate(p.paymentDate)}
          {p.referenceNumber ? `  ·  Ref ${p.referenceNumber}` : ''}
        </Text>
        {canVoid && !p.isVoid && (
          <Pressable
            onPress={onVoid}
            style={({ pressed }) => [
              styles.voidBtn,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Feather name="x-circle" size={12} color="#991b1b" />
            <Text style={styles.voidBtnText}>Void</Text>
          </Pressable>
        )}
      </View>
      {p.isVoid && p.voidReason && (
        <View style={[styles.voidBox, { backgroundColor: '#fee2e2', borderColor: '#fecaca' }]}>
          <Text style={styles.voidReasonText}>Reason: {p.voidReason}</Text>
        </View>
      )}
    </Pressable>
  );
}

export default function PaymentsPanel() {
  const C = useColors();
  const { user } = useUserStore();

  const scope = resolveScope(user?.role, 'view-payment');
  const isOrgLevel = scope === 'all';

  const canVoid = hasAnyAction(user?.role, ['void-payment', 'void-all-branch-payment']);

  const userBranchId =
    (typeof user?.branchId === 'string' && user.branchId) ||
    user?.branchId?._id ||
    user?.branch?._id ||
    '';

  const [fromDate, setFromDateState] = useState('');
  const [toDate, setToDateState] = useState('');
  const [method, setMethodState] = useState('');
  const [isVoid, setIsVoidState] = useState('false');
  const [branchId, setBranchIdState] = useState('');
  const [page, setPage] = useState(1);
  // Any filter change starts over at page 1; the old page may not exist anymore.
  const withPageReset = (setter) => (value) => {
    setter(value);
    setPage(1);
  };
  const setFromDate = withPageReset(setFromDateState);
  const setToDate = withPageReset(setToDateState);
  const setMethod = withPageReset(setMethodState);
  const setIsVoid = withPageReset(setIsVoidState);
  const setBranchId = withPageReset(setBranchIdState);
  const [limit] = useState(20);
  const [showFilters, setShowFilters] = useState(false);
  const [voidTarget, setVoidTarget] = useState(null);
  const [detailTarget, setDetailTarget] = useState(null);

  const { data: branchData } = useBranchesDropdown({ enabled: isOrgLevel });
  const branches = branchData?.data || [];
  const effectiveBranchId = isOrgLevel ? branchId : userBranchId;

  const { data, isLoading, isFetching, refetch, error } = usePaymentsList({
    page,
    limit,
    filters: { fromDate, toDate, method, isVoid },
    branchId: effectiveBranchId || undefined,
  });
  const rows = data?.data || [];
  const total = data?.total ?? rows.length;
  const totalPages = pageCount(total, limit);

  // Voiding can shrink the list; don't strand the user on a page past the end.
  useEffect(() => {
    if (data && page > totalPages) setPage(totalPages);
  }, [data, page, totalPages]);

  const voidMut = useVoidPayment({
    id: voidTarget?._id,
    onSuccess: () => setVoidTarget(null),
  });

  const activeCount = useMemo(() => {
    let n = 0;
    if (fromDate) n++;
    if (toDate) n++;
    if (method) n++;
    if (isVoid !== 'false') n++;
    if (branchId) n++;
    return n;
  }, [fromDate, toDate, method, isVoid, branchId]);

  const Header = (
    <View style={{ gap: 12 }}>
      <Pressable
        onPress={() => setShowFilters((v) => !v)}
        style={({ pressed }) => [
          styles.toggleFilterBtn,
          { backgroundColor: C.card, borderColor: C.border },
          pressed && { opacity: 0.85 },
        ]}
      >
        <Feather name="filter" size={16} color={C.text} />
        <Text style={[styles.actionBtnText, { color: C.text }]}>
          Filters{activeCount > 0 ? ` (${activeCount})` : ''}
        </Text>
      </Pressable>

      {showFilters && (
        <View style={[styles.filtersCard, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: C.muted }]}>FROM</Text>
              <TextInput
                value={fromDate}
                onChangeText={setFromDate}
                placeholder="2026-06-01"
                placeholderTextColor={C.mutedSoft}
                keyboardType="numbers-and-punctuation"
                autoCapitalize="none"
                style={[
                  styles.input,
                  { color: C.text, borderColor: C.border, backgroundColor: C.bg },
                ]}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: C.muted }]}>TO</Text>
              <TextInput
                value={toDate}
                onChangeText={setToDate}
                placeholder="2026-06-30"
                placeholderTextColor={C.mutedSoft}
                keyboardType="numbers-and-punctuation"
                autoCapitalize="none"
                style={[
                  styles.input,
                  { color: C.text, borderColor: C.border, backgroundColor: C.bg },
                ]}
              />
            </View>
          </View>

          <View>
            <Text style={[styles.label, { color: C.muted }]}>METHOD</Text>
            <View style={styles.chipRow}>
              <Pressable
                onPress={() => setMethod('')}
                style={({ pressed }) => [
                  styles.chip,
                  { backgroundColor: C.bg, borderColor: C.border },
                  !method && styles.chipActive,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: C.text },
                    !method && styles.chipTextActive,
                  ]}
                >
                  All
                </Text>
              </Pressable>
              {PAYMENT_METHODS.map((m) => {
                const active = method === m;
                return (
                  <Pressable
                    key={m}
                    onPress={() => setMethod(m)}
                    style={({ pressed }) => [
                      styles.chip,
                      { backgroundColor: C.bg, borderColor: C.border },
                      active && styles.chipActive,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: C.text },
                        active && styles.chipTextActive,
                      ]}
                    >
                      {titleCase(m)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View>
            <Text style={[styles.label, { color: C.muted }]}>STATUS</Text>
            <View style={styles.chipRow}>
              {[
                { v: 'false', l: 'Active' },
                { v: 'true', l: 'Voided' },
                { v: '', l: 'All' },
              ].map((o) => {
                const active = isVoid === o.v;
                return (
                  <Pressable
                    key={o.l}
                    onPress={() => setIsVoid(o.v)}
                    style={({ pressed }) => [
                      styles.chip,
                      { backgroundColor: C.bg, borderColor: C.border },
                      active && styles.chipActive,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: C.text },
                        active && styles.chipTextActive,
                      ]}
                    >
                      {o.l}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {isOrgLevel && branches.length > 0 && (
            <View>
              <Text style={[styles.label, { color: C.muted }]}>BRANCH</Text>
              <View style={styles.chipRow}>
                <Pressable
                  onPress={() => setBranchId('')}
                  style={({ pressed }) => [
                    styles.chip,
                    { backgroundColor: C.bg, borderColor: C.border },
                    !branchId && styles.chipActive,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: C.text },
                      !branchId && styles.chipTextActive,
                    ]}
                  >
                    All
                  </Text>
                </Pressable>
                {branches.map((b) => {
                  const active = branchId === b._id;
                  return (
                    <Pressable
                      key={b._id}
                      onPress={() => setBranchId(b._id)}
                      style={({ pressed }) => [
                        styles.chip,
                        { backgroundColor: C.bg, borderColor: C.border },
                        active && styles.chipActive,
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: C.text },
                          active && styles.chipTextActive,
                        ]}
                      >
                        {b.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      )}

      <View style={styles.resultBar}>
        <Text style={[styles.resultText, { color: C.muted }]}>
          {isLoading ? 'Loading…' : `${total} ${total === 1 ? 'payment' : 'payments'}`}
        </Text>
        {isFetching && !isLoading && <ActivityIndicator size="small" color={COLORS.brand} />}
      </View>
    </View>
  );

  const Footer =
    total > 0 ? (
      <View style={styles.pager}>
        <Pressable
          onPress={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          style={[styles.pagerBtn, page <= 1 && styles.pagerBtnDisabled]}
        >
          <Feather name="chevron-left" size={16} color={page <= 1 ? C.mutedSoft : '#fff'} />
        </Pressable>
        <Text style={[styles.pagerText, { color: C.muted }]}>
          Page {page} of {totalPages}
        </Text>
        <Pressable
          onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          style={[styles.pagerBtn, page >= totalPages && styles.pagerBtnDisabled]}
        >
          <Feather
            name="chevron-right"
            size={16}
            color={page >= totalPages ? C.mutedSoft : '#fff'}
          />
        </Pressable>
      </View>
    ) : null;

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={rows}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={Header}
        ListFooterComponent={Footer}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <PaymentCard
            p={item}
            canVoid={canVoid}
            onVoid={() => setVoidTarget(item)}
            onView={() => setDetailTarget(item)}
            C={C}
          />
        )}
        ListEmptyComponent={
          !isLoading && (
            <View style={styles.empty}>
              <Feather
                name={error ? 'alert-circle' : 'inbox'}
                size={36}
                color={error ? COLORS.red : C.mutedSoft}
              />
              <Text style={[styles.emptyText, { color: C.muted }]}>
                {error
                  ? error?.response?.data?.message || error?.message || 'Failed to load'
                  : 'No payments found'}
              </Text>
            </View>
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={refetch}
            tintColor={COLORS.brand}
          />
        }
      />

      <SmallActionModal
        open={!!voidTarget}
        title="Void Payment"
        subtitle={
          voidTarget
            ? `Void receipt ${voidTarget.receiptNumber} (${formatMoney(voidTarget.amount)})?`
            : ''
        }
        submitLabel="Void"
        submitTone="danger"
        isPending={voidMut.isPending}
        fields={[
          {
            key: 'reason',
            label: 'Reason',
            required: true,
            placeholder: 'e.g. duplicate / wrong amount',
          },
        ]}
        onClose={() => setVoidTarget(null)}
        onSubmit={(vals) => voidMut.mutate({ reason: vals.reason.trim() })}
      />

      <PaymentDetailModal
        open={!!detailTarget}
        payment={detailTarget}
        onClose={() => setDetailTarget(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: { padding: 14, paddingBottom: 32 },

  toggleFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionBtnText: { fontWeight: '700', fontSize: 13 },

  filtersCard: { borderRadius: 14, padding: 12, borderWidth: 1, gap: 10 },
  label: { fontSize: 10, letterSpacing: 1.1, fontWeight: '700', marginBottom: 4 },
  input: {
    height: 40,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  row2: { flexDirection: 'row', gap: 10 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: 220,
  },
  chipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText: { fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#fff' },

  resultBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  resultText: { fontSize: 12, fontWeight: '600' },

  card: { borderRadius: 14, padding: 12, gap: 10, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  receipt: { fontSize: 14, fontWeight: '800' },
  meta: { fontSize: 11, marginTop: 2 },
  amount: { fontSize: 16, fontWeight: '800' },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  pillText: { fontSize: 10, fontWeight: '800' },

  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerText: { fontSize: 11, fontWeight: '600', flex: 1 },
  voidBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 999,
    backgroundColor: '#fee2e2',
  },
  voidBtnText: { color: '#991b1b', fontSize: 11, fontWeight: '800' },

  voidBox: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  voidReasonText: { color: '#991b1b', fontSize: 11, fontWeight: '700' },

  empty: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyText: { fontSize: 14 },

  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 18,
  },
  pagerBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pagerBtnDisabled: { backgroundColor: '#e5e7eb' },
  pagerText: { fontSize: 13, fontWeight: '600' },
});
