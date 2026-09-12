import type { Purchases } from './purchasesTypes';

/**
 * 課金が無い場所（Web の確認環境）用の入口。
 * react-native-purchases はネイティブモジュールなので Web では動かない。
 * 実機では Metro が purchases.native.ts のほうを読む。
 */
export const purchases: Purchases = {
  available: false,
  init() {},
  async getPrices() { return { monthly: null, yearly: null }; },
  async purchase() { return { ok: false, reason: 'この端末では購入できません。' }; },
  async restore() { return { ok: false, reason: 'この端末では復元できません。' }; },
  onPlanChange() { return () => {}; },
  async logIn() {},
  async logOut() {},
};
