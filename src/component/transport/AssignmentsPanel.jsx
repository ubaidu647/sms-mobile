import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useUserStore } from '../../store/userStore';
import { useColors } from '../../theme/useColors';
import { COLORS } from '../../theme/colors';
import { useBranchesDropdown } from '../../hooks/useBranchProfilesList';
import {
  useRemoveAssignment,
  useRoutesDropdown,
  useTransportAssignmentsList,
  useVehiclesDropdown,
} from '../../hooks/useTransport';
import {
  ASSIGNMENT_DIRECTION_LABELS,
  ASSIGNMENT_STATUSES,
  ASSIGNMENT_STATUS_PILL,
  titleCase,
} from '../../constants/transport';
import { currentAcademicYear, formatMoney } from '../../constants/fee';
import { hasAnyAction, resolveScope } from '../../utils/permissions';
import AssignmentFormModal from './AssignmentFormModal';

const BLANK_FILTERS = (year) => ({
  routeId: '',
  vehicleId: '',
  academicYear: year || currentAcademicYear(),
  status: '',
  isActive: 'true',
  branchId: '',
});

export default function AssignmentsPanel() {
  const C = useColors();
  const { user } = useUserStore();
  const scope = resolveScope(user?.role, 'view-transport-assignment');
  const isOrgLevel = scope === 'all';
  const isOwnOnly = scope === 'own';
  const canCreate =
    !isOwnOnly && hasAnyAction(user?.role, ['assign-transport', 'assign-all-branch-transport']);
  const canUpdate =
    !isOwnOnly &&
    hasAnyAction(user?.role, [
      'update-transport-assignment',
      'update-all-branch-transport-assignment',
    ]);
  const canDelete =
    !isOwnOnly &&
    hasAnyAction(user?.role, [
      'remove-transport-assignment',
      'remove-all-branch-transport-assignment',
    ]);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState(BLANK_FILTERS());
  const [filters, setFilters] = useState(BLANK_FILTERS());
  const [filtersOpen, setFiltersOpen] = useState(false);

  const apply = () => {
    setFilters(draft);
    setPage(1);
    setFiltersOpen(false);
  };
  const clear = () => {
    setDraft(BLANK_FILTERS());
    setFilters(BLANK_FILTERS());
    setPage(1);
  };

  const { data, isLoading, isFetching, refetch } = useTransportAssignmentsList({
    page,
    limit: 20,
    filters,
    branchId: isOrgLevel ? filters.branchId : undefined,
  });
  const allRows = data?.data || [];
  // The API has no search param for assignments, so this only narrows the page
  // already loaded; the UI says so rather than implying a full search.
  const term = search.trim().toLowerCase();
  const rows = term
    ? allRows.filter((a) =>
        [
          a.student?.name,
          a.student?.admissionNumber,
          a.route?.name,
          a.route?.code,
          a.stopName,
        ]
          .filter(Boolean)
          .some((v) => v.toLowerCase().includes(term)),
      )
    : allRows;
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / 20));

  // A delete can shrink the list; don't strand the user on a page past the end.
  useEffect(() => {
    if (data && page > totalPages) setPage(totalPages);
  }, [data, page, totalPages]);

  const { data: branchData } = useBranchesDropdown({ enabled: isOrgLevel });
  const branches = branchData?.data || [];
  const { data: routesData } = useRoutesDropdown({
    branchId: isOrgLevel ? draft.branchId : undefined,
  });
  const routes = routesData?.data || [];
  const { data: vehiclesData } = useVehiclesDropdown({
    branchId: isOrgLevel ? draft.branchId : undefined,
  });
  const vehicles = vehiclesData?.data || [];

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [actionTarget, setActionTarget] = useState(null);

  const removeMutation = useRemoveAssignment({ onSuccess: () => setActionTarget(null) });

  const activeFiltersCount = useMemo(
    () =>
      Object.entries(filters).filter(([k, v]) => {
        if (k === 'isActive') return v !== 'true';
        if (k === 'academicYear') return v !== currentAcademicYear();
        if (k === 'branchId' && !isOrgLevel) return false;
        return v !== '' && v != null;
      }).length,
    [filters, isOrgLevel],
  );

  const confirmRemove = (a) =>
    Alert.alert(
      'Cancel assignment?',
      `Cancel transport for "${a.student?.name || 'this student'}"? This sets status to cancelled and ends it today.`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel Assignment',
          style: 'destructive',
          onPress: () => removeMutation.mutate(a._id),
        },
      ],
    );

  const renderItem = ({ item: a }) => {
    const pill = ASSIGNMENT_STATUS_PILL[a.status] || ASSIGNMENT_STATUS_PILL.active;
    return (
      <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
        <View style={styles.topRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.studentName, { color: C.text }]} numberOfLines={1}>
              {a.student?.name || '—'}
            </Text>
            <Text style={[styles.studentMeta, { color: C.mutedSoft }]} numberOfLines={1}>
              {a.student?.admissionNumber || '—'}
              {a.student?.rollNumber ? `  ·  Roll ${a.student.rollNumber}` : ''}
              {`  ·  ${a.academicYear || ''}`}
            </Text>
          </View>
          <View style={[styles.pill, { backgroundColor: pill.bg }]}>
            <Text style={[styles.pillText, { color: pill.fg }]}>{pill.label}</Text>
          </View>
          {(canUpdate || canDelete) && (
            <Pressable
              onPress={() => setActionTarget(a)}
              hitSlop={10}
              style={({ pressed }) => [
                styles.menuBtn,
                { backgroundColor: C.bg, borderColor: C.border },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Feather name="more-vertical" size={16} color={C.text} />
            </Pressable>
          )}
        </View>

        <View style={[styles.row, { borderTopColor: C.border }]}>
          <Feather name="map" size={11} color={C.mutedSoft} />
          <Text style={[styles.rowText, { color: C.text }]} numberOfLines={1}>
            {a.route?.name || '—'}
            {a.route?.code ? `  ·  ${a.route.code}` : ''}
            {a.stopName ? `  →  ${a.stopName}` : ''}
          </Text>
        </View>
        <View style={styles.row}>
          <Feather name="truck" size={11} color={C.mutedSoft} />
          <Text style={[styles.rowText, { color: C.text }]} numberOfLines={1}>
            {a.vehicle?.registrationNumber || 'No vehicle'}
            {`  ·  ${ASSIGNMENT_DIRECTION_LABELS[a.direction] || a.direction}`}
          </Text>
        </View>
        <View style={styles.row}>
          <Feather name="dollar-sign" size={11} color={C.mutedSoft} />
          <Text style={[styles.feeText, { color: COLORS.brand }]}>
            {formatMoney(a.monthlyFee)}
            <Text style={[styles.feeUnit, { color: C.mutedSoft }]}>{' / month'}</Text>
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.toolbar, { borderBottomColor: C.border }]}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search this page: student / route / stop…"
          placeholderTextColor={C.mutedSoft}
          style={[styles.searchInput, { backgroundColor: C.card, borderColor: C.border, color: C.text }]}
        />
        {!!term && (
          <Text style={[styles.searchHint, { color: C.muted }]}>
            {`Showing ${rows.length} of ${allRows.length} on page ${page} of ${totalPages} only. `}
            Use Filters to search across all assignments.
          </Text>
        )}
      </View>
      <View style={[styles.toolbar2, { borderBottomColor: C.border }]}>
        <Pressable
          onPress={() => {
            setDraft(filters);
            setFiltersOpen(true);
          }}
          style={({ pressed }) => [
            styles.toolbarBtn,
            { backgroundColor: C.card, borderColor: C.border },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Feather name="filter" size={14} color={C.text} />
          <Text style={[styles.toolbarText, { color: C.text }]}>
            Filters{activeFiltersCount ? `  ·  ${activeFiltersCount}` : ''}
          </Text>
        </Pressable>
        {activeFiltersCount > 0 && (
          <Pressable
            onPress={clear}
            style={({ pressed }) => [
              styles.toolbarBtn,
              { backgroundColor: C.card, borderColor: C.border },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Feather name="x" size={14} color={C.text} />
            <Text style={[styles.toolbarText, { color: C.text }]}>Clear</Text>
          </Pressable>
        )}
        <View style={{ flex: 1 }} />
        {canCreate && (
          <Pressable
            onPress={() => setAddOpen(true)}
            style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.85 }]}
          >
            <Feather name="plus" size={15} color="#fff" />
            <Text style={styles.addText}>Assign</Text>
          </Pressable>
        )}
      </View>

      {isLoading && rows.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.brand} />
        </View>
      ) : rows.length === 0 ? (
        <View style={styles.center}>
          <Feather name="user-x" size={32} color={C.mutedSoft} />
          <Text style={[styles.emptyTitle, { color: C.text }]}>No assignments</Text>
          <Text style={[styles.emptySub, { color: C.muted, textAlign: 'center' }]}>
            {term
              ? `Nothing on page ${page} of ${totalPages} matches "${search.trim()}". ` +
                'Clear the search to browse other pages, or use Filters.'
              : activeFiltersCount
              ? 'No assignments match your filters.'
              : canCreate
              ? 'Tap Assign to add the first one.'
              : "You don't have permission to create assignments."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(it) => it._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={COLORS.brand} />
          }
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={[styles.pager, { borderTopColor: C.border }]}>
                <Pressable
                  disabled={page <= 1}
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                  style={({ pressed }) => [
                    styles.pagerBtn,
                    { backgroundColor: C.card, borderColor: C.border },
                    (page <= 1 || pressed) && { opacity: 0.5 },
                  ]}
                >
                  <Feather name="chevron-left" size={14} color={C.text} />
                  <Text style={[styles.pagerText, { color: C.text }]}>Prev</Text>
                </Pressable>
                <Text style={[styles.pagerInfo, { color: C.muted }]}>
                  {page} / {totalPages}
                </Text>
                <Pressable
                  disabled={page >= totalPages}
                  onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                  style={({ pressed }) => [
                    styles.pagerBtn,
                    { backgroundColor: C.card, borderColor: C.border },
                    (page >= totalPages || pressed) && { opacity: 0.5 },
                  ]}
                >
                  <Text style={[styles.pagerText, { color: C.text }]}>Next</Text>
                  <Feather name="chevron-right" size={14} color={C.text} />
                </Pressable>
              </View>
            ) : null
          }
        />
      )}

      <FiltersModal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        draft={draft}
        setDraft={setDraft}
        onApply={apply}
        onClear={clear}
        branches={branches}
        routes={routes}
        vehicles={vehicles}
        showBranchFilter={isOrgLevel}
        C={C}
      />

      <ActionSheet
        target={actionTarget}
        onClose={() => setActionTarget(null)}
        canUpdate={canUpdate}
        canDelete={canDelete}
        removing={removeMutation.isPending}
        onEdit={(row) => {
          setActionTarget(null);
          setEditTarget(row);
        }}
        onRemove={(row) => {
          setActionTarget(null);
          confirmRemove(row);
        }}
        C={C}
      />

      <AssignmentFormModal open={addOpen} onClose={() => setAddOpen(false)} />
      <AssignmentFormModal
        open={!!editTarget}
        assignment={editTarget}
        onClose={() => setEditTarget(null)}
      />
    </View>
  );
}

