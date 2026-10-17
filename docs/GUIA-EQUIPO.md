# Guía de acceso — Andrés y Joffre

**Emitida:** 17/10/2026 - 1:00 p.m. (Caracas, Venezuela). Dura 10 minutos. Un paso a la vez.

Centro de mando: **https://404team.vercel.app/team** (solo para el equipo; para escribir hace falta el PIN).

## Paso 1 · Pedirle el PIN a Sebastián
El PIN es una cadena aleatoria de 16 o más caracteres que Sebastián guarda en su gestor de contraseñas. Lo envía **por mensaje privado**, nunca en un grupo, nunca en el repo. Cópialo y pégalo; no lo escribas a mano ni lo apuntes en notas sueltas.

## Paso 2 · Entrar a la web
1. Abre https://404team.vercel.app/team.
2. Arriba a la derecha, elige tu nombre, escribe el PIN y pulsa **Entrar**.
3. Debe aparecer el punto verde **"en vivo"** junto al título. Si ves "Sin conexión a Supabase", avisa a Sebastián.

## Paso 3 · Preparar tu computadora (solo la primera vez)
En la terminal, dentro de la carpeta del proyecto:

```bash
git clone https://github.com/sebaslobo22/404-Team---Blinka-30X.git
cd 404-Team---Blinka-30X
npm install
```

Crea un archivo `.env` en esa carpeta con **solo estas tres líneas** (cambia tu nombre y pega el PIN):

```
EQUIPO_URL=https://404team.vercel.app
EQUIPO_PIN=<pega aquí el PIN que te envió Sebastián>
EQUIPO_QUIEN=Andrés
```

El `.env` nunca se sube a GitHub. No necesitas ninguna otra clave para trabajar en el centro de mando.

## Paso 4 · Cómo trabaja tu agente (copia este mensaje en tu primera sesión)

> Lee `CLAUDE.md` y `docs/ZONAS.md`. Antes de editar nada, ejecuta `node scripts/equipo.mjs contexto` para ver el estado del equipo y confirma que la zona que vas a tocar está libre. Toma la zona con `node scripts/equipo.mjs tomar <carpeta> --agente <mi-nombre>` y suéltala al terminar con `soltar`. Trabaja solo en la zona de mi persona, en una rama `<mi-nombre>/<tema>`, y abre una PR a `main`. Deja una nota de lo importante con `node scripts/equipo.mjs nota "..."`. Antes de la PR corre `npm test`. Nunca uses `git push --force`. Si necesitas tocar `src/engine/types.ts`, avisa primero: lo usan 16 archivos.

## Qué zona es la tuya
| Persona | Zona principal |
|---|---|
| Andrés | `src/engine/`, `src/ledger/`, `supabase/migrations/0001*`, `app/` del producto, `src/demo/` |
| Joffre | `tests/adversarial/`, `data/ciego/` |
| Sebastián | `src/extraccion/`, `data/facturas/`, `app/team/`, `scripts/`, `docs/`, configuración |

Detalle completo en `docs/ZONAS.md`.

## Los 4 comandos que vas a usar
| Qué quieres | Comando |
|---|---|
| Ver el estado del equipo | `node scripts/equipo.mjs contexto` |
| Avisar que vas a editar una carpeta | `node scripts/equipo.mjs tomar src/engine --agente claude-andres` |
| Avisar que terminaste | `node scripts/equipo.mjs soltar src/engine` |
| Dejar una nota para los demás | `node scripts/equipo.mjs nota "Terminé el registro en Supabase"` |

Si una carpeta aparece tomada por otro, **no la edites**: habla con esa persona o deja una nota.

## Si algo falla
- **"401"**: el PIN está mal escrito.
- **"429"**: demasiados intentos con PIN erróneo; espera 15 minutos.
- **"503 PIN demasiado corto"**: el PIN configurado en Vercel tiene menos de 16 caracteres; avisa a Sebastián.
- **"409 zona ya tomada"**: otra persona la tiene; mira en la web quién y desde cuándo.
- **"503 sin conexión a Supabase"**: avisa a Sebastián.
- **Cualquier otra cosa**: escribe en el grupo con la captura; no intentes arreglar configuración compartida.

## Cómo se publica (plan gratuito de Vercel, sin Pro)
Vercel (plan Hobby) bloquea todo despliegue cuyo **último commit** lo firma alguien que no es el dueño de la cuenta. Por eso:

1. **Tú trabajas en tu rama** (`andres/tema`, `joffre/tema`) y haces `push`. Verás "Blocked" en Vercel para tu rama: **es normal, ignóralo**.
2. **Abres una PR** a `main` en GitHub y avisas a Sebastián en el centro de mando (nota en la bitácora).
3. **Solo Sebastián fusiona**, con el botón **"Create a merge commit"**. Ese commit de fusión lo firma Sebastián y Vercel publica sin problema. GitHub ya no deja usar "Squash" ni "Rebase" (conservarían tu firma y Vercel los bloquearía).
4. **Nunca fusiones tú a `main`** y no hagas `push` directo a `main`.
5. Si algo urgente queda bloqueado: Sebastián publica a mano con `vercel --prod` desde su computadora (no depende de quién firmó).
