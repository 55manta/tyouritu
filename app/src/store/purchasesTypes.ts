import type { Plan } from '../types';

export type PurchasePlan = Exclude<Plan, 'free'>;

export type PlanPrice = { priceString: string };

export type Purchases = {
  /** この端末で課金が使えるか（Web確認環境では false） */
  available: boolean;

  /** アプリ起動時に一度だけ呼ぶ。SDKの初期化のみで、通信は行わない */
  init(): void;

  /** ストアの実価格。取得できないときは null（表示は types.ts の PLANS にある固定値へ落とす） */
  getPrices(): Promise<Record<PurchasePlan, PlanPrice | null>>;

  /** 購入する。利用者が自分でやめた場合は ok:false, reason:'' を返す（失敗として騒がない） */
  purchase(plan: PurchasePlan): Promise<{ ok: true } | { ok: false; reason: string }>;

  /** 機種変更・再インストール後の購入引き継ぎ */
  restore(): Promise<{ ok: true; plan: Plan } | { ok: false; reason: string }>;

  /**
   * 有効なプランの変化を見張る（更新の失敗・解約・別端末での購入引き継ぎなど）。
   * 呼ぶと現在値をすぐ1回通知し、以後は変わるたびに通知する。
   */
  onPlanChange(cb: (plan: Plan) => void): () => void;

  /** サインインしているアカウントとRevenueCat側の購入者を結びつける */
  logIn(uid: string): Promise<void>;
  logOut(): Promise<void>;
};
