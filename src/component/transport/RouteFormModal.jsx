import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useUserStore } from '../../store/userStore';
import { useBranchesDropdown } from '../../hooks/useBranchProfilesList';
import {
  useActiveVehiclesDropdown,
  useCreateRoute,
  useUpdateRoute,
} from '../../hooks/useTransport';
import { useColors } from '../../theme/useColors';
import { COLORS } from '../../theme/colors';

const blankStop = (sequence = 1) => ({
  name: '',
  sequence,
  pickupTime: '',
  dropTime: '',
  fee: '',
  latitude: '',
  longitude: '',
  landmark: '',
});

export default function RouteFormModal({ open, route, onClose }) {
  const C = useColors();
  const { user } = useUserStore();
  const isEdit = !!route;
  const isAdmin = !!user?.role?.isPredefined;
  const canCreateAllBranch =
    isAdmin || !!user?.role?.actions?.includes('create-all-branch-route');
  const canViewAllBranchVehicles =
    isAdmin || !!user?.role?.actions?.includes('view-all-branch-vehicle');
  const userBranchId = user?.branchId || user?.branch?._id || '';

  const [branchId, setBranchId] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [startPoint, setStartPoint] = useState('');
  const [endPoint, setEndPoint] = useState('');
  const [distanceKm, setDistanceKm] = useState('');
  const [estimatedDurationMin, setEstimatedDurationMin] = useState('');
  const [baseFee, setBaseFee] = useState('');
  const [stops, setStops] = useState([blankStop(1)]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      setBranchId(route.branchId?._id || route.branchId || '');
      setName(route.name || '');
      setCode(route.code || '');
      setDescription(route.description || '');
      setVehicleId(route.vehicleId?._id || route.vehicleId || '');
      setStartPoint(route.startPoint || '');
      setEndPoint(route.endPoint || '');
      setDistanceKm(route.distanceKm != null ? String(route.distanceKm) : '');
      setEstimatedDurationMin(route.estimatedDurationMin != null ? String(route.estimatedDurationMin) : '');
      setBaseFee(route.baseFee != null ? String(route.baseFee) : '');
      setStops(
        (route.stops || []).map((s, i) => ({
          name: s.name || '',
          sequence: s.sequence ?? i + 1,
          pickupTime: s.pickupTime || '',
          dropTime: s.dropTime || '',
          fee: s.fee != null ? String(s.fee) : '',
          latitude: s.latitude != null ? String(s.latitude) : '',
          longitude: s.longitude != null ? String(s.longitude) : '',
          landmark: s.landmark || '',
        })),
      );
      setNotes(route.notes || '');
    } else {
      setBranchId(canCreateAllBranch ? '' : userBranchId);
      setName('');
      setCode('');
      setDescription('');
      setVehicleId('');
      setStartPoint('');
      setEndPoint('');
      setDistanceKm('');
      setEstimatedDurationMin('');
      setBaseFee('');
      setStops([blankStop(1)]);
      setNotes('');
    }
  }, [open, isEdit, route, canCreateAllBranch, userBranchId]);

  const { data: branchData } = useBranchesDropdown({
    enabled: open && canCreateAllBranch && !isEdit,
  });
  const branches = branchData?.data || [];

  const effectiveBranchForVehicles = canViewAllBranchVehicles
    ? branchId || undefined
    : userBranchId;
  const { data: vehicleData } = useActiveVehiclesDropdown({
    branchId: effectiveBranchForVehicles,
    enabled: open,
  });
  const vehicles = vehicleData?.data || [];

  const createMutation = useCreateRoute({ onSuccess: () => onClose() });
  const updateMutation = useUpdateRoute({ id: route?._id, onSuccess: () => onClose() });
  const isPending = createMutation.isPending || updateMutation.isPending;

  const updateStop = (i, patch) =>
    setStops((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const removeStop = (i) =>
    setStops((prev) =>
      prev.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, sequence: idx + 1 })),
    );
  const moveStop = (i, dir) =>
    setStops((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next.map((s, idx) => ({ ...s, sequence: idx + 1 }));
    });
  const addStop = () => setStops((prev) => [...prev, blankStop(prev.length + 1)]);

  const validate = () => {
    if (!isEdit && !branchId) return 'Branch is required';
    if (!name.trim()) return 'Route name is required';
    if (!startPoint.trim()) return 'Start point is required';
    if (!endPoint.trim()) return 'End point is required';
    if (baseFee === '' || Number(baseFee) < 0) return 'Base fee must be ≥ 0';
    if (!stops.length) return 'At least one stop is required';
    const seqSet = new Set();
    for (let i = 0; i < stops.length; i++) {
      const s = stops[i];
      if (!s.name.trim()) return `Stop ${i + 1}: name is required`;
      if (!/^\d{2}:\d{2}$/.test(s.pickupTime)) return `Stop ${i + 1}: pickup time must be HH:mm`;
      if (!/^\d{2}:\d{2}$/.test(s.dropTime)) return `Stop ${i + 1}: drop time must be HH:mm`;
      if (!s.sequence || seqSet.has(s.sequence))
        return `Stop ${i + 1}: sequence must be unique`;
      seqSet.add(s.sequence);
      if (s.fee !== '' && Number(s.fee) < 0) return `Stop ${i + 1}: fee must be ≥ 0`;
    }
    return null;
  };

  const submit = () => {
    const err = validate();
    if (err) {
      Toast.show({ type: 'error', text1: 'Invalid', text2: err });
      return;
    }
    const payload = {
      name: name.trim(),
      startPoint: startPoint.trim(),
      endPoint: endPoint.trim(),
      baseFee: Number(baseFee),
      stops: stops.map((s) => {
        const out = {
          name: s.name.trim(),
          sequence: Number(s.sequence),
          pickupTime: s.pickupTime,
          dropTime: s.dropTime,
        };
        if (s.fee !== '' && !Number.isNaN(Number(s.fee))) out.fee = Number(s.fee);
        if (s.latitude !== '' && !Number.isNaN(Number(s.latitude)))
          out.latitude = Number(s.latitude);
        if (s.longitude !== '' && !Number.isNaN(Number(s.longitude)))
          out.longitude = Number(s.longitude);
        if (s.landmark.trim()) out.landmark = s.landmark.trim();
        return out;
      }),
    };
    // On edit an emptied optional field must be SENT so the backend clears it:
    // vehicleId/code/distance/duration → null (a blank code would collide on the
    // per-school unique code index), description/notes → ''. On create, omit.
    const optional = (value, cleared) => {
      if (value !== undefined) return value;
      return isEdit ? cleared : undefined;
    };
    const num = (v) => (v !== '' && !Number.isNaN(Number(v)) ? Number(v) : undefined);
    const optionalFields = {
      code: optional(code.trim() || undefined, null),
      description: optional(description.trim() || undefined, ''),
      vehicleId: optional(vehicleId || undefined, null),
      distanceKm: optional(num(distanceKm), null),
      estimatedDurationMin: optional(num(estimatedDurationMin), null),
      notes: optional(notes.trim() || undefined, ''),
    };
    Object.entries(optionalFields).forEach(([k, v]) => {
      if (v !== undefined) payload[k] = v;
    });
    if (!isEdit) payload.branchId = branchId;

    if (isEdit) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  };

  return (
    <Modal
      visible={open}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.safe, { backgroundColor: C.card }]} edges={['top', 'bottom']}>
        <View style={[styles.header, { borderBottomColor: C.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: C.text }]}>
              {isEdit ? 'Edit Route' : 'New Route'}
            </Text>
            <Text style={[styles.subtitle, { color: C.muted }]}>
              {isEdit ? 'Update details, stops, and vehicle' : 'Define a route with stops'}
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={10}
            style={({ pressed }) => [styles.closeBtn, { backgroundColor: C.bg }, pressed && { opacity: 0.6 }]}
          >
            <Feather name="x" size={20} color={C.text} />
          </Pressable>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.section, { color: C.muted }]}>ROUTE</Text>

            {!isEdit && canCreateAllBranch && (
              <Picker
                label="BRANCH *"
                options={branches.map((b) => ({ value: b._id, label: b.name }))}
                value={branchId}
                onChange={setBranchId}
                C={C}
                emptyHint="No branches loaded."
              />
            )}

            <Field label="NAME *" C={C}>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Route A — North"
                placeholderTextColor={C.mutedSoft}
                style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
              />
            </Field>
            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Field label="CODE" C={C}>
                  <TextInput
                    value={code}
                    onChangeText={setCode}
                    placeholder="R-01"
                    placeholderTextColor={C.mutedSoft}
                    autoCapitalize="characters"
                    style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="BASE FEE *" C={C}>
                  <TextInput
                    value={baseFee}
                    onChangeText={setBaseFee}
                    keyboardType="number-pad"
                    placeholder="4500"
                    placeholderTextColor={C.mutedSoft}
                    style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
                  />
                </Field>
              </View>
            </View>

            <Picker
              label="VEHICLE"
              options={[
                { value: '', label: '— None —' },
                ...vehicles.map((v) => ({
                  value: v._id,
                  label: `${v.registrationNumber} (${v.capacity})`,
                })),
              ]}
              value={vehicleId}
              onChange={setVehicleId}
              C={C}
            />

            <Field label="START POINT *" C={C}>
              <TextInput
                value={startPoint}
                onChangeText={setStartPoint}
                placeholder="Main Campus"
                placeholderTextColor={C.mutedSoft}
                style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
              />
            </Field>
            <Field label="END POINT *" C={C}>
              <TextInput
                value={endPoint}
                onChangeText={setEndPoint}
                placeholder="Sector G-9 Markaz"
                placeholderTextColor={C.mutedSoft}
                style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
              />
            </Field>

            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Field label="DISTANCE (KM)" C={C}>
                  <TextInput
                    value={distanceKm}
                    onChangeText={setDistanceKm}
                    keyboardType="decimal-pad"
                    style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="EST. DURATION (MIN)" C={C}>
                  <TextInput
                    value={estimatedDurationMin}
                    onChangeText={setEstimatedDurationMin}
                    keyboardType="number-pad"
                    style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
                  />
                </Field>
              </View>
            </View>

            <Field label="DESCRIPTION" C={C}>
              <TextInput
                value={description}
                onChangeText={setDescription}
                multiline
                style={[
                  styles.input,
                  {
                    height: 60,
                    textAlignVertical: 'top',
                    paddingTop: 10,
                    color: C.text,
                    borderColor: C.border,
                    backgroundColor: C.bg,
                  },
                ]}
              />
            </Field>

            <View style={[styles.stopsHeader, { borderColor: C.border }]}>
              <Text style={[styles.section, { color: C.muted, marginTop: 0 }]}>
                STOPS  ·  {stops.length}
              </Text>
              <Pressable
                onPress={addStop}
                style={({ pressed }) => [
                  styles.addStopBtn,
                  { borderColor: COLORS.brand },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Feather name="plus" size={13} color={COLORS.brand} />
                <Text style={[styles.addStopText, { color: COLORS.brand }]}>Add stop</Text>
              </Pressable>
            </View>

            {stops.map((s, i) => (
              <View key={i} style={[styles.stopCard, { backgroundColor: C.bg, borderColor: C.border }]}>
                <View style={styles.stopHeader}>
                  <View style={[styles.seqBadge, { backgroundColor: COLORS.brand + '18' }]}>
                    <Text style={[styles.seqText, { color: COLORS.brand }]}>{s.sequence}</Text>
                  </View>
                  <View style={styles.stopActions}>
                    <Pressable
                      onPress={() => moveStop(i, -1)}
                      disabled={i === 0}
                      style={({ pressed }) => [
                        styles.stopActionBtn,
                        { borderColor: C.border, backgroundColor: C.card },
                        (i === 0 || pressed) && { opacity: 0.5 },
                      ]}
                    >
                      <Feather name="chevron-up" size={13} color={C.text} />
                    </Pressable>
                    <Pressable
                      onPress={() => moveStop(i, 1)}
                      disabled={i === stops.length - 1}
                      style={({ pressed }) => [
                        styles.stopActionBtn,
                        { borderColor: C.border, backgroundColor: C.card },
                        (i === stops.length - 1 || pressed) && { opacity: 0.5 },
                      ]}
                    >
                      <Feather name="chevron-down" size={13} color={C.text} />
                    </Pressable>
                    <Pressable
                      onPress={() => removeStop(i)}
                      style={({ pressed }) => [
                        styles.stopActionBtn,
                        { borderColor: '#fecaca', backgroundColor: '#fee2e2' },
                        pressed && { opacity: 0.6 },
                      ]}
                    >
                      <Feather name="trash-2" size={13} color="#dc2626" />
                    </Pressable>
                  </View>
                </View>

                <Field label="NAME *" C={C}>
                  <TextInput
                    value={s.name}
                    onChangeText={(v) => updateStop(i, { name: v })}
                    placeholder="Stop name"
                    placeholderTextColor={C.mutedSoft}
                    style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.card }]}
                  />
                </Field>
                <View style={styles.row2}>
                  <View style={{ flex: 1 }}>
                    <Field label="PICKUP (HH:MM) *" C={C}>
                      <TextInput
                        value={s.pickupTime}
                        onChangeText={(v) => updateStop(i, { pickupTime: v })}
                        placeholder="07:15"
                        placeholderTextColor={C.mutedSoft}
                        keyboardType="numbers-and-punctuation"
                        autoCapitalize="none"
                        style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.card }]}
                      />
                    </Field>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="DROP (HH:MM) *" C={C}>
                      <TextInput
                        value={s.dropTime}
                        onChangeText={(v) => updateStop(i, { dropTime: v })}
                        placeholder="14:00"
                        placeholderTextColor={C.mutedSoft}
                        keyboardType="numbers-and-punctuation"
                        autoCapitalize="none"
                        style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.card }]}
                      />
                    </Field>
                  </View>
                </View>
                <View style={styles.row2}>
                  <View style={{ flex: 1 }}>
                    <Field label="FEE" C={C}>
                      <TextInput
                        value={s.fee}
                        onChangeText={(v) => updateStop(i, { fee: v })}
                        keyboardType="number-pad"
                        placeholder="—"
                        placeholderTextColor={C.mutedSoft}
                        style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.card }]}
                      />
                    </Field>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="LANDMARK" C={C}>
                      <TextInput
                        value={s.landmark}
                        onChangeText={(v) => updateStop(i, { landmark: v })}
                        style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.card }]}
                      />
                    </Field>
                  </View>
                </View>
                <View style={styles.row2}>
                  <View style={{ flex: 1 }}>
                    <Field label="LATITUDE" C={C}>
                      <TextInput
                        value={s.latitude}
                        onChangeText={(v) => updateStop(i, { latitude: v })}
                        keyboardType="decimal-pad"
                        style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.card }]}
                      />
                    </Field>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="LONGITUDE" C={C}>
                      <TextInput
                        value={s.longitude}
                        onChangeText={(v) => updateStop(i, { longitude: v })}
                        keyboardType="decimal-pad"
                        style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.card }]}
                      />
                    </Field>
                  </View>
                </View>
              </View>
            ))}

            <Field label="NOTES" C={C}>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                multiline
                style={[
                  styles.input,
                  {
                    height: 70,
                    textAlignVertical: 'top',
                    paddingTop: 10,
                    color: C.text,
                    borderColor: C.border,
                    backgroundColor: C.bg,
                  },
                ]}
              />
            </Field>

            <Pressable
              onPress={submit}
              disabled={isPending}
              style={({ pressed }) => [
                styles.submit,
                (isPending || pressed) && { opacity: 0.85 },
              ]}
            >
              {isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="check" size={16} color="#fff" />
                  <Text style={styles.submitText}>
                    {isEdit ? 'Save Changes' : 'Create Route'}
                  </Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function Field({ label, C, children }) {
  return (
    <View>
      <Text style={[styles.label, { color: C.muted }]}>{label}</Text>
      {children}
    </View>
  );
}

function Picker({ label, options, value, onChange, C, emptyHint }) {
  return (
    <View>
      <Text style={[styles.label, { color: C.muted }]}>{label}</Text>
      {options.length === 0 ? (
        <Text style={[styles.helper, { color: C.mutedSoft }]}>{emptyHint || 'No options'}</Text>
      ) : (
        <View style={styles.chipRow}>
          {options.map((opt) => {
            const active = value === opt.value;
            return (
              <Pressable
                key={opt.value || '__none__'}
                onPress={() => onChange(opt.value)}
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
                  numberOfLines={1}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
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

  section: { fontSize: 11, letterSpacing: 1.1, fontWeight: '800', marginTop: 6 },
  label: { fontSize: 10, letterSpacing: 1.1, fontWeight: '700', marginBottom: 6 },
  helper: { fontSize: 12 },

  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  row2: { flexDirection: 'row', gap: 10 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: 260,
  },
  chipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText: { fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#fff' },

  stopsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  addStopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  addStopText: { fontSize: 11, fontWeight: '800' },

  stopCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  stopHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  seqBadge: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seqText: { fontSize: 12, fontWeight: '800' },
  stopActions: { flexDirection: 'row', gap: 6 },
  stopActionBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

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
