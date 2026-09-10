-- Geometria privada digitalizada manualmente desde el plano PDF del CR.
-- Bloque principal: Medicina Interna (A), Diabetologia (B), Cuidados Paliativos (C y D).
-- Ejecutar despues de migracion_seguridad_admin.sql. Se puede repetir sin duplicar registros.

delete from plano_geometria
where referencia like 'A-%' or referencia like 'B-%' or referencia like 'C-%' or referencia like 'D-%'
  or referencia in ('SECTOR-A', 'SECTOR-B', 'SECTOR-C', 'SECTOR-D', 'PASILLO-A-B', 'PASILLO-B-C', 'PASILLO-C-D', 'PASILLO-DIAB-01', 'NEUTRO-A-D-01', 'NEUTRO-A-D-02', 'ESPERA-INTERNA-01', 'ESPERA-INTERNA-02', 'MOSTRADOR-INTERNO-01', 'MOSTRADOR-INTERNO-02', 'MESON-DIAB-LIMPIO-01', 'MESON-DIAB-SUCIO-01', 'BOX-PROC-DIAB-01', 'BOX-PROC-DIAB-02', 'BOX-PROC-DIAB-03', 'SANITARIO-NEUTRO-01', 'SANITARIO-NEUTRO-02', 'SANITARIO-NEUTRO-03', 'SANITARIO-DIAB-01');

