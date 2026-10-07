import { useEffect, useState } from 'react';
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
import { Feather } from '@expo/vector-icons';
import { useUserStore } from '../../../src/store/userStore';
import { isSuperAdmin } from '../../../src/utils/permissions';
import { usePackages, useDeletePackage } from '../../../src/hooks/usePackages';
import { fmtMoney } from '../../../src/constants/billing';
import PackageFormModal from '../../../src/component/system/PackageFormModal';
import PackageDetailModal from '../../../src/component/system/PackageDetailModal';
import ConfirmModal from '../../../src/component/system/ConfirmModal';
import { useColors } from '../../../src/theme/useColors';
import { COLORS } from '../../../src/theme/colors';

const PAGE_SIZE = 20;

const platformsOf = (p) =>
  Object.entries(p?.platforms || {})
    .filter(([, on]) => on)
    .map(([k]) => k);

function PackageCard({ p, onView, onEdit, onDeactivate, C }) {
  const platforms = platformsOf(p);
  return (
    <Pressable
      onPress={onView}
      style={({ pressed }) => [styles.card, { backgroundColor: C.card, borderColor: C.border }, pressed && { opacity: 0.92 }]}
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.name, { color: C.text }]} numberOfLines={1}>{p.name}</Text>
          <Text style={[styles.meta, { color: C.muted }]} numberOfLines={1}>
            {fmtMoney(p.price)} · {p.durationInDays}d
          </Text>
        </View>
        <View style={[styles.pill, { backgroundColor: p.isActive ? '#dcfce7' : '#f3f4f6' }]}>
          <Text style={[styles.pillText, { color: p.isActive ? '#166534' : '#374151' }]}>
            {p.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      <View style={[styles.statsRow, { borderTopColor: C.border }]}>
        <Stat label="Students" value={p.limits?.noOfStudents ?? '-'} C={C} />
        <Stat label="Branches" value={p.limits?.noOfBranches ?? '-'} C={C} />
        <Stat label="Platforms" value={platforms.length ? platforms.length : 'None'} C={C} />
        <Stat label="Features" value={p.features?.length ? p.features.length : 'All'} C={C} />
      </View>

      <View style={styles.actionsRow}>
        <Pressable onPress={onEdit} style={({ pressed }) => [styles.actionBtn, { backgroundColor: COLORS.brand }, pressed && { opacity: 0.9 }]}>
          <Feather name="edit-2" size={14} color="#fff" />
          <Text style={styles.actionBtnText}>Edit</Text>
        </Pressable>
        {p.isActive && (
          <Pressable onPress={onDeactivate} style={({ pressed }) => [styles.actionBtn, { backgroundColor: '#b91c1c' }, pressed && { opacity: 0.85 }]}>
            <Feather name="trash-2" size={14} color="#fff" />
            <Text style={styles.actionBtnText}>Deactivate</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

function Stat({ label, value, C }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statLabel, { color: C.mutedSoft }]}>{label.toUpperCase()}</Text>
      <Text style={[styles.statValue, { color: C.text }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

export default function PackagesScreen() {
  const C = useColors();
  const { user } = useUserStore();
  const allowed = isSuperAdmin(user?.role);

  const [tab, setTab] = useState('active'); // active | inactive
  const [page, setPage] = useState(1);
  const [draftSearch, setDraftSearch] = useState('');
  const [search, setSearch] = useState('');

  const [formTarget, setFormTarget] = useState(undefined); // undefined=closed, null=create, pkg=edit
  const [detailTarget, setDetailTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const isActive = tab === 'active';
  const { data, isLoading, isFetching, refetch, error } = usePackages({
    page,
    limit: PAGE_SIZE,
    filters: { search: search || undefined, isActive },
    enabled: allowed,
  });
  const rows = data?.data ?? [];
  const total = data?.total ?? rows.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // A delete can shrink the list; don't strand the user on a page past the end.
  useEffect(() => {
    if (data && page > totalPages) setPage(totalPages);
  }, [data, page, totalPages]);

  const del = useDeletePackage({ onSuccess: () => setDeleteTarget(null) });

  if (!allowed) {
    return (
      <View style={[styles.root, { backgroundColor: C.bg }]}>
        <View style={styles.center}><Feather name="lock" size={36} color={COLORS.red || '#dc2626'} /><Text style={[styles.title, { color: C.text }]}>No access</Text></View>
      </View>
    );
  }

  const Header = (
    <View style={{ gap: 12 }}>
      <View style={styles.headerTop}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: C.text }]}>Packages</Text>
          <Text style={[styles.sub, { color: C.muted }]}>Subscription plans available to schools</Text>
        </View>
        <Pressable onPress={() => setFormTarget(null)} style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.9 }]}>
          <Feather name="plus" size={16} color="#fff" />
          <Text style={styles.addBtnText}>Add</Text>
        </Pressable>
      </View>

      <View style={styles.tabRow}>
        {[{ k: 'active', l: 'Active' }, { k: 'inactive', l: 'Inactive' }].map((t) => {
          const on = tab === t.k;
          return (
            <Pressable
              key={t.k}
              onPress={() => { setTab(t.k); setPage(1); }}
              style={({ pressed }) => [styles.tab, { backgroundColor: C.card, borderColor: C.border }, on && styles.tabActive, pressed && { opacity: 0.85 }]}
            >
              <Text style={[styles.tabText, { color: on ? '#fff' : C.text }]}>{t.l}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.searchBox, { backgroundColor: C.card, borderColor: C.border }]}>
        <Feather name="search" size={16} color={C.mutedSoft} />
        <TextInput
          value={draftSearch}
          onChangeText={setDraftSearch}
          placeholder="Search packages by name..."
          placeholderTextColor={C.mutedSoft}
          style={[styles.searchInput, { color: C.text }]}
          onSubmitEditing={() => { setSearch(draftSearch.trim()); setPage(1); }}
          returnKeyType="search"
        />
        {!!search && (
          <Pressable onPress={() => { setDraftSearch(''); setSearch(''); setPage(1); }} hitSlop={8}>
            <Feather name="x" size={16} color={C.mutedSoft} />
          </Pressable>
        )}
      </View>

      <View style={styles.resultBar}>
        <Text style={[styles.resultText, { color: C.muted }]}>
          {isLoading ? 'Loading…' : `${total} ${total === 1 ? 'package' : 'packages'}`}
        </Text>
        {isFetching && !isLoading && <ActivityIndicator size="small" color={COLORS.brand} />}
      </View>
    </View>
  );

  const Footer = total > 0 ? (
    <View style={styles.pager}>
      <Pressable onPress={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} style={[styles.pagerBtn, page <= 1 && styles.pagerBtnDisabled]}>
        <Feather name="chevron-left" size={16} color={page <= 1 ? C.mutedSoft : '#fff'} />
      </Pressable>
      <Text style={[styles.pagerText, { color: C.muted }]}>Page {page} of {totalPages}</Text>
      <Pressable onPress={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={[styles.pagerBtn, page >= totalPages && styles.pagerBtnDisabled]}>
        <Feather name="chevron-right" size={16} color={page >= totalPages ? C.mutedSoft : '#fff'} />
      </Pressable>
    </View>
  ) : null;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <FlatList
        data={rows}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={Header}
        ListFooterComponent={Footer}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <PackageCard
            p={item}
            C={C}
            onView={() => setDetailTarget(item)}
            onEdit={() => setFormTarget(item)}
            onDeactivate={() => setDeleteTarget(item)}
          />
        )}
        ListEmptyComponent={
          !isLoading && (
            <View style={styles.empty}>
              <Feather name={error ? 'alert-circle' : 'inbox'} size={36} color={error ? COLORS.red : C.mutedSoft} />
              <Text style={[styles.emptyText, { color: C.muted }]}>
                {error ? error.message || 'Failed to load' : `No ${isActive ? 'active' : 'inactive'} packages`}
              </Text>
            </View>
          )
        }
        refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={COLORS.brand} />}
      />

      <PackageFormModal open={formTarget !== undefined} pkg={formTarget || null} onClose={() => setFormTarget(undefined)} />
      <PackageDetailModal open={!!detailTarget} pkg={detailTarget} onClose={() => setDetailTarget(null)} />
      <ConfirmModal
        open={!!deleteTarget}
        title="Deactivate Package"
        message={deleteTarget ? `Deactivate "${deleteTarget.name}"? It will be hidden from new assignments. Existing schools keep their current subscription.` : ''}
        confirmLabel="Deactivate"
        confirmTone="danger"
        loading={del.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => del.mutate(deleteTarget._id)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  listContent: { padding: 14, paddingBottom: 32 },

  headerTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  title: { fontSize: 24, fontWeight: '800' },
  sub: { fontSize: 13, marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 16, borderRadius: 10, backgroundColor: COLORS.brand },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  tabRow: { flexDirection: 'row', gap: 8 },
  tab: { flex: 1, height: 40, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  tabText: { fontSize: 13, fontWeight: '700' },

  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12 },
  searchInput: { flex: 1, fontSize: 14 },

  resultBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 2 },
  resultText: { fontSize: 12, fontWeight: '600' },

  card: { borderRadius: 14, padding: 12, gap: 10, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontSize: 15, fontWeight: '800' },
  meta: { fontSize: 11, marginTop: 2 },
  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  pillText: { fontSize: 10, fontWeight: '800' },

  statsRow: { flexDirection: 'row', gap: 6, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
  stat: { flex: 1 },
  statLabel: { fontSize: 9, letterSpacing: 1, fontWeight: '800' },
  statValue: { fontSize: 13, fontWeight: '800', marginTop: 2 },

  actionsRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 38, borderRadius: 10 },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  empty: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyText: { fontSize: 14, textAlign: 'center' },

  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 18 },
  pagerBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.brand, alignItems: 'center', justifyContent: 'center' },
  pagerBtnDisabled: { backgroundColor: '#e5e7eb' },
  pagerText: { fontSize: 13, fontWeight: '600' },
});
