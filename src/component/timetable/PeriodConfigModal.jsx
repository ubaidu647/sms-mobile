import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import KeyboardAvoidingView from '../KeyboardAvoidingView';
import ToastModal from '../ToastModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useUserStore } from '../../store/userStore';
import { useBranchesDropdown } from '../../hooks/useBranchProfilesList';
import {
  useCreatePeriodConfig,
  useUpdatePeriodConfig,
} from '../../hooks/useTimetable';
import {
  DAYS,
  DAY_SHORT,
  PERIOD_TYPES,
  addMinutes,
  isHHmm,
  titleCase,
} from '../../constants/timetable';
import { useColors } from '../../theme/useColors';
import { COLORS } from '../../theme/colors';

const blankPeriod = (n, prevEnd) => ({
  number: n,
  name: `Period ${n}`,
  startTime: prevEnd || '08:00',
  endTime: addMinutes(prevEnd || '08:00', 45),
  type: 'lesson',
});

export default function PeriodConfigModal({ open, config, onClose }) {
  const isEdit = !!config;
  const C = useColors();
  const { user } = useUserStore();

  const isAdmin = !!user?.role?.isPredefined;
  const canCreateAllBranch =
    isAdmin || !!user?.role?.actions?.includes('create-all-branch-timetable');
  const userBranchId =
    (typeof user?.branchId === 'string' && user.branchId) ||
    user?.branchId?._id ||
    user?.branch?._id ||
    '';

  const [name, setName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [workingDays, setWorkingDays] = useState(['mon', 'tue', 'wed', 'thu', 'fri']);
  const [periods, setPeriods] = useState([blankPeriod(1)]);
  const [branchId, setBranchId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [status, setStatus] = useState('active');

  const { data: branchData } = useBranchesDropdown({
    enabled: canCreateAllBranch && open && !isEdit,
  });
  const branches = branchData?.data || [];

  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      setName(config.name || '');
      setIsDefault(!!config.isDefault);
      setWorkingDays(config.workingDays || []);
      setPeriods(
        (config.periods || []).map((p) => ({
          number: p.number,
          name: p.name,
          startTime: p.startTime,
          endTime: p.endTime,
          type: p.type,
        })),
      );
      setBranchId(config.branchId || '');
      setIsActive(config.isActive !== false);
      setStatus(config.status || 'active');
    } else {
      setName('Standard Schedule');
      setIsDefault(false);
      setWorkingDays(['mon', 'tue', 'wed', 'thu', 'fri']);
      setPeriods([blankPeriod(1)]);
      setBranchId(canCreateAllBranch ? '' : userBranchId);
      setIsActive(true);
      setStatus('active');
    }
  }, [open, isEdit, config, canCreateAllBranch, userBranchId]);

  const toggleDay = (d) =>
    setWorkingDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const addPeriod = () => {
    const last = periods[periods.length - 1];
    const num = (last?.number || 0) + 1;
    setPeriods((prev) => [...prev, blankPeriod(num, last?.endTime)]);
  };

  const removePeriod = (idx) => {
    setPeriods((prev) => prev.filter((_, i) => i !== idx));
  };

  const updatePeriod = (idx, patch) =>
    setPeriods((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));

  const validate = () => {
    if (!name.trim()) return 'Name is required';
    if (!workingDays.length) return 'Pick at least one working day';
    if (!periods.length) return 'Add at least one period';
    const seen = new Set();
    for (let i = 0; i < periods.length; i++) {
      const p = periods[i];
      if (!p.name) return `Period #${i + 1}: name is required`;
      if (!isHHmm(p.startTime)) return `Period #${i + 1}: start must be HH:mm`;
      if (!isHHmm(p.endTime)) return `Period #${i + 1}: end must be HH:mm`;
      if (p.endTime <= p.startTime)
        return `Period #${i + 1}: end must be after start`;
      if (seen.has(p.number))
        return `Period #${i + 1}: duplicate number ${p.number}`;
      seen.add(p.number);
    }
    if (canCreateAllBranch && !branchId && !isEdit) return 'Branch is required';
    return null;
  };

  const create = useCreatePeriodConfig({ onSuccess: () => onClose() });
  const update = useUpdatePeriodConfig({ id: config?._id, onSuccess: () => onClose() });
  const mut = isEdit ? update : create;

  const handleSubmit = () => {
    const err = validate();
    if (err) {
      Toast.show({ type: 'error', text1: 'Invalid', text2: err });
      return;
    }
    const payload = {
      name: name.trim(),
      isDefault,
      workingDays,
      periods: periods.map((p) => ({
        number: Number(p.number),
        name: p.name.trim(),
        startTime: p.startTime,
        endTime: p.endTime,
        type: p.type,
      })),
    };
    if (canCreateAllBranch && branchId && !isEdit) payload.branchId = branchId;
    if (isEdit) {
      payload.status = status;
      payload.isActive = isActive;
    }
    mut.mutate(payload);
  };

  return (
    <ToastModal
      visible={open}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.safe, { backgroundColor: C.card }]} edges={['top', 'bottom']}>
        <View style={[styles.header, { borderBottomColor: C.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: C.text }]}>
              {isEdit ? 'Edit Period Config' : 'New Period Config'}
            </Text>
            <Text style={[styles.subtitle, { color: C.muted }]}>
              Daily structure — periods, times, working days
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={10}
            style={({ pressed }) => [
              styles.closeBtn,
              { backgroundColor: C.bg },
              pressed && { opacity: 0.6 },
            ]}
          >
            <Feather name="x" size={20} color={C.text} />
          </Pressable>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View>
              <Text style={[styles.label, { color: C.muted }]}>NAME *</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Standard Schedule"
                placeholderTextColor={C.mutedSoft}
                style={[
                  styles.input,
                  { color: C.text, borderColor: C.border, backgroundColor: C.bg },
                ]}
              />
            </View>

            {!isEdit && canCreateAllBranch && (
              <View>
                <Text style={[styles.label, { color: C.muted }]}>BRANCH *</Text>
                <View style={styles.chipRow}>
                  {branches.map((b) => {
                    const active = branchId === b._id;
                    return (
                      <Pressable
                        key={b._id}
                        onPress={() => setBranchId(b._id)}
                        style={({ pressed }) => [
                          styles.chip,
                          { backgroundColor: C.bg, borderColor: C.border },
                          active && styles.chipActive,
                          pressed && { opacity: 0.85 },
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            { color: C.text },
                            active && styles.chipTextActive,
                          ]}
                        >
                          {b.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            <Pressable
              onPress={() => setIsDefault((v) => !v)}
              style={({ pressed }) => [
                styles.toggleRow,
                {
                  backgroundColor: isDefault ? '#fef3c7' : C.bg,
                  borderColor: isDefault ? '#fde68a' : C.border,
                },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Feather
                name={isDefault ? 'check-square' : 'square'}
                size={14}
                color={isDefault ? '#92400e' : C.mutedSoft}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.toggleText, { color: isDefault ? '#92400e' : C.text }]}>
                  Branch default
                </Text>
                <Text style={[styles.toggleHint, { color: isDefault ? '#92400e' : C.muted }]}>
                  Used by all section editors.
                </Text>
              </View>
            </Pressable>

            <View>
              <Text style={[styles.label, { color: C.muted }]}>WORKING DAYS</Text>
              <View style={styles.chipRow}>
                {DAYS.map((d) => {
                  const active = workingDays.includes(d);
                  return (
                    <Pressable
                      key={d}
                      onPress={() => toggleDay(d)}
                      style={({ pressed }) => [
                        styles.dayChip,
                        { backgroundColor: C.bg, borderColor: C.border },
                        active && styles.chipActive,
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: C.text },
                          active && styles.chipTextActive,
                        ]}
                      >
                        {DAY_SHORT[d]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.periodsHeader}>
              <Text style={[styles.label, { color: C.muted, marginBottom: 0 }]}>
                PERIODS ({periods.length})
              </Text>
              <Pressable
                onPress={addPeriod}
                style={({ pressed }) => [
                  styles.addPeriodBtn,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Feather name="plus" size={12} color="#fff" />
                <Text style={styles.addPeriodText}>Add</Text>
              </Pressable>
            </View>

            {periods.map((p, idx) => (
              <View
                key={idx}
                style={[styles.periodCard, { backgroundColor: C.bg, borderColor: C.border }]}
              >
                <View style={styles.periodHeader}>
                  <View style={styles.numBadge}>
                    <Text style={styles.numBadgeText}>{p.number}</Text>
                  </View>
                  <TextInput
                    value={p.name}
                    onChangeText={(v) => updatePeriod(idx, { name: v })}
                    placeholder="Period name"
                    placeholderTextColor={C.mutedSoft}
                    style={[
                      styles.periodName,
                      { color: C.text, borderColor: C.border, backgroundColor: C.card },
                    ]}
                  />
                  <Pressable
                    onPress={() => removePeriod(idx)}
                    hitSlop={6}
                    style={({ pressed }) => [styles.removeBtn, pressed && { opacity: 0.6 }]}
                  >
                    <Feather name="trash-2" size={16} color="#dc2626" />
                  </Pressable>
                </View>
                <View style={styles.periodTimeRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.miniLabel, { color: C.mutedSoft }]}>START</Text>
                    <TextInput
                      value={p.startTime}
                      onChangeText={(v) => updatePeriod(idx, { startTime: v })}
                      placeholder="08:00"
                      placeholderTextColor={C.mutedSoft}
                      keyboardType="numbers-and-punctuation"
                      autoCapitalize="none"
                      style={[
                        styles.timeInput,
                        { color: C.text, borderColor: C.border, backgroundColor: C.card },
                      ]}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.miniLabel, { color: C.mutedSoft }]}>END</Text>
                    <TextInput
                      value={p.endTime}
                      onChangeText={(v) => updatePeriod(idx, { endTime: v })}
                      placeholder="08:45"
                      placeholderTextColor={C.mutedSoft}
                      keyboardType="numbers-and-punctuation"
                      autoCapitalize="none"
                      style={[
                        styles.timeInput,
                        { color: C.text, borderColor: C.border, backgroundColor: C.card },
                      ]}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.miniLabel, { color: C.mutedSoft }]}>NUMBER</Text>
                    <TextInput
                      value={String(p.number ?? '')}
                      onChangeText={(v) =>
                        updatePeriod(idx, { number: Number(v.replace(/[^0-9]/g, '')) || 0 })
                      }
                      keyboardType="number-pad"
                      style={[
                        styles.timeInput,
                        { color: C.text, borderColor: C.border, backgroundColor: C.card },
                      ]}
                    />
                  </View>
                </View>
                <View>
                  <Text style={[styles.miniLabel, { color: C.mutedSoft }]}>TYPE</Text>
                  <View style={styles.chipRow}>
                    {PERIOD_TYPES.map((t) => {
                      const active = p.type === t;
                      return (
                        <Pressable
                          key={t}
                          onPress={() => updatePeriod(idx, { type: t })}
                          style={({ pressed }) => [
                            styles.miniChip,
                            { backgroundColor: C.card, borderColor: C.border },
                            active && {
                              backgroundColor: COLORS.brand,
                              borderColor: COLORS.brand,
                            },
                            pressed && { opacity: 0.85 },
                          ]}
                        >
                          <Text
                            style={[
                              styles.miniChipText,
                              { color: active ? '#fff' : C.text },
                            ]}
                          >
                            {titleCase(t)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>
            ))}

            <Text style={[styles.helper, { color: C.mutedSoft }]}>
              Period numbers must be unique. End time must be after start time.
            </Text>

            {isEdit && (
              <Pressable
                onPress={() => setIsActive((v) => !v)}
                style={({ pressed }) => [
                  styles.toggleRow,
                  {
                    backgroundColor: isActive ? '#dcfce7' : C.bg,
                    borderColor: isActive ? '#86efac' : C.border,
                  },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Feather
                  name={isActive ? 'check-square' : 'square'}
                  size={14}
                  color={isActive ? '#166534' : C.mutedSoft}
                />
                <Text style={[styles.toggleText, { color: isActive ? '#166534' : C.text }]}>
                  Active
                </Text>
              </Pressable>
            )}

            <Pressable
              onPress={handleSubmit}
              disabled={mut.isPending}
              style={({ pressed }) => [
                styles.submit,
                (mut.isPending || pressed) && { opacity: 0.85 },
              ]}
            >
              {mut.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="check" size={16} color="#fff" />
                  <Text style={styles.submitText}>
                    {isEdit ? 'Save Changes' : 'Create Config'}
                  </Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ToastModal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  title: { fontSize: 19, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 4 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: 16, paddingBottom: 32, gap: 14 },

  label: { fontSize: 10, letterSpacing: 1.1, fontWeight: '700', marginBottom: 6 },
  miniLabel: { fontSize: 9, letterSpacing: 1.1, fontWeight: '700', marginBottom: 4 },
  helper: { fontSize: 11 },

  input: {
    height: 42,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText: { fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  dayChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 52,
    alignItems: 'center',
  },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  toggleText: { fontSize: 13, fontWeight: '700' },
  toggleHint: { fontSize: 11, marginTop: 2 },

  periodsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addPeriodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    height: 30,
    borderRadius: 999,
    backgroundColor: COLORS.brand,
  },
  addPeriodText: { color: '#fff', fontWeight: '800', fontSize: 11 },

  periodCard: { borderRadius: 12, padding: 10, borderWidth: 1, gap: 8 },
  periodHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  numBadge: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numBadgeText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  periodName: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 13,
    fontWeight: '600',
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodTimeRow: { flexDirection: 'row', gap: 8 },
  timeInput: {
    height: 36,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 13,
    fontWeight: '700',
  },

  miniChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  miniChipText: { fontSize: 11, fontWeight: '700' },

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
