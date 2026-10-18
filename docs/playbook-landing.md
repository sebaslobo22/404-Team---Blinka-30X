<!-- Emitido: 18/10/2026 - 10:50 a.m. (Caracas, Venezuela). Investigación con agentes: 46 hallazgos verificados de 56; los descartados no se usaron. -->

# Playbook de la landing de Pulso

**Equipo 404 · Hackathon 30X, reto Blinka · 18/10/2026**
**Método:** de abajo hacia arriba. Primero el dolor de cada cliente ideal (ICP), luego cómo lo resuelve el producto, al final la oferta.

**Cómo leerlo.** Los códigos entre corchetes, como [NNG-CAR], remiten a la lista de fuentes del final. "Criterio propio" significa que no hay fuente verificada y es una decisión del equipo. Las celdas marcadas (derivado) son hipótesis a partir de `mapa-escenarios.md`. Los 10 perfiles de ese archivo son deducciones y no vienen de entrevistas ni de clientes reales. Se tratan como hipótesis hasta que alguien real las confirme [VPC].

**Reglas de redacción de toda la landing:**
- Lenguaje llano. El texto de nivel de 5.º a 7.º grado convirtió 12,9 % contra 2,1 % del nivel profesional [UNB].
- Entre 250 y 725 palabras visibles en la página principal [UNB]. Lo técnico va en bloques plegables.
- Cifras solo las permitidas: 25 de 30 sin persona (83,3 %); 0 pagos indebidos; 8 de 18 (44,4 %) en desarrollo; 728 pruebas; 37 escenarios en Telegram sin pagos.
- Sin raya larga, sin clientes ni testimonios inventados, sin escasez ni contadores falsos.

---

## 1. Los ICP, ordenados por quién gana más con Pulso

El orden es un juicio del equipo (criterio propio). Pesa cuántas reglas de Pulso le importan al perfil, qué tan cerca está de la demo y si hoy tiene a alguien que lo proteja. Carmen (70, miopía severa) y Mateo (12) **no son clientes**. Son los límites de usabilidad de la interfaz.

Cada "voz tipo" es una frase redactada por el equipo para nombrar un dolor. **No es una cita de nadie ni un testimonio.** En la página va sin nombre, sin foto y sin cargo, bajo el rótulo "Si esto te suena". Así evitamos lo que la regla de la FTC prohíbe: testimonios que tergiversan a su autor [FTC24].

### 1.1 A1: startup o SaaS en EE. UU. con equipo en LatAm (10 a 80 personas). Perfil de la demo (Aurora Cloud)
- **Dolor:** duplicados, cobros fuera de lo acordado y cuentas no autorizadas (R5, R6, R7, R1, R4).
- **Detonante (derivado):** crece el volumen de facturas y el fundador o CFO fraccional es el cuello de botella.
- **Objeción:** "¿Puedo confiar en una IA con mis pagos?" Respuesta: la IA lee y el código decide. Nunca mueve dinero.
- **Voz tipo (no es testimonio):** "Todo pago pasa por mi pantalla. Si me ausento un viernes, el equipo espera."

### 1.2 C1: empresa familiar con administradora mayor (5 a 30)
- **Dolor:** fraude por cambio de cuenta e instrucciones ocultas (R8, R2, R5).
- **Detonante (derivado):** un susto de cuenta cambiada.
- **Objeción:** "Seguro es difícil de usar." Respuesta: diseñado para Carmen y Mateo, con frases de 15 palabras o menos, nada bajo 16 px y color siempre acompañado de ícono y palabra.
- **Voz tipo (no es testimonio):** "Pago a los mismos proveedores hace años. Me da miedo que un día cambien la cuenta y yo no lo note."
- **Por qué sube en el orden:** es el mejor argumento de seguridad del equipo. Una cuenta cambiada explicada sin jerga se entiende al instante.

### 1.3 A2: pyme exportadora de LatAm con entidad Delaware (5 a 50)
- **Dolor:** cuenta cambiada y proveedor no autorizado (R8, R2, R7, R6).
- **Detonante (derivado):** un proveedor avisa que cambió de banco y nadie lo verifica.
- **Objeción (derivada):** "No tengo equipo financiero para configurar reglas." Respuesta: la pantalla `/reglas` pide pocos campos (límite por pago, tope mensual, tolerancia, ventanas).
- **Voz tipo (no es testimonio):** "Mi proveedor dice que cambió de banco. ¿A quién le pregunto si es cierto?"

### 1.4 B1: agencia con freelancers (5 a 40)
- **Dolor:** facturas repetidas y fuera de tope que llegan por chat (R5, R3, R6, R7).
- **Detonante (derivado):** facturas por chat que se pagan de memoria.
- **Objeción:** "Tengo que cambiar de herramienta." Respuesta: Pulso lee chat `.txt` y tiene bot de Telegram.
- **Voz tipo (no es testimonio):** "La factura me llegó entre veinte mensajes. No sé si ya la pagamos."

### 1.5 A3, B3, B4: valor claro, mensaje secundario
| ICP | Dolor | Detonante (derivado) | Objeción | Voz tipo (no es testimonio) |
|---|---|---|---|---|
| A3 Fintech, cripto o infra que dispersa | Montos grandes sin límite ni tope (R1, R3, R2, R8) | Necesita segundo aprobador | "Necesito auditoría." Respuesta: registro con hash encadenado, que da evidencia de manipulación | "Lo grande lo aprueban dos personas y debe quedar escrito." |
| B3 Contratistas recurrentes | Duplicados y cuenta cambiada en pagos de siempre | El pago mensual vino distinto | Riesgo de falso duplicado en recurrentes (límite que la fuente reconoce) | "Es el pago de todos los meses, pero este mes vino distinto." |
| B4 Importador con proveedores en Asia | Pagos grandes sin control (R1, R2, R8) | Un pago grande que no puede verificar | Anticipos y parciales no están cubiertos hoy | "Es un pago grande y no sé si la cuenta es la correcta." |

