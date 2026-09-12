import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL, type CustomerInfo } from 'react-native-purchases';

import type { Plan } from '../types';
import type { Purchases as PurchasesApi, PurchasePlan } from './purchasesTypes';

/** RevenueCat の公開APIキー。秘密ではない（クライアントに埋め込む前提のキー） */
const REVENUECAT_API_KEY_IOS = 'appl_bczUBnlwSdsQgDdbZVJLwdgnYcm';

const ENTITLEMENT_ID = '調律ノート_pro';

const PRODUCT_ID: Record<PurchasePlan, string> = {
  monthly: 'jp.izumikawa.choritsunote.pro.monthly',
  yearly: 'jp.izumikawa.choritsunote.pro.yearly',
};

let configured = false;

function ensureConfigured() {
  if (configured) return;
  if (Platform.OS !== 'ios') return; // Androidは別ストアのキーが要るため、いまは未対応
  Purchases.configure({ apiKey: REVENUECAT_API_KEY_IOS });
  Purchases.setLogLevel(LOG_LEVEL.WARN);
  configured = true;
}

/** アクティブな権利から、このアプリのプランを判定する */
function planFromCustomerInfo(info: CustomerInfo): Plan {
  const ent = info.entitlements.active[ENTITLEMENT_ID];
  if (!ent) return 'free';
  if (ent.productIdentifier === PRODUCT_ID.yearly) return 'yearly';
  if (ent.productIdentifier === PRODUCT_ID.monthly) return 'monthly';
  return 'free';
}

export const purchases: PurchasesApi = {
  available: Platform.OS === 'ios',

  init() {
    ensureConfigured();
  },

  async getPrices() {
    if (!configured) return { monthly: null, yearly: null };
    try {
      const offerings = await Purchases.getOfferings();
      const pkgs = offerings.current?.availablePackages ?? [];
      const find = (id: string) => pkgs.find((p) => p.product.identifier === id)?.product.priceString ?? null;
      const monthly = find(PRODUCT_ID.monthly);
      const yearly = find(PRODUCT_ID.yearly);
      return {
        monthly: monthly ? { priceString: monthly } : null,
        yearly: yearly ? { priceString: yearly } : null,
      };
    } catch {
      return { monthly: null, yearly: null };
    }
  },

  async purchase(plan) {
    if (!configured) return { ok: false, reason: 'この端末では購入できません。' };
    try {
      const offerings = await Purchases.getOfferings();
      const pkg = offerings.current?.availablePackages.find(
        (p) => p.product.identifier === PRODUCT_ID[plan]
      );
      if (!pkg) return { ok: false, reason: 'プランを取得できませんでした。通信の状態をお確かめのうえ、もう一度お試しください。' };
      await Purchases.purchasePackage(pkg);
      return { ok: true as const };
    } catch (e) {
      const err = e as { userCancelled?: boolean; message?: string };
      if (err.userCancelled) return { ok: false, reason: '' };
      return { ok: false, reason: 'お手続きが完了しませんでした。通信の状態をお確かめのうえ、もう一度お試しください。' };
    }
  },

  async restore() {
    if (!configured) return { ok: false, reason: 'この端末では復元できません。' };
    try {
      const info = await Purchases.restorePurchases();
      return { ok: true as const, plan: planFromCustomerInfo(info) };
    } catch {
      return { ok: false, reason: '復元できませんでした。通信の状態をお確かめのうえ、もう一度お試しください。' };
    }
  },

  onPlanChange(cb) {
    if (!configured) { cb('free'); return () => {}; }
    const listener = (info: CustomerInfo) => cb(planFromCustomerInfo(info));
    Purchases.getCustomerInfo().then(listener).catch(() => cb('free'));
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => Purchases.removeCustomerInfoUpdateListener(listener);
  },

  async logIn(uid) {
    if (!configured) return;
    try { await Purchases.logIn(uid); } catch { /* 次回の起動で合わせれば十分 */ }
  },

  async logOut() {
    if (!configured) return;
    try { await Purchases.logOut(); } catch { /* サインアウト自体は続行する */ }
  },
};
