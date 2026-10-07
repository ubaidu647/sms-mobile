import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useStaffList } from '../../src/hooks/useStaff';
import { useBranchesDropdown } from '../../src/hooks/useBranchProfilesList';
import { useUserStore } from '../../src/store/userStore';
import { useColors } from '../../src/theme/useColors';
import { COLORS } from '../../src/theme/colors';
import {
  STAFF_TYPES,
  EMPLOYMENT_TYPES,
  GENDERS,
  ACTIVE_OPTIONS,
  STAFF_TYPE_PILL,
  EMPLOYMENT_PILL,
  STATUS_PILL,
  titleCase,
  fmtDate,
} from '../../src/constants/staff';
import {
  resolveScope,
  hasAnyAction,
} from '../../src/utils/permissions';
import AddStaffModal from '../../src/component/AddStaffModal';
import EditStaffModal from '../../src/component/EditStaffModal';
import StaffActionsSheet from '../../src/component/StaffActionsSheet';

function Pill({ value, dict, fallbackLabel }) {
  const C = useColors();
  const entry =
    typeof value === 'string'
      ? dict?.[value] || { bg: C.border, fg: C.text, label: titleCase(value) }
      : null;
  if (!value) return <Text style={{ color: C.mutedSoft }}>—</Text>;
  return (
    <View style={[styles.pill, { backgroundColor: entry.bg }]}>
      <Text style={[styles.pillText, { color: entry.fg }]}>
        {entry.label || fallbackLabel || titleCase(value)}
      </Text>
    </View>
  );
}