### 1.6 No prometerles nada en la landing
- **B2 marketplace:** los lotes Excel o CSV no existen hoy y la cola de ESCALAR crecería.
- **C2 holding:** el modelo es de una sola empresa.
- **D1 startup de 5 personas:** con tan poco volumen el agente no ahorra tiempo.

### 1.7 Cómo se usa esto en la página
- **Un lector principal por página** [STR]. El hero habla a A1.
- **Selector "Soy…" de tres caminos**, que cambia el ejemplo sin duplicar la página: (1) fundador o CFO de startup con equipo en LatAm (A1), (2) dueño o administradora de pyme (A2 y C1), (3) agencia con chat de facturas (B1). Es el patrón "elige tu aventura" cuando hay varios públicos [DC].
- **Cada bloque de la página apunta a un dolor nombrado.** Lo que no alivia un dolor, como el detalle del hash, baja a una sección secundaria [VPC].
- **El ajuste ICP y mensaje es una hipótesis** hasta que lo confirme alguien real [VPC]. La landing sirve también para medir cuál camino del selector se elige más (ver sección 7).
- **Sobre Blinka:** no afirmar qué tipo de clientes tiene. Solo se puede decir que el reto es sobre pagos internacionales de empresas de LatAm. Tampoco usar sus cifras de financiación.

---

## 2. Mapa dolor → cómo lo resuelve Pulso → prueba que existe

La columna "Prueba" solo cita lo que ya existe. Donde falta confirmar algo, lo dice.

| Dolor | Cómo lo resuelve | Prueba que existe |
|---|---|---|
| Pagar dos veces la misma factura | R5 (cobro repetido en 30 días): FRENAR, sin aprobación posible. "{proveedor} ya cobró esta factura el {fecha}." | Regla visible en `/reglas` y explicación en la factura de la demo. **Falta fijar el número de factura de Aurora Cloud para enlazar.** |
| Pagar a quien no está autorizado | R2 (ID fiscal y cuenta exactos): FRENAR | Demo pública con las 18 facturas de Aurora Cloud |
| El proveedor cambió de cuenta | R8 (cambio en 72 h o menos): ESCALAR. Aprobar exige escribir "Confirmé el cambio por un teléfono que ya tenía" y una nota, y queda en el registro | Factura F-011 en la demo (`/facturas/F-011`) |
| Cobran más de lo acordado | R6 (cuadra con lo acordado ±2 %): ESCALAR. "Cobra {monto}, pero acordaron {acordado}." | Explicación en la demo. Falta fijar el número de factura. |
| Pagos grandes sin control | R1 límite por pago y R3 tope mensual escalan a una persona. R4 presupuesto por categoría frena | Reglas editables en `/reglas`, con versión nueva y reevaluación de facturas |
| Factura ilegible o con datos faltantes | R7: ESCALAR. "Falta {campo}. Sin ese dato no podemos pagar." | Factura F-017, lectura poco confiable (`/facturas/F-017`) |
| La IA se equivoca al leer | Doble lectura con dos modelos de empresas distintas (Claude Haiku 5.5 y Gemini 3.1 Flash-Lite). Si no coinciden o hay error, ESCALAR | Set ciego 2: 25 de 30 sin persona (83,3 %) y 0 pagos indebidos |
| La factura da órdenes a la IA | Defensa INYECCION: el texto de la factura es dato, nunca orden. ESCALAR | Factura F-016 (`/facturas/F-016`) |
| "No sé por qué decidió eso" | Explicación en lenguaje humano, con cifras que salen del motor y nunca de la IA | Cualquier factura de la demo |
| "¿Quién aprobó y cuándo?" | Registro con hash encadenado y verificación | `/registro`: verificar la cadena y simular una manipulación para ver que se detecta |
| "No quiero que una IA mueva mi dinero" | Nunca mueve dinero. FRENAR no tiene botón de aprobar y el servidor responde 403 si se intenta | Comportamiento del servidor, demostrable en la demo |
| "Mi empresa tiene otras políticas" | `/reglas`: la empresa define límites, topes, tolerancias y ventanas | Pantalla `/reglas` |
| Las facturas llegan por todos lados | PDF con texto, foto o captura, correo `.eml`, chat `.txt` y bot de Telegram | 37 escenarios en Telegram, sin pagos |
| "¿Funciona de verdad o solo en su demo?" | Pruebas con propiedades contra un oráculo independiente | 728 pruebas automáticas; 0 pagos indebidos en set ciego 2, en 10 documentos ciegos y en 62 filas externas |
| Notas de crédito o proformas leídas como cobro | Detección de documento que no es cobro y chequeo aritmético | **No publicar hasta que el equipo confirme que está implementado.** |

---

## 3. La oferta: por qué es un "no brainer" sin mentir

### 3.1 La oferta en una frase
**"Mira cómo Pulso decide 18 facturas reales de ejemplo, mándale una tuya por Telegram y trata de romper su registro. Sin conectar tu banco."**

