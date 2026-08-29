/**
 * 移植した業務ロジックの検算。
 * 試作（choritsu-note.html）で監査したときと同じ結果になることを確かめる。
 * `npx tsx src/lib/__check.ts` で走らせる想定の、その場かぎりの確認用。
 */
import { addMonths, fromIso, iso } from './date';
import { recalcLastTuned, dueDate, dueStatus, countsToCycle, type PianoCycle, type WorkRecord } from './cycle';
import { cycleKey } from './cycle';
import { surcharge, gapYears, needsRoughTuning, quotedFee, taxOf, money } from './pricing';
import { isSkipped, pendingPianos, reminderState } from './select';
import { bookingUrl } from './messages';
import { channelUrl, channelsFor } from './channels';
import type { Customer, Piano } from '../types';

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

// ── ご案内の状態（フェーズ2） ──────────────────────
{
  const mk = (over: Partial<Piano>): Piano => ({
    id: 'p1', room: 'リビング', maker: 'ヤマハ', model: 'U1', type: 'アップライト',
    serial: '', made: '', env: '', fee: 13000, intervalMonths: 12,
    lastTunedOn: '2025-08-01', initialLast: '2025-08-01', nextDue: null,
    remindedCycle: null, skippedCycle: null, custSkippedCycle: null, history: [],
    ...over,
  });
  const due = '2026-08-01';                    // lastTunedOn + 12ヶ月
  check('周期の鍵は次回の目安', cycleKey(mk({})), due);
  check('まだ何もしていない', reminderState([mk({})]), 'none');
  check('ご案内ずみ', reminderState([mk({ remindedCycle: due })]), 'reminded');
  check('調律師が見送った', reminderState([mk({ skippedCycle: due })]), 'skipped');
  check('お客様が見送られた', reminderState([mk({ custSkippedCycle: due })]), 'custSkipped');
  check('前の周期の印は効かない', reminderState([mk({ remindedCycle: '2025-08-01' })]), 'none');
  check('1台でも未案内なら未案内', reminderState([mk({ remindedCycle: due }), mk({ id: 'p2' })]), 'none');
  check('見送りは見送り扱い', isSkipped([mk({ skippedCycle: due })]), true);
}

// ── 見送った台が一覧から消えないこと ────────────────────
{
  const p: Piano = {
    id: 'p1', room: 'リビング', maker: '', model: '', type: 'アップライト',
    serial: '', made: '', env: '', fee: 13000, intervalMonths: 12,
    lastTunedOn: '2025-08-01', initialLast: '2025-08-01', nextDue: null,
    remindedCycle: null, skippedCycle: '2026-08-01', custSkippedCycle: null, history: [],
  };
  const cust = {
    id: 'c1', name: 'テスト', kana: 'てすと', kind: '一般家庭', phone: '', email: '', line: '',
    addr: { country: 'JP', postal: '', region: '', city: '', line1: '', line2: '' },
    parking: '', access: '', memo: '', photoConsent: null, bookToken: null, request: null,
    pianos: [p], visits: [],
  } as unknown as Customer;
  // 見送った台を隠すと、押し間違えを取り消す導線ごと消える
  check('見送っても一覧に残る', pendingPianos(cust).length, 1);
}

// ── 送信URLの組み立て ───────────────────────────────
{
  const cust = {
    id: 'c1', name: '鈴木', kana: 'すずき', kind: '一般家庭',
    phone: '090-1234-5678', email: 'a@example.com', line: 'suzuki',
    addr: { country: 'JP', postal: '', region: '', city: '', line1: '', line2: '' },
    parking: '', access: '', memo: '', photoConsent: null, bookToken: null, request: null,
    pianos: [], visits: [],
  } as unknown as Customer;
  check('SMSは番号の記号を落とす', channelUrl('SMS', cust, 's', 'あ').startsWith('sms:09012345678'), true);
  check('メールは宛先つき', channelUrl('メール', cust, 's', 'あ').startsWith('mailto:a%40example.com?subject='), true);
  check('LINEは共有画面', channelUrl('LINE', cust, 's', 'あ').startsWith('https://line.me/R/share?text='), true);
  check('予約URL', bookingUrl('abc123'), 'https://choritsu-note.app/b/abc123');
  check('連絡先が無ければ送れない',
    channelsFor({ ...cust, phone: '', email: '', line: '' }).filter((x) => x.ok).length, 0);
}

const failed = results.filter((r) => !r[1]);
results.forEach(([n, ok, d]) => console.log((ok ? '  OK  ' : '  NG  ') + n + (ok ? '' : '   ' + d)));
console.log(`\n${results.length - failed.length} / ${results.length} 通過`);
if (failed.length) process.exit(1);
