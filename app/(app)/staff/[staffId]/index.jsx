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
  useStaffDetail,
  useToggleStaffStatus,
  useDeleteStaff,
} from '../../../../src/hooks/useStaff';
import { useUserStore } from '../../../../src/store/userStore';
import { useColors } from '../../../../src/theme/useColors';
import { COLORS } from '../../../../src/theme/colors';
import {
  STAFF_TYPE_PILL,
  EMPLOYMENT_PILL,
  STATUS_PILL,
  titleCase,
  fmtDate,
} from '../../../../src/constants/staff';
import {
  resolveScope,
  hasAnyAction,
} from '../../../../src/utils/permissions';
import EditStaffModal from '../../../../src/component/EditStaffModal';
import { useSchoolCurrency } from '../../../../src/hooks/useSchoolCurrency';
import { formatMoney } from '../../../../src/utils/money';

function InfoRow({ icon, label, value, sub, fallback = '—' }) {
  const C = useColors();
  return (
    <View style={[styles.infoRow, { backgroundColor: C.bg, borderColor: C.border }]}>
      <View style={[styles.infoIcon, { backgroundColor: C.card, borderColor: C.border }]}>
        <Feather name={icon} size={14} color={COLORS.brand} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.infoLabel, { color: C.muted }]}>{label.toUpperCase()}</Text>
        <Text style={[styles.infoValue, { color: C.text }]}>{value || fallback}</Text>
        {!!sub && <Text style={[styles.infoSub, { color: C.muted }]}>{sub}</Text>}
      </View>
    </View>
  );
}

function Pill({ value, bg, fg, label }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillText, { color: fg }]}>{label || value}</Text>
    </View>
  );
}

