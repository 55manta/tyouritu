/**
 * 日付ユーティリティ
 *
 * 試作（choritsu-note.html）からの移植。
 * 要点：日付は必ず「その土地の日付」として扱う。toISOString() は UTC に寄せるため、
 * 日本時間の朝に使うと前日になる。ここでは自前の iso() だけを使う。
 */

/** 今日の 0 時 */
export function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Date → "YYYY-MM-DD"（ローカル日付。UTC へ寄せない） */
export function iso(d: Date): string {
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
}

/** "YYYY-MM-DD" → Date（ローカル） */
export function fromIso(s: string): Date {
  const p = String(s).split('-');
  return new Date(+p[0], +p[1] - 1, +p[2]);
}

/**
 * 月を足す。月末をまたぐときは、その月に存在する日まで切り詰める。
 * 例：1月31日 + 1ヶ月 → 2月28日（3月3日にはしない）
 */
export function addMonths(d: Date, m: number): Date {
  const day = d.getDate();
  const n = new Date(d.getFullYear(), d.getMonth() + m, 1);
  const dim = new Date(n.getFullYear(), n.getMonth() + 1, 0).getDate();
  n.setDate(Math.min(day, dim));
  return n;
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function monthsAgo(m: number): Date {
  return addMonths(today(), -m);
}

/** 年と月だけの通し番号。月単位の差を取るのに使う */
export function monthIndex(d: Date): number {
  return d.getFullYear() * 12 + d.getMonth();
}

export function sameYMD(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const WD = ['日', '月', '火', '水', '木', '金', '土'];

/** 2026年8月 */
export function fmtJ(d: Date): string {
  return d.getFullYear() + '年' + (d.getMonth() + 1) + '月';
}

/** 2026年8月29日 */
export function fmtJd(d: Date): string {
  return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
}

/** 8月29日（土） */
export function fmtMd(d: Date): string {
  return (d.getMonth() + 1) + '月' + d.getDate() + '日（' + WD[d.getDay()] + '）';
}

export function weekday(d: Date): string {
  return WD[d.getDay()];
}
