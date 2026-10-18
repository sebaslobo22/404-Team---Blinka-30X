# Set ciego 2, el set realista (D-01 a D-30)

## Para qué sirve
El set ciego 1 (10 documentos) es casi todo casos trampa: de 10, solo 3 eran pagos normales. Sirve para
probar que el sistema no se deja engañar, pero no dice cuánto trabajo le quita a una persona de finanzas.
Este segundo set mide la **autonomía en una semana normal**: 30 documentos con la mezcla que vive una
empresa de verdad, donde la mayoría son cobros rutinarios de proveedores conocidos y solo una parte
trae algún riesgo.

La métrica que más importa aquí es el **porcentaje decidido sin persona** (PAGAR más FRENAR sobre el
total) junto con los **pagos indebidos**, que tienen que ser cero.

## Cómo se armó (independencia)
Las decisiones esperadas se escribieron leyendo solo las reglas en lenguaje humano
(`docs/reglas-R1-R8.json`, `docs/requisitos.md`, `docs/brief-blinka.md`) y el bloque `contexto` de
`data/dev-set.json` (proveedores, cuentas, acuerdos, presupuestos, historial y la fecha "ahora",
17/10/2026). No se leyó `src/engine/` ni las pruebas del motor antes de congelar. Los documentos usan
proveedores, IDs fiscales y cuentas que existen en ese contexto, para que las rutinarias sean de verdad
pagables y la medición no se arruine porque el motor las frene por "proveedor desconocido".

Los presupuestos se calcularon a mano, en orden, para que ninguna rutinaria dependa de un borde. Ejemplos:
Diseño (USD 4.000) alcanza para dos facturas de Estúdio Beira-Mar y no para la tercera; Consultoría
(USD 8.000) queda con unos USD 100 de margen después de cuatro pagos de Cafetal; Luz Andina suma unos
USD 11.160 en el mes, bajo el tope de USD 12.000 por beneficiario. El corte de una sola corrida depende
del orden, por eso cada documento tiene `orden_de_proceso`.

Para evitar discusiones sobre qué es un duplicado, ningún pago rutinario repite número ni monto de otro
del mismo proveedor ni del historial (el NOM-0012 de USD 1.500 de Marcos Rivas), así que se lea la regla
por número o por monto el resultado es el mismo. Los montos rutinarios están dentro de la tolerancia del
2 % (entre 0 % y 1,5 %, arriba o abajo), nunca pegados al borde.

## Mezcla
| Decisión esperada | Documentos | Qué son |
|---|---|---|
| PAGAR | 19 (63 %) | Cobros rutinarios de proveedores conocidos: Luz Andina (7), Cafetal (4), Taller Orinoco (4), Estúdio Beira-Mar (2), Marcos Rivas (2) |
| FRENAR | 5 (17 %) | Proveedor desconocido (2), cuenta distinta de la registrada, duplicado exacto, presupuesto de Diseño agotado |
| ESCALAR | 6 (20 %) | Monto sobre el límite, cuenta cambiada hace menos de 3 días, orden escondida, nota de crédito, moneda no permitida, datos ilegibles |

Formatos: 10 PDF, 6 correos, 5 chats de texto, 5 imágenes PNG y 4 fotos JPG. Hay facturas en español,
portugués e inglés, con montos escritos de distintas formas (`PEN 6.000,00`, `PEN 5,985.50`) y una foto
manchada. Todo documento dice en el pie "Documento ficticio para pruebas".

## Por qué es representativa
- **Mayoría rutinaria.** Casi dos de cada tres documentos son pagos normales. Si el sistema escala
  demasiado, aquí se nota en el porcentaje autónomo, algo que el set 1 no mostraba.
- **Los riesgos reales y frecuentes.** Un proveedor que no está en la lista, un duplicado reenviado por
  chat, una cuenta que cambia "por correo", una nota de crédito que llega como cobro, una orden escondida
  en letra pequeña, una moneda que la empresa no usa, un monto por encima del límite y una foto que no
  se lee. Son los fraudes y errores que el brief pide cubrir.
- **Proporción creíble.** 37 % de documentos con algo raro es más alto que en una empresa real; se deja así
  a propósito para tener casos de riesgo suficientes. Por eso el porcentaje autónomo de este set es un
  **piso conservador**, no una predicción de operación.

## Casos ambiguos (no cuentan en la nota)
- **D-11 (orden escondida):** las reglas R1 a R8 no tienen una regla de manipulación, y solo con ellas la
  factura se pagaría. Se espera ESCALAR por el brief y por "ante duda, ESCALAR".
