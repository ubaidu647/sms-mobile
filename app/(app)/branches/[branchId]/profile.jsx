import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import KeyboardAvoidingView, { useScreenKeyboardOffset } from '../../../../src/component/KeyboardAvoidingView';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useBranch } from '../../../../src/hooks/useBranch';
import { useBranchProfile } from '../../../../src/hooks/useBranchProfile';
import BranchProfileForm from '../../../../src/component/BranchProfileForm';
import { COLORS } from '../../../../src/theme/colors';
import { useColors } from '../../../../src/theme/useColors';

export default function BranchProfileEditPage() {
  const keyboardOffset = useScreenKeyboardOffset();
  const router = useRouter();
  const { branchId } = useLocalSearchParams();
  const C = useColors();

  const { data: branchData } = useBranch(branchId);
  const branch = branchData?.data || null;

  const { data: profileData, isLoading: profileLoading } =
    useBranchProfile(branchId);
  const profile = profileData?.data || null;

  const branchName =
    branch?.name ||
    (typeof profile?.branchId === 'object' ? profile?.branchId?.name : '') ||
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
          <Text style={[styles.titleSmall, { color: C.muted }]}>Branches / Profile</Text>
          <Text style={[styles.title, { color: C.text }]} numberOfLines={1}>
            Branch Profile
          </Text>
        </View>
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
          {profileLoading && !profile ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={COLORS.brand} />
            </View>
          ) : (
            <>
              {!profile && (
                <View style={styles.warnBanner}>
                  <Feather name="alert-circle" size={16} color="#92400e" />
                  <Text style={styles.warnBannerText}>
                    No profile yet — fill the form to create one.
                  </Text>
                </View>
              )}
              <BranchProfileForm
                initialProfile={profile}
                branchId={branchId}
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
  title: { fontSize: 17, fontWeight: '800', color: COLORS.text },

  body: { padding: 14, paddingBottom: 40, gap: 14 },

  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 32 },

  warnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  warnBannerText: { color: '#92400e', fontSize: 13, flex: 1 },
});
