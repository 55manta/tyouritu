import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Card, Empty, SaveAlert, Title } from '../components/ui';
import { iso, today } from '../lib/date';
import { matches, pendingPianos, pianoName, shortAddr, todaysVisits } from '../lib/select';
import { useApp } from '../store/AppContext';
import { MIN_TAP, useColors } from '../theme/useColors';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/**
 * 記録するピアノを選ぶ。
 * 現場では「今日の訪問先」から1タップで入れるのが本筋なので、候補を先に出す。
 */
export default function RecordPickScreen() {
  const c = useColors();
  const nav = useNavigation<Nav>();
  const { customers, saveFailed } = useApp();
  const [q, setQ] = useState('');

  const todays = useMemo(() => todaysVisits(customers), [customers]);

  const candidates = useMemo(() => {
    const out: { cid: string; pid: string; name: string; room: string; model: string; why: string }[] = [];
    const seen = new Set<string>();
    // 今日の訪問が最優先
    todays.forEach(({ customer, visit }) => {
      visit.pianoIds.forEach((pid) => {
        const p = customer.pianos.find((x) => x.id === pid);
        if (!p || seen.has(pid)) return;
        seen.add(pid);
        out.push({ cid: customer.id, pid, name: customer.name, room: p.room, model: pianoName(p), why: '今日の訪問' });
      });
    });
    // 次に、時期を迎えている台
    customers.forEach((cust) => {
      pendingPianos(cust).forEach((p) => {
        if (seen.has(p.id)) return;
        seen.add(p.id);
        out.push({ cid: cust.id, pid: p.id, name: cust.name, room: p.room, model: pianoName(p), why: 'ご案内の時期' });
      });
    });
    return out;
  }, [customers, todays]);

  const searched = useMemo(() => {
    if (!q.trim()) return [];
    return customers.filter((x) => matches(x, q)).flatMap((cust) =>
      cust.pianos.map((p) => ({
        cid: cust.id, pid: p.id, name: cust.name, room: p.room, model: pianoName(p),
        why: shortAddr(cust),
      }))
    );
  }, [customers, q]);

  const list = q.trim() ? searched : candidates;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.ground }} edges={['top']}>
      {saveFailed ? <SaveAlert /> : null}
      <ScrollView contentContainerStyle={st.pad} keyboardShouldPersistTaps="handled">
        <Title>記録</Title>
        <Text style={{ color: c.ink2, fontSize: 14 }}>どのピアノを記録しますか</Text>

        <TextInput
          value={q} onChangeText={setQ}
          placeholder="お名前・ご住所・機種で探す"
          placeholderTextColor={c.ink3}
          style={[st.search, { backgroundColor: c.surface, borderColor: c.line, color: c.ink }]}
        />

        {list.length ? list.map((x) => (
          <Pressable key={x.pid} onPress={() => nav.navigate('RecordForm', { customerId: x.cid, pianoId: x.pid })}>
            <Card style={{ marginBottom: 9 }}>
              <Text style={{ color: c.ink, fontSize: 16.5, fontWeight: '800' }}>{x.name} 様</Text>
              <Text style={{ color: c.ink2, fontSize: 13.5 }}>{x.room}　{x.model}</Text>
              <Text style={{ color: c.accentInk, fontSize: 12.5, fontWeight: '700' }}>{x.why}</Text>
            </Card>
          </Pressable>
        )) : (
          <Empty>
            {q.trim() ? `「${q}」に該当するピアノがありません。` : '今日の訪問も、時期を迎えたピアノもありません。上の欄から探せます。'}
          </Empty>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  pad: { padding: 18, gap: 10, paddingBottom: 40 },
  search: { borderWidth: 1, borderRadius: 13, paddingHorizontal: 14, minHeight: MIN_TAP + 4, fontSize: 16, marginBottom: 6 },
});
