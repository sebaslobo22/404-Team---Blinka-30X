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
