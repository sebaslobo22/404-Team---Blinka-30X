# Despliegue en Vercel (lo hace Sebastian)

El demo publico corre en **modo replay**: no necesita claves. La unica variable es `MODO_PUBLICO=1`, que oculta el centro de mando interno (ver la seccion "Dos proyectos desde el mismo repo" al final).

## Pasos

1. Entra a vercel.com con tu cuenta y elige **Add New > Project**.
2. Importa `sebaslobo22/404-Team---Blinka-30X` (Vercel te pedira dar acceso al repo privado a su app de GitHub).
3. Framework: **Next.js** (lo detecta solo). Root Directory: la raiz. Build y output por defecto.
4. Nombre del proyecto sugerido: `blinka-404-agente-pagador`.
5. **Agrega solo `MODO_PUBLICO=1`.** En el demo publico no debe haber ninguna otra variable ni clave.
6. Deploy.

## Revisar antes de enviar el enlace

- Abre el enlace de **produccion** (`https://<proyecto>.vercel.app`) desde una ventana de incognito, sin sesion. Debe abrir sin pedir login.
- Si pide login: Project Settings > Deployment Protection > pon **Vercel Authentication en "Disabled"** para produccion.
- Prueba en el celular y recorre `/`, `/cola`, `/reglas`, `/registro` y `/facturas/F-009`.
- Comprueba que aprobar una factura FRENAR no es posible (no hay boton).

## Aviso sobre commits y plan Hobby

En el plan gratuito con un repo **privado**, Vercel puede bloquear los despliegues automaticos de commits cuyo autor no sea el dueno de la cuenta de Vercel. Si un push de otra persona no se despliega, hay dos salidas:

- Desplegar a mano desde tu copia local: `npx vercel --prod` (despliega lo que tengas en tu carpeta, sin importar quien hizo el commit).
- Hacer el repo publico, que de todos modos es obligatorio para la entrega, despues de revisar que no haya claves en todo el historial.

## Limite conocido del modo replay

El estado (aprobaciones, reglas editadas) vive en la memoria del servidor. En Vercel cada instancia tiene el suyo y se reinicia cuando se duerme. Para un demo basta. Los visitantes comparten el estado de su instancia.

## Dos proyectos desde el mismo repo

El repo contiene el producto (`/`) y el centro de mando interno (`/team`, `/team/contexto.md`, `/api/team/*`). El enlace que ve el jurado **no debe exponer lo interno**: el plan y la bitacora serian legibles por cualquiera, y el proyecto interno guarda `SUPABASE_SERVICE_ROLE_KEY`. Por eso se crean **dos proyectos de Vercel** desde el mismo repo.

| | Proyecto publico (jurado) | Proyecto interno (equipo) |
|---|---|---|
| Nombre sugerido | `blinka-404-agente-pagador` | `404team` |
| Variables | **Solo `MODO_PUBLICO=1`**. Ninguna otra: ni Supabase, ni PIN, ni claves de IA | `EQUIPO_PIN` (aleatorio, 16 o mas caracteres), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| Dominio | El que se entrega | No se comparte fuera del equipo |
| `/team`, `/api/team/*`, `/equipo` | 404 | Funcionan, con `X-Robots-Tag: noindex, nofollow, noarchive` |

Como funciona `MODO_PUBLICO=1` (se lee en cada peticion, no al compilar):

- `middleware.ts` responde el 404 estandar de Next a `/team`, `/team/*` (incluido `/team/contexto.md`), `/api/team/*` y `/equipo`, tambien con mayusculas, barras dobles, `..` y rutas codificadas (`%2e`, `%2F`). La logica esta en `src/publico.ts`, con pruebas en `tests/publico.test.ts`.
- Defensa en profundidad: en ese modo no se crea ningun cliente de Supabase aunque existan las variables, y las rutas de escritura responden 404.
- `robots.txt` permite `/` y desautoriza `/team` y `/api`.

### Pasos para el proyecto publico

1. **Add New > Project**, mismo repo, nombre `blinka-404-agente-pagador`.
2. En Environment Variables agrega **solo** `MODO_PUBLICO` con valor `1` (Production y Preview).
3. Deploy. Si ya existia un proyecto con variables de Supabase o PIN, borralas todas: lo mas limpio es crear uno nuevo.

### Pasos para el proyecto interno (`404team`)

1. Cambia `EQUIPO_PIN` por una cadena aleatoria de 20 o mas caracteres (gestor de contrasenas). Con menos de 16 caracteres el centro de mando **no deja entrar a nadie** (503 "PIN demasiado corto").
2. No pongas `MODO_PUBLICO` en este proyecto.
3. Reparte el PIN nuevo por mensaje privado y actualiza el `.env` de cada persona.
4. Nota sobre el limite de intentos: la ruta de entrada bloquea 15 minutos tras 5 fallos por IP, pero vive en memoria y en serverless no se comparte entre instancias. Es "mejor que nada"; la defensa real es el PIN largo.

### Lista de verificacion (curl)

Cambia `PUB` por el dominio publico. Todo debe dar el codigo indicado.

```bash
PUB=https://blinka-404-agente-pagador.vercel.app

curl -s -o /dev/null -w "%{http_code}\n" $PUB/                            # 200
curl -s -o /dev/null -w "%{http_code}\n" $PUB/api/registro                # 200
curl -s -o /dev/null -w "%{http_code}\n" $PUB/team                        # 404
curl -s -o /dev/null -w "%{http_code}\n" $PUB/team/contexto.md            # 404
curl -s -o /dev/null -w "%{http_code}\n" $PUB/api/team/contexto           # 404
curl -s -o /dev/null -w "%{http_code}\n" $PUB/api/team/entrar             # 404
curl -s -o /dev/null -w "%{http_code}\n" -X POST $PUB/api/team/entrar     # 404
curl -s -o /dev/null -w "%{http_code}\n" $PUB/equipo                      # 404
curl -s -o /dev/null -w "%{http_code}\n" --path-as-is $PUB/TEAM           # 404
curl -s -o /dev/null -w "%{http_code}\n" --path-as-is $PUB/team/../team   # 404
curl -s $PUB/robots.txt                                                   # Allow: / ; Disallow: /team y /api
```

Para el interno (`INT`), con un PIN corto la entrada debe dar 503 y con el largo, 200:

```bash
INT=https://404team.vercel.app
curl -si $INT/team | grep -i x-robots-tag                                 # noindex, nofollow, noarchive
curl -s -X POST -H 'content-type: application/json' -d '{"pin":"x"}' $INT/api/team/entrar   # 401 (o 503 si el PIN del servidor es corto)
```