export default function StaffDetailPage() {
  const { symbol: currencySymbol } = useSchoolCurrency();
  const router = useRouter();
  const { staffId } = useLocalSearchParams();
  const C = useColors();
  const { user } = useUserStore();

  const { data, isLoading, error } = useStaffDetail(staffId);
  const staff = data?.data;

  const isSelf =
    !!user?.staffId && String(user.staffId) === String(staffId);

  const canUpdate =
    resolveScope(user?.role, 'update-staff') !== 'none' || isSelf;
  const canDelete =
    !isSelf &&
    hasAnyAction(user?.role, ['delete-staff', 'delete-all-branch-staff']);

  const [editOpen, setEditOpen] = useState(false);

  const toggle = useToggleStaffStatus();
  const del = useDeleteStaff({ onSuccess: () => router.back() });

  const onToggle = () => {
    Alert.alert(
      staff?.isActive ? 'Block Staff' : 'Unblock Staff',
      `Are you sure you want to ${staff?.isActive ? 'block' : 'unblock'} ${staff?.user?.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => toggle.mutate(staffId) },
      ],
    );
  };

  const onDelete = () => {
    Alert.alert(
      'Delete Staff',
      `Permanently delete ${staff?.user?.name}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => del.mutate(staffId),
        },
      ],
    );
  };

  if (isLoading && !staff) {
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
  if (!staff) {
    const msg =
      error?.response?.data?.message || error?.message || 'Staff not found';
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

  const u = staff.user || {};
  const initial = (u.name?.[0] || '?').toUpperCase();
  const statusEntry = staff.isActive ? STATUS_PILL.active : STATUS_PILL.blocked;
  const typeEntry = STAFF_TYPE_PILL[staff.staffType];

  return (
    <View style={[styles.safe, { backgroundColor: C.bg }]}>
      <Header onBack={() => router.back()} C={C} />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={[styles.identityCard, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={styles.identityTop}>
            {staff.photo ? (
              <Image source={{ uri: staff.photo }} style={styles.bigAvatar} />
            ) : (
              <View style={styles.bigAvatarFallback}>
                <Text style={styles.bigAvatarText}>{initial}</Text>
              </View>
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.name, { color: C.text }]} numberOfLines={2}>
                {u.name || '—'}
              </Text>
              <Text style={[styles.designation, { color: C.muted }]} numberOfLines={1}>
                {staff.designation || '—'}
              </Text>
              {!!staff.serialNumber && (
                <Text style={[styles.serial, { color: C.mutedSoft }]}>
                  Serial: {staff.serialNumber}
                </Text>
              )}
              {!!u.email && (
                <Text style={[styles.serial, { color: C.mutedSoft }]} numberOfLines={1}>
                  {u.email}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.pillRow}>
            <Pill {...statusEntry} value="status" />
            {typeEntry && <Pill {...typeEntry} label={titleCase(staff.staffType)} value="type" />}
            {!!staff.employmentType && (
              <Pill
                bg={EMPLOYMENT_PILL.bg}
                fg={EMPLOYMENT_PILL.fg}
                label={titleCase(staff.employmentType)}
                value="employment"
              />
            )}
            {!!staff.role?.name && (
              <Pill
                bg={C.border}
                fg={C.text}
                label={staff.role.name}
                value="role"
              />
            )}
          </View>

          {(canUpdate || canDelete) && (
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
                  <Text style={styles.actBtnPrimaryText}>
                    {isSelf ? 'Edit Profile' : 'Edit'}
                  </Text>
                </Pressable>
              )}
              {canDelete && (
                <>
                  <Pressable
                    onPress={onToggle}
                    disabled={toggle.isPending}
                    style={({ pressed }) => [
                      styles.actBtn,
                      { backgroundColor: staff.isActive ? '#f59e0b' : '#10b981' },
                      pressed && { opacity: 0.9 },
                    ]}
                  >
                    {toggle.isPending ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Feather
                          name={staff.isActive ? 'slash' : 'check-circle'}
                          size={14}
                          color="#fff"
                        />
                        <Text style={styles.actBtnPrimaryText}>
                          {staff.isActive ? 'Block' : 'Unblock'}
                        </Text>
                      </>
                    )}
                  </Pressable>
                  <Pressable
                    onPress={onDelete}
                    disabled={del.isPending}
                    style={({ pressed }) => [
                      styles.actBtn,
                      { backgroundColor: '#ef4444' },
                      pressed && { opacity: 0.9 },
                    ]}
                  >
                    {del.isPending ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Feather name="trash-2" size={14} color="#fff" />
                        <Text style={styles.actBtnPrimaryText}>Delete</Text>
                      </>
                    )}
                  </Pressable>
                </>
              )}
            </View>
          )}
        </View>

        <Section title="Employment" C={C}>
          <InfoRow icon="briefcase" label="Role" value={staff.role?.name} />
          <InfoRow icon="git-branch" label="Branch" value={staff.branch?.name} />
          <InfoRow icon="award" label="Qualification" value={staff.qualification} />
          <InfoRow
            icon="clock"
            label="Experience"
            value={staff.experienceYears ? `${staff.experienceYears} yrs` : null}
          />
          <InfoRow
            icon="dollar-sign"
            label="Salary"
            value={staff.salary ? formatMoney(staff.salary, currencySymbol) : null}
          />
          <InfoRow icon="calendar" label="Joining Date" value={fmtDate(staff.joiningDate)} />
          {!!staff.leavingDate && (
            <InfoRow icon="calendar" label="Leaving Date" value={fmtDate(staff.leavingDate)} />
          )}
          {!!staff.leavingReason && (
            <InfoRow icon="message-square" label="Leaving Reason" value={staff.leavingReason} />
          )}
        </Section>

        <Section title="Personal" C={C}>
          <InfoRow icon="user" label="Gender" value={titleCase(staff.gender)} />
          <InfoRow icon="calendar" label="Date of Birth" value={fmtDate(staff.dob)} />
          <InfoRow icon="credit-card" label="CNIC" value={staff.cnic} />
          <InfoRow icon="heart" label="Blood Group" value={staff.bloodGroup} />
          <InfoRow icon="user" label="Marital Status" value={titleCase(staff.maritalStatus)} />
          <InfoRow icon="phone" label="Phone" value={staff.phone} />
          <InfoRow icon="hash" label="User Serial" value={u.serialNumber} />
          <InfoRow icon="calendar" label="Created" value={fmtDate(staff.createdAt)} />
        </Section>

        {(staff.address?.street || staff.address?.city || staff.address?.state) && (
          <Section title="Address" C={C}>
            {!!staff.address?.street && (
              <InfoRow icon="map-pin" label="Street" value={staff.address.street} />
            )}
            {!!staff.address?.city && (
              <InfoRow icon="map" label="City" value={staff.address.city} />
            )}
            {!!staff.address?.state && (
              <InfoRow icon="map" label="State" value={staff.address.state} />
            )}
          </Section>
        )}

        {(staff.emergencyContact?.name ||
          staff.emergencyContact?.phone ||
          staff.emergencyContact?.relation) && (
          <Section title="Emergency Contact" C={C}>
            {!!staff.emergencyContact?.name && (
              <InfoRow icon="user" label="Name" value={staff.emergencyContact.name} />
            )}
            {!!staff.emergencyContact?.phone && (
              <InfoRow icon="phone" label="Phone" value={staff.emergencyContact.phone} />
            )}
            {!!staff.emergencyContact?.relation && (
              <InfoRow
                icon="users"
                label="Relation"
                value={staff.emergencyContact.relation}
              />
            )}
          </Section>
        )}
      </ScrollView>

      <EditStaffModal
        open={editOpen}
        staff={staff}
        isSelf={isSelf}
        onClose={() => setEditOpen(false)}
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
        <Text style={[styles.headerKicker, { color: C.muted }]}>Staff /</Text>
        <Text style={[styles.headerTitle, { color: C.text }]} numberOfLines={1}>
          Staff Details
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
  designation: { fontSize: 13, marginTop: 2 },
  serial: { fontSize: 11, marginTop: 2 },

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
  actBtnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 13 },

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
  infoSub: { fontSize: 11, marginTop: 2 },

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
