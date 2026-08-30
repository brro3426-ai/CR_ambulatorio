-- =====================================================================
-- REGLAS DE SEGURIDAD HOSPITALARIA, RATE LIMITING Y RLS (SUPABASE / POSTGRESQL)
-- =====================================================================

-- 1. Vincular tabla médicos con cuentas de usuario de Supabase Auth
alter table medicos add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table medicos add column if not exists email text;

-- 2. Tabla para auditar y controlar Rate Limiting
create table if not exists rate_limit_events (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid(),
  action text not null check (action in ('atencion', 'aviso', 'consulta')),
  created_at timestamptz not null default now()
);

create index if not exists rate_limit_events_lookup
  on rate_limit_events (user_id, action, created_at desc);

-- 3. Función y Trigger de Rate Limiting (Máx 30 peticiones por minuto por usuario autenticado)
create or replace function enforce_rate_limit()
returns trigger
language plpgsql
security definer
as $$
declare
  recent_count integer;
begin
  if auth.uid() is null then
    raise exception 'Acceso no autorizado. Se requiere autenticación institucional.';
  end if;

  select count(*) into recent_count
  from rate_limit_events
  where user_id = auth.uid()
    and action = case tg_table_name
      when 'atenciones' then 'atencion'
      when 'avisos' then 'aviso'
      else 'consulta'
    end
    and created_at > now() - interval '1 minute';

  if recent_count >= 30 then
    raise exception 'Límite de peticiones hospitalarias excedido. Espera 1 minuto antes de reintentar.';
  end if;

  insert into rate_limit_events(user_id, action)
  values (auth.uid(), case tg_table_name when 'atenciones' then 'atencion' else 'aviso' end);
  return new;
end;
$$;

drop trigger if exists atenciones_rate_limit on atenciones;
create trigger atenciones_rate_limit
before insert on atenciones
for each row execute function enforce_rate_limit();

drop trigger if exists avisos_rate_limit on avisos;
create trigger avisos_rate_limit
before insert on avisos
for each row execute function enforce_rate_limit();

-- 4. ROW LEVEL SECURITY (RLS) ESTRICTO
alter table especialidades enable row level security;
alter table medicos enable row level security;
alter table boxes enable row level security;
alter table turnos enable row level security;
alter table atenciones enable row level security;
alter table avisos enable row level security;
alter table rate_limit_events enable row level security;

-- Políticas de lectura pública (para Pantallas TV de pasillo / Tótems de espera)
drop policy if exists "public read especialidades" on especialidades;
create policy "public read especialidades" on especialidades for select to anon, authenticated using (true);

drop policy if exists "public read boxes" on boxes;
create policy "public read boxes" on boxes for select to anon, authenticated using (true);

drop policy if exists "public read medicos" on medicos;
create policy "public read medicos" on medicos for select to anon, authenticated using (true);

drop policy if exists "public read turnos" on turnos;
create policy "public read turnos" on turnos for select to anon, authenticated using (true);

drop policy if exists "public read avisos" on avisos;
create policy "public read avisos" on avisos for select to anon, authenticated using (true);

-- Políticas RLS estrictas para Atenciones y Modificaciones de Salas
drop policy if exists "authenticated read atenciones" on atenciones;
create policy "authenticated read atenciones" on atenciones for select to authenticated using (true);

drop policy if exists "authenticated insert atenciones" on atenciones;
create policy "authenticated insert atenciones" on atenciones for insert to authenticated with check (
  -- Solo usuarios autenticados pueden registrar atenciones
  auth.role() = 'authenticated'
);

drop policy if exists "authenticated update atenciones" on atenciones;
create policy "authenticated update atenciones" on atenciones for update to authenticated using (
  auth.role() = 'authenticated'
) with check (
  auth.role() = 'authenticated'
);

drop policy if exists "authenticated insert avisos" on avisos;
create policy "authenticated insert avisos" on avisos for insert to authenticated with check (
  auth.role() = 'authenticated'
);

-- Validación de datos saneados para prevenir inyecciones
create or replace function validar_datos_operativos()
returns trigger
language plpgsql
as $$
begin
  if new.nombre is not null then
    new.nombre := btrim(regexp_replace(new.nombre, '[[:cntrl:]]', '', 'g'));
    if char_length(new.nombre) = 0 or char_length(new.nombre) > 120 then
      raise exception 'Nombre o texto inválido.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists medicos_validar_datos on medicos;
create trigger medicos_validar_datos
before insert or update on medicos
for each row execute function validar_datos_operativos();

drop trigger if exists especialidades_validar_datos on especialidades;
create trigger especialidades_validar_datos
before insert or update on especialidades
for each row execute function validar_datos_operativos();
