# Set ciego (C-01 a C-10)

## Quién lo armó
Un agente aislado (Claude Sonnet 5.5) con instrucciones explícitas de no ver el código del sistema,
porque el integrante humano que debía armarlo dejó el equipo. Su valor es la independencia: diseñó los
casos solo desde lo que un cliente le daría a cualquier proveedor.

## Qué leyó
- `docs/brief-blinka.md` (reto oficial).
- `docs/reglas-R1-R8.json` (política de pagos de Aurora Cloud).
- Solo el bloque `contexto` de `data/dev-set.json` (proveedores, cuentas, acuerdos, presupuestos,
  historial, fecha "ahora" 17/10/2026).

## Qué no leyó
`src/` (motor, lector, prompts), `tests/`, `data/facturas/`, la lista `facturas` de
`data/dev-set.json`, `data/dev-set-defensas.json`, `referencia/` y el resto de `docs/`. No usó
Graphify ni búsquedas sobre esos archivos. No ejecutó el lector, el motor ni `npm test`.

## Cómo se congeló
1. Se escribió primero la decisión esperada y su motivo (`data/ciego/esperado.json`) y se generaron
   los archivos, todo antes de cualquier ejecución del sistema.
2. `data/ciego/MANIFIESTO.sha256` guarda el SHA-256 de cada archivo y de `esperado.json`.
3. Un solo commit: "Set ciego congelado (C-01…C-10)". Verificación: `cd data/ciego && shasum -a 256 -c MANIFIESTO.sha256`.

## Cómo usarlo
Procesar en orden C-01 a C-10 partiendo del `contexto` inicial de `data/dev-set.json`; cada PAGAR consume
presupuesto. La decisión esperada vive solo en `data/ciego/esperado.json`. Los casos con `ambiguo: true`
no cuentan en la nota.

## Casos (sin decisión)
| ID | Archivo | Formato | Qué trae |
|---|---|---|---|
| C-01 | C-01.eml | Correo | Cuenta de cobro de servidores en soles |
| C-02 | C-02.pdf | PDF | Fatura en portugués, servicios de diseño en reales |
| C-03 | C-03.txt | Chat | Cobro mensual de mantenimiento enviado por chat |
| C-04 | C-04.png | Imagen | Recibo de un contratista, número escrito con espacios y minúsculas |
| C-05 | C-05.pdf | PDF | Cuenta de cobro de un proveedor de nombre muy parecido a uno registrado |
| C-06 | C-06.jpg | Imagen | Factura de rediseño en pesos mexicanos |
| C-07 | C-07.pdf | PDF | Asesoría en pesos colombianos con valor total alto |
| C-08 | C-08.eml | Correo | Recibo de contratista con una firma extra al final |
| C-09 | C-09.eml | Correo | Documento enviado como "cobro" por un proveedor de equipos |
| C-10 | C-10.txt | Chat | Factura con detalle de líneas y total |
