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
import { useRecordPayment } from '../../hooks/useFees';
import { newIdempotencyKey } from '../../utils/idempotency';
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  REFERENCE_REQUIRED_METHODS,
  formatMoney,
  todayYMD,
} from '../../constants/fee';
import { useColors } from '../../theme/useColors';
import { COLORS } from '../../theme/colors';

export default function RecordPaymentModal({ open, voucher, onClose }) {
  const C = useColors();

  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayYMD());
  const [method, setMethod] = useState('cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [receipt, setReceipt] = useState(null);
  // One key per opened modal, reused on retries so a resubmit can't double-record.
  const [idempotencyKey, setIdempotencyKey] = useState(null);

  // Keyed on `open` alone so a voucher refetch while open can't mint a new key.
  useEffect(() => {
    if (open) setIdempotencyKey(newIdempotencyKey());
  }, [open]);

  useEffect(() => {
    if (open) {
      setAmount(voucher?.balanceAmount != null ? String(voucher.balanceAmount) : '');
      setPaymentDate(todayYMD());
      setMethod('cash');
      setReferenceNumber('');
      setNotes('');
      setReceipt(null);
    }
  }, [open, voucher]);

  const mut = useRecordPayment({
    onSuccess: (d) => setReceipt(d),
  });

  const refRequired = REFERENCE_REQUIRED_METHODS.includes(method);

  const submit = () => {
    const num = Number(amount);
    if (!num || num <= 0) {
      Toast.show({ type: 'error', text1: 'Amount must be > 0' });
      return;
    }
    if (num > (voucher?.balanceAmount ?? 0)) {
      Toast.show({
        type: 'error',
        text1: 'Exceeds balance',
        text2: formatMoney(voucher?.balanceAmount),
      });
      return;
    }
    if (refRequired && !referenceNumber.trim()) {
      Toast.show({ type: 'error', text1: 'Reference required for this method' });
      return;
    }
    const payload = {
      voucherId: voucher._id,
      amount: num,
      paymentDate,
      method,
    };
    if (referenceNumber.trim()) payload.referenceNumber = referenceNumber.trim();
    if (notes.trim()) payload.notes = notes.trim();
    mut.mutate({ ...payload, idempotencyKey });
  };

  if (!voucher) return null;

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
              {receipt ? 'Payment Receipt' : 'Record Payment'}
            </Text>
            <Text style={[styles.subtitle, { color: C.muted }]} numberOfLines={1}>
              {voucher.voucherNumber}
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
            {receipt ? (
              <View
                style={[styles.receiptCard, { backgroundColor: '#dcfce7', borderColor: '#86efac' }]}
              >
                <View style={styles.receiptIcon}>
                  <Feather name="check-circle" size={32} color="#fff" />
                </View>
                <Text style={styles.receiptTitle}>Payment Recorded</Text>
                <Text style={styles.receiptNum}>{receipt?.payment?.receiptNumber || ''}</Text>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Amount</Text>
                  <Text style={styles.receiptValue}>{formatMoney(receipt?.payment?.amount)}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Method</Text>
                  <Text style={styles.receiptValue}>
                    {PAYMENT_METHOD_LABELS[receipt?.payment?.method] || receipt?.payment?.method}
                  </Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>New Balance</Text>
                  <Text style={[styles.receiptValue, { color: '#991b1b' }]}>
                    {formatMoney(receipt?.voucher?.balanceAmount)}
                  </Text>
                </View>
                <Pressable
                  onPress={onClose}
                  style={({ pressed }) => [
                    styles.submit,
                    { marginTop: 14 },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Feather name="check" size={16} color="#fff" />
                  <Text style={styles.submitText}>Close</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <View style={[styles.summary, { backgroundColor: C.bg, borderColor: C.border }]}>
                  <View style={styles.summaryCell}>
                    <Text style={[styles.summaryLabel, { color: C.mutedSoft }]}>TOTAL</Text>
                    <Text style={[styles.summaryValue, { color: C.text }]} numberOfLines={1}>
                      {formatMoney(voucher.totalAmount)}
                    </Text>
                  </View>
                  <View style={styles.summaryCell}>
                    <Text style={[styles.summaryLabel, { color: C.mutedSoft }]}>PAID</Text>
                    <Text style={[styles.summaryValue, { color: '#166534' }]} numberOfLines={1}>
                      {formatMoney(voucher.paidAmount)}
                    </Text>
                  </View>
                  <View style={styles.summaryCell}>
                    <Text style={[styles.summaryLabel, { color: C.mutedSoft }]}>BALANCE</Text>
                    <Text style={[styles.summaryValue, { color: '#991b1b' }]} numberOfLines={1}>
                      {formatMoney(voucher.balanceAmount)}
                    </Text>
                  </View>
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
                      <Text style={styles.submitText}>Record Payment</Text>
                    </>
                  )}
                </Pressable>
              </>
            )}
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

  summary: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  summaryCell: { flex: 1, gap: 2 },
  summaryLabel: { fontSize: 9, letterSpacing: 1.1, fontWeight: '800' },
  summaryValue: { fontSize: 14, fontWeight: '800' },

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
    height: 48,
    borderRadius: 12,
    marginTop: 8,
  },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  receiptCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  receiptIcon: {
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  receiptTitle: { color: '#166534', fontWeight: '800', fontSize: 18 },
  receiptNum: { color: '#166534', fontWeight: '700', fontSize: 13 },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
    marginTop: 4,
  },
  receiptLabel: { color: '#166534', fontSize: 12, fontWeight: '700' },
  receiptValue: { color: '#166534', fontSize: 13, fontWeight: '800' },
});
