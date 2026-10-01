import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

/**
 * "Showing X–Y of Z" + prev/next for server-paged reports. `total` is the full
 * row count the server matched; `truncated` means more rows exist past this page.
 */
export default function ReportPager({
  page,
  limit,
  shown,
  total,
  truncated,
  onPage,
  C,
  noun = 'rows',
}) {
  const from = shown > 0 ? (page - 1) * limit + 1 : 0;
  const to = (page - 1) * limit + shown;
  const totalCount = typeof total === 'number' ? total : to;
  const pageCount = Math.max(1, Math.ceil(totalCount / Math.max(1, limit)));
  const hasPrev = page > 1;
  const hasNext = !!truncated || page < pageCount;
  if (!hasPrev && !hasNext && !truncated) {
    return (
      <Text style={[styles.summary, { color: C.muted }]}>
        Showing all {totalCount} {noun}
      </Text>
    );
  }
  return (
    <View style={{ gap: 6 }}>
      <Text style={[styles.summary, { color: C.muted }]}>
        Showing {from}–{to} of {totalCount} {noun}
      </Text>
      {!!truncated && (
        <View style={[styles.notice, { borderColor: '#f59e0b55', backgroundColor: '#f59e0b14' }]}>
          <Feather name="alert-triangle" size={12} color="#b45309" />
          <Text style={styles.noticeText}>
            This page doesn't hold every row — use Next to see the rest. Totals cover all{' '}
            {totalCount}.
          </Text>
        </View>
      )}
      <View style={styles.row}>
        <Pressable
          disabled={!hasPrev}
          onPress={() => onPage(page - 1)}
          style={({ pressed }) => [
            styles.btn,
            { backgroundColor: C.card, borderColor: C.border },
            !hasPrev && { opacity: 0.4 },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Feather name="chevron-left" size={14} color={C.text} />
          <Text style={[styles.btnText, { color: C.text }]}>Prev</Text>
        </Pressable>
        <Text style={[styles.pageText, { color: C.muted }]}>
          Page {page} of {pageCount}
        </Text>
        <Pressable
          disabled={!hasNext}
          onPress={() => onPage(page + 1)}
          style={({ pressed }) => [
            styles.btn,
            { backgroundColor: C.card, borderColor: C.border },
            !hasNext && { opacity: 0.4 },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Text style={[styles.btnText, { color: C.text }]}>Next</Text>
          <Feather name="chevron-right" size={14} color={C.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { fontSize: 11, fontWeight: '600' },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  noticeText: { flex: 1, fontSize: 11, color: '#b45309' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
  },
  btnText: { fontSize: 12, fontWeight: '700' },
  pageText: { fontSize: 12, fontWeight: '600', color: COLORS.muted },
});
