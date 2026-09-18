import { chromium } from 'playwright';

const OUT = new URL('.', import.meta.url).pathname + 'screenshots';

const VIEWPORTS = [
  { name: 'iphone12',  width: 390,  height: 844 },
  { name: 'ipad-mini', width: 768,  height: 1024 },
  { name: 'ipad-pro',  width: 1024, height: 1366 },
  { name: 'laptop',    width: 1440, height: 900 },
  { name: 'wide',      width: 1920, height: 1080 },
];

const ROUTES = [
  { path: '/vehiculos', name: 'vehiculos' },
  { path: '/conductores', name: 'conductores' },
  { path: '/usuarios', name: 'usuarios' },
  { path: '/parametric/ciudades', name: 'ciudades' },
];

const browser = await chromium.launch();
const findings = [];

for (const vp of VIEWPORTS) {
  for (const route of ROUTES) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    await page.goto(`http://localhost:4200${route.path}`, { waitUntil: 'networkidle' });

    // Cambiar a vista de tarjetas y desplegar todas
    const cardsBtn = page.locator('[data-testid="view-switcher-cards"]');
    if (await cardsBtn.count()) {
      await cardsBtn.click();
      await page.waitForTimeout(200);
      const toggles = page.locator('[data-testid="btn-toggle-details"]');
      const n = await toggles.count();
      for (let i = 0; i < n; i++) await toggles.nth(i).click();
      await page.waitForTimeout(700);
    }

    const report = await page.evaluate(() => {
      const out = { overflowX: 0, cards: [], clipped: [], tiers: {} };

      // 1. Desborde horizontal del documento
      out.overflowX = document.documentElement.scrollWidth - document.documentElement.clientWidth;

      // 2. Tarjetas: ancho, escalón y altura
      document.querySelectorAll('[data-testid="entity-card"]').forEach(card => {
        const r = card.getBoundingClientRect();
        const tier = card.getAttribute('data-width-tier');
        out.tiers[tier] = (out.tiers[tier] || 0) + 1;
        out.cards.push({ w: Math.round(r.width), h: Math.round(r.height), tier });
      });

      // 3. Elementos cuyo contenido se recorta o desborda su caja
      const check = (sel, label) => {
        document.querySelectorAll(sel).forEach(el => {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) return;
          const overW = el.scrollWidth - el.clientWidth;
          const overH = el.scrollHeight - el.clientHeight;
          if (overW > 1 || overH > 1) {
            out.clipped.push({
              label,
              text: (el.textContent || '').trim().slice(0, 28),
              overW, overH,
              box: `${Math.round(r.width)}x${Math.round(r.height)}`
            });
          }
        });
      };
      check('[data-testid="block-matrix"] .matrix__grid', 'matrix-grid');
      check('.matrix__cell-label', 'matrix-label');
      check('.stat__value', 'stat');
      check('[data-testid="entity-card-title"]', 'card-title');
      check('.keyvalue__row', 'keyvalue-row');
      check('[data-testid="entity-card-details"]', 'card-body');

      // 4. Aire muerto: ¿la matriz llena el ancho de su bloque?
      out.deadSpace = [];
      document.querySelectorAll('[data-testid="block-matrix"]').forEach(block => {
        const grid = block.querySelector('.matrix__grid');
        if (!grid) return;
        const gap = block.getBoundingClientRect().width - grid.getBoundingClientRect().width;
        if (gap > 2) out.deadSpace.push(Math.round(gap));
      });

      return out;
    });

    const widths = report.cards.map(c => c.w);
    findings.push({
      viewport: vp.name, vw: vp.width, route: route.name,
      overflowX: report.overflowX,
      cards: report.cards.length,
      cardW: widths.length ? `${Math.min(...widths)}–${Math.max(...widths)}` : '—',
      heights: [...new Set(report.cards.map(c => c.h))],
      tiers: report.tiers,
      clipped: report.clipped,
      deadSpace: report.deadSpace,
    });

    if (route.name === 'vehiculos' || route.name === 'conductores') {
      await page.screenshot({ path: `${OUT}/${route.name}-${vp.name}.png`, fullPage: false });
    }
    await page.close();
  }
}

await browser.close();

// ---- Informe ----
console.log('VIEWPORT     RUTA          OVFX  TARJETAS  ANCHO      ALTURAS        ESCALONES        RECORTES  AIRE');
for (const f of findings) {
  const tiers = Object.entries(f.tiers).map(([k, v]) => `${k}:${v}`).join(' ') || '—';
  const flag = f.overflowX > 0 ? '⚠️' : '  ';
  console.log(
    `${f.viewport.padEnd(11)} ${f.route.padEnd(13)} ${String(f.overflowX).padStart(3)}${flag} ${String(f.cards).padStart(5)}    ${f.cardW.padEnd(10)} ${JSON.stringify(f.heights).padEnd(14)} ${tiers.padEnd(16)} ${String(f.clipped.length).padStart(4)}     ${JSON.stringify(f.deadSpace)}`
  );
}

console.log('\n=== RECORTES DETALLADOS ===');
const seen = new Set();
for (const f of findings) {
  for (const c of f.clipped) {
    const key = `${f.viewport}|${f.route}|${c.label}|${c.text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    console.log(`${f.viewport.padEnd(11)} ${f.route.padEnd(13)} ${c.label.padEnd(14)} caja ${c.box.padEnd(10)} desborda ${c.overW}x${c.overH}  "${c.text}"`);
  }
}
