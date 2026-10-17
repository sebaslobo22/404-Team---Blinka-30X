-- =============================================================================
-- 0001_registro.sql
-- Registro de decisiones de Blinka: tabla SOLO DE ANADIR con hash encadenado.
--
-- ESTADO: NO PROBADO contra un Postgres real. Revisado a mano, sin ejecutar.
--         Antes de confiar en el, correr el bloque de verificacion manual del
--         final en una base de pruebas (nunca la de produccion).
--
-- QUE ES Y QUE NO ES
--   Es EVIDENCIA DE MANIPULACION, no inmutabilidad. Los triggers y los permisos
--   hacen que alterar o borrar una fila sea imposible para la aplicacion y para
--   los roles de la API, pero un superusuario (o el dueno de la tabla) puede
--   deshabilitar los triggers (ALTER TABLE ... DISABLE TRIGGER, o
--   SET session_replication_role = replica), reescribir toda la cadena o hacer
--   DROP TABLE. Eso solo se detecta comparando contra un ancla publicada aparte.
--   La VERIFICACION CRIPTOGRAFICA de la cadena (recalcular cada hash) NO se hace
--   aqui: la hace la aplicacion con verificarCadena (src/ledger/registro.ts).
--   La base solo impone forma, orden y consecutividad.
--
-- CORRESPONDENCIA CON src/ledger/registro.ts (EntradaRegistro)
--   indice          integer, desde 0, clave primaria
--   hash_previo     text, NULL solo en indice 0
--   hash            text, 64 hex en minuscula, unico
--   registrado_en   TEXT (no timestamptz, a proposito): el hash se calcula sobre
--                   la cadena exacta que genera la app. timestamptz la normalizaria
--                   (zona, precision) y el hash dejaria de coincidir al releer.
--   resultado       jsonb. Ojo: jsonb no conserva el orden de claves ni los
--                   espacios; es seguro solo porque la app hashea una forma
--                   canonica (canonico()). No guardar numeros cuya
--                   representacion cambie al pasar por jsonb.
--
-- QUIEN ESCRIBE
--   La aplicacion escribe con la clave service_role DESDE EL SERVIDOR.
--   El NAVEGADOR NO DEBE PODER INSERTAR: anon y authenticated no tienen ningun
--   permiso sobre la tabla (ni siquiera SELECT) y RLS esta activado sin politicas
--   para ellos. service_role tiene BYPASSRLS, por eso RLS no le estorba, y recibe
--   solo SELECT e INSERT. Esta migracion no contiene claves ni secretos; la clave
--   service_role vive solo en variables de entorno del servidor.
--
-- LIMITES CONOCIDOS
--   * Se asume una fila por INSERT. El trigger valida fila a fila contra lo ya
--     confirmado; un INSERT multifila no esta probado.
--   * Bajo REPEATABLE READ/SERIALIZABLE la lectura puede ser vieja tras esperar
--     el lock; en ese caso el INSERT falla (de forma segura) y se reintenta.
--   * Los roles anon/authenticated/service_role son de Supabase. Si un rol no
--     existe, la migracion lo omite en vez de fallar.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tabla
-- ---------------------------------------------------------------------------
CREATE TABLE public.registro (
  indice        integer     NOT NULL,
  hash_previo   text,
  hash          text        NOT NULL,
  registrado_en text        NOT NULL,
  resultado     jsonb       NOT NULL,
  CONSTRAINT registro_pkey PRIMARY KEY (indice),
  CONSTRAINT registro_hash_key UNIQUE (hash),
  CONSTRAINT registro_indice_no_negativo CHECK (indice >= 0),
  CONSTRAINT registro_hash_formato CHECK (hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT registro_hash_previo_formato CHECK (hash_previo IS NULL OR hash_previo ~ '^[0-9a-f]{64}$'),
  -- hash_previo es NULL si y solo si indice = 0
  CONSTRAINT registro_encadenado_coherente CHECK (
    (indice = 0 AND hash_previo IS NULL)
    OR (indice > 0 AND hash_previo IS NOT NULL)
  ),
  CONSTRAINT registro_hash_distinto_del_previo CHECK (hash_previo IS DISTINCT FROM hash),
  CONSTRAINT registro_registrado_en_no_vacio CHECK (length(registrado_en) > 0),
  CONSTRAINT registro_resultado_es_objeto CHECK (jsonb_typeof(resultado) = 'object')
);

COMMENT ON TABLE public.registro IS
  'Registro de decisiones solo de anadir con hash encadenado. Evidencia de manipulacion, no inmutabilidad. La cadena se verifica en la app (verificarCadena).';

-- ---------------------------------------------------------------------------
-- 2. Trigger BEFORE INSERT: indice consecutivo y hash_previo = hash de la ultima
--    fila. El advisory lock transaccional serializa inserciones concurrentes:
--    la segunda espera a que la primera confirme o aborte, y entonces lee la
--    cabeza ya actualizada. El lock se libera solo al terminar la transaccion.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.registro_validar_insercion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $fn$
DECLARE
  v_ultimo_indice   integer;
  v_ultimo_hash     text;
  v_indice_esperado integer;
  v_previo_esperado text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('public.registro', 0));

  SELECT r.indice, r.hash
    INTO v_ultimo_indice, v_ultimo_hash
    FROM public.registro AS r
   ORDER BY r.indice DESC
   LIMIT 1;

  IF NOT FOUND THEN
    v_indice_esperado := 0;
    v_previo_esperado := NULL;
  ELSE
    v_indice_esperado := v_ultimo_indice + 1;
    v_previo_esperado := v_ultimo_hash;
  END IF;

  IF NEW.indice IS DISTINCT FROM v_indice_esperado THEN
    RAISE EXCEPTION 'registro: indice invalido (recibido %, esperado %)', NEW.indice, v_indice_esperado
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.hash_previo IS DISTINCT FROM v_previo_esperado THEN
    RAISE EXCEPTION 'registro: hash_previo no coincide con el hash de la ultima entrada (indice %)', NEW.indice
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$fn$;

