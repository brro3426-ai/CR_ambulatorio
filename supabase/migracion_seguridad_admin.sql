-- Primera fase de seguridad para el plano detallado del CR.
-- Ejecutar en Supabase SQL Editor una vez, despues de las migraciones actuales.
-- Esta migracion no cambia las politicas existentes de boxes, atenciones ni pantallas publicas.

create table if not exists perfiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  rol text not null check (rol in ('administrador', 'supervisora', 'funcionario')),
  medico_id int references medicos(id) on delete set null,
  creado_en timestamptz not null default now()
);

create table if not exists plano_geometria (
  id bigint generated always as identity primary key,
  tipo text not null check (tipo in ('sector', 'box', 'pasillo', 'espacio_neutro')),
  referencia text not null unique,
  area text,
  posicion_x numeric not null,
  posicion_y numeric not null,
  ancho numeric not null check (ancho > 0),
  largo numeric not null check (largo > 0),
  rotacion numeric not null default 0,
  creado_en timestamptz not null default now()
);

alter table perfiles enable row level security;
alter table plano_geometria enable row level security;

create or replace function public.es_administrador()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from perfiles
    where user_id = auth.uid()
      and rol = 'administrador'
  );
$$;

revoke all on function public.es_administrador() from public;
grant execute on function public.es_administrador() to authenticated;

drop policy if exists "usuario lee su perfil" on perfiles;
create policy "usuario lee su perfil"
on perfiles for select to authenticated
using (user_id = auth.uid());

drop policy if exists "administrador gestiona perfiles" on perfiles;
create policy "administrador gestiona perfiles"
on perfiles for all to authenticated
using (public.es_administrador())
with check (public.es_administrador());

drop policy if exists "administradores ven plano" on plano_geometria;
create policy "administradores ven plano"
on plano_geometria for select to authenticated
using (public.es_administrador());

drop policy if exists "administradores gestionan plano" on plano_geometria;
create policy "administradores gestionan plano"
on plano_geometria for all to authenticated
using (public.es_administrador())
with check (public.es_administrador());

-- No se inserta una cuenta administrativa fija en el repositorio.
-- Después de crear el usuario en Supabase Auth, ejecuta manualmente:
-- insert into perfiles (user_id, rol)
-- values ('UUID_REAL_DEL_USUARIO_ADMIN', 'administrador')
-- on conflict (user_id) do update set rol = excluded.rol;