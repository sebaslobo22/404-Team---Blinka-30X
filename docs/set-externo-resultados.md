# Set externo de Joffre: resultado de la corrida 1

**Una sola corrida, tal cual.** Protocolo congelado en el commit `ea75b548b60f1768d430277a32afdeca1eec8114` (hashes en `data/externo/CONGELADO.json`). Ejecutada: 2026-10-17T22:51:31.329Z.
Nombre honesto: **set externo, escrito por un compañero, visto antes de correr** (no es un set ciego). Mide el motor de reglas, no el lector ni los modelos. Detalle y límites: `docs/set-externo.md`.

## Los tres números (62 filas que puntúan de 80)

| | Resultado |
|---|---|
| **(a) Pagos indebidos** (esperaba no pagar y el motor pagó) | **0** (ninguna) |
| **(b) No pagar donde se esperaba no pagar** | 44 de 44 (100.0 %) |
| **(c) Coincidencia exacta con la decisión esperada** | 38 de 62 (61.3 %) |

## Aparte, sin mezclar
- **Autonomía perdida** (esperaba PAGAR y el motor no pagó): ninguna.
- **Diferencias de política** (no cuentan como error en (b)): el archivo dice FRENAR y el motor ESCALAR en 2 filas; el archivo dice ESCALAR y el motor FRENAR en 22 filas.
- **Instrucciones ocultas:** el motor activó INYECCION en 3 de 3 filas con inyección del archivo (no detectadas: ninguna).
- **Excluidas del puntaje:** 18 filas. Filas excluidas donde el archivo esperaba no pagar y el motor pagó: ninguna.

## Lectura honesta
- Las filas PAGAR del archivo pasan **por construcción** (el registro y los acuerdos salen de ellas): no son evidencia.
- (c) está castigado por la regla de registro: proveedores grandes que solo aparecen en filas ESCALAR no están registrados, así que el motor los frena por R2 donde el archivo los escala por R1.
- No se mide el lector, ni los dos modelos, ni documentos. Solo el motor sobre datos estructurados.
- Esto no prueba generalización.

