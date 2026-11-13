import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { usePlanFeatures } from '../hooks/usePlanFeatures';
import { useUserStore } from '../store/userStore';
import { canSee } from '../utils/permissions';
import { useColors } from '../theme/useColors';
import { COLORS } from '../theme/colors';
import { useTranslations } from '../i18n';

/**
 * Renders `children` only when the school's plan includes `feature`; otherwise
 * an "Upgrade required" state, so a deep link or a stale route never opens a
 * screen whose every call the API would refuse. While the plan is loading the
 * screen renders (fail open).
 */
export default function PlanFeatureGate({ feature, children }) {
  const { isEnabled } = usePlanFeatures();
  if (isEnabled(feature)) return children;
  return <UpgradeRequired feature={feature} />;
}

export function UpgradeRequired({ feature, message }) {
  const C = useColors();
  const router = useRouter();
  const t = useTranslations('planModules');
  const canViewBilling = canSee(useUserStore((s) => s.user?.role), 'view-billing');
  const moduleName = feature ? t(`modules.${feature}`) : '';

  return (
    <View style={[styles.wrap, { backgroundColor: C.bg }]} accessibilityRole="alert">
      <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
        <View style={styles.lockBadge}>
          <Feather name="lock" size={26} color="#b45309" />
        </View>
        <Text style={[styles.title, { color: C.text }]}>{t('upgradeTitle')}</Text>
        <Text style={[styles.message, { color: C.muted }]}>
          {message || t('lockedMessage', { module: moduleName })}
        </Text>
        {!canViewBilling && (
          <Text style={[styles.hint, { color: C.mutedSoft }]}>{t('askAdmin')}</Text>
        )}
        {canViewBilling ? (
          <Pressable
            onPress={() => router.push('/(app)/billing')}
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
          >
            <Feather name="credit-card" size={15} color="#fff" />
            <Text style={styles.primaryText}>{t('viewBilling')}</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => router.replace('/(app)/dashboard')}
          style={({ pressed }) => [
            styles.secondaryBtn,
            { borderColor: C.border, backgroundColor: C.bg },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Feather name="home" size={15} color={C.text} />
          <Text style={[styles.secondaryText, { color: C.text }]}>{t('goHome')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
  },
  lockBadge: {
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  message: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 8 },
  hint: { fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 8 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    paddingHorizontal: 22,
    borderRadius: 10,
    backgroundColor: COLORS.brand,
    marginTop: 22,
  },
  primaryText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    paddingHorizontal: 22,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
  },
  secondaryText: { fontSize: 14, fontWeight: '700' },
});
