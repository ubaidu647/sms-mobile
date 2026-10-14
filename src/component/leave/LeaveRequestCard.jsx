import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  LEAVE_STATUS_PILL,
  applicantMeta,
  formatLeaveRange,
  titleCase,
  ymdOf,
} from '../../utils/leave';
import { COLORS } from '../../theme/colors';

/**
 * One leave request. `actions` = [{ key, label, icon, color, onPress, busy }];
 * `showApplicant` adds the staff/student line (management list).
 */
export default function LeaveRequestCard({ req, C, showApplicant = false, actions = [] }) {
  const pill = LEAVE_STATUS_PILL[req?.status] || LEAVE_STATUS_PILL.cancelled;
  const applicant = req?.applicant;
  const meta = applicantMeta(applicant);
  const days = Number(req?.days) || 0;
  const paid = Number(req?.paidDays) || 0;
  const unpaid = Number(req?.unpaidDays) || 0;
  const isStaff = (req?.applicantType || applicant?.kind) === 'staff';
  const skipped = Array.isArray(req?.skippedDates) ? req.skippedDates.map(ymdOf) : [];
  const decidedBy = req?.decidedBy?.name;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: C.card, borderColor: C.border },
        req?.status === 'pending' && { borderLeftWidth: 4, borderLeftColor: '#f59e0b' },
      ]}
    >
      <View style={styles.top}>
        <View style={{ flex: 1, minWidth: 0 }}>
          {showApplicant && (
            <View style={styles.applicantRow}>
              <Feather
                name={applicant?.kind === 'student' ? 'user' : 'briefcase'}
                size={13}
                color={COLORS.brand}
              />
              <Text style={[styles.applicant, { color: C.text }]} numberOfLines={1}>
                {applicant?.name || '—'}
              </Text>
            </View>
          )}
          {showApplicant && !!meta && (
            <Text style={[styles.meta, { color: C.muted }]} numberOfLines={1}>
              {meta}
            </Text>
          )}
          <Text
            style={[showApplicant ? styles.typeSmall : styles.type, { color: C.text }]}
            numberOfLines={1}
          >
            {titleCase(req?.leaveType)} leave
          </Text>
        </View>
        <View style={[styles.pill, { backgroundColor: pill.bg }]}>
          <Feather name={pill.icon} size={11} color={pill.fg} />
          <Text style={[styles.pillText, { color: pill.fg }]}>{pill.label}</Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <Feather name="calendar" size={12} color={C.muted} />
        <Text style={[styles.info, { color: C.text }]}>
          {formatLeaveRange(req?.fromDate, req?.toDate)}
        </Text>
        {days > 0 && (
          <Text style={[styles.info, { color: C.muted }]}>
            · {days} working day{days === 1 ? '' : 's'}
          </Text>
        )}
      </View>

      {isStaff && req?.status === 'approved' && (paid > 0 || unpaid > 0) && (
        <View style={styles.chips}>
          {paid > 0 && (
            <View style={[styles.chip, { backgroundColor: '#dcfce7' }]}>
              <Text style={[styles.chipText, { color: '#166534' }]}>{paid} paid</Text>
            </View>
          )}
          {unpaid > 0 && (
            <View style={[styles.chip, { backgroundColor: '#fee2e2' }]}>
              <Text style={[styles.chipText, { color: '#991b1b' }]}>{unpaid} unpaid</Text>
            </View>
          )}
        </View>
      )}

      {!!req?.reason && (
        <Text style={[styles.reason, { color: C.muted }]} numberOfLines={4}>
          {req.reason}
        </Text>
      )}

      {skipped.length > 0 && (
        <Text style={[styles.note, { color: C.muted }]}>
          Not counted (already marked present): {skipped.join(', ')}
        </Text>
      )}

      {!!req?.decisionNote && (
        <View style={[styles.decision, { backgroundColor: C.bg, borderColor: C.border }]}>
          <Feather name="message-square" size={12} color={C.muted} />
          <Text style={[styles.note, { color: C.text, flex: 1 }]}>
            {decidedBy ? `${decidedBy}: ` : ''}
            {req.decisionNote}
          </Text>
        </View>
      )}

      {actions.length > 0 && (
        <View style={[styles.actions, { borderTopColor: C.border }]}>
          {actions.map((a) => (
            <Pressable
              key={a.key}
              onPress={a.onPress}
              disabled={!!a.busy}
              style={({ pressed }) => [
                styles.actionBtn,
                { borderColor: a.color || C.border },
                (pressed || a.busy) && { opacity: 0.7 },
              ]}
            >
              {a.busy ? (
                <ActivityIndicator size="small" color={a.color || C.text} />
              ) : (
                <>
                  <Feather name={a.icon} size={13} color={a.color || C.text} />
                  <Text style={[styles.actionText, { color: a.color || C.text }]}>
                    {a.label}
                  </Text>
                </>
              )}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, padding: 12, borderWidth: 1, gap: 8 },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  applicantRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  applicant: { fontSize: 14, fontWeight: '800', flexShrink: 1 },
  meta: { fontSize: 11, marginTop: 2 },
  type: { fontSize: 15, fontWeight: '800' },
  typeSmall: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  pillText: { fontSize: 11, fontWeight: '700' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  info: { fontSize: 12, fontWeight: '600' },
  chips: { flexDirection: 'row', gap: 6 },
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  chipText: { fontSize: 11, fontWeight: '700' },
  reason: { fontSize: 12 },
  note: { fontSize: 11 },
  decision: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minWidth: 84,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionText: { fontSize: 12, fontWeight: '700' },
});
