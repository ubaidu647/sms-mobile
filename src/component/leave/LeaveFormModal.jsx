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
import { useApplyLeave, useCreateLeave, useStaffLeaveBalance } from '../../hooks/useLeave';
import { useStaffList } from '../../hooks/useStaff';
import { useStudentList } from '../../hooks/useStudents';
import {
  REASON_MAX,
  buildLeavePayload,
  calendarSpan,
  firstError,
  leaveTypesFor,
  titleCase,
  validateLeaveForm,
} from '../../utils/leave';
import { localYMD } from '../../utils/localDate';
import LeaveBalanceCards from './LeaveBalanceCards';
import { useColors } from '../../theme/useColors';
import { COLORS } from '../../theme/colors';

const PICK_LIMIT = 20;

const emptyForm = () => {
  const today = localYMD();
  return {
    applicantType: 'staff',
    staffId: '',
    studentId: '',
    leaveType: '',
    fromDate: today,
    toDate: today,
    reason: '',
    approve: false,
  };
};

function Chip({ label, active, onPress, C }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: C.bg, borderColor: C.border },
        active && styles.chipActive,
        pressed && { opacity: 0.85 },
      ]}
    >
      <Text style={[styles.chipText, { color: active ? '#fff' : C.text }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

// Searchable applicant picker for the management form.
function ApplicantPicker({ applicantType, branchId, value, onChange, C }) {
  const [search, setSearch] = useState('');
  const term = search.trim();
  const isStaff = applicantType === 'staff';

  const staffQ = useStaffList({
    page: 1,
    limit: PICK_LIMIT,
    filters: { name: term, isActive: true },
    branchId,
    enabled: isStaff,
  });
  const studentQ = useStudentList({
    page: 1,
    limit: PICK_LIMIT,
    filters: { search: term, isActive: true },
    branchId,
    enabled: !isStaff,
  });
  const q = isStaff ? staffQ : studentQ;
  const rows = useMemo(() => q.data?.data || [], [q.data]);

  return (
    <View style={{ gap: 8 }}>
      <View style={[styles.searchBox, { backgroundColor: C.bg, borderColor: C.border }]}>
        <Feather name="search" size={14} color={C.muted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={isStaff ? 'Search staff by name' : 'Search students'}
          placeholderTextColor={C.mutedSoft}
          autoCorrect={false}
          style={[styles.searchInput, { color: C.text }]}
        />
      </View>
      {q.isLoading ? (
        <ActivityIndicator size="small" color={COLORS.brand} />
      ) : rows.length === 0 ? (
        <Text style={[styles.hint, { color: C.muted }]}>No matches.</Text>
      ) : (
        <View style={styles.chipRow}>
          {rows.map((r) => {
            const name = r.user?.name || r.userId?.name || r.name || '—';
            const extra = isStaff
              ? r.designation
              : [r.class?.name, r.section?.name].filter(Boolean).join(' · ');
            return (
              <Chip
                key={r._id}
                label={extra ? `${name} · ${extra}` : name}
                active={value === r._id}
                onPress={() => onChange(value === r._id ? '' : r._id)}
                C={C}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

/**
 * Apply (mode 'own', POST /leave/my) or record on behalf (mode 'manage',
 * POST /leave). `branchId` scopes the applicant pickers for branch-tier users.
 */
export default function LeaveFormModal({ open, onClose, mode = 'own', canApprove, branchId }) {
  const C = useColors();
  const isManage = mode === 'manage';
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm());
    setErrors({});
  }, [open]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const apply = useApplyLeave({ onSuccess: () => onClose() });
  const create = useCreateLeave({ onSuccess: () => onClose() });
  const pending = apply.isPending || create.isPending;

  const staffBalance = useStaffLeaveBalance({
    staffId: form.staffId,
    enabled: open && isManage && form.applicantType === 'staff' && !!form.staffId,
  });

  const types = leaveTypesFor(isManage ? form.applicantType : 'staff');
  const span = calendarSpan(form.fromDate, form.toDate);

  const handleSubmit = () => {
    const values = isManage ? form : { ...form, applicantType: 'staff' };
    const errs = validateLeaveForm(values, { requireApplicant: isManage });
    setErrors(errs);
    if (Object.keys(errs).length) {
      Toast.show({ type: 'error', text1: 'Check the form', text2: firstError(errs) });
      return;
    }
    if (isManage) {
      const body = { ...form, approve: canApprove && form.approve };
      create.mutate(buildLeavePayload(body, { withApplicant: true }));
    } else {
      apply.mutate(buildLeavePayload(form));
    }
  };

  const fieldStyle = [
    styles.input,
    { color: C.text, borderColor: C.border, backgroundColor: C.bg },
  ];
  const errText = (k) =>
    errors[k] ? <Text style={styles.error}>{errors[k]}</Text> : null;

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
              {isManage ? 'New leave' : 'Apply for leave'}
            </Text>
            <Text style={[styles.subtitle, { color: C.muted }]}>
              {isManage
                ? 'Record leave for a staff member or student'
                : 'Your request goes to your approver'}
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
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {isManage && (
              <>
                <View>
                  <Text style={[styles.label, { color: C.muted }]}>FOR *</Text>
                  <View style={styles.chipRow}>
                    {['staff', 'student'].map((t) => (
                      <Chip
                        key={t}
                        label={titleCase(t)}
                        active={form.applicantType === t}
                        onPress={() =>
                          set({ applicantType: t, staffId: '', studentId: '', leaveType: '' })
                        }
                        C={C}
                      />
                    ))}
                  </View>
                </View>
                <View>
                  <Text style={[styles.label, { color: C.muted }]}>
                    {form.applicantType === 'student' ? 'STUDENT *' : 'STAFF MEMBER *'}
                  </Text>
                  <ApplicantPicker
                    key={form.applicantType}
                    applicantType={form.applicantType}
                    branchId={branchId}
                    value={form.applicantType === 'student' ? form.studentId : form.staffId}
                    onChange={(id) =>
                      set(form.applicantType === 'student' ? { studentId: id } : { staffId: id })
                    }
                    C={C}
                  />
                  {errText('applicant')}
                </View>
                {form.applicantType === 'staff' && !!form.staffId && (
                  <LeaveBalanceCards
                    balance={staffBalance.data}
                    loading={staffBalance.isLoading}
                    error={staffBalance.error}
                    C={C}
                  />
                )}
              </>
            )}

            <View>
              <Text style={[styles.label, { color: C.muted }]}>LEAVE TYPE *</Text>
              <View style={styles.chipRow}>
                {types.map((t) => (
                  <Chip
                    key={t}
                    label={titleCase(t)}
                    active={form.leaveType === t}
                    onPress={() => set({ leaveType: t })}
                    C={C}
                  />
                ))}
              </View>
              {errText('leaveType')}
            </View>

            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: C.muted }]}>FROM *</Text>
                <TextInput
                  value={form.fromDate}
                  onChangeText={(v) => set({ fromDate: v.trim() })}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={C.mutedSoft}
                  keyboardType="numbers-and-punctuation"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={fieldStyle}
                />
                {errText('fromDate')}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: C.muted }]}>TO *</Text>
                <TextInput
                  value={form.toDate}
                  onChangeText={(v) => set({ toDate: v.trim() })}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={C.mutedSoft}
                  keyboardType="numbers-and-punctuation"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={fieldStyle}
                />
                {errText('toDate')}
              </View>
            </View>
            {span > 0 && (
              <Text style={[styles.hint, { color: C.muted }]}>
                {span} calendar day{span === 1 ? '' : 's'} — only the school's working days
                are counted.
              </Text>
            )}

            <View>
              <Text style={[styles.label, { color: C.muted }]}>REASON *</Text>
              <TextInput
                value={form.reason}
                onChangeText={(v) => set({ reason: v })}
                multiline
                maxLength={REASON_MAX}
                placeholder="e.g. Fever, family function…"
                placeholderTextColor={C.mutedSoft}
                style={[...fieldStyle, styles.textArea]}
              />
              {errText('reason')}
            </View>

            {isManage && canApprove && (
              <Pressable
                onPress={() => set({ approve: !form.approve })}
                style={[
                  styles.toggle,
                  {
                    backgroundColor: form.approve ? '#dcfce7' : C.bg,
                    borderColor: form.approve ? '#86efac' : C.border,
                  },
                ]}
              >
                <Feather
                  name={form.approve ? 'check-square' : 'square'}
                  size={16}
                  color={form.approve ? '#166534' : C.mutedSoft}
                />
                <Text style={[styles.toggleText, { color: form.approve ? '#166534' : C.text }]}>
                  Approve now (writes attendance)
                </Text>
              </Pressable>
            )}

            <Pressable
              onPress={handleSubmit}
              disabled={pending}
              style={({ pressed }) => [styles.submit, (pending || pressed) && { opacity: 0.85 }]}
            >
              {pending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="send" size={16} color="#fff" />
                  <Text style={styles.submitText}>
                    {isManage ? (form.approve && canApprove ? 'Save & approve' : 'Save') : 'Submit'}
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

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  title: { fontSize: 18, fontWeight: '800' },
  subtitle: { fontSize: 12, marginTop: 4 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: 18, gap: 16, paddingBottom: 40 },
  label: { fontSize: 11, letterSpacing: 1.1, fontWeight: '700', marginBottom: 6 },
  hint: { fontSize: 11 },
  error: { color: COLORS.red, fontSize: 11, marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    maxWidth: '100%',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText: { fontSize: 12, fontWeight: '600' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
  },
  searchInput: { flex: 1, fontSize: 13 },
  row2: { flexDirection: 'row', gap: 10 },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  textArea: { height: 90, paddingTop: 10, textAlignVertical: 'top' },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  toggleText: { fontSize: 13, fontWeight: '700' },
  submit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.brand,
    height: 48,
    borderRadius: 12,
    marginTop: 4,
  },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
