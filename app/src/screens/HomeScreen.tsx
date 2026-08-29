import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Button, Card, Empty, SaveAlert, StatusPill, Title } from '../components/ui';
import { ReminderSheet } from '../components/ReminderSheet';
import { dueDate, dueStatus, type DueStatus } from '../lib/cycle';
import { fmtJ, fmtMd, fromIso } from '../lib/date';
import { gapText, money, needsRoughTuning } from '../lib/pricing';
import {
  customerStatus, isSkipped, pendingPianos, pianoName, quoted, reminderState,
  shortAddr, todaysVisits,
} from '../lib/select';
import { useApp } from '../store/AppContext';
import { MIN_TAP, useColors } from '../theme/useColors';
import type { Customer, Piano } from '../types';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Group = { customer: Customer; pianos: Piano[] };

/**
 * ご案内。
 * 朝いちばんに見る画面なので、今日の訪問がある日は「今日」を主役にし、
 * ご案内は1行に畳む。無い日はご案内が主役になる。
 */
export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const c = useColors();
  const { customers, settings, saveFailed, skipCycle, unskipCycle } = useApp();
  const surcharge = settings.locale === 'ja-JP';
  const [remindTo, setRemindTo] = useState<string | null>(null);

  const today = useMemo(() => todaysVisits(customers), [customers]);

  const groups = useMemo(() => {
    const g: Record<DueStatus, Group[]> = {
      overdue: [], due: [], next: [], dormant: [], calm: [],
    };
    customers.forEach((cust) => {
      const pend = pendingPianos(cust);
      if (!pend.length) return;
      g[customerStatus(pend)].push({ customer: cust, pianos: pend });
    });
    return g;
  }, [customers]);

  // 見送った台は「まだご案内が要る数」には数えない。カード自体は取り消せるように残す
  const live = groups.overdue.concat(groups.due).filter((x) => !isSkipped(x.pianos));
  const dueCount = live.reduce((s, x) => s + x.pianos.length, 0);
  const dueYen = live.reduce((s, x) => s + x.pianos.reduce((t, p) => t + quoted(p, surcharge), 0), 0);

  const requests = customers.filter((x) => x.request);

  if (!customers.length) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.ground }} edges={['top']}>
        <ScrollView contentContainerStyle={st.pad}>
          <Title>ご案内</Title>
          <Card style={{ marginTop: 14 }}>
            <Text style={[st.h3, { color: c.ink }]}>お客様を、少しずつ移していきます</Text>
            <Text style={{ color: c.ink2, fontSize: 14.5, lineHeight: 24 }}>
              いま持っている台帳を、全部この場で入力する必要はありません。{'\n'}
              調律は1年に1度めぐってきます。次に伺ったお客様から1軒ずつ登録していけば、
              1年で自然にぜんぶ揃います。
            </Text>
            <Button
              label="はじめのお客様を登録する"
              onPress={() => navigation.navigate('AddCustomer')}
              style={{ marginTop: 10 }}
            />
          </Card>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const sectionProps = {
    nav: navigation,
    surcharge,
    onRemind: setRemindTo,
    onSkip: skipCycle,
    onUnskip: unskipCycle,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.ground }} edges={['top']}>
      {saveFailed ? <SaveAlert /> : null}
      <ScrollView contentContainerStyle={st.pad}>
        <Title>ご案内</Title>

        {requests.map((cust) => (
          <Pressable
            key={cust.id}
            onPress={() => navigation.navigate('CustomerDetail', { id: cust.id })}
            style={[st.req, { backgroundColor: c.accentSoft, borderColor: c.accent }]}
          >
            <Text style={[st.reqHead, { color: c.accentInk }]}>ご依頼をいただきました</Text>
            <Text style={[st.reqName, { color: c.ink }]}>{cust.name} 様</Text>
            {cust.request?.want ? (
              <Text style={{ color: c.ink2, fontSize: 13.5 }}>ご希望：{cust.request.want}</Text>
            ) : null}
          </Pressable>
        ))}

        {today.length > 0 && (
          <Card style={{ borderColor: c.accent, borderWidth: 2 }}>
            <Text style={[st.kicker, { color: c.accentInk }]}>
              きょう {fmtMd(new Date())}　{today.length}件
            </Text>
            {today.map(({ customer, visit }) => (
              <Pressable
                key={visit.id}
                onPress={() => navigation.navigate('CustomerDetail', { id: customer.id })}
                style={st.todayRow}
              >
                <Text style={[st.time, { color: c.ink }]}>{visit.time || '時間未定'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[st.name, { color: c.ink }]}>{customer.name} 様</Text>
                  <Text style={{ color: c.ink2, fontSize: 13 }}>
                    {visit.pianoIds.length}台 ・ {shortAddr(customer)}
                  </Text>
                </View>
              </Pressable>
            ))}
          </Card>
        )}

        <Card>
          <Text style={[st.kicker, { color: c.ink2 }]}>今すぐご案内すべきピアノ</Text>
          <Text style={[st.big, { color: c.ink }]}>
            {dueCount}
            <Text style={{ fontSize: 17 }}> 台</Text>
          </Text>
          {dueCount > 0 && (
            <Text style={{ color: c.ink2, fontSize: 13.5 }}>
              ご案内が実れば 約{money(dueYen)}
            </Text>
          )}
        </Card>

        <Section title="時期を過ぎています" items={groups.overdue} {...sectionProps} />
        <Section title="今月が時期" items={groups.due} {...sectionProps} />
        <Section title="来月が時期" items={groups.next} {...sectionProps} />
        <Section title="掘り起こしたいお客様" items={groups.dormant} {...sectionProps} />

        {dueCount === 0 && groups.next.length === 0 && groups.dormant.length === 0 && (
          <Empty>いまご案内が必要なピアノはありません。</Empty>
        )}
      </ScrollView>

      <ReminderSheet customerId={remindTo} onClose={() => setRemindTo(null)} />
    </SafeAreaView>
  );
}

