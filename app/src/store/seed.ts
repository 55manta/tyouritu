import { addDays, addMonths, iso, today } from '../lib/date';
import type { Customer, CustomerKind, Piano, WorkRecord } from '../types';
import { uid } from './db';

/**
 * サンプルのお客様 8軒。
 * 無料枠10軒に対して追加を試せる余地を残しつつ、8軒それぞれが
 * 別の機能のデモ材料になるように選んである（試作から引き継いだ構成）。
 *
 *  鈴木 音楽教室   今日の訪問 / 3台 / 日時確定
 *  高橋 さくら     日付だけ確定（第2層）
 *  渡辺 家         同日にもう1件 → 前日の時間決めが成立する条件
 *  田中 誠一       今月が時期
 *  中村 学園       4台 / 請求書払い → 入金の管理
 *  伊藤 ピアノ     来月が時期
 *  岡田 家         136ヶ月ぶり → 掘り起こし・経過加算・粗調律の警告
 *  石井 家         今月調律済み・ご案内から → 売上とROI表示
 */

function monthsAgo(m: number, day = 12): string {
  const d = addMonths(today(), -m);
  d.setDate(day);
  return iso(d);
}

type PianoSpec = {
  room: string; maker: string; model: string; type?: string;
  serial?: string; made?: string; env: string; fee: number;
  ago: number; day?: number; interval?: number;
  hist?: { ago: number; day?: number; work: string; fee: number; memo?: string; via?: boolean }[];
};

function piano(o: PianoSpec): Piano {
  const last = monthsAgo(o.ago, o.day ?? 12);
  return {
    id: uid('p'),
    room: o.room, maker: o.maker, model: o.model, type: o.type ?? 'アップライト',
    serial: o.serial ?? '', made: o.made ?? '', env: o.env,
    fee: o.fee, intervalMonths: o.interval ?? 12,
    lastTunedOn: last, initialLast: last, nextDue: null,
    remindedCycle: null, skippedCycle: null, custSkippedCycle: null,
    history: (o.hist ?? []).map<WorkRecord>((h) => ({
      id: uid('r'),
      date: monthsAgo(h.ago, h.day ?? o.day ?? 12),
      kind: 'tuning', work: h.work, fee: h.fee, memo: h.memo ?? '',
      pitch: '', humid: '', cond: null,
      photoBefore: null, photoAfter: null,
      via: !!h.via, pay: '現金', bill: 'paid',
      addWorks: [], addWorksApprovedAt: null,
    })),
  };
}

type CustSpec = {
  name: string; kana: string; kind?: CustomerKind;
  phone?: string; email?: string; line?: string;
  postal?: string; region: string; city: string; line1: string; line2?: string;
  parking?: string; access?: string; memo?: string;
  pianos: Piano[];
};

function customer(o: CustSpec): Customer {
  return {
    id: uid('c'),
    name: o.name, kana: o.kana, kind: o.kind ?? '一般家庭',
    phone: o.phone ?? '', email: o.email ?? '', line: o.line ?? '',
    addr: {
      country: 'JP', postal: o.postal ?? '', region: o.region,
      city: o.city, line1: o.line1, line2: o.line2 ?? '',
    },
    parking: o.parking ?? '', access: o.access ?? '', memo: o.memo ?? '',
    photoConsent: null, bookToken: null, request: null,
    pianos: o.pianos, visits: [],
  };
}

