// Corre el set ciego (data/ciego, congelado por hash) por el lector y el motor, en orden, desde el contexto inicial.
// En vivo (gasta centavos): npx vite-node scripts/ciego-correr.ts  · guarda lecturas en data/ciego/lecturas/
// Repetir sin red:           EXTRACTION_MODE=replay npx vite-node scripts/ciego-correr.ts
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import dataset from '../data/dev-set.json';
import { decidir } from '../src/engine/decide';
import type { Contexto } from '../src/engine/types';
import { configDesdeParametros, parametrosPorDefecto } from '../src/demo/parametros';
import { entradaDesdeArchivo } from '../src/extraccion/archivo';
import { extraerFactura } from '../src/extraccion/extraer';

interface Esperado { id: string; archivo: string; formato: string; decision_esperada: string; motivo: string; ambiguo: boolean; orden_de_proceso: number }

execSync('shasum -a 256 -c MANIFIESTO.sha256', { cwd: 'data/ciego', stdio: 'pipe' }); // lanza si algo cambió tras congelar
const esperado = (JSON.parse(readFileSync('data/ciego/esperado.json', 'utf8')) as Esperado[]).sort((a, b) => a.orden_de_proceso - b.orden_de_proceso);
const config = configDesdeParametros(parametrosPorDefecto(), 'ciego-v1');
const ctx = structuredClone(dataset.contexto) as unknown as Contexto;
const replay = process.env['EXTRACTION_MODE'] === 'replay';

const filas = [];
let costo = 0;
for (const e of esperado) {
  const entrada = await entradaDesdeArchivo(`data/ciego/${e.archivo}`);
  const r = await extraerFactura(entrada, { id: e.id, guardar: !replay, dirLecturas: 'data/ciego/lecturas' });
  costo += r.costo_usd ?? 0;
  const f = r.factura;
  const d = decidir(e.id, f, ctx, config);
  if (d.decision === 'PAGAR') {
    ctx.historial.push({ numero_factura: f.numero_factura as string, id_fiscal: f.id_fiscal as string, monto_centavos: f.monto_centavos as number,
      moneda: f.moneda as string, categoria: f.categoria as string, fecha: ctx.ahora.slice(0, 10), estado: 'PAGADA' });
  }
  const reglas = d.razones.map((x) => x.regla).join(', ') || '-';
  filas.push({ id: e.id, formato: e.formato, esperada: e.decision_esperada, motor: d.decision, reglas, ambiguo: e.ambiguo,
    alertas: f.alertas ?? [], confianza: f.confianza, monto_centavos: f.monto_centavos, moneda: f.moneda });
  console.log(`${e.id}  esperada=${e.decision_esperada.padEnd(7)} motor=${d.decision.padEnd(7)} ${d.decision === e.decision_esperada ? 'ok ' : 'XX '} ${reglas}${e.ambiguo ? '  (ambiguo)' : ''}`);
}
const puntuan = filas.filter((x) => !x.ambiguo);
const aciertos = puntuan.filter((x) => x.motor === x.esperada).length;
const indebidos = filas.filter((x) => x.motor === 'PAGAR' && x.esperada !== 'PAGAR');
console.log(`\naciertos ${aciertos}/${puntuan.length} (sin ambiguos) · todos ${filas.filter((x) => x.motor === x.esperada).length}/${filas.length} · pagos indebidos ${indebidos.length} · costo USD ${costo.toFixed(4)}`);
writeFileSync(`data/ciego/resultados${replay ? '-replay' : ''}.json`, `${JSON.stringify({ commit: execSync('git rev-parse HEAD').toString().trim(), replay, costo_usd: costo, filas }, null, 2)}\n`);
