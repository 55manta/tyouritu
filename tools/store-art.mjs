/**
 * ストアに要る画像を作る。
 *
 *   node tools/store-art.mjs
 *
 * ・icon-512.png        … Play のアプリアイコン（512×512）
 * ・feature-1024x500.png … Play のフィーチャーグラフィック
 *
 * 手元の Chrome で HTML を描いて撮っている。画像ライブラリを足さずに、
 * アプリと同じ配色・同じ書体感のまま作れるのが理由。
 */

import puppeteer from 'puppeteer-core';
import { mkdirSync, readFileSync } from 'node:fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ROOT = 'C:/Users/bestp/Projects/choritsu-note/';
const OUT = ROOT + 'store/';
mkdirSync(OUT, { recursive: true });

const iconB64 = readFileSync(ROOT + 'app/assets/icon.png').toString('base64');
const ICON = `data:image/png;base64,${iconB64}`;

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--hide-scrollbars'],
});

async function render(html, width, height, file) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: OUT + file });
  await page.close();
  console.log('  ', file, `${width}×${height}`);
}

const base = `
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:"Yu Gothic UI","Hiragino Sans","Noto Sans JP",sans-serif; }
`;

console.log('作ります:');

// アイコン。1024を512へ落とすだけ
await render(`<style>${base}
  body { width:512px; height:512px; }
  img { width:512px; height:512px; display:block; }
</style><img src="${ICON}">`, 512, 512, 'icon-512.png');

// フィーチャーグラフィック。象牙の地にティール、右にアイコン
await render(`<style>${base}
  body {
    width:1024px; height:500px; background:#F4F2EC; color:#1E1C17;
    display:flex; align-items:center; gap:56px; padding:0 72px;
  }
  .t { flex:1; }
  h1 { font-size:64px; font-weight:800; letter-spacing:1px; margin-bottom:18px; }
  p  { font-size:27px; line-height:1.65; color:#5E594F; }
  .b { display:inline-block; margin-top:22px; background:#0C7F74; color:#fff;
       font-size:22px; font-weight:700; border-radius:999px; padding:12px 26px; }
  img { width:250px; height:250px; border-radius:56px; box-shadow:0 12px 32px rgba(30,28,23,.16); }
</style>
<div class="t">
  <h1>調律ノート</h1>
  <p>次の調律の時期が来たお客様が、ひと目でわかる。<br>ご案内はそのまま LINE・SMS・メールで送れます。</p>
  <div class="b">ピアノ調律師のための台帳</div>
</div>
<img src="${ICON}">`, 1024, 500, 'feature-1024x500.png');

await browser.close();
console.log('できました:', OUT);
