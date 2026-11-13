import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useUserStore } from '../../../src/store/userStore';
import { useColors } from '../../../src/theme/useColors';
import { COLORS } from '../../../src/theme/colors';
import { hasAnyAction, resolveScope } from '../../../src/utils/permissions';
import VehiclesPanel from '../../../src/component/transport/VehiclesPanel';
import RoutesPanel from '../../../src/component/transport/RoutesPanel';
import AssignmentsPanel from '../../../src/component/transport/AssignmentsPanel';
import PlanFeatureGate from '../../../src/component/PlanFeatureGate';

function TransportScreen() {
  const C = useColors();
  const { user } = useUserStore();

  const canViewVehicles = resolveScope(user?.role, 'view-vehicle') !== 'none';
  const canViewRoutes = resolveScope(user?.role, 'view-route') !== 'none';
  const canViewAssignments =
    resolveScope(user?.role, 'view-transport-assignment') !== 'none' ||
    hasAnyAction(user?.role, ['assign-transport', 'assign-all-branch-transport']);

  const TABS = [
    canViewVehicles && { key: 'vehicles', label: 'Vehicles', icon: 'truck' },
    canViewRoutes && { key: 'routes', label: 'Routes', icon: 'map' },
    canViewAssignments && { key: 'assignments', label: 'Assignments', icon: 'users' },
  ].filter(Boolean);

  const [tab, setTab] = useState(TABS[0]?.key || 'vehicles');

  if (TABS.length === 0) {
    return (
      <View style={[styles.root, { backgroundColor: C.bg }]}>
        <View style={styles.center}>
          <Feather name="lock" size={36} color={COLORS.red || '#dc2626'} />
          <Text style={[styles.title, { color: C.text }]}>No access</Text>
          <Text style={[styles.sub, { color: C.muted, textAlign: 'center' }]}>
            You don't have permission to view transport.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: C.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: C.text }]}>Transport</Text>
        <Text style={[styles.sub, { color: C.muted }]}>
          Vehicles, routes, and student assignments
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
              <Text style={[styles.tabLabel, { color: active ? '#fff' : C.text }]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ flex: 1 }}>
        {tab === 'vehicles' && <VehiclesPanel />}
        {tab === 'routes' && <RoutesPanel />}
        {tab === 'assignments' && <AssignmentsPanel />}
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

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
});

// The plan may not include this module: show "Upgrade required" instead.
export default function TransportScreenRoute() {
  return (
    <PlanFeatureGate feature="transport">
      <TransportScreen />
    </PlanFeatureGate>
  );
}
