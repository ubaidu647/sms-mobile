import { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { openSafeUrl } from '../../utils/openSafeUrl';
import { useColors } from '../../theme/useColors';
import { COLORS } from '../../theme/colors';
import {
  useAcknowledgeAnnouncement,
  useAnnouncementFeed,
  useMarkAnnouncementRead,
} from '../../hooks/useAnnouncements';
import {
  PRIORITY_PILL,
  TYPE_ICONS,
  TYPE_PILL,
  formatBytes,
  formatDateTime,
  titleCase,
} from '../../constants/announcement';

export default function FeedPanel() {
  const C = useColors();
  const router = useRouter();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isRefetching,
    refetch,
  } = useAnnouncementFeed();

  const items = (data?.pages || []).flatMap((p) => p?.data || []);

  const markRead = useMarkAnnouncementRead();
  const acknowledge = useAcknowledgeAnnouncement();

  const openLink = useCallback((url) => {
    if (url) openSafeUrl(url);
  }, []);

  const renderItem = ({ item: a }) => (
    <FeedCard
      a={a}
      C={C}
      onPress={() => {
        if (!a.isRead && !a.requiresAck) markRead.mutate(a._id);
        router.push(`/(app)/announcements/${a._id}`);
      }}
      onMarkRead={() => markRead.mutate(a._id)}
      onAcknowledge={() => acknowledge.mutate(a._id)}
      onOpenLink={openLink}
    />
  );

  if (isLoading && items.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.brand} />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.center}>
        <Feather name="inbox" size={36} color={C.mutedSoft} />
        <Text style={[styles.emptyTitle, { color: C.text }]}>No announcements yet</Text>
        <Text style={[styles.emptySub, { color: C.muted, textAlign: 'center' }]}>
          When something is posted for your audience, it will appear here.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(it) => it._id}
      renderItem={renderItem}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={COLORS.brand}
        />
      }
      onEndReachedThreshold={0.4}
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage) fetchNextPage();
      }}
      ListFooterComponent={
        isFetchingNextPage ? (
          <View style={{ padding: 18 }}>
            <ActivityIndicator color={COLORS.brand} />
          </View>
        ) : null
      }
    />
  );
}

function FeedCard({ a, onPress, onMarkRead, onAcknowledge, onOpenLink, C }) {
  const priority = PRIORITY_PILL[a.priority];
  const borderLeftColor = priority?.solid || '#cbd5e1';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: a.isRead ? C.card : (C.card === '#ffffff' ? '#ecfdf5' : C.card),
          borderColor: C.border,
          borderLeftColor,
        },
        pressed && { opacity: 0.92 },
      ]}
    >
      <View style={styles.headerRow}>
        {a.isPinned && (
          <View style={[styles.smallPill, { backgroundColor: '#fef3c7' }]}>
            <Feather name="bookmark" size={10} color="#92400e" />
            <Text style={[styles.smallPillText, { color: '#92400e', marginLeft: 4 }]}>Pinned</Text>
          </View>
        )}
        {a.type && (
          <View style={[styles.smallPill, { backgroundColor: TYPE_PILL[a.type]?.bg || '#f3f4f6' }]}>
            <Feather name={TYPE_ICONS[a.type] || 'file-text'} size={10} color={TYPE_PILL[a.type]?.fg || '#374151'} />
            <Text style={[styles.smallPillText, { color: TYPE_PILL[a.type]?.fg || '#374151', marginLeft: 4 }]}>
              {titleCase(a.type)}
            </Text>
          </View>
        )}
        {priority && (
          <View style={[styles.smallPill, { backgroundColor: priority.bg }]}>
            <Text style={[styles.smallPillText, { color: priority.fg }]}>{priority.label}</Text>
          </View>
        )}
        {a.requiresAck && !a.acknowledged && (
          <View style={[styles.smallPill, { backgroundColor: '#eef2ff' }]}>
            <Text style={[styles.smallPillText, { color: '#3730a3' }]}>Ack required</Text>
          </View>
        )}
        {!a.isRead && (
          <View style={[styles.smallPill, { backgroundColor: COLORS.brand }]}>
            <Text style={[styles.smallPillText, { color: '#fff' }]}>New</Text>
          </View>
        )}
      </View>

      <Text style={[styles.title, { color: C.text }]}>{a.title}</Text>
      <Text style={[styles.meta, { color: C.mutedSoft }]}>
        {a.publishedAt ? formatDateTime(a.publishedAt) : 'Draft'}
        {a.expiresAt ? `  ·  expires ${formatDateTime(a.expiresAt)}` : ''}
      </Text>

      <Text style={[styles.body, { color: C.text }]} numberOfLines={4}>
        {a.body}
      </Text>

      {a.attachments?.length > 0 && (
        <View style={styles.attachList}>
          {a.attachments.map((att) => (
            <Pressable
              key={att._id || att.url}
              onPress={() => onOpenLink(att.url)}
              style={({ pressed }) => [
                styles.attachRow,
                { backgroundColor: C.bg, borderColor: C.border },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Feather name="paperclip" size={13} color={COLORS.brand} />
              <Text style={[styles.attachName, { color: C.text }]} numberOfLines={1}>
                {att.name}
              </Text>
              {att.size != null && (
                <Text style={[styles.attachMeta, { color: C.mutedSoft }]}>
                  {formatBytes(att.size)}
                </Text>
              )}
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.actionRow}>
        {a.requiresAck && !a.acknowledged ? (
          <Pressable
            onPress={onAcknowledge}
            style={({ pressed }) => [styles.ackBtn, pressed && { opacity: 0.85 }]}
          >
            <Feather name="check" size={14} color="#fff" />
            <Text style={styles.ackText}>I have read this</Text>
          </Pressable>
        ) : !a.isRead ? (
          <Pressable
            onPress={onMarkRead}
            style={({ pressed }) => [
              styles.readBtn,
              { borderColor: COLORS.brand },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={[styles.readText, { color: COLORS.brand }]}>Mark as read</Text>
          </Pressable>
        ) : (
          <View style={styles.readState}>
            <Feather name="check-circle" size={12} color="#059669" />
            <Text style={[styles.readStateText, { color: C.muted }]}>
              {a.acknowledged ? 'Acknowledged' : 'Read'}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  listContent: { padding: 12, gap: 10, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },

  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 14,
  },
  headerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  smallPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  smallPillText: { fontSize: 10, fontWeight: '700' },

  title: { fontSize: 15, fontWeight: '800', marginTop: 2 },
  meta: { fontSize: 11, marginTop: 2 },
  body: { fontSize: 13, marginTop: 8, lineHeight: 19 },

  attachList: { gap: 6, marginTop: 10 },
  attachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  attachName: { flex: 1, fontSize: 12, fontWeight: '700' },
  attachMeta: { fontSize: 10 },

  actionRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  ackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#4f46e5',
  },
  ackText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  readBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  readText: { fontSize: 12, fontWeight: '700' },
  readState: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  readStateText: { fontSize: 11, fontWeight: '600' },

  emptyTitle: { fontSize: 15, fontWeight: '800', marginTop: 4 },
  emptySub: { fontSize: 12 },
});
