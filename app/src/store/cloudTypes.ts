import type { Customer, Settings } from '../types';

/**
 * クラウド側の入口の形。
 *
 * 実装は2つある。
 *   cloud.native.ts … 実機（@react-native-firebase）
 *   cloud.ts        … Web の確認環境。ネイティブモジュールが無いので何もしない
 *
 * 画面と AppContext はこの形しか知らない。クラウドが使えない場所でも
 * アプリがそのまま動くようにするため、失敗は例外ではなく戻り値で返す。
 */

export type CloudUser = { uid: string; email: string | null } | null;

/** お客様に見せる分だけを写したもの。住所・電話・メモ・写真・売上は入れない */
export type BookingMirror = {
  tunerUid: string;
  customerId: string;
  customerName: string;
  pianos: { room: string; name: string; dueMonth: string; fee: number }[];
  total: number;
  roughNeeded: boolean;
};

/** お客様からのお返事 */
export type BookingReply = {
  token: string;
  customerId: string;
  reply: 'yes' | 'skip';
  want: string;
  intake: { items: string[]; note: string };
};

export type Cloud = {
  /** この端末でクラウドが使えるか。Web の確認環境では false */
  readonly available: boolean;

  /** サインイン状態の変化。戻り値を呼ぶと購読をやめる */
  onUser(cb: (u: CloudUser) => void): () => void;
  /** この端末で「Appleでサインイン」が使えるか */
  canSignInWithApple(): Promise<boolean>;
  signInWithApple(): Promise<CloudUser>;
  signOut(): Promise<void>;

  // ── 台帳の控え ──────────────────────────────────
  pushCustomer(uid: string, c: Customer): Promise<void>;
  removeCustomer(uid: string, customerId: string): Promise<void>;
  pullCustomers(uid: string): Promise<Customer[]>;
  pushSettings(uid: string, s: Settings): Promise<void>;

  // ── お客様の予約ページ ──────────────────────────
  putBooking(token: string, data: BookingMirror): Promise<void>;
  revokeBooking(token: string): Promise<void>;
  /** 送ったご案内の返事を見張る。戻り値を呼ぶと見張りをやめる */
  watchBookings(tokens: string[], cb: (r: BookingReply) => void): () => void;
};
