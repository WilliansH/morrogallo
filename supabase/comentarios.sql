-- ============================================================
-- Comentarios en las publicaciones.
--
-- Cada publicación tiene su página (/p/<id>) y ahí se comenta. Reglas, todas
-- en la base:
--
--   · Leer: cualquiera, sin cuenta. Los ocultos solo los ven su autor y el admin.
--   · Comentar: solo con cuenta, a nombre propio, en una publicación visible.
--     Texto de 1 a 1.000 caracteres.
--   · Tope: 30 comentarios por hora por persona (frena el spam y los pleitos).
--   · Borrar: el autor del comentario, y también el dueño de la publicación
--     (es su foto: decide qué queda debajo).
--   · Ocultar: solo un admin. No borra.
--   · comentarios_count en publicaciones lo lleva un trigger, para que el
--     feed muestre "Comentar · 3" sin contar fila por fila.
--   · Doble clic: la misma llave de un solo uso que ya usa publicar.
--
-- Al borrar una publicación sus comentarios se van con ella (on delete
-- cascade). Al borrar una cuenta, también sus comentarios: ver borrar.sql.
--
-- Es idempotente: se puede correr de nuevo.
-- ============================================================

create table if not exists public.comentarios (
  id             uuid primary key default gen_random_uuid(),
  publicacion_id uuid not null references public.publicaciones (id) on delete cascade,
  usuario_id     uuid not null references auth.users (id) on delete cascade,
  texto          text not null check (char_length(btrim(texto)) between 1 and 1000),
  oculto         boolean not null default false,
  clave_envio    uuid unique,
  creado_en      timestamptz not null default now()
);

create index if not exists comentarios_por_publicacion_idx
  on public.comentarios (publicacion_id, creado_en);
create index if not exists comentarios_por_usuario_idx
  on public.comentarios (usuario_id, creado_en desc);

alter table public.publicaciones
  add column if not exists comentarios_count integer not null default 0;

alter table public.comentarios enable row level security;

-- ---------- Políticas ----------
drop policy if exists "comentario: leer" on public.comentarios;
create policy "comentario: leer"
  on public.comentarios for select
  to anon, authenticated
  using (not oculto or usuario_id = auth.uid() or public.es_admin());

drop policy if exists "comentario: crear" on public.comentarios;
create policy "comentario: crear"
  on public.comentarios for insert
  to authenticated
  with check (
    usuario_id = auth.uid()
    and not oculto
    and exists (
      select 1 from public.publicaciones p
      where p.id = publicacion_id and p.oculto is not true
    )
  );

drop policy if exists "comentario: borrar" on public.comentarios;
create policy "comentario: borrar"
  on public.comentarios for delete
  to authenticated
  using (
    usuario_id = auth.uid()
    or exists (
      select 1 from public.publicaciones p
      where p.id = publicacion_id and p.usuario_id = auth.uid()
    )
  );

drop policy if exists "comentario: admin oculta" on public.comentarios;
create policy "comentario: admin oculta"
  on public.comentarios for update
  to authenticated
  using (public.es_admin())
  with check (public.es_admin());

-- ---------- Tope por hora ----------
create or replace function public.tope_comentarios()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    select count(*) from public.comentarios
    where usuario_id = new.usuario_id
      and creado_en > now() - interval '1 hour'
  ) >= 30 then
    raise exception 'Llevas muchos comentarios en una hora. Descansa un rato y vuelve.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_tope_comentarios on public.comentarios;
create trigger trg_tope_comentarios
  before insert on public.comentarios
  for each row execute function public.tope_comentarios();

-- ---------- Contador ----------
create or replace function public.recalcular_comentarios()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pub uuid := coalesce(new.publicacion_id, old.publicacion_id);
begin
  update public.publicaciones
     set comentarios_count = (
       select count(*) from public.comentarios
       where publicacion_id = v_pub and not oculto
     )
   where id = v_pub;
  return null;
end;
$$;

drop trigger if exists trg_recalcular_comentarios on public.comentarios;
create trigger trg_recalcular_comentarios
  after insert or delete or update of oculto on public.comentarios
  for each row execute function public.recalcular_comentarios();

-- ---------- Verificación ----------
select 'política' as que, policyname as detalle
from pg_policies
where schemaname = 'public' and tablename = 'comentarios'
union all
select 'trigger', tgname
from pg_trigger
where tgrelid = 'public.comentarios'::regclass and not tgisinternal
union all
select 'columna', column_name
from information_schema.columns
where table_name = 'publicaciones' and column_name = 'comentarios_count';
