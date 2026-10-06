import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import {
  useCancelPayslip,
  useFinalizePayslip,
  usePayPayslip,
  usePayslipDetail,
  useReversePayslipPayment,
  useUpdatePayslip,
} from '../../../../../src/hooks/useStaffSalary';
import { newIdempotencyKey } from '../../../../../src/utils/idempotency';
import { useUserStore } from '../../../../../src/store/userStore';
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  PAYSLIP_STATUS_PILL,
  REFERENCE_REQUIRED_METHODS,
  formatDate,
  formatMonth,
  formatMoney,
  todayISO,
} from '../../../../../src/constants/staffSalary';
import { canActOnBranch } from '../../../../../src/utils/permissions';
import { useColors } from '../../../../../src/theme/useColors';
import { COLORS } from '../../../../../src/theme/colors';

function StatusBadges({ payslip, C }) {
  const cfg = PAYSLIP_STATUS_PILL[payslip.status] || PAYSLIP_STATUS_PILL.draft;
  return (
    <View style={styles.statusRow}>
      <View style={[styles.pill, { backgroundColor: cfg.bg }]}>
        <Text style={[styles.pillText, { color: cfg.fg }]}>{cfg.label}</Text>
      </View>
      {payslip.finalizedAt && (
        <View style={styles.metaBadge}>
          <Feather name="lock" size={11} color={C.muted} />
          <Text style={[styles.metaBadgeText, { color: C.muted }]}>
            Finalized {formatDate(payslip.finalizedAt)}
          </Text>
        </View>
      )}
      {payslip.paymentDate && (
        <View style={styles.metaBadge}>
          <Feather name="dollar-sign" size={11} color={C.muted} />
          <Text style={[styles.metaBadgeText, { color: C.muted }]}>
            Paid {formatDate(payslip.paymentDate)}
          </Text>
        </View>
      )}
      {payslip.cancelledAt && (
        <View style={styles.metaBadge}>
          <Feather name="x-circle" size={11} color="#dc2626" />
          <Text style={[styles.metaBadgeText, { color: '#dc2626' }]}>
            Cancelled {formatDate(payslip.cancelledAt)}
          </Text>
        </View>
      )}
    </View>
  );
}

