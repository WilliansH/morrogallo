-- ============================================================
-- Columnas que nadie puede tocarse a sí mismo desde la API.
--
-- Las políticas dejan que cada quien edite SU fila de perfiles y SUS
-- publicaciones, pero una política de fila no mira columnas. Con la API de
-- Supabase (la anon key es pública, viaja en el navegador) cualquiera con
-- cuenta podía:
--
--   perfiles       es_admin = true          → hacerse admin
--   publicaciones  votos_count = 9999       → primera en "Más respaldadas"
--                  oculto = false           → deshacer la moderación
--                  comentarios_count, autor → inventar o cambiar de dueño
--
-- Estos triggers devuelven esas columnas a su valor anterior cuando el cambio
-- viene directo de la API (roles anon / authenticated). Siguen pudiendo:
--   · los triggers de votos y comentarios que llevan los contadores
--     (pg_trigger_depth() > 1: vienen de adentro de otro trigger),
--   · las funciones security definer y el SQL Editor (otro rol),
--   · un admin, que puede ocultar y des-ocultar publicaciones.
--
-- Es idempotente: se puede correr de nuevo.
-- ============================================================

-- ---------- perfiles ----------
create or replace function public.perfiles_columnas_protegidas()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('anon', 'authenticated') and pg_trigger_depth() = 1 then
    if tg_op = 'INSERT' then
      new.es_admin := false;
    else
      new.es_admin := old.es_admin;
      new.correo   := old.correo;
      new.id       := old.id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_perfiles_columnas_protegidas on public.perfiles;
create trigger trg_perfiles_columnas_protegidas
  before insert or update on public.perfiles
  for each row execute function public.perfiles_columnas_protegidas();


-- ---------- publicaciones ----------
create or replace function public.publicaciones_columnas_protegidas()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('anon', 'authenticated') and pg_trigger_depth() = 1 then
    if tg_op = 'INSERT' then
      -- La política de insert no está en el repo (se creó desde el panel):
      -- aquí se asegura que nadie publique a nombre de otro.
      new.usuario_id        := auth.uid();
      new.votos_count       := 0;
      new.comentarios_count := 0;
      new.oculto            := false;
    else
      new.votos_count       := old.votos_count;
      new.comentarios_count := old.comentarios_count;
      new.usuario_id        := old.usuario_id;
      new.creado_en         := old.creado_en;
      if not public.es_admin() then
        new.oculto := old.oculto;
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_publicaciones_columnas_protegidas on public.publicaciones;
create trigger trg_publicaciones_columnas_protegidas
  before insert or update on public.publicaciones
  for each row execute function public.publicaciones_columnas_protegidas();


-- Verificación.
select tgname, tgrelid::regclass
from pg_trigger
where tgname in ('trg_perfiles_columnas_protegidas', 'trg_publicaciones_columnas_protegidas');
