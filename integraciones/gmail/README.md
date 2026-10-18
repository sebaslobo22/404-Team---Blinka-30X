# Canal Gmail de Pulso

Quien quiera probar Pulso reenvía a un buzón del equipo un correo con la factura adjunta. En uno o dos minutos recibe la decisión en el mismo hilo: FRENAR o ESCALAR, con sus razones. Igual que el bot de Telegram y la subida web, **lo que entra por correo nunca se paga solo**: como máximo termina en ESCALAR.

```
Correo con la factura  →  buzón del equipo (Gmail)  →  Apps Script, cada minuto
   →  POST /api/canal/gmail (con secreto)  →  dos lecturas + motor + techo en vivo
   →  respuesta en el hilo  +  etiqueta Pulso/Procesada
```

El script corre en el Gmail **del equipo**, nunca en el de quien prueba: nadie externo tiene que pegar código ni dar permisos a su correo.

## Instalación (una vez, unos 10 minutos)

**En el despliegue (Vercel):**
1. Genera un secreto largo y aleatorio, por ejemplo con `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
2. Carga `GMAIL_CANAL_SECRETO` con ese valor (24 caracteres o más; si es más corto, el canal queda apagado) y `OPENROUTER_API_KEY` **con límite de crédito** fijado en el panel de OpenRouter. Opcionales: `GMAIL_POR_REMITENTE_HORA` (5), `GMAIL_GLOBAL_DIA` (100), `PULSO_URL_PUBLICA` (el enlace que va en la respuesta).
3. Vuelve a desplegar.

**En el Gmail del equipo:**
1. Entra a la cuenta de Gmail creada para la demo y abre https://script.google.com → **Nuevo proyecto**. Ponle de nombre "Pulso · canal Gmail".
2. Borra el contenido de `Código.gs` y pega el de [`Codigo.gs`](Codigo.gs).
3. **Configuración del proyecto** (engranaje) → **Propiedades del script** → agrega:
   - `PULSO_URL`: la dirección del despliegue, por ejemplo `https://404team.vercel.app` (sin barra al final).
   - `PULSO_SECRETO`: el mismo valor que `GMAIL_CANAL_SECRETO`.
4. En el editor elige la función `instalar` y pulsa **Ejecutar**. Google pide permisos: como es un script propio sin verificar, muestra "Google no verificó esta app". Entra en **Configuración avanzada → Ir a Pulso (no seguro)** y acepta. El script pide acceso al correo de esa cuenta (leer, etiquetar y responder) y a conectarse a servicios externos (para llamar a Pulso).
5. Listo: queda un activador que revisa el buzón cada minuto. Para no esperar, ejecuta `procesarAhora`.

**Prueba:** desde otra cuenta, envía o reenvía al buzón un correo con una factura adjunta (PDF con texto, JPG o PNG, de hasta 3 MB). En uno o dos minutos llega la respuesta en el hilo.

## Cómo se comporta

- **Qué procesa:** correos de la bandeja de entrada de los últimos 3 días, que no escribió el propio buzón y que aún no tienen la etiqueta `Pulso/Procesada` ni `Pulso/Error`. Hasta 5 hilos por minuto. Una factura por hilo: para otra factura, un correo nuevo.
- **Qué adjunto toma:** el primer PDF, JPG o PNG de hasta 3 MB (las imágenes dentro del cuerpo, como firmas y logos, se ignoran). Si no hay ninguno, o pesa más de 3 MB, responde con un aviso y no llama a Pulso.
- **Reintentos:** si Pulso no responde, responde 401, 503 o 5xx, o la red falla, reintenta en la siguiente vuelta (cada minuto) hasta 3 veces. Al tercer fallo responde "no pude procesar tu factura", pone la etiqueta `Pulso/Error` y deja el detalle en el registro de ejecuciones. Los avisos del servidor (adjunto inválido, demasiado grande, límite alcanzado) se responden sin reintentar.
- **Sin dobles ejecuciones:** un candado (`LockService`) evita que dos vueltas procesen el mismo hilo a la vez.
- **Sin bucles:** el hilo se etiqueta antes de responder, así que si la respuesta falla (por ejemplo, al agotar la cuota de unos 100 destinatarios al día de una cuenta gmail.com) no se vuelve a procesar. La respuesta va al mensaje que trajo la factura, no al último del hilo. Los remitentes automáticos (no-reply, rebotes, avisos de Google, notificaciones) se etiquetan sin responder ni llamar a Pulso.
- **Cuotas de Google:** una cuenta gmail.com tiene unos 90 minutos al día de ejecución de activadores. Revisar cada minuto basta para el día de la demo; después conviene cambiar el activador a cada 5 minutos (en `instalar()`, `everyMinutes(5)`).
- **Límites:** 5 facturas por remitente por hora y un tope diario global, contados en el servidor. Viven en memoria del proceso, así que **el techo real de gasto es el límite de crédito de la clave de OpenRouter**.

## Seguridad

- El secreto vive en las propiedades del script y en las variables del despliegue, nunca en el código. La ruta lo compara en tiempo constante; sin secreto válido responde 401 y no lee nada.
- La ruta no guarda el adjunto ni la lectura, y no toca el estado de la demo.
- Para leerlo, el adjunto se envía a dos modelos (Claude y Gemini) por OpenRouter, sin proveedor de reemplazo y con `data_collection: deny`. La respuesta lo dice. **Nadie debe enviar facturas reales ni datos personales.**
- Si el secreto se filtra: cambia `GMAIL_CANAL_SECRETO` en el despliegue y `PULSO_SECRETO` en el script. El valor viejo deja de funcionar al instante.
- Para apagar el canal: borra `GMAIL_CANAL_SECRETO` del despliegue (la ruta responde 503) y elimina el activador del script.
