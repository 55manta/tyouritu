import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { cycleKey, dueDate, recalcLastTuned } from '../lib/cycle';
import { pendingPianos, pianoName, quoted, reminderState } from '../lib/select';
import { needsRoughTuning } from '../lib/pricing';
import { iso, today } from '../lib/date';
import type { Customer, Piano, Settings, Visit, WorkRecord } from '../types';
import { DEFAULT_SETTINGS, FREE_LIMIT } from '../types';
import * as db from './db';
import { cloud } from './cloud';
import type { CloudUser, SignInMethod } from './cloudTypes';

/**
 * アプリ全体の状態。
 *
 * 記録の書き込みは saveRecord / updateRecord / deleteRecord の3つだけを通す。
 * 画面から piano.lastTunedOn を直接触らせない——監査（所見3）で、基準日を
 * 決める処理が2箇所に分かれていたために、過去日の記録を足すと次回時期が
 * 壊れる不具合が起きていたため。
 *
 * 台帳の正は端末の中（AsyncStorage）。クラウドへは控えを送る。
 * サインインしていなくても、圏外でも、クラウドが落ちていても、
 * アプリは今までどおり動く。控えが要るのは、端末を無くしたときに
 * 台帳ごと消えるのが、このアプリでいちばん取り返しがつかないため。
 */

type Ctx = {
  ready: boolean;
  customers: Customer[];
  settings: Settings;
  /** 保存に失敗したまま復旧していない状態。画面上部に警告を出し続ける */
  saveFailed: boolean;

  find: (id: string) => Customer | undefined;
  canAddCustomer: boolean;

  addCustomer: (c: Customer) => Promise<boolean>;
  updateCustomer: (id: string, patch: Partial<Customer>) => Promise<boolean>;
  deleteCustomer: (id: string) => Promise<boolean>;

  addPiano: (customerId: string, p: Piano) => Promise<boolean>;
  deletePiano: (customerId: string, pianoId: string) => Promise<boolean>;

  saveRecord: (customerId: string, pianoId: string, rec: WorkRecord, nextDue: string | null) => Promise<boolean>;
  updateRecord: (customerId: string, pianoId: string, rec: WorkRecord) => Promise<boolean>;
  deleteRecord: (customerId: string, pianoId: string, recordId: string) => Promise<boolean>;

  addVisit: (customerId: string, v: Visit) => Promise<boolean>;
  updateVisit: (customerId: string, visitId: string, patch: Partial<Visit>) => Promise<boolean>;
  deleteVisit: (customerId: string, visitId: string) => Promise<boolean>;

  /** ご案内を送った印。この周期のあいだ、案内済みとして扱う */
  markReminded: (customerId: string) => Promise<boolean>;
  /** 今回のご案内を見送る */
  skipCycle: (customerId: string) => Promise<boolean>;
  /** 見送りを取り消す。お客様側からの見送りも一緒に解く */
  unskipCycle: (customerId: string) => Promise<boolean>;
  /** お客様用ページの鍵。無ければ作って保存し、必ず値を返す */
  ensureBookingToken: (customerId: string) => Promise<string>;
  /** お客様に見せる写しをクラウドへ置く。ご案内を送るときに呼ぶ */
  publishBooking: (customerId: string) => Promise<void>;
  /** 古い予約ページを開かなくする */
  revokeBooking: (token: string) => Promise<void>;

  updateSettings: (patch: Partial<Settings>) => Promise<boolean>;
  resetToSamples: () => Promise<void>;
  clearAll: () => Promise<void>;

  // ── 控えとサインイン ────────────────────────────
  /** この端末でクラウドが使えるか */
  cloudAvailable: boolean;
  user: CloudUser;
  /** 控えの状況。画面に出して、黙って失敗している状態を作らない */
  syncState: 'off' | 'syncing' | 'synced' | 'failed';
  /** この端末で使えるサインインの方法。iOSはApple、AndroidはGoogle */
  signInMethods: SignInMethod[];
  signIn: (method: SignInMethod) => Promise<{ ok: true } | { ok: false; reason: string }>;
  signOut: () => Promise<void>;
};

