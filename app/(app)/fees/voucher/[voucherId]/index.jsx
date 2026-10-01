import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import {
  useAddLateFee,
  useRegenerateVoucher,
  useVoidVoucher,
  useVoucherDetail,
} from '../../../../../src/hooks/useFees';
import { useUserStore } from '../../../../../src/store/userStore';
import { useColors } from '../../../../../src/theme/useColors';
import { COLORS } from '../../../../../src/theme/colors';
import { hasAnyAction } from '../../../../../src/utils/permissions';
import {
  VOUCHER_STATUS_PILL,
  formatDate,
  formatMoney,
  formatMonth,
  titleCase,
} from '../../../../../src/constants/fee';
import RecordPaymentModal from '../../../../../src/component/fee/RecordPaymentModal';
import SmallActionModal from '../../../../../src/component/fee/SmallActionModal';

function Row({ label, value, valueColor, bold, divider, C }) {
  return (
    <View
      style={[
        styles.row,
        divider && {
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: C.border,
          paddingTop: 6,
        },
      ]}
    >
      <Text style={[styles.rowLabel, { color: C.text, fontWeight: bold ? '800' : '600' }]}>
        {label}
      </Text>
      <Text
        style={[
          styles.rowValue,
          {
            color: valueColor || (bold ? C.text : C.muted),
            fontWeight: bold ? '800' : '700',
          },
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

export default function VoucherDetailPage() {
  const { voucherId } = useLocalSearchParams();
  const router = useRouter();
  const C = useColors();
  const { user } = useUserStore();

  const { data: v, isLoading, error } = useVoucherDetail({ id: voucherId });

  const canRecordPayment = hasAnyAction(user?.role, [
    'record-payment',
    'record-all-branch-payment',
  ]);
  const canUpdate = hasAnyAction(user?.role, ['update-fee', 'update-all-branch-fee']);
  const canDelete = hasAnyAction(user?.role, ['delete-fee', 'delete-all-branch-fee']);
  const canGenerate = hasAnyAction(user?.role, ['generate-voucher', 'generate-all-branch-voucher']);

  const [payOpen, setPayOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [lateOpen, setLateOpen] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);

  const voidMut = useVoidVoucher({ id: voucherId, onSuccess: () => setVoidOpen(false) });
  const lateMut = useAddLateFee({ id: voucherId, onSuccess: () => setLateOpen(false) });
  const regenMut = useRegenerateVoucher({
    id: voucherId,
    onSuccess: () => {
      setRegenOpen(false);
      router.replace('/(app)/fees');
    },
  });

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: C.bg }]}>
        <ActivityIndicator size="large" color={COLORS.brand} />
      </View>
    );
  }

  if (error || !v) {
    return (
      <View style={[styles.center, { backgroundColor: C.bg }]}>
        <Feather name="alert-circle" size={36} color={COLORS.red} />
        <Text style={[styles.errorText, { color: C.muted, textAlign: 'center' }]}>
          {error?.response?.data?.message || error?.message || 'Voucher not found'}
        </Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const status = v.status;
  const cfg = VOUCHER_STATUS_PILL[status] || VOUCHER_STATUS_PILL.unpaid;
  const isFinal = status === 'paid' || status === 'void';

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
              {v.voucherNumber}
            </Text>
            <Text style={[styles.subtitle, { color: C.muted }]} numberOfLines={1}>
              {formatMonth(v.month)} · {v.academicYear || '—'}
            </Text>
          </View>
          <View style={[styles.pill, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.pillText, { color: cfg.fg }]}>{cfg.label}</Text>
          </View>
        </View>

        {/* Student card */}
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={styles.studentRow}>
            <View style={styles.studentAvatar}>
              <Text style={styles.studentAvatarText}>
                {(v.student?.user?.name?.[0] || '?').toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.studentName, { color: C.text }]} numberOfLines={1}>
                {v.student?.user?.name || '—'}
              </Text>
              <Text style={[styles.studentMeta, { color: C.muted }]} numberOfLines={1}>
                {v.student?.admissionNumber || '—'}
                {v.student?.rollNumber ? ` · Roll ${v.student.rollNumber}` : ''}
              </Text>
              <Text style={[styles.studentMeta, { color: C.mutedSoft }]} numberOfLines={1}>
                {v.class?.name || ''}
                {v.section?.name ? ` · ${v.section.name}` : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* Line items */}
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[styles.section, { color: C.muted }]}>LINE ITEMS</Text>
          {(v.lineItems || []).map((li, idx) => (
            <View key={idx} style={styles.lineItem}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.liName, { color: C.text }]} numberOfLines={1}>
                  {li.name}
                </Text>
                <Text style={[styles.liMeta, { color: C.mutedSoft }]}>
                  {li.componentName || ''} · {titleCase(li.frequency)}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.liAmount, { color: C.text }]}>
                  {formatMoney(li.finalAmount)}
                </Text>
                {li.finalAmount !== li.amount && (
                  <Text style={[styles.liStrike, { color: C.mutedSoft }]}>
                    {formatMoney(li.amount)}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Row label="Total" value={formatMoney(v.totalAmount)} C={C} />
          {v.discountApplied > 0 && (
            <Row label={`Discount (${v.discountApplied}%)`} value="applied" C={C} />
          )}
          {v.lateFee > 0 && (
            <Row label="Late Fee" value={formatMoney(v.lateFee)} valueColor="#991b1b" C={C} />
          )}
          <Row label="Paid" value={formatMoney(v.paidAmount)} valueColor="#166534" C={C} />
          <Row
            label="Balance"
            value={formatMoney(v.balanceAmount)}
            valueColor={v.balanceAmount > 0 ? '#991b1b' : C.text}
            bold
            divider
            C={C}
          />
        </View>

        {/* Meta */}
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Row label="Due Date" value={formatDate(v.dueDate)} C={C} />
          <Row label="Created" value={formatDate(v.createdAt)} C={C} />
          {!!v.notes && <Row label="Notes" value={v.notes} C={C} />}
          {!!v.voidedAt && (
            <>
              <Row label="Voided At" value={formatDate(v.voidedAt)} C={C} />
              {!!v.voidReason && <Row label="Void Reason" value={v.voidReason} C={C} />}
            </>
          )}
        </View>

        {/* Payments history */}
        {(v.payments || []).length > 0 && (
          <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[styles.section, { color: C.muted }]}>
              PAYMENTS ({(v.payments || []).length})
            </Text>
            {(v.payments || []).map((p) => (
              <View key={p._id} style={styles.paymentRow}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.paymentNum, { color: C.text }]} numberOfLines={1}>
                    {p.receiptNumber}
                    {p.isVoid && <Text style={{ color: '#991b1b' }}> · VOID</Text>}
                  </Text>
                  <Text style={[styles.paymentMeta, { color: C.muted }]} numberOfLines={1}>
                    {formatDate(p.paymentDate)} · {titleCase(p.method)}
                  </Text>
                </View>
                <Text style={[styles.paymentAmount, { color: p.isVoid ? '#991b1b' : C.text }]}>
                  {formatMoney(p.amount)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Actions */}
        {!isFinal && (
          <View style={styles.actionsRow}>
            {canRecordPayment && v.balanceAmount > 0 && (
              <Pressable
                onPress={() => setPayOpen(true)}
                style={({ pressed }) => [
                  styles.actionBtn,
                  { backgroundColor: COLORS.brand },
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Feather name="dollar-sign" size={14} color="#fff" />
                <Text style={styles.actionBtnText}>Record Payment</Text>
              </Pressable>
            )}
            {canUpdate && (
              <Pressable
                onPress={() => setLateOpen(true)}
                style={({ pressed }) => [
                  styles.actionBtn,
                  { backgroundColor: '#b45309' },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Feather name="alert-octagon" size={14} color="#fff" />
                <Text style={styles.actionBtnText}>Late Fee</Text>
              </Pressable>
            )}
            {/* Regenerating voids the old voucher: server needs generate AND delete */}
            {canGenerate && canDelete && (v.paidAmount || 0) === 0 && (
              <Pressable
                onPress={() => setRegenOpen(true)}
                style={({ pressed }) => [
                  styles.actionBtn,
                  { backgroundColor: '#2563eb' },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Feather name="refresh-cw" size={14} color="#fff" />
                <Text style={styles.actionBtnText}>Regenerate</Text>
              </Pressable>
            )}
            {canDelete && (
              <Pressable
                onPress={() => setVoidOpen(true)}
                style={({ pressed }) => [
                  styles.actionBtn,
                  { backgroundColor: '#b91c1c' },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Feather name="x" size={14} color="#fff" />
                <Text style={styles.actionBtnText}>Void</Text>
              </Pressable>
            )}
          </View>
        )}

        {!!v.studentId && (
          <Pressable
            onPress={() =>
              router.push(
                `/(app)/fees/consolidated/${
                  typeof v.studentId === 'object' ? v.studentId._id : v.studentId
                }`,
              )
            }
            style={({ pressed }) => [
              styles.consolidatedBtn,
              { borderColor: '#c7d2fe', backgroundColor: '#eef2ff' },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Feather name="layers" size={14} color="#3730a3" />
            <Text style={styles.consolidatedText}>Consolidated Slip</Text>
            <Feather name="chevron-right" size={14} color="#3730a3" />
          </Pressable>
        )}
      </ScrollView>

      <RecordPaymentModal open={payOpen} voucher={v} onClose={() => setPayOpen(false)} />

      <SmallActionModal
        open={voidOpen}
        title="Void Voucher"
        subtitle={`Void ${v.voucherNumber}? This can't be undone.`}
        submitLabel="Void"
        submitTone="danger"
        isPending={voidMut.isPending}
        fields={[
          {
            key: 'reason',
            label: 'Reason',
            required: true,
            placeholder: 'e.g. issued in error',
          },
        ]}
        onClose={() => setVoidOpen(false)}
        onSubmit={(vals) => voidMut.mutate({ reason: vals.reason.trim() })}
      />

      <SmallActionModal
        open={lateOpen}
        title="Set Late Fee"
        subtitle={`Voucher ${v.voucherNumber}`}
        submitLabel="Save"
        isPending={lateMut.isPending}
        fields={[
          {
            key: 'lateFee',
            label: 'Late Fee',
            required: true,
            placeholder: '0',
            type: 'number',
            defaultValue: String(v.lateFee || 0),
          },
          {
            key: 'notes',
            label: 'Notes',
            placeholder: 'Optional',
            multiline: true,
          },
        ]}
        onClose={() => setLateOpen(false)}
        onSubmit={(vals) =>
          lateMut.mutate({
            lateFee: Number(vals.lateFee) || 0,
            ...(vals.notes?.trim() ? { notes: vals.notes.trim() } : {}),
          })
        }
      />

      <SmallActionModal
        open={regenOpen}
        title="Regenerate Voucher"
        subtitle={`Void ${v.voucherNumber} and create a fresh one.`}
        submitLabel="Regenerate"
        isPending={regenMut.isPending}
        fields={[
          {
            key: 'reason',
            label: 'Reason',
            required: true,
            placeholder: 'e.g. fee revision',
          },
          {
            key: 'dueDate',
            label: 'Due date (optional)',
            placeholder: 'YYYY-MM-DD',
          },
        ]}
        onClose={() => setRegenOpen(false)}
        onSubmit={(vals) =>
          regenMut.mutate({
            reason: vals.reason.trim(),
            ...(vals.dueDate?.trim() ? { dueDate: vals.dueDate.trim() } : {}),
          })
        }
      />
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
  title: { fontSize: 18, fontWeight: '800' },
  subtitle: { fontSize: 12, marginTop: 2 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillText: { fontSize: 10, fontWeight: '800' },

  card: { borderRadius: 14, padding: 12, borderWidth: 1, gap: 6 },
  section: { fontSize: 10, letterSpacing: 1.1, fontWeight: '800', marginBottom: 4 },

  studentRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  studentAvatar: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentAvatarText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  studentName: { fontSize: 14, fontWeight: '800' },
  studentMeta: { fontSize: 11, marginTop: 2 },

  lineItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  liName: { fontSize: 13, fontWeight: '700' },
  liMeta: { fontSize: 11, marginTop: 2 },
  liAmount: { fontSize: 13, fontWeight: '800' },
  liStrike: { fontSize: 11, textDecorationLine: 'line-through' },

  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  rowLabel: { fontSize: 13 },
  rowValue: { fontSize: 13, maxWidth: '60%', textAlign: 'right' },

  paymentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  paymentNum: { fontSize: 12, fontWeight: '800' },
  paymentMeta: { fontSize: 11, marginTop: 2 },
  paymentAmount: { fontSize: 13, fontWeight: '800' },

  actionsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionBtn: {
    flex: 1,
    minWidth: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: 10,
  },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  consolidatedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
  },
  consolidatedText: { color: '#3730a3', fontWeight: '700', fontSize: 13, flex: 1 },
});
