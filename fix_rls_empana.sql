-- SQL para Corrigir o Erro 42501 (RLS Violation) na tabela clientes_empana
-- Copie e cole este comando no SQL Editor do seu Supabase e clique em RUN.

-- Opção 1: Desativar RLS (Mais simples se o sistema for privado)
ALTER TABLE clientes_empana DISABLE ROW LEVEL SECURITY;

-- Opção 2: Adicionar política para permitir todas as operações (Se preferir manter RLS ativo)
-- DROP POLICY IF EXISTS "Permitir tudo para anon" ON clientes_empana;
-- CREATE POLICY "Permitir tudo para anon" ON clientes_empana FOR ALL USING (true) WITH CHECK (true);