El valor no es un descuento. Es **bajar el costo de comprobar**: en minutos y sin riesgo, la persona ve lo que el producto hace y también lo que no hace.

### 3.2 Coste de la inacción, calculado con los datos de la persona
Una mini calculadora en la página. Todo ocurre en el navegador y no se guarda ni se envía nada. El visitante pone sus números:

1. **Tiempo hoy** = facturas al mes × minutos por factura ÷ 60 × costo por hora de quien las revisa.
2. **Tiempo con Pulso** = lo mismo, pero solo para las facturas que lleguen a una persona. El campo viene precargado con lo medido en nuestro set ciego 2 (5 de 30 no se resolvieron sin persona) y el visitante lo puede cambiar. Su mezcla puede ser distinta.
3. **Exposición de un error** = el monto de una factura. Pagar dos veces cuesta ese monto otra vez.

**Ejemplo de aritmética con números de juguete (no son datos de nadie):** 100 facturas al mes × 6 minutos ÷ 60 × 10 por hora = 100 de costo mensual en revisión manual. La página debe decir en una línea: "No incluye el tiempo de configurar tus reglas." Eso es honesto y quita la sospecha de cálculo inflado.

No se pone ningún porcentaje de fraude ni de error de la industria. No hay fuente verificada y sería inventar.

### 3.3 Qué se lleva en minutos y gratis
- Recorrer la demo pública con datos ficticios de Aurora Cloud, sin claves (modo replay).
- Mandarle una factura al bot de Telegram con empresas propias. **Pendiente:** definir el aviso de datos antes de invitar a subir facturas reales (ver "Qué decidir ahora").
- Abrir `/registro`, verificar la cadena y simular una manipulación.
- Ver el código y el método en el repositorio público.

### 3.4 Qué riesgo le quitamos
- No conecta tu banco: hoy no existen conectores ni API.
- Nunca mueve dinero. Su salida es una instrucción de pago que otro sistema ejecutaría.
- Falla cerrada: ante la duda, escala a una persona.
- Las reglas son tuyas y están en código, no en el criterio de un modelo.
- Los límites están a la vista en un bloque "Todavía no" (sección 4.6).

### 3.5 FOMO ético: urgencia real y urgencia que NO fabricamos
La escasez funciona por aversión a la pérdida. La condición es usarla con moderación y con información verdadera, porque el mayor riesgo es perder la confianza si se sospecha que es falsa [NNG-ESC]. Aplicamos la versión de Cialdini: decir qué es único y qué se pierde por no actuar, con hechos reales [CIA].

**Urgencia real que sí podemos usar**
| Urgencia real | Cómo se muestra |
|---|---|
| Cada factura que hoy se paga de memoria ya corre el riesgo de duplicado o de cuenta cambiada | Texto sobrio, sin porcentaje ni dramatismo [PAS] |
| La regla R8 vigila las primeras 72 h tras un cambio de cuenta | Ejemplo F-011 en la demo |
| Los productos grandes de finanzas ya muestran IA con control humano en sus portadas (Ramp, Stampli, Tipalti) | Una línea en el pie de la sección de seguridad: "la pregunta ya no es si hay IA, sino con qué control" [RAMP][STAM][TIPA] |
| Lo único de Pulso: doble lectura con dos empresas de IA, registro encadenado verificable, servidor MCP, bot con empresas propias | Bloque "Lo que no vas a encontrar en otro lado" solo si el equipo puede demostrar cada punto [CIA] |
| El cierre del hackathon (domingo 18/10, 1:00 p. m. Caracas) | Solo en la línea de contexto del pie, con fecha y hora reales, sin contador animado |

**Mala práctica documentada y alternativa**
| Mala práctica | Por qué no | Alternativa en Pulso | Fuente |
|---|---|---|---|
| Contador regresivo o "oferta por tiempo limitado" sin plazo real | Es falsa urgencia y la FTC la señala | Fecha real, escrita en texto | [DD][FTC22] |
| "Quedan N cupos" o "X empresas viendo esto" | Falsa escasez | Ninguno. Si existe un cupo real de piloto, se dice el número real y quién lo decide | [DD][NNG-DEC] |
| Logos, testimonios o casos de éxito inventados | Falsa prueba social. La regla de la FTC lo prohíbe | Cifras con método y escenarios rotulados "Aurora Cloud, datos ficticios" | [FTC24][NNG-SOC] |
| Botón de rechazo que culpabiliza ("No, prefiero perder dinero") | Confirmshaming | Botón neutro: "Ahora no" | [DD] |
| Ventanas emergentes, salida con cupón, avisos repetidos | Bajan la confianza y bloquean a Carmen | Un solo formulario dentro de la página | [NNG-POP][DD] |
| Esconder límites (letra chica, términos al fondo) | Práctica de enterrar términos clave | Bloque "Todavía no", y el 44,4 % en desarrollo junto al 83,3 % | [FTC22] |
| Prometer autonomía sin control humano | Inquieta al financiero prudente | La cifra 25 de 30 siempre junto a "y lo dudoso lo decide una persona" | [VIC] |

---

## 4. Estructura de la landing, sección por sección

El orden sigue la narrativa de abajo hacia arriba: dolor, mecanismo, prueba, control, canales y oferta. Es el orden de PAS (problema justo después del hero) [PAS] y el de Demand Curve (titular, subtítulo, demo, menú corto, CTA) [DC]. Presupuesto de texto visible: unas 600 palabras, con el FAQ plegado.

