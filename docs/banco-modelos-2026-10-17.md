# Banco de modelos de lectura de facturas

**Corrida:** 17/10/2026 - 02:23 p. m. (Caracas, Venezuela). Gasto tope: USD 1.00.

Cada modelo lee las 18 facturas de Aurora Cloud en `data/facturas/` (texto de .eml/.txt/PDF con capa de texto; imagen para PNG/JPG) con el mismo prompt y esquema (`src/extraccion/esquema.json`, temperatura 0). Se compara con la extraccion esperada del dev-set (`data/dev-set*.json`), campo por campo (9 campos por factura; el vencimiento no se puntua). **El prompt se afino sobre este mismo set: la prueba real es el set ciego.**

| Modelo | Campos acertados / total | Facturas perfectas | Tiempo medio (ms) | Costo total (USD) | Fallos de formato |
|---|---|---|---|---|---|
| `anthropic/claude-haiku-5.5` | 159 / 161 (99%) | 17 / 18 | 2942 | 0.00802 | 0 |
| `google/gemini-3.1-flash-lite` | 161 / 161 (100%) | 18 / 18 | 1624 | 0.01284 | 0 |
| `openai/gpt-6-luna` | 155 / 161 (96%) | 17 / 18 | 2839 | 0.00234 | 0 |

**Gasto total estimado de esta corrida:** USD 0.02321.

## `anthropic/claude-haiku-5.5`

- **F-017**: id_fiscal: null != "FICVE003" | fecha: null != "2026-10-16"

## `google/gemini-3.1-flash-lite`

- Todas las facturas perfectas.

## `openai/gpt-6-luna`

- **F-017**: beneficiario: null != "tallerorinococa" | id_fiscal: null != "FICVE003" | cuenta: "ACCVE0001" != "ACCVE0003" | monto: 125000 != 119000 | fecha: null != "2026-10-16" | numero_factura: null != "TO0017"
