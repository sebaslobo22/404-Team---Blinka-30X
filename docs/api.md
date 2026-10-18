# API de Pulso y servidor MCP

Referencia de las rutas HTTP de `app/api/` que sirven a canales y a integraciones, y del servidor MCP.
Todo se escribió leyendo el código de cada ruta; los ejemplos con `curl` se corrieron contra `next start` en local.

**Reglas que valen para todo lo de abajo**

- Pulso **nunca mueve dinero**. Ninguna ruta ejecuta un pago: las órdenes son un formato propuesto y `POST /api/pagos` solo deja constancia de que una persona ya pagó por fuera.
- Todo lo que entra en vivo (`/api/vivo`, `/api/canal/gmail`, Telegram, MCP) **nunca sale PAGAR**: el techo `aplicarTechoEnVivo` (`src/telegram/techo.ts`) baja un PAGAR a ESCALAR. FRENAR se mantiene.
- Los datos de la demo son ficticios (empresa Aurora Cloud). El estado de la demo vive en la memoria del proceso: se reinicia con cada arranque y cada instancia serverless tiene el suyo.
- Los límites por visitante, remitente o día de las rutas web viven **en memoria del proceso**. No son el techo de gasto: ese es el límite de crédito de la clave de OpenRouter, que se fija en su panel.
- Dinero siempre en centavos enteros (`monto_centavos`); el campo `monto` de una orden es texto con dos decimales.

## Resumen

| Ruta | Método | Autenticación | Para qué |
|---|---|---|---|
| `/api/vivo` | GET, POST | ninguna (apagada por defecto; límites por visitante) | Leer y decidir una factura subida desde la web |
| `/api/ordenes` | GET | ninguna | Órdenes de pago de la demo en JSON |
| `/api/ordenes/csv` | GET | ninguna | Lote de órdenes en CSV |
| `/api/pagos` | POST | ninguna | Marcar una orden como pagada por fuera |
| `/api/canal/gmail` | POST | `Authorization: Bearer <GMAIL_CANAL_SECRETO>` | Canal de correo (Apps Script) |
| `/api/telegram` | POST | cabecera `X-Telegram-Bot-Api-Secret-Token` | Webhook del bot de Telegram |

`/api/ordenes`, `/api/ordenes/csv` y `/api/pagos` **no tienen autenticación**: sirven datos ficticios de una demo pública. Antes de apuntarlos a datos reales hay que ponerlos detrás de un inicio de sesión. También existen `/api/aprobaciones`, `/api/registro`, `/api/reglas` y `/api/demo/*` (los usa la web) y `/api/team/*` (centro de mando interno, oculto con `MODO_PUBLICO=1`); no se documentan aquí.

---

## `GET /api/vivo` y `POST /api/vivo`

Lectura en vivo de una factura subida desde `/probar`. Código: `app/api/vivo/route.ts`, `src/vivo/`.

**Activación.** Solo funciona con `LECTURA_EN_VIVO=1` **y** `OPENROUTER_API_KEY`. Sin eso, `GET` devuelve `{"activa":false}` y `POST` responde 503.

**GET** devuelve `{"activa": true|false}`.

**POST** recibe `multipart/form-data` con un campo `factura` (archivo). Admite PDF con capa de texto, JPG y PNG, de hasta 4 MB. El tipo se decide por la firma de bytes, no por la extensión.

```bash
curl -X POST https://TU-DOMINIO/api/vivo -F factura=@data/facturas/F-001-luz-andina.pdf
```

Respuesta 200:

```json
{
  "ok": true, "tipo": "pdf", "restantes": 4,
  "id": "V-1A2B3C4D",
  "factura": { "numero_factura": "...", "beneficiario": "...", "monto_centavos": 600000, "moneda": "PEN", "alertas": [] },
  "resultado": { "decision": "ESCALAR", "razones": [{ "regla": "EN_VIVO", "efecto": "ESCALAR" }], "version_reglas": "0.1.0", "hechos": {}, "explicacion": "..." },
  "traza": [], "modelos": [{ "pedido": "anthropic/claude-haiku-5.5", "servido": "anthropic/claude-haiku-5.5", "ok": true }],
  "ms": 4200, "costo_usd": 0.0009
}
```

`decision` es `FRENAR` o `ESCALAR`, nunca `PAGAR`. `restantes` son las lecturas que le quedan al visitante esta hora. La factura subida no entra al registro, a la cola ni a las órdenes de la demo.

