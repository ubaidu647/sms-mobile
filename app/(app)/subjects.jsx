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
import { useSubjectsList, useClassesDropdown } from '../../src/hooks/useSubjects';
import { useBranchesDropdown } from '../../src/hooks/useBranchProfilesList';
import { useUserStore } from '../../src/store/userStore';
import { useColors } from '../../src/theme/useColors';
import { COLORS } from '../../src/theme/colors';
import { hasAnyAction, resolveScope } from '../../src/utils/permissions';
import {
  SUBJECT_CATEGORIES,
  SUBJECT_CATEGORY_PILL,
  SUBJECT_TYPES,
  SUBJECT_TYPE_PILL,
  titleCase,
} from '../../src/constants/subject';
import AddSubjectModal from '../../src/component/AddSubjectModal';
import EditSubjectModal from '../../src/component/EditSubjectModal';
import SubjectActionsSheet from '../../src/component/SubjectActionsSheet';

const ACTIVE_OPTIONS = [
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
  { value: '', label: 'All' },
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

function SubjectCard({ item, onTap, onMenu, C, showBranch }) {
  const typePill = SUBJECT_TYPE_PILL[item.subjectType];
  const catPill = SUBJECT_CATEGORY_PILL[item.category];
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
        <View style={styles.codeBlock}>
          <Text style={styles.codeText}>{item.code}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.name, { color: C.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.meta, { color: C.muted }]} numberOfLines={1}>
            {item.class?.name || '—'}
            {item.class?.grade ? ` · Gr ${item.class.grade}` : ''}
            {item.serialNumber ? ` · #${item.serialNumber}` : ''}
          </Text>
        </View>
        {onMenu && (
          <Pressable
            onPress={onMenu}
            hitSlop={10}
            style={({ pressed }) => [styles.menuBtn, pressed && { opacity: 0.6 }]}
          >
            <Feather name="more-vertical" size={18} color={C.muted} />
          </Pressable>
        )}
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
            {item.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
        {typePill && (
          <View style={[styles.pill, { backgroundColor: typePill.bg }]}>
            <Text style={[styles.pillText, { color: typePill.fg }]}>
              {titleCase(item.subjectType)}
            </Text>
          </View>
        )}
        {catPill && (
          <View style={[styles.pill, { backgroundColor: catPill.bg }]}>
            <Text style={[styles.pillText, { color: catPill.fg }]}>
              {titleCase(item.category)}
            </Text>
          </View>
        )}
        {showBranch && item.branch?.name && (
          <View style={[styles.pill, { backgroundColor: '#f3f4f6' }]}>
            <Text style={[styles.pillText, { color: '#374151' }]}>{item.branch.name}</Text>
          </View>
        )}
      </View>

      <View style={[styles.metaGrid, { borderTopColor: C.border }]}>
        <MetaCell label="Total" value={item.totalMarks} C={C} />
        <MetaCell label="Passing" value={item.passingMarks} C={C} />
        {item.creditHours != null && (
          <MetaCell label="Credit Hrs" value={item.creditHours} C={C} />
        )}
        {item.teacherInfo?.user?.name && (
          <MetaCell label="Teacher" value={item.teacherInfo.user.name} C={C} />
        )}
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
        {value ?? '—'}
      </Text>
    </View>
  );
}

