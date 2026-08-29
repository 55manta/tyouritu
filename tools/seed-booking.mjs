/**
 * 予約ページを目で確かめるための、使い捨ての写しを1件置く。
 *
 *   node tools/seed-booking.mjs          … 置いて、URLを出す
 *   node tools/seed-booking.mjs <token>  … その写しを消す
 *
 * 匿名ユーザーを「調律師」に見立てて作る。本物の台帳には触れない。
 */

import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';

const config = {
  projectId: 'choritsu-note',
  appId: '1:256206159985:web:483f4f088cbabf83de5bd0',
  apiKey: 'AIzaSyCiFRJunevzA3hSWAy_3gM1WsB1iqjArI4',
  authDomain: 'choritsu-note.firebaseapp.com',
  messagingSenderId: '256206159985',
};

const app = initializeApp(config, 'seed');
const db = getFirestore(app);
const me = (await signInAnonymously(getAuth(app))).user;

const arg = process.argv[2];

if (arg === '--read') {
  const snap = await getDoc(doc(db, 'bookings', process.argv[3]));
  console.log(JSON.stringify(snap.data(), null, 2));
} else if (arg) {
  await deleteDoc(doc(db, 'bookings', arg));
  console.log('消しました:', arg);
} else {
    // 本物と同じ32桁の16進。ページ側が形を検査しているため、ここも合わせる
  const token = Array.from({ length: 32 }, () => '0123456789abcdef'[(Math.random() * 16) | 0]).join('');
  await setDoc(doc(db, 'bookings', token), {
    tunerUid: me.uid,
    customerId: 'demo-c1',
    customerName: '中村 学園',
    pianos: [
      { room: '第2音楽室', name: 'KAWAI BL-51', dueMonth: '2026-06', fee: 16500 },
      { room: '講堂', name: 'KAWAI KG-3C', dueMonth: '2026-05', fee: 16500 },
    ],
    total: 33000,
    roughNeeded: true,
    reply: null,
    want: '',
    intake: { items: [], note: '' },
    repliedAt: null,
    revoked: false,
  });
  console.log('https://choritsu-note.web.app/b/' + token);
  console.log('token:', token);
}

await deleteApp(app);
process.exit(0);
