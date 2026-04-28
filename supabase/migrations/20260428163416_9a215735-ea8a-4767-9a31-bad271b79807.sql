-- Crear bucket público "conductores" para fotos de postulación
INSERT INTO storage.buckets (id, name, public)
VALUES ('conductores', 'conductores', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Lectura pública
DROP POLICY IF EXISTS "Conductores fotos lectura publica" ON storage.objects;
CREATE POLICY "Conductores fotos lectura publica"
ON storage.objects FOR SELECT
USING (bucket_id = 'conductores');

-- Subida: cada usuario sube a su carpeta {user.id}/...
DROP POLICY IF EXISTS "Conductor sube sus fotos" ON storage.objects;
CREATE POLICY "Conductor sube sus fotos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'conductores'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Actualizar (upsert)
DROP POLICY IF EXISTS "Conductor actualiza sus fotos" ON storage.objects;
CREATE POLICY "Conductor actualiza sus fotos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'conductores'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Borrar
DROP POLICY IF EXISTS "Conductor borra sus fotos" ON storage.objects;
CREATE POLICY "Conductor borra sus fotos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'conductores'
  AND (storage.foldername(name))[1] = auth.uid()::text
);