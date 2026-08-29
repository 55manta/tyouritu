import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Card, Empty, SaveAlert, Title } from '../components/ui';
import { dueDate } from '../lib/cycle';
import { fmtJ, fmtMd, fromIso, iso, today } from '../lib/date';
import { allVisits, pendingPianos, pianoName, shortAddr } from '../lib/select';
import { useApp } from '../store/AppContext';
import { useColors } from '../theme/useColors';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/**
 * 予定。
 * 三層で持つ：日時が確定 / 日付だけ確定（時間は前日に決める）/ 時期だけ（日付未定）。
 * 実際の調律師がこの三層で運用しているという裏取りに沿った構造。
 */
export default function ScheduleScreen() {
  const c = useColors();
  const nav = useNavigation<Nav>();
  const { customers, saveFailed } = useApp();
  const t = iso(today());

  const upcoming = useMemo(
    () => allVisits(customers).filter((x) => x.visit.date >= t)
      .sort((a, b) => a.visit.date.localeCompare(b.visit.date) ||
        (a.visit.time || '99:99').localeCompare(b.visit.time || '99:99')),
    [customers, t]
  );

  const confirmed = upcoming.filter((x) => x.visit.time);
  const dateOnly = upcoming.filter((x) => !x.visit.time);

  /** 時期は来ているが、まだ日付が決まっていない台 */
  const poolByMonth = useMemo(() => {
    const m: Record<string, { name: string; id: string; room: string; maker: string; date: Date }[]> = {};
    customers.forEach((cust) => {
      pendingPianos(cust).forEach((p) => {
        const d = dueDate(p);
        const key = fmtJ(d);
        (m[key] = m[key] || []).push({ name: cust.name, id: cust.id, room: p.room, maker: pianoName(p), date: d });
      });
    });
    return Object.entries(m).sort((a, b) => +a[1][0].date - +b[1][0].date);
  }, [customers]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.ground }} edges={['top']}>
      {saveFailed ? <SaveAlert /> : null}
      <ScrollView contentContainerStyle={st.pad}>
        <Title>予定</Title>

        <Text style={[st.sec, { color: c.ink }]}>日時が確定</Text>
        {confirmed.length ? confirmed.map(({ customer, visit }) => (
          <Pressable key={visit.id} onPress={() => nav.navigate('CustomerDetail', { id: customer.id })}>
            <Card style={{ marginBottom: 8 }}>
              <View style={st.row}>
                <Text style={[st.date, { color: c.accentInk }]}>{fmtMd(fromIso(visit.date))}</Text>
                <Text style={[st.time, { color: c.ink }]}>{visit.time}</Text>
              </View>
              <Text style={[st.name, { color: c.ink }]}>{customer.name} 様</Text>
              <Text style={{ color: c.ink2, fontSize: 13 }}>
                {visit.pianoIds.length}台 ・ {shortAddr(customer)}
              </Text>
            </Card>
          </Pressable>
        )) : <Empty>日時が確定した訪問はありません。</Empty>}

        <Text style={[st.sec, { color: c.ink }]}>日付だけ確定</Text>
        <Text style={{ color: c.ink2, fontSize: 13, marginBottom: 6 }}>
          時間は前日までに決められます。
        </Text>
        {dateOnly.length ? dateOnly.map(({ customer, visit }) => (
          <Pressable key={visit.id} onPress={() => nav.navigate('CustomerDetail', { id: customer.id })}>
            <Card style={{ marginBottom: 8, borderColor: c.brass }}>
              <View style={st.row}>
                <Text style={[st.date, { color: c.brassInk }]}>{fmtMd(fromIso(visit.date))}</Text>
                <Text style={{ color: c.brassInk, fontSize: 13, fontWeight: '700' }}>時間未定</Text>
              </View>
              <Text style={[st.name, { color: c.ink }]}>{customer.name} 様</Text>
              <Text style={{ color: c.ink2, fontSize: 13 }}>{shortAddr(customer)}</Text>
            </Card>
          </Pressable>
        )) : <Empty>日付だけ押さえている訪問はありません。</Empty>}

        <Text style={[st.sec, { color: c.ink }]}>時期を迎える（日付未定）</Text>
        {poolByMonth.length ? poolByMonth.map(([month, items]) => (
          <View key={month} style={{ marginBottom: 10 }}>
            <Text style={{ color: c.ink2, fontSize: 13.5, fontWeight: '700', marginBottom: 5 }}>
              {month}　{items.length}台
            </Text>
            {items.map((x, i) => (
              <Pressable key={x.id + i} onPress={() => nav.navigate('CustomerDetail', { id: x.id })}>
                <Card style={{ marginBottom: 6 }}>
                  <Text style={[st.name, { color: c.ink }]}>{x.name} 様</Text>
                  <Text style={{ color: c.ink2, fontSize: 13 }}>{x.room}　{x.maker}</Text>
                </Card>
              </Pressable>
            ))}
          </View>
        )) : <Empty>時期を迎えるピアノはありません。</Empty>}
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  pad: { padding: 18, gap: 6, paddingBottom: 40 },
  sec: { fontSize: 15.5, fontWeight: '800', marginTop: 16, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  date: { fontSize: 14.5, fontWeight: '800' },
  time: { fontSize: 19, fontWeight: '800', fontVariant: ['tabular-nums'] },
  name: { fontSize: 16.5, fontWeight: '800', marginTop: 2 },
});
