import { useMemo, useState } from 'react';
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
import { useUserStore } from '../../store/userStore';
import { useBranchesDropdown } from '../../hooks/useBranchProfilesList';
import { useClassesForFee, useSectionsForFee, useVouchersList } from '../../hooks/useFees';
import {
  VOUCHER_STATUSES,
  VOUCHER_STATUS_PILL,
  currentAcademicYear,
  formatDate,
  formatMoney,
  formatMonth,
  titleCase,
} from '../../constants/fee';
import { hasAnyAction, resolveScope } from '../../utils/permissions';
import { useColors } from '../../theme/useColors';
import { COLORS } from '../../theme/colors';
import GenerateSectionModal from './GenerateSectionModal';
import GenerateStudentModal from './GenerateStudentModal';
import StudentPickerModal from './StudentPickerModal';

function VoucherCard({ v, onTap, C }) {
  const cfg = VOUCHER_STATUS_PILL[v.status] || VOUCHER_STATUS_PILL.unpaid;
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
          <Text style={[styles.voucher, { color: C.text }]} numberOfLines={1}>
            {v.voucherNumber}
          </Text>
          <Text style={[styles.meta, { color: C.muted }]} numberOfLines={1}>
            {formatMonth(v.month)}
            {v.academicYear ? ` · ${v.academicYear}` : ''}
          </Text>
        </View>
        <View style={[styles.pill, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.pillText, { color: cfg.fg }]}>{cfg.label}</Text>
        </View>
      </View>

      <View style={styles.studentRow}>
        <View style={styles.studentAvatar}>
          <Text style={styles.studentAvatarText}>
            {(v.student?.user?.name?.[0] || '?').toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.studentName, { color: C.text }]} numberOfLines={1}>
            {v.student?.user?.name || '—'}
          </Text>
          <Text style={[styles.studentMeta, { color: C.muted }]} numberOfLines={1}>
            {v.student?.admissionNumber || '—'}
            {v.student?.rollNumber ? ` · Roll ${v.student.rollNumber}` : ''}
            {v.class?.name ? ` · ${v.class.name}` : ''}
            {v.section?.name ? ` · ${v.section.name}` : ''}
          </Text>
        </View>
      </View>

      <View style={[styles.amountsRow, { borderTopColor: C.border }]}>
        <View style={styles.amountBlock}>
          <Text style={[styles.amountLabel, { color: C.mutedSoft }]}>TOTAL</Text>
          <Text style={[styles.amountValue, { color: C.text }]} numberOfLines={1}>
            {formatMoney(v.totalAmount)}
          </Text>
        </View>
        <View style={styles.amountBlock}>
          <Text style={[styles.amountLabel, { color: C.mutedSoft }]}>PAID</Text>
          <Text style={[styles.amountValue, { color: '#166534' }]} numberOfLines={1}>
            {formatMoney(v.paidAmount)}
          </Text>
        </View>
        <View style={styles.amountBlock}>
          <Text style={[styles.amountLabel, { color: C.mutedSoft }]}>BALANCE</Text>
          <Text
            style={[styles.amountValue, { color: v.balanceAmount > 0 ? '#991b1b' : C.text }]}
            numberOfLines={1}
          >
            {formatMoney(v.balanceAmount)}
          </Text>
        </View>
      </View>

      <View style={styles.footerRow}>
        <Text style={[styles.dueText, { color: C.mutedSoft }]}>Due {formatDate(v.dueDate)}</Text>
        {v.lateFee > 0 && (
          <View style={[styles.lateFeePill, { backgroundColor: '#fee2e2' }]}>
            <Feather name="alert-octagon" size={10} color="#991b1b" />
            <Text style={[styles.lateFeeText, { color: '#991b1b' }]}>
              + {formatMoney(v.lateFee)}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

export default function VouchersPanel() {
  const router = useRouter();
  const C = useColors();
  const { user } = useUserStore();

  const scope = resolveScope(user?.role, 'view-fee');
  const isOrgLevel = scope === 'all';
  const isOwnOnly = scope === 'own';

  const canGenerate = hasAnyAction(user?.role, ['generate-voucher', 'generate-all-branch-voucher']);
  // Regenerating voids the old vouchers, so the server also wants the delete action.
  const canRegenerate =
    canGenerate && hasAnyAction(user?.role, ['delete-fee', 'delete-all-branch-fee']);

  const userBranchId =
    (typeof user?.branchId === 'string' && user.branchId) ||
    user?.branchId?._id ||
    user?.branch?._id ||
    '';

  // Draft filters
  const [draftSearch, setDraftSearch] = useState('');
  const [draftClassId, setDraftClassId] = useState('');
  const [draftSectionId, setDraftSectionId] = useState('');
  const [draftMonth, setDraftMonth] = useState('');
  const [draftAcademicYear, setDraftAcademicYear] = useState(currentAcademicYear());
  const [draftStatus, setDraftStatus] = useState('');
  const [draftBranchId, setDraftBranchId] = useState('');

  // Applied
  const [filters, setFilters] = useState({ academicYear: currentAcademicYear() });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [showFilters, setShowFilters] = useState(false);

  const [genSectionOpen, setGenSectionOpen] = useState(false);
  const [genSectionMode, setGenSectionMode] = useState('generate');
  const [genStudentOpen, setGenStudentOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const { data: branchData } = useBranchesDropdown({ enabled: isOrgLevel });
  const branches = branchData?.data || [];
  const draftEffectiveBranchId = isOrgLevel ? draftBranchId : userBranchId;

  const { data: classData } = useClassesForFee({
    branchId: draftEffectiveBranchId || undefined,
    academicYear: draftAcademicYear,
    enabled: !!draftAcademicYear,
  });
  const classes = classData?.data || [];

  const { data: sectionData } = useSectionsForFee({
    classId: draftClassId,
    enabled: !!draftClassId,
  });
  const sections = sectionData?.data || [];

  const effectiveBranchId = isOrgLevel ? filters.branchId : userBranchId;
  const { data, isLoading, isFetching, refetch, error } = useVouchersList({
    page,
    limit,
    filters,
    branchId: effectiveBranchId || undefined,
  });

  const rows = data?.data || [];
  const total = data?.total ?? rows.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (v) =>
        v.voucherNumber?.toLowerCase().includes(q) ||
        v.student?.user?.name?.toLowerCase().includes(q) ||
        v.student?.admissionNumber?.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const applyFilters = () => {
    setFilters({
      classId: draftClassId,
      sectionId: draftSectionId,
      month: draftMonth,
      academicYear: draftAcademicYear,
      status: draftStatus,
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
    setDraftSectionId('');
    setDraftMonth('');
    setDraftAcademicYear(ay);
    setDraftStatus('');
    setDraftBranchId('');
    setFilters({ academicYear: ay });
    setSearch('');
    setPage(1);
  };

  const activeCount = useMemo(() => {
    let n = 0;
    Object.entries(filters || {}).forEach(([k, v]) => {
      if (k === 'academicYear' && v === currentAcademicYear()) return;
      if (v) n += 1;
    });
    if (search) n += 1;
    return n;
  }, [filters, search]);

  const Header = (
    <View style={{ gap: 12 }}>
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
            Filters{activeCount > 0 ? ` (${activeCount})` : ''}
          </Text>
        </Pressable>
        {canGenerate && !isOwnOnly && (
          <Pressable
            onPress={() => {
              setGenSectionMode('generate');
              setGenSectionOpen(true);
            }}
            style={({ pressed }) => [styles.actionBtnPrimary, pressed && { opacity: 0.9 }]}
          >
            <Feather name="plus" size={16} color="#fff" />
            <Text style={styles.actionBtnPrimaryText}>Generate</Text>
          </Pressable>
        )}
      </View>

      {canGenerate && !isOwnOnly && (
        <View style={styles.secondaryActionRow}>
          <Pressable
            onPress={() => setGenStudentOpen(true)}
            style={({ pressed }) => [
              styles.secondaryBtn,
              { borderColor: '#99f6e4', backgroundColor: '#f0fdfa' },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Feather name="user-plus" size={14} color="#0f766e" />
            <Text style={[styles.secondaryBtnText, { color: '#0f766e' }]}>Single Student</Text>
          </Pressable>
          {canRegenerate && (
            <Pressable
              onPress={() => {
                setGenSectionMode('regenerate');
                setGenSectionOpen(true);
              }}
              style={({ pressed }) => [
                styles.secondaryBtn,
                { borderColor: '#fde68a', backgroundColor: '#fffbeb' },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Feather name="refresh-cw" size={14} color="#92400e" />
              <Text style={[styles.secondaryBtnText, { color: '#92400e' }]}>
                Regenerate Section
              </Text>
            </Pressable>
          )}
        </View>
      )}

      <Pressable
        onPress={() => setPickerOpen(true)}
        style={({ pressed }) => [
          styles.consolidatedBtn,
          { borderColor: '#c7d2fe', backgroundColor: '#eef2ff' },
          pressed && { opacity: 0.85 },
        ]}
      >
        <Feather name="layers" size={14} color="#3730a3" />
        <Text style={[styles.secondaryBtnText, { color: '#3730a3' }]}>
          Consolidated Arrears Slip
        </Text>
      </Pressable>

      {showFilters && (
        <View style={[styles.filtersCard, { backgroundColor: C.card, borderColor: C.border }]}>
          <View>
            <Text style={[styles.label, { color: C.muted }]}>SEARCH</Text>
            <TextInput
              value={draftSearch}
              onChangeText={setDraftSearch}
              placeholder="Voucher / student / admission"
              placeholderTextColor={C.mutedSoft}
              style={[
                styles.input,
                { color: C.text, borderColor: C.border, backgroundColor: C.bg },
              ]}
              onSubmitEditing={applyFilters}
            />
          </View>

          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: C.muted }]}>YEAR</Text>
              <TextInput
                value={draftAcademicYear}
                onChangeText={setDraftAcademicYear}
                placeholder="2025-2026"
                placeholderTextColor={C.mutedSoft}
                keyboardType="numbers-and-punctuation"
                autoCapitalize="none"
                style={[
                  styles.input,
                  { color: C.text, borderColor: C.border, backgroundColor: C.bg },
                ]}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: C.muted }]}>MONTH</Text>
              <TextInput
                value={draftMonth}
                onChangeText={setDraftMonth}
                placeholder="2026-06"
                placeholderTextColor={C.mutedSoft}
                keyboardType="numbers-and-punctuation"
                autoCapitalize="none"
                style={[
                  styles.input,
                  { color: C.text, borderColor: C.border, backgroundColor: C.bg },
                ]}
              />
            </View>
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
              {VOUCHER_STATUSES.map((s) => {
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
                      style={[styles.chipText, { color: C.text }, active && styles.chipTextActive]}
                    >
                      {titleCase(s)}
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
                  onPress={() => {
                    setDraftClassId('');
                    setDraftSectionId('');
                  }}
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
                      onPress={() => {
                        setDraftClassId(c._id);
                        setDraftSectionId('');
                      }}
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
          {isLoading
            ? 'Loading…'
            : `${filtered.length} of ${total} ${total === 1 ? 'voucher' : 'vouchers'}`}
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
    <View style={{ flex: 1 }}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={Header}
        ListFooterComponent={Footer}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <VoucherCard
            v={item}
            onTap={() => router.push(`/(app)/fees/voucher/${item._id}`)}
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
                  : 'No vouchers found'}
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

      <GenerateSectionModal
        open={genSectionOpen}
        mode={genSectionMode}
        onClose={() => setGenSectionOpen(false)}
      />
      <GenerateStudentModal open={genStudentOpen} onClose={() => setGenStudentOpen(false)} />
      <StudentPickerModal open={pickerOpen} onClose={() => setPickerOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: { padding: 14, paddingBottom: 32 },

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

  secondaryActionRow: { flexDirection: 'row', gap: 8 },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
  },
  secondaryBtnText: { fontWeight: '700', fontSize: 12 },

  consolidatedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
  },

  filtersCard: { borderRadius: 14, padding: 12, borderWidth: 1, gap: 10 },
  label: { fontSize: 10, letterSpacing: 1.1, fontWeight: '700', marginBottom: 4 },
  input: {
    height: 40,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  row2: { flexDirection: 'row', gap: 10 },

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
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  voucher: { fontSize: 14, fontWeight: '800' },
  meta: { fontSize: 11, marginTop: 2 },

  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  pillText: { fontSize: 10, fontWeight: '800' },

  studentRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  studentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentAvatarText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  studentName: { fontSize: 13, fontWeight: '700' },
  studentMeta: { fontSize: 11, marginTop: 2 },

  amountsRow: {
    flexDirection: 'row',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  amountBlock: { flex: 1, gap: 2 },
  amountLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1.1 },
  amountValue: { fontSize: 13, fontWeight: '800' },

  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dueText: { fontSize: 11, fontWeight: '600' },
  lateFeePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  lateFeeText: { fontSize: 10, fontWeight: '800' },

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
