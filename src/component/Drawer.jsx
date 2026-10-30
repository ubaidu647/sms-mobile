import { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { usePathname, useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { useUserStore } from '../store/userStore';
import { COLORS } from '../theme/colors';
import { useIsDark } from '../theme/useColors';
import { canSee, hasAnyAction, isSuperAdmin } from '../utils/permissions';
import { useTranslations } from '../i18n';

const { width: SCREEN_W } = Dimensions.get('window');
const DRAWER_W = Math.min(300, SCREEN_W * 0.82);

// Super-admins get the system module nav only (mirrors web's separate
// SystemSidebar); everyone else gets the school nav below.
const SYSTEM_MENU = [
  { label: 'Organizations', icon: 'grid', path: '/(app)/system/organizations' },
  { label: 'Packages', icon: 'package', path: '/(app)/system/packages' },
  { label: 'Subscriptions', icon: 'credit-card', path: '/(app)/system/subscriptions' },
];

// Order mirrors the web sidebar (sms-frontend/src/component/SideBar.jsx).
// Dashboard is prepended because mobile uses it as the home tab.
// `path: null` items render the "Soon" badge until the screen lands on mobile.
// `visible(role)` hides menus a role can't access, mirroring web's isItemVisible.
// Each predicate matches the RBAC the destination screen uses to gate itself, so
// a restricted user never sees a menu that dead-ends on a "No access" screen.
// Items with no `visible` are always shown (e.g. Dashboard, the home tab).
const SCHOOL_MENU = [
  { label: 'Dashboard', icon: 'home', path: '/(app)/dashboard' },
  { label: 'Branches', tKey: 'branches', icon: 'git-branch', path: '/(app)/branches', visible: (r) => canSee(r, 'view-branch') },
  { label: 'Staff', tKey: 'staff', icon: 'users', path: '/(app)/staff', visible: (r) => canSee(r, 'view-staff') },
  { label: 'Roles', tKey: 'role', icon: 'shield', path: '/(app)/roles', visible: (r) => canSee(r, 'view-role') },
  { label: 'Classes', tKey: 'classes', icon: 'layers', path: '/(app)/classes', visible: (r) => canSee(r, 'view-class') },
  { label: 'Subjects', tKey: 'subjects', icon: 'book-open', path: '/(app)/subjects', visible: (r) => canSee(r, 'view-subject') },
  { label: 'Students', tKey: 'students', icon: 'user', path: '/(app)/students', visible: (r) => canSee(r, 'view-student') },
  { label: 'Attendance', tKey: 'attendance', icon: 'check-square', path: '/(app)/attendance', visible: (r) => canSee(r, 'view-attendance') },
  { label: 'Staff Attendance', tKey: 'staffAttendance', icon: 'user-check', path: '/(app)/staff-attendance', visible: (r) => canSee(r, 'view-staff-attendance') },
  { label: 'Leave', icon: 'calendar', path: '/(app)/leave', visible: (r) => canSee(r, 'view-leave') || canSee(r, 'approve-leave') },
  { label: 'My Leave', icon: 'sunrise', path: '/(app)/my-leave', visible: (r) => hasAnyAction(r, ['apply-own-leave']) },
  {
    label: 'Staff Salary',
    tKey: 'staffSalary',
    icon: 'dollar-sign',
    path: '/(app)/staff-salary',
    // Parent of the salary tabs (dashboard/structures/payslips/policy).
    visible: (r) =>
      canSee(r, 'view-payslip') ||
      canSee(r, 'view-staff-salary') ||
      canSee(r, 'view-staff-salary-policy'),
  },
  { label: 'Teacher Assignments', tKey: 'teacherAssignments', icon: 'book', path: '/(app)/teacher-assignments', visible: (r) => canSee(r, 'view-teaching-assignment') },
  { label: 'Exams', tKey: 'exams', icon: 'file-text', path: '/(app)/exams', visible: (r) => canSee(r, 'view-exam') },
  { label: 'Timetable', tKey: 'timetable', icon: 'calendar', path: '/(app)/timetable', visible: (r) => canSee(r, 'view-timetable') },
  { label: 'Fees', tKey: 'fees', icon: 'credit-card', path: '/(app)/fees', visible: (r) => canSee(r, 'view-fee') },
  { label: 'Announcements', tKey: 'announcements', icon: 'volume-2', path: '/(app)/announcements', visible: (r) => canSee(r, 'view-announcement') },
  {
    label: 'Transport',
    tKey: 'transport',
    icon: 'truck',
    path: '/(app)/transport',
    // Parent of the transport tabs (vehicles/routes/assignments).
    visible: (r) =>
      canSee(r, 'view-vehicle') ||
      canSee(r, 'view-route') ||
      canSee(r, 'view-transport-assignment') ||
      hasAnyAction(r, ['assign-transport', 'assign-all-branch-transport']),
  },
  { label: 'Branch Profile', tKey: 'branchProfile', icon: 'briefcase', path: '/(app)/branches/my-profile', visible: (r) => canSee(r, 'view-branch-profile') },
  {
    label: 'Reports',
    tKey: 'reports',
    icon: 'bar-chart-2',
    path: '/(app)/reports',
    visible: (r) =>
      hasAnyAction(r, ['student-defaults-list-view', 'student-defaults-list-view-all-branch']),
  },
  { label: 'Billing', tKey: 'billing', icon: 'credit-card', path: '/(app)/billing', visible: (r) => canSee(r, 'view-billing') },
];

export default function Drawer({ open, onClose }) {
  const slide = useRef(new Animated.Value(-DRAWER_W)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuth();
  const user = useUserStore((s) => s.user);
  const isDark = useIsDark();
  const drawerBg = isDark ? '#0f172a' : COLORS.brand;
  const t = useTranslations('sidebar');
  const menu = isSuperAdmin(user?.role) ? SYSTEM_MENU : SCHOOL_MENU;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slide, {
        toValue: open ? 0 : -DRAWER_W,
        duration: 240,
        useNativeDriver: true,
      }),
      Animated.timing(fade, {
        toValue: open ? 1 : 0,
        duration: 240,
        useNativeDriver: true,
      }),
    ]).start();
  }, [open]);

  const handleNav = (item) => {
    if (!item.path) {
      Toast.show({
        type: 'info',
        text1: item.label,
        text2: 'Coming soon on mobile',
      });
      onClose();
      return;
    }
    onClose();
    router.push(item.path);
  };

  const roleLabel =
    typeof user?.role === 'string' ? user.role : user?.role?.name ?? 'Member';

  return (
    <Modal
      visible={open}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View style={[styles.backdrop, { opacity: fade }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.drawer,
          { backgroundColor: drawerBg, transform: [{ translateX: slide }] },
        ]}
      >
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          <View style={styles.brand}>
            <View style={styles.brandLogo}>
              <Image
                source={require('../../assets/logo.png')}
                style={{ width: 28, height: 28 }}
                resizeMode="contain"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.brandTitle}>nodeCampus</Text>
              <Text style={styles.brandSub}>School Management</Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
            >
              <Feather name="x" size={20} color="#fff" />
            </Pressable>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingVertical: 8 }}
            showsVerticalScrollIndicator={false}
          >
            {menu.filter((item) => !item.visible || item.visible(user?.role)).map((item) => {
              const active = item.path && pathname?.startsWith(item.path.replace('/(app)', ''));
              return (
                <Pressable
                  key={item.label}
                  onPress={() => handleNav(item)}
                  style={({ pressed }) => [
                    styles.menuRow,
                    active && styles.menuRowActive,
                    pressed && { backgroundColor: 'rgba(255,255,255,0.08)' },
                  ]}
                >
                  <Feather
                    name={item.icon}
                    size={18}
                    color={active ? COLORS.accent : 'rgba(255,255,255,0.9)'}
                  />
                  <Text style={[styles.menuLabel, active && styles.menuLabelActive]}>
                    {item.tKey ? t(item.tKey) : item.label}
                  </Text>
                  {!item.path && (
                    <Text style={styles.menuBadge}>Soon</Text>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.userRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(user?.name?.[0] || 'U').toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.userName} numberOfLines={1}>
                  {user?.name || 'User'}
                </Text>
                <Text style={styles.userRole} numberOfLines={1}>
                  {roleLabel}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => {
                onClose();
                logout();
              }}
              style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.85 }]}
            >
              <Feather name="log-out" size={16} color="#fff" />
              <Text style={styles.logoutText}>{t('logout')}</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: DRAWER_W,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.18)',
  },
  brandLogo: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  brandSub: { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },

  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuRowActive: { backgroundColor: 'rgba(255,255,255,0.12)' },
  menuLabel: { color: 'rgba(255,255,255,0.92)', fontSize: 14, fontWeight: '600', flex: 1 },
  menuLabelActive: { color: COLORS.accent, fontWeight: '800' },
  menuBadge: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },

  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
    gap: 10,
  },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700' },
  userName: { color: '#fff', fontSize: 14, fontWeight: '700' },
  userRole: { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  logoutText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
