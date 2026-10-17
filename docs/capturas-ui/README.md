# Verificación de interfaz · Equipo 404

17/10/2026, Caracas. Rama `sebastian/ui`. Base inicial: `f585b57277262e82700f1ebae566efcbdb46e294`; checkout limpio al comenzar.

## Capturas revisadas

24 capturas completas con Next.js en desarrollo, datos locales de demostración restaurados, movimiento reducido para estabilizar la imagen y sin el indicador de desarrollo de Next.js. Se revisaron las seis rutas en ambos anchos y temas, incluidas sus continuaciones y finales de página. La matriz técnica está en [matriz.json](matriz.json): HTTP 200, sin errores de página ni desbordamiento horizontal en las 24 combinaciones.

| Ruta | 390 claro | 390 oscuro | 1280 claro | 1280 oscuro |
|---|---|---|---|---|
| `/` | [Ver](decisiones-390-claro.png) | [Ver](decisiones-390-oscuro.png) | [Ver](decisiones-1280-claro.png) | [Ver](decisiones-1280-oscuro.png) |
| `/facturas/F-005` | [Ver](factura-F-005-390-claro.png) | [Ver](factura-F-005-390-oscuro.png) | [Ver](factura-F-005-1280-claro.png) | [Ver](factura-F-005-1280-oscuro.png) |
| `/cola` | [Ver](cola-390-claro.png) | [Ver](cola-390-oscuro.png) | [Ver](cola-1280-claro.png) | [Ver](cola-1280-oscuro.png) |
| `/reglas` | [Ver](reglas-390-claro.png) | [Ver](reglas-390-oscuro.png) | [Ver](reglas-1280-claro.png) | [Ver](reglas-1280-oscuro.png) |
| `/registro` | [Ver](registro-390-claro.png) | [Ver](registro-390-oscuro.png) | [Ver](registro-1280-claro.png) | [Ver](registro-1280-oscuro.png) |
| `/team` | [Ver](team-390-claro.png) | [Ver](team-390-oscuro.png) | [Ver](team-1280-claro.png) | [Ver](team-1280-oscuro.png) |

## Evidencia funcional

La prueba nueva `tests/ui/verificar.cjs` usa un Playwright ya disponible; no añade dependencias. Ejecutar con `npm run dev` local y `PLAYWRIGHT_MODULE=/ruta/al/playwright/disponible node tests/ui/verificar.cjs`. El destino está fijado a `localhost:3000`. Usa únicamente las APIs de demo existentes, cuyo singleton conserva el producto en memoria del proceso, y restaura esa sesión al terminar. No escribe en Supabase ni modifica datos de producción.

Comprobado: aprobar y rechazar escaladas; nota vacía bloquea la confirmación; confirmación inline; botón pendiente deshabilitado durante una petición retrasada; resultado visible; retirada de la factura al actualizar; FRENAR sin aprobación; exclusividad de plegables; filtros y vacío; nueva versión de reglas en una decisión regenerada mediante el flujo existente; cadena verificada en pantalla y API; tema claro explícito sobre sistema oscuro; foco visible; acceso por Tab a reglas y guardado; puertas de equipo por teclado; reduced motion; contenido sin IntersectionObserver y plegables nativos sin JavaScript.

Las 20 combinaciones de contraste de texto evaluadas están en [contraste.json](contraste.json). Mínimo: 5,04:1, superior a AA de texto normal. Esto no sustituye una auditoría integral con tecnologías de asistencia.

## Límites y decisiones

- Cuatro destinos globales: Decisiones, Cola humana, Reglas y Registro. El detalle se alcanza desde una factura; Equipo es un enlace discreto. No se añadió ninguna ruta.
- La API de aprobaciones no recibe ni guarda notas. Se exige una nota de presentación y se explica esa limitación junto al campo; no se cambió el contrato ni se presenta como protección del backend.
- El producto actual usa facturas y lecturas de muestra; no expone las dos lecturas reales de modelos. Se informa en el detalle, sin inventar datos ni importar el lector protegido.
- La vista previa de reglas muestra cambios de parámetros, identificados como propuesta. No simula el motor en el navegador. El guardado conserva su efecto previo: regenera el set y elimina aprobaciones de la sesión; se avisa antes del formulario.
- `/team` conserva toda su lógica y el modo semilla; solo se cambió su CSS y se retiró la fuente duplicada. Sus puertas se probaron sin realizar acciones operativas sobre datos compartidos. No se probó autenticación con PIN ni se escribió en tareas o zonas desde la interfaz.
- Animaciones: IntersectionObserver con estado base visible, contador que termina en el valor real, cabecera con espacio estable y movimiento reducido. No se añadió scroll-timeline porque no aporta información a estas pantallas.
- Coordinación: `app` ya estaba tomada por `codex-sebastian`; se tomó `app/team` por el comando oficial. Estos cambios viven en el centro de mando, sin archivos locales mezclados con UI. Al terminar, el servicio remoto respondió `503 PIN demasiado corto`. Se confirmó que la API local leía las mismas zonas en Supabase y se liberaron ambas con el comando oficial y `EQUIPO_URL=http://localhost:3000`, sin cambiar credenciales ni configuración remota. La configuración del PIN del despliegue remoto requiere revisión por su responsable. El aviso a Andrés corresponde a Sebastián; no se enviaron mensajes externos.
- Alcance revisado contra el SHA inicial: solo `app/**`, esta carpeta y pruebas nuevas. Ningún archivo protegido ni prueba existente se modificó. `git diff --stat main` se usó como referencia adicional.

## Comprobaciones de código

Iniciales: build correcto; 264 pruebas pasan y una omitida; typecheck correcto tras el build. Una primera ejecución simultánea de build y typecheck produjo errores transitorios de tipos generados en `.next`; se verificaron luego secuencialmente.

Finales: `npm run build` y `npm run typecheck` pasan secuencialmente; `npm test`: 264 pasan, una omitida como al inicio. Sin errores ni advertencias nuevas en sus salidas. La prueba de navegador ampliada también pasó. El servidor de desarrollo se detuvo antes del build.
