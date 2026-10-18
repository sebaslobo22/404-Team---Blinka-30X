// Guarda los SHA-256 de todo lo que se fija antes de correr. Uso: npx vite-node scripts/externo-congelar.ts
import { writeFileSync } from 'node:fs';
import { ARCHIVOS_CONGELADOS, sha256 } from '../src/externo/hashes';

const hashes: Record<string, string> = {};
for (const a of ARCHIVOS_CONGELADOS) hashes[a] = sha256(a);
writeFileSync(
  'data/externo/CONGELADO.json',
  `${JSON.stringify({ nota: 'Hashes SHA-256 de lo fijado antes de correr el motor sobre el set externo.', hashes }, null, 2)}\n`,
  'utf8',
);
for (const [k, v] of Object.entries(hashes)) console.log(`${v.slice(0, 16)}  ${k}`);