- **D-24 (cuenta distinta y aviso de cambio):** por la regla de beneficiario permitido es FRENAR; una
  lectura razonable de "cuenta cambiada" lo escalaría para que una persona confirme el cambio.

Ambos cuentan igual en **pagos indebidos**: si el sistema paga cualquiera de los dos, es un pago indebido.

## Límites honestos
- El contexto trae solo 8 proveedores, así que hay varias facturas del mismo proveedor en pocos días
  (por nodo, por hito o por semana). Es plausible, pero una empresa real tendría más variedad de nombres.
- Lo escribe un agente que conoce las mismas reglas que el sistema: mide consistencia y robustez, no
  generalización a facturas reales de terceros.
- Son 30 casos: con tan pocos, un solo acierto o error mueve el porcentaje unos 3 puntos.

## Cómo se congeló
1. Se escribieron la decisión esperada y su motivo (`data/ciego2/esperado.json`) y se generaron los
   archivos con `scripts/ciego2-generar.py`, todo antes de ejecutar el lector o el motor.
2. `data/ciego2/MANIFIESTO.sha256` guarda el SHA-256 de cada archivo y de `esperado.json`.
   `data/ciego2/.gitattributes` evita que git cambie los saltos de línea y rompa los hashes.
3. Un commit de congelación con documentos, esperado, manifiesto y generador. El esperado no se cambia
   después de ver el resultado; si una etiqueta resulta mal hecha, se anota en el informe de resultados
   y se deja la cifra oficial como estaba (como se hizo con C-06 y C-10 en el set 1).
4. Verificación: `cd data/ciego2 && shasum -a 256 -c MANIFIESTO.sha256` (en Windows con Git Bash:
   `sha256sum -c MANIFIESTO.sha256`). El corredor lo hace solo y se niega a correr si algo cambió.

## Cómo correrlo
Desde la raíz del repositorio, con la clave del lector en el entorno (mismas variables que el set 1):

```
npx vite-node scripts/ciego2-correr.ts
```

En vivo guarda las lecturas en `data/ciego2/lecturas/` y escribe `docs/set-ciego2-resultados.md` y
`data/ciego2/resultados.json`. Para repetir sin red: `EXTRACTION_MODE=replay npx vite-node scripts/ciego2-correr.ts`.
Se procesa D-01 a D-30 en orden desde el `contexto` inicial; cada PAGAR consume presupuesto.

## Documentos (sin decisión)
| ID | Formato | Qué trae |
|---|---|---|
| D-01 | correo | Cobro de servidores de Luz Andina en soles |
| D-02 | chat | Mantenimiento mensual de Taller Orinoco |
| D-03 | PDF | Consultoría semana 1 de Cafetal en pesos colombianos |
| D-04 | PDF | Fatura de Estúdio Beira-Mar en reales |
| D-05 | imagen | Recibo de honorarios de Marcos Rivas |
| D-06 | foto | Servicio de redes de un proveedor argentino |
| D-07 | PDF | Cobro de Luz Andina, nodo B |
| D-08 | correo | Reparación de equipos de red, Taller Orinoco |
| D-09 | PDF | Servicio anual de riego de Agro Páramo |
| D-10 | correo | Consultoría semana 2 de Cafetal |
| D-11 | PDF | Cobro de Luz Andina en inglés con texto muy pequeño al pie |
| D-12 | foto | Segunda entrega de Estúdio Beira-Mar |
| D-13 | chat | Mantenimiento correctivo, Taller Orinoco |
| D-14 | PDF | Soporte técnico de Soporte Quito |
| D-15 | imagen | Ancho de banda adicional de Luz Andina |
| D-16 | chat | Reenvío de una factura de Taller Orinoco "por si no llegó" |
| D-17 | correo | Recibo de honorarios de Marcos Rivas |
| D-18 | PDF | Documento de Cafetal con monto entre paréntesis |
| D-19 | correo | Cobro de Luz Andina en euros |
| D-20 | PDF | Tercera entrega de Estúdio Beira-Mar |
| D-21 | foto | Soporte de infraestructura de Luz Andina |
| D-22 | imagen | Revisión trimestral de Taller Orinoco |
| D-23 | chat | Limpieza de oficina de un proveedor boliviano |
| D-24 | correo | Cobro de Luz Andina que avisa un cambio de cuenta |
| D-25 | PDF | Consultoría semana 3 de Cafetal |
| D-26 | imagen | Foto de un recibo manchada y desenfocada |
| D-27 | chat | Respaldo de Luz Andina |
| D-28 | foto | Horas extra de Luz Andina |
| D-29 | PDF | Cobro de Luz Andina, nodo E, en inglés |
| D-30 | imagen | Consultoría semana 4 de Cafetal |
