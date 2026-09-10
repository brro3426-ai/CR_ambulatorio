-- Inventario oficial real del CR, entregado directamente por el equipo (no derivado del PDF).
-- Reemplaza los identificadores aproximados A-/B-/C-/D-/E1-/E2-/E3-/G-/H- usados anteriormente.
-- Ejecutar despues de migracion_seguridad_admin.sql. Se puede repetir sin duplicar registros.

alter table boxes add column if not exists area text;
alter table boxes add column if not exists sector text;
alter table boxes add column if not exists capacidad int not null default 1 check (capacidad > 0);
alter table boxes add column if not exists asignado_medico_id int references medicos(id) on delete set null;

insert into especialidades (nombre) values
  ('Medicina Interna Broncopulmonar'), ('Diabetología'), ('Cuidados Paliativos'),
  ('Unidad TACO'), ('Kinesiologia'), ('UNACES'), ('Pediatría')
on conflict (nombre) do nothing;

-- Elimina el inventario aproximado anterior (identificadores A-/B-/C-/D-/E1-/E2-/E3-/G-/H-).
delete from boxes
where numero like 'A-%' or numero like 'B-%' or numero like 'C-%' or numero like 'D-%'
  or numero like 'E1-%' or numero like 'E2-%' or numero like 'E3-%'
  or numero like 'G-%' or numero like 'H-%';

with inventario(numero, area, especialidad, capacidad) as (
  values
    -- Medicina interna broncopulmonar (Pasillo A)
    ('MIB-SV', 'Medicina Interna Broncopulmonar', 'Medicina Interna Broncopulmonar', 1),
    ('MIB-01', 'Medicina Interna Broncopulmonar', 'Medicina Interna Broncopulmonar', 1),
    ('MIB-02', 'Medicina Interna Broncopulmonar', 'Medicina Interna Broncopulmonar', 1),
    ('MIB-03', 'Medicina Interna Broncopulmonar', 'Medicina Interna Broncopulmonar', 1),
    ('MIB-04', 'Medicina Interna Broncopulmonar', 'Medicina Interna Broncopulmonar', 1),
    ('MIB-05', 'Medicina Interna Broncopulmonar', 'Medicina Interna Broncopulmonar', 1),
    ('MIB-06', 'Medicina Interna Broncopulmonar', 'Medicina Interna Broncopulmonar', 1),
    ('MIB-PROC', 'Medicina Interna Broncopulmonar', 'Medicina Interna Broncopulmonar', 1),
    -- Diabetología (Pasillo E)
    ('DIAB-01', 'Diabetología', 'Diabetología', 1),
    ('DIAB-02', 'Diabetología', 'Diabetología', 1),
    ('DIAB-03', 'Diabetología', 'Diabetología', 1),
    ('DIAB-04', 'Diabetología', 'Diabetología', 1),
    ('DIAB-05', 'Diabetología', 'Diabetología', 1),
    ('DIAB-06', 'Diabetología', 'Diabetología', 1),
    ('DIAB-07', 'Diabetología', 'Diabetología', 1),
    ('DIAB-08', 'Diabetología', 'Diabetología', 1),
    ('DIAB-PROC-01', 'Diabetología', 'Diabetología', 1),
    ('DIAB-PROC-02', 'Diabetología', 'Diabetología', 1),
    ('DIAB-PROC-03', 'Diabetología', 'Diabetología', 1),
    -- Cuidados paliativos (Pasillo D)
    ('CPAL-01', 'Cuidados Paliativos', 'Cuidados Paliativos', 1),
    ('CPAL-02', 'Cuidados Paliativos', 'Cuidados Paliativos', 1),
    ('CPAL-03', 'Cuidados Paliativos', 'Cuidados Paliativos', 1),
    ('CPAL-04', 'Cuidados Paliativos', 'Cuidados Paliativos', 1),
    ('CPAL-05', 'Cuidados Paliativos', 'Cuidados Paliativos', 1),
    ('CPAL-06', 'Cuidados Paliativos', 'Cuidados Paliativos', 1),
    ('CPAL-07', 'Cuidados Paliativos', 'Cuidados Paliativos', 1),
    ('CPAL-PROC', 'Cuidados Paliativos', 'Cuidados Paliativos', 1),
    -- Unidad TACO (Pasillo F)
    ('TACO-01', 'Unidad TACO', 'Unidad TACO', 1),
    ('TACO-02', 'Unidad TACO', 'Unidad TACO', 1),
    ('TACO-03', 'Unidad TACO', 'Unidad TACO', 1),
    -- Rehabilitación pulmonar y kine (Pasillo A)
    ('REHAB-01', 'Rehabilitación Pulmonar y Kine', 'Kinesiologia', 1),
    ('REHAB-02', 'Rehabilitación Pulmonar y Kine', 'Kinesiologia', 1),
    ('REHAB-03', 'Rehabilitación Pulmonar y Kine', 'Kinesiologia', 1),
    ('REHAB-04', 'Rehabilitación Pulmonar y Kine', 'Kinesiologia', 1),
    ('REHAB-05', 'Rehabilitación Pulmonar y Kine', 'Kinesiologia', 1),
    -- UNACES
    ('UNACES-01', 'UNACES', 'UNACES', 1),
    ('UNACES-PROC-01', 'UNACES', 'UNACES', 1),
    ('UNACES-PROC-02', 'UNACES', 'UNACES', 1),
    -- Pediatría (Pasillo B)
    ('PED-01', 'Pediatría', 'Pediatría', 1),
    ('PED-02', 'Pediatría', 'Pediatría', 1),
    ('PED-03', 'Pediatría', 'Pediatría', 1),
    ('PED-04', 'Pediatría', 'Pediatría', 1),
    ('PED-05', 'Pediatría', 'Pediatría', 1),
    ('PED-06', 'Pediatría', 'Pediatría', 1),
    ('PED-07', 'Pediatría', 'Pediatría', 1),
    ('PED-08', 'Pediatría', 'Pediatría', 1),
    ('PED-09', 'Pediatría', 'Pediatría', 1),
    ('PED-PROC-01', 'Pediatría', 'Pediatría', 1),
    ('PED-PROC-02', 'Pediatría', 'Pediatría', 1)
)
insert into boxes (numero, area, capacidad, especialidad_id, estado)
select inventario.numero, inventario.area, inventario.capacidad, especialidades.id, 'disponible'
from inventario
join especialidades on especialidades.nombre = inventario.especialidad
on conflict (numero) do update set area = excluded.area, capacidad = excluded.capacidad, especialidad_id = excluded.especialidad_id;

-- Recintos no clinicos (oficinas, salas de reunion, gimnasio) no se cargan como boxes agendables en esta tabla:
-- Comite oncologico, Sala de conversaciones, Sala de charlas, Oficina administrativa y Gimnasio.
-- El mapa 3D (Operational3DMap.jsx, nonClinicalSpaces) los dibuja igual como cajas blancas de referencia
-- dentro de su area, para ubicarlos sin permitir agendar pacientes en ellos.
-- Las 3 oficinas de Administracion no pertenecen a ninguna area clinica existente y quedan fuera del mapa por ahora.

-- Control esperado: 49 salas clinicas del inventario oficial real.
select area, count(*) as salas, sum(capacidad) as cupos
from boxes
where area is not null
group by area
order by area;
