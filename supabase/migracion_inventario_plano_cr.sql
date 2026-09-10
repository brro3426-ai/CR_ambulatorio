-- Inventario asistencial extraido de 3.2_Planta_Arq.Ex_CRS_(CCM)-Model.pdf.
-- Para una base ya existente no ejecutes schema.sql: este archivo agrega lo necesario.
-- Se puede ejecutar mas de una vez.

alter table boxes add column if not exists area text;
alter table boxes add column if not exists capacidad int not null default 1 check (capacidad > 0);
alter table boxes add column if not exists asignado_medico_id int references medicos(id) on delete set null;
alter table medicos add column if not exists cargo text;

insert into especialidades (nombre) values
  ('Medicina Interna'), ('Kinesiologia'), ('Broncopulmonar'), ('Diabetología'), ('Cuidados Paliativos'), ('Pediatría'), ('UNACES')
on conflict (nombre) do nothing;

-- Elimina solamente los identificadores ficticios que venian con el proyecto.
delete from boxes
where area is null
  and numero in ('B-101', 'B-102', 'B-201', 'B-202', 'B-203', 'B-301', 'B-302', 'B-303', 'B-401', 'B-402', 'B-403');

with inventario(numero, area, especialidad, capacidad) as (
  values
    ('A-001', 'Medicina interna y especialidades', 'Medicina Interna', 1), ('A-002', 'Medicina interna y especialidades', 'Medicina Interna', 1), ('A-003', 'Medicina interna y especialidades', 'Broncopulmonar', 1), ('A-004', 'Medicina interna y especialidades', 'Medicina Interna', 1), ('A-005', 'Medicina interna y especialidades', 'Medicina Interna', 1), ('A-006', 'Medicina interna y especialidades', 'Medicina Interna', 1), ('A-007', 'Medicina interna y especialidades', 'Medicina Interna', 1), ('A-008', 'Medicina interna y especialidades', 'Medicina Interna', 1), ('A-009', 'Medicina interna y especialidades', 'Medicina Interna', 1),
    ('B-001', 'Diabetología', 'Diabetología', 1), ('B-002', 'Diabetología', 'Diabetología', 1), ('B-003', 'Diabetología', 'Diabetología', 1), ('B-004', 'Diabetología', 'Diabetología', 1), ('B-005', 'Diabetología', 'Diabetología', 1), ('B-006', 'Diabetología', 'Diabetología', 1), ('B-007', 'Diabetología', 'Diabetología', 1), ('B-008', 'Diabetología', 'Diabetología', 1), ('B-009', 'Diabetología', 'Diabetología', 1), ('B-010', 'Diabetología', 'Diabetología', 1), ('B-011', 'Diabetología', 'Diabetología', 1), ('B-012', 'Diabetología', 'Diabetología', 1), ('B-013', 'Diabetología', 'Diabetología', 1),
    ('C-001', 'Cuidados paliativos', 'Cuidados Paliativos', 1), ('C-002', 'Cuidados paliativos', 'Cuidados Paliativos', 1), ('C-003', 'Cuidados paliativos', 'Cuidados Paliativos', 1), ('C-004', 'Cuidados paliativos', 'Cuidados Paliativos', 1), ('C-005', 'Cuidados paliativos', 'Cuidados Paliativos', 1), ('C-006', 'Cuidados paliativos', 'Cuidados Paliativos', 1), ('C-007', 'Cuidados paliativos', 'Cuidados Paliativos', 1), ('C-008', 'Cuidados paliativos', 'Cuidados Paliativos', 1), ('C-009', 'Cuidados paliativos', 'Cuidados Paliativos', 1), ('C-010', 'Cuidados paliativos', 'Cuidados Paliativos', 1), ('C-011', 'Cuidados paliativos', 'Cuidados Paliativos', 1), ('C-012', 'Cuidados paliativos', 'Cuidados Paliativos', 1), ('C-013', 'Cuidados paliativos', 'Cuidados Paliativos', 1), ('C-014', 'Cuidados paliativos', 'Cuidados Paliativos', 1), ('C-015', 'Cuidados paliativos', 'Cuidados Paliativos', 1), ('C-016', 'Cuidados paliativos', 'Cuidados Paliativos', 1), ('C-017', 'Cuidados paliativos', 'Cuidados Paliativos', 1),
    ('D-001', 'Cuidados paliativos', 'Cuidados Paliativos', 1), ('D-002', 'Cuidados paliativos', 'Cuidados Paliativos', 1), ('D-003', 'Cuidados paliativos', 'Cuidados Paliativos', 1), ('D-004', 'Cuidados paliativos', 'Cuidados Paliativos', 1), ('D-005', 'Cuidados paliativos', 'Cuidados Paliativos', 1), ('D-006', 'Cuidados paliativos', 'Cuidados Paliativos', 1), ('D-007', 'Cuidados paliativos', 'Cuidados Paliativos', 1), ('D-008', 'Cuidados paliativos', 'Cuidados Paliativos', 1),
    ('E1-01', 'UNACES', 'UNACES', 1), ('E1-02', 'UNACES', 'UNACES', 1), ('E1-03', 'UNACES', 'UNACES', 1), ('E1-04', 'UNACES', 'UNACES', 1), ('E1-05', 'UNACES', 'UNACES', 1), ('E1-06', 'UNACES', 'UNACES', 1), ('E1-07', 'UNACES', 'UNACES', 1),
    ('E2-01', 'Rehabilitación pulmonar y kine', 'Kinesiologia', 1), ('E2-02', 'Rehabilitación pulmonar y kine', 'Kinesiologia', 1), ('E2-03', 'Rehabilitación pulmonar y kine', 'Kinesiologia', 1), ('E2-04', 'Rehabilitación pulmonar y kine', 'Kinesiologia', 1), ('E2-05', 'Rehabilitación pulmonar y kine', 'Kinesiologia', 1), ('E2-06', 'Rehabilitación pulmonar y kine', 'Kinesiologia', 1), ('E2-07', 'Rehabilitación pulmonar y kine', 'Kinesiologia', 1), ('E2-08', 'Rehabilitación pulmonar y kine', 'Kinesiologia', 1), ('E2-09', 'Rehabilitación pulmonar y kine', 'Kinesiologia', 1),
    ('E3-01', 'Rehabilitación pulmonar y kine', 'Kinesiologia', 1), ('E3-02', 'Rehabilitación pulmonar y kine', 'Kinesiologia', 1), ('E3-03', 'Rehabilitación pulmonar y kine', 'Kinesiologia', 1), ('E3-04', 'Rehabilitación pulmonar y kine', 'Kinesiologia', 1), ('E3-05', 'Rehabilitación pulmonar y kine', 'Kinesiologia', 1), ('E3-06', 'Rehabilitación pulmonar y kine', 'Kinesiologia', 1),
    ('G-001', 'Atención ambulatoria pediátrica', 'Pediatría', 1), ('G-002', 'Atención ambulatoria pediátrica', 'Pediatría', 1), ('G-003', 'Atención ambulatoria pediátrica', 'Pediatría', 1), ('G-004', 'Atención ambulatoria pediátrica', 'Pediatría', 1), ('G-005', 'Atención ambulatoria pediátrica', 'Pediatría', 1), ('G-006', 'Atención ambulatoria pediátrica', 'Pediatría', 1), ('G-007', 'Atención ambulatoria pediátrica', 'Pediatría', 1), ('G-008', 'Atención ambulatoria pediátrica', 'Pediatría', 1), ('G-009', 'Atención ambulatoria pediátrica', 'Pediatría', 1), ('G-010', 'Atención ambulatoria pediátrica', 'Pediatría', 1),
    ('H-001', 'Pediatría', 'Pediatría', 1), ('H-002', 'Pediatría', 'Pediatría', 1), ('H-003', 'Pediatría', 'Pediatría', 1), ('H-004', 'Pediatría', 'Pediatría', 1), ('H-005', 'Pediatría', 'Pediatría', 1), ('H-006', 'Pediatría', 'Pediatría', 1), ('H-007', 'Pediatría', 'Pediatría', 1), ('H-008', 'Pediatría', 'Pediatría', 1), ('H-009', 'Pediatría', 'Pediatría', 1), ('H-010', 'Pediatría', 'Pediatría', 1), ('H-011', 'Pediatría', 'Pediatría', 1), ('H-012', 'Pediatría', 'Pediatría', 1), ('H-013', 'Pediatría', 'Pediatría', 1), ('H-014', 'Pediatría', 'Pediatría', 1), ('H-015', 'Pediatría', 'Pediatría', 1), ('H-016', 'Pediatría', 'Pediatría', 1), ('H-017', 'Pediatría', 'Pediatría', 1)
)
insert into boxes (numero, area, capacidad, especialidad_id, estado)
select inventario.numero, inventario.area, inventario.capacidad, especialidades.id, 'disponible'
from inventario
join especialidades on especialidades.nombre = inventario.especialidad
on conflict (numero) do update set area = excluded.area, capacidad = excluded.capacidad, especialidad_id = excluded.especialidad_id;

-- Control esperado: 96 salas asistenciales del plano.
select area, count(*) as salas, sum(capacidad) as cupos
from boxes
where area is not null
group by area
order by area;