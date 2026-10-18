/**
 * Pulso · canal Gmail (Google Apps Script).
 *
 * Va en el Gmail DEL EQUIPO (un buzón creado para la demo), no en el de quien prueba. Quien quiera
 * probar reenvía a ese buzón un correo con la factura adjunta y recibe la decisión en el mismo hilo.
 *
 * Propiedades del script (Configuración del proyecto → Propiedades del script):
 *   PULSO_URL      dirección del despliegue, p. ej. https://404team.vercel.app
 *   PULSO_SECRETO  el mismo valor que GMAIL_CANAL_SECRETO en el despliegue (24 caracteres o más)
 * El secreto nunca va escrito en este archivo.
 *
 * Primera vez: ejecuta instalar() y autoriza. Después corre solo cada minuto; procesarAhora() lo fuerza.
 * Guía completa: integraciones/gmail/README.md
 */

var ETIQUETA_LISTA = 'Pulso/Procesada';
var ETIQUETA_ERROR = 'Pulso/Error';
var MAX_BYTES = 3 * 1024 * 1024;
var MAX_INTENTOS = 3;
var TIPOS = ['application/pdf', 'image/jpeg', 'image/png'];
// En la búsqueda de Gmail, las etiquetas anidadas se escriben con guion: Pulso/Procesada -> pulso-procesada.
var BUSQUEDA = 'in:inbox -from:me -label:pulso-procesada -label:pulso-error newer_than:3d';

var AVISO_SIN_ADJUNTO = 'Hola, soy Pulso. No encontré una factura adjunta en tu correo. Envíame un correo nuevo con la factura como adjunto: PDF con texto, JPG o PNG, de hasta 3 MB.';
var AVISO_MUY_GRANDE = 'Hola, soy Pulso. El adjunto pesa más de 3 MB. Envíame un correo nuevo con una foto más liviana o un PDF más pequeño.';
var AVISO_ERROR = 'Hola, soy Pulso. No pude procesar tu factura en este momento, así que no tomé ninguna decisión. El equipo lo revisará. Puedes intentarlo de nuevo con un correo nuevo en unos minutos.';

// ---------- Funciones puras (se prueban fuera de Google en tests/gmail-script.test.ts) ----------

/**
 * Elige el adjunto a enviar: el primero de un tipo aceptado y dentro del tope. Si no hay ninguno,
 * devuelve el aviso que corresponde y el índice -1.
 * @param {{tipo: string, tamano: number}[]} adjuntos
 */
function elegirAdjunto(adjuntos, tipos, maxBytes) {
  var hayTipoBueno = false;
  for (var i = 0; i < adjuntos.length; i++) {
    var tipo = String(adjuntos[i].tipo || '').toLowerCase().split(';')[0].trim();
    if (tipos.indexOf(tipo) === -1) continue;
    hayTipoBueno = true;
    if (adjuntos[i].tamano > 0 && adjuntos[i].tamano <= maxBytes) return { indice: i, aviso: null };
  }
  return { indice: -1, aviso: hayTipoBueno ? AVISO_MUY_GRANDE : AVISO_SIN_ADJUNTO };
}

/**
 * Qué hacer con la respuesta del servidor.
 * - RESPONDER: 200 con texto, o un aviso del servidor (400, 413, 415, 429) con texto. No se reintenta.
 * - REINTENTAR: falla de red, 401, 5xx, 503 o respuesta sin texto, mientras queden intentos.
 * - ERROR: se acabaron los intentos. El hilo pasa a Pulso/Error y se avisa a quien escribió.
 */
function accionPorRespuesta(codigo, tieneTexto, intentos, maxIntentos) {
  if (tieneTexto && (codigo === 200 || codigo === 400 || codigo === 413 || codigo === 415 || codigo === 429)) return 'RESPONDER';
  return intentos < maxIntentos ? 'REINTENTAR' : 'ERROR';
}

/** Último mensaje del hilo que no escribió este buzón (el que trae la factura), o null. */
function mensajeAjeno(remitentes, yo) {
  var mio = String(yo || '').toLowerCase();
  for (var j = remitentes.length - 1; j >= 0; j--) {
    if (String(remitentes[j] || '').toLowerCase().indexOf(mio) === -1) return j;
  }
  return -1;
}

/** Remitentes automáticos (avisos de Google, boletines, rebotes): se etiquetan sin responder ni llamar a Pulso. */
function esRemitenteAutomatico(remitente) {
  return /(no-?reply|mailer-daemon|postmaster|notifications?@|notificaciones@|accounts\.google\.com|calendar-notification)/i.test(String(remitente || ''));
}

