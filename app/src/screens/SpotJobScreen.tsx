import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button, Title } from '../components/ui';
import { KINDS, type RecordKind } from '../lib/cycle';
import { addDays, iso, today } from '../lib/date';
import { uid } from '../store/db';
import { useApp } from '../store/AppContext';
import { MIN_TAP, useColors } from '../theme/useColors';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'SpotJob'>;

/** 「弦が切れた」のような、定期調律の周期とは関係なく呼ばれる仕事の入口 */
const SPOT_KINDS = KINDS.filter((k) => !k.cycle);

const INTAKE_ITEMS = [
  '音が全体的に狂ってきた気がする',
  '特定の鍵盤の音が出ない・鳴りにくい',
  '鍵盤が重い・戻りが悪い',
  '弾くとカタカタ・ビリビリと雑音がする',
  'ペダルの効きが気になる',
];

export default function SpotJobScreen({ route, navigation }: Props) {
  const c = useColors();
  const { customerId } = route.params;
  const { find, addVisit } = useApp();
  const customer = find(customerId);

  const [kind, setKind] = useState<RecordKind>('repair');
  const [pianoId, setPianoId] = useState(customer?.pianos[0]?.id ?? '');
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [note, setNote] = useState('');
  const [date, setDate] = useState(iso(addDays(today(), 3)));

  if (!customer) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.ground }}>
        <Text style={{ padding: 20, color: c.ink }}>お客様が見つかりません。</Text>
      </SafeAreaView>
    );
  }

  const toggleItem = (t: string) => {
    setChecked((s) => {
      const next = new Set(s);
      if (next.has(t)) next.delete(t); else next.add(t);
      return next;
    });
  };

  const save = async () => {
    if (!date.trim()) { Alert.alert('伺う日を入力してください'); return; }
    const kd = KINDS.find((k) => k.k === kind)!;
    const items = INTAKE_ITEMS.filter((t) => checked.has(t));
    const trimmedNote = note.trim();
    const ok = await addVisit(customerId, {
      id: uid('v'), date: date.trim(), time: '',
      pianoIds: pianoId ? [pianoId] : [],
      note: kd.n, kind,
      intake: (items.length || trimmedNote) ? { items, note: trimmedNote } : null,
    });
    if (!ok) { Alert.alert('保存できませんでした', '端末の空き容量が不足しています。'); return; }
    navigation.goBack();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.ground }} edges={['bottom']}>
      <ScrollView contentContainerStyle={st.pad} keyboardShouldPersistTaps="handled">
        <Title>臨時のご依頼を受ける</Title>
        <Text style={{ color: c.ink2, fontSize: 14 }}>{customer.name} 様</Text>

        <F label="ご依頼の内容">
          <View style={st.chips}>
            {SPOT_KINDS.map((k) => {
              const on = k.k === kind;
              return (
                <Text key={k.k} onPress={() => setKind(k.k)}
                  style={[st.chip, { backgroundColor: on ? c.accent : c.surface, borderColor: on ? c.accent : c.lineStrong, color: on ? c.onAccent : c.ink2 }]}>
                  {k.n}
                </Text>
              );
            })}
          </View>
        </F>

        {customer.pianos.length > 1 && (
          <F label="どのピアノですか">
            <View style={st.chips}>
              {customer.pianos.map((p) => {
                const on = p.id === pianoId;
                return (
                  <Text key={p.id} onPress={() => setPianoId(p.id)}
                    style={[st.chip, { backgroundColor: on ? c.accent : c.surface, borderColor: on ? c.accent : c.lineStrong, color: on ? c.onAccent : c.ink2 }]}>
                    {p.room}
                  </Text>
                );
              })}
            </View>
          </F>
        )}

        <F label="お困りごと（お客様のお話）">
          <View style={{ gap: 8 }}>
            {INTAKE_ITEMS.map((t) => {
              const on = checked.has(t);
              return (
                <Pressable key={t} onPress={() => toggleItem(t)}
                  style={[st.intakeRow, { backgroundColor: on ? c.accentSoft : c.surface, borderColor: on ? c.accent : c.lineStrong }]}>
                  <Text style={{ color: c.ink, fontSize: 14 }}>{t}</Text>
                </Pressable>
              );
            })}
          </View>
          <TextInput
            value={note} onChangeText={setNote} multiline
            placeholder="伺ったお話を、そのまま書いておけます"
            placeholderTextColor={c.ink3}
            style={[st.input, st.area, { backgroundColor: c.surface, borderColor: c.line, color: c.ink }]}
          />
        </F>

        <F label="伺う日">
          <TextInput
            value={date} onChangeText={setDate} placeholder="2026-08-29"
            placeholderTextColor={c.ink3}
            style={[st.input, { backgroundColor: c.surface, borderColor: c.line, color: c.ink }]}
          />
          <Text style={{ color: c.ink2, fontSize: 13 }}>時間は決めずに置いておけます。調律の周期は動きません。</Text>
        </F>

        <Button label="予定に入れる" onPress={save} style={{ marginTop: 18 }} />
        <Button label="やめる" variant="ghost" onPress={() => navigation.goBack()} style={{ marginTop: 8 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={{ gap: 6, marginTop: 13 }}>
      <Text style={{ color: c.ink, fontSize: 14.5, fontWeight: '700' }}>{label}</Text>
      {children}
    </View>
  );
}

const st = StyleSheet.create({
  pad: { padding: 18, gap: 6, paddingBottom: 48 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, minHeight: MIN_TAP + 4, fontSize: 16 },
  area: { minHeight: 80, paddingTop: 12, textAlignVertical: 'top', marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: {
    borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, fontWeight: '700', overflow: 'hidden',
  },
  intakeRow: { borderWidth: 1, borderRadius: 12, padding: 12, minHeight: MIN_TAP },
});
