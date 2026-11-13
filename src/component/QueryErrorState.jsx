import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '../theme/useColors';
import { COLORS } from '../theme/colors';
import { useTranslations } from '../i18n';
import { isPlanFeatureDisabledError } from '../utils/planFeatures';

const TITLES = {
  403: "You don't have access to this",
  404: 'Not found',
};

// Centered error state for a failed detail query — shows the server message
// instead of spinning forever on a 403/404.
export default function QueryErrorState({
  error,
  fallback = 'Could not load this record',
  onRetry,
  style,
}) {
  const C = useColors();
  const t = useTranslations('planModules');
  // The plan lacks the module: retrying cannot help, say so plainly.
  const planLocked = isPlanFeatureDisabledError(error);
  const status = error?.response?.status ?? error?.status;
  const message = error?.response?.data?.message || error?.message || fallback;
  return (
    <View style={[styles.wrap, style]} accessibilityRole="alert">
      <Feather
        name={planLocked ? 'lock' : 'alert-circle'}
        size={32}
        color={planLocked ? '#b45309' : COLORS.red}
      />
      <Text style={[styles.title, { color: C.text }]}>
        {planLocked ? t('upgradeTitle') : TITLES[status] || fallback}
      </Text>
      <Text style={[styles.message, { color: C.muted }]}>{message}</Text>
      {onRetry && !planLocked ? (
        <Pressable onPress={onRetry} hitSlop={10} style={({ pressed }) => pressed && { opacity: 0.6 }}>
          <Text style={[styles.retry, { color: COLORS.brand }]}>Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  title: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  message: { fontSize: 13, textAlign: 'center' },
  retry: { fontSize: 13, fontWeight: '700', marginTop: 4 },
});