/** Responde sin dejar que un fallo (por ejemplo, la cuota diaria de correos) rompa la vuelta. */
function responder_(msg, texto) {
  try {
    msg.reply(texto);
  } catch (e) {
    console.error('Pulso: no se pudo responder el correo: ' + e);
  }
}

// ---------- Integración con Gmail ----------

function instalar() {
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('PULSO_URL') || !props.getProperty('PULSO_SECRETO')) {
    throw new Error('Faltan PULSO_URL o PULSO_SECRETO en las propiedades del script. Agrégalas y vuelve a ejecutar instalar().');
  }
  etiqueta_(ETIQUETA_LISTA);
  etiqueta_(ETIQUETA_ERROR);
  var activadores = ScriptApp.getProjectTriggers();
  for (var i = 0; i < activadores.length; i++) {
    if (activadores[i].getHandlerFunction() === 'procesarAhora') ScriptApp.deleteTrigger(activadores[i]);
  }
  ScriptApp.newTrigger('procesarAhora').timeBased().everyMinutes(1).create();
  console.log('Pulso instalado: revisa el buzón cada minuto.');
}

function procesarAhora() {
  var candado = LockService.getScriptLock();
  if (!candado.tryLock(5000)) return; // otra ejecución sigue trabajando
  try {
    var props = PropertiesService.getScriptProperties();
    var url = props.getProperty('PULSO_URL');
    var secreto = props.getProperty('PULSO_SECRETO');
    if (!url || !secreto) {
      console.error('Faltan PULSO_URL o PULSO_SECRETO en las propiedades del script.');
      return;
    }
    var lista = etiqueta_(ETIQUETA_LISTA);
    var error = etiqueta_(ETIQUETA_ERROR);
    var yo = Session.getEffectiveUser().getEmail();
    var hilos = GmailApp.search(BUSQUEDA, 0, 5);
    for (var i = 0; i < hilos.length; i++) {
      try {
        procesarHilo_(hilos[i], url, secreto, yo, lista, error, props);
      } catch (e) {
        console.error('Pulso: fallo en el hilo ' + hilos[i].getId() + ': ' + e);
      }
    }
  } finally {
    candado.releaseLock();
  }
}

function procesarHilo_(hilo, url, secreto, yo, lista, error, props) {
  var mensajes = hilo.getMessages();
  var k = mensajeAjeno(mensajes.map(function (m) { return m.getFrom(); }), yo);
  if (k < 0) { hilo.addLabel(lista); return; }
  var msg = mensajes[k];
  if (esRemitenteAutomatico(msg.getFrom())) { hilo.addLabel(lista); return; }
  var adjuntos = msg.getAttachments({ includeInlineImages: false });
  var elegido = elegirAdjunto(adjuntos.map(function (a) { return { tipo: a.getContentType(), tamano: a.getSize() }; }), TIPOS, MAX_BYTES);
  // Siempre se etiqueta ANTES de responder: si la respuesta falla, el hilo no vuelve a procesarse.
  if (elegido.indice < 0) { hilo.addLabel(lista); responder_(msg, elegido.aviso); return; }

  var clave = 'intentos:' + hilo.getId();
  var intentos = Number(props.getProperty(clave) || '0') + 1;
  var codigo = 0;
  var cuerpo = null;
  try {
    var res = UrlFetchApp.fetch(url.replace(/\/+$/, '') + '/api/canal/gmail', {
      method: 'post',
      headers: { Authorization: 'Bearer ' + secreto },
      payload: { factura: adjuntos[elegido.indice].copyBlob(), remitente: msg.getFrom() },
      muteHttpExceptions: true,
    });
    codigo = res.getResponseCode();
    try { cuerpo = JSON.parse(res.getContentText()); } catch (e) { cuerpo = null; }
  } catch (e) {
    codigo = 0; // red o tiempo agotado
  }

  var accion = accionPorRespuesta(codigo, Boolean(cuerpo && cuerpo.texto), intentos, MAX_INTENTOS);
  if (accion === 'RESPONDER') {
    hilo.addLabel(lista);
    props.deleteProperty(clave);
    responder_(msg, String(cuerpo.texto));
  } else if (accion === 'REINTENTAR') {
    props.setProperty(clave, String(intentos));
    console.warn('Pulso: respuesta ' + codigo + ', intento ' + intentos + ' de ' + MAX_INTENTOS + ' en el hilo ' + hilo.getId());
  } else {
    hilo.addLabel(error);
    props.deleteProperty(clave);
    responder_(msg, AVISO_ERROR);
    console.error('Pulso: respuesta ' + codigo + ' tras ' + MAX_INTENTOS + ' intentos en el hilo ' + hilo.getId());
  }
}

function etiqueta_(nombre) {
  return GmailApp.getUserLabelByName(nombre) || GmailApp.createLabel(nombre);
}
