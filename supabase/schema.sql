create table especialidades (id serial primary key, nombre text not null unique);
create table medicos (id serial primary key, nombre text not null, tipo text not null default 'medico' check (tipo in ('medico','kinesiologo','dermatologo','cardiologo','otro')), especialidad_id int references especialidades(id) on delete set null);
create table boxes (id serial primary key, numero text not null unique, piso int, especialidad_id int references especialidades(id) on delete set null, estado text default 'disponible' check (estado in ('disponible','en_atencion','fuera_servicio')));
create table turnos (id serial primary key, box_id int references boxes(id) on delete cascade, medico_id int references medicos(id) on delete set null, hora_inicio time, hora_fin time, dia_semana text);
create table atenciones (id serial primary key, box_id int references boxes(id) on delete cascade, medico_id int references medicos(id) on delete set null, hora_entrada timestamptz default now(), hora_salida timestamptz);
create table avisos (id bigint generated always as identity primary key, tipo text not null check (tipo in ('llamado','supervisora')), payload jsonb not null, creado_en timestamptz default now());

-- Restricción de Especialidad: Un profesional solo puede atender en salas de su propia especialidad
create or replace function validar_especialidad_atencion()
returns trigger language plpgsql as $$
declare
  box_esp_id int;
  medico_esp_id int;
  medico_nom text;
  box_num text;
begin
  select especialidad_id, numero into box_esp_id, box_num from boxes where id = new.box_id;
  select especialidad_id, nombre into medico_esp_id, medico_nom from medicos where id = new.medico_id;
  
  if box_esp_id is not null and medico_esp_id is not null and box_esp_id <> medico_esp_id then
    raise exception 'Restricción: El profesional % no puede ingresar a la sala % porque son de especialidades distintas.', medico_nom, box_num;
  end if;
  return new;
end;
$$;

drop trigger if exists atencion_validar_especialidad on atenciones;
create trigger atencion_validar_especialidad
before insert on atenciones
for each row execute function validar_especialidad_atencion();

create or replace function sincronizar_estado_box()
returns trigger language plpgsql as $$
begin
  if new.hora_salida is null then
    update boxes set estado = 'en_atencion' where id = new.box_id;
  else
    update boxes set estado = 'disponible' where id = new.box_id;
  end if;
  return new;
end;
$$;
create trigger atencion_actualiza_box after insert or update of hora_salida on atenciones
for each row execute function sincronizar_estado_box();

update boxes set estado = case when exists (
  select 1 from atenciones where atenciones.box_id = boxes.id and atenciones.hora_salida is null
) then 'en_atencion' else 'disponible' end;

/* =====================================================================
   DATOS FICTICIOS DE PRUEBA. NO SON DATOS REALES DEL HOSPITAL.
   ===================================================================== */
insert into especialidades (nombre) values ('Medicina Interna'), ('Cardiologia'), ('Dermatologia'), ('Kinesiologia');
insert into medicos (nombre, tipo, especialidad_id)
select v.nombre, v.tipo, e.id from (values
  ('Dra. Laura Perez','medico','Medicina Interna'), ('Dr. Andres Soto','medico','Medicina Interna'),
  ('Dra. Camila Rojas','cardiologo','Cardiologia'), ('Dr. Felipe Mena','cardiologo','Cardiologia'),
  ('Dra. Paula Silva','dermatologo','Dermatologia'), ('Dr. Nicolas Vera','dermatologo','Dermatologia'),
  ('Kinesióloga Valentina Soto','kinesiologo','Kinesiologia'), ('Kinesiólogo Diego Perez','kinesiologo','Kinesiologia')
) v(nombre, tipo, especialidad) join especialidades e on e.nombre = v.especialidad;

insert into boxes (numero, piso, especialidad_id)
select v.numero, v.piso, e.id from (values
  ('B-201',2,'Medicina Interna'), ('B-202',2,'Medicina Interna'),
  ('B-301',3,'Cardiologia'), ('B-302',3,'Cardiologia'),
  ('B-401',4,'Dermatologia'), ('B-402',4,'Dermatologia'),
  ('B-101',1,'Kinesiologia'), ('B-102',1,'Kinesiologia')
) v(numero,piso,especialidad) join especialidades e on e.nombre = v.especialidad;

insert into turnos (box_id, medico_id, hora_inicio, hora_fin, dia_semana)
select b.id, m.id, '08:00', '14:00', 'lunes' from boxes b join medicos m on m.especialidad_id = b.especialidad_id;

-- Supabase: Database > Replication > habilitar boxes y atenciones para Realtime.
alter table boxes replica identity full;
alter table atenciones replica identity full;
alter table avisos replica identity full;
alter publication supabase_realtime add table avisos;

-- Para la demo: lectura publica de disponibilidad y escritura de atenciones.
alter table especialidades enable row level security;
alter table medicos enable row level security;
alter table boxes enable row level security;
alter table turnos enable row level security;
alter table atenciones enable row level security;
create policy "public read especialidades" on especialidades for select to anon, authenticated using (true);
create policy "public read medicos" on medicos for select to anon, authenticated using (true);
create policy "public read boxes" on boxes for select to anon, authenticated using (true);
create policy "public read turnos" on turnos for select to anon, authenticated using (true);
create policy "public read atenciones" on atenciones for select to anon, authenticated using (true);
create policy "authenticated read atenciones" on atenciones for select to authenticated using (true);
create policy "authenticated insert atenciones" on atenciones for insert to authenticated with check (true);
create policy "authenticated finish atenciones" on atenciones for update to authenticated using (true) with check (true);
drop policy if exists "public read atenciones" on atenciones;

alter table avisos enable row level security;
create policy "public read avisos" on avisos for select to anon, authenticated using (true);
create policy "authenticated insert avisos" on avisos for insert to authenticated with check (true);
