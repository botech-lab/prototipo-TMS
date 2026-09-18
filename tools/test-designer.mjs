import { chromium } from 'playwright';
const OUT = new URL('screenshots/', import.meta.url);
const P = (f) => decodeURIComponent(new URL(f, OUT).pathname);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);

const panel = async (tab) => { await page.locator(`[data-testid="rail-${tab}"]`).click(); await page.waitForTimeout(220); };
const cellBox = (key) => page.locator(`[data-cell="${key}"]`).boundingBox();
const drag = async (fromKey, toKeys) => {
  const a = await cellBox(fromKey);
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  for (const k of toKeys) { const b = await cellBox(k); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 4 }); }
  await page.mouse.up(); await page.waitForTimeout(160);
};
const seats = () => page.locator('[data-kind="seat"]').count();
const rows = () => page.evaluate(() => getComputedStyle(document.querySelector('[data-testid="seat-grid"]')).gridTemplateColumns.split(' ').length);
const numberAt = (key) => page.locator(`[data-cell="${key}"] .cell__number`).textContent();

await page.goto('http://localhost:4200/vehiculos/veh-dfe658/plazas', { waitUntil: 'networkidle' });
await page.waitForTimeout(700);

// 1. Preset desde el panel de plantillas
await panel('templates');
await page.locator('[data-testid="preset-interurbano"]').click(); await page.waitForTimeout(400);
check('Panel Plantillas: preset arma el bus', (await seats()) > 30 && (await rows()) === 12, `${await seats()} butacas, ${await rows()} filas`);

// 2. Morph desde el menú Modo de la cápsula
const before = await seats();
await page.locator('[data-testid="column-menu"]').click(); await page.waitForTimeout(150);
await page.locator('[data-testid="columns-3+2"]').click(); await page.waitForTimeout(600);
const after = await seats();
check('Menú Modo: 2+2 → 3+2 sin perder butacas', before === after, `${before}→${after}`);
await page.locator('[data-testid="column-menu"]').click(); await page.waitForTimeout(150);
await page.locator('[data-testid="columns-2+2"]').click(); await page.waitForTimeout(500);

// 3. Lasso desde el dock
await page.locator('[data-testid="tool-select"]').click();
await drag('0:1:0', ['0:2:0', '0:3:1']);
const selbar = page.locator('[data-testid="selection-bar"]');
const selText = (await selbar.count()) ? await selbar.locator('.selbar__count').textContent() : '';
check('Dock: lasso selecciona un bloque', /6 seleccionadas/.test(selText || ''), selText?.trim());

// 4. Tarifa masiva
if (await selbar.count()) {
  await selbar.locator('.chip--fare').first().click(); await page.waitForTimeout(250);
  const fareLabel = await page.locator('[data-cell="0:1:0"] .cell__fare').textContent().catch(() => '');
  check('Tarifa en bloque activa el heatmap', !!fareLabel, `celda 1:0 = ${fareLabel?.trim()}`);
  await page.locator('[data-testid="layer-menu"]').click(); await page.waitForTimeout(150);
  await page.locator('[data-testid="layer-passenger"]').click(); await page.waitForTimeout(200);
}
await page.keyboard.press('Escape');

// 5. Serpiente
await page.locator('[data-testid="tool-number"]').click();
await drag('0:5:0', ['0:5:1', '0:6:1', '0:6:0']);
const snake = [await numberAt('0:5:0'), await numberAt('0:5:1'), await numberAt('0:6:1'), await numberAt('0:6:0')].map(s => s?.trim());
check('Dock: serpiente numera siguiendo el trazo', snake.join(',') === '1,2,3,4', snake.join(','));

// 6. ⌘D
const r1 = await rows();
await page.keyboard.press('Meta+d'); await page.waitForTimeout(800);
check('⌘D duplica la fila', (await rows()) === r1 + 1, `${r1}→${await rows()}`);

// 7. Asa de estampado
const handle = await page.locator('[data-testid="stamp-handle"]').boundingBox();
const cell = await cellBox('0:0:0');
const r2 = await rows();
await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
await page.mouse.down();
await page.mouse.move(handle.x + handle.width / 2 + (cell.width + 6) * 2, handle.y + handle.height / 2, { steps: 6 });
await page.mouse.up(); await page.waitForTimeout(300);
check('Asa trasera estampa 2 filas', (await rows()) === r2 + 2, `${r2}→${await rows()}`);

// 8. Spawner desde el panel de asientos
await panel('seats');
await page.locator('[data-testid="tool-spawn"]').click(); await page.waitForTimeout(200);
await page.locator('[data-testid="spawn-name"]').fill('Cama Suite Plus'); await page.waitForTimeout(150);
const code = await page.locator('[data-testid="spawn-code"]').inputValue();
await page.locator('[data-testid="accent-dorado"]').click();
await page.locator('[data-testid="spawn-save"]').click(); await page.waitForTimeout(300);
const newTool = page.locator('[data-testid="tool-seat-CSP"]');
const active = (await newTool.count()) ? /item--active/.test(await newTool.getAttribute('class') || '') : false;
check('Panel Asientos: spawner crea CSP y lo selecciona', code === 'CSP' && active, `código ${code}`);

// 9. Time Machine
const tl = page.locator('[data-testid="timeline"]');
const max = Number(await tl.getAttribute('max'));
const now = await seats();
await tl.fill('0'); await tl.dispatchEvent('input'); await page.waitForTimeout(300);
const v0 = await seats();
await tl.fill(String(max)); await tl.dispatchEvent('input'); await page.waitForTimeout(300);
check('Time Machine recorre versiones', v0 !== now && (await seats()) === now, `v1=${v0}, v${max + 1}=${now}`);

// 10. Capa equipamiento desde el menú
await page.locator('[data-testid="layer-menu"]').click(); await page.waitForTimeout(150);
await page.locator('[data-testid="layer-amenities"]').click(); await page.waitForTimeout(250);
const glyphs = await page.locator('[data-cell="0:1:0"] .cell__glyphs').textContent().catch(() => '');
check('Menú Capas: equipamiento deriva rasgos', /🪟/.test(glyphs || ''), glyphs?.trim());

// 11. Vista de venta oculta riel y dock
await page.keyboard.press('p'); await page.waitForTimeout(250);
check('Vista de venta oculta riel y dock', (await page.locator('.rail').count()) === 0 && (await page.locator('[data-testid="dock"]').count()) === 0);
await page.keyboard.press('p');

console.log(results.join('\n'));
if (errors.length) console.log('\nERRORES DE CONSOLA:', errors.slice(0, 4).join('\n'));
await browser.close();