function FilterTextInput({ value, onChange, placeholder, onSubmit }) {
  const C = useColors();
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

function SelectChips({ value, options, onChange, allLabel = 'All' }) {
  const C = useColors();
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

function StaffRow({ item, onTap, onMenu, C }) {
  const u = item.user || {};
  const initial = (u.name?.[0] || '?').toUpperCase();
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
        {item.photo ? (
          <Image source={{ uri: item.photo }} style={styles.avatarImg} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.name, { color: C.text }]} numberOfLines={1}>
            {u.name || '—'}
          </Text>
          <Text style={[styles.meta, { color: C.muted }]} numberOfLines={1}>
            {item.designation || '—'}
          </Text>
          {!!u.email && (
            <Text style={[styles.metaSmall, { color: C.mutedSoft }]} numberOfLines={1}>
              {u.email}
            </Text>
          )}
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
        <Pill value={item.staffType} dict={STAFF_TYPE_PILL} />
        <Pill
          value={item.employmentType}
          dict={{ [item.employmentType]: { ...EMPLOYMENT_PILL, label: titleCase(item.employmentType) } }}
        />
        <Pill
          value={item.isActive ? 'active' : 'blocked'}
          dict={STATUS_PILL}
        />
      </View>

      <View style={[styles.metaGrid, { borderTopColor: C.border }]}>
        <MetaCell label="Serial" value={item.serialNumber} C={C} />
        <MetaCell label="Branch" value={item.branch?.name} C={C} />
        <MetaCell label="Role" value={item.role?.name} C={C} />
        <MetaCell label="Joined" value={fmtDate(item.joiningDate)} C={C} />
      </View>
    </Pressable>
  );
}

function MetaCell({ label, value, C }) {
  return (
    <View style={styles.metaCell}>
      <Text style={[styles.metaLabel, { color: C.mutedSoft }]}>
        {label.toUpperCase()}
      </Text>
      <Text style={[styles.metaValue, { color: C.text }]} numberOfLines={1}>
        {value || '—'}
      </Text>
    </View>
  );
}

export default function StaffScreen() {
  const router = useRouter();
  const C = useColors();
  const { user } = useUserStore();

  const scope = resolveScope(user?.role, 'view-staff');
  const isOrgLevel = scope === 'all';
  const isOwnOnly = scope === 'own';
  const canCreate =
    !isOwnOnly && hasAnyAction(user?.role, ['create-staff', 'create-all-branch-staff']);
  const canUpdate = resolveScope(user?.role, 'update-staff') !== 'none';
  const canDelete =
    !isOwnOnly && hasAnyAction(user?.role, ['delete-staff', 'delete-all-branch-staff']);

  const userBranchId =
    typeof user?.branchId === 'string'
      ? user.branchId
      : user?.branchId?._id || null;

  // Draft (uncommitted) filters
  const [draftName, setDraftName] = useState('');
  const [draftSerial, setDraftSerial] = useState('');
  const [draftDesignation, setDraftDesignation] = useState('');
  const [draftStaffType, setDraftStaffType] = useState('');
  const [draftEmploymentType, setDraftEmploymentType] = useState('');
  const [draftGender, setDraftGender] = useState('');
  const [draftIsActive, setDraftIsActive] = useState('true');
  const [draftBranchId, setDraftBranchId] = useState('');
  const [draftFromDate, setDraftFromDate] = useState('');
  const [draftToDate, setDraftToDate] = useState('');

  // Applied filters
  const [filters, setFilters] = useState({ isActive: 'true' });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [showFilters, setShowFilters] = useState(false);

  // Modals
  const [addOpen, setAddOpen] = useState(false);
  const [editStaff, setEditStaff] = useState(null);
  const [actionsFor, setActionsFor] = useState(null);

  const { data: branchesData } = useBranchesDropdown({ enabled: isOrgLevel });
  const branches = branchesData?.data || [];

  const effectiveBranchId = isOrgLevel ? filters.branchId : userBranchId;

  const { data, isLoading, isFetching, refetch, error } = useStaffList({
    page,
    limit,
    filters,
    branchId: effectiveBranchId,
    enabled: !isOwnOnly,
  });

  const staffList = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // A delete can shrink the list; don't strand the user on a page past the end.
  useEffect(() => {
    if (data && page > totalPages) setPage(totalPages);
  }, [data, page, totalPages]);

  const applyFilters = () => {
    setFilters({
      name: draftName,
      serialNumber: draftSerial,
      designation: draftDesignation,
      staffType: draftStaffType,
      employmentType: draftEmploymentType,
      gender: draftGender,
      isActive: draftIsActive,
      fromDate: draftFromDate,
      toDate: draftToDate,
      branchId: draftBranchId,
    });
    setPage(1);
    setShowFilters(false);
  };

  const clearFilters = () => {
    setDraftName('');
    setDraftSerial('');
    setDraftDesignation('');
    setDraftStaffType('');
    setDraftEmploymentType('');
    setDraftGender('');
    setDraftIsActive('true');
    setDraftBranchId('');
    setDraftFromDate('');
    setDraftToDate('');
    setFilters({ isActive: 'true' });
    setPage(1);
  };

  const openDetail = (staff) => router.push(`/(app)/staff/${staff._id}`);
  const openMenu = (staff) => setActionsFor(staff);
  const closeMenu = () => setActionsFor(null);

  const canActOnRow = (row) => {
    if (isOrgLevel) return true;
    const rowBranchId = row?.branch?._id;
    return userBranchId && rowBranchId && String(rowBranchId) === String(userBranchId);
  };

  const Header = useMemo(
    () => (
      <View style={{ gap: 14 }}>
        <View>
          <Text style={[styles.title, { color: C.text }]}>Staff</Text>
          <Text style={[styles.subtitle, { color: C.muted }]}>
            Manage staff accounts, roles, and access
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
              Filters{' '}
              {Object.values(filters).filter((v) => v && v !== 'true').length > 0
                ? `(${Object.values(filters).filter((v) => v && v !== 'true').length})`
                : ''}
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
              <Text style={styles.actionBtnPrimaryText}>Add Staff</Text>
            </Pressable>
          )}
        </View>

        {showFilters && !isOwnOnly && (
          <View style={[styles.filtersCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <FilterTextInput
              value={draftName}
              onChange={setDraftName}
              placeholder="Name"
              onSubmit={applyFilters}
            />
            <FilterTextInput
              value={draftSerial}
              onChange={setDraftSerial}
              placeholder="Serial Number"
              onSubmit={applyFilters}
            />
            <FilterTextInput
              value={draftDesignation}
              onChange={setDraftDesignation}
              placeholder="Designation"
              onSubmit={applyFilters}
            />

            <Text style={[styles.filterLabel, { color: C.muted }]}>Staff Type</Text>
            <SelectChips
              value={draftStaffType}
              options={STAFF_TYPES.map((v) => ({ value: v, label: titleCase(v) }))}
              onChange={setDraftStaffType}
            />

            <Text style={[styles.filterLabel, { color: C.muted }]}>Employment</Text>
            <SelectChips
              value={draftEmploymentType}
              options={EMPLOYMENT_TYPES.map((v) => ({ value: v, label: titleCase(v) }))}
              onChange={setDraftEmploymentType}
            />

            <Text style={[styles.filterLabel, { color: C.muted }]}>Gender</Text>
            <SelectChips
              value={draftGender}
              options={GENDERS.map((v) => ({ value: v, label: titleCase(v) }))}
              onChange={setDraftGender}
            />

            <Text style={[styles.filterLabel, { color: C.muted }]}>Status</Text>
            <SelectChips
              value={draftIsActive}
              options={ACTIVE_OPTIONS.filter((o) => o.value)}
              onChange={setDraftIsActive}
              allLabel="All"
            />

            {isOrgLevel && branches.length > 0 && (
              <>
                <Text style={[styles.filterLabel, { color: C.muted }]}>Branch</Text>
                <SelectChips
                  value={draftBranchId}
                  options={branches.map((b) => ({ value: b._id, label: b.name }))}
                  onChange={setDraftBranchId}
                />
              </>
            )}

            <FilterTextInput
              value={draftFromDate}
              onChange={setDraftFromDate}
              placeholder="From (YYYY-MM-DD)"
              onSubmit={applyFilters}
            />
            <FilterTextInput
              value={draftToDate}
              onChange={setDraftToDate}
              placeholder="To (YYYY-MM-DD)"
              onSubmit={applyFilters}
            />

            <View style={styles.filterBtnRow}>
              <Pressable
                onPress={applyFilters}
                style={[styles.filterBtn, styles.filterBtnPrimary]}
              >
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
            {isLoading ? 'Loading…' : `${total} ${total === 1 ? 'staff' : 'staff'}`}
          </Text>
          {isFetching && !isLoading && (
            <ActivityIndicator size="small" color={COLORS.brand} />
          )}
        </View>
      </View>
    ),
    [
      C,
      filters,
      showFilters,
      draftName,
      draftSerial,
      draftDesignation,
      draftStaffType,
      draftEmploymentType,
      draftGender,
      draftIsActive,
      draftBranchId,
      draftFromDate,
      draftToDate,
      branches,
      isLoading,
      isFetching,
      total,
      canCreate,
      isOwnOnly,
      isOrgLevel,
    ],
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

  if (isOwnOnly) {
    return (
      <View style={[styles.safe, { backgroundColor: C.bg }]}>
        <View style={styles.center}>
          <Feather name="user" size={36} color={COLORS.brand} />
          <Text style={[styles.title, { color: C.text }]}>My Profile</Text>
          <Text style={[styles.subtitle, { color: C.muted, textAlign: 'center' }]}>
            You can only view and edit your own profile.
          </Text>
          <Pressable
            onPress={() =>
              user?.staffId && router.push(`/(app)/staff/${user.staffId}`)
            }
            style={styles.viewSelfBtn}
          >
            <Text style={styles.viewSelfBtnText}>Open My Profile</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.safe, { backgroundColor: C.bg }]}>
      <FlatList
        data={staffList}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={Header}
        ListFooterComponent={Footer}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <StaffRow
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
              <Text style={[styles.emptyText, { color: C.muted }]}>No staff found</Text>
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

      <AddStaffModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        canCreateAllBranch={hasAnyAction(user?.role, ['create-all-branch-staff'])}
        userBranchId={userBranchId}
      />

      <EditStaffModal
        open={!!editStaff}
        staff={editStaff}
        onClose={() => setEditStaff(null)}
        isSelf={false}
      />

      <StaffActionsSheet
        open={!!actionsFor}
        staff={actionsFor}
        onClose={closeMenu}
        canUpdate={canUpdate && (actionsFor ? canActOnRow(actionsFor) : false)}
        canDelete={canDelete && (actionsFor ? canActOnRow(actionsFor) : false)}
        onView={() => {
          const s = actionsFor;
          closeMenu();
          if (s) openDetail(s);
        }}
        onEdit={() => {
          const s = actionsFor;
          closeMenu();
          if (s) setEditStaff(s);
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
  avatarImg: { width: 44, height: 44, borderRadius: 999, backgroundColor: '#e5e7eb' },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  name: { fontSize: 15, fontWeight: '700' },
  meta: { fontSize: 12, marginTop: 2 },
  metaSmall: { fontSize: 11, marginTop: 1 },
  menuBtn: { padding: 6 },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  pillText: { fontSize: 10, fontWeight: '700' },

  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  metaCell: { flexBasis: '50%', paddingVertical: 4 },
  metaLabel: { fontSize: 9, letterSpacing: 1.2, fontWeight: '700' },
  metaValue: { fontSize: 12, fontWeight: '600', marginTop: 2 },

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

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  viewSelfBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: COLORS.brand,
    borderRadius: 999,
    marginTop: 8,
  },
  viewSelfBtnText: { color: '#fff', fontWeight: '700' },
});
