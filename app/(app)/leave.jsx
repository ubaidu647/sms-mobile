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
import { useColors } from '../../src/theme/useColors';
import { COLORS } from '../../src/theme/colors';
import { resolveScope, userBranchIdOf } from '../../src/utils/permissions';
import {
  LEAVE_STATUSES,
  canCancelLeave,
  canDecideLeave,
  sortPendingFirst,
  titleCase,
} from '../../src/utils/leave';
import {
  useApproveLeave,
  useCancelLeave,
  useLeaveRequests,
  useRejectLeave,
} from '../../src/hooks/useLeave';
import { useBranchesDropdown } from '../../src/hooks/useBranchProfilesList';
import LeaveRequestCard from '../../src/component/leave/LeaveRequestCard';
import LeaveDecisionModal from '../../src/component/leave/LeaveDecisionModal';
import LeaveFormModal from '../../src/component/leave/LeaveFormModal';
import ReportPager from '../../src/component/ReportPager';

const PAGE_SIZE = 20;

function ChipRow({ options, value, onChange, C }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chips}
    >
      {options.map((o) => {
        const active = value === o.value;
        return (
          <Pressable
            key={o.value || 'all'}
            onPress={() => onChange(o.value)}
            style={[
              styles.chip,
              { backgroundColor: C.card, borderColor: C.border },
              active && styles.chipActive,
            ]}
          >
            <Text style={[styles.chipText, { color: active ? '#fff' : C.text }]} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export default function LeaveScreen() {
  const C = useColors();
  const { user } = useUserStore();

  const viewScope = resolveScope(user?.role, 'view-leave');
  const approveScope = resolveScope(user?.role, 'approve-leave');
  const canView = viewScope === 'all' || viewScope === 'branch';
  const canApprove = approveScope === 'all' || approveScope === 'branch';
  const isOrgLevel = viewScope === 'all';
  const userBranchId = userBranchIdOf(user);

  const [applicantType, setApplicantType] = useState('');
  const [status, setStatus] = useState('');
  const [branchId, setBranchId] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [decision, setDecision] = useState(null); // { action, req }

  const { data: branchData } = useBranchesDropdown({ enabled: canView && isOrgLevel });
  const branches = branchData?.data || [];

  const filters = {
    applicantType,
    status,
    branchId: isOrgLevel ? branchId : undefined,
    page,
    limit: PAGE_SIZE,
  };
  const list = useLeaveRequests(filters, { enabled: canView });
  const rows = useMemo(() => sortPendingFirst(list.data?.data), [list.data]);

  const closeDecision = () => setDecision(null);
  const approve = useApproveLeave({ onSuccess: closeDecision });
  const reject = useRejectLeave({ onSuccess: closeDecision });
  const cancel = useCancelLeave({ onSuccess: closeDecision });
  const decisionPending = approve.isPending || reject.isPending || cancel.isPending;

  const resetPage = (fn) => (v) => {
    fn(v);
    setPage(1);
  };

  if (!canView) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: C.bg }]}>
        <Feather name="lock" size={36} color={COLORS.red} />
        <Text style={[styles.title, { color: C.text }]}>No access</Text>
        <Text style={[styles.sub, { color: C.muted, textAlign: 'center' }]}>
          You don't have permission to view leave requests.
        </Text>
      </View>
    );
  }

  const submitDecision = (note) => {
    if (!decision) return;
    const vars = { id: decision.req._id, note };
    if (decision.action === 'approve') approve.mutate(vars);
    else if (decision.action === 'reject') reject.mutate(vars);
    else cancel.mutate(vars);
  };

  const actionsFor = (req) => {
    if (!canApprove) return [];
    const out = [];
    if (canDecideLeave(req)) {
      out.push({
        key: 'approve',
        label: 'Approve',
        icon: 'check',
        color: '#16a34a',
        onPress: () => setDecision({ action: 'approve', req }),
      });
      out.push({
        key: 'reject',
        label: 'Reject',
        icon: 'x',
        color: '#dc2626',
        onPress: () => setDecision({ action: 'reject', req }),
      });
    }
    if (canCancelLeave(req)) {
      out.push({
        key: 'cancel',
        label: 'Cancel',
        icon: 'slash',
        color: '#6b7280',
        onPress: () => setDecision({ action: 'cancel', req }),
      });
    }
    return out;
  };

  const pendingOnPage = rows.filter((r) => r.status === 'pending').length;

  return (
    <View style={[styles.root, { backgroundColor: C.bg }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={list.isRefetching && !list.isLoading}
            onRefresh={() => list.refetch()}
            tintColor={COLORS.brand}
          />
        }
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: C.text }]}>Leave</Text>
            <Text style={[styles.sub, { color: C.muted }]}>
              Review staff and student leave requests
            </Text>
          </View>
          {canApprove && (
            <Pressable
              onPress={() => setFormOpen(true)}
              style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
            >
              <Feather name="plus" size={16} color="#fff" />
              <Text style={styles.primaryBtnText}>New</Text>
            </Pressable>
          )}
        </View>

        <View style={[styles.filters, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[styles.label, { color: C.muted }]}>APPLICANT</Text>
          <ChipRow
            options={[
              { value: '', label: 'All' },
              { value: 'staff', label: 'Staff' },
              { value: 'student', label: 'Students' },
            ]}
            value={applicantType}
            onChange={resetPage(setApplicantType)}
            C={C}
          />
          <Text style={[styles.label, { color: C.muted }]}>STATUS</Text>
          <ChipRow
            options={[
              { value: '', label: 'All' },
              ...LEAVE_STATUSES.map((s) => ({ value: s, label: titleCase(s) })),
            ]}
            value={status}
            onChange={resetPage(setStatus)}
            C={C}
          />
          {isOrgLevel && branches.length > 0 && (
            <>
              <Text style={[styles.label, { color: C.muted }]}>BRANCH</Text>
              <ChipRow
                options={[
                  { value: '', label: 'All branches' },
                  ...branches.map((b) => ({ value: b._id, label: b.name })),
                ]}
                value={branchId}
                onChange={resetPage(setBranchId)}
                C={C}
              />
            </>
          )}
        </View>

        {pendingOnPage > 0 && status !== 'pending' && (
          <View style={styles.pendingNote}>
            <Feather name="clock" size={13} color="#92400e" />
            <Text style={styles.pendingNoteText}>
              {pendingOnPage} pending on this page — shown first
            </Text>
          </View>
        )}

        {list.isLoading ? (
          <ActivityIndicator size="large" color={COLORS.brand} style={{ marginTop: 24 }} />
        ) : list.error ? (
          <View style={[styles.empty, { backgroundColor: C.card, borderColor: C.border }]}>
            <Feather name="alert-circle" size={26} color={COLORS.red} />
            <Text style={[styles.emptyText, { color: C.muted }]}>
              {list.error?.response?.data?.message || 'Could not load leave requests.'}
            </Text>
          </View>
        ) : rows.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: C.card, borderColor: C.border }]}>
            <Feather name="calendar" size={26} color={C.mutedSoft} />
            <Text style={[styles.emptyText, { color: C.muted }]}>No leave requests found.</Text>
          </View>
        ) : (
          <>
            {rows.map((req) => (
              <LeaveRequestCard
                key={req._id}
                req={req}
                C={C}
                showApplicant
                actions={actionsFor(req)}
              />
            ))}
            <ReportPager
              page={page}
              limit={PAGE_SIZE}
              shown={rows.length}
              total={list.data?.total}
              onPage={setPage}
              C={C}
              noun="requests"
            />
          </>
        )}
      </ScrollView>

      <LeaveDecisionModal
        action={decision?.action}
        req={decision?.req}
        pending={decisionPending}
        onClose={closeDecision}
        onSubmit={submitDecision}
        C={C}
      />
      <LeaveFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        mode="manage"
        canApprove={canApprove}
        branchId={approveScope === 'all' ? branchId || undefined : userBranchId || undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  content: { padding: 14, gap: 12, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 24, fontWeight: '800' },
  sub: { fontSize: 13, marginTop: 4 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.brand,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 10,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  filters: { borderRadius: 14, borderWidth: 1, padding: 12, gap: 6 },
  label: { fontSize: 10, letterSpacing: 1.1, fontWeight: '700', marginTop: 2 },
  chips: { gap: 8, paddingVertical: 2 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  chipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText: { fontSize: 12, fontWeight: '700' },
  pendingNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  pendingNoteText: { color: '#92400e', fontSize: 12, fontWeight: '700' },
  empty: {
    borderRadius: 14,
    paddingVertical: 32,
    paddingHorizontal: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: { fontSize: 13, textAlign: 'center' },
});
