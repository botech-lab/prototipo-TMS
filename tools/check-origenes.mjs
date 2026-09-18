import { chromium } from 'playwright';
const browser = await chromium.launch();
for (const w of [1280, 1440, 1920]) {
  const page = await browser.newPage({ viewport: { width: w, height: 900 } });
  await page.goto('http://localhost:4200/rutas-maestras', { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  await page.locator('[data-testid^="department-header-"]').first().click();
  await page.waitForTimeout(400);
  const r = await page.evaluate(() => {
    return [...document.querySelectorAll('[data-testid="department-accordion-item"]')].map(item => {
      const titulo = item.querySelector('h2')?.textContent?.trim().replace('ORIGEN: ','') ?? '';
      const izq = item.querySelector('header > div');
      const resumen = item.querySelector('[data-testid="origin-summary-compact"]');
      const rec = izq ? izq.scrollWidth - izq.clientWidth : 0;
      // ¿El resumen queda dentro de la caja de su contenedor?
      let cortado = 0;
      if (resumen && izq) {
        const rr = resumen.getBoundingClientRect(), ir = izq.getBoundingClientRect();
        cortado = Math.max(0, Math.round(rr.right - ir.right));
      }
      const h = Math.round(item.getBoundingClientRect().height);
      return { titulo, recorte: rec, resumenCortado: cortado, alto: h };
    });
  });
  const malos = r.filter(x => x.recorte > 1 || x.resumenCortado > 0);
  const alturas = [...new Set(r.map(x => x.alto))];
  console.log(`${w}px → ${malos.length ? '⚠️ ' + JSON.stringify(malos) : 'sin recortes'} · alturas ${JSON.stringify(alturas)}`);
  await page.close();
}
await browser.close();
