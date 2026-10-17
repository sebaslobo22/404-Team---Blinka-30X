#!/usr/bin/env node
// Banco de modelos: corre las 12 facturas de data/facturas/ por cada modelo de OpenRouter y compara
// la lectura con la extraccion esperada (data/facturas/indice.json), campo por campo.
//
// Uso: node scripts/banco-modelos.mjs [--modelos a,b,c] [--max-usd 1.00] [--sin-informe]
// La clave OPENROUTER_API_KEY se lee de .env (parseo a mano) o del entorno. Nunca se imprime ni se guarda.
// Este script es autonomo (sin imports de src/*.ts): repite la llamada HTTP y la capa de texto del PDF
// para poder correr con `node` a secas. El prompt y el esquema salen de src/extraccion/esquema.json.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const MODELOS_DEFECTO = [
  'anthropic/claude-haiku-5.5',
  'openai/gpt-6-luna',
  'google/gemini-3.1-flash-lite',
  'qwen/qwen3-vl-30b-a3b-instruct',
];

// ---- argumentos y clave ------------------------------------------------------------------------
const args = process.argv.slice(2);
const valor = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const modelos = (valor('--modelos') ?? MODELOS_DEFECTO.join(',')).split(',').map((s) => s.trim()).filter(Boolean);
const maxUsd = Number(valor('--max-usd') ?? '1.00');
const sinInforme = args.includes('--sin-informe');
if (!Number.isFinite(maxUsd) || maxUsd <= 0) { console.error('--max-usd invalido'); process.exit(1); }

function leerClave() {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY;
  const ruta = join(raiz, '.env');
  if (!existsSync(ruta)) return undefined;
  for (const linea of readFileSync(ruta, 'utf8').split(/\r?\n/)) {
    const m = linea.match(/^\s*OPENROUTER_API_KEY\s*=\s*(.*)\s*$/);
    if (m) return m[1].replace(/^['"]|['"]$/g, '').trim();
  }
  return undefined;
}
const CLAVE = leerClave();
if (!CLAVE) { console.error('Falta OPENROUTER_API_KEY en .env o en el entorno.'); process.exit(1); }

// ---- datos -------------------------------------------------------------------------------------
const esquema = JSON.parse(readFileSync(join(raiz, 'src/extraccion/esquema.json'), 'utf8'));
const soloIds = valor('--facturas')?.split(',');
const indice = JSON.parse(readFileSync(join(raiz, 'data/facturas/indice.json'), 'utf8')).facturas.filter((f) => !soloIds || soloIds.includes(f.id));

function textoDePdf(buf) {
  const s = buf.toString('latin1');
  const lineas = [];
  const re = /stream\r?\n/g;
  let m;
  while ((m = re.exec(s))) {
    const ini = m.index + m[0].length;
    const fin = s.indexOf('endstream', ini);
    if (fin < 0) break;
    let d;
    try { d = inflateSync(buf.subarray(ini, fin)).toString('latin1'); } catch { continue; }
    if (!/\bBT\b/.test(d)) continue;
    for (const bloque of d.split(/\bBT\b/).slice(1)) {
      let l = '';
      for (const c of (bloque.split(/\bET\b/)[0] ?? '').matchAll(/\(((?:\\.|[^\\)])*)\)/g)) l += c[1].replace(/\\([nrtbf()\\]|[0-7]{1,3})/g, (_x, g) => (/^[0-7]+$/.test(g) ? String.fromCharCode(parseInt(g, 8)) : ({ n: '\n', r: '\r', t: '\t', b: '\b', f: '\f' }[g] ?? g)));
      if (l.trim()) lineas.push(l.replace(/\s+$/, ''));
    }
  }
  return lineas.join('\n');
}

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };
function entrada(f) {
  const ruta = join(raiz, 'data/facturas', f.archivo);
  const ext = extname(ruta).toLowerCase();
  const datos = readFileSync(ruta);
  if (MIME[ext]) return { tipo: 'imagen', dataUrl: `data:${MIME[ext]};base64,${datos.toString('base64')}` };
  return { tipo: 'texto', texto: ext === '.pdf' ? textoDePdf(datos) : datos.toString('utf8') };
}