insert into plano_geometria (tipo, referencia, area, posicion_x, posicion_y, ancho, largo, rotacion) values
  ('sector', 'SECTOR-A', 'Medicina interna y especialidades', 1844, 1632, 440, 260, 0),
  ('sector', 'SECTOR-B', 'Diabetología', 1760, 2168, 570, 520, 0),
  ('sector', 'SECTOR-C', 'Cuidados paliativos', 1700, 2670, 770, 710, 0),
  ('sector', 'SECTOR-D', 'Cuidados paliativos', 1770, 2905, 700, 280, 0),
  ('pasillo', 'PASILLO-A-B', null, 1775, 1845, 800, 70, 0),
  ('pasillo', 'PASILLO-B-C', null, 1740, 2445, 820, 80, 0),
  ('pasillo', 'PASILLO-C-D', null, 1740, 2840, 820, 65, 0),
  ('pasillo', 'PASILLO-DIAB-01', 'Diabetología', 1889, 2040, 125, 365, 0),
  ('espacio_neutro', 'NEUTRO-A-D-01', null, 1470, 1660, 120, 480, 0),
  ('espacio_neutro', 'NEUTRO-A-D-02', null, 2110, 2150, 140, 850, 0),
  ('espacio_neutro', 'ESPERA-INTERNA-01', null, 1325, 2280, 180, 290, 0),
  ('espacio_neutro', 'ESPERA-INTERNA-02', null, 2100, 2620, 130, 230, 0),
  ('espacio_neutro', 'MOSTRADOR-INTERNO-01', null, 1460, 1870, 210, 45, 0),
  ('espacio_neutro', 'MOSTRADOR-INTERNO-02', null, 2050, 2280, 160, 45, 0),
  ('espacio_neutro', 'BOX-PROC-DIAB-01', 'Diabetología', 2000, 2004, 110, 125, 0),
  ('espacio_neutro', 'BOX-PROC-DIAB-02', 'Diabetología', 1971, 2127, 110, 125, 0),
  ('espacio_neutro', 'BOX-PROC-DIAB-03', 'Diabetología', 1534, 2358, 100, 95, 0),
  ('espacio_neutro', 'MESON-DIAB-SUCIO-01', 'Diabetología', 1987, 1935, 70, 32, 0),
  ('espacio_neutro', 'MESON-DIAB-LIMPIO-01', 'Diabetología', 2057, 1935, 70, 32, 0),
  ('espacio_neutro', 'SANITARIO-NEUTRO-01', null, 1420, 1780, 95, 105, 0),
  ('espacio_neutro', 'SANITARIO-NEUTRO-02', null, 2140, 1780, 95, 105, 0),
  ('espacio_neutro', 'SANITARIO-NEUTRO-03', null, 2140, 2750, 95, 105, 0),
  ('espacio_neutro', 'SANITARIO-DIAB-01', 'Diabetología', 1939, 1956, 85, 80, 0),
  ('box', 'A-001', 'Medicina interna y especialidades', 1724, 1532, 85, 75, 0),
  ('box', 'A-002', 'Medicina interna y especialidades', 1858, 1526, 85, 75, 0),
  ('box', 'A-003', 'Medicina interna y especialidades', 1981, 1535, 85, 75, 0),
  ('box', 'A-004', 'Medicina interna y especialidades', 2009, 1721, 85, 75, 0),
  ('box', 'A-005', 'Medicina interna y especialidades', 1886, 1720, 85, 75, 0),
  ('box', 'A-006', 'Medicina interna y especialidades', 1770, 1718, 85, 75, 0),
  ('box', 'A-007', 'Medicina interna y especialidades', 1647, 1716, 85, 75, 0),
  ('box', 'A-008', 'Medicina interna y especialidades', 2035, 1624, 85, 75, 0),
  ('box', 'A-009', 'Medicina interna y especialidades', 1683, 1624, 85, 75, 0),
  ('box', 'B-001', 'Diabetología', 1514, 1963, 85, 75, 0),
  ('box', 'B-002', 'Diabetología', 1603, 1976, 85, 75, 0),
  ('box', 'B-003', 'Diabetología', 1725, 1951, 85, 75, 0),
  ('box', 'B-004', 'Diabetología', 1839, 1951, 85, 75, 0),
  ('box', 'B-005', 'Diabetología', 1994, 2024, 85, 75, 0),
  ('box', 'B-006', 'Diabetología', 1964, 2146, 85, 75, 0),
  ('box', 'B-007', 'Diabetología', 1842, 2150, 85, 75, 0),
  ('box', 'B-008', 'Diabetología', 1724, 2151, 85, 75, 0),
  ('box', 'B-009', 'Diabetología', 1607, 2125, 85, 75, 0),
  ('box', 'B-010', 'Diabetología', 1508, 2130, 85, 75, 0),
  ('box', 'B-011', 'Diabetología', 1527, 2376, 85, 75, 0),
  ('box', 'B-012', 'Diabetología', 1932, 1958, 85, 75, 0),
  ('box', 'B-013', 'Diabetología', 1881, 2050, 85, 75, 0),
  ('box', 'C-001', 'Cuidados paliativos', 1664, 2380, 85, 75, 0),
  ('box', 'C-002', 'Cuidados paliativos', 1783, 2378, 85, 75, 0),
  ('box', 'C-003', 'Cuidados paliativos', 1899, 2379, 85, 75, 0),
  ('box', 'C-004', 'Cuidados paliativos', 2011, 2378, 85, 75, 0),
  ('box', 'C-005', 'Cuidados paliativos', 2009, 2580, 85, 75, 0),
  ('box', 'C-006', 'Cuidados paliativos', 1895, 2580, 85, 75, 0),
  ('box', 'C-007', 'Cuidados paliativos', 1780, 2578, 85, 75, 0),
  ('box', 'C-008', 'Cuidados paliativos', 1658, 2553, 85, 75, 0),
  ('box', 'C-009', 'Cuidados paliativos', 1309, 2915, 85, 75, 0),
  ('box', 'C-010', 'Cuidados paliativos', 1339, 3027, 85, 75, 0),
  ('box', 'C-011', 'Cuidados paliativos', 1469, 3010, 85, 75, 0),
  ('box', 'C-012', 'Cuidados paliativos', 1599, 2989, 85, 75, 0),
  ('box', 'C-013', 'Cuidados paliativos', 1587, 2776, 85, 75, 0),
  ('box', 'C-014', 'Cuidados paliativos', 1646, 2780, 85, 75, 0),
  ('box', 'C-015', 'Cuidados paliativos', 2031, 2480, 85, 75, 0),
  ('box', 'C-016', 'Cuidados paliativos', 1688, 2481, 85, 75, 0),
  ('box', 'C-017', 'Cuidados paliativos', 1582, 2906, 85, 75, 0),
  ('box', 'D-001', 'Cuidados paliativos', 1811, 2799, 85, 75, 0),
  ('box', 'D-002', 'Cuidados paliativos', 1888, 2829, 85, 75, 0),
  ('box', 'D-003', 'Cuidados paliativos', 2004, 2830, 85, 75, 0),
  ('box', 'D-004', 'Cuidados paliativos', 1983, 3001, 85, 75, 0),
  ('box', 'D-005', 'Cuidados paliativos', 1776, 2976, 85, 75, 0),
  ('box', 'D-006', 'Cuidados paliativos', 1403, 2832, 85, 75, 0),
  ('box', 'D-007', 'Cuidados paliativos', 2027, 2888, 85, 75, 0),
  ('box', 'D-008', 'Cuidados paliativos', 1788, 2908, 85, 75, 0)
on conflict (referencia) do update set
  tipo = excluded.tipo, area = excluded.area, posicion_x = excluded.posicion_x, posicion_y = excluded.posicion_y,
  ancho = excluded.ancho, largo = excluded.largo, rotacion = excluded.rotacion;

select tipo, area, count(*) as elementos
from plano_geometria
where referencia like 'A-%' or referencia like 'B-%' or referencia like 'C-%' or referencia like 'D-%'
  or referencia like 'SECTOR-%' or referencia like 'PASILLO-%' or referencia like 'NEUTRO-%'
group by tipo, area
order by tipo, area;