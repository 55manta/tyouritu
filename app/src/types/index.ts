import type { RecordKind } from '../lib/cycle';

/** 住所。国ごとに並びと呼び方が違うので、構造は国際共通で持ち、表示のときだけ組み替える */
export type Address = {
  country: string;   // 'JP'
  postal: string;
  region: string;    // 都道府県 / State / County
  city: string;
  line1: string;     // 番地
  line2: string;     // 建物名・部屋番号
};

/** 作業の記録。定期調律も単発の修理も、すべてここに積む */
export type WorkRecord = {
  id: string;
  date: string;              // YYYY-MM-DD
  kind: RecordKind;
  work: string;              // 「調律」「弦の交換」など
  fee: number;
  memo: string;
  pitch: string;             // '440'〜'443'。未記録なら空
  humid: string;             // 湿度の目安。未記録なら空
  cond: Condition | null;    // ピアノの状態。記録しなければ null
  photoBefore: string | null;
  photoAfter: string | null;
  via: boolean;              // ご案内から生まれた仕事か
  pay: PayMethod;
  bill: BillState;
  billedAt?: string;
  paidAt?: string;
};

export type Condition = {
  strings: CondLevel;
  action: CondLevel;
  keys: CondLevel;
  humid: CondLevel;
};
export type CondLevel = 'ok' | 'watch' | 'act';

export const PAY_METHODS = ['現金', 'PayPay', 'クレジットカード', '請求書（後日振込）'] as const;
export type PayMethod = (typeof PAY_METHODS)[number];

/** 未請求 → 請求済 → 入金済 */
export type BillState = 'unbilled' | 'billed' | 'paid';

export type Piano = {
  id: string;
  room: string;              // 設置場所の呼び名（リビング・音楽室…）
  maker: string;
  model: string;
  type: string;              // アップライト / グランド
  serial: string;            // 製造番号。同型番の個体識別に要る
  made: string;              // 製造年
  env: string;               // 設置環境
  fee: number;               // 基本料金
  intervalMonths: number;    // 標準の周期
  lastTunedOn: string;       // 周期の基準日。recalcLastTuned だけが書き換える
  initialLast: string;       // 登録時の前回調律日。調律記録が全部消えたときの戻り先
  nextDue: string | null;    // この周期にかぎった次回日の上書き
  remindedCycle: string | null;
  skippedCycle: string | null;
  custSkippedCycle: string | null;
  history: WorkRecord[];
};

export type Visit = {
  id: string;
  date: string;
  time: string;              // 空なら「日付だけ確定」
  pianoIds: string[];
  note: string;
  /** 訪問前のご案内を送った日。二度送りを防ぐ */
  prepSent?: string;
};

/** お客様から「お願いします」が届いた状態 */
export type CustomerRequest = {
  at: string;
  pianoIds: string[];
  want: string;              // ご希望の時期（自由記入）
  intake: { items: string[]; note: string };
};

export const CUSTOMER_KINDS = ['一般家庭', '音楽教室', '学校・ホール', 'スタジオ'] as const;
export type CustomerKind = (typeof CUSTOMER_KINDS)[number];

export type Customer = {
  id: string;
  name: string;
  kana: string;              // あいうえお順に並べるため。漢字だと文字コード順になる
  kind: CustomerKind;
  phone: string;
  email: string;
  line: string;
  addr: Address;
  parking: string;
  access: string;            // 搬入経路・室内メモ
  memo: string;
  photoConsent: 'yes' | 'no' | null;   // お宅の写真を保存してよいか
  bookToken: string | null;            // お客様用ページの鍵。顧客IDとは別物
  request: CustomerRequest | null;
  pianos: Piano[];
  visits: Visit[];
};

export type Plan = 'free' | 'monthly' | 'yearly';

export type Settings = {
  taxMode: 'none' | 'incl';  // 免税事業者 / 課税事業者
  taxRate: number;
  durationMinutes: number;   // 1台あたりの作業時間
  locale: string;
  plan: Plan;
};

export const DEFAULT_SETTINGS: Settings = {
  taxMode: 'none',
  taxRate: 10,
  durationMinutes: 120,
  locale: 'ja-JP',
  plan: 'free',
};

/** 無料で預かれるお客様の数。超えても既存の台帳は読めるままにする */
export const FREE_LIMIT = 10;

export const PLANS: Record<Exclude<Plan, 'free'>, { name: string; price: number; unit: string; note: string }> = {
  yearly:  { name: '年額プラン', price: 12000, unit: '年', note: '2ヶ月ぶんお得（月あたり 1,000円）' },
  monthly: { name: '月額プラン', price: 1200,  unit: '月', note: '毎月のお支払い' },
};
