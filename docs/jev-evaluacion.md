# ¿Integrar JEV (TypeSafe AI)? Evaluación

**Emitido:** 17/10/2026 - 6:53 p.m. (Caracas, Venezuela). Investigación con agente Sonnet + prueba real del integrador.

## Qué es
Un modelo que no escribe texto: recibe un texto y una pregunta con opciones fijas ("¿factura o nota de crédito?") y devuelve la opción con su probabilidad, en milisegundos y muy barato (~USD 0,04 por millón de tokens). No hace cuentas ni compara fechas, y no ve imágenes. Fuente: InfoQ 2026 (https://infoq.com/news/2026/10/typesafe-ai-jev-released).

## Dónde encajaría en nuestro diagrama
| Punto del flujo | ¿Mueve la aguja? |
|---|---|
| Confianza de lectura (hito 3) | **No.** JEV no ve la factura (imagen); nuestro punto débil lo cubren mejor el acuerdo entre dos modelos y el dato literal. Su "probabilidad calibrada" tiene críticas independientes. |
| ¿Es un cobro o una nota de crédito? (hito 3) | **Poco.** Es su mejor encaje, pero ya lo cubren dos modelos + marcas de texto en código. Sería una tercera opinión. |
| Órdenes ocultas (hito 3) | **Algo.** Vería frases que el detector por palabras no ve. Solo podría escalar más, nunca pagar. |
| Categoría del gasto (hito 4) | **Algo.** Una segunda opinión sobre la categoría; si discrepa, escalar. |
| Historial del proveedor, priorizar la cola | **No.** Son números y fechas: mejor en código. |

## Costo
- Tiempo: 2–4 h para un punto mínimo; 6–10 h para varios.
- Dinero: casi nada por llamada.
- **Acceso: incierto.** El alta directa de TypeSafe estaría pausada (guías de terceros). Probamos `typesafe/jev-router` en OpenRouter: **la llamada se desvió a otro modelo (deepseek/deepseek-v4.1-flash-1017) y devolvió una respuesta vacía.** No es JEV.
- Con 18 facturas no se puede demostrar calibración; solo aciertos anecdóticos.
- No encontramos bases públicas del hackathon que den puntos por usar tecnología de patrocinadores.

## Decisión
**No integrar ahora.** Seguimos como vamos: las tres cosas que JEV haría ya están cubiertas sin depender de un servicio externo, y el riesgo de tiempo y acceso es alto a horas del hito V1. **Se reconsidera solo si** el organizador nos da una llave real de JEV **y** confirma un premio o puntos por usarlo: en ese caso, opción mínima "¿es un cobro?" detrás de un interruptor, con respuestas guardadas para la demo, antes de las 9:00 p.m. En el pitch, JEV va como hoja de ruta ("segunda opinión barata"), sin prometer "probabilidad calibrada".
