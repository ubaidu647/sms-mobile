import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import {
  useStudentDetail,
  useToggleStudentStatus,
} from '../../../../src/hooks/useStudents';
import { useUserStore } from '../../../../src/store/userStore';
import { useColors } from '../../../../src/theme/useColors';
import { COLORS } from '../../../../src/theme/colors';
import {
  ACADEMIC_STATUS_PILL,
  STATUS_PILL,
  titleCase,
  fmtDate,
} from '../../../../src/constants/students';
import {
  resolveScope,
  hasAnyAction,
} from '../../../../src/utils/permissions';
import EditStudentModal from '../../../../src/component/EditStudentModal';
import TransferStudentModal from '../../../../src/component/TransferStudentModal';
import { useSchoolCurrency } from '../../../../src/hooks/useSchoolCurrency';
import { formatMoney } from '../../../../src/utils/money';

function InfoRow({ icon, label, value, fallback = '—' }) {
  const C = useColors();
  return (
    <View style={[styles.infoRow, { backgroundColor: C.bg, borderColor: C.border }]}>
      <View style={[styles.infoIcon, { backgroundColor: C.card, borderColor: C.border }]}>
        <Feather name={icon} size={14} color={COLORS.brand} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.infoLabel, { color: C.muted }]}>
          {label.toUpperCase()}
        </Text>
        <Text style={[styles.infoValue, { color: C.text }]}>{value || fallback}</Text>
      </View>
    </View>
  );
}

