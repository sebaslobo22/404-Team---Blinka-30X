# Marco ejecutivo y roadmap definitivo — Equipo 404 · Reto Blinka

**Emitido:** 17/10/2026 - 11:15 a.m. (Caracas, Venezuela)
**Fuentes consolidadas:** brief oficial, metaprompt de Sebastián, diagrama de flujo del equipo (10:22 a.m.),
investigación de Joffre (`investigacion-joffre.md`), ruta MVP de Andrés (`equipo/ruta-mvp-andres.html`) y
el código ya construido (`src/motor`, 37 pruebas en verde).
**Versión compartible:** artefacto "Marco Blinka 404" (enlace en el chat / CLAUDE.md).

## 1. En una frase
Un agente que lee facturas con IA, decide con reglas en código si PAGAR, FRENAR o ESCALAR, y explica cada
decisión para que una persona de finanzas la entienda sin abrir el código.

## 2. Qué decide el reto (y cómo lo jugamos)
| Criterio | Cómo se gana | Nuestra jugada |
|---|---|---|
| Seguridad (binario) | Cero pagos fuera de reglas | La IA no decide; 11 comprobaciones; solo paga si todas dan ok; falla cerrada |
| Autonomía (%) | Decidir bien sin personas | FRENAR cuenta como autónomo; ESCALAR solo cuando una persona aporta algo |
| Explicabilidad | Registro legible por no técnicos | Explicación en texto por decisión + JSON técnico aparte |

## 3. Estado real a las 11:15 a.m. del sábado
- **Hecho y probado:** motor de reglas (11 comprobaciones), reglas en JSON editables, set de 12 facturas
  (F01–F12) con sus respuestas, 37 pruebas (incluye 5.000 facturas al azar contra un verificador
  independiente). Commits hasta `bf4e37d`.
- **No hecho:** lector de facturas (bloqueado por la clave de OpenRouter), archivos reales de las
  facturas (PDF/imagen/correo/chat), registro inmutable, pantalla, despliegue, video, README.
- **Tiempo:** cierre domingo 18/10 12:00 Colombia (1:00 p.m. Caracas) → ~25 h, de las cuales ~8 son de sueño.

## 4. Decisiones cerradas (no se reabren)
1. **Stack:** Next.js (JavaScript) en Vercel. El motor ya existe en JavaScript; cambiar a Python
   tiraría 37 pruebas. Registro en **Supabase** (tabla solo de insertar, con triggers que bloquean
   UPDATE/DELETE) porque Sebastián ya lo conoce y permite demo pública con estado. **Plan B** si
   Supabase cuesta más de 1 h: archivo JSON solo de añadir con hash encadenado.
2. **Modelos (vía OpenRouter):** lectura 1 `anthropic/claude-haiku-5.5` sin razonamiento; lectura 2
   `openai/gpt-6-luna` (empresa distinta: sus errores no coinciden). Si difieren en monto, moneda,
   beneficiario o cuenta → ESCALAR. Se mide con el banco de pruebas antes de fijarlo.
3. **Demo pública en modo replay:** las extracciones se guardan con fecha y modelo; el sitio
   desplegado no lleva ninguna clave. El modo en vivo solo se muestra en el video.
4. **Reparto:** Sebastián + Claude: extracción, facturas reales, banco de pruebas. Andrés: registro,
   pantalla, despliegue. Joffre: set ciego (no puede haber escrito las reglas) y suite adversarial.
   Integrador del contrato entre piezas: Sebastián (los esquemas ya están en `data/casos/casos.json`
   y en la salida de `decidir()`).

## 5. Roadmap definitivo (hora Caracas; Colombia = −1 h)
| # | Bloque | Cuándo | Dueño | Puerta de salida |
|---|---|---|---|---|
| 0 | Motor + set + pruebas | ✅ hecho 10:50 a.m. | Claude/Sebastián | 37/37 en verde |
| 1 | Clave OpenRouter + 12 facturas en formato real + banco de modelos | sáb 11:30 a.m.–2:30 p.m. | Sebastián | Las 12 pasan por 2 modelos; tabla de aciertos, tiempo y costo |
| 2 | Extractor doble + validación + replay guardado | sáb 2:30–5:00 p.m. | Sebastián | Set completo de punta a punta sin tocar el motor; F10 y F11 escalan por la lectura |
| 3 | Registro inmutable + pantalla (reglas, decisiones, cola) | sáb 12:00 m.–7:00 p.m. (en paralelo) | Andrés | Una decisión viaja factura → registro → pantalla; editar/borrar un registro se bloquea |
| 4 | Suite adversarial (≥30 casos) + set ciego congelado | sáb 12:00 m.–8:00 p.m. (en paralelo) | Joffre | Set ciego entregado cerrado; nadie lo abre hasta el domingo |
| 5 | Integración + despliegue replay + video corto | sáb 7:00–11:00 p.m. | Todos | **Hito V1 11:00 p.m.:** repo, video y demo abren desde un navegador sin sesión |
| 6 | Endurecer: correr set ciego, README, video final (≤3 min) | dom 7:00–11:00 a.m. | Todos | Sin funciones nuevas; x/n del set ciego reportado con honestidad |
| 7 | Revisión final y envío | dom 11:00 a.m.–12:30 p.m. | Todos | Tres enlaces verificados. Cierre 1:00 p.m. |

