/**
 * 送信の導線。
 *
 * このアプリ自身はメッセージを送らない。端末に入っている LINE・SMS・メールへ
 * 本文を渡して開くだけにしている。理由は3つ：
 *  ・送信サーバを持たないので、お客様の連絡先がこちらの外に出ない
 *  ・調律師がふだん使っている宛先・履歴がそのまま使える
 *  ・届かなかったときの確認が、いつものアプリの中で完結する
 *
 * URLの組み立ては channels.ts（端末に依らない部分）にある。
 */

import { Linking, Platform } from 'react-native';
import { channelUrl } from './channels';
import type { ChannelKey } from './channels';
import type { Customer } from '../types';

export { channelsFor, channelUrl } from './channels';
export type { Channel, ChannelKey } from './channels';

export type SendResult = { ok: true } | { ok: false; reason: string };

export async function openChannel(
  ch: ChannelKey,
  c: Customer,
  subject: string,
  body: string
): Promise<SendResult> {
  const url = channelUrl(ch, c, subject, body, Platform.OS === 'ios' ? '&' : '?');
  try {
    await Linking.openURL(url);
    return { ok: true };
  } catch {
    return {
      ok: false,
      reason:
        ch === 'LINE'
          ? 'LINEを開けませんでした。文章をコピーして、LINEに貼り付けてください。'
          : `${ch}のアプリを開けませんでした。文章をコピーしてお使いください。`,
    };
  }
}
