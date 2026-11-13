import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { fmtDate, fmtMoney } from '../../constants/billing';
import { livePriceLock } from '../../utils/launchOffer';

/** "Launch price Rs 3,000 locked until 1 Jan 2027", or '' without a lock. */
export const priceLockText = (t, sub) =>
  sub?.priceLock
    ? t('launchOffer.lockNote', {
        price: fmtMoney(sub.priceLock.price),
        date: fmtDate(sub.priceLock.until),
      })
    : '';

// "Launch price" pill for a subscription running at a launch-offer price.
// `t` is useTranslations('subscription'). Dimmed once the lock has ended.
export function PriceLockBadge({ t, sub }) {
  if (!sub?.priceLock) return null;
  const live = !!livePriceLock(sub);
  return (
    <View style={[styles.pill, live ? styles.live : styles.ended]}>
      <Feather name="tag" size={10} color={live ? '#6d28d9' : '#6b7280'} />
      <Text style={[styles.text, { color: live ? '#6d28d9' : '#6b7280' }]}>{t('launchOffer.badge')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  live: { backgroundColor: '#ede9fe' },
  ended: { backgroundColor: '#f3f4f6' },
  text: { fontSize: 10, fontWeight: '800' },
});
