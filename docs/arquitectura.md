# Pulso: arquitectura y canales

Volver al [README](../README.md). Rutas HTTP y MCP: [`api.md`](api.md).

## Prueba con tu factura (subida web en vivo)

En `/probar` cualquier persona sube una foto (JPG o PNG) o un PDF con texto, desde el teléfono o la computadora, y recibe la decisión de Pulso con sus razones. Es el mismo lector, el mismo motor y el **mismo techo en vivo que el bot de Telegram**: código en `src/vivo/`, ruta `app/api/vivo/route.ts`, pantalla `app/probar/`.

- **Apagada por defecto.** Solo se activa con `LECTURA_EN_VIVO=1` y `OPENROUTER_API_KEY` a la vez. Sin eso, el enlace no aparece en el menú, `/probar` explica que está apagada y la API responde 503. El demo del jurado en modo replay no cambia.
- **Nunca PAGAR.** Después del motor se aplica `aplicarTechoEnVivo` (de `src/telegram/techo.ts`): una factura que copia exactamente a un proveedor registrado de Aurora y queda dentro del acuerdo sale ESCALAR, no PAGAR (`tests/vivo.test.ts`). Un proveedor desconocido se frena. Si un modelo falla, o si OpenRouter responde con un modelo distinto al pedido, no hay pago.
- **Mismas reglas que la demo.** Decide con las reglas de Aurora Cloud tal como están en la pantalla de reglas y con los pagos de la demo en el historial (para detectar duplicados). No toca el estado compartido: la factura subida no entra al registro, a la cola ni a las órdenes, y otro visitante no la ve.
- **Archivo.** 4 MB como máximo, tipo por firma de bytes (misma validación que Telegram). Las fotos HEIC del iPhone y los PDF escaneados sin texto se rechazan con un mensaje claro antes de gastar lecturas. El archivo se envía a los dos modelos por OpenRouter (sin proveedor de reemplazo y con `data_collection: deny`); Pulso no lo guarda.
- **Límites.** 5 lecturas por visitante por hora y un tope global diario (`VIVO_POR_VISITANTE_HORA`, `VIVO_GLOBAL_DIA`, 150 por defecto). Se cuentan en memoria del proceso: en un despliegue sin servidor se reinician en cada arranque en frío, así que **el techo real de gasto es el límite de crédito de la clave de OpenRouter**, que se fija en su panel.

## Canal Gmail (buzón del equipo)

Se reenvía a un buzón de Gmail del equipo un correo con la factura adjunta y, en uno o dos minutos, llega la decisión de Pulso en el mismo hilo. Un script de Google Apps Script en ese buzón (`integraciones/gmail/Codigo.gs`) manda el adjunto a `POST /api/canal/gmail` con un secreto compartido; la ruta usa la misma lectura, el mismo motor y el mismo techo en vivo que `/probar` y Telegram, y responde el texto que el script pone en el hilo. Nunca PAGAR.

- **Apagado por defecto:** sin `GMAIL_CANAL_SECRETO` (24 caracteres o más) y `OPENROUTER_API_KEY`, la ruta responde 503. Con un secreto equivocado, 401.
- **Adjunto de hasta 3 MB** (Vercel corta el cuerpo de la petición a 4,5 MB), PDF con texto, JPG o PNG.
- **Reintentos en el script:** hasta 3 vueltas ante fallas de red, 401, 503 o 5xx; luego avisa a quien escribió y etiqueta `Pulso/Error`. Candado para que dos vueltas no procesen el mismo hilo.
- **Límites:** 5 por remitente por hora y un tope diario (`GMAIL_POR_REMITENTE_HORA`, `GMAIL_GLOBAL_DIA`), en memoria; el techo real de gasto es el límite de crédito de la clave de OpenRouter.
- Instalación paso a paso, comportamiento y seguridad: [`integraciones/gmail/README.md`](../integraciones/gmail/README.md).

## Bot de Telegram

El jurado manda una foto o un PDF de una factura a un bot y recibe la decisión de Pulso con sus razones en frases llanas y un enlace al producto. Es el mismo lector (doble lectura Claude Haiku 5.5 + Gemini 3.1 Flash-Lite por OpenRouter) y el mismo motor `decidir` con el contexto y las reglas de Aurora Cloud del demo. Código en `src/telegram/`, webhook en `app/api/telegram/route.ts`.

