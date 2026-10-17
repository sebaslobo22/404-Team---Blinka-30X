// Corre el motor UNA sola vez sobre el set externo congelado. Uso: npx vite-node scripts/externo-correr.ts
// Se niega a correr si algun hash cambio, si hay cambios sin commit en lo fijado o si ya existe una corrida.
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import reglas from '../docs/reglas-R1-R8.json';
import { cargarConfig } from '../src/engine/config';
import { decidir } from '../src/engine/decide';
import type { Config, Contexto } from '../src/engine/types';
import type { SetExterno } from '../src/externo/convertir';
import { ARCHIVOS_CONGELADOS, sha256 } from '../src/externo/hashes';
import { puntuar } from '../src/externo/puntuar';

const SALIDA_JSON = 'data/externo/resultados-corrida-1.json';
const SALIDA_MD = 'docs/set-externo-resultados.md';

function exigirCongelado(): { commit: string; hashes: Record<string, string> } {
  if (existsSync(SALIDA_JSON)) throw new Error('Ya existe una corrida. Es una sola vez: no se repite.');
  const congelado = JSON.parse(readFileSync('data/externo/CONGELADO.json', 'utf8')) as { hashes: Record<string, string> };
  for (const a of ARCHIVOS_CONGELADOS) {
    if (a === 'scripts/externo-correr.ts') continue; // se comprueba abajo contra el hash guardado
    if (congelado.hashes[a] !== sha256(a)) throw new Error(`Cambio despues de congelar: ${a}`);
  }
  if (congelado.hashes['scripts/externo-correr.ts'] !== sha256('scripts/externo-correr.ts')) {
    throw new Error('Cambio despues de congelar: scripts/externo-correr.ts');
  }
  const sucio = execSync('git status --porcelain -- data/externo docs/set-externo.md scripts src/externo', { encoding: 'utf8' }).trim();
  if (sucio !== '') throw new Error(`Hay cambios sin commit en lo congelado:\n${sucio}`);
  const commit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  return { commit, hashes: congelado.hashes };
}

const { commit, hashes } = exigirCongelado();
const set = JSON.parse(readFileSync('data/externo/set-externo.json', 'utf8')) as SetExterno;

const base = cargarConfig(reglas as never);
const tasas = { ...base.tasas_milli };
for (const m of set.config.monedas_quitadas) delete tasas[m];
const cfg: Config = {
  ...base,
  version: 'externo-v1',
  limite_pago_usd_centavos: set.config.limite_pago_usd_centavos,
  tope_mensual_usd_centavos: set.config.tope_mensual_usd_centavos,
  ventana_cuenta_dias: set.config.ventana_cuenta_dias,
  ventana_duplicado_dias: set.config.ventana_duplicado_dias,
  tolerancia_bps: set.config.tolerancia_bps,
  tasas_milli: tasas,
};
const ctx = structuredClone(set.contexto) as unknown as Contexto;

const obtenidos = set.filas.map((f) => {
  const r = decidir(f.id, f.factura, ctx, cfg);
  if (r.decision === 'PAGAR') {
    const x = f.factura;
    ctx.historial.push({
      numero_factura: x.numero_factura as string,
      id_fiscal: x.id_fiscal as string,
      monto_centavos: x.monto_centavos as number,
      moneda: x.moneda as string,
      categoria: x.categoria as string,
      fecha: ctx.ahora.slice(0, 10),
      estado: 'PAGADA',
    });
  }
  return { id: f.id, decision: r.decision, razones: r.razones.map((z) => z.regla), explicacion: r.explicacion };
});

const puntaje = puntuar(
  set.filas.map((f) => ({ id: f.id, esperada: f.esperada, puntua: f.puntua, regla: f.regla })),
  obtenidos,
);

const filas = set.filas.map((f, i) => ({
  id: f.id,
  proveedor: f.factura.beneficiario,
  esperada: f.esperada,
  motor: obtenidos[i]!.decision,
  razones: obtenidos[i]!.razones,
  puntua: f.puntua,
  motivo_exclusion: f.motivo_exclusion,
}));

