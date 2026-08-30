import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button, Card, Title } from '../components/ui';
import { PhotoField } from '../components/PhotoField';
import { addMonths, fmtJ, fromIso, iso, today } from '../lib/date';
import { KINDS, dueDate, type RecordKind } from '../lib/cycle';
import { money } from '../lib/pricing';
import { pianoName } from '../lib/select';
import { uid } from '../store/db';
import { useApp } from '../store/AppContext';
import { MIN_TAP, useColors } from '../theme/useColors';
import { PAY_METHODS, type PayMethod, type WorkRecord } from '../types';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'RecordForm'>;

/** 現場は1台2〜3時間の肉体作業の直後。キーボードを出さずに終われるようにする */
const MEMO_CHIPS = [
  '問題なし', '弦の状態は良好', 'ハンマーの摩耗あり', '整調を次回提案',
  '湿度が高め', 'ペダルに軋みあり', '鍵盤の高さを調整', '次回は整音を提案',
];
const PITCHES = ['440', '441', '442', '443'];
const HUMIDS = [
  { v: 'dry', n: '乾燥ぎみ' }, { v: 'ok', n: 'ちょうどよい' },
  { v: 'high', n: '高め' }, { v: 'wet', n: 'かなり高い' },
];

export default function RecordFormScreen({ route, navigation }: Props) {
  const c = useColors();
  const { customerId, pianoId, recordId } = route.params;
  const { find, saveRecord, updateRecord, deleteRecord } = useApp();

  const customer = find(customerId);
  const piano = customer?.pianos.find((p) => p.id === pianoId);
  const existing = recordId ? piano?.history.find((h) => h.id === recordId) : undefined;

  const [date, setDate] = useState(existing?.date ?? iso(today()));
  const [kind, setKind] = useState<RecordKind>(existing?.kind ?? 'tuning');
  const [work, setWork] = useState(existing?.work ?? KINDS[0].works[0]);
  const [fee, setFee] = useState(String(existing?.fee ?? piano?.fee ?? 13000));
  const [memo, setMemo] = useState(existing?.memo ?? '');
  const [pitch, setPitch] = useState(existing?.pitch ?? '');
  const [humid, setHumid] = useState(existing?.humid ?? '');
  const [pay, setPay] = useState<PayMethod>(existing?.pay ?? '現金');
  const [photoBefore, setPhotoBefore] = useState<string | null>(existing?.photoBefore ?? null);
  const [photoAfter, setPhotoAfter] = useState<string | null>(existing?.photoAfter ?? null);

  // 既定の次回日。ここから変えたときだけ「この回かぎりの上書き」として持つ
  const defaultNext = useMemo(
    () => (piano ? iso(addMonths(today(), piano.intervalMonths)) : ''),
    [piano]
  );
  const [nextDue, setNextDue] = useState(existing ? (piano?.nextDue ?? defaultNext) : defaultNext);

  if (!customer || !piano) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.ground }}>
        <Text style={{ padding: 20, color: c.ink }}>対象が見つかりません。</Text>
      </SafeAreaView>
    );
  }

  const kindDef = KINDS.find((k) => k.k === kind) ?? KINDS[0];

  const onSave = async () => {
    const rec: WorkRecord = {
      id: existing?.id ?? uid('r'),
      date,
      kind,
      work,
      fee: parseInt(fee, 10) || 0,
      memo,
      pitch,
      humid,
      cond: existing?.cond ?? null,
      photoBefore,
      photoAfter,
      via: existing?.via ?? piano.remindedCycle === iso(dueDate(piano)),
      pay,
      bill: pay === '請求書（後日振込）' ? 'unbilled' : 'paid',
    };

    const ok = existing
      ? await updateRecord(customerId, pianoId, rec)
      : await saveRecord(customerId, pianoId, rec, kind === 'tuning' && nextDue !== defaultNext ? nextDue : null);

    // 保存できていないのに「記録しました」とは言わない
    if (!ok) {
      Alert.alert('保存できませんでした', '端末の空き容量が不足しています。空きを作ってからもう一度お試しください。');
      return;
    }
    navigation.goBack();
  };

  const onDelete = () => {
    Alert.alert('この記録を取り消しますか', '元に戻せません。次回のご案内時期は、ひとつ前の記録をもとに計算し直します。', [
      { text: 'やめておく', style: 'cancel' },
      {
        text: '取り消す',
        style: 'destructive',
        onPress: async () => {
          const ok = await deleteRecord(customerId, pianoId, existing!.id);
          if (ok) navigation.goBack();
          else Alert.alert('保存できませんでした', '端末の空き容量が不足しています。');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.ground }} edges={['bottom']}>
      <ScrollView contentContainerStyle={st.pad} keyboardShouldPersistTaps="handled">
        <Title>{existing ? '記録を直す' : '記録'}</Title>
        <Text style={{ color: c.ink2, fontSize: 14 }}>
          {customer.name} 様 ・ {piano.room}（{pianoName(piano)}）
        </Text>

        <Field label="実施日">
          <TextInput
            value={date} onChangeText={setDate} placeholder="2026-08-29"
            placeholderTextColor={c.ink3}
            style={[st.input, { backgroundColor: c.surface, borderColor: c.line, color: c.ink }]}
          />
        </Field>

        <Field label="お仕事の種類">
          <Chips
            items={KINDS.map((k) => ({ v: k.k, n: k.n }))}
            value={kind}
            onChange={(v) => {
              const nk = v as RecordKind;
              setKind(nk);
              setWork((KINDS.find((k) => k.k === nk) ?? KINDS[0]).works[0]);
            }}
          />
          <Text style={{ color: c.ink2, fontSize: 13, marginTop: 6 }}>
            {kindDef.cycle
              ? 'この記録が、次回のご案内時期のもとになります。'
              : '単発のお仕事です。調律の周期は動きません。'}
          </Text>
        </Field>

        <Field label="作業内容">
          <Chips items={kindDef.works.map((w) => ({ v: w, n: w }))} value={work} onChange={setWork} />
        </Field>

        <Field label="料金（円）">
          <TextInput
            value={fee} onChangeText={setFee} inputMode="numeric"
            style={[st.input, { backgroundColor: c.surface, borderColor: c.line, color: c.ink }]}
          />
          <Text style={{ color: c.ink2, fontSize: 13, marginTop: 4 }}>{money(parseInt(fee, 10) || 0)}</Text>
        </Field>

        <Field label="基準ピッチ">
          <Chips items={PITCHES.map((p) => ({ v: p, n: `A=${p}` }))} value={pitch} onChange={setPitch} allowEmpty />
        </Field>

        <Field label="室内の湿度">
          <Chips items={HUMIDS.map((h) => ({ v: h.v, n: h.n }))} value={humid} onChange={setHumid} allowEmpty />
        </Field>

        <Field label="メモ">
          <Chips items={MEMO_CHIPS.map((m) => ({ v: m, n: m }))} value={memo} onChange={setMemo} allowEmpty />
          <TextInput
            value={memo} onChangeText={setMemo} multiline placeholder="直接ご記入もできます"
            placeholderTextColor={c.ink3}
            style={[st.input, st.area, { backgroundColor: c.surface, borderColor: c.line, color: c.ink }]}
          />
        </Field>

        <Field label="写真">
          <PhotoField
            label="作業前"
            name={photoBefore}
            consent={customer.photoConsent}
            onChange={setPhotoBefore}
          />
          <View style={{ height: 12 }} />
          <PhotoField
            label="作業後"
            name={photoAfter}
            consent={customer.photoConsent}
            onChange={setPhotoAfter}
          />
          {customer.photoConsent === null && (
            <Text style={{ color: c.ink2, fontSize: 13, lineHeight: 20, marginTop: 6 }}>
              写真はこの端末の中だけに残ります。お客様の情報の画面で、保存の同意を記録しておけます。
            </Text>
          )}
        </Field>

        <Field label="お支払い">
          <Chips items={PAY_METHODS.map((p) => ({ v: p, n: p }))} value={pay} onChange={(v) => setPay(v as PayMethod)} />
        </Field>

        {kindDef.cycle && !existing && (
          <Field label="次回のご案内予定日">
            <TextInput
              value={nextDue} onChangeText={setNextDue}
              style={[st.input, { backgroundColor: c.surface, borderColor: c.line, color: c.ink }]}
            />
            <Text style={{ color: c.ink2, fontSize: 13, marginTop: 4 }}>
              {nextDue === defaultNext
                ? `標準の周期（${piano.intervalMonths}ヶ月）どおりです。`
                : 'この回だけの予定になります。標準の周期は変わりません。'}
            </Text>
          </Field>
        )}

        <Button label={existing ? 'この内容に直す' : '記録する'} onPress={onSave} style={{ marginTop: 10 }} />
        {existing && (
          <Button label="この記録を取り消す" variant="danger" onPress={onDelete} style={{ marginTop: 8 }} />
        )}
        <Button label="やめる" variant="ghost" onPress={() => navigation.goBack()} style={{ marginTop: 8 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={{ gap: 6, marginTop: 12 }}>
      <Text style={{ color: c.ink, fontSize: 14.5, fontWeight: '700' }}>{label}</Text>
      {children}
    </View>
  );
}

function Chips({
  items, value, onChange, allowEmpty,
}: {
  items: { v: string; n: string }[]; value: string;
  onChange: (v: string) => void; allowEmpty?: boolean;
}) {
  const c = useColors();
  return (
    <View style={st.chips}>
      {items.map((it) => {
        const on = it.v === value;
        return (
          <Pressable
            key={it.v}
            onPress={() => onChange(on && allowEmpty ? '' : it.v)}
            style={[st.chip, { backgroundColor: on ? c.accent : c.surface, borderColor: on ? c.accent : c.lineStrong }]}
          >
            <Text style={{ color: on ? c.onAccent : c.ink2, fontSize: 14, fontWeight: '700' }}>{it.n}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const st = StyleSheet.create({
  pad: { padding: 18, paddingBottom: 48 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, minHeight: MIN_TAP + 4, fontSize: 16 },
  area: { minHeight: 88, paddingTop: 12, textAlignVertical: 'top', marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, minHeight: MIN_TAP, justifyContent: 'center' },
});
