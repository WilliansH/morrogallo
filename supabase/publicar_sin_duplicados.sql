-- ============================================================
-- Que un doble clic no publique dos veces.
--
-- El formulario manda una llave de un solo uso que se genera al pintar la
-- página. Si el mismo envío llega dos veces —doble clic, o el navegador
-- reintentando— la segunda trae la misma llave y la base la rechaza.
--
-- Va aquí y no en la app a propósito: dos peticiones simultáneas pueden
-- pasar las dos por cualquier comprobación que haga el servidor, pero no por
-- un índice único.
--
-- Las filas viejas se quedan con la llave en null, y eso está bien: un índice
-- único deja pasar todos los nulos que haga falta.
-- ============================================================

alter table public.publicaciones
  add column if not exists clave_envio uuid;

create unique index if not exists publicacion_clave_envio_unica
  on public.publicaciones (clave_envio);

-- Verificación.
select indexname from pg_indexes
where schemaname = 'public' and tablename = 'publicaciones';
