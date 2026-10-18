# Pulso: pulso firme en cada pago

Agente de pagos del **Equipo 404** para el reto Blinka del Hackathon 30X. Lee una factura (PDF, imagen, correo o chat), decide **PAGAR, FRENAR o ESCALAR** con las reglas de la empresa, explica cada decisión y la deja en un registro donde cualquier alteración se nota. **Nunca mueve dinero:** prepara la orden y una persona la ejecuta en Blinka.

- **Demo en vivo:** https://equipo404.produfy.co (datos ficticios, sin inicio de sesión) · **en una página:** https://equipo404.produfy.co/conoce · **bot:** https://t.me/pulso404_dev_bot
- **Lo medido:** 0 pagos indebidos en todos los sets; 25 de 30 decididas sin persona en un set ciego de mezcla realista (83,3 %). Cómo se midió y qué no: [`docs/evidencia.md`](docs/evidencia.md).
- **Qué es y cómo decide**, con el diagrama de 7 hitos y la hoja de ruta: [`docs/producto.md`](docs/producto.md). **Arquitectura y canales:** [`docs/arquitectura.md`](docs/arquitectura.md). **Rutas HTTP y MCP:** [`docs/api.md`](docs/api.md).

## Instálalo en 30 minutos

Esta guía deja Pulso funcionando de cero, para una persona o para una IA como Claude Code. Cada paso termina en una **Comprobación**: si no da lo esperado, no sigas. Puedes parar en cualquier paso; cada uno enciende una capacidad más.

| Paso | Qué queda funcionando | Cuenta o clave | Minutos |
|---|---|---|---|
| 1-3 | La demo completa en tu computadora (18 facturas, modo replay) | Ninguna | 5 |
| 4-5 | Lectura de facturas nuevas con IA (`/probar`) | OpenRouter | 5 |
| 6 | Base de datos para el bot | Supabase | 5 |
| 7 | Bot de Telegram en local | Telegram | 5 |
| 8-9 | Despliegue público y bot con webhook | Vercel | 10 |
| 10-11 | Canal de Gmail y MCP en Claude Code (opcionales) | Gmail | 10 |

> **Para una IA que siga esta guía:** no pegues claves en el chat ni en archivos versionados (`.env*` ya está en `.gitignore`), no crees cuentas por la persona y no actives pagos reales: Pulso no los tiene. Cuando un paso pida una cuenta o una clave, detente y pídesela a la persona.

### 1. Requisitos

