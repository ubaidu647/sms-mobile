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
import {
  useClassList,
  useToggleClassStatus,
} from '../../src/hooks/useClasses';
import { useBranchesDropdown } from '../../src/hooks/useBranchProfilesList';
import { useUserStore } from '../../src/store/userStore';
import { useColors } from '../../src/theme/useColors';
import { COLORS } from '../../src/theme/colors';
import {
  GRADES,
  CLASS_TYPES,
  MEDIUMS,
  TYPE_PILL,
  MEDIUM_PILL,
  GRADE_PILL_BG,
  GRADE_PILL_FG,
  STATUS_PILL,
  titleCase,
  currentAcademicYear,
} from '../../src/constants/classes';
import { hasAnyAction } from '../../src/utils/permissions';
import AddClassModal from '../../src/component/AddClassModal';
import EditClassModal from '../../src/component/EditClassModal';
import SectionsModal from '../../src/component/SectionsModal';
import ClassActionsSheet from '../../src/component/ClassActionsSheet';

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

function ClassRow({ item, onTap, onMenu, C }) {
  const typeP = TYPE_PILL[item.classType] || { bg: C.border, fg: C.text };
  const medP = MEDIUM_PILL[item.medium] || { bg: C.border, fg: C.text };
  const statusP = item.isActive ? STATUS_PILL.active : STATUS_PILL.inactive;
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
        <View style={styles.gradeBadge}>
          <Text style={styles.gradeBadgeText}>
            {item.grade?.toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.name, { color: C.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          {!!item.serialNumber && (
            <Text style={[styles.serial, { color: C.mutedSoft }]}>
              {item.serialNumber}
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
        <View style={[styles.pill, { backgroundColor: typeP.bg }]}>
          <Text style={[styles.pillText, { color: typeP.fg }]}>
            {titleCase(item.classType)}
          </Text>
        </View>
        <View style={[styles.pill, { backgroundColor: medP.bg }]}>
          <Text style={[styles.pillText, { color: medP.fg }]}>
            {titleCase(item.medium)}
          </Text>
        </View>
        <View style={[styles.pill, { backgroundColor: statusP.bg }]}>
          <Text style={[styles.pillText, { color: statusP.fg }]}>
            {statusP.label}
          </Text>
        </View>
      </View>

      <View style={[styles.metaGrid, { borderTopColor: C.border }]}>
        <MetaCell label="Year" value={item.academicYear} C={C} />
        <MetaCell label="Sections" value={item.sectionCount ?? 0} C={C} />
        <MetaCell label="Capacity" value={item.totalCapacity ?? '—'} C={C} />
        <MetaCell label="Branch" value={item.branch?.name} C={C} />
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

export default function ClassesScreen() {
  const router = useRouter();
  const C = useColors();
  const { user } = useUserStore();

  const isAdmin = !!user?.role?.isPredefined;
  const canCreate =
    isAdmin || hasAnyAction(user?.role, ['create-class', 'create-all-branch-class']);
  const canUpdate =
    isAdmin || hasAnyAction(user?.role, ['update-class', 'update-all-branch-class']);
  const canToggle =
    isAdmin || hasAnyAction(user?.role, ['delete-class', 'delete-all-branch-class']);
  const canCreateAllBranch =
    isAdmin || hasAnyAction(user?.role, ['create-all-branch-class']);
  const isOrgLevel =
    isAdmin || hasAnyAction(user?.role, ['view-all-branch-class']);

  const userBranchId =
    typeof user?.branchId === 'string'
      ? user.branchId
      : user?.branchId?._id || null;

  const defaultYear = currentAcademicYear();

  // Drafts
  const [draftGrade, setDraftGrade] = useState('');
  const [draftType, setDraftType] = useState('');
  const [draftMedium, setDraftMedium] = useState('');
  const [draftYear, setDraftYear] = useState(defaultYear);
  const [draftBranchId, setDraftBranchId] = useState('');
  const [draftActive, setDraftActive] = useState('true');

  // Applied
  const [filters, setFilters] = useState({
    academicYear: defaultYear,
    isActive: 'true',
  });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [showFilters, setShowFilters] = useState(false);

  // Modals
  const [addOpen, setAddOpen] = useState(false);
  const [editClass, setEditClass] = useState(null);
  const [sectionsClass, setSectionsClass] = useState(null);
  const [actionsFor, setActionsFor] = useState(null);

  const { data: branchesData } = useBranchesDropdown({ enabled: isOrgLevel });
  const branches = branchesData?.data || [];

  const effectiveBranchId = isOrgLevel ? filters.branchId : userBranchId;

  const { data, isLoading, isFetching, refetch, error } = useClassList({
    page,
    limit,
    filters,
    branchId: effectiveBranchId,
  });

  const classes = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // A delete can shrink the list; don't strand the user on a page past the end.
  useEffect(() => {
    if (data && page > totalPages) setPage(totalPages);
  }, [data, page, totalPages]);

  const toggle = useToggleClassStatus({ onSuccess: () => setActionsFor(null) });

  const applyFilters = () => {
    setFilters({
      grade: draftGrade,
      classType: draftType,
      medium: draftMedium,
      academicYear: draftYear,
      branchId: draftBranchId,
      isActive: draftActive,
    });
    setPage(1);
    setShowFilters(false);
  };

  const clearFilters = () => {
    setDraftGrade('');
    setDraftType('');
    setDraftMedium('');
    setDraftYear(defaultYear);
    setDraftBranchId('');
    setDraftActive('true');
    setFilters({ academicYear: defaultYear, isActive: 'true' });
    setPage(1);
  };

  const openDetail = (cls) => router.push(`/(app)/classes/${cls._id}`);
  const openMenu = (cls) => setActionsFor(cls);
  const closeMenu = () => setActionsFor(null);

  const ListHeader = useMemo(
    () => (
      <View style={{ gap: 14 }}>
        <View>
          <Text style={[styles.title, { color: C.text }]}>Classes</Text>
          <Text style={[styles.subtitle, { color: C.muted }]}>
            Manage grades, sections, and academic-year capacity
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
            <Text style={[styles.actionBtnText, { color: C.text }]}>Filters</Text>
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
              <Text style={styles.actionBtnPrimaryText}>Add Class</Text>
            </Pressable>
          )}
        </View>

        {showFilters && (
          <View
            style={[
              styles.filtersCard,
              { backgroundColor: C.card, borderColor: C.border },
            ]}
          >
            <FilterInput
              value={draftYear}
              onChange={setDraftYear}
              placeholder="Academic Year (YYYY-YYYY)"
              onSubmit={applyFilters}
              C={C}
            />

            <Text style={[styles.filterLabel, { color: C.muted }]}>Grade</Text>
            <SelectChips
              value={draftGrade}
              options={GRADES.map((v) => ({ value: v, label: titleCase(v) }))}
              onChange={setDraftGrade}
              C={C}
            />

            <Text style={[styles.filterLabel, { color: C.muted }]}>Class Type</Text>
            <SelectChips
              value={draftType}
              options={CLASS_TYPES.map((v) => ({ value: v, label: titleCase(v) }))}
              onChange={setDraftType}
              C={C}
            />

            <Text style={[styles.filterLabel, { color: C.muted }]}>Medium</Text>
            <SelectChips
              value={draftMedium}
              options={MEDIUMS.map((v) => ({ value: v, label: titleCase(v) }))}
              onChange={setDraftMedium}
              C={C}
            />

            <Text style={[styles.filterLabel, { color: C.muted }]}>Status</Text>
            <SelectChips
              value={draftActive}
              options={[
                { value: 'true', label: 'Active' },
                { value: 'false', label: 'Inactive' },
              ]}
              onChange={setDraftActive}
              C={C}
            />

            {isOrgLevel && branches.length > 0 && (
              <>
                <Text style={[styles.filterLabel, { color: C.muted }]}>Branch</Text>
                <SelectChips
                  value={draftBranchId}
                  options={branches.map((b) => ({ value: b._id, label: b.name }))}
                  onChange={setDraftBranchId}
                  C={C}
                />
              </>
            )}

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
                <Text style={[styles.filterBtnGhostText, { color: C.text }]}>
                  Clear
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        <View style={styles.resultBar}>
          <Text style={[styles.resultText, { color: C.muted }]}>
            {isLoading ? 'Loading…' : `${total} ${total === 1 ? 'class' : 'classes'}`}
          </Text>
          {isFetching && !isLoading && (
            <ActivityIndicator size="small" color={COLORS.brand} />
          )}
        </View>
      </View>
    ),
    [
      C,
      showFilters,
      draftYear,
      draftGrade,
      draftType,
      draftMedium,
      draftActive,
      draftBranchId,
      branches,
      isOrgLevel,
      canCreate,
      isLoading,
      isFetching,
      total,
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

  return (
    <View style={[styles.safe, { backgroundColor: C.bg }]}>
      <FlatList
        data={classes}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={Footer}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <ClassRow
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
              <Text style={[styles.emptyText, { color: C.muted }]}>No classes found</Text>
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

      <AddClassModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        canCreateAllBranch={canCreateAllBranch}
        defaultBranchId={!canCreateAllBranch ? userBranchId : ''}
      />

      <EditClassModal
        open={!!editClass}
        cls={editClass}
        onClose={() => setEditClass(null)}
      />

      <SectionsModal
        open={!!sectionsClass}
        cls={sectionsClass}
        onClose={() => setSectionsClass(null)}
        canCreate={canCreate}
        canUpdate={canUpdate}
        canToggle={canToggle}
      />

      <ClassActionsSheet
        open={!!actionsFor}
        cls={actionsFor}
        onClose={closeMenu}
        canUpdate={canUpdate}
        canToggle={canToggle}
        toggling={toggle.isPending}
        onView={() => {
          const c = actionsFor;
          closeMenu();
          if (c) openDetail(c);
        }}
        onSections={() => {
          const c = actionsFor;
          closeMenu();
          if (c) setSectionsClass(c);
        }}
        onEdit={() => {
          const c = actionsFor;
          closeMenu();
          if (c) setEditClass(c);
        }}
        onToggle={() => {
          if (actionsFor) toggle.mutate(actionsFor._id);
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

  filtersCard: { borderRadius: 14, padding: 12, gap: 10, borderWidth: 1 },
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
  gradeBadge: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: GRADE_PILL_BG,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  gradeBadgeText: { color: GRADE_PILL_FG, fontSize: 13, fontWeight: '800' },
  name: { fontSize: 15, fontWeight: '700' },
  serial: { fontSize: 11, marginTop: 2 },
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
});
