import { useEffect, useMemo, useState } from 'react';
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
import { useRolesList } from '../../src/hooks/useRoles';
import { useBranchesDropdown } from '../../src/hooks/useBranchProfilesList';
import { useUserStore } from '../../src/store/userStore';
import { useColors } from '../../src/theme/useColors';
import { COLORS } from '../../src/theme/colors';
import { hasAnyAction } from '../../src/utils/permissions';
import {
  AVAILABLE_MENUS,
  AVAILABLE_ACTIONS,
} from '../../src/constants/rolePermissions';
import AddRoleModal from '../../src/component/AddRoleModal';
import EditRoleModal from '../../src/component/EditRoleModal';
import RoleActionsSheet from '../../src/component/RoleActionsSheet';

const MENU_LABELS = Object.fromEntries(AVAILABLE_MENUS.map((m) => [m.key, m.label]));
const ACTION_LABELS = Object.fromEntries(AVAILABLE_ACTIONS.map((a) => [a.key, a.label]));

const ACTIVE_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Disabled' },
];

function FilterInput({ value, onChange, placeholder, onSubmit, C }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      onSubmitEditing={onSubmit}
      placeholder={placeholder}
      placeholderTextColor={C.mutedSoft}
      style={[
        styles.filterInput,
        { color: C.text, borderColor: C.border, backgroundColor: C.bg },
      ]}
    />
  );
}

