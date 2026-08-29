import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_SETTINGS, type Customer, type Settings } from '../types';
import { seed } from './seed';

/**
 * 端末内の保存。
 *
 * フェーズ1では AsyncStorage に置く。クラウド同期はフェーズ2で
 * @react-native-firebase に載せ替える（アーキテクチャ仕様 第6章）。
 *
 * 監査（choritsu-note-audit.html 所見2）で、試作では保存の失敗を握りつぶしており
 * 「保存できていないのに成功したように見える」状態になっていた。ここでは
 * 失敗を必ず呼び出し側へ返し、画面が気づけるようにする。
 */

const KEY_CUSTOMERS = 'choritsu.customers.v1';
const KEY_SETTINGS = 'choritsu.settings.v1';

export type SaveResult = { ok: true } | { ok: false; error: string };

export async function loadCustomers(): Promise<Customer[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY_CUSTOMERS);
    // キーが無いときだけ初期投入する。空配列は「利用者が消した結果」として尊重する
    // （試作では空配列を未初期化と同じ扱いにしていたため、全部消しても
    //   次に開くとサンプルが復活していた＝監査で見つけた不具合）
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as Customer[];
    }
  } catch {
    // 壊れていたら初期投入に落とす
  }
  const s = seed();
  await saveCustomers(s);
  return s;
}

export async function saveCustomers(list: Customer[]): Promise<SaveResult> {
  try {
    await AsyncStorage.setItem(KEY_CUSTOMERS, JSON.stringify(list));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(KEY_SETTINGS);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    // 既定へ
  }
  return { ...DEFAULT_SETTINGS };
}

export async function saveSettings(s: Settings): Promise<SaveResult> {
  try {
    await AsyncStorage.setItem(KEY_SETTINGS, JSON.stringify(s));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function clearAll(): Promise<void> {
  await AsyncStorage.setItem(KEY_CUSTOMERS, JSON.stringify([]));
}

/** 推測されにくい鍵。お客様用ページのURLに使うので Math.random は避ける */
export function newToken(): string {
  const a = new Uint8Array(16);
  const g = (globalThis as { crypto?: Crypto }).crypto;
  if (g && typeof g.getRandomValues === 'function') g.getRandomValues(a);
  else for (let i = 0; i < a.length; i++) a[i] = Math.floor(Math.random() * 256);
  return Array.from(a, (v) => v.toString(16).padStart(2, '0')).join('');
}

export function uid(prefix = 'x'): string {
  return prefix + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