function FiltersModal({
  open,
  onClose,
  draft,
  setDraft,
  onApply,
  onClear,
  branches,
  routes,
  vehicles,
  showBranchFilter,
  C,
}) {
  return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalSafe, { backgroundColor: C.bg }]}>
        <View style={[styles.modalHeader, { backgroundColor: C.card, borderBottomColor: C.border }]}>
          <Text style={[styles.modalTitle, { color: C.text }]}>Filters</Text>
          <Pressable
            onPress={onClose}
            hitSlop={10}
            style={({ pressed }) => [styles.modalClose, { backgroundColor: C.bg }, pressed && { opacity: 0.6 }]}
          >
            <Feather name="x" size={18} color={C.text} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
          <View>
            <Text style={[styles.fLabel, { color: C.muted }]}>ACADEMIC YEAR</Text>
            <TextInput
              value={draft.academicYear}
              onChangeText={(v) => setDraft({ ...draft, academicYear: v })}
              placeholder="2025-2026"
              placeholderTextColor={C.mutedSoft}
              keyboardType="numbers-and-punctuation"
              autoCapitalize="none"
              style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.card }]}
            />
          </View>

          <ChipGroup
            label="ROUTE"
            options={[
              { value: '', label: 'All routes' },
              ...routes.map((r) => ({ value: r._id, label: r.name })),
            ]}
            value={draft.routeId}
            onChange={(v) => setDraft({ ...draft, routeId: v })}
            C={C}
          />

          <ChipGroup
            label="VEHICLE"
            options={[
              { value: '', label: 'All vehicles' },
              ...vehicles.map((v) => ({ value: v._id, label: v.registrationNumber })),
            ]}
            value={draft.vehicleId}
            onChange={(v) => setDraft({ ...draft, vehicleId: v })}
            C={C}
          />

          <ChipGroup
            label="STATUS"
            options={[
              { value: '', label: 'All' },
              ...ASSIGNMENT_STATUSES.map((s) => ({ value: s, label: titleCase(s) })),
            ]}
            value={draft.status}
            onChange={(v) => setDraft({ ...draft, status: v })}
            C={C}
          />

          <ChipGroup
            label="ACTIVE"
            options={[
              { value: 'true', label: 'Active' },
              { value: 'false', label: 'Inactive' },
              { value: '', label: 'All' },
            ]}
            value={draft.isActive}
            onChange={(v) => setDraft({ ...draft, isActive: v })}
            C={C}
          />

          {showBranchFilter && (
            <ChipGroup
              label="BRANCH"
              options={[
                { value: '', label: 'All branches' },
                ...branches.map((b) => ({ value: b._id, label: b.name })),
              ]}
              value={draft.branchId}
              onChange={(v) => setDraft({ ...draft, branchId: v })}
              C={C}
            />
          )}
        </ScrollView>

        <View style={[styles.modalFooter, { backgroundColor: C.card, borderTopColor: C.border }]}>
          <Pressable
            onPress={onClear}
            style={({ pressed }) => [
              styles.secondaryBtn,
              { backgroundColor: C.bg, borderColor: C.border },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={[styles.secondaryText, { color: C.text }]}>Clear</Text>
          </Pressable>
          <Pressable onPress={onApply} style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}>
            <Feather name="check" size={15} color="#fff" />
            <Text style={styles.primaryText}>Apply</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function ChipGroup({ label, options, value, onChange, C }) {
  return (
    <View>
      <Text style={[styles.fLabel, { color: C.muted }]}>{label}</Text>
      <View style={styles.chipRow}>
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <Pressable
              key={opt.value || '__all__'}
              onPress={() => onChange(opt.value)}
              style={({ pressed }) => [
                styles.fchip,
                { backgroundColor: C.card, borderColor: C.border },
                active && styles.fchipActive,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text
                style={[
                  styles.fchipText,
                  { color: C.text },
                  active && styles.fchipTextActive,
                ]}
                numberOfLines={1}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function ActionSheet({ target, onClose, canUpdate, canDelete, removing, onEdit, onRemove, C }) {
  if (!target) return null;
  const items = [];
  if (canUpdate) items.push({ key: 'edit', label: 'Edit', icon: 'edit-3', onPress: () => onEdit(target) });
  if (canDelete && target.status !== 'cancelled') {
    items.push({
      key: 'remove',
      label: removing ? 'Cancelling…' : 'Cancel',
      icon: 'trash-2',
      destructive: true,
      disabled: removing,
      onPress: () => onRemove(target),
    });
  }
  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.actionBackdrop} onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[styles.actionSheet, { backgroundColor: C.card }]}
        >
          <View style={[styles.actionGrabber, { backgroundColor: C.border }]} />
          <Text style={[styles.actionTitle, { color: C.text }]} numberOfLines={1}>
            {target.student?.name || 'Assignment'}
          </Text>
          {items.map((it) => (
            <Pressable
              key={it.key}
              disabled={it.disabled}
              onPress={it.onPress}
              style={({ pressed }) => [
                styles.actionItem,
                { borderTopColor: C.border },
                (it.disabled || pressed) && { opacity: 0.65 },
              ]}
            >
              <Feather name={it.icon} size={16} color={it.destructive ? '#dc2626' : COLORS.brand} />
              <Text style={[styles.actionItemText, { color: it.destructive ? '#dc2626' : C.text }]}>
                {it.label}
              </Text>
            </Pressable>
          ))}
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.actionItem,
              { borderTopColor: C.border, justifyContent: 'center' },
              pressed && { opacity: 0.6 },
            ]}
          >
            <Text style={[styles.actionItemText, { color: C.muted }]}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
    borderBottomWidth: 0,
  },
  searchHint: { fontSize: 11, marginTop: 6 },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    fontSize: 13,
  },
  toolbar2: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toolbarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  toolbarText: { fontSize: 12, fontWeight: '700' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.brand,
  },
  addText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  listContent: { padding: 12, gap: 10, paddingBottom: 32 },

  card: { borderRadius: 14, borderWidth: 1, padding: 12 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  studentName: { fontSize: 14, fontWeight: '800' },
  studentMeta: { fontSize: 11, marginTop: 2 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  pillText: { fontSize: 10, fontWeight: '700' },
  menuBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    marginTop: 4,
  },
  rowText: { fontSize: 12, fontWeight: '500', flex: 1 },
  feeText: { fontSize: 13, fontWeight: '800' },
  feeUnit: { fontSize: 11, fontWeight: '600' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '800' },
  emptySub: { fontSize: 12 },

  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  pagerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  pagerText: { fontSize: 12, fontWeight: '700' },
  pagerInfo: { fontSize: 12, fontWeight: '700' },

  modalSafe: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', flex: 1 },
  modalClose: { width: 32, height: 32, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  primaryBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.brand,
    height: 44,
    borderRadius: 10,
  },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  secondaryBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
  },
  secondaryText: { fontWeight: '700', fontSize: 13 },
  fLabel: { fontSize: 10, letterSpacing: 1.1, fontWeight: '800', marginBottom: 6 },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  fchip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: 240,
  },
  fchipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  fchipText: { fontSize: 12, fontWeight: '600' },
  fchipTextActive: { color: '#fff' },

  actionBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  actionSheet: {
    paddingTop: 8,
    paddingBottom: 28,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  actionGrabber: { width: 44, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 10 },
  actionTitle: {
    fontSize: 14,
    fontWeight: '800',
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionItemText: { fontSize: 14, fontWeight: '700' },
});
