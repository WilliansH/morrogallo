-- ============================================================
-- Dejar la base en cero para salir a producción.
--
-- BORRA: todos los usuarios (correo, contraseña, sesiones), todos los
-- perfiles (nombre, teléfono, dirección, foto), todas las publicaciones,
-- comentarios, respaldos, corroboraciones y sesiones activas.
--
-- SE QUEDA: municipios, parroquias, las cifras del municipio (estadisticas)
-- y el historial de la UCD (valores_referencia). Son datos del municipio,
-- no de las personas: solo pierden el autor.
--
-- LAS FOTOS: Supabase no deja borrarlas desde SQL. Las borra el workflow de
-- GitHub (.github/workflows/supabase.yml) en el mismo push, solo la vez que
-- esta migración se aplica.
--
-- NO SE PUEDE DESHACER. Corre UNA sola vez: Supabase anota cada migración
-- aplicada y no la repite en los pushes siguientes.
--
-- Después: registrarse de nuevo. Quien está en la lista de la migración
-- 000003 queda como admin solo, sin correr nada.
-- ============================================================

update public.estadisticas       set creado_por      = null where creado_por      is not null;
update public.valores_referencia set actualizado_por = null where actualizado_por is not null;

delete from public.votos;
delete from public.comentarios;
delete from public.publicaciones;
delete from public.corroboraciones;
delete from public.sesiones_activas;
delete from public.perfiles;
delete from auth.users;

-- Opcional: si las cifras o la UCD que hay también eran de prueba, quita
-- el "--" de la línea que corresponda ANTES de correr el script.
-- delete from public.estadisticas;
-- delete from public.valores_referencia;

-- Verificación: todo en 0 menos lo que se queda.
select 'auth.users' as tabla, count(*) from auth.users
union all select 'perfiles',            count(*) from public.perfiles
union all select 'publicaciones',       count(*) from public.publicaciones
union all select 'votos',               count(*) from public.votos
union all select 'comentarios',         count(*) from public.comentarios
union all select 'corroboraciones',     count(*) from public.corroboraciones
union all select 'sesiones_activas',    count(*) from public.sesiones_activas
union all select 'estadisticas (queda)',       count(*) from public.estadisticas
union all select 'valores_referencia (queda)', count(*) from public.valores_referencia
union all select 'parroquias (queda)',         count(*) from public.parroquias
union all select 'fotos en storage (vaciar a mano)', count(*) from storage.objects where bucket_id = 'fotos';