function LineRow({ label, value, bold, divider, C }) {
  return (
    <View
      style={[
        styles.lineRow,
        divider && {
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: C.border,
          paddingTop: 6,
        },
      ]}
    >
      <Text style={[styles.lineLabel, { color: C.text, fontWeight: bold ? '800' : '600' }]}>
        {label}
      </Text>
      <Text
        style={[
          styles.lineValue,
          { color: bold ? C.text : C.muted, fontWeight: bold ? '800' : '600' },
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

function SnapStat({ label, value, tone, C }) {
  const map = {
    success: { bg: '#dcfce7', fg: '#166534' },
    danger: { bg: '#fee2e2', fg: '#991b1b' },
    neutral: { bg: '#f3f4f6', fg: '#374151' },
  };
  const t = map[tone] || map.neutral;
  return (
    <View style={[styles.snapStat, { backgroundColor: t.bg }]}>
      <Text style={[styles.snapLabel, { color: t.fg }]}>{label.toUpperCase()}</Text>
      <Text style={[styles.snapValue, { color: t.fg }]}>{value ?? 0}</Text>
    </View>
  );
}

function PolicySnapshotBlock({ snapshot, C }) {
  const rows = [
    ['Working days / month', snapshot.workingDaysPerMonth],
    ['Free absences / month', snapshot.freeAbsencesPerMonth],
    [
      'Absent rule',
      snapshot.absentDeductionMode === 'fixed'
        ? `Fixed: ${snapshot.absentDeductionAmount} per absence`
        : `Per-day × ${snapshot.absentDeductionMultiplier}`,
    ],
    ['Free lates / month', snapshot.freeLatesPerMonth],
    ['Late rule', `Every ${snapshot.lateGroupSize} lates = ${snapshot.lateDeductionDays} day(s)`],
    ['Half-day factor', snapshot.halfDayDeductionFactor],
    ['Unpaid leave factor', snapshot.unpaidLeaveDeductionFactor],
    ['Paid leave factor', snapshot.paidLeaveDeductionFactor],
    ['Overtime / hour', snapshot.overtimeBonusPerHour],
    ['Perfect attendance bonus', snapshot.perfectAttendanceBonus],
  ];
  return (
    <View style={[styles.section, { backgroundColor: C.card, borderColor: C.border }]}>
      <Text style={[styles.sectionTitle, { color: C.text }]}>Rules Applied</Text>
      <View style={{ gap: 4 }}>
        {rows.map(([k, v]) => (
          <View key={k} style={styles.policyRow}>
            <Text style={[styles.policyLabel, { color: C.mutedSoft }]}>{k}</Text>
            <Text style={[styles.policyValue, { color: C.text }]}>{v ?? '—'}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function PayslipDetailPage() {
  const router = useRouter();
  const { payslipId } = useLocalSearchParams();
  const C = useColors();
  const { user } = useUserStore();

  const { data: payslip, isLoading, error } = usePayslipDetail({ id: payslipId });

  // Branch reach: the branch-tier action only covers payslips of the user's own
  // branch; another branch's payslip needs the *-all-branch-* action (API rule).
  const payslipBranchId = payslip?.branchId;
  const canUpdate = canActOnBranch(user, 'update-payslip', payslipBranchId);
  const canPay = canActOnBranch(user, 'pay-payslip', payslipBranchId);
  const canCancel = canActOnBranch(user, 'cancel-payslip', payslipBranchId);
  // Reversing an instalment undoes a payment: the server wants pay AND cancel,
  // and for another branch's payslip both at org (all-branch) level — which is
  // exactly what canPay/canCancel resolve to off-branch.
  const canReverse = canPay && canCancel;

  const [editing, setEditing] = useState(false);
  const [bonus, setBonus] = useState('');
  const [tax, setTax] = useState('');
  const [notes, setNotes] = useState('');

  const [showPay, setShowPay] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [reversing, setReversing] = useState(null);

  const update = useUpdatePayslip({
    id: payslipId,
    onSuccess: () => setEditing(false),
  });
  const finalize = useFinalizePayslip({ id: payslipId });

  useEffect(() => {
    if (!payslip) return;
    setBonus(String(payslip.bonus ?? 0));
    setTax(String(payslip.tax ?? 0));
    setNotes(payslip.notes || '');
  }, [payslip]);

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: C.bg }]}>
        <ActivityIndicator size="large" color={COLORS.brand} />
      </View>
    );
  }

  if (error || !payslip) {
    return (
      <View style={[styles.center, { backgroundColor: C.bg }]}>
        <Feather name="alert-circle" size={36} color={COLORS.red} />
        <Text style={[styles.errorText, { color: C.muted }]}>
          {error?.response?.data?.message || error?.message || 'Payslip not found'}
        </Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const status = payslip.status;
  const isDraft = status === 'draft';
  const isFinalized = status === 'finalized';
  const isPartiallyPaid = status === 'partially-paid';
  const isPaid = status === 'paid';
  const isCancelled = status === 'cancelled';
  const cur = payslip.currency || 'PKR';

  const staffName =
    payslip.staffId?.userId?.name ||
    payslip.staffId?.user?.name ||
    payslip.staffId?.name ||
    'Staff';

  const saveEdits = () => {
    const payload = {
      bonus: Number(bonus) || 0,
      tax: Number(tax) || 0,
    };
    if (notes !== (payslip.notes || '')) payload.notes = notes;
    update.mutate(payload);
  };

  return (
    <View style={[styles.safe, { backgroundColor: C.bg }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
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
              {staffName}
            </Text>
            <Text style={[styles.subtitle, { color: C.muted }]} numberOfLines={1}>
              {formatMonth(payslip.month)}
              {payslip.serialNumber ? ` · ${payslip.serialNumber}` : ''}
            </Text>
          </View>
        </View>

        <StatusBadges payslip={payslip} C={C} />

        {!!payslip.cancelReason && (
          <View style={styles.errorBox}>
            <Feather name="alert-triangle" size={14} color="#991b1b" />
            <Text style={styles.errorBoxText}>
              <Text style={{ fontWeight: '800' }}>Reason:</Text> {payslip.cancelReason}
            </Text>
          </View>
        )}

        {/* Earnings */}
        <View style={[styles.section, { borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: '#166534' }]}>Earnings</Text>
            {isDraft && canUpdate && !editing && (
              <Pressable
                onPress={() => setEditing(true)}
                style={({ pressed }) => [
                  styles.smallBtn,
                  { backgroundColor: '#dcfce7' },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Feather name="edit-3" size={12} color="#166534" />
                <Text style={[styles.smallBtnText, { color: '#166534' }]}>Edit B/T</Text>
              </Pressable>
            )}
          </View>
          <LineRow label="Basic" value={formatMoney(payslip.basicSalary, cur)} C={C} />
          {(payslip.allowances || []).map((a, i) => (
            <LineRow
              key={i}
              label={`${a.name}${a.type === 'percent' ? ` (${a.amount}%)` : ''}`}
              value={
                a.type === 'percent'
                  ? formatMoney(
                      ((Number(payslip.basicSalary) || 0) * (Number(a.amount) || 0)) / 100,
                      cur,
                    )
                  : formatMoney(a.amount, cur)
              }
              C={C}
            />
          ))}
          {editing ? (
            <View style={styles.lineRow}>
              <Text style={[styles.lineLabel, { color: C.text }]}>Bonus</Text>
              <TextInput
                value={bonus}
                onChangeText={(v) => setBonus(v.replace(/[^0-9.]/g, ''))}
                keyboardType="decimal-pad"
                style={styles.editInput}
              />
            </View>
          ) : (
            <LineRow label="Bonus" value={formatMoney(payslip.bonus, cur)} C={C} />
          )}
          {payslip.policyBonus != null && Number(payslip.policyBonus) > 0 && (
            <LineRow label="Policy Bonus" value={formatMoney(payslip.policyBonus, cur)} C={C} />
          )}
          <LineRow label="Gross" value={formatMoney(payslip.gross, cur)} bold divider C={C} />
        </View>

        {/* Deductions */}
        <View style={[styles.section, { borderColor: '#fecaca', backgroundColor: '#fef2f2' }]}>
          <Text style={[styles.sectionTitle, { color: '#991b1b' }]}>Deductions</Text>
          {(payslip.deductions || []).map((d, i) => (
            <LineRow
              key={i}
              label={`${d.name}${d.type === 'percent' ? ` (${d.amount}%)` : ''}`}
              value={
                d.type === 'percent'
                  ? formatMoney(
                      ((Number(payslip.basicSalary) || 0) * (Number(d.amount) || 0)) / 100,
                      cur,
                    )
                  : formatMoney(d.amount, cur)
              }
              C={C}
            />
          ))}
          <LineRow
            label="Attendance Deduction"
            value={formatMoney(payslip.attendanceDeduction, cur)}
            C={C}
          />
          {editing ? (
            <View style={styles.lineRow}>
              <Text style={[styles.lineLabel, { color: C.text }]}>Tax</Text>
              <TextInput
                value={tax}
                onChangeText={(v) => setTax(v.replace(/[^0-9.]/g, ''))}
                keyboardType="decimal-pad"
                style={styles.editInput}
              />
            </View>
          ) : (
            <LineRow label="Tax" value={formatMoney(payslip.tax, cur)} C={C} />
          )}
          <LineRow
            label="Total Deduction"
            value={formatMoney(
              (Number(payslip.totalDeduction) || 0) +
                (Number(payslip.attendanceDeduction) || 0) +
                (Number(payslip.tax) || 0),
              cur,
            )}
            bold
            divider
            C={C}
          />
        </View>

        {/* Net banner */}
        <View
          style={[
            styles.netBanner,
            { backgroundColor: COLORS.brand + '10', borderColor: COLORS.brand + '40' },
          ]}
        >
          <View>
            <Text style={[styles.netLabel, { color: COLORS.brand }]}>NET SALARY</Text>
            <Text style={[styles.netValue, { color: COLORS.brand }]}>
              {formatMoney(payslip.netSalary, cur)}
            </Text>
          </View>
          {payslip.paidAmount != null && (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.netLabel, { color: C.muted }]}>PAID</Text>
              <Text style={[styles.netSub, { color: C.text }]}>
                {formatMoney(payslip.paidAmount, cur)}
              </Text>
              {!!payslip.paymentMethod && (
                <Text style={[styles.netVia, { color: C.muted }]}>
                  via {PAYMENT_METHOD_LABELS[payslip.paymentMethod] || payslip.paymentMethod}
                </Text>
              )}
              {payslip.balanceAmount > 0 && (
                <Text style={[styles.netVia, { color: '#b45309', fontWeight: '700' }]}>
                  Remaining {formatMoney(payslip.balanceAmount, cur)}
                </Text>
              )}
            </View>
          )}
        </View>

        {Number(payslip.shortfall) > 0 && (
          <View style={[styles.warnBox, { backgroundColor: '#fef3c7', borderColor: '#fde68a' }]}>
            <Feather name="alert-triangle" size={14} color="#92400e" />
            <Text style={[styles.warnText, { color: '#92400e' }]}>
              <Text style={{ fontWeight: '800' }}>
                Shortfall {formatMoney(payslip.shortfall, cur)}:
              </Text>{' '}
              deductions exceeded gross pay by this much. Net salary is floored at 0 — the excess is
              not carried forward automatically.
            </Text>
          </View>
        )}

        {payslip.payments?.length > 0 && (
          <View style={[styles.section, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[styles.fieldLabel, { color: C.muted }]}>
              PAYMENTS ({payslip.payments.length})
            </Text>
            {payslip.payments.map((p, i) => {
              const reversed = !!p.reversedAt;
              return (
                <View key={p._id || i} style={{ paddingVertical: 4, gap: 2 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Text style={[{ color: C.muted, flex: 1 }, reversed && styles.struck]}>
                      #{i + 1} • {formatDate(p.paymentDate)} •{' '}
                      {PAYMENT_METHOD_LABELS[p.paymentMethod] || p.paymentMethod || '—'}
                    </Text>
                    <Text
                      style={[
                        { color: reversed ? C.mutedSoft : C.text, fontWeight: '700' },
                        reversed && styles.struck,
                      ]}
                    >
                      {formatMoney(p.amount, cur)}
                    </Text>
                    {canReverse && !reversed && !isCancelled && !!p._id && (
                      <Pressable
                        onPress={() => setReversing(p)}
                        hitSlop={6}
                        style={({ pressed }) => [
                          styles.smallBtn,
                          { backgroundColor: '#fee2e2' },
                          pressed && { opacity: 0.85 },
                        ]}
                      >
                        <Feather name="rotate-ccw" size={11} color="#991b1b" />
                        <Text style={[styles.smallBtnText, { color: '#991b1b' }]}>Reverse</Text>
                      </Pressable>
                    )}
                  </View>
                  {reversed && (
                    <Text style={{ color: '#b91c1c', fontSize: 11 }}>
                      Reversed {formatDate(p.reversedAt)}
                      {p.reversalReason ? ` — ${p.reversalReason}` : ''}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {reversing && (
          <ReverseForm
            payslip={payslip}
            payment={reversing}
            cur={cur}
            onClose={() => setReversing(null)}
            C={C}
          />
        )}

        {editing && (
          <View style={[styles.section, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[styles.fieldLabel, { color: C.muted }]}>NOTES</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              multiline
              placeholder="Optional"
              placeholderTextColor={C.mutedSoft}
              style={[
                styles.notesInput,
                { color: C.text, borderColor: C.border, backgroundColor: C.bg },
              ]}
            />
            <View style={styles.actionsRow}>
              <Pressable
                onPress={() => {
                  setEditing(false);
                  setBonus(String(payslip.bonus ?? 0));
                  setTax(String(payslip.tax ?? 0));
                  setNotes(payslip.notes || '');
                }}
                style={({ pressed }) => [
                  styles.ghostBtn,
                  { borderColor: C.border, backgroundColor: C.bg },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={[styles.ghostBtnText, { color: C.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={saveEdits}
                disabled={update.isPending}
                style={({ pressed }) => [
                  styles.actionBtn,
                  { backgroundColor: COLORS.brand, flex: 1 },
                  (update.isPending || pressed) && { opacity: 0.85 },
                ]}
              >
                {update.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Feather name="save" size={14} color="#fff" />
                    <Text style={styles.actionBtnText}>Save</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        )}

        {/* Attendance snapshot */}
        {payslip.attendance && (
          <View style={[styles.section, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>Attendance Snapshot</Text>
            <View style={styles.snapGrid}>
              <SnapStat label="Working" value={payslip.attendance.workingDays} C={C} />
              <SnapStat
                label="Present"
                value={payslip.attendance.presentDays}
                tone="success"
                C={C}
              />
              <SnapStat label="Late" value={payslip.attendance.lateDays} C={C} />
              <SnapStat label="Half" value={payslip.attendance.halfDays} C={C} />
              <SnapStat label="Paid Leave" value={payslip.attendance.paidLeaveDays} C={C} />
              <SnapStat
                label="Unpaid Lv"
                value={payslip.attendance.unpaidLeaveDays}
                tone="danger"
                C={C}
              />
              <SnapStat label="Absent" value={payslip.attendance.absentDays} tone="danger" C={C} />
              <SnapStat label="Holiday" value={payslip.attendance.holidayDays} C={C} />
              <SnapStat
                label="Days Paid"
                value={payslip.attendance.daysPaid}
                tone="success"
                C={C}
              />
            </View>
          </View>
        )}

        {payslip.policySnapshot ? (
          <PolicySnapshotBlock snapshot={payslip.policySnapshot} C={C} />
        ) : (
          payslip.attendance && (
            <View style={[styles.warnBox, { backgroundColor: '#fef3c7', borderColor: '#fde68a' }]}>
              <Feather name="alert-triangle" size={14} color="#92400e" />
              <Text style={[styles.warnText, { color: '#92400e' }]}>
                No salary policy was active at generation time — pro-rate fallback used (basic ÷
                working days × unpaid days).
              </Text>
            </View>
          )
        )}

        {!editing && !!payslip.notes && (
          <View style={[styles.section, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[styles.fieldLabel, { color: C.mutedSoft }]}>NOTES</Text>
            <Text style={[styles.notesText, { color: C.text }]}>{payslip.notes}</Text>
          </View>
        )}

        {/* Action buttons */}
        {!editing && !isCancelled && (
          <View style={styles.actionsRow}>
            {canCancel && !isPaid && !isPartiallyPaid && (
              <Pressable
                onPress={() => setShowCancel(true)}
                style={({ pressed }) => [
                  styles.actionBtn,
                  { backgroundColor: '#b91c1c' },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Feather name="x" size={14} color="#fff" />
                <Text style={styles.actionBtnText}>Cancel</Text>
              </Pressable>
            )}
            {canUpdate && isDraft && (
              <Pressable
                onPress={() => {
                  Alert.alert(
                    'Finalize Payslip',
                    'Once finalized, bonus/tax can no longer be edited. Continue?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Finalize', onPress: () => finalize.mutate() },
                    ],
                  );
                }}
                disabled={finalize.isPending}
                style={({ pressed }) => [
                  styles.actionBtn,
                  { backgroundColor: '#2563eb' },
                  (finalize.isPending || pressed) && { opacity: 0.85 },
                ]}
              >
                {finalize.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Feather name="lock" size={14} color="#fff" />
                    <Text style={styles.actionBtnText}>Finalize</Text>
                  </>
                )}
              </Pressable>
            )}
            {canPay && (isDraft || isFinalized || isPartiallyPaid) && (
              <Pressable
                onPress={() => setShowPay(true)}
                style={({ pressed }) => [
                  styles.actionBtn,
                  { backgroundColor: COLORS.brand },
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Feather name="dollar-sign" size={14} color="#fff" />
                <Text style={styles.actionBtnText}>
                  {isPartiallyPaid ? 'Pay Instalment' : 'Record Payment'}
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {showPay && <PayForm payslip={payslip} onClose={() => setShowPay(false)} C={C} />}
        {showCancel && <CancelForm payslip={payslip} onClose={() => setShowCancel(false)} C={C} />}
      </ScrollView>
    </View>
  );
}

function PayForm({ payslip, onClose, C }) {
  const [paymentDate, setPaymentDate] = useState(todayISO());
  const [paymentMethod, setPaymentMethod] = useState('bank-transfer');
  const [paymentReference, setPaymentReference] = useState('');
  // Defaults to what is still owed; enter less to pay an instalment.
  const remaining = payslip.balanceAmount ?? payslip.netSalary ?? 0;
  const [paidAmount, setPaidAmount] = useState(String(remaining));
  const [notes, setNotes] = useState('');
  // One key per opened form, reused if Confirm is retried after a network error.
  const [idempotencyKey] = useState(() => newIdempotencyKey());

  const pay = usePayPayslip({ id: payslip._id, onSuccess: () => onClose() });

  const submit = () => {
    if (!paymentDate) {
      Toast.show({ type: 'error', text1: 'Payment date is required' });
      return;
    }
    if (!paymentMethod) {
      Toast.show({ type: 'error', text1: 'Method is required' });
      return;
    }
    if (REFERENCE_REQUIRED_METHODS.includes(paymentMethod) && !paymentReference.trim()) {
      Toast.show({ type: 'error', text1: 'Reference required for this method' });
      return;
    }
    const payload = { paymentDate, paymentMethod };
    if (paymentReference.trim()) payload.paymentReference = paymentReference.trim();
    // A fully deducted payslip (nothing owed) is settled without an amount.
    if (remaining > 0 && paidAmount !== '' && !Number.isNaN(Number(paidAmount))) {
      const amount = Number(paidAmount);
      if (amount <= 0 || amount > remaining) {
        Toast.show({ type: 'error', text1: `Amount must be between 1 and ${remaining}` });
        return;
      }
      payload.paidAmount = amount;
    }
    if (notes.trim()) payload.notes = notes.trim();
    pay.mutate({ ...payload, idempotencyKey });
  };

  return (
    <View style={[styles.formCard, { borderColor: '#99f6e4', backgroundColor: '#f0fdfa' }]}>
      <Text style={[styles.formTitle, { color: '#0f766e' }]}>
        Record Payment — remaining {remaining}
      </Text>

      <View style={styles.row2}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.fieldLabel, { color: C.muted }]}>DATE</Text>
          <TextInput
            value={paymentDate}
            onChangeText={setPaymentDate}
            placeholder="2026-06-01"
            placeholderTextColor={C.mutedSoft}
            keyboardType="numbers-and-punctuation"
            autoCapitalize="none"
            style={[
              styles.input,
              { color: C.text, borderColor: C.border, backgroundColor: C.card },
            ]}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.fieldLabel, { color: C.muted }]}>AMOUNT</Text>
          <TextInput
            value={paidAmount}
            onChangeText={(v) => setPaidAmount(v.replace(/[^0-9.]/g, ''))}
            keyboardType="decimal-pad"
            placeholder={String(remaining)}
            placeholderTextColor={C.mutedSoft}
            style={[
              styles.input,
              { color: C.text, borderColor: C.border, backgroundColor: C.card },
            ]}
          />
        </View>
      </View>

      <View>
        <Text style={[styles.fieldLabel, { color: C.muted }]}>METHOD</Text>
        <View style={styles.chipRow}>
          {PAYMENT_METHODS.map((m) => {
            const active = paymentMethod === m;
            return (
              <Pressable
                key={m}
                onPress={() => setPaymentMethod(m)}
                style={({ pressed }) => [
                  styles.chip,
                  { backgroundColor: C.card, borderColor: C.border },
                  active && styles.chipActive,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={[styles.chipText, { color: C.text }, active && styles.chipTextActive]}>
                  {PAYMENT_METHOD_LABELS[m]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View>
        <Text style={[styles.fieldLabel, { color: C.muted }]}>
          REFERENCE
          {REFERENCE_REQUIRED_METHODS.includes(paymentMethod) ? ' *' : ''}
        </Text>
        <TextInput
          value={paymentReference}
          onChangeText={setPaymentReference}
          placeholder="TXN-12345"
          placeholderTextColor={C.mutedSoft}
          style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.card }]}
        />
      </View>

      <View>
        <Text style={[styles.fieldLabel, { color: C.muted }]}>NOTES</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Optional"
          placeholderTextColor={C.mutedSoft}
          style={[
            styles.notesInput,
            { color: C.text, borderColor: C.border, backgroundColor: C.card },
          ]}
        />
      </View>

      <View style={styles.actionsRow}>
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [
            styles.ghostBtn,
            { borderColor: C.border, backgroundColor: C.card },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={[styles.ghostBtnText, { color: C.text }]}>Back</Text>
        </Pressable>
        <Pressable
          onPress={submit}
          disabled={pay.isPending}
          style={({ pressed }) => [
            styles.actionBtn,
            { backgroundColor: COLORS.brand, flex: 1 },
            (pay.isPending || pressed) && { opacity: 0.85 },
          ]}
        >
          {pay.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Feather name="check" size={14} color="#fff" />
              <Text style={styles.actionBtnText}>Confirm Payment</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function ReverseForm({ payslip, payment, cur, onClose, C }) {
  const [reason, setReason] = useState('');
  const reverse = useReversePayslipPayment({ id: payslip._id, onSuccess: () => onClose() });

  const submit = () => {
    if (!reason.trim()) {
      Toast.show({ type: 'error', text1: 'Reason is required' });
      return;
    }
    reverse.mutate({ paymentId: payment._id, reason: reason.trim() });
  };

  return (
    <View style={[styles.formCard, { borderColor: '#fecaca', backgroundColor: '#fef2f2' }]}>
      <Text style={[styles.formTitle, { color: '#991b1b' }]}>
        Reverse {formatMoney(payment.amount, cur)} paid {formatDate(payment.paymentDate)}
      </Text>
      <Text style={{ color: '#991b1b', fontSize: 12 }}>
        The instalment stays on record but stops counting toward the paid amount.
      </Text>
      <View>
        <Text style={[styles.fieldLabel, { color: C.muted }]}>REASON *</Text>
        <TextInput
          value={reason}
          onChangeText={setReason}
          placeholder="Wrong amount, bounced transfer, etc."
          placeholderTextColor={C.mutedSoft}
          style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.card }]}
        />
      </View>
      <View style={styles.actionsRow}>
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [
            styles.ghostBtn,
            { borderColor: C.border, backgroundColor: C.card },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={[styles.ghostBtnText, { color: C.text }]}>Back</Text>
        </Pressable>
        <Pressable
          onPress={submit}
          disabled={reverse.isPending}
          style={({ pressed }) => [
            styles.actionBtn,
            { backgroundColor: '#b91c1c', flex: 1 },
            (reverse.isPending || pressed) && { opacity: 0.85 },
          ]}
        >
          {reverse.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Feather name="rotate-ccw" size={14} color="#fff" />
              <Text style={styles.actionBtnText}>Confirm Reverse</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function CancelForm({ payslip, onClose, C }) {
  const [reason, setReason] = useState('');
  const cancel = useCancelPayslip({ id: payslip._id, onSuccess: () => onClose() });

  const submit = () => {
    if (!reason.trim()) {
      Toast.show({ type: 'error', text1: 'Reason is required' });
      return;
    }
    cancel.mutate({ reason: reason.trim() });
  };

  return (
    <View style={[styles.formCard, { borderColor: '#fecaca', backgroundColor: '#fef2f2' }]}>
      <Text style={[styles.formTitle, { color: '#991b1b' }]}>Cancel Payslip</Text>
      <View>
        <Text style={[styles.fieldLabel, { color: C.muted }]}>REASON *</Text>
        <TextInput
          value={reason}
          onChangeText={setReason}
          placeholder="Duplicate, error, etc."
          placeholderTextColor={C.mutedSoft}
          style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.card }]}
        />
      </View>
      <View style={styles.actionsRow}>
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [
            styles.ghostBtn,
            { borderColor: C.border, backgroundColor: C.card },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={[styles.ghostBtnText, { color: C.text }]}>Back</Text>
        </Pressable>
        <Pressable
          onPress={submit}
          disabled={cancel.isPending}
          style={({ pressed }) => [
            styles.actionBtn,
            { backgroundColor: '#b91c1c', flex: 1 },
            (cancel.isPending || pressed) && { opacity: 0.85 },
          ]}
        >
          {cancel.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Feather name="x" size={14} color="#fff" />
              <Text style={styles.actionBtnText}>Confirm Cancel</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 14, paddingBottom: 32, gap: 12 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  errorText: { fontSize: 14, textAlign: 'center' },
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

  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillText: { fontSize: 10, fontWeight: '800' },
  metaBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaBadgeText: { fontSize: 10, fontWeight: '700' },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fee2e2',
    borderColor: '#fecaca',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  errorBoxText: { color: '#991b1b', fontSize: 12, flex: 1 },

  warnBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  warnText: { fontSize: 12, flex: 1 },

  section: { borderRadius: 14, padding: 12, borderWidth: 1, gap: 6 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 13, fontWeight: '800' },

  lineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  lineLabel: { fontSize: 13 },
  lineValue: { fontSize: 13, maxWidth: '60%', textAlign: 'right' },

  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },
  smallBtnText: { fontSize: 10, fontWeight: '800' },

  editInput: {
    minWidth: 100,
    height: 32,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    borderRadius: 6,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '700',
  },

  netBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
  },
  netLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  netValue: { fontSize: 24, fontWeight: '800', marginTop: 2 },
  netSub: { fontSize: 17, fontWeight: '800', marginTop: 2 },
  netVia: { fontSize: 10, marginTop: 2 },

  snapGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  snapStat: {
    flexBasis: '31%',
    flexGrow: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  snapLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  snapValue: { fontSize: 14, fontWeight: '800' },

  policyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 8,
  },
  policyLabel: { fontSize: 11, fontWeight: '600' },
  policyValue: { fontSize: 11, fontWeight: '700' },

  fieldLabel: { fontSize: 10, letterSpacing: 1.1, fontWeight: '700', marginBottom: 4 },
  input: {
    height: 40,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  row2: { flexDirection: 'row', gap: 10 },
  notesInput: {
    height: 70,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingTop: 8,
    fontSize: 13,
    textAlignVertical: 'top',
  },
  notesText: { fontSize: 13, marginTop: 2 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText: { fontSize: 11, fontWeight: '600' },
  chipTextActive: { color: '#fff' },

  struck: { textDecorationLine: 'line-through' },

  formCard: { borderRadius: 14, padding: 12, borderWidth: 1, gap: 10 },
  formTitle: { fontSize: 14, fontWeight: '800' },

  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  ghostBtn: {
    paddingHorizontal: 16,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostBtnText: { fontWeight: '700', fontSize: 13 },
});
