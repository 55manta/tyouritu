import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button, Title } from '../components/ui';
import { useApp } from '../store/AppContext';
import { MIN_TAP, useColors } from '../theme/useColors';
import { CUSTOMER_KINDS, type CustomerKind } from '../types';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'EditCustomer'>;

const PARKING_OPTIONS = ['敷地内に駐車可', '近隣のコインパーキング', '路上（短時間のみ）', '駐車不可・要相談'];

/**
 * お客様の情報を直す。
 * 登録時に「詳しい項目」を開かなかった場合、住所やメモなどを後から足す唯一の入口。
 */
export default function EditCustomerScreen({ route, navigation }: Props) {
  const c = useColors();
  const { id } = route.params;
  const { find, updateCustomer } = useApp();
  const customer = find(id);

  const [name, setName] = useState(customer?.name ?? '');
  const [kana, setKana] = useState(customer?.kana ?? '');
  const [kind, setKind] = useState<CustomerKind>(customer?.kind ?? '一般家庭');
  const [phone, setPhone] = useState(customer?.phone ?? '');
  const [email, setEmail] = useState(customer?.email ?? '');
  const [line, setLine] = useState(customer?.line ?? '');
  const [postal, setPostal] = useState(customer?.addr.postal ?? '');
  const [region, setRegion] = useState(customer?.addr.region ?? '');
  const [city, setCity] = useState(customer?.addr.city ?? '');
  const [line1, setLine1] = useState(customer?.addr.line1 ?? '');
  const [line2, setLine2] = useState(customer?.addr.line2 ?? '');
  const [parking, setParking] = useState(customer?.parking ?? '');
  const [access, setAccess] = useState(customer?.access ?? '');
  const [memo, setMemo] = useState(customer?.memo ?? '');

  if (!customer) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.ground }}>
        <Text style={{ padding: 20, color: c.ink }}>お客様が見つかりません。</Text>
      </SafeAreaView>
    );
  }

  const save = async () => {
    if (!name.trim()) { Alert.alert('お名前を入力してください'); return; }
    const ok = await updateCustomer(id, {
      name: name.trim(), kana: kana.trim(), kind,
      phone: phone.trim(), email: email.trim(), line: line.trim(),
      addr: {
        country: customer.addr.country,
        postal: postal.trim(), region: region.trim(), city: city.trim(),
        line1: line1.trim(), line2: line2.trim(),
      },
      parking, access: access.trim(), memo: memo.trim(),
    });
    if (!ok) { Alert.alert('保存できませんでした', '端末の空き容量が不足しています。'); return; }
    navigation.goBack();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.ground }} edges={['bottom']}>
      <ScrollView contentContainerStyle={st.pad} keyboardShouldPersistTaps="handled">
        <Title>お客様の情報を直す</Title>

        <F label="お名前 *"><I value={name} onChangeText={setName} placeholder="例：山田 花子" /></F>
        <F label="ふりがな"><I value={kana} onChangeText={setKana} placeholder="例：やまだ はなこ" /></F>
        <F label="お客様の種類">
          <View style={st.chips}>
            {CUSTOMER_KINDS.map((k) => {
              const on = k === kind;
              return (
                <Text key={k} onPress={() => setKind(k)}
                  style={[st.chip, { backgroundColor: on ? c.accent : c.surface, borderColor: on ? c.accent : c.lineStrong, color: on ? c.onAccent : c.ink2 }]}>
                  {k}
                </Text>
              );
            })}
          </View>
        </F>

        <Text style={[st.sec, { color: c.ink }]}>ご連絡先</Text>
        <F label="電話番号・SMS"><I value={phone} onChangeText={setPhone} placeholder="例：090-1234-5678" /></F>
        <F label="メールアドレス"><I value={email} onChangeText={setEmail} placeholder="例：hanako@example.com" keyboardType="email-address" autoCapitalize="none" /></F>
        <F label="LINE名（つながっている場合）"><I value={line} onChangeText={setLine} placeholder="例：はなこ（LINE表示名）" /></F>

        <Text style={[st.sec, { color: c.ink }]}>ご住所・訪問メモ</Text>
        <F label="郵便番号"><I value={postal} onChangeText={setPostal} placeholder="例：224-0032" /></F>
        <F label="都道府県"><I value={region} onChangeText={setRegion} placeholder="例：神奈川県" /></F>
        <F label="市区町村"><I value={city} onChangeText={setCity} placeholder="例：横浜市青葉区" /></F>
        <F label="番地"><I value={line1} onChangeText={setLine1} placeholder="例：あざみ野1-14-2" /></F>
        <F label="建物名・部屋番号"><I value={line2} onChangeText={setLine2} placeholder="例：パークサイド 402" /></F>
        <F label="駐車場">
          <View style={st.chips}>
            {PARKING_OPTIONS.map((p) => {
              const on = p === parking;
              return (
                <Text key={p} onPress={() => setParking(on ? '' : p)}
                  style={[st.chip, { backgroundColor: on ? c.accent : c.surface, borderColor: on ? c.accent : c.lineStrong, color: on ? c.onAccent : c.ink2 }]}>
                  {p}
                </Text>
              );
            })}
          </View>
        </F>
        <F label="搬入経路・室内メモ">
          <TextInput
            value={access} onChangeText={setAccess} multiline
            placeholder="例：掃き出し窓から直接入れる。エレベーターなし・3階。"
            placeholderTextColor={c.ink3}
            style={[st.input, st.area, { backgroundColor: c.surface, borderColor: c.line, color: c.ink }]}
          />
        </F>

        <Text style={[st.sec, { color: c.ink }]}>メモ</Text>
        <F label="メモ">
          <TextInput
            value={memo} onChangeText={setMemo} multiline
            placeholder="例：娘さんが受験期。夜間の使用が多い。"
            placeholderTextColor={c.ink3}
            style={[st.input, st.area, { backgroundColor: c.surface, borderColor: c.line, color: c.ink }]}
          />
        </F>

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
    <TextInput
      {...props}
      placeholderTextColor={c.ink3}
      style={[st.input, { backgroundColor: c.surface, borderColor: c.line, color: c.ink }]}
    />
  );
}

const st = StyleSheet.create({
  pad: { padding: 18, gap: 6, paddingBottom: 48 },
  sec: { fontSize: 15.5, fontWeight: '800', marginTop: 20 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, minHeight: MIN_TAP + 4, fontSize: 16 },
  area: { minHeight: 88, paddingTop: 12, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: {
    borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, fontWeight: '700', overflow: 'hidden',
  },
});
