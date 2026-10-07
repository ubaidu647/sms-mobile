import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import {
  useAcknowledgeAnnouncement,
  useAnnouncementDetail,
  useArchiveAnnouncement,
  useDeleteAnnouncement,
  useMarkAnnouncementRead,
  usePublishAnnouncement,
} from '../../../../src/hooks/useAnnouncements';
import { useUserStore } from '../../../../src/store/userStore';
import { canActOnBranch } from '../../../../src/utils/permissions';
import { openSafeUrl } from '../../../../src/utils/openSafeUrl';
import { useColors } from '../../../../src/theme/useColors';
import { COLORS } from '../../../../src/theme/colors';
import {
  PRIORITY_PILL,
  SCOPE_LABELS,
  STATUS_PILL,
  TYPE_ICONS,
  TYPE_PILL,
  formatBytes,
  formatDateTime,
  titleCase,
} from '../../../../src/constants/announcement';
import EditAnnouncementModal from '../../../../src/component/announcement/EditAnnouncementModal';
import ManageAttachmentsModal from '../../../../src/component/announcement/ManageAttachmentsModal';
import ReadStatsModal from '../../../../src/component/announcement/ReadStatsModal';
import QueryErrorState from '../../../../src/component/QueryErrorState';

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

export default function AnnouncementDetailScreen() {
  const router = useRouter();
  const C = useColors();
  const { announcementId } = useLocalSearchParams();
  const { user } = useUserStore();

  const actions = user?.role?.actions || [];
  const isAdmin = !!user?.role?.isPredefined;
  const canPublishAction = isAdmin || actions.includes('publish-announcement');
  const canViewStats =
    isAdmin ||
    actions.includes('view-announcement') ||
    actions.includes('view-all-branch-announcement');

  const { data: a, isLoading, isError, error, refetch } = useAnnouncementDetail({ id: announcementId });

  // Branch reach (API rule): a branch-tier manager only manages notices of
  // their own branch — never another branch's, nor a school-wide one (no
  // branchId), which belongs to the org level.
  const canUpdate = canActOnBranch(user, 'update-announcement', a?.branchId);
  // Publish/archive also run the update branch check server-side.
  const canPublish = canPublishAction && canUpdate;
  // Deleting a live notice withdraws it from readers — a publish decision.
  const canDelete =
    canActOnBranch(user, 'delete-announcement', a?.branchId) &&
    (a?.status !== 'published' || canPublishAction);

  const markRead = useMarkAnnouncementRead();
  const acknowledge = useAcknowledgeAnnouncement();

  const publishMutation = usePublishAnnouncement({ onSuccess: () => refetch() });
  const archiveMutation = useArchiveAnnouncement({ onSuccess: () => refetch() });
  const deleteMutation = useDeleteAnnouncement({
    onSuccess: () => {
      if (router.canGoBack()) router.back();
      else router.replace('/(app)/announcements');
    },
  });

  const [editOpen, setEditOpen] = useState(false);
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);

  if (isError) {
    return (
      <View style={[styles.root, { backgroundColor: C.bg }]}>
        <Header onBack={() => router.back()} C={C} title="Announcement" />
        <QueryErrorState error={error} fallback="Could not load this announcement" />
      </View>
    );
  }

  if (isLoading || !a) {
    return (
      <View style={[styles.root, { backgroundColor: C.bg }]}>
        <Header onBack={() => router.back()} C={C} title="Announcement" />
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.brand} />
        </View>
      </View>
    );
  }

  const priorityPill = PRIORITY_PILL[a.priority];
  const audienceLabel = SCOPE_LABELS[a.audience?.scope] || a.audience?.scope || '—';
  const userTypes = (a.audience?.targetUserTypes || []).join(', ');

  const confirmDelete = () =>
    Alert.alert(
      'Delete announcement?',
      `Delete "${a.title}"? This soft-deletes; it disappears from all views.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(a._id),
        },
      ],
    );

  const confirmPublish = () =>
    Alert.alert(
      'Publish announcement?',
      `Publish "${a.title}"? It will be visible to its audience immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Publish', onPress: () => publishMutation.mutate(a._id) },
      ],
    );

  const confirmArchive = () =>
    Alert.alert(
      'Archive announcement?',
      `Archive "${a.title}"? It will be hidden from the feed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Archive', onPress: () => archiveMutation.mutate(a._id) },
      ],
    );

  return (
    <View style={[styles.root, { backgroundColor: C.bg }]}>
      <Header
        onBack={() => router.back()}
        C={C}
        title="Announcement"
        right={
          canViewStats ? (
            <Pressable
              onPress={() => setStatsOpen(true)}
              hitSlop={10}
              style={({ pressed }) => [
                styles.iconBtn,
                { backgroundColor: C.card, borderColor: C.border },
                pressed && { opacity: 0.6 },
              ]}
            >
              <Feather name="bar-chart-2" size={16} color={C.text} />
            </Pressable>
          ) : null
        }
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={styles.pillsRow}>
            {a.isPinned && (
              <Pill bg="#fef3c7" fg="#92400e" icon="bookmark" label="Pinned" />
            )}
            <Pill
              bg={TYPE_PILL[a.type]?.bg}
              fg={TYPE_PILL[a.type]?.fg}
              icon={TYPE_ICONS[a.type] || 'file-text'}
              label={titleCase(a.type)}
            />
            <Pill
              bg={priorityPill?.bg}
              fg={priorityPill?.fg}
              label={priorityPill?.label}
            />
            <Pill
              bg={STATUS_PILL[a.status]?.bg}
              fg={STATUS_PILL[a.status]?.fg}
              label={STATUS_PILL[a.status]?.label}
            />
            {a.requiresAck && (
              <Pill bg="#eef2ff" fg="#3730a3" label="Ack required" />
            )}
          </View>

          <Text style={[styles.title, { color: C.text }]}>{a.title}</Text>
          {a.serialNumber && (
            <Text style={[styles.serial, { color: C.mutedSoft }]}>{a.serialNumber}</Text>
          )}

          <View style={styles.metaRow}>
            <Feather name="clock" size={12} color={C.mutedSoft} />
            <Text style={[styles.metaText, { color: C.mutedSoft }]}>
              {a.publishedAt ? formatDateTime(a.publishedAt) : 'Not published'}
              {a.expiresAt ? `  ·  expires ${formatDateTime(a.expiresAt)}` : ''}
            </Text>
          </View>

          <Text style={[styles.body, { color: C.text }]}>{a.body}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[styles.sectionTitle, { color: C.muted }]}>AUDIENCE</Text>
          <View style={styles.kv}>
            <Text style={[styles.kvKey, { color: C.muted }]}>Scope</Text>
            <Text style={[styles.kvVal, { color: C.text }]}>{audienceLabel}</Text>
          </View>
          <View style={styles.kv}>
            <Text style={[styles.kvKey, { color: C.muted }]}>Notify</Text>
            <Text style={[styles.kvVal, { color: C.text }]}>{userTypes || '—'}</Text>
          </View>
          {a.audience?.branchIds?.length > 0 && (
            <View style={styles.kv}>
              <Text style={[styles.kvKey, { color: C.muted }]}>Branches</Text>
              <Text style={[styles.kvVal, { color: C.text }]}>
                {a.audience.branchIds.length}
              </Text>
            </View>
          )}
          {a.audience?.classIds?.length > 0 && (
            <View style={styles.kv}>
              <Text style={[styles.kvKey, { color: C.muted }]}>Classes</Text>
              <Text style={[styles.kvVal, { color: C.text }]}>
                {a.audience.classIds.length}
              </Text>
            </View>
          )}
          {a.audience?.sectionIds?.length > 0 && (
            <View style={styles.kv}>
              <Text style={[styles.kvKey, { color: C.muted }]}>Sections</Text>
              <Text style={[styles.kvVal, { color: C.text }]}>
                {a.audience.sectionIds.length}
              </Text>
            </View>
          )}
          {a.audience?.staffIds?.length > 0 && (
            <View style={styles.kv}>
              <Text style={[styles.kvKey, { color: C.muted }]}>Staff</Text>
              <Text style={[styles.kvVal, { color: C.text }]}>
                {a.audience.staffIds.length}
              </Text>
            </View>
          )}
        </View>

        {a.attachments?.length > 0 && (
          <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[styles.sectionTitle, { color: C.muted }]}>
              ATTACHMENTS  ·  {a.attachments.length}
            </Text>
            {a.attachments.map((att) => (
              <Pressable
                key={att._id || att.url}
                onPress={() => openSafeUrl(att.url)}
                style={({ pressed }) => [
                  styles.attachRow,
                  { backgroundColor: C.bg, borderColor: C.border },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <View style={styles.attachIcon}>
                  <Feather name="paperclip" size={14} color={COLORS.brand} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.attachName, { color: C.text }]} numberOfLines={1}>
                    {att.name}
                  </Text>
                  <Text style={[styles.attachMeta, { color: C.mutedSoft }]}>
                    {att.mimeType}
                    {att.size != null ? `  ·  ${formatBytes(att.size)}` : ''}
                  </Text>
                </View>
                <Feather name="external-link" size={14} color={C.muted} />
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.actionsBlock}>
          {a.requiresAck && !a.acknowledged && (
            <Pressable
              onPress={() => acknowledge.mutate(a._id)}
              disabled={acknowledge.isPending}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: '#4f46e5' },
                (acknowledge.isPending || pressed) && { opacity: 0.85 },
              ]}
            >
              {acknowledge.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="check" size={15} color="#fff" />
                  <Text style={styles.primaryText}>I have read this</Text>
                </>
              )}
            </Pressable>
          )}
          {!a.isRead && !(a.requiresAck && !a.acknowledged) && (
            <Pressable
              onPress={() => markRead.mutate(a._id)}
              disabled={markRead.isPending}
              style={({ pressed }) => [
                styles.secondaryBtn,
                { backgroundColor: C.card, borderColor: COLORS.brand },
                (markRead.isPending || pressed) && { opacity: 0.85 },
              ]}
            >
              <Text style={[styles.secondaryText, { color: COLORS.brand }]}>Mark as read</Text>
            </Pressable>
          )}
          {canUpdate && (
            <Pressable
              onPress={() => setEditOpen(true)}
              style={({ pressed }) => [
                styles.secondaryBtn,
                { backgroundColor: C.card, borderColor: C.border },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Feather name="edit-3" size={15} color={C.text} />
              <Text style={[styles.secondaryText, { color: C.text }]}>Edit</Text>
            </Pressable>
          )}
          {canUpdate && (
            <Pressable
              onPress={() => setAttachmentsOpen(true)}
              style={({ pressed }) => [
                styles.secondaryBtn,
                { backgroundColor: C.card, borderColor: C.border },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Feather name="paperclip" size={15} color={C.text} />
              <Text style={[styles.secondaryText, { color: C.text }]}>Attachments</Text>
            </Pressable>
          )}
          {canPublish && a.status !== 'published' && (
            <Pressable
              onPress={confirmPublish}
              disabled={publishMutation.isPending}
              style={({ pressed }) => [
                styles.primaryBtn,
                (publishMutation.isPending || pressed) && { opacity: 0.85 },
              ]}
            >
              {publishMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="send" size={15} color="#fff" />
                  <Text style={styles.primaryText}>Publish</Text>
                </>
              )}
            </Pressable>
          )}
          {canPublish && a.status === 'published' && (
            <Pressable
              onPress={confirmArchive}
              disabled={archiveMutation.isPending}
              style={({ pressed }) => [
                styles.secondaryBtn,
                { backgroundColor: C.card, borderColor: C.border },
                (archiveMutation.isPending || pressed) && { opacity: 0.85 },
              ]}
            >
              <Feather name="archive" size={15} color={C.text} />
              <Text style={[styles.secondaryText, { color: C.text }]}>Archive</Text>
            </Pressable>
          )}
          {canDelete && (
            <Pressable
              onPress={confirmDelete}
              disabled={deleteMutation.isPending}
              style={({ pressed }) => [
                styles.secondaryBtn,
                { backgroundColor: '#fee2e2', borderColor: '#fecaca' },
                (deleteMutation.isPending || pressed) && { opacity: 0.85 },
              ]}
            >
              <Feather name="trash-2" size={15} color="#dc2626" />
              <Text style={[styles.secondaryText, { color: '#dc2626' }]}>Delete</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      <EditAnnouncementModal
        open={editOpen}
        announcement={a}
        onClose={() => {
          setEditOpen(false);
          refetch();
        }}
      />
      <ManageAttachmentsModal
        open={attachmentsOpen}
        announcement={a}
        onClose={() => {
          setAttachmentsOpen(false);
          refetch();
        }}
      />
      <ReadStatsModal
        open={statsOpen}
        announcement={a}
        onClose={() => setStatsOpen(false)}
      />
    </View>
  );
}

function Header({ onBack, title, right, C }) {
  return (
    <View style={[styles.header, { backgroundColor: C.card, borderBottomColor: C.border }]}>
      <Pressable
        onPress={onBack}
        hitSlop={10}
        style={({ pressed }) => [
          styles.iconBtn,
          { backgroundColor: C.bg, borderColor: C.border },
          pressed && { opacity: 0.6 },
        ]}
      >
        <Feather name="chevron-left" size={18} color={C.text} />
      </Pressable>
      <Text style={[styles.headerTitle, { color: C.text }]}>{title}</Text>
      <View style={{ minWidth: 36 }}>{right || null}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 50,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '800' },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  scroll: { padding: 14, gap: 12, paddingBottom: 36 },

  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  pillText: { fontSize: 10, fontWeight: '700' },

  title: { fontSize: 19, fontWeight: '800', marginTop: 10 },
  serial: { fontSize: 11, marginTop: 4 },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  metaText: { fontSize: 11, fontWeight: '600' },

  body: { fontSize: 14, marginTop: 14, lineHeight: 21 },

  sectionTitle: { fontSize: 10, letterSpacing: 1.1, fontWeight: '800', marginBottom: 8 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  kvKey: { fontSize: 12 },
  kvVal: { fontSize: 12, fontWeight: '700', maxWidth: '60%', textAlign: 'right' },

  attachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 6,
  },
  attachIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.brand + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachName: { fontSize: 12, fontWeight: '700' },
  attachMeta: { fontSize: 11, marginTop: 2 },

  actionsBlock: { gap: 8 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.brand,
    height: 44,
    borderRadius: 12,
  },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
  },
  secondaryText: { fontWeight: '700', fontSize: 13 },
});
