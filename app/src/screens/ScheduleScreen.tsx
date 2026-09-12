import React, { useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Button, Card, Empty, SaveAlert, Title } from '../components/ui';
import { SendSheet } from '../components/SendSheet';
import { dueDate } from '../lib/cycle';
import { addMonths, fmtJ, fmtMd, fromIso, iso, sameYMD, today } from '../lib/date';
import { prepMessage } from '../lib/messages';
import { allVisits, fullAddr, isSkipped, pendingPianos, pianoName, shortAddr, type VisitOf } from '../lib/select';
import type { Customer } from '../types';
import { useApp } from '../store/AppContext';
import { useColors } from '../theme/useColors';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function openMap(customer: Customer) {
  Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(fullAddr(customer))}`);
}

const WD = ['日', '月', '火', '水', '木', '金', '土'];

/**
 * 予定。
 * 三層で持つ：日時が確定 / 日付だけ確定（時間は前日に決める）/ 時期だけ（日付未定）。
 * 実際の調律師がこの三層で運用しているという裏取りに沿った構造。
 * 表示は「リスト」（三層をそのまま並べる）と「カレンダー」（月表示から日を選ぶ）を切り替えられる。
 */
export default function ScheduleScreen() {
  const c = useColors();
  const nav = useNavigation<Nav>();
  const { customers, settings, saveFailed, updateVisit } = useApp();
  const t = iso(today());
  const [sView, setSView] = useState<'list' | 'cal'>('list');
  const [prepId, setPrepId] = useState<string | null>(null);

  const upcoming = useMemo(
    () => allVisits(customers).filter((x) => x.visit.date >= t)
      .sort((a, b) => a.visit.date.localeCompare(b.visit.date) ||
        (a.visit.time || '99:99').localeCompare(b.visit.time || '99:99')),
    [customers, t]
  );

  const confirmed = upcoming.filter((x) => x.visit.time);
  const dateOnly = upcoming.filter((x) => !x.visit.time);

  const prep = useMemo(
    () => upcoming.find((x) => x.visit.id === prepId) ?? null,
    [upcoming, prepId]
  );

  const onSend = (visit: VisitOf) => setPrepId(visit.visit.id);

  /** 時期は来ているが、まだ日付が決まっていない台。見送った台はここに出さない */
  const poolByMonth = useMemo(() => {
    const m: Record<string, { name: string; id: string; room: string; maker: string; date: Date }[]> = {};
    customers.forEach((cust) => {
      const pend = pendingPianos(cust);
      if (isSkipped(pend)) return;
      pend.forEach((p) => {
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

        <View style={st.chips}>
          {(['list', 'cal'] as const).map((v) => {
            const on = sView === v;
            return (
              <Pressable
                key={v}
                onPress={() => setSView(v)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={[st.chip, { backgroundColor: on ? c.accent : c.surface, borderColor: on ? c.accent : c.lineStrong }]}
              >
                <Text style={{ color: on ? c.onAccent : c.ink, fontSize: 14, fontWeight: '700' }}>
                  {v === 'list' ? 'リスト' : 'カレンダー'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {sView === 'list' ? (
          <>
            <Text style={[st.sec, { color: c.ink }]}>日時が確定</Text>
            {confirmed.length ? confirmed.map((x) => (
              <VisitCard key={x.visit.id} x={x} onOpen={() => nav.navigate('CustomerDetail', { id: x.customer.id })} onSend={() => onSend(x)} />
            )) : <Empty>日時が確定した訪問はありません。</Empty>}

            <Text style={[st.sec, { color: c.ink }]}>日付だけ確定</Text>
            <Text style={{ color: c.ink2, fontSize: 13, marginBottom: 6 }}>
              時間は前日までに決められます。
            </Text>
            {dateOnly.length ? dateOnly.map((x) => (
              <VisitCard key={x.visit.id} x={x} onOpen={() => nav.navigate('CustomerDetail', { id: x.customer.id })} onSend={() => onSend(x)} />
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
          </>
        ) : (
          <CalendarView
            customers={customers}
            onOpen={(id) => nav.navigate('CustomerDetail', { id })}
            onSend={onSend}
          />
        )}
      </ScrollView>

      <SendSheet
        visible={!!prep}
        customer={prep ? prep.customer : null}
        title="訪問前のご案内を送る"
        subtitle={
          prep
            ? `${prep.customer.name} 様 ・ ${fmtMd(fromIso(prep.visit.date))}${prep.visit.time ? ` ${prep.visit.time}` : ''}`
            : ''
        }
        subject="調律に伺う前のご案内"
        message={prep ? prepMessage(prep.customer, prep.visit, settings.durationMinutes) : ''}
        note="当日の不安を先に消しておくと、立ち会いや駐車の行き違いが減ります。"
        onClose={() => setPrepId(null)}
        onSent={async () => {
          if (prep) await updateVisit(prep.customer.id, prep.visit.id, { prepSent: iso(today()) });
          setPrepId(null);
        }}
      />
    </SafeAreaView>
  );
}

/** 訪問1件ぶんのカード。日時確定・日付だけ確定の両方で使う */
function VisitCard({ x, onOpen, onSend }: { x: VisitOf; onOpen: () => void; onSend: () => void }) {
  const c = useColors();
  const { customer, visit } = x;
  const confirmed = !!visit.time;
  return (
    <Card style={{ marginBottom: 8, borderColor: confirmed ? c.line : c.brass }}>
      <Pressable onPress={onOpen}>
        <View style={st.row}>
          <Text style={[st.date, { color: confirmed ? c.accentInk : c.brassInk }]}>{fmtMd(fromIso(visit.date))}</Text>
          {confirmed ? (
            <Text style={[st.time, { color: c.ink }]}>{visit.time}</Text>
          ) : (
            <Text style={{ color: c.brassInk, fontSize: 13, fontWeight: '700' }}>時間未定</Text>
          )}
        </View>
        <Text style={[st.name, { color: c.ink }]}>{customer.name} 様</Text>
        <Text style={{ color: c.ink2, fontSize: 13 }}>
          {confirmed ? `${visit.pianoIds.length}台 ・ ${shortAddr(customer)}` : shortAddr(customer)}
        </Text>
      </Pressable>
      <View style={st.btnRow}>
        <Button
          label={visit.prepSent ? '訪問前のご案内は送信ずみ' : '訪問前のご案内を送る'}
          variant={visit.prepSent ? 'ghost' : 'primary'}
          style={{ flex: 2 }}
          onPress={onSend}
        />
        <Button label="地図" variant="ghost" style={{ flex: 1 }} onPress={() => openMap(customer)} />
      </View>
    </Card>
  );
}

/** 月表示のカレンダー。日付をタップするとその日の訪問を下に出す */
function CalendarView({
  customers, onOpen, onSend,
}: {
  customers: Customer[];
  onOpen: (id: string) => void;
  onSend: (x: VisitOf) => void;
}) {
  const c = useColors();
  const now = today();
  const [calMonth, setCalMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [calSel, setCalSel] = useState<Date | null>(null);

  const y = calMonth.getFullYear();
  const m = calMonth.getMonth();

  const byDay = useMemo(() => {
    const map: Record<number, VisitOf[]> = {};
    allVisits(customers).forEach((x) => {
      const d = fromIso(x.visit.date);
      if (d.getFullYear() === y && d.getMonth() === m) {
        (map[d.getDate()] = map[d.getDate()] || []).push(x);
      }
    });
    return map;
  }, [customers, y, m]);

  const first = new Date(y, m, 1);
  const startWd = first.getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startWd; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(day);

  const selVisits = calSel ? (byDay[calSel.getDate()] || []) : [];

  /** その月に時期を迎える（日付未定）台。カレンダーには載らない */
  const poolThisMonth = useMemo(() => {
    const out: { customer: Customer; room: string; maker: string }[] = [];
    customers.forEach((cust) => {
      const pend = pendingPianos(cust);
      if (isSkipped(pend)) return;
      pend.forEach((p) => {
        const d = dueDate(p);
        if (d.getFullYear() === y && d.getMonth() === m) {
          out.push({ customer: cust, room: p.room, maker: pianoName(p) });
        }
      });
    });
    return out;
  }, [customers, y, m]);

  return (
    <View>
      <View style={st.calNav}>
        <Pressable
          onPress={() => { setCalMonth(addMonths(calMonth, -1)); setCalSel(null); }}
          accessibilityLabel="前の月" style={st.calNavBtn}
        >
          <Text style={{ color: c.ink, fontSize: 20, fontWeight: '700' }}>‹</Text>
        </Pressable>
        <Text style={{ color: c.ink, fontSize: 16, fontWeight: '800' }}>{y}年{m + 1}月</Text>
        <Pressable
          onPress={() => { setCalMonth(addMonths(calMonth, 1)); setCalSel(null); }}
          accessibilityLabel="次の月" style={st.calNavBtn}
        >
          <Text style={{ color: c.ink, fontSize: 20, fontWeight: '700' }}>›</Text>
        </Pressable>
      </View>

      <View style={st.calLegend}>
        <View style={st.legendItem}><View style={[st.dot, { backgroundColor: c.accent }]} /><Text style={{ color: c.ink2, fontSize: 12.5 }}>日時が確定</Text></View>
        <View style={st.legendItem}><View style={[st.dot, { backgroundColor: c.brass }]} /><Text style={{ color: c.ink2, fontSize: 12.5 }}>日付だけ確定</Text></View>
      </View>

      <View style={st.calGrid}>
        {WD.map((w) => (
          <View key={w} style={st.calCell}>
            <Text style={{ color: c.ink3, fontSize: 12, fontWeight: '700', textAlign: 'center' }}>{w}</Text>
          </View>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <View key={'b' + i} style={st.calCell} />;
          const dt = new Date(y, m, day);
          const arr = byDay[day] || [];
          const isToday = sameYMD(dt, now);
          const isSel = !!calSel && sameYMD(dt, calSel);
          return (
            <Pressable
              key={day}
              style={[
                st.calCell, st.calDay,
                { borderColor: isToday ? c.accent : 'transparent', backgroundColor: isSel ? c.accentSoft : 'transparent' },
              ]}
              onPress={() => setCalSel(dt)}
            >
              <Text style={{ color: c.ink, fontSize: 14, fontWeight: isToday ? '800' : '500' }}>{day}</Text>
              <View style={st.dotsRow}>
                {arr.slice(0, 3).map((x, di) => (
                  <View key={di} style={[st.miniDot, { backgroundColor: x.visit.time ? c.accent : c.brass }]} />
                ))}
              </View>
            </Pressable>
          );
        })}
      </View>

      {calSel ? (
        <>
          <Text style={[st.sec, { color: c.ink }]}>{fmtMd(calSel)}　{selVisits.length}件</Text>
          {selVisits.length ? selVisits.map((x) => (
            <VisitCard key={x.visit.id} x={x} onOpen={() => onOpen(x.customer.id)} onSend={() => onSend(x)} />
          )) : <Empty>この日の訪問はありません。</Empty>}
        </>
      ) : (
        <Text style={{ color: c.ink2, fontSize: 13.5, marginTop: 14 }}>日付をタップすると、その日の訪問が表示されます。</Text>
      )}

      {poolThisMonth.length > 0 && (
        <>
          <Text style={[st.sec, { color: c.ink }]}>{m + 1}月に時期を迎える（日付未定）</Text>
          <Text style={{ color: c.ink2, fontSize: 13, marginBottom: 6 }}>
            カレンダーにはまだ載りません。日付を決めると予定に入ります。
          </Text>
          {poolThisMonth.map((x, i) => (
            <Pressable key={x.customer.id + i} onPress={() => onOpen(x.customer.id)}>
              <Card style={{ marginBottom: 6 }}>
                <Text style={[st.name, { color: c.ink }]}>{x.customer.name} 様</Text>
                <Text style={{ color: c.ink2, fontSize: 13 }}>{x.room}　{x.maker}</Text>
              </Card>
            </Pressable>
          ))}
        </>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  pad: { padding: 18, gap: 6, paddingBottom: 40 },
  sec: { fontSize: 15.5, fontWeight: '800', marginTop: 16, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  date: { fontSize: 14.5, fontWeight: '800' },
  time: { fontSize: 19, fontWeight: '800', fontVariant: ['tabular-nums'] },
  name: { fontSize: 16.5, fontWeight: '800', marginTop: 2 },
  chips: { flexDirection: 'row', gap: 7, marginBottom: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, minHeight: 40, justifyContent: 'center' },
  calNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, marginBottom: 8 },
  calNavBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  calLegend: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 6 },
  calDay: { borderWidth: 1.5, borderRadius: 10, minHeight: 44, justifyContent: 'center' },
  dotsRow: { flexDirection: 'row', gap: 2, marginTop: 2, minHeight: 5 },
  miniDot: { width: 4.5, height: 4.5, borderRadius: 2.5 },
});
