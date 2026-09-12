/**
 * ストア用のスクリーンショットを作る。
 *
 *   node tools/shots.mjs
 *
 * Web へ書き出したアプリ（http://localhost:8940）を、手元の Chrome で
 * 1440×2560（9:16）で撮る。Play も App Store もこの比率を受け付ける。
 *
 * 端末の実機で撮らないのは、同じ画面を毎回まったく同じ条件で出せるから。
 * 画面を直したら、このコマンドを流し直せば差し替わる。
 */

import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const APP_URL = 'http://localhost:8940/';
const OUT = new URL('../store/screenshots/', import.meta.url).pathname.replace(/^\//, '');

mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  defaultViewport: { width: 720, height: 1280, deviceScaleFactor: 2 },
  args: ['--force-device-scale-factor=2', '--hide-scrollbars'],
});
const page = await browser.newPage();

/** 画面の中の「ちょうどその文字だけ」の要素を押す。react-native-web は button 要素にならない */
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

// 記録画面は、お客様→ピアノ→記録 と辿らないと出ない
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
