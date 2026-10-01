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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import {
  useConsolidatedView,
  useRecordConsolidatedPayment,
} from '../../../../../src/hooks/useFees';
import { useUserStore } from '../../../../../src/store/userStore';
import { useColors } from '../../../../../src/theme/useColors';
import { COLORS } from '../../../../../src/theme/colors';
import { hasAnyAction } from '../../../../../src/utils/permissions';
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  REFERENCE_REQUIRED_METHODS,
  VOUCHER_STATUS_PILL,
  formatDate,
  formatMoney,
  formatMonth,
  todayYMD,
} from '../../../../../src/constants/fee';
import { newIdempotencyKey } from '../../../../../src/utils/idempotency';

function PayConsolidatedModal({ open, studentId, outstanding, onClose }) {
  const C = useColors();

  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayYMD());
  const [method, setMethod] = useState('cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  // One key per opening of the modal, reused on retries so a resubmit can't double-record.
  const [idempotencyKey, setIdempotencyKey] = useState(null);
  useEffect(() => {
    if (open) setIdempotencyKey(newIdempotencyKey());
  }, [open]);

  if (open && amount === '' && outstanding > 0) {
    // initial fill — but only once per open
    setAmount(String(outstanding));
  }

  const pay = useRecordConsolidatedPayment({ onSuccess: () => onClose() });

  const refRequired = REFERENCE_REQUIRED_METHODS.includes(method);

  const submit = () => {
    const num = Number(amount);
    if (!num || num <= 0) {
      Toast.show({ type: 'error', text1: 'Amount must be > 0' });
      return;
    }
    if (num > outstanding) {
      Toast.show({
        type: 'error',
        text1: 'Exceeds outstanding',
        text2: formatMoney(outstanding),
      });
      return;
    }
    if (refRequired && !referenceNumber.trim()) {
      Toast.show({ type: 'error', text1: 'Reference required for this method' });
      return;
    }
    const payload = { studentId, amount: num, paymentDate, method };
    if (referenceNumber.trim()) payload.referenceNumber = referenceNumber.trim();
    if (notes.trim()) payload.notes = notes.trim();
    pay.mutate({ ...payload, idempotencyKey });
  };

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
          <View style={[styles.modalSheet, { backgroundColor: C.card }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: C.text }]}>Pay Outstanding</Text>
                <Text style={[styles.modalSub, { color: C.muted }]}>
                  Distributes across oldest unpaid vouchers first
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
                <Feather name="x" size={18} color={C.text} />
              </Pressable>
            </View>

            <View
              style={[styles.balanceCard, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}
            >
              <Text style={styles.balanceLabel}>OUTSTANDING</Text>
              <Text style={styles.balanceValue}>{formatMoney(outstanding)}</Text>
            </View>

            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: C.muted }]}>AMOUNT *</Text>
                <TextInput
                  value={amount}
                  onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ''))}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={C.mutedSoft}
                  style={[
                    styles.input,
                    { color: C.text, borderColor: C.border, backgroundColor: C.bg },
                  ]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: C.muted }]}>DATE *</Text>
                <TextInput
                  value={paymentDate}
                  onChangeText={setPaymentDate}
                  placeholder="2026-06-01"
                  placeholderTextColor={C.mutedSoft}
                  keyboardType="numbers-and-punctuation"
                  autoCapitalize="none"
                  style={[
                    styles.input,
                    { color: C.text, borderColor: C.border, backgroundColor: C.bg },
                  ]}
                />
              </View>
            </View>

            <View>
              <Text style={[styles.label, { color: C.muted }]}>METHOD</Text>
              <View style={styles.chipRow}>
                {PAYMENT_METHODS.map((m) => {
                  const active = method === m;
                  return (
                    <Pressable
                      key={m}
                      onPress={() => setMethod(m)}
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
                        {PAYMENT_METHOD_LABELS[m]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View>
              <Text style={[styles.label, { color: C.muted }]}>
                REFERENCE
                {refRequired ? ' *' : ''}
              </Text>
              <TextInput
                value={referenceNumber}
                onChangeText={setReferenceNumber}
                placeholder="TXN / Cheque #"
                placeholderTextColor={C.mutedSoft}
                style={[
                  styles.input,
                  { color: C.text, borderColor: C.border, backgroundColor: C.bg },
                ]}
              />
            </View>

            <View>
              <Text style={[styles.label, { color: C.muted }]}>NOTES</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                multiline
                placeholder="Optional"
                placeholderTextColor={C.mutedSoft}
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
            </View>

            <Pressable
              onPress={submit}
              disabled={pay.isPending}
              style={({ pressed }) => [
                styles.submit,
                (pay.isPending || pressed) && { opacity: 0.85 },
              ]}
            >
              {pay.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="check" size={16} color="#fff" />
                  <Text style={styles.submitText}>Record Payment</Text>
                </>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function ConsolidatedPage() {
  const { studentId } = useLocalSearchParams();
  const router = useRouter();
  const C = useColors();
  const { user } = useUserStore();

  const canPay = hasAnyAction(user?.role, ['record-payment', 'record-all-branch-payment']);

  const { data: slip, isLoading, error } = useConsolidatedView({ studentId });
  const [payOpen, setPayOpen] = useState(false);

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: C.bg }]}>
        <ActivityIndicator size="large" color={COLORS.brand} />
      </View>
    );
  }

  if (error || !slip) {
    const status = error?.response?.status;
    const msg =
      error?.response?.data?.message ||
      (status === 403
        ? "You don't have access to this student"
        : status === 404
          ? 'Student not found'
          : 'Failed to load consolidated slip');
    return (
      <View style={[styles.center, { backgroundColor: C.bg }]}>
        <Feather name="alert-circle" size={36} color={COLORS.red} />
        <Text style={[styles.errorText, { color: C.muted, textAlign: 'center' }]}>{msg}</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const student = slip.student;
  const totals = slip.totals || {};
  const vouchers = slip.vouchers || [];
  const outstanding = totals.outstandingTotal ?? 0;

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
              Consolidated Slip
            </Text>
            <Text style={[styles.subtitle, { color: C.muted }]} numberOfLines={1}>
              {student?.user?.name || '—'}
              {student?.admissionNumber ? ` · ${student.admissionNumber}` : ''}
            </Text>
          </View>
        </View>

        {/* Student info */}
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={styles.infoRow}>
            <View style={styles.studentAvatar}>
              <Text style={styles.studentAvatarText}>
                {(student?.user?.name?.[0] || '?').toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.studentName, { color: C.text }]} numberOfLines={1}>
                {student?.user?.name || '—'}
              </Text>
              <Text style={[styles.studentMeta, { color: C.muted }]} numberOfLines={1}>
                {student?.admissionNumber || '—'}
                {student?.rollNumber ? ` · Roll ${student.rollNumber}` : ''}
              </Text>
              <Text style={[styles.studentMeta, { color: C.mutedSoft }]} numberOfLines={1}>
                {student?.class?.name || ''}
                {student?.section?.name ? ` · ${student.section.name}` : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* Totals */}
        <View style={styles.statsGrid}>
          <Stat label="Total" value={formatMoney(totals.grandTotal ?? 0)} C={C} />
          <Stat label="Paid" value={formatMoney(totals.paidTotal ?? 0)} color="#166534" C={C} />
          <Stat
            label="Outstanding"
            value={formatMoney(outstanding)}
            color={outstanding > 0 ? '#991b1b' : C.text}
            C={C}
          />
          <Stat label="Vouchers" value={vouchers.length} C={C} />
        </View>

        {canPay && outstanding > 0 && (
          <Pressable
            onPress={() => setPayOpen(true)}
            style={({ pressed }) => [styles.payBtn, pressed && { opacity: 0.9 }]}
          >
            <Feather name="dollar-sign" size={16} color="#fff" />
            <Text style={styles.payBtnText}>Pay Outstanding</Text>
          </Pressable>
        )}

        {/* Vouchers */}
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[styles.section, { color: C.muted }]}>VOUCHERS</Text>
          {vouchers.length === 0 ? (
            <Text style={[styles.emptyInline, { color: C.mutedSoft }]}>
              No vouchers found for this student.
            </Text>
          ) : (
            vouchers.map((v) => {
              const cfg = VOUCHER_STATUS_PILL[v.status] || VOUCHER_STATUS_PILL.unpaid;
              return (
                <Pressable
                  key={v._id}
                  onPress={() => router.push(`/(app)/fees/voucher/${v._id}`)}
                  style={({ pressed }) => [
                    styles.voucherRow,
                    { borderColor: C.border, backgroundColor: C.bg },
                    pressed && { opacity: 0.92 },
                  ]}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.voucherNum, { color: C.text }]} numberOfLines={1}>
                      {v.voucherNumber}
                    </Text>
                    <Text style={[styles.voucherMeta, { color: C.mutedSoft }]} numberOfLines={1}>
                      {formatMonth(v.month)} · due {formatDate(v.dueDate)}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={[styles.voucherTotal, { color: C.text }]}>
                      {formatMoney(v.balanceAmount)}
                    </Text>
                    <View style={[styles.pill, { backgroundColor: cfg.bg }]}>
                      <Text style={[styles.pillText, { color: cfg.fg }]}>{cfg.label}</Text>
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>

      <PayConsolidatedModal
        open={payOpen}
        studentId={studentId}
        outstanding={outstanding}
        onClose={() => setPayOpen(false)}
      />
    </View>
  );
}

function Stat({ label, value, color, C }) {
  return (
    <View style={[styles.stat, { backgroundColor: C.card, borderColor: C.border }]}>
      <Text style={[styles.statLabel, { color: C.mutedSoft }]}>{label.toUpperCase()}</Text>
      <Text style={[styles.statValue, { color: color || C.text }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 14, paddingBottom: 32, gap: 12 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  errorText: { fontSize: 14 },
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
  title: { fontSize: 20, fontWeight: '800' },
  subtitle: { fontSize: 12, marginTop: 2 },

  card: { borderRadius: 14, padding: 12, borderWidth: 1, gap: 8 },
  section: { fontSize: 10, letterSpacing: 1.1, fontWeight: '800', marginBottom: 2 },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  studentAvatar: {
    width: 50,
    height: 50,
    borderRadius: 999,
    backgroundColor: COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentAvatarText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  studentName: { fontSize: 16, fontWeight: '800' },
  studentMeta: { fontSize: 12, marginTop: 2 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: {
    flexBasis: '23%',
    flexGrow: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  statLabel: { fontSize: 9, letterSpacing: 1.1, fontWeight: '800' },
  statValue: { fontSize: 14, fontWeight: '800', marginTop: 2 },

  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.brand,
  },
  payBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  voucherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  voucherNum: { fontSize: 13, fontWeight: '800' },
  voucherMeta: { fontSize: 11, marginTop: 2 },
  voucherTotal: { fontSize: 13, fontWeight: '800' },

  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  pillText: { fontSize: 10, fontWeight: '800' },

  emptyInline: { fontSize: 12, textAlign: 'center', paddingVertical: 8 },

  // Modal styles
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 18,
  },
  modalSheet: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginVertical: 24,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  modalTitle: { fontSize: 17, fontWeight: '800' },
  modalSub: { fontSize: 12, marginTop: 2 },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },

  balanceCard: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  balanceLabel: { fontSize: 10, letterSpacing: 1.1, fontWeight: '800', color: '#991b1b' },
  balanceValue: { fontSize: 22, fontWeight: '800', color: '#991b1b', marginTop: 2 },

  label: { fontSize: 10, letterSpacing: 1.1, fontWeight: '700', marginBottom: 6 },
  input: {
    height: 42,
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
    height: 46,
    borderRadius: 12,
    marginTop: 4,
  },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