// ---- llamada -----------------------------------------------------------------------------------
async function llamar(modelo, e) {
  const contenido = e.tipo === 'texto'
    ? [{ type: 'text', text: esquema.usuario_texto.replace('{{DOCUMENTO}}', () => e.texto) }]
    : [{ type: 'text', text: esquema.usuario_imagen }, { type: 'image_url', image_url: { url: e.dataUrl } }];
  let conEsquema = true;
  let ultimo = 'desconocido';
  const t0 = Date.now();
  for (let intento = 1; intento <= 2; intento++) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 30_000);
    try {
      const body = {
        model: modelo, temperature: 0, max_tokens: 1200, usage: { include: true },
        messages: [{ role: 'system', content: esquema.sistema }, { role: 'user', content: contenido }],
        response_format: conEsquema ? { type: 'json_schema', json_schema: { name: 'lectura_factura', strict: true, schema: esquema.lectura } } : { type: 'json_object' },
      };
      const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST', headers: { Authorization: `Bearer ${CLAVE}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl.signal,
      });
      const t = await r.text();
      if (!r.ok) {
        ultimo = `http_${r.status}`;
        if (r.status === 400 && conEsquema) { conEsquema = false; continue; }
        if (r.status === 429 || r.status >= 500) continue;
        return { error: `${ultimo}: ${t.replace(/sk-[A-Za-z0-9_-]{8,}/g, '[clave]').slice(0, 140)}`, ms: Date.now() - t0 };
      }
      const j = JSON.parse(t);
      if (j.error) { ultimo = `error_proveedor: ${String(j.error.message ?? j.error.code ?? '').slice(0, 120)}`; continue; }
      const c = j.choices?.[0]?.message?.content;
      const contenidoTxt = typeof c === 'string' ? c : Array.isArray(c) ? c.map((x) => x?.text ?? '').join('') : '';
      if (!contenidoTxt.trim()) { ultimo = 'respuesta_vacia'; continue; }
      const u = j.usage ?? {};
      return {
        contenido: contenidoTxt, ms: Date.now() - t0, entrada: u.prompt_tokens ?? 0, salida: u.completion_tokens ?? 0,
        costo: typeof u.cost === 'number' ? u.cost : null, estricto: conEsquema,
      };
    } catch (err) {
      ultimo = err?.name === 'AbortError' ? 'timeout' : 'red';
    } finally { clearTimeout(timer); }
  }
  return { error: ultimo, ms: Date.now() - t0 };
}

// ---- comparacion -------------------------------------------------------------------------------
const sinAcentos = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const nombre = (v) => (v == null ? null : sinAcentos(String(v)).toLowerCase().replace(/[^a-z0-9]/g, ''));
const id = (v) => (v == null ? null : sinAcentos(String(v)).toUpperCase().replace(/[^A-Z0-9]/g, ''));
const centavos = (m) => {
  if (typeof m !== 'string' || !/^\d{1,15}(\.\d{1,2})?$/.test(m)) return undefined;
  const [e, d = ''] = m.split('.');
  return Number(BigInt(e) * 100n + BigInt(d.padEnd(2, '0')));
};
const CAMPOS = [
  ['beneficiario', (l) => nombre(l.beneficiario), (x) => nombre(x.beneficiario)],
  ['id_fiscal', (l) => id(l.id_fiscal), (x) => id(x.id_fiscal)],
  ['cuenta', (l) => id(l.cuenta), (x) => id(x.cuenta)],
  ['monto', (l) => (l.monto == null ? null : centavos(l.monto)), (x) => x.monto_centavos],
  ['moneda', (l) => l.moneda ?? null, (x) => x.moneda],
  ['fecha', (l) => l.fecha ?? null, (x) => x.fecha_emision],
  ['fecha_vencimiento', (l) => l.fecha_vencimiento ?? null, (x) => x.fecha_vencimiento],
  ['numero_factura', (l) => id(l.numero_factura), (x) => id(x.numero_factura)],
  ['categoria', (l) => l.categoria ?? null, (x) => x.categoria],
  ['instrucciones_detectadas', (l) => l.instrucciones_detectadas, (x) => x.instrucciones_detectadas],
];
const TIPOS = { beneficiario: 's', id_fiscal: 's', cuenta: 's', monto: 's', moneda: 's', fecha: 's', fecha_vencimiento: 's', numero_factura: 's', categoria: 's' };

function validarFormato(l) {
  if (!l || typeof l !== 'object' || Array.isArray(l)) return 'no_objeto';
  for (const [k] of Object.entries(TIPOS)) if (!(k in l) || (l[k] !== null && typeof l[k] !== 'string')) return `campo_${k}`;
  if (l.categoria !== null && !esquema.categorias.includes(l.categoria)) return 'categoria_fuera_de_lista';
  if (typeof l.moneda_explicita !== 'boolean') return 'campo_moneda_explicita';
  if (typeof l.instrucciones_detectadas !== 'boolean') return 'campo_instrucciones_detectadas';
  if (typeof l.confianza !== 'number' || l.confianza < 0 || l.confianza > 1) return 'campo_confianza';
  if (l.monto !== null && centavos(l.monto) === undefined) return 'monto_formato';
  return null;
}
function parsear(t) {
  const s = t.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try { return JSON.parse(s); } catch { const a = s.indexOf('{'); const b = s.lastIndexOf('}'); return JSON.parse(s.slice(a, b + 1)); }
}

// ---- precios (para estimar costo si OpenRouter no lo informa) ------------------------------------
let precios = {};
try {
  const r = await fetch('https://openrouter.ai/api/v1/models');
  for (const m of (await r.json()).data) precios[m.id] = { p: Number(m.pricing?.prompt) || 0, c: Number(m.pricing?.completion) || 0 };
} catch { /* sin precios: se usa solo usage.cost */ }

