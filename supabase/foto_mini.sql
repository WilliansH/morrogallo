-- ============================================================
-- Avatar chico para el feed.
--
-- El feed muestra veinte avatares por pantalla, a 32 píxeles, y hasta ahora
-- bajaba la foto de perfil completa (512px, ~70 KB) para cada uno: más de un
-- MB por visita en puros avatares, más que todas las miniaturas de las
-- publicaciones juntas. Con una versión de 96px eso baja a unos 5 KB.
--
-- Es idempotente: se puede correr de nuevo.
-- ============================================================

alter table public.perfiles
  add column if not exists foto_mini_url text;

-- Las que ya existen se quedan apuntando a la grande hasta que su dueño
-- vuelva a subir la foto: mejor eso que un hueco.
update public.perfiles
   set foto_mini_url = foto_url
 where foto_mini_url is null
   and foto_url is not null;

-- La vista pública tiene que exponerla, que es de donde la lee el feed.
create or replace view public.perfiles_publicos
  with (security_invoker = off) as
  select id, nombre_visible, foto_url, foto_mini_url, parroquia_id, municipio_id
  from public.perfiles;

grant select on public.perfiles_publicos to anon, authenticated;

-- Verificación.
select id, nombre_visible, foto_url, foto_mini_url from public.perfiles_publicos;