CREATE TRIGGER registro_validar_insercion
  BEFORE INSERT ON public.registro
  FOR EACH ROW
  EXECUTE FUNCTION public.registro_validar_insercion();

-- ---------------------------------------------------------------------------
-- 3. Triggers que prohiben UPDATE, DELETE y TRUNCATE
--    (UPDATE/DELETE por fila, TRUNCATE por sentencia: asi lo exige Postgres.)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.registro_bloquear_mutacion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $fn$
BEGIN
  RAISE EXCEPTION 'registro es solo de anadir: % no esta permitido', TG_OP
    USING ERRCODE = 'restrict_violation';
  RETURN NULL; -- inalcanzable; evita avisos de funcion sin RETURN
END;
$fn$;

CREATE TRIGGER registro_bloquear_update
  BEFORE UPDATE ON public.registro
  FOR EACH ROW
  EXECUTE FUNCTION public.registro_bloquear_mutacion();

CREATE TRIGGER registro_bloquear_delete
  BEFORE DELETE ON public.registro
  FOR EACH ROW
  EXECUTE FUNCTION public.registro_bloquear_mutacion();

CREATE TRIGGER registro_bloquear_truncate
  BEFORE TRUNCATE ON public.registro
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.registro_bloquear_mutacion();

-- ---------------------------------------------------------------------------
-- 4. RLS y permisos
--    RLS activado y SIN politicas para anon/authenticated: no ven ni escriben
--    nada. service_role omite RLS (BYPASSRLS) y solo tiene SELECT e INSERT.
--    Supabase concede ALL a anon/authenticated/service_role por defecto sobre
--    tablas nuevas de public, asi que primero se revoca todo y luego se concede
--    lo minimo. Cada rol se trata solo si existe.
-- ---------------------------------------------------------------------------
ALTER TABLE public.registro ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.registro FROM PUBLIC;

DO $perm$
DECLARE
  v_rol text;
BEGIN
  FOREACH v_rol IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = v_rol) THEN
      EXECUTE format('REVOKE ALL ON TABLE public.registro FROM %I', v_rol);
      -- Los privilegios que se piden explicitamente quedan fuera de toda duda:
      EXECUTE format('REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public.registro FROM %I', v_rol);
    END IF;
  END LOOP;

  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'REVOKE ALL ON TABLE public.registro FROM service_role';
    EXECUTE 'GRANT SELECT, INSERT ON TABLE public.registro TO service_role';
  END IF;
END;
$perm$;

-- Si algun dia el navegador debe LEER (nunca escribir), anadir algo como:
--   GRANT SELECT ON TABLE public.registro TO authenticated;
--   CREATE POLICY registro_lectura ON public.registro FOR SELECT TO authenticated USING (true);

