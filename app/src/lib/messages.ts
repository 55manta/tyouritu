/**
 * お客様にお送りする文面。
 *
 * 送信そのものは端末のアプリ（LINE・SMS・メール）に渡す（send.ts）。
 * ここは「何を書いて渡すか」だけを持つ。画面から文字列を組み立てない——
 * 同じ文面が3画面に散ると、直したつもりの箇所が1つ残る。
 */

import { fmtMd, fromIso } from './date';
import { gapText, money, needsRoughTuning, surcharge } from './pricing';
import { pianoName } from './select';
import type { Customer, Piano, Visit } from '../types';

/**
 * お客様用ページの置き場所。Firebase Hosting に出してある。
 * 独自ドメインを取ったら、ここだけ差し替える。
 */
export const BOOKING_ORIGIN = 'https://choritsu-note.web.app';

export function bookingUrl(token: string): string {
  return BOOKING_ORIGIN + '/b/' + token;
}

/** 調律のご案内。料金の目安と、見送りの導線まで入れて1通で完結させる */
export function reminderMessage(
  c: Customer,
  pianos: Piano[],
  url: string,
  surchargeEnabled: boolean
): string {
  const many = pianos.length > 1;
  const list = many
    ? pianos.map((p) => '・' + p.room + '（' + pianoName(p) + '）').join('\n')
    : '';

  const head = many
    ? `${c.name} 様\n\nいつもありがとうございます。\n下記のピアノが、そろそろ調律の時期を迎えます。\n\n${list}\n\n`
    : `${c.name} 様\n\nいつもありがとうございます。\n前回の調律から${gapText(pianos[0].lastTunedOn)}が経ちましたので、そろそろ調律の時期です。\n\n`;

  const base = pianos.reduce((s, p) => s + (p.fee || 0), 0);
  const sur = pianos.reduce((s, p) => s + surcharge(p.lastTunedOn, surchargeEnabled), 0);

  let fee = '料金の目安：' + money(base + sur) + (many ? `（${pianos.length}台ぶん）` : '') + '\n';
  if (sur) {
    fee += '　内訳：調律 ' + money(base) + ' ＋ 期間があいたぶんの調整 ' + money(sur) + '\n';
    if (pianos.some((p) => needsRoughTuning(p.lastTunedOn))) {
      fee += '　※ 長くあいているため、音を安定させる下準備（粗調律）が必要です。\n';
    }
  }

  return (
    head +
    fee +
    '所要時間：1台あたり2時間ほど（立ち会いは不要です）\n\n' +
    '▼ ご都合のよい日をお選びください\n' +
    url +
    '\n\n' +
    '今回は見送られる場合も、同じページの「今回は見送る」から\nワンタップでお知らせいただけます。お電話は不要です。'
  );
}

/** 訪問前のご案内。当日の不安を先に消す */
export function prepMessage(c: Customer, v: Visit, minutesPerPiano: number): string {
  const n = Math.max(1, v.pianoIds.length);
  const hours = Math.round(((minutesPerPiano * n) / 60) * 10) / 10;

  return (
    `${c.name} 様\n\n` +
    fmtMd(fromIso(v.date)) +
    (v.time ? ` ${v.time}ごろ` : '（時間は前日にご連絡します）') +
    'にお伺いします。\n\n' +
    '◆ ご準備について\n' +
    '　1. お片付けはピアノの上と周りだけで結構です。お部屋の掃除は不要です。\n' +
    `　2. 作業は${hours}時間ほど。立ち会いは不要で、お出かけいただいても構いません。\n` +
    '　3. お車で伺います。' +
    (c.parking ? `（「${c.parking}」と伺っています）` : '駐車場所を教えていただけると助かります。') +
    '\n\n' +
    'お支払いは現金のほか、PayPay・クレジットカードもお使いいただけます。\n' +
    '気になっていることがあれば、当日お聞かせください。'
  );
}
