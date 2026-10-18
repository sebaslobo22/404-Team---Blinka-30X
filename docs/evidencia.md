# Pulso: lo que medimos y lo que no

Volver al [README](../README.md). Qué es Pulso: [`producto.md`](producto.md).

Cada cifra dice sobre qué se midió. Ninguna prueba que Pulso funcione con facturas de una empresa real.

| Qué | Resultado | Cómo leerlo |
|---|---|---|
| **Set de desarrollo** (18 facturas ficticias de Aurora Cloud, 6 países, 5 monedas, PDF, imagen, correo y chat, llenas de trampas a propósito) | 4 PAGAR, 4 FRENAR, 10 ESCALAR. 8 de 18 sin persona (44,4 %). Ninguna trampa quedó aprobada para pago. Las 18 decisiones coinciden con lo esperado. | Lo diseñamos nosotros y las lecturas y los prompts se afinaron sobre esas mismas facturas: **no mide generalización**. |
| **Set externo** (80 escenarios escritos por Jofre, que no escribió el motor ni las reglas) | Sobre las 62 filas que puntúan: **0 pagos indebidos**, no pagar donde se esperaba no pagar **44 de 44**, coincidencia exacta **38 de 62** (61,3 %). El motor activó la defensa de instrucciones ocultas en 3 de 3 filas con inyección. | **No es un set ciego:** lo vimos antes de correrlo. Se corrió **una sola vez** con el protocolo congelado en un commit antes de correr ([`set-externo.md`](set-externo.md), resultado en [`set-externo-resultados.md`](set-externo-resultados.md)). Mide el motor sobre datos estructurados, no el lector. Las 24 diferencias son de dos clases de política declaradas de antemano. |
| **Set ciego** (10 documentos nuevos: PDF, imagen, correo y chat, uno en portugués y una orden oculta en alemán) | **0 pagos indebidos.** Coincidencia con la etiqueta congelada: **6 de 9** (sin el caso ambiguo). De las 3 diferencias, 2 son etiquetas mal hechas (el motor frenó por presupuesto de Diseño, que la etiqueta no consideró) y 1 es un escalado seguro: un acento mal decodificado en un PDF hizo que los dos modelos leyeran distinto el nombre. Costó USD 0,02. | Lo escribió un **agente aislado** que no vio el motor, el lector, las pruebas ni las facturas de desarrollo, y se congeló con hash antes de correrlo. Pasa por **lector + motor**, en vivo, una sola vez. Son 10 casos y el autor conoce las mismas reglas: es evidencia, no prueba de generalización ([`set-ciego.md`](set-ciego.md), resultado en [`set-ciego-resultados.md`](set-ciego-resultados.md)). |
| **Set ciego 2** (30 documentos con una mezcla realista que elegimos nosotros: 63 % rutinarias y pagables; PDF, imagen, correo y chat) | **0 pagos indebidos.** **25 de 30 decididas sin persona (83,3 %)**, 27 de 28 coincidencias sin los ambiguos, 0 lecturas fallidas. Costó USD 0,048. | Lo armó un agente que no vio el motor y se congeló con hash antes de correr. Hubo dos corridas: la primera dio 60,0 % porque el lector no leía PDF sin comprimir; se corrigió el lector sin tocar las etiquetas. Con otra mezcla el porcentaje cambia; los 0 pagos indebidos se repitieron en las dos ([`set-ciego2.md`](set-ciego2.md), resultado en [`set-ciego2-resultados.md`](set-ciego2-resultados.md)). |
| **Lector de facturas** (banco de modelos, 18 facturas) | Gemini 3.1 Flash-Lite 161 de 161 campos; Claude Haiku 5.5 159 de 161. Leer las 18 costó unos USD 0,02. | Medido sobre las mismas facturas con las que se afinó el prompt. Detalle en [`banco-modelos-2026-10-17.md`](banco-modelos-2026-10-17.md). |
| **Pruebas automáticas** | 719 pruebas, incluidas propiedades contra un oráculo independiente (el motor decide PAGAR si y solo si el oráculo lo permite), determinismo y detección de alteraciones del registro. | Se verificó además rompiendo el código a propósito: los tests detectaron cada cambio. |

**Lo que NO medimos**
- Generalización con facturas reales de terceros. Los sets ciegos (10 y 30 casos) los escribieron agentes que conocen las reglas; el set externo lo escribió un compañero, pero lo vimos antes de correrlo.
- El lector sobre el set externo (no hay documentos de ese set) ni con facturas reales de terceros.
- Rendimiento bajo carga ni disponibilidad. No hay un monitor real de esas métricas.
- Accesibilidad con un lector de pantalla real ni con zoom al 200 %.
- Las tasas de cambio son **fijas e inventadas** para la demo; no son cotizaciones.

## Set de desarrollo (F-001 a F-018)

`data/dev-set.json` y `data/dev-set-defensas.json` traen el contexto de la empresa ficticia Aurora Cloud (beneficiarios, acuerdos, presupuestos, tasas) y la decisión esperada de cada factura; `tests/dataset.test.ts` las corre en orden contra el motor: 4 PAGAR, 4 FRENAR y 10 ESCALAR, con las reglas esperadas en cada caso. Los beneficiarios, acuerdos, presupuestos y tasas salen de la hoja del equipo. Los números de factura, las fechas, la fecha de alta de la cuenta de F-011 y el pago previo de nómina de F-013 los fijamos nosotros para poder ejecutar el caso.

Este set lo diseñamos nosotros: pasarlo no prueba que el agente generalice. Para eso hay un set externo, escrito por un compañero que no escribió las reglas, y un set ciego de 10 documentos congelado antes de correr (ver "Lo que medimos y lo que no").
