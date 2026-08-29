import React, { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';

import { Button } from './ui';
import { channelsFor, openChannel, type ChannelKey } from '../lib/send';
import { MIN_TAP, useColors } from '../theme/useColors';
import type { Customer } from '../types';

/**
 * ご案内を送るシート。
 *
 * 送る前に必ず本文を見せる。お客様に届く文章を、調律師が読まずに送ることがないようにする。
 * 送信アプリが開けなかった場合に備えて、コピーの導線を常に置いておく。
 */
export function SendSheet({
  visible, customer, title, subtitle, subject, message, note, onClose, onSent,
}: {
  visible: boolean;
  customer: Customer | null;
  title: string;
  subtitle: string;
  subject: string;
  message: string;
  note?: string;
  onClose: () => void;
  onSent: (ch: ChannelKey) => void;
}) {
  const c = useColors();
  const [picked, setPicked] = useState<ChannelKey | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (visible) { setPicked(null); setCopied(false); }
  }, [visible]);

  if (!customer) return null;
  const chs = channelsFor(customer);
  const usable = chs.filter((x) => x.ok);

  const copy = async () => {
    await Clipboard.setStringAsync(message);
    setCopied(true);
  };

  const send = async () => {
    if (!picked) return;
    const res = await openChannel(picked, customer, subject, message);
    if (!res.ok) { Alert.alert('開けませんでした', res.reason); return; }
    onSent(picked);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[st.scrim, { backgroundColor: c.scrim }]}>
        <View style={[st.sheet, { backgroundColor: c.surface, borderColor: c.line }]}>
          <ScrollView contentContainerStyle={st.pad}>
            <Text style={[st.h, { color: c.ink }]}>{title}</Text>
            <Text style={{ color: c.ink2, fontSize: 14 }}>{subtitle}</Text>

            <View style={[st.preview, { backgroundColor: c.ground, borderColor: c.line }]}>
              <Text style={{ color: c.ink, fontSize: 14, lineHeight: 23 }}>{message}</Text>
            </View>

            <Pressable onPress={copy} style={[st.copy, { borderColor: c.lineStrong }]}>
              <Text style={{ color: c.accentInk, fontSize: 14, fontWeight: '700' }}>
                {copied ? 'コピーしました' : '文章をコピーする'}
              </Text>
            </Pressable>

            <Text style={[st.lead, { color: c.ink }]}>送信方法を選んでください</Text>
            <View style={st.chans}>
              {chs.map((ch) => {
                const on = picked === ch.key;
                return (
                  <Pressable
                    key={ch.key}
                    disabled={!ch.ok}
                    onPress={() => setPicked(ch.key)}
                    style={[st.chan, {
                      // 押せないものを薄くすると読めなくなる。地の色で示して文字は読めるままにする
                      backgroundColor: on ? c.accent : ch.ok ? c.surface : c.surface2,
                      borderColor: on ? c.accent : c.lineStrong,
                    }]}
                  >
                    <Text style={{ color: on ? c.onAccent : ch.ok ? c.ink : c.ink3, fontSize: 14.5, fontWeight: '700' }}>
                      {ch.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {usable.length === 0 ? (
              <Text style={{ color: c.overdueInk, fontSize: 13.5, lineHeight: 21 }}>
                連絡先が未登録です。お客様の情報に電話番号かメールを追加してください。
              </Text>
            ) : chs.some((x) => !x.ok) ? (
              // 押せない理由を書く。色を薄くするだけだと、故障と区別がつかない
              <Text style={{ color: c.ink2, fontSize: 12.5, lineHeight: 19 }}>
                {chs.filter((x) => !x.ok).map((x) => x.why).join('　')}
              </Text>
            ) : null}

            {picked === 'LINE' && (
              <Text style={{ color: c.ink2, fontSize: 13, lineHeight: 20 }}>
                LINEは宛先を指定して開けません。共有の画面が出ますので、そこで{customer.name} 様をお選びください。
              </Text>
            )}

            <Text style={{ color: c.ink2, fontSize: 13, lineHeight: 20 }}>
              {note || '送信先のアプリが立ち上がります。お返事は、そのアプリでご確認ください。'}
            </Text>

            <View style={st.acts}>
              <Button label="閉じる" variant="ghost" style={{ flex: 1 }} onPress={onClose} />
              <Button label="この内容で送る" style={{ flex: 1.4 }} disabled={!picked} onPress={send} />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1, maxHeight: '92%' },
  pad: { padding: 20, gap: 10, paddingBottom: 34 },
  h: { fontSize: 19, fontWeight: '800' },
  preview: { borderWidth: 1, borderRadius: 13, padding: 14, marginTop: 4 },
  copy: { borderWidth: 1, borderRadius: 11, minHeight: MIN_TAP, alignItems: 'center', justifyContent: 'center' },
  lead: { fontSize: 14.5, fontWeight: '800', marginTop: 6 },
  chans: { flexDirection: 'row', gap: 8 },
  chan: { flex: 1, borderWidth: 1, borderRadius: 12, minHeight: MIN_TAP + 4, alignItems: 'center', justifyContent: 'center' },
  acts: { flexDirection: 'row', gap: 9, marginTop: 8 },
});