function SelectChips({ value, options, onChange, allLabel = 'All', C }) {
  const all = [{ value: '', label: allLabel }, ...options];
  return (
    <View style={styles.chipRow}>
      {all.map((opt) => {
        const active = value === opt.value;
        return (
          <Pressable
            key={opt.value || '__all'}
            onPress={() => onChange(opt.value)}
            style={[
              styles.chip,
              { backgroundColor: C.bg, borderColor: C.border },
              active && styles.chipActive,
            ]}
          >
            <Text
              style={[
                styles.chipText,
                { color: C.muted },
                active && styles.chipTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function MultiChips({ values, options, onChange, C }) {
  const toggle = (k) =>
    onChange(values.includes(k) ? values.filter((v) => v !== k) : [...values, k]);
  return (
    <View style={styles.chipRow}>
      {options.map((opt) => {
        const active = values.includes(opt.key);
        return (
          <Pressable
            key={opt.key}
            onPress={() => toggle(opt.key)}
            style={[
              styles.chip,
              { backgroundColor: C.bg, borderColor: C.border },
              active && styles.chipActive,
            ]}
          >
            <Text
              style={[
                styles.chipText,
                { color: C.muted },
                active && styles.chipTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function RoleCard({ item, onTap, onMenu, C }) {
  const isPredefined = !!item.isPredefined;
  return (
    <Pressable
      onPress={onTap}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: C.card, borderColor: C.border },
        pressed && { opacity: 0.92 },
      ]}
    >
      <View style={styles.cardTop}>
        <View style={styles.roleIcon}>
          <Feather name="shield" size={18} color="#fff" />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.name, { color: C.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.meta, { color: C.muted }]} numberOfLines={1}>
            {item.branch?.name || '—'} · #{item.serialNumber || '—'}
          </Text>
        </View>
        <Pressable
          onPress={onMenu}
          hitSlop={10}
          style={({ pressed }) => [styles.menuBtn, pressed && { opacity: 0.6 }]}
        >
          <Feather name="more-vertical" size={18} color={C.muted} />
        </Pressable>
      </View>

      <View style={styles.pillRow}>
        <View
          style={[
            styles.pill,
            { backgroundColor: item.isActive ? '#dcfce7' : '#fee2e2' },
          ]}
        >
          <Text
            style={[
              styles.pillText,
              { color: item.isActive ? '#166534' : '#991b1b' },
            ]}
          >
            {item.isActive ? 'Active' : 'Disabled'}
          </Text>
        </View>
        <View
          style={[
            styles.pill,
            { backgroundColor: isPredefined ? '#dbeafe' : '#f3f4f6' },
          ]}
        >
          <Text
            style={[
              styles.pillText,
              { color: isPredefined ? '#1d4ed8' : '#374151' },
            ]}
          >
            {isPredefined ? 'Predefined' : 'Custom'}
          </Text>
        </View>
        <View style={[styles.pill, { backgroundColor: '#eef2ff' }]}>
          <Text style={[styles.pillText, { color: '#3730a3' }]}>
            {item.actions?.length ?? 0} actions
          </Text>
        </View>
      </View>

      {item.menus?.length > 0 && (
        <View style={[styles.menuList, { borderTopColor: C.border }]}>
          <Text style={[styles.menuListLabel, { color: C.mutedSoft }]}>MENUS</Text>
          <View style={styles.chipWrap}>
            {item.menus.slice(0, 6).map((m) => (
              <View key={m} style={styles.menuTag}>
                <Text style={styles.menuTagText}>{MENU_LABELS[m] || m}</Text>
              </View>
            ))}
            {item.menus.length > 6 && (
              <View style={styles.menuTagMuted}>
                <Text style={styles.menuTagMutedText}>+{item.menus.length - 6} more</Text>
              </View>
            )}
          </View>
        </View>
      )}
    </Pressable>
  );
}

export default function RolesScreen() {
  const router = useRouter();
  const C = useColors();
  const { user } = useUserStore();

  const hasOrgAccess =
    !!user?.role?.isPredefined ||
    !!user?.role?.actions?.includes('view-all-branch-role');

  const canCreate = hasAnyAction(user?.role, [
    'create-role',
    'create-all-branch-role',
  ]);
  const canUpdateAny = hasAnyAction(user?.role, [
    'update-role',
    'update-all-branch-role',
  ]);
  const canDeleteAny = hasAnyAction(user?.role, [
    'delete-role',
    'delete-all-branch-role',
  ]);
  const canActOnAllBranches =
    !!user?.role?.isPredefined ||
    !!user?.role?.actions?.includes('delete-all-branch-role');

  const userBranchId =
    (typeof user?.branchId === 'string' && user.branchId) ||
    user?.branchId?._id ||
    user?.branch?._id ||
    null;

  // Draft filters (uncommitted)
  const [draftName, setDraftName] = useState('');
  const [draftSerial, setDraftSerial] = useState('');
  const [draftBranchName, setDraftBranchName] = useState('');
  const [draftBranchId, setDraftBranchId] = useState('');
  const [draftMenus, setDraftMenus] = useState([]);
  const [draftActions, setDraftActions] = useState([]);
  const [draftIsActive, setDraftIsActive] = useState('');
  const [draftFromDate, setDraftFromDate] = useState('');
  const [draftToDate, setDraftToDate] = useState('');

  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [showFilters, setShowFilters] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [editRole, setEditRole] = useState(null);
  const [actionsFor, setActionsFor] = useState(null);

  const { data: branchesData } = useBranchesDropdown({ enabled: hasOrgAccess });
  const branches = branchesData?.data || [];

  const effectiveBranchId = hasOrgAccess ? filters.branchId : userBranchId;

  const { data, isLoading, isFetching, refetch, error } = useRolesList({
    page,
    limit,
    filters,
    branchId: effectiveBranchId,
  });

  const roles = data?.data ?? [];
  const total = data?.total ?? roles.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // A delete can shrink the list; don't strand the user on a page past the end.
  useEffect(() => {
    if (data && page > totalPages) setPage(totalPages);
  }, [data, page, totalPages]);

  const applyFilters = () => {
    setFilters({
      name: draftName,
      serialNumber: draftSerial,
      branchName: hasOrgAccess ? draftBranchName : '',
      branchId: hasOrgAccess ? draftBranchId : '',
      menus: draftMenus,
      actions: draftActions,
      isActive: draftIsActive,
      fromDate: draftFromDate,
      toDate: draftToDate,
    });
    setPage(1);
    setShowFilters(false);
  };

  const clearFilters = () => {
    setDraftName('');
    setDraftSerial('');
    setDraftBranchName('');
    setDraftBranchId('');
    setDraftMenus([]);
    setDraftActions([]);
    setDraftIsActive('');
    setDraftFromDate('');
    setDraftToDate('');
    setFilters({});
    setPage(1);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    Object.values(filters || {}).forEach((v) => {
      if (Array.isArray(v) ? v.length > 0 : !!v) count += 1;
    });
    return count;
  }, [filters]);

  const openDetail = (role) => router.push(`/(app)/roles/${role._id}`);
  const openMenu = (role) => setActionsFor(role);
  const closeMenu = () => setActionsFor(null);

  const canActOnRow = (row) => {
    if (canActOnAllBranches) return true;
    const rowBranchId = row?.branch?._id;
    return userBranchId && rowBranchId && String(rowBranchId) === String(userBranchId);
  };

  const Header = (
    <View style={{ gap: 14 }}>
      <View>
        <Text style={[styles.title, { color: C.text }]}>Roles</Text>
        <Text style={[styles.subtitle, { color: C.muted }]}>
          Manage roles, menus, and permissions
        </Text>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => setShowFilters((v) => !v)}
          style={({ pressed }) => [
            styles.actionBtn,
            { backgroundColor: C.card, borderColor: C.border },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Feather name="filter" size={16} color={C.text} />
          <Text style={[styles.actionBtnText, { color: C.text }]}>
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </Text>
        </Pressable>

        {canCreate && (
          <Pressable
            onPress={() => setAddOpen(true)}
            style={({ pressed }) => [
              styles.actionBtnPrimary,
              pressed && { opacity: 0.9 },
            ]}
          >
            <Feather name="plus" size={16} color="#fff" />
            <Text style={styles.actionBtnPrimaryText}>Add Role</Text>
          </Pressable>
        )}
      </View>

      {showFilters && (
        <View style={[styles.filtersCard, { backgroundColor: C.card, borderColor: C.border }]}>
          <FilterInput
            value={draftName}
            onChange={setDraftName}
            placeholder="Role name"
            onSubmit={applyFilters}
            C={C}
          />
          <FilterInput
            value={draftSerial}
            onChange={setDraftSerial}
            placeholder="Serial number"
            onSubmit={applyFilters}
            C={C}
          />

          <Text style={[styles.filterLabel, { color: C.muted }]}>Status</Text>
          <SelectChips
            value={draftIsActive}
            options={ACTIVE_OPTIONS.filter((o) => o.value)}
            onChange={setDraftIsActive}
            allLabel="All"
            C={C}
          />

          {hasOrgAccess && branches.length > 0 && (
            <>
              <Text style={[styles.filterLabel, { color: C.muted }]}>Branch</Text>
              <SelectChips
                value={draftBranchId}
                options={branches.map((b) => ({ value: b._id, label: b.name }))}
                onChange={setDraftBranchId}
                C={C}
              />
              <FilterInput
                value={draftBranchName}
                onChange={setDraftBranchName}
                placeholder="Branch name contains…"
                onSubmit={applyFilters}
                C={C}
              />
            </>
          )}

          <Text style={[styles.filterLabel, { color: C.muted }]}>Menus</Text>
          <MultiChips
            values={draftMenus}
            options={AVAILABLE_MENUS}
            onChange={setDraftMenus}
            C={C}
          />

          <Text style={[styles.filterLabel, { color: C.muted }]}>Actions</Text>
          <MultiChips
            values={draftActions}
            options={AVAILABLE_ACTIONS.map((a) => ({
              key: a.key,
              label: `${ACTION_LABELS[a.key] || a.key} · ${MENU_LABELS[a.menu] || a.menu}`,
            }))}
            onChange={setDraftActions}
            C={C}
          />

          <FilterInput
            value={draftFromDate}
            onChange={setDraftFromDate}
            placeholder="From (YYYY-MM-DD)"
            onSubmit={applyFilters}
            C={C}
          />
          <FilterInput
            value={draftToDate}
            onChange={setDraftToDate}
            placeholder="To (YYYY-MM-DD)"
            onSubmit={applyFilters}
            C={C}
          />

          <View style={styles.filterBtnRow}>
            <Pressable onPress={applyFilters} style={[styles.filterBtn, styles.filterBtnPrimary]}>
              <Feather name="search" size={14} color="#fff" />
              <Text style={styles.filterBtnPrimaryText}>Search</Text>
            </Pressable>
            <Pressable
              onPress={clearFilters}
              style={[
                styles.filterBtn,
                styles.filterBtnGhost,
                { backgroundColor: C.bg, borderColor: C.border },
              ]}
            >
              <Feather name="x" size={14} color={C.text} />
              <Text style={[styles.filterBtnGhostText, { color: C.text }]}>Clear</Text>
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.resultBar}>
        <Text style={[styles.resultText, { color: C.muted }]}>
          {isLoading ? 'Loading…' : `${total} ${total === 1 ? 'role' : 'roles'}`}
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
    <View style={[styles.safe, { backgroundColor: C.bg }]}>
      <FlatList
        data={roles}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={Header}
        ListFooterComponent={Footer}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <RoleCard
            item={item}
            onTap={() => openDetail(item)}
            onMenu={() => openMenu(item)}
            C={C}
          />
        )}
        ListEmptyComponent={
          !isLoading &&
          (error ? (
            <View style={styles.empty}>
              <Feather name="alert-circle" size={36} color={COLORS.red} />
              <Text style={[styles.emptyText, { color: C.muted }]}>
                {error?.response?.data?.message || error?.message || 'Failed to load'}
              </Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <Feather name="inbox" size={36} color={C.mutedSoft} />
              <Text style={[styles.emptyText, { color: C.muted }]}>No roles found</Text>
            </View>
          ))
        }
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={refetch}
            tintColor={COLORS.brand}
          />
        }
      />

      <AddRoleModal open={addOpen} onClose={() => setAddOpen(false)} />

      <EditRoleModal
        open={!!editRole}
        role={editRole}
        onClose={() => setEditRole(null)}
      />

      <RoleActionsSheet
        open={!!actionsFor}
        role={actionsFor}
        canUpdate={canUpdateAny && (actionsFor ? canActOnRow(actionsFor) : false)}
        canDelete={canDeleteAny && (actionsFor ? canActOnRow(actionsFor) : false)}
        onClose={closeMenu}
        onView={() => {
          const r = actionsFor;
          closeMenu();
          if (r) openDetail(r);
        }}
        onEdit={() => {
          const r = actionsFor;
          closeMenu();
          if (r) setEditRole(r);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  listContent: { padding: 14, paddingBottom: 32 },

  title: { fontSize: 26, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 4, lineHeight: 18 },

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

  filtersCard: {
    borderRadius: 14,
    padding: 12,
    gap: 10,
    borderWidth: 1,
  },
  filterLabel: { fontSize: 11, fontWeight: '700', marginTop: 4 },
  filterInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText: { fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#fff' },

  filterBtnRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  filterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 10,
  },
  filterBtnPrimary: { backgroundColor: COLORS.brand },
  filterBtnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  filterBtnGhost: { borderWidth: 1 },
  filterBtnGhostText: { fontWeight: '700', fontSize: 13 },

  resultBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
    marginBottom: 4,
  },
  resultText: { fontSize: 12, fontWeight: '600' },

  card: { borderRadius: 14, padding: 12, gap: 10, borderWidth: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  roleIcon: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 15, fontWeight: '700' },
  meta: { fontSize: 12, marginTop: 2 },
  menuBtn: { padding: 6 },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  pillText: { fontSize: 10, fontWeight: '700' },

  menuList: {
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  menuListLabel: { fontSize: 10, letterSpacing: 1.1, fontWeight: '700' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  menuTag: {
    backgroundColor: '#ccfbf1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  menuTagText: { color: '#0f766e', fontWeight: '700', fontSize: 10 },
  menuTagMuted: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  menuTagMutedText: { color: '#6b7280', fontWeight: '700', fontSize: 10 },

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
