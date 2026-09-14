-- ---------------------------------------------------------------------------
-- valores_referencia — quién lee y quién escribe
--
-- Reglas del proyecto que este archivo hace cumplir en la base:
--   · Cualquiera lee los valores. Son datos públicos, es el punto del sitio.
--   · Solo un admin inserta. La UCD la carga una persona, no un script.
--   · Nadie edita ni borra: un valor nuevo es una fila nueva. Por eso no hay
--     políticas de UPDATE ni de DELETE, y sin política no hay permiso.
--   · La fila queda firmada: actualizado_por tiene que ser quien la inserta.
--
-- Correr en el SQL Editor. Es idempotente: se puede correr de nuevo sin daño.
-- ---------------------------------------------------------------------------

alter table public.valores_referencia enable row level security;

drop policy if exists "valores_referencia_lectura_publica" on public.valores_referencia;
create policy "valores_referencia_lectura_publica"
  on public.valores_referencia
  for select
  to anon, authenticated
  using (true);

drop policy if exists "valores_referencia_insercion_admin" on public.valores_referencia;
create policy "valores_referencia_insercion_admin"
  on public.valores_referencia
  for insert
  to authenticated
  with check (
    actualizado_por = auth.uid()
    and exists (
      select 1
      from public.perfiles p
      where p.id = auth.uid()
        and p.es_admin
    )
  );

-- La vista tiene que respetar las políticas de la tabla, no saltárselas.
alter view public.v_valores_actuales set (security_invoker = on);

-- Comprobación rápida: debe listar exactamente dos políticas, select e insert.
select policyname, cmd
from pg_policies
where schemaname = 'public' and tablename = 'valores_referencia'
order by cmd;
