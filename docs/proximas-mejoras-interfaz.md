# Próximas mejoras de la interfaz

**Emitido:** 18/10/2026 - 10:18 a.m. (Caracas, Venezuela). Lo pidió Sebastián después del congelamiento de código, a partir de una captura del tablero en https://equipo404.produfy.co.
**Estado:** no está construido. Es el paquete de mejoras de la siguiente versión. Nada de esto toca el motor, las reglas ni la seguridad.

Personas límite de siempre: Carmen (70 años, miopía severa) y Mateo (12 años). Todo lo de abajo tiene que funcionar para los dos, con mouse, con teclado y con el dedo.

## 1. Tarjetas que responden al usuario

**Qué se quiere:** que cada tarjeta se note viva al pasarle el mouse, pero de forma sutil.

- **Se levanta apenas:** escala 1,01–1,015 y sube 2 px, con una sombra un poco más marcada. La transición dura 150–200 ms con salida suave. No debe moverse lo que está alrededor (usar `transform`, nunca cambiar el tamaño en el flujo).
- **Halo que sigue al cursor:** dentro del área de la tarjeta, un resplandor difuminado y tenue centrado en el puntero. Se hace con un degradado radial cuya posición sale de dos variables CSS (`--x`, `--y`) que actualiza un solo manejador de `pointermove` por tarjeta, sin re-render de React. Opacidad baja, por ejemplo 8 % en claro y 12 % en oscuro, del color de acento del tema.
- **Igual con teclado:** `:focus-visible` muestra el mismo realce (sin halo) y un contorno visible.
- **Respeta `prefers-reduced-motion`:** sin escala ni halo, solo el cambio de sombra.
- **En pantallas táctiles** no hay hover: no se simula. La tarjeta solo responde al toque si lleva a algún lado.
- **Una sola implementación:** un componente o clase de tarjeta compartida. No se copia el efecto tarjeta por tarjeta.

## 2. Botón "i" de ayuda en cada tarjeta

**Qué se quiere:** que alguien que nunca vio el proyecto entienda qué es cada cosa sin preguntar.

- Un ícono **i** en la esquina superior derecha de cada tarjeta. Es el mismo ícono de línea del set único (`app/ui/iconos.tsx`) y siempre va en el mismo lugar.
- **No puede depender solo del hover:** abre con hover, con foco de teclado y con toque. Es un `<button>` con `aria-describedby` hacia la ayuda; Esc la cierra. Así funciona para Carmen con lupa, para Mateo en tablet y con lector de pantalla.
- **Textos en un solo archivo** (por ejemplo `app/ui/ayudas.ts`), con una entrada por tarjeta. Así el tono es parejo y se revisa todo junto contra la lista de palabras prohibidas del jurado.
- **Cómo se escribe cada ayuda:** dos frases como máximo. Primero qué es, después por qué te importa. Sin siglas ni nombres de reglas (nada de "R4" ni "INYECCION"). Ejemplos:
  - *Frenadas:* "Facturas que Pulso no deja pagar porque rompen una regla de tu empresa. Ninguna se puede aprobar: hay que corregir la causa."
  - *Órdenes ocultas:* "Facturas que traían texto escondido intentando darle órdenes al asistente. Pulso lo lee como dato, nunca lo obedece, y te lo muestra marcado."
  - *Costo de leer las 18:* "Lo que costó que dos inteligencias artificiales leyeran todas las facturas. Es la suma real de las lecturas grabadas."
- Se guarda la cifra exacta que ya muestra la tarjeta; la ayuda no inventa números.

## 3. Unificar el sistema de diseño (lo más importante)

**Qué se ve en la captura:** las tarjetas no comparten tamaño, espaciado ni cuadrícula.

- **"Riesgos detectados":** las tarjetas tienen alturas distintas. Las de título largo ("No cuadra con lo acordado", "Proveedor no autorizado") ocupan dos líneas y quedan más altas que el resto de su fila. La última fila tiene 3 tarjetas y deja un hueco.
- **Fila de indicadores** ("Pagadas solas", "Frenadas", "Coinciden con lo esperado", "Costo de leer las 18"): unas traen texto de apoyo y otras no, así que el contenido queda a distintas alturas y el espacio vacío cambia de una a otra.
- **Tipografía mezclada:** las cifras van en monoespaciada en unas tarjetas y en la fuente normal en otras.

**Cómo se arregla:**
- **Un solo componente de tarjeta** con variantes declaradas (indicador, riesgo, etapa del flujo). Ninguna pantalla define su propio relleno, borde o radio.
- **Tokens únicos:** relleno, separación entre tarjetas, radio, borde y sombra salen de variables en `:root` (ya existen las de color; faltan las de espaciado y elevación). Escala de espaciado en múltiplos de 4 px.
- **Cuadrícula con filas parejas:** `grid-template-columns: repeat(auto-fill, minmax(<ancho mínimo>, 1fr))` con `grid-auto-rows: 1fr`, para que todas las tarjetas de una fila midan lo mismo. Si un grupo tiene un número de tarjetas que deja hueco, se elige un número de columnas que lo divida (por ejemplo, 11 riesgos en 4 columnas dejan 3 en la última fila: o se aceptan alineados a la izquierda con el mismo ancho, o se agrupan).
- **Estructura interna fija:** ícono, título, cifra y texto de apoyo siempre en el mismo orden y lugar. El título reserva dos líneas aunque use una, así la cifra cae a la misma altura en todas.
- **Una sola regla para las cifras:** todas en la misma fuente y con el mismo peso.
- **Prueba automática que lo cuide:** una prueba de que toda tarjeta usa el componente compartido, como la de "nada sin ícono". Y capturas a 390 px y a 1280 px, en claro y en oscuro, comparadas antes y después.

## Orden sugerido
1. Unificar el sistema de diseño (sección 3). Es la base: los efectos y la ayuda se montan sobre el componente único.
2. Botón "i" con los textos centralizados.
3. Efectos de hover y halo.

Cada paso va en su propia rama, con `npm test`, `tsc` y `build` en verde, y revisado con las dos personas límite antes de fusionar.
