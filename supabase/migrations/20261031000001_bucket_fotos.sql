-- ============================================================
-- Volver a crear el bucket "fotos".
--
-- El paso del workflow que vació el storage para producción
-- (supabase storage rm -r "ss:///fotos") no se llevó solo los archivos:
-- se llevó el bucket. Desde entonces toda subida —foto de perfil y fotos
-- de publicaciones— responde "Bucket not found" y la app solo dice
-- "No se pudo subir la foto".
--
-- Público para leer (las URLs del feed son getPublicUrl), 5 MB por
-- archivo como en la app, y solo imágenes.
--
-- Las políticas de leer y borrar lo propio (migración 000002) siguen ahí:
-- viven en storage.objects, no en el bucket. Aquí se aseguran las de subir
-- y reemplazar, que la app necesita por el upsert: true.
--
-- Es idempotente: se puede correr de nuevo.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', true, 5242880, array['image/*'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "fotos: subir a lo propio" on storage.objects;
create policy "fotos: subir a lo propio"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "fotos: reemplazar lo propio" on storage.objects;
create policy "fotos: reemplazar lo propio"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Verificación.
select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'fotos';
