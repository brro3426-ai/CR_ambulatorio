-- Ejecutar después de schema.sql. Estas reglas se ejecutan en PostgreSQL,
-- independientemente de lo que intente enviar un cliente.

create table if not exists rate_limit_events (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid(),
  action text not null check (action in ('atencion', 'aviso')),
  created_at timestamptz not null default now()
);

create index if not exists rate_limit_events_lookup
  on rate_limit_events (user_id, action, created_at desc);

create or replace function enforce_rate_limit()
returns trigger
language plpgsql
security definer
as $$
declare
  recent_count integer;
begin
  if auth.uid() is null then
    raise exception 'Se requiere autenticación.';
  end if;

  select count(*) into recent_count
  from rate_limit_events
  where user_id = auth.uid()
    and action = case tg_table_name
      when 'atenciones' then 'atencion'
      when 'avisos' then 'aviso'
    end
    and created_at > now() - interval '1 minute';

  if recent_count >= 30 then
    raise exception 'Límite temporal excedido. Intenta nuevamente en un minuto.';
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

create or replace function validar_datos_operativos()
returns trigger
language plpgsql
as $$
begin
  if new.nombre is not null then
    new.nombre := btrim(regexp_replace(new.nombre, '[[:cntrl:]]', '', 'g'));
    if char_length(new.nombre) = 0 or char_length(new.nombre) > 120 then
      raise exception 'Nombre inválido.';
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

alter table rate_limit_events enable row level security;
