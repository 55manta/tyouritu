import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import type { ThemePref } from '../types';

/**
 * 表示テーマ。
 *
 * 端末の設定に合わせる（auto）のが既定。ただし調律の現場は
 * 昼の屋外から薄暗い室内まで動くので、その場で明るい／暗いに
 * 固定できる必要がある。だから端末任せにせず、アプリ側で持つ。
 *
 * 画面は useColors() だけを見る。ここが唯一の切り替え点。
 */

export type Scheme = 'light' | 'dark';

const SchemeCtx = createContext<Scheme>('light');

export function ThemeProvider({ pref, children }: { pref: ThemePref; children: React.ReactNode }) {
  const system = useColorScheme();
  const scheme: Scheme = useMemo(
    () => (pref === 'auto' ? (system === 'dark' ? 'dark' : 'light') : pref),
    [pref, system]
  );
  return <SchemeCtx.Provider value={scheme}>{children}</SchemeCtx.Provider>;
}

export function useScheme(): Scheme {
  return useContext(SchemeCtx);
}
