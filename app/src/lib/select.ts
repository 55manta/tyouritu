import { dueDate, dueStatus, STATUS_RANK, type DueStatus } from './cycle';
import { fromIso, iso, monthIndex, today } from './date';
import { quotedFee } from './pricing';
import type { Customer, Piano, Visit, WorkRecord } from '../types';

/** 一覧や集計のための引き出し。画面はここを通して値を得る */

export type PianoOf = { customer: Customer; piano: Piano };
export type RecordOf = { customer: Customer; piano: Piano; record: WorkRecord };
export type VisitOf = { customer: Customer; visit: Visit };

export function allPianos(cs: Customer[]): PianoOf[] {
  return cs.flatMap((customer) => customer.pianos.map((piano) => ({ customer, piano })));
}

export function allRecords(cs: Customer[]): RecordOf[] {
  return cs.flatMap((customer) =>
    customer.pianos.flatMap((piano) => piano.history.map((record) => ({ customer, piano, record })))
  );
}

export function allVisits(cs: Customer[]): VisitOf[] {
  return cs.flatMap((customer) => customer.visits.map((visit) => ({ customer, visit })));
}

/** 定期調律の予定がすでに入っている台は、ご案内の対象から外す */
function hasTuningVisit(c: Customer, p: Piano): boolean {
  return c.visits.some((v) => v.pianoIds.includes(p.id));
}

/** ご案内すべき台。見送り済みと、予定が入っている台は除く */
export function pendingPianos(c: Customer): Piano[] {
  return c.pianos.filter((p) => {
    if (hasTuningVisit(c, p)) return false;
    const st = dueStatus(p);
    if (st === 'calm') return false;
    const key = iso(dueDate(p));
    if (p.skippedCycle === key || p.custSkippedCycle === key) return false;
    return true;
  });
}

/** お客様単位の状態。いちばん悪い台に合わせる */
export function customerStatus(pianos: Piano[]): DueStatus {
  return pianos
    .map(dueStatus)
    .sort((a, b) => STATUS_RANK[a] - STATUS_RANK[b])[0] ?? 'calm';
}

/** 次回が最も近い台の日付。並べ替えに使う */
export function nextDueOf(c: Customer): number {
  if (!c.pianos.length) return Number.MAX_SAFE_INTEGER;
  return Math.min(...c.pianos.map((p) => dueDate(p).getTime()));
}

export function lastVisitOf(c: Customer): string {
  const ds = c.pianos.flatMap((p) => p.history.map((h) => h.date)).sort();
  return ds[ds.length - 1] ?? '';
}

export function recordTotal(r: WorkRecord): number {
  return r.fee || 0;
}

export function salesOf(c: Customer): number {
  return c.pianos.reduce((s, p) => s + p.history.reduce((t, h) => t + recordTotal(h), 0), 0);
}

/** この方との歩み。台帳が資産であることを数字で見せる */
export function customerStats(c: Customer) {
  const recs = c.pianos.flatMap((p) => p.history);
  const dates = recs.map((r) => r.date).sort();
  const first = dates[0];
  const years = first ? Math.floor((monthIndex(today()) - monthIndex(fromIso(first))) / 12) : 0;
  const byKind: Record<string, { count: number; yen: number }> = {};
  recs.forEach((r) => {
    const k = r.kind || 'tuning';
    byKind[k] = byKind[k] || { count: 0, yen: 0 };
    byKind[k].count += 1;
    byKind[k].yen += recordTotal(r);
  });
  return { count: recs.length, years, total: recs.reduce((s, r) => s + recordTotal(r), 0), byKind };
}

export type SortKey = 'due' | 'kana' | 'recent' | 'sales';

export const SORTS: { k: SortKey; label: string }[] = [
  { k: 'due', label: '期限が近い順' },
  { k: 'kana', label: 'あいうえお順' },
  { k: 'recent', label: '最近伺った順' },
  { k: 'sales', label: '売上が多い順' },
];

export function sortCustomers(cs: Customer[], key: SortKey): Customer[] {
  const a = [...cs];
  if (key === 'kana') {
    // かなが無ければ氏名で代用する。漢字のままだと文字コード順になり五十音順にはならない
    a.sort((x, y) => (x.kana || x.name).localeCompare(y.kana || y.name, 'ja'));
  } else if (key === 'recent') {
    a.sort((x, y) => (lastVisitOf(x) < lastVisitOf(y) ? 1 : lastVisitOf(x) > lastVisitOf(y) ? -1 : 0));
  } else if (key === 'sales') {
    a.sort((x, y) => salesOf(y) - salesOf(x));
  } else {
    a.sort((x, y) => nextDueOf(x) - nextDueOf(y));
  }
  return a;
}

export function matches(c: Customer, q: string): boolean {
  if (!q) return true;
  const hay = [
    c.name, c.kana, c.kind, c.memo,
    c.addr.region, c.addr.city, c.addr.line1, c.addr.line2,
    ...c.pianos.map((p) => [p.room, p.maker, p.model, p.serial, p.env].join(' ')),
  ].join(' ').toLowerCase();
  return hay.includes(q.toLowerCase());
}

export function shortAddr(c: Customer): string {
  return [c.addr.city, c.addr.line1].filter(Boolean).join('');
}

export function fullAddr(c: Customer): string {
  const a = c.addr;
  return [a.region, a.city, a.line1, a.line2].filter(Boolean).join(' ');
}

export function pianoName(p: Piano): string {
  return [p.maker, p.model].filter(Boolean).join(' ') || '（機種未登録）';
}

/** 今日の訪問 */
export function todaysVisits(cs: Customer[]): VisitOf[] {
  const t = iso(today());
  return allVisits(cs)
    .filter((x) => x.visit.date === t)
    .sort((a, b) => (a.visit.time || '99:99').localeCompare(b.visit.time || '99:99'));
}

/** 提示する料金（経過加算を含む） */
export function quoted(p: Piano, surchargeEnabled: boolean): number {
  return quotedFee(p.fee, p.lastTunedOn, surchargeEnabled);
}
