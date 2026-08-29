/**
 * 送信先の組み立て（端末に依らない部分）。
 *
 * react-native を読み込まないでおく。ここは値を組み立てるだけなので、
 * 端末が無くても検算できるようにしておきたい（__check.ts から呼ぶ）。
 * 実際に開くのは send.ts。
 */

import type { Customer } from '../types';

export type ChannelKey = 'LINE' | 'SMS' | 'メール';

export type Channel = {
  key: ChannelKey;
  label: string;
  /** 送れる状態か（連絡先が登録されているか） */
  ok: boolean;
  /** 使えない理由。押せないボタンの説明に使う */
  why: string;
};

export function channelsFor(c: Customer): Channel[] {
  return [
    { key: 'LINE', label: 'LINE', ok: !!c.line, why: 'LINEが未登録です' },
    { key: 'SMS', label: 'SMS', ok: !!c.phone, why: '電話番号が未登録です' },
    { key: 'メール', label: 'メール', ok: !!c.email, why: 'メールが未登録です' },
  ];
}

export function telDigits(phone: string): string {
  return String(phone || '').replace(/[^0-9+]/g, '');
}

/**
 * 宛先つきで開くURL。
 *
 * SMS の本文の付け方は端末で違う。iOS は「&body=」、Android は「?body=」でないと
 * 本文が入らないため、区切り文字は呼び出し側から渡す。
 *
 * LINE は宛先を指定して開く方法が公開されていない。共有画面を開いて
 * お客様を選んでいただく形になる（仕様の限界であって、実装の手抜きではない）。
 */
export function channelUrl(
  ch: ChannelKey,
  c: Customer,
  subject: string,
  body: string,
  smsSeparator: '&' | '?' = '?'
): string {
  if (ch === 'SMS') {
    return `sms:${telDigits(c.phone)}${smsSeparator}body=${encodeURIComponent(body)}`;
  }
  if (ch === 'メール') {
    return `mailto:${encodeURIComponent(c.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
  return `https://line.me/R/share?text=${encodeURIComponent(body)}`;
}
