import React, { useState } from 'react';
import { Alert, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Title } from '../components/ui';
import { money } from '../lib/pricing';
import { useApp } from '../store/AppContext';
import { MIN_TAP, useColors } from '../theme/useColors';
import { FREE_LIMIT, PLANS, type ThemePref } from '../types';

/** Stack（他画面からの「設定」ボタン）とタブ、どちらから開いても使えるよう navigation の型は最小限にする */
type Props = { navigation: { goBack: () => void } };

const SYNC_LABEL: Record<'off' | 'syncing' | 'synced' | 'failed', string> = {
  off: '控えは止まっています',
  syncing: '控えを送っています…',
  synced: '控えを保存しています',
  failed: '控えを送れていません',
};

const THEMES: { k: ThemePref; label: string; note: string }[] = [
  { k: 'auto', label: '端末に合わせる', note: 'iPhone や Android 本体の設定に従います' },
  { k: 'light', label: '明るい', note: '昼の屋外でも見やすい配色に固定します' },
  { k: 'dark', label: '暗い', note: '薄暗いお部屋でまぶしくない配色に固定します' },
];

/**
 * 設定。
 * 数値は打ち間違えるので、入力したその場では保存せず「保存する」で確定する。
 * 選ぶだけのもの（表示テーマ・プラン）は、選んだ結果がすぐ見えるほうが分かるので即時に反映する。
 */