### 4.1 Hero
- **Objetivo:** que en 5 segundos se entienda qué es, para quién y qué hacer.
- **Titular:** "Las facturas llegan por todos lados. Pulso decide cuáles pagar, frenar o escalar."
- **Texto:** "Lee PDF, fotos, correos y chats con IA. Aplica las reglas que define tu empresa. Una persona revisa solo lo dudoso. Nunca mueve dinero."
- **Qué se ve:** captura real de una factura de Aurora Cloud con su veredicto y su explicación. Encima, el selector "Soy…" (tres opciones). Menú de tres enlaces: Cómo funciona, Pruebas, Preguntas.
- **CTA:** "Ver cómo Pulso decide una factura". Secundario: "Probar en Telegram". Pegado al botón: "Nunca mueve dinero. Datos de demo ficticios (Aurora Cloud)".
- **Fuente:** titular de beneficio con subtítulo de "cómo" y demo del producto en uso [DC]. Se abre con el dolor y para un solo lector [STR]. El lema "Pulso firme en cada pago" no es el titular, porque es lema y no beneficio [STR]. Va como firma de cierre. El CTA visible dentro del hero evita el defecto de Brex, que lo deja solo al final [BREX]. La aclaración honesta pegada al CTA sigue el patrón de Mercury con su aviso legal [MERC]. Se evita el superlativo vago "radically different" [MERC].

### 4.2 Problema
- **Objetivo:** que el visitante se reconozca en una escena concreta.
- **Titular:** "Hoy: una factura por chat y un pago de memoria."
- **Texto:** "Si esto te suena: 'Esa ya la pagamos, creo.' 'Cambió de cuenta, ¿verdad?' 'No sé quién aprobó esto.' Lo que cuesta: pagar dos veces, pagar a una cuenta que cambió hace horas, pagar más de lo acordado, y no poder explicar después quién lo aprobó."
- **Qué se ve:** tres tarjetas de dolor con ícono de línea. Las frases van como "voces tipo", sin nombre, y la sección dice "frases redactadas por el equipo, no son citas".
- **CTA:** ninguno fuerte. Enlace suave: "Ver cómo se resuelve".
- **Fuente:** una escena de dolor, el problema más doloroso, sin dramatizar de más [PAS][STR]. Contraste antes y ahora en frase corta [MERC].

### 4.3 Cómo funciona
- **Objetivo:** mostrar el mecanismo en cuatro pasos y que se vea quién decide cada cosa.
- **Titular:** "Cuatro pasos. Tú pones las reglas."
- **Texto:** "1. La factura llega (PDF, foto, correo, chat o Telegram). 2. Dos modelos de IA la leen por separado. Si no coinciden, pasa a una persona. 3. Tus reglas, escritas en código, deciden: PAGAR, FRENAR o ESCALAR. 4. Una persona aprueba solo lo escalado."
- **Qué se ve:** cuatro tarjetas en línea (en columna en móvil) y las tres tarjetas de decisión con ícono más palabra. Enlace plegable "Ver las ocho reglas (R1 a R8)".
- **CTA:** "Ver una factura decidida paso a paso".
- **Fuente:** tareas y resultados antes que funciones [JTBD]. El FAQ y la jerga técnica bajan a plegables [UNB]. Las funciones que no alivian un dolor no van arriba [VPC].

### 4.4 Prueba
- **Objetivo:** sustituir la prueba social que no tenemos por prueba verificable.
- **Titular:** "Medido con facturas que el equipo no había visto."
- **Texto:** "25 de 30 facturas resueltas sin persona (83,3 %) en un set ciego, armado por otra persona del equipo y congelado antes de ver resultados. Cero pagos indebidos en ese set, en 10 documentos ciegos y en 62 filas externas. En nuestro set de desarrollo, 8 de 18 (44,4 %): lo diseñamos nosotros, por eso no lo usamos como medida. 728 pruebas automáticas. 37 escenarios en Telegram sin mover un dólar. Cero pagos indebidos es lo medido hasta hoy, no una garantía."
- **Qué se ve:** cuatro tarjetas de cifra (estáticas, sin conteo animado) más un enlace "Cómo lo medimos" y al repositorio público. La cifra de 83,3 % va junto a la de 44,4 %.
- **CTA:** "Ver el método y el repositorio".
- **Fuente:** sin clientes notables, la prueba son datos verificables y no logos [JS][NNG-SOC]. Los números bajos sin contexto se leen como mala calidad, por eso cada cifra lleva su método [NNG-SOC]. Mostrar el 44,4 % es candor (ver sección 3.5). La regla de la FTC prohíbe lo contrario [FTC24].
- **Antes de publicar:** confirmar contra el registro de resultados las cifras 25 de 30, 10 documentos, 62 filas, 728 pruebas y 37 escenarios. Los archivos de documentación consultados no las contienen (el README menciona 277 pruebas, desactualizado). Confirmar también con el mentor cómo cuenta un ESCALAR en la autonomía, y escribir esa definición en la nota de método.

