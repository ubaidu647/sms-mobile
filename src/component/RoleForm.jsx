import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useUserStore } from '../store/userStore';
import { useBranchesDropdown } from '../hooks/useBranchProfilesList';
import { useColors } from '../theme/useColors';
import { COLORS } from '../theme/colors';
import {
  AVAILABLE_ACTIONS,
  AVAILABLE_MENUS,
  PRESETS,
} from '../constants/rolePermissions';
import { usePlanFeatures } from '../hooks/usePlanFeatures';
import { filterActionsByPlan, filterMenusByPlan } from '../utils/planFeatures';

const initialForm = { name: '', branchId: '', menus: [], actions: [] };

export default function RoleForm({
  mode = 'create',
  role,
  onSubmit,
  isPending,
  submitLabel,
}) {
  const C = useColors();
  const { user } = useUserStore();

  const isAdmin = !!user?.role?.isPredefined;
  const canChangeBranch =
    mode === 'create'
      ? isAdmin
      : isAdmin || !!user?.role?.actions?.includes('update-all-branch-role');
  const userBranchId =
    (typeof user?.branchId === 'string' && user.branchId) ||
    user?.branchId?._id ||
    user?.branch?._id ||
    '';

  const { data: branchesData, isLoading: branchesLoading } = useBranchesDropdown({
    enabled: canChangeBranch,
  });
  const branches = branchesData?.data || [];

  // Menus/actions of a module the school's plan lacks are never offered. A
  // role being edited that already holds some keeps them: they stay in
  // `form` (seeded from the role) and are saved untouched, just not shown.
  const { features } = usePlanFeatures();

  // For non-admins, only menus/actions they already have can be granted.
  const allowedMenus = useMemo(
    () =>
      filterMenusByPlan(
        canChangeBranch
          ? AVAILABLE_MENUS
          : AVAILABLE_MENUS.filter((m) => user?.role?.menus?.includes(m.key)),
        features,
      ),
    [canChangeBranch, user?.role?.menus, features],
  );

  const allowedActions = useMemo(
    () =>
      filterActionsByPlan(
        canChangeBranch
          ? AVAILABLE_ACTIONS
          : AVAILABLE_ACTIONS.filter((a) => user?.role?.actions?.includes(a.key)),
        features,
      ),
    [canChangeBranch, user?.role?.actions, features],
  );

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (mode === 'edit' && role) {
      setForm({
        name: role.name || '',
        branchId:
          role.branch?._id || role.branchId || (canChangeBranch ? '' : userBranchId),
        menus: role.menus || [],
        actions: role.actions || [],
      });
      setErrors({});
    } else if (mode === 'create') {
      setForm({
        ...initialForm,
        branchId: canChangeBranch ? '' : userBranchId,
      });
      setErrors({});
    }
  }, [mode, role, canChangeBranch, userBranchId]);

  const setField = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  const toggleItem = (field, key) => {
    setForm((prev) => {
      const current = prev[field] || [];
      const has = current.includes(key);
      const next = has ? current.filter((k) => k !== key) : [...current, key];

      if (field === 'menus' && has) {
        const removedActionKeys = allowedActions
          .filter((a) => a.menu === key)
          .map((a) => a.key);
        const cleanedActions = (prev.actions || []).filter(
          (a) => !removedActionKeys.includes(a),
        );
        return { ...prev, menus: next, actions: cleanedActions };
      }
      return { ...prev, [field]: next };
    });
  };

  const applyPreset = (presetKey) => {
    const p = PRESETS[presetKey];
    if (!p) return;
    const allowedMenuKeys = new Set(allowedMenus.map((m) => m.key));
    const allowedActionKeys = new Set(allowedActions.map((a) => a.key));
    setForm((prev) => ({
      ...prev,
      name: p.name,
      menus: p.menus.filter((m) => allowedMenuKeys.has(m)),
      actions: p.actions.filter((a) => allowedActionKeys.has(a)),
    }));
  };

  const validate = () => {
    const e = {};
    if (!form.name?.trim()) e.name = 'Role name is required';
    if (!form.branchId) e.branchId = 'Branch is required';
    if (!form.menus?.length) e.menus = 'Select at least one menu';
    if (!form.actions?.length) e.actions = 'Select at least one action';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const payload = {
      name: form.name.trim(),
      menus: form.menus,
      actions: form.actions,
    };
    // Non-org users can't change branch on edit; only attach when allowed
    if (mode === 'create' || canChangeBranch) payload.branchId = form.branchId;
    onSubmit?.(payload);
  };

  const actionsByMenu = useMemo(
    () =>
      allowedMenus
        .filter((menu) => form.menus.includes(menu.key))
        .map((menu) => ({
          ...menu,
          actions: allowedActions.filter(
            (a) => a.menu === menu.key && a.scope !== 'own',
          ),
        }))
        .filter((g) => g.actions.length > 0),
    [allowedMenus, allowedActions, form.menus],
  );

  const ownActionsByMenu = useMemo(
    () =>
      allowedMenus
        .filter((menu) => form.menus.includes(menu.key))
        .map((menu) => ({
          ...menu,
          actions: allowedActions.filter(
            (a) => a.menu === menu.key && a.scope === 'own',
          ),
        }))
        .filter((g) => g.actions.length > 0),
    [allowedMenus, allowedActions, form.menus],
  );

  return (
    <View style={{ gap: 18 }}>
      {/* Presets — only meaningful on create */}
      {mode === 'create' && (
        <View>
          <Text style={[styles.label, { color: C.muted }]}>QUICK PRESETS</Text>
          <View style={styles.chipRow}>
            {Object.entries(PRESETS).map(([key, preset]) => (
              <Pressable
                key={key}
                onPress={() => applyPreset(key)}
                style={({ pressed }) => [
                  styles.presetChip,
                  { backgroundColor: C.card, borderColor: C.border },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Feather name="zap" size={12} color={COLORS.brand} />
                <Text style={[styles.presetChipText, { color: C.text }]}>
                  {preset.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.helper, { color: C.mutedSoft }]}>
            Applies a recommended set — you can still adjust before saving.
          </Text>
        </View>
      )}

      {/* Role Name */}
      <View>
        <Text style={[styles.label, { color: C.muted }]}>
          ROLE NAME <Text style={{ color: COLORS.red }}>*</Text>
        </Text>
        <TextInput
          value={form.name}
          onChangeText={(v) => setField('name', v)}
          placeholder="e.g. Branch Manager"
          placeholderTextColor={C.mutedSoft}
          style={[
            styles.input,
            { color: C.text, borderColor: errors.name ? COLORS.red : C.border, backgroundColor: C.bg },
          ]}
        />
        {!!errors.name && <Text style={styles.error}>{errors.name}</Text>}
      </View>

      {/* Branch */}
      {canChangeBranch && (
        <View>
          <Text style={[styles.label, { color: C.muted }]}>
            BRANCH <Text style={{ color: COLORS.red }}>*</Text>
          </Text>
          {branchesLoading ? (
            <View style={[styles.input, { borderColor: C.border, backgroundColor: C.bg, justifyContent: 'center' }]}>
              <ActivityIndicator size="small" color={COLORS.brand} />
            </View>
          ) : (
            <View style={styles.chipRow}>
              {branches.map((b) => {
                const active = form.branchId === b._id;
                return (
                  <Pressable
                    key={b._id}
                    onPress={() => setField('branchId', b._id)}
                    style={({ pressed }) => [
                      styles.branchChip,
                      { backgroundColor: C.bg, borderColor: C.border },
                      active && styles.branchChipActive,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.branchChipText,
                        { color: C.text },
                        active && styles.branchChipTextActive,
                      ]}
                    >
                      {b.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
          {!!errors.branchId && <Text style={styles.error}>{errors.branchId}</Text>}
        </View>
      )}

      {/* Menus */}
      <View>
        <Text style={[styles.label, { color: C.muted }]}>
          MENUS <Text style={{ color: COLORS.red }}>*</Text>
        </Text>
        <View style={styles.chipRow}>
          {allowedMenus.map((menu) => {
            const checked = form.menus.includes(menu.key);
            return (
              <Pressable
                key={menu.key}
                onPress={() => toggleItem('menus', menu.key)}
                style={({ pressed }) => [
                  styles.menuChip,
                  { backgroundColor: C.bg, borderColor: C.border },
                  checked && styles.menuChipActive,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text
                  style={[
                    styles.menuChipText,
                    { color: C.text },
                    checked && styles.menuChipTextActive,
                  ]}
                >
                  {menu.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {!!errors.menus && <Text style={styles.error}>{errors.menus}</Text>}
      </View>

      {/* Actions grouped by selected menus */}
      <View>
        <Text style={[styles.label, { color: C.muted }]}>
          ACTIONS <Text style={{ color: COLORS.red }}>*</Text>
        </Text>
        {form.menus.length === 0 && (
          <Text style={[styles.helper, { color: C.mutedSoft }]}>
            Select a menu above to see its actions.
          </Text>
        )}
        <View style={{ gap: 14 }}>
          {actionsByMenu.map((group) => (
            <View key={group.key} style={{ gap: 6 }}>
              <Text style={[styles.groupLabel, { color: C.mutedSoft }]}>
                {group.label.toUpperCase()}
              </Text>
              <View style={styles.chipRow}>
                {group.actions.map((action) => {
                  const checked = form.actions.includes(action.key);
                  return (
                    <Pressable
                      key={action.key}
                      onPress={() => toggleItem('actions', action.key)}
                      style={({ pressed }) => [
                        styles.actionChip,
                        { backgroundColor: C.bg, borderColor: C.border },
                        checked && styles.actionChipActive,
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.actionChipText,
                          { color: C.text },
                          checked && styles.actionChipTextActive,
                        ]}
                      >
                        {action.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
        {!!errors.actions && <Text style={styles.error}>{errors.actions}</Text>}
      </View>

      {/* Self-scoped — amber treatment to flag they're weaker than branch grants */}
      {ownActionsByMenu.length > 0 && (
        <View style={[styles.ownBlock, { borderTopColor: C.border }]}>
          <Text style={[styles.label, { color: C.text }]}>
            SELF-SCOPED <Text style={{ color: C.mutedSoft, fontWeight: '500' }}>(own data only)</Text>
          </Text>
          <Text style={[styles.helper, { color: C.mutedSoft, marginBottom: 8 }]}>
            These permissions only let the user see/update their own record.
          </Text>
          <View style={{ gap: 14 }}>
            {ownActionsByMenu.map((group) => (
              <View key={`own-${group.key}`} style={{ gap: 6 }}>
                <Text style={[styles.groupLabel, { color: C.mutedSoft }]}>
                  {group.label.toUpperCase()}
                </Text>
                <View style={styles.chipRow}>
                  {group.actions.map((action) => {
                    const checked = form.actions.includes(action.key);
                    return (
                      <Pressable
                        key={action.key}
                        onPress={() => toggleItem('actions', action.key)}
                        style={({ pressed }) => [
                          styles.actionChip,
                          { backgroundColor: C.bg, borderColor: C.border },
                          checked && styles.actionChipOwnActive,
                          pressed && { opacity: 0.85 },
                        ]}
                      >
                        <Text
                          style={[
                            styles.actionChipText,
                            { color: C.text },
                            checked && styles.actionChipTextActive,
                          ]}
                        >
                          {action.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      <Pressable
        onPress={handleSubmit}
        disabled={isPending}
        style={({ pressed }) => [
          styles.submit,
          (isPending || pressed) && { opacity: 0.8 },
        ]}
      >
        {isPending ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Feather name="check" size={16} color="#fff" />
            <Text style={styles.submitText}>{submitLabel || 'Save'}</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 11, letterSpacing: 1.1, fontWeight: '700', marginBottom: 8 },
  helper: { fontSize: 11, marginTop: 4 },
  groupLabel: { fontSize: 10, letterSpacing: 1.1, fontWeight: '700' },

  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  error: { color: COLORS.red, fontSize: 11, marginTop: 4 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },

  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  presetChipText: { fontSize: 12, fontWeight: '600' },

  branchChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  branchChipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  branchChipText: { fontSize: 13, fontWeight: '600' },
  branchChipTextActive: { color: '#fff' },

  menuChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
  },
  menuChipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  menuChipText: { fontSize: 13, fontWeight: '600' },
  menuChipTextActive: { color: '#fff' },

  actionChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  actionChipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  actionChipOwnActive: { backgroundColor: '#f59e0b', borderColor: '#f59e0b' },
  actionChipText: { fontSize: 12, fontWeight: '600' },
  actionChipTextActive: { color: '#fff' },

  ownBlock: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 14 },

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
