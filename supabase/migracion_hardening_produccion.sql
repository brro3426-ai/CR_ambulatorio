-- Hardening adicional para producción.
-- Aplicar después de security.sql y migracion_produccion_rls.sql.
-- Revisar primero en un proyecto de prueba.

-- Funciones SECURITY DEFINER con search_path fijo para evitar resolución insegura.
create or replace function public.usuario_tiene_rol(roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.perfiles
    where user_id = auth.uid()
      and rol = any(roles)
  );
$$;

revoke all on function public.usuario_tiene_rol(text[]) from public;
grant execute on function public.usuario_tiene_rol(text[]) to authenticated;

create or replace function public.enforce_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count integer;
  request_action text;
begin
  if auth.uid() is null then
    raise exception 'Acceso no autorizado.';
  end if;

  request_action := case tg_table_name
    when 'atenciones' then 'atencion'
    when 'avisos' then 'aviso'
    else 'consulta'
  end;

  select count(*) into recent_count
  from public.rate_limit_events
  where user_id = auth.uid()
    and action = request_action
    and created_at > now() - interval '1 minute';

  if recent_count >= 30 then
    raise exception 'Límite de operaciones excedido. Intenta nuevamente en un minuto.';
  end if;

  insert into public.rate_limit_events(user_id, action)
  values (auth.uid(), request_action);
  return new;
end;
$$;

revoke all on function public.enforce_rate_limit() from public;
grant execute on function public.enforce_rate_limit() to authenticated;

drop trigger if exists boxes_rate_limit on public.boxes;
create trigger boxes_rate_limit
before insert or update on public.boxes
for each row execute function public.enforce_rate_limit();

-- Validación server-side de inventario y avisos.
create or replace function public.validar_datos_operativos()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_table_name = 'boxes' then
    new.numero := btrim(regexp_replace(coalesce(new.numero, ''), '[[:cntrl:]]', '', 'g'));
    new.area := nullif(btrim(regexp_replace(coalesce(new.area, ''), '[[:cntrl:]]', '', 'g')), '');
    new.sector := nullif(btrim(regexp_replace(coalesce(new.sector, ''), '[[:cntrl:]]', '', 'g')), '');
    if new.numero = '' or char_length(new.numero) > 40 then
      raise exception 'Identificador de box inválido.';
    end if;
    if new.capacidad is null or new.capacidad < 1 or new.capacidad > 100 then
      raise exception 'Capacidad de box inválida.';
    end if;
  elsif tg_table_name = 'avisos' then
    if new.tipo not in ('llamado', 'supervisora') or jsonb_typeof(new.payload) <> 'object' then
      raise exception 'Aviso inválido.';
    end if;
    if octet_length(new.payload::text) > 4096 then
      raise exception 'Aviso demasiado grande.';
    end if;
  elsif tg_table_name in ('medicos', 'especialidades') and new.nombre is not null then
    new.nombre := btrim(regexp_replace(new.nombre, '[[:cntrl:]]', '', 'g'));
    if char_length(new.nombre) = 0 or char_length(new.nombre) > 120 then
      raise exception 'Nombre o texto inválido.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists boxes_validar_datos on public.boxes;
create trigger boxes_validar_datos
before insert or update on public.boxes
for each row execute function public.validar_datos_operativos();

drop trigger if exists avisos_validar_datos on public.avisos;
create trigger avisos_validar_datos
before insert or update on public.avisos
for each row execute function public.validar_datos_operativos();

create index if not exists rate_limit_events_recent_idx
on public.rate_limit_events (user_id, action, created_at desc);