- **Techo en vivo:** toda factura que entra por Telegram termina como máximo en ESCALAR (`aplicarTechoEnVivo`, función pura aplicada después del motor, con la razón "Entrada en vivo: siempre la revisa una persona"). FRENAR sigue siendo FRENAR. Una copia exacta de un proveedor registrado, dentro del acuerdo, no sale PAGAR. El motor no se tocó.
- **Aprobación:** solo lo ESCALADO, solo en chat privado y solo para `TELEGRAM_DUENO_ID`. El dueño recibe un aviso con botones Aprobar/Rechazar; FRENAR nunca trae botones. La resolución es un UPDATE condicional atómico en Supabase. Las órdenes en vivo son **simuladas**: no entran al lote CSV ni a la API de órdenes de la web, y Pulso no mueve dinero.
- **Fallas cerradas:** cabecera secreta del webhook verificada en tiempo constante (sin secreto configurado, rechaza todo); `update_id` repetidos descartados con un INSERT atómico; si un modelo falla, tarda o responde un modelo distinto al pedido, no hay PAGAR (mensaje "no pude leerla" o ESCALAR). Sin Supabase, el bot no procesa nada.
- **Límites:** 5 facturas por chat por hora y tope global diario (`TELEGRAM_TOPE_DIARIO`, 100 por defecto), contados de forma atómica en Supabase; archivos de hasta 4 MB, solo PDF/JPG/PNG (tipo por firma de bytes). Sin `/start` previo el bot no procesa archivos.
- **Variables:** `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_DUENO_ID`, `TELEGRAM_TOPE_DIARIO`, `PULSO_URL_PUBLICA`, `OPENROUTER_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (ver `.env.example`). Antes de usarlo, aplicar las migraciones `0003_telegram.sql` y `0004_empresas.sql` (`node scripts/migrar.mjs`).
- **Registrar el webhook** (una vez, en el despliegue): `curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" -d url=https://<dominio>/api/telegram -d secret_token=<TELEGRAM_WEBHOOK_SECRET> -d 'allowed_updates=["message","callback_query"]'`.
- **En local (sin webhook):** con un bot de desarrollo y las variables en `.env.local`, `npx vite-node scripts/telegram-local.ts` (estado en memoria) o con `--supabase` (estado en la base). Hace long polling con `getUpdates` y usa el mismo manejador que el webhook; si el bot tiene un webhook activo, avisa y sale. Cada factura gasta centavos de OpenRouter.

### Empresas en el bot (onboarding)

Cada chat pertenece a **una empresa** y sus facturas se deciden con los proveedores y el límite de **esa** empresa; solo las aprueba **su dueño**. Así diez personas pueden usar el bot a la vez sin que sus facturas se mezclen.

- `/start`: explica qué hace Pulso con el archivo y deja a la persona en la empresa de prueba (Aurora Cloud).
- `/crear Nombre`: crea una empresa y quien la crea queda como **dueño** (aprueba). Recibe un código `PULSO-XXXXXX` para su equipo. Un segundo `/crear` devuelve la misma empresa.
- `/unirme PULSO-XXXXXX`: entra al **equipo** de esa empresa: envía facturas, no aprueba. Los intentos cuentan contra el mismo cupo de las facturas.
- `/proveedor ID-FISCAL CUENTA Nombre` y `/limite 1000|5000|10000|25000`: solo el dueño. Los proveedores los escribe el dueño, nunca salen de una lectura del modelo. Una empresa nueva frena a todo proveedor que no esté en su lista (R2); uno recién agregado escala por cuenta nueva (R8). Sin acuerdos ni presupuestos cargados, el motor escala (falla cerrada).
- `/empresa` y `/ayuda`. Todo comando de empresa funciona solo en chat privado. Un dueño no se cambia de empresa con un comando (la dejaría sin quien apruebe).
- **Una sola regla de aprobación** (`aprobadorDe` en `src/telegram/empresas.ts`), usada para el aviso, para los botones y para el clic: demo → `TELEGRAM_DUENO_ID`; otra empresa → su dueño; factura sin empresa → nadie.
- Migración `supabase/migrations/0004_empresas.sql`: tablas `telegram_empresas`, `telegram_miembros` y `telegram_proveedores`, columna `empresa_id` en `telegram_facturas`, la demo como fila real y la función `telegram_crear_empresa` (crea empresa y dueño en una transacción). Pasa los chats y facturas existentes a la demo. **Aplicarla antes de desplegar este código.**

