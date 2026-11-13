import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { usePaymentDetail, useVoucherDetail } from '../../hooks/useFees';
import {
  PAYMENT_METHOD_PILL,
  VOUCHER_STATUS_PILL,
  formatDate,
  formatMoney,
  formatMonth,
} from '../../constants/fee';
import { useColors } from '../../theme/useColors';
import { COLORS } from '../../theme/colors';
import { useSchoolCurrency } from '../../hooks/useSchoolCurrency';

// Read-only receipt view for a single payment. Mirrors the web
// PaymentDetailModal (without the print/PDF export, which needs web-only libs).
export default function PaymentDetailModal({ open, payment, onClose }) {
  const { symbol: currencySymbol } = useSchoolCurrency();
  const C = useColors();
  const router = useRouter();

  const id = payment?._id;
  const { data: detail, isLoading } = usePaymentDetail({ id, enabled: open && !!id });

  const p = detail || payment || null;

  const voucherRef = p?.voucherId ?? p?.voucher;
  const voucherId =
    voucherRef && typeof voucherRef === 'object' ? voucherRef._id : voucherRef;

  const { data: voucherDetail } = useVoucherDetail({
    id: voucherId,
    enabled: open && !!voucherId,
  });
  const voucher =
    voucherDetail ||
    (voucherRef && typeof voucherRef === 'object' ? voucherRef : null) ||
    p?.voucher ||
    null;

  const student =
    (voucher?.studentId && typeof voucher.studentId === 'object'
      ? voucher.studentId
      : null) ||
    p?.student ||
    null;

  const methodCfg = PAYMENT_METHOD_PILL[p?.method] || PAYMENT_METHOD_PILL.other;
  const statusCfg = VOUCHER_STATUS_PILL[voucher?.status] || null;

  const openVoucher = () => {
    if (!voucherId) return;
    onClose?.();
    router.push(`/(app)/fees/voucher/${voucherId}`);
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
            <Text style={[styles.title, { color: C.text }]}>Payment Receipt</Text>
            {!!p?.receiptNumber && (
              <Text style={[styles.subtitle, { color: C.muted }]}>{p.receiptNumber}</Text>
            )}
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

        {isLoading && !detail ? (
          <View style={styles.center}>
            <ActivityIndicator color={COLORS.brand} />
          </View>
        ) : !p ? (
          <View style={styles.center}>
            <Feather name="alert-circle" size={32} color={COLORS.red || '#dc2626'} />
            <Text style={[styles.subtitle, { color: C.muted }]}>Payment not found</Text>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
          >
            {/* Receipt header */}
            <View style={[styles.card, { backgroundColor: C.bg, borderColor: C.border }]}>
              <View style={styles.receiptTop}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.eyebrow, { color: C.mutedSoft }]}>RECEIPT</Text>
                  <Text style={[styles.receiptNo, { color: C.text }]} numberOfLines={1}>
                    {p.receiptNumber || '—'}
                  </Text>
                  <Text style={[styles.subtitle, { color: C.muted }]}>
                    {formatDate(p.paymentDate)}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <View style={[styles.pill, { backgroundColor: methodCfg.bg }]}>
                    <Text style={[styles.pillText, { color: methodCfg.fg }]}>
                      {methodCfg.label}
                    </Text>
                  </View>
                  {p.isVoid && (
                    <View style={[styles.pill, { backgroundColor: '#fee2e2' }]}>
                      <Text style={[styles.pillText, { color: '#991b1b' }]}>Voided</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={[styles.amountRow, { borderTopColor: C.border }]}>
                <Text style={[styles.eyebrow, { color: C.mutedSoft }]}>AMOUNT RECEIVED</Text>
                <Text
                  style={[
                    styles.amount,
                    { color: p.isVoid ? '#991b1b' : C.text },
                    p.isVoid && styles.strike,
                  ]}
                >
                  {formatMoney(p.amount, currencySymbol)}
                </Text>
              </View>
            </View>

            {/* Student */}
            {student && (
              <Section title="Student" C={C}>
                <Grid>
                  <Info label="Name" value={student?.user?.name} C={C} />
                  <Info label="Father" value={student?.father?.name} C={C} />
                  <Info label="Admission #" value={student?.admissionNumber} C={C} />
                  <Info label="Roll" value={student?.rollNumber} C={C} />
                  <Info
                    label="Class"
                    value={`${voucher?.classId?.name || voucher?.class?.name || ''}${
                      voucher?.sectionId?.name || voucher?.section?.name
                        ? ` · ${voucher?.sectionId?.name || voucher?.section?.name}`
                        : ''
                    }`}
                    C={C}
                  />
                  <Info
                    label="Branch"
                    value={voucher?.branchId?.name || voucher?.branch?.name}
                    C={C}
                  />
                </Grid>
              </Section>
            )}

            {/* Payment details */}
            <Section title="Payment Details" C={C}>
              <Row label="Receipt #" value={p.receiptNumber} C={C} />
              <Row label="Date" value={formatDate(p.paymentDate)} C={C} />
              <Row label="Method" value={methodCfg.label} C={C} />
              <Row label="Reference #" value={p.referenceNumber || '—'} C={C} />
              <Row
                label="Received By"
                value={p.receivedBy?.user?.name || p.receivedBy?.name || '—'}
                C={C}
              />
              {!!p.notes && <Row label="Notes" value={p.notes} C={C} />}
              {p.isVoid && (
                <>
                  <Row label="Voided At" value={formatDate(p.voidedAt)} C={C} />
                  <Row
                    label="Voided By"
                    value={p.voidedBy?.user?.name || p.voidedBy?.name || '—'}
                    C={C}
                  />
                  <Row label="Void Reason" value={p.voidReason || '—'} C={C} last />
                </>
              )}
            </Section>

            {/* Voucher */}
            {voucher && (
              <Section title="Voucher" C={C}>
                <Row label="Voucher #" value={voucher.voucherNumber || '—'} C={C} />
                <Row
                  label="Month"
                  value={
                    voucher.month
                      ? `${formatMonth(voucher.month)}${
                          voucher.academicYear ? ` · ${voucher.academicYear}` : ''
                        }`
                      : '—'
                  }
                  C={C}
                />
                <Row label="Total" value={formatMoney(voucher.totalAmount, currencySymbol)} C={C} />
                <Row label="Paid" value={formatMoney(voucher.paidAmount, currencySymbol)} C={C} valueColor="#166534" />
                <Row
                  label="Balance"
                  value={formatMoney(voucher.balanceAmount, currencySymbol)}
                  valueColor={voucher.balanceAmount > 0 ? '#991b1b' : undefined}
                  C={C}
                  last={!statusCfg}
                />
                {statusCfg && (
                  <View style={[styles.row, styles.rowLast]}>
                    <Text style={[styles.rowLabel, { color: C.muted }]}>Status</Text>
                    <View style={[styles.pill, { backgroundColor: statusCfg.bg }]}>
                      <Text style={[styles.pillText, { color: statusCfg.fg }]}>
                        {statusCfg.label}
                      </Text>
                    </View>
                  </View>
                )}

                {!!voucherId && (
                  <Pressable
                    onPress={openVoucher}
                    style={({ pressed }) => [
                      styles.linkBtn,
                      { borderColor: C.border },
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Feather name="external-link" size={14} color={COLORS.brand} />
                    <Text style={[styles.linkBtnText, { color: COLORS.brand }]}>
                      Open Voucher
                    </Text>
                  </Pressable>
                )}
              </Section>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

function Section({ title, children, C }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: C.mutedSoft }]}>{title.toUpperCase()}</Text>
      <View style={[styles.card, { backgroundColor: C.bg, borderColor: C.border }]}>{children}</View>
    </View>
  );
}

function Grid({ children }) {
  return <View style={styles.grid}>{children}</View>;
}

function Info({ label, value, C }) {
  return (
    <View style={styles.infoCell}>
      <Text style={[styles.infoLabel, { color: C.mutedSoft }]}>{label.toUpperCase()}</Text>
      <Text style={[styles.infoValue, { color: C.text }]}>{value || '—'}</Text>
    </View>
  );
}

function Row({ label, value, valueColor, C, last }) {
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <Text style={[styles.rowLabel, { color: C.muted }]}>{label}</Text>
      <Text
        style={[styles.rowValue, { color: valueColor || C.text }]}
        numberOfLines={2}
      >
        {value}
      </Text>
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
  subtitle: { fontSize: 13, marginTop: 2 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },

  body: { padding: 16, paddingBottom: 40, gap: 16 },

  card: { borderRadius: 14, borderWidth: 1, padding: 14 },

  receiptTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  eyebrow: { fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  receiptNo: { fontSize: 20, fontWeight: '800', marginTop: 2 },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  amount: { fontSize: 22, fontWeight: '800' },
  strike: { textDecorationLine: 'line-through' },

  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  pillText: { fontSize: 10, fontWeight: '800' },

  section: { gap: 8 },
  sectionTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, paddingHorizontal: 2 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  infoCell: { flexBasis: '44%', flexGrow: 1 },
  infoLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  infoValue: { fontSize: 14, fontWeight: '600', marginTop: 2 },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(148,163,184,0.25)',
  },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: { fontSize: 12, fontWeight: '600' },
  rowValue: { fontSize: 13, fontWeight: '700', flex: 1, textAlign: 'right' },

  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
  },
  linkBtnText: { fontWeight: '800', fontSize: 13 },
});
