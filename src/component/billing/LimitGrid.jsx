import { StyleSheet, Text, View } from 'react-native';
import { LIMIT_KEYS } from '../../constants/billing';
import { limitBreakdown } from '../../utils/planAddons';
import { useTranslations } from '../../i18n';

// Effective plan limits, one card each: the total (override or plan limit plus
// add-on units) with "(300 + 100 add-on)" under it when add-ons apply.
export default function LimitGrid({ sub, C, bordered = false, style }) {
  const t = useTranslations('subscription');
  return (
    <View style={[styles.grid, style]}>
      {LIMIT_KEYS.map(([key, lbl]) => {
        const { base, extra, total } = limitBreakdown(sub, key);
        return (
          <View
            key={key}
            style={[
              styles.card,
              { backgroundColor: C.bg },
              bordered && { borderWidth: 1, borderColor: C.border },
            ]}
          >
            <Text style={[styles.value, { color: C.text }]}>{total ?? '∞'}</Text>
            {total != null && extra > 0 && (
              <Text style={[styles.extra, { color: '#0f766e' }]} numberOfLines={2}>
                {t('addons.limitBreakdown', { base, extra })}
              </Text>
            )}
            <Text style={[styles.label, { color: C.muted }]}>{lbl}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: { flexBasis: '22%', flexGrow: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 4, alignItems: 'center' },
  value: { fontSize: 18, fontWeight: '800' },
  extra: { fontSize: 10, fontWeight: '700', marginTop: 2, textAlign: 'center' },
  label: { fontSize: 11, marginTop: 2 },
});
