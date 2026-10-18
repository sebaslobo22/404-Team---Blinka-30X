// Corre el set ciego 2, el realista (data/ciego2, congelado por hash), por el lector y el motor, en orden, desde el contexto inicial.
// En vivo (gasta centavos): npx vite-node scripts/ciego2-correr.ts  · guarda lecturas en data/ciego2/lecturas/ y escribe docs/set-ciego2-resultados.md
// Repetir sin red:           EXTRACTION_MODE=replay npx vite-node scripts/ciego2-correr.ts  (escribe docs/set-ciego2-resultados-replay.md)
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import dataset from '../data/dev-set.json';
import { decidir } from '../src/engine/decide';
import type { Contexto } from '../src/engine/types';
import { configDesdeParametros, parametrosPorDefecto } from '../src/demo/parametros';
import { entradaDesdeArchivo } from '../src/extraccion/archivo';
import { extraerFactura } from '../src/extraccion/extraer';

interface Esperado { id: string; archivo: string; formato: string; decision_esperada: string; motivo: string; ambiguo: boolean; orden_de_proceso: number }

// Verifica el manifiesto con shasum (macOS/Linux) o sha256sum (Git Bash en Windows); lanza si algo cambió tras congelar.
function verificarManifiesto(): string {
  for (const cmd of ['shasum -a 256 -c MANIFIESTO.sha256', 'sha256sum -c MANIFIESTO.sha256']) {
    try { execSync(cmd, { cwd: 'data/ciego2', stdio: 'pipe' }); return cmd.split(' ')[0] as string; } catch (e) {
      const msg = String((e as { stderr?: Buffer; message?: string }).stderr ?? (e as Error).message);
      if (/not found|no se reconoce|ENOENT|command not found/i.test(msg)) continue;
      throw new Error(`El set ciego 2 cambió después de congelarse:\n${msg}`);
    }
  }
  throw new Error('No hay shasum ni sha256sum para verificar data/ciego2/MANIFIESTO.sha256');
}
const verificador = verificarManifiesto();

const esperado = (JSON.parse(readFileSync('data/ciego2/esperado.json', 'utf8')) as Esperado[]).sort((a, b) => a.orden_de_proceso - b.orden_de_proceso);
const config = configDesdeParametros(parametrosPorDefecto(), 'ciego2-v1');
const ctx = structuredClone(dataset.contexto) as unknown as Contexto;
const replay = process.env['EXTRACTION_MODE'] === 'replay';

interface Fila { id: string; formato: string; esperada: string; motor: string; reglas: string; ambiguo: boolean; alertas: string[]; confianza?: number | null; monto_centavos: number | null; moneda: string | null; lecturaFallida: boolean }
const filas: Fila[] = [];
let costo = 0;
for (const e of esperado) {
  const entrada = await entradaDesdeArchivo(`data/ciego2/${e.archivo}`);
  const r = await extraerFactura(entrada, { id: e.id, guardar: !replay, dirLecturas: 'data/ciego2/lecturas' });
  costo += r.costo_usd ?? 0;
  const f = r.factura;
  const d = decidir(e.id, f, ctx, config);
  if (d.decision === 'PAGAR') {
    ctx.historial.push({ numero_factura: f.numero_factura as string, id_fiscal: f.id_fiscal as string, monto_centavos: f.monto_centavos as number,
      moneda: f.moneda as string, categoria: f.categoria as string, fecha: ctx.ahora.slice(0, 10), estado: 'PAGADA' });
  }
  const reglas = d.razones.map((x) => x.regla).join(', ') || '-';
  const lecturaFallida = (f.alertas ?? []).some((a) => a.startsWith('lector_fallo'));
  filas.push({ id: e.id, formato: e.formato, esperada: e.decision_esperada, motor: d.decision, reglas, ambiguo: e.ambiguo,
    alertas: f.alertas ?? [], confianza: f.confianza, monto_centavos: f.monto_centavos, moneda: f.moneda, lecturaFallida });
  console.log(`${e.id}  esperada=${e.decision_esperada.padEnd(7)} motor=${d.decision.padEnd(7)} ${d.decision === e.decision_esperada ? 'ok ' : 'XX '} ${reglas}${e.ambiguo ? '  (ambiguo)' : ''}${lecturaFallida ? '  [lectura fallida]' : ''}`);
}

