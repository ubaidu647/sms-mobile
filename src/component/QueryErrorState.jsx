import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '../theme/useColors';
import { COLORS } from '../theme/colors';

const TITLES = {
  403: "You don't have access to this",
  404: 'Not found',
};

// Centered error state for a failed detail query — shows the server message
// instead of spinning forever on a 403/404.
export default function QueryErrorState({ error, fallback = 'Could not load this record' }) {
  const C = useColors();
  const status = error?.response?.status ?? error?.status;
  const message = error?.response?.data?.message || error?.message || fallback;
  return (
    <View style={styles.wrap} accessibilityRole="alert">
      <Feather name="alert-circle" size={32} color={COLORS.red} />
      <Text style={[styles.title, { color: C.text }]}>{TITLES[status] || fallback}</Text>
      <Text style={[styles.message, { color: C.muted }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  title: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  message: { fontSize: 13, textAlign: 'center' },
});