function Pill({ bg, fg, label }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export default function StudentDetailPage() {
  const { symbol: currencySymbol } = useSchoolCurrency();
  const router = useRouter();
  const { studentId } = useLocalSearchParams();
  const C = useColors();
  const { user } = useUserStore();

  const { data, isLoading, error } = useStudentDetail(studentId);
  const s = data?.data;

  const isSelf =
    !!user?.studentId && String(user.studentId) === String(studentId);
  const canUpdate =
    resolveScope(user?.role, 'update-student') !== 'none' || isSelf;
  const canTransfer =
    !isSelf &&
    hasAnyAction(user?.role, ['update-student', 'update-all-branch-student']);
  const canDelete =
    !isSelf &&
    hasAnyAction(user?.role, ['delete-student', 'delete-all-branch-student']);

  const [editOpen, setEditOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const toggle = useToggleStudentStatus();

  const onToggle = () => {
    Alert.alert(
      s?.isActive ? 'Block Student' : 'Unblock Student',
      `Are you sure you want to ${s?.isActive ? 'block' : 'unblock'} ${s?.user?.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => toggle.mutate(studentId) },
      ],
    );
  };

  if (isLoading && !s) {
    return (
      <View style={[styles.safe, { backgroundColor: C.bg }]}>
        <Header onBack={() => router.back()} C={C} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.brand} />
        </View>
      </View>
    );
  }

  // Only with nothing to show: a refetch that fails over a loaded record (opening
  // Edit refetches it) must not replace this screen, and the modal on it.
  if (!s) {
    const msg =
      error?.response?.data?.message || error?.message || 'Student not found';
    return (
      <View style={[styles.safe, { backgroundColor: C.bg }]}>
        <Header onBack={() => router.back()} C={C} />
        <View style={styles.errorBox}>
          <Feather name="alert-circle" size={18} color="#b91c1c" />
          <Text style={styles.errorText}>{msg}</Text>
        </View>
      </View>
    );
  }

  const u = s.user || {};
  const initial = (u.name?.[0] || '?').toUpperCase();
  const statusEntry = s.isActive ? STATUS_PILL.active : STATUS_PILL.blocked;
  const acaEntry =
    ACADEMIC_STATUS_PILL[s.academicStatus] || {
      bg: C.border,
      fg: C.text,
    };

  return (
    <View style={[styles.safe, { backgroundColor: C.bg }]}>
      <Header onBack={() => router.back()} C={C} />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={[styles.identityCard, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={styles.identityTop}>
            {s.photo ? (
              <Image source={{ uri: s.photo }} style={styles.bigAvatar} />
            ) : (
              <View style={styles.bigAvatarFallback}>
                <Text style={styles.bigAvatarText}>{initial}</Text>
              </View>
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.name, { color: C.text }]} numberOfLines={2}>
                {u.name || '—'}
              </Text>
              <Text style={[styles.line, { color: C.muted }]} numberOfLines={1}>
                {s.class?.name || '—'}
                {s.section?.name ? ` · ${s.section.name}` : ''}
                {s.academicYear ? ` · ${s.academicYear}` : ''}
              </Text>
              {!!s.admissionNumber && (
                <Text style={[styles.line, { color: C.mutedSoft }]}>
                  Adm: {s.admissionNumber}
                  {s.rollNumber ? ` · Roll: ${s.rollNumber}` : ''}
                </Text>
              )}
              {!!u.email && (
                <Text style={[styles.line, { color: C.mutedSoft }]} numberOfLines={1}>
                  {u.email}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.pillRow}>
            <Pill {...statusEntry} />
            <Pill
              bg={acaEntry.bg}
              fg={acaEntry.fg}
              label={titleCase(s.academicStatus)}
            />
            {!!s.admissionType && (
              <Pill
                bg="#dbeafe"
                fg="#1d4ed8"
                label={titleCase(s.admissionType)}
              />
            )}
            {!!s.branch?.name && (
              <Pill bg={C.border} fg={C.text} label={s.branch.name} />
            )}
          </View>

          {(canUpdate || canTransfer || canDelete) && (
            <View style={styles.actionRow}>
              {canUpdate && (
                <Pressable
                  onPress={() => setEditOpen(true)}
                  style={({ pressed }) => [
                    styles.actBtn,
                    styles.actBtnPrimary,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <Feather name="edit-2" size={14} color="#fff" />
                  <Text style={styles.actBtnText}>
                    {isSelf ? 'Edit My Info' : 'Edit'}
                  </Text>
                </Pressable>
              )}
              {canTransfer && (
                <Pressable
                  onPress={() => setTransferOpen(true)}
                  style={({ pressed }) => [
                    styles.actBtn,
                    { backgroundColor: '#0ea5e9' },
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <Feather name="repeat" size={14} color="#fff" />
                  <Text style={styles.actBtnText}>Transfer</Text>
                </Pressable>
              )}
              {canDelete && (
                <Pressable
                  onPress={onToggle}
                  disabled={toggle.isPending}
                  style={({ pressed }) => [
                    styles.actBtn,
                    { backgroundColor: s.isActive ? '#f59e0b' : '#10b981' },
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  {toggle.isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Feather
                        name={s.isActive ? 'slash' : 'check-circle'}
                        size={14}
                        color="#fff"
                      />
                      <Text style={styles.actBtnText}>
                        {s.isActive ? 'Block' : 'Unblock'}
                      </Text>
                    </>
                  )}
                </Pressable>
              )}
            </View>
          )}
        </View>

        <Section title="Enrollment" C={C}>
          <InfoRow icon="layers" label="Class" value={s.class?.name} />
          <InfoRow icon="hash" label="Section" value={s.section?.name} />
          <InfoRow icon="calendar" label="Academic Year" value={s.academicYear} />
          <InfoRow icon="git-branch" label="Branch" value={s.branch?.name} />
          <InfoRow
            icon="calendar"
            label="Admission Date"
            value={fmtDate(s.admissionDate)}
          />
          <InfoRow
            icon="file-text"
            label="Admission Type"
            value={titleCase(s.admissionType)}
          />
          <InfoRow icon="hash" label="Admission No." value={s.admissionNumber} />
          <InfoRow icon="hash" label="Roll No." value={s.rollNumber} />
        </Section>

        <Section title="Personal" C={C}>
          <InfoRow icon="calendar" label="Date of Birth" value={fmtDate(s.dob)} />
          <InfoRow icon="user" label="Gender" value={titleCase(s.gender)} />
          <InfoRow icon="heart" label="Blood Group" value={s.bloodGroup} />
          <InfoRow icon="flag" label="Nationality" value={s.nationality} />
          <InfoRow icon="book" label="Religion" value={s.religion} />
          <InfoRow icon="credit-card" label="B-Form" value={s.bForm} />
          <InfoRow icon="map-pin" label="Place of Birth" value={s.placeOfBirth} />
          <InfoRow icon="phone" label="Phone" value={s.phone} />
        </Section>

        {!!s.father && (
          <Section title="Father" C={C}>
            <InfoRow icon="user" label="Name" value={s.father.name} />
            <InfoRow icon="credit-card" label="CNIC" value={s.father.cnic} />
            <InfoRow icon="phone" label="Phone" value={s.father.phone} />
            <InfoRow icon="mail" label="Email" value={s.father.email} />
            <InfoRow icon="briefcase" label="Occupation" value={s.father.occupation} />
            <InfoRow
              icon="dollar-sign"
              label="Monthly Income"
              value={s.father.monthlyIncome ? formatMoney(s.father.monthlyIncome, currencySymbol) : null}
            />
          </Section>
        )}

        {!!s.mother && (
          <Section title="Mother" C={C}>
            <InfoRow icon="user" label="Name" value={s.mother.name} />
            <InfoRow icon="credit-card" label="CNIC" value={s.mother.cnic} />
            <InfoRow icon="phone" label="Phone" value={s.mother.phone} />
            <InfoRow icon="briefcase" label="Occupation" value={s.mother.occupation} />
          </Section>
        )}

        {!!s.guardian && (
          <Section title="Guardian" C={C}>
            <InfoRow icon="user" label="Name" value={s.guardian.name} />
            <InfoRow icon="users" label="Relation" value={s.guardian.relation} />
            <InfoRow icon="phone" label="Phone" value={s.guardian.phone} />
            <InfoRow icon="credit-card" label="CNIC" value={s.guardian.cnic} />
          </Section>
        )}

        {!!s.emergencyContact && (
          <Section title="Emergency Contact" C={C}>
            <InfoRow icon="user" label="Name" value={s.emergencyContact.name} />
            <InfoRow icon="phone" label="Phone" value={s.emergencyContact.phone} />
            <InfoRow icon="users" label="Relation" value={s.emergencyContact.relation} />
          </Section>
        )}

        {(s.address?.street ||
          s.address?.city ||
          s.address?.state ||
          s.address?.postalCode ||
          s.address?.country) && (
          <Section title="Address" C={C}>
            {!!s.address.street && (
              <InfoRow icon="map-pin" label="Street" value={s.address.street} />
            )}
            {!!s.address.city && (
              <InfoRow icon="map" label="City" value={s.address.city} />
            )}
            {!!s.address.state && (
              <InfoRow icon="map" label="State" value={s.address.state} />
            )}
            {!!s.address.postalCode && (
              <InfoRow icon="hash" label="Postal Code" value={s.address.postalCode} />
            )}
            {!!s.address.country && (
              <InfoRow icon="flag" label="Country" value={s.address.country} />
            )}
          </Section>
        )}

        {!!s.previousSchool?.name && (
          <Section title="Previous School" C={C}>
            <InfoRow icon="home" label="School" value={s.previousSchool.name} />
            <InfoRow icon="layers" label="Last Class" value={s.previousSchool.lastClass} />
            <InfoRow
              icon="message-square"
              label="Reason for Leaving"
              value={s.previousSchool.reasonForLeaving}
            />
          </Section>
        )}

        {(s.feeDiscount > 0 || s.feeWaiver || s.feeNotes) && (
          <Section title="Fees" C={C}>
            <InfoRow
              icon="percent"
              label="Discount"
              value={s.feeDiscount != null ? `${s.feeDiscount}%` : null}
            />
            <InfoRow
              icon="dollar-sign"
              label="Waiver"
              value={s.feeWaiver ? 'Yes' : 'No'}
            />
            <InfoRow icon="file-text" label="Notes" value={s.feeNotes} />
          </Section>
        )}
      </ScrollView>

      <EditStudentModal
        open={editOpen}
        student={s}
        onClose={() => setEditOpen(false)}
      />
      <TransferStudentModal
        open={transferOpen}
        student={s}
        onClose={() => setTransferOpen(false)}
      />
    </View>
  );
}

function Section({ title, children, C }) {
  return (
    <View style={[styles.section, { backgroundColor: C.card, borderColor: C.border }]}>
      <Text style={[styles.sectionTitle, { color: C.text }]}>{title}</Text>
      <View style={{ gap: 10 }}>{children}</View>
    </View>
  );
}

function Header({ onBack, C }) {
  return (
    <View style={[styles.header, { backgroundColor: C.card, borderBottomColor: C.border }]}>
      <Pressable
        onPress={onBack}
        hitSlop={10}
        style={({ pressed }) => [
          styles.backBtn,
          { backgroundColor: C.bg },
          pressed && { opacity: 0.6 },
        ]}
      >
        <Feather name="arrow-left" size={20} color={C.text} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={[styles.headerKicker, { color: C.muted }]}>Students /</Text>
        <Text style={[styles.headerTitle, { color: C.text }]} numberOfLines={1}>
          Student Details
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerKicker: { fontSize: 11, fontWeight: '700' },
  headerTitle: { fontSize: 17, fontWeight: '800' },

  body: { padding: 14, paddingBottom: 32, gap: 14 },

  identityCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 14 },
  identityTop: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  bigAvatar: { width: 72, height: 72, borderRadius: 16, backgroundColor: '#e5e7eb' },
  bigAvatarFallback: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigAvatarText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  name: { fontSize: 19, fontWeight: '800' },
  line: { fontSize: 12, marginTop: 2 },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillText: { fontSize: 11, fontWeight: '700' },

  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actBtn: {
    flexGrow: 1,
    flexBasis: '30%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  actBtnPrimary: { backgroundColor: COLORS.brand },
  actBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  section: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800' },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
  },
  infoIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: { fontSize: 10, letterSpacing: 1.5, fontWeight: '700' },
  infoValue: { fontSize: 14, fontWeight: '700', marginTop: 2 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    margin: 16,
  },
  errorText: { color: '#b91c1c', fontSize: 13, flex: 1 },
});
