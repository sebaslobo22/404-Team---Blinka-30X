# Música para el video pitch deck de Pulso (123 BPM)

Marca de tiempo: 18/10/2026, 12:36 (Caracas).

El video está cortado a **123 BPM** (un beat = 0,4878 s) y dura **80,0 s** (164 beats). Cada corte cae en un beat.
Las tres canciones de abajo se listan cerca de 123 BPM según los catálogos habituales de BPM. Antes de usar una,
confirma su tempo con un contador de BPM (por ejemplo tocando al ritmo en cualquier "tap tempo" online):
si marca 123 (o 123 con un decimal), sirve tal cual; a 122 o 124 el último corte se desfasa cerca de 0,7 s, así que conviene otra pista.

## Opciones

1. **Daft Punk, "Harder, Better, Faster, Stronger"** (primera opción, ~123 BPM). Energía de keynote: base repetitiva,
   subida clara y golpe seco. Empieza desde la entrada del beat principal (la sección donde ya suena el bombo constante
   junto al patrón de la voz robótica), no desde el intro suelto.
2. **Daft Punk, "One More Time"** (~123 BPM). Más festiva y luminosa. Empieza desde la entrada del beat principal,
   justo donde el bombo arranca con la línea de piano/acordes. Va bien si quieres un tono de celebración.
3. **Rihanna, "Don't Stop the Music"** (~122 BPM, confirmar). Más pop y directa. Empieza desde la entrada del beat
   principal. Si el contador marca 122, el desfase al final es de unos 0,7 s: úsala solo si no hay mejor opción.

Alternativa sin riesgo de derechos: una pista libre de derechos de 123 BPM de la Biblioteca de audio de YouTube o de
Pixabay Music (filtrar por BPM). Las canciones comerciales pueden activar reclamos de copyright si subes el video a
YouTube; para enseñarlo en vivo o enviarlo al jurado por archivo no hay problema práctico.

## Qué fragmento usar

Sin timestamps inventados: busca en la canción el punto donde **entra el bombo constante y el beat principal** (el
primer golpe fuerte de esa sección) y empieza ahí. Esa sección debe durar al menos 80 s; las tres canciones tienen
esa sección sostenida. Ideal: que el primer golpe fuerte caiga exactamente en el fotograma 0 del video.

## Cómo alinearla en iMovie

1. Importa el video renderizado (el .mp4 que salga de Remotion) y la canción. Arrastra el video a la línea de tiempo.
2. Suelta la canción **debajo del video, con su inicio en 0:00**.
3. Si la canción trae intro antes del beat principal: coloca el cursor justo antes del primer golpe fuerte,
   pulsa **Cmd+B** (dividir clip) y borra la parte anterior; arrastra el clip restante hasta 0:00.
4. Reproduce los primeros 4 s: el primer golpe fuerte debe coincidir con el arranque del video y el primer
   corte (pregunta a "PDF, fotos, chats") debe caer en el tercer segundo y 9 décimas (0:03,9) sobre un golpe.
   Si se ve adelantado o atrasado, arrastra el clip de audio unos fotogramas (flechas, con el clip seleccionado).
5. Revisa el corte del segundo 39,0 (inicio de la portada en Mac): debe caer otra vez sobre un golpe. Si ya
   coincide ahí, todo el video está alineado.
6. Al final (80,0 s): recorta la canción con **Cmd+B** en el final del video y borra lo que sobre.
   Pasa el cursor sobre el clip de audio, arrastra el tirador de fundido del extremo derecho hasta que marque
   **1 s** de fundido de salida.
7. Volumen del clip de música al 100 % si el video no tiene voz; si añades voz encima, bájalo a 25 a 35 %.
8. Compartir > Archivo, resolución 1080p, calidad Alta.

## Tabla de beats (referencia para el editor)

Fórmula: fotograma del beat n = `Math.round(n * 1800 / 123)`; segundo = `n * 60 / 123`. Se repite en
`video/src/deck/guion.ts` (`beat()` y `segundos()`).
