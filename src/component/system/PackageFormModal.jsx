import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import KeyboardAvoidingView from '../KeyboardAvoidingView';
import ToastModal from '../ToastModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useCreatePackage, useUpdatePackage } from '../../hooks/usePackages';
import { useColors } from '../../theme/useColors';
import { COLORS } from '../../theme/colors';
import { useTranslations } from '../../i18n';
import {
  PLAN_FEATURE_KEYS,
  packageFeatureSelection,
  packageFeaturesPayload,
} from '../../utils/planFeatures';
import {
  ADDON_RESOURCES,
  addonPricesPayload,
  addonPricesToForm,
  moduleAddonPricesPayload,
  moduleAddonPricesToForm,
} from '../../utils/planAddons';
import { storageLimitPayload, storageLimitToForm } from '../../utils/storageUsage';
import { launchOfferPayload, launchOfferToForm } from '../../utils/launchOffer';

// Rows of two fields.
const pairs = (list) =>
  list.reduce((rows, k, i) => (i % 2 ? rows[rows.length - 1].push(k) : rows.push([k]), rows), []);

const EMPTY = {
  name: '',
  description: '',
  price: '',
  durationInDays: '30',
  noOfStudents: '',
  noOfBranches: '',
  noOfStaffs: '',
  noOfSections: '',
  // Upload storage in GB; '' = unlimited.
  storageGB: '',
  web: true,
  android: true,
  ios: false,
  staff: true,
  student: false,
  parent: false,
  // Add-on modules ticked; a new plan starts with all of them.
  features: [...PLAN_FEATURE_KEYS],
  // Price of one extra unit for one period; '' = extras not sold.
  addonPrices: addonPricesToForm(null),
  // Per-period price of each module the plan does not include; '' = not sold.
  moduleAddonPrices: moduleAddonPricesToForm(null),
  launchOffer: launchOfferToForm(null),
  isActive: true,
};

const toForm = (pkg) =>
  !pkg
    ? { ...EMPTY }
    : {
        name: pkg.name ?? '',
        description: pkg.description ?? '',
        price: pkg.price != null ? String(pkg.price) : '',
        durationInDays: pkg.durationInDays != null ? String(pkg.durationInDays) : '30',
        noOfStudents: pkg.limits?.noOfStudents != null ? String(pkg.limits.noOfStudents) : '',
        noOfBranches: pkg.limits?.noOfBranches != null ? String(pkg.limits.noOfBranches) : '',
        noOfStaffs: pkg.limits?.noOfStaffs != null ? String(pkg.limits.noOfStaffs) : '',
        noOfSections: pkg.limits?.noOfSections != null ? String(pkg.limits.noOfSections) : '',
        storageGB: storageLimitToForm(pkg.limits),
        web: pkg.platforms?.web ?? true,
        android: pkg.platforms?.android ?? true,
        ios: pkg.platforms?.ios ?? false,
        staff: pkg.dashboards?.staff ?? true,
        student: pkg.dashboards?.student ?? false,
        parent: pkg.dashboards?.parent ?? false,
        // `[]` / legacy free text means "all modules": open with all ticked.
        features: packageFeatureSelection(pkg.features),
        addonPrices: addonPricesToForm(pkg.addonPrices),
        moduleAddonPrices: moduleAddonPricesToForm(pkg.moduleAddonPrices),
        launchOffer: launchOfferToForm(pkg.launchOffer),
        isActive: pkg.isActive ?? true,
      };

const num = (v) => (v === '' || v == null ? NaN : Number(v));

