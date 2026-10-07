import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { useRouter } from 'expo-router';
import { useUserStore } from '../../store/userStore';
import { canActOnBranch } from '../../utils/permissions';
import { useColors } from '../../theme/useColors';
import { COLORS } from '../../theme/colors';
import { useBranchesDropdown } from '../../hooks/useBranchProfilesList';
import {
  useAnnouncementsList,
  useArchiveAnnouncement,
  useDeleteAnnouncement,
  usePublishAnnouncement,
} from '../../hooks/useAnnouncements';
import {
  ANNOUNCEMENT_PRIORITIES,
  ANNOUNCEMENT_STATUSES,
  ANNOUNCEMENT_TYPES,
  PRIORITY_PILL,
  STATUS_PILL,
  TYPE_ICONS,
  TYPE_PILL,
  formatDateTime,
  titleCase,
} from '../../constants/announcement';
import ComposeAnnouncementModal from './ComposeAnnouncementModal';
import EditAnnouncementModal from './EditAnnouncementModal';
import ManageAttachmentsModal from './ManageAttachmentsModal';
import ReadStatsModal from './ReadStatsModal';

const BLANK_FILTERS = {
  search: '',
  status: '',
  type: '',
  priority: '',
  isPinned: '',
  fromDate: '',
  toDate: '',
  branchId: '',
};

export default function AnnouncementsListPanel() {
  const C = useColors();
  const router = useRouter();
  const { user } = useUserStore();
  const actions = user?.role?.actions || [];
  const isAdmin = !!user?.role?.isPredefined;

  const canCreate =
    isAdmin ||
    actions.includes('create-announcement') ||
    actions.includes('create-all-branch-announcement');
  const canPublish = isAdmin || actions.includes('publish-announcement');
  const canViewStats =
    isAdmin ||
    actions.includes('view-announcement') ||
    actions.includes('view-all-branch-announcement');
  const isOrgLevel = isAdmin || actions.includes('view-all-branch-announcement');

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draft, setDraft] = useState(BLANK_FILTERS);
  const [filters, setFilters] = useState(BLANK_FILTERS);
  const [page, setPage] = useState(1);

  const apply = () => {
    setFilters(draft);
    setPage(1);
    setFiltersOpen(false);
  };
  const clear = () => {
    setDraft(BLANK_FILTERS);
    setFilters(BLANK_FILTERS);
    setPage(1);
  };

  const { data, isLoading, isFetching, refetch } = useAnnouncementsList({
    page,
    limit: 20,
    filters,
    branchId: isOrgLevel ? filters.branchId : undefined,
  });
  const rows = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / 20));

  // A delete can shrink the list; don't strand the user on a page past the end.
  useEffect(() => {
    if (data && page > totalPages) setPage(totalPages);
  }, [data, page, totalPages]);

  const { data: branchData } = useBranchesDropdown({ enabled: isOrgLevel });
  const branches = branchData?.data || [];

  const [composeOpen, setComposeOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [statsTarget, setStatsTarget] = useState(null);
  const [attachmentsTarget, setAttachmentsTarget] = useState(null);
  const [actionTarget, setActionTarget] = useState(null);

  const deleteMutation = useDeleteAnnouncement({ onSuccess: () => setActionTarget(null) });
  const publishMutation = usePublishAnnouncement({ onSuccess: () => setActionTarget(null) });
  const archiveMutation = useArchiveAnnouncement({ onSuccess: () => setActionTarget(null) });

  const activeFiltersCount = useMemo(
    () =>
      Object.entries(filters).filter(([k, v]) => {
        if (k === 'branchId' && !isOrgLevel) return false;
        return v !== '' && v != null;
      }).length,
    [filters, isOrgLevel],
  );

  const renderItem = ({ item: a }) => (
    <Pressable
      onPress={() => router.push(`/(app)/announcements/${a._id}`)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: C.card, borderColor: C.border },
        pressed && { opacity: 0.92 },
      ]}
    >
      <View style={styles.cardTopRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            {a.isPinned && (
              <Feather name="bookmark" size={13} color="#92400e" style={{ marginRight: 4 }} />
            )}
            <Text style={[styles.cardTitle, { color: C.text }]} numberOfLines={2}>
              {a.title}
            </Text>
          </View>
          {a.serialNumber && (
            <Text style={[styles.meta, { color: C.mutedSoft }]}>
              {a.serialNumber}
              {a.attachments?.length > 0 ? `  ·  ${a.attachments.length} file${a.attachments.length > 1 ? 's' : ''}` : ''}
            </Text>
          )}
        </View>
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
      </View>

      <View style={styles.pillsRow}>
        <Pill bg={TYPE_PILL[a.type]?.bg} fg={TYPE_PILL[a.type]?.fg} icon={TYPE_ICONS[a.type]} label={titleCase(a.type)} />
        <Pill
          bg={PRIORITY_PILL[a.priority]?.bg}
          fg={PRIORITY_PILL[a.priority]?.fg}
          label={PRIORITY_PILL[a.priority]?.label}
        />
        <Pill
          bg={STATUS_PILL[a.status]?.bg}
          fg={STATUS_PILL[a.status]?.fg}
          label={STATUS_PILL[a.status]?.label}
        />
      </View>

      <Text style={[styles.body, { color: C.muted }]} numberOfLines={2}>
        {a.body}
      </Text>

      <View style={[styles.footer, { borderTopColor: C.border }]}>
        <Feather name="clock" size={11} color={C.mutedSoft} />
        <Text style={[styles.footerText, { color: C.mutedSoft }]}>
          {a.publishedAt ? formatDateTime(a.publishedAt) : 'Not published'}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.toolbar, { borderBottomColor: C.border }]}>
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
            onPress={() => setComposeOpen(true)}
            style={({ pressed }) => [styles.composeBtn, pressed && { opacity: 0.85 }]}
          >
            <Feather name="plus" size={15} color="#fff" />
            <Text style={styles.composeText}>Compose</Text>
          </Pressable>
        )}
      </View>

      {isLoading && rows.length === 0 ? (
        <View style={styles.empty}>
          <ActivityIndicator color={COLORS.brand} />
        </View>
      ) : rows.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="inbox" size={32} color={C.mutedSoft} />
          <Text style={[styles.emptyTitle, { color: C.text }]}>No announcements</Text>
          <Text style={[styles.emptySub, { color: C.muted, textAlign: 'center' }]}>
            {activeFiltersCount
              ? 'No results match your filters. Try clearing them.'
              : canCreate
              ? 'Tap Compose to send your first announcement.'
              : 'When admins post something, you’ll see it here.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(it) => it._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={refetch}
              tintColor={COLORS.brand}
            />
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
        showBranchFilter={isOrgLevel}
        C={C}
      />

      <ActionSheet
        target={actionTarget}
        onClose={() => setActionTarget(null)}
        user={user}
        canPublish={canPublish}
        canViewStats={canViewStats}
        onView={(row) => {
          setActionTarget(null);
          router.push(`/(app)/announcements/${row._id}`);
        }}
        onStats={(row) => {
          setActionTarget(null);
          setStatsTarget(row);
        }}
        onEdit={(row) => {
          setActionTarget(null);
          setEditTarget(row);
        }}
        onAttachments={(row) => {
          setActionTarget(null);
          setAttachmentsTarget(row);
        }}
        onPublish={(row) => publishMutation.mutate(row._id)}
        onArchive={(row) => archiveMutation.mutate(row._id)}
        onDelete={(row) => deleteMutation.mutate(row._id)}
        publishing={publishMutation.isPending}
        archiving={archiveMutation.isPending}
        deleting={deleteMutation.isPending}
        C={C}
      />

      <ComposeAnnouncementModal open={composeOpen} onClose={() => setComposeOpen(false)} />
      <EditAnnouncementModal
        open={!!editTarget}
        announcement={editTarget}
        onClose={() => setEditTarget(null)}
      />
      <ManageAttachmentsModal
        open={!!attachmentsTarget}
        announcement={attachmentsTarget}
        onClose={() => setAttachmentsTarget(null)}
      />
      <ReadStatsModal
        open={!!statsTarget}
        announcement={statsTarget}
        onClose={() => setStatsTarget(null)}
      />
    </View>
  );
}

