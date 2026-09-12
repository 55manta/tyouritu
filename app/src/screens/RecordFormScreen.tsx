import React, { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button, Card, Title } from '../components/ui';
import { PhotoField } from '../components/PhotoField';
import { addMonths, fmtJ, fmtJd, fromIso, iso, today } from '../lib/date';
import { KINDS, dueDate, type RecordKind } from '../lib/cycle';
import { gapText, money } from '../lib/pricing';
import { condTodo, pianoName, recordTotal } from '../lib/select';
import { uid } from '../store/db';
import { useApp } from '../store/AppContext';
import { MIN_TAP, useColors } from '../theme/useColors';
import {
  PAY_METHODS, WORK_MENU, type AddWork, type Condition, type CondLevel, type PayMethod, type Visit, type WorkRecord,
} from '../types';
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

const COND_ITEMS: { k: keyof Condition; label: string }[] = [
  { k: 'strings', label: '弦・チューニングピン' },
  { k: 'action', label: 'ハンマー・アクション' },
  { k: 'keys', label: '鍵盤・タッチ' },
  { k: 'humid', label: '湿度・設置環境' },
];
const COND_LV: Record<CondLevel, string> = { ok: '良好', watch: '経過観察', act: '要相談' };

/** 前回「要相談」だった項目は、今回は「経過観察」から始める（直っていないかもしれないため） */
function condFromPrev(prev: Condition | null): Condition {
  const base: Condition = { strings: 'ok', action: 'ok', keys: 'ok', humid: 'ok' };
  if (!prev) return base;
  COND_ITEMS.forEach(({ k }) => { if (prev[k] === 'act') base[k] = 'watch'; });
  return base;
}

const humidLabel = (v: string) => HUMIDS.find((h) => h.v === v)?.n ?? v;

/** 臨時のご依頼（SpotJob）でお客様から伺った事前のお困りごとのうち、この台に対する最新のもの */
function findIntake(visits: Visit[], pianoId: string): Visit | null {
  let best: Visit | null = null;
  visits.forEach((v) => {
    if (!v.intake) return;
    if (!v.pianoIds.includes(pianoId)) return;
    if (!best || v.date > best.date) best = v;
  });
  return best;
}

