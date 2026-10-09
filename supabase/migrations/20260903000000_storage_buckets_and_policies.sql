-- ==============================================================================
-- GT6-BUILDER: CRIAÇÃO DE BUCKETS E POLÍTICAS DE STORAGE (SUPABASE)
-- ==============================================================================
-- Este script:
-- 1. Cria os buckets 'form-media' e 'form-submissions' no Supabase Storage.
-- 2. Torna ambos os buckets públicos para leitura de arquivos.
-- 3. Configura as políticas RLS de INSERT, SELECT, UPDATE e DELETE para garantir
--    que o upload de imagens, áudios, vídeos e arquivos dos respondentes funcione.
-- ==============================================================================

-- 1. CRIAR OU ATUALIZAR BUCKETS COMO PÚBLICOS
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('form-media', 'form-media', true, 52428800, NULL),
  ('form-submissions', 'form-submissions', true, 26214400, NULL)
ON CONFLICT (id) DO UPDATE 
SET public = true,
    file_size_limit = EXCLUDED.file_size_limit;

-- 2. POLÍTICAS DE ACESSO PARA O BUCKET: form-media
DO $$
BEGIN
  -- Remover políticas anteriores para evitar duplicação
  DROP POLICY IF EXISTS "form_media_public_select" ON storage.objects;
  DROP POLICY IF EXISTS "form_media_public_insert" ON storage.objects;
  DROP POLICY IF EXISTS "form_media_public_update" ON storage.objects;
  DROP POLICY IF EXISTS "form_media_public_delete" ON storage.objects;

  -- Criar novas políticas permissivas
  CREATE POLICY "form_media_public_select" ON storage.objects
    FOR SELECT USING (bucket_id = 'form-media');

  CREATE POLICY "form_media_public_insert" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'form-media');

  CREATE POLICY "form_media_public_update" ON storage.objects
    FOR UPDATE USING (bucket_id = 'form-media') WITH CHECK (bucket_id = 'form-media');

  CREATE POLICY "form_media_public_delete" ON storage.objects
    FOR DELETE USING (bucket_id = 'form-media');
END $$;

-- 3. POLÍTICAS DE ACESSO PARA O BUCKET: form-submissions
DO $$
BEGIN
  -- Remover políticas anteriores para evitar duplicação
  DROP POLICY IF EXISTS "form_submissions_public_select" ON storage.objects;
  DROP POLICY IF EXISTS "form_submissions_public_insert" ON storage.objects;
  DROP POLICY IF EXISTS "form_submissions_public_update" ON storage.objects;
  DROP POLICY IF EXISTS "form_submissions_public_delete" ON storage.objects;

  -- Criar novas políticas permissivas
  CREATE POLICY "form_submissions_public_select" ON storage.objects
    FOR SELECT USING (bucket_id = 'form-submissions');

  CREATE POLICY "form_submissions_public_insert" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'form-submissions');

  CREATE POLICY "form_submissions_public_update" ON storage.objects
    FOR UPDATE USING (bucket_id = 'form-submissions') WITH CHECK (bucket_id = 'form-submissions');

  CREATE POLICY "form_submissions_public_delete" ON storage.objects
    FOR DELETE USING (bucket_id = 'form-submissions');
END $$;
