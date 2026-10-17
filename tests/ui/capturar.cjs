// Ejecutar con npm run dev local; usa un Playwright ya disponible.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('fs');
const base = 'http://localhost:3000';
const out = require('node:path').resolve(__dirname, '../../docs/capturas-ui');
(async () => {  
const browser = await chromium.launch({ headless: true }); const errors = []; const results = [];
  for (const width of [390, 1280]) for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme, reducedMotion: 'reduce' });
    const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(t => { localStorage.setItem('404-tema', t); }, theme);
    for (const [ruta, nombre] of [['/', 'decisiones'], ['/facturas/F-005', 'factura-F-005'], ['/cola', 'cola'], ['/reglas', 'reglas'], ['/registro', 'registro'], ['/team', 'team']]) {
      const r = await page.goto(base + ruta); await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => { }); await page.evaluate(() => document.fonts.ready); await page.addStyleTag({ content: 'nextjs-portal { display:none !important; }' });
      const dims = await page.evaluate(() => ({ ancho: document.documentElement.scrollWidth, vista: innerWidth, tema: getComputedStyle(document.body).backgroundColor }));
      results.push({ ruta, width, theme, status: r.status(), ...dims }); fs.mkdirSync(out, { recursive: true });
      await page.screenshot({ path: `${out}/${nombre}-${width}-${theme === 'light' ? 'claro' : 'oscuro'}.png`, fullPage: true });

    }
    await context.close(); console.log('Completado', width, theme);
  }
  console.log(JSON.stringify({ capturas: results.length, desbordamientos: results.filter(r => r.ancho > r.vista), errores: errors })); fs.writeFileSync(`${out}/matriz.json`, JSON.stringify({ results, errors }, null, 2)); await browser.close();
})();
