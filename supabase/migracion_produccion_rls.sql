-- Seguridad de producción para CR Ambulatorio.
-- Aplicar después de schema.sql, security.sql y migracion_seguridad_admin.sql.
-- Antes de aplicar: crear usuarios en Supabase Auth y vincular cada uno en perfiles.
-- No contiene contraseñas, service_role keys ni UUID administrativos.

create or replace function public.usuario_tiene_rol(roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from perfiles
    where user_id = auth.uid()
      and rol = any(roles)
  );
$$;

revoke all on function public.usuario_tiene_rol(text[]) from public;
grant execute on function public.usuario_tiene_rol(text[]) to authenticated;

-- La TV pública solo necesita consultar disponibilidad y especialidades.
drop policy if exists "public read medicos" on medicos;
drop policy if exists "public read turnos" on turnos;
drop policy if exists "public read avisos" on avisos;
drop policy if exists "public read atenciones" on atenciones;

-- Un usuario autenticado ve el catálogo completo solo desde las áreas operativas autorizadas.
create policy "personal autorizado lee medicos"
on medicos for select to authenticated
using (public.usuario_tiene_rol(array['administrador', 'supervisora']) or user_id = auth.uid());

create policy "personal autorizado lee turnos"
on turnos for select to authenticated
using (public.usuario_tiene_rol(array['administrador', 'supervisora']) or medico_id in (
  select medico_id from perfiles where user_id = auth.uid() and medico_id is not null
));

create policy "personal autorizado lee avisos"
on avisos for select to authenticated
using (public.usuario_tiene_rol(array['administrador', 'supervisora', 'funcionario']));

create policy "personal autorizado lee atenciones"
on atenciones for select to authenticated
using (
  public.usuario_tiene_rol(array['administrador', 'supervisora'])
  or medico_id in (select medico_id from perfiles where user_id = auth.uid() and medico_id is not null)
);

-- Solo administración y supervisión pueden modificar el inventario.
drop policy if exists "authenticated manage boxes" on boxes;
create policy "admin y supervisora gestionan boxes"
on boxes for all to authenticated
using (public.usuario_tiene_rol(array['administrador', 'supervisora']))
with check (public.usuario_tiene_rol(array['administrador', 'supervisora']));

-- El funcionario puede actualizar el estado del box que tiene asignado.
create policy "funcionario actualiza su box"
on boxes for update to authenticated
using (
  asignado_medico_id in (select medico_id from perfiles where user_id = auth.uid() and medico_id is not null)
)
with check (
  asignado_medico_id in (select medico_id from perfiles where user_id = auth.uid() and medico_id is not null)
);

-- Atenciones: cada funcionario opera sus propias atenciones; supervisión administra todas.
drop policy if exists "authenticated insert atenciones" on atenciones;
create policy "personal autorizado crea atenciones"
on atenciones for insert to authenticated
with check (
  public.usuario_tiene_rol(array['administrador', 'supervisora'])
  or medico_id in (select medico_id from perfiles where user_id = auth.uid() and medico_id is not null)
);

drop policy if exists "authenticated update atenciones" on atenciones;
create policy "personal autorizado actualiza atenciones"
on atenciones for update to authenticated
using (
  public.usuario_tiene_rol(array['administrador', 'supervisora'])
  or medico_id in (select medico_id from perfiles where user_id = auth.uid() and medico_id is not null)
)
with check (
  public.usuario_tiene_rol(array['administrador', 'supervisora'])
  or medico_id in (select medico_id from perfiles where user_id = auth.uid() and medico_id is not null)
);

-- Solo supervisión y administración pueden emitir avisos institucionales.
drop policy if exists "authenticated insert avisos" on avisos;
create policy "supervision emite avisos"
on avisos for insert to authenticated
with check (public.usuario_tiene_rol(array['administrador', 'supervisora']));

-- La geometría detallada queda restringida al administrador mediante las políticas existentes.
-- Verificación manual posterior:
-- 1. anon puede leer boxes/especialidades, pero no medicos/turnos/atenciones/avisos.
-- 2. funcionario solo ve su perfil, sus turnos y sus atenciones.
-- 3. supervisora ve operación, pero no gestiona perfiles.
-- 4. administrador gestiona el inventario y el plano.
