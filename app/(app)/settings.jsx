import { useState } from 'react';
import {
  Appearance,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import { useRouter } from 'expo-router';
import { useThemeStore } from '../../src/store/themeStore';
import { useLanguageStore, LANGUAGES } from '../../src/store/languageStore';
import { useColors } from '../../src/theme/useColors';
import { COLORS } from '../../src/theme/colors';
import { useTranslations } from '../../src/i18n';

const THEME_OPTIONS = [
  {
    id: 'light',
    label: 'Light',
    desc: 'Bright surfaces and crisp contrast.',
    icon: 'sun',
    accent: '#f59e0b',
    preview: ['#ffffff', '#f3f4f6'],
    border: '#e5e7eb',
  },
  {
    id: 'dark',
    label: 'Dark',
    desc: 'Easy on the eyes in low light.',
    icon: 'moon',
    accent: '#a5b4fc',
    preview: ['#1e293b', '#020617'],
    border: '#334155',
  },
  {
    id: 'system',
    label: 'System',
    desc: 'Follows your device appearance.',
    icon: 'monitor',
    accent: '#14b8a6',
    preview: ['#ffffff', '#0f172a'],
    border: '#cbd5e1',
  },
];

export default function SettingsScreen() {
  const C = useColors();
  const currentTheme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const t = useTranslations('settings');
  const router = useRouter();

  const [themeChoice, setThemeChoice] = useState(currentTheme);

  const handleThemeSelect = (id) => {
    setThemeChoice(id);
    if (id === 'system') {
      const osScheme = Appearance.getColorScheme(); // 'light' | 'dark' | null
      setTheme(osScheme === 'dark' ? 'dark' : 'light');
    } else {
      setTheme(id);
    }
    Toast.show({ type: 'success', text1: t('theme.toast', { theme: t(`theme.${id}`) }) });
  };

  const handleLanguageSelect = (code) => {
    const lang = LANGUAGES.find((l) => l.code === code);
    setLanguage(code);
    Toast.show({ type: 'success', text1: t('language.toast', { lang: lang?.label ?? code }) });
  };

  return (
    <View style={[styles.root, { backgroundColor: C.bg }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Feather name="settings" size={20} color={COLORS.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.heroTitle, { color: C.text }]}>{t('title')}</Text>
            <Text style={[styles.heroSub, { color: C.muted }]}>{t('subtitle')}</Text>
          </View>
        </View>

        {/* Appearance */}
        <View style={[styles.section, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={[styles.sectionHeader, { borderBottomColor: C.border }]}>
            <View style={styles.sectionIconIndigo}>
              <Feather name="droplet" size={16} color="#4f46e5" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: C.text }]}>{t('appearance.title')}</Text>
              <Text style={[styles.sectionSub, { color: C.muted }]}>{t('appearance.subtitle')}</Text>
            </View>
          </View>

          <View style={styles.themeGrid}>
            {THEME_OPTIONS.map((opt) => {
              const active = themeChoice === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => handleThemeSelect(opt.id)}
                  style={({ pressed }) => [
                    styles.themeCard,
                    { borderColor: active ? COLORS.brand : C.border },
                    active && styles.themeCardActive,
                    pressed && { opacity: 0.95 },
                  ]}
                >
                  {active && (
                    <View style={styles.themeCheck}>
                      <Feather name="check" size={12} color="#fff" />
                    </View>
                  )}
                  <LinearGradient
                    colors={opt.preview}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.themePreview, { borderColor: opt.border }]}
                  >
                    <Feather name={opt.icon} size={24} color={opt.accent} />
                  </LinearGradient>
                  <Text style={[styles.themeLabel, { color: C.text }]}>{t(`theme.${opt.id}`)}</Text>
                  <Text style={[styles.themeDesc, { color: C.mutedSoft }]}>{t(`theme.${opt.id}Desc`)}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Language */}
        <View style={[styles.section, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={[styles.sectionHeader, { borderBottomColor: C.border }]}>
            <View style={styles.sectionIconGreen}>
              <Feather name="globe" size={16} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: C.text }]}>{t('language.title')}</Text>
              <Text style={[styles.sectionSub, { color: C.muted }]}>{t('language.subtitle')}</Text>
            </View>
          </View>

          <View style={styles.langList}>
            {LANGUAGES.map((lang) => {
              const active = language === lang.code;
              return (
                <Pressable
                  key={lang.code}
                  onPress={() => handleLanguageSelect(lang.code)}
                  style={({ pressed }) => [
                    styles.langRow,
                    { borderColor: active ? COLORS.brand : C.border },
                    active && styles.langRowActive,
                    pressed && { opacity: 0.95 },
                  ]}
                >
                  <Text style={styles.flag}>{lang.flag}</Text>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.langLabel, { color: C.text }]}>{lang.label}</Text>
                    <Text style={[styles.langNative, { color: C.muted }]}>
                      {lang.native} · {lang.dir.toUpperCase()}
                    </Text>
                  </View>
                  {active ? (
                    <View style={styles.langCheck}>
                      <Feather name="check" size={12} color="#fff" />
                    </View>
                  ) : (
                    <Text style={[styles.langCode, { color: C.mutedSoft }]}>
                      {lang.code.toUpperCase()}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>

          <View style={[styles.footnote, { borderTopColor: C.border }]}>
            <Feather name="info" size={12} color={C.mutedSoft} />
            <Text style={[styles.footnoteText, { color: C.muted }]}>{t('language.footnote')}</Text>
          </View>
        </View>

        {/* Security */}
        <View style={[styles.section, { backgroundColor: C.card, borderColor: C.border }]}>
          <Pressable
            onPress={() => router.push('/(app)/change-password')}
            style={({ pressed }) => [styles.sectionHeader, { borderBottomWidth: 0 }, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
          >
            <View style={styles.sectionIconIndigo}>
              <Feather name="lock" size={16} color="#4f46e5" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: C.text }]}>Change password</Text>
              <Text style={[styles.sectionSub, { color: C.muted }]}>
                Update your password and sign out other devices.
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={C.mutedSoft} />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 32, gap: 16 },

  hero: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 4 },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#ccfbf1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { fontSize: 22, fontWeight: '800' },
  heroSub: { fontSize: 13, marginTop: 2 },

  section: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionIconIndigo: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionIconGreen: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { fontSize: 15, fontWeight: '800' },
  sectionSub: { fontSize: 11, marginTop: 2 },

  soonPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#fef3c7',
    borderRadius: 999,
  },
  soonPillText: { fontSize: 9, fontWeight: '800', color: '#92400e', letterSpacing: 1 },

  themeGrid: { padding: 14, gap: 12 },
  themeCard: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 12,
    gap: 8,
    position: 'relative',
  },
  themeCardActive: { shadowColor: COLORS.brand, shadowOpacity: 0.15, shadowRadius: 6, elevation: 2 },
  themeCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  themePreview: {
    height: 80,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeLabel: { fontSize: 14, fontWeight: '800', marginTop: 4 },
  themeDesc: { fontSize: 11 },

  langList: { padding: 14, gap: 10 },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderWidth: 2,
    borderRadius: 14,
  },
  langRowActive: {
    backgroundColor: 'rgba(0,145,142,0.06)',
  },
  flag: { fontSize: 28 },
  langLabel: { fontSize: 14, fontWeight: '800' },
  langNative: { fontSize: 11, marginTop: 1 },
  langCode: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  langCheck: {
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },

  footnote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footnoteText: { fontSize: 11, flex: 1 },
});
