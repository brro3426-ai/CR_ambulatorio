# CR Ambulatorio

Pantalla de disponibilidad y panel de gestión para los boxes de consulta externa del CR Ambulatorio. El alcance es el área ambulatoria dependiente del hospital: consultas médicas y especialidades, sin urgencia, hospitalización ni pabellones.

## Ejecutar

```bash
npm install
npm run dev
```

Abre `http://localhost:5173/` para la pantalla pública y `http://localhost:5173/admin` para el panel.

Sin variables de entorno, la aplicación funciona con boxes de demostración. Para conectar Supabase, copia `.env.example` a `.env` y completa `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.

## Modo oficial

Para una instalación institucional, configura `VITE_DEMO_MODE=false` y entrega siempre `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` mediante variables protegidas del hosting. En este modo la aplicación no usa datos demo como respaldo: si Supabase no está configurado, las cargas operativas fallan de forma explícita.

`VITE_SUPABASE_ANON_KEY` puede llegar al navegador porque es una clave pública de cliente; nunca debe reemplazarse por una `service_role` key. La protección real depende de RLS, roles institucionales y políticas de Storage en Supabase.

## Supabase

1. Crea un proyecto en Supabase.
2. Para una base nueva, ejecuta `supabase/schema.sql` una sola vez. Para una base ya creada, no ejecutes `schema.sql` nuevamente.
3. Ejecuta `supabase/security.sql` y finalmente `supabase/migracion_inventario_plano_cr.sql` en el SQL Editor.
4. La migración carga los boxes asistenciales reales del CR, agrupados por área y con capacidad inicial de un cupo por box. La distribución vigente contempla 49 boxes bookeables; no incluye oficinas ni otros recintos administrativos.
5. En **Administración > Salas / QR**, ajusta capacidad, especialidad o área si el equipo clínico valida una configuración distinta. El panel resume salas, cupos y disponibilidad por área antes de asignar profesionales.
6. Habilita la tabla `boxes` en **Database > Replication** para recibir cambios Realtime.
7. Crea los usuarios del personal desde **Authentication > Users**. No hay registro público.
8. Configura las políticas RLS según las reglas de acceso del hospital antes de producción.
9. Para el cierre de producción, ejecuta `supabase/migracion_produccion_rls.sql` después de crear los usuarios Auth y sus filas correspondientes en `perfiles`. No ejecutes esta migración antes de adaptar y probar el portal funcionario autenticado.

## Plano administrativo protegido

Para preparar el mapa detallado del CR, ejecuta `supabase/migracion_seguridad_admin.sql` en el SQL Editor. Esta migración crea `perfiles` y `plano_geometria`, registra la cuenta administradora inicial y deja la geometría disponible solo para usuarios autenticados con rol `administrador`. No modifica el acceso actual al tótem, salas ni atenciones.

La consulta de la pantalla carga boxes y disponibilidad. Los cambios de `estado` en `boxes` y los avisos de `avisos` se reciben por Realtime y actualizan las pantallas sin refrescar. La grilla pública usa dos columnas en pantallas grandes para facilitar la lectura en los dos displays.

## Publicar en internet

1. En Supabase, ejecuta el esquema y crea únicamente usuarios internos desde **Authentication > Users**. No habilites registro público.
2. En el proveedor de hosting (Vercel, Netlify o similar), importa este proyecto y usa `CR_ambulatorio` como directorio raíz.
3. Configura el comando de build como `npm run build` y el directorio de salida como `dist`.
4. Agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` como variables de entorno del hosting. Nunca subas `.env`.
5. Configura una regla de rewrite para que todas las rutas sirvan `index.html` (necesario para `/admin`, `/box/...` y `/supervisora`).
6. Verifica en producción que `/` sea público y que las rutas operativas soliciten sesión. Las políticas del esquema dejan las escrituras y la lectura de atenciones solo para usuarios autenticados.

## Checklist de publicación oficial

En Vercel configura estas variables para los entornos `Preview` y `Production`:

```text
VITE_SUPABASE_URL=https://<proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-o-publishable-key>
VITE_DEMO_MODE=false
```

Nunca configures una clave `service_role` en Vercel ni en el frontend. Después del despliegue verifica `/`, `/admin`, `/funcionario` y un QR `/box/<numero>` con cuentas de prueba. Ejecuta primero la validación RLS con una cuenta anónima y luego con cada rol institucional.

## Endurecimiento operativo

Después de validar la aplicación en un proyecto de prueba, ejecuta `supabase/migracion_hardening_produccion.sql`. Esta migración agrega validación server-side de boxes y avisos, límites de operaciones por usuario y un `search_path` fijo para funciones `SECURITY DEFINER`. No la ejecutes sin respaldo.

En Supabase configura además:

- **Authentication > Settings > Sessions**: access token expiry de 3600 segundos como máximo para operación normal; reduce el valor si el hospital prioriza sesiones cortas.
- **Authentication > URL Configuration**: agrega solo el dominio oficial y el dominio de Preview autorizado en `Site URL` y `Redirect URLs`.
- **Settings > API / CORS**: permite únicamente los orígenes oficiales del frontend; no uses `*` cuando existan datos operativos.
- **Storage**: mantén los buckets de planos privados y valida sus policies con una cuenta anónima.
- **Cifrado**: usa siempre HTTPS en Vercel y TLS/WSS hacia Supabase; no implementes cifrado casero en React. Para datos sensibles, valida con el hospital el cifrado en reposo, las copias de seguridad y la ubicación regional del proyecto.

En Vercel usa variables separadas por entorno (`Preview` y `Production`) y nunca publiques secretos. El CORS de la aplicación no se resuelve con una clave en React: debe quedar restringido en Supabase y en el hosting. Las políticas RLS siguen siendo el control principal.

Para un hospital, publica primero en un dominio de prueba, valida las políticas RLS con cuentas de distintos perfiles y solicita revisión del equipo de seguridad antes de usar datos reales.