function Pill({ bg, fg, icon, label }) {
  if (!label) return null;
  return (
    <View style={[styles.pill, { backgroundColor: bg || '#f3f4f6' }]}>
      {icon ? <Feather name={icon} size={10} color={fg || '#374151'} /> : null}
      <Text style={[styles.pillText, { color: fg || '#374151', marginLeft: icon ? 4 : 0 }]}>
        {label}
      </Text>
    </View>
  );
}

function FiltersModal({ open, onClose, draft, setDraft, onApply, onClear, branches, showBranchFilter, C }) {
  return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalSafe, { backgroundColor: C.bg }]}>
        <View style={[styles.modalHeader, { backgroundColor: C.card, borderBottomColor: C.border }]}>
          <Text style={[styles.modalTitle, { color: C.text }]}>Filters</Text>
          <Pressable
            onPress={onClose}
            hitSlop={10}
            style={({ pressed }) => [
              styles.closeBtn,
              { backgroundColor: C.bg },
              pressed && { opacity: 0.6 },
            ]}
          >
            <Feather name="x" size={18} color={C.text} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
          <View>
            <Text style={[styles.fLabel, { color: C.muted }]}>SEARCH</Text>
            <TextInput
              value={draft.search}
              onChangeText={(v) => setDraft({ ...draft, search: v })}
              placeholder="Title or body…"
              placeholderTextColor={C.mutedSoft}
              style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.card }]}
            />
          </View>

          <ChipGroup
            label="STATUS"
            options={[{ value: '', label: 'All' }, ...ANNOUNCEMENT_STATUSES.map((s) => ({ value: s, label: titleCase(s) }))]}
            value={draft.status}
            onChange={(v) => setDraft({ ...draft, status: v })}
            C={C}
          />

          <ChipGroup
            label="TYPE"
            options={[{ value: '', label: 'All' }, ...ANNOUNCEMENT_TYPES.map((t) => ({ value: t, label: titleCase(t) }))]}
            value={draft.type}
            onChange={(v) => setDraft({ ...draft, type: v })}
            C={C}
          />

          <ChipGroup
            label="PRIORITY"
            options={[{ value: '', label: 'All' }, ...ANNOUNCEMENT_PRIORITIES.map((p) => ({ value: p, label: titleCase(p) }))]}
            value={draft.priority}
            onChange={(v) => setDraft({ ...draft, priority: v })}
            C={C}
          />

          <ChipGroup
            label="PINNED"
            options={[
              { value: '', label: 'All' },
              { value: 'true', label: 'Pinned only' },
              { value: 'false', label: 'Not pinned' },
            ]}
            value={draft.isPinned}
            onChange={(v) => setDraft({ ...draft, isPinned: v })}
            C={C}
          />

          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fLabel, { color: C.muted }]}>FROM (YYYY-MM-DD)</Text>
              <TextInput
                value={draft.fromDate}
                onChangeText={(v) => setDraft({ ...draft, fromDate: v })}
                placeholder="optional"
                placeholderTextColor={C.mutedSoft}
                keyboardType="numbers-and-punctuation"
                autoCapitalize="none"
                style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.card }]}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fLabel, { color: C.muted }]}>TO (YYYY-MM-DD)</Text>
              <TextInput
                value={draft.toDate}
                onChangeText={(v) => setDraft({ ...draft, toDate: v })}
                placeholder="optional"
                placeholderTextColor={C.mutedSoft}
                keyboardType="numbers-and-punctuation"
                autoCapitalize="none"
                style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.card }]}
              />
            </View>
          </View>

          {showBranchFilter && (
            <ChipGroup
              label="BRANCH"
              options={[{ value: '', label: 'All branches' }, ...branches.map((b) => ({ value: b._id, label: b.name }))]}
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
          <Pressable
            onPress={onApply}
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
          >
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

function ActionSheet({
  target,
  onClose,
  user,
  canPublish: canPublishAction,
  canViewStats,
  onView,
  onStats,
  onEdit,
  onAttachments,
  onPublish,
  onArchive,
  onDelete,
  publishing,
  archiving,
  deleting,
  C,
}) {
  if (!target) return null;
  // Branch reach (API rule): a branch-tier manager only manages notices of
  // their own branch — never another branch's, nor a school-wide one (no
  // branchId), which belongs to the org level.
  const canUpdate = canActOnBranch(user, 'update-announcement', target.branchId);
  // Publish/archive also run the update branch check server-side.
  const canPublish = canPublishAction && canUpdate;
  // Deleting a live notice withdraws it from readers — a publish decision.
  const canDelete =
    canActOnBranch(user, 'delete-announcement', target.branchId) &&
    (target.status !== 'published' || canPublishAction);
  const items = [{ key: 'view', label: 'View', icon: 'eye', onPress: () => onView(target) }];
  if (canViewStats) items.push({ key: 'stats', label: 'Read Stats', icon: 'bar-chart-2', onPress: () => onStats(target) });
  if (canUpdate) {
    items.push({ key: 'edit', label: 'Edit', icon: 'edit-3', onPress: () => onEdit(target) });
    items.push({ key: 'attachments', label: 'Attachments', icon: 'paperclip', onPress: () => onAttachments(target) });
  }
  if (canPublish && target.status !== 'published') {
    items.push({
      key: 'publish',
      label: publishing ? 'Publishing…' : 'Publish',
      icon: 'send',
      onPress: () => onPublish(target),
      disabled: publishing,
    });
  }
  if (canPublish && target.status === 'published') {
    items.push({
      key: 'archive',
      label: archiving ? 'Archiving…' : 'Archive',
      icon: 'archive',
      onPress: () => onArchive(target),
      disabled: archiving,
    });
  }
  if (canDelete)
    items.push({
      key: 'delete',
      label: deleting ? 'Deleting…' : 'Delete',
      icon: 'trash-2',
      onPress: () => onDelete(target),
      destructive: true,
      disabled: deleting,
    });

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.actionBackdrop} onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[styles.actionSheet, { backgroundColor: C.card }]}
        >
          <View style={[styles.actionGrabber, { backgroundColor: C.border }]} />
          <Text style={[styles.actionTitle, { color: C.text }]} numberOfLines={1}>
            {target.title}
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
              <Feather
                name={it.icon}
                size={16}
                color={it.destructive ? '#dc2626' : COLORS.brand}
              />
              <Text
                style={[
                  styles.actionItemText,
                  { color: it.destructive ? '#dc2626' : C.text },
                ]}
              >
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

  composeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.brand,
  },
  composeText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  listContent: { padding: 12, gap: 10, paddingBottom: 32 },

  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  cardTitle: { fontSize: 15, fontWeight: '800', flexShrink: 1 },
  meta: { fontSize: 11, marginTop: 3 },
  menuBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  pillText: { fontSize: 10, fontWeight: '700' },

  body: { fontSize: 13, marginTop: 8, lineHeight: 18 },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerText: { fontSize: 11 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
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

  // Filters modal
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
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  row2: { flexDirection: 'row', gap: 10 },
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

  // Action sheet
  actionBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
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
