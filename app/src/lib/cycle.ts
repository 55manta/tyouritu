/**
 * 調律の周期
 *
 * このアプリでいちばん壊れてはいけない部分。
 * 監査（choritsu-note-audit.html 所見3・4）で、試作では周期の基準日を決める処理が
 * 2箇所にあり、片方が「入力された日付を無条件に採る」実装だったために、
 * 忘れていた過去の調律を後から入力すると次回時期が壊れることが分かった。
 *
 * そのため、ここでは基準日を決める関数を 1 つだけ公開する。
 * 画面から piano.lastTunedOn を直接書き換えてはいけない。
 */

import { addMonths, fromIso, iso, monthIndex, today } from './date';

/** 作業の種別。周期を動かすのは定期調律だけ */
export type RecordKind = 'tuning' | 'repair' | 'regulate' | 'check' | 'move' | 'other';

export const KINDS: { k: RecordKind; n: string; cycle: boolean; works: string[] }[] = [
  { k: 'tuning', n: '定期調律', cycle: true,
    works: ['調律', '調律＋整調', '調律＋修理', '点検のみ'] },
  { k: 'repair', n: '修理', cycle: false,
    works: ['弦の交換', '鍵盤の修理', 'ハンマー関係の修理', 'アクションの修理', 'ペダルの修理', 'その他の修理'] },
  { k: 'regulate', n: '整調・整音', cycle: false,
    works: ['整調', '整音', '整調＋整音'] },
  { k: 'check', n: '点検', cycle: false,
    works: ['点検', '見積のための下見'] },
  { k: 'move', n: '運搬・移動', cycle: false,
    works: ['同じ部屋の中で移動', '家の中で移動', '別の場所へ運搬'] },
  { k: 'other', n: 'その他', cycle: false, works: ['その他の作業'] },
];

export function kindOf(k?: RecordKind | string) {
  return KINDS.find((x) => x.k === (k || 'tuning')) || KINDS[0];
}
export function kindName(k?: RecordKind | string): string {
  return kindOf(k).n;
}
/** この記録は調律の周期を動かすか */
export function countsToCycle(r: { kind?: RecordKind | string }): boolean {
  return kindOf(r.kind).cycle;
}

export type WorkRecord = {
  date: string;          // YYYY-MM-DD
  kind: RecordKind;
};

export type PianoCycle = {
  /** 周期の基準日。この値は recalcLastTuned でしか変えない */
  lastTunedOn: string;
  /** ピアノ登録時に入力された前回調律日。調律記録が全部消えたときの戻り先 */
  initialLast: string;
  /** 標準の周期（月） */
  intervalMonths: number;
  /** この周期にかぎった次回日の上書き。標準の周期は変えない */
  nextDue: string | null;
};

/**
 * 周期の基準日を決める、ただ一つの場所。
 * 記録の追加・修正・取り消しのいずれでも必ずここを通す。
 *
 * - 履歴のうち「周期を動かす種別」の中で最も新しい日付を採る
 *   （入力された日付をそのまま採らない。過去日の記録を後から足しても壊れない）
 * - 対象の記録が1件も無くなったら、登録時の値へ戻す
 *   （取り消した記録の日付が基準として残り続けるのを防ぐ）
 */
export function recalcLastTuned<T extends PianoCycle>(piano: T, history: WorkRecord[]): T {
  const base = history
    .filter((h) => countsToCycle(h))
    .map((h) => h.date)
    .sort()
    .reverse();
  const next = base.length ? base[0] : piano.initialLast || piano.lastTunedOn;
  if (next !== piano.lastTunedOn) piano.nextDue = null; // 基準が動いたら上書きは無効
  piano.lastTunedOn = next;
  return piano;
}

/** 次回の目安。nextDue があればそれを優先する */
export function dueDate(p: PianoCycle): Date {
  return p.nextDue ? fromIso(p.nextDue) : addMonths(fromIso(p.lastTunedOn), p.intervalMonths);
}

/** 通知の重複を避けるための、この周期を表す鍵 */
export function cycleKey(p: PianoCycle): string {
  return iso(dueDate(p));
}

/** 次回までの月数。負の値は、その月数だけ時期を過ぎていることを表す */
export function monthsUntilDue(p: PianoCycle): number {
  return monthIndex(dueDate(p)) - monthIndex(today());
}

export type DueStatus = 'dormant' | 'overdue' | 'due' | 'next' | 'calm';

export function dueStatus(p: PianoCycle): DueStatus {
  const d = monthsUntilDue(p);
  if (d <= -12) return 'dormant';
  if (d < 0) return 'overdue';
  if (d === 0) return 'due';
  if (d === 1) return 'next';
  return 'calm';
}

export const STATUS_LABEL: Record<DueStatus, string> = {
  dormant: '長期ご無沙汰',
  overdue: '時期を過ぎています',
  due: '今月が時期',
  next: '来月が時期',
  calm: '次回まで余裕あり',
};

/** 一覧の並び順（悪いものから先に見せる） */
export const STATUS_RANK: Record<DueStatus, number> = {
  dormant: 0, overdue: 1, due: 2, next: 3, calm: 4,
};
