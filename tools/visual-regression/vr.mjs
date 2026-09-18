// Regresión visual: captura pantallas por escenarios y las compara píxel por píxel.
//
//   node tools/visual-regression/vr.mjs baseline [suite ...]   → captura la referencia (código "bueno")
//   node tools/visual-regression/vr.mjs check [suite ...]      → captura de nuevo y compara con la referencia
//   node tools/visual-regression/vr.mjs list                   → lista las suites disponibles
//
// Sin suites se usan todas. Requiere la app corriendo (pnpm start).
// Variables de entorno opcionales:
//   VR_BASE_URL      URL de la app (por defecto http://localhost:4200)
//   VR_TOLERANCE_PX  píxeles distintos tolerados por captura (por defecto 0 = exacto)
//
// Formato de un escenario (scenarios/*.json es un array de estos):
//   { "name": "vehiculos-wizard-390", "path": "/vehiculos", "width": 390, "height": 844, "fullPage": true,
//     "actions": [ {"click": "css"}, {"clickText": "Nuevo vehículo"}, {"hover": "css"},
//                  {"fill": ["css", "texto"]}, {"press": "Escape"}, {"wait": 300}, {"scroll": ["css", 0, 400]} ],
//     "keepHover": "css" }
// Si un selector no existe, la captura falla (así la referencia y la comparación nunca difieren en estado).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(here, '../..');
const scenariosDir = path.join(here, 'scenarios');
const outputDir = path.join(here, '.output');
const baseUrl = (process.env.VR_BASE_URL ?? 'http://localhost:4200').replace(/\/$/, '');
const tolerancePx = Number(process.env.VR_TOLERANCE_PX ?? 0);

const { chromium } = await import(path.join(projectDir, 'node_modules/playwright/index.mjs'));

async function launch() {
  // Usa el Chrome instalado; si no existe, el Chromium de Playwright (`pnpm exec playwright install chromium`).
  try {
    return await chromium.launch({ channel: 'chrome' });
  } catch {
    return await chromium.launch();
  }
}

function suites(requested) {
  const all = fs.readdirSync(scenariosDir).filter(f => f.endsWith('.json')).map(f => f.replace(/\.json$/, '')).sort();
  if (!requested.length) return all;
  const unknown = requested.filter(s => !all.includes(s));
  if (unknown.length) throw new Error(`Suites desconocidas: ${unknown.join(', ')}. Disponibles: ${all.join(', ')}`);
  return requested;
}