export default function SettingsScreen({ navigation }: Props) {
  const c = useColors();
  const {
    customers, settings, updateSettings, resetToSamples, clearAll,
    cloudAvailable, user, syncState, signInMethods, signIn, signOut, deleteAccount,
    purchasesAvailable, purchasePlan, restorePurchases,
  } = useApp();

  const [dur, setDur] = useState(String(settings.durationMinutes));
  const [rate, setRate] = useState(String(settings.taxRate));
  const [doc, setDoc] = useState<null | 'privacy' | 'terms'>(null);
  const [buying, setBuying] = useState<'monthly' | 'yearly' | 'restore' | null>(null);

  const buy = async (plan: 'monthly' | 'yearly') => {
    if (!purchasesAvailable) {
      Alert.alert('この端末では購入できません', 'iPhone実機のApp Storeからお試しください。');
      return;
    }
    setBuying(plan);
    const r = await purchasePlan(plan);
    setBuying(null);
    if (!r.ok && r.reason) Alert.alert('お手続きが完了しませんでした', r.reason);
  };

  const restore = async () => {
    setBuying('restore');
    const r = await restorePurchases();
    setBuying(null);
    if (!r.ok) { if (r.reason) Alert.alert('復元できませんでした', r.reason); return; }
    Alert.alert('確認しました', '購入の状況を反映しました。');
  };

  const manageSubscription = () => {
    Linking.openURL(
      Platform.OS === 'ios'
        ? 'itms-apps://apps.apple.com/account/subscriptions'
        : 'https://apps.apple.com/account/subscriptions'
    );
  };

  const requestDeleteAccount = () => {
    Alert.alert(
      'アカウントを削除しますか',
      'サインインに使ったアカウントと、クラウド上の台帳の控えが削除されます。元に戻せません。\n\n台帳そのものはこの端末に残ります。',
      [
        { text: 'やめておく', style: 'cancel' },
        {
          text: '削除する',
          style: 'destructive',
          onPress: async () => {
            const r = await deleteAccount();
            if (!r.ok) Alert.alert('削除できませんでした', r.reason);
          },
        },
      ]
    );
  };

  const taxable = settings.taxMode === 'incl';
  const pro = settings.plan !== 'free';

  const save = async () => {
    const d = parseInt(dur, 10);
    const r = parseFloat(rate);
    const ok = await updateSettings({
      durationMinutes: isFinite(d) && d > 0 ? d : 120,
      taxRate: isFinite(r) && r >= 0 && r <= 100 ? r : 10,
    });
    if (!ok) { Alert.alert('保存できませんでした', '端末の空き容量が不足しています。'); return; }
    navigation.goBack();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.ground }} edges={['bottom']}>
      <ScrollView contentContainerStyle={st.pad}>
        <Title>設定</Title>

        {cloudAvailable && (
          <>
            <Text style={[st.sec, { color: c.ink }]}>台帳の控え</Text>
            <Card style={{ borderColor: user ? c.accent : c.line }}>
              {user ? (
                <>
                  <Text style={{ color: c.ink, fontSize: 15, fontWeight: '700' }}>
                    {SYNC_LABEL[syncState]}
                  </Text>
                  {user.email ? (
                    <Text style={{ color: c.ink2, fontSize: 13.5 }}>{user.email}</Text>
                  ) : null}
                  <Text style={{ color: c.ink2, fontSize: 13, lineHeight: 20 }}>
                    端末を無くしても、新しい端末で同じアカウントからサインインすれば台帳が戻ります。{'\n'}
                    ただし作業の写真は、この端末の中だけに残ります。
                  </Text>
                  {syncState === 'failed' && (
                    <Text style={{ color: c.overdueInk, fontSize: 13, lineHeight: 20 }}>
                      控えを送れていません。台帳そのものはこの端末に残っています。通信できるところで、もう一度お試しください。
                    </Text>
                  )}
                  <Button
                    label="サインアウト"
                    variant="ghost"
                    style={{ marginTop: 6 }}
                    onPress={() =>
                      Alert.alert('サインアウトしますか', '台帳はこの端末に残ります。控えの更新だけが止まります。', [
                        { text: 'やめておく', style: 'cancel' },
                        { text: 'サインアウト', onPress: () => signOut() },
                      ])
                    }
                  />
                  <Button
                    label="アカウントを削除する"
                    variant="danger"
                    style={{ marginTop: 6 }}
                    onPress={requestDeleteAccount}
                  />
                </>
              ) : (
                <>
                  <Text style={{ color: c.ink, fontSize: 15, fontWeight: '700' }}>
                    いまは、この端末の中だけに保存されています
                  </Text>
                  <Text style={{ color: c.ink2, fontSize: 13.5, lineHeight: 21 }}>
                    端末を無くしたり、初期化したりすると、台帳は戻せません。{'\n'}
                    サインインしておくと控えが残り、新しい端末で元どおりに開けます。
                  </Text>
                  {signInMethods.length > 0 ? (
                    signInMethods.map((m) => (
                      <Button
                        key={m}
                        label={m === 'apple' ? 'Apple でサインイン' : 'Google でサインイン'}
                        style={{ marginTop: 6 }}
                        onPress={async () => {
                          const r = await signIn(m);
                          if (!r.ok && r.reason) Alert.alert('サインインできませんでした', r.reason);
                        }}
                      />
                    ))
                  ) : (
                    <Text style={{ color: c.ink2, fontSize: 13 }}>
                      この端末では、まだサインインの方法をご用意できていません。
                    </Text>
                  )}
                </>
              )}
            </Card>
          </>
        )}

        <Text style={[st.sec, { color: c.ink }]}>表示</Text>
        <Card>
          <View style={st.chips}>
            {THEMES.map((t) => {
              const on = settings.theme === t.k;
              return (
                <Pressable
                  key={t.k}
                  onPress={() => updateSettings({ theme: t.k })}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  style={[st.chip, {
                    backgroundColor: on ? c.accent : c.surface,
                    borderColor: on ? c.accent : c.lineStrong,
                  }]}
                >
                  <Text style={{ color: on ? c.onAccent : c.ink, fontSize: 14, fontWeight: '700' }}>{t.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={{ color: c.ink2, fontSize: 13, lineHeight: 20 }}>
            {THEMES.find((t) => t.k === settings.theme)?.note}
          </Text>
        </Card>

        <Text style={[st.sec, { color: c.ink }]}>作業</Text>
        <Card>
          <Text style={{ color: c.ink, fontSize: 14, fontWeight: '700' }}>1台あたりのめやす時間（分）</Text>
          <TextInput
            value={dur}
            onChangeText={setDur}
            keyboardType="number-pad"
            placeholder="120"
            placeholderTextColor={c.ink3}
            style={[st.input, { borderColor: c.lineStrong, color: c.ink, backgroundColor: c.surface }]}
          />
          <Text style={{ color: c.ink2, fontSize: 13, lineHeight: 20 }}>
            訪問前のご案内に書く所要時間と、前日の時間決めに使います。
          </Text>
        </Card>

        <Text style={[st.sec, { color: c.ink }]}>消費税</Text>
        <Card>
          <View style={st.chips}>
            {([['none', '免税事業者'], ['incl', '課税事業者']] as const).map(([v, label]) => {
              const on = settings.taxMode === v;
              return (
                <Pressable
                  key={v}
                  onPress={() => updateSettings({ taxMode: v })}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  style={[st.chip, {
                    backgroundColor: on ? c.accent : c.surface,
                    borderColor: on ? c.accent : c.lineStrong,
                  }]}
                >
                  <Text style={{ color: on ? c.onAccent : c.ink, fontSize: 14, fontWeight: '700' }}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={{ color: c.ink2, fontSize: 13, lineHeight: 20 }}>
            売上が1,000万円に届かない場合は免税事業者です。免税なら、消費税の内訳は出しません。
          </Text>
          {taxable && (
            <>
              <Text style={{ color: c.ink, fontSize: 14, fontWeight: '700', marginTop: 6 }}>消費税率（％）</Text>
              <TextInput
                value={rate}
                onChangeText={setRate}
                keyboardType="decimal-pad"
                placeholder="10"
                placeholderTextColor={c.ink3}
                style={[st.input, { borderColor: c.lineStrong, color: c.ink, backgroundColor: c.surface }]}
              />
            </>
          )}
        </Card>

        <View style={st.row}>
          <Button label="やめる" variant="ghost" style={{ flex: 1 }} onPress={() => navigation.goBack()} />
          <Button label="保存する" style={{ flex: 2 }} onPress={save} />
        </View>

        <Text style={[st.sec, { color: c.ink }]}>ご利用プラン</Text>
        <Card style={{ borderColor: pro ? c.accent : c.line }}>
          <Text style={{ color: c.ink2, fontSize: 12.5, fontWeight: '700' }}>
            {pro ? PLANS[settings.plan as 'monthly' | 'yearly'].name : '無料プラン'}
          </Text>
          <Text style={{ color: c.ink, fontSize: 20, fontWeight: '800' }}>
            お客様 {customers.length} 軒{pro ? '（無制限）' : ` / ${FREE_LIMIT} 軒`}
          </Text>
          {pro ? (
            <>
              <Text style={{ color: c.ink2, fontSize: 13.5 }}>
                {money(PLANS[settings.plan as 'monthly' | 'yearly'].price)} / {PLANS[settings.plan as 'monthly' | 'yearly'].unit}
              </Text>
              <Button label="サブスクリプションを管理する" variant="ghost" style={{ marginTop: 6 }}
                onPress={manageSubscription} />
            </>
          ) : (
            <>
              <Text style={{ color: c.ink2, fontSize: 13.5 }}>
                {customers.length >= FREE_LIMIT
                  ? '上限に達しています。新しく追加するときだけ、有料プランが必要です。'
                  : `あと ${FREE_LIMIT - customers.length} 軒まで登録できます。`}
              </Text>
              {(['yearly', 'monthly'] as const).map((k) => (
                <View key={k} style={[st.plan, { borderTopColor: c.line }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.ink, fontSize: 15, fontWeight: '700' }}>{PLANS[k].name}</Text>
                    <Text style={{ color: c.ink2, fontSize: 12.5 }}>{PLANS[k].note}</Text>
                  </View>
                  <Button
                    label={buying === k ? 'お手続き中…' : `${money(PLANS[k].price)}にする`}
                    onPress={() => buy(k)}
                    disabled={buying !== null}
                  />
                </View>
              ))}
              <Button
                label={buying === 'restore' ? '確認しています…' : '購入を復元する'}
                variant="ghost"
                style={{ marginTop: 6 }}
                onPress={restore}
                disabled={buying !== null}
              />
            </>
          )}
        </Card>

        <Text style={[st.sec, { color: c.ink }]}>お客様の情報について</Text>
        <View style={st.row}>
          <Button label="プライバシーポリシー" variant="ghost" style={{ flex: 1 }} onPress={() => setDoc('privacy')} />
          <Button label="利用規約" variant="ghost" style={{ flex: 1 }} onPress={() => setDoc('terms')} />
        </View>

        <Text style={[st.sec, { color: c.ink }]}>お試し用</Text>
        <Card>
          <Text style={{ color: c.ink2, fontSize: 13.5, lineHeight: 21 }}>
            いま入っているのはサンプルのお客様です。消すと、はじめて使うときの画面から始められます。
          </Text>
          <Button
            label="サンプルを消して最初から試す"
            variant="ghost"
            onPress={() =>
              Alert.alert('お客様をすべて消しますか', '登録されているお客様・ピアノ・作業の履歴が、すべて消えます。元に戻せません。', [
                { text: 'やめておく', style: 'cancel' },
                { text: '消す', style: 'destructive', onPress: async () => { await clearAll(); navigation.goBack(); } },
              ])
            }
          />
          <Button
            label="サンプルを入れ直す"
            variant="ghost"
            onPress={() =>
              Alert.alert('サンプルに戻しますか', 'いま入っているお客様はすべて置き換わります。元に戻せません。', [
                { text: 'やめておく', style: 'cancel' },
                { text: '入れ直す', style: 'destructive', onPress: async () => { await resetToSamples(); navigation.goBack(); } },
              ])
            }
          />
        </Card>
      </ScrollView>

      <DocSheet which={doc} onClose={() => setDoc(null)} />
    </SafeAreaView>
  );
}

/** 規約類。公開前に内容の確認が要るので、試作である旨をここに明記しておく */
function DocSheet({ which, onClose }: { which: null | 'privacy' | 'terms'; onClose: () => void }) {
  const c = useColors();
  if (!which) return null;

  const privacy: [string, string][] = [
    ['お預かりするもの', 'お客様のお名前・ご住所・お電話番号・メールアドレス、ピアノの情報、作業の履歴、および同意をいただいた場合の作業写真。'],
    ['使いみち', '調律のご案内、お見積り、作業報告書の作成にのみ使います。第三者へ提供したり、広告に使ったりすることはありません。'],
    ['写真について', 'お客様ごとに保存の同意をうかがい、辞退された場合は保存しません。'],
    ['削除のご要望', '「情報を消してほしい」とのお申し出があれば、写真を含めてすべて削除します。お客様の画面から実行できます。'],
    ['お問い合わせ', 'ご担当の調律師までお願いいたします。'],
  ];
  const terms: [string, string][] = [
    ['このアプリについて', 'ピアノ調律師の方が、ご自身のお客様の台帳を管理し、調律時期のご案内を行うための道具です。'],
    ['お客様の情報の管理', '登録された情報の正確さと、お客様への説明の責任は、ご利用の調律師の方にあります。個人情報取扱事業者としての義務が生じる場合があります。'],
    ['料金', `お客様 ${FREE_LIMIT} 軒までは無料。それを超える場合は月額 ${money(PLANS.monthly.price)}、または年額 ${money(PLANS.yearly.price)}。`],
    ['データの保管', 'いまのところ、データはこの端末の中にのみ保存されます。端末の紛失・初期化により失われることがあります。'],
  ];
  const items = which === 'privacy' ? privacy : terms;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={[st.scrim, { backgroundColor: c.scrim }]}>
        <View style={[st.sheet, { backgroundColor: c.surface, borderColor: c.line }]}>
          <ScrollView contentContainerStyle={st.docPad}>
            <Text style={{ color: c.ink, fontSize: 19, fontWeight: '800' }}>
              {which === 'privacy' ? 'プライバシーポリシー' : '利用規約'}
            </Text>
            {items.map(([h, b]) => (
              <View key={h} style={{ gap: 2 }}>
                <Text style={{ color: c.ink, fontSize: 14.5, fontWeight: '700' }}>{h}</Text>
                <Text style={{ color: c.ink2, fontSize: 14, lineHeight: 22 }}>{b}</Text>
              </View>
            ))}
            <Text style={{ color: c.brassInk, fontSize: 13, lineHeight: 20 }}>
              ※ これは試作版の文面です。公開前に内容の確認が必要です。
            </Text>
            <Button label="閉じる" onPress={onClose} style={{ marginTop: 6 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  pad: { padding: 18, gap: 10, paddingBottom: 48 },
  sec: { fontSize: 15.5, fontWeight: '800', marginTop: 10 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, minHeight: MIN_TAP + 4, fontSize: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: {
    borderWidth: 1, borderRadius: 999, paddingHorizontal: 14,
    minHeight: MIN_TAP, justifyContent: 'center',
  },
  row: { flexDirection: 'row', gap: 9, marginTop: 6 },
  plan: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, paddingTop: 10, marginTop: 6 },
  scrim: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1, maxHeight: '88%' },
  docPad: { padding: 20, gap: 12, paddingBottom: 34 },
});
