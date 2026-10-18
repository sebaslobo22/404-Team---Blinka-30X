# Set ciego 2 (realista): resultado de la corrida en vivo

**Commit del código:** `7784068` · **Verificación del manifiesto:** `sha256sum` · **Modo:** en vivo, lector con dos modelos.
Protocolo y mezcla en `docs/set-ciego2.md`. Las etiquetas se congelaron antes de correr y este informe no las cambia.

## Resultado, tal cual
| Métrica | Valor |
|---|---|
| **Pagos indebidos** (el motor pagó donde lo esperado no era pagar) | **0 de 30** |
| Coincidencia con la etiqueta, sin ambiguos | 22 de 28 (78,6 %) |
| Coincidencia con la etiqueta, todos | 24 de 30 |
| **Decidido sin persona** (PAGAR más FRENAR sobre el total) | **18 de 30 (60,0 %)** |
| De esas decisiones autónomas, las correctas | 18 de 18 |
| Lecturas fallidas (el lector no devolvió datos) | 10 de 30 |
| Costo del lector | USD 0.0326 |

Referencia de lo esperado: PAGAR 19 · FRENAR 5 · ESCALAR 6 (autonomía máxima posible con las etiquetas: 80,0 %).
Lo que decidió el motor: PAGAR 14 · FRENAR 4 · ESCALAR 12.

## Detalle por documento
| ID | Formato | Esperada | Pulso | Reglas | Alertas del lector |
|---|---|---|---|---|---|
| D-01 | correo | PAGAR | PAGAR | - | - |
| D-02 | chat | PAGAR | PAGAR | - | - |
| D-03 | pdf | PAGAR | **ESCALAR** | EXTRACCION, CONFIANZA, R7 | lector_fallo:entrada_vacia |
| D-04 | pdf | PAGAR | **ESCALAR** | EXTRACCION, CONFIANZA, R7 | lector_fallo:entrada_vacia |
| D-05 | imagen | PAGAR | PAGAR | - | - |
| D-06 | imagen | FRENAR | FRENAR | EXTRACCION, R2, R4, R6 | lecturas_difieren:categoria |
| D-07 | pdf | PAGAR | **ESCALAR** | EXTRACCION, CONFIANZA, R7 | lector_fallo:entrada_vacia |
| D-08 | correo | PAGAR | PAGAR | - | - |
| D-09 | pdf | ESCALAR | ESCALAR | EXTRACCION, CONFIANZA, R7 | lector_fallo:entrada_vacia |
| D-10 | correo | PAGAR | PAGAR | - | - |
| D-11 | pdf | ESCALAR (ambiguo) | ESCALAR | EXTRACCION, CONFIANZA, R7 | lector_fallo:entrada_vacia |
| D-12 | imagen | PAGAR | PAGAR | - | - |
| D-13 | chat | PAGAR | PAGAR | - | - |
| D-14 | pdf | ESCALAR | ESCALAR | EXTRACCION, CONFIANZA, R7 | lector_fallo:entrada_vacia |
| D-15 | imagen | PAGAR | PAGAR | - | - |
| D-16 | chat | FRENAR | FRENAR | R5 | - |
| D-17 | correo | PAGAR | PAGAR | - | - |
| D-18 | pdf | ESCALAR | ESCALAR | EXTRACCION, CONFIANZA, R7 | lector_fallo:entrada_vacia |
| D-19 | correo | ESCALAR | ESCALAR | EXTRACCION, R7 | lecturas_difieren:categoria |
| D-20 | pdf | FRENAR | **ESCALAR** | EXTRACCION, CONFIANZA, R7 | lector_fallo:entrada_vacia |
| D-21 | imagen | PAGAR | PAGAR | - | - |
| D-22 | imagen | PAGAR | PAGAR | - | - |
| D-23 | chat | FRENAR | FRENAR | R2, R6 | - |
| D-24 | correo | FRENAR (ambiguo) | FRENAR | R2 | - |
| D-25 | pdf | PAGAR | **ESCALAR** | EXTRACCION, CONFIANZA, R7 | lector_fallo:entrada_vacia |
| D-26 | imagen | ESCALAR | ESCALAR | EXTRACCION, CONFIANZA, R7 | moneda_ambigua, imagen_confianza_baja |
| D-27 | chat | PAGAR | PAGAR | - | - |
| D-28 | imagen | PAGAR | PAGAR | - | - |
| D-29 | pdf | PAGAR | **ESCALAR** | EXTRACCION, CONFIANZA, R7 | lector_fallo:entrada_vacia |
| D-30 | imagen | PAGAR | PAGAR | - | - |

## Lectura de las diferencias
_Pendiente de escribir a mano después de revisar cada fila marcada en negrita. Si una etiqueta resulta mal hecha, se anota aquí y la cifra oficial sigue siendo la de arriba._
