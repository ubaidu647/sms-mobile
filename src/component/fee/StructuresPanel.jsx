import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useUserStore } from '../../store/userStore';
import { useBranchesDropdown } from '../../hooks/useBranchProfilesList';
import {
  useClassesForFee,
  useDeleteFeeStructure,
  useFeeStructuresList,
} from '../../hooks/useFees';
import {
  currentAcademicYear,
  formatMoney,
  titleCase,
} from '../../constants/fee';
import { hasAnyAction, resolveScope } from '../../utils/permissions';
import { useColors } from '../../theme/useColors';
import { COLORS } from '../../theme/colors';
import FeeStructureFormModal from './FeeStructureFormModal';
import StructureDetailModal from './StructureDetailModal';

function StructureCard({ s, canUpdate, canDelete, onEdit, onDelete, onView, C }) {
  const totals = (s.components || []).reduce(
    (acc, c) => acc + (Number(c.amount) || 0),
    0,
  );
  return (
    <Pressable
      onPress={onView}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: C.card, borderColor: C.border },
        pressed && { opacity: 0.92 },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.name, { color: C.text }]} numberOfLines={1}>
            {s.name}
          </Text>
          <Text style={[styles.meta, { color: C.muted }]} numberOfLines={1}>
            {s.class?.name || '—'}
            {s.class?.grade ? ` · Gr ${s.class.grade}` : ''}
            {'  ·  '}
            {s.academicYear}
          </Text>
        </View>
        <View
          style={[
            styles.pill,
            { backgroundColor: s.isActive ? '#dcfce7' : '#fee2e2' },
          ]}
        >
          <Text
            style={[
              styles.pillText,
              { color: s.isActive ? '#166534' : '#991b1b' },
            ]}
          >
            {s.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      <View style={[styles.statsRow, { borderTopColor: C.border }]}>
        <Stat label="Components" value={`${(s.components || []).length}`} C={C} />
        <Stat label="Sum" value={formatMoney(totals)} C={C} />
        <Stat label="Due Day" value={s.defaultDueDay ?? 10} C={C} />
        <Stat label="Late/Day" value={formatMoney(s.lateFeePerDay ?? 0)} C={C} />
      </View>

      <View style={styles.compList}>
        {(s.components || []).slice(0, 4).map((c, idx) => (
          <View key={idx} style={styles.compRow}>
            <Text style={[styles.compName, { color: C.text }]} numberOfLines={1}>
              {c.name}
              {c.isOptional ? ' · optional' : ''}
            </Text>
            <Text style={[styles.compFreq, { color: C.mutedSoft }]}>
              {titleCase(c.frequency)}
            </Text>
            <Text style={[styles.compAmount, { color: C.text }]}>
              {formatMoney(c.amount)}
            </Text>
          </View>
        ))}
        {(s.components || []).length > 4 && (
          <Text style={[styles.helper, { color: C.mutedSoft }]}>
            +{(s.components || []).length - 4} more
          </Text>
        )}
      </View>

      {(canUpdate || canDelete) && (
        <View style={styles.actionsRow}>
          {canUpdate && (
            <Pressable
              onPress={onEdit}
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
              onPress={onDelete}
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: '#b91c1c' },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Feather name="trash-2" size={14} color="#fff" />
              <Text style={styles.actionBtnText}>Delete</Text>
            </Pressable>
          )}
        </View>
      )}
    </Pressable>
  );
}

