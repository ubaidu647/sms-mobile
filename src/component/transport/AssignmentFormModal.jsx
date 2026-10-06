import { useEffect, useMemo, useState } from 'react';
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
import {
  useCreateAssignment,
  useRoutesDropdown,
  useStudentSearch,
  useUpdateAssignment,
} from '../../hooks/useTransport';
import {
  ASSIGNMENT_DIRECTIONS,
  ASSIGNMENT_DIRECTION_LABELS,
  ASSIGNMENT_STATUSES,
  titleCase,
  toYMD,
} from '../../constants/transport';
import { currentAcademicYear } from '../../constants/fee';
import { changedFields } from '../../utils/changedFields';
import { useColors } from '../../theme/useColors';
import { COLORS } from '../../theme/colors';

/** What the edit form shows for `assignment` when it opens (same rules as its fields). */
const initialEditValues = (assignment) => {
  const routeObj = typeof assignment.route === 'object' ? assignment.route : null;
  return {
    routeId: routeObj?._id || assignment.routeId?._id || assignment.routeId || '',
    stopName: assignment.stopName || '',
    direction: assignment.direction || 'both',
    monthlyFee: assignment.monthlyFee ?? '',
    notes: assignment.notes || '',
    status: assignment.status || 'active',
    endDate: toYMD(assignment.endDate),
  };
};

