import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import KeyboardAvoidingView, { useScreenKeyboardOffset } from '../../../src/component/KeyboardAvoidingView';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useMyBranchProfile } from '../../../src/hooks/useMyBranchProfile';
import { useUserStore } from '../../../src/store/userStore';
import BranchProfileForm from '../../../src/component/BranchProfileForm';
import { COLORS } from '../../../src/theme/colors';
import { useColors } from '../../../src/theme/useColors';

export default function MyBranchProfilePage() {
  const keyboardOffset = useScreenKeyboardOffset();
  const router = useRouter();
  const { user } = useUserStore();
  const C = useColors();

  const isAdmin = !!user?.role?.isPredefined;
  const acts = user?.role?.actions || [];
  const isOrgLevel = isAdmin || acts.includes('view-all-branch-profile');
  const canViewBranches = isAdmin || acts.includes('view-branch');

  const { data, isLoading } = useMyBranchProfile();

  const profile =
    (Array.isArray(data?.data) ? data.data[0] : data?.data) || null;
  const branchName =
    (typeof profile?.branchId === 'object' && profile?.branchId?.name) ||
    user?.branch?.name ||
    user?.branchName ||
    '';

  return (
    <View style={[styles.safe, { backgroundColor: C.bg }]}>
      <View style={[styles.header, { backgroundColor: C.card, borderBottomColor: C.border }]}>
        <Pressable
          onPress={() => router.back()}
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
          {canViewBranches && (
            <Text style={[styles.titleSmall, { color: C.muted }]}>Branches /</Text>
          )}
          <View style={styles.titleRow}>
            <Feather name="home" size={18} color={COLORS.brand} />
            <Text style={[styles.title, { color: C.text }]} numberOfLines={1}>
              My Branch Profile
            </Text>
          </View>
          {!!branchName && (
            <Text style={[styles.branchSub, { color: C.muted }]} numberOfLines={1}>
              Branch:{' '}
              <Text style={{ fontWeight: '700', color: C.text }}>
                {branchName}
              </Text>
            </Text>
          )}
        </View>
        {isOrgLevel && (
          <Pressable
            onPress={() => router.push('/(app)/branches/all-profiles')}
            hitSlop={10}
            style={({ pressed }) => [styles.allBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.allBtnText}>All profiles →</Text>
          </Pressable>
        )}
      </View>

      <KeyboardAvoidingView
        keyboardVerticalOffset={keyboardOffset}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {isLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={COLORS.brand} />
              <Text style={[styles.loadingText, { color: C.muted }]}>Loading profile…</Text>
            </View>
          ) : (
            <>
              {!profile && (
                <View style={styles.warnBanner}>
                  <Feather name="alert-circle" size={16} color="#92400e" />
                  <Text style={styles.warnBannerText}>
                    No profile yet — fill the form below to create one. This is
                    what shows on printed reports, vouchers, and certificates.
                  </Text>
                </View>
              )}
              <BranchProfileForm
                initialProfile={profile}
                branchLabel={!profile && branchName ? branchName : undefined}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COLORS.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
  },
  titleSmall: { fontSize: 11, color: COLORS.muted, fontWeight: '700' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  branchSub: { fontSize: 12, color: COLORS.muted, marginTop: 2 },

  allBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  allBtnText: { color: COLORS.brand, fontWeight: '700', fontSize: 12 },

  body: { padding: 14, paddingBottom: 40, gap: 14 },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  loadingText: { color: COLORS.muted, fontSize: 13 },

  warnBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  warnBannerText: { color: '#92400e', fontSize: 13, flex: 1, lineHeight: 18 },
});