export default function RecordFormScreen({ route, navigation }: Props) {
  const c = useColors();
  const { customerId, pianoId, recordId } = route.params;
  const { find, saveRecord, updateRecord, deleteRecord } = useApp();

  const customer = find(customerId);
  const piano = customer?.pianos.find((p) => p.id === pianoId);
  const existing = recordId ? piano?.history.find((h) => h.id === recordId) : undefined;
  const prev = !existing ? piano?.history[0] : undefined;

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
  const [cond, setCond] = useState<Condition | null>(existing?.cond ?? null);
  const [addWorks, setAddWorks] = useState<AddWork[]>(() => {
    if (existing) return existing.addWorks ?? [];
    // 前回「要相談」だった項目は、追加作業の候補として最初から挙げておく
    const suggestKeys: string[] = [];
    if (prev?.cond?.action === 'act') suggestKeys.push('seichou');
    if (prev?.cond?.strings === 'act') suggestKeys.push('string');
    if (prev?.cond?.humid === 'act') suggestKeys.push('dry');
    return WORK_MENU.filter((m) => suggestKeys.includes(m.key))
      .map((m) => ({ key: m.key, name: m.name, fee: m.fee }));
  });
  const [approvedAt, setApprovedAt] = useState<string | null>(existing?.addWorksApprovedAt ?? null);
  const [approvalOpen, setApprovalOpen] = useState(false);

  const addWorksTotal = addWorks.reduce((s, w) => s + w.fee, 0);
  const intake = customer && piano ? findIntake(customer.visits, piano.id) : null;

  const toggleWork = (key: string) => {
    setApprovedAt(null);
    setAddWorks((ws) => {
      if (ws.some((w) => w.key === key)) return ws.filter((w) => w.key !== key);
      const m = WORK_MENU.find((x) => x.key === key)!;
      return [...ws, { key: m.key, name: m.name, fee: m.fee }];
    });
  };

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
      cond,
      addWorks,
      addWorksApprovedAt: approvedAt,
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

        {prev && (
          <Card style={{ marginTop: 10 }}>
            <Text style={{ color: c.ink, fontSize: 14.5, fontWeight: '800' }}>前回の記録</Text>
            <View style={st.kv}>
              <Text style={{ color: c.ink2, fontSize: 13.5 }}>
                {fmtJd(fromIso(prev.date))}（{gapText(prev.date)}前）
              </Text>
              <Text style={{ color: c.ink, fontSize: 13.5, fontWeight: '700' }}>{prev.work}</Text>
            </View>
            <View style={st.kv}>
              <Text style={{ color: c.ink2, fontSize: 13.5 }}>前回の料金</Text>
              <Text style={{ color: c.ink, fontSize: 13.5 }}>{money(recordTotal(prev))}</Text>
            </View>
            {prev.pitch ? (
              <View style={st.kv}>
                <Text style={{ color: c.ink2, fontSize: 13.5 }}>前回のピッチ</Text>
                <Text style={{ color: c.ink, fontSize: 13.5 }}>A={prev.pitch} Hz</Text>
              </View>
            ) : null}
            {prev.humid ? (
              <View style={st.kv}>
                <Text style={{ color: c.ink2, fontSize: 13.5 }}>前回の湿度</Text>
                <Text style={{ color: c.ink, fontSize: 13.5 }}>{humidLabel(prev.humid)}</Text>
              </View>
            ) : null}
            {condTodo(prev).length > 0 && (
              <Text style={[st.warn, { color: c.brassInk, backgroundColor: c.brassSoft }]}>
                申し送り　{condTodo(prev).join('／')} を要相談として記録しています
              </Text>
            )}
            {prev.memo ? (
              <Text style={{ color: c.ink2, fontSize: 13, marginTop: 4 }}>前回のメモ　{prev.memo}</Text>
            ) : null}
          </Card>
        )}

        {intake && (
          <Card style={{ marginTop: 10, backgroundColor: c.brassSoft, borderColor: c.brass }}>
            <Text style={{ color: c.brassInk, fontSize: 14, fontWeight: '800' }}>お客様からの事前のお申し出</Text>
            <Text style={{ color: c.ink, fontSize: 13.5 }}>
              {intake.intake!.items.length ? intake.intake!.items.join('／') : '（選択なし）'}
            </Text>
            {intake.intake!.note ? (
              <Text style={{ color: c.ink2, fontSize: 13, marginTop: 4 }}>「{intake.intake!.note}」</Text>
            ) : null}
          </Card>
        )}

        {prev && (
          <Button
            label={`前回（${fmtJ(fromIso(prev.date))}）と同じ内容にする`}
            variant="ghost"
            style={{ marginTop: 10 }}
            onPress={() => {
              // 種別（kind）とお支払い方法は引き継がない。今回の実際の仕事とは限らないため
              setWork(prev.work);
              if (prev.pitch) setPitch(prev.pitch);
              if (prev.humid) setHumid(prev.humid);
              if (prev.memo) setMemo(prev.memo);
              if (prev.cond) setCond(prev.cond);
            }}
          />
        )}

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

        <Field label="追加で必要な作業">
          <View style={{ gap: 8 }}>
            {WORK_MENU.map((it) => {
              const on = addWorks.some((w) => w.key === it.key);
              return (
                <Pressable key={it.key} onPress={() => toggleWork(it.key)}
                  style={[st.awItem, { backgroundColor: on ? c.accentSoft : c.surface, borderColor: on ? c.accent : c.lineStrong }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.ink, fontSize: 14.5, fontWeight: '700' }}>{it.name}</Text>
                    <Text style={{ color: c.ink2, fontSize: 12.5 }}>{it.why}</Text>
                  </View>
                  <Text style={{ color: c.ink, fontSize: 14, fontWeight: '700' }}>{money(it.fee)}</Text>
                </Pressable>
              );
            })}
          </View>
          {addWorks.length > 0 && (
            <>
              <View style={st.awState}>
                <View style={st.kv}>
                  <Text style={{ color: c.ink2, fontSize: 13.5 }}>追加作業 {addWorks.length}件</Text>
                  <Text style={{ color: c.ink, fontSize: 13.5, fontWeight: '700' }}>{money(addWorksTotal)}</Text>
                </View>
                <View style={st.kv}>
                  <Text style={{ color: c.ink, fontSize: 14, fontWeight: '800' }}>合計（調律ぶんを含む）</Text>
                  <Text style={{ color: c.ink, fontSize: 14, fontWeight: '800' }}>
                    {money((parseInt(fee, 10) || 0) + addWorksTotal)}
                  </Text>
                </View>
                <Text style={{ color: approvedAt ? c.accentInk : c.overdueInk, fontSize: 13, marginTop: 4 }}>
                  {approvedAt ? `承諾済み　${approvedAt}` : 'まだ承諾をいただいていません。金額をお見せしてから作業に入ってください。'}
                </Text>
              </View>
              <Button
                label={approvedAt ? '承諾内容をもう一度見せる' : 'お客様に見せて承諾をもらう'}
                variant="ghost"
                style={{ marginTop: 8 }}
                onPress={() => setApprovalOpen(true)}
              />
            </>
          )}
        </Field>

        <Field label="基準ピッチ">
          <Chips items={PITCHES.map((p) => ({ v: p, n: `A=${p}` }))} value={pitch} onChange={setPitch} allowEmpty />
        </Field>

        <Field label="室内の湿度">
          <Chips items={HUMIDS.map((h) => ({ v: h.v, n: h.n }))} value={humid} onChange={setHumid} allowEmpty />
        </Field>

        <Field label="ピアノの状態">
          <View style={st.condQuick}>
            <Pressable
              onPress={() => setCond(null)}
              style={[st.condBtn, { backgroundColor: cond === null ? c.accent : c.surface, borderColor: cond === null ? c.accent : c.lineStrong }]}
            >
              <Text style={{ color: cond === null ? c.onAccent : c.ink2, fontSize: 14, fontWeight: '700' }}>今回は特に問題なし</Text>
            </Pressable>
            <Pressable
              onPress={() => setCond((v) => v ?? condFromPrev(prev?.cond ?? null))}
              style={[st.condBtn, { backgroundColor: cond ? c.accent : c.surface, borderColor: cond ? c.accent : c.lineStrong }]}
            >
              <Text style={{ color: cond ? c.onAccent : c.ink2, fontSize: 14, fontWeight: '700' }}>気になる点があった</Text>
            </Pressable>
          </View>
          {cond && (
            <View style={{ marginTop: 10, gap: 10 }}>
              {COND_ITEMS.map(({ k, label }) => (
                <View key={k}>
                  <Text style={{ color: c.ink, fontSize: 13.5, fontWeight: '700', marginBottom: 5 }}>{label}</Text>
                  <Chips
                    items={(['ok', 'watch', 'act'] as const).map((lv) => ({ v: lv, n: COND_LV[lv] }))}
                    value={cond[k]}
                    onChange={(v) => setCond({ ...cond, [k]: v as CondLevel })}
                  />
                </View>
              ))}
            </View>
          )}
          <Text style={{ color: c.ink2, fontSize: 13, marginTop: 6 }}>
            押さなければ「記録なし」になります。
          </Text>
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

      <ApprovalSheet
        visible={approvalOpen}
        customerName={customer.name}
        pianoLabel={`${piano.room}（${pianoName(piano)}）`}
        works={addWorks}
        tuneFee={parseInt(fee, 10) || 0}
        approved={!!approvedAt}
        onClose={() => setApprovalOpen(false)}
        onDecline={() => { setAddWorks([]); setApprovedAt(null); setApprovalOpen(false); }}
        onApprove={() => {
          const now = new Date();
          setApprovedAt(`${fmtJd(today())} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} 口頭で承諾`);
        }}
      />
    </SafeAreaView>
  );
}