| Estado | `codigo` | Cuándo |
|---|---|---|
| 400 | `FORMULARIO` | No llegó el campo `factura` |
| 413 | `MUY_GRANDE` | Más de 4 MB |
| 415 | `TIPO_NO_ADMITIDO`, `HEIC`, `VACIO`, `PDF_SIN_TEXTO` | Archivo que no se puede leer (se rechaza antes de gastar lecturas) |
| 429 | `LIMITE_VISITANTE`, `LIMITE_GLOBAL` | Más de `VIVO_POR_VISITANTE_HORA` (5) por hora, o `VIVO_GLOBAL_DIA` (150) por día |
| 500 | `INTERNO` | Fallo inesperado; no se tomó ninguna decisión |
| 503 | `APAGADA` | Falta `LECTURA_EN_VIVO=1` o la clave |

Todos los errores tienen la forma `{"ok":false,"codigo":"...","error":"..."}`. El visitante se identifica con un resumen SHA-256 de su IP (`x-forwarded-for`); nunca se guarda la IP. Duración máxima: 60 s.

---

## `GET /api/ordenes`

Todas las órdenes de pago del lote de la demo. Una orden existe solo para las facturas decididas PAGAR por las reglas o ESCALAR aprobadas por una persona; para FRENAR no hay.

```bash
curl https://TU-DOMINIO/api/ordenes
```

```json
{
  "formato": "pulso-orden-blinka/propuesto-v1",
  "aviso": "Formato propuesto para Blinka. Pulso no ejecuta pagos.",
  "n": 4,
  "ordenes": [{
    "formato": "pulso-orden-blinka/propuesto-v1", "factura_id": "F-001", "beneficiario": "LUZ ANDINA S.A.C.",
    "id_fiscal": "FIC-PE-001", "cuenta": "ACC-PE-0001", "monto_centavos": 600000, "moneda": "PEN", "monto": "6000.00",
    "referencia": "LA-0001", "concepto": "Infraestructura", "fecha_sugerida": null, "pais_beneficiario": "PE",
    "riel": { "codigo": "POR_DEFINIR", "nombre": "Por definir: lo elige una persona", "motivo": "..." },
    "origen_aprobacion": "AUTOMATICA_REGLAS", "aprobado_por": null, "decision_hash": "c177a186...",
    "version_reglas": "0.1.0", "estado": "EMITIDA", "pago": null
  }]
}
```

`estado` es `EMITIDA` o `MARCADA_PAGADA`. **El formato es una propuesta de Pulso: Blinka no publica una API**, así que los campos no son un contrato de Blinka. Error: 500 `{"ok":false,"error":"..."}`. Detalle del formato y de los rieles sugeridos: [`orden-blinka.md`](orden-blinka.md).

## `GET /api/ordenes/csv`

El mismo lote en CSV (UTF-8 con BOM, separador coma, fin de línea CRLF, todas las celdas entre comillas). Por defecto solo trae las órdenes que faltan por pagar, para que una orden ya marcada no se pague dos veces. `?incluir=pagadas` trae todas.

```bash
curl -o lote.csv https://TU-DOMINIO/api/ordenes/csv
curl -o todas.csv "https://TU-DOMINIO/api/ordenes/csv?incluir=pagadas"
```

Columnas: `factura, referencia, beneficiario, id_fiscal, pais, cuenta, moneda, monto, concepto, fecha_sugerida, riel, origen, aprobado_por, version_reglas, hash_decision, estado, referencia_banco`. Una celda que empieza con `=`, `+`, `-`, `@`, tabulador o retorno lleva un apóstrofo delante para que la hoja no la ejecute como fórmula. Cabeceras: `Content-Disposition: attachment` y `Cache-Control: no-store`. Error: 500 JSON.

## `POST /api/pagos`

Una persona avisa que ya pagó una orden por fuera (en el banco o en Blinka) y anota la referencia. **No mueve ni comprueba dinero**: solo deja constancia en un registro encadenado. Quién marca es fijo (`revisor-demo`), nunca viene del cliente.

Cuerpo: `application/json` obligatorio.

```bash
curl -X POST https://TU-DOMINIO/api/pagos \
  -H 'Content-Type: application/json' \
  -d '{"factura_id":"F-001","referencia_banco":"BNK-12345"}'
```

`referencia_banco`: texto de 1 a 64 caracteres, sin caracteres de control. Respuesta 200: `{"ok":true,"evento":{...},"orden":{...}}` con la orden ya en `MARCADA_PAGADA`.

