/**
 * Panel derecho · Zen · Invertir lados · Asistente conversacional paso a paso.
 */
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
const panel = async (tab) => { await page.locator(`[data-testid="rail-${tab}"]`).click(); await page.waitForTimeout(260); };
const box = (sel) => page.locator(sel).boundingBox();
// Coordenadas del BUS leídas del DOM: en horizontal la retícula está
// transpuesta (fila del bus = columna DOM), así que se usa grid-row/column.
const cellsOfBus = () => page.evaluate(() => {
  const grid = document.querySelector('[data-testid="seat-grid"]');
  const landscape = grid.closest('.bus').dataset.orientation === 'landscape';
  const cells = [...grid.querySelectorAll('.cell')];
  const rowsDom = Math.max(...cells.map(c => Number(c.style.gridRow)));
  return cells.map(c => {
    const gr = Number(c.style.gridRow), gc = Number(c.style.gridColumn);
    // Horizontal: fila DOM 1 = ventana derecha (arriba); la última = ventana izquierda (abajo).
    return { kind: c.dataset.kind, n: c.querySelector('.cell__number')?.textContent?.trim(), row: landscape ? gc - 1 : gr - 1, col: landscape ? rowsDom - gr : gc - 1 };
  });
});
const numbersByCol = async () => (await cellsOfBus()).filter(c => c.kind === 'seat');
const scheme = () => page.locator('[data-testid="swap-sides"] strong').textContent();

await page.goto('http://localhost:4200/vehiculos/veh-1234/plazas', { waitUntil: 'networkidle' });
await page.waitForTimeout(700);

// 1. Geometría: riel y panel a la DERECHA del lienzo
const [canvas, rail, side] = await Promise.all([box('.canvas'), box('.rail'), box('[data-testid="side-panel"]')]);
check('Panel a la derecha del lienzo', side.x > canvas.x + canvas.width - 2 && rail.x > side.x, `canvas→${Math.round(canvas.x + canvas.width)} panel@${Math.round(side.x)} riel@${Math.round(rail.x)}`);
check('El riel es el borde derecho', Math.round(rail.x + rail.width) >= 1438);

// 2. Modo Zen: ocultar panel → pestaña de 40px; recuperar
await page.locator('[data-testid="rail-hide"]').click(); await page.waitForTimeout(300);
const zen = await box('[data-testid="zen-tab"]');
const stageAfter = await box('.canvas');
check('Ocultar panel deja una pestaña de 40px pegada al borde', zen && Math.round(zen.width) === 40 && Math.round(zen.x + zen.width) >= 1438 && (await page.locator('.rail').count()) === 0, `tab ${zen && Math.round(zen.width)}px, canvas ${Math.round(stageAfter.width)}px`);
await page.screenshot({ path: P('zen-mode.png') });
await page.locator('[data-testid="zen-tab"]').click(); await page.waitForTimeout(300);
check('La pestaña devuelve riel y panel', (await page.locator('.rail').count()) === 1 && (await page.locator('[data-testid="side-panel"]').count()) === 1);
check('El riel ofrece Expandir (pantalla completa)', (await page.locator('[data-testid="rail-expand"]').count()) === 1);

// 2b. Orientación explícita del chasis: conductor arriba, puertas abajo, volante en cabina
const [drv, drs, grid] = await Promise.all([box('[data-testid="side-driver"]'), box('[data-testid="side-doors"]'), box('[data-testid="seat-grid"]')]);
check('Rótulos: LADO DERECHO (PUERTAS) arriba del plano y LADO IZQUIERDO (CONDUCTOR) abajo', drs.y < grid.y && drv.y > grid.y + grid.height, `${Math.round(drs.y)} < ${Math.round(grid.y)} < ${Math.round(drv.y)}`);
check('La cabina lleva el volante 🛞 y está ABAJO a la izquierda (lado del conductor)', (await page.locator('[data-kind="cabin"]').textContent()).includes('🛞') && (await box('[data-kind="cabin"]')).y > grid.y + grid.height / 2);

