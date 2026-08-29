import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Button, Card, Empty, SaveAlert, Title } from '../components/ui';
import { kindName } from '../lib/cycle';
import { fmtJ, fromIso, monthIndex, today, addMonths } from '../lib/date';
import { money, taxOf } from '../lib/pricing';
import { allRecords, recordTotal } from '../lib/select';
import { useApp } from '../store/AppContext';
import { useColors } from '../theme/useColors';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function RevenueScreen() {
  const c = useColors();
  const nav = useNavigation<Nav>();
  const { customers, settings, saveFailed } = useApp();
  const taxable = settings.taxMode === 'incl';

  const recs = useMemo(() => allRecords(customers), [customers]);
  const cur = monthIndex(today());

  const thisMonth = useMemo(
    () => recs.filter((r) => monthIndex(fromIso(r.record.date)) === cur),
    [recs, cur]
  );
  const total = thisMonth.reduce((s, r) => s + recordTotal(r.record), 0);
  const viaYen = thisMonth.filter((r) => r.record.via).reduce((s, r) => s + recordTotal(r.record), 0);
  const tax = taxOf(total, settings.taxRate, taxable);

  /** 直近6ヶ月 */
  const months = useMemo(() => {
    const out: { label: string; yen: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = addMonths(today(), -i);
      const mi = monthIndex(d);
      out.push({
        label: `${d.getMonth() + 1}月`,
        yen: recs.filter((r) => monthIndex(fromIso(r.record.date)) === mi).reduce((s, r) => s + recordTotal(r.record), 0),
      });
    }
    return out;
  }, [recs]);
  const peak = Math.max(1, ...months.map((m) => m.yen));

  /** 入金待ち */
  const unpaid = useMemo(() => recs.filter((r) => r.record.bill !== 'paid'), [recs]);
  const unpaidYen = unpaid.reduce((s, r) => s + recordTotal(r.record), 0);

  const byKind = useMemo(() => {
    const m: Record<string, number> = {};
    thisMonth.forEach((r) => { m[r.record.kind] = (m[r.record.kind] || 0) + recordTotal(r.record); });
    return Object.entries(m);
  }, [thisMonth]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.ground }} edges={['top']}>
      {saveFailed ? <SaveAlert /> : null}
      <ScrollView contentContainerStyle={st.pad}>
        <Title>売上</Title>

        <Card>
          <Text style={{ color: c.ink2, fontSize: 13 }}>今月の売上{taxable ? '（税込）' : ''}</Text>
          <Text style={[st.big, { color: c.ink }]}>{money(total)}</Text>
          <View style={st.split}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.ink2, fontSize: 12.5 }}>ご案内から生まれた売上</Text>
              <Text style={{ color: c.accentInk, fontSize: 17, fontWeight: '800' }}>{money(viaYen)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.ink2, fontSize: 12.5 }}>件数</Text>
              <Text style={{ color: c.ink, fontSize: 17, fontWeight: '800' }}>{thisMonth.length}件</Text>
            </View>
          </View>
          {taxable && (
            <Text style={{ color: c.ink2, fontSize: 13 }}>
              うち消費税（{settings.taxRate}％） {money(tax)}
            </Text>
          )}
        </Card>

        <Text style={[st.sec, { color: c.ink }]}>月別の売上（直近6ヶ月）</Text>
        <Card>
          <View style={st.chart}>
            {months.map((m) => (
              <View key={m.label} style={st.bar}>
                <View style={[st.barTrack, { backgroundColor: c.surface2 }]}>
                  <View style={{ height: `${Math.round((m.yen / peak) * 100)}%`, backgroundColor: c.accent, borderRadius: 4, minHeight: 2 }} />
                </View>
                <Text style={{ color: c.ink2, fontSize: 11 }}>{m.label}</Text>
              </View>
            ))}
          </View>
        </Card>

        {byKind.length > 0 && (
          <>
            <Text style={[st.sec, { color: c.ink }]}>お仕事の種類ごと</Text>
            <Card>
              {byKind.map(([k, yen]) => (
                <View key={k} style={st.kv}>
                  <Text style={{ color: c.ink2, fontSize: 14 }}>{kindName(k)}</Text>
                  <Text style={{ color: c.ink, fontSize: 14, fontWeight: '700' }}>{money(yen)}</Text>
                </View>
              ))}
            </Card>
          </>
        )}

        <Text style={[st.sec, { color: c.ink }]}>入金の管理</Text>
        {unpaid.length ? (
          <Card style={{ borderColor: c.overdue }}>
            <Text style={{ color: c.overdueInk, fontSize: 14, fontWeight: '800' }}>
              入金待ち {unpaid.length}件 ・ {money(unpaidYen)}
            </Text>
            {unpaid.map((r) => (
              <Pressable key={r.record.id} onPress={() => nav.navigate('CustomerDetail', { id: r.customer.id })}>
                <View style={st.kv}>
                  <Text style={{ color: c.ink2, fontSize: 13.5, flex: 1 }}>
                    {fmtJ(fromIso(r.record.date))}　{r.customer.name} 様
                  </Text>
                  <Text style={{ color: c.ink, fontSize: 13.5, fontWeight: '700' }}>{money(recordTotal(r.record))}</Text>
                </View>
              </Pressable>
            ))}
          </Card>
        ) : (
          <Empty>入金待ちのお仕事はありません。</Empty>
        )}

        <Button label="年間の売上帳を見る" variant="ghost" onPress={() => nav.navigate('Ledger')} style={{ marginTop: 12 }} />
        <Button label="設定" variant="ghost" onPress={() => nav.navigate('Settings')} style={{ marginTop: 8 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  pad: { padding: 18, gap: 10, paddingBottom: 40 },
  big: { fontSize: 34, fontWeight: '800' },
  split: { flexDirection: 'row', gap: 14, marginTop: 6 },
  sec: { fontSize: 15.5, fontWeight: '800', marginTop: 12 },
  chart: { flexDirection: 'row', gap: 8, alignItems: 'flex-end', height: 110 },
  bar: { flex: 1, alignItems: 'center', gap: 5 },
  barTrack: { width: '100%', height: 84, borderRadius: 5, justifyContent: 'flex-end', overflow: 'hidden' },
  kv: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, minHeight: 40 },
});
