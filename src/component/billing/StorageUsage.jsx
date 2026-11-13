import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { formatBytes, storageUsage } from '../../utils/storageUsage';
import { useTranslations } from '../../i18n';

// Upload storage used against the plan's limit, with a bar. From the
// current-subscription read's `storage: { usedBytes, limitGB }` (limitGB
// includes add-ons; null = unlimited). `warn` shows the 90%+ / full notice.
export default function StorageUsage({ storage, C, warn = false, style }) {
  const t = useTranslations('subscription');
  const u = storageUsage(storage);
  if (!u) return null;
  const used = formatBytes(u.usedBytes);
  const color = u.full ? '#dc2626' : u.warn ? '#d97706' : '#0f766e';
  return (
    <View style={[{ gap: 6 }, style]}>
      <View style={styles.head}>
        <Feather name="hard-drive" size={14} color={C.muted} />
        <Text style={[styles.title, { color: C.text }]}>{t('storage.title')}</Text>
        <Text style={[styles.value, { color: u.warn ? color : C.muted }]} numberOfLines={1}>
          {u.limitGB === null
            ? t('storage.usedUnlimited', { used })
            : t('storage.used', { used, limit: u.limitGB })}
        </Text>
      </View>
      {u.limitGB !== null && (
        <View
          style={[styles.track, { backgroundColor: C.border }]}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: u.percent }}
        >
          <View style={[styles.fill, { width: `${u.percent}%`, backgroundColor: color }]} />
        </View>
      )}
      {warn && u.warn && (
        <View style={[styles.notice, u.full ? styles.noticeRed : styles.noticeAmber]}>
          <Feather name="alert-triangle" size={14} color={u.full ? '#b91c1c' : '#b45309'} />
          <Text style={[styles.noticeText, { color: u.full ? '#b91c1c' : '#b45309' }]}>
            {t(u.full ? 'storage.full' : 'storage.warn')}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 13, fontWeight: '800' },
  value: { flex: 1, fontSize: 12, fontWeight: '600', textAlign: 'right' },
  track: { height: 8, borderRadius: 999, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 999 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 10, borderWidth: 1, padding: 10 },
  noticeRed: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  noticeAmber: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  noticeText: { flex: 1, fontSize: 12, fontWeight: '600', lineHeight: 17 },
});
