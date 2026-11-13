import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import {
  useRoleDetail,
  useToggleRoleStatus,
  useDeleteRole,
} from '../../../../src/hooks/useRoles';
import { useUserStore } from '../../../../src/store/userStore';
import { useColors } from '../../../../src/theme/useColors';
import { COLORS } from '../../../../src/theme/colors';
import { hasAnyAction } from '../../../../src/utils/permissions';
import {
  AVAILABLE_MENUS,
  AVAILABLE_ACTIONS,
} from '../../../../src/constants/rolePermissions';
import EditRoleModal from '../../../../src/component/EditRoleModal';
import { usePlanFeatures } from '../../../../src/hooks/usePlanFeatures';
import { featureForMenu } from '../../../../src/utils/planFeatures';

const MENU_LABELS = Object.fromEntries(AVAILABLE_MENUS.map((m) => [m.key, m.label]));
const ACTION_DEFS = Object.fromEntries(AVAILABLE_ACTIONS.map((a) => [a.key, a]));

function fmtDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return '—';
  }
}

function InfoCard({ label, value, color }) {
  const C = useColors();
  return (
    <View style={[styles.infoCard, { backgroundColor: C.card, borderColor: C.border }]}>
      <Text style={[styles.infoLabel, { color: C.mutedSoft }]}>{label.toUpperCase()}</Text>
      <Text style={[styles.infoValue, { color: color || C.text }]} numberOfLines={2}>
        {value || '—'}
      </Text>
    </View>
  );
}

