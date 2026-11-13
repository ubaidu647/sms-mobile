import { useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useUserStore } from '../store/userStore';
import { useThemeStore } from '../store/themeStore';
import { useColors, useIsDark } from '../theme/useColors';
import { useTranslations } from '../i18n';
import SettingsMenu from './SettingsMenu';

const TOP_BAR_HEIGHT = 56;

export default function TopBar({ onMenu }) {
  const user = useUserStore((s) => s.user);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const isDark = useIsDark();
  const C = useColors();
  const t = useTranslations('topbar');
  const name = user?.name?.split(' ')?.[0] ?? 'there';

  const [menuOpen, setMenuOpen] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const settingsRef = useRef(null);
  const chevron = useRef(new Animated.Value(0)).current;

  const openMenu = () => {
    settingsRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setMenuOpen(true);
      Animated.timing(chevron, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    });
  };

  const closeMenu = () => {
    setMenuOpen(false);
    Animated.timing(chevron, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  const chevronRotate = chevron.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: C.topbarBg,
          borderBottomColor: C.topbarBorder,
        },
      ]}
    >
      <View style={styles.left}>
        <Pressable
          onPress={onMenu}
          hitSlop={10}
          style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
        >
          <Feather name="menu" size={22} color={C.topbarText} />
        </Pressable>
        <Text style={[styles.greeting, { color: C.topbarText }]} numberOfLines={1}>
          {t('greeting')} <Text style={styles.greetingName}>{name}</Text> 👋
        </Text>
      </View>

      <View style={styles.right}>
        <Pressable
          onPress={toggleTheme}
          hitSlop={8}
          style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
        >
          {isDark ? (
            <Feather name="sun" size={18} color="#fde047" />
          ) : (
            <Feather name="moon" size={18} color={C.muted} />
          )}
        </Pressable>

        <Pressable
          hitSlop={8}
          style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
        >
          <View>
            <Feather name="bell" size={18} color={C.topbarText} />
            <View style={[styles.dot, { borderColor: C.topbarBg }]} />
          </View>
        </Pressable>

        <Pressable
          ref={settingsRef}
          onPress={openMenu}
          hitSlop={8}
          style={({ pressed }) => [
            styles.settingsBtn,
            pressed && { opacity: 0.6 },
          ]}
        >
          <Feather name="settings" size={18} color={C.topbarText} />
          <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
            <Feather name="chevron-down" size={14} color={C.topbarText} />
          </Animated.View>
        </Pressable>
      </View>

      <SettingsMenu open={menuOpen} anchor={anchor} onClose={closeMenu} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: TOP_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    height: 38,
    borderRadius: 10,
  },
  greeting: { fontSize: 15, flexShrink: 1 },
  greetingName: { fontWeight: '800' },
  dot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    borderWidth: 1,
  },
});
