import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button, Title } from '../components/ui';
import { uid } from '../store/db';
import { useApp } from '../store/AppContext';
import { MIN_TAP, useColors } from '../theme/useColors';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AddPiano'>;

export default function AddPianoScreen({ route, navigation }: Props) {
  const c = useColors();
  const { customerId } = route.params;
  const { find, addPiano } = useApp();
  const customer = find(customerId);

  const [room, setRoom] = useState('');
  const [maker, setMaker] = useState('');
  const [model, setModel] = useState('');
  const [type, setType] = useState('アップライト');
  const [serial, setSerial] = useState('');
  const [made, setMade] = useState('');
  const [fee, setFee] = useState('13000');
  const [interval, setInterval] = useState('12');
  const [last, setLast] = useState('');

  const save = async () => {
    if (!room.trim()) { Alert.alert('設置場所の呼び名を入力してください', '例：リビング、音楽室'); return; }
    if (!last.trim()) { Alert.alert('前回の調律日を入力してください', '例：2025-08-12'); return; }
    const lastIso = last.trim();
    const ok = await addPiano(customerId, {
      id: uid('p'),
      room: room.trim(), maker: maker.trim(), model: model.trim(), type,
      serial: serial.trim(), made: made.trim(), env: '',
      fee: parseInt(fee, 10) || 13000,
      intervalMonths: parseInt(interval, 10) || 12,
      lastTunedOn: lastIso, initialLast: lastIso, nextDue: null,
      remindedCycle: null, skippedCycle: null, custSkippedCycle: null,
      history: [],
    });
    if (!ok) { Alert.alert('保存できませんでした', '端末の空き容量が不足しています。'); return; }
    navigation.goBack();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.ground }} edges={['bottom']}>
      <ScrollView contentContainerStyle={st.pad} keyboardShouldPersistTaps="handled">
        <Title>ピアノを追加</Title>
        <Text style={{ color: c.ink2, fontSize: 14 }}>
          {customer?.name} 様 ・ 現在 {customer?.pianos.length ?? 0}台
        </Text>

        <F label="設置場所の呼び名 *"><I value={room} onChangeText={setRoom} placeholder="例：音楽室、レッスン室A" /></F>
        <F label="前回の調律日 *"><I value={last} onChangeText={setLast} placeholder="例：2025-08-12" /></F>
        <F label="メーカー"><I value={maker} onChangeText={setMaker} placeholder="例：YAMAHA" /></F>
        <F label="型番"><I value={model} onChangeText={setModel} placeholder="例：U3" /></F>
        <F label="種類">
          <View style={st.chips}>
            {['アップライト', 'グランド'].map((t) => {
              const on = t === type;
              return (
                <Text key={t} onPress={() => setType(t)}
                  style={[st.chip, { backgroundColor: on ? c.accent : c.surface, borderColor: on ? c.accent : c.lineStrong, color: on ? c.onAccent : c.ink2 }]}>
                  {t}
                </Text>
              );
            })}
          </View>
        </F>
        <F label="製造番号">
          <I value={serial} onChangeText={setSerial} placeholder="例：5312884" />
          <Text style={{ color: c.ink2, fontSize: 13 }}>同じ型番でも個体を識別できます。</Text>
        </F>
        <F label="製造年"><I value={made} onChangeText={setMade} placeholder="例：1998" inputMode="numeric" /></F>
        <F label="調律の料金（円）"><I value={fee} onChangeText={setFee} inputMode="numeric" /></F>
        <F label="調律の周期（ヶ月）"><I value={interval} onChangeText={setInterval} inputMode="numeric" /></F>

        <Button label="追加する" onPress={save} style={{ marginTop: 18 }} />
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
function I(props: React.ComponentProps<typeof TextInput>) {
  const c = useColors();
  return (
    <TextInput {...props} placeholderTextColor={c.ink3}
      style={[st.input, { backgroundColor: c.surface, borderColor: c.line, color: c.ink }]} />
  );
}

const st = StyleSheet.create({
  pad: { padding: 18, gap: 6, paddingBottom: 48 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, minHeight: MIN_TAP + 4, fontSize: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, fontWeight: '700', overflow: 'hidden' },
});
