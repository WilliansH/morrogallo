-- ============================================================
-- TODO LO DEL 15/09, EN ORDEN. Pegar completo en el SQL Editor y correr.
--
--   1. Marcar al admin
--   2. Cerrar las estadísticas al equipo
--   3. Avatar chico para el feed
--
-- Si una sentencia falla, el editor no aplica nada de lo anterior: o entra
-- todo, o no entra nada. Al final hay una consulta que muestra cómo quedó.
-- Es idempotente: se puede correr de nuevo sin romper nada.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Admins
--
-- Marca al primero que se registró, que eres tú. Si algún día hay que
-- sumar a alguien más —Héctor cuando se registre— es una línea:
--   update public.perfiles set es_admin = true where correo = 'su@correo';
-- ------------------------------------------------------------

update public.perfiles
   set es_admin = true
 where id = (select id from public.perfiles order by creado_en asc limit 1);


-- ------------------------------------------------------------
-- 2. Las cifras del municipio son cosa del equipo
--
-- La gente participa en el feed: fotos, reseñas y respaldos. Las cifras las
-- carga quien tiene el documento delante. La regla vive aquí, no en la app:
-- llamar a la API por fuera del sitio tampoco sirve.
-- ------------------------------------------------------------

create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select p.es_admin from public.perfiles p where p.id = auth.uid()), false)
$$;

revoke all on function public.es_admin() from public;
grant execute on function public.es_admin() to authenticated, anon;

-- Fuera las políticas viejas de las dos tablas, para no quedar con reglas
-- encimadas: abajo se crean todas las que queremos.
do $$
declare p record;
begin
  for p in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in ('estadisticas', 'corroboraciones')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

alter table public.estadisticas enable row level security;
alter table public.corroboraciones enable row level security;

-- Las cifras las lee cualquiera, con sesión o sin ella: el sitio se comparte
-- por WhatsApp y tiene que verse sin cuenta.
create policy "estadistica: la lee cualquiera"
  on public.estadisticas for select
  using (true);

-- Solo un admin carga. Y sigue sin poder editarse una cifra: un número mejor
-- es una fila nueva, la vieja queda para comparar.
create policy "estadistica: solo la carga un admin"
  on public.estadisticas for insert
  to authenticated
  with check (public.es_admin());

-- Lo único que se actualiza es el sello (verificado / en revisión).
create policy "estadistica: solo un admin cambia el sello"
  on public.estadisticas for update
  to authenticated
  using (public.es_admin())
  with check (public.es_admin());

-- Las corroboraciones quedan como historia: se leen, pero ya nadie escribe.
create policy "corroboracion: historia, solo lectura"
  on public.corroboraciones for select
  using (true);


-- ------------------------------------------------------------
-- 3. Avatar chico
--
-- El feed muestra veinte avatares por pantalla, a 32 píxeles, y bajaba la
-- foto de perfil completa para cada uno: más de un MB por visita en puros
-- avatares. Con una versión de 96px son unos 5 KB.
-- ------------------------------------------------------------

alter table public.perfiles
  add column if not exists foto_mini_url text;

-- Las fotos que ya existen se quedan apuntando a la grande hasta que su dueño
-- vuelva a subirla: mejor eso que un hueco.
update public.perfiles
   set foto_mini_url = foto_url
 where foto_mini_url is null
   and foto_url is not null;

create or replace view public.perfiles_publicos
  with (security_invoker = off) as
  -- foto_mini_url va al final a propósito: create or replace view solo deja
  -- agregar columnas después de las que ya había. Meterla en el medio es
  -- renombrar las siguientes, y Postgres lo rechaza.
  select id, nombre_visible, foto_url, parroquia_id, municipio_id, foto_mini_url
  from public.perfiles;

grant select on public.perfiles_publicos to anon, authenticated;


-- ============================================================
-- Cómo quedó todo. Debe salir: tu correo como admin, cuatro políticas y
-- la columna foto_mini_url en sí.
-- ============================================================

select 'admin' as que, coalesce(correo, '(sin correo)') as detalle, es_admin::text as valor
from public.perfiles
where es_admin is true

union all

select 'política', tablename || ' · ' || policyname, cmd
from pg_policies
where schemaname = 'public' and tablename in ('estadisticas', 'corroboraciones')

union all

select 'columna', 'perfiles.foto_mini_url',
       case when exists (
         select 1 from information_schema.columns
         where table_schema = 'public' and table_name = 'perfiles'
           and column_name = 'foto_mini_url'
       ) then 'existe' else 'FALTA' end

order by 1, 2;
