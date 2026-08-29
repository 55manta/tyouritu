import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button, Card, Title } from '../components/ui';
import { iso, today } from '../lib/date';
import { money } from '../lib/pricing';
import { uid } from '../store/db';
import { useApp } from '../store/AppContext';
import { MIN_TAP, useColors } from '../theme/useColors';
import { CUSTOMER_KINDS, FREE_LIMIT, PLANS, type Customer, type CustomerKind } from '../types';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AddCustomer'>;

/**
 * お客様の追加。
 * 全部の項目を最初に埋めさせない。名前と前回の調律日だけで始められるようにして、
 * 詳細は後から足せる形にする（初期入力の膨大さで挫折させないため）。
 */
export default function AddCustomerScreen({ navigation }: Props) {
  const c = useColors();
  const { addCustomer, canAddCustomer, customers, updateSettings } = useApp();

  const [name, setName] = useState('');
  const [kana, setKana] = useState('');
  const [kind, setKind] = useState<CustomerKind>('一般家庭');
  const [phone, setPhone] = useState('');
  const [last, setLast] = useState('');
  const [room, setRoom] = useState('リビング');
  const [maker, setMaker] = useState('');
  const [model, setModel] = useState('');
  const [fee, setFee] = useState('13000');
  const [region, setRegion] = useState('');
  const [city, setCity] = useState('');
  const [line1, setLine1] = useState('');
  const [more, setMore] = useState(false);

  if (!canAddCustomer) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.ground }} edges={['bottom']}>
        <ScrollView contentContainerStyle={st.pad}>
          <Title>無料は {FREE_LIMIT} 軒までです</Title>
          <Text style={{ color: c.ink2, fontSize: 14.5, lineHeight: 24 }}>
            いま {customers.length} 軒。{'\n'}
            登録ずみのお客様は、このままお使いいただけます。新しく追加するときだけ、有料プランが必要です。
          </Text>
          {(['yearly', 'monthly'] as const).map((k) => (
            <Card key={k}>
              <Text style={{ color: c.ink2, fontSize: 12.5, fontWeight: '700' }}>{PLANS[k].name}</Text>
              <Text style={{ color: c.ink, fontSize: 22, fontWeight: '800' }}>
                {money(PLANS[k].price)}<Text style={{ fontSize: 13 }}> / {PLANS[k].unit}</Text>
              </Text>
              <Text style={{ color: c.ink2, fontSize: 12.5 }}>{PLANS[k].note}</Text>
              <Button label="このプランにする" onPress={() => updateSettings({ plan: k })} style={{ marginTop: 6 }} />
            </Card>
          ))}
          <Button label="あとで" variant="ghost" onPress={() => navigation.goBack()} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const save = async () => {
    if (!name.trim()) { Alert.alert('お名前を入力してください'); return; }
    if (!last.trim()) { Alert.alert('前回の調律日を入力してください', '例：2025-08-12'); return; }

    const lastIso = last.trim();
    const cust: Customer = {
      id: uid('c'),
      name: name.trim(), kana: kana.trim(), kind,
      phone: phone.trim(), email: '', line: '',
      addr: { country: 'JP', postal: '', region: region.trim(), city: city.trim(), line1: line1.trim(), line2: '' },
      parking: '', access: '', memo: '',
      photoConsent: null, bookToken: null, request: null,
      visits: [],
      pianos: [{
        id: uid('p'),
        room: room.trim() || 'リビング', maker: maker.trim(), model: model.trim(),
        type: 'アップライト', serial: '', made: '', env: '',
        fee: parseInt(fee, 10) || 13000, intervalMonths: 12,
        lastTunedOn: lastIso, initialLast: lastIso, nextDue: null,
        remindedCycle: null, skippedCycle: null, custSkippedCycle: null,
        history: [],
      }],
    };

    const ok = await addCustomer(cust);
    if (!ok) { Alert.alert('保存できませんでした', '端末の空き容量が不足しています。'); return; }
    navigation.goBack();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.ground }} edges={['bottom']}>
      <ScrollView contentContainerStyle={st.pad} keyboardShouldPersistTaps="handled">
        <Title>お客様を追加</Title>

        <F label="お名前 *"><I value={name} onChangeText={setName} placeholder="例：山田 花子" /></F>
        <F label="ふりがな">
          <I value={kana} onChangeText={setKana} placeholder="例：やまだ はなこ" />
          <Hint>あいうえお順で並べるときに使います。</Hint>
        </F>
        <F label="前回の調律日 *">
          <I value={last} onChangeText={setLast} placeholder="例：2025-08-12" />
          <Hint>ここから次回のご案内時期を計算します。</Hint>
        </F>
        <F label="お客様の種類">
          <View style={st.chips}>
            {CUSTOMER_KINDS.map((k) => {
              const on = k === kind;
              return (
                <Text key={k} onPress={() => setKind(k)}
                  style={[st.chip, { backgroundColor: on ? c.accent : c.surface, borderColor: on ? c.accent : c.lineStrong, color: on ? '#FFF' : c.ink2 }]}>
                  {k}
                </Text>
              );
            })}
          </View>
        </F>
        <F label="電話番号"><I value={phone} onChangeText={setPhone} placeholder="例：090-1234-5678" /></F>

        <Button label={more ? '詳しい項目を閉じる' : '詳しい項目を開く（あとからでも足せます）'}
          variant="ghost" onPress={() => setMore(!more)} style={{ marginTop: 14 }} />

        {more && (
          <>
            <F label="設置場所の呼び名"><I value={room} onChangeText={setRoom} placeholder="例：リビング" /></F>
            <F label="メーカー"><I value={maker} onChangeText={setMaker} placeholder="例：YAMAHA" /></F>
            <F label="型番"><I value={model} onChangeText={setModel} placeholder="例：U3" /></F>
            <F label="調律の料金（円）"><I value={fee} onChangeText={setFee} inputMode="numeric" /></F>
            <F label="都道府県"><I value={region} onChangeText={setRegion} placeholder="例：神奈川県" /></F>
            <F label="市区町村"><I value={city} onChangeText={setCity} placeholder="例：横浜市青葉区" /></F>
            <F label="番地"><I value={line1} onChangeText={setLine1} placeholder="例：あざみ野1-14-2" /></F>
          </>
        )}

        <Button label="登録する" onPress={save} style={{ marginTop: 18 }} />
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
function Hint({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return <Text style={{ color: c.ink2, fontSize: 13 }}>{children}</Text>;
}
function I(props: React.ComponentProps<typeof TextInput>) {
  const c = useColors();
  return (
    <TextInput
      {...props}
      placeholderTextColor={c.ink3}
      style={[st.input, { backgroundColor: c.surface, borderColor: c.line, color: c.ink }]}
    />
  );
}

const st = StyleSheet.create({
  pad: { padding: 18, gap: 6, paddingBottom: 48 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, minHeight: MIN_TAP + 4, fontSize: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: {
    borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, fontWeight: '700', overflow: 'hidden',
  },
});
