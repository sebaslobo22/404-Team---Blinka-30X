# Diseño bottom-up: del diagrama de flujo a la interfaz

**Emitido:** 17/10/2026 - 3:42 p.m. (Caracas, Venezuela).
**Punto de partida:** el diagrama de flujo del README (FigJam: https://www.figma.com/board/Z35gyUNofAP7wy2AWshTI6).
**Para quién:** Carmen (70 años, miopía severa) y Mateo (12 años, puesto de limonada). Ver `docs/METAPROMPT-DISENO-V2.md` §1b.

## La regla del enfoque

Se diseña **de abajo hacia arriba**, en cinco niveles, y cada nivel solo usa piezas del nivel anterior:

| Nivel | Qué es | Sale de |
|---|---|---|
| 0 · Estados | Los 4 estados que puede tener cualquier cosa: **Cumple**, **Te necesita**, **Frenada**, **No aplica** | Los rombos del diagrama (sí / no) |
| 1 · Átomos | Pastilla de estado, icono, cifra, frase de motivo, botón | Cada estado + su texto |
| 2 · Moléculas | **Razón** (una línea por rombo), **Veredicto** (la frase de la decisión) | Cada rombo y cada óvalo de decisión |
| 3 · Organismos | **Lista de razones**, **Evidencia**, **Tarjeta de decisión con acciones**, **Carril** | Cada hito del diagrama |
| 4 · Pantallas | Una pregunta por pantalla | Recorridos del diagrama de izquierda a derecha |

**Dos pruebas de trazabilidad (obligatorias antes de fusionar cualquier cambio de interfaz):**
1. **Nada sin origen:** todo elemento visible nace de una caja del diagrama. Si no tiene caja, sobra.
2. **Nada sin cara:** toda caja del diagrama que afecte una decisión tiene su Razón con texto para "cumple" y para "no cumple". Si no la tiene, la explicabilidad está rota. Esto se puede automatizar: una prueba que recorra los códigos de `src/engine/comprobaciones.ts` y falle si alguno no tiene texto en la tabla de razones de la interfaz.

## Nivel 0 · Estados (únicos en todo el sitio)

| Estado | Palabra visible | Icono | Color | Cuándo |
|---|---|---|---|---|
| Cumple | "Cumple" | ✓ en círculo | verde | El rombo respondió bien |
| Te necesita | "Te necesita" | campana | ámbar | El rombo falló y la regla escala |
| Frenada | "Frenada" | mano de alto | rojo | El rombo falló y la regla frena |
| No aplica | "No se revisó" | guion | gris | No se pudo evaluar porque falló algo antes |

El color nunca va solo: siempre icono + palabra. Los códigos técnicos (R1, INYECCION…) solo aparecen en la Evidencia.

## Nivel 2 · Una Razón por cada rombo del diagrama

Texto en lectura fácil (≤ 15 palabras por frase). `{…}` son datos que calcula el motor; nunca los inventa la IA.

| Hito | Caja del diagrama | Código | Si cumple | Si no cumple | Estado si falla |
|---|---|---|---|---|---|
| 2 | ¿Las dos lecturas coinciden? | EXTRACCION (`lecturas_difieren`) | "Dos lectores revisaron la factura y leyeron lo mismo." | "Los dos lectores no leyeron lo mismo en {campo}. Revísalo tú." | Te necesita |
| 2 | Error del modelo | EXTRACCION (`lector_fallo`) | — | "No pudimos leer la factura. Puedes revisarla tú." | Te necesita |
| 3 | ¿Cada dato aparece tal cual? | EXTRACCION | "Cada dato está escrito en la factura." | "{campo} no aparece en la factura tal como lo leímos." | Te necesita |
| 3 | ¿Trae texto que da órdenes? | INYECCION | "La factura no intenta dar órdenes." | "La factura trae un texto que intenta darnos órdenes. No lo obedecimos." | Te necesita |
| 3 | ¿Confianza ≥ 85 %? | CONFIANZA | "La factura se leyó con claridad." | "La factura no se lee bien. Puede estar borrosa." | Te necesita |
| 3 | ¿Moneda escrita y datos completos? | R7 | "Están todos los datos: quién, cuánto, moneda y fecha." | "Falta {campo}. Sin ese dato no podemos pagar." | Te necesita |
| 3 | ¿Es un cobro? | EXTRACCION (`no_es_cobro`) | "Es una factura de cobro." | "Esto parece una {tipo}, no una factura para pagar." | Te necesita |
| 3 | ¿Las líneas suman el total? | EXTRACCION (`aritmetica_no_cuadra`) | "Las cuentas de la factura cuadran." | "Las cuentas no cuadran: {detalle}." | Te necesita |
| 4 | R2 · ¿Proveedor y cuenta autorizados? | R2 | "{proveedor} está en tu lista de proveedores." | "{proveedor} no está en tu lista, o su cuenta no es la registrada." | Frenada |
| 4 | ¿El nombre coincide? | REGISTRO | "El nombre coincide con tu registro." | "El nombre de la factura no es igual al de tu registro." | Te necesita |
| 4 | R8 · ¿Cuenta cambiada hace ≤ 72 h? | R8 | "La cuenta del proveedor no ha cambiado." | "{proveedor} cambió su cuenta hace {horas} horas. Confírmalo antes de pagar." | Te necesita |
| 4 | R5 · ¿Cobro repetido? | R5 | "No es un cobro repetido." | "{proveedor} ya cobró esta factura el {fecha}." | Frenada |
| 4 | R6 · ¿Cuadra con lo acordado? | R6 | "Cobra lo acordado: {monto}." | "Cobra {monto}, pero acordaron {acordado}. Hay {diferencia} de más." | Te necesita |
| 4 | R1 · ¿Supera el límite por pago? | R1 | "Está dentro de tu límite de {límite} por pago." | "Pide {monto}. Tu límite sin preguntarte es {límite}." | Te necesita |
| 4 | R3 · ¿Supera el tope mensual? | R3 | "Este mes a {proveedor} le quedan {restante}." | "Con este pago, {proveedor} pasaría su tope de {tope} este mes." | Te necesita |
| 4 | R4 · ¿Alcanza el presupuesto? | R4 | "Hay presupuesto de {categoría}: quedan {restante}." | "No queda presupuesto de {categoría} este mes." | Frenada |
| — | Error interno | ESQUEMA | — | "Algo falló de nuestro lado. Por seguridad no pagamos." | Te necesita |

## Nivel 2 · El Veredicto (un óvalo de decisión = una frase)

| Decisión | Frase (plantilla) | Botones |
|---|---|---|
| PAGAR | "Pagamos {monto} a {proveedor}. Cumple todas tus reglas." | Ninguno (solo "¿Por qué?") |
| FRENAR | "Frenamos esta factura: {razón más grave en una frase}." | Ninguno para aprobar; "¿Por qué?" |
| ESCALAR | "Te necesitamos: {razón más grave en una frase}." | **Aprobar** · **Rechazar** (mismo peso visual cuando hay riesgo) · "¿Por qué?" |

## Nivel 3 · Organismos (uno por hito del diagrama)

| Hito | Organismo | Qué muestra |
|---|---|---|
| 1 · Entrada | **Tarjeta de documento** | Tipo de archivo con icono (PDF, foto, correo, chat), nombre del proveedor, fecha de llegada |
| 2 + 3 · Lectura y validación | **Lista de razones · "Cómo leímos la factura"** | Las razones del hito 2 y 3, primero las que fallaron |
| 4 · Reglas | **Lista de razones · "Tus reglas"** | Las razones del hito 4, primero las que fallaron |
| 5 · Decisión | **Veredicto** | La frase de la decisión, grande, con su estado |
| 6 · Persona | **Tarjeta de acción** | Lo que el sistema preparó (diferencia, factura anterior, cuenta previa), la recomendación en una frase, Aprobar/Rechazar con nota y "Deshacer" |
| 7 · Salidas | **Evidencia** (plegada) | Instrucción de pago, versión de reglas, registro y huella; códigos técnicos con su traducción |

## Nivel 4 · Pantallas (recorridos del diagrama)

| Pantalla | Pregunta | Recorrido del diagrama que muestra | Organismos |
|---|---|---|---|
| `/` | ¿Qué pasó con mis facturas? | Hito 5 de todas las facturas | Veredictos en tres carriles: Te necesita (primero), Frenadas, Pagadas |
| `/facturas/[id]` | ¿Por qué decidimos esto? | Hitos 1 → 7 de una factura, en orden | Veredicto · Razones "Cómo leímos" · Razones "Tus reglas" · Tarjeta de acción (si te necesita) · Evidencia plegada |
| `/cola` | ¿Qué necesita mi aprobación? | Hito 6 | Tarjetas de acción, de la más urgente a la menos |
| `/reglas` | ¿Cuáles son mis reglas? | Los rombos del hito 4, como frases editables | "Pídeme permiso para todo pago mayor a [USD 5.000]" |
| `/registro` | ¿Qué quedó registrado? | Hito 7 | Línea de tiempo + sello "Registro íntegro" |

## Cómo se usa este documento ahora

1. **Revisión de la entrega de Codex (rediseño V2):** antes de fusionar, recorrer la tabla de razones contra `/facturas/F-006`, `/facturas/F-011`, `/facturas/F-016` y `/facturas/F-017` y marcar qué textos faltan o usan jerga.
2. **Tour de 4 pasos** (`docs/recorrido-evidencia.md`): cada paso enfoca un organismo de esta tabla (Veredicto, Razones, Tarjeta de acción).
3. **Prueba automática "nada sin cara"**: la agrega quien implemente la tabla de razones en la interfaz.
4. **Cuando cambie el diagrama** (regla nueva, entrada nueva), se agrega primero aquí su fila y después la interfaz.
