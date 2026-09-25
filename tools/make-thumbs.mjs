// Превью 960px для карточек и папок: assets/work/<id>/<f> -> assets/thumbs/<id>/<f>
// Запуск из папки portfolio: npm i playwright-core && node tools/make-thumbs.mjs [id]
// Нужен установленный Google Chrome.
import { chromium } from 'playwright-core';
import { pathToFileURL, fileURLToPath } from 'node:url';
import fs from 'node:fs'; import path from 'node:path';
const BASE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../assets') + '/';
const only = process.argv[2];
const browser = await chromium.launch({ channel: 'chrome' });
const p = await browser.newPage();
for (const id of fs.readdirSync(BASE + 'work')) {
  if (only && id !== only) continue;
  fs.mkdirSync(BASE + 'thumbs/' + id, { recursive: true });
  for (const f of fs.readdirSync(BASE + 'work/' + id)) {
    if (!/\.jpe?g$/i.test(f) || /phones/.test(f)) continue;
    const src = BASE + 'work/' + id + '/' + f, dst = BASE + 'thumbs/' + id + '/' + f;
    const html = path.resolve(BASE, '../tools/_t.html');
    fs.writeFileSync(html, `<body style="margin:0"><img id=i src="${pathToFileURL(src).href}" style="display:block">`);
    await p.goto(pathToFileURL(html).href, { waitUntil: 'load' });
    const { w, h } = await p.evaluate(() => ({ w: i.naturalWidth, h: i.naturalHeight }));
    const tw = Math.min(960, w), th = Math.round(h * tw / w);
    await p.evaluate(tw => { i.style.width = tw + 'px'; }, tw);
    await p.setViewportSize({ width: tw, height: th });
    await p.screenshot({ path: dst, quality: 80, clip: { x: 0, y: 0, width: tw, height: th } });
  }
  console.log('thumbs', id);
}
await browser.close();
fs.rmSync(path.resolve(BASE, '../tools/_t.html'), { force: true });
