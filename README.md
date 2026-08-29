# CR Ambulatorio

Pantalla de disponibilidad y panel de gestión para los boxes de consulta externa del CR Ambulatorio. El alcance es el área ambulatoria dependiente del hospital: consultas médicas y especialidades, sin urgencia, hospitalización ni pabellones.

## Ejecutar

```bash
npm install
npm run dev
```

Abre `http://localhost:5173/` para la pantalla pública y `http://localhost:5173/admin` para el panel.

Sin variables de entorno, la aplicación funciona con nueve boxes de demostración. Para conectar Supabase, copia `.env.example` a `.env` y completa `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.

## Supabase

1. Crea un proyecto en Supabase.
2. Ejecuta `supabase/schema.sql` en el SQL Editor.
3. Habilita la tabla `boxes` en **Database > Replication** para recibir cambios Realtime.
4. Crea los usuarios del personal desde **Authentication > Users**. No hay registro público.
5. Configura las políticas RLS según las reglas de acceso del hospital antes de producción.

La consulta de la pantalla carga boxes y disponibilidad. Los cambios de `estado` en `boxes` y los avisos de `avisos` se reciben por Realtime y actualizan las pantallas sin refrescar. La grilla pública usa dos columnas en pantallas grandes para facilitar la lectura en los dos displays.

## Publicar en internet

1. En Supabase, ejecuta el esquema y crea únicamente usuarios internos desde **Authentication > Users**. No habilites registro público.
2. En el proveedor de hosting (Vercel, Netlify o similar), importa este proyecto y usa `CR_ambulatorio` como directorio raíz.
3. Configura el comando de build como `npm run build` y el directorio de salida como `dist`.
4. Agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` como variables de entorno del hosting. Nunca subas `.env`.
5. Configura una regla de rewrite para que todas las rutas sirvan `index.html` (necesario para `/admin`, `/box/...` y `/supervisora`).
6. Verifica en producción que `/` sea público y que las rutas operativas soliciten sesión. Las políticas del esquema dejan las escrituras y la lectura de atenciones solo para usuarios autenticados.

Para un hospital, publica primero en un dominio de prueba, valida las políticas RLS con cuentas de distintos perfiles y solicita revisión del equipo de seguridad antes de usar datos reales.
