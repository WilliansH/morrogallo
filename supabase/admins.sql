-- ============================================================
-- Quiénes son admin del portal.
--
-- Un admin puede: cargar cifras y cambiarles el sello, ocultar una
-- publicación del feed y publicar la UCD oficial en /admin/ucd.
--
-- CAMBIA LOS CORREOS antes de correr esto: van los correos con los que cada
-- quien se registró EN EL SITIO. Si alguien todavía no se ha registrado, su
-- fila de perfiles no existe y el update no lo va a encontrar: que se registre
-- primero y vuelve a correr esto.
-- ============================================================

update public.perfiles
   set es_admin = true
 where correo in (
   'wh.140291@gmail.com'   -- Willians  ← verifica que sea el del registro
   -- , 'correo-de-hector@ejemplo.com'   -- Héctor, cuando se registre
 );

-- Verificación: quién quedó de admin.
select correo, nombre_visible, es_admin
from public.perfiles
order by es_admin desc, correo;
