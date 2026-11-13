import { useEffect, useMemo, useState } from 'react';
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
import { useCreateVehicle, useUpdateVehicle } from '../../hooks/useTransport';
import {
  FUEL_TYPES,
  OWNERSHIP_TYPES,
  VEHICLE_STATUSES,
  VEHICLE_TYPES,
  titleCase,
  toYMD,
} from '../../constants/transport';
import { buildVehiclePayload } from '../../utils/vehiclePayload';
import { useColors } from '../../theme/useColors';
import { COLORS } from '../../theme/colors';

const blank = () => ({
  branchId: '',
  registrationNumber: '',
  vehicleType: 'bus',
  make: '',
  modelName: '',
  manufactureYear: '',
  color: '',
  fuelType: 'diesel',
  capacity: '',
  ownership: 'owned',
  insuranceNumber: '',
  insuranceExpiry: '',
  fitnessExpiry: '',
  registrationExpiry: '',
  status: 'active',
  driver: { name: '', phone: '', cnic: '', licenseNumber: '', licenseExpiry: '' },
  conductor: { name: '', phone: '' },
  trackerId: '',
  notes: '',
});

export default function VehicleFormModal({ open, vehicle, onClose }) {
  const C = useColors();
  const { user } = useUserStore();
  const isEdit = !!vehicle;
  const isAdmin = !!user?.role?.isPredefined;
  const canCreateAllBranch =
    isAdmin || !!user?.role?.actions?.includes('create-all-branch-vehicle');
  const userBranchId = user?.branchId || user?.branch?._id || '';

  const [form, setForm] = useState(blank());

  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      setForm({
        branchId: vehicle.branchId?._id || vehicle.branchId || '',
        registrationNumber: vehicle.registrationNumber || '',
        vehicleType: vehicle.vehicleType || 'bus',
        make: vehicle.make || '',
        modelName: vehicle.modelName || '',
        manufactureYear: String(vehicle.manufactureYear ?? ''),
        color: vehicle.color || '',
        fuelType: vehicle.fuelType || 'diesel',
        capacity: String(vehicle.capacity ?? ''),
        ownership: vehicle.ownership || 'owned',
        insuranceNumber: vehicle.insuranceNumber || '',
        insuranceExpiry: toYMD(vehicle.insuranceExpiry),
        fitnessExpiry: toYMD(vehicle.fitnessExpiry),
        registrationExpiry: toYMD(vehicle.registrationExpiry),
        status: vehicle.status || 'active',
        driver: {
          name: vehicle.driver?.name || '',
          phone: vehicle.driver?.phone || '',
          cnic: vehicle.driver?.cnic || '',
          licenseNumber: vehicle.driver?.licenseNumber || '',
          licenseExpiry: toYMD(vehicle.driver?.licenseExpiry),
        },
        conductor: {
          name: vehicle.conductor?.name || '',
          phone: vehicle.conductor?.phone || '',
        },
        trackerId: vehicle.trackerId || '',
        notes: vehicle.notes || '',
      });
    } else {
      setForm({ ...blank(), branchId: canCreateAllBranch ? '' : userBranchId });
    }
  }, [open, isEdit, vehicle, canCreateAllBranch, userBranchId]);

  const { data: branchData } = useBranchesDropdown({
    enabled: open && canCreateAllBranch && !isEdit,
  });
  const branches = branchData?.data || [];

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const setNested = (group, key, value) =>
    setForm((f) => ({ ...f, [group]: { ...f[group], [key]: value } }));

  const createMutation = useCreateVehicle({ onSuccess: () => onClose() });
  const updateMutation = useUpdateVehicle({ id: vehicle?._id, onSuccess: () => onClose() });
  const isPending = createMutation.isPending || updateMutation.isPending;

  const validate = () => {
    if (!isEdit && !form.branchId) return 'Branch is required';
    if (!form.registrationNumber.trim()) return 'Registration number is required';
    if (!VEHICLE_TYPES.includes(form.vehicleType)) return 'Vehicle type is invalid';
    if (!FUEL_TYPES.includes(form.fuelType)) return 'Fuel type is invalid';
    if (!OWNERSHIP_TYPES.includes(form.ownership)) return 'Ownership is invalid';
    if (form.capacity === '' || Number(form.capacity) <= 0)
      return 'Capacity must be greater than 0';
    if (!form.driver.name.trim()) return 'Driver name is required';
    if (!form.driver.phone.trim()) return 'Driver phone is required';
    if (!form.driver.licenseNumber.trim()) return 'Driver license number is required';
    return null;
  };

  const submit = () => {
    const err = validate();
    if (err) {
      Toast.show({ type: 'error', text1: 'Invalid', text2: err });
      return;
    }
    const payload = buildVehiclePayload(form, vehicle);

    if (!isEdit) {
      payload.branchId = form.branchId;
      createMutation.mutate(payload);
    } else {
      if (form.status) payload.status = form.status;
      updateMutation.mutate(payload);
    }
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
              {isEdit ? 'Edit Vehicle' : 'New Vehicle'}
            </Text>
            <Text style={[styles.subtitle, { color: C.muted }]}>
              {isEdit ? 'Update vehicle, driver, and status' : 'Register a new vehicle'}
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
            <Text style={[styles.section, { color: C.muted }]}>VEHICLE</Text>

            {!isEdit && canCreateAllBranch && (
              <ChipPicker
                label="BRANCH *"
                options={branches.map((b) => ({ value: b._id, label: b.name }))}
                value={form.branchId}
                onChange={(v) => set('branchId', v)}
                C={C}
                emptyHint="No branches loaded."
              />
            )}

            <Field label="REGISTRATION *" C={C}>
              <TextInput
                value={form.registrationNumber}
                onChangeText={(v) => set('registrationNumber', v)}
                placeholder="ABC-123"
                placeholderTextColor={C.mutedSoft}
                autoCapitalize="characters"
                style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
              />
            </Field>

            <ChipPicker
              label="TYPE"
              options={VEHICLE_TYPES.map((t) => ({ value: t, label: titleCase(t) }))}
              value={form.vehicleType}
              onChange={(v) => set('vehicleType', v)}
              C={C}
            />

            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Field label="CAPACITY *" C={C}>
                  <TextInput
                    value={form.capacity}
                    onChangeText={(v) => set('capacity', v)}
                    keyboardType="number-pad"
                    style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="MANUFACTURE YEAR" C={C}>
                  <TextInput
                    value={form.manufactureYear}
                    onChangeText={(v) => set('manufactureYear', v)}
                    keyboardType="number-pad"
                    style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
                  />
                </Field>
              </View>
            </View>

            <ChipPicker
              label="FUEL"
              options={FUEL_TYPES.map((t) => ({ value: t, label: titleCase(t) }))}
              value={form.fuelType}
              onChange={(v) => set('fuelType', v)}
              C={C}
            />

            <ChipPicker
              label="OWNERSHIP"
              options={OWNERSHIP_TYPES.map((t) => ({ value: t, label: titleCase(t) }))}
              value={form.ownership}
              onChange={(v) => set('ownership', v)}
              C={C}
            />

            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Field label="MAKE" C={C}>
                  <TextInput
                    value={form.make}
                    onChangeText={(v) => set('make', v)}
                    placeholder="Toyota"
                    placeholderTextColor={C.mutedSoft}
                    style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="MODEL" C={C}>
                  <TextInput
                    value={form.modelName}
                    onChangeText={(v) => set('modelName', v)}
                    placeholder="Hino"
                    placeholderTextColor={C.mutedSoft}
                    style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
                  />
                </Field>
              </View>
            </View>

            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Field label="COLOR" C={C}>
                  <TextInput
                    value={form.color}
                    onChangeText={(v) => set('color', v)}
                    style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="TRACKER ID" C={C}>
                  <TextInput
                    value={form.trackerId}
                    onChangeText={(v) => set('trackerId', v)}
                    placeholder="GPS-DEV-001"
                    placeholderTextColor={C.mutedSoft}
                    style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
                  />
                </Field>
              </View>
            </View>

            {isEdit && (
              <ChipPicker
                label="STATUS"
                options={VEHICLE_STATUSES.map((s) => ({ value: s, label: titleCase(s) }))}
                value={form.status}
                onChange={(v) => set('status', v)}
                C={C}
              />
            )}

            <Text style={[styles.section, { color: C.muted }]}>COMPLIANCE</Text>
            <Field label="INSURANCE #" C={C}>
              <TextInput
                value={form.insuranceNumber}
                onChangeText={(v) => set('insuranceNumber', v)}
                style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
              />
            </Field>
            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Field label="INSURANCE EXPIRY" C={C}>
                  <TextInput
                    value={form.insuranceExpiry}
                    onChangeText={(v) => set('insuranceExpiry', v)}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={C.mutedSoft}
                    keyboardType="numbers-and-punctuation"
                    autoCapitalize="none"
                    style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="FITNESS EXPIRY" C={C}>
                  <TextInput
                    value={form.fitnessExpiry}
                    onChangeText={(v) => set('fitnessExpiry', v)}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={C.mutedSoft}
                    keyboardType="numbers-and-punctuation"
                    autoCapitalize="none"
                    style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
                  />
                </Field>
              </View>
            </View>
            <Field label="REGISTRATION EXPIRY" C={C}>
              <TextInput
                value={form.registrationExpiry}
                onChangeText={(v) => set('registrationExpiry', v)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={C.mutedSoft}
                keyboardType="numbers-and-punctuation"
                autoCapitalize="none"
                style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
              />
            </Field>

            <Text style={[styles.section, { color: C.muted }]}>DRIVER</Text>
            <Field label="NAME *" C={C}>
              <TextInput
                value={form.driver.name}
                onChangeText={(v) => setNested('driver', 'name', v)}
                style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
              />
            </Field>
            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Field label="PHONE *" C={C}>
                  <TextInput
                    value={form.driver.phone}
                    onChangeText={(v) => setNested('driver', 'phone', v)}
                    keyboardType="phone-pad"
                    placeholder="+923001234567"
                    placeholderTextColor={C.mutedSoft}
                    style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="CNIC" C={C}>
                  <TextInput
                    value={form.driver.cnic}
                    onChangeText={(v) => setNested('driver', 'cnic', v)}
                    keyboardType="numbers-and-punctuation"
                    placeholder="12345-1234567-1"
                    placeholderTextColor={C.mutedSoft}
                    style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
                  />
                </Field>
              </View>
            </View>
            <Field label="LICENSE NUMBER *" C={C}>
              <TextInput
                value={form.driver.licenseNumber}
                onChangeText={(v) => setNested('driver', 'licenseNumber', v)}
                style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
              />
            </Field>
            <Field label="LICENSE EXPIRY" C={C}>
              <TextInput
                value={form.driver.licenseExpiry}
                onChangeText={(v) => setNested('driver', 'licenseExpiry', v)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={C.mutedSoft}
                keyboardType="numbers-and-punctuation"
                autoCapitalize="none"
                style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
              />
            </Field>

            <Text style={[styles.section, { color: C.muted }]}>CONDUCTOR (OPTIONAL)</Text>
            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Field label="NAME" C={C}>
                  <TextInput
                    value={form.conductor.name}
                    onChangeText={(v) => setNested('conductor', 'name', v)}
                    style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="PHONE" C={C}>
                  <TextInput
                    value={form.conductor.phone}
                    onChangeText={(v) => setNested('conductor', 'phone', v)}
                    keyboardType="phone-pad"
                    style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
                  />
                </Field>
              </View>
            </View>

            <Field label="NOTES" C={C}>
              <TextInput
                value={form.notes}
                onChangeText={(v) => set('notes', v)}
                multiline
                style={[
                  styles.input,
                  {
                    height: 80,
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
                    {isEdit ? 'Save Changes' : 'Create Vehicle'}
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

function Field({ label, C, children }) {
  return (
    <View>
      <Text style={[styles.label, { color: C.muted }]}>{label}</Text>
      {children}
    </View>
  );
}

function ChipPicker({ label, options, value, onChange, C, emptyHint }) {
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
                key={opt.value}
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
