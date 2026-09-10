-- Corrección para bases existentes: la app pública consulta boxes.sector.
alter table public.boxes
  add column if not exists sector text;

-- Verificación
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'boxes'
  and column_name = 'sector';