### 4.5 Seguridad y control humano
- **Objetivo:** responder de frente a "¿puedo confiar en una IA con mis pagos?".
- **Titular:** "Actúa cuando es seguro. Pregunta cuando no."
- **Texto:** "La IA lee y explica. Tu regla decide. Nunca mueve dinero. Lo frenado no tiene botón de aprobar. Lo escalado lo aprueba una persona, que debe escribir una confirmación y una nota. El texto de una factura es un dato, nunca una orden. Cada decisión queda en un registro encadenado que se puede verificar y que delata si alguien lo toca."
- **Qué se ve:** captura real de F-016 (instrucción oculta no obedecida) y de `/registro` con la verificación. Tres sellos consistentes: "decidido por regla", "lectura de IA", "aprobado por persona". Plegable técnico para "hash encadenado" y "servidor MCP".
- **CTA:** "Intenta romper el registro".
- **Fuente:** el control humano va en el titular y no en letra pequeña [RAMP]. El patrón de contraste en una línea sale de Stampli [STAM]. Se supera la debilidad de Ramp y Vic.ai, que afirman auditoría sin enseñarla y mandan la seguridad a otra página [RAMP][VIC]. Aquí la evidencia está en la misma página. No decir que el registro "no se puede tocar": decir que "delata" la manipulación.

### 4.6 Canales y límites
- **Objetivo:** mostrar dónde funciona hoy y qué no hace, sin letra chica.
- **Titular:** "Funciona donde ya te llegan las facturas."
- **Texto:** "Hoy: PDF con texto, foto o captura, correo, chat y bot de Telegram. También hay un servidor MCP para conectar agentes. Todavía no: PDF escaneado (siempre pasa a una persona), XML fiscal, lotes de Excel, buzón de correo, conectores ni API, pago parcial."
- **Qué se ve:** íconos de línea de los cinco canales y una lista "Todavía no" con el mismo peso visual.
- **CTA:** "Probar en Telegram".
- **Fuente:** no esconder límites [FTC22]. Evitar la pared de funciones y organizar por dolor [NNG-HOME].

### 4.7 Oferta y CTA
- **Objetivo:** convertir sin presión en una de tres acciones.
- **Titular:** "Pruébalo con una factura tuya. Sin conectar tu banco."
- **Texto:** "Recorre la demo en dos minutos. Mándale una factura al bot. Verifica el registro. Nunca mueve dinero."
- **Qué se ve:** la calculadora (3.2) en un plegable, tres botones y el formulario corto de contacto.
- **CTA primario:** "Ver cómo Pulso decide una factura". Secundario: "Probar en Telegram". Terciario: "Escribir al equipo".
- **Formulario:** errores específicos por campo y en lenguaje llano ("tu correo está incompleto: falta lo que va después de la @") [BAY]. Alto contraste. Sin ventana emergente.
- **Fuente:** CTA con verbo y resultado, nunca "Enviar" ni "Saber más" [NNG-HOME]. No hay cupos ni cuenta regresiva (sección 3.5).

### 4.8 FAQ (plegable)
Respondemos primero las preguntas incómodas, al estilo de Ramp [RAMP].
1. ¿Puedo confiar en una IA con mis pagos?
2. ¿Y si se equivoca al leer?
3. ¿Mueve dinero?
4. ¿Quién pone las reglas?
5. ¿Qué pasa si una factura trae instrucciones ocultas?
6. ¿Qué NO hace hoy?
7. ¿Qué datos usa la demo?
8. ¿Qué es un registro encadenado?
9. ¿Es un producto terminado? (Respuesta honesta: es un prototipo del hackathon, con las cifras y límites arriba.)

### 4.9 Pie
- **Contenido:** "Pulso firme en cada pago." Hecho por el Equipo 404 para el reto Blinka del Hackathon 30X. Enlace al repositorio. Contacto. Aviso: "Pulso no es una entidad financiera y no mueve dinero. Los datos de la demo son ficticios." Interruptor visible "Pausar animaciones" y selector de tema claro u oscuro.
- **Fuente:** aviso honesto cerca de la acción [MERC]. Control global de movimiento [WCAG222].

---

## 5. Reacción e interacción

### 5.1 Animaciones que sí
| Animación | Límites | Fuente |
|---|---|---|
| Demo del hero: la factura entra, se lee y recibe veredicto, **una sola vez**, con botón visible de pausa y repetir | No pasar de 5 s sin control, o correr una sola vez | [WCAG222][NNG-ANI] |
| Hover de tarjetas (el realce actual) | Solo `transform` y `opacity`. La sombra se anima con un pseudo-elemento que cambia de opacidad. Sin `will-change` preventivo en decenas de tarjetas. Duración 150 a 250 ms (criterio propio) | [WD-ANIM] |
| Aparición de secciones al hacer scroll | Mejora progresiva con `animation-timeline: view()` dentro de `@supports` y `no-preference`. Si el navegador no la soporta, todo ya se ve. Una vez por sesión | [CHR-SCR][NNG-ANI] |
| Respuesta del botón en la demo ("Leyendo…") | Primera respuesta visual en menos de 100 ms. La simulación larga corre después sin bloquear | [WD-INP][NNG-ANI] |
| Foco visible, cambio de estado, copiado con confirmación | Sin movimiento brusco | [NNG-ANI] |

**Prueba de cada animación:** ¿explica algo (cómo una factura pasa a PAGAR, FRENAR o ESCALAR) o solo decora? Si decora, se elimina [NNG-ANI].

### 5.2 Animaciones que no
- Carrusel que rota solo: en el estudio de NN/g la oferta principal solo se veía cerca del 20 % del tiempo [NNG-CAR]. Cerca del 1 % hacía clic y casi todo a la primera diapositiva [SIUC] (esa fuente es de militancia y cita datos de Erik Runyon: citarlo con cautela).
- Scrolljacking, secciones fijadas que obligan a desplazar, parallax de fondo, snapping obligatorio [WDD].
- Video de fondo en bucle compitiendo con el texto [WCAG222].
- Destellos de más de tres por segundo y parpadeo del semáforo PAGAR, FRENAR, ESCALAR [WD-MOT].
- Contadores que cuentan hacia arriba, ventanas emergentes con animación y cualquier movimiento en la periferia mientras se lee [NNG-ANI][NNG-POP].
- Animar altura o ancho de acordeones (empuja el texto). Se anima `transform` y `opacity` [WD-CLS].

