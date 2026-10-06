-- ============================================================
-- Las dos alertas de Supabase: "View is defined with SECURITY DEFINER".
--
-- v_valores_actuales: lee valores_referencia, que ya tiene lectura pública
-- por política. La vista no necesita saltarse nada: pasa a respetar el RLS
-- de quien consulta. (valores_referencia_politicas.sql ya lo hacía, pero
-- la vista se había vuelto a crear sin la opción.)
--
-- perfiles_publicos: aquí sí hace falta saltarse el RLS de perfiles —
-- cada quien solo ve su propia fila, porque ahí están teléfono, dirección y
-- correo. Lo que cambia es DÓNDE se salta: ahora lo hace una función que
-- devuelve SOLO las columnas públicas, y la vista queda como security
-- invoker encima de ella. Mismo nombre, mismas columnas, mismo orden: la app
-- no cambia una línea.
-- ============================================================

alter view public.v_valores_actuales set (security_invoker = on);

create or replace function public.perfiles_publicos_datos()
returns table (
  id             uuid,
  nombre_visible text,
  foto_url       text,
  parroquia_id   uuid,
  municipio_id   uuid,
  foto_mini_url  text
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id::uuid,
         p.nombre_visible::text,
         p.foto_url::text,
         p.parroquia_id::uuid,
         p.municipio_id::uuid,
         p.foto_mini_url::text
  from public.perfiles p
$$;

revoke all on function public.perfiles_publicos_datos() from public;
grant execute on function public.perfiles_publicos_datos() to anon, authenticated;

drop view if exists public.perfiles_publicos;

create view public.perfiles_publicos
  with (security_invoker = on) as
  select id, nombre_visible, foto_url, parroquia_id, municipio_id, foto_mini_url
  from public.perfiles_publicos_datos();

grant select on public.perfiles_publicos to anon, authenticated;