const AppCtx = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [saveFailed, setSaveFailed] = useState(false);
  const [user, setUser] = useState<CloudUser>(null);
  const [syncState, setSyncState] = useState<'off' | 'syncing' | 'synced' | 'failed'>('off');
  const [signInMethods, setSignInMethods] = useState<SignInMethod[]>([]);

  /** 最後にクラウドへ送った内容。差分だけ送るために持つ */
  const pushed = useRef<Map<string, Customer>>(new Map());

  useEffect(() => {
    (async () => {
      const [cs, st] = await Promise.all([db.loadCustomers(), db.loadSettings()]);
      setCustomers(cs);
      setSettings(st);
      setReady(true);
    })();
    cloud.availableSignIn().then(setSignInMethods);
    return cloud.onUser(setUser);
  }, []);

  /**
   * 変わったお客様だけをクラウドへ送る。
   * 参照が同じものは触っていないので送らない（replace() が変更した1件だけ
   * 新しい object にしているため、参照の比較で足りる）。
   */
  const mirror = useCallback(async (uid: string, next: Customer[]) => {
    setSyncState('syncing');
    try {
      const seen = new Set<string>();
      for (const c of next) {
        seen.add(c.id);
        if (pushed.current.get(c.id) !== c) {
          await cloud.pushCustomer(uid, c);
          pushed.current.set(c.id, c);
        }
      }
      for (const id of [...pushed.current.keys()]) {
        if (!seen.has(id)) {
          await cloud.removeCustomer(uid, id);
          pushed.current.delete(id);
        }
      }
      setSyncState('synced');
    } catch {
      // 控えが送れなくても、端末の中の台帳は無事。画面に状態だけ出す
      setSyncState('failed');
    }
  }, []);

  /** 保存して、成否を必ず返す。失敗したら画面に出す */
  const commit = useCallback(async (next: Customer[]): Promise<boolean> => {
    const res = await db.saveCustomers(next);
    if (!res.ok) {
      setSaveFailed(true);
      return false;
    }
    setCustomers(next);
    setSaveFailed(false);
    db.markTouched();
    if (user) mirror(user.uid, next);   // 控えは後追いでよい。待たせない
    return true;
  }, [user, mirror]);

  // 効果の中から最新の値を読むための控え。値が変わるたびに効果を回したくない
  const latest = useRef({ customers, settings });
  latest.current = { customers, settings };

  /**
   * サインインした直後の一度だけ。
   *
   * 端末の中がまだサンプルのままなら、クラウドの台帳を取り込む（機種変更）。
   * 一度でも触っていれば、端末の中が正なので、そちらを送る。
   * サンプルでクラウドの台帳を上書きしてしまう事故を、これで防ぐ。
   */
  useEffect(() => {
    if (!ready) return;
    if (!user) { setSyncState('off'); pushed.current.clear(); return; }

    let alive = true;
    (async () => {
      setSyncState('syncing');
      try {
        const [remote, pristine] = await Promise.all([
          cloud.pullCustomers(user.uid),
          db.isPristine(),
        ]);
        if (!alive) return;

        if (pristine && remote.length > 0) {
          const res = await db.saveCustomers(remote);
          if (!alive) return;
          if (res.ok) {
            setCustomers(remote);
            db.markTouched();
            pushed.current = new Map(remote.map((c) => [c.id, c]));
            setSyncState('synced');
          } else {
            setSaveFailed(true);
            setSyncState('failed');
          }
        } else {
          pushed.current = new Map();            // 全件を送り直す
          await mirror(user.uid, latest.current.customers);
        }
        await cloud.pushSettings(user.uid, latest.current.settings);
      } catch {
        if (alive) setSyncState('failed');
      }
    })();
    return () => { alive = false; };
  }, [ready, user, mirror]);

  /**
   * お客様からのお返事を受け取る。
   *
   * 「お願いします」はご依頼として台帳に立て、日程は調律師が決める
   * （お客様に日付を選ばせない＝ダブルブッキングを構造で防ぐ）。
   * 「見送ります」は、その周期だけ見送りの印をつける。
   */
  const applyReply = useCallback((r: { customerId: string; reply: 'yes' | 'skip'; want: string; intake: { items: string[]; note: string } }) => {
    const cur = latest.current.customers;
    const c = cur.find((x) => x.id === r.customerId);
    if (!c) return;

    if (r.reply === 'yes') {
      if (c.request) return;                       // 二重に立てない
      const pend = pendingPianos(c);
      const next = cur.map((x) => (x.id !== c.id ? x : {
        ...x,
        request: { at: iso(today()), pianoIds: pend.map((p) => p.id), want: r.want, intake: r.intake },
      }));
      commitRef.current(next);
    } else {
      const ids = new Set(pendingPianos(c).map((p) => p.id));
      if (reminderState(pendingPianos(c)) === 'custSkipped') return;
      const next = cur.map((x) => (x.id !== c.id ? x : {
        ...x,
        pianos: x.pianos.map((p) => (ids.has(p.id) ? { ...p, custSkippedCycle: cycleKey(p) } : p)),
      }));
      commitRef.current(next);
    }
  }, []);

  const commitRef = useRef(commit);
  commitRef.current = commit;

  /** 送ったご案内の鍵だけを見張る。一覧では引かない（ルールで閉じてある） */
  const watchTokens = customers
    .filter((c) => c.bookToken && reminderState(pendingPianos(c)) === 'reminded')
    .map((c) => c.bookToken as string)
    .sort()
    .join(',');

  useEffect(() => {
    if (!ready || !user || !watchTokens) return;
    return cloud.watchBookings(watchTokens.split(','), applyReply);
  }, [ready, user, watchTokens, applyReply]);

  const find = useCallback((id: string) => customers.find((c) => c.id === id), [customers]);

  const replace = useCallback(
    (id: string, fn: (c: Customer) => Customer): Customer[] =>
      customers.map((c) => (c.id === id ? fn(c) : c)),
    [customers]
  );

  /** ピアノの履歴を差し替えたうえで、基準日を計算し直す。ここだけが lastTunedOn を触る */
  const withRecalced = (p: Piano, history: WorkRecord[]): Piano => {
    const next: Piano = { ...p, history: [...history].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)) };
    recalcLastTuned(next, next.history);
    return next;
  };

  const value: Ctx = useMemo(
    () => ({
      ready,
      customers,
      settings,
      saveFailed,
      find,
      canAddCustomer: settings.plan !== 'free' || customers.length < FREE_LIMIT,

      addCustomer: (c) => commit([...customers, c]),

      updateCustomer: (id, patch) => commit(replace(id, (c) => ({ ...c, ...patch }))),

      deleteCustomer: (id) => commit(customers.filter((c) => c.id !== id)),

      addPiano: (cid, p) => commit(replace(cid, (c) => ({ ...c, pianos: [...c.pianos, p] }))),

      deletePiano: (cid, pid) =>
        commit(
          replace(cid, (c) => ({
            ...c,
            pianos: c.pianos.filter((p) => p.id !== pid),
            // 予定からもこの台を外し、対象が無くなった予定そのものを消す
            visits: c.visits
              .map((v) => ({ ...v, pianoIds: v.pianoIds.filter((x) => x !== pid) }))
              .filter((v) => v.pianoIds.length > 0),
          }))
        ),

      saveRecord: (cid, pid, rec, nextDue) =>
        commit(
          replace(cid, (c) => ({
            ...c,
            request: null, // 伺ったので、お客様からのご依頼は片付く
            pianos: c.pianos.map((p) => {
              if (p.id !== pid) return p;
              const np = withRecalced(p, [rec, ...p.history]);
              if (rec.kind === 'tuning') {
                np.nextDue = nextDue;
                np.remindedCycle = null;
                np.skippedCycle = null;
                np.custSkippedCycle = null;
              }
              return np;
            }),
            // 済んだ予定から、その台を外す
            visits: c.visits
              .map((v) => (v.date > iso(today()) ? v : { ...v, pianoIds: v.pianoIds.filter((x) => x !== pid) }))
              .filter((v) => v.pianoIds.length > 0),
          }))
        ),

      updateRecord: (cid, pid, rec) =>
        commit(
          replace(cid, (c) => ({
            ...c,
            pianos: c.pianos.map((p) =>
              p.id === pid ? withRecalced(p, p.history.map((h) => (h.id === rec.id ? rec : h))) : p
            ),
          }))
        ),

      deleteRecord: (cid, pid, rid) =>
        commit(
          replace(cid, (c) => ({
            ...c,
            pianos: c.pianos.map((p) =>
              p.id === pid ? withRecalced(p, p.history.filter((h) => h.id !== rid)) : p
            ),
          }))
        ),

      addVisit: (cid, v) =>
        commit(replace(cid, (c) => ({ ...c, visits: [...c.visits, v], request: null }))),

      updateVisit: (cid, vid, patch) =>
        commit(replace(cid, (c) => ({ ...c, visits: c.visits.map((v) => (v.id === vid ? { ...v, ...patch } : v)) }))),

      deleteVisit: (cid, vid) =>
        commit(replace(cid, (c) => ({ ...c, visits: c.visits.filter((v) => v.id !== vid) }))),

      markReminded: (cid) => {
        const cur = customers.find((x) => x.id === cid);
        if (!cur) return Promise.resolve(false);
        const ids = new Set(pendingPianos(cur).map((p) => p.id));
        return commit(replace(cid, (c) => ({
          ...c,
          pianos: c.pianos.map((p) => (ids.has(p.id) ? { ...p, remindedCycle: cycleKey(p) } : p)),
        })));
      },

      skipCycle: (cid) => {
        const cur = customers.find((x) => x.id === cid);
        if (!cur) return Promise.resolve(false);
        const ids = new Set(pendingPianos(cur).map((p) => p.id));
        return commit(replace(cid, (c) => ({
          ...c,
          pianos: c.pianos.map((p) => (ids.has(p.id) ? { ...p, skippedCycle: cycleKey(p) } : p)),
        })));
      },

      // 見送り済みの台は pendingPianos に出てこないため、ここは全台を対象にする
      unskipCycle: (cid) =>
        commit(replace(cid, (c) => ({
          ...c,
          pianos: c.pianos.map((p) => ({ ...p, skippedCycle: null, custSkippedCycle: null })),
        }))),

      ensureBookingToken: async (cid) => {
        const cur = customers.find((x) => x.id === cid);
        if (!cur) return '';
        if (cur.bookToken) return cur.bookToken;
        const t = db.newToken();
        await commit(replace(cid, (c) => ({ ...c, bookToken: t })));
        return t;
      },

      publishBooking: async (cid) => {
        const c = customers.find((x) => x.id === cid);
        if (!c || !c.bookToken || !user) return;
        const pend = pendingPianos(c);
        const sur = settings.locale === 'ja-JP';
        // 写しに入れるのは、お客様に見せてよいものだけ。
        // 住所・電話・メモ・写真・売上は入れない（firestore-design.md §4）
        await cloud.putBooking(c.bookToken, {
          tunerUid: user.uid,
          customerId: c.id,
          customerName: c.name,
          pianos: pend.map((p) => ({
            room: p.room,
            name: pianoName(p),
            dueMonth: iso(dueDate(p)).slice(0, 7),
            fee: quoted(p, sur),
          })),
          total: pend.reduce((s, p) => s + quoted(p, sur), 0),
          roughNeeded: pend.some((p) => needsRoughTuning(p.lastTunedOn)),
        });
      },

      revokeBooking: (token) => cloud.revokeBooking(token),

      updateSettings: async (patch) => {
        const next = { ...settings, ...patch };
        const res = await db.saveSettings(next);
        if (!res.ok) { setSaveFailed(true); return false; }
        setSettings(next);
        db.markTouched();
        if (user) cloud.pushSettings(user.uid, next).catch(() => setSyncState('failed'));
        return true;
      },

      cloudAvailable: cloud.available,
      user,
      syncState,
      signInMethods,

      signIn: async (method) => {
        try {
          await cloud.signIn(method);
          return { ok: true as const };
        } catch (e) {
          const code = (e as { code?: string }).code || '';
          // 利用者が自分でやめた場合は、失敗として騒がない
          if (code.includes('CANCEL') || code === 'ERR_REQUEST_CANCELED') {
            return { ok: false as const, reason: '' };
          }
          return { ok: false as const, reason: 'サインインできませんでした。通信の状態をお確かめのうえ、もう一度お試しください。' };
        }
      },

      signOut: async () => {
        await cloud.signOut();
        pushed.current.clear();
        setSyncState('off');
      },

      resetToSamples: async () => {
        const { seed } = await import('./seed');
        const s = seed();
        await commit(s);
      },

      clearAll: async () => { await commit([]); },
    }),
    [ready, customers, settings, saveFailed, find, replace, commit, user, syncState, signInMethods]
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp(): Ctx {
  const v = useContext(AppCtx);
  if (!v) throw new Error('useApp は AppProvider の中でだけ使えます');
  return v;
}
