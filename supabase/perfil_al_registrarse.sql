-- ---------------------------------------------------------------------------
-- Morrogallo — crear el perfil al registrarse
--
-- Al hacer signUp, la app manda parroquia_id y nombre_visible dentro de
-- raw_user_meta_data. Este trigger los recoge y crea la fila en perfiles.
--
-- Es idempotente: se puede correr de nuevo sin romper nada.
-- El municipio se deduce de la parroquia; si esa columna no existe en
-- parroquias, queda en null en vez de reventar el registro.
--
-- security definer para que el insert no choque con las políticas RLS.
-- ---------------------------------------------------------------------------

create or replace function public.crear_perfil_al_registrarse()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parroquia uuid;
  v_municipio uuid;
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

  insert into public.perfiles (id, correo, nombre_visible, municipio_id, parroquia_id)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'nombre_visible', ''),
    v_municipio,
    v_parroquia
  )
  on conflict (id) do update
    set correo         = excluded.correo,
        nombre_visible = coalesce(excluded.nombre_visible, public.perfiles.nombre_visible),
        municipio_id   = coalesce(excluded.municipio_id, public.perfiles.municipio_id),
        parroquia_id   = coalesce(excluded.parroquia_id, public.perfiles.parroquia_id);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.crear_perfil_al_registrarse();
