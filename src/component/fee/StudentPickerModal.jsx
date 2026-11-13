import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import KeyboardAvoidingView from '../KeyboardAvoidingView';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { fetchData } from '../../services/api';
import { useColors } from '../../theme/useColors';
import { COLORS } from '../../theme/colors';

// Pick a student, then open their consolidated arrears slip.
// Mirrors the web vouchers/consolidated/StudentPickerModal.
export default function StudentPickerModal({ open, onClose }) {
  const C = useColors();
  const router = useRouter();
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  const term = search.trim();
  const { data, isFetching } = useQuery({
    queryKey: ['student-search-consolidated', term],
    queryFn: () =>
      fetchData({
        url: '/student/list',
        page: 1,
        limit: 10,
        search: term,
        isActive: 'true',
      }),
    enabled: open && term.length >= 2,
    staleTime: 10_000,
  });
  const students = data?.data || [];

  const pick = (s) => {
    onClose?.();
    router.push(`/(app)/fees/consolidated/${s._id}`);
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
            <Text style={[styles.title, { color: C.text }]}>Consolidated Arrears Slip</Text>
            <Text style={[styles.subtitle, { color: C.muted }]}>
              Pick a student to view their outstanding vouchers as one slip
            </Text>
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

        <KeyboardAvoidingView
          style={{ flex: 1 }}
        >
          <View style={styles.body}>
            <Text style={[styles.label, { color: C.muted }]}>STUDENT *</Text>
            <View style={[styles.searchBox, { borderColor: C.border, backgroundColor: C.bg }]}>
              <Feather name="search" size={16} color={C.mutedSoft} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Type name or admission #..."
                placeholderTextColor={C.mutedSoft}
                autoCapitalize="none"
                autoFocus
                style={[styles.searchInput, { color: C.text }]}
              />
              {isFetching && <ActivityIndicator size="small" color={COLORS.brand} />}
            </View>

            {term.length < 2 ? (
              <Text style={[styles.hint, { color: C.mutedSoft }]}>
                Enter at least 2 characters to search.
              </Text>
            ) : !isFetching && students.length === 0 ? (
              <View style={styles.empty}>
                <Feather name="inbox" size={30} color={C.mutedSoft} />
                <Text style={[styles.hint, { color: C.muted }]}>No students found</Text>
              </View>
            ) : (
              <View style={styles.results}>
                {students.map((s) => (
                  <Pressable
                    key={s._id}
                    onPress={() => pick(s)}
                    style={({ pressed }) => [
                      styles.resultRow,
                      { borderColor: C.border, backgroundColor: C.bg },
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {(s.user?.name?.[0] || s.name?.[0] || '?').toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.resultName, { color: C.text }]} numberOfLines={1}>
                        {s.user?.name || s.name || 'Student'}
                      </Text>
                      <Text style={[styles.resultMeta, { color: C.muted }]} numberOfLines={1}>
                        {s.admissionNumber || '—'}
                        {s.rollNumber ? ` · Roll ${s.rollNumber}` : ''}
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={18} color={C.mutedSoft} />
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
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
  subtitle: { fontSize: 13, marginTop: 4 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },

  body: { padding: 16, gap: 10, flex: 1 },
  label: { fontSize: 10, letterSpacing: 1.1, fontWeight: '700' },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 46,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, fontSize: 15 },

  hint: { fontSize: 13, paddingHorizontal: 2, marginTop: 4 },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 10 },

  results: { gap: 8, marginTop: 4 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  resultName: { fontSize: 14, fontWeight: '700' },
  resultMeta: { fontSize: 12, marginTop: 2 },
});
