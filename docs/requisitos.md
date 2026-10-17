# Requisitos del reto → dónde se cumplen → cómo se prueba

**Actualizado:** 17/10/2026 - 3:08 p.m. (Caracas, Venezuela). Fuente: texto oficial en `docs/brief-blinka.md`.
Regla de uso: toda función nueva debe servir a una fila de esta tabla. Si no sirve a ninguna, o cae en "No entra", se recorta.

## 1. Criterios de éxito (lo que decide la nota)

| Criterio | Dónde se cumple | Cómo se prueba | Estado |
|---|---|---|---|
| **Seguridad:** cero pagos fuera de reglas (uno descalifica) | `src/engine` decide (función pura); la IA solo lee; falla cerrada → ESCALAR | `npm test`: propiedades con oráculo independiente; "ninguna trampa termina en PAGAR" en `tests/dataset.test.ts` y `tests/extraccion.test.ts` (18/18 con lecturas reales) | ✅ |
| **Autonomía:** % decidido bien sin persona | PAGAR y FRENAR son autónomos; solo ESCALAR pide persona | `/` muestra la tasa (8/18 = 44,4 %) y "18 de 18 coinciden con la decisión esperada" | ✅ en nuestro set · ⏳ set ciego (Joffre) |
| **Explicabilidad:** se entiende sin abrir el código | Explicación en lenguaje humano por factura + comprobaciones ✓/✕ + texto fuente marcado | `/facturas/[id]` (p. ej. F-016) | ✅ |

## 2. Entregable

| Exigencia | Dónde | Estado |
|---|---|---|
| Agente funcionando **sobre su set de facturas** | Lector (`src/extraccion`, 18 documentos reales en `data/facturas/`) + motor | ⚠️ **El producto aún muestra las extracciones simuladas del dev-set, no las 18 lecturas reales del lector.** Tarea: integrar lector → motor → registro → pantalla (Andrés) |
| Pantalla donde la empresa **define sus reglas** | `/reglas` | ✅ límite por pago, tope mensual por beneficiario, tolerancia, ventanas · ⚠️ **falta editar la lista de beneficiarios permitidos** |
| Ve qué **pagó**, qué **frenó**, qué quedó **pendiente** y **por qué** | `/` (resumen y lista), `/cola` (pendientes), `/facturas/[id]` (porqué) | ✅ |

## 3. Qué entra

| Exigencia | Dónde | Estado |
|---|---|---|
| Extraer **a quién** | beneficiario, ID fiscal y cuenta (`src/extraccion`) | ✅ |
| Extraer **cuánto** y **en qué moneda** | monto → centavos con BigInt; moneda ISO; moneda ambigua → alerta | ✅ |
| Extraer **para cuándo** | `fecha_vencimiento` en el esquema y en las lecturas | ⚠️ **Se extrae pero no llega al motor ni se muestra en pantalla ni en el registro** |
| Límite **por pago** | R1 (`/reglas`: límite por pago) | ✅ |
| Límite **por periodo** | R3 tope mensual por beneficiario; R4 presupuesto por categoría | ✅ (R4 no editable en pantalla) |
| **Beneficiarios permitidos** | R2 por ID fiscal + cuenta exactos | ✅ regla · ⚠️ lista no editable en pantalla |
| **Aprobación humana sobre cierto monto** | R1 → ESCALAR a `/cola` | ✅ |
| **Registro** de cada decisión y su porqué | `src/ledger` (hash encadenado), `/registro` con verificación; tabla solo de insertar en Supabase | ✅ (el producto en demo guarda en memoria) |

## 4. Qué no entra (no construir)

Mover dinero · abrir cuentas · verificar identidad (KYC) · decisiones de cumplimiento o fraude · diseñar la app de Blinka.
Nuestro sistema solo emite una **instrucción de pago**; la regla de cuenta cambiada (R8) es una política de pago configurable, no una decisión de fraude.

## 5. Restricciones

| Restricción | Cómo se cumple | Estado |
|---|---|---|
| Ningún dato real | Empresa ficticia Aurora Cloud; proveedores, cuentas e IDs inventados | ✅ |
| Nunca aprobar fuera de reglas sin humano | FRENAR no tiene botón de aprobar; ESCALAR exige persona con nota | ✅ |
| Cada decisión explicable después | Registro con explicación, versión de reglas, comprobaciones y hash | ✅ |

## 6. Casos trampa mínimos del brief → set de Aurora

| Caso del brief | Factura | Regla | Decisión |
|---|---|---|---|
| Cobro duplicado | F-006, F-015 | R5 | FRENAR |
| Beneficiario nuevo fuera de la lista | F-007, F-015 | R2 | FRENAR |
| No cuadra con lo acordado | F-008, F-013 | R6 | ESCALAR |
| Supera el límite (aprobación humana) | F-005, F-009 | R1 | ESCALAR |
| Presupuesto insuficiente del periodo | F-010 | R4 | FRENAR |
| Extras propios | F-011 cuenta cambiada (R8) · F-012/F-014 datos ilegibles (R7) · F-016 instrucción oculta · F-017 lectura poco confiable · F-018 nombre distinto | — | ESCALAR |

## 7. Huecos abiertos, por prioridad

1. **Integrar el lector en el producto** (sin esto no hay "agente funcionando sobre su set"). Dueño: Andrés.
2. **"Para cuándo" visible**: llevar `fecha_vencimiento` de la lectura a la pantalla de la factura, a la explicación y al registro. Dueño: Andrés (motor/pantalla) con Sebastián (lector).
3. **Editar beneficiarios permitidos** en `/reglas` (alta/baja con ID fiscal y cuenta; cada cambio versionado). Dueño: Andrés.
4. **Set ciego** congelado y su resultado x/n en el README. Dueño: Joffre.