async function capture(suite, outDir) {
  const scenarios = JSON.parse(fs.readFileSync(path.join(scenariosDir, `${suite}.json`), 'utf8'));
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await launch();
  let i = 0;
  for (const s of scenarios) {
    i++;
    const ctx = await browser.newContext({ viewport: { width: s.width ?? 1440, height: s.height ?? 900 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto(baseUrl + s.path, { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important;caret-color:transparent!important}' });
    await page.waitForTimeout(600);
    for (const a of s.actions ?? []) {
      if (a.click) await page.locator(a.click).first().click({ timeout: 5000 });
      else if (a.clickText) await page.getByText(a.clickText, { exact: false }).first().click({ timeout: 5000 });
      else if (a.hover) await page.locator(a.hover).first().hover({ timeout: 5000 });
      else if (a.fill) await page.locator(a.fill[0]).first().fill(a.fill[1], { timeout: 5000 });
      else if (a.press) await page.keyboard.press(a.press);
      else if (a.wait) await page.waitForTimeout(a.wait);
      else if (a.scroll) await page.locator(a.scroll[0]).first().evaluate((el, [x, y]) => el.scrollTo(x, y), [a.scroll[1], a.scroll[2]]);
      await page.waitForTimeout(250);
    }
    await page.mouse.move(0, 0).catch(() => {});
    if (s.keepHover) await page.locator(s.keepHover).first().hover();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(outDir, `${s.name}.png`), fullPage: s.fullPage ?? true });
    await ctx.close();
    process.stdout.write(`\r  ${suite}: ${i}/${scenarios.length}`);
  }
  process.stdout.write('\n');
  await browser.close();
}

async function diff(dirA, dirB, outDir) {
  const browser = await launch();
  const page = await browser.newPage();
  fs.rmSync(outDir, { recursive: true, force: true });
  let failures = 0;
  for (const f of fs.readdirSync(dirA).filter(f => f.endsWith('.png')).sort()) {
    if (!fs.existsSync(path.join(dirB, f))) { console.log(`  FALTA   ${f}`); failures++; continue; }
    const a = 'data:image/png;base64,' + fs.readFileSync(path.join(dirA, f)).toString('base64');
    const b = 'data:image/png;base64,' + fs.readFileSync(path.join(dirB, f)).toString('base64');
    const r = await page.evaluate(async ([a, b]) => {
      const load = s => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.src = s; });
      const [ia, ib] = await Promise.all([load(a), load(b)]);
      const w = Math.max(ia.width, ib.width), h = Math.max(ia.height, ib.height);
      const px = img => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.fillStyle = '#ff00ff'; x.fillRect(0, 0, w, h); x.drawImage(img, 0, 0); return x.getImageData(0, 0, w, h); };
      const da = px(ia), db = px(ib);
      const out = document.createElement('canvas'); out.width = w; out.height = h; const ox = out.getContext('2d'); ox.drawImage(ib, 0, 0);
      const od = ox.getImageData(0, 0, w, h);
      let n = 0;
      for (let i = 0; i < da.data.length; i += 4) {
        if (Math.max(Math.abs(da.data[i] - db.data[i]), Math.abs(da.data[i + 1] - db.data[i + 1]), Math.abs(da.data[i + 2] - db.data[i + 2])) > 16) {
          n++; od.data[i] = 255; od.data[i + 1] = 0; od.data[i + 2] = 255; od.data[i + 3] = 255;
        }
      }
      ox.putImageData(od, 0, 0);
      const size = ia.width !== ib.width || ia.height !== ib.height ? ` (tamaño ${ia.width}x${ia.height} → ${ib.width}x${ib.height})` : '';
      return { n, pct: (100 * n / (w * h)).toFixed(3), size, png: n || size ? out.toDataURL('image/png') : null };
    }, [a, b]);
    if (!r.size && r.n > 0 && r.n <= tolerancePx) {
      console.log(`  tolerado ${f}: ${r.n}px (≤ VR_TOLERANCE_PX)`);
    } else if (r.n || r.size) {
      failures++;
      console.log(`  DIFIERE ${f}: ${r.n}px (${r.pct}%)${r.size}`);
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, f), Buffer.from(r.png.split(',')[1], 'base64'));
    }
  }
  await browser.close();
  return failures;
}

const [, , cmd, ...args] = process.argv;

if (cmd === 'list') {
  for (const s of suites([])) {
    const n = JSON.parse(fs.readFileSync(path.join(scenariosDir, `${s}.json`), 'utf8')).length;
    console.log(`${s.padEnd(16)} ${n} escenarios`);
  }
} else if (cmd === 'baseline') {
  for (const s of suites(args)) await capture(s, path.join(outputDir, 'baseline', s));
  console.log(`Referencia guardada en ${path.relative(projectDir, path.join(outputDir, 'baseline'))}/`);
} else if (cmd === 'check') {
  let total = 0;
  for (const s of suites(args)) {
    const base = path.join(outputDir, 'baseline', s);
    if (!fs.existsSync(base)) throw new Error(`No hay referencia para "${s}". Ejecuta primero: vr.mjs baseline ${s}`);
    await capture(s, path.join(outputDir, 'candidate', s));
    const failures = await diff(base, path.join(outputDir, 'candidate', s), path.join(outputDir, 'diffs', s));
    console.log(failures ? `  ✗ ${s}: ${failures} escenario(s) distintos` : `  ✓ ${s}: idéntico`);
    total += failures;
  }
  if (total) console.log(`\nLas diferencias están marcadas en magenta en ${path.relative(projectDir, path.join(outputDir, 'diffs'))}/`);
  else console.log('\nTodo idéntico.');
  process.exitCode = total ? 1 : 0;
} else {
  console.error('Uso: vr.mjs baseline [suite ...] | check [suite ...] | list');
  process.exit(2);
}
