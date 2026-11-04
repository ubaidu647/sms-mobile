import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { useUserStore } from '../store/userStore';
import { useColors } from '../theme/useColors';
import { useTranslations } from '../i18n';

const USER_MGMT_ROLES = ['super-admin', 'admin', 'subadmin'];

export default function SettingsMenu({ open, anchor, onClose }) {
  const user = useUserStore((s) => s.user);
  const { logout } = useAuth();
  const C = useColors();
  const router = useRouter();
  const t = useTranslations('topbar');

  const roleName =
    (typeof user?.role === 'string' ? user.role : user?.role?.name) ?? 'Member';
  const showUserMgmt = USER_MGMT_ROLES.includes(roleName?.toLowerCase());

  if (!anchor) return null;

  const top = anchor.y + anchor.height + 6;
  const right = 8;

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View
          style={[
            styles.menu,
            {
              top,
              right,
              backgroundColor: C.card,
              borderColor: C.border,
            },
          ]}
        >
          <View style={[styles.header, { borderBottomColor: C.border }]}>
            <Text style={[styles.name, { color: C.text }]} numberOfLines={1}>
              {user?.name ?? 'User'}
            </Text>
            <Text style={[styles.role, { color: C.muted }]} numberOfLines={1}>
              {roleName}
            </Text>
          </View>

          <MenuRow
            icon="settings"
            label={t('settings')}
            color={C.text}
            iconColor={C.muted}
            onPress={() => {
              onClose();
              router.push('/(app)/settings');
            }}
          />

          <MenuRow
            icon="lock"
            label={t('changePassword')}
            color={C.text}
            iconColor={C.muted}
            onPress={() => {
              onClose();
              router.push('/(app)/change-password');
            }}
          />

          {showUserMgmt && (
            <MenuRow
              icon="users"
              label={t('userManagement')}
              color={C.text}
              iconColor={C.muted}
              onPress={() => {
                onClose();
                Toast.show({
                  type: 'info',
                  text1: 'User Management',
                  text2: 'Coming soon on mobile',
                });
              }}
            />
          )}

          <View style={[styles.divider, { backgroundColor: C.border }]} />

          <MenuRow
            icon="log-out"
            label={t('logout')}
            color="#dc2626"
            iconColor="#dc2626"
            onPress={() => {
              onClose();
              logout();
            }}
          />
        </View>
      </Pressable>
    </Modal>
  );
}

function MenuRow({ icon, label, color, iconColor, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
    >
      <Feather name={icon} size={16} color={iconColor} />
      <Text style={[styles.rowLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.18)' },
  menu: {
    position: 'absolute',
    width: 220,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  header: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  name: { fontSize: 14, fontWeight: '700' },
  role: { fontSize: 11, marginTop: 2, textTransform: 'capitalize' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  rowLabel: { fontSize: 13, fontWeight: '600' },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
});
