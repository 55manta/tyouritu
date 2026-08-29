import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { getApp } from '@react-native-firebase/app';
import {
  getAuth, onAuthStateChanged, signInWithCredential, signOut as fbSignOut,
  AppleAuthProvider,
} from '@react-native-firebase/auth';
import {
  getFirestore, doc, collection, getDocs, setDoc, deleteDoc, onSnapshot,
  serverTimestamp,
} from '@react-native-firebase/firestore';

import type { Cloud, CloudUser, BookingMirror, BookingReply } from './cloudTypes';
import type { Customer, Settings } from '../types';

/**
 * 実機のクラウド入口。
 *
 * 台帳そのものは端末の中（AsyncStorage）が正で、ここへは控えを送る。
 * クラウドが落ちていても、圏外でも、サインインしていなくても、
 * アプリは今までどおり動く——それがこの分け方の理由。
 *
 * 予約ページの写し（bookings/{token}）だけは別で、お客様のお返事が
 * 届く先なのでクラウドが正になる。
 */

const app = getApp();
const auth = getAuth(app);
const db = getFirestore(app);

function toUser(u: { uid: string; email: string | null } | null): CloudUser {
  return u ? { uid: u.uid, email: u.email } : null;
}

/** Firestore は undefined を受け取らないので、落として渡す */
function clean<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

export const cloud: Cloud = {
  available: true,

  onUser(cb) {
    return onAuthStateChanged(auth, (u) => cb(toUser(u)));
  },

  async canSignInWithApple() {
    if (Platform.OS !== 'ios') return false;
    try {
      return await AppleAuthentication.isAvailableAsync();
    } catch {
      return false;
    }
  },

  async signInWithApple() {
    // 氏名は使わないので求めない。サインインの画面で聞くことを1つ減らす。
    // 本人を見分けるのはメールアドレス（Firebase 側に残るので2回目以降も引ける）。
    const res = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL],
    });
    if (!res.identityToken) throw new Error('Apple から本人確認の情報を受け取れませんでした。');

    const credential = AppleAuthProvider.credential(res.identityToken);
    await signInWithCredential(auth, credential);
    return toUser(auth.currentUser);
  },

  async signOut() {
    await fbSignOut(auth);
  },

  // ── 台帳の控え ──────────────────────────────────
  // お客様1件＝1ドキュメント。理由は firestore-design.md §3。

  async pushCustomer(uid, c) {
    await setDoc(
      doc(db, 'tuners', uid, 'customers', c.id),
      { ...clean(c), updatedAt: serverTimestamp() }
    );
  },

  async removeCustomer(uid, customerId) {
    await deleteDoc(doc(db, 'tuners', uid, 'customers', customerId));
  },

  async pullCustomers(uid) {
    const snap = await getDocs(collection(db, 'tuners', uid, 'customers'));
    return snap.docs.map((d) => {
      const { updatedAt, ...rest } = d.data() as Customer & { updatedAt?: unknown };
      return rest as Customer;
    });
  },

  async pushSettings(uid, s) {
    await setDoc(doc(db, 'tuners', uid, 'meta', 'settings'), clean(s));
  },

  // ── お客様の予約ページ ──────────────────────────

  async putBooking(token, data) {
    // 作り直しのときも同じIDに上書きする。reply は消さない（返事が消えると困る）
    await setDoc(
      doc(db, 'bookings', token),
      { ...clean(data), revoked: false, updatedAt: serverTimestamp() },
      { merge: true }
    );
  },

  async revokeBooking(token) {
    await setDoc(doc(db, 'bookings', token), { revoked: true }, { merge: true });
  },

  /**
   * 一覧では引かず、鍵を1つずつ見張る。
   * bookings の list はルールで閉じてあるうえ、送ったご案内の数はたかだか数十なので
   * 1件ずつの購読で足りる。
   */
  watchBookings(tokens, cb) {
    const stops = tokens.map((token) =>
      onSnapshot(doc(db, 'bookings', token), (snap) => {
        const d = snap.data() as (BookingMirror & Partial<BookingReply>) | undefined;
        if (!d || !d.reply) return;
        cb({
          token,
          customerId: d.customerId,
          reply: d.reply,
          want: d.want || '',
          intake: d.intake || { items: [], note: '' },
        });
      }, () => { /* 読めない鍵は黙って見送る。作り直した直後など */ })
    );
    return () => stops.forEach((s) => s());
  },
};
