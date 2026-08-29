import { dark, light, type Palette } from './colors';
import { useScheme } from './ThemeContext';

/** 画面はここだけを見る。端末に合わせるか固定するかは ThemeProvider が決める */
export function useColors(): Palette {
  return useScheme() === 'dark' ? dark : light;
}

export { MIN_TAP } from './colors';
export type { Palette } from './colors';
