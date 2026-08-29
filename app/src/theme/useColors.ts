import { useColorScheme } from 'react-native';
import { dark, light, type Palette } from './colors';

export function useColors(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

export { MIN_TAP } from './colors';
export type { Palette } from './colors';
