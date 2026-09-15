-- ---------------------------------------------------------------------------
-- Una sesión por cuenta
--
-- Supabase trae esto de fábrica ("Single session per user"), pero solo en el
-- plan Pro. Esto es lo mismo, hecho a mano, sin costo.
--
-- Cómo funciona: cada vez que alguien entra, se guarda aquí el id de SU sesión.
-- El proxy compara en cada request el id de la sesión que trae la cookie con el
-- que está guardado. Si no coinciden, esa sesión es la vieja y se cierra. Gana
-- siempre el ingreso más reciente, igual que en el plan Pro.
--
-- La tabla es una fila por usuario y cada quien solo ve y toca la suya.
-- ---------------------------------------------------------------------------

create table if not exists public.sesiones_activas (
  usuario_id uuid primary key references auth.users (id) on delete cascade,
  session_id text not null,
  actualizado_en timestamptz not null default now()
);

alter table public.sesiones_activas enable row level security;

drop policy if exists "sesion propia: leer" on public.sesiones_activas;
create policy "sesion propia: leer"
  on public.sesiones_activas for select
  to authenticated
  using (usuario_id = auth.uid());

drop policy if exists "sesion propia: crear" on public.sesiones_activas;
create policy "sesion propia: crear"
  on public.sesiones_activas for insert
  to authenticated
  with check (usuario_id = auth.uid());

drop policy if exists "sesion propia: actualizar" on public.sesiones_activas;
create policy "sesion propia: actualizar"
  on public.sesiones_activas for update
  to authenticated
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

select policyname, cmd
from pg_policies
where schemaname = 'public' and tablename = 'sesiones_activas'
order by cmd;
