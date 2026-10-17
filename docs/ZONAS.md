# Zonas de trabajo — quién toca qué

**Vigente desde:** 17/10/2026 - 12:15 p.m. (Caracas). Estado vivo: `/team` → Zonas.

Regla: cada carpeta tiene un dueño. Su agente la toma antes de editar y la suelta al terminar.
Fuera de tu zona: PR con revisión del dueño, y una nota en la bitácora. Dos agentes nunca editan
el mismo archivo a la vez.

| Zona (carpetas) | Dueño | Qué contiene |
|---|---|---|
| `src/engine/`, `src/ledger/`, `supabase/migrations/0001*`, `tests/engine*`, `tests/ledger*`, `tests/properties*`, `data/dev-set.json` | Andrés | Motor R1–R8, registro encadenado, set de desarrollo |
| `app/` (menos `app/team`), `app/api/` (menos `app/api/team`), `src/demo/` | Andrés | Tablero del producto: reglas, decisiones, cola de aprobación |
| `src/extraccion/`, `data/facturas/`, `scripts/banco-modelos*` | Sebastián | Lector de facturas, archivos reales, banco de modelos |
| `app/team/`, `app/api/team/`, `scripts/equipo.mjs`, `supabase/migrations/0002*` | Sebastián | Centro de mando |
| `tests/adversarial/`, `data/ciego/` | Joffre | Suite adversarial y set ciego (congelado; nadie lo abre antes del domingo) |
| `docs/`, `CLAUDE.md`, `README.md` | Sebastián (integrador) | Contexto y acuerdos; cualquiera propone por PR |
| `package.json`, `tsconfig.json`, `next.config.*`, `vitest.config.ts` | Sebastián (integrador) | Configuración compartida; cambios solo por PR avisada |
| `referencia/` | nadie | Motor JS de referencia; solo lectura |

Excepción acordada el 17/10: Sebastián abre una PR en `src/engine` para portar tres defensas
(instrucciones ocultas, confianza, nombre normalizado). Andrés la revisa.

**Alto riesgo:** `src/engine/types.ts` lo usan 16 archivos (medido con Graphify). Quien lo cambie avisa antes en la bitácora y corre `npm test` completo.
