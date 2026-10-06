import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useUserStore } from '../../store/userStore';
import { useBranchesDropdown } from '../../hooks/useBranchProfilesList';
import {
  useDeactivateStructure,
  useStaffDropdown,
  useStructuresList,
  useActiveStructure,
} from '../../hooks/useStaffSalary';
import {
  formatDate,
  formatMoney,
} from '../../constants/staffSalary';
import { hasAnyAction, resolveScope } from '../../utils/permissions';
import { useColors } from '../../theme/useColors';
import { COLORS } from '../../theme/colors';
import StructureFormModal from './StructureFormModal';

function StructureRow({ item, canUpdate, canDelete, onEdit, onDeactivate, C }) {
  const staff = item.staffId || {};
  const name = staff?.userId?.name || staff?.user?.name || staff?.name || '—';
  const ref = staff?.serialNumber || staff?.employeeId;

  return (
    <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.name, { color: C.text }]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.meta, { color: C.muted }]} numberOfLines={1}>
            {ref || '—'}
          </Text>
        </View>
        <View
          style={[
            styles.pill,
            {
              backgroundColor: item.isActive ? '#dcfce7' : '#f3f4f6',
            },
          ]}
        >
          <Text
            style={[
              styles.pillText,
              { color: item.isActive ? '#166534' : '#374151' },
            ]}
          >
            {item.isActive ? 'Active' : 'Closed'}
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <Stat label="Basic" value={formatMoney(item.basicSalary, item.currency)} C={C} />
        <Stat
          label="Allowances"
          value={`${(item.allowances || []).length}`}
          C={C}
        />
        <Stat
          label="Deductions"
          value={`${(item.deductions || []).length}`}
          C={C}
        />
      </View>

      <View style={[styles.metaRow, { borderTopColor: C.border }]}>
        <Text style={[styles.metaLabel, { color: C.mutedSoft }]}>EFFECTIVE</Text>
        <Text style={[styles.metaValue, { color: C.text }]} numberOfLines={1}>
          {formatDate(item.effectiveFrom)}
          {item.effectiveTo ? ` → ${formatDate(item.effectiveTo)}` : ' → present'}
        </Text>
      </View>

      {item.isActive && (canUpdate || canDelete) && (
        <View style={styles.actionsRow}>
          {canUpdate && (
            <Pressable
              onPress={() => onEdit(item)}
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: COLORS.brand },
                pressed && { opacity: 0.9 },
              ]}
            >
              <Feather name="edit-2" size={14} color="#fff" />
              <Text style={styles.actionBtnText}>Edit</Text>
            </Pressable>
          )}
          {canDelete && (
            <Pressable
              onPress={() => onDeactivate(item)}
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: '#b91c1c' },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Feather name="x-circle" size={14} color="#fff" />
              <Text style={styles.actionBtnText}>Deactivate</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

function Stat({ label, value, C }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statLabel, { color: C.mutedSoft }]}>
        {label.toUpperCase()}
      </Text>
      <Text style={[styles.statValue, { color: C.text }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export default function StructuresPanel() {
  const C = useColors();
  const { user } = useUserStore();

  const scope = resolveScope(user?.role, 'view-staff-salary');
  const isOrgLevel = scope === 'all';
  const isOwnOnly = scope === 'own';

  const canCreate =
    !isOwnOnly &&
    hasAnyAction(user?.role, ['create-staff-salary', 'create-all-branch-staff-salary']);
  const canUpdate =
    !isOwnOnly &&
    hasAnyAction(user?.role, ['update-staff-salary', 'update-all-branch-staff-salary']);
  const canDelete =
    !isOwnOnly &&
    hasAnyAction(user?.role, ['delete-staff-salary', 'delete-all-branch-staff-salary']);

  const userBranchId =
    (typeof user?.branchId === 'string' && user.branchId) ||
    user?.branchId?._id ||
    user?.branch?._id ||
    '';

  const [branchId, setBranchId] = useState(isOrgLevel ? '' : userBranchId);
  const [staffId, setStaffId] = useState('');
  const [isActive, setIsActive] = useState('true');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const { data: branchData } = useBranchesDropdown({ enabled: isOrgLevel });
  const branches = branchData?.data || [];
  const effectiveBranchId = isOrgLevel ? branchId : userBranchId;

  const { data: staffData } = useStaffDropdown({
    branchId: effectiveBranchId || undefined,
    enabled: !isOwnOnly,
  });
  const staffList = staffData?.data || [];

  // Own-scope users hit the per-staff active endpoint.
  const ownStaffStructure = useActiveStructure({
    staffId: user?.staffId,
    enabled: isOwnOnly && !!user?.staffId,
  });

  const listQuery = useStructuresList({
    page,
    limit,
    staffId: isOwnOnly ? undefined : staffId,
    branchId: isOwnOnly ? undefined : effectiveBranchId,
    isActive: isOwnOnly ? undefined : isActive,
    enabled: !isOwnOnly,
  });

  const deactivate = useDeactivateStructure();

  let rows = [];
  let total = 0;
  let isLoading = false;
  let isFetching = false;
  let refetch = () => {};
  let error = null;
  if (isOwnOnly) {
    // The hook resolves to the structure or null (none active) — never the envelope.
    const d = ownStaffStructure.data || null;
    rows = d ? (Array.isArray(d) ? d : [d]) : [];
    total = rows.length;
    isLoading = ownStaffStructure.isLoading;
    isFetching = ownStaffStructure.isFetching;
    refetch = ownStaffStructure.refetch;
    error = ownStaffStructure.error;
  } else {
    rows = listQuery.data?.data || [];
    total = listQuery.data?.total ?? rows.length;
    isLoading = listQuery.isLoading;
    isFetching = listQuery.isFetching;
    refetch = listQuery.refetch;
    error = listQuery.error;
  }

  const onDeactivate = (row) => {
    const name =
      row.staffId?.userId?.name || row.staffId?.user?.name || row.staffId?.name || 'this staff';
    Alert.alert(
      'Deactivate Salary Structure',
      `Deactivate the active structure for ${name}? It will no longer be used for new payslips.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: () => deactivate.mutate(row._id),
        },
      ],
    );
  };

  const Header = (
    <View style={{ gap: 12 }}>
      {!isOwnOnly && (
        <View style={[styles.filterCard, { backgroundColor: C.card, borderColor: C.border }]}>
          {isOrgLevel && (
            <View style={{ gap: 6 }}>
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

          <View style={{ gap: 6 }}>
            <Text style={[styles.label, { color: C.muted }]}>STATUS</Text>
            <View style={styles.chipRow}>
              {[
                { v: 'true', l: 'Active' },
                { v: 'false', l: 'Closed' },
                { v: '', l: 'All' },
              ].map((o) => {
                const active = isActive === o.v;
                return (
                  <Pressable
                    key={o.l}
                    onPress={() => setIsActive(o.v)}
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

          {staffList.length > 0 && (
            <View style={{ gap: 6 }}>
              <Text style={[styles.label, { color: C.muted }]}>STAFF</Text>
              <View style={styles.chipRow}>
                <Pressable
                  onPress={() => setStaffId('')}
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
                      onPress={() => setStaffId(s._id)}
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
      )}

      {canCreate && !isOwnOnly && (
        <Pressable
          onPress={() => setAddOpen(true)}
          style={({ pressed }) => [
            styles.primary,
            pressed && { opacity: 0.9 },
          ]}
        >
          <Feather name="plus" size={16} color="#fff" />
          <Text style={styles.primaryText}>New Structure</Text>
        </Pressable>
      )}

      <View style={styles.resultBar}>
        <Text style={[styles.resultText, { color: C.muted }]}>
          {isLoading ? 'Loading…' : `${total} ${total === 1 ? 'structure' : 'structures'}`}
        </Text>
        {isFetching && !isLoading && <ActivityIndicator size="small" color={COLORS.brand} />}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={rows}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={Header}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <StructureRow
            item={item}
            canUpdate={canUpdate}
            canDelete={canDelete}
            onEdit={(s) => setEditTarget(s)}
            onDeactivate={onDeactivate}
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
                  : 'No structures found'}
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

      <StructureFormModal open={addOpen} onClose={() => setAddOpen(false)} />
      <StructureFormModal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        structure={editTarget}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: { padding: 14, paddingBottom: 32 },

  filterCard: { borderRadius: 14, padding: 12, borderWidth: 1, gap: 10 },
  label: { fontSize: 10, letterSpacing: 1.1, fontWeight: '700' },

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

  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.brand,
  },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 14 },

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

  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  pillText: { fontSize: 10, fontWeight: '700' },

  statsRow: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1 },
  statLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1.1 },
  statValue: { fontSize: 13, fontWeight: '800', marginTop: 2 },

  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  metaLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1.1 },
  metaValue: { fontSize: 12, fontWeight: '700', flex: 1, textAlign: 'right' },

  actionsRow: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    borderRadius: 10,
  },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  empty: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyText: { fontSize: 14 },
});