writeFileSync(
  SALIDA_JSON,
  `${JSON.stringify({ corrida: 1, ejecutada_utc: new Date().toISOString(), commit_congelado: commit, hashes, puntaje, filas }, null, 2)}\n`,
  'utf8',
);

const pct = (a: number, b: number) => (b === 0 ? 'sin datos' : `${a} de ${b} (${((a / b) * 100).toFixed(1)} %)`);
const lista = (ids: string[]) => (ids.length === 0 ? 'ninguna' : ids.join(', '));
const md = `# Set externo de Joffre: resultado de la corrida 1

**Una sola corrida, tal cual.** Protocolo congelado en el commit \`${commit}\` (hashes en \`data/externo/CONGELADO.json\`). Ejecutada: ${new Date().toISOString()}.
Nombre honesto: **set externo, escrito por un compañero, visto antes de correr** (no es un set ciego). Mide el motor de reglas, no el lector ni los modelos. Detalle y límites: \`docs/set-externo.md\`.

## Los tres números (${puntaje.puntuan} filas que puntúan de ${set.filas.length})

| | Resultado |
|---|---|
| **(a) Pagos indebidos** (esperaba no pagar y el motor pagó) | **${puntaje.a_pagos_indebidos.length}** (${lista(puntaje.a_pagos_indebidos)}) |
| **(b) No pagar donde se esperaba no pagar** | ${pct(puntaje.b_no_pagar_ok, puntaje.esperan_no_pagar)} |
| **(c) Coincidencia exacta con la decisión esperada** | ${pct(puntaje.c_exactas, puntaje.puntuan)} |

## Aparte, sin mezclar
- **Autonomía perdida** (esperaba PAGAR y el motor no pagó): ${lista(puntaje.autonomia_perdida)}.
- **Diferencias de política** (no cuentan como error en (b)): el archivo dice FRENAR y el motor ESCALAR en ${puntaje.politica_frenar_esperado_escalar_obtenido.length} filas; el archivo dice ESCALAR y el motor FRENAR en ${puntaje.politica_escalar_esperado_frenar_obtenido.length} filas.
- **Instrucciones ocultas:** el motor activó INYECCION en ${puntaje.inyeccion.detectadas} de ${puntaje.inyeccion.filas_con_inyeccion} filas con inyección del archivo (no detectadas: ${lista(puntaje.inyeccion.no_detectadas)}).
- **Excluidas del puntaje:** ${puntaje.excluidas.total} filas. Filas excluidas donde el archivo esperaba no pagar y el motor pagó: ${lista(puntaje.excluidas.pagadas_donde_se_esperaba_no_pagar)}.

## Lectura honesta
- Las filas PAGAR del archivo pasan **por construcción** (el registro y los acuerdos salen de ellas): no son evidencia.
- (c) está castigado por la regla de registro: proveedores grandes que solo aparecen en filas ESCALAR no están registrados, así que el motor los frena por R2 donde el archivo los escala por R1.
- No se mide el lector, ni los dos modelos, ni documentos. Solo el motor sobre datos estructurados.
- Esto no prueba generalización.

## Detalle por fila
| ID | Proveedor | Esperada | Motor | Razones | Puntúa |
|---|---|---|---|---|---|
${filas.map((f) => `| ${f.id} | ${f.proveedor ?? '(vacío)'} | ${f.esperada} | ${f.motor} | ${f.razones.join(', ') || '-'} | ${f.puntua ? 'sí' : 'no'} |`).join('\n')}
`;
writeFileSync(SALIDA_MD, md, 'utf8');

console.log(`Puntuan: ${puntaje.puntuan}`);
console.log(`(a) pagos indebidos: ${puntaje.a_pagos_indebidos.length} ${lista(puntaje.a_pagos_indebidos)}`);
console.log(`(b) no pagar donde se esperaba: ${pct(puntaje.b_no_pagar_ok, puntaje.esperan_no_pagar)}`);
console.log(`(c) exactas: ${pct(puntaje.c_exactas, puntaje.puntuan)}`);
console.log(`autonomia perdida: ${lista(puntaje.autonomia_perdida)}`);
console.log(`inyeccion: ${puntaje.inyeccion.detectadas}/${puntaje.inyeccion.filas_con_inyeccion}`);
