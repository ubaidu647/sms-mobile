import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { hasAnyAction } from '../../src/utils/permissions';
import { LEAVE_STATUSES, canCancelOwnLeave, titleCase } from '../../src/utils/leave';
import { useCancelMyLeave, useMyLeaveBalance, useMyLeaveRequests } from '../../src/hooks/useLeave';
import LeaveBalanceCards from '../../src/component/leave/LeaveBalanceCards';
import LeaveRequestCard from '../../src/component/leave/LeaveRequestCard';
import LeaveFormModal from '../../src/component/leave/LeaveFormModal';
import ReportPager from '../../src/component/ReportPager';

const PAGE_SIZE = 20;

export default function MyLeaveScreen() {
  const C = useColors();
  const { user } = useUserStore();
  const canApply = hasAnyAction(user?.role, ['apply-own-leave']);

  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);

  const balance = useMyLeaveBalance({ enabled: canApply });
  const list = useMyLeaveRequests({ status, page, limit: PAGE_SIZE, enabled: canApply });
  const cancel = useCancelMyLeave();

  const rows = list.data?.data || [];

  if (!canApply) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: C.bg }]}>
        <Feather name="lock" size={36} color={COLORS.red} />
        <Text style={[styles.title, { color: C.text }]}>No access</Text>
        <Text style={[styles.sub, { color: C.muted, textAlign: 'center' }]}>
          You don't have permission to apply for leave.
        </Text>
      </View>
    );
  }

  const confirmCancel = (req) =>
    Alert.alert('Cancel this request?', 'It has not been decided yet.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Cancel request', style: 'destructive', onPress: () => cancel.mutate(req._id) },
    ]);

  const refresh = () => {
    balance.refetch();
    list.refetch();
  };

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: C.bg }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={list.isRefetching && !list.isLoading}
          onRefresh={refresh}
          tintColor={COLORS.brand}
        />
      }
    >
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: C.text }]}>My Leave</Text>
          <Text style={[styles.sub, { color: C.muted }]}>Your balance and leave requests</Text>
        </View>
        <Pressable
          onPress={() => setFormOpen(true)}
          style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
        >
          <Feather name="plus" size={16} color="#fff" />
          <Text style={styles.primaryBtnText}>Apply</Text>
        </Pressable>
      </View>

      <LeaveBalanceCards
        balance={balance.data}
        loading={balance.isLoading}
        error={balance.error}
        C={C}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {['', ...LEAVE_STATUSES].map((s) => {
          const active = status === s;
          return (
            <Pressable
              key={s || 'all'}
              onPress={() => {
                setStatus(s);
                setPage(1);
              }}
              style={[
                styles.chip,
                { backgroundColor: C.card, borderColor: C.border },
                active && styles.chipActive,
              ]}
            >
              <Text style={[styles.chipText, { color: active ? '#fff' : C.text }]}>
                {s ? titleCase(s) : 'All'}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {list.isLoading ? (
        <ActivityIndicator size="large" color={COLORS.brand} style={{ marginTop: 24 }} />
      ) : list.error ? (
        <View style={[styles.empty, { backgroundColor: C.card, borderColor: C.border }]}>
          <Feather name="alert-circle" size={26} color={COLORS.red} />
          <Text style={[styles.emptyText, { color: C.muted }]}>
            {list.error?.response?.data?.message || 'Could not load your leave requests.'}
          </Text>
        </View>
      ) : rows.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: C.card, borderColor: C.border }]}>
          <Feather name="calendar" size={26} color={C.mutedSoft} />
          <Text style={[styles.emptyText, { color: C.muted }]}>No leave requests yet.</Text>
        </View>
      ) : (
        <>
          {rows.map((req) => (
            <LeaveRequestCard
              key={req._id}
              req={req}
              C={C}
              actions={
                canCancelOwnLeave(req)
                  ? [
                      {
                        key: 'cancel',
                        label: 'Cancel',
                        icon: 'slash',
                        color: '#6b7280',
                        busy: cancel.isPending && cancel.variables === req._id,
                        onPress: () => confirmCancel(req),
                      },
                    ]
                  : []
              }
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

      <LeaveFormModal open={formOpen} onClose={() => setFormOpen(false)} mode="own" />
    </ScrollView>
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
  chips: { gap: 8, paddingVertical: 2 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  chipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText: { fontSize: 12, fontWeight: '700' },
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
