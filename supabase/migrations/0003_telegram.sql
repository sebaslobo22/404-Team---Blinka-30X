-- 0003_telegram.sql
-- Bot de Telegram de Pulso. Idempotente. Estado SIEMPRE en la base (nunca en memoria del servidor).
-- Lo escribe y lee SOLO el servidor con service_role (bypass de RLS). RLS activado SIN politicas:
-- anon y authenticated no ven ni escriben nada. Sin claves ni tokens en ninguna columna.

-- Chats que enviaron /start (sin /start previo el bot no procesa archivos).
create table if not exists public.telegram_chats (
  chat_id bigint primary key,
  usuario_id bigint,
  iniciado_en timestamptz not null default now()
);

-- update_id ya procesados. La PK hace atomico el descarte de repetidos (INSERT ... ON CONFLICT DO NOTHING).
create table if not exists public.telegram_updates (
  update_id bigint primary key,
  recibido_en timestamptz not null default now()
);

-- Facturas recibidas en vivo. Datos de prueba de la empresa ficticia Aurora Cloud.
create table if not exists public.telegram_facturas (
  id uuid primary key default gen_random_uuid(),
  chat_id bigint not null,
  update_id bigint not null,
  decision text not null check (decision in ('PAGAR','FRENAR','ESCALAR')),
  decision_motor text not null check (decision_motor in ('PAGAR','FRENAR','ESCALAR')),
  razones jsonb not null default '[]'::jsonb,
  resumen jsonb not null default '{}'::jsonb,
  estado_resolucion text not null default 'NO_APLICA'
    check (estado_resolucion in ('NO_APLICA','PENDIENTE','APROBADA','RECHAZADA')),
  -- Toda orden en vivo es simulada: no entra al lote CSV ni a la API de ordenes de la web.
  simulada boolean not null default true check (simulada),
  resuelta_por bigint,
  creada_en timestamptz not null default now(),
  resuelta_en timestamptz,
  -- El techo en vivo: ninguna factura de este canal queda en PAGAR.
  constraint telegram_techo_en_vivo check (decision <> 'PAGAR'),
  -- Solo una ESCALAR puede estar pendiente/aprobada/rechazada; el resto es NO_APLICA.
  constraint telegram_resolucion_coherente check (
    (decision = 'ESCALAR') = (estado_resolucion <> 'NO_APLICA')
  )
);
create index if not exists telegram_facturas_chat_idx on public.telegram_facturas (chat_id, creada_en desc);

-- Uso para los limites (una fila por factura aceptada).
create table if not exists public.telegram_uso (
  id bigserial primary key,
  chat_id bigint not null,
  creado_en timestamptz not null default now()
);
create index if not exists telegram_uso_chat_idx on public.telegram_uso (chat_id, creado_en);
create index if not exists telegram_uso_tiempo_idx on public.telegram_uso (creado_en);

alter table public.telegram_chats enable row level security;
alter table public.telegram_updates enable row level security;
alter table public.telegram_facturas enable row level security;
alter table public.telegram_uso enable row level security;
-- Sin politicas a proposito: solo service_role. Se quitan tambien los permisos de tabla por si acaso.
revoke all on public.telegram_chats, public.telegram_updates, public.telegram_facturas, public.telegram_uso from anon, authenticated;
revoke all on sequence public.telegram_uso_id_seq from anon, authenticated;

-- Cupo atomico: reserva un lugar en el limite por chat (ultima hora) y en el tope global (dia UTC).
-- El bloqueo consultivo serializa las llamadas: dos facturas simultaneas no pasan el limite.
-- Devuelve 'ok' (y cuenta), 'chat' o 'dia' (y no cuenta nada).
create or replace function public.telegram_consumir_cupo(
  p_chat bigint, p_ahora timestamptz, p_max_chat int, p_tope_dia int
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  en_hora int;
  en_dia int;
begin
  perform pg_advisory_xact_lock(hashtext('telegram_consumir_cupo'));
  delete from public.telegram_uso where creado_en < p_ahora - interval '2 days';
  select count(*) into en_hora from public.telegram_uso
    where chat_id = p_chat and creado_en > p_ahora - interval '1 hour' and creado_en <= p_ahora;
  if en_hora >= p_max_chat then
    return 'chat';
  end if;
  select count(*) into en_dia from public.telegram_uso
    where creado_en >= date_trunc('day', p_ahora at time zone 'utc') at time zone 'utc' and creado_en <= p_ahora;
  if en_dia >= p_tope_dia then
    return 'dia';
  end if;
  insert into public.telegram_uso (chat_id, creado_en) values (p_chat, p_ahora);
  return 'ok';
end $$;

revoke all on function public.telegram_consumir_cupo(bigint, timestamptz, int, int) from public, anon, authenticated;
grant execute on function public.telegram_consumir_cupo(bigint, timestamptz, int, int) to service_role;
