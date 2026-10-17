# Banco de modelos de lectura de facturas

**Corrida:** 17/10/2026 - 01:20 p. m. (Caracas, Venezuela). Gasto tope: USD 1.00.

Cada modelo lee las 12 facturas de `data/facturas/` (texto de .eml/.txt/PDF con capa de texto; imagen para PNG/JPG) con el mismo prompt y esquema (`src/extraccion/esquema.json`, temperatura 0). Se compara con la extraccion esperada de `data/facturas/indice.json`, campo por campo (10 campos por factura; F10 puntua 7 porque borrosa a proposito).

| Modelo | Campos acertados / total | Facturas perfectas | Tiempo medio (ms) | Costo total (USD) | Fallos de formato |
|---|---|---|---|---|---|
| `anthropic/claude-haiku-5.5` | 117 / 117 (100%) | 12 / 12 | 2541 | 0.00439 | 0 |
| `openai/gpt-6-luna` | 116 / 117 (99%) | 11 / 12 | 3371 | 0.00180 | 0 |
| `google/gemini-3.1-flash-lite` | 117 / 117 (100%) | 12 / 12 | 1588 | 0.00781 | 0 |
| `qwen/qwen3-vl-30b-a3b-instruct` | 111 / 117 (95%) | 7 / 12 | 9406 | 0.00284 | 0 |
| `google/gemini-3.5-flash-lite` | 117 / 117 (100%) | 12 / 12 | 1470 | 0.01078 | 0 |

**Gasto total estimado de esta corrida:** USD 0.02761.

## `anthropic/claude-haiku-5.5`

- Todas las facturas perfectas.

## `openai/gpt-6-luna`

- **F05**: fecha: null != "2026-10-06"

## `google/gemini-3.1-flash-lite`

- Todas las facturas perfectas.

## `qwen/qwen3-vl-30b-a3b-instruct`

- **F03**: instrucciones_detectadas: true != false
- **F04**: cuenta: "RA0931" != "CODAVI77103321" | numero_factura: "CODAVI77103321" != "RA0931"
- **F05**: categoria: "Otra" != "Software"
- **F09**: categoria: "Otra" != "Analitica de datos"
- **F12**: instrucciones_detectadas: true != false

## `google/gemini-3.5-flash-lite`

- Todas las facturas perfectas.

## Reajuste: ajuste de prompt sobre el mismo set (F04, F05)

**Corrida:** 17/10/2026 - 01:25 p. m. (Caracas, Venezuela). Gasto tope: USD 0.05.

Cada modelo lee las 2 facturas de `data/facturas/` (texto de .eml/.txt/PDF con capa de texto; imagen para PNG/JPG) con el mismo prompt y esquema (`src/extraccion/esquema.json`, temperatura 0). Se compara con la extraccion esperada de `data/facturas/indice.json`, campo por campo (10 campos por factura; F10 puntua 7 porque borrosa a proposito).

| Modelo | Campos acertados / total | Facturas perfectas | Tiempo medio (ms) | Costo total (USD) | Fallos de formato |
|---|---|---|---|---|---|
| `anthropic/claude-haiku-5.5` | 20 / 20 (100%) | 2 / 2 | 2527 | 0.00077 | 0 |
| `google/gemini-3.1-flash-lite` | 20 / 20 (100%) | 2 / 2 | 1729 | 0.00144 | 0 |

**Gasto total estimado de esta corrida:** USD 0.00220.

### `anthropic/claude-haiku-5.5`

- Todas las facturas perfectas.

### `google/gemini-3.1-flash-lite`

- Todas las facturas perfectas.
