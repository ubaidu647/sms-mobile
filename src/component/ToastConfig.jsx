import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors, useIsDark } from '../theme/useColors';

const TYPE_STYLES = {
  success: {
    icon: 'check',
    accent: '#10b981',
    softBg: '#ecfdf5',
    softDarkBg: '#022c22',
  },
  error: {
    icon: 'alert-octagon',
    accent: '#ef4444',
    softBg: '#fef2f2',
    softDarkBg: '#3b0d0d',
  },
  info: {
    icon: 'info',
    accent: '#0d9488',
    softBg: '#ecfeff',
    softDarkBg: '#042f2e',
  },
};

function ToastShell({ type, text1, text2, onClose }) {
  const C = useColors();
  const isDark = useIsDark();
  const t = TYPE_STYLES[type] || TYPE_STYLES.info;

  return (
    <View style={[styles.outer, { backgroundColor: C.card, borderColor: C.border }]}>
      <View style={[styles.accent, { backgroundColor: t.accent }]} />
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: isDark ? t.softDarkBg : t.softBg },
        ]}
      >
        <Feather name={t.icon} size={18} color={t.accent} />
      </View>
      <View style={styles.textWrap}>
        {!!text1 && (
          <Text style={[styles.title, { color: C.text }]} numberOfLines={2}>
            {text1}
          </Text>
        )}
        {!!text2 && (
          <Text style={[styles.sub, { color: C.muted }]} numberOfLines={3}>
            {text2}
          </Text>
        )}
      </View>
      <Pressable
        onPress={onClose}
        hitSlop={10}
        style={({ pressed }) => [styles.close, pressed && { opacity: 0.6 }]}
      >
        <Feather name="x" size={14} color={C.mutedSoft} />
      </Pressable>
    </View>
  );
}

// Shared by the root <Toast> and the ones inside modals (ToastModal).
export const toastDefaults = { topOffset: 60, visibilityTime: 3000 };

export const toastConfig = {
  success: ({ text1, text2, hide }) => (
    <ToastShell type="success" text1={text1} text2={text2} onClose={hide} />
  ),
  error: ({ text1, text2, hide }) => (
    <ToastShell type="error" text1={text1} text2={text2} onClose={hide} />
  ),
  info: ({ text1, text2, hide }) => (
    <ToastShell type="info" text1={text1} text2={text2} onClose={hide} />
  ),
};

const styles = StyleSheet.create({
  outer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '92%',
    minHeight: 60,
    paddingRight: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  accent: {
    width: 4,
    alignSelf: 'stretch',
    marginRight: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  textWrap: { flex: 1, marginLeft: 12, marginVertical: 12, gap: 2 },
  title: { fontSize: 14, fontWeight: '800' },
  sub: { fontSize: 12, lineHeight: 17 },
  close: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
});
