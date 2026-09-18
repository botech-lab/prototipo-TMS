import { chromium } from 'playwright';
const OUT = new URL('screenshots/', import.meta.url);
const P = (f) => decodeURIComponent(new URL(f, OUT).pathname);
const browser = await chromium.launch();

for (const vp of [{ n: 'desktop', w: 1440, h: 900 }, { n: 'mobile', w: 390, h: 844, touch: true }]) {
  const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h }, hasTouch: !!vp.touch });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://localhost:4200/vehiculos/veh-dfe658/plazas', { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);

  // Armar un bus desde el panel de plantillas para que haya butacas
  await page.locator('[data-testid="rail-templates"]').click();
  await page.waitForTimeout(250);
  await page.locator('[data-testid="preset-interurbano"]').click();
  await page.waitForTimeout(400);
  await page.locator('[data-testid="rail-seats"]').click();
  await page.waitForTimeout(300);

  await page.screenshot({ path: P(`canva-${vp.n}.png`) });

  const info = await page.evaluate(() => ({
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    overflowY: document.documentElement.scrollHeight - document.documentElement.clientHeight,
    rail: !!document.querySelector('.rail'),
    panel: !!document.querySelector('[data-testid="side-panel"]'),
    context: !!document.querySelector('[data-testid="context-bar"]'),
    dock: !!document.querySelector('[data-testid="dock"]'),
    pills: (document.querySelector('[data-testid="traffic-lights"]')?.textContent || '').replace(/\s+/g, ' ').trim(),
    seatTools: document.querySelectorAll('[data-testid^="tool-seat-"]').length,
    seats: document.querySelectorAll('[data-kind="seat"]').length
  }));
  console.log(`\n=== ${vp.n} ===`, JSON.stringify(info, null, 1));
  if (errors.length) console.log('ERRORES:', errors.slice(0, 3));
  await page.close();
}
await browser.close();
