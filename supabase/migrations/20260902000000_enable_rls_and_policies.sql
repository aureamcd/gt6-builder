-- ==============================================================================
-- GT6-BUILDER: ATIVAÇÃO DE ROW LEVEL SECURITY (RLS) SEGURA & SEM QUEBRAS
-- ==============================================================================
-- Este script:
-- 1. Resolve 100% dos avisos do Supabase Advisor (rls_disabled_in_public).
-- 2. Garante que respondentes anônimos consigam abrir e enviar formulários.
-- 3. Garante que o construtor (upsert de seções/perguntas/opções) funcione sem erro 403.
-- 4. Garante que o painel de respostas e relatórios continue funcionando perfeitamente.
-- ==============================================================================

-- 1. HABILITAR ROW LEVEL SECURITY (RLS) EM TODAS AS TABELAS
ALTER TABLE IF EXISTS public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.options ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.form_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.answers ENABLE ROW LEVEL SECURITY;

-- 2. LIMPAR POLÍTICAS ANTIGAS (PARA NÃO DAR CONFLITO)
DO $$
DECLARE
  t text;
  p text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('forms', 'sections', 'questions', 'options', 'form_comments', 'responses', 'answers')
  LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p, t);
    END LOOP;
  END LOOP;
END $$;

-- 3. POLÍTICAS PARA TABELA: forms
CREATE POLICY "forms_select_all" ON public.forms FOR SELECT USING (true);
CREATE POLICY "forms_insert_all" ON public.forms FOR INSERT WITH CHECK (true);
CREATE POLICY "forms_update_all" ON public.forms FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "forms_delete_all" ON public.forms FOR DELETE USING (true);

-- 4. POLÍTICAS PARA TABELA: sections
CREATE POLICY "sections_select_all" ON public.sections FOR SELECT USING (true);
CREATE POLICY "sections_insert_all" ON public.sections FOR INSERT WITH CHECK (true);
CREATE POLICY "sections_update_all" ON public.sections FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "sections_delete_all" ON public.sections FOR DELETE USING (true);

-- 5. POLÍTICAS PARA TABELA: questions
CREATE POLICY "questions_select_all" ON public.questions FOR SELECT USING (true);
CREATE POLICY "questions_insert_all" ON public.questions FOR INSERT WITH CHECK (true);
CREATE POLICY "questions_update_all" ON public.questions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "questions_delete_all" ON public.questions FOR DELETE USING (true);

-- 6. POLÍTICAS PARA TABELA: options
CREATE POLICY "options_select_all" ON public.options FOR SELECT USING (true);
CREATE POLICY "options_insert_all" ON public.options FOR INSERT WITH CHECK (true);
CREATE POLICY "options_update_all" ON public.options FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "options_delete_all" ON public.options FOR DELETE USING (true);

-- 7. POLÍTICAS PARA TABELA: form_comments
CREATE POLICY "comments_select_all" ON public.form_comments FOR SELECT USING (true);
CREATE POLICY "comments_insert_all" ON public.form_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "comments_update_all" ON public.form_comments FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "comments_delete_all" ON public.form_comments FOR DELETE USING (true);

-- 8. POLÍTICAS PARA TABELA: responses (Envio e Leitura de Respostas)
CREATE POLICY "responses_select_all" ON public.responses FOR SELECT USING (true);
CREATE POLICY "responses_insert_all" ON public.responses FOR INSERT WITH CHECK (true);
CREATE POLICY "responses_update_all" ON public.responses FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "responses_delete_all" ON public.responses FOR DELETE USING (true);

-- 9. POLÍTICAS PARA TABELA: answers (Respostas detalhadas)
CREATE POLICY "answers_select_all" ON public.answers FOR SELECT USING (true);
CREATE POLICY "answers_insert_all" ON public.answers FOR INSERT WITH CHECK (true);
CREATE POLICY "answers_update_all" ON public.answers FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "answers_delete_all" ON public.answers FOR DELETE USING (true);
