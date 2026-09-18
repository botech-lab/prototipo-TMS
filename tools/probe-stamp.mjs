import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4200/vehiculos/veh-dfe658/plazas', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
await page.locator('[data-testid="rail-templates"]').click(); await page.waitForTimeout(220);
await page.locator('[data-testid="preset-interurbano"]').click(); await page.waitForTimeout(450);

const info = await page.evaluate(() => {
  const h = document.querySelector('[data-testid="stamp-handle"]');
  const r = h.getBoundingClientRect();
  const got = { down: 0, moves: 0 };
  h.addEventListener('pointerdown', () => got.down++);
  document.addEventListener('pointermove', () => got.moves++);
  window.__got = got;
  const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
  return { caja: `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`,
           encima: top ? `${top.tagName}.${String(top.className).slice(0,40)}` : null,
           esElAsa: top === h || h.contains(top) };
});
console.log('ASA:', JSON.stringify(info, null, 1));

const box = await page.locator('[data-testid="stamp-handle"]').boundingBox();
const cell = await page.locator('[data-cell="0:0:0"]').boundingBox();
const cols = () => page.evaluate(() => getComputedStyle(document.querySelector('[data-testid="seat-grid"]')).gridTemplateColumns.split(' ').length);
console.log('celda:', Math.round(cell.width), 'px · filas antes:', await cols());
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.down();
await page.mouse.move(box.x + box.width / 2 + (cell.width + 6) * 2, box.y + box.height / 2, { steps: 6 });
console.log('tras arrastrar:', await page.evaluate(() => window.__got), 'filas:', await cols());
await page.mouse.up();
console.log('filas final:', await cols());
await browser.close();