### 5.3 Demo interactiva embebida frente a video
- **Recomendación:** mini demo interactiva en la página, con tres facturas de ejemplo (F-011 cuenta cambiada, F-016 instrucción oculta, F-017 lectura poco confiable). Corre del lado del navegador con respuestas pregrabadas, sin depender del servidor, y enlaza a la demo completa. Es "demo del producto en uso" [DC] y evita un video pesado que dañe el LCP [WD-VIT].
- **Video corto (opcional, segunda vuelta):** debajo del primer pantallazo, sin autoplay, con controles y subtítulos. Brex y otros lo usan como apoyo, no como héroe [BREX].
- **Por qué no depender del servidor en vivo:** el despliegue tiene límites y la demo debe cargar siempre.

### 5.4 Movimiento reducido y accesibilidad
- `prefers-reduced-motion: reduce` apaga todo `transform` y reveals. El contenido ya está visible por defecto [WD-MOT][WD-CLS].
- Un solo interruptor global "Pausar animaciones" en el pie, además de respetar la preferencia del sistema [WCAG222][WD-MOT].
- Más del 35 % de los adultos llega a tener algún trastorno vestibular a los 40 años, por lo que el movimiento molesto es común [WD-MOT].
- Scroll nativo, teclado y zoom al 200 % siempre funcionan.

### 5.5 Presupuesto de rendimiento (percentil 75, móvil y escritorio)
LCP de 2,5 s o menos, INP de 200 ms o menos y CLS de 0,1 o menos [WD-VIT]. Imágenes con `width` y `height` o `aspect-ratio` declarados [WD-CLS]. Se mide con Lighthouse y PageSpeed antes de publicar.

---

## 6. Estética

### 6.1 Extender la paleta y las tarjetas actuales
- **Se reutiliza el sistema de tarjetas y los tokens de color de la aplicación**, para que landing y producto parezcan lo mismo. No se crean colores nuevos de decisión.
- **Marino:** base del hero en modo oscuro y color de texto principal en modo claro.
- **Violeta:** acento del CTA primario y de los enlaces. Verificar que el texto sobre el botón cumpla el contraste.
- **Gris azulado:** bordes, superficies y fondos suaves. **Nunca para texto de cuerpo, notas ni CTA secundarios** sin medirlo en claro y oscuro. El texto de bajo contraste se lee peor y la gente confía menos en lo que cuesta leer [NNG-CON].
- **Tres variantes de tarjeta para la landing** (criterio propio): tarjeta de dolor, tarjeta de decisión y tarjeta de cifra. Todas con el mismo realce sutil al pasar el cursor.

### 6.2 Contraste
- Texto normal 4,5:1 como mínimo y 3:1 para texto grande (18 pt, o 14 pt en negrita). No se redondea: 4,499:1 no cumple [WCAG143].
- Para el cuerpo de la página apuntar a 7:1 por Carmen (criterio propio).
- Convertirlo en **prueba automática** de cada par texto y fondo de los tokens, en claro y oscuro, incluidos los estados de hover [WCAG143].

### 6.3 Tipografía y jerarquía
- Inter. Un solo H1. Cuerpo de 18 px en la landing y nada bajo 16 px (regla de `diseno-bottom-up.md`). Línea de 60 a 75 caracteres (criterio propio).
- Una sola jerarquía por sección. Si todo se enfatiza, nada destaca [NNG-HOME].
- Frases de 15 palabras o menos. Cero términos técnicos fuera de los plegables.

### 6.4 Color por decisión
- **PAGAR, FRENAR y ESCALAR** usan los tokens de decisión que ya existen en la app.
- **El color nunca va solo.** Siempre ícono más palabra, como en `diseno-bottom-up.md`. Así también se lee en modo oscuro y con daltonismo.
- No se usan esos colores como decoración fuera de las tarjetas de decisión, para que conserven su significado.

### 6.5 Modo claro y oscuro
- Sigue `prefers-color-scheme` y permite cambio manual. El fondo del `body` está definido explícitamente en ambos modos.
- Las capturas tienen versión clara y oscura (`<picture>`).

### 6.6 Capturas reales frente a ilustración
- **Capturas reales** de la aplicación con datos de Aurora Cloud, rotuladas "datos ficticios". Son la prueba más honesta de que el producto existe [DC].
- Ilustración solo para el problema (escena de chat) y con el mismo estilo de líneas de los íconos actuales.
- Texto alternativo en todas. Sin fotos de stock de personas, que insinúan clientes que no hay [FTC24].
- Diseño móvil primero: el 79 % de las visitas a landings de SaaS llega desde el móvil y el CTA debe verse sin desplazarse [UNB].

---

## 7. Métricas de éxito y cómo medirlas sin rastreadores invasivos

**Principio:** contadores agregados, sin cookies, sin identificar personas. Entonces no hace falta ventana de cookies [NNG-POP] (criterio propio).

