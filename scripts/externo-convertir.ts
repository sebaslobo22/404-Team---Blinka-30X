// Genera data/externo/set-externo.json desde el CSV de Joffre. No usa el motor.
// Uso: npx vite-node scripts/externo-convertir.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { convertir } from '../src/externo/convertir';

const csv = readFileSync('data/externo/fuente-joffre.csv', 'utf8');
const set = convertir(csv);
writeFileSync('data/externo/set-externo.json', `${JSON.stringify(set, null, 2)}\n`, 'utf8');
console.log(`filas: ${set.filas.length}`);
console.log(`puntuan: ${set.filas.filter((f) => f.puntua).length}`);
console.log(`excluidas: ${set.excluidas.length}`);
for (const e of set.excluidas) console.log(`  ${e.id}: ${e.motivo}`);
console.log(`beneficiarios registrados: ${set.contexto.beneficiarios.length}`);
console.log(`acuerdos: ${set.contexto.acuerdos.length}`);
console.log(`ahora: ${set.contexto.ahora}`);
