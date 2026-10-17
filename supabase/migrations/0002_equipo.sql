-- 0002_equipo.sql
-- Centro de mando del equipo 404 (/equipo). Idempotente.
-- Escribe SOLO service_role desde el servidor (bypass de RLS). anon/authenticated solo leen.

create table if not exists public.equipo_tareas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  detalle text,
  dueno text not null check (dueno in ('Sebastián','Andrés','Joffre','Todos')),
  bloque int not null default 0,
  estado text not null default 'pendiente' check (estado in ('pendiente','en_curso','bloqueada','hecha')),
  orden int not null default 0,
  actualizado_por text,
  actualizado_en timestamptz default now()
);

create table if not exists public.equipo_zonas (
  ruta text primary key,
  dueno text not null,
  agente text,
  tomada_en timestamptz,
  nota text
);

create table if not exists public.equipo_bitacora (
  id bigserial primary key,
  cuando timestamptz default now(),
  quien text not null,
  es_agente boolean default false,
  accion text not null,
  detalle text,
  commit text
);

create table if not exists public.equipo_estado (
  clave text primary key,
  valor jsonb not null,
  actualizado_en timestamptz default now()
);

-- Bitácora: solo insertar.
create or replace function public.equipo_bitacora_solo_insertar() returns trigger
language plpgsql as $$
begin
  raise exception 'equipo_bitacora es solo de insertar (% bloqueado)', tg_op;
end $$;

drop trigger if exists equipo_bitacora_no_update on public.equipo_bitacora;
create trigger equipo_bitacora_no_update before update on public.equipo_bitacora
  for each row execute function public.equipo_bitacora_solo_insertar();

drop trigger if exists equipo_bitacora_no_delete on public.equipo_bitacora;
create trigger equipo_bitacora_no_delete before delete on public.equipo_bitacora
  for each row execute function public.equipo_bitacora_solo_insertar();

-- RLS: lectura para anon y authenticated; sin políticas de escritura.
alter table public.equipo_tareas enable row level security;
alter table public.equipo_zonas enable row level security;
alter table public.equipo_bitacora enable row level security;
alter table public.equipo_estado enable row level security;

do $$
declare t text;
begin
  foreach t in array array['equipo_tareas','equipo_zonas','equipo_bitacora','equipo_estado'] loop
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname=t||'_lectura') then
      execute format('create policy %I on public.%I for select to anon, authenticated using (true)', t||'_lectura', t);
    end if;
  end loop;
end $$;

grant select on public.equipo_tareas, public.equipo_zonas, public.equipo_bitacora, public.equipo_estado to anon, authenticated;

-- Realtime: ignora si ya están publicadas.
do $$
declare t text;
begin
  foreach t in array array['equipo_tareas','equipo_zonas','equipo_bitacora','equipo_estado'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
              when undefined_object then null;
    end;
  end loop;
end $$;