export default function SubjectsScreen() {
  const router = useRouter();
  const C = useColors();
  const { user } = useUserStore();

  const scope = resolveScope(user?.role, 'view-subject');
  const isOwnOnly = scope === 'own';
  const isOrgLevel = scope === 'all';
  const canCreate =
    !isOwnOnly &&
    hasAnyAction(user?.role, ['create-subject', 'create-all-branch-subject']);
  const canUpdateAny =
    !isOwnOnly &&
    hasAnyAction(user?.role, ['update-subject', 'update-all-branch-subject']);
  const canToggleAny =
    !isOwnOnly &&
    hasAnyAction(user?.role, ['delete-subject', 'delete-all-branch-subject']);
  const canActOnAllBranches =
    !!user?.role?.isPredefined ||
    !!user?.role?.actions?.includes('delete-all-branch-subject') ||
    !!user?.role?.actions?.includes('update-all-branch-subject');

  const userBranchId =
    (typeof user?.branchId === 'string' && user.branchId) ||
    user?.branchId?._id ||
    user?.branch?._id ||
    null;

  // Draft filters
  const [draftSearch, setDraftSearch] = useState('');
  const [draftClassId, setDraftClassId] = useState('');
  const [draftSubjectType, setDraftSubjectType] = useState('');
  const [draftCategory, setDraftCategory] = useState('');
  const [draftAcademicYear, setDraftAcademicYear] = useState('');
  const [draftBranchId, setDraftBranchId] = useState('');
  const [draftIsActive, setDraftIsActive] = useState('true');

  // Applied
  const [filters, setFilters] = useState({ isActive: 'true' });
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [showFilters, setShowFilters] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [editSubject, setEditSubject] = useState(null);
  const [actionsFor, setActionsFor] = useState(null);

  // Dropdowns
  const { data: branchesData } = useBranchesDropdown({ enabled: isOrgLevel });
  const branches = branchesData?.data || [];

  const dropdownBranchId = isOrgLevel ? draftBranchId : userBranchId;
  const { data: classData } = useClassesDropdown({
    branchId: dropdownBranchId || undefined,
    academicYear: filters.academicYear || undefined,
  });
  const classes = classData?.data || [];

  const effectiveBranchId = isOrgLevel ? filters.branchId : userBranchId;

  const { data, isLoading, isFetching, refetch, error } = useSubjectsList({
    page,
    limit,
    filters,
    branchId: effectiveBranchId,
    ownScope: isOwnOnly,
    enabled: true,
  });

  const subjects = data?.data ?? [];
  const total = data?.total ?? subjects.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // A delete can shrink the list; don't strand the user on a page past the end.
  useEffect(() => {
    if (data && page > totalPages) setPage(totalPages);
  }, [data, page, totalPages]);

  const applyFilters = () => {
    setFilters({
      search: draftSearch,
      classId: draftClassId,
      subjectType: draftSubjectType,
      category: draftCategory,
      academicYear: draftAcademicYear,
      branchId: isOrgLevel ? draftBranchId : '',
      isActive: draftIsActive,
    });
    setPage(1);
    setShowFilters(false);
  };

  const clearFilters = () => {
    setDraftSearch('');
    setDraftClassId('');
    setDraftSubjectType('');
    setDraftCategory('');
    setDraftAcademicYear('');
    setDraftBranchId('');
    setDraftIsActive('true');
    setFilters({ isActive: 'true' });
    setPage(1);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    Object.entries(filters || {}).forEach(([k, v]) => {
      if (k === 'isActive' && v === 'true') return;
      if (Array.isArray(v) ? v.length > 0 : !!v) count += 1;
    });
    return count;
  }, [filters]);

  const openDetail = (sub) => router.push(`/(app)/subjects/${sub._id}`);
  const openMenu = (sub) => setActionsFor(sub);
  const closeMenu = () => setActionsFor(null);

  const canActOnRow = (row) => {
    if (canActOnAllBranches) return true;
    const rowBranchId = row?.branch?._id || row?.branchId;
    return userBranchId && rowBranchId && String(rowBranchId) === String(userBranchId);
  };

  const Header = (
    <View style={{ gap: 14 }}>
      <View>
        <Text style={[styles.title, { color: C.text }]}>
          {isOwnOnly ? 'My Subjects' : 'Subjects'}
        </Text>
        <Text style={[styles.subtitle, { color: C.muted }]}>
          {isOwnOnly
            ? 'Subjects assigned to you for teaching'
            : 'Manage subjects, codes, marks and teachers'}
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
            <Text style={styles.actionBtnPrimaryText}>Add Subject</Text>
          </Pressable>
        )}
      </View>

      {showFilters && (
        <View style={[styles.filtersCard, { backgroundColor: C.card, borderColor: C.border }]}>
          <FilterInput
            value={draftSearch}
            onChange={setDraftSearch}
            placeholder="Search by name or code"
            onSubmit={applyFilters}
            C={C}
          />
          <FilterInput
            value={draftAcademicYear}
            onChange={setDraftAcademicYear}
            placeholder="Academic year (e.g. 2025-2026)"
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

          {classes.length > 0 && (
            <>
              <Text style={[styles.filterLabel, { color: C.muted }]}>Class</Text>
              <SelectChips
                value={draftClassId}
                options={classes.map((c) => ({
                  value: c._id,
                  label: c.grade ? `${c.name} · Gr ${c.grade}` : c.name,
                }))}
                onChange={setDraftClassId}
                C={C}
              />
            </>
          )}

          <Text style={[styles.filterLabel, { color: C.muted }]}>Type</Text>
          <SelectChips
            value={draftSubjectType}
            options={SUBJECT_TYPES.map((t) => ({ value: t, label: titleCase(t) }))}
            onChange={setDraftSubjectType}
            C={C}
          />

          <Text style={[styles.filterLabel, { color: C.muted }]}>Category</Text>
          <SelectChips
            value={draftCategory}
            options={SUBJECT_CATEGORIES.map((c) => ({ value: c, label: titleCase(c) }))}
            onChange={setDraftCategory}
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
          {isLoading ? 'Loading…' : `${total} ${total === 1 ? 'subject' : 'subjects'}`}
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
        data={subjects}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={Header}
        ListFooterComponent={Footer}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <SubjectCard
            item={item}
            onTap={() => openDetail(item)}
            onMenu={!isOwnOnly ? () => openMenu(item) : null}
            showBranch={isOrgLevel}
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
              <Text style={[styles.emptyText, { color: C.muted }]}>No subjects found</Text>
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

      <AddSubjectModal open={addOpen} onClose={() => setAddOpen(false)} />

      <EditSubjectModal
        open={!!editSubject}
        subject={editSubject}
        onClose={() => setEditSubject(null)}
      />

      <SubjectActionsSheet
        open={!!actionsFor}
        subject={actionsFor}
        canUpdate={canUpdateAny && (actionsFor ? canActOnRow(actionsFor) : false)}
        canToggle={canToggleAny && (actionsFor ? canActOnRow(actionsFor) : false)}
        onClose={closeMenu}
        onView={() => {
          const s = actionsFor;
          closeMenu();
          if (s) openDetail(s);
        }}
        onEdit={() => {
          const s = actionsFor;
          closeMenu();
          if (s) setEditSubject(s);
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
  codeBlock: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: COLORS.brand,
    minWidth: 56,
    alignItems: 'center',
  },
  codeText: { color: '#fff', fontFamily: 'System', fontWeight: '800', fontSize: 13 },
  name: { fontSize: 15, fontWeight: '700' },
  meta: { fontSize: 12, marginTop: 2 },
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