### Conversación con IA (texto suelto)

Un texto que no es comando ni archivo (por ejemplo "¿qué puedes hacer?") lo responde un modelo de texto (Gemini 3.1 Flash-Lite por OpenRouter, mismo proveedor fijo y sin retención). El modelo solo redacta: no decide, no paga, no aprueba ni cambia nada. Código: `src/telegram/conversacion.ts`.

- **Qué ve el modelo:** un prompt fijo y una ficha armada por código con un almacén de solo lectura: nombre de la empresa, rol, límite, número de proveedores, facturas pendientes y como mucho las últimas 5 decisiones (id corto, proveedor, monto, decisión). Nunca cuentas, ID fiscal, código `PULSO-XXXXXX`, texto de facturas ni razones libres. Mensaje de máx. 500 caracteres, sin historial.
- **Qué sale:** JSON `{"texto"}` y un filtro determinista que falla cerrado (máx. 600 caracteres; sin URLs ajenas, UUID, códigos, 8+ dígitos, claves ni frases de "ya lo hice"). Si algo no cuadra, o el modelo falla o tarda más de 12 s, se envía la ayuda fija. Texto plano, nunca botones. En grupos solo hay ayuda fija.
- **Cupo propio:** `CHAT_POR_USUARIO_HORA` (20) y `CHAT_GLOBAL_DIA` (300), separado del de facturas. Vive en la memoria del proceso (la RPC `telegram_consumir_cupo` comparte el tope diario con las facturas), así que en un despliegue sin servidor cada instancia cuenta aparte: el techo real de gasto es el crédito de OpenRouter. Al agotarse, frase fija sin llamar al modelo.
- **Interruptor:** `CHAT_IA=0` lo apaga (por defecto está encendido si hay `OPENROUTER_API_KEY`). Pruebas: `tests/telegram-conversacion.test.ts`.
- La lectura de facturas reintenta una vez, solo ante error de red o timeout (no ante una respuesta inválida); el techo en vivo se sigue aplicando después.

### Qué datos guarda el bot y para qué

| Tabla | Qué guarda | Para qué |
|---|---|---|
| `telegram_chats` | chat y usuario que escribieron `/start`, y cuándo | no se lee ningún archivo sin haber explicado antes qué se hace con él |
| `telegram_updates` | id de cada mensaje recibido | Telegram reintenta: así no se procesa dos veces la misma factura |
| `telegram_empresas` | nombre, código, dueño y límite por pago | separar las empresas y saber quién aprueba |
| `telegram_miembros` | a qué empresa pertenece cada chat y con qué rol | decidir con las reglas correctas y que el equipo no apruebe |
| `telegram_proveedores` | ID fiscal, cuenta, nombre y fecha de alta, por empresa | la lista de proveedores aceptados (R2) y la antigüedad de la cuenta (R8) |
| `telegram_facturas` | empresa, chat, decisión, decisión del motor, razones, proveedor, número, monto y estado de la aprobación. **No guarda el archivo** | historial y aprobación del dueño; la tabla prohíbe guardar un PAGAR |
| `telegram_uso` | una fila por factura o intento aceptado | límites por chat y por día; se borra a los 2 días |

Todas tienen RLS activado sin políticas: solo el servidor las lee y escribe. Fuera de Supabase, el archivo va a OpenRouter (Claude y Gemini) para leerlo, sin proveedor de reemplazo y con `data_collection: deny`, y las respuestas salen por Telegram.

## Seguridad

- Datos 100% ficticios. Ninguna clave en el repositorio.
- Las claves van solo en variables de entorno (ver `.env.example`).
- El demo público corre en modo replay, sin ninguna clave desplegada.
- El texto de una factura es dato no confiable, nunca instrucción.
- Las reglas son política interna de pago de una empresa ficticia, no normativa legal.

## Motor de reglas

`src/engine/`: función pura `decidir(facturaId, factura, contexto, config)` que devuelve PAGAR, FRENAR o ESCALAR con razones, hechos y explicación por plantilla. Dinero en centavos enteros, conversión a USD redondeando hacia arriba, ante error interno ESCALAR.

```
npm ci
npm test          # pruebas: motor, sets, propiedades, registro, lector, estado de la demo y set externo
npm run typecheck
```

Las propiedades comparan el motor con un oráculo independiente escrito con BigInt: el motor decide PAGAR si y solo si el oráculo lo permite. Además se verifica que nunca lanza error, que es determinista, que no modifica sus entradas y que toda cifra de la explicación sale de los hechos del motor.