export default function PackageFormModal({ open, pkg = null, onClose }) {
  const C = useColors();
  const t = useTranslations('planModules');
  const ts = useTranslations('subscription');
  const isEdit = !!pkg;
  const [f, setF] = useState(EMPTY);
  const set = (k, v) => setF((prev) => ({ ...prev, [k]: v }));
  const setAddonPrice = (k, v) =>
    setF((prev) => ({ ...prev, addonPrices: { ...prev.addonPrices, [k]: v } }));
  const setModulePrice = (k, v) =>
    setF((prev) => ({ ...prev, moduleAddonPrices: { ...prev.moduleAddonPrices, [k]: v } }));
  const setOffer = (k, v) =>
    setF((prev) => ({ ...prev, launchOffer: { ...prev.launchOffer, [k]: v } }));
  const toggleFeature = (key) =>
    setF((prev) => ({
      ...prev,
      features: prev.features.includes(key)
        ? prev.features.filter((k) => k !== key)
        : [...prev.features, key],
    }));

  const create = useCreatePackage({ onSuccess: () => onClose() });
  const update = useUpdatePackage({ onSuccess: () => onClose() });
  const saving = create.isPending || update.isPending;

  useEffect(() => {
    if (open) setF(toForm(pkg));
  }, [open, pkg]);

  // Module add-on prices apply only to modules the plan does not include.
  const notIncluded = PLAN_FEATURE_KEYS.filter((k) => !f.features.includes(k));

  const submit = () => {
    if (!f.name.trim()) return Toast.show({ type: 'error', text1: 'Name is required' });
    const price = num(f.price);
    if (Number.isNaN(price) || price < 0)
      return Toast.show({ type: 'error', text1: 'Valid price is required' });
    const duration = num(f.durationInDays);
    if (!Number.isInteger(duration) || duration < 0)
      return Toast.show({ type: 'error', text1: 'Valid duration is required' });
    const limits = {};
    for (const [k, lbl] of [
      ['noOfStudents', 'Students'],
      ['noOfBranches', 'Branches'],
      ['noOfStaffs', 'Staff'],
      ['noOfSections', 'Sections'],
    ]) {
      const n = num(f[k]);
      if (Number.isNaN(n) || n < 0)
        return Toast.show({ type: 'error', text1: `${lbl} limit is required` });
      limits[k] = n;
    }
    const storageGB = storageLimitPayload(f.storageGB);
    if (storageGB === undefined) return Toast.show({ type: 'error', text1: ts('storage.packageError') });
    limits.storageGB = storageGB;
    const addon = addonPricesPayload(f.addonPrices);
    if (addon.error) return Toast.show({ type: 'error', text1: ts('addons.packagePriceError') });
    const modulePrices = moduleAddonPricesPayload(f.moduleAddonPrices, f.features);
    if (modulePrices.error)
      return Toast.show({ type: 'error', text1: ts('addons.packageModulePriceError') });
    const offer = launchOfferPayload(f.launchOffer, !!pkg?.launchOffer);
    if (offer.error) {
      const key = { price: 'errPrice', maxSchools: 'errMaxSchools', lockDays: 'errLockDays' }[offer.error];
      return Toast.show({ type: 'error', text1: ts(`launchOffer.${key}`) });
    }

    const payload = {
      name: f.name.trim(),
      description: f.description?.trim() || undefined,
      price,
      durationInDays: duration,
      limits,
      platforms: { web: !!f.web, android: !!f.android, ios: !!f.ios },
      dashboards: { staff: !!f.staff, student: !!f.student, parent: !!f.parent },
      // Always `core` plus the ticked add-ons (`['core']` = no add-ons).
      features: packageFeaturesPayload(f.features),
      // Blank → null: extras of that kind are not sold.
      addonPrices: addon.addonPrices,
      // Only modules the plan lacks can be sold; the rest are saved as null.
      moduleAddonPrices: modulePrices.moduleAddonPrices,
      // { active, price, maxSchools, lockDays }, null to remove, or omitted.
      ...offer,
      isActive: !!f.isActive,
    };

    if (isEdit) update.mutate({ id: pkg._id, payload });
    else create.mutate(payload);
  };

  return (
    <ToastModal visible={open} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safe, { backgroundColor: C.card }]} edges={['top', 'bottom']}>
        <View style={[styles.header, { borderBottomColor: C.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: C.text }]}>
              {isEdit ? 'Edit Package' : 'Create Package'}
            </Text>
            <Text style={[styles.subtitle, { color: C.muted }]} numberOfLines={2}>
              {isEdit
                ? 'Changes affect future subscriptions only.'
                : 'Define a new plan available to schools.'}
            </Text>
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
            <Field label="Name *" C={C}>
              <TextInput
                value={f.name}
                onChangeText={(v) => set('name', v)}
                placeholder="e.g. Premium"
                placeholderTextColor={C.mutedSoft}
                style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
              />
            </Field>

            <Field label="Description" C={C}>
              <TextInput
                value={f.description}
                onChangeText={(v) => set('description', v)}
                placeholder="Short summary of the plan"
                placeholderTextColor={C.mutedSoft}
                multiline
                style={[
                  styles.input,
                  { height: 64, textAlignVertical: 'top', paddingTop: 10, color: C.text, borderColor: C.border, backgroundColor: C.bg },
                ]}
              />
            </Field>

            <View style={styles.row2}>
              <Field label="Price *" C={C} style={{ flex: 1 }}>
                <TextInput
                  value={f.price}
                  onChangeText={(v) => set('price', v)}
                  placeholder="5000"
                  placeholderTextColor={C.mutedSoft}
                  keyboardType="decimal-pad"
                  style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
                />
              </Field>
              <Field label="Duration (days) *" C={C} style={{ flex: 1 }}>
                <TextInput
                  value={f.durationInDays}
                  onChangeText={(v) => set('durationInDays', v)}
                  placeholder="30"
                  placeholderTextColor={C.mutedSoft}
                  keyboardType="number-pad"
                  style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
                />
              </Field>
            </View>

            <Text style={[styles.groupLabel, { color: C.muted }]}>LIMITS</Text>
            <View style={styles.row2}>
              {[
                ['noOfStudents', 'Students'],
                ['noOfBranches', 'Branches'],
              ].map(([k, lbl]) => (
                <Field key={k} label={lbl} C={C} style={{ flex: 1 }}>
                  <TextInput
                    value={f[k]}
                    onChangeText={(v) => set(k, v)}
                    keyboardType="number-pad"
                    placeholderTextColor={C.mutedSoft}
                    style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
                  />
                </Field>
              ))}
            </View>
            <View style={styles.row2}>
              {[
                ['noOfStaffs', 'Staff'],
                ['noOfSections', 'Sections'],
              ].map(([k, lbl]) => (
                <Field key={k} label={lbl} C={C} style={{ flex: 1 }}>
                  <TextInput
                    value={f[k]}
                    onChangeText={(v) => set(k, v)}
                    keyboardType="number-pad"
                    placeholderTextColor={C.mutedSoft}
                    style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
                  />
                </Field>
              ))}
            </View>

            <Field label={ts('storage.packageLabel')} C={C}>
              <TextInput
                value={f.storageGB}
                onChangeText={(v) => set('storageGB', v)}
                placeholder={ts('storage.unlimited')}
                keyboardType="decimal-pad"
                placeholderTextColor={C.mutedSoft}
                style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
              />
              <Text style={[styles.hint, { color: C.mutedSoft, marginTop: 0 }]}>{ts('storage.packageHint')}</Text>
            </Field>

            <Text style={[styles.groupLabel, { color: C.muted }]}>
              {ts('addons.packagePricesTitle').toUpperCase()}
            </Text>
            <Text style={[styles.hint, { color: C.mutedSoft }]}>{ts('addons.packagePricesHint')}</Text>
            {pairs(ADDON_RESOURCES).map((pair) => (
              <View key={pair[0]} style={styles.row2}>
                {pair.map((k) => (
                  <Field key={k} label={ts(`addons.resources.${k}`)} C={C} style={{ flex: 1 }}>
                    <TextInput
                      value={f.addonPrices[k]}
                      onChangeText={(v) => setAddonPrice(k, v)}
                      placeholder={ts('addons.notSold')}
                      keyboardType="decimal-pad"
                      placeholderTextColor={C.mutedSoft}
                      style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
                    />
                  </Field>
                ))}
                {pair.length === 1 && <View style={{ flex: 1 }} />}
              </View>
            ))}

            <Text style={[styles.groupLabel, { color: C.muted }]}>PLATFORMS</Text>
            <View style={styles.toggleWrap}>
              {[
                ['web', 'Web'],
                ['android', 'Android'],
                ['ios', 'iOS'],
              ].map(([k, lbl]) => (
                <Toggle key={k} label={lbl} on={f[k]} onToggle={() => set(k, !f[k])} C={C} />
              ))}
            </View>

            <Text style={[styles.groupLabel, { color: C.muted }]}>DASHBOARDS</Text>
            <View style={styles.toggleWrap}>
              {[
                ['staff', 'Staff'],
                ['student', 'Student'],
                ['parent', 'Parent'],
              ].map(([k, lbl]) => (
                <Toggle key={k} label={lbl} on={f[k]} onToggle={() => set(k, !f[k])} C={C} />
              ))}
            </View>

            <View style={styles.featureHeader}>
              <Text style={[styles.groupLabel, { color: C.muted, flex: 1 }]}>
                {t('packages.label').toUpperCase()}
              </Text>
              <Pressable
                onPress={() => set('features', [...PLAN_FEATURE_KEYS])}
                hitSlop={8}
                style={({ pressed }) => pressed && { opacity: 0.6 }}
              >
                <Text style={styles.linkText}>{t('packages.selectAll')}</Text>
              </Pressable>
              <Pressable
                onPress={() => set('features', [])}
                hitSlop={8}
                style={({ pressed }) => pressed && { opacity: 0.6 }}
              >
                <Text style={styles.linkText}>{t('packages.clear')}</Text>
              </Pressable>
            </View>
            <Text style={[styles.hint, { color: C.mutedSoft }]}>{t('packages.hint')}</Text>
            <View style={styles.toggleWrap}>
              {PLAN_FEATURE_KEYS.map((key) => (
                <Toggle
                  key={key}
                  label={t(`modules.${key}`)}
                  on={f.features.includes(key)}
                  onToggle={() => toggleFeature(key)}
                  C={C}
                />
              ))}
            </View>

            <Text style={[styles.groupLabel, { color: C.muted }]}>
              {ts('addons.packageModulePricesTitle').toUpperCase()}
            </Text>
            {notIncluded.length === 0 ? (
              <Text style={[styles.hint, { color: C.mutedSoft }]}>
                {ts('addons.packageModulePricesAllIncluded')}
              </Text>
            ) : (
              <>
                <Text style={[styles.hint, { color: C.mutedSoft }]}>{ts('addons.packageModulePricesHint')}</Text>
                {pairs(notIncluded).map((pair) => (
                  <View key={pair[0]} style={styles.row2}>
                    {pair.map((k) => (
                      <Field key={k} label={t(`modules.${k}`)} C={C} style={{ flex: 1 }}>
                        <TextInput
                          value={f.moduleAddonPrices[k]}
                          onChangeText={(v) => setModulePrice(k, v)}
                          placeholder={ts('addons.notSold')}
                          keyboardType="decimal-pad"
                          placeholderTextColor={C.mutedSoft}
                          style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
                        />
                      </Field>
                    ))}
                    {pair.length === 1 && <View style={{ flex: 1 }} />}
                  </View>
                ))}
              </>
            )}

            <View style={styles.featureHeader}>
              <Text style={[styles.groupLabel, { color: C.muted, flex: 1 }]}>
                {ts('launchOffer.title').toUpperCase()}
              </Text>
              <Text style={[styles.label, { color: C.muted }]}>{ts('launchOffer.active')}</Text>
              <Switch
                value={f.launchOffer.enabled}
                onValueChange={(v) => setOffer('enabled', v)}
                trackColor={{ true: COLORS.brand }}
                accessibilityLabel={ts('launchOffer.active')}
              />
            </View>
            <Text style={[styles.hint, { color: C.mutedSoft }]}>{ts('launchOffer.hint')}</Text>
            <View style={styles.row2}>
              <Field label={ts('launchOffer.price')} C={C} style={{ flex: 1 }}>
                <TextInput
                  value={f.launchOffer.price}
                  onChangeText={(v) => setOffer('price', v)}
                  placeholder="3000"
                  keyboardType="decimal-pad"
                  placeholderTextColor={C.mutedSoft}
                  style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
                />
              </Field>
              <Field label={ts('launchOffer.maxSchools')} C={C} style={{ flex: 1 }}>
                <TextInput
                  value={f.launchOffer.maxSchools}
                  onChangeText={(v) => setOffer('maxSchools', v)}
                  placeholder="30"
                  keyboardType="number-pad"
                  placeholderTextColor={C.mutedSoft}
                  style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
                />
              </Field>
              <Field label={ts('launchOffer.lockDays')} C={C} style={{ flex: 1 }}>
                <TextInput
                  value={f.launchOffer.lockDays}
                  onChangeText={(v) => setOffer('lockDays', v)}
                  placeholder="365"
                  keyboardType="number-pad"
                  placeholderTextColor={C.mutedSoft}
                  style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
                />
              </Field>
            </View>
            {pkg?.launchOffer && (
              <Text style={[styles.hint, { color: C.muted, marginTop: -6 }]}>
                {ts('launchOffer.claimed', {
                  claimed: pkg.launchOffer.claimed ?? 0,
                  max: pkg.launchOffer.maxSchools ?? '-',
                })}
              </Text>
            )}

            <Toggle
              label="Active (available to assign)"
              on={f.isActive}
              onToggle={() => set('isActive', !f.isActive)}
              C={C}
              wide
            />

            <Pressable
              onPress={submit}
              disabled={saving}
              style={({ pressed }) => [styles.submit, (saving || pressed) && { opacity: 0.85 }]}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name={isEdit ? 'check' : 'plus'} size={16} color="#fff" />
                  <Text style={styles.submitText}>{isEdit ? 'Save Changes' : 'Create Package'}</Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ToastModal>
  );
}

