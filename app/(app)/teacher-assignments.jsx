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
  useAssignmentsList,
  useClassesForFilter,
  useSectionsForClass,
  useSubjectsForClass,
} from '../../src/hooks/useTeacherAssignments';
import { useBranchesDropdown } from '../../src/hooks/useBranchProfilesList';
import { useUserStore } from '../../src/store/userStore';
import { useColors } from '../../src/theme/useColors';
import { COLORS } from '../../src/theme/colors';
import { hasAnyAction, resolveScope } from '../../src/utils/permissions';
import {
  ROLE_PILL,
  TEACHING_ROLES,
  currentAcademicYear,
  fmtDate,
  titleCase,
} from '../../src/constants/teacherAssignment';
import AddAssignmentModal from '../../src/component/teacherAssignment/AddAssignmentModal';
import EditAssignmentModal from '../../src/component/teacherAssignment/EditAssignmentModal';
import AssignmentActionsSheet from '../../src/component/teacherAssignment/AssignmentActionsSheet';

function AssignmentCard({ item, onTap, onMenu, C }) {
  const role = ROLE_PILL[item.role] || ROLE_PILL.teacher;
  const teacher = item.staff?.user?.name || '—';
  const initials =
    teacher
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase())
      .join('') || '?';

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
        {item.staff?.photo ? (
          <Image source={{ uri: item.staff.photo }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.name, { color: C.text }]} numberOfLines={1}>
            {teacher}
          </Text>
          <Text style={[styles.meta, { color: C.muted }]} numberOfLines={1}>
            {item.staff?.designation || '—'}
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

      <View style={[styles.midBlock, { borderTopColor: C.border }]}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.midLabel, { color: C.mutedSoft }]}>SUBJECT</Text>
          <Text style={[styles.midValue, { color: C.text }]} numberOfLines={1}>
            {item.subject?.name || '—'}
            {item.subject?.code ? (
              <Text style={[styles.midSub, { color: C.mutedSoft }]}> · {item.subject.code}</Text>
            ) : null}
          </Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.midLabel, { color: C.mutedSoft }]}>CLASS / SECTION</Text>
          <Text style={[styles.midValue, { color: C.text }]} numberOfLines={1}>
            {item.class?.name || '—'}
            {item.section?.name ? ` / ${item.section.name}` : ''}
          </Text>
        </View>
      </View>

      <View style={styles.pillRow}>
        <View style={[styles.pill, { backgroundColor: role.bg }]}>
          <Text style={[styles.pillText, { color: role.fg }]}>{role.label}</Text>
        </View>
        {item.isPrimary && (
          <View style={[styles.pill, { backgroundColor: '#fef3c7' }]}>
            <Feather name="star" size={10} color="#92400e" />
            <Text style={[styles.pillText, { color: '#92400e' }]}>Primary</Text>
          </View>
        )}
        <View
          style={[
            styles.pill,
            { backgroundColor: item.isActive ? '#dcfce7' : '#f3f4f6' },
          ]}
        >
          <Text
            style={[
              styles.pillText,
              { color: item.isActive ? '#166534' : '#374151' },
            ]}
          >
            {item.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
        {item.academicYear && (
          <View style={[styles.pill, { backgroundColor: '#eef2ff' }]}>
            <Text style={[styles.pillText, { color: '#3730a3' }]}>{item.academicYear}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

export default function TeacherAssignmentsScreen() {
  const router = useRouter();
  const C = useColors();
  const { user } = useUserStore();

  const scope = resolveScope(user?.role, 'view-teaching-assignment');
  const isOrgLevel = scope === 'all';
  const isOwnOnly = scope === 'own';

  const canCreate =
    !isOwnOnly &&
    hasAnyAction(user?.role, [
      'create-teaching-assignment',
      'create-all-branch-teaching-assignment',
    ]);
  const canUpdateAny =
    !isOwnOnly &&
    hasAnyAction(user?.role, [
      'update-teaching-assignment',
      'update-all-branch-teaching-assignment',
    ]);
  const canDeleteAny =
    !isOwnOnly &&
    hasAnyAction(user?.role, [
      'delete-teaching-assignment',
      'delete-all-branch-teaching-assignment',
    ]);
  const canActOnAllBranches =
    !!user?.role?.isPredefined ||
    !!user?.role?.actions?.includes('update-all-branch-teaching-assignment') ||
    !!user?.role?.actions?.includes('delete-all-branch-teaching-assignment');

  const userBranchId =
    (typeof user?.branchId === 'string' && user.branchId) ||
    user?.branchId?._id ||
    user?.branch?._id ||
    null;

  // Draft filters
  const [draftAcademicYear, setDraftAcademicYear] = useState(currentAcademicYear());
  const [draftBranchId, setDraftBranchId] = useState('');
  const [draftClassId, setDraftClassId] = useState('');
  const [draftSectionId, setDraftSectionId] = useState('');
  const [draftSubjectId, setDraftSubjectId] = useState('');
  const [draftRole, setDraftRole] = useState('');
  const [draftIsPrimary, setDraftIsPrimary] = useState('');
  const [draftIsActive, setDraftIsActive] = useState('true');
  const [draftStaffSearch, setDraftStaffSearch] = useState('');

  // Applied
  const [filters, setFilters] = useState({
    academicYear: currentAcademicYear(),
    isActive: 'true',
  });
  const [staffSearch, setStaffSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [showFilters, setShowFilters] = useState(false);

  // Modals/sheets
  const [addOpen, setAddOpen] = useState(false);
  const [addMode, setAddMode] = useState('single');
  const [editTarget, setEditTarget] = useState(null);
  const [actionsFor, setActionsFor] = useState(null);

  // Cascade dropdowns drive off draft state for instant refresh.
  const { data: branchData } = useBranchesDropdown({ enabled: isOrgLevel });
  const branches = branchData?.data || [];
  const draftEffectiveBranchId = isOrgLevel ? draftBranchId : userBranchId;

  const { data: classData } = useClassesForFilter({
    branchId: draftEffectiveBranchId || undefined,
    academicYear: draftAcademicYear,
    enabled: !!draftAcademicYear,
  });
  const classes = classData?.data || [];

  const { data: sectionData } = useSectionsForClass({
    classId: draftClassId,
    enabled: !!draftClassId,
  });
  const sections = sectionData?.data || [];

  const { data: subjectData } = useSubjectsForClass({
    classId: draftClassId,
    academicYear: draftAcademicYear,
    enabled: !!draftClassId,
  });
  const subjects = subjectData?.data || [];

  // Reset cascading filter state on the draft side.
  useEffect(() => {
    setDraftClassId('');
    setDraftSectionId('');
    setDraftSubjectId('');
  }, [draftAcademicYear, draftBranchId]);
  useEffect(() => {
    setDraftSectionId('');
    setDraftSubjectId('');
  }, [draftClassId]);

  const effectiveBranchId = isOrgLevel ? filters.branchId : userBranchId;

  const { data, isLoading, isFetching, refetch, error } = useAssignmentsList({
    page,
    limit,
    filters,
    branchId: effectiveBranchId,
  });

  const rows = data?.data || [];
  const total = data?.total ?? rows.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // A delete can shrink the list; don't strand the user on a page past the end.
  useEffect(() => {
    if (data && page > totalPages) setPage(totalPages);
  }, [data, page, totalPages]);

  // Client-side filter by teacher name search (web does the same).
  const filteredRows = useMemo(() => {
    if (!staffSearch.trim()) return rows;
    const q = staffSearch.toLowerCase();
    return rows.filter((a) => a.staff?.user?.name?.toLowerCase().includes(q));
  }, [rows, staffSearch]);

  const applyFilters = () => {
    setFilters({
      academicYear: draftAcademicYear,
      classId: draftClassId,
      sectionId: draftSectionId,
      subjectId: draftSubjectId,
      role: draftRole,
      isPrimary: draftIsPrimary,
      isActive: draftIsActive,
      branchId: isOrgLevel ? draftBranchId : '',
    });
    setStaffSearch(draftStaffSearch);
    setPage(1);
    setShowFilters(false);
  };

  const clearFilters = () => {
    const ay = currentAcademicYear();
    setDraftAcademicYear(ay);
    setDraftBranchId('');
    setDraftClassId('');
    setDraftSectionId('');
    setDraftSubjectId('');
    setDraftRole('');
    setDraftIsPrimary('');
    setDraftIsActive('true');
    setDraftStaffSearch('');
    setFilters({ academicYear: ay, isActive: 'true' });
    setStaffSearch('');
    setPage(1);
  };

  const activeFilterCount = useMemo(() => {
    let n = 0;
    Object.entries(filters || {}).forEach(([k, v]) => {
      if (k === 'isActive' && v === 'true') return;
      if (k === 'academicYear' && v === currentAcademicYear()) return;
      if (v) n += 1;
    });
    if (staffSearch) n += 1;
    return n;
  }, [filters, staffSearch]);

  const openDetail = (a) => router.push(`/(app)/teacher-assignments/${a._id}`);

  const canActOnRow = (row) => {
    if (canActOnAllBranches) return true;
    const rowBranchId = row?.branchId || row?.section?.branchId;
    return userBranchId && rowBranchId && String(rowBranchId) === String(userBranchId);
  };

  const Header = (
    <View style={{ gap: 12 }}>
      <View>
        <Text style={[styles.title, { color: C.text }]}>
          {isOwnOnly ? 'My Assignments' : 'Teacher Assignments'}
        </Text>
        <Text style={[styles.subtitle, { color: C.muted }]}>
          {isOwnOnly
            ? 'Subjects and sections assigned to you'
            : 'Map teachers to subjects in each section'}
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
            onPress={() => {
              setAddMode('single');
              setAddOpen(true);
            }}
            style={({ pressed }) => [
              styles.actionBtnPrimary,
              pressed && { opacity: 0.9 },
            ]}
          >
            <Feather name="plus" size={16} color="#fff" />
            <Text style={styles.actionBtnPrimaryText}>Assign</Text>
          </Pressable>
        )}
      </View>

      {canCreate && (
        <Pressable
          onPress={() => {
            setAddMode('bulk');
            setAddOpen(true);
          }}
          style={({ pressed }) => [
            styles.bulkBtn,
            { borderColor: '#99f6e4', backgroundColor: '#f0fdfa' },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Feather name="users" size={14} color="#0f766e" />
          <Text style={styles.bulkBtnText}>Bulk Assign Teacher</Text>
        </Pressable>
      )}

      {showFilters && (
        <View style={[styles.filtersCard, { backgroundColor: C.card, borderColor: C.border }]}>
          <View>
            <Text style={[styles.label, { color: C.muted }]}>STATUS</Text>
            <View style={styles.chipRow}>
              {[
                { v: 'true', l: 'Active' },
                { v: 'false', l: 'Inactive' },
                { v: '', l: 'All' },
              ].map((o) => {
                const active = draftIsActive === o.v;
                return (
                  <Pressable
                    key={o.l}
                    onPress={() => setDraftIsActive(o.v)}
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

          <View>
            <Text style={[styles.label, { color: C.muted }]}>ACADEMIC YEAR</Text>
            <TextInput
              value={draftAcademicYear}
              onChangeText={setDraftAcademicYear}
              placeholder="2025-2026"
              placeholderTextColor={C.mutedSoft}
              keyboardType="numbers-and-punctuation"
              autoCapitalize="none"
              style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
            />
          </View>

          {isOrgLevel && branches.length > 0 && (
            <View>
              <Text style={[styles.label, { color: C.muted }]}>BRANCH</Text>
              <View style={styles.chipRow}>
                <Pressable
                  onPress={() => setDraftBranchId('')}
                  style={({ pressed }) => [
                    styles.chip,
                    { backgroundColor: C.bg, borderColor: C.border },
                    !draftBranchId && styles.chipActive,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: C.text },
                      !draftBranchId && styles.chipTextActive,
                    ]}
                  >
                    All
                  </Text>
                </Pressable>
                {branches.map((b) => {
                  const active = draftBranchId === b._id;
                  return (
                    <Pressable
                      key={b._id}
                      onPress={() => setDraftBranchId(b._id)}
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

          {classes.length > 0 && (
            <View>
              <Text style={[styles.label, { color: C.muted }]}>CLASS</Text>
              <View style={styles.chipRow}>
                <Pressable
                  onPress={() => setDraftClassId('')}
                  style={({ pressed }) => [
                    styles.chip,
                    { backgroundColor: C.bg, borderColor: C.border },
                    !draftClassId && styles.chipActive,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: C.text },
                      !draftClassId && styles.chipTextActive,
                    ]}
                  >
                    All
                  </Text>
                </Pressable>
                {classes.map((c) => {
                  const active = draftClassId === c._id;
                  return (
                    <Pressable
                      key={c._id}
                      onPress={() => setDraftClassId(c._id)}
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
                        {c.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {!!draftClassId && sections.length > 0 && (
            <View>
              <Text style={[styles.label, { color: C.muted }]}>SECTION</Text>
              <View style={styles.chipRow}>
                <Pressable
                  onPress={() => setDraftSectionId('')}
                  style={({ pressed }) => [
                    styles.chip,
                    { backgroundColor: C.bg, borderColor: C.border },
                    !draftSectionId && styles.chipActive,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: C.text },
                      !draftSectionId && styles.chipTextActive,
                    ]}
                  >
                    All
                  </Text>
                </Pressable>
                {sections.map((s) => {
                  const active = draftSectionId === s._id;
                  return (
                    <Pressable
                      key={s._id}
                      onPress={() => setDraftSectionId(s._id)}
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
                        {s.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {!!draftClassId && subjects.length > 0 && (
            <View>
              <Text style={[styles.label, { color: C.muted }]}>SUBJECT</Text>
              <View style={styles.chipRow}>
                <Pressable
                  onPress={() => setDraftSubjectId('')}
                  style={({ pressed }) => [
                    styles.chip,
                    { backgroundColor: C.bg, borderColor: C.border },
                    !draftSubjectId && styles.chipActive,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: C.text },
                      !draftSubjectId && styles.chipTextActive,
                    ]}
                  >
                    All
                  </Text>
                </Pressable>
                {subjects.map((s) => {
                  const active = draftSubjectId === s._id;
                  return (
                    <Pressable
                      key={s._id}
                      onPress={() => setDraftSubjectId(s._id)}
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
                        {s.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          <View>
            <Text style={[styles.label, { color: C.muted }]}>ROLE</Text>
            <View style={styles.chipRow}>
              <Pressable
                onPress={() => setDraftRole('')}
                style={({ pressed }) => [
                  styles.chip,
                  { backgroundColor: C.bg, borderColor: C.border },
                  !draftRole && styles.chipActive,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: C.text },
                    !draftRole && styles.chipTextActive,
                  ]}
                >
                  All
                </Text>
              </Pressable>
              {TEACHING_ROLES.map((r) => {
                const active = draftRole === r;
                return (
                  <Pressable
                    key={r}
                    onPress={() => setDraftRole(r)}
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
                      {titleCase(r)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View>
            <Text style={[styles.label, { color: C.muted }]}>PRIMARY</Text>
            <View style={styles.chipRow}>
              {[
                { v: '', l: 'Primary & Co' },
                { v: 'true', l: 'Primary only' },
                { v: 'false', l: 'Co-teachers only' },
              ].map((o) => {
                const active = draftIsPrimary === o.v;
                return (
                  <Pressable
                    key={o.l}
                    onPress={() => setDraftIsPrimary(o.v)}
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

          {!isOwnOnly && (
            <View>
              <Text style={[styles.label, { color: C.muted }]}>TEACHER NAME</Text>
              <TextInput
                value={draftStaffSearch}
                onChangeText={setDraftStaffSearch}
                placeholder="Search by teacher name"
                placeholderTextColor={C.mutedSoft}
                style={[
                  styles.input,
                  { color: C.text, borderColor: C.border, backgroundColor: C.bg },
                ]}
              />
            </View>
          )}

          <View style={styles.filterBtnRow}>
            <Pressable onPress={applyFilters} style={[styles.filterBtn, styles.filterBtnPrimary]}>
              <Feather name="search" size={14} color="#fff" />
              <Text style={styles.filterBtnPrimaryText}>Apply</Text>
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
              <Text style={[styles.filterBtnGhostText, { color: C.text }]}>Reset</Text>
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.resultBar}>
        <Text style={[styles.resultText, { color: C.muted }]}>
          {isLoading ? 'Loading…' : `${filteredRows.length} of ${total} ${
            total === 1 ? 'assignment' : 'assignments'
          }`}
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
        data={filteredRows}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={Header}
        ListFooterComponent={Footer}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <AssignmentCard
            item={item}
            onTap={() => openDetail(item)}
            onMenu={!isOwnOnly ? () => setActionsFor(item) : null}
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
                  : 'No assignments found'}
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

      <AddAssignmentModal
        open={addOpen}
        mode={addMode}
        onClose={() => setAddOpen(false)}
      />

      <EditAssignmentModal
        open={!!editTarget}
        assignment={editTarget}
        onClose={() => setEditTarget(null)}
      />

      <AssignmentActionsSheet
        open={!!actionsFor}
        assignment={actionsFor}
        canUpdate={canUpdateAny && (actionsFor ? canActOnRow(actionsFor) : false)}
        canDelete={canDeleteAny && (actionsFor ? canActOnRow(actionsFor) : false)}
        onClose={() => setActionsFor(null)}
        onView={() => {
          const a = actionsFor;
          setActionsFor(null);
          if (a) openDetail(a);
        }}
        onEdit={() => {
          const a = actionsFor;
          setActionsFor(null);
          if (a) setEditTarget(a);
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

  bulkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
  },
  bulkBtnText: { color: '#0f766e', fontWeight: '700', fontSize: 12 },

  filtersCard: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    gap: 10,
  },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, marginBottom: 4 },
  input: {
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
    maxWidth: 220,
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
    marginBottom: 2,
  },
  resultText: { fontSize: 12, fontWeight: '600' },

  card: { borderRadius: 14, padding: 12, gap: 10, borderWidth: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  name: { fontSize: 15, fontWeight: '700' },
  meta: { fontSize: 11, marginTop: 2 },
  menuBtn: { padding: 6 },

  midBlock: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  midLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1.1 },
  midValue: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  midSub: { fontSize: 11, fontWeight: '600' },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  pillText: { fontSize: 10, fontWeight: '800' },

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