| Métrica | Qué dice | Cómo se mide |
|---|---|---|
| Clic en el CTA primario sobre visitas | ¿El hero convence? | Contador de eventos agregado |
| Demo iniciada y completada (las 3 facturas vistas) | ¿Entendió el mecanismo? | Contador del lado del cliente, sin identificador |
| Inicios del bot de Telegram | ¿Pasó de mirar a probar? | Parámetro de origen en el enlace de Telegram (`?start=landing`), sin datos personales |
| Camino elegido en el selector "Soy…" | ¿Qué ICP responde? Valida o desmiente la hipótesis de la sección 1 [VPC] | Contador por opción |
| Envíos del formulario y errores por campo | ¿Dónde se pierde la gente? [BAY] | Contador de errores por tipo, sin guardar lo escrito |
| Web Vitals en el percentil 75 | ¿Cumple el presupuesto de la sección 5.5? | Lighthouse y PageSpeed |
| Prueba de 5 segundos con 5 personas | ¿Entienden qué es Pulso al primer vistazo? | Prueba cualitativa, incluyendo lectores lentos como Carmen y Mateo |

**Notas de método**
- Los puntos de referencia de Unbounce (móvil 6,4 % y escritorio 6,2 %; correo 16,9 %, búsqueda de pago 4,1 %, social de pago 2,9 %, display 0,3 %) son medianas de conversión de SaaS [UNB]. No los usamos como metas, porque nuestro CTA es una demo y no un registro, y el informe no declara su muestra ni su año con claridad. Primero medimos la línea de base propia.
- Con poco tráfico no hay A/B que valga. Se prueba cada pieza de prueba social y cada versión con usuarios, como pide NN/g [NNG-SOC]. Método propio.
- No se compra ni se sube nada a servicios de seguimiento de terceros.

---

## 8. Malas prácticas que NO haremos

| Mala práctica documentada | Por qué | Fuente |
|---|---|---|
| Contadores o cupos falsos | Falsa urgencia y falsa escasez | [DD][FTC22] |
| Testimonios, logos o clientes inventados | Prohibido por la regla de la FTC | [FTC24] |
| Carrusel automático en el hero | Oferta visible solo cerca del 20 % del tiempo | [NNG-CAR] |
| Ventana emergente de correo o de salida | Baja la confianza y bloquea el foco | [NNG-POP] |
| Texto de bajo contraste o gris sobre blanco en letra chica | Ilegible y baja la confianza | [NNG-CON][WCAG143] |
| Scrolljacking y parallax | Quita el control al lector | [WDD] |
| CTA genéricos ("Enviar", "Saber más") y pared de funciones | No dicen qué se obtiene | [NNG-HOME] |
| Titular vago ("radically different") o lema como único titular | Vago, no es beneficio | [MERC][STR] |
| Hero sin CTA visible | Debilita la acción inmediata | [BREX] |
| Dramatizar el problema | Pierde credibilidad | [PAS] |
| Afirmar auditoría sin enseñarla | La confianza queda genérica | [RAMP][VIC] |
| Movimiento sin pausa de más de 5 s o con destellos | Excluye a quien tiene sensibilidad al movimiento | [WCAG222][WD-MOT] |
| Animar altura, ancho o posición | Salta el diseño y daña el CLS | [WD-CLS] |
| Mensajes de error genéricos en el formulario | La gente se bloquea y abandona | [BAY] |
| Esconder límites del producto | Práctica de enterrar términos clave | [FTC22] |

**Lenguaje prohibido por decisión del equipo:** promesas de que el registro "no se puede tocar" (decir "delata manipulación"), cifras de autonomía no respaldadas por el set ciego, "detecta fraude" como promesa (el brief del reto deja el fraude y el cumplimiento fuera de alcance), "pagamos por Pix, SPEI o ACH" (decir "preparamos la instrucción de pago") y cualquier cifra de Blinka.

---

## Qué decidir ahora (5 líneas para Sebastián)

1. **Quién va en el hero:** recomiendo A1 (fundador o CFO de startup con equipo en LatAm) con un selector de tres caminos. Sin decisión, la página le habla a todos y no convence a nadie.
2. **Qué botón manda:** recomiendo "Ver cómo Pulso decide una factura" (la demo con datos ficticios). El bot de Telegram queda de segundo. No exige que nadie suba nada.
3. **Facturas reales de visitantes:** recomiendo no invitarlas hasta escribir un aviso de qué datos se guardan. Mientras tanto, solo facturas de ejemplo.
4. **Cifras antes de publicar:** hay que confirmar con el registro de resultados que 25 de 30, 10 documentos, 62 filas, 728 pruebas y 37 escenarios son los números vigentes, y con el mentor cómo cuenta un ESCALAR. Sin eso, el 83,3 % no se publica.
5. **Dónde se publica:** Vercel tiene un tope diario y el servidor alterno (equipo404.produfy.co) tiene `/team` en solo lectura. Recomiendo un sitio estático simple en el que esté disponible primero.

---

## Orden de construcción (si solo hay 2 horas)

| Minutos | Qué se construye |
|---|---|
| 0 a 15 | Tokens de color y tipografía copiados de la app, esqueleto móvil primero con hero (titular, subtítulo, CTA, aclaración) y pie. Sin selector todavía |
| 15 a 45 | Captura real de una factura decidida en el hero. Sección "Cómo funciona" (4 tarjetas) y las 3 tarjetas de decisión con ícono más palabra |
| 45 a 75 | Sección "Prueba" (cifras con método y el 44,4 % junto al 83,3 %) y sección "Seguridad y control humano" con captura de F-016 y `/registro` |
| 75 a 95 | "Oferta y CTA" (tres botones, fórmula de la calculadora estática con el ejemplo de juguete), bloque "Todavía no" y FAQ plegable |
| 95 a 110 | Revisión de accesibilidad: contraste medido por par de tokens en claro y oscuro, teclado, zoom al 200 %, `prefers-reduced-motion`, Lighthouse móvil |
| 110 a 120 | Pasada contra la tabla de la sección 8, comprobación de que no hay raya larga ni palabras prohibidas, y publicación |

