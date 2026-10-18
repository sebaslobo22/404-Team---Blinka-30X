-- 0004_empresas.sql
-- Empresas en el bot de Telegram: cada chat pertenece a una empresa y las facturas se deciden con los
-- proveedores y el limite de SU empresa; solo el dueno de ESA empresa aprueba. Idempotente.
-- Compatible con el codigo anterior: solo agrega tablas y columnas nulables. Aplicar ANTES de desplegar
-- el codigo nuevo. Igual que 0003: RLS activado sin politicas, solo el servidor (service_role) lee y escribe.

-- Empresas. La demo (Aurora Cloud) es una fila real con id fijo: su aprobador es TELEGRAM_DUENO_ID
-- (dueno_usuario_id null). Una factura sin empresa no la aprueba nadie.
create table if not exists public.telegram_empresas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(nombre) between 1 and 60),
  codigo text not null unique check (codigo ~ '^PULSO-[A-Z2-9]{6}$'),
  es_demo boolean not null default false,
  dueno_chat_id bigint,
  dueno_usuario_id bigint,
  limite_pago_usd_centavos bigint not null default 500000 check (limite_pago_usd_centavos between 100 and 100000000),
  creada_en timestamptz not null default now(),
  constraint telegram_empresa_dueno check (es_demo or (dueno_chat_id is not null and dueno_usuario_id is not null))
);

insert into public.telegram_empresas (id, nombre, codigo, es_demo)
values ('00000000-0000-4000-8000-00000000a0a0', 'Aurora Cloud (demo)', 'PULSO-DEMO22', true)
on conflict (id) do nothing;

-- Miembros: un chat pertenece a una sola empresa a la vez.
create table if not exists public.telegram_miembros (
  chat_id bigint primary key,
  usuario_id bigint,
  empresa_id uuid not null references public.telegram_empresas (id),
  rol text not null check (rol in ('DUENO', 'EQUIPO')),
  unido_en timestamptz not null default now()
);
create index if not exists telegram_miembros_empresa_idx on public.telegram_miembros (empresa_id);

-- Proveedores aceptados por empresa. Los escribe el dueno con /proveedor (nunca sale de una lectura del modelo).
create table if not exists public.telegram_proveedores (
  empresa_id uuid not null references public.telegram_empresas (id),
  id_fiscal text not null check (char_length(id_fiscal) between 1 and 40),
  cuenta text not null check (char_length(cuenta) between 1 and 60),
  nombre text not null check (char_length(nombre) between 1 and 80),
  desde date not null default current_date,
  agregado_por bigint,
  primary key (empresa_id, id_fiscal, cuenta)
);

alter table public.telegram_facturas add column if not exists empresa_id uuid references public.telegram_empresas (id);
-- Si el codigo viejo sigue corriendo un rato despues de migrar, sus facturas caen en la demo (no quedan sin aprobador).
alter table public.telegram_facturas alter column empresa_id set default '00000000-0000-4000-8000-00000000a0a0';
create index if not exists telegram_facturas_empresa_idx on public.telegram_facturas (empresa_id, creada_en desc);

-- Lo que ya existia pasa a la demo: los chats con /start quedan como EQUIPO de Aurora y sus facturas, de Aurora.
insert into public.telegram_miembros (chat_id, usuario_id, empresa_id, rol)
select chat_id, usuario_id, '00000000-0000-4000-8000-00000000a0a0', 'EQUIPO' from public.telegram_chats
on conflict (chat_id) do nothing;
update public.telegram_facturas set empresa_id = '00000000-0000-4000-8000-00000000a0a0' where empresa_id is null;

alter table public.telegram_empresas enable row level security;
alter table public.telegram_miembros enable row level security;
alter table public.telegram_proveedores enable row level security;
revoke all on public.telegram_empresas, public.telegram_miembros, public.telegram_proveedores from anon, authenticated;

-- Crear empresa en UNA transaccion: si el chat ya es dueno de una empresa, devuelve esa (dos /crear no
-- crean dos empresas); si no, la crea con el codigo que genero el servidor (crypto) y deja al chat como
-- DUENO. Si el codigo choca devuelve cero filas y el servidor reintenta con otro.
create or replace function public.telegram_crear_empresa(p_chat bigint, p_usuario bigint, p_nombre text, p_codigo text)
returns table (empresa_id uuid, codigo text, nueva boolean)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_id uuid;
  v_codigo text;
begin
  perform pg_advisory_xact_lock(p_chat);
  -- Ya es dueno de una empresa (por su membresia o porque la creo este chat): se devuelve esa.
  select e.id, e.codigo into v_id, v_codigo
    from public.telegram_empresas e
    where not e.es_demo and (e.dueno_chat_id = p_chat
      or e.id = (select m.empresa_id from public.telegram_miembros m where m.chat_id = p_chat and m.rol = 'DUENO'))
    order by e.creada_en limit 1;
  if v_id is not null then
    insert into public.telegram_miembros (chat_id, usuario_id, empresa_id, rol)
      values (p_chat, p_usuario, v_id, 'DUENO')
      on conflict (chat_id) do update set empresa_id = excluded.empresa_id, rol = 'DUENO';
    return query select v_id, v_codigo, false;
    return;
  end if;
  begin
    insert into public.telegram_empresas (nombre, codigo, dueno_chat_id, dueno_usuario_id)
      values (left(p_nombre, 60), p_codigo, p_chat, p_usuario) returning id into v_id;
  exception when unique_violation then
    return;
  end;
  insert into public.telegram_miembros (chat_id, usuario_id, empresa_id, rol)
    values (p_chat, p_usuario, v_id, 'DUENO')
    on conflict (chat_id) do update set usuario_id = excluded.usuario_id, empresa_id = excluded.empresa_id, rol = 'DUENO', unido_en = now();
  return query select v_id, p_codigo, true;
end $$;
revoke all on function public.telegram_crear_empresa(bigint, bigint, text, text) from public, anon, authenticated;
grant execute on function public.telegram_crear_empresa(bigint, bigint, text, text) to service_role;
