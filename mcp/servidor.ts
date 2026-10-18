// Servidor MCP de Pulso por stdio. Expone el lector y el motor de decisiones como herramientas para
// Claude Code, Claude Desktop o cualquier cliente MCP. Ninguna herramienta mueve dinero.
//
//   npm run mcp                      (o: npx vite-node mcp/servidor.ts)
//   claude mcp add pulso -- npx vite-node mcp/servidor.ts
//
// OJO: por stdio, stdout es el canal del protocolo. Nada de console.log: los avisos van a stderr.
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ejecutarHerramienta, HERRAMIENTAS } from './herramientas';

// La clave de OpenRouter (solo para leer_y_decidir_factura) puede estar en .env.local o .env.
for (const f of ['.env.local', '.env']) {
  try {
    process.loadEnvFile(f);
  } catch {
    /* no existe: se sigue con lo que ya haya en el entorno */
  }
}

const servidor = new Server(
  { name: 'pulso', version: '0.1.0' },
  {
    capabilities: { tools: {} },
    instructions:
      'Pulso decide PAGAR, FRENAR o ESCALAR facturas con un motor de reglas determinista. Nunca mueve dinero. ' +
      'Lo que entra en vivo nunca sale PAGAR (como máximo ESCALAR). La orden para Blinka es un formato propuesto.',
  },
);

servidor.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: HERRAMIENTAS }));

servidor.setRequestHandler(CallToolRequestSchema, async (peticion) => {
  const r = await ejecutarHerramienta(peticion.params.name, peticion.params.arguments ?? {});
  if (r.ok) return { content: [{ type: 'text' as const, text: JSON.stringify(r.datos, null, 2) }] };
  return { isError: true, content: [{ type: 'text' as const, text: JSON.stringify({ codigo: r.codigo, error: r.error }, null, 2) }] };
});

await servidor.connect(new StdioServerTransport());
console.error('[pulso-mcp] listo por stdio (5 herramientas, ninguna mueve dinero)');
