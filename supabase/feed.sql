-- ---------------------------------------------------------------------------
-- Feed de la comunidad
--
-- Tres cosas, todas idempotentes: se puede correr de nuevo sin daño.
--
-- 1. Una columna para la miniatura. Sin esto el feed tendría que cargar las
--    fotos a tamaño completo y el plan gratuito no aguanta: 15 fotos de 300 KB
--    son 4,5 MB por visita, o sea 37 visitas al día con 5 GB de egress al mes.
--    Con miniaturas de 50 KB la misma visita pesa 750 KB: 220 visitas al día.
--
-- 2. Moderación. Hoy las políticas solo dejan que cada quien edite lo suyo, así
--    que un admin no puede tocar nada de nadie. En un feed de pueblo eso es un
--    problema desde el primer día. Esta política deja que un admin marque
--    'oculto' — no borra: la publicación sigue ahí, deja de mostrarse.
--
-- 3. Un índice para lo único que el feed consulta todo el tiempo.
-- ---------------------------------------------------------------------------

alter table public.publicaciones
  add column if not exists imagen_mini_url text;

drop policy if exists "admin_modera_publicacion" on public.publicaciones;
create policy "admin_modera_publicacion"
  on public.publicaciones
  for update
  to authenticated
  using (
    exists (select 1 from public.perfiles p where p.id = auth.uid() and p.es_admin)
  )
  with check (
    exists (select 1 from public.perfiles p where p.id = auth.uid() and p.es_admin)
  );

create index if not exists publicaciones_feed_idx
  on public.publicaciones (oculto, creado_en desc);

select 'columna' as que, column_name as detalle
from information_schema.columns
where table_name = 'publicaciones' and column_name = 'imagen_mini_url'
union all
select 'política', policyname
from pg_policies
where schemaname = 'public' and tablename = 'publicaciones';
