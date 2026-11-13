import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useUserStore } from '../../src/store/userStore';
import { useColors } from '../../src/theme/useColors';
import { COLORS } from '../../src/theme/colors';
import { resolveScope, hasAnyAction } from '../../src/utils/permissions';
import MarkStaffAttendancePanel from '../../src/component/staffAttendance/MarkStaffAttendancePanel';
import CalendarViewPanel from '../../src/component/staffAttendance/CalendarViewPanel';
import MonthlySummaryPanel from '../../src/component/staffAttendance/MonthlySummaryPanel';
import UnmarkedBranchesPanel from '../../src/component/staffAttendance/UnmarkedBranchesPanel';
import OwnAttendancePanel from '../../src/component/staffAttendance/OwnAttendancePanel';
import PlanFeatureGate from '../../src/component/PlanFeatureGate';

function StaffAttendanceScreen() {
  const C = useColors();
  const { user } = useUserStore();

  const scope = resolveScope(user?.role, 'view-staff-attendance');
  const isOwnOnly = scope === 'own';
  const isOrgLevel = scope === 'all';
  const canView = scope !== 'none';
  const canMark = hasAnyAction(user?.role, [
    'mark-staff-attendance',
    'mark-all-branch-staff-attendance',
  ]);

  const TABS = [
    (canMark || canView) && { key: 'mark', label: 'Mark', icon: 'check-square' },
    canView && { key: 'calendar', label: 'Calendar', icon: 'calendar' },
    canView && { key: 'summary', label: 'Summary', icon: 'bar-chart-2' },
    isOrgLevel && { key: 'unmarked', label: 'Unmarked', icon: 'alert-circle' },
  ].filter(Boolean);

  const [tab, setTab] = useState(TABS[0]?.key || 'mark');

  // Teacher / staff with view-own only — render their personal panel directly.
  if (isOwnOnly) {
    return (
      <View style={[styles.root, { backgroundColor: C.bg }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: C.text }]}>My Staff Attendance</Text>
          <Text style={[styles.sub, { color: C.muted }]}>
            Your personal attendance history and monthly summary
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <OwnAttendancePanel />
        </View>
      </View>
    );
  }

  if (TABS.length === 0) {
    return (
      <View style={[styles.root, { backgroundColor: C.bg }]}>
        <View style={styles.center}>
          <Feather name="lock" size={36} color={COLORS.red} />
          <Text style={[styles.title, { color: C.text }]}>No access</Text>
          <Text style={[styles.sub, { color: C.muted, textAlign: 'center' }]}>
            You don't have permission to view or mark staff attendance.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: C.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: C.text }]}>Staff Attendance</Text>
        <Text style={[styles.sub, { color: C.muted }]}>
          Mark, review and audit staff attendance
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabScroll}
        contentContainerStyle={styles.tabRow}
      >
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              style={({ pressed }) => [
                styles.tab,
                { backgroundColor: C.card, borderColor: C.border },
                active && styles.tabActive,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Feather name={t.icon} size={14} color={active ? '#fff' : C.muted} />
              <Text
                style={[styles.tabLabel, { color: active ? '#fff' : C.text }]}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ flex: 1 }}>
        {tab === 'mark' && <MarkStaffAttendancePanel />}
        {tab === 'calendar' && <CalendarViewPanel />}
        {tab === 'summary' && <MonthlySummaryPanel />}
        {tab === 'unmarked' && <UnmarkedBranchesPanel />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { padding: 14, paddingBottom: 4 },
  title: { fontSize: 24, fontWeight: '800' },
  sub: { fontSize: 13, marginTop: 4 },

  tabScroll: { flexGrow: 0, flexShrink: 0 },
  tabRow: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    alignItems: 'center',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  tabActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  tabLabel: { fontSize: 13, fontWeight: '700' },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
});

// The plan may not include this module: show "Upgrade required" instead.
export default function StaffAttendanceScreenRoute() {
  return (
    <PlanFeatureGate feature="staff-attendance">
      <StaffAttendanceScreen />
    </PlanFeatureGate>
  );
}