function Field({ label, children, C, style }) {
  return (
    <View style={[{ gap: 6 }, style]}>
      <Text style={[styles.label, { color: C.muted }]}>{label.toUpperCase()}</Text>
      {children}
    </View>
  );
}

function Toggle({ label, on, onToggle, C, wide }) {
  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => [
        styles.toggle,
        wide && { flexBasis: '100%' },
        { borderColor: on ? COLORS.brand : C.border, backgroundColor: on ? '#ccfbf1' : C.bg },
        pressed && { opacity: 0.85 },
      ]}
    >
      <Feather
        name={on ? 'check-square' : 'square'}
        size={16}
        color={on ? COLORS.brand : C.mutedSoft}
      />
      <Text style={[styles.toggleText, { color: on ? '#115e59' : C.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  title: { fontSize: 19, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 4 },
  closeBtn: { width: 36, height: 36, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 16, paddingBottom: 36, gap: 14 },

  label: { fontSize: 10, letterSpacing: 1.1, fontWeight: '700' },
  groupLabel: { fontSize: 10, letterSpacing: 1.1, fontWeight: '800', marginTop: 2 },
  input: { height: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 14 },
  row2: { flexDirection: 'row', gap: 10 },

  toggleWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  featureHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 2 },
  linkText: { fontSize: 12, fontWeight: '700', color: COLORS.brand },
  hint: { fontSize: 11, marginTop: -8 },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
  },
  toggleText: { fontSize: 13, fontWeight: '700' },

  submit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.brand,
    height: 48,
    borderRadius: 12,
    marginTop: 8,
  },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
