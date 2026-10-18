# Orden de pago lista para Blinka (formato propuesto)

**Blinka no publica una API.** Lo que sigue es un formato que proponemos nosotros para que la orden de
Pulso se pueda usar: pagarla a mano en el banco, o cargarla en lote cuando Blinka diga cómo recibirla.
No es un contrato de Blinka. **Pulso no ejecuta pagos.**

## Cuándo hay orden

Solo hay orden cuando las reglas dicen PAGAR, o cuando una persona aprueba una factura ESCALAR. Una
factura FRENAR, o una ESCALAR sin aprobar o rechazada, no tiene orden (`src/demo/estado.ts`,
`instruccionPago()`).

## Campos (`src/demo/orden.ts`, `construirOrden()`, función pura)

| Campo | De dónde sale |
|---|---|
| `factura_id`, `beneficiario`, `id_fiscal`, `cuenta`, `monto_centavos`, `moneda` | La instrucción de pago actual |
| `monto` | `monto_centavos` en unidades con 2 decimales, como texto (sin flotantes) |
| `referencia` | Número de la factura |
| `concepto` | Tipo de gasto (categoría) |
| `fecha_sugerida` | Vencimiento leído si los dos modelos coinciden; si no, `null` |
| `pais_beneficiario` | Prefijo del ID fiscal ficticio (`FIC-PE-` → `PE`) |
| `riel` | Riel sugerido (tabla de abajo) |
| `version_reglas`, `decision_hash` | Versión de reglas y huella de la decisión en el registro |
| `origen_aprobacion`, `aprobado_por` | `AUTOMATICA_REGLAS` o `PERSONA`, y quién aprobó |
| `estado` | `EMITIDA` o `MARCADA_PAGADA` |
| `pago` | Referencia del banco, quién marcó y cuándo; `null` mientras está emitida |

## Riel sugerido

Solo rieles que Blinka dice tener. Ante la duda, lo elige una persona.

| Moneda | Beneficiario | Riel |
|---|---|---|
| COP | Colombia | Bre-B |
| MXN | México | SPEI |
| BRL | Brasil | Pix |
| ARS | Argentina | CBU/CVU |
| EUR | zona SEPA (UE, EEE, Suiza, Reino Unido y microestados) | SEPA |
| USD | Estados Unidos | ACH |
| USD | otro país conocido | Wire internacional (SWIFT) |
| Cualquier otro caso | | Por definir: lo elige una persona |

Decisión nuestra: los rieles de un solo país (Bre-B, SPEI, Pix, CBU/CVU) solo se sugieren si el
beneficiario está en ese país; un pago en COP a un proveedor de Perú queda por definir. EUR fuera de la
zona SEPA, o sin país, queda por definir. USD a un país fuera de EE. UU. sale como wire internacional
aunque ese país use dólares (Ecuador): desde una cuenta en EE. UU. es un pago transfronterizo. La pantalla
pide confirmar el riel antes de pagar. PEN queda por
definir: Blinka tiene ruta en Perú pero no la detalla. USD sin país conocido también queda por definir.

En el set de desarrollo: F-001 (PEN, Perú) por definir, F-002 y F-008 (COP, Colombia) Bre-B,
F-003, F-005 y las demás en USD (Venezuela, Ecuador) SWIFT, F-004 (BRL) Pix, F-010 (MXN) SPEI aunque
está frenada y no tiene orden.

## Marcar como pagada (cierra la conciliación)

`POST /api/pagos` con `{ "factura_id": "F-001", "referencia_banco": "TRX-123" }`. La referencia es texto
no vacío de hasta 64 caracteres, y el cuerpo va como `application/json` (si no, 415). Respuestas: 200 si
se marcó; 403 `SIN_ORDEN` si la factura no tiene orden; 409 `YA_RESUELTA` si ya estaba marcada; 400
`REFERENCIA_INVALIDA`; 404 `NO_ENCONTRADA`. Las marcas quedan en un registro encadenado aparte del de
decisiones (`registroPagos`). La hora de la marca es el reloj fijo de la demo. Pulso no comprueba la referencia con el banco.
"Volver al inicio de la demo" borra las marcas.

## Lote

- `GET /api/ordenes`: todas las órdenes en JSON.
- `GET /api/ordenes/csv`: el lote **por pagar** en CSV (UTF-8 con BOM, coma, CRLF), una fila por orden
  emitida. Las ya marcadas como pagadas no salen, para que un importador no las pague dos veces.
  `?incluir=pagadas` trae todas, con la columna `estado`.
- Toda celda va entre comillas (un `;` o un tabulador dentro del texto no parte la celda en una hoja
  configurada en español), y las que empiezan como fórmula (`=`, `+`, `-`, `@`) se neutralizan con un
  apóstrofo, porque los datos vienen de facturas no confiables.

Las órdenes simuladas del bot de Telegram no entran a este lote: no viven en el estado de la demo.