function Section({
  title, items, nav, surcharge, onRemind, onSkip, onUnskip,
}: {
  title: string;
  items: Group[];
  nav: Nav;
  surcharge: boolean;
  onRemind: (id: string) => void;
  onSkip: (id: string) => void;
  onUnskip: (id: string) => void;
}) {
  const c = useColors();
  if (!items.length) return null;
  const total = items.reduce((s, x) => s + x.pianos.length, 0);
  return (
    <View style={{ gap: 10, marginTop: 6 }}>
      <Text style={[st.secHead, { color: c.ink }]}>
        {title}
        <Text style={{ color: c.ink2, fontSize: 13, fontWeight: '600' }}>　{items.length}軒 / {total}台</Text>
      </Text>
      {items.map(({ customer, pianos }) => {
        const fee = pianos.reduce((s, p) => s + quoted(p, surcharge), 0);
        const rs = reminderState(pianos);
        const skipped = rs === 'skipped' || rs === 'custSkipped';
        return (
          <Card key={customer.id}>
            <Pressable onPress={() => nav.navigate('CustomerDetail', { id: customer.id })}>
              <View style={st.cardHead}>
                <Text style={[st.name, { color: c.ink, flexShrink: 1 }]}>{customer.name} 様</Text>
                <StatusPill status={dueStatus(pianos[0])} />
              </View>
              <Text style={{ color: c.ink2, fontSize: 13.5 }}>
                {shortAddr(customer)} ・ 合計 約{money(fee)}
              </Text>
              {pianos.map((p) => (
                <View key={p.id} style={st.pianoRow}>
                  <Text style={{ color: c.ink, fontSize: 14, flex: 1 }}>
                    {p.room}　<Text style={{ color: c.ink2 }}>{pianoName(p)}</Text>
                  </Text>
                  <Text style={{ color: c.ink2, fontSize: 13 }}>{fmtJ(dueDate(p))}</Text>
                </View>
              ))}
              {pianos.some((p) => needsRoughTuning(p.lastTunedOn)) && (
                <Text style={[st.rough, { color: c.overdueInk, backgroundColor: c.overdueSoft }]}>
                  {gapText(pianos[0].lastTunedOn)}あいています。音が安定するまで粗調律（下準備）が必要です
                </Text>
              )}
            </Pressable>

            {skipped ? (
              <View style={[st.skipRow, { borderTopColor: c.line }]}>
                <Text style={{ color: c.ink2, fontSize: 13.5, flex: 1 }}>
                  {rs === 'custSkipped'
                    ? 'お客様が「今回は見送る」を選ばれました'
                    : '今回のご案内は見送りました'}
                </Text>
                <Pressable onPress={() => onUnskip(customer.id)} style={st.link}>
                  <Text style={{ color: c.accentInk, fontSize: 13.5, fontWeight: '700' }}>取り消す</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <View style={st.acts}>
                  <Button
                    label={rs === 'reminded' ? 'もう一度ご案内する' : 'ご案内を送る'}
                    variant={rs === 'reminded' ? 'ghost' : 'primary'}
                    style={{ flex: 1 }}
                    onPress={() => onRemind(customer.id)}
                  />
                  <Button label="見送る" variant="ghost" onPress={() => onSkip(customer.id)} />
                </View>
                {rs === 'reminded' && (
                  <Text style={{ color: c.ink2, fontSize: 13 }}>
                    ご案内を送りました。お客様のお返事を待っています。
                  </Text>
                )}
              </>
            )}
          </Card>
        );
      })}
    </View>
  );
}

const st = StyleSheet.create({
  pad: { padding: 18, gap: 14, paddingBottom: 40 },
  h3: { fontSize: 17, fontWeight: '800' },
  kicker: { fontSize: 12.5, fontWeight: '700', letterSpacing: 0.4 },
  big: { fontSize: 40, fontWeight: '800', lineHeight: 46 },
  secHead: { fontSize: 15, fontWeight: '800', marginTop: 4 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  name: { fontSize: 17, fontWeight: '800' },
  todayRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, minHeight: MIN_TAP },
  time: { fontSize: 19, fontWeight: '800', minWidth: 62, fontVariant: ['tabular-nums'] },
  pianoRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingTop: 4 },
  rough: {
    fontSize: 13, lineHeight: 20, marginTop: 6, overflow: 'hidden',
    paddingHorizontal: 11, paddingVertical: 8, borderRadius: 10,
  },
  acts: { flexDirection: 'row', gap: 8, marginTop: 8 },
  skipRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderTopWidth: 1, marginTop: 8, paddingTop: 4,
  },
  link: { minHeight: MIN_TAP, justifyContent: 'center', paddingHorizontal: 4 },
  req: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 3 },
  reqHead: { fontSize: 12.5, fontWeight: '800' },
  reqName: { fontSize: 17, fontWeight: '800' },
});
