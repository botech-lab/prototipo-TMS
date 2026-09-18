import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4200/vehiculos/veh-1234/plazas', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
await page.locator('[data-testid="rail-templates"]').click(); await page.waitForTimeout(240);
await page.locator('[data-testid="body-irizar-i8"]').click(); await page.waitForTimeout(600);

const pill = (i) => page.locator('[data-testid="traffic-lights"] .pill').nth(i).getAttribute('data-light');
console.log('puertas iniciales:', await page.locator('[data-testid="seat-grid"] [data-kind="door"]').count(), '· luz salidas:', await pill(1));

await page.locator('[data-testid="tool-erase"]').click();
for (let i = 0; i < 6; i++) {
  const door = page.locator('[data-testid="seat-grid"] [data-kind="door"]').first();
  if (!(await door.count())) break;
  const b = await door.boundingBox();
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  await page.waitForTimeout(200);
}
console.log('puertas tras borrar:', await page.locator('[data-testid="seat-grid"] [data-kind="door"]').count(), '· luz salidas:', await pill(1));

await page.locator('[data-testid="pill-exits"]').click(); await page.waitForTimeout(300);
console.log('pista visible:', await page.locator('[data-testid="door-hint"]').count());
if (await page.locator('[data-testid="hint-place-door"]').count()) {
  await page.locator('[data-testid="hint-place-door"]').click(); await page.waitForTimeout(500);
}
console.log('puertas tras sugerencia:', await page.locator('[data-testid="seat-grid"] [data-kind="door"]').count(), '· luz salidas:', await pill(1));
console.log('deck activo:', await page.locator('[data-testid^="deck-tab-"]').count(), 'pisos');
await browser.close();
