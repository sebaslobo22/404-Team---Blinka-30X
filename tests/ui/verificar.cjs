// Ejecutar contra npm run dev local. Nunca apuntar a datos compartidos.
// PLAYWRIGHT_MODULE permite usar el navegador ya instalado sin añadir dependencias.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const base = 'http://localhost:3000';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  // La bienvenida de primera visita es modal: se marca como vista para no tapar el resto de la verificación.
  await context.addInitScript(() => { try { localStorage.setItem('404-bienvenida-vista', '1'); } catch { } });
  const page = await context.newPage();
  const errores = [];
  page.on('pageerror', e => errores.push(e.message));
  // El singleton y las rutas de demo existentes usan memoria del proceso local.
  await context.request.post(`${base}/api/demo/restaurar`, { data: {} });
  await page.goto(`${base}/cola`);
  const primera = page.locator('article').first();
  const idAprobada = (await primera.getAttribute('aria-label')).replace('Factura ', '');
  await primera.getByRole('button', { name: 'Aprobar', exact: true }).click();
  const confirmar = primera.getByRole('button', { name: 'Confirmar resolución' });
  assert(await confirmar.isDisabled(), 'La nota vacía debe impedir confirmar');
  await primera.getByLabel('Motivo de la revisión (obligatorio)').fill('Revisión local de la factura y sus comprobaciones.');
  // Retrasar solo la petición local para comprobar la protección durante el envío.
  await page.route('**/api/aprobaciones', async route => {
    await new Promise(r => setTimeout(r, 350));
    await route.continue();
  });
  await confirmar.click();
  assert(await primera.getByRole('button', { name: 'Registrando…' }).isDisabled());
  await primera.getByText('Aprobación registrada. No se ejecutó ningún pago.').waitFor();
  await primera.getByRole('button', { name: 'Actualizar cola' }).click();
  await page.waitForTimeout(700);
  assert.equal(await page.locator(`article[aria-label="Factura ${idAprobada}"]`).count(), 0);
  const segunda = page.locator('article').first();
  await segunda.getByRole('button', { name: 'Rechazar', exact: true }).click();
  await segunda.getByLabel('Motivo de la revisión (obligatorio)').fill('Rechazo de prueba en el entorno local.');
  await segunda.getByRole('button', { name: 'Confirmar resolución' }).click();
  await segunda.getByText('Rechazo registrado.').waitFor();
  await page.goto(`${base}/facturas/F-006`);
  assert.equal(await page.getByRole('button', { name: 'Aprobar', exact: true }).count(), 0);
  assert((await page.locator('main').innerText()).includes('FRENAR'));
  await page.getByText('Comprobaciones de las reglas', { exact: false }).click();
  assert(await page.getByText('✕ No cumple (FRENAR)', { exact: true }).count() > 0);
  await page.getByText('Datos leídos de la factura', { exact: true }).click();
  assert.equal(await page.locator('details[name="detalle-factura"][open]').count(), 1);
  await page.goto(`${base}/reglas`);
  const versionAnterior = await page.locator('#version-reglas').innerText();
  await page.getByLabel('Límite por pago (USD)', { exact: true }).fill('4900');
  await page.getByText('Resumen de cambios propuestos', { exact: true }).click();
  assert((await page.locator('details[open]').innerText()).includes('4900'));
  await page.getByRole('button', { name: 'Guardar y volver a evaluar' }).click();
  await page.getByRole('status').filter({ hasText: 'Reglas guardadas.' }).waitFor();
  await page.waitForTimeout(700);
  const versionNueva = await page.locator('#version-reglas').innerText();
  assert.notEqual(versionNueva, versionAnterior);
  await page.goto(`${base}/facturas/F-005`);
  await page.getByText('Registro y hashes', { exact: true }).click();
  assert((await page.locator('details[open]').innerText()).includes(versionNueva), 'El flujo existente debe generar una decisión con la nueva versión');
  await page.goto(`${base}/registro`);
  await page.getByRole('button', { name: 'Verificar cadena', exact: true }).click();
  await page.getByText('Verificación correcta.', { exact: true }).waitFor();
  const verificacion = await (await context.request.get(`${base}/api/registro`)).json();
  assert.equal(verificacion.decisiones.ok, true);
  assert.equal(verificacion.aprobaciones.ok, true);
  await page.goto(base);
  await page.getByText('Filtros', { exact: false }).first().click();
  await page.getByLabel('Factura o proveedor').fill('inexistente-ui');
  await page.getByText('No hay facturas con estos filtros.', { exact: false }).waitFor();
  await page.getByRole('button', { name: 'Limpiar filtros' }).click();
  assert.equal(await page.locator('article').count(), 15);
  // Tema explícito prevalece ante un sistema oscuro.
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Cambiar tema', exact: false }).click();
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'light');
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(246, 249, 252)');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
  assert.equal(await page.locator('.revelada').count(), 0);
  await page.keyboard.press('Control+Home');
  await page.reload();
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Saltar al contenido');
  assert.equal(await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle), 'solid');
  await page.goto(`${base}/team`);
  for (const nombre of ['Tareas', 'Zonas', 'Bitácora', 'Acuerdo']) {
    const boton = page.getByRole('button', { name: new RegExp(`^${nombre}`) });
    await boton.focus(); await page.keyboard.press('Enter');
    assert.equal(await boton.getAttribute('aria-expanded'), 'true');
    assert.equal(await page.locator('.eq-panel').count(), 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
  }
  // Verificar navegación por tabulador hacia los controles de reglas.
  await page.goto(`${base}/reglas`);
  const alcanzados = new Set();
  for (let i = 0;i < 45;i++) {
    await page.keyboard.press('Tab');
    alcanzados.add(await page.evaluate(() => document.activeElement.id || document.activeElement.textContent.trim()));
  }
  assert(alcanzados.has('campo-limite_pago_usd'));
  assert([...alcanzados].some(t => t.includes('Guardar y volver a evaluar')));
  // Sin observer la mejora progresiva debe conservar todo el contenido visible.
  const sinObserver = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await sinObserver.addInitScript(() => { delete window.IntersectionObserver; try { localStorage.setItem('404-bienvenida-vista', '1'); } catch { } });
  const fallback = await sinObserver.newPage();
  await fallback.goto(base);
  assert.equal(await fallback.locator('article').count(), 15);
  assert.equal(await fallback.locator('.revelada').count(), 0);
  assert((await fallback.locator('#autonomia').innerText()).includes('53.3%'));
  await sinObserver.close();
  const sinJS = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const estatico = await sinJS.newPage();
  await estatico.goto(`${base}/facturas/F-005`);
  await estatico.getByText('Comprobaciones de las reglas', { exact: false }).click();
  assert.equal(await estatico.locator('details[open]').count(), 1);
  assert.equal(await estatico.evaluate(() => document.documentElement.scrollWidth), 390);
  await sinJS.close();
  assert.deepEqual(errores, []);
  // Restaurar únicamente la sesión local de prueba, usando el contrato existente.
  await context.request.post(`${base}/api/demo/restaurar`, { data: {} });
  console.log('OK: aprobar/rechazar, nota, confirmación, pendiente, FRENAR, plegables, reglas/versiones, cadena, filtros, tema, reduced motion, teclado y puertas de /team.');
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
