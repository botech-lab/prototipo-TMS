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

const panel = async (tab) => { await page.locator(`[data-testid="rail-${tab}"]`).click(); await page.waitForTimeout(240); };
const decks = () => page.locator('[data-testid^="deck-tab-"]').count();
const total = async () => Number((/(\d+)\s*\//.exec((await page.locator('[data-testid="traffic-lights"]').textContent()) || '') || [0, 0])[1]);
const pill = (i) => page.locator('[data-testid="traffic-lights"] .pill').nth(i).getAttribute('data-light');

await page.goto('http://localhost:4200/vehiculos/veh-1234/plazas', { waitUntil: 'networkidle' });
await page.waitForTimeout(700);

// 1. Asistente conversacional: describe, responde lo que pregunta y aplica
await panel('assistant');
await page.locator('[data-testid="prompt-input"]').fill('doble piso, abajo 12 camas 2+1 con baño al fondo, arriba 44 semicama, escalera al centro');
await page.locator('[data-testid="chat-send"]').click(); await page.waitForTimeout(250);
const reply = (await page.locator('.msg--bot').last().textContent()) || '';
check('Asistente entiende la frase', /P1: .*12 camas \(2\+1\)/.test(reply) && /P2: 44 semicamas/.test(reply), reply.slice(0, 120));
check('Con todo explícito no pregunta nada', (await page.locator('[data-testid="chat-apply"]').count()) === 1);
await page.locator('[data-testid="chat-apply"]').click(); await page.waitForTimeout(600);
const s1 = await total();
check('Armar desde texto: 2 pisos y más butacas que la capacidad', (await decks()) === 2 && s1 > 50, `${await decks()} pisos, ${s1} butacas`);
await page.screenshot({ path: P('canva-prompt.png') });

// 2. Semáforo en píldoras: rojo bloquea
const capLight = await pill(0);
const saveClass = await page.locator('[data-testid="btn-save"]').getAttribute('class');
check('Píldoras: capacidad en rojo y guardar bloqueado', capLight === 'red' && /btn--blocked/.test(saveClass || ''), `luz=${capLight}`);
await page.locator('[data-testid="btn-save"]').click(); await page.waitForTimeout(350);
check('Guardar en rojo no sincroniza y salta a la butaca culpable',
  (await page.locator('[data-testid="sync-panel"]').count()) === 0 && (await page.locator('[data-testid="seat-popover"]').count()) === 1);
await page.keyboard.press('Escape');

// 3. Grid Builder en el panel Plantillas
await panel('templates');
if (await page.locator('[data-testid="op-builder"]').count()) { await page.locator('[data-testid="op-builder"]').click(); await page.waitForTimeout(250); }
const previewCells = await page.locator('[data-testid="builder-preview"] .mini__cell').count();
check('Panel Plantillas: Grid Builder con miniatura viva', (await page.locator('[data-testid="builder"]').count()) === 1 && previewCells > 20, `${previewCells} celdas`);
await page.locator('[data-testid="builder"] .seg__item', { hasText: '1 piso' }).click();
await page.locator('[data-testid="builder-bathroom"]').selectOption('none'); await page.waitForTimeout(200);
await page.locator('[data-testid="builder-generate"]').click(); await page.waitForTimeout(600);
check('Generar bus desde sliders: 1 piso, sin baño', (await decks()) === 1 && (await page.locator('[data-testid="seat-grid"] [data-kind="bathroom"]').count()) === 0, `${await decks()} piso, ${await total()} butacas`);

// 4. Digital Twin
await page.locator('[data-testid="body-irizar-i8"]').click(); await page.waitForTimeout(600);
const twinSeats = await total();
check('Carrocería Irizar i8 con salidas de emergencia', twinSeats > 40 && twinSeats <= 50 && (await page.locator('[data-exit]').count()) >= 2, `${twinSeats} butacas, ${await page.locator('[data-exit]').count()} salidas`);

// 5. Sugerencia de puerta desde la píldora roja
// La lista de puertas se recalcula al borrar cada una: se toma la primera
// disponible en cada vuelta en vez de iterar una colección ya obsoleta.
await page.locator('[data-testid="tool-erase"]').click();
const doorsBefore = await page.locator('[data-testid="seat-grid"] [data-kind="door"]').count();
// Presupuesto fijo de intentos: acotar al conteo inicial dejaba puertas vivas
// si un clic caía mientras la retícula animaba el reajuste de zoom.
for (let i = 0; i < doorsBefore + 4; i++) {
  const door = page.locator('[data-testid="seat-grid"] [data-kind="door"]').first();
  if (!(await door.count())) break;
  const b = await door.boundingBox();
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  await page.waitForTimeout(220);
}
await page.waitForTimeout(350);
const doorsLeft = await page.locator('[data-testid="seat-grid"] [data-kind="door"]').count();
const exitsRed = (await pill(1)) === 'red';
await page.locator('[data-testid="pill-exits"]').click(); await page.waitForTimeout(300);
const hintShown = (await page.locator('[data-testid="door-hint"]').count()) === 1;
if (hintShown) { await page.locator('[data-testid="hint-place-door"]').click(); await page.waitForTimeout(500); }
const after = await pill(1);
check('Píldora roja de salidas sugiere y coloca la puerta', exitsRed && hintShown && after === 'green',
  `borradas ${doorsBefore}, quedan ${doorsLeft}, roja=${exitsRed}, pista=${hintShown}, después=${after}`);

// 6. Semáforo verde → Smart Sync
await page.locator('[data-testid="tool-select"]').click();
const allGreen = (await pill(0)) === 'green' && (await pill(1)) === 'green' && (await pill(2)) === 'green';
await page.locator('[data-testid="btn-save"]').click(); await page.waitForTimeout(500);
const sync = page.locator('[data-testid="sync-panel"]');
const hasSvg = (await sync.count()) ? (await sync.locator('.sync__thumb svg').count()) === 1 : false;
check('En verde, Guardar sincroniza 4 canales con SVG real', allGreen && hasSvg && (await sync.locator('.sync__card').count()) === 4, `verde=${allGreen}`);
await page.screenshot({ path: P('canva-sync.png') });
await page.keyboard.press('Escape');

// 7. Wizard de creación
await page.goto('http://localhost:4200/vehiculos', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.locator('[data-testid="page-header-action"]').click(); await page.waitForTimeout(250);
await page.locator('[data-testid="preset-card-suite-dd"]').click(); await page.waitForTimeout(250);
const wizardText = await page.locator('[data-testid="vehicle-wizard"]').textContent();
const license = (await page.locator('[data-testid="wizard-license"]').textContent())?.trim();
check('Wizard rellena tipo, plazas, carga y licencia del catálogo', /Bus Cama Completo/.test(wizardText || '') && /5000/.test(wizardText || '') && license === 'C', `licencia=${license}`);
await page.locator('[data-testid="wizard-plate"]').fill('TEST-999');
await page.locator('[data-testid="wizard-create"]').click(); await page.waitForTimeout(900);
check('Crear unidad abre su plano armado y guardado',
  /\/plazas$/.test(page.url()) && (await decks()) === 2 && (await total()) > 40 && (await page.locator('[data-testid="btn-save"]').textContent())?.includes('Guardado'),
  `${await total()} butacas, ${await decks()} pisos`);

console.log(results.join('\n'));
if (errors.length) console.log('\nERRORES DE CONSOLA:', errors.slice(0, 4).join('\n'));
await browser.close();
