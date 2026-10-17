# Despliegue en Vercel (lo hace Sebastian)

El demo publico corre en **modo replay**: no necesita claves ni variables de entorno. Si Vercel pide variables, dejalas vacias.

## Pasos

1. Entra a vercel.com con tu cuenta y elige **Add New > Project**.
2. Importa `sebaslobo22/404-Team---Blinka-30X` (Vercel te pedira dar acceso al repo privado a su app de GitHub).
3. Framework: **Next.js** (lo detecta solo). Root Directory: la raiz. Build y output por defecto.
4. Nombre del proyecto sugerido: `blinka-404-agente-pagador`.
5. **No agregues variables de entorno.** En el demo publico no debe haber ninguna clave.
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
