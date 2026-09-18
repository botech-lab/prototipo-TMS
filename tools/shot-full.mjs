import { chromium } from 'playwright';
const OUT = new URL('screenshots/', import.meta.url);
const P = (f) => decodeURIComponent(new URL(f, OUT).pathname);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4200/rutas-maestras', { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
// Colapsar La Paz para ver todos los orígenes emparejados
await page.locator('[data-testid^="department-header-"]').first().click();
await page.waitForTimeout(500);
await page.screenshot({ path: P('rutas-colapsados.png'), fullPage: true });

const info = await page.evaluate(() => {
  return [...document.querySelectorAll('[data-testid="department-accordion-item"]')].map(el => {
    const r = el.getBoundingClientRect();
    const t = el.querySelector('h2')?.textContent?.trim() ?? '';
    return { origen: t.replace('ORIGEN: ',''), x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width) };
  });
});
console.log(JSON.stringify(info, null, 1));
await browser.close();
