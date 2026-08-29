import React from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { MIN_TAP, useColors } from '../theme/useColors';
import type { DueStatus } from '../lib/cycle';
import { STATUS_LABEL } from '../lib/cycle';

/**
 * 画面をまたいで使う部品。
 * 高齢の利用者を想定しているため、押せるものは必ず 44px 以上にする。
 */

export function Screen({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const c = useColors();
  return <View style={[{ flex: 1, backgroundColor: c.ground }, style]}>{children}</View>;
}

export function Title({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return <Text style={[s.title, { color: c.ink }]}>{children}</Text>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const c = useColors();
  return <View style={[s.card, { backgroundColor: c.surface, borderColor: c.line }, style]}>{children}</View>;
}

export function Button({
  label, onPress, variant = 'primary', style, disabled,
}: {
  label: string; onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger'; style?: ViewStyle; disabled?: boolean;
}) {
  const c = useColors();
  // 明るい色の地に白を置くとダークテーマで 2.2:1 まで落ちる。地ごとの文字色をパレットから採る
  const bg = variant === 'primary' ? c.accent : variant === 'danger' ? c.overdue : c.surface;
  const fg = variant === 'ghost' ? c.ink : variant === 'danger' ? c.onOverdue : c.onAccent;
  // 押せないときは全体を薄くしない。薄くすると地と文字が一緒に沈んで読めなくなる。
  // 落ち着いた地に落ち着いた文字を置き、読めるまま「いまは押せない」を示す
  const offBg = c.surface2;
  const offFg = c.ink3;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.btn,
        {
          backgroundColor: disabled ? offBg : bg,
          borderColor: disabled ? c.lineStrong : variant === 'ghost' ? c.lineStrong : bg,
          opacity: pressed && !disabled ? 0.85 : 1,
        },
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
    >
      <Text style={[s.btnLabel, { color: disabled ? offFg : fg }]}>{label}</Text>
    </Pressable>
  );
}

/** 状態を色と言葉の両方で示す。色だけに頼らない */
export function StatusPill({ status }: { status: DueStatus }) {
  const c = useColors();
  const map: Record<DueStatus, { fg: string; bg: string }> = {
    overdue: { fg: c.overdueInk, bg: c.overdueSoft },
    dormant: { fg: c.brassInk, bg: c.brassSoft },
    due: { fg: c.accentInk, bg: c.accentSoft },
    next: { fg: c.nextInk, bg: c.nextSoft },
    calm: { fg: c.calmInk, bg: c.calmSoft },
  };
  const t = map[status];
  return <Text style={[s.pill, { color: t.fg, backgroundColor: t.bg }]}>{STATUS_LABEL[status]}</Text>;
}

export function Row({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.row, style]}>{children}</View>;
}

export function Muted({ children, size = 14 }: { children: React.ReactNode; size?: number }) {
  const c = useColors();
  return <Text style={{ color: c.ink2, fontSize: size, lineHeight: size * 1.6 }}>{children}</Text>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={s.empty}>
      <Text style={{ color: c.ink2, fontSize: 15, textAlign: 'center', lineHeight: 24 }}>{children}</Text>
    </View>
  );
}

/** 保存できていないことを知らせる帯。消えないことが要点 */
export function SaveAlert() {
  const c = useColors();
  return (
    <View style={[s.alert, { backgroundColor: c.overdue }]}>
      <Text style={[s.alertText, { color: c.onOverdue }]}>
        保存できていません。端末の空き容量が足りず、ここでの変更が残っていません。
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '800', letterSpacing: 0.2 },
  card: { borderWidth: 1, borderRadius: 16, padding: 15, gap: 6 },
  btn: {
    minHeight: MIN_TAP + 4, borderRadius: 13, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16,
  },
  btnLabel: { fontSize: 15.5, fontWeight: '700' },
  pill: {
    fontSize: 12, fontWeight: '700', overflow: 'hidden',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  empty: { paddingVertical: 40, paddingHorizontal: 24, alignItems: 'center' },
  alert: { paddingHorizontal: 15, paddingVertical: 11 },
  alertText: { fontSize: 13.5, lineHeight: 20, fontWeight: '600' },
});
