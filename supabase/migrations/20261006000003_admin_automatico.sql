-- ============================================================
-- Admin automático al registrarse.
--
-- Hasta ahora, después de registrarse había que correr admins.sql a mano.
-- Con esto, quien se registre con uno de los correos de la lista entra ya
-- como admin. Para agregar a Héctor: su correo en la lista, en una
-- migración nueva que vuelva a crear esta función.
--
-- Es el mismo trigger de perfil_al_registrarse.sql, con una columna más.
-- ============================================================

create or replace function public.crear_perfil_al_registrarse()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parroquia uuid;
  v_municipio uuid;
  v_admin boolean := lower(new.email) = any (array[
    'wh.140291@gmail.com'          -- Willians
    -- , 'correo-de-hector@…'     -- Héctor, cuando se sepa
  ]);
begin
  v_parroquia := nullif(new.raw_user_meta_data ->> 'parroquia_id', '')::uuid;

  if v_parroquia is not null then
    begin
      execute 'select municipio_id from public.parroquias where id = $1'
        into v_municipio
        using v_parroquia;
    exception
      when others then
        v_municipio := null;
    end;
  end if;

  insert into public.perfiles (id, correo, nombre_visible, municipio_id, parroquia_id, es_admin)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'nombre_visible', ''),
    v_municipio,
    v_parroquia,
    v_admin
  )
  on conflict (id) do update
    set correo         = excluded.correo,
        nombre_visible = coalesce(excluded.nombre_visible, public.perfiles.nombre_visible),
        municipio_id   = coalesce(excluded.municipio_id, public.perfiles.municipio_id),
        parroquia_id   = coalesce(excluded.parroquia_id, public.perfiles.parroquia_id),
        es_admin       = public.perfiles.es_admin or excluded.es_admin;

  return new;
end;
$$;