export function seed(): Customer[] {
  const list: Customer[] = [];
  let ps: Piano[];
  let c: Customer;

  // 音楽教室・3台・今日の訪問
  ps = [
    piano({ room: 'レッスン室A', maker: 'KAWAI', model: 'RX-2', type: 'グランド', serial: '2451190', made: '2006', env: '音楽教室', fee: 16000, ago: 13, hist: [{ ago: 13, work: '調律', fee: 16000 }] }),
    piano({ room: 'レッスン室B', maker: 'YAMAHA', model: 'U1', serial: '4880213', made: '1992', env: '音楽教室', fee: 13000, ago: 13, hist: [{ ago: 13, work: '調律', fee: 13000 }] }),
    piano({ room: '発表会ホール', maker: 'YAMAHA', model: 'C3', type: 'グランド', serial: '6102447', made: '2011', env: '音楽教室', fee: 18000, ago: 6, interval: 6, hist: [{ ago: 6, work: '調律', fee: 18000, via: true }] }),
  ];
  c = customer({
    name: '鈴木 音楽教室', kana: 'すずき おんがくきょうしつ', kind: '音楽教室',
    phone: '045-777-3300', email: 'info@suzuki-music.example.com',
    postal: '211-0005', region: '神奈川県', city: '川崎市中原区', line1: '新丸子町820-3', line2: '鈴木ビル 2F',
    parking: '敷地内に駐車可', access: '裏手の搬入口から。エレベーターなし・2階。',
    memo: '発表会前は早めに。3台まとめて依頼が基本。', pianos: ps,
  });
  c.visits = [{ id: uid('v'), date: iso(today()), time: '10:00', pianoIds: ps.map((p) => p.id), note: '3台まとめて' }];
  list.push(c);

  // 今月が時期
  ps = [piano({ room: '防音室', maker: 'YAMAHA', model: 'C3', type: 'グランド', serial: '5904112', made: '2004', env: '防音室', fee: 18000, ago: 12, hist: [{ ago: 12, work: '調律＋整音', fee: 22000, memo: '整音にこだわり。ハンマー整形も実施。' }] })];
  list.push(customer({
    name: '田中 誠一', kana: 'たなか せいいち', phone: '090-5566-7788', line: 'タナカ',
    postal: '158-0083', region: '東京都', city: '世田谷区', line1: '奥沢5-22-9',
    parking: '駐車不可・要相談', access: '地下の防音室。階段が急なので足元注意。',
    memo: '整音にこだわり。時間に余裕を持って。', pianos: ps,
  }));

  // 日付だけ確定（第2層）
  ps = [piano({ room: 'リビング', maker: 'KAWAI', model: 'K-300', serial: '2790554', made: '2015', env: 'リビング（一般家庭）', fee: 13000, ago: 12, hist: [{ ago: 12, work: '調律', fee: 13000 }] })];
  c = customer({
    name: '高橋 さくら', kana: 'たかはし さくら', phone: '080-1212-3434', email: 'sakura.t@example.com', line: 'さくらん',
    postal: '225-0011', region: '神奈川県', city: '横浜市青葉区', line1: 'あざみ野1-14-2',
    parking: '敷地内に駐車可', access: '玄関からすぐリビング。', memo: 'お子様が習い始め。', pianos: ps,
  });
  c.visits = [{ id: uid('v'), date: iso(addDays(today(), 6)), time: '', pianoIds: [ps[0].id], note: '' }];
  list.push(c);

  // 同日にもう1件（前日の時間決めが成立する条件）
  ps = [piano({ room: '和室', maker: 'YAMAHA', model: 'U1', serial: '3345120', made: '1985', env: '和室', fee: 13000, ago: 11, hist: [{ ago: 11, work: '調律＋修理', fee: 24000, memo: 'ハンマー2本交換' }] })];
  c = customer({
    name: '渡辺 家', kana: 'わたなべ け', phone: '045-333-2211',
    postal: '222-0033', region: '神奈川県', city: '横浜市港北区', line1: '新横浜3-7-18',
    parking: '近隣のコインパーキング', access: '和室は縁側から。畳を傷めないよう養生を持参。',
    memo: '10年ぶりに調律を再開。', pianos: ps,
  });
  c.visits = [{ id: uid('v'), date: iso(addDays(today(), 6)), time: '', pianoIds: [ps[0].id], note: '' }];
  list.push(c);

  // 学校・4台・請求書払い
  ps = [
    piano({ room: '音楽室', maker: 'YAMAHA', model: 'C3', type: 'グランド', serial: '5731004', made: '2002', env: '学校・ホール', fee: 18000, ago: 6, hist: [{ ago: 6, work: '調律', fee: 18000, via: true }] }),
    piano({ room: '体育館', maker: 'YAMAHA', model: 'U3', serial: '3980221', made: '1987', env: '学校・ホール', fee: 13000, ago: 6, hist: [{ ago: 6, work: '調律', fee: 13000, via: true }] }),
    piano({ room: '第2音楽室', maker: 'KAWAI', model: 'BL-51', serial: '1885340', made: '1983', env: '学校・ホール', fee: 13000, ago: 14, hist: [{ ago: 14, work: '調律', fee: 13000 }] }),
    piano({ room: '講堂', maker: 'KAWAI', model: 'KG-3C', type: 'グランド', serial: '1120887', made: '1978', env: '学校・ホール', fee: 20000, ago: 15, hist: [{ ago: 15, work: '調律＋修理', fee: 31000, memo: 'ダンパーフェルト交換。次回は整調を提案。' }] }),
  ];
  // 講堂の記録は請求書払いにして「入金の管理」の材料にする
  ps[3].history[0].pay = '請求書（後日振込）';
  ps[3].history[0].bill = 'unbilled';
  list.push(customer({
    name: '中村 学園', kana: 'なかむら がくえん', kind: '学校・ホール',
    phone: '045-222-9999', email: 'soumu@nakamura-gakuen.example.com',
    postal: '220-0011', region: '神奈川県', city: '横浜市西区', line1: '高島2-18-1',
    parking: '敷地内に駐車可', access: '守衛室で入館証を受け取る。土日は不可。',
    memo: '年度初めに一括発注。請求書払い（月末締め翌月末）。', pianos: ps,
  }));

  // スタジオ・2台・来月が時期
  ps = [
    piano({ room: '第1スタジオ', maker: 'STEINWAY', model: 'B-211', type: 'グランド', serial: 'S-558210', made: '1979', env: '防音室', fee: 20000, ago: 5, interval: 6, hist: [{ ago: 5, work: '調律', fee: 20000, via: true }] }),
    piano({ room: '第2スタジオ', maker: 'YAMAHA', model: 'S400B', type: 'グランド', serial: '5120993', made: '1996', env: '防音室', fee: 19000, ago: 5, interval: 6, hist: [{ ago: 5, work: '調律', fee: 19000, via: true }] }),
  ];
  list.push(customer({
    name: '伊藤 ピアノ studio', kana: 'いとう ぴあの すたじお', kind: 'スタジオ',
    phone: '03-6655-4433', email: 'studio@ito-piano.example.com', line: '伊藤スタジオ',
    postal: '153-0064', region: '東京都', city: '目黒区', line1: '下目黒2-3-11', line2: '目黒スタジオビル B1',
    parking: '敷地内に駐車可', access: '搬入用エレベーターあり。事前に管理室へ連絡。',
    memo: '半年ごと契約。録音が入る週は避ける。', pianos: ps,
  }));

  // 長期ご無沙汰（掘り起こし・経過加算・粗調律）
  ps = [piano({ room: '和室', maker: 'YAMAHA', model: 'U3', serial: '3712008', made: '1983', env: '和室', fee: 13000, ago: 148, hist: [{ ago: 148, work: '調律', fee: 13000 }] })];
  list.push(customer({
    name: '岡田 家', kana: 'おかだ け', phone: '044-555-6363',
    postal: '215-0004', region: '神奈川県', city: '川崎市麻生区', line1: '万福寺1-2-4',
    parking: '敷地内に駐車可',
    memo: '12年以上ご無沙汰。お子様が独立されてから触っていないとのこと。', pianos: ps,
  }));

  // 今月調律済み（売上とROI表示の材料）
  ps = [piano({ room: 'リビング', maker: 'KAWAI', model: 'BL-61', serial: '1750224', made: '1980', env: 'リビング（一般家庭）', fee: 13000, ago: 0, day: 4, hist: [{ ago: 0, day: 4, work: '調律', fee: 13000, via: true }, { ago: 12, work: '調律', fee: 13000 }] })];
  list.push(customer({
    name: '石井 家', kana: 'いしい け', phone: '090-7777-2323', line: 'いしい',
    postal: '232-0067', region: '神奈川県', city: '横浜市南区', line1: '弘明寺町265',
    parking: '近隣のコインパーキング', memo: '今月調律済み。', pianos: ps,
  }));

  return list;
}