-- =============================================================================
-- VERIFICACION MANUAL (comentada; NO se ejecuta con la migracion)
-- Correr en una base de PRUEBAS, como postgres o service_role. Todo queda dentro
-- de una transaccion que termina en ROLLBACK, asi que no deja filas.
-- Cada prueba espera un error concreto; si la sentencia NO falla, el bloque
-- aborta con 'NO BLOQUEADO'. El resultado se lee en los NOTICE.
-- =============================================================================
--
-- BEGIN;
--
-- DO $verif$
-- BEGIN
--   -- Entrada valida (la primera de la cadena)
--   INSERT INTO public.registro (indice, hash_previo, hash, registrado_en, resultado)
--   VALUES (0, NULL, repeat('a', 64), '2026-01-01T00:00:00.000Z', '{"prueba": true}');
--   RAISE NOTICE 'OK: insert valido indice 0 aceptado';
--
--   -- UPDATE debe fallar (restrict_violation)
--   BEGIN
--     UPDATE public.registro SET resultado = '{"alterado": true}' WHERE indice = 0;
--     RAISE EXCEPTION 'NO BLOQUEADO: UPDATE paso';
--   EXCEPTION WHEN restrict_violation THEN
--     RAISE NOTICE 'OK: UPDATE bloqueado';
--   END;
--
--   -- DELETE debe fallar
--   BEGIN
--     DELETE FROM public.registro WHERE indice = 0;
--     RAISE EXCEPTION 'NO BLOQUEADO: DELETE paso';
--   EXCEPTION WHEN restrict_violation THEN
--     RAISE NOTICE 'OK: DELETE bloqueado';
--   END;
--
--   -- TRUNCATE debe fallar
--   BEGIN
--     TRUNCATE TABLE public.registro;
--     RAISE EXCEPTION 'NO BLOQUEADO: TRUNCATE paso';
--   EXCEPTION WHEN restrict_violation THEN
--     RAISE NOTICE 'OK: TRUNCATE bloqueado';
--   END;
--
--   -- INSERT con indice incorrecto (salta de 0 a 5) debe fallar
--   BEGIN
--     INSERT INTO public.registro (indice, hash_previo, hash, registrado_en, resultado)
--     VALUES (5, repeat('a', 64), repeat('b', 64), '2026-01-01T00:00:01.000Z', '{"prueba": true}');
--     RAISE EXCEPTION 'NO BLOQUEADO: indice incorrecto paso';
--   EXCEPTION WHEN check_violation THEN
--     RAISE NOTICE 'OK: indice incorrecto rechazado';
--   END;
--
--   -- INSERT con hash_previo incorrecto debe fallar
--   BEGIN
--     INSERT INTO public.registro (indice, hash_previo, hash, registrado_en, resultado)
--     VALUES (1, repeat('c', 64), repeat('b', 64), '2026-01-01T00:00:01.000Z', '{"prueba": true}');
--     RAISE EXCEPTION 'NO BLOQUEADO: hash_previo incorrecto paso';
--   EXCEPTION WHEN check_violation THEN
--     RAISE NOTICE 'OK: hash_previo incorrecto rechazado';
--   END;
--
--   -- INSERT con hash mal formado (mayusculas) debe fallar por CHECK
--   BEGIN
--     INSERT INTO public.registro (indice, hash_previo, hash, registrado_en, resultado)
--     VALUES (1, repeat('a', 64), repeat('B', 64), '2026-01-01T00:00:01.000Z', '{"prueba": true}');
--     RAISE EXCEPTION 'NO BLOQUEADO: hash mal formado paso';
--   EXCEPTION WHEN check_violation THEN
--     RAISE NOTICE 'OK: hash mal formado rechazado';
--   END;
--
--   -- INSERT con hash repetido debe fallar (unique_violation)
--   BEGIN
--     INSERT INTO public.registro (indice, hash_previo, hash, registrado_en, resultado)
--     VALUES (1, repeat('a', 64), repeat('a', 64), '2026-01-01T00:00:01.000Z', '{"prueba": true}');
--     RAISE EXCEPTION 'NO BLOQUEADO: hash repetido paso';
--   EXCEPTION WHEN unique_violation OR check_violation THEN
--     RAISE NOTICE 'OK: hash repetido rechazado';
--   END;
--
--   -- INSERT siguiente correcto (indice 1, hash_previo = hash de la entrada 0) debe pasar
--   INSERT INTO public.registro (indice, hash_previo, hash, registrado_en, resultado)
--   VALUES (1, repeat('a', 64), repeat('b', 64), '2026-01-01T00:00:02.000Z', '{"prueba": true}');
--   RAISE NOTICE 'OK: insert encadenado correcto aceptado';
-- END;
-- $verif$;
--
-- ROLLBACK;
--
-- -- Permisos: el rol anon NO debe poder insertar ni leer (esperado: 42501
-- -- "permission denied for table registro"). Repetir con authenticated.
-- BEGIN;
-- SET LOCAL ROLE anon;
-- INSERT INTO public.registro (indice, hash_previo, hash, registrado_en, resultado)
-- VALUES (0, NULL, repeat('d', 64), '2026-01-01T00:00:00.000Z', '{"prueba": true}');  -- debe fallar
-- ROLLBACK;
--
-- -- Privilegios efectivos (debe dar false en las seis filas de anon y authenticated):
-- SELECT r.rol, p.priv, has_table_privilege(r.rol, 'public.registro', p.priv) AS tiene
--   FROM (VALUES ('anon'), ('authenticated')) AS r(rol)
--  CROSS JOIN (VALUES ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'), ('SELECT')) AS p(priv);