export default function AssignmentFormModal({ open, assignment, onClose }) {
  const C = useColors();
  const { user } = useUserStore();
  const isEdit = !!assignment;
  const isAdmin = !!user?.role?.isPredefined;
  const canViewAllBranchStudents =
    isAdmin || !!user?.role?.actions?.includes('view-all-branch-student');
  const userBranchId = user?.branchId || user?.branch?._id || '';

  const [studentSearch, setStudentSearch] = useState('');
  const [studentId, setStudentId] = useState('');
  const [studentLabel, setStudentLabel] = useState('');
  const [routeId, setRouteId] = useState('');
  const [stopName, setStopName] = useState('');
  const [direction, setDirection] = useState('both');
  const [monthlyFee, setMonthlyFee] = useState('');
  const [academicYear, setAcademicYear] = useState(currentAcademicYear());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('active');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      const studentObj = typeof assignment.student === 'object' ? assignment.student : null;
      const routeObj = typeof assignment.route === 'object' ? assignment.route : null;
      const sId = studentObj?._id || assignment.studentId?._id || assignment.studentId || '';
      setStudentId(sId);
      const sName = studentObj?.name || assignment.studentId?.user?.name || '';
      const sAdm = studentObj?.admissionNumber || assignment.studentId?.admissionNumber || '';
      setStudentLabel(sName ? `${sName}${sAdm ? ` · ${sAdm}` : ''}` : '');
      setStudentSearch('');
      setRouteId(routeObj?._id || assignment.routeId?._id || assignment.routeId || '');
      setStopName(assignment.stopName || '');
      setDirection(assignment.direction || 'both');
      setMonthlyFee(assignment.monthlyFee != null ? String(assignment.monthlyFee) : '');
      setAcademicYear(assignment.academicYear || currentAcademicYear());
      setStartDate(toYMD(assignment.startDate));
      setEndDate(toYMD(assignment.endDate));
      setStatus(assignment.status || 'active');
      setNotes(assignment.notes || '');
    } else {
      setStudentId('');
      setStudentLabel('');
      setStudentSearch('');
      setRouteId('');
      setStopName('');
      setDirection('both');
      setMonthlyFee('');
      setAcademicYear(currentAcademicYear());
      setStartDate(toYMD(new Date().toISOString()));
      setEndDate('');
      setStatus('active');
      setNotes('');
    }
  }, [open, isEdit, assignment]);

  const { data: studentData } = useStudentSearch({
    search: studentSearch,
    branchId: canViewAllBranchStudents ? undefined : userBranchId,
    enabled: open && !isEdit && !studentId && studentSearch.length >= 2,
  });
  const students = studentData?.data || [];

  const { data: routesData } = useRoutesDropdown({
    branchId: canViewAllBranchStudents ? undefined : userBranchId,
    activeOnly: true,
    enabled: open,
  });
  const routes = routesData?.data || [];

  const selectedRoute = useMemo(() => routes.find((r) => r._id === routeId), [routes, routeId]);
  const stops = useMemo(() => selectedRoute?.stops || [], [selectedRoute]);

  useEffect(() => {
    if (!stopName || !selectedRoute) return;
    const stop = stops.find((s) => s.name === stopName);
    if (stop && monthlyFee === '') {
      setMonthlyFee(stop.fee != null ? String(stop.fee) : String(selectedRoute.baseFee ?? ''));
    }
  }, [stopName, selectedRoute, stops, monthlyFee]);

  const createMutation = useCreateAssignment({ onSuccess: () => onClose() });
  const updateMutation = useUpdateAssignment({ id: assignment?._id, onSuccess: () => onClose() });
  const isPending = createMutation.isPending || updateMutation.isPending;

  const validate = () => {
    if (!isEdit && !studentId) return 'Student is required';
    if (!routeId) return 'Route is required';
    if (!stopName) return 'Stop is required';
    if (!ASSIGNMENT_DIRECTIONS.includes(direction)) return 'Direction is invalid';
    if (!isEdit && !academicYear.match(/^\d{4}-\d{4}$/))
      return 'Academic year must be YYYY-YYYY';
    if (!isEdit && !startDate) return 'Start date is required';
    if (monthlyFee !== '' && Number(monthlyFee) < 0) return 'Monthly fee must be ≥ 0';
    return null;
  };

  const submit = () => {
    const err = validate();
    if (err) {
      Toast.show({ type: 'error', text1: 'Invalid', text2: err });
      return;
    }
    const fee =
      monthlyFee !== '' && !Number.isNaN(Number(monthlyFee)) ? Number(monthlyFee) : undefined;
    if (isEdit) {
      // Only what was changed: an ended assignment refuses even its own end
      // date, so re-sending the form's untouched fields would block the edit.
      const changed = changedFields(initialEditValues(assignment), {
        routeId,
        stopName,
        direction,
        ...(fee !== undefined ? { monthlyFee: fee } : {}),
        notes: notes.trim(),
        status,
        endDate: endDate || null,
      });
      if (!Object.keys(changed).length) {
        onClose();
        return;
      }
      updateMutation.mutate(changed);
      return;
    }
    const payload = { routeId, stopName, direction, studentId, academicYear, startDate };
    if (fee !== undefined) payload.monthlyFee = fee;
    if (notes.trim()) payload.notes = notes.trim();
    createMutation.mutate(payload);
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
              {isEdit ? 'Edit Assignment' : 'Assign Student'}
            </Text>
            <Text style={[styles.subtitle, { color: C.muted }]}>
              {isEdit ? 'Update route, stop, fee, or status' : 'Pick a student, route and stop'}
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
            {isEdit ? (
              <View style={[styles.studentLocked, { backgroundColor: COLORS.brand + '12', borderColor: COLORS.brand + '33' }]}>
                <Text style={[styles.lockedLabel, { color: COLORS.brand }]}>STUDENT</Text>
                <Text style={[styles.lockedName, { color: C.text }]} numberOfLines={2}>
                  {studentLabel || studentId || '—'}
                </Text>
              </View>
            ) : studentId ? (
              <View>
                <Text style={[styles.label, { color: C.muted }]}>STUDENT *</Text>
                <View style={[styles.selectedStudent, { backgroundColor: COLORS.brand + '12', borderColor: COLORS.brand + '33' }]}>
                  <Text style={[styles.selectedStudentName, { color: C.text }]} numberOfLines={1}>
                    {studentLabel}
                  </Text>
                  <Pressable
                    onPress={() => {
                      setStudentId('');
                      setStudentLabel('');
                    }}
                    hitSlop={6}
                    style={({ pressed }) => [styles.removeStudentBtn, pressed && { opacity: 0.6 }]}
                  >
                    <Feather name="x" size={14} color={COLORS.brand} />
                  </Pressable>
                </View>
              </View>
            ) : (
              <View>
                <Text style={[styles.label, { color: C.muted }]}>STUDENT *</Text>
                <TextInput
                  value={studentSearch}
                  onChangeText={setStudentSearch}
                  placeholder="Search by name, admission #, roll…"
                  placeholderTextColor={C.mutedSoft}
                  style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
                />
                {students.length > 0 && (
                  <View style={[styles.suggestions, { backgroundColor: C.bg, borderColor: C.border }]}>
                    {students.map((s) => (
                      <Pressable
                        key={s._id}
                        onPress={() => {
                          setStudentId(s._id);
                          setStudentLabel(
                            `${s.user?.name || ''}${s.admissionNumber ? ` · ${s.admissionNumber}` : ''}`,
                          );
                          setStudentSearch('');
                        }}
                        style={({ pressed }) => [
                          styles.suggestionRow,
                          { borderBottomColor: C.border },
                          pressed && { backgroundColor: C.card },
                        ]}
                      >
                        <Text style={[styles.suggestionName, { color: C.text }]} numberOfLines={1}>
                          {s.user?.name}
                        </Text>
                        <Text style={[styles.suggestionMeta, { color: C.mutedSoft }]} numberOfLines={1}>
                          {s.admissionNumber}
                          {s.rollNumber ? `  ·  Roll ${s.rollNumber}` : ''}
                          {s.class?.name ? `  ·  ${s.class.name}` : ''}
                          {s.section?.name ? ` / ${s.section.name}` : ''}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            )}

            <Picker
              label="ROUTE *"
              options={routes.map((r) => ({
                value: r._id,
                label: `${r.name}${r.code ? ` (${r.code})` : ''}`,
              }))}
              value={routeId}
              onChange={(v) => {
                setRouteId(v);
                setStopName('');
                setMonthlyFee('');
              }}
              emptyHint="No active routes."
              C={C}
            />

            <Picker
              label="STOP *"
              options={stops.map((s) => ({
                value: s.name,
                label: `${s.sequence}. ${s.name}`,
              }))}
              value={stopName}
              onChange={(v) => {
                setStopName(v);
                setMonthlyFee('');
              }}
              emptyHint={routeId ? 'No stops on this route.' : 'Pick a route first.'}
              C={C}
            />

            <Picker
              label="DIRECTION"
              options={ASSIGNMENT_DIRECTIONS.map((d) => ({
                value: d,
                label: ASSIGNMENT_DIRECTION_LABELS[d] || d,
              }))}
              value={direction}
              onChange={setDirection}
              C={C}
            />

            <Field label="MONTHLY FEE  (defaults to stop/route fee)" C={C}>
              <TextInput
                value={monthlyFee}
                onChangeText={setMonthlyFee}
                keyboardType="number-pad"
                placeholder={selectedRoute ? String(selectedRoute.baseFee ?? '') : ''}
                placeholderTextColor={C.mutedSoft}
                style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
              />
            </Field>

            {!isEdit && (
              <View style={styles.row2}>
                <View style={{ flex: 1 }}>
                  <Field label="ACADEMIC YEAR *" C={C}>
                    <TextInput
                      value={academicYear}
                      onChangeText={setAcademicYear}
                      placeholder="2025-2026"
                      placeholderTextColor={C.mutedSoft}
                      autoCapitalize="none"
                      keyboardType="numbers-and-punctuation"
                      style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
                    />
                  </Field>
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="START DATE *" C={C}>
                    <TextInput
                      value={startDate}
                      onChangeText={setStartDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={C.mutedSoft}
                      keyboardType="numbers-and-punctuation"
                      autoCapitalize="none"
                      style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
                    />
                  </Field>
                </View>
              </View>
            )}

            {isEdit && (
              <View style={styles.row2}>
                <View style={{ flex: 1 }}>
                  <Picker
                    label="STATUS"
                    options={ASSIGNMENT_STATUSES.map((s) => ({ value: s, label: titleCase(s) }))}
                    value={status}
                    onChange={setStatus}
                    C={C}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="END DATE  (deactivates)" C={C}>
                    <TextInput
                      value={endDate}
                      onChangeText={setEndDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={C.mutedSoft}
                      keyboardType="numbers-and-punctuation"
                      autoCapitalize="none"
                      style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
                    />
                  </Field>
                </View>
              </View>
            )}

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
                    {isEdit ? 'Save Changes' : 'Assign'}
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
    maxWidth: 240,
  },
  chipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText: { fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#fff' },

  studentLocked: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
  lockedLabel: { fontSize: 10, letterSpacing: 1.1, fontWeight: '800' },
  lockedName: { fontSize: 14, fontWeight: '800', marginTop: 4 },

  selectedStudent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  selectedStudentName: { flex: 1, fontSize: 13, fontWeight: '700' },
  removeStudentBtn: {
    width: 26,
    height: 26,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },

  suggestions: {
    marginTop: 4,
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
    maxHeight: 240,
  },
  suggestionRow: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  suggestionName: { fontSize: 13, fontWeight: '700' },
  suggestionMeta: { fontSize: 11, marginTop: 2 },

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
