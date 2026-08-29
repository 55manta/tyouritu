import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { recalcLastTuned, type RecordKind } from '../lib/cycle';
import { iso, today } from '../lib/date';
import type { Customer, Piano, Settings, Visit, WorkRecord } from '../types';
import { DEFAULT_SETTINGS, FREE_LIMIT } from '../types';
import * as db from './db';

/**
 * アプリ全体の状態。
 *
 * 記録の書き込みは saveRecord / updateRecord / deleteRecord の3つだけを通す。
 * 画面から piano.lastTunedOn を直接触らせない——監査（所見3）で、基準日を
 * 決める処理が2箇所に分かれていたために、過去日の記録を足すと次回時期が
 * 壊れる不具合が起きていたため。
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

  updateSettings: (patch: Partial<Settings>) => Promise<boolean>;
  resetToSamples: () => Promise<void>;
  clearAll: () => Promise<void>;
};

const AppCtx = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [saveFailed, setSaveFailed] = useState(false);

  useEffect(() => {
    (async () => {
      const [cs, st] = await Promise.all([db.loadCustomers(), db.loadSettings()]);
      setCustomers(cs);
      setSettings(st);
      setReady(true);
    })();
  }, []);

  /** 保存して、成否を必ず返す。失敗したら画面に出す */
  const commit = useCallback(async (next: Customer[]): Promise<boolean> => {
    const res = await db.saveCustomers(next);
    if (res.ok) {
      setCustomers(next);
      setSaveFailed(false);
      return true;
    }
    setSaveFailed(true);
    return false;
  }, []);

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

      updateSettings: async (patch) => {
        const next = { ...settings, ...patch };
        const res = await db.saveSettings(next);
        if (res.ok) { setSettings(next); return true; }
        setSaveFailed(true);
        return false;
      },

      resetToSamples: async () => {
        const { seed } = await import('./seed');
        const s = seed();
        await commit(s);
      },

      clearAll: async () => { await commit([]); },
    }),
    [ready, customers, settings, saveFailed, find, replace, commit]
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp(): Ctx {
  const v = useContext(AppCtx);
  if (!v) throw new Error('useApp は AppProvider の中でだけ使えます');
  return v;
}
