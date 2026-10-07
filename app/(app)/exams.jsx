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
import { useBranchesDropdown } from '../../src/hooks/useBranchProfilesList';
import { useClassesForExam, useExamsList } from '../../src/hooks/useExams';
import { useUserStore } from '../../src/store/userStore';
import { useColors } from '../../src/theme/useColors';
import { COLORS } from '../../src/theme/colors';
import { hasAnyAction, resolveScope } from '../../src/utils/permissions';
import {
  EXAM_STATUSES,
  EXAM_STATUS_PILL,
  EXAM_TYPES,
  currentAcademicYear,
  formatDate,
  titleCase,
} from '../../src/constants/exam';
import ExamFormModal from '../../src/component/exam/ExamFormModal';

function ExamCard({ item, onTap, C }) {
  const cfg = EXAM_STATUS_PILL[item.status] || EXAM_STATUS_PILL.planned;
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
            {item.name}
          </Text>
          <Text style={[styles.meta, { color: C.muted }]} numberOfLines={1}>
            {item.serialNumber || '—'}
            {item.academicYear ? ` · ${item.academicYear}` : ''}
          </Text>
        </View>
        <View style={[styles.pill, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.pillText, { color: cfg.fg }]}>{cfg.label}</Text>
        </View>
      </View>

      <View style={styles.pillRow}>
        <View style={[styles.pill, { backgroundColor: '#eef2ff' }]}>
          <Text style={[styles.pillText, { color: '#3730a3' }]}>
            {titleCase(item.type)}
          </Text>
        </View>
        {item.class?.name && (
          <View style={[styles.pill, { backgroundColor: '#ccfbf1' }]}>
            <Text style={[styles.pillText, { color: '#0f766e' }]}>
              {item.class.name}
              {item.class.grade ? ` · Gr ${item.class.grade}` : ''}
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.metaGrid, { borderTopColor: C.border }]}>
        <MetaCell label="Schedule" value={`${formatDate(item.startDate)} → ${formatDate(item.endDate)}`} C={C} />
        <MetaCell label="Subjects" value={`${item.subjectCount ?? 0}`} C={C} />
        <MetaCell label="Total Marks" value={`${item.totalMarks ?? 0}`} C={C} />
        <MetaCell label="Passing %" value={`${item.passingPercentage ?? 40}%`} C={C} />
      </View>
    </Pressable>
  );
}

function MetaCell({ label, value, C }) {
  return (
    <View style={styles.metaCell}>
      <Text style={[styles.metaLabel, { color: C.mutedSoft }]}>{label.toUpperCase()}</Text>
      <Text style={[styles.metaValue, { color: C.text }]} numberOfLines={1}>
        {value || '—'}
      </Text>
    </View>
  );
}

