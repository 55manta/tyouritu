import React, { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button, Card, StatusPill, Title } from '../components/ui';
import { dueDate, dueStatus, kindName } from '../lib/cycle';
import { fmtJ, fmtJd, fromIso, iso, today } from '../lib/date';
import { gapText, money, needsRoughTuning } from '../lib/pricing';
import { customerStats, fullAddr, pianoName, quoted, recordTotal } from '../lib/select';
import { newToken, uid } from '../store/db';
import { useApp } from '../store/AppContext';
import { MIN_TAP, useColors } from '../theme/useColors';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CustomerDetail'>;

export default function CustomerDetailScreen({ route, navigation }: Props) {
  const c = useColors();
  const { id } = route.params;
  const { find, settings, updateCustomer, deleteCustomer, deletePiano, addVisit } = useApp();
  const customer = find(id);
  const [openHistory, setOpenHistory] = useState<string | null>(null);

  if (!customer) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.ground }}>
        <Text style={{ padding: 20, color: c.ink }}>お客様が見つかりません。</Text>
      </SafeAreaView>
    );
  }

  const stats = customerStats(customer);
  const surcharge = settings.locale === 'ja-JP';

  const confirmDelete = () => {
    Alert.alert(
      `${customer.name} 様を削除しますか`,
      'お客様の情報・ピアノ・作業の履歴が、すべて消えます。元に戻せません。',
      [
        { text: 'やめておく', style: 'cancel' },
        {
          text: '削除する',
          style: 'destructive',
          onPress: async () => {
            const ok = await deleteCustomer(id);
            if (ok) navigation.goBack();
            else Alert.alert('保存できませんでした', '端末の空き容量が不足しています。');
          },
        },
      ]
    );
  };

  const setConsent = (v: 'yes' | 'no' | null) => updateCustomer(id, { photoConsent: v });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.ground }} edges={['bottom']}>
      <ScrollView contentContainerStyle={st.pad}>
        <Title>{customer.name} 様</Title>
        <Text style={{ color: c.ink2, fontSize: 14 }}>
          {customer.kind} ・ {customer.pianos.length}台
        </Text>

        {customer.request && (
          <Card style={{ backgroundColor: c.accentSoft, borderColor: c.accent }}>
            <Text style={{ color: c.accentInk, fontSize: 13, fontWeight: '800' }}>ご依頼をいただきました</Text>
            {customer.request.want ? (
              <Text style={{ color: c.ink, fontSize: 14 }}>ご希望：{customer.request.want}</Text>
            ) : null}
            <Button
              label="日程を決める"
              onPress={async () => {
                const ok = await addVisit(id, {
                  id: uid('v'), date: iso(today()), time: '',
                  pianoIds: customer.request!.pianoIds, note: 'ご依頼から',
                });
                if (!ok) Alert.alert('保存できませんでした', '端末の空き容量が不足しています。');
              }}
              style={{ marginTop: 6 }}
            />
          </Card>
        )}

        <Card>
          <Text style={{ color: c.ink, fontSize: 15 }}>{fullAddr(customer) || '（住所が未登録）'}</Text>
          {customer.parking ? <Text style={{ color: c.ink2, fontSize: 13.5 }}>駐車場　{customer.parking}</Text> : null}
          {customer.access ? <Text style={{ color: c.ink2, fontSize: 13.5 }}>搬入経路　{customer.access}</Text> : null}
          <View style={st.row}>
            {customer.phone ? (
              <Button label="電話する" variant="ghost" style={{ flex: 1 }}
                onPress={() => Linking.openURL(`tel:${customer.phone}`)} />
            ) : null}
            <Button label="地図" variant="ghost" style={{ flex: 1 }}
              onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(fullAddr(customer))}`)} />
          </View>
        </Card>

        {stats.count > 0 && (
          <Card>
            <Text style={[st.sec, { color: c.ink }]}>この方との歩み</Text>
            <View style={st.statRow}>
              <Stat label="お付き合い" value={stats.years ? `${stats.years}年` : '1年未満'} />
              <Stat label="これまでの訪問" value={`${stats.count}回`} />
            </View>
            <Stat label="これまでの売上" value={money(stats.total)} big />
            {Object.entries(stats.byKind).map(([k, v]) => (
              <View key={k} style={st.kv}>
                <Text style={{ color: c.ink2, fontSize: 13.5 }}>{kindName(k)}</Text>
                <Text style={{ color: c.ink2, fontSize: 13.5 }}>{v.count}回 ・ {money(v.yen)}</Text>
              </View>
            ))}
          </Card>
        )}

        <Text style={[st.sec, { color: c.ink, marginTop: 8 }]}>ピアノ</Text>
        {customer.pianos.map((p) => (
          <Card key={p.id} style={{ marginBottom: 10 }}>
            <View style={st.rowTop}>
              <Text style={{ color: c.ink, fontSize: 16.5, fontWeight: '800', flexShrink: 1 }}>{p.room}</Text>
              <StatusPill status={dueStatus(p)} />
            </View>
            <Text style={{ color: c.ink2, fontSize: 14 }}>{pianoName(p)} ・ {p.type}</Text>
            {p.serial ? <Text style={{ color: c.ink2, fontSize: 13 }}>製造番号 {p.serial}{p.made ? ` ／ ${p.made}年` : ''}</Text> : null}
            <View style={st.kv}>
              <Text style={{ color: c.ink2, fontSize: 13.5 }}>前回の調律</Text>
              <Text style={{ color: c.ink, fontSize: 13.5 }}>{fmtJd(fromIso(p.lastTunedOn))}</Text>
            </View>
            <View style={st.kv}>
              <Text style={{ color: c.ink2, fontSize: 13.5 }}>次回の目安</Text>
              <Text style={{ color: c.ink, fontSize: 13.5 }}>{fmtJ(dueDate(p))}ごろ</Text>
            </View>
            <View style={st.kv}>
              <Text style={{ color: c.ink2, fontSize: 13.5 }}>料金の目安</Text>
              <Text style={{ color: c.ink, fontSize: 13.5, fontWeight: '700' }}>{money(quoted(p, surcharge))}</Text>
            </View>
            {needsRoughTuning(p.lastTunedOn) && (
              <Text style={[st.warn, { color: c.overdueInk, backgroundColor: c.overdueSoft }]}>
                {gapText(p.lastTunedOn)}あいています。粗調律（下準備）が必要です
              </Text>
            )}

            <Button label="この台を記録する"
              onPress={() => navigation.navigate('RecordForm', { customerId: id, pianoId: p.id })}
              style={{ marginTop: 8 }} />

            {p.history.length > 0 && (
              <Pressable onPress={() => setOpenHistory(openHistory === p.id ? null : p.id)} style={st.toggle}>
                <Text style={{ color: c.accentInk, fontSize: 13.5, fontWeight: '700' }}>
                  {openHistory === p.id ? '履歴を閉じる' : `調律の履歴を見る（${p.history.length}件）`}
                </Text>
              </Pressable>
            )}
            {openHistory === p.id && p.history.map((h) => (
              <Pressable key={h.id}
                onPress={() => navigation.navigate('RecordForm', { customerId: id, pianoId: p.id, recordId: h.id })}
                style={[st.hist, { borderTopColor: c.line }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.ink, fontSize: 14 }}>{fmtJd(fromIso(h.date))}　{h.work}</Text>
                  {h.memo ? <Text style={{ color: c.ink2, fontSize: 12.5 }} numberOfLines={1}>{h.memo}</Text> : null}
                </View>
                <Text style={{ color: c.ink, fontSize: 14, fontWeight: '700' }}>{money(recordTotal(h))}</Text>
              </Pressable>
            ))}

            {customer.pianos.length > 1 && (
              <Pressable
                onPress={() => Alert.alert('このピアノを削除しますか', `${p.room}の作業の履歴 ${p.history.length}件も一緒に消えます。`, [
                  { text: 'やめておく', style: 'cancel' },
                  { text: '削除する', style: 'destructive', onPress: () => deletePiano(id, p.id) },
                ])}
                style={st.toggle}>
                <Text style={{ color: c.ink3, fontSize: 12.5 }}>{p.room} を削除</Text>
              </Pressable>
            )}
          </Card>
        ))}

        <Button label="このお客様にピアノを追加" variant="ghost"
          onPress={() => navigation.navigate('AddPiano', { customerId: id })} />

        <Text style={[st.sec, { color: c.ink, marginTop: 16 }]}>お客様の情報の扱い</Text>
        <Card>
          <Text style={{ color: c.ink, fontSize: 14, fontWeight: '700' }}>お宅の中の写真を保存する</Text>
          <View style={st.chips}>
            {([['yes', '同意いただいた'], ['no', '辞退された'], [null, '未確認']] as const).map(([v, label]) => {
              const on = customer.photoConsent === v;
              return (
                <Pressable key={label} onPress={() => setConsent(v)}
                  style={[st.chip, { backgroundColor: on ? c.accent : c.surface, borderColor: on ? c.accent : c.lineStrong }]}>
                  <Text style={{ color: on ? '#FFF' : c.ink2, fontSize: 13.5, fontWeight: '700' }}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={{ color: c.ink2, fontSize: 13 }}>
            「辞退された」にすると、このお客様の記録では写真を保存しません。
          </Text>
        </Card>

        <Button label="予約ページのURLを作り直す" variant="ghost" style={{ marginTop: 10 }}
          onPress={() => Alert.alert('予約ページのURLを作り直しますか', 'いまのURLは開けなくなります。お送りしたご案内のリンクも無効になります。', [
            { text: 'やめる', style: 'cancel' },
            { text: '作り直す', onPress: () => updateCustomer(id, { bookToken: newToken() }) },
          ])} />

        <Pressable onPress={confirmDelete} style={st.deleteBtn}>
          <Text style={{ color: c.overdueInk, fontSize: 14, fontWeight: '700' }}>このお客様を削除する</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value, big }: { label: string; value: string; big?: boolean }) {
  const c = useColors();
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={{ color: c.ink2, fontSize: 12.5 }}>{label}</Text>
      <Text style={{ color: c.ink, fontSize: big ? 22 : 17, fontWeight: '800' }}>{value}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  pad: { padding: 18, gap: 10, paddingBottom: 48 },
  sec: { fontSize: 15.5, fontWeight: '800' },
  row: { flexDirection: 'row', gap: 8, marginTop: 8 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  statRow: { flexDirection: 'row', gap: 14 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 },
  warn: { fontSize: 13, lineHeight: 20, marginTop: 6, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 10, overflow: 'hidden' },
  toggle: { minHeight: MIN_TAP, justifyContent: 'center' },
  hist: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, paddingVertical: 10, minHeight: MIN_TAP },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 6 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, minHeight: MIN_TAP, justifyContent: 'center' },
  deleteBtn: { minHeight: MIN_TAP, justifyContent: 'center', alignItems: 'center', marginTop: 14 },
});
