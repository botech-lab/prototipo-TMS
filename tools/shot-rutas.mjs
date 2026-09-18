import { chromium } from 'playwright';
const OUT = new URL('screenshots/', import.meta.url);
const P = (f) => decodeURIComponent(new URL(f, OUT).pathname);
const browser = await chromium.launch();

for (const vp of [{n:'1440',w:1440,h:900},{n:'1920',w:1920,h:1080}]) {
  const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
  await page.goto('http://localhost:4200/rutas-maestras', { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await page.screenshot({ path: P(`rutas-${vp.n}.png`) });

  // Medir la tarjeta y su contenido
  const info = await page.evaluate(() => {
    const out = { cards: [], svg: [], containers: [] };
    document.querySelectorAll('.rm-route-card').forEach(c => {
      const r = c.getBoundingClientRect();
      out.cards.push({ w: Math.round(r.width), h: Math.round(r.height) });
    });
    document.querySelectorAll('[data-testid="route-graph-container"]').forEach(c => {
      const r = c.getBoundingClientRect();
      const svg = c.querySelector('svg');
      const sr = svg ? svg.getBoundingClientRect() : null;
      // Caja real que ocupa el dibujo dentro del SVG
      let bbox = null;
      if (svg && svg.getBBox) {
        try { const b = svg.getBBox(); bbox = { w: Math.round(b.width), h: Math.round(b.height) }; } catch {}
      }
      out.containers.push({
        contenedor: `${Math.round(r.width)}x${Math.round(r.height)}`,
        svgCaja: sr ? `${Math.round(sr.width)}x${Math.round(sr.height)}` : null,
        viewBox: svg?.getAttribute('viewBox'),
        dibujoReal: bbox
      });
    });
    return out;
  });
  console.log(`\n=== ${vp.n}px ===`);
  console.log('tarjetas:', JSON.stringify(info.cards));
  info.containers.slice(0,3).forEach(c => console.log(' ', JSON.stringify(c)));
  await page.close();
}
await browser.close();