## 6. Si falta tiempo, se corta en este orden
1. JEV (TypeSafe) → no se intenta.
2. Hash encadenado → quedan los triggers de Supabase (o el JSON solo de añadir).
3. Canales imagen/correo/chat como archivos reales → quedan texto y PDF; los demás como texto plano declarado.
4. Segunda lectura con otro modelo → queda una lectura + validación literal contra el texto.
5. Refinamientos de la cola de aprobación → queda aprobar/rechazar con registro.
6. Escenarios nuevos (nómina, adaptador QuickBooks) → **no entran** desde ya.

## 7. Lo que nunca se corta
- El modelo no decide. Decide `src/motor/motor.js`, con sus pruebas.
- FRENAR no tiene botón de aprobar. Solo ESCALAR llega a una persona.
- Ningún endpoint mueve dinero; la salida es una instrucción de pago.
- Sin claves en el repo ni en el demo; demo público en modo replay.
- Si la prueba "ninguna trampa termina en PAGAR" falla, no hay demo.

## 8. Puntos ciegos, vulnerabilidades y mitigación
| # | Vulnerabilidad | Cómo nos hundiría | Mitigación | Estado |
|---|---|---|---|---|
| 1 | Nadie tiene saldo de API | Sin lector, sin demo | OpenRouter con USD 5; plan B: extracciones escritas a mano, declaradas en README | Abierto (Sebastián) |
| 2 | La confianza que reporta el modelo no prueba nada | Dato inventado con 95 % | Doble lectura con dos empresas + cada dato debe aparecer literal en el texto + cotejo con el registro de proveedores | Diseñado |
| 3 | Instrucción oculta en la factura con palabras no previstas | El detector de frases la deja pasar | El lector no tiene herramientas ni reglas; el motor igual exige proveedor, cuenta y monto acordados → lo peor es pagar lo que ya se debía | Mitigado parcial |
| 4 | Editar reglas desde la pantalla es un vector | Alguien sube el límite y el agente "cumple" | Cada decisión guarda la versión de reglas; cambios de reglas se registran (quién, cuándo, antes/después); el esquema se valida al cargar (`prepararReglas` lanza error → ESCALAR) | Por construir (Andrés) |
| 5 | Dos aprobaciones a la vez rompen el presupuesto | Se aprueban USD 2.750 + USD 2.750 con USD 3.000 | Al aprobar, el motor vuelve a evaluar con el estado actual; un solo escritor del estado | Por construir |
| 6 | Tasas de cambio fijas | COP mal valorado | Declararlo; las tasas viven en las reglas y se muestran en cada explicación | Aceptado |
| 7 | El set lo diseñamos nosotros para pasar | Autonomía inflada | Set ciego armado por Joffre, congelado el sábado, reportado x/n aunque duela | Por hacer |
| 8 | Duplicado con número casi igual y >30 días | Doble pago | Mismo monto en 30 días ya frena; agregar distancia de edición del número a la suite adversarial | Baja prioridad |
| 9 | Lectura local (Qwen) no sirve en demo desplegada | Demo muerta | Lector intercambiable; demo en replay | Resuelto por diseño |
| 10 | "¿Cómo cuenta un ESCALAR para la autonomía?" | Medimos distinto que el jurado | Preguntar al mentor de 30X; mientras tanto reportar dos cifras: decididas sin persona y decididas correctamente | Abierto (Andrés) |
| 11 | Hora de cierre distinta entre documentos | Entregar tarde | Fijada: dom 12:00 Colombia = 1:00 p.m. Caracas; V1 el sábado 11:00 p.m. | Cerrado |
| 12 | Tres personas, ~25 h, 3 zonas de trabajo | Integración de última hora | Esquemas ya fijos en `casos.json`; integración empieza 7:00 p.m., no 11:00 p.m. | Diseñado |
| 13 | Pitch con afirmaciones no verificables (afirmaciones sin fuente sobre el patrocinador, "USD 2.3B") | Perder credibilidad ante Blinka | No usar; el pitch se apoya en el set ciego y las pruebas | Acordado |
| 14 | Factura legítima pero vencida | Bloquearla deja deudas sin pagar | No es regla; se muestra como aviso | Acordado |

## 9. Qué cambia respecto a la ruta de Andrés
- **Stack:** se cierra en Next.js + Supabase + Vercel (motor ya en JavaScript).
- **Paso 2 "Núcleo sin IA" ya está hecho.** Joffre pasa a set ciego + suite adversarial desde el mediodía.
- **Doble pasada = dos modelos de empresas distintas**, no el mismo dos veces.
- **Dataset:** 12 casos listos (F01–F12); se llega a 15 con moneda ambigua, beneficiario casi idéntico y
  monto en palabras, que salen de la suite adversarial.
- **Crédito de API:** se resuelve con OpenRouter (USD 5), sin depender del crédito del hackathon.
- **Nómina y adaptador QuickBooks** se descartan desde ahora, no "si falta tiempo".
- **Horas:** su ruta está en hora Colombia; este marco en Caracas (+1 h).
