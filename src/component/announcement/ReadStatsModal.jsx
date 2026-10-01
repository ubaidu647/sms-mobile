import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAnnouncementReadStats } from '../../hooks/useAnnouncements';
import { formatDateTime, titleCase } from '../../constants/announcement';
import { useColors } from '../../theme/useColors';
import { COLORS } from '../../theme/colors';
import QueryErrorState from '../QueryErrorState';

export default function ReadStatsModal({ open, announcement, onClose }) {
  const C = useColors();
  const id = announcement?._id;
  const { data: stats, isLoading, isError, error } = useAnnouncementReadStats({
    id,
    enabled: open && !!id,
  });

  const reads = stats?.reads || [];
  const requiresAck = !!stats?.requiresAck;

  if (!announcement) return null;

  return (
    <Modal
      visible={open}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.safe, { backgroundColor: C.card }]} edges={['top', 'bottom']}>
        <View style={[styles.header, { borderBottomColor: C.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: C.text }]}>Read Stats</Text>
            <Text style={[styles.subtitle, { color: C.muted }]} numberOfLines={1}>
              {announcement.title}
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={10}
            style={({ pressed }) => [
              styles.closeBtn,
              { backgroundColor: C.bg },
              pressed && { opacity: 0.6 },
            ]}
          >
            <Feather name="x" size={20} color={C.text} />
          </Pressable>
        </View>

        {isError ? (
          <QueryErrorState error={error} fallback="Could not load read stats" />
        ) : isLoading || !stats ? (
          <View style={styles.center}>
            <ActivityIndicator color={COLORS.brand} />
          </View>
        ) : (
          <FlatList
            data={reads}
            keyExtractor={(it, idx) => it._id || it.userId || `${idx}`}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <View style={styles.statsRow}>
                <View style={[styles.statCard, { backgroundColor: C.bg, borderColor: C.border }]}>
                  <Text style={[styles.statLabel, { color: C.muted }]}>TOTAL READS</Text>
                  <Text style={[styles.statValue, { color: C.text }]}>{stats.totalReads ?? 0}</Text>
                </View>
                {requiresAck && (
                  <View style={[styles.statCard, { backgroundColor: '#eef2ff', borderColor: '#c7d2fe' }]}>
                    <Text style={[styles.statLabel, { color: '#3730a3' }]}>ACKNOWLEDGED</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                      <Text style={[styles.statValue, { color: '#1e1b4b' }]}>
                        {stats.ackCount ?? 0}
                      </Text>
                      <Text style={[styles.statValueSub, { color: '#3730a3' }]}>
                        {' '}
                        / {stats.totalReads ?? 0}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Feather name="user-x" size={28} color={C.mutedSoft} />
                <Text style={[styles.emptyText, { color: C.muted, textAlign: 'center' }]}>
                  Nobody has read this yet.
                </Text>
              </View>
            }
            renderItem={({ item: r }) => (
              <View style={[styles.row, { backgroundColor: C.bg, borderColor: C.border }]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.rowName, { color: C.text }]} numberOfLines={1}>
                    {r.user?.name || '—'}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    {r.user?.type && (
                      <View style={[styles.tinyPill, { backgroundColor: C.card, borderColor: C.border }]}>
                        <Text style={[styles.tinyPillText, { color: C.muted }]}>
                          {titleCase(r.user.type)}
                        </Text>
                      </View>
                    )}
                    <Text style={[styles.rowMeta, { color: C.mutedSoft }]}>
                      {formatDateTime(r.readAt)}
                    </Text>
                  </View>
                </View>
                {requiresAck && (
                  <View style={[styles.ackBadge, r.acknowledged ? styles.ackOn : styles.ackOff]}>
                    <Feather
                      name={r.acknowledged ? 'check' : 'minus'}
                      size={12}
                      color={r.acknowledged ? '#065f46' : '#9ca3af'}
                    />
                  </View>
                )}
              </View>
            )}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  title: { fontSize: 19, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 4 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },

  listContent: { padding: 14, gap: 10, paddingBottom: 32 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  statCard: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  statLabel: { fontSize: 10, letterSpacing: 1.1, fontWeight: '800' },
  statValue: { fontSize: 26, fontWeight: '800', marginTop: 4 },
  statValueSub: { fontSize: 13, fontWeight: '700', paddingBottom: 4 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  rowName: { fontSize: 13, fontWeight: '700' },
  rowMeta: { fontSize: 11 },
  tinyPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, borderWidth: 1 },
  tinyPillText: { fontSize: 10, fontWeight: '700' },

  ackBadge: {
    width: 26,
    height: 26,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ackOn: { backgroundColor: '#d1fae5' },
  ackOff: { backgroundColor: '#f3f4f6' },

  empty: { alignItems: 'center', padding: 32, gap: 8 },
  emptyText: { fontSize: 13 },
});