export default function ExamsScreen() {
  const router = useRouter();
  const C = useColors();
  const { user } = useUserStore();

  const examScope = resolveScope(user?.role, 'view-exam');
  const isOrgLevel = examScope === 'all';
  const isOwnOnly = examScope === 'own';

  const canCreate =
    !isOwnOnly && hasAnyAction(user?.role, ['create-exam', 'create-all-branch-exam']);

  const userBranchId =
    (typeof user?.branchId === 'string' && user.branchId) ||
    user?.branchId?._id ||
    user?.branch?._id ||
    '';

  // Draft filters
  const [draftSearch, setDraftSearch] = useState('');
  const [draftClassId, setDraftClassId] = useState('');
  const [draftBranchId, setDraftBranchId] = useState('');
  const [draftType, setDraftType] = useState('');
  const [draftStatus, setDraftStatus] = useState('');
  const [draftAcademicYear, setDraftAcademicYear] = useState(currentAcademicYear());
  const [draftIsActive, setDraftIsActive] = useState('true');

  // Applied
  const [filters, setFilters] = useState({
    academicYear: currentAcademicYear(),
    isActive: 'true',
  });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [showFilters, setShowFilters] = useState(false);

  const [addOpen, setAddOpen] = useState(false);

  const { data: branchData } = useBranchesDropdown({ enabled: isOrgLevel });
  const branches = branchData?.data || [];
  const draftEffectiveBranchId = isOrgLevel ? draftBranchId : userBranchId;

  const { data: classData } = useClassesForExam({
    branchId: draftEffectiveBranchId || undefined,
    academicYear: draftAcademicYear,
    enabled: !!draftAcademicYear,
  });
  const classes = classData?.data || [];

  const effectiveBranchId = isOrgLevel ? filters.branchId : userBranchId;

  const { data, isLoading, isFetching, refetch, error } = useExamsList({
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

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((e) => e.name?.toLowerCase().includes(q));
  }, [rows, search]);

  const applyFilters = () => {
    setFilters({
      classId: draftClassId,
      type: draftType,
      status: draftStatus,
      academicYear: draftAcademicYear,
      isActive: draftIsActive,
      branchId: isOrgLevel ? draftBranchId : '',
    });
    setSearch(draftSearch);
    setPage(1);
    setShowFilters(false);
  };

  const clearFilters = () => {
    const ay = currentAcademicYear();
    setDraftSearch('');
    setDraftClassId('');
    setDraftBranchId('');
    setDraftType('');
    setDraftStatus('');
    setDraftAcademicYear(ay);
    setDraftIsActive('true');
    setFilters({ academicYear: ay, isActive: 'true' });
    setSearch('');
    setPage(1);
  };

  const activeFilterCount = useMemo(() => {
    let n = 0;
    Object.entries(filters || {}).forEach(([k, v]) => {
      if (k === 'isActive' && v === 'true') return;
      if (k === 'academicYear' && v === currentAcademicYear()) return;
      if (v) n += 1;
    });
    if (search) n += 1;
    return n;
  }, [filters, search]);

  const Header = (
    <View style={{ gap: 12 }}>
      <View>
        <Text style={[styles.title, { color: C.text }]}>Exams</Text>
        <Text style={[styles.subtitle, { color: C.muted }]}>
          Schedule exams, manage subject papers and enter marks
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
            <Text style={styles.actionBtnPrimaryText}>Add Exam</Text>
          </Pressable>
        )}
      </View>

      {showFilters && (
        <View style={[styles.filtersCard, { backgroundColor: C.card, borderColor: C.border }]}>
          <View>
            <Text style={[styles.label, { color: C.muted }]}>SEARCH</Text>
            <TextInput
              value={draftSearch}
              onChangeText={setDraftSearch}
              placeholder="Exam name…"
              placeholderTextColor={C.mutedSoft}
              style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
              onSubmitEditing={applyFilters}
            />
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

          <View>
            <Text style={[styles.label, { color: C.muted }]}>STATUS</Text>
            <View style={styles.chipRow}>
              <Pressable
                onPress={() => setDraftStatus('')}
                style={({ pressed }) => [
                  styles.chip,
                  { backgroundColor: C.bg, borderColor: C.border },
                  !draftStatus && styles.chipActive,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: C.text },
                    !draftStatus && styles.chipTextActive,
                  ]}
                >
                  All
                </Text>
              </Pressable>
              {EXAM_STATUSES.map((s) => {
                const active = draftStatus === s;
                return (
                  <Pressable
                    key={s}
                    onPress={() => setDraftStatus(s)}
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
                      {titleCase(s)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View>
            <Text style={[styles.label, { color: C.muted }]}>TYPE</Text>
            <View style={styles.chipRow}>
              <Pressable
                onPress={() => setDraftType('')}
                style={({ pressed }) => [
                  styles.chip,
                  { backgroundColor: C.bg, borderColor: C.border },
                  !draftType && styles.chipActive,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: C.text },
                    !draftType && styles.chipTextActive,
                  ]}
                >
                  All
                </Text>
              </Pressable>
              {EXAM_TYPES.map((t) => {
                const active = draftType === t;
                return (
                  <Pressable
                    key={t}
                    onPress={() => setDraftType(t)}
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
                      {titleCase(t)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
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

          <View>
            <Text style={[styles.label, { color: C.muted }]}>ACTIVE</Text>
            <View style={styles.chipRow}>
              {[
                { v: 'true', l: 'Yes' },
                { v: 'false', l: 'No' },
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
          {isLoading ? 'Loading…' : `${filtered.length} of ${total} ${total === 1 ? 'exam' : 'exams'}`}
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
        data={filtered}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={Header}
        ListFooterComponent={Footer}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <ExamCard
            item={item}
            onTap={() => router.push(`/(app)/exams/${item._id}`)}
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
                  : 'No exams found'}
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

      <ExamFormModal open={addOpen} onClose={() => setAddOpen(false)} />
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

  filtersCard: { borderRadius: 14, padding: 12, borderWidth: 1, gap: 10 },
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
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontSize: 15, fontWeight: '700' },
  meta: { fontSize: 11, marginTop: 2 },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  pillText: { fontSize: 10, fontWeight: '800' },

  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  metaCell: { flexBasis: '50%', paddingVertical: 4 },
  metaLabel: { fontSize: 9, letterSpacing: 1.1, fontWeight: '700' },
  metaValue: { fontSize: 12, fontWeight: '700', marginTop: 2 },

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