| Qué | Para qué | Notas |
|---|---|---|
| Node 20.12 o más nuevo, y Git | todo | Se probó con Node 24. El bot local usa `process.loadEnvFile`, que existe desde 20.12 |
| Cuenta de [OpenRouter](https://openrouter.ai) **con límite de crédito** | leer facturas con IA | Cada factura cuesta fracciones de centavo. El límite de la clave es el único techo de gasto real |
| Cuenta de [Supabase](https://supabase.com) | estado del bot | El plan gratuito alcanza |
| Telegram y [@BotFather](https://t.me/BotFather) | el bot | Un bot para local y otro para producción |
| Cuenta de Vercel | despliegue | Opcional si solo lo corres en local |

**En Windows, corre los comandos en Git Bash** (viene con Git). En PowerShell, `curl` es otro programa y los ejemplos fallan.

**Comprobación:** `node -v` imprime `v20.12` o más y `git --version` responde.

### 2. Clonar e instalar

```bash
git clone https://github.com/sebaslobo22/404-Team---Blinka-30X.git pulso
cd pulso
npm ci
```

**Comprobación:** `npx tsc --noEmit` no imprime nada y `npm test` termina sin fallos.

### 3. Correr la demo (sin claves)

```bash
npm run dev
```

**Comprobación:** `http://localhost:3000` muestra las 18 facturas (la primera visita abre antes una bienvenida) de Aurora Cloud (empresa ficticia). `curl http://localhost:3000/api/ordenes` devuelve `"n":4`. La demo lee lecturas grabadas y no llama a ninguna IA.

### 4. Crear `.env.local`

```bash
cp .env.example .env.local
```

Todas las claves van en **ese único archivo** (o en las variables del despliegue), nunca en el repo. Solo las dos de Supabase marcadas abajo llevan el prefijo `NEXT_PUBLIC_`. Deja vacío lo que no uses:

| Variable | Hace falta para | De dónde sale |
|---|---|---|
| `OPENROUTER_API_KEY` | leer facturas en vivo (web, bot, correo, MCP) | OpenRouter → Keys → Create key, con límite de crédito |
| `LECTURA_EN_VIVO` | la subida web `/probar` | Pon `1`. Sin esto, `/probar` y `/api/vivo` quedan apagadas |
| `NEXT_PUBLIC_SUPABASE_URL` | bot y centro de mando | Supabase → Project Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | bot y centro de mando | Supabase → Project Settings → API → `service_role`. Solo en el servidor |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | solo el centro de mando `/team` | Supabase → Project Settings → API → `anon` |
| `SUPABASE_DB_URL` | solo para aplicar migraciones (paso 6) | Supabase → Project Settings → Database → Connection string → URI, con la contraseña |
| `TELEGRAM_BOT_TOKEN` | bot | BotFather, paso 7 |
| `TELEGRAM_DUENO_ID` | que alguien apruebe en el bot | Tu id numérico de Telegram, paso 7 |
| `TELEGRAM_WEBHOOK_SECRET` | webhook en producción | Lo generas tú, paso 9 |
| `PULSO_URL_PUBLICA` | enlace en las respuestas | La URL de tu despliegue, sin barra final |
| `GMAIL_CANAL_SECRETO` | canal de correo | Lo generas tú, 24 caracteres o más, paso 10 |
| `MODO_PUBLICO` | solo para ocultar `/team` en un enlace público | Pon `1` en ese despliegue y en ningún otro |

Las demás variables de `.env.example` son límites con valor por defecto (`VIVO_*`, `GMAIL_*_HORA`, `TELEGRAM_TOPE_DIARIO`, `CHAT_*`) o ajustes de los scripts de medición (`EXTRACTION_MODE`). No hacen falta para arrancar.

**Comprobación:** `.env.local` existe y `git status` no lo lista.

### 5. Lectura en vivo con OpenRouter

1. En OpenRouter crea una clave y **fija su límite de crédito** (por ejemplo 5 USD). Los topes por visitante de Pulso viven en memoria y no lo reemplazan.
2. En `.env.local` pon `OPENROUTER_API_KEY=...` y `LECTURA_EN_VIVO=1`. Reinicia `npm run dev`.

```bash
curl http://localhost:3000/api/vivo
curl -X POST http://localhost:3000/api/vivo -F factura=@data/facturas/F-001-luz-andina.pdf
```

**Comprobación:** el primero responde `{"activa":true}`. El segundo trae `"ok":true`, una `decision` `ESCALAR` o `FRENAR` (**nunca `PAGAR`**: todo lo que entra en vivo lo revisa una persona) y un `costo_usd` de fracciones de centavo. También puedes subirla en `http://localhost:3000/probar`.

### 6. Base de datos en Supabase

1. Crea un proyecto **tuyo** en Supabase y copia sus claves y `SUPABASE_DB_URL` a `.env.local`.
2. Aplica las migraciones. El script las corre en orden, cada una en una transacción, y anota las aplicadas en `public._migraciones`:

```bash
node scripts/migrar.mjs
```

**Comprobación:** imprime `+ 0001_registro.sql aplicada` y lo mismo para 0002, 0003 y 0004. Si lo corres otra vez, imprime `(ya aplicada)` en las cuatro. En Table Editor aparecen, entre otras, `telegram_empresas` y `telegram_facturas`. Si una migración falla, el script la revierte, dice cuál fue y se detiene.

### 7. Bot de Telegram en local

1. En [@BotFather](https://t.me/BotFather): `/newbot`, elige nombre y usuario, y copia el token a `TELEGRAM_BOT_TOKEN`.
2. Escríbele cualquier mensaje a tu bot. Abre `https://api.telegram.org/bot<TU_TOKEN>/getUpdates` en el navegador y copia el número de `message.from.id` a `TELEGRAM_DUENO_ID`. Esa URL lleva tu token: no la compartas.
3. Arranca el bot con long polling, sin webhook:

```bash
npx vite-node scripts/telegram-local.ts --supabase    # estado en tu Supabase (paso 6)
npx vite-node scripts/telegram-local.ts               # estado en memoria, sin Supabase
```

**Comprobación:** la consola imprime `Pulso (Telegram, modo local) escuchando.` En Telegram, `/start` responde con la presentación de Pulso. Envía `data/facturas/F-001-luz-andina.pdf`: llega la decisión con sus razones y, si escala, los botones Aprobar y Rechazar. `/crear Mi empresa` te da una empresa propia. Si el bot ya tiene un webhook, el script avisa y sale: usa un bot de desarrollo distinto.

### 8. Desplegar en Vercel

**Antes de desplegar**, las cuatro migraciones del paso 6 deben estar aplicadas en el Supabase que vas a usar. Si no, el bot responde "no disponible" a todo.

1. En Vercel: **Add New → Project**, importa el repo, framework Next.js y raíz por defecto.
2. En Environment Variables (Production) carga las del paso 4 que vayas a usar. Opcionales: `CHAT_IA=0` apaga la conversación con IA del bot; `NEXT_PUBLIC_TELEGRAM_BOT_URL` y `NEXT_PUBLIC_GMAIL_BUZON` llenan las tarjetas de la bienvenida. Las `NEXT_PUBLIC_*` se fijan al construir: si las cambias, vuelve a desplegar.
3. Deploy.

**Comprobación:** `curl https://TU-DOMINIO/api/ordenes` devuelve `"n":4`. No anuncies un despliegue con lectura en vivo antes de fijar el límite de crédito. Para un enlace público que no exponga `/team` ni gaste, usa `MODO_PUBLICO=1` sin otras variables ([`docs/despliegue-vercel.md`](docs/despliegue-vercel.md)).

### 9. Webhook de Telegram con secreto

1. Detén el bot local (Ctrl+C): con webhook activo, `getUpdates` deja de funcionar.
2. Genera el secreto, pégalo en `.env.local` como `TELEGRAM_WEBHOOK_SECRET` y cárgalo también en Vercel. Vuelve a desplegar.

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

3. Registra el webhook. Las dos primeras líneas piden el token y el secreto sin mostrarlos en pantalla (pégalos y pulsa Enter):

```bash
read -s TELEGRAM_BOT_TOKEN
read -s TELEGRAM_WEBHOOK_SECRET
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d url=https://TU-DOMINIO/api/telegram \
  -d secret_token="$TELEGRAM_WEBHOOK_SECRET" \
  -d 'allowed_updates=["message","callback_query"]'
```

**Comprobación:** `curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getWebhookInfo"` muestra tu `url` y ningún `last_error_message`. `curl -X POST https://TU-DOMINIO/api/telegram -d '{}'` responde **401**. `/start` en el bot responde. Para volver al bot local: `curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/deleteWebhook"`.

### 10. Canal de Gmail (opcional)

Un script de Google Apps Script en un buzón del equipo manda cada adjunto a `POST /api/canal/gmail` y responde en el mismo hilo. Genera `GMAIL_CANAL_SECRETO` como en el paso 9 (24 caracteres o más), cárgalo en Vercel, vuelve a desplegar y sigue [`integraciones/gmail/README.md`](integraciones/gmail/README.md) (unos 10 minutos).

**Comprobación:** `curl -X POST https://TU-DOMINIO/api/canal/gmail` responde 401 con el secreto cargado (503 sin él). Un correo con una factura adjunta recibe la decisión en el hilo en uno o dos minutos.

### 11. MCP en Claude Code (opcional)

```bash
claude mcp add pulso -- npx vite-node mcp/servidor.ts
```

`leer_y_decidir_factura` usa `OPENROUTER_API_KEY` de `.env.local`; las otras cuatro herramientas no necesitan clave.

**Comprobación:** `claude mcp list` muestra `pulso` conectado, y pedirle a Claude "lista las facturas de la demo de Pulso" devuelve 18 facturas con `decididas_sin_persona: 8`. Detalle: [`docs/api.md`](docs/api.md#servidor-mcp-stdio).

### Verificación final

- [ ] `npm test` en verde y `http://localhost:3000` con las 18 facturas.
- [ ] `/api/vivo` activa y una factura subida sale ESCALAR o FRENAR, nunca PAGAR.
- [ ] El bot responde `/start`, decide una factura y deja aprobar la que escala.
- [ ] En producción, `/api/telegram` responde 401 sin el secreto.

### Si algo falla

| Síntoma | Causa probable |
|---|---|
| `/api/vivo` dice `activa:false` | Falta `LECTURA_EN_VIVO=1` o `OPENROUTER_API_KEY`; reinicia `npm run dev` después de editar `.env.local` |
| `migrar.mjs`: "Falta SUPABASE_DB_URL" | No está en `.env.local` ni en `.env` |
| Un `curl` falla con un error de parámetros en Windows | Estás en PowerShell: usa Git Bash o escribe `curl.exe` |
| El webhook responde 503 `sin_estado` | Falta `TELEGRAM_BOT_TOKEN`, `NEXT_PUBLIC_SUPABASE_URL` o `SUPABASE_SERVICE_ROLE_KEY` en el despliegue |
| El webhook responde 401 a Telegram | El `secret_token` no coincide con `TELEGRAM_WEBHOOK_SECRET`, o tiene menos de 16 caracteres |
| El bot responde "no disponible" | Faltan migraciones en ese Supabase (paso 6) |
| El bot lee la factura pero nadie puede aprobar | Falta `TELEGRAM_DUENO_ID` |
| `/team` muestra solo la semilla | Es lo esperado sin Supabase y sin `EQUIPO_PIN` (16 caracteres o más) |

### Deshacer

`deleteWebhook` (paso 9) devuelve el bot a local. En BotFather, `/revoke` invalida un token que se haya expuesto. En OpenRouter puedes borrar la clave, y en Supabase, borrar el proyecto.

## Equipo y créditos

**Equipo 404:** Andrés Valero (producto, diseño, motor de reglas y registro), Sebastián Lobo (lector de facturas, integración y centro de mando) y Jofre Muñetón Valencia, que escribió los 80 escenarios del set externo antes de dejar el equipo el 17/10. Todos los datos, empresas, cuentas e identificadores son ficticios. Licencia MIT.