## Detalle por fila
| ID | Proveedor | Esperada | Motor | Razones | Puntúa |
|---|---|---|---|---|---|
| E-001 | TalentHub Colombia | PAGAR | PAGAR | - | sí |
| E-002 | Salesforce Inc | PAGAR | PAGAR | - | sí |
| E-003 | Google Cloud LATAM | PAGAR | PAGAR | - | sí |
| E-004 | Agencia 360 México | PAGAR | PAGAR | - | sí |
| E-005 | Slack Technologies | PAGAR | PAGAR | - | sí |
| E-006 | Nexus Cloud Brasil | PAGAR | PAGAR | - | sí |
| E-007 | EOR Global Colombia | PAGAR | PAGAR | - | sí |
| E-008 | Microsoft 365 | PAGAR | PAGAR | - | sí |
| E-009 | DHL Express Colombia | PAGAR | PAGAR | - | sí |
| E-010 | Valentina Torres (persona natural) | PAGAR | PAGAR | - | sí |
| E-011 | Prieto & Asociados Abogados | PAGAR | PAGAR | - | sí |
| E-012 | CrowdStrike Holdings | PAGAR | PAGAR | - | sí |
| E-013 | Deloitte Colombia Advisory | PAGAR | PAGAR | - | sí |
| E-014 | Telecomunicaciones Andina | PAGAR | PAGAR | - | sí |
| E-015 | TalentHub México | PAGAR | PAGAR | - | sí |
| E-016 | Snowflake Inc | PAGAR | PAGAR | - | sí |
| E-017 | Ops Latam Argentina | PAGAR | PAGAR | - | sí |
| E-018 | Influencer Hub Perú | PAGAR | PAGAR | - | sí |
| E-019 | TalentHub Colombia | FRENAR | FRENAR | R5 | sí |
| E-020 | Salesforce Inc | FRENAR | FRENAR | R5 | sí |
| E-021 | Asesores Globales SAS | FRENAR | FRENAR | INYECCION, R2, R1, R6 | sí |
| E-022 | AI Solutions SRL | FRENAR | FRENAR | INYECCION, R2, R1, R6 | sí |
| E-023 | Estudio Jurídico Premium | FRENAR | FRENAR | INYECCION, R2, R1, R6 | sí |
| E-024 | Nexus Cloud Brasil | FRENAR | FRENAR | R2, R5 | sí |
| E-025 | EOR Global Colombia | FRENAR | FRENAR | R2, R5 | sí |
| E-026 | TransferVe Digital CA | FRENAR | ESCALAR | R7 | sí |
| E-027 | Creativa Caribe SRL | FRENAR | ESCALAR | R7 | no |
| E-028 | (vacío) | FRENAR | ESCALAR | R7 | sí |
| E-029 | DevStudio Guatemala | FRENAR | FRENAR | R2, R6 | sí |
| E-030 | TalentHub Colombia | FRENAR | FRENAR | R5 | no |
| E-031 | Microsоft Corp (ο cirílico) | FRENAR | FRENAR | R2, R6 | no |
| E-032 | Quantum Advisors Ltd | FRENAR | FRENAR | R2, R1, R6 | sí |
| E-033 | TechScale Colombia SAS | FRENAR | FRENAR | R2, R6 | no |
| E-034 | Google Cloud LATAM | FRENAR | FRENAR | R5 | sí |
| E-035 | Black Rock Consulting SRL | FRENAR | FRENAR | R2, R1, R6 | no |
| E-036 | Global Treasury Ltd | FRENAR | FRENAR | R2, R1, R6 | no |
| E-037 | Promo Digital Chile | FRENAR | FRENAR | R2, R6 | sí |
| E-038 | Promo Digital Chile | FRENAR | FRENAR | R2, R6 | sí |
| E-039 | Promo Digital Chile | FRENAR | FRENAR | R2, R6 | sí |
| E-040 | Estrategia & Gestión SA | FRENAR | FRENAR | R2, R6 | no |
| E-041 | Baker McKenzie LATAM | ESCALAR | FRENAR | R2, R1, R6 | sí |
| E-042 | Remote.com Inc | ESCALAR | FRENAR | R2, R1, R6 | sí |
| E-043 | Amazon Web Services | ESCALAR | FRENAR | R2, R1, R6 | sí |
| E-044 | McKinsey & Company | ESCALAR | FRENAR | R2, R1, R6 | no |
| E-045 | TechSolutions Tehran LLC | ESCALAR | FRENAR | R2, R1, R6 | no |
| E-046 | PyongYang Tech Ventures | ESCALAR | ESCALAR | R7 | no |
| E-047 | Damascus Advisory Group | ESCALAR | FRENAR | R2, R1, R6 | no |
| E-048 | RusTech Solutions | ESCALAR | FRENAR | R2, R1, R6 | no |
| E-049 | BelSoft Development | ESCALAR | FRENAR | R2, R1, R6 | no |
| E-050 | Stablecoin Bridge Inc | ESCALAR | FRENAR | R2, R1, R6 | no |
| E-051 | Deloitte Brasil Advisory | ESCALAR | FRENAR | R2, R1, R6 | sí |
| E-052 | AI Solutions Uruguay | ESCALAR | FRENAR | R2, R1, R6 | sí |
| E-053 | Agência Criativa Rio | ESCALAR | FRENAR | R2, R1, R6 | sí |
| E-054 | TalentHub México | ESCALAR | ESCALAR | R1, R6 | sí |
| E-055 | TalentHub Colombia | ESCALAR | ESCALAR | R1, R6 | sí |
| E-056 | HubSpot Inc | ESCALAR | FRENAR | R2, R1, R6 | sí |
| E-057 | PwC Colombia Advisory | ESCALAR | FRENAR | R2, R1, R6 | no |
| E-058 | Ripple Labs Inc | ESCALAR | FRENAR | R2, R1, R6 | sí |
| E-059 | UPS Supply Chain Solutions | ESCALAR | FRENAR | R2, R1, R6 | sí |
| E-060 | Old Media Bogotá SA | ESCALAR | FRENAR | R2, R1, R6 | sí |
| E-061 | Holding Pacific Group SA | ESCALAR | FRENAR | R2, R1, R6 | sí |
| E-062 | Infraestructura Global SA | ESCALAR | FRENAR | R2, R6 | no |
| E-063 | Remesas Express SA | ESCALAR | FRENAR | R2, R1, R6 | sí |
| E-064 | Deel Inc | ESCALAR | FRENAR | R2, R1, R6 | sí |
| E-065 | CryptoSettle BVI Ltd | ESCALAR | FRENAR | R2, R1, R6 | no |
| E-066 | Zendesk Inc | ESCALAR | FRENAR | R2, R1, R6 | sí |
| E-067 | Booz Allen Hamilton | ESCALAR | FRENAR | R2, R1, R6 | sí |
| E-068 | Figma Inc (adquirida por Adobe) | ESCALAR | FRENAR | R2, R1, R6 | sí |
| E-069 | G4S Security Colombia | ESCALAR | FRENAR | R2, R1, R6 | sí |
| E-070 | Constructora Andina SAS | ESCALAR | FRENAR | R2, R1, R6 | sí |
| E-071 | Qualcomm Inc | ESCALAR | FRENAR | R2, R1, R6 | sí |
| E-072 | Proveedores Buenos Aires SRL | ESCALAR | ESCALAR | R7 | sí |
| E-073 | Agencia Santiago Digital | ESCALAR | ESCALAR | R7 | sí |
| E-074 | Palantir Technologies | ESCALAR | FRENAR | R2, R1, R6 | sí |
| E-075 | Sony AI Research Japan | ESCALAR | ESCALAR | R7 | sí |
| E-076 | SAP SE Germany | ESCALAR | ESCALAR | R7 | sí |
| E-077 | Accenture UK Ltd | ESCALAR | ESCALAR | R7 | sí |
| E-078 | Andela Nigeria Ltd | ESCALAR | FRENAR | R2, R1, R6 | sí |
| E-079 | PAREXEL International | ESCALAR | FRENAR | R2, R1, R6 | sí |
| E-080 | Proveedores Varios LATAM | ESCALAR | FRENAR | R2, R6 | no |
