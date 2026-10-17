# Agente que paga por la empresa (Equipo 404, Hackathon 30X, reto Blinka)

Un agente que lee facturas y decide **PAGAR**, **FRENAR** o **ESCALAR** segun reglas de politica configurables. Registra y explica cada decision. **Nunca mueve dinero**: su salida es una instruccion de pago que otro sistema ejecutaria.

## Principio de diseno

El modelo de lenguaje lee y explica, nunca decide. La decision la toma una funcion pura de reglas, probada con tests. Ante duda o excepcion, ESCALAR (falla cerrada).

## Estado

En construccion. Cierre de la entrega: domingo 2026-10-18, 12:00 m. hora Colombia.

## Contenido

- [`docs/flujo-y-pasos.md`](docs/flujo-y-pasos.md): ruta de trabajo en 6 pasos con sus puertas de salida.
- [`docs/reglas-R1-R8.json`](docs/reglas-R1-R8.json): las 8 reglas de politica y su precedencia.
- [`docs/esquemas/`](docs/esquemas/): contratos JSON entre piezas (factura extraida, decision, instruccion de pago).
- [`docs/diagrama-flujo-cronologia.html`](docs/diagrama-flujo-cronologia.html): diagrama de flujo y cronologia (abrir en el navegador).

## Seguridad

- Datos 100% ficticios. Ninguna clave en el repositorio.
- Las claves van solo en variables de entorno (ver `.env.example`).
- El demo publico corre en modo replay, sin ninguna clave desplegada.
- El texto de una factura es dato no confiable, nunca instruccion.
- Las reglas son politica interna de pago de una empresa ficticia, no normativa legal.

## Motor de reglas (paso 2)

`src/engine/`: funcion pura `decidir(facturaId, factura, contexto, config)` que devuelve PAGAR, FRENAR o ESCALAR con razones, hechos y explicacion por plantilla. Dinero en centavos enteros, conversion a USD redondeando hacia arriba, ante error interno ESCALAR.

```
npm install
npm test          # 71 tests: ejemplos por regla, propiedades con fast-check y el set F-001 a F-015
npm run typecheck
```

Las propiedades comparan el motor con un oraculo independiente escrito con BigInt: el motor decide PAGAR si y solo si el oraculo lo permite. Ademas se verifica que nunca lanza error, que es determinista, que no modifica sus entradas y que toda cifra de la explicacion sale de los hechos del motor.

Supuestos pendientes de confirmar con el dataset del equipo: una cuenta nueva debe estar registrada en la lista de beneficiarios con su fecha de alta (una cuenta no registrada se frena por R2; una registrada hace menos de 3 dias escala por R8); la tolerancia de R6 aplica en ambos sentidos; sin presupuesto configurado para la categoria se escala.

## Set de desarrollo (F-001 a F-015)

`data/dev-set.json` es la salida simulada del extractor para las 15 facturas del Sheet del equipo, y `tests/dataset.test.ts` las corre en orden contra el motor: 4 PAGAR, 4 FRENAR y 7 ESCALAR, con las reglas esperadas en cada caso. Los beneficiarios, acuerdos, presupuestos y tasas salen del Sheet. Los numeros de factura, las fechas, la fecha de alta de la cuenta de F-011, el pago previo de nomina de F-013 y la alerta de F-009 los fijamos nosotros para poder ejecutar el caso.

Este set lo disenamos nosotros: pasarlo no prueba que el agente generalice. Eso lo mide el set ciego, armado por otra persona y congelado antes de ver los resultados.