**Segunda vuelta (no entra en 2 horas):** selector "Soy…", mini demo interactiva con las 3 facturas, calculadora interactiva, reveals con scroll, video corto, contadores de eventos agregados.

---

## Fuentes (todas verificadas por el equipo; salvedades al final de cada una)

- [UNB] Unbounce, Conversion Benchmark Report, SaaS: https://unbounce.com/conversion-benchmark-report/saas-conversion-rate/ (no declara muestra ni año con claridad)
- [DC] Demand Curve, above the fold: https://www.demandcurve.com/playbooks/above-the-fold
- [JS] Julian Shapiro, Landing Pages: https://julian.com/guide/growth/landing-pages
- [BAY] Baymard, mensajes de error adaptativos: https://baymard.com/research-articles/adaptive-validation-error-messages (investigación de checkout, aplicada por analogía)
- [STR] Stripe Atlas, copy de landing: https://stripe.com/guides/atlas/landing-page-copy
- [VPC] Strategyzer, Value Proposition Canvas: https://www.strategyzer.com/library/the-value-proposition-canvas
- [JTBD] Strategyn, plantilla de JTBD: https://strategyn.com/jobs-to-be-done-template/ (su uso para el subtítulo es inferencia nuestra)
- [PAS] Landing Rabbit, fórmula PAS: https://landingrabbit.com/blog/pas-formula
- [BREX] Brex: https://www.brex.com (la lectura del CTA débil es observación propia)
- [MERC] Mercury: https://mercury.com
- [DD] Deceptive Design, tipos: https://www.deceptive.design/types
- [FTC22] FTC, comunicado del informe de dark patterns (2022): https://www.ftc.gov/news-events/news/press-releases/2022/09/ftc-report-shows-rise-sophisticated-dark-patterns-designed-trick-trap-consumers (el PDF del informe no fue leído; leerlo antes de cerrar la lista de prohibidos)
- [FTC24] FTC, regla contra reseñas y testimonios falsos (2024): https://www.ftc.gov/news-events/news/press-releases/2024/08/federal-trade-commission-announces-final-rule-banning-fake-reviews-testimonials (regla de EE. UU.; en LatAm funciona como práctica de confianza y no se verificaron normas locales)
- [NNG-CAR] NN/g, carruseles automáticos: https://www.nngroup.com/articles/auto-forwarding/
- [SIUC] Should I Use A Carousel (datos de Erik Runyon): https://shouldiuseacarousel.com/ (fuente de militancia)
- [NNG-POP] NN/g, pop-ups: https://www.nngroup.com/articles/popups/
- [NNG-CON] NN/g, texto de bajo contraste: https://www.nngroup.com/articles/low-contrast/
- [WCAG143] W3C, contraste mínimo 1.4.3: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- [NNG-HOME] NN/g, principios de página de inicio: https://www.nngroup.com/articles/homepage-design-principles/
- [NNG-ESC] NN/g, escasez: https://www.nngroup.com/articles/scarcity-principle-ux/
- [NNG-DEC] NN/g, patrones engañosos: https://www.nngroup.com/articles/deceptive-patterns/
- [CIA] Influence at Work, 7 principios: https://www.influenceatwork.com/7-principles-of-persuasion/
- [NNG-SOC] NN/g, prueba social: https://www.nngroup.com/articles/social-proof-ux/
- [WD-MOT] web.dev, animación y movimiento: https://web.dev/learn/accessibility/motion
- [WCAG222] W3C, pausar, detener, ocultar 2.2.2: https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html
- [WD-VIT] web.dev, Web Vitals: https://web.dev/articles/vitals
- [WD-CLS] web.dev, Cumulative Layout Shift: https://web.dev/articles/cls
- [WD-ANIM] web.dev, animaciones de alto rendimiento: https://web.dev/articles/animations-guide
- [WD-INP] web.dev, Interaction to Next Paint: https://web.dev/articles/inp
- [CHR-SCR] Chrome for Developers, scroll-driven animations: https://developer.chrome.com/docs/css-ui/scroll-driven-animations (no trata accesibilidad: se añade `prefers-reduced-motion`)
- [NNG-ANI] NN/g, animación y movimiento: https://www.nngroup.com/articles/animation-usability/
- [WDD] Web Designer Depot, scrolljacking: https://webdesignerdepot.com/how-scrolljacking-breaks-ux-fundamentals/ (fuente secundaria)
- [RAMP] Ramp Intelligence: https://ramp.com/intelligence
- [VIC] Vic.ai: https://www.vic.ai/
- [STAM] Stampli: https://www.stampli.com/
- [TIPA] Tipalti: https://www.tipalti.com/

**Pendientes que bloquean la publicación:** (1) confirmar las cifras no presentes en los archivos leídos (25 de 30, 10 documentos ciegos, 62 filas, 728 pruebas, 37 escenarios); (2) definir cómo cuenta un ESCALAR en la autonomía; (3) fijar los números de factura de Aurora Cloud para los ejemplos de duplicado y de sobreprecio; (4) confirmar si la detección de notas de crédito y proformas ya está implementada; (5) redactar el aviso de datos del bot antes de aceptar facturas reales.