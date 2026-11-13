import { StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useTranslations } from '../../i18n';
import { COLORS } from '../../theme/colors';
import { PAYMENT_DUE_DEFAULT } from '../../utils/paymentDue';

// "Payment due (days)" + "Block when unpaid" switch, shared by the register-
// school, assign, change and renew forms. Turn the values into request fields
// with paymentDueFields (src/utils/paymentDue.js).
//   placeholder — what a blank field means (the carried value); defaults to the server default
//   canCarry    — a blank field keeps the current plan's value (change/renew)
export default function PaymentDueField({
  enabled,
  onEnabledChange,
  value,
  onChangeText,
  placeholder,
  canCarry = false,
  C,
}) {
  const t = useTranslations('subscription');
  return (
    <View style={{ gap: 6 }}>
      <View style={styles.headRow}>
        <Text style={[styles.label, { color: C.muted }]}>{t('payment.label').toUpperCase()}</Text>
        <View style={styles.switchRow}>
          <Text style={[styles.switchText, { color: C.text }]}>{t('payment.blockSwitch')}</Text>
          <Switch
            value={enabled}
            onValueChange={onEnabledChange}
            trackColor={{ true: COLORS.brand }}
            accessibilityLabel={t('payment.blockSwitch')}
          />
        </View>
      </View>
      {enabled && (
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder ?? t('payment.placeholderDefault', { days: PAYMENT_DUE_DEFAULT })}
          placeholderTextColor={C.mutedSoft}
          keyboardType="number-pad"
          maxLength={3}
          style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
        />
      )}
      <Text style={[styles.helper, { color: C.mutedSoft }]}>
        {enabled
          ? `${t('payment.helper')}${canCarry ? ` ${t('payment.helperBlank')}` : ''}`
          : t('payment.helperOff')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  switchText: { fontSize: 12, fontWeight: '600' },
  label: { fontSize: 10, letterSpacing: 1.1, fontWeight: '700', flexShrink: 1 },
  input: { height: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 14 },
  helper: { fontSize: 11, lineHeight: 16 },
});
