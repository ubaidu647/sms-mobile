import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter, useSegments } from 'expo-router';
import { useSubscriptionGuard } from '../hooks/useSubscriptionGuard';
import { coversScreen, paymentDueSoon } from '../utils/subscriptionState';
import { useTranslations } from '../i18n';
import { canSee } from '../utils/permissions';
import { useUserStore } from '../store/userStore';
import { fmtDate } from '../constants/billing';
import { useAuth } from '../hooks/useAuth';
import { useColors } from '../theme/useColors';
import { COLORS } from '../theme/colors';

// During the grace period, or within 7 days of an unpaid invoice's due date,
// it floats a persistent warning bar under the TopBar; once grace ends or the
// invoice is overdue (expired/unpaid/cancelled/none) it covers the app with a
// non-dismissable block, on every screen but billing (the API still serves its
// reads; writes stay refused there). Active subscriptions render nothing.
// Renders two things: an in-flow banner (the layout places it after the TopBar)
// and a full-screen blocking Modal that floats above everything.
export default function SubscriptionGuard() {
  const C = useColors();
  const t = useTranslations('subscription');
  const { logout } = useAuth();
  const guard = useSubscriptionGuard();
  const { state, endDate, hardBlockAt, paymentDueAt } = guard;
  const dueSoon = paymentDueSoon(guard);
  const router = useRouter();
  const segments = useSegments();
  const canViewBilling = canSee(useUserStore((s) => s.user?.role), 'view-billing');
  const blocked = coversScreen(state, segments);

  return (
    <>
      {state === 'grace' && (
        <View style={styles.banner}>
          <Feather name="alert-triangle" size={15} color="#b91c1c" />
          <Text style={styles.bannerText}>
            Subscription expired on {fmtDate(endDate)} — grace period. Renew before{' '}
            {fmtDate(hardBlockAt)} or access will be blocked. Contact your administrator.
          </Text>
        </View>
      )}
      {dueSoon && (
        <View style={[styles.banner, styles.bannerAmber]}>
          <Feather name="clock" size={15} color="#b45309" />
          <Text style={[styles.bannerText, { color: '#b45309' }]}>
            {t('school.dueSoon', { date: fmtDate(paymentDueAt) })}
          </Text>
        </View>
      )}

      <Modal visible={blocked} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.overlay}>
          <View style={[styles.card, { backgroundColor: C.card }]}>
            <View style={styles.lockBadge}>
              <Feather name="lock" size={26} color="#dc2626" />
            </View>
            <Text style={[styles.title, { color: C.text }]}>
              {state === 'unpaid'
                ? t('school.unpaidTitle')
                : state === 'cancelled'
                  ? 'Subscription cancelled'
                  : 'Subscription expired'}
            </Text>
            <Text style={[styles.message, { color: C.muted }]}>
              {state === 'unpaid' ? (
                t('school.unpaidMessage', { date: fmtDate(paymentDueAt) })
              ) : (
                <>
                  {state === 'cancelled'
                    ? "Your school's subscription was cancelled."
                    : state === 'none'
                      ? 'Your school has no active subscription.'
                      : `Your grace period ended on ${fmtDate(hardBlockAt)}.`}{' '}
                  Please contact your administrator to renew and restore access.
                </>
              )}
            </Text>
            {canViewBilling && (
              <Pressable
                onPress={() => router.push('/(app)/billing')}
                style={({ pressed }) => [styles.billingBtn, pressed && { opacity: 0.85 }]}
              >
                <Feather name="credit-card" size={15} color="#fff" />
                <Text style={styles.billingText}>View billing</Text>
              </Pressable>
            )}
            <Pressable
              onPress={logout}
              style={({ pressed }) => [
                styles.logoutBtn,
                { borderColor: C.border, backgroundColor: C.bg },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Feather name="log-out" size={15} color={C.text} />
              <Text style={[styles.logoutText, { color: C.text }]}>Log out</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#fef2f2',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#fecaca',
  },
  bannerAmber: { backgroundColor: '#fffbeb', borderBottomColor: '#fde68a' },
  bannerText: { flex: 1, fontSize: 12, fontWeight: '700', color: '#b91c1c', lineHeight: 16 },

  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17,24,39,0.8)',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
  },
  lockBadge: {
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  message: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 8 },
  billingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    paddingHorizontal: 22,
    borderRadius: 10,
    backgroundColor: COLORS.brand,
    marginTop: 22,
  },
  billingText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    paddingHorizontal: 22,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
  },
  logoutText: { fontSize: 14, fontWeight: '700' },
});
