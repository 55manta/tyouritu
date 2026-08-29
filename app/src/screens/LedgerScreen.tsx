import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button, Card, Empty, Title } from '../components/ui';
import { fromIso, today } from '../lib/date';
import { money, taxOf } from '../lib/pricing';
import { allRecords, recordTotal } from '../lib/select';
import { useApp } from '../store/AppContext';
import { useColors } from '../theme/useColors';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Ledger'>;

/**
 * 売上帳。
 * 書き出して終わりにせず、申告に要る数字をこの中で完結させる
 * （CSVを吐いてもアプリ側で何もできないため、その方式は採らない）。
 */
export default function LedgerScreen({ navigation }: Props) {
  const c = useColors();
  const { customers, settings } = useApp();
  const taxable = settings.taxMode === 'incl';
  const [year, setYear] = useState(today().getFullYear());

  const all = useMemo(() => allRecords(customers), [customers]);
  const years = useMemo(
    () => [...new Set(all.map((r) => fromIso(r.record.date).getFullYear()))].sort((a, b) => b - a),
    [all]
  );

  const rows = useMemo(
    () => all.filter((r) => fromIso(r.record.date).getFullYear() === year)
      .sort((a, b) => a.record.date.localeCompare(b.record.date)),
    [all, year]
  );

  const total = rows.reduce((s, r) => s + recordTotal(r.record), 0);
  const tax = taxOf(total, settings.taxRate, taxable);
  const unpaid = rows.filter((r) => r.record.bill !== 'paid');
  const unpaidYen = unpaid.reduce((s, r) => s + recordTotal(r.record), 0);

  const byMonth = useMemo(() => {
    const m = new Array(12).fill(0);
    rows.forEach((r) => { m[fromIso(r.record.date).getMonth()] += recordTotal(r.record); });
    return m;
  }, [rows]);
  const peak = Math.max(1, ...byMonth);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.ground }} edges={['bottom']}>
      <ScrollView contentContainerStyle={st.pad}>
        <Title>売上帳</Title>

        <View style={st.years}>
          {(years.length ? years : [year]).map((y) => {
            const on = y === year;
            return (
              <Pressable key={y} onPress={() => setYear(y)}
                style={[st.yBtn, { backgroundColor: on ? c.accent : c.surface, borderColor: on ? c.accent : c.lineStrong }]}>
                <Text style={{ color: on ? '#FFF' : c.ink2, fontSize: 14, fontWeight: '700' }}>{y}年</Text>
              </Pressable>
            );
          })}
        </View>

        <Card>
          <Text style={{ color: c.ink2, fontSize: 13 }}>年間の売上{taxable ? '（税込）' : ''}</Text>
          <Text style={{ color: c.ink, fontSize: 30, fontWeight: '800' }}>{money(total)}</Text>
          {taxable && (
            <>
              <Text style={{ color: c.ink2, fontSize: 13.5 }}>うち消費税（{settings.taxRate}％） {money(tax)}</Text>
              <Text style={{ color: c.ink2, fontSize: 13.5 }}>税抜の売上 {money(total - tax)}</Text>
            </>
          )}
          <Text style={{ color: c.ink2, fontSize: 13.5 }}>件数 {rows.length}件</Text>
        </Card>

        {unpaid.length > 0 && (
          <Card style={{ borderColor: c.overdue }}>
            <Text style={{ color: c.overdueInk, fontSize: 14, fontWeight: '800' }}>
              未入金 {unpaid.length}件 ・ {money(unpaidYen)}
            </Text>
            {unpaid.map((r) => (
              <View key={r.record.id} style={st.kv}>
                <Text style={{ color: c.ink2, fontSize: 13.5, flex: 1 }}>{r.record.date}　{r.customer.name} 様</Text>
                <Text style={{ color: c.ink, fontSize: 13.5, fontWeight: '700' }}>{money(recordTotal(r.record))}</Text>
              </View>
            ))}
          </Card>
        )}

        <Text style={[st.sec, { color: c.ink }]}>月ごと</Text>
        <Card>
          <View style={st.chart}>
            {byMonth.map((v, i) => (
              <View key={i} style={st.bar}>
                <View style={[st.track, { backgroundColor: c.surface2 }]}>
                  <View style={{ height: `${Math.round((v / peak) * 100)}%`, backgroundColor: c.accent, borderRadius: 3, minHeight: 2 }} />
                </View>
                <Text style={{ color: c.ink2, fontSize: 10 }}>{i + 1}</Text>
              </View>
            ))}
          </View>
        </Card>

        <Text style={[st.sec, { color: c.ink }]}>明細</Text>
        {rows.length ? (
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {rows.map((r, i) => (
              <View key={r.record.id} style={[st.row, i > 0 && { borderTopWidth: 1, borderTopColor: c.line }]}>
                <Text style={{ color: c.ink2, fontSize: 12.5, width: 44 }}>
                  {fromIso(r.record.date).getMonth() + 1}/{fromIso(r.record.date).getDate()}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.ink, fontSize: 14, fontWeight: '700' }}>{r.customer.name} 様</Text>
                  <Text style={{ color: c.ink2, fontSize: 12.5 }}>
                    {r.record.work}
                    {r.record.bill !== 'paid' ? `　${r.record.bill === 'billed' ? '請求済' : '未請求'}` : ''}
                  </Text>
                </View>
                <Text style={{ color: c.ink, fontSize: 14, fontWeight: '700' }}>{money(recordTotal(r.record))}</Text>
              </View>
            ))}
            <View style={[st.row, { borderTopWidth: 1, borderTopColor: c.line, backgroundColor: c.surface2 }]}>
              <Text style={{ width: 44 }} />
              <Text style={{ color: c.ink, fontSize: 14, fontWeight: '800', flex: 1 }}>合計</Text>
              <Text style={{ color: c.ink, fontSize: 15, fontWeight: '800' }}>{money(total)}</Text>
            </View>
          </Card>
        ) : <Empty>{year}年の記録はありません。</Empty>}

        <Button label="閉じる" variant="ghost" onPress={() => navigation.goBack()} style={{ marginTop: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  pad: { padding: 18, gap: 10, paddingBottom: 48 },
  years: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  yBtn: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 15, minHeight: 44, justifyContent: 'center' },
  sec: { fontSize: 15.5, fontWeight: '800', marginTop: 10 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, minHeight: 38, alignItems: 'center' },
  chart: { flexDirection: 'row', gap: 4, alignItems: 'flex-end' },
  bar: { flex: 1, alignItems: 'center', gap: 4 },
  track: { width: '100%', height: 72, borderRadius: 4, justifyContent: 'flex-end', overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 11 },
});
