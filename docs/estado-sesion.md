# Estado de la sesión del integrador (para retomar tras compactar)

**Emitido:** 17/10/2026 - 4:30 p.m. (Caracas, Venezuela). Lo actualiza el agente integrador (Sebastián + Claude).
Hito V1: **sáb 17/10 11:00 p.m.** · Cierre: **dom 18/10 1:00 p.m.** (hora Caracas).

## Dónde está todo
- Repo público: `sebaslobo22/404-Team---Blinka-30X` · clon `~/Hackaton 30X/repo-equipo` (en `main`) · worktree para documentos: `repo-equipo/.claude/worktrees/integrador`.
- Contexto compartido: `CLAUDE.md` · reto oficial `docs/brief-blinka.md` · exigencias y huecos `docs/requisitos.md` · escenarios y diagrama `docs/mapa-escenarios.md` (FigJam https://www.figma.com/board/Z35gyUNofAP7wy2AWshTI6, también en el README) · diseño `docs/diseno-bottom-up.md` y `docs/METAPROMPT-DISENO-V2.md` · tour `docs/recorrido-evidencia.md` · despliegue `docs/despliegue-produfy.md` · bitácora `docs/decisiones.md` · zonas `docs/ZONAS.md`.
- Producto **en vivo para el jurado: https://equipo404.produfy.co** (Produfy, `MODO_PUBLICO=1`: `/team` y `/api/team` dan 404; sin secretos cargados).
- Centro de mando del equipo: **https://404team.vercel.app/team** (Vercel, con Supabase y PIN; versión congelada por el tope diario de Vercel, que se libera hacia la madrugada del 18/10).

## Hecho hoy (todo verificado)
Motor TS con defensas (PR #2) · centro de mando con Supabase en tiempo real (#3, #4) · lector de facturas sobre Aurora Cloud, 18 documentos y lecturas reales, motor 18/18 (#6) · defensas visibles (#7) · modo público (#8) · rediseño UI 1 (#9) · tour + barra lateral + paleta propia (#10) · defensas del lector: no-cobro, aritmética, fallo del modelo (#11) · **rediseño "Veredicto" de Codex (#13), revisado: 424 pruebas, FRENAR no se aprueba por API, sin jerga visible**. Repo público. Arreglo del 500 del modo público en proxies (`middleware.ts`, 404 directo).

## Hecho a las 4:30 p.m. (verificado)
- `main` (`e9aab96`, con el rediseño #13) desplegado en Produfy: `/` y pantallas 200; `/team`, `/team/contexto.md`, `/api/team/contexto`, `/equipo` → 404 desde un cliente sin sesión.
- Enlace del jurado fijado: **https://equipo404.produfy.co** (no se cambia). Documentos alineados (sin secretos en Produfy). Nombre **Pulso** en README y `CLAUDE.md`.

## Pendiente, en orden
5. **PR #12 de Andrés** (lecturas reales) quedó en conflicto; él lo rehace desde `main`. Cerrar #12 cuando llegue el nuevo y fusionar solo con "Create a merge commit".
6. **Tour de 4 pasos** para el usuario + ayuda "¿Qué es esto?" + tour del jurado en `?recorrido=jurado` (especificación en `docs/recorrido-evidencia.md`). Coordinar con Andrés, que también tocará `app/`.
7. **Set ciego (Joffre):** si a las **7:00 p.m.** no hay nada, plan B.
8. Tareas de Andrés abiertas en `/team`: rangos válidos en `/reglas`, prueba de lote contra presupuesto, "para cuándo" visible, editar beneficiarios.

## Reglas de trabajo vigentes
- Opus decide, revisa y aplica a producción; Sonnet escribe código e investiga; Haiku solo tareas mecánicas; Fable solo como consultor en los 4 casos definidos.
- Consultar Graphify antes de leer código (nube para `main`, grafo local para ramas).
- Solo Sebastián fusiona, con merge commit. Nunca `git add -A` en la raíz. No escribir en la rama de otro agente.
- Marca de tiempo real con `TZ=America/Caracas date`. Respuestas cortas, sin jerga, con una sola acción siguiente.
