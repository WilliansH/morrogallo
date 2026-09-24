-- ============================================================
-- Borrar de verdad: una publicación, o la cuenta entera.
--
-- Hasta ahora nada se borraba: el admin oculta, y el dueño no podía hacer
-- nada. Esto le da al dueño dos botones:
--
--   1. borrar_publicacion(id) — solo la suya. Se lleva también sus respaldos.
--   2. borrar_mi_cuenta()     — su usuario, su perfil (nombre, correo,
--      teléfono, dirección), sus publicaciones, sus respaldos y su sesión.
--
-- Las fotos NO se borran aquí: Supabase no deja borrar archivos del storage
-- desde SQL. Las borra la app con la sesión del dueño, y para eso van al
-- final las políticas del bucket "fotos" (cada quien toca solo su carpeta,
-- que es la que lleva su id).
--
-- Van como funciones security definer y no como políticas sueltas porque
-- hay que tocar tablas que el usuario no puede escribir (corroboraciones,
-- estadísticas, auth.users) y porque así el orden lo decide la base, en una
-- sola transacción: o se borra todo, o no se borra nada.
--
-- Es idempotente: se puede correr de nuevo.
-- ============================================================

-- ---------- 1. Borrar una publicación ----------
create or replace function public.borrar_publicacion(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Hay que entrar primero.';
  end if;

  if not exists (
    select 1 from public.publicaciones
    where id = p_id and usuario_id = auth.uid()
  ) then
    raise exception 'Esa publicación no es tuya o ya no existe.';
  end if;

  delete from public.votos where publicacion_id = p_id;
  delete from public.publicaciones where id = p_id;
end;
$$;

revoke all on function public.borrar_publicacion(uuid) from public, anon;
grant execute on function public.borrar_publicacion(uuid) to authenticated;


-- ---------- 2. Borrar mi cuenta ----------
create or replace function public.borrar_mi_cuenta()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Hay que entrar primero.';
  end if;

  -- Respaldos que dio, y los que recibieron sus publicaciones.
  delete from public.votos where usuario_id = v_uid;
  delete from public.votos
   where publicacion_id in (select id from public.publicaciones where usuario_id = v_uid);

  delete from public.publicaciones where usuario_id = v_uid;
  delete from public.corroboraciones where usuario_id = v_uid;

  -- Las cifras y la UCD que cargó un admin se quedan: son del municipio, no
  -- de la persona. Solo se les quita el autor.
  update public.estadisticas set creado_por = null where creado_por = v_uid;
  update public.valores_referencia set actualizado_por = null where actualizado_por = v_uid;

  delete from public.sesiones_activas where usuario_id = v_uid;
  delete from public.perfiles where id = v_uid;

  -- Y el usuario: correo, contraseña, identidades y sesiones de Supabase.
  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function public.borrar_mi_cuenta() from public, anon;
grant execute on function public.borrar_mi_cuenta() to authenticated;


-- ---------- 3. Storage: cada quien ve y borra solo su carpeta ----------
-- Las rutas son  <id del usuario>/pub-…  y  <id del usuario>/perfil-… .
-- remove() pide permiso de leer y de borrar; list() pide el de leer.
drop policy if exists "fotos: leer lo propio" on storage.objects;
create policy "fotos: leer lo propio"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "fotos: borrar lo propio" on storage.objects;
create policy "fotos: borrar lo propio"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);


-- ---------- Verificación ----------
-- Las funciones creadas y quién le cuelga a quién (para ver que nada
-- bloquee el borrado de un usuario).
select 'función' as que, routine_name as detalle, '' as regla
from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('borrar_publicacion', 'borrar_mi_cuenta')
union all
select 'política storage', policyname, cmd
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
union all
select 'llave foránea',
       c.conrelid::regclass || '.' || a.attname || ' → ' || c.confrelid::regclass,
       case c.confdeltype when 'c' then 'cascade' when 'n' then 'set null'
                          when 'a' then 'no action' when 'r' then 'restrict' else c.confdeltype::text end
from pg_constraint c
join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
where c.contype = 'f'
  and c.connamespace = 'public'::regnamespace;