| Estado | `codigo` | Cuándo |
|---|---|---|
| 400 | (sin código) | El cuerpo no es JSON válido |
| 400 | `REFERENCIA_INVALIDA` | Referencia vacía, de más de 64 caracteres o con caracteres de control |
| 403 | `SIN_ORDEN` | La factura no tiene orden (FRENAR, o ESCALAR sin aprobar) |
| 404 | `NO_ENCONTRADA` | La factura no existe |
| 409 | `YA_RESUELTA` | La orden ya estaba marcada |
| 415 | (sin código) | `Content-Type` distinto de `application/json` |
| 500 | (sin código) | No se pudo registrar el pago; no se aplicó |

---

## `POST /api/canal/gmail`

Lo llama el script de Apps Script del buzón del equipo (`integraciones/gmail/Codigo.gs`) con cada adjunto. Instalación: [`integraciones/gmail/README.md`](../integraciones/gmail/README.md).

**Autenticación.** `Authorization: Bearer <GMAIL_CANAL_SECRETO>`, comparado en tiempo constante. El canal está apagado (503) si el secreto tiene menos de 24 caracteres o falta `OPENROUTER_API_KEY`.

Cuerpo: `multipart/form-data` con `factura` (archivo, hasta **3 MB**, porque Vercel corta el cuerpo a 4,5 MB) y `remitente` (correo, solo para el límite; se guarda un resumen, nunca el correo).

```bash
curl -X POST https://TU-DOMINIO/api/canal/gmail \
  -H "Authorization: Bearer $GMAIL_CANAL_SECRETO" \
  -F factura=@factura.pdf -F remitente="Ana <ana@ejemplo.com>"
```

Respuesta 200: `{"ok":true,"id":"V-...","decision":"ESCALAR","texto":"..."}`. `texto` es la respuesta lista para poner en el hilo del correo.

| Estado | `codigo` | El script... |
|---|---|---|
| 400 | `FORMULARIO` | responde el `texto` y no reintenta (no hay adjunto) |
| 401 | `NO_AUTORIZADO` | reintenta y luego marca error (configuración) |
| 413 | `MUY_GRANDE` | responde el `texto` y no reintenta |
| 415 | `TIPO_NO_ADMITIDO`, `HEIC`, `VACIO`, `PDF_SIN_TEXTO` | responde el `texto` y no reintenta |
| 429 | `LIMITE_VISITANTE`, `LIMITE_GLOBAL` | responde el `texto` y no reintenta |
| 500 | `INTERNO` | reintenta |
| 502 | `LECTOR_CAIDO` | reintenta (ningún modelo respondió) |
| 503 | `APAGADO` | reintenta y luego marca error |

Límites: `GMAIL_POR_REMITENTE_HORA` (5) y `GMAIL_GLOBAL_DIA` (100). No guarda el adjunto ni la lectura y no toca el estado de la demo. Duración máxima: 60 s.

---

## `POST /api/telegram` (webhook)

Lo llama Telegram, no una persona. Código: `app/api/telegram/route.ts`, `src/telegram/webhook.ts`, `src/telegram/manejador.ts`.

**Autenticación.** Cabecera `X-Telegram-Bot-Api-Secret-Token` igual a `TELEGRAM_WEBHOOK_SECRET` (16 a 256 caracteres), comparada en tiempo constante. Sin secreto configurado, o demasiado corto, rechaza **todo**: sin secreto el endpoint queda cerrado, no abierto.

Cuerpo: un `update` de Telegram en JSON (debe traer `update_id` numérico), de hasta 1 MB. Pulso atiende mensajes (comandos, fotos y documentos) y `callback_query` (botones Aprobar o Rechazar del dueño). Responde `200 {"ok":true}` **al instante** y procesa después con `after()`.

Registro del webhook (una vez por despliegue):

```bash
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d url=https://TU-DOMINIO/api/telegram \
  -d secret_token="$TELEGRAM_WEBHOOK_SECRET" \
  -d 'allowed_updates=["message","callback_query"]'
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getWebhookInfo"
```

| Estado | Cuándo |
|---|---|
| 200 `{"ok":true}` | Aceptado; se procesa en segundo plano |
| 400 `{"ok":false}` | El cuerpo no es JSON o no trae `update_id` |
| 401 `{"ok":false}` | Cabecera ausente, distinta o secreto no configurado |
| 413 `{"ok":false}` | Cuerpo de más de 1 MB |
| 503 `{"ok":false,"error":"sin_estado"}` | Falta el token del bot o Supabase: no se procesa nada y Telegram reintenta |

