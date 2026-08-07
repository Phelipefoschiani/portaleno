-- SQL para Criar a Tabela clientes_empana e Corrigir RLS
-- Execute este script no SQL Editor do Supabase se a tabela não existir ou para resetar as permissões.

CREATE TABLE IF NOT EXISTS clientes_empana (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  representante_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj_cpf TEXT NOT NULL UNIQUE,
  inscricao_estadual TEXT,
  telefone TEXT,
  whatsapp TEXT,
  email TEXT,
  cep TEXT,
  endereco TEXT,
  numero TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  responsavel TEXT,
  canal TEXT,
  categorias JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'Liberado',
  data_cadastro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  observacoes TEXT
);

-- CORREÇÃO DO ERRO 42501 (RLS VIOLATION)
-- Desativa o RLS para permitir que o app (via anon key) insira dados
ALTER TABLE clientes_empana DISABLE ROW LEVEL SECURITY;

-- Se preferir manter RLS ativo, use as políticas abaixo em vez de desativar:
-- ALTER TABLE clientes_empana ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Permitir leitura para todos" ON clientes_empana FOR SELECT USING (true);
-- CREATE POLICY "Permitir inserção para todos" ON clientes_empana FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Permitir atualização para todos" ON clientes_empana FOR UPDATE USING (true);
