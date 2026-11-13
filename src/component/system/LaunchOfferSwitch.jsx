import { StyleSheet, Switch, Text, View } from 'react-native';
import { fmtMoney } from '../../constants/billing';
import { launchOfferOpen, launchOfferSlotsLeft } from '../../utils/launchOffer';
import { useTranslations } from '../../i18n';
import { COLORS } from '../../theme/colors';

export { launchOfferField } from '../../utils/launchOffer';

// "Apply launch offer" switch for the assign / change / new-school forms.
// Shown only while the chosen package has an active offer with slots left.
export default function LaunchOfferSwitch({ pkg, value, onChange, C }) {
  const t = useTranslations('subscription');
  if (!launchOfferOpen(pkg)) return null;
  const o = pkg.launchOffer;
  return (
    <View style={[styles.box, { borderColor: '#ddd6fe', backgroundColor: '#f5f3ff' }]}>
      <View style={styles.row}>
        <Text style={[styles.label, { color: '#5b21b6' }]}>{t('launchOffer.apply').toUpperCase()}</Text>
        <Switch
          value={value}
          onValueChange={onChange}
          trackColor={{ true: COLORS.brand }}
          accessibilityLabel={t('launchOffer.apply')}
        />
      </View>
      <Text style={[styles.hint, { color: C?.muted ?? '#475569' }]}>
        {value
          ? t('launchOffer.applyOn', {
              price: fmtMoney(o.price),
              full: fmtMoney(pkg.price),
              days: o.lockDays,
              left: launchOfferSlotsLeft(pkg),
              max: o.maxSchools,
            })
          : t('launchOffer.applyOff')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { flex: 1, fontSize: 10, letterSpacing: 1.1, fontWeight: '800' },
  hint: { fontSize: 12, lineHeight: 17 },
});
