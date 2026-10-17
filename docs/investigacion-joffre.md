# Revisión crítica de la investigación de Joffre

**Revisado:** 17/10/2026 - 10:58 a.m. (Caracas, Venezuela)
**Documentos:** `Blinka_Investigacion_Parte1.pdf` y `Blinka_Guia_Completa_Hackathon.pdf` (aportados por Joffre).
**Método:** separar lo comprobable de lo dudoso, adoptar solo lo que mejora seguridad, autonomía o
explicabilidad, y atacar nuestro propio diseño.

## 1. Lo que confirma nuestro diseño (se queda igual)

| Punto de los documentos | Dónde ya lo tenemos |
|---|---|
| La IA extrae; reglas deterministas deciden | Principio 1, `src/motor/motor.js` |
| Monto vacío convertido a 0 y "aprobado" | `DATOS` rechaza vacío, 0 y negativos (con prueba) |
| Instrucciones ocultas en el PDF | `MANIPULACION` + caso F11 |
| Confianza alta en documento desconocido | La confianza del modelo es solo una señal; deciden ID fiscal, cuenta y acordado |
| Estado del periodo fuera del modelo | `estado-periodo.json` |
| Log en lenguaje natural + JSON | `explicacion` + resultado estructurado |
| Factura con logo correcto pero cuenta equivocada | `REGISTRO` (con prueba) |
| Fraccionar facturas para esquivar el límite | Cada factura debe cuadrar ±2 % con lo acordado, y el mismo monto en 30 días es duplicado |

## 2. Lo que adoptamos

1. **Cuenta bancaria cambiada en las últimas 72 horas → ESCALAR.** Hecho: comprobación
   `CUENTA_RECIENTE`, caso F12 y pruebas de borde. Es el riesgo real número 1 de Blinka (BEC).
2. **Moneda ambigua ("$" sin código).** Para la fase de extracción: el lector debe indicar si la
   moneda aparece explícita; si no, alerta → ESCALAR. Caso trampa nuevo para el set.
   Nota: aunque el lector se equivoque de moneda, `COTEJO` ya escala porque la moneda no coincide
   con la acordada. La seguridad se mantiene; solo se pierde autonomía.
3. **Grounding contra datos reales**, no contra la confianza del modelo: doble lectura con dos
   modelos de empresas distintas + cada dato debe aparecer literal en la transcripción.
4. **Observabilidad mínima**: cada decisión registra id, modelo, versión de reglas, tiempo y costo;
   el tablero muestra tasa de autonomía, de escalamiento y errores de lectura contra el set.
5. **Al aprobar una escalada, el motor vuelve a revisar el presupuesto** (pudo agotarse mientras
   esperaba). Para la fase de pantalla.
6. **Nada de lo que trae una factura escribe en el registro de proveedores.** Solo una persona,
   desde la pantalla de reglas. Cierra la "inyección de memoria".

## 3. Lo que NO adoptamos, y por qué

| Recomendación | Problema |
|---|---|
| Frase de pitch afirmaciones no verificadas sobre la historia del patrocinador | El propio documento admite que "no hay documentación pública de por qué". Un pivote no es lo mismo que un fracaso del agente. Decírselo a los jueces de Blinka es arriesgado y puede ser falso. **No usar.** |
| Validar que "la fecha no esté en el pasado" | Una factura vencida igual se debe. Bloquearla haría que el agente no pague deudas reales. A lo sumo se muestra como aviso. |
| Beneficiario por coincidencia aproximada de nombre (>90 %) | Abre la puerta a la suplantación ("Estudio Pixel SA" vs "Estudio Pixel SAS"). Nosotros exigimos el ID fiscal exacto. |
| Muestreo aleatorio del 5–10 % de aprobadas a revisión humana | Baja la autonomía de forma aleatoria y rompe la reproducibilidad de las pruebas. En producción tiene sentido como auditoría posterior, sin bloquear el pago. |
| Escalar en COP por encima de ~USD 50.000 por SARLAFT | SARLAFT es un sistema de gestión de riesgo, no un umbral fijo. Y cumplimiento está fuera del reto. |
| Stack de observabilidad completo (Langfuse + Phoenix + Prometheus + Grafana + Sentry + OpenTelemetry) | Seis herramientas para 36 horas. Se reemplaza con el registro estructurado y un panel de métricas. Langfuse solo si sobra tiempo. |
| Python + Streamlit; plan de 3 días; set de 15 facturas | Ya tenemos el motor en JavaScript probado; el hackathon es de 2 días. |
| Avisos por correo o WhatsApp al aprobador | Fuera del alcance; el tablero tiene la cola de aprobación. |

## 4. Datos que no se pueden dar por ciertos

- **"Memory Injection (Lakera AI, nov 2026)"**: la fecha es posterior a hoy (17/10/2026). Ese dato
  está mal o es inventado. No citarlo.
- **"$2.3B en pérdidas por alucinaciones en Q1 2026"**, tasas de alucinación de 0,7 % a 27 %,
  "74 % afectadas por BEC", casos Qualcomm/Tipalti/TCS: sin fuente enlazada. No usar en el pitch
  sin verificar.
- **Cifras de Blinka** ($10M en 2 meses, clientes): los dos documentos no coinciden (25→150+ vs 150+).
- **"Cuenta cambiada recientemente" como caso que "evaluarán los jueces"**: no está en el brief
  oficial; la guía lo agregó. Igual lo implementamos por su valor, pero no es un requisito.
- **"Pix irreversible en 10 segundos"**: simplificación; además, mover dinero está fuera del reto.

## 5. Puntos débiles de nuestro propio diseño (abogado del diablo)

1. **La confianza que reporta el modelo no prueba nada.** → Mitigado con la doble lectura y el
   cotejo contra el registro. Pendiente: medirlo en el banco de pruebas.
2. **El detector de instrucciones ocultas busca frases conocidas.** Un ataque en portugués o con
   otras palabras puede pasar. → No es la única barrera: el lector no tiene herramientas y el motor
   igual exige proveedor, cuenta y monto acordados. En el peor caso se paga lo que ya se debía.
3. **Duplicados con número parecido pero no idéntico** ("EP-0142" vs "EP-142"). → Si el monto es
   igual dentro de 30 días ya se frena. Hueco que queda: mismo monto, más de 30 días después y
   número casi igual. Baja prioridad.
4. **Tasas de cambio fijas.** Aceptable para la demo; hay que decirlo en el pitch.
5. **El set es nuestro; lo diseñamos para pasar.** → Pedir facturas a otro equipo (el brief lo
   permite) y correrlas como prueba ciega antes de la entrega.
6. **Una aprobación humana puede romper el presupuesto.** → Volver a revisar el presupuesto al aprobar.
