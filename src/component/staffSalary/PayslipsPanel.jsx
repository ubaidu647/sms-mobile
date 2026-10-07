import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useUserStore } from '../../store/userStore';
import { useBranchesDropdown } from '../../hooks/useBranchProfilesList';
import {
  usePayslipsList,
  useStaffDropdown,
} from '../../hooks/useStaffSalary';
import {
  PAYSLIP_STATUSES,
  PAYSLIP_STATUS_PILL,
  currentMonth,
  formatMonth,
  formatMoney,
} from '../../constants/staffSalary';
import { hasAnyAction, resolveScope } from '../../utils/permissions';
import { useColors } from '../../theme/useColors';
import { COLORS } from '../../theme/colors';
import GeneratePayslipModal from './GeneratePayslipModal';
import BulkPayrollModal from './BulkPayrollModal';

function PayslipRow({ item, onTap, C }) {
  const staff = item.staffId || {};
  const name = staff?.userId?.name || staff?.user?.name || staff?.name || '—';
  const ref = staff?.serialNumber || staff?.employeeId;
  const cfg = PAYSLIP_STATUS_PILL[item.status] || PAYSLIP_STATUS_PILL.draft;

  return (
    <Pressable
      onPress={onTap}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: C.card, borderColor: C.border },
        pressed && { opacity: 0.92 },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.name, { color: C.text }]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.meta, { color: C.muted }]} numberOfLines={1}>
            {ref || '—'} · {formatMonth(item.month)}
            {item.serialNumber ? ` · ${item.serialNumber}` : ''}
          </Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.statusPillText, { color: cfg.fg }]}>{cfg.label}</Text>
        </View>
      </View>

      <View style={[styles.amountsRow, { borderTopColor: C.border }]}>
        <View style={styles.amountBlock}>
          <Text style={[styles.amountLabel, { color: C.mutedSoft }]}>GROSS</Text>
          <Text style={[styles.amountValue, { color: C.text }]} numberOfLines={1}>
            {formatMoney(item.gross, item.currency)}
          </Text>
        </View>
        <View style={[styles.amountBlock, { alignItems: 'flex-end' }]}>
          <Text style={[styles.amountLabel, { color: C.mutedSoft }]}>NET</Text>
          <Text style={[styles.amountValueNet, { color: COLORS.brand }]} numberOfLines={1}>
            {formatMoney(item.netSalary, item.currency)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function PayslipsPanel() {
  const C = useColors();
  const router = useRouter();
  const { user } = useUserStore();

  const scope = resolveScope(user?.role, 'view-payslip');
  const isOrgLevel = scope === 'all';
  const isOwnOnly = scope === 'own';

  const canGenerate = hasAnyAction(user?.role, [
    'generate-payslip',
    'generate-all-branch-payslip',
  ]);

  const userBranchId =
    (typeof user?.branchId === 'string' && user.branchId) ||
    user?.branchId?._id ||
    user?.branch?._id ||
    '';

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [staffId, setStaffId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [month, setMonth] = useState(currentMonth());
  const [status, setStatus] = useState('');

  const [genOpen, setGenOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  const { data: branchData } = useBranchesDropdown({ enabled: isOrgLevel });
  const branches = branchData?.data || [];
  const effectiveBranchId = isOrgLevel ? branchId : userBranchId;

  const { data: staffData } = useStaffDropdown({
    branchId: effectiveBranchId || undefined,
    enabled: !isOwnOnly,
  });
  const staffList = staffData?.data || [];

  // Own-scope: server pins payslips to the caller, don't pass branch/staff filters.
  const { data, isLoading, isFetching, refetch, error } = usePayslipsList({
    page,
    limit,
    staffId: isOwnOnly ? undefined : staffId,
    branchId: isOwnOnly ? undefined : effectiveBranchId,
    month,
    status,
  });

  const rows = data?.data || [];
  const total = data?.total ?? rows.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // A delete can shrink the list; don't strand the user on a page past the end.
  useEffect(() => {
    if (data && page > totalPages) setPage(totalPages);
  }, [data, page, totalPages]);

  const openDetail = (p) => router.push(`/(app)/staff-salary/payslip/${p._id}`);

  const Header = (
    <View style={{ gap: 12 }}>
      <View style={[styles.filterCard, { backgroundColor: C.card, borderColor: C.border }]}>
        <View style={{ gap: 6 }}>
          <Text style={[styles.label, { color: C.muted }]}>MONTH (YYYY-MM)</Text>
          <View style={[styles.fieldRow, { backgroundColor: C.bg, borderColor: C.border }]}>
            <Feather name="calendar" size={14} color={COLORS.brand} />
            <TextInput
              value={month}
              onChangeText={(v) => {
                setMonth(v);
                setPage(1);
              }}
              placeholder="2026-06"
              placeholderTextColor={C.mutedSoft}
              style={[styles.fieldInput, { color: C.text }]}
              keyboardType="numbers-and-punctuation"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        <View style={{ gap: 6 }}>
          <Text style={[styles.label, { color: C.muted }]}>STATUS</Text>
          <View style={styles.chipRow}>
            <Pressable
              onPress={() => {
                setStatus('');
                setPage(1);
              }}
              style={({ pressed }) => [
                styles.chip,
                { backgroundColor: C.bg, borderColor: C.border },
                !status && styles.chipActive,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: C.text },
                  !status && styles.chipTextActive,
                ]}
              >
                All
              </Text>
            </Pressable>
            {PAYSLIP_STATUSES.map((s) => {
              const active = status === s;
              const cfg = PAYSLIP_STATUS_PILL[s];
              return (
                <Pressable
                  key={s}
                  onPress={() => {
                    setStatus(s);
                    setPage(1);
                  }}
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
                    {cfg.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {isOrgLevel && branches.length > 0 && (
          <View style={{ gap: 6 }}>
            <Text style={[styles.label, { color: C.muted }]}>BRANCH</Text>
            <View style={styles.chipRow}>
              <Pressable
                onPress={() => {
                  setBranchId('');
                  setPage(1);
                }}
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
                    onPress={() => {
                      setBranchId(b._id);
                      setPage(1);
                    }}
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

        {!isOwnOnly && staffList.length > 0 && (
          <View style={{ gap: 6 }}>
            <Text style={[styles.label, { color: C.muted }]}>STAFF</Text>
            <View style={styles.chipRow}>
              <Pressable
                onPress={() => {
                  setStaffId('');
                  setPage(1);
                }}
                style={({ pressed }) => [
                  styles.chip,
                  { backgroundColor: C.bg, borderColor: C.border },
                  !staffId && styles.chipActive,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: C.text },
                    !staffId && styles.chipTextActive,
                  ]}
                >
                  All
                </Text>
              </Pressable>
              {staffList.slice(0, 30).map((s) => {
                const active = staffId === s._id;
                const name = s.user?.name || s.userId?.name || s.name || '?';
                return (
                  <Pressable
                    key={s._id}
                    onPress={() => {
                      setStaffId(s._id);
                      setPage(1);
                    }}
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
                      numberOfLines={1}
                    >
                      {name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </View>

      {canGenerate && !isOwnOnly && (
        <View style={styles.actionRow}>
          <Pressable
            onPress={() => setGenOpen(true)}
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: C.card, borderColor: C.border },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Feather name="plus" size={16} color={C.text} />
            <Text style={[styles.actionBtnText, { color: C.text }]}>Generate</Text>
          </Pressable>
          <Pressable
            onPress={() => setBulkOpen(true)}
            style={({ pressed }) => [
              styles.actionBtnPrimary,
              pressed && { opacity: 0.9 },
            ]}
          >
            <Feather name="layers" size={16} color="#fff" />
            <Text style={styles.actionBtnPrimaryText}>Run Bulk</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.resultBar}>
        <Text style={[styles.resultText, { color: C.muted }]}>
          {isLoading ? 'Loading…' : `${total} ${total === 1 ? 'payslip' : 'payslips'}`}
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
          <PayslipRow item={item} onTap={() => openDetail(item)} C={C} />
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
                  : 'No payslips found'}
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

      <GeneratePayslipModal open={genOpen} onClose={() => setGenOpen(false)} />
      <BulkPayrollModal open={bulkOpen} onClose={() => setBulkOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: { padding: 14, paddingBottom: 32 },

  filterCard: { borderRadius: 14, padding: 12, borderWidth: 1, gap: 10 },
  label: { fontSize: 10, letterSpacing: 1.1, fontWeight: '700' },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
  },
  fieldInput: { flex: 1, fontSize: 14, fontWeight: '600' },

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

  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionBtnText: { fontWeight: '700', fontSize: 13 },
  actionBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 42,
    borderRadius: 10,
    backgroundColor: COLORS.brand,
  },
  actionBtnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  resultBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
    marginBottom: 2,
  },
  resultText: { fontSize: 12, fontWeight: '600' },

  card: { borderRadius: 14, padding: 12, gap: 10, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontSize: 15, fontWeight: '700' },
  meta: { fontSize: 11, marginTop: 2 },

  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusPillText: { fontSize: 10, fontWeight: '800' },

  amountsRow: {
    flexDirection: 'row',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  amountBlock: { flex: 1, gap: 2 },
  amountLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1.1 },
  amountValue: { fontSize: 13, fontWeight: '700' },
  amountValueNet: { fontSize: 16, fontWeight: '800' },

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
