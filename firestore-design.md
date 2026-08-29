# Firestore の設計

2026-08-29。実物は `firestore.rules` / `storage.rules`。この文書は「なぜそうしたか」を残すためのもの。

---

## 1. 前提

この台帳には、お客様の**氏名・住所・電話番号・メールアドレス**が入る。調律師が個人情報取扱事業者になる場合もある。漏れたときに損なわれるのは、調律師とお客様の関係そのもの。だから設計は「速いか」より先に「読めてしまう経路が無いか」で決めている。

入口は2つしかない。

| | 誰が | 何を |
|---|---|---|
| 1 | 調律師本人（サインイン済み） | 自分の台帳を全部 |
| 2 | お客様（サインインなし・鍵つきURL） | **自分の1件の写しだけ** |

お客様は台帳を読まない。ここが設計の要。

---

## 2. コレクション

```
tuners/{uid}/meta/settings
    { taxMode, taxRate, durationMinutes, locale, plan, theme }

tuners/{uid}/customers/{customerId}
    { name, kana, kind, phone, email, line,
      addr: { country, postal, region, city, line1, line2 },
      parking, access, memo, photoConsent, bookToken,
      request: { at, pianoIds[], want, intake{} } | null,
      pianos: [ { id, room, maker, model, type, serial, made, env, fee,
                  intervalMonths, lastTunedOn, initialLast, nextDue,
                  remindedCycle, skippedCycle, custSkippedCycle,
                  history: [ WorkRecord ] } ],
      visits: [ { id, date, time, pianoIds[], note, prepSent } ],
      updatedAt }

bookings/{token}
    { tunerUid, customerId, customerName,
      pianos: [ { room, name, dueMonth, fee } ],
      total, roughNeeded,
      reply: null | 'yes' | 'skip', want, intake: { items[], note },
      repliedAt, revoked, updatedAt }
```

Cloud Storage：

```
photos/{uid}/{customerId}/{fileName}
```

---

## 3. なぜ「お客様1件＝1ドキュメント」か

ピアノと作業の履歴を**サブコレクションに分けず、お客様の書類の中に入れている**。

**そうする理由**

- 周期の基準日を決める `recalcLastTuned()` は、1台ぶんの履歴を丸ごと見て決める。1回の書き込みで済むほうが、途中で壊れる状態が生まれない
- いまのアプリの持ち方（`Customer.pianos[].history[]`）と同じなので、AsyncStorage から載せ替えるだけになる。データの形を変えながら同期の仕組みも入れる、を同時にやらない
- 1軒ぶんを開くのに1回の読み取りで足りる。オフラインの取り回しも素直

**大きさの見積り**

作業の記録は1件あたりおおよそ 400〜700 バイト（メモを長めに書いて）。1台につき年1回、30年で30件。4台持ちのお客様でも 30 × 4 × 700 ≒ 84 KB。**1ドキュメントの上限 1 MiB に対して1割弱**で、実用上ぶつからない。

**ただし写真は入れない。** 入れると一発で上限に当たるうえ、台帳を1軒開くたびに写真まで転送してしまう。写真は Cloud Storage に置き、書類にはパスだけを持つ。

**この設計が向かなくなる時**：1軒あたりの記録が数百件に育つ場合（学校・ホールで台数が多く、年に何度も入るなど）。そのときは `customers/{id}/records/{recordId}` へ切り出す。切り出しても周期の計算は「その台の履歴を全部読んで最大の日付を採る」ままでよい。

---

## 4. お客様の予約ページ

`/b/{token}` は静的なページで、Firestore を直に読む。

**書類のIDが、そのまま鍵**。`crypto.getRandomValues` の128ビット（16進32文字）。お客様IDを流用しないのは、URLを転送されたときに鍵だけ作り直せるようにするため。

**写しには、お客様に見せてよいものしか入れない。**

入れる：お客様のお名前、部屋の呼び名、機種名、次回の時期（年月）、料金の目安、粗調律が要るかどうか。

調律師の名前は入れない。事業者情報の設定は要らないと判断して落としてあるうえ、
ご案内は LINE や SMS でご本人から届くので、ページ側で名乗る必要がない。

入れない：**住所・電話番号・メールアドレス・メモ・搬入経路・写真・売上・ほかのお客様の情報**。

鍵が漏れても、漏れるのはこの写し1件だけ。台帳には届かない。

### 一覧（list）を禁止している理由

`allow list: if false` を明示している。読み取りを1件取得（get）だけに絞らないと、`bookings` コレクションを丸ごと引かれて全お客様の写しが取れてしまう。鍵を長くしても、一覧が開いていれば意味がない。

### お客様が書き換えてよい範囲

`reply` / `want` / `intake` / `repliedAt` の4つだけ。1つでも他の項目に触れた書き込みは、まるごと拒否する（`diff().affectedKeys().hasOnly()`）。`reply` の値は `'yes'` か `'skip'` に限り、自由記入は文字数で上限をかける。

`repliedAt == request.time` を要求しているのは、お客様側から過去や未来の日時を書き込ませないため。

### サインインを必須にしている理由

お客様には見えないが、ページは**匿名認証**でサインインする。理由は2つ。

- **App Check** を効かせられる。鍵つきURLは、それを知っている誰でも（curl でも）叩ける。App Check があれば「このページから来た」ことを確かめられる
- 悪用されたときに、たどれる手がかりが残る

### まだ足りていないこと

**回数制限がかけられない。** セキュリティルールに「1分に何回まで」は書けない。鍵を知っている相手が同じ書類を叩き続けるのを止められない。実害は小さい（触れるのは自分の写し1件だけ）が、気になるなら Cloud Functions を挟む形に変える。

---

## 4.5 いまの実装（2026-08-29）

ページは **https://choritsu-note.web.app/b/{token}**（Firebase Hosting、`web/b/index.html`）。
アプリ側は `publishBooking()` で写しを置き、`watchBookings()` で送ったぶんの鍵を
1件ずつ購読してお返事を受け取る。一覧では引いていない。

台帳の控えは `tuners/{uid}/customers/{id}`。ただし**正は端末の中**（AsyncStorage）で、
ここは控え。そうした理由は HANDOFF.md §19。

---

## 5. 認証

**Apple でサインイン**（iOS）にした。この利用者層（年配の個人事業主が多い）は
パスワードの再発行で詰まりやすいため、パスワードを覚えなくてよい方法を第一にしている。
iOS ネイティブの流れなので、Firebase 側は Apple プロバイダを有効にするだけでよく、
サービスIDや鍵は要らない。

**Android はまだ**。Google サインインは Android 着手時に足す。ルールは
`request.auth.uid` しか見ていないので、増やしても影響しない。

お客様の予約ページは**匿名認証**。姿は見えないが、これがあると App Check を
効かせられ、悪用時にたどれる手がかりも残る。匿名アカウントは30日で自動削除する設定。

---

## 6. まだ書いていないもの

- **写真の自動削除**。プライバシーポリシーに「一定期間ののち自動的に削除します」と書いてある。実装は Cloud Functions のスケジュール実行になる。Blaze プランが要る
- **お客様からの削除のお申し出**。台帳の1件と、その写し、Storage の写真をまとめて消す導線
- **索引**。いまは `firestore.indexes.json` が空。1軒ずつ取得するのと、自分の customers を全部読むのしかしていないため、複合索引は要らない。並べ替えや絞り込みをサーバ側でやり始めたら追加する
- **Storage のルールはまだ配っていない**。バケットを作っていないため。写真をクラウドへ移す段で `firebase deploy --only storage` する
