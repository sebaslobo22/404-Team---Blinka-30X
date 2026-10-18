import { defineConfig } from 'vitest/config';
// JSX automático: las pruebas pueden renderizar componentes de app/ sin importar React en cada archivo.
export default defineConfig({ esbuild: { jsx: 'automatic' }, test: { include: ['tests/**/*.test.ts'] } });