/** 追加作業の内容・金額・しない場合のリスクを、お客様に見せて承諾をもらうためのシート */
function ApprovalSheet({
  visible, customerName, pianoLabel, works, tuneFee, approved, onClose, onDecline, onApprove,
}: {
  visible: boolean;
  customerName: string;
  pianoLabel: string;
  works: AddWork[];
  tuneFee: number;
  approved: boolean;
  onClose: () => void;
  onDecline: () => void;
  onApprove: () => void;
}) {
  const c = useColors();
  if (!visible) return null;
  const total = works.reduce((s, w) => s + w.fee, 0);
  const menuByKey = Object.fromEntries(WORK_MENU.map((m) => [m.key, m]));

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={[st.scrim, { backgroundColor: c.scrim }]}>
        <View style={[st.sheet, { backgroundColor: c.surface, borderColor: c.line }]}>
          <ScrollView contentContainerStyle={st.sheetPad}>
            <Text style={{ color: c.ink, fontSize: 19, fontWeight: '800' }}>
              {approved ? '承諾をいただきました' : '追加作業のご確認'}
            </Text>
            <Text style={{ color: c.ink2, fontSize: 13.5 }}>{customerName} 様 ・ {pianoLabel}</Text>

            {works.map((w) => {
              const m = menuByKey[w.key];
              return (
                <View key={w.key} style={[st.apWork, { borderColor: c.line }]}>
                  <View style={st.kv}>
                    <Text style={{ color: c.ink, fontSize: 15, fontWeight: '700' }}>{w.name}</Text>
                    <Text style={{ color: c.ink, fontSize: 15, fontWeight: '700' }}>{money(w.fee)}</Text>
                  </View>
                  {m ? <Text style={{ color: c.ink2, fontSize: 13 }}>{m.why}</Text> : null}
                  {m ? (
                    <Text style={{ color: c.overdueInk, fontSize: 13, marginTop: 4 }}>
                      しない場合：{m.risk}
                    </Text>
                  ) : null}
                </View>
              );
            })}

            <View style={[st.kv, { marginTop: 4 }]}>
              <Text style={{ color: c.ink2, fontSize: 14 }}>追加ぶんの合計</Text>
              <Text style={{ color: c.ink, fontSize: 14, fontWeight: '700' }}>{money(total)}</Text>
            </View>
            <View style={[st.kv, { backgroundColor: c.accentSoft, padding: 10, borderRadius: 10 }]}>
              <Text style={{ color: c.ink, fontSize: 14, fontWeight: '700' }}>本日のお支払い（調律 {money(tuneFee)} を含む）</Text>
              <Text style={{ color: c.ink, fontSize: 14, fontWeight: '800' }}>{money(tuneFee + total)}</Text>
            </View>

            {approved ? (
              <>
                <Text style={{ color: c.ink2, fontSize: 13, lineHeight: 20 }}>
                  承諾の日時を記録に残しました。あとから「聞いていない」となることを防げます。
                </Text>
                <Button label="作業に入る" onPress={onClose} style={{ marginTop: 8 }} />
              </>
            ) : (
              <>
                <Text style={{ color: c.ink2, fontSize: 13, lineHeight: 20 }}>
                  この画面をお客様にお見せしてください。金額と、やらない場合に何が起きるかを先に共有しておくのが要点です。
                </Text>
                <View style={st.row}>
                  <Button label="今回は見送る" variant="ghost" style={{ flex: 1 }} onPress={onDecline} />
                  <Button label="承諾をいただいた" style={{ flex: 2 }} onPress={onApprove} />
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
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
  condQuick: { flexDirection: 'row', gap: 8 },
  condBtn: { flex: 1, borderWidth: 1, borderRadius: 12, minHeight: MIN_TAP + 4, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  awItem: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, padding: 12, minHeight: MIN_TAP + 4 },
  awState: { marginTop: 10, gap: 4 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  row: { flexDirection: 'row', gap: 8, marginTop: 8 },
  warn: { fontSize: 13, lineHeight: 20, marginTop: 6, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 10, overflow: 'hidden' },
  scrim: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1, maxHeight: '88%' },
  sheetPad: { padding: 20, gap: 12, paddingBottom: 34 },
  apWork: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
});
