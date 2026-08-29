import React, { useEffect, useState } from 'react';
import { SendSheet } from './SendSheet';
import { bookingUrl, reminderMessage } from '../lib/messages';
import { pendingPianos } from '../lib/select';
import { useApp } from '../store/AppContext';

/**
 * 調律のご案内を送るシート。
 *
 * 文面に予約ページのURLが入るため、開いた時点で鍵を作って保存する
 * （送る直前に作ると、画面に見えている文面と実際に送られる文面がずれる）。
 */
export function ReminderSheet({
  customerId, onClose,
}: {
  customerId: string | null;
  onClose: () => void;
}) {
  const { find, settings, ensureBookingToken, markReminded } = useApp();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (!customerId) { setToken(null); return; }
    ensureBookingToken(customerId).then((t) => { if (alive) setToken(t || null); });
    return () => { alive = false; };
    // ensureBookingToken は毎描画で作り直されるため、依存はお客様だけにする
  }, [customerId]);

  const customer = customerId ? find(customerId) : undefined;
  if (!customer || !token) return null;

  const pianos = pendingPianos(customer);
  if (!pianos.length) return null;

  return (
    <SendSheet
      visible
      customer={customer}
      title="調律のご案内を送る"
      subtitle={`${customer.name} 様（${pianos.length}台）`}
      subject="ピアノ調律のご案内"
      message={reminderMessage(customer, pianos, bookingUrl(token), settings.locale === 'ja-JP')}
      note="送信先のアプリが立ち上がります。お客様が予約ページで選ばれた内容は、この画面に届きます。"
      onClose={onClose}
      onSent={async () => { await markReminded(customer.id); onClose(); }}
    />
  );
}