function Stat({ label, value, C }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statLabel, { color: C.mutedSoft }]}>{label.toUpperCase()}</Text>
      <Text style={[styles.statValue, { color: C.text }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export default function StructuresPanel() {
  const C = useColors();
  const { user } = useUserStore();

  const scope = resolveScope(user?.role, 'view-fee');
  const isOrgLevel = scope === 'all';

  const canCreate = hasAnyAction(user?.role, ['create-fee', 'create-all-branch-fee']);
  const canUpdate = hasAnyAction(user?.role, ['update-fee', 'update-all-branch-fee']);
  const canDelete = hasAnyAction(user?.role, ['delete-fee', 'delete-all-branch-fee']);

  const userBranchId =
    (typeof user?.branchId === 'string' && user.branchId) ||
    user?.branchId?._id ||
    user?.branch?._id ||
    '';

  const [academicYear, setAcademicYear] = useState(currentAcademicYear());
  const [classId, setClassId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [isActive, setIsActive] = useState('true');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [viewTarget, setViewTarget] = useState(null);

  const { data: branchData } = useBranchesDropdown({ enabled: isOrgLevel });
  const branches = branchData?.data || [];
  const effectiveBranchId = isOrgLevel ? branchId : userBranchId;

  const { data: classData } = useClassesForFee({
    branchId: effectiveBranchId || undefined,
    academicYear,
    enabled: !!academicYear,
  });
  const classes = classData?.data || [];

  const { data, isLoading, isFetching, refetch, error } = useFeeStructuresList({
    page,
    limit,
    filters: { classId, academicYear, isActive },
    branchId: effectiveBranchId || undefined,
  });

  const rows = data?.data || [];
  const total = data?.total ?? rows.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // A delete can shrink the list; don't strand the user on a page past the end.
  useEffect(() => {
    if (data && page > totalPages) setPage(totalPages);
  }, [data, page, totalPages]);

  const del = useDeleteFeeStructure();
  const onDelete = (s) => {
    Alert.alert(
      'Delete Fee Structure',
      `Delete "${s.name}"? Existing vouchers will keep referencing the original copy, but this structure won't be usable for new ones.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => del.mutate(s._id),
        },
      ],
    );
  };

  const Header = (
    <View style={{ gap: 12 }}>
      <View style={[styles.filterCard, { backgroundColor: C.card, borderColor: C.border }]}>
        <View>
          <Text style={[styles.label, { color: C.muted }]}>ACADEMIC YEAR</Text>
          <TextInput
            value={academicYear}
            onChangeText={(v) => {
              setAcademicYear(v);
              setPage(1);
            }}
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
                onPress={() => {
                  setBranchId('');
                  setPage(1);
                }}
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
                    onPress={() => {
                      setBranchId(b._id);
                      setPage(1);
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
                  setClassId('');
                  setPage(1);
                }}
                style={({ pressed }) => [
                  styles.chip,
                  { backgroundColor: C.bg, borderColor: C.border },
                  !classId && styles.chipActive,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: C.text },
                    !classId && styles.chipTextActive,
                  ]}
                >
                  All
                </Text>
              </Pressable>
              {classes.map((c) => {
                const active = classId === c._id;
                return (
                  <Pressable
                    key={c._id}
                    onPress={() => {
                      setClassId(c._id);
                      setPage(1);
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

        <View>
          <Text style={[styles.label, { color: C.muted }]}>STATUS</Text>
          <View style={styles.chipRow}>
            {[
              { v: 'true', l: 'Active' },
              { v: 'false', l: 'Inactive' },
              { v: '', l: 'All' },
            ].map((o) => {
              const active = isActive === o.v;
              return (
                <Pressable
                  key={o.l}
                  onPress={() => {
                    setIsActive(o.v);
                    setPage(1);
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
                    {o.l}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      {canCreate && (
        <Pressable
          onPress={() => setAddOpen(true)}
          style={({ pressed }) => [
            styles.primary,
            pressed && { opacity: 0.9 },
          ]}
        >
          <Feather name="plus" size={16} color="#fff" />
          <Text style={styles.primaryText}>New Fee Structure</Text>
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
        data={rows}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={Header}
        ListFooterComponent={Footer}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <StructureCard
            s={item}
            canUpdate={canUpdate}
            canDelete={canDelete}
            onEdit={() => setEditTarget(item)}
            onDelete={() => onDelete(item)}
            onView={() => setViewTarget(item)}
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
                  : 'No fee structures found'}
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

      <FeeStructureFormModal open={addOpen} onClose={() => setAddOpen(false)} />
      <FeeStructureFormModal
        open={!!editTarget}
        structure={editTarget}
        onClose={() => setEditTarget(null)}
      />
      <StructureDetailModal
        open={!!viewTarget}
        structure={viewTarget}
        onClose={() => setViewTarget(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: { padding: 14, paddingBottom: 32 },

  filterCard: { borderRadius: 14, padding: 12, borderWidth: 1, gap: 10 },
  label: { fontSize: 10, letterSpacing: 1.1, fontWeight: '700', marginBottom: 4 },
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
  },
  resultText: { fontSize: 12, fontWeight: '600' },

  card: { borderRadius: 14, padding: 12, gap: 10, borderWidth: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontSize: 15, fontWeight: '800' },
  meta: { fontSize: 11, marginTop: 2 },

  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  pillText: { fontSize: 10, fontWeight: '800' },

  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  stat: { flexBasis: '23%', flexGrow: 1 },
  statLabel: { fontSize: 9, letterSpacing: 1.1, fontWeight: '800' },
  statValue: { fontSize: 12, fontWeight: '800', marginTop: 2 },

  compList: { gap: 4 },
  compRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  compName: { flex: 1, fontSize: 12, fontWeight: '700' },
  compFreq: { fontSize: 11 },
  compAmount: { fontSize: 12, fontWeight: '800', minWidth: 80, textAlign: 'right' },

  helper: { fontSize: 11 },

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
  emptyText: { fontSize: 14, textAlign: 'center' },

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
