import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import KeyboardAvoidingView from '../KeyboardAvoidingView';
import ToastModal from '../ToastModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useAddonQuote, usePurchaseAddon } from '../../hooks/useSubscriptions';
import { fmtMoney } from '../../constants/billing';
import {
  ADDON_RESOURCES,
  MODULE_RESOURCE,
  addonPayload,
  buyableModuleOffers,
  formatLimit,
} from '../../utils/planAddons';
import { useTranslations } from '../../i18n';
import { useColors } from '../../theme/useColors';
import { COLORS } from '../../theme/colors';

const QUOTE_DELAY_MS = 400;

const CHOICES = [...ADDON_RESOURCES, MODULE_RESOURCE];

// Buy an add-on for the rest of the period (super-admin): extra units of a
// plan limit (storage in GB), or one gated module the plan lacks. The unit
// price starts at the plan's (addonPrices / moduleAddonPrices) and may be
// changed for this purchase; a debounced server quote shows what is billed.
export default function AddonModal({ open, onClose, schoolId, schoolName, current }) {
  const C = useColors();
  const t = useTranslations('subscription');
  const tm = useTranslations('planModules');
  const prices = current?.addonPrices ?? {};
  const days = current?.packageSnapshot?.durationInDays;
  const modules = useMemo(() => buyableModuleOffers(current), [current]);
  const modulePrice = (key) => modules.find((m) => m.key === key)?.price ?? null;

  const [resource, setResource] = useState('noOfStudents');
  const [moduleKey, setModule] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [method, setMethod] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [error, setError] = useState('');

  const priceFor = (key) => (typeof prices[key] === 'number' ? String(prices[key]) : '');

  useEffect(() => {
    if (!open) return;
    // Start on the first kind of extra the plan sells.
    const first = ADDON_RESOURCES.find((k) => typeof current?.addonPrices?.[k] === 'number');
    const key = first ?? 'noOfStudents';
    setResource(key);
    setModule('');
    setQuantity('');
    setUnitPrice(
      typeof current?.addonPrices?.[key] === 'number' ? String(current.addonPrices[key]) : '',
    );
    setMethod('');
    setTransactionId('');
    setError('');
    // Reset per opening / subscription, not on every background refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, current?._id]);

  const isModule = resource === MODULE_RESOURCE;

  const pick = (key) => {
    setResource(key);
    if (key === MODULE_RESOURCE) {
      const first = modules.find((m) => m.price != null) ?? modules[0];
      setModule(first?.key ?? '');
      setUnitPrice(first?.price != null ? String(first.price) : '');
    } else {
      setUnitPrice(priceFor(key));
    }
    setError('');
  };

  const pickModule = (key) => {
    setModule(key);
    const p = modulePrice(key);
    setUnitPrice(p != null ? String(p) : '');
    setError('');
  };

  const built = useMemo(
    () => addonPayload({ schoolId, resource, module: moduleKey, quantity, unitPrice }),
    [schoolId, resource, moduleKey, quantity, unitPrice],
  );

  // Debounce the quote request while the user types.
  const [quoteBody, setQuoteBody] = useState(null);
  useEffect(() => {
    if (!open || !built.payload) {
      setQuoteBody(null);
      return undefined;
    }
    const id = setTimeout(() => setQuoteBody(built.payload), QUOTE_DELAY_MS);
    return () => clearTimeout(id);
  }, [open, built]);
  const quote = useAddonQuote(quoteBody);
  const q = quote.data?.data ?? null;
  const pending = !!built.payload && (quoteBody !== built.payload || quote.isFetching);

  const purchase = usePurchaseAddon({ onSuccess: () => onClose() });

  const submit = () => {
    if (built.error) {
      return Toast.show({
        type: 'error',
        text1: t(
          built.error === 'unitPrice'
            ? 'addons.errUnitPrice'
            : built.error === 'module'
              ? 'addons.moduleNone'
              : 'addons.errQuantity',
        ),
      });
    }
    const payload = { ...built.payload };
    if (method || transactionId) {
      payload.paymentInfo = {
        method: method || undefined,
        transactionId: transactionId || undefined,
      };
    }
    setError('');
    purchase.mutate(payload, { onError: (err) => setError(err?.message || 'Failed') });
  };

  const showQtyError = quantity !== '' && built.error === 'quantity';
  const showPriceError = unitPrice !== '' && built.error === 'unitPrice';
  const listedPrice = isModule ? modulePrice(moduleKey) : prices[resource];
  const listed = typeof listedPrice === 'number';
  const moduleLabel = (key) => tm(`modules.${key}`);

  return (
    <ToastModal visible={open} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safe, { backgroundColor: C.card }]} edges={['top', 'bottom']}>
        <View style={[styles.header, { borderBottomColor: C.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: C.text }]}>{t('addons.modalTitle')}</Text>
            {!!schoolName && (
              <Text style={[styles.subtitle, { color: C.muted }]}>
                {t('addons.modalSubtitle', { school: schoolName })}
              </Text>
            )}
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={10}
            style={({ pressed }) => [styles.closeBtn, { backgroundColor: C.bg }, pressed && { opacity: 0.6 }]}
          >
            <Feather name="x" size={20} color={C.text} />
          </Pressable>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.label, { color: C.muted }]}>{t('addons.resourceLabel').toUpperCase()}</Text>
            <View style={styles.chipRow}>
              {CHOICES.map((key) => {
                const active = resource === key;
                const price = key === MODULE_RESOURCE ? undefined : prices[key];
                return (
                  <Pressable
                    key={key}
                    onPress={() => pick(key)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    style={({ pressed }) => [
                      styles.chip,
                      { backgroundColor: C.bg, borderColor: C.border },
                      active && styles.chipActive,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: C.text }, active && styles.chipTextActive]}>
                      {t(`addons.resources.${key}`)}
                      {key === MODULE_RESOURCE
                        ? ''
                        : ` · ${typeof price === 'number' ? fmtMoney(price) : t('addons.notListed')}`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {isModule ? (
              <>
                <Text style={[styles.label, { color: C.muted }]}>{t('addons.moduleLabel').toUpperCase()} *</Text>
                {modules.length === 0 ? (
                  <Text style={[styles.infoText, { color: '#b45309' }]}>{t('addons.moduleNone')}</Text>
                ) : (
                  <View style={styles.chipRow}>
                    {modules.map((m) => {
                      const active = moduleKey === m.key;
                      return (
                        <Pressable
                          key={m.key}
                          onPress={() => pickModule(m.key)}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: active }}
                          style={({ pressed }) => [
                            styles.chip,
                            { backgroundColor: C.bg, borderColor: C.border },
                            active && styles.chipActive,
                            pressed && { opacity: 0.85 },
                          ]}
                        >
                          <Text style={[styles.chipText, { color: C.text }, active && styles.chipTextActive]}>
                            {moduleLabel(m.key)} · {m.price != null ? fmtMoney(m.price) : t('addons.notListed')}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
                <View style={{ gap: 6 }}>
                  <Text style={[styles.label, { color: C.muted }]} numberOfLines={1}>
                    {t('addons.modulePriceLabel', { days: days ?? '-' }).toUpperCase()}
                  </Text>
                  <TextInput
                    value={unitPrice}
                    onChangeText={(v) => { setUnitPrice(v); setError(''); }}
                    placeholder="0"
                    placeholderTextColor={C.mutedSoft}
                    keyboardType="decimal-pad"
                    style={[styles.input, { color: C.text, borderColor: showPriceError ? '#dc2626' : C.border, backgroundColor: C.bg }]}
                  />
                </View>
              </>
            ) : (
            <>
            <Text style={[styles.infoText, { color: C.muted }]}>
              {t(`addons.resources.${resource}`)}:{' '}
              {formatLimit(current, resource, (v) => t('addons.limitWithAddon', v))}
            </Text>

            <View style={styles.row2}>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={[styles.label, { color: C.muted }]}>{t('addons.quantityLabel').toUpperCase()} *</Text>
                <TextInput
                  value={quantity}
                  onChangeText={(v) => { setQuantity(v); setError(''); }}
                  placeholder="100"
                  placeholderTextColor={C.mutedSoft}
                  keyboardType="number-pad"
                  style={[styles.input, { color: C.text, borderColor: showQtyError ? '#dc2626' : C.border, backgroundColor: C.bg }]}
                />
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={[styles.label, { color: C.muted }]} numberOfLines={1}>
                  {t('addons.unitPriceLabel', { days: days ?? '-' }).toUpperCase()}
                </Text>
                <TextInput
                  value={unitPrice}
                  onChangeText={(v) => { setUnitPrice(v); setError(''); }}
                  placeholder="0"
                  placeholderTextColor={C.mutedSoft}
                  keyboardType="decimal-pad"
                  style={[styles.input, { color: C.text, borderColor: showPriceError ? '#dc2626' : C.border, backgroundColor: C.bg }]}
                />
              </View>
            </View>
            </>
            )}
            {showQtyError && <Text style={styles.fieldError}>{t('addons.errQuantity')}</Text>}
            {showPriceError && <Text style={styles.fieldError}>{t('addons.errUnitPrice')}</Text>}
            <Text style={[styles.infoText, { color: listed ? C.mutedSoft : '#b45309' }]}>
              {listed
                ? t('addons.unitPriceHint', { price: fmtMoney(listedPrice) })
                : t('addons.unitPriceNone')}
            </Text>

            {!!built.payload && (
              <View style={[styles.estBox, { borderColor: '#99f6e4', backgroundColor: '#f0fdfa' }]}>
                {pending && !q ? (
                  <Text style={styles.estLabel}>{t('addons.quoteLoading')}</Text>
                ) : quote.isError && !pending ? (
                  <Text style={[styles.estLabel, { color: '#b91c1c' }]}>{quote.error?.message}</Text>
                ) : q ? (
                  <View style={[{ gap: 4 }, pending && { opacity: 0.5 }]}>
                    <Text style={styles.estLabel}>
                      {t('addons.quoteDaysLeft', { days: q.remainingDays, total: q.durationInDays })}
                    </Text>
                    <Text style={styles.estLabel}>
                      {t('addons.quotePeriod', { amount: fmtMoney(q.periodAmount ?? q.unitPrice) })}
                    </Text>
                    <Text style={styles.estStrong}>
                      {t('addons.quoteAmount', { amount: fmtMoney(q.amount) })}
                    </Text>
                    {q.module ? (
                      <Text style={styles.estLabel}>
                        {t('addons.quoteModule', { module: moduleLabel(q.module) })}
                      </Text>
                    ) : q.currentLimit != null ? (
                      <Text style={styles.estLabel}>
                        {t(resource === 'storageGB' ? 'addons.quoteLimitGB' : 'addons.quoteLimit', {
                          from: q.currentLimit,
                          to: q.newLimit,
                        })}
                      </Text>
                    ) : null}
                    <Text style={styles.estNote}>{t('addons.quoteNote')}</Text>
                  </View>
                ) : null}
              </View>
            )}

            <Text style={[styles.label, { color: C.muted }]}>{t('addons.paymentLabel').toUpperCase()}</Text>
            <View style={styles.row2}>
              <TextInput
                value={method}
                onChangeText={setMethod}
                placeholder={t('addons.methodPlaceholder')}
                placeholderTextColor={C.mutedSoft}
                style={[styles.input, { flex: 1, color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
              />
              <TextInput
                value={transactionId}
                onChangeText={setTransactionId}
                placeholder={t('addons.transactionPlaceholder')}
                placeholderTextColor={C.mutedSoft}
                autoCapitalize="none"
                style={[styles.input, { flex: 1, color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
              />
            </View>

            {!!error && (
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={15} color="#b91c1c" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Pressable
              onPress={submit}
              disabled={purchase.isPending}
              style={({ pressed }) => [styles.submit, (purchase.isPending || pressed) && { opacity: 0.85 }]}
            >
              {purchase.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="plus" size={16} color="#fff" />
                  <Text style={styles.submitText}>{t('addons.submit')}</Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ToastModal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  title: { fontSize: 19, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 4 },
  closeBtn: { width: 36, height: 36, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 16, paddingBottom: 36, gap: 12 },

  label: { fontSize: 10, letterSpacing: 1.1, fontWeight: '700' },
  input: { height: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 14 },
  row2: { flexDirection: 'row', gap: 10 },
  fieldError: { fontSize: 11, fontWeight: '600', color: '#b91c1c', marginTop: -6 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  chipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText: { fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#fff' },

  infoText: { fontSize: 12, lineHeight: 18 },

  estBox: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 4 },
  estLabel: { fontSize: 13, color: '#334155' },
  estStrong: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  estNote: { fontSize: 11, color: '#475569', marginTop: 2 },

  errorBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fef2f2' },
  errorText: { flex: 1, fontSize: 12, fontWeight: '600', color: '#b91c1c', lineHeight: 17 },

  submit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.brand, height: 48, borderRadius: 12, marginTop: 8 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