Supuestos pendientes de confirmar con el dataset del equipo: una cuenta nueva debe estar registrada en la lista de beneficiarios con su fecha de alta (una cuenta no registrada se frena por R2; una registrada hace menos de 3 días escala por R8); la tolerancia de R6 aplica en ambos sentidos; sin presupuesto configurado para la categoría se escala.


## Registro con hash encadenado

`src/ledger/`: cada decisión se añade a un registro donde el hash de cada entrada incluye el de la anterior (SHA-256 sobre JSON canónico). `verificarCadena` detecta cambios de una decisión, de un monto o de cualquier campo, entradas borradas, insertadas o reordenadas. Las escrituras se serializan y, si el almacen no puede escribir, la llamada falla y la decisión no debe publicarse.

Es evidencia de manipulacion, no inmutabilidad: quien controle el almacen puede reescribir toda la cadena con hashes recalculados, y recortar el final no se nota. Eso solo lo delata un ancla (número de entradas y hash de la última) guardada aparte, que `Registro.ancla()` produce y `verificar(ancla)` comprueba.

Para Supabase, `supabase/migrations/0001_registro.sql` crea la tabla con triggers que bloquean UPDATE, DELETE y TRUNCATE y que exigen índice consecutivo y hash previo correcto. Se aplicó y se verificó en el Supabase del equipo (la clave pública recibe "permission denied" sobre la tabla del registro). El demo público no la usa: guarda el registro en memoria. El esquema de una entrada está en `esquemas/registro.schema.json`.

## Pantallas (modo replay)

```
npm run dev      # http://localhost:3000
npm run build && npm start
```

- `/` Decisiones: las 18 facturas (F-001 a F-018) con decisión, reglas activadas y estado de aprobación.
- `/facturas/F-0xx` Detalle con la traza de las reglas y las defensas, la explicación, el registro y la instrucción de pago.
- `/cola` Cola de aprobación, solo para ESCALAR. Las facturas FRENAR aparecen sin botón y el servidor rechaza (403) cualquier intento de aprobarlas.
- `/reglas` Reglas editables. Guardar crea una nueva versión, vuelve a evaluar las 18 facturas y borra las aprobaciones de la sesión.
- `/registro` Registro encadenado, verificación y una simulación de manipulación para mostrar que se detecta.

El modo replay no llama a ningún modelo ni usa claves: reproduce las 18 lecturas reales grabadas en `data/facturas/lecturas/` (doble lectura con dos modelos). El estado vive en la memoria del servidor: en un despliegue sin servidor cada instancia tiene el suyo y todos los visitantes comparten el de su instancia. Un visitante puede reiniciar o cambiar las reglas para los demás.

## Defensas visibles en la traza

El detalle de cada factura (`/facturas/F-0xx`) muestra, además de R1 a R8, las tres defensas del motor con su resultado (Cumple, No cumple (ESCALAR), No evaluada o No aplica) y la cifra o evidencia que las explica:

- **Instrucciones ocultas en la factura** (`INYECCION`): cuántos fragmentos detectó el motor y cuáles. Si la factura trae `texto_fuente`, se muestra en un bloque aparte con los fragmentos detectados resaltados. Es dato, nunca instrucción. Caso de ejemplo: `/facturas/F-016`.
- **Confianza de la lectura** (`CONFIANZA`): la confianza reportada frente al mínimo exigido. Si el lector no la reportó, dice «Sin dato de confianza (el lector no la reportó)». Caso de ejemplo: `/facturas/F-017`.
- **Nombre coincide con el registro** (`REGISTRO`): el ID fiscal y la cuenta existen pero el nombre leído no es el registrado. Va como «No aplica» si R2 no encontró la cuenta, porque no hay nombre con el cual comparar. Caso de ejemplo: `/facturas/F-018`.

Las tres terminan en ESCALAR: llegan a la cola y una persona decide. Aprobar emite una instrucción de pago con origen `PERSONA`; sin esa aprobación no sale ninguna. FRENAR sigue sin aprobación posible, y si R7 corta la evaluación, las demás reglas aparecen como «No evaluada».

En la pantalla de decisiones, «Coinciden con la decisión esperada» (18 de 18) se calcula sobre el set de desarrollo con el que se afinaron las reglas: no mide generalización. Eso se contrasta con el set externo (ver "Lo que medimos y lo que no").
