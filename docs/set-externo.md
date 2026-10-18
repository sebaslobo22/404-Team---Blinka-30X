# Set externo de Joffre: protocolo de conversión y de medición (pre-registro)

**Escrito antes de correr nada.** Este documento, el CSV, el convertidor, el corredor y el JSON convertido se congelan con un commit y sus hashes (`data/externo/CONGELADO.json`) **antes** de que el motor toque una sola fila. El corredor se niega a ejecutarse si algún hash no coincide o si ya existe una corrida.

## Qué es y qué no es

- **Es** un set de 80 facturas ficticias ("NovaBridge Holdings LLC") escrito por **Joffre**, un integrante del equipo que **no escribió el motor ni las reglas**. Cada fila trae su decisión esperada, la regla y el motivo según la política de su archivo.
- **No es un set ciego.** Lo vimos antes de correrlo (Andrés y el agente lo leyó para definir esta conversión). El nombre honesto es: **set externo, escrito por un compañero, visto antes de correr.**
- **Mide el motor de reglas** sobre datos estructurados. **No** pasa por el lector de documentos (no hay PDF ni imagen) ni por los dos modelos.
- La fuente es `data/externo/fuente-joffre.csv` (las 80 filas tal cual, con crédito a Joffre). No se sube el Excel original porque su resumen dice ">50M al mes, 25 países, 12 monedas" y la suma real de la columna USD es unos 7,1 millones, hay 27 países y 11 monedas, y 70 de las 80 filas están en USD. **Esas cifras no se usan en ningún lado.**

## Conversión (mecánica, igual para las 80 filas)

Cada fila se convierte con las mismas reglas, sin mirar qué diría el motor:

| Campo del motor | Se toma de |
|---|---|
| `numero_factura` | columna `ID` |
| `beneficiario` | `Proveedor` (`—` o vacío pasa a null) |
| `id_fiscal` | no existe en el archivo: se **deriva** como `EXT-` más el proveedor en mayúsculas y solo letras y números |
| `cuenta` | `Cuenta Bancaria` sin la anotación entre paréntesis (por ejemplo "(NUEVA, 3 días)"); `—` o vacío pasa a null |
| `monto_centavos` | `Monto` × 100, entero |
| `moneda` | `Moneda` |
| `fecha_emision` | `Fecha Emisión` |
| `categoria` | `Categoría` tal cual |
| `texto_fuente` | `Servicio / Descripción` (así el detector de instrucciones ocultas lee las palabras de Joffre) |
| `confianza`, `alertas` | no se envían (no hay lector) |

**Contexto de la empresa**, construido solo con lo que dice el archivo:

1. **Beneficiario registrado = aparece en alguna fila cuya decisión esperada es PAGAR.** Su cuenta registrada es la de esa fila, con alta antigua (2026-01-01). Cualquier otro proveedor o cuenta distinta **no está registrado**.
2. **Acuerdo = el monto de esa fila PAGAR**, en su moneda y categoría, con la tolerancia por defecto de 2 %.
3. **Reglas de la empresa tomadas del propio archivo:** límite por pago **USD 25.000** (su R1); cuenta cambiada en menos de **7 días** (su R8); **VES y CUP prohibidas** (su lista de monedas prohibidas), por lo que se quita VES de las monedas permitidas; ventana de duplicados de 30 días (por defecto).
4. **Lo que el archivo no define queda sin efecto:** tope mensual por beneficiario y presupuestos por categoría se fijan en un valor tan alto que nunca se activan (USD mil millones). **R3 y R4 no se ejercitan en este set.**
5. **Monedas sin tasa en nuestra tabla** (ARS, CLP, JPY, EUR, GBP, CUP): no se inventan tasas. El motor las escala por moneda no permitida. Las monedas con tasa (USD, COP, PEN, BRL, MXN) usan nuestras tasas fijas de demo, que pueden diferir de la columna "≈ USD" del archivo.
6. **Orden:** las filas se procesan en el orden del archivo; cada PAGAR del motor entra al historial (así los duplicados se detectan contra lo pagado).
7. **Fecha de decisión:** el día de emisión más reciente del archivo, a las 12:00 UTC.

