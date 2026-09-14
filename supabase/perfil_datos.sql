-- ---------------------------------------------------------------------------
-- Morrogallo — datos de perfil y privacidad
--
-- Agrega teléfono, dirección y foto, y cierra la lectura de perfiles.
--
-- POR QUÉ SE CIERRA: teléfono y dirección son datos personales. Si perfiles
-- sigue con lectura pública, cualquiera los saca por la API con la clave
-- publishable, que es pública por diseño. A partir de aquí cada quien ve
-- solo su propia fila, y lo que el resto del sitio necesita mostrar
-- (nombre, foto, parroquia) sale de la vista perfiles_publicos.
--
-- Es idempotente: se puede correr de nuevo.
-- ---------------------------------------------------------------------------

alter table public.perfiles
  add column if not exists telefono  text,
  add column if not exists direccion text,
  add column if not exists foto_url  text;

alter table public.perfiles enable row level security;

-- Borra las políticas que hubiera en perfiles, sean cuales sean sus nombres,
-- y deja abajo el juego completo. Esto solo toca la tabla perfiles.
do $$
declare p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'perfiles'
  loop
    execute format('drop policy %I on public.perfiles', p.policyname);
  end loop;
end $$;

create policy "perfil propio: leer"
  on public.perfiles for select
  using (auth.uid() = id);

create policy "perfil propio: crear"
  on public.perfiles for insert
  with check (auth.uid() = id);

create policy "perfil propio: actualizar"
  on public.perfiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Lo público de un perfil. Sin correo, sin teléfono, sin dirección.
-- security_invoker = off a propósito: la vista salta el RLS de perfiles
-- justamente porque es el subconjunto que sí puede ver cualquiera.
create or replace view public.perfiles_publicos
  with (security_invoker = off) as
  select id, nombre_visible, foto_url, parroquia_id, municipio_id
  from public.perfiles;

grant select on public.perfiles_publicos to anon, authenticated;
