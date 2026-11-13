import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import ToastModal from '../ToastModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useInvoiceBySubscription, useMarkInvoicePaid } from '../../hooks/useSubscriptions';
import { fmtMoney, fmtDate, INVOICE_STATUS_PILL, invoiceTypeLabel } from '../../constants/billing';
import { useTranslations } from '../../i18n';
import { useColors } from '../../theme/useColors';
import { COLORS } from '../../theme/colors';

// Invoice tied to a single subscription. Super-admin can mark an unpaid one paid.
// Mirrors web subscriptions/InvoiceModal.
export default function InvoiceModal({ open, subscription, schoolId, onClose }) {
  const C = useColors();
  const t = useTranslations('subscription');
  const subscriptionId = subscription?._id;
  const { data, isLoading, isError, error } = useInvoiceBySubscription(open ? subscriptionId : null);
  const invoice = data?.data ?? null;
  const markPaid = useMarkInvoicePaid(schoolId, { onSuccess: () => onClose() });
  const cfg = INVOICE_STATUS_PILL[invoice?.status] || { bg: '#f3f4f6', fg: '#374151' };

  return (
    <ToastModal visible={open} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safe, { backgroundColor: C.card }]} edges={['top', 'bottom']}>
        <View style={[styles.header, { borderBottomColor: C.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: C.text }]}>Invoice</Text>
            <Text style={[styles.subtitle, { color: C.muted }]}>
              {invoice?.serialNumber ? `#${invoice.serialNumber}` : subscription?.packageSnapshot?.name || ''}
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

        {isLoading ? (
          <View style={styles.center}><ActivityIndicator color={COLORS.brand} /></View>
        ) : isError ? (
          <View style={styles.center}>
            <Feather name="alert-circle" size={30} color={COLORS.red || '#dc2626'} />
            <Text style={[styles.subtitle, { color: C.muted }]}>{error?.message || 'Could not load the invoice.'}</Text>
          </View>
        ) : !invoice ? (
          <View style={styles.center}>
            <Text style={[styles.subtitle, { color: C.muted }]}>No invoice found for this subscription.</Text>
          </View>
        ) : (
          <>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
              <View style={styles.statusRow}>
                <View style={[styles.pill, { backgroundColor: cfg.bg }]}>
                  <Text style={[styles.pillText, { color: cfg.fg }]}>{invoice.status || 'unknown'}</Text>
                </View>
                <Text style={[styles.subtitle, { color: C.muted }]}>
                  {invoiceTypeLabel(invoice.type, t('addons.invoiceType'))} · {fmtDate(invoice.createdAt)}
                </Text>
              </View>

              <View style={[styles.card, { backgroundColor: C.bg, borderColor: C.border }]}>
                {(invoice.lineItems || []).map((li, i) => (
                  <View key={i} style={[styles.liRow, { borderBottomColor: C.border }]}>
                    <Text style={[styles.liLabel, { color: C.text }]} numberOfLines={2}>{li.label}</Text>
                    <Text style={[styles.liAmount, { color: li.amount < 0 ? '#166534' : C.text }]}>
                      {li.amount < 0 ? `−${fmtMoney(Math.abs(li.amount))}` : fmtMoney(li.amount)}
                    </Text>
                  </View>
                ))}
                {invoice.creditApplied > 0 && (
                  <View style={[styles.liRow, { borderBottomColor: C.border }]}>
                    <Text style={[styles.liLabel, { color: C.muted }]}>Credit applied</Text>
                    <Text style={[styles.liAmount, { color: '#166534' }]}>−{fmtMoney(invoice.creditApplied)}</Text>
                  </View>
                )}
                <View style={[styles.totalRow, { backgroundColor: C.card }]}>
                  <Text style={[styles.totalLabel, { color: C.text }]}>Amount due</Text>
                  <Text
                    style={[
                      styles.totalAmount,
                      { color: invoice.status === 'paid' ? '#166534' : invoice.status === 'void' ? C.mutedSoft : C.text },
                      invoice.status === 'void' && styles.strike,
                    ]}
                  >
                    {fmtMoney(invoice.amountDue)}
                  </Text>
                </View>
              </View>

              {invoice.status === 'void' && (
                <Text style={[styles.note, { backgroundColor: C.bg, color: C.muted }]}>
                  This invoice was voided when the plan changed before it was paid — nothing is owed on it.
                </Text>
              )}

              {(invoice.paymentInfo?.method || invoice.paymentInfo?.transactionId) && (
                <View style={[styles.card, { backgroundColor: C.bg, borderColor: C.border, paddingVertical: 4 }]}>
                  <Row label="Method" value={invoice.paymentInfo.method || '-'} C={C} />
                  <Row label="Transaction ID" value={invoice.paymentInfo.transactionId || '-'} C={C} last />
                </View>
              )}
            </ScrollView>

            {invoice.status === 'unpaid' && (
              <View style={[styles.footer, { borderTopColor: C.border }]}>
                <Pressable
                  onPress={() => markPaid.mutate({ id: invoice._id })}
                  disabled={markPaid.isPending}
                  style={({ pressed }) => [styles.payBtn, (markPaid.isPending || pressed) && { opacity: 0.85 }]}
                >
                  {markPaid.isPending ? <ActivityIndicator size="small" color="#fff" /> : (
                    <>
                      <Feather name="check-circle" size={16} color="#fff" />
                      <Text style={styles.payBtnText}>Mark as Paid</Text>
                    </>
                  )}
                </Pressable>
              </View>
            )}
          </>
        )}
      </SafeAreaView>
    </ToastModal>
  );
}

function Row({ label, value, C, last }) {
  return (
    <View style={[styles.kvRow, last && { borderBottomWidth: 0 }, { borderBottomColor: C.border }]}>
      <Text style={[styles.kvLabel, { color: C.muted }]}>{label}</Text>
      <Text style={[styles.kvValue, { color: C.text }]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  title: { fontSize: 19, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 2 },
  closeBtn: { width: 36, height: 36, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  body: { padding: 16, paddingBottom: 28, gap: 14 },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  pill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
  pillText: { fontSize: 11, fontWeight: '800', textTransform: 'capitalize' },

  card: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  liRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth },
  liLabel: { flex: 1, fontSize: 13 },
  liAmount: { fontSize: 13, fontWeight: '700' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13 },
  totalLabel: { fontSize: 15, fontWeight: '800' },
  totalAmount: { fontSize: 16, fontWeight: '800' },
  strike: { textDecorationLine: 'line-through' },

  note: { borderRadius: 12, padding: 12, fontSize: 12, fontWeight: '600' },

  kvRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth },
  kvLabel: { fontSize: 12, fontWeight: '600' },
  kvValue: { fontSize: 13, fontWeight: '700', flex: 1, textAlign: 'right' },

  footer: { borderTopWidth: StyleSheet.hairlineWidth, padding: 14 },
  payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.brand, height: 48, borderRadius: 12 },
  payBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
