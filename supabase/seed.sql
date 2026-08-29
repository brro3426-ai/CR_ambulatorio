-- Carga inicial segura para CR Ambulatorio.
-- Se puede ejecutar después de schema.sql; no borra tablas ni duplica datos.

insert into especialidades (nombre) values
  ('Medicina Interna'), ('Cardiologia'), ('Dermatologia'), ('Kinesiologia')
on conflict (nombre) do nothing;

insert into medicos (nombre, tipo, especialidad_id)
select datos.nombre, datos.tipo, especialidades.id
from (values
  ('Dra. Laura Perez', 'medico', 'Medicina Interna'),
  ('Dr. Andres Soto', 'medico', 'Medicina Interna'),
  ('Dra. Camila Rojas', 'cardiologo', 'Cardiologia'),
  ('Dr. Felipe Mena', 'cardiologo', 'Cardiologia'),
  ('Dra. Paula Silva', 'dermatologo', 'Dermatologia'),
  ('Dr. Nicolas Vera', 'dermatologo', 'Dermatologia'),
  ('Kinesióloga Valentina Soto', 'kinesiologo', 'Kinesiologia'),
  ('Kinesiólogo Diego Perez', 'kinesiologo', 'Kinesiologia')
) as datos(nombre, tipo, especialidad)
join especialidades on especialidades.nombre = datos.especialidad
where not exists (
  select 1 from medicos
  where medicos.nombre = datos.nombre
);

insert into boxes (numero, piso, especialidad_id)
select datos.numero, datos.piso, especialidades.id
from (values
  ('B-201', 2, 'Medicina Interna'), ('B-202', 2, 'Medicina Interna'),
  ('B-301', 3, 'Cardiologia'), ('B-302', 3, 'Cardiologia'),
  ('B-401', 4, 'Dermatologia'), ('B-402', 4, 'Dermatologia'),
  ('B-101', 1, 'Kinesiologia'), ('B-102', 1, 'Kinesiologia')
) as datos(numero, piso, especialidad)
join especialidades on especialidades.nombre = datos.especialidad
where not exists (
  select 1 from boxes where boxes.numero = datos.numero
);

insert into turnos (box_id, medico_id, hora_inicio, hora_fin, dia_semana)
select boxes.id, medicos.id, '08:00', '14:00', 'lunes'
from boxes
join medicos on medicos.especialidad_id = boxes.especialidad_id
where not exists (
    select 1 from turnos
    where turnos.box_id = boxes.id and turnos.medico_id = medicos.id
  );

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

drop trigger if exists atencion_actualiza_box on atenciones;
create trigger atencion_actualiza_box after insert or update of hora_salida on atenciones
for each row execute function sincronizar_estado_box();

-- Repara estados que pudieran haber quedado desincronizados antes del trigger.
update boxes set estado = case when exists (
  select 1 from atenciones where atenciones.box_id = boxes.id and atenciones.hora_salida is null
) then 'en_atencion' else 'disponible' end;

alter table boxes replica identity full;
alter table atenciones replica identity full;
alter table avisos replica identity full;

-- Politicas minimas para la demo: permiten mostrar disponibilidad publica y
-- registrar entrada/salida desde el control del box con la clave publica.
alter table especialidades enable row level security;
alter table medicos enable row level security;
alter table boxes enable row level security;
alter table turnos enable row level security;
alter table atenciones enable row level security;

drop policy if exists "public read especialidades" on especialidades;
create policy "public read especialidades" on especialidades for select to anon, authenticated using (true);
drop policy if exists "public read medicos" on medicos;
create policy "public read medicos" on medicos for select to anon, authenticated using (true);
drop policy if exists "public read boxes" on boxes;
create policy "public read boxes" on boxes for select to anon, authenticated using (true);
drop policy if exists "public read turnos" on turnos;
create policy "public read turnos" on turnos for select to anon, authenticated using (true);
drop policy if exists "public read atenciones" on atenciones;
drop policy if exists "public insert atenciones" on atenciones;
drop policy if exists "public finish atenciones" on atenciones;
drop policy if exists "authenticated read atenciones" on atenciones;
create policy "authenticated read atenciones" on atenciones for select to authenticated using (true);
drop policy if exists "authenticated insert atenciones" on atenciones;
create policy "authenticated insert atenciones" on atenciones for insert to authenticated with check (true);
drop policy if exists "authenticated finish atenciones" on atenciones;
create policy "authenticated finish atenciones" on atenciones for update to authenticated using (true) with check (true);

alter table avisos enable row level security;
drop policy if exists "public read avisos" on avisos;
create policy "public read avisos" on avisos for select to anon, authenticated using (true);
drop policy if exists "authenticated insert avisos" on avisos;
create policy "authenticated insert avisos" on avisos for insert to authenticated with check (true);
