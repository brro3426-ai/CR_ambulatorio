-- Almacenamiento privado para la planta arquitectonica del CR.
-- Ejecutar despues de migracion_seguridad_admin.sql.

insert into storage.buckets (id, name, public)
values ('CR', 'CR', false)
on conflict (id) do update set public = false;

drop policy if exists "administradores leen planos privados" on storage.objects;
create policy "administradores leen planos privados"
on storage.objects for select to authenticated
using (bucket_id = 'CR' and public.es_administrador());

drop policy if exists "administradores cargan planos privados" on storage.objects;
create policy "administradores cargan planos privados"
on storage.objects for insert to authenticated
with check (bucket_id = 'CR' and public.es_administrador());

drop policy if exists "administradores actualizan planos privados" on storage.objects;
create policy "administradores actualizan planos privados"
on storage.objects for update to authenticated
using (bucket_id = 'CR' and public.es_administrador())
with check (bucket_id = 'CR' and public.es_administrador());

drop policy if exists "administradores eliminan planos privados" on storage.objects;
create policy "administradores eliminan planos privados"
on storage.objects for delete to authenticated
using (bucket_id = 'CR' and public.es_administrador());
