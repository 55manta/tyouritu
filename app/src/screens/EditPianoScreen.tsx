import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button, Title } from '../components/ui';
import { useApp } from '../store/AppContext';
import { MIN_TAP, useColors } from '../theme/useColors';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'EditPiano'>;

const ENV_OPTIONS = ['リビング（一般家庭）', '和室', '防音室', '音楽教室', '学校・ホール'];

/** ピアノの情報を直す。登録時に入れなかった項目を後から足す入口 */
export default function EditPianoScreen({ route, navigation }: Props) {
  const c = useColors();
  const { customerId, pianoId } = route.params;
  const { find, updatePiano } = useApp();
  const customer = find(customerId);
  const piano = customer?.pianos.find((p) => p.id === pianoId);

  const [room, setRoom] = useState(piano?.room ?? '');
  const [maker, setMaker] = useState(piano?.maker ?? '');
  const [model, setModel] = useState(piano?.model ?? '');
  const [type, setType] = useState(piano?.type ?? 'アップライト');
  const [serial, setSerial] = useState(piano?.serial ?? '');
  const [made, setMade] = useState(piano?.made ?? '');
  const [env, setEnv] = useState(piano?.env ?? '');
  const [fee, setFee] = useState(String(piano?.fee ?? 13000));
  const [interval, setInterval] = useState(String(piano?.intervalMonths ?? 12));

  if (!customer || !piano) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.ground }}>
        <Text style={{ padding: 20, color: c.ink }}>対象が見つかりません。</Text>
      </SafeAreaView>
    );
  }

  const save = async () => {
    if (!room.trim()) { Alert.alert('設置場所の呼び名を入力してください'); return; }
    const ok = await updatePiano(customerId, pianoId, {
      room: room.trim(), maker: maker.trim(), model: model.trim(), type,
      serial: serial.trim(), made: made.trim(), env,
      fee: parseInt(fee, 10) || 13000,
      intervalMonths: parseInt(interval, 10) || 12,
    });
    if (!ok) { Alert.alert('保存できませんでした', '端末の空き容量が不足しています。'); return; }
    navigation.goBack();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.ground }} edges={['bottom']}>
      <ScrollView contentContainerStyle={st.pad} keyboardShouldPersistTaps="handled">
        <Title>ピアノの情報を直す</Title>
        <Text style={{ color: c.ink2, fontSize: 14 }}>{customer.name} 様</Text>

        <F label="設置場所の呼び名 *"><I value={room} onChangeText={setRoom} placeholder="例：音楽室、レッスン室A" /></F>
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
        <F label="設置環境">
          <View style={st.chips}>
            {ENV_OPTIONS.map((e) => {
              const on = e === env;
              return (
                <Text key={e} onPress={() => setEnv(on ? '' : e)}
                  style={[st.chip, { backgroundColor: on ? c.accent : c.surface, borderColor: on ? c.accent : c.lineStrong, color: on ? c.onAccent : c.ink2 }]}>
                  {e}
                </Text>
              );
            })}
          </View>
        </F>
        <F label="製造番号"><I value={serial} onChangeText={setSerial} placeholder="例：5312884" /></F>
        <F label="製造年"><I value={made} onChangeText={setMade} placeholder="例：1998" inputMode="numeric" /></F>
        <F label="調律の料金（円）"><I value={fee} onChangeText={setFee} inputMode="numeric" /></F>
        <F label="調律の周期（ヶ月）"><I value={interval} onChangeText={setInterval} inputMode="numeric" /></F>

        <Button label="保存する" onPress={save} style={{ marginTop: 18 }} />
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
