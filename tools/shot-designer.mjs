import { chromium } from 'playwright';
const OUT = new URL('screenshots/', import.meta.url);
const P = (f) => decodeURIComponent(new URL(f, OUT).pathname);
const browser = await chromium.launch();

for (const vp of [{n:'desktop',w:1440,h:900},{n:'mobile',w:390,h:844}]) {
  const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h }, hasTouch: vp.n==='mobile' });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type()==='error') errors.push(m.text()); });
  await page.goto('http://localhost:4200/vehiculos/veh-dfe658/plazas', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  // Aplicar plantilla para ver butacas
  await page.locator('[data-testid="op-template"]').click();
  await page.waitForTimeout(400);
  // El clic desplaza la barra móvil para alcanzar el botón: se devuelve al inicio.
  await page.evaluate(() => { const t = document.querySelector('.tools'); if (t) t.scrollLeft = 0; });
  await page.waitForTimeout(150);
  await page.screenshot({ path: P(`designer-${vp.n}.png`), fullPage: vp.n==='mobile' });
  const info = await page.evaluate(() => {
    const grid = document.querySelector('[data-testid="seat-grid"]');
    const cells = document.querySelectorAll('[data-cell]');
    const firstSeat = document.querySelector('[data-kind="seat"]');
    const r = firstSeat?.getBoundingClientRect();
    return {
      celdas: cells.length,
      butacas: document.querySelectorAll('[data-kind="seat"]').length,
      tamanoCelda: r ? `${Math.round(r.width)}x${Math.round(r.height)}` : null,
      grid: grid ? `${Math.round(grid.getBoundingClientRect().width)}x${Math.round(grid.getBoundingClientRect().height)}` : null,
      orientacion: document.querySelector('app-seat-designer-page')?.getAttribute('data-orientation'),
      estado: document.querySelector('[data-testid="status-bar"]')?.textContent?.replace(/\s+/g,' ').trim().slice(0,120),
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth
    };
  });
  console.log(`\n=== ${vp.n} ===`, JSON.stringify(info, null, 1));
  if (errors.length) console.log('ERRORES:', errors.slice(0,3));
  await page.close();
}
await browser.close();
