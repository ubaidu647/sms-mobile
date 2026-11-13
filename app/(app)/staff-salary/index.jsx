import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useUserStore } from '../../../src/store/userStore';
import { useColors } from '../../../src/theme/useColors';
import { COLORS } from '../../../src/theme/colors';
import { canEditScope, hasAnyAction, resolveScope } from '../../../src/utils/permissions';
import DashboardPanel from '../../../src/component/staffSalary/DashboardPanel';
import StructuresPanel from '../../../src/component/staffSalary/StructuresPanel';
import PayslipsPanel from '../../../src/component/staffSalary/PayslipsPanel';
import PolicyPanel from '../../../src/component/staffSalary/PolicyPanel';
import PlanFeatureGate from '../../../src/component/PlanFeatureGate';

function StaffSalaryScreen() {
  const C = useColors();
  const { user } = useUserStore();

  // ── RBAC ─────────────────────────────────────────────────────────────────
  const payslipScope = resolveScope(user?.role, 'view-payslip');
  const structureScope = resolveScope(user?.role, 'view-staff-salary');
  const policyScope = resolveScope(user?.role, 'view-staff-salary-policy');

  const canViewPayslips = payslipScope !== 'none';
  const canViewStructures = structureScope !== 'none';
  // Dashboard uses the branch-summary endpoint — requires non-own access.
  const canViewDashboard =
    payslipScope === 'branch' || payslipScope === 'all';
  const canViewPolicy =
    policyScope === 'branch' || policyScope === 'all';

  const TABS = [
    canViewDashboard && { key: 'dashboard', label: 'Dashboard', icon: 'bar-chart-2' },
    canViewStructures && { key: 'structures', label: 'Structures', icon: 'layers' },
    canViewPayslips && { key: 'payslips', label: 'Payslips', icon: 'file-text' },
    canViewPolicy && { key: 'policy', label: 'Policy', icon: 'sliders' },
  ].filter(Boolean);

  const [tab, setTab] = useState(TABS[0]?.key || 'payslips');

  if (TABS.length === 0) {
    return (
      <View style={[styles.root, { backgroundColor: C.bg }]}>
        <View style={styles.center}>
          <Feather name="lock" size={36} color={COLORS.red} />
          <Text style={[styles.title, { color: C.text }]}>No access</Text>
          <Text style={[styles.sub, { color: C.muted, textAlign: 'center' }]}>
            You don't have permission to view staff salary.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: C.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: C.text }]}>Staff Salary</Text>
        <Text style={[styles.sub, { color: C.muted }]}>
          Salary structures, payslips, payroll and policy
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
              <Text style={[styles.tabLabel, { color: active ? '#fff' : C.text }]}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ flex: 1 }}>
        {tab === 'dashboard' && <DashboardPanel />}
        {tab === 'structures' && <StructuresPanel />}
        {tab === 'payslips' && <PayslipsPanel />}
        {tab === 'policy' && <PolicyPanel />}
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
export default function StaffSalaryScreenRoute() {
  return (
    <PlanFeatureGate feature="staff-salary">
      <StaffSalaryScreen />
    </PlanFeatureGate>
  );
}
