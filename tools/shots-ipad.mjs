/**
 * App Store（iOS）用の iPad 13インチディスプレイ向けスクリーンショットを作る。
 *
 *   node tools/shots-ipad.mjs
 *
 * このアプリは supportsTablet:false（iPad最適化なし）だが、App Store Connect が
 * ビルドをユニバーサル扱いしているため 13インチiPadのスクリーンショットを要求してくる。
 * 1024×1366（iPad論理解像度の代表値、2048×2732の半分）で撮ってから
 * tools/upscale-ipad-shots.ps1 で実寸へ拡大する。
 */

import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const APP_URL = 'http://localhost:8940/';
const OUT = new URL('../store/screenshots-ipad/', import.meta.url).pathname.replace(/^\//, '');

mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  defaultViewport: { width: 1024, height: 1366, deviceScaleFactor: 1 },
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

await tap('お客様'); await shot('2-customers');
await tap('売上'); await shot('3-revenue');

await browser.close();
console.log('できました:', OUT);
