# Despliegue en Produfy (mientras Vercel está limitado)

**Emitido:** 17/10/2026 - 4:07 p.m. (Caracas, Venezuela).

**Por qué:** la cuenta de Vercel (plan Hobby) llegó al tope de 100 despliegues en 24 horas el 17/10 (hango-b2c 96 + 404team 44). Hasta que se liberen cupos (estimado: madrugada del domingo 18/10), Vercel no publica nada nuevo; https://404team.vercel.app sigue sirviendo la última versión que salió.

**Sitio en Produfy:** **https://equipo404.produfy.co** (pila `nextjs`, sin base de datos propia; usa el Supabase del equipo). Primer despliegue: `main` en `dc12dc6`.

## Cómo desplegar (lo hace un agente con el conector de Produfy)
1. Empaquetar `main` sin `.env` ni `.git`: `git archive --format=zip -o equipo404.zip origin/main`.
2. `request_upload(slug="equipo404")` → devuelve una URL de un solo uso (15 min).
3. `curl --fail-with-body -T equipo404.zip '<url>'` → arranca el despliegue y devuelve `job_id`.
4. `wait_for_job(job_id)`: construye, cambia de versión de forma atómica y **vuelve solo a la anterior si la salud falla**.
5. Comprobar `/`, `/facturas/F-016`, `/cola`, `/reglas`, `/registro`, `/team`.

## Variables
- Cargadas: `EXTRACTION_MODE=replay`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (públicas).
- Secretas (cargadas el 17/10 a las 4:09 p.m. con `secret=true`, por pedido de Sebastián): `SUPABASE_SERVICE_ROLE_KEY` y `EQUIPO_PIN`. Con ellas, `/team` en Produfy lee Supabase en vivo y acepta escrituras con PIN (verificado: entrar 200, escribir sin PIN 401, con PIN 201).
- `NEXT_PUBLIC_*` se fijan al construir: si cambian, hay que volver a desplegar.

## Límites del plan de prueba
1 sitio · 20 % de CPU · sesión del conector con vencimiento (volver a iniciar sesión si una herramienta lo pide). El aviso "parece necesitar PostgreSQL" no aplica: viene de la librería `pg` que usa `scripts/migrar.mjs`.
