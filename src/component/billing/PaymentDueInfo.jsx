import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTranslations } from '../../i18n';
import { paymentWindow } from '../../utils/paymentDue';

// "Overdue (blocked)": the plan's invoice is past its due date, so the school
// is read-only until the invoice is marked paid.
export function OverdueBadge() {
  const t = useTranslations('subscription');
  return (
    <View style={styles.badge}>
      <Feather name="lock" size={10} color="#991b1b" />
      <Text style={styles.badgeText}>{t('payment.overdueBadge')}</Text>
    </View>
  );
}

// Human text for a subscription's payment window ("15 days to pay", "Off").
export const paymentWindowText = (t, sub) => {
  const w = paymentWindow(sub);
  if (w.kind === 'off') return t('payment.windowOff');
  if (w.kind === 'days') return t('payment.windowDays', { days: w.days });
  return t('payment.windowDefault');
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#fee2e2',
  },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#991b1b' },
});