// ---- corrida -----------------------------------------------------------------------------------
const entradas = new Map(indice.map((f) => [f.id, entrada(f)]));
let gasto = 0;
let cortado = false;
const resultados = [];
for (const modelo of modelos) {
  const res = { modelo, acertados: 0, total: 0, perfectas: 0, ms: [], costo: 0, fallosFormato: 0, errores: [], detalle: [], noExiste: false, tokens: 0 };
  resultados.push(res);
  for (const f of indice) {
    if (gasto >= maxUsd) { cortado = true; break; }
    const e = entradas.get(f.id);
    const r = await llamar(modelo, e);
    const omitir = new Set(f.omitir_en_puntaje ?? []);
    const aScorear = CAMPOS.filter(([n]) => !omitir.has(n));
    if (r.error) {
      res.errores.push(`${f.id}: ${r.error}`);
      res.total += aScorear.length;
      res.detalle.push({ id: f.id, malos: ['(sin respuesta)'] });
      if (/http_(404|400)/.test(r.error) && res.detalle.length === 1) { res.noExiste = true; break; }
      continue;
    }
    const costo = r.costo ?? (precios[modelo] ? r.entrada * precios[modelo].p + r.salida * precios[modelo].c : 0);
    gasto += costo; res.costo += costo; res.ms.push(r.ms); res.tokens += r.entrada + r.salida;
    let lectura = null;
    let fmt = null;
    try { lectura = parsear(r.contenido); fmt = validarFormato(lectura); } catch { fmt = 'json_invalido'; }
    if (fmt) res.fallosFormato++;
    const malos = [];
    for (const [n, deLectura, deEsperada] of aScorear) {
      res.total++;
      const got = lectura && typeof lectura === 'object' ? deLectura(lectura) : undefined;
      const exp = deEsperada(f.extraccion_esperada);
      if (got === exp) res.acertados++; else malos.push(`${n}: ${JSON.stringify(got)} != ${JSON.stringify(exp)}`);
    }
    if (malos.length === 0) res.perfectas++;
    res.detalle.push({ id: f.id, malos, formato: fmt });
    process.stderr.write(`${modelo} ${f.id} ${malos.length === 0 ? 'ok' : `${malos.length} mal`}${fmt ? ` formato=${fmt}` : ''}\n`);
  }
  if (cortado) break;
}

// ---- informe -----------------------------------------------------------------------------------
const media = (a) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null);
const fecha = new Intl.DateTimeFormat('es-VE', { timeZone: 'America/Caracas', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date());
let md = `${soloIds ? '## Reajuste: ajuste de prompt sobre el mismo set (' + soloIds.join(', ') + ')' : '# Banco de modelos de lectura de facturas'}\n\n**Corrida:** ${fecha.replace(',', ' -')} (Caracas, Venezuela). Gasto tope: USD ${maxUsd.toFixed(2)}.\n\n`;
md += `Cada modelo lee las ${indice.length} facturas de \`data/facturas/\` (texto de .eml/.txt/PDF con capa de texto; imagen para PNG/JPG) con el mismo prompt y esquema (\`src/extraccion/esquema.json\`, temperatura 0). Se compara con la extraccion esperada de \`data/facturas/indice.json\`, campo por campo (10 campos por factura; F10 puntua 7 porque borrosa a proposito).\n\n`;
md += '| Modelo | Campos acertados / total | Facturas perfectas | Tiempo medio (ms) | Costo total (USD) | Fallos de formato |\n|---|---|---|---|---|---|\n';
for (const r of resultados) {
  md += `| \`${r.modelo}\` | ${r.noExiste ? 'no disponible' : `${r.acertados} / ${r.total} (${r.total ? Math.round((100 * r.acertados) / r.total) : 0}%)`} | ${r.perfectas} / ${indice.length} | ${media(r.ms) ?? '-'} | ${r.costo.toFixed(5)} | ${r.fallosFormato} |\n`;
}
md += `\n**Gasto total estimado de esta corrida:** USD ${gasto.toFixed(5)}${cortado ? ' (CORTADA por llegar al tope)' : ''}.\n`;
for (const r of resultados) {
  md += `\n## \`${r.modelo}\`\n\n`;
  if (r.errores.length) md += `Errores de llamada: ${r.errores.join('; ')}\n\n`;
  const imp = r.detalle.filter((d) => d.malos.length || d.formato);
  md += imp.length ? imp.map((d) => `- **${d.id}**${d.formato ? ` (formato: ${d.formato})` : ''}: ${d.malos.join(' | ') || 'campos bien'}`).join('\n') : '- Todas las facturas perfectas.';
  md += '\n';
}
console.log(md);
if (!sinInforme) {
  const dest = join(raiz, 'docs/banco-modelos-2026-10-17.md');
  if (soloIds) writeFileSync(dest, `${readFileSync(dest, 'utf8').split('\n## Reajuste')[0].trimEnd()}\n\n${md.replace(/^## `/gm, '### `')}`, 'utf8');
  else writeFileSync(dest, md, 'utf8');
  console.error('Informe guardado en docs/banco-modelos-2026-10-17.md');
}
