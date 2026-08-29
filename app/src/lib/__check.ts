/**
 * 移植した業務ロジックの検算。
 * 試作（choritsu-note.html）で監査したときと同じ結果になることを確かめる。
 * `npx tsx src/lib/__check.ts` で走らせる想定の、その場かぎりの確認用。
 */
import { addMonths, fromIso, iso } from './date';
import { recalcLastTuned, dueDate, dueStatus, countsToCycle, type PianoCycle, type WorkRecord } from './cycle';
import { surcharge, gapYears, needsRoughTuning, quotedFee, taxOf, money } from './pricing';

const results: [string, boolean, string][] = [];
const check = (name: string, got: unknown, want: unknown) =>
  results.push([name, JSON.stringify(got) === JSON.stringify(want), `got=${JSON.stringify(got)} want=${JSON.stringify(want)}`]);

// ── 日付：月末をまたぐ加算 ────────────────────────────
check('1月31日 +1ヶ月 = 2月28日', iso(addMonths(fromIso('2026-01-31'), 1)), '2026-02-28');
check('8月12日 +12ヶ月', iso(addMonths(fromIso('2025-08-12'), 12)), '2026-08-12');

// ── 所見3：忘れていた過去の調律を後から入力する ──────────
{
  const p: PianoCycle = { lastTunedOn: '2026-08-01', initialLast: '2024-08-01', intervalMonths: 12, nextDue: null };
  const hist: WorkRecord[] = [
    { date: '2026-08-01', kind: 'tuning' },
    { date: '2025-06-15', kind: 'tuning' },   // 後から足した記録漏れ
  ];
  recalcLastTuned(p, hist);
  check('所見3 基準日が最新の調律のまま', p.lastTunedOn, '2026-08-01');
  check('所見3 次回は1年後', iso(dueDate(p)), '2027-08-01');
}

// ── 所見4：調律の記録を全部取り消す ─────────────────────
{
  const p: PianoCycle = { lastTunedOn: '2026-08-01', initialLast: '2024-08-01', intervalMonths: 12, nextDue: null };
  recalcLastTuned(p, [{ date: '2026-05-10', kind: 'repair' }]);  // 修理だけ残る
  check('所見4 登録時の値へ戻る', p.lastTunedOn, '2024-08-01');
}

// ── 所見5：この回だけの上書きは、標準の周期を変えない ──────
{
  const p: PianoCycle = { lastTunedOn: '2026-08-27', initialLast: '2024-08-27', intervalMonths: 12, nextDue: '2026-11-27' };
  check('所見5 標準の周期は12のまま', p.intervalMonths, 12);
  check('所見5 この回の次回は上書きが効く', iso(dueDate(p)), '2026-11-27');
}

// ── 種別が周期を動かすか ────────────────────────────
check('定期調律は周期を動かす', countsToCycle({ kind: 'tuning' }), true);
check('修理は動かさない', countsToCycle({ kind: 'repair' }), false);
check('運搬は動かさない', countsToCycle({ kind: 'move' }), false);

// ── 経過加算 ────────────────────────────────────
check('1年あき → 加算なし', surcharge(iso(addMonths(new Date(), -12))), 0);
check('3年あき → 3,000円', surcharge(iso(addMonths(new Date(), -36))), 3000);
check('20年あき → 上限15,000円', surcharge(iso(addMonths(new Date(), -240))), 15000);
check('日本以外では加算しない', surcharge(iso(addMonths(new Date(), -36)), false), 0);
check('10年あきは粗調律が要る', needsRoughTuning(iso(addMonths(new Date(), -120))), true);
check('9年あきは要らない', needsRoughTuning(iso(addMonths(new Date(), -108))), false);
check('提示料金＝基本＋加算', quotedFee(13000, iso(addMonths(new Date(), -36))), 16000);

// ── 消費税 ─────────────────────────────────────
check('免税なら0', taxOf(11000, 10, false), 0);
check('課税10%', taxOf(11000, 10, true), 1000);
check('課税8%', taxOf(10800, 8, true), 800);

// ── 金額表記 ────────────────────────────────────
check('日本は「13,000円」', money(13000), '13,000円');

const failed = results.filter((r) => !r[1]);
results.forEach(([n, ok, d]) => console.log((ok ? '  OK  ' : '  NG  ') + n + (ok ? '' : '   ' + d)));
console.log(`\n${results.length - failed.length} / ${results.length} 通過`);
if (failed.length) process.exit(1);
