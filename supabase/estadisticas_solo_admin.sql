-- ============================================================
-- Las cifras del municipio pasan a ser cosa del equipo.
--
-- Decisión del 15/09/2026: /estadisticas deja de ser colaborativa y se
-- vuelve un centro de información cargado por quien sabe lo que hace. La
-- comunidad participa en el feed: fotos, reseñas y respaldos. Nadie corrobora
-- ya nada; el admin dice si una cifra está verificada o sigue en revisión.
--
-- Como siempre: la regla vive aquí, no en la app. Si mañana alguien llama a
-- la API por fuera del sitio, estas políticas son las que lo paran.
-- Correr completo en el SQL Editor de Supabase.
-- ============================================================

-- ¿Quien está pidiendo es admin? Va como función para no repetir el subselect
-- en cada política. SECURITY DEFINER para que la lectura de perfiles no
-- dependa de las políticas de perfiles.
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

-- Borra las políticas viejas de las dos tablas para no quedar con reglas
-- encimadas: abajo se vuelven a crear todas las que queremos.
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

-- Las cifras las lee todo el mundo, con sesión o sin ella: el sitio se
-- comparte por WhatsApp y tiene que verse sin cuenta.
create policy "estadistica: la lee cualquiera"
  on public.estadisticas for select
  using (true);

-- Solo un admin aporta. Y sigue sin poder editarse una cifra: un número mejor
-- es una fila nueva, la vieja queda para comparar.
create policy "estadistica: solo la carga un admin"
  on public.estadisticas for insert
  to authenticated
  with check (public.es_admin());

-- Lo único que se actualiza es el sello (verificado / en revisión), y solo un
-- admin. El valor y la fuente no se tocan: para eso está el aporte nuevo.
create policy "estadistica: solo un admin cambia el sello"
  on public.estadisticas for update
  to authenticated
  using (public.es_admin())
  with check (public.es_admin());

-- Las corroboraciones quedan como historia: se pueden leer, pero ya nadie
-- escribe. Sin política de insert, la base no deja meter ni una fila más.
create policy "corroboracion: historia, solo lectura"
  on public.corroboraciones for select
  using (true);

-- ============================================================
-- Verificación: esto es lo que debe quedar.
-- ============================================================
select tablename as tabla, policyname as politica, cmd as comando
from pg_policies
where schemaname = 'public'
  and tablename in ('estadisticas', 'corroboraciones')
order by tablename, cmd;
