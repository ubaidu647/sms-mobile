import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { fmtMoney, fmtDate, INVOICE_STATUS_PILL, invoiceTypeLabel } from '../../constants/billing';
import { useColors } from '../../theme/useColors';
import { useTranslations } from '../../i18n';

// Read-only invoice view for the school admin. The whole invoice object comes
// straight from GET /invoice/me (no extra fetch); there is no "Mark as paid"
// action — paying invoices is super-admin only. Mirrors web MyInvoiceModal.
export default function MyInvoiceModal({ open, invoice, onClose }) {
  const C = useColors();
  const t = useTranslations('subscription');
  const cfg = INVOICE_STATUS_PILL[invoice?.status] || { bg: '#f3f4f6', fg: '#374151' };

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
            <Text style={[styles.title, { color: C.text }]}>Invoice</Text>
            {!!invoice?.serialNumber && (
              <Text style={[styles.subtitle, { color: C.muted }]}>#{invoice.serialNumber}</Text>
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

        {!invoice ? (
          <View style={styles.center}>
            <Text style={[styles.subtitle, { color: C.muted }]}>No invoice selected.</Text>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.statusRow}>
              <View style={[styles.pill, { backgroundColor: cfg.bg }]}>
                <Text style={[styles.pillText, { color: cfg.fg }]}>
                  {invoice.status || 'unknown'}
                </Text>
              </View>
              <Text style={[styles.subtitle, { color: C.muted }]}>
                {invoiceTypeLabel(invoice.type, t('addons.invoiceType'))} · {fmtDate(invoice.createdAt)}
              </Text>
            </View>

            {/* Line items + total */}
            <View style={[styles.card, { backgroundColor: C.bg, borderColor: C.border }]}>
              {(invoice.lineItems || []).map((li, i) => (
                <View key={i} style={[styles.liRow, { borderBottomColor: C.border }]}>
                  <Text style={[styles.liLabel, { color: C.text }]} numberOfLines={2}>
                    {li.label}
                  </Text>
                  <Text style={[styles.liAmount, { color: li.amount < 0 ? '#166534' : C.text }]}>
                    {li.amount < 0
                      ? `−${fmtMoney(Math.abs(li.amount))}`
                      : fmtMoney(li.amount)}
                  </Text>
                </View>
              ))}
              {invoice.creditApplied > 0 && (
                <View style={[styles.liRow, { borderBottomColor: C.border }]}>
                  <Text style={[styles.liLabel, { color: C.muted }]}>Credit applied</Text>
                  <Text style={[styles.liAmount, { color: '#166534' }]}>
                    −{fmtMoney(invoice.creditApplied)}
                  </Text>
                </View>
              )}
              <View style={[styles.totalRow, { backgroundColor: C.card }]}>
                <Text style={[styles.totalLabel, { color: C.text }]}>Amount due</Text>
                <Text
                  style={[
                    styles.totalAmount,
                    {
                      color:
                        invoice.status === 'paid'
                          ? '#166534'
                          : invoice.status === 'void'
                            ? C.mutedSoft
                            : C.text,
                    },
                    invoice.status === 'void' && styles.strike,
                  ]}
                >
                  {fmtMoney(invoice.amountDue)}
                </Text>
              </View>
            </View>

            {invoice.status === 'void' && (
              <Text style={[styles.note, { backgroundColor: C.bg, color: C.muted }]}>
                This invoice was voided when the plan changed before it was paid — nothing is owed
                on it.
              </Text>
            )}
            {invoice.status === 'unpaid' && (
              <Text style={[styles.note, { backgroundColor: '#fffbeb', color: '#92400e' }]}>
                This invoice is outstanding. Please contact your administrator to settle it.
              </Text>
            )}

            {(invoice.paymentInfo?.method || invoice.paymentInfo?.transactionId) && (
              <View style={[styles.card, { backgroundColor: C.bg, borderColor: C.border }]}>
                <Text style={[styles.sectionTitle, { color: C.muted }]}>PAYMENT</Text>
                <Row label="Method" value={invoice.paymentInfo.method || '-'} C={C} />
                <Row label="Transaction ID" value={invoice.paymentInfo.transactionId || '-'} C={C} last />
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

function Row({ label, value, C, last }) {
  return (
    <View style={[styles.row, last && { borderBottomWidth: 0 }, { borderBottomColor: C.border }]}>
      <Text style={[styles.rowLabel, { color: C.muted }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: C.text }]} numberOfLines={2}>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  body: { padding: 16, paddingBottom: 40, gap: 14 },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  pill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
  pillText: { fontSize: 11, fontWeight: '800', textTransform: 'capitalize' },

  card: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  liRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  liLabel: { flex: 1, fontSize: 13 },
  liAmount: { fontSize: 13, fontWeight: '700' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  totalLabel: { fontSize: 15, fontWeight: '800' },
  totalAmount: { fontSize: 16, fontWeight: '800' },
  strike: { textDecorationLine: 'line-through' },

  note: { borderRadius: 12, padding: 12, fontSize: 12, fontWeight: '600' },

  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: { fontSize: 12, fontWeight: '600' },
  rowValue: { fontSize: 13, fontWeight: '700', flex: 1, textAlign: 'right' },
});
