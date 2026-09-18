import { chromium } from 'playwright';
const browser = await chromium.launch();
for (const w of [1440, 1920]) {
  const page = await browser.newPage({ viewport: { width: w, height: 1000 } });
  await page.goto('http://localhost:4200/rutas-maestras', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const r = await page.evaluate(() => {
    const out = {};
    // Barra de cabecera del acordeón de origen
    const bar = [...document.querySelectorAll('div,header,button')]
      .find(el => el.textContent?.includes('ORIGEN:') && el.textContent?.includes('Rutas') && el.clientWidth > 600);
    if (bar) {
      const br = bar.getBoundingClientRect();
      const left = [...bar.querySelectorAll('*')].find(e => e.textContent?.trim().startsWith('ORIGEN:'));
      const right = [...bar.querySelectorAll('*')].find(e => /Rutas$/.test(e.textContent?.trim() || '') && e.children.length === 0);
      const lr = left?.getBoundingClientRect(), rr = right?.getBoundingClientRect();
      out.barra = `${Math.round(br.width)}x${Math.round(br.height)}`;
      out.izquierda = lr ? `${Math.round(lr.left)}→${Math.round(lr.right)}` : null;
      out.derecha = rr ? `${Math.round(rr.left)}→${Math.round(rr.right)}` : null;
      out.huecoCentral = (lr && rr) ? Math.round(rr.left - lr.right) : null;
      out.porcentajeVacio = (lr && rr) ? Math.round((rr.left - lr.right) / br.width * 100) + '%' : null;
    }
    // Vacío de la retícula cuando una tarjeta está expandida
    const cards = [...document.querySelectorAll('.rm-route-card')].map(c => {
      const b = c.getBoundingClientRect();
      return { top: Math.round(b.top), h: Math.round(b.height), left: Math.round(b.left) };
    });
    out.tarjetas = cards.slice(0, 4);
    if (cards.length >= 3) {
      const fila = cards.filter(c => Math.abs(c.top - cards[0].top) < 5);
      const alta = Math.max(...fila.map(c => c.h));
      const bajas = fila.filter(c => c.h < alta);
      out.vacioRetícula = bajas.map(c => alta - c.h);
    }
    return out;
  });
  console.log(`\n=== ${w}px ===`);
  console.log(JSON.stringify(r, null, 2));
  await page.close();
}
await browser.close();