Detalles que importan: los `update_id` repetidos se descartan con un INSERT atómico; límite de 5 facturas por chat por hora y `TELEGRAM_TOPE_DIARIO` (100) por día, contados en Supabase; archivos de hasta 4 MB (PDF, JPG, PNG); solo el dueño de cada empresa aprueba lo ESCALADO. Para depurar sin webhook: `npx vite-node scripts/telegram-local.ts` (long polling con un bot de desarrollo).

---

## Servidor MCP (stdio)

Expone el lector y el motor como herramientas para Claude Code, Claude Desktop o cualquier cliente MCP. Código: `mcp/servidor.ts` (protocolo) y `mcp/herramientas.ts` (lógica, probada en `tests/mcp.test.ts`). SDK oficial `@modelcontextprotocol/sdk` fijado en 1.32.1.

### Herramientas

| Herramienta | Entrada | Necesita clave | Qué hace |
|---|---|---|---|
| `leer_y_decidir_factura` | `ruta` (archivo local) **o** `base64` | `OPENROUTER_API_KEY` | Doble lectura con dos modelos y motor. Nunca PAGAR. Cuesta centavos por factura |
| `decidir_factura_estructurada` | JSON de la factura ya extraída (`monto_centavos` entero) | no | Solo el motor, sin red, con el contexto de la demo y el mismo techo |
| `listar_facturas_demo` | ninguna | no | Las 18 facturas de la demo con decisión y resumen del lote |
| `ver_decision` | `id` (por ejemplo `F-009`) | no | Razones en frases, hechos, traza regla por regla y hash del registro |
| `orden_para_blinka` | `id` | no | Orden de pago de una factura de la demo. Formato propuesto: Blinka no publica API |

Ninguna herramienta aprueba, paga ni marca pagos. `orden_para_blinka` devuelve `orden: null` y el motivo cuando la factura no tiene orden. Los errores llegan como resultado con `isError: true` y `{"codigo","error"}`; sin clave, `leer_y_decidir_factura` responde `SIN_CLAVE` con instrucciones. Las entradas se validan a mano (campos desconocidos se rechazan). `leer_y_decidir_factura` solo envía a los modelos archivos cuya firma de bytes sea PDF con texto, JPG o PNG de hasta 4 MB; un archivo local de otro tipo no sale de tu máquina.

### Conectarlo a Claude Code

Desde la raíz del repo (ya con `npm ci`):

```bash
claude mcp add pulso -- npx vite-node mcp/servidor.ts
claude mcp list          # pulso debe aparecer conectado
```

Para leer facturas reales agrega la clave: `claude mcp add pulso -e OPENROUTER_API_KEY=sk-or-... -- npx vite-node mcp/servidor.ts`, o ponla en `.env.local` en la raíz (el servidor la lee solo). Con la clave, fija antes un límite de crédito en OpenRouter.

- **Ejecuta el comando desde la raíz del repo**: la ruta `mcp/servidor.ts` y `.env.local` son relativas al directorio de trabajo.
- **No uses `npm run mcp` a secas** como comando del servidor: npm imprime un encabezado en stdout y rompe el protocolo. Si quieres el script, `npm run --silent mcp`.
- En Windows nativo, si Claude Code no encuentra `npx`, usa `claude mcp add pulso -- cmd /c npx vite-node mcp/servidor.ts`.
- Claude Desktop: en `claude_desktop_config.json`, `"pulso": {"command": "npx", "args": ["vite-node", "mcp/servidor.ts"], "cwd": "<ruta al repo>"}`. No se probó en Claude Desktop.

### Probarlo a mano

Con el servidor arrancado, esto es lo que se verificó (mensajes JSON-RPC de una línea por stdin):

```bash
printf '%s\n' \
 '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"sonda","version":"0"}}}' \
 '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
 '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' \
 '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"listar_facturas_demo","arguments":{}}}' \
 | npx vite-node mcp/servidor.ts
```

`initialize` responde `serverInfo` `pulso` 0.1.0, `tools/list` devuelve las cinco herramientas y `listar_facturas_demo` trae `total: 18`, `decididas_sin_persona: 8` y `pct_sin_persona: 44.4`. Esa cifra es una medida sobre las facturas de desarrollo con las que se afinaron las reglas, no mide generalización. El servidor escribe su aviso de arranque en stderr; stdout es solo protocolo.