const puntuan = filas.filter((x) => !x.ambiguo);
const aciertos = puntuan.filter((x) => x.motor === x.esperada).length;
const aciertosTodos = filas.filter((x) => x.motor === x.esperada).length;
const indebidos = filas.filter((x) => x.motor === 'PAGAR' && x.esperada !== 'PAGAR');
const autonomas = filas.filter((x) => x.motor === 'PAGAR' || x.motor === 'FRENAR');
const autonomasBien = autonomas.filter((x) => x.motor === x.esperada);
const fallidas = filas.filter((x) => x.lecturaFallida);
const cuenta = (dec: string, campo: 'esperada' | 'motor') => filas.filter((x) => x[campo] === dec).length;
const pct = (n: number, t: number) => (t === 0 ? '0,0' : ((100 * n) / t).toFixed(1).replace('.', ','));
const commit = execSync('git rev-parse HEAD').toString().trim();

console.log(`\naciertos ${aciertos}/${puntuan.length} (sin ambiguos) · todos ${aciertosTodos}/${filas.length} · pagos indebidos ${indebidos.length} · decidido sin persona ${autonomas.length}/${filas.length} (${pct(autonomas.length, filas.length)} %) · lecturas fallidas ${fallidas.length} · costo USD ${costo.toFixed(4)}`);

const md = `# Set ciego 2 (realista): resultado de la corrida${replay ? ' en replay (sin red)' : ' en vivo'}

**Commit del código:** \`${commit.slice(0, 7)}\` · **Verificación del manifiesto:** \`${verificador}\` · **Modo:** ${replay ? 'replay, repite las lecturas guardadas' : 'en vivo, lector con dos modelos'}.
Protocolo y mezcla en \`docs/set-ciego2.md\`. Las etiquetas se congelaron antes de correr y este informe no las cambia.

## Resultado, tal cual
| Métrica | Valor |
|---|---|
| **Pagos indebidos** (el motor pagó donde lo esperado no era pagar) | **${indebidos.length} de ${filas.length}**${indebidos.length ? ` (${indebidos.map((x) => x.id).join(', ')})` : ''} |
| Coincidencia con la etiqueta, sin ambiguos | ${aciertos} de ${puntuan.length} (${pct(aciertos, puntuan.length)} %) |
| Coincidencia con la etiqueta, todos | ${aciertosTodos} de ${filas.length} |
| **Decidido sin persona** (PAGAR más FRENAR sobre el total) | **${autonomas.length} de ${filas.length} (${pct(autonomas.length, filas.length)} %)** |
| De esas decisiones autónomas, las correctas | ${autonomasBien.length} de ${autonomas.length} |
| Lecturas fallidas (el lector no devolvió datos) | ${fallidas.length} de ${filas.length} |
| Costo del lector | USD ${costo.toFixed(4)} |

Referencia de lo esperado: PAGAR ${cuenta('PAGAR', 'esperada')} · FRENAR ${cuenta('FRENAR', 'esperada')} · ESCALAR ${cuenta('ESCALAR', 'esperada')} (autonomía máxima posible con las etiquetas: ${pct(cuenta('PAGAR', 'esperada') + cuenta('FRENAR', 'esperada'), filas.length)} %).
Lo que decidió el motor: PAGAR ${cuenta('PAGAR', 'motor')} · FRENAR ${cuenta('FRENAR', 'motor')} · ESCALAR ${cuenta('ESCALAR', 'motor')}.

## Detalle por documento
| ID | Formato | Esperada | Pulso | Reglas | Alertas del lector |
|---|---|---|---|---|---|
${filas.map((x) => `| ${x.id} | ${x.formato} | ${x.esperada}${x.ambiguo ? ' (ambiguo)' : ''} | ${x.motor === x.esperada ? x.motor : `**${x.motor}**`} | ${x.reglas} | ${x.alertas.join(', ') || '-'} |`).join('\n')}

## Lectura de las diferencias
_Pendiente de escribir a mano después de revisar cada fila marcada en negrita. Si una etiqueta resulta mal hecha, se anota aquí y la cifra oficial sigue siendo la de arriba._
`;
writeFileSync(`docs/set-ciego2-resultados${replay ? '-replay' : ''}.md`, md);
writeFileSync(`data/ciego2/resultados${replay ? '-replay' : ''}.json`, `${JSON.stringify({ commit, replay, costo_usd: costo, filas }, null, 2)}\n`);