// 3. Asistente paso a paso con la frase de referencia
await panel('assistant');
const PHRASE = 'Quiero un bus con 2 pisos, abajo 10 camas, arriba 33 semicama. Numeración: ventana pares y pasillo impares.';
await page.locator('[data-testid="prompt-input"]').fill(PHRASE);
await page.locator('[data-testid="chat-send"]').click(); await page.waitForTimeout(300);
// Una pregunta por turno: se responde cada una y aparece la siguiente.
const asked = [];
const ANSWERS = { p1_orientation: '1+2', leftover_p1: 'single', leftover_p2: 'bench', p2_stairs_arrival: 'middle-right', bathroom_setup: 'entry' };
for (let i = 0; i < 6 && (await page.locator('[data-testid="chat-apply"]').count()) === 0; i++) {
  const qs = await page.locator('.msg--bot').last().locator('[data-testid^="chat-q-"]').evaluateAll(els => els.map(e => e.dataset.testid.replace('chat-q-', '')));
  if (qs.length !== 1) { asked.push(`(${qs.length} preguntas)`); break; }
  asked.push(qs[0]);
  if (asked.length === 1) await page.screenshot({ path: P('chat-questions.png') });
  await page.locator(`[data-testid="chat-opt-${qs[0]}-${ANSWERS[qs[0]]}"]`).click(); await page.waitForTimeout(220);
}
check('Pregunta de una en una: individuales → sobrantes → escalera → baño', asked.join(',') === 'p1_orientation,leftover_p1,leftover_p2,p2_stairs_arrival,bathroom_setup', asked.join(','));
const ready = (await page.locator('.msg--bot').last().textContent()) || '';
check('Tras responder, resume y ofrece Aplicar al chasis', /Estructura lista/.test(ready) && /Ventana par/.test(ready) && (await page.locator('[data-testid="chat-apply"]').count()) === 1, ready.slice(0, 140));
await page.screenshot({ path: P('chat-ready.png') });
await page.locator('[data-testid="chat-apply"]').click(); await page.waitForTimeout(700);