### Filas excluidas del puntaje (criterios, no a mano)

Se procesan igual (para no alterar el historial) pero **no puntúan**, porque piden algo que Pulso no hace o que el archivo no puede probar:

- **Regla R3, R4 o R9 en la columna `Regla`:** R3 (urgencia sin contrato) no existe en Pulso; R4 (presupuesto) no tiene datos de presupuesto en el archivo; R9 (país de riesgo) es una decisión de cumplimiento, que el reto excluye.
- **Cumplimiento o fraude en el escenario o el motivo** (palabras: OFAC, lavado, phishing, lista negra, sanción, homoglífico): el reto excluye las decisiones de cumplimiento y de fraude. **No decimos que Pulso detecte sanciones, lavado ni phishing.**
- **E-062** (exactamente USD 25.000): el archivo se contradice (su R1 dice "auto-aprobar hasta 25K" y esta fila está marcada ESCALAR). Se excluye y se reporta aparte lo que hizo el motor.

La lista exacta de IDs que sale de aplicar estos criterios queda en `data/externo/set-externo.json`.

## Qué se mide (tres números, sobre las filas que puntúan)

- **(a) Pagos indebidos:** filas donde el archivo espera no pagar (FRENAR o ESCALAR) y el motor devuelve PAGAR. **Debe ser 0.** Es el único número que descalificaría.
- **(b) No pagar donde se esperaba no pagar:** filas donde el archivo espera FRENAR o ESCALAR y el motor devuelve FRENAR o ESCALAR, sobre el total de esas filas.
- **(c) Coincidencia exacta:** la decisión del motor es igual a la esperada, sobre todas las filas que puntúan.

Además, se reportan aparte, sin mezclar:
- **Autonomía perdida:** el archivo espera PAGAR y el motor no paga.
- **Diferencias de política:** el archivo dice FRENAR y el motor ESCALAR, o al revés. No cuentan como error en (b) pero sí restan en (c).
- **Instrucciones ocultas:** cuántas de las filas con inyección en el archivo activan la razón INYECCION en el motor.

## Límites que se dicen de antemano

1. **Las 18 filas PAGAR pasan por construcción:** el registro y los acuerdos salen de ellas mismas. **Eso no es evidencia de nada.** Lo que informa son las otras filas.
2. **(c) se verá castigado por la regla de registro:** los proveedores grandes que solo aparecen en filas ESCALAR no están registrados, así que el motor los frena (R2) donde el archivo los escala (R1). Eso es una diferencia de política declarada, no un error del motor.
3. **No se mide el lector, ni los dos modelos, ni documentos reales.** Solo el motor de reglas.
4. **Una sola corrida.** Se reporta tal cual. Si sale un pago indebido (a), se reporta la corrida 1, se corrige el motor y se muestra "antes y después" con los dos hashes. No se corrige en silencio.
5. **Esto no prueba generalización:** es un set escrito por un compañero, visto antes de correr, con un contexto que construimos nosotros con reglas explícitas.

## Cómo se congela

1. `npx vite-node scripts/externo-convertir.ts` genera `data/externo/set-externo.json` desde el CSV (no usa el motor).
2. `npx vite-node scripts/externo-congelar.ts` guarda los SHA-256 de este protocolo, el CSV, el convertidor, el puntaje, el corredor y el JSON convertido en `data/externo/CONGELADO.json`.
3. Se hace commit y push. **El hash de ese commit es la prueba de que todo se fijó antes de correr.**
4. `npx vite-node scripts/externo-correr.ts` verifica los hashes y corre una sola vez. Escribe `data/externo/resultados-corrida-1.json` y `docs/set-externo-resultados.md`.
