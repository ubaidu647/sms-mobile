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
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useBranches } from '../../src/hooks/useBranches';
import AddBranchModal from '../../src/component/AddBranchModal';
import BranchActionsSheet from '../../src/component/BranchActionsSheet';
import { useUserStore } from '../../src/store/userStore';
import { useColors } from '../../src/theme/useColors';

const COLOR = {
  bg: '#f3f4f6',
  card: '#ffffff',
  border: '#e5e7eb',
  text: '#111827',
  muted: '#6b7280',
  mutedSoft: '#9ca3af',
  teal600: '#0d9488',
  teal700: '#0f766e',
  amber500: '#f59e0b',
  indigo600: '#4f46e5',
  red500: '#ef4444',
};

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'disabled', label: 'Disabled' },
];

const STATUS_PILL = {
  active: { bg: '#dcfce7', fg: '#166534' },
  inactive: { bg: '#fef3c7', fg: '#92400e' },
  disabled: { bg: '#fee2e2', fg: '#991b1b' },
};

function StatusPill({ value }) {
  const c = STATUS_PILL[value] || { bg: '#e5e7eb', fg: '#374151' };
  const label = value ? value.charAt(0).toUpperCase() + value.slice(1) : '—';
  return (
    <View style={[styles.pill, { backgroundColor: c.bg }]}>
      <Text style={[styles.pillText, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

function ActionButton({ icon, label, bg, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionBtn,
        { backgroundColor: bg },
        pressed && { opacity: 0.9 },
      ]}
    >
      <Feather name={icon} size={18} color="#fff" />
      <Text style={styles.actionBtnText}>{label}</Text>
    </Pressable>
  );
}

function BranchCard({ item, index, onPress, onMenu }) {
  const initial = (item.name?.[0] || '?').toUpperCase();
  const C = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: C.card, borderColor: C.border },
        pressed && { opacity: 0.92 },
      ]}
    >
      <View style={styles.cardTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={styles.cardTitleRow}>
            <Text style={[styles.cardName, { color: C.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.cardIndex, { color: C.mutedSoft }]}>#{index}</Text>
          </View>
          {!!item.serialNumber && (
            <Text style={[styles.cardCode, { color: C.muted }]}>Code · {item.serialNumber}</Text>
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

      {!!item.address && (
        <View style={styles.metaRow}>
          <Feather name="map-pin" size={13} color={C.mutedSoft} />
          <Text style={[styles.metaText, { color: C.muted }]} numberOfLines={2}>
            {item.address}
          </Text>
        </View>
      )}
      {!!item.phone && (
        <View style={styles.metaRow}>
          <Feather name="phone" size={13} color={C.mutedSoft} />
          <Text style={[styles.metaText, { color: C.muted }]}>{item.phone}</Text>
        </View>
      )}
      {!!item.email && (
        <View style={styles.metaRow}>
          <Feather name="mail" size={13} color={C.mutedSoft} />
          <Text style={[styles.metaText, { color: C.muted }]} numberOfLines={1}>
            {item.email}
          </Text>
        </View>
      )}

      <View style={[styles.cardFooter, { borderTopColor: C.border }]}>
        <Text style={[styles.cardDate, { color: C.mutedSoft }]}>
          Created {new Date(item.createdAt).toLocaleDateString()}
        </Text>
        <StatusPill value={item.status} />
      </View>
    </Pressable>
  );
}

export default function BranchesScreen() {
  const router = useRouter();
  const { user } = useUserStore();
  const C = useColors();
  const isAdmin = !!user?.role?.isPredefined;
  const actions = user?.role?.actions || [];
  const canViewAllProfiles =
    isAdmin ||
    actions.includes('view-all-branch-profile') ||
    actions.includes('view-branch');
  const canCreateBranch = isAdmin || actions.includes('create-branch');

  const [draftSearch, setDraftSearch] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [addOpen, setAddOpen] = useState(false);
  const [actionsFor, setActionsFor] = useState(null);

  const openProfile = (branch) =>
    router.push(`/(app)/branches/${branch._id}/profile`);
  const openDetails = (branch) =>
    router.push(`/(app)/branches/${branch._id}`);
  const openMyProfile = () => router.push('/(app)/branches/my-profile');
  const openAllProfiles = () => router.push('/(app)/branches/all-profiles');
  const openActions = (branch) => setActionsFor(branch);
  const closeActions = () => setActionsFor(null);

  const { data, isLoading, isFetching, refetch, error } = useBranches({
    page,
    limit,
    search,
    status,
  });

  const branches = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // A delete can shrink the list; don't strand the user on a page past the end.
  useEffect(() => {
    if (data && page > totalPages) setPage(totalPages);
  }, [data, page, totalPages]);

  const applySearch = () => {
    setPage(1);
    setSearch(draftSearch.trim());
  };

  const clearFilters = () => {
    setDraftSearch('');
    setSearch('');
    setStatus('');
    setPage(1);
  };

  const hasActiveFilters = !!search || !!status;

  const ListHeader = (
    <View style={{ gap: 16 }}>
      <View>
        <Text style={[styles.title, { color: C.text }]}>Branches</Text>
        <Text style={[styles.subtitle, { color: C.muted }]}>
          Manage branch locations and their report branding
        </Text>
      </View>

      <View style={styles.actionGrid}>
        <ActionButton
          icon="home"
          label="My Branch Profile"
          bg={COLOR.amber500}
          onPress={openMyProfile}
        />
        {canViewAllProfiles && (
          <ActionButton
            icon="grid"
            label="All Profiles"
            bg={COLOR.indigo600}
            onPress={openAllProfiles}
          />
        )}
        {canCreateBranch && (
          <ActionButton
            icon="plus"
            label="Add Branch"
            bg={COLOR.teal600}
            onPress={() => setAddOpen(true)}
          />
        )}
      </View>

      <View style={[styles.filterCard, { backgroundColor: C.card, borderColor: C.border }]}>
        <View style={[styles.searchRow, { borderColor: C.border, backgroundColor: C.bg }]}>
          <Feather name="search" size={16} color={C.mutedSoft} />
          <TextInput
            value={draftSearch}
            onChangeText={setDraftSearch}
            placeholder="Search branches..."
            placeholderTextColor={C.mutedSoft}
            returnKeyType="search"
            onSubmitEditing={applySearch}
            style={[styles.searchInput, { color: C.text }]}
          />
          {!!draftSearch && (
            <Pressable onPress={() => setDraftSearch('')} hitSlop={8}>
              <Feather name="x" size={16} color={C.muted} />
            </Pressable>
          )}
        </View>

        <View style={styles.chipRow}>
          {STATUS_OPTIONS.map((opt) => {
            const active = status === opt.value;
            return (
              <Pressable
                key={opt.value || 'all'}
                onPress={() => {
                  setStatus(opt.value);
                  setPage(1);
                }}
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

        <View style={styles.filterBtnRow}>
          <Pressable onPress={applySearch} style={[styles.filterBtn, styles.filterBtnPrimary]}>
            <Feather name="search" size={14} color="#fff" />
            <Text style={styles.filterBtnPrimaryText}>Search</Text>
          </Pressable>
          <Pressable
            onPress={clearFilters}
            style={[styles.filterBtn, styles.filterBtnGhost, { backgroundColor: C.bg, borderColor: C.border }]}
            disabled={!hasActiveFilters}
          >
            <Feather
              name="x"
              size={14}
              color={hasActiveFilters ? C.text : C.mutedSoft}
            />
            <Text
              style={[
                styles.filterBtnGhostText,
                { color: hasActiveFilters ? C.text : C.mutedSoft },
              ]}
            >
              Clear
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.resultBar}>
        <Text style={[styles.resultText, { color: C.muted }]}>
          {isLoading ? 'Loading…' : `${total} ${total === 1 ? 'branch' : 'branches'}`}
        </Text>
        {isFetching && !isLoading && (
          <ActivityIndicator size="small" color={COLOR.teal600} />
        )}
      </View>
    </View>
  );

  const ListFooter = total > 0 && (
    <View style={styles.pager}>
      <View style={styles.limitRow}>
        <Text style={[styles.limitLabel, { color: C.muted }]}>Per page:</Text>
        {[10, 20, 50].map((n) => {
          const active = limit === n;
          return (
            <Pressable
              key={n}
              onPress={() => {
                setLimit(n);
                setPage(1);
              }}
              style={[
                styles.limitChip,
                { backgroundColor: C.card, borderColor: C.border },
                active && styles.limitChipActive,
              ]}
            >
              <Text
                style={[
                  styles.limitChipText,
                  { color: C.text },
                  active && styles.limitChipTextActive,
                ]}
              >
                {n}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.pagerRow}>
        <Pressable
          onPress={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          style={[styles.pagerBtn, page <= 1 && styles.pagerBtnDisabled]}
        >
          <Feather name="chevron-left" size={16} color={page <= 1 ? COLOR.mutedSoft : '#fff'} />
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
            color={page >= totalPages ? COLOR.mutedSoft : '#fff'}
          />
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={[styles.safe, { backgroundColor: C.bg }]}>
      {error && !isLoading ? (
        <View style={styles.center}>
          <Feather name="alert-circle" size={32} color={COLOR.red500} />
          <Text style={[styles.errorText, { color: C.muted }]}>
            {error?.response?.data?.message || error?.message || 'Failed to load branches'}
          </Text>
          <Pressable onPress={() => refetch()} style={styles.retryBtn}>
            <Feather name="refresh-cw" size={14} color="#fff" />
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={branches}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={ListFooter}
          renderItem={({ item, index }) => (
            <BranchCard
              item={item}
              index={(page - 1) * limit + index + 1}
              onPress={() => openDetails(item)}
              onMenu={() => openActions(item)}
            />
          )}
          ListEmptyComponent={
            !isLoading && (
              <View style={styles.empty}>
                <Feather name="inbox" size={36} color={C.mutedSoft} />
                <Text style={[styles.emptyText, { color: C.muted }]}>No branches found</Text>
                {hasActiveFilters && (
                  <Pressable onPress={clearFilters} style={styles.emptyBtn}>
                    <Text style={styles.emptyBtnText}>Clear filters</Text>
                  </Pressable>
                )}
              </View>
            )
          }
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={refetch}
              tintColor={COLOR.teal600}
            />
          }
        />
      )}

      <AddBranchModal open={addOpen} onClose={() => setAddOpen(false)} />

      <BranchActionsSheet
        open={!!actionsFor}
        branchName={actionsFor?.name}
        onClose={closeActions}
        onProfile={() => {
          const b = actionsFor;
          closeActions();
          if (b) openProfile(b);
        }}
        onView={() => {
          const b = actionsFor;
          closeActions();
          if (b) openDetails(b);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLOR.bg },

  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLOR.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLOR.border,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topbarTitle: { fontSize: 16, fontWeight: '700', color: COLOR.text },

  listContent: { padding: 14, paddingBottom: 32 },

  title: { fontSize: 26, fontWeight: '800', color: COLOR.text },
  subtitle: { fontSize: 13, color: COLOR.muted, marginTop: 4, lineHeight: 18 },

  actionGrid: { gap: 8 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  filterCard: {
    backgroundColor: COLOR.card,
    borderRadius: 14,
    padding: 12,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLOR.border,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: COLOR.border,
    borderRadius: 10,
    backgroundColor: '#f9fafb',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLOR.text,
    paddingVertical: 0,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: COLOR.border,
  },
  chipActive: { backgroundColor: COLOR.teal600, borderColor: COLOR.teal600 },
  chipText: { color: '#374151', fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#fff' },

  filterBtnRow: { flexDirection: 'row', gap: 8 },
  filterBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  filterBtnPrimary: { backgroundColor: COLOR.teal600 },
  filterBtnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  filterBtnGhost: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: COLOR.border,
  },
  filterBtnGhostText: { color: COLOR.text, fontWeight: '700', fontSize: 13 },

  resultBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
    marginTop: 4,
    marginBottom: -4,
  },
  resultText: { color: COLOR.muted, fontSize: 12, fontWeight: '600' },

  card: {
    backgroundColor: COLOR.card,
    borderRadius: 14,
    padding: 14,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLOR.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLOR.teal600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  cardName: { fontSize: 16, fontWeight: '700', color: COLOR.text, flexShrink: 1 },
  cardIndex: { fontSize: 11, color: COLOR.mutedSoft, fontWeight: '600' },
  cardCode: { fontSize: 12, color: COLOR.muted, marginTop: 2 },
  menuBtn: { padding: 6, marginLeft: 4 },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { flex: 1, fontSize: 13, color: COLOR.muted },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLOR.border,
  },
  cardDate: { fontSize: 11, color: COLOR.mutedSoft },

  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillText: { fontSize: 11, fontWeight: '700' },

  pager: { paddingTop: 18, gap: 12 },
  limitRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  limitLabel: { fontSize: 12, color: COLOR.muted, marginRight: 4 },
  limitChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: COLOR.border,
  },
  limitChipActive: { backgroundColor: COLOR.teal600, borderColor: COLOR.teal600 },
  limitChipText: { fontSize: 12, fontWeight: '600', color: COLOR.text },
  limitChipTextActive: { color: '#fff' },
  pagerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pagerBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLOR.teal600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pagerBtnDisabled: { backgroundColor: '#e5e7eb' },
  pagerText: { color: COLOR.muted, fontSize: 13, fontWeight: '600' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  errorText: { color: COLOR.muted, textAlign: 'center', fontSize: 14 },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: COLOR.teal600,
    borderRadius: 10,
  },
  retryBtnText: { color: '#fff', fontWeight: '700' },

  empty: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyText: { color: COLOR.muted, fontSize: 14 },
  emptyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLOR.teal600,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
