-- Geometria privada del resto del interior clinico del CR.
-- Incluye UNACES (E1), Rehabilitacion/Kine (E2/E3), Atencion Pediatrica (G) y Pediatria (H).
-- Incluye solamente circulacion y recintos clinicos interiores no sensibles.
-- Ejecutar despues de migracion_geometria_bloque_principal.sql. Es seguro repetirlo.

delete from plano_geometria
where referencia like 'E1-%' or referencia like 'E2-%' or referencia like 'E3-%'
  or referencia like 'G-%' or referencia like 'H-%'
  or referencia in (
    'SECTOR-UNACES', 'SECTOR-REHAB', 'SECTOR-G', 'SECTOR-H',
    'PASILLO-UNACES-01', 'PASILLO-REHAB-01', 'PASILLO-G-01', 'PASILLO-H-01',
    'PASILLO-H-02', 'ESPERA-UNACES-01', 'ESPERA-G-01', 'ESPERA-H-01',
    'MOSTRADOR-G-01', 'MOSTRADOR-H-01', 'SANITARIO-NEUTRO-04', 'SANITARIO-NEUTRO-05'
  );

insert into plano_geometria (tipo, referencia, area, posicion_x, posicion_y, ancho, largo, rotacion) values
  ('sector', 'SECTOR-UNACES', 'UNACES', 900, 820, 470, 590, 0),
  ('sector', 'SECTOR-REHAB', 'Rehabilitación pulmonar y kine', 1280, 1510, 720, 510, 0),
  ('sector', 'SECTOR-G', 'Atención ambulatoria pediátrica', 1010, 1620, 430, 570, 0),
  ('sector', 'SECTOR-H', 'Pediatría', 610, 1320, 420, 1330, 0),
  ('pasillo', 'PASILLO-UNACES-01', null, 720, 815, 90, 610, 0),
  ('pasillo', 'PASILLO-REHAB-01', null, 1250, 1515, 700, 75, 0),
  ('pasillo', 'PASILLO-G-01', null, 1015, 1660, 75, 580, 0),
  ('pasillo', 'PASILLO-H-01', null, 612, 1150, 80, 1030, 0),
  ('pasillo', 'PASILLO-H-02', null, 610, 1650, 380, 75, 0),
  ('espacio_neutro', 'ESPERA-UNACES-01', null, 600, 930, 180, 190, 0),
  ('espacio_neutro', 'ESPERA-G-01', null, 1170, 1880, 140, 190, 0),
  ('espacio_neutro', 'ESPERA-H-01', null, 420, 1370, 130, 220, 0),
  ('espacio_neutro', 'MOSTRADOR-G-01', null, 1170, 1425, 180, 45, 0),
  ('espacio_neutro', 'MOSTRADOR-H-01', null, 470, 1040, 140, 45, 0),
  ('espacio_neutro', 'SANITARIO-NEUTRO-04', null, 455, 930, 90, 105, 0),
  ('espacio_neutro', 'SANITARIO-NEUTRO-05', null, 1160, 1100, 90, 105, 0),
  ('box', 'E1-01', 'UNACES', 1223, 664, 85, 75, 0),
  ('box', 'E1-02', 'UNACES', 1238, 999, 85, 75, 0),
  ('box', 'E1-03', 'UNACES', 1115, 717, 85, 75, 0),
  ('box', 'E1-04', 'UNACES', 1019, 673, 85, 75, 0),
  ('box', 'E1-05', 'UNACES', 940, 720, 85, 75, 0),
  ('box', 'E1-06', 'UNACES', 1118, 1376, 85, 75, 0),
  ('box', 'E1-07', 'UNACES', 1029, 816, 85, 75, 0),
  ('box', 'E2-01', 'Rehabilitación pulmonar y kine', 1339, 1627, 85, 75, 0),
  ('box', 'E2-02', 'Rehabilitación pulmonar y kine', 1397, 1425, 85, 75, 0),
  ('box', 'E2-03', 'Rehabilitación pulmonar y kine', 1578, 1520, 85, 75, 0),
  ('box', 'E2-04', 'Rehabilitación pulmonar y kine', 1536, 1708, 85, 75, 0),
  ('box', 'E2-05', 'Rehabilitación pulmonar y kine', 1200, 1750, 85, 75, 0),
  ('box', 'E2-06', 'Rehabilitación pulmonar y kine', 1280, 1750, 85, 75, 0),
  ('box', 'E2-07', 'Rehabilitación pulmonar y kine', 1360, 1750, 85, 75, 0),
  ('box', 'E2-08', 'Rehabilitación pulmonar y kine', 1449, 1703, 85, 75, 0),
  ('box', 'E2-09', 'Rehabilitación pulmonar y kine', 1525, 2569, 85, 75, 0),
  ('box', 'E3-01', 'Rehabilitación pulmonar y kine', 702, 1283, 85, 75, 0),
  ('box', 'E3-02', 'Rehabilitación pulmonar y kine', 724, 1426, 85, 75, 0),
  ('box', 'E3-03', 'Rehabilitación pulmonar y kine', 441, 1173, 85, 75, 0),
  ('box', 'E3-04', 'Rehabilitación pulmonar y kine', 530, 1173, 85, 75, 0),
  ('box', 'E3-05', 'Rehabilitación pulmonar y kine', 914, 1336, 85, 75, 0),
  ('box', 'E3-06', 'Rehabilitación pulmonar y kine', 914, 1336, 85, 75, 0),
  ('box', 'G-001', 'Atención ambulatoria pediátrica', 1119, 1496, 85, 75, 0),
  ('box', 'G-002', 'Atención ambulatoria pediátrica', 1045, 1496, 85, 75, 0),
  ('box', 'G-003', 'Atención ambulatoria pediátrica', 1111, 1731, 85, 75, 0),
  ('box', 'G-004', 'Atención ambulatoria pediátrica', 939, 1429, 85, 75, 0),
  ('box', 'G-005', 'Atención ambulatoria pediátrica', 1010, 1429, 85, 75, 0),
  ('box', 'G-006', 'Atención ambulatoria pediátrica', 1035, 1868, 85, 75, 0),
  ('box', 'G-007', 'Atención ambulatoria pediátrica', 906, 1614, 85, 75, 0),
  ('box', 'G-008', 'Atención ambulatoria pediátrica', 978, 1614, 85, 75, 0),
  ('box', 'G-009', 'Atención ambulatoria pediátrica', 1050, 1614, 85, 75, 0),
  ('box', 'G-010', 'Atención ambulatoria pediátrica', 1021, 1458, 85, 75, 0),
  ('box', 'H-001', 'Pediatría', 736, 1518, 85, 75, 0),
  ('box', 'H-002', 'Pediatría', 702, 1637, 85, 75, 0),
  ('box', 'H-003', 'Pediatría', 702, 1754, 85, 75, 0),
  ('box', 'H-004', 'Pediatría', 702, 1874, 85, 75, 0),
  ('box', 'H-005', 'Pediatría', 528, 1557, 85, 75, 0),
  ('box', 'H-006', 'Pediatría', 528, 1758, 85, 75, 0),
  ('box', 'H-007', 'Pediatría', 528, 1640, 85, 75, 0),
  ('box', 'H-008', 'Pediatría', 528, 1557, 85, 75, 0),
  ('box', 'H-009', 'Pediatría', 534, 1428, 85, 75, 0),
  ('box', 'H-010', 'Pediatría', 539, 1090, 85, 75, 0),
  ('box', 'H-011', 'Pediatría', 531, 972, 85, 75, 0),
  ('box', 'H-012', 'Pediatría', 616, 1907, 85, 75, 0),
  ('box', 'H-013', 'Pediatría', 707, 1096, 85, 75, 0),
  ('box', 'H-014', 'Pediatría', 618, 1523, 85, 75, 0),
  ('box', 'H-015', 'Pediatría', 610, 1280, 85, 75, 0),
  ('box', 'H-016', 'Pediatría', 454, 637, 85, 75, 0),
  ('box', 'H-017', 'Pediatría', 525, 637, 85, 75, 0)
on conflict (referencia) do update set
  tipo = excluded.tipo, area = excluded.area, posicion_x = excluded.posicion_x, posicion_y = excluded.posicion_y,
  ancho = excluded.ancho, largo = excluded.largo, rotacion = excluded.rotacion;

select tipo, area, count(*) as elementos
from plano_geometria
group by tipo, area
order by tipo, area;