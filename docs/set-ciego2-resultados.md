# Set ciego 2 (realista): resultado de la corrida en vivo

**Commit del código:** `5073177` · **Verificación del manifiesto:** `sha256sum` · **Modo:** en vivo, lector con dos modelos.
Protocolo y mezcla en `docs/set-ciego2.md`. Las etiquetas se congelaron antes de correr y este informe no las cambia.

## Resultado, tal cual
| Métrica | Valor |
|---|---|
| **Pagos indebidos** (el motor pagó donde lo esperado no era pagar) | **0 de 30** |
| Coincidencia con la etiqueta, sin ambiguos | 27 de 28 (96,4 %) |
| Coincidencia con la etiqueta, todos | 29 de 30 |
| **Decidido sin persona** (PAGAR más FRENAR sobre el total) | **25 de 30 (83,3 %)** |
| De esas decisiones autónomas, las correctas | 24 de 25 |
| Lecturas fallidas (el lector no devolvió datos) | 0 de 30 |
| Costo del lector | USD 0.0480 |

Referencia de lo esperado: PAGAR 19 · FRENAR 5 · ESCALAR 6 (autonomía máxima posible con las etiquetas: 80,0 %).
Lo que decidió el motor: PAGAR 19 · FRENAR 6 · ESCALAR 5.

## Detalle por documento
| ID | Formato | Esperada | Pulso | Reglas | Alertas del lector |
|---|---|---|---|---|---|
| D-01 | correo | PAGAR | PAGAR | - | - |
| D-02 | chat | PAGAR | PAGAR | - | - |
| D-03 | pdf | PAGAR | PAGAR | - | - |
| D-04 | pdf | PAGAR | PAGAR | - | - |
| D-05 | imagen | PAGAR | PAGAR | - | - |
| D-06 | imagen | FRENAR | FRENAR | EXTRACCION, R2, R4, R6 | lecturas_difieren:categoria |
| D-07 | pdf | PAGAR | PAGAR | - | - |
| D-08 | correo | PAGAR | PAGAR | - | - |
| D-09 | pdf | ESCALAR | **FRENAR** | R1, R4, R6 | - |
| D-10 | correo | PAGAR | PAGAR | - | - |
| D-11 | pdf | ESCALAR (ambiguo) | ESCALAR | INYECCION | - |
| D-12 | imagen | PAGAR | PAGAR | - | - |
| D-13 | chat | PAGAR | PAGAR | - | - |
| D-14 | pdf | ESCALAR | ESCALAR | R8 | - |
| D-15 | imagen | PAGAR | PAGAR | - | - |
| D-16 | chat | FRENAR | FRENAR | R5 | - |
| D-17 | correo | PAGAR | PAGAR | - | - |
| D-18 | pdf | ESCALAR | ESCALAR | EXTRACCION, CONFIANZA, R6 | no_es_cobro:nota_credito |
| D-19 | correo | ESCALAR | ESCALAR | EXTRACCION, R7 | lecturas_difieren:categoria |
| D-20 | pdf | FRENAR | FRENAR | R4 | - |
| D-21 | imagen | PAGAR | PAGAR | - | - |
| D-22 | imagen | PAGAR | PAGAR | - | - |
| D-23 | chat | FRENAR | FRENAR | R2, R6 | - |
| D-24 | correo | FRENAR (ambiguo) | FRENAR | R2 | - |
| D-25 | pdf | PAGAR | PAGAR | - | - |
| D-26 | imagen | ESCALAR | ESCALAR | EXTRACCION, CONFIANZA, R7 | moneda_ambigua, imagen_confianza_baja |
| D-27 | chat | PAGAR | PAGAR | - | - |
| D-28 | imagen | PAGAR | PAGAR | - | - |
| D-29 | pdf | PAGAR | PAGAR | - | - |
| D-30 | imagen | PAGAR | PAGAR | - | - |

## Lectura de las diferencias
La única diferencia que cuenta es **D-09** (Agro Páramo, USD 9.800). La esperábamos ESCALAR solo por superar el límite de USD 5.000 (R1). El motor la frenó porque además no cabía en el presupuesto de su categoría (R4, que frena). El etiquetador calculó los presupuestos a mano y no lo previó. Es una decisión más estricta, no más permisiva: no hubo pago. Las etiquetas no se cambiaron y la cifra oficial sigue siendo la de arriba.

## Cómo leer este número (honestidad)
- **Hubo dos corridas.** La primera (`docs/set-ciego2-resultados-corrida1.md`) dio 18 de 30 sin persona (60,0 %), 0 pagos indebidos y 10 lecturas fallidas: los 10 PDF del set traen el texto sin comprimir y el lector solo leía PDF comprimidos. Se corrigió el lector (commit `56eceb2`, con prueba) **sin tocar las etiquetas** y se volvió a correr: este informe es la segunda corrida.
- **La mezcla la elegimos nosotros:** 19 de 30 facturas (63 %) son rutinarias y pagables. Con otra mezcla el porcentaje cambia. Lo que no depende de la mezcla es que hubo **0 pagos indebidos** en las dos corridas.
- El 83,3 % supera el 80 % "máximo posible" porque el motor frenó una factura que esperábamos escalar (D-09): fue más estricto, no más permisivo.
- En los canales en vivo (Telegram, web, correo) nada se paga solo por diseño: este número mide el motor y el lector, no lo que pasa en vivo.