function Pill({ label, bg, fg }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export default function RoleDetailPage() {
  const router = useRouter();
  const { roleId } = useLocalSearchParams();
  const C = useColors();
  const { user } = useUserStore();

  const { data: role, isLoading, error } = useRoleDetail(roleId);
  const { isEnabled } = usePlanFeatures();

  const userBranchId =
    (typeof user?.branchId === 'string' && user.branchId) ||
    user?.branchId?._id ||
    user?.branch?._id ||
    null;

  const isPredefined = !!role?.isPredefined;
  const canUpdate =
    !isPredefined &&
    hasAnyAction(user?.role, ['update-role', 'update-all-branch-role']);
  const canDelete =
    !isPredefined &&
    hasAnyAction(user?.role, ['delete-role', 'delete-all-branch-role']);

  const canActOnAllBranches =
    !!user?.role?.isPredefined ||
    !!user?.role?.actions?.includes('delete-all-branch-role');
  const rowBranchId = role?.branch?._id || null;
  const branchScopeOk =
    canActOnAllBranches || (userBranchId && rowBranchId && String(userBranchId) === String(rowBranchId));

  const [editOpen, setEditOpen] = useState(false);
  const toggle = useToggleRoleStatus();
  const del = useDeleteRole({ onSuccess: () => router.back() });

  const onToggle = () => {
    if (!role?._id) return;
    Alert.alert(
      role.isActive ? 'Disable Role' : 'Enable Role',
      `Are you sure you want to ${role.isActive ? 'disable' : 'enable'} "${role.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => toggle.mutate(role._id) },
      ],
    );
  };

  const onDelete = () => {
    if (!role?._id) return;
    Alert.alert(
      'Delete Role',
      `Permanently delete "${role.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => del.mutate(role._id),
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: C.bg }]}>
        <ActivityIndicator size="large" color={COLORS.brand} />
      </View>
    );
  }

  if (error || !role) {
    return (
      <View style={[styles.center, { backgroundColor: C.bg }]}>
        <Feather name="alert-circle" size={36} color={COLORS.red} />
        <Text style={[styles.errorText, { color: C.muted }]}>
          {error?.response?.data?.message || error?.message || 'Role not found'}
        </Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  // Menus/actions of modules the school's plan lacks are not shown. The role
  // still holds them (an edit saves them back untouched).
  const inPlan = (menuKey) => isEnabled(featureForMenu(menuKey));
  const shownMenus = (role.menus || []).filter(inPlan);
  const shownActions = (role.actions || []).filter((a) => {
    const def = ACTION_DEFS[a];
    return !def || inPlan(def.menu);
  });

  const groupedActions = AVAILABLE_MENUS.filter((m) => shownMenus.includes(m.key))
    .map((m) => ({
      ...m,
      actions: shownActions.filter((a) => ACTION_DEFS[a]?.menu === m.key),
    }))
    .filter((g) => g.actions.length > 0);

  const ungroupedActions = shownActions.filter((a) => {
    const def = ACTION_DEFS[a];
    return !def || !shownMenus.includes(def.menu);
  });

  return (
    <View style={[styles.safe, { backgroundColor: C.bg }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={({ pressed }) => [styles.backBtnIcon, pressed && { opacity: 0.6 }]}
          >
            <Feather name="arrow-left" size={20} color={C.text} />
          </Pressable>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.title, { color: C.text }]} numberOfLines={1}>
              {role.name}
            </Text>
            <Text style={[styles.subtitle, { color: C.muted }]} numberOfLines={1}>
              {role.branch?.name || '—'}
            </Text>
          </View>
          <View style={styles.pillsTop}>
            <Pill
              bg={role.isActive ? '#dcfce7' : '#fee2e2'}
              fg={role.isActive ? '#166534' : '#991b1b'}
              label={role.isActive ? 'Active' : 'Disabled'}
            />
            <Pill
              bg={isPredefined ? '#dbeafe' : '#f3f4f6'}
              fg={isPredefined ? '#1d4ed8' : '#374151'}
              label={isPredefined ? 'Predefined' : 'Custom'}
            />
          </View>
        </View>

        <View style={styles.grid}>
          <InfoCard label="Serial No." value={role.serialNumber} />
          <InfoCard label="Created" value={fmtDate(role.createdAt)} />
          <InfoCard label="Updated" value={fmtDate(role.updatedAt)} />
          <InfoCard label="Actions Count" value={`${shownActions.length}`} />
        </View>

        <View style={[styles.section, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Menus</Text>
          {shownMenus.length ? (
            <View style={styles.chipWrap}>
              {shownMenus.map((m) => (
                <View key={m} style={styles.menuChip}>
                  <Text style={styles.menuChipText}>{MENU_LABELS[m] || m}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.emptyText, { color: C.mutedSoft }]}>No menus assigned</Text>
          )}
        </View>

        <View style={[styles.section, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>
            Actions ({shownActions.length})
          </Text>
          {groupedActions.length === 0 && ungroupedActions.length === 0 && (
            <Text style={[styles.emptyText, { color: C.mutedSoft }]}>
              No actions assigned
            </Text>
          )}
          {groupedActions.map((group) => (
            <View key={group.key} style={{ gap: 6, marginTop: 6 }}>
              <Text style={[styles.groupLabel, { color: C.muted }]}>
                {group.label.toUpperCase()}
              </Text>
              <View style={styles.chipWrap}>
                {group.actions.map((a) => {
                  const def = ACTION_DEFS[a];
                  const isOwn = def?.scope === 'own';
                  return (
                    <View
                      key={a}
                      style={[
                        styles.actionChip,
                        isOwn && styles.actionChipOwn,
                      ]}
                    >
                      <Text
                        style={[
                          styles.actionChipText,
                          isOwn && styles.actionChipTextOwn,
                        ]}
                      >
                        {def?.label || a}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
          {ungroupedActions.length > 0 && (
            <View style={{ gap: 6, marginTop: 10 }}>
              <Text style={[styles.groupLabel, { color: C.muted }]}>OTHER</Text>
              <View style={styles.chipWrap}>
                {ungroupedActions.map((a) => (
                  <View key={a} style={styles.actionChip}>
                    <Text style={styles.actionChipText}>{a}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {(canUpdate || canDelete) && branchScopeOk && (
          <View style={styles.actionsRow}>
            {canUpdate && (
              <Pressable
                onPress={() => setEditOpen(true)}
                style={({ pressed }) => [
                  styles.actionBtn,
                  { backgroundColor: COLORS.brand },
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Feather name="edit-2" size={16} color="#fff" />
                <Text style={styles.actionBtnText}>Edit</Text>
              </Pressable>
            )}
            {canDelete && (
              <Pressable
                onPress={onToggle}
                disabled={toggle.isPending}
                style={({ pressed }) => [
                  styles.actionBtn,
                  { backgroundColor: role.isActive ? '#b45309' : '#047857' },
                  (toggle.isPending || pressed) && { opacity: 0.8 },
                ]}
              >
                {toggle.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Feather
                      name={role.isActive ? 'slash' : 'check-circle'}
                      size={16}
                      color="#fff"
                    />
                    <Text style={styles.actionBtnText}>
                      {role.isActive ? 'Disable' : 'Enable'}
                    </Text>
                  </>
                )}
              </Pressable>
            )}
            {canDelete && (
              <Pressable
                onPress={onDelete}
                disabled={del.isPending}
                style={({ pressed }) => [
                  styles.actionBtn,
                  { backgroundColor: '#b91c1c' },
                  (del.isPending || pressed) && { opacity: 0.8 },
                ]}
              >
                {del.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Feather name="trash-2" size={16} color="#fff" />
                    <Text style={styles.actionBtnText}>Delete</Text>
                  </>
                )}
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>

      <EditRoleModal
        open={editOpen}
        role={role}
        onClose={() => setEditOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 14, paddingBottom: 32, gap: 14 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  errorText: { fontSize: 14, textAlign: 'center' },
  backBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: COLORS.brand,
    borderRadius: 999,
    marginTop: 8,
  },
  backBtnText: { color: '#fff', fontWeight: '700' },
  backBtnIcon: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 22, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 2 },
  pillsTop: { gap: 4, alignItems: 'flex-end' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  infoCard: {
    flexBasis: '48%',
    flexGrow: 1,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    gap: 4,
  },
  infoLabel: { fontSize: 10, letterSpacing: 1.1, fontWeight: '700' },
  infoValue: { fontSize: 14, fontWeight: '700' },

  section: { borderRadius: 14, padding: 14, borderWidth: 1, gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '800' },
  emptyText: { fontSize: 12 },
  groupLabel: { fontSize: 10, letterSpacing: 1.1, fontWeight: '700' },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  menuChip: {
    backgroundColor: '#ccfbf1',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  menuChipText: { color: '#0f766e', fontWeight: '700', fontSize: 11 },

  actionChip: {
    backgroundColor: '#eef2ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  actionChipText: { color: '#3730a3', fontWeight: '700', fontSize: 11 },
  actionChipOwn: { backgroundColor: '#fef3c7', borderColor: '#fde68a' },
  actionChipTextOwn: { color: '#92400e' },

  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  pillText: { fontSize: 10, fontWeight: '700' },

  actionsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionBtn: {
    flex: 1,
    minWidth: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 10,
  },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
