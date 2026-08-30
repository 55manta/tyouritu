import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { capturePhoto, deletePhoto, photoExists, photoUri } from '../lib/photos';
import { MIN_TAP, useColors } from '../theme/useColors';

/**
 * 作業前・作業後の写真。
 *
 * お客様が写真の保存を辞退されている場合は、そもそも取り込まない。
 * 「同意を得たものだけを持つ」は運用ではなく、ここで止める。
 */
export function PhotoField({
  label, name, consent, onChange,
}: {
  label: string;
  name: string | null;
  /** お客様の同意。'no' なら取り込ませない */
  consent: 'yes' | 'no' | null;
  onChange: (name: string | null) => void;
}) {
  const c = useColors();
  const [busy, setBusy] = useState(false);
  // 台帳の控えだけ新しい端末へ戻したときは、記録に名前はあってもファイルが無い
  const missing = !!name && !photoExists(name);
  const uri = missing ? null : photoUri(name);

  if (consent === 'no') {
    return (
      <View style={{ gap: 4 }}>
        <Text style={[st.label, { color: c.ink }]}>{label}</Text>
        <Text style={{ color: c.ink2, fontSize: 13, lineHeight: 20 }}>
          このお客様は写真の保存を辞退されています。
        </Text>
      </View>
    );
  }

  const pick = async (from: 'camera' | 'library') => {
    setBusy(true);
    const r = await capturePhoto(from);
    setBusy(false);
    if (r.ok) { onChange(r.name); return; }
    if ('canceled' in r) return;             // 自分でやめたときは何も言わない
    Alert.alert('写真を取り込めませんでした', r.reason);
  };

  const remove = () => {
    Alert.alert('この写真を外しますか', '端末からも消えます。元に戻せません。', [
      { text: 'やめておく', style: 'cancel' },
      {
        text: '外す',
        style: 'destructive',
        onPress: () => { deletePhoto(name); onChange(null); },
      },
    ]);
  };

  return (
    <View style={{ gap: 6 }}>
      <Text style={[st.label, { color: c.ink }]}>{label}</Text>

      {uri ? (
        <View style={{ gap: 6 }}>
          <Image
            source={{ uri }}
            style={[st.thumb, { borderColor: c.line, backgroundColor: c.surface2 }]}
            resizeMode="cover"
            accessibilityLabel={`${label}の写真`}
          />
          <View style={st.row}>
            <Pressable onPress={() => pick('camera')} style={[st.btn, { borderColor: c.lineStrong, backgroundColor: c.surface }]}>
              <Text style={{ color: c.ink, fontSize: 14, fontWeight: '700' }}>撮り直す</Text>
            </Pressable>
            <Pressable onPress={remove} style={[st.btn, { borderColor: c.lineStrong, backgroundColor: c.surface }]}>
              <Text style={{ color: c.overdueInk, fontSize: 14, fontWeight: '700' }}>外す</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={{ gap: 6 }}>
          {missing && (
            <Text style={{ color: c.ink2, fontSize: 13, lineHeight: 20 }}>
              この写真は前の端末に残っています。写真は端末の中だけに保存されるため、移せません。
            </Text>
          )}
          <View style={st.row}>
          <Pressable
            disabled={busy}
            onPress={() => pick('camera')}
            style={[st.btn, { borderColor: c.lineStrong, backgroundColor: busy ? c.surface2 : c.surface }]}
          >
            {busy ? <ActivityIndicator color={c.accent} /> : (
              <Text style={{ color: c.ink, fontSize: 14, fontWeight: '700' }}>撮る</Text>
            )}
          </Pressable>
          <Pressable
            disabled={busy}
            onPress={() => pick('library')}
            style={[st.btn, { borderColor: c.lineStrong, backgroundColor: busy ? c.surface2 : c.surface }]}
          >
            <Text style={{ color: busy ? c.ink3 : c.ink, fontSize: 14, fontWeight: '700' }}>選ぶ</Text>
          </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 8 },
  btn: {
    flex: 1, borderWidth: 1, borderRadius: 12,
    minHeight: MIN_TAP, alignItems: 'center', justifyContent: 'center',
  },
  thumb: { width: '100%', height: 200, borderRadius: 12, borderWidth: 1 },
});