const pillText = (await page.locator('[data-testid="traffic-lights"]').textContent()) || '';
const total = Number((/(\d+)\s*\//.exec(pillText) || [0, 0])[1]);
check('El chasis tiene EXACTAMENTE 43 butacas (10 + 33), no 12 + 36', total === 43, `${total}`);
check('Planta baja quedó 1+2', (await scheme()) === '1+2', await scheme());
const p1 = await cellsOfBus();
const access = p1.filter(c => c.row === 0).map(c => c.kind);
check('Vestíbulo abajo (fila de cabina): cabina, baño y subida de escalera; la escalera nunca en un lugar de asiento',
  access.includes('cabin') && access.includes('stairs') && access.includes('bathroom') && !p1.some(c => c.row > 0 && (c.kind === 'stairs' || c.kind === 'bathroom')), access.join(','));
check('La puerta es una franja delgada en el borde, no una celda', (await page.locator('[data-testid="door-marker"]').count()) >= 1 && (await box('[data-testid="door-marker"]')).height < 16 && !access.includes('door'));
check('El pasillo central queda 100% continuo (nunca un baño encima)', !p1.some(c => c.kind === 'bathroom' && c.col === 1));
check('La mampara se dibuja tras el vestíbulo', (await page.locator('[data-mampara]').count()) >= 4);
await page.locator('[data-testid="deck-tab-2"]').click(); await page.waitForTimeout(500);
const upper = await numbersByCol();
const aisleCol = 2;
const bench = upper.filter(s => s.col === aisleCol);
// Numeración corrida entre pisos: la banqueta es la última de las 43.
check('Planta alta: banqueta trasera de 5 en la posición del pasillo, numerada al final', bench.length === 1 && bench[0].n === '43', bench.map(b => `${b.n}@r${b.row}`).join(','));
const firstRow = Math.min(...upper.map(s => s.row));
const rowSeats = upper.filter(s => s.row === firstRow);
const win = rowSeats.find(s => s.col === 0), ais = rowSeats.find(s => s.col === aisleCol - 1);
check('Numeración ventana par / pasillo impar', win && ais && Number(win.n) % 2 === 0 && Number(ais.n) % 2 === 1, `ventana=${win?.n} pasillo=${ais?.n}`);
await page.screenshot({ path: P('chat-applied.png') });

// 3b. RETOQUE sobre el plano ya dibujado: cambiar solo la numeración de P2
const p1Before = await (async () => { await page.locator('[data-testid="deck-tab-1"]').click(); await page.waitForTimeout(400); return numbersByCol(); })();
await page.locator('[data-testid="deck-tab-2"]').click(); await page.waitForTimeout(400);
const bubblesBefore = await page.locator('.msg').count();
await page.locator('[data-testid="prompt-input"]').fill('modificamelo lo asientos en el segundo piso impares en ventana y pares pasillo');
await page.locator('[data-testid="chat-send"]').click(); await page.waitForTimeout(700);
check('Tras armar, el botón Aplicar desaparece: un segundo clic no puede rehacer el bus', (await page.locator('[data-testid="chat-apply"]').count()) === 0);
const answer = (await page.locator('.msg--bot').last().textContent()) || '';
check('El chat entiende un RETOQUE y no vuelve a preguntar por el bus entero',
  /actualizado la numeraci/i.test(answer) && (await page.locator('[data-testid^="chat-q-"]').count()) === 0, answer.slice(0, 110));
const p2After = await numbersByCol();
const rowTop = Math.min(...p2After.map(s => s.row));
const winA = p2After.find(s => s.row === rowTop && s.col === 0), aisA = p2After.find(s => s.row === rowTop && s.col === 1);
check('El segundo piso pasa a ventana impar / pasillo par', Number(winA.n) % 2 === 1 && Number(aisA.n) % 2 === 0, `ventana=${winA.n} pasillo=${aisA.n}`);
await page.locator('[data-testid="deck-tab-1"]').click(); await page.waitForTimeout(400);
const p1After = await numbersByCol();
check('La planta baja conserva su numeración y sus plazas intactas',
  JSON.stringify(p1After.map(s => s.n)) === JSON.stringify(p1Before.map(s => s.n)), `${p1Before.length} butacas`);
check('El bus sigue teniendo 43 plazas tras el retoque', Number((/(\d+)\s*\//.exec((await page.locator('[data-testid="traffic-lights"]').textContent()) || '') || [0, 0])[1]) === 43);
check('La conversación continúa: se añaden turnos, no se reinicia', (await page.locator('.msg').count()) > bubblesBefore);
const scrolled = await page.evaluate(() => { const l = document.querySelector('.chat__log'); return l.scrollHeight - l.clientHeight - l.scrollTop; });
check('El chat se desplaza solo al último turno', scrolled <= 2, `faltan ${Math.round(scrolled)}px`);
await page.screenshot({ path: P('chat-mutation.png') });
await page.locator('[data-testid="deck-tab-2"]').click(); await page.waitForTimeout(400);

// 4. Invertir lados desde la cápsula: 1+2 ⇄ 2+1 con volteo y renumeración
await page.locator('[data-testid="deck-tab-1"]').click(); await page.waitForTimeout(500);
const before = await numbersByCol();
await page.locator('[data-testid="swap-sides"]').click();
await page.waitForTimeout(40);
check('El volteo anima la retícula', (await page.locator('.seat-grid--flip').count()) === 1);
await page.waitForTimeout(700);
const after = await numbersByCol();
check('Cápsula muestra 2+1 tras invertir', (await scheme()) === '2+1', await scheme());
const nums = after.map(s => Number(s.n)).sort((a, b) => a - b);
check('Mismas butacas, renumeradas 1..N sin huecos', after.length === before.length && nums.every((n, i) => n === i + 1), `${after.length} butacas`);
const allCells = await cellsOfBus();
const width = Math.max(...allCells.map(c => c.col)) + 1;
check('Cabina sigue en [0][0] y la puerta sigue en la acera',
  allCells.some(c => c.kind === 'cabin' && c.row === 0 && c.col === 0) && (await page.locator('[data-testid="door-marker"][data-edge="top"]').count()) >= 1);
await page.screenshot({ path: P('swap-sides.png') });

// 4b. Mover: arrastrar una butaca a un hueco y a otra butaca (intercambio)
await page.locator('[data-testid="tool-move"]').click();
const seatsNow = await numbersByCol();
const emptyCell = (await cellsOfBus()).find(c => c.kind === 'empty');
const drag = async (from, to) => {
  const a = await box(`[data-cell="${from}"]`), b = await box(`[data-cell="${to}"]`);
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 6 }); await page.waitForTimeout(60);
  ghostSeen = ghostSeen || (await page.locator('[data-testid="drag-ghost"]').count()) === 1;
  if (!shotGhost) { shotGhost = true; await page.screenshot({ path: P('move-ghost.png') }); }
  await page.mouse.up(); await page.waitForTimeout(250);
};
let ghostSeen = false, shotGhost = false;
const key = (c) => `0:${c.row}:${c.col}`;
const s1 = seatsNow[0];
await drag(key(s1), key(emptyCell));
let after1 = await cellsOfBus();
check('Mover: la butaca cae en el hueco y su origen queda vacío', after1.find(c => c.row === emptyCell.row && c.col === emptyCell.col)?.n === s1.n && after1.find(c => c.row === s1.row && c.col === s1.col)?.kind === 'empty', `${s1.n} → r${emptyCell.row}c${emptyCell.col}`);
const a2 = after1.filter(c => c.kind === 'seat');
await drag(key(a2[0]), key(a2[1]));
const after2 = await cellsOfBus();
check('Mover sobre otra butaca: se intercambian y conservan sus números',
  after2.find(c => c.row === a2[0].row && c.col === a2[0].col)?.n === a2[1].n && after2.find(c => c.row === a2[1].row && c.col === a2[1].col)?.n === a2[0].n && after2.filter(c => c.kind === 'seat').length === a2.length);
check('Mientras arrastras, el cuadrado viaja con el puntero (fantasma)', ghostSeen);
await page.screenshot({ path: P('move-tool.png') });

// 4c. Retoques de transporte: cantidad, butaca puntual, rango y compactación
const say = async (text) => {
  await page.locator('[data-testid="prompt-input"]').fill(text);
  await page.locator('[data-testid="chat-send"]').click();
  await page.waitForTimeout(700);
  return (await page.locator('.msg--bot').last().textContent()) || '';
};
const capacity = async () => Number((/(\d+)\s*\//.exec((await page.locator('[data-testid="traffic-lights"]').textContent()) || '') || [0, 0])[1]);
// Solo las butacas que se venden llevan número; el relevo muestra un punto.
const seatNumbers = async () => (await cellsOfBus()).filter(c => c.kind === 'seat' && /^\d+$/.test(c.n || '')).map(c => Number(c.n)).sort((a, b) => a - b);

const totalBefore = await capacity();
const answerQty = await say('Quítame 2 asientos del piso 2 porque queda muy apretado');
check('Quitar plazas en caliente: 2 menos y sin rearmar el bus', /quit[ée]/i.test(answerQty) && (await capacity()) === totalBefore - 2, `${totalBefore} → ${await capacity()}`);

await page.locator('[data-testid="deck-tab-1"]').click(); await page.waitForTimeout(400);
const p1Numbers = await seatNumbers();
const answerSeat = await say('Borra el asiento 3');
const afterErase = await seatNumbers();
check('Borrar la butaca 3 cierra el hueco: la serie sigue siendo 1..N',
  afterErase.length === p1Numbers.length - 1 && afterErase.every((n, i) => n === i + 1), afterErase.join(','));

const answerRange = await say('Del 1 al 4 que sean cama');
const camas = await page.evaluate(() => [...document.querySelectorAll('[data-testid="seat-grid"] .cell[data-kind="seat"]')]
  .filter(c => Number(c.querySelector('.cell__number')?.textContent) <= 4)
  .map(c => c.getAttribute('aria-label') || ''));
check('Rango por número: del 1 al 4 pasan a Cama sin renumerar',
  /1–4 Cama/.test(answerRange) && camas.length === 4 && camas.every(l => /Cama/i.test(l)), camas.join(' | '));

const answerSolo = await say('El asiento 5 que sea para chofer de relevo');
check('Butaca de relevo: no se vende, sale de la serie y el resto se compacta',
  /Relevo/i.test(answerSolo) && (await seatNumbers()).every((n, i) => n === i + 1));
await page.screenshot({ path: P('mutations-transport.png') });

// 4d. Compactación automática al borrar a mano con el borrador
const beforeManual = await seatNumbers();
await page.locator('[data-testid="tool-erase"]').click();
const victim = (await cellsOfBus()).find(c => c.kind === 'seat' && Number(c.n) === 2);
const vb = await box(`[data-cell="0:${victim.row}:${victim.col}"]`);
await page.mouse.click(vb.x + vb.width / 2, vb.y + vb.height / 2);
await page.waitForTimeout(500);
const afterManual = await seatNumbers();
check('Borrar con el borrador compacta la serie sola (sin boleto fantasma)',
  afterManual.length === beforeManual.length - 1 && afterManual.every((n, i) => n === i + 1), afterManual.slice(0, 6).join(','));
await page.locator('[data-testid="tool-select"]').click();

// 5. Invertir desde el dock y menú de numeración con "pasillo impar"
await page.locator('[data-testid="op-swap"]').click(); await page.waitForTimeout(700);
check('El dock también invierte (vuelve a 1+2)', (await scheme()) === '1+2', await scheme());
await page.locator('[data-testid="op-autonumber"]').click(); await page.waitForTimeout(200);
check('Auto-numerar ofrece "Ventana par · pasillo impar"', (await page.locator('[data-testid="strategy-aisleodd"]').count()) === 1 && /menu__row--active/.test((await page.locator('[data-testid="strategy-aisleodd"]').getAttribute('class')) || ''));
await page.keyboard.press('Escape');

// 6. Móvil: pestaña Zen abajo a la derecha y riel al pie
await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(500);
const railM = await box('.rail');
check('Móvil: riel al pie de la pantalla', railM && railM.y + railM.height >= 840, `y=${railM && Math.round(railM.y)}`);
await page.locator('[data-testid="rail-hide"]').click(); await page.waitForTimeout(300);
const zenM = await box('[data-testid="zen-tab"]');
check('Móvil Zen: pestaña flotante abajo a la derecha', zenM && zenM.y > 700 && zenM.x + zenM.width > 370, zenM && `${Math.round(zenM.x)},${Math.round(zenM.y)}`);
await page.screenshot({ path: P('zen-mobile.png') });

console.log(results.join('\n'));
console.log(`\n${results.filter(r => r.startsWith('✓')).length}/${results.length} OK`);
if (errors.length) console.log('ERRORES:', errors.slice(0, 5));
await browser.close();
