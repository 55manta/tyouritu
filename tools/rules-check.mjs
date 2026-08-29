/**
 * 本番に配ったセキュリティルールを、実際に叩いて確かめる。
 *
 * エミュレータではなく本物の choritsu-note を相手にしている。
 * 手元のファイルが正しくても、配り忘れていれば意味がないため
 * （割ペイで一度これに引っかかっている）。
 *
 *   node tools/rules-check.mjs
 *
 * 匿名ユーザーを2人つくる。片方を「調律師」、もう片方を「お客様」に見立てる。
 * 使い終わった書類は最後に消す。匿名アカウントは30日で自動削除される設定。
 */

import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import {
  getFirestore, doc, collection, getDoc, getDocs,
  setDoc, updateDoc, deleteDoc, serverTimestamp,
} from 'firebase/firestore';

/**
 * この apiKey は秘密ではない。Firebase のウェブAPIキーは「どのプロジェクトか」を
 * 示すだけで、何かを許可する鍵ではない（公開ページのHTMLにも同じものが載る）。
 * 守っているのはセキュリティルールのほう。見つけても差し替えなくてよい。
 */
const config = {
  projectId: 'choritsu-note',
  appId: '1:256206159985:web:483f4f088cbabf83de5bd0',
  apiKey: 'AIzaSyCiFRJunevzA3hSWAy_3gM1WsB1iqjArI4',
  authDomain: 'choritsu-note.firebaseapp.com',
  messagingSenderId: '256206159985',
};

const results = [];
async function check(name, want, fn) {
  let got = 'allowed';
  let detail = '';
  try {
    await fn();
  } catch (e) {
    got = 'denied';
    detail = e.code || String(e);
  }
  results.push([name, got === want, `${got}${detail ? ' (' + detail + ')' : ''} / 期待=${want}`]);
}

const token = 'test' + Math.random().toString(16).slice(2, 10).padEnd(28, '0');

const tunerApp = initializeApp(config, 'tuner');
const custApp = initializeApp(config, 'customer');
const tunerAuth = getAuth(tunerApp);
const custAuth = getAuth(custApp);
const tunerDb = getFirestore(tunerApp);
const custDb = getFirestore(custApp);

const tuner = (await signInAnonymously(tunerAuth)).user;
const cust = (await signInAnonymously(custAuth)).user;

const bookingT = doc(tunerDb, 'bookings', token);
const bookingC = doc(custDb, 'bookings', token);

// ── 調律師の台帳 ────────────────────────────────────────
await check('調律師は自分の台帳に書ける', 'allowed', () =>
  setDoc(doc(tunerDb, 'tuners', tuner.uid, 'customers', 'c1'),
    { name: 'テスト', phone: '090-0000-0000' })
);
await check('調律師は自分の台帳を読める', 'allowed', () =>
  getDoc(doc(tunerDb, 'tuners', tuner.uid, 'customers', 'c1'))
);
await check('他人の台帳は読めない', 'denied', () =>
  getDoc(doc(custDb, 'tuners', tuner.uid, 'customers', 'c1'))
);
await check('他人の調律師書類も読めない', 'denied', () =>
  getDoc(doc(custDb, 'tuners', tuner.uid))
);
await check('他人の台帳に書けない', 'denied', () =>
  setDoc(doc(custDb, 'tuners', tuner.uid, 'customers', 'c2'), { name: '割り込み' })
);

// ── 予約ページの写し ────────────────────────────────────
await check('調律師は写しを作れる', 'allowed', () =>
  setDoc(bookingT, {
    tunerUid: tuner.uid, customerId: 'c1',
    tunerName: '泉川調律', customerName: 'テスト',
    pianos: [{ room: 'リビング', name: 'YAMAHA U1', dueMonth: '2026-09', fee: 13000 }],
    total: 13000, roughNeeded: false,
    reply: null, want: '', intake: { items: [], note: '' },
    repliedAt: null, revoked: false,
  })
);
await check('自分を名乗らない写しは作れない', 'denied', () =>
  setDoc(doc(custDb, 'bookings', token + 'x'), { tunerUid: tuner.uid, customerId: 'c1' })
);
await check('鍵を知っていれば写しを読める', 'allowed', () => getDoc(bookingC));
await check('一覧では引けない', 'denied', () => getDocs(collection(custDb, 'bookings')));

// ── お客様のお返事 ──────────────────────────────────────
await check('お客様は「お願いします」を書ける', 'allowed', () =>
  updateDoc(bookingC, { reply: 'yes', want: '9月の午前中が助かります', repliedAt: serverTimestamp() })
);
await check('「見送ります」も書ける', 'allowed', () =>
  updateDoc(bookingC, { reply: 'skip', repliedAt: serverTimestamp() })
);
await check('決められた値しか入らない', 'denied', () =>
  updateDoc(bookingC, { reply: 'maybe', repliedAt: serverTimestamp() })
);
await check('ほかの項目には触れない', 'denied', () =>
  updateDoc(bookingC, { reply: 'yes', customerName: '書き換え', repliedAt: serverTimestamp() })
);
await check('料金の書き換えもできない', 'denied', () =>
  updateDoc(bookingC, { reply: 'yes', total: 1, repliedAt: serverTimestamp() })
);
await check('日時を自分で決められない', 'denied', () =>
  updateDoc(bookingC, { reply: 'yes', repliedAt: new Date('2020-01-01') })
);
await check('長すぎる自由記入は通らない', 'denied', () =>
  updateDoc(bookingC, { reply: 'yes', want: 'あ'.repeat(201), repliedAt: serverTimestamp() })
);
await check('お客様は写しを消せない', 'denied', () => deleteDoc(bookingC));

// ── 鍵を作り直したあと ──────────────────────────────────
await check('調律師は鍵を無効にできる', 'allowed', () => updateDoc(bookingT, { revoked: true }));
await check('無効にした写しはお客様から読めない', 'denied', () => getDoc(bookingC));
await check('無効にしてもお客様は書けない', 'denied', () =>
  updateDoc(bookingC, { reply: 'yes', repliedAt: serverTimestamp() })
);
await check('無効でも調律師本人は読める', 'allowed', () => getDoc(bookingT));

// ── 後片付け ───────────────────────────────────────────
await check('調律師は写しを消せる', 'allowed', () => deleteDoc(bookingT));
await check('調律師は自分の台帳を消せる', 'allowed', () =>
  deleteDoc(doc(tunerDb, 'tuners', tuner.uid, 'customers', 'c1'))
);

const failed = results.filter((r) => !r[1]);
results.forEach(([n, ok, d]) => console.log((ok ? '  OK  ' : '  NG  ') + n + (ok ? '' : '   ' + d)));
console.log(`\n${results.length - failed.length} / ${results.length} 通過`);

await deleteApp(tunerApp);
await deleteApp(custApp);
process.exit(failed.length ? 1 : 0);
