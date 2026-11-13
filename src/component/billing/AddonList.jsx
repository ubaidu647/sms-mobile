import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { fmtDate, fmtMoney, INVOICE_STATUS_PILL } from '../../constants/billing';
import { useTranslations } from '../../i18n';
import { isModuleAddon, moduleName } from '../../utils/planAddons';
import { COLORS } from '../../theme/colors';

const STATUS_KEY = { paid: 'addons.statusPaid', unpaid: 'addons.statusUnpaid', void: 'addons.statusVoid' };

/**
 * "+100 students" / "WhatsApp module" in the current language. `moduleLabel`
 * translates a module key (planModules.modules); English names otherwise.
 */
export const addonText = (t, a, moduleLabel) =>
  isModuleAddon(a)
    ? t('addons.moduleRow', { module: moduleName(a.module, moduleLabel) })
    : t('addons.row', {
        quantity: a.quantity,
        unit: t(`addons.${a.quantity === 1 ? 'unit' : 'units'}.${a.resource}`),
      });

// Add-ons on a subscription. Rows joined to their invoice (addonsWithInvoices)
// show its status; `onRemove` / `onMarkPaid` add the super-admin actions,
// offered only while the add-on's own invoice is unpaid.
export default function AddonList({ addons, C, onRemove, onMarkPaid, busyId }) {
  const t = useTranslations('subscription');
  const tm = useTranslations('planModules');
  const moduleLabel = (k) => tm(`modules.${k}`);
  if (!addons?.length) {
    return <Text style={[styles.empty, { color: C.muted }]}>{t('addons.none')}</Text>;
  }
  return (
    <View style={{ gap: 8 }}>
      {addons.map((a) => {
        const status = a.invoice?.status;
        const cfg = INVOICE_STATUS_PILL[status];
        const busy = busyId != null && String(busyId) === String(a._id);
        return (
          <View key={a._id} style={[styles.row, { backgroundColor: C.bg, borderColor: C.border }]}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.title, { color: C.text }]} numberOfLines={1}>
                {addonText(t, a, moduleLabel)}
              </Text>
              <Text style={[styles.meta, { color: C.muted }]} numberOfLines={2}>
                {t(isModuleAddon(a) ? 'addons.moduleRowMeta' : 'addons.rowMeta', {
                  price: fmtMoney(a.unitPrice),
                  date: fmtDate(a.addedAt),
                })}
              </Text>
            </View>
            {!!cfg && (
              <View style={[styles.pill, { backgroundColor: cfg.bg }]}>
                <Text style={[styles.pillText, { color: cfg.fg }]}>{t(STATUS_KEY[status])}</Text>
              </View>
            )}
            {a.removable && (onRemove || onMarkPaid) && (
              <View style={styles.actions}>
                {busy ? (
                  <ActivityIndicator size="small" color={COLORS.brand} />
                ) : (
                  <>
                    {onMarkPaid && (
                      <Pressable
                        onPress={() => onMarkPaid(a)}
                        hitSlop={6}
                        style={({ pressed }) => [styles.btn, styles.btnPay, pressed && { opacity: 0.7 }]}
                      >
                        <Text style={[styles.btnText, { color: '#166534' }]}>{t('addons.markPaid')}</Text>
                      </Pressable>
                    )}
                    {onRemove && (
                      <Pressable
                        onPress={() => onRemove(a)}
                        hitSlop={6}
                        style={({ pressed }) => [styles.btn, styles.btnRemove, pressed && { opacity: 0.7 }]}
                      >
                        <Text style={[styles.btnText, { color: '#991b1b' }]}>{t('addons.remove')}</Text>
                      </Pressable>
                    )}
                  </>
                )}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { fontSize: 12, paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, padding: 10, flexWrap: 'wrap' },
  title: { fontSize: 13, fontWeight: '800' },
  meta: { fontSize: 11, marginTop: 2 },
  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  pillText: { fontSize: 10, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 6 },
  btn: { paddingHorizontal: 10, height: 30, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  btnPay: { borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' },
  btnRemove: { borderColor: '#fecaca', backgroundColor: '#fef2f2' },
  btnText: { fontSize: 12, fontWeight: '700' },
});
