import type { Cloud } from './cloudTypes';

/**
 * クラウドが無い場所（Web の確認環境）用の入口。
 *
 * @react-native-firebase はネイティブモジュールなので Web では動かない。
 * ここが何もしない実装を返すことで、画面の確認はブラウザで続けられる。
 * 実機では Metro が cloud.native.ts のほうを読む。
 */
export const cloud: Cloud = {
  available: false,

  onUser(cb) {
    cb(null);
    return () => {};
  },
  async availableSignIn() { return []; },
  async signIn() { return null; },
  async signOut() {},
  async deleteAccount() { return { ok: false, reason: 'この端末では削除できません。' }; },

  async pushCustomer() {},
  async removeCustomer() {},
  async pullCustomers() { return []; },
  async pushSettings() {},

  async putBooking() {},
  async revokeBooking() {},
  watchBookings() { return () => {}; },
};
