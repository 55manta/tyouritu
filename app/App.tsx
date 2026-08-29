import { StatusBar } from 'expo-status-bar';
import { useColorScheme, StyleSheet, Text, View, ScrollView } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { light, dark } from './src/theme/colors';
import { fmtMd, today, iso } from './src/lib/date';
import { dueDate, dueStatus, STATUS_LABEL, type PianoCycle } from './src/lib/cycle';
import { money, quotedFee, gapText, needsRoughTuning } from './src/lib/pricing';

/**
 * フェーズ0の足場。
 * 画面はこれから作る。いまは移植した業務ロジックが端末上で正しく動くことを、
 * 実機で確かめられる状態にしてある。
 */

const SAMPLE: (PianoCycle & { customer: string; room: string; fee: number })[] = [
  { customer: '田中 誠一', room: '防音室', fee: 18000,
    lastTunedOn: '2025-08-12', initialLast: '2025-08-12', intervalMonths: 12, nextDue: null },
  { customer: '岡田 家', room: '和室', fee: 13000,
    lastTunedOn: '2014-04-12', initialLast: '2014-04-12', intervalMonths: 12, nextDue: null },
  { customer: '伊藤 ピアノ studio', room: '第1スタジオ', fee: 20000,
    lastTunedOn: '2026-03-12', initialLast: '2026-03-12', intervalMonths: 6, nextDue: null },
];

export default function App() {
  const scheme = useColorScheme();
  const c = scheme === 'dark' ? dark : light;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.fill, { backgroundColor: c.ground }]} edges={['top', 'bottom']}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <ScrollView contentContainerStyle={styles.pad}>
          <Text style={[styles.h1, { color: c.ink }]}>調律ノート</Text>
          <Text style={[styles.sub, { color: c.ink2 }]}>
            {fmtMd(today())} ・ 移植した業務ロジックの動作確認
          </Text>

          {SAMPLE.map((p) => {
            const st = dueStatus(p);
            const tone =
              st === 'overdue' ? c.overdueInk
              : st === 'dormant' ? c.brassInk
              : st === 'next' ? c.nextInk
              : st === 'due' ? c.accentInk
              : c.calmInk;
            const toneBg =
              st === 'overdue' ? c.overdueSoft
              : st === 'dormant' ? c.brassSoft
              : st === 'next' ? c.nextSoft
              : st === 'due' ? c.accentSoft
              : c.calmSoft;
            const fee = quotedFee(p.fee, p.lastTunedOn);
            const extra = fee - p.fee;

            return (
              <View
                key={p.customer}
                style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }]}
              >
                <View style={styles.row}>
                  <Text style={[styles.name, { color: c.ink }]}>{p.customer} 様</Text>
                  <Text style={[styles.pill, { color: tone, backgroundColor: toneBg }]}>
                    {STATUS_LABEL[st]}
                  </Text>
                </View>
                <Text style={[styles.meta, { color: c.ink2 }]}>
                  {p.room} ・ 前回から {gapText(p.lastTunedOn)}
                </Text>
                <Text style={[styles.meta, { color: c.ink2 }]}>
                  次回の目安 {iso(dueDate(p))}
                </Text>
                <Text style={[styles.fee, { color: c.ink }]}>
                  {money(fee)}
                  {extra > 0 ? (
                    <Text style={[styles.metaSm, { color: c.brassInk }]}>
                      {'  '}（経過加算 {money(extra)} を含む）
                    </Text>
                  ) : null}
                </Text>
                {needsRoughTuning(p.lastTunedOn) ? (
                  <Text style={[styles.warn, { color: c.overdueInk, backgroundColor: c.overdueSoft }]}>
                    10年以上あいているため、粗調律（下準備）が必要です
                  </Text>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  pad: { padding: 20, gap: 12 },
  h1: { fontSize: 26, fontWeight: '800' },
  sub: { fontSize: 14, marginBottom: 6 },
  card: { borderWidth: 1, borderRadius: 16, padding: 15, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  name: { fontSize: 17, fontWeight: '800', flexShrink: 1 },
  pill: {
    fontSize: 12, fontWeight: '700', overflow: 'hidden',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
  },
  meta: { fontSize: 14 },
  metaSm: { fontSize: 12.5, fontWeight: '600' },
  fee: { fontSize: 20, fontWeight: '800', marginTop: 4 },
  warn: {
    fontSize: 13, lineHeight: 20, marginTop: 6,
    paddingHorizontal: 11, paddingVertical: 8, borderRadius: 10, overflow: 'hidden',
  },
});
