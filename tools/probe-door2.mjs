import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const panel = async (t) => { await page.locator(`[data-testid="rail-${t}"]`).click(); await page.waitForTimeout(240); };

await page.goto('http://localhost:4200/vehiculos/veh-1234/plazas', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
await panel('assistant');
await page.locator('[data-testid="prompt-input"]').fill('doble piso, abajo 12 camas con baño al fondo, arriba 44 semicama');
await page.waitForTimeout(250);
await page.locator('[data-testid="prompt-go"]').click(); await page.waitForTimeout(600);
await page.locator('[data-testid="btn-save"]').click(); await page.waitForTimeout(350);
await page.keyboard.press('Escape');
await panel('templates');
if (await page.locator('[data-testid="op-builder"]').count()) { await page.locator('[data-testid="op-builder"]').click(); await page.waitForTimeout(250); }
await page.locator('[data-testid="builder"] .seg__item', { hasText: '1 piso' }).click();
await page.locator('[data-testid="builder-bathroom"]').selectOption('none'); await page.waitForTimeout(200);
await page.locator('[data-testid="builder-generate"]').click(); await page.waitForTimeout(600);
await page.locator('[data-testid="body-irizar-i8"]').click(); await page.waitForTimeout(700);

await page.locator('[data-testid="tool-erase"]').click(); await page.waitForTimeout(200);

const diag = await page.evaluate(() => {
  const out = { tool: null, doors: [] };
  out.tool = document.querySelector('[data-testid="tool-erase"]')?.className || '';
  document.querySelectorAll('[data-kind="door"]').forEach(el => {
    const r = el.getBoundingClientRect();
    const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
    const top = document.elementFromPoint(cx, cy);
    out.doors.push({
      cell: el.getAttribute('data-cell'),
      caja: `${Math.round(cx)},${Math.round(cy)} ${Math.round(r.width)}x${Math.round(r.height)}`,
      encima: top ? `${top.tagName}.${String(top.className).slice(0, 44)}` : null,
      esLaPuerta: el === top || el.contains(top)
    });
  });
  return out;
});
console.log(JSON.stringify(diag, null, 1));
await browser.close();
