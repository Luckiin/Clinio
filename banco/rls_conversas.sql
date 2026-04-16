-- ============================================================
-- CLINIO - RLS para tabelas do CRM (conversas e mensagens)
-- Execute no Supabase → SQL Editor
-- ============================================================

-- Política RLS: conversas da própria clínica
DROP POLICY IF EXISTS "conversas_propria_clinica" ON conversas;
CREATE POLICY "conversas_propria_clinica" ON conversas
  FOR ALL TO authenticated
  USING (
    clinica_id IN (
      SELECT clinica_id FROM usuarios WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    clinica_id IN (
      SELECT clinica_id FROM usuarios WHERE id = auth.uid()
    )
  );

-- Política RLS: mensagens das conversas da própria clínica
DROP POLICY IF EXISTS "mensagens_conversa_propria_clinica" ON mensagens_conversa;
CREATE POLICY "mensagens_conversa_propria_clinica" ON mensagens_conversa
  FOR ALL TO authenticated
  USING (
    conversa_id IN (
      SELECT c.id FROM conversas c
      JOIN usuarios u ON u.clinica_id = c.clinica_id
      WHERE u.id = auth.uid()
    )
  )
  WITH CHECK (
    conversa_id IN (
      SELECT c.id FROM conversas c
      JOIN usuarios u ON u.clinica_id = c.clinica_id
      WHERE u.id = auth.uid()
    )
  );

-- Verificar se as políticas foram criadas
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename IN ('conversas', 'mensagens_conversa')
ORDER BY tablename, policyname;
