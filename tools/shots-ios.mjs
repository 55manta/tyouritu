/**
 * App Store（iOS）用のスクリーンショットを作る。
 *
 *   node tools/shots-ios.mjs
 *
 * shots.mjs と同じ手順を、Apple の 6.9インチ表示（iPhone 16 Pro Max 相当）の
 * 実寸ピクセル 1320×2868 で撮り直したもの。Google Play は比率さえ合えば通るが、
 * App Store Connect は端末ごとの実寸を求めるため別スクリプトにしている。
 *
 * この環境のChromeは、ビューポート幅が実機並みに狭い（〜660px以下）と、
 * タブ見出し「売上」の2文字だけが「赤ト」という別の字に化けて描画される
 * 既知不具合がある（DOM上の文字列は正しく、他の場所の同じ文字は正しく描画される
 * ため、react-navigationのタブバーが幅に応じて内部で行う何らかの処理と、
 * この環境のフォント描画が組み合わさったときだけ起きる表示バグと判断した）。
 * 768px以上では発生しないことを確認したため、768×1662（Apple実寸と同じ比率）で
 * 撮ってから tools/upscale-shots.ps1 で 1284×2778（6.5インチ表示。App Store Connect
 * が現在このアプリに求めているスクリーンショットのサイズ）へ拡大する。
 * 実機の430pt前後より横に余裕があるぶん、文字はわずかに小さめに写る。
 */

import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const APP_URL = 'http://localhost:8949/';
const OUT = new URL('../store/screenshots-ios/', import.meta.url).pathname.replace(/^\//, '');

mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  defaultViewport: { width: 768, height: 1662, deviceScaleFactor: 1 },
  args: ['--hide-scrollbars'],
});
const page = await browser.newPage();

async function tap(text, n = 0) {
  return page.evaluate((t, i) => {
    const els = [...document.querySelectorAll('div,button')]
      .filter((e) => e.textContent.trim() === t && e.children.length === 0);
    const el = els[i];
    if (!el) return false;
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    el.click();
    return true;
  }, text, n);
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function shot(name) {
  await wait(700);
  await page.screenshot({ path: OUT + name + '.png' });
  console.log('  ', name + '.png');
}

await page.goto(APP_URL, { waitUntil: 'networkidle0' });
await wait(2500);

console.log('撮ります:');
await shot('1-home');

await tap('予定'); await shot('2-schedule');
await tap('お客様'); await shot('3-customers');
await tap('売上'); await shot('4-revenue');

await tap('お客様'); await wait(600);
await tap('鈴木 音楽教室 様'); await wait(900);
await tap('この台を記録する'); await wait(900);
await page.evaluate(() => {
  const el = [...document.querySelectorAll('div')]
    .find((e) => !e.children.length && e.textContent.trim() === '写真');
  if (el) el.scrollIntoView({ block: 'start' });
});
await shot('5-record');

await browser.close();
console.log('できました:', OUT);
