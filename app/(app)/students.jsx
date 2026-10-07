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
import {
  useStudentList,
  useToggleStudentStatus,
  useClassesDropdown,
  useSectionsDropdown,
} from '../../src/hooks/useStudents';
import { useBranchesDropdown } from '../../src/hooks/useBranchProfilesList';
import { useUserStore } from '../../src/store/userStore';
import { useColors } from '../../src/theme/useColors';
import { COLORS } from '../../src/theme/colors';
import {
  GENDERS,
  ACADEMIC_STATUSES,
  ACADEMIC_STATUS_PILL,
  STATUS_PILL,
  titleCase,
  currentAcademicYear,
} from '../../src/constants/students';
import {
  resolveScope,
  hasAnyAction,
} from '../../src/utils/permissions';
import AddStudentModal from '../../src/component/AddStudentModal';
import EditStudentModal from '../../src/component/EditStudentModal';
import TransferStudentModal from '../../src/component/TransferStudentModal';
import StudentActionsSheet from '../../src/component/StudentActionsSheet';

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

function StudentRow({ item, onTap, onMenu, C }) {
  const u = item.user || {};
  const initial = (u.name?.[0] || '?').toUpperCase();
  const statusP = item.isActive ? STATUS_PILL.active : STATUS_PILL.blocked;
  const acaP =
    ACADEMIC_STATUS_PILL[item.academicStatus] || {
      bg: C.border,
      fg: C.text,
    };

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
            {item.class?.name || '—'}
            {item.section?.name ? ` · ${item.section.name}` : ''}
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
        <View style={[styles.pill, { backgroundColor: acaP.bg }]}>
          <Text style={[styles.pillText, { color: acaP.fg }]}>
            {titleCase(item.academicStatus)}
          </Text>
        </View>
        <View style={[styles.pill, { backgroundColor: statusP.bg }]}>
          <Text style={[styles.pillText, { color: statusP.fg }]}>
            {statusP.label}
          </Text>
        </View>
      </View>

      <View style={[styles.metaGrid, { borderTopColor: C.border }]}>
        <MetaCell label="Adm No." value={item.admissionNumber} C={C} />
        <MetaCell label="Roll" value={item.rollNumber} C={C} />
        <MetaCell label="Year" value={item.academicYear} C={C} />
        <MetaCell label="Father" value={item.father?.name} C={C} />
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

export default function StudentsScreen() {
  const router = useRouter();
  const C = useColors();
  const { user } = useUserStore();

  const scope = resolveScope(user?.role, 'view-student');
  const isOrgLevel = scope === 'all';
  const isOwnOnly = scope === 'own';
  const canCreate =
    !isOwnOnly &&
    hasAnyAction(user?.role, ['create-student', 'create-all-branch-student']);
  const canUpdate = resolveScope(user?.role, 'update-student') !== 'none';
  const canDelete =
    !isOwnOnly &&
    hasAnyAction(user?.role, ['delete-student', 'delete-all-branch-student']);
  const canTransfer =
    !isOwnOnly &&
    hasAnyAction(user?.role, ['update-student', 'update-all-branch-student']);
  const canActOnAllBranches = hasAnyAction(user?.role, ['delete-all-branch-student']);
  const canCreateAllBranch =
    hasAnyAction(user?.role, ['create-all-branch-student']);

  const userBranchId =
    typeof user?.branchId === 'string'
      ? user.branchId
      : user?.branchId?._id || null;

  const defaultYear = currentAcademicYear();

  // Drafts
  const [draftSearch, setDraftSearch] = useState('');
  const [draftAdm, setDraftAdm] = useState('');
  const [draftRoll, setDraftRoll] = useState('');
  const [draftGender, setDraftGender] = useState('');
  const [draftAcaStatus, setDraftAcaStatus] = useState('');
  const [draftYear, setDraftYear] = useState(defaultYear);
  const [draftClassId, setDraftClassId] = useState('');
  const [draftSectionId, setDraftSectionId] = useState('');
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
  const [editStudent, setEditStudent] = useState(null);
  const [transferStudent, setTransferStudent] = useState(null);
  const [actionsFor, setActionsFor] = useState(null);

  const { data: branchesData } = useBranchesDropdown({ enabled: isOrgLevel });
  const branches = branchesData?.data || [];

  const draftBranchEffective = isOrgLevel ? draftBranchId : userBranchId;

  const { data: classesData } = useClassesDropdown({
    branchId: draftBranchEffective,
    academicYear: draftYear,
    enabled: !isOwnOnly,
  });
  const classes = classesData?.data || [];

  const { data: sectionsData } = useSectionsDropdown(draftClassId, {
    enabled: !!draftClassId,
  });
  const sections = sectionsData?.data || [];

  const effectiveBranchId = isOrgLevel ? filters.branchId : userBranchId;

  const { data, isLoading, isFetching, refetch, error } = useStudentList({
    page,
    limit,
    filters,
    branchId: effectiveBranchId,
    enabled: !isOwnOnly,
  });

  const studentsList = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // A delete can shrink the list; don't strand the user on a page past the end.
  useEffect(() => {
    if (data && page > totalPages) setPage(totalPages);
  }, [data, page, totalPages]);

  const toggle = useToggleStudentStatus({ onSuccess: () => setActionsFor(null) });

  const applyFilters = () => {
    setFilters({
      search: draftSearch,
      admissionNumber: draftAdm,
      rollNumber: draftRoll,
      gender: draftGender,
      academicStatus: draftAcaStatus,
      academicYear: draftYear,
      classId: draftClassId,
      sectionId: draftSectionId,
      branchId: draftBranchId,
      isActive: draftActive,
    });
    setPage(1);
    setShowFilters(false);
  };

  const clearFilters = () => {
    setDraftSearch('');
    setDraftAdm('');
    setDraftRoll('');
    setDraftGender('');
    setDraftAcaStatus('');
    setDraftYear(defaultYear);
    setDraftClassId('');
    setDraftSectionId('');
    setDraftBranchId('');
    setDraftActive('true');
    setFilters({ academicYear: defaultYear, isActive: 'true' });
    setPage(1);
  };

  const openDetail = (s) => router.push(`/(app)/students/${s._id}`);
  const openMenu = (s) => setActionsFor(s);
  const closeMenu = () => setActionsFor(null);

  const canActOnRow = (row) => {
    if (canActOnAllBranches) return true;
    const rowBranchId = row?.branch?._id;
    return userBranchId && rowBranchId && String(rowBranchId) === String(userBranchId);
  };

  const ListHeader = useMemo(
    () => (
      <View style={{ gap: 14 }}>
        <View>
          <Text style={[styles.title, { color: C.text }]}>Students</Text>
          <Text style={[styles.subtitle, { color: C.muted }]}>
            Enroll, transfer, and manage student records
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
              <Text style={styles.actionBtnPrimaryText}>Enroll Student</Text>
            </Pressable>
          )}
        </View>

        {showFilters && !isOwnOnly && (
          <View
            style={[
              styles.filtersCard,
              { backgroundColor: C.card, borderColor: C.border },
            ]}
          >
            <FilterInput
              value={draftSearch}
              onChange={setDraftSearch}
              placeholder="Search name…"
              onSubmit={applyFilters}
              C={C}
            />
            <FilterInput
              value={draftAdm}
              onChange={setDraftAdm}
              placeholder="Admission Number"
              onSubmit={applyFilters}
              C={C}
            />
            <FilterInput
              value={draftRoll}
              onChange={setDraftRoll}
              placeholder="Roll Number"
              onSubmit={applyFilters}
              C={C}
            />
            <FilterInput
              value={draftYear}
              onChange={setDraftYear}
              placeholder="Academic Year (YYYY-YYYY)"
              onSubmit={applyFilters}
              C={C}
            />

            <Text style={[styles.filterLabel, { color: C.muted }]}>Gender</Text>
            <SelectChips
              value={draftGender}
              options={GENDERS.map((v) => ({ value: v, label: titleCase(v) }))}
              onChange={setDraftGender}
              C={C}
            />

            <Text style={[styles.filterLabel, { color: C.muted }]}>Academic Status</Text>
            <SelectChips
              value={draftAcaStatus}
              options={ACADEMIC_STATUSES.map((v) => ({ value: v, label: titleCase(v) }))}
              onChange={setDraftAcaStatus}
              C={C}
            />

            <Text style={[styles.filterLabel, { color: C.muted }]}>Status</Text>
            <SelectChips
              value={draftActive}
              options={[
                { value: 'true', label: 'Active' },
                { value: 'false', label: 'Blocked' },
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
                  onChange={(v) => {
                    setDraftBranchId(v);
                    setDraftClassId('');
                    setDraftSectionId('');
                  }}
                  C={C}
                />
              </>
            )}

            {classes.length > 0 && (
              <>
                <Text style={[styles.filterLabel, { color: C.muted }]}>Class</Text>
                <SelectChips
                  value={draftClassId}
                  options={classes.map((c) => ({
                    value: c._id,
                    label: `${c.name} (${c.grade?.toUpperCase()})`,
                  }))}
                  onChange={(v) => {
                    setDraftClassId(v);
                    setDraftSectionId('');
                  }}
                  C={C}
                />
              </>
            )}

            {!!draftClassId && sections.length > 0 && (
              <>
                <Text style={[styles.filterLabel, { color: C.muted }]}>Section</Text>
                <SelectChips
                  value={draftSectionId}
                  options={sections.map((s) => ({ value: s._id, label: s.name }))}
                  onChange={setDraftSectionId}
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
            {isLoading
              ? 'Loading…'
              : `${total} ${total === 1 ? 'student' : 'students'}`}
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
      draftSearch,
      draftAdm,
      draftRoll,
      draftGender,
      draftAcaStatus,
      draftYear,
      draftClassId,
      draftSectionId,
      draftActive,
      draftBranchId,
      branches,
      classes,
      sections,
      isOrgLevel,
      isOwnOnly,
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

  if (isOwnOnly) {
    return (
      <View style={[styles.safe, { backgroundColor: C.bg }]}>
        <View style={styles.center}>
          <Feather name="user" size={36} color={COLORS.brand} />
          <Text style={[styles.title, { color: C.text }]}>My Record</Text>
          <Text style={[styles.subtitle, { color: C.muted, textAlign: 'center' }]}>
            You can only view your own record.
          </Text>
          <Pressable
            onPress={() =>
              user?.studentId && router.push(`/(app)/students/${user.studentId}`)
            }
            style={styles.viewSelfBtn}
          >
            <Text style={styles.viewSelfBtnText}>Open My Record</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.safe, { backgroundColor: C.bg }]}>
      <FlatList
        data={studentsList}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={Footer}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <StudentRow
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
              <Text style={[styles.emptyText, { color: C.muted }]}>No students found</Text>
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

      <AddStudentModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        canCreateAllBranch={canCreateAllBranch}
        userBranchId={userBranchId}
      />

      <EditStudentModal
        open={!!editStudent}
        student={editStudent}
        onClose={() => setEditStudent(null)}
      />

      <TransferStudentModal
        open={!!transferStudent}
        student={transferStudent}
        onClose={() => setTransferStudent(null)}
      />

      <StudentActionsSheet
        open={!!actionsFor}
        student={actionsFor}
        onClose={closeMenu}
        canUpdate={canUpdate && (actionsFor ? canActOnRow(actionsFor) : false)}
        canTransfer={canTransfer && (actionsFor ? canActOnRow(actionsFor) : false)}
        canDelete={canDelete && (actionsFor ? canActOnRow(actionsFor) : false)}
        toggling={toggle.isPending}
        onView={() => {
          const s = actionsFor;
          closeMenu();
          if (s) openDetail(s);
        }}
        onEdit={() => {
          const s = actionsFor;
          closeMenu();
          if (s) setEditStudent(s);
        }}
        onTransfer={() => {
          const s = actionsFor;
          closeMenu();
          if (s) setTransferStudent(s);
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
