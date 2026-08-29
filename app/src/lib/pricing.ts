/**
 * 料金
 *
 * 未調律期間による経過加算は日本の商習慣。業界相場
 * （2〜5年 1,000〜5,500円／5〜10年 5,000〜13,000円／10年以上 10,000〜15,000円以上）に沿って
 * 「1年経過ごとに +1,500円、上限15,000円」で概算する。10年以上は粗調律の下準備が要る。
 *
 * 他の国では機能ごと出さない（設定の locale で切る）。
 */

import { fromIso, monthIndex, today } from './date';

export const SURCHARGE_PER_YEAR = 1500;
export const SURCHARGE_CAP = 15000;
export const ROUGH_TUNING_YEARS = 10;

/** 前回の調律から何年あいたか（切り捨て） */
export function gapYears(lastTunedOn: string): number {
  return Math.floor((monthIndex(today()) - monthIndex(fromIso(lastTunedOn))) / 12);
}

/** 「3年2ヶ月」のような表記 */
export function gapText(lastTunedOn: string): string {
  const m = monthIndex(today()) - monthIndex(fromIso(lastTunedOn));
  const y = Math.floor(m / 12);
  const mm = m % 12;
  return y ? y + '年' + (mm ? mm + 'ヶ月' : '') : mm + 'ヶ月';
}

/** 経過加算。2年未満は取らない */
export function surcharge(lastTunedOn: string, enabled = true): number {
  if (!enabled) return 0;
  const y = gapYears(lastTunedOn);
  return y < 2 ? 0 : Math.min(SURCHARGE_CAP, (y - 1) * SURCHARGE_PER_YEAR);
}

/** 10年以上あくと、音が安定するまでに粗調律（下準備）が要る */
export function needsRoughTuning(lastTunedOn: string): boolean {
  return gapYears(lastTunedOn) >= ROUGH_TUNING_YEARS;
}

/** 提示する料金＝基本料金＋経過加算 */
export function quotedFee(fee: number, lastTunedOn: string, surchargeEnabled = true): number {
  return (fee || 0) + surcharge(lastTunedOn, surchargeEnabled);
}

/**
 * 金額の表示。
 * 日本語では「13,000円」が自然で、Intl の「￥13,000」は使わない。
 */
export function money(n: number, locale = 'ja-JP', currency = 'JPY'): string {
  const v = Number(n) || 0;
  if (currency === 'JPY') return v.toLocaleString('ja-JP') + '円';
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(v);
  } catch {
    return v.toLocaleString() + ' ' + currency;
  }
}

/** 税込から消費税額を割り出す。免税事業者なら 0 */
export function taxOf(inclusive: number, ratePercent: number, taxable: boolean): number {
  if (!taxable) return 0;
  const r = (isFinite(ratePercent) && ratePercent >= 0 ? ratePercent : 10) / 100;
  return Math.round(inclusive - inclusive / (1 + r));
}
