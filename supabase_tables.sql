-- DDL for Supabase (PostgreSQL)

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- User Table
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  login TEXT UNIQUE NOT NULL,
  perfil TEXT NOT NULL CHECK (perfil IN ('gerente', 'representante', 'producao')),
  ativo BOOLEAN DEFAULT TRUE,
  senha TEXT NOT NULL -- Store simple password as requested, but in prod you should hash it!
);

-- Inserindo Gerente (adm/adm) inicial e o teste (teste/123)
INSERT INTO usuarios (nome, login, perfil, ativo, senha) VALUES 
('Administrador', 'adm', 'gerente', true, 'adm'),
('Representante Teste', 'teste', 'representante', true, '123');


-- Clientes
CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  representante_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT NOT NULL,
  cnpj_cpf TEXT NOT NULL UNIQUE,
  inscricao_estadual TEXT,
  telefone TEXT,
  whatsapp TEXT,
  email TEXT,
  endereco TEXT,
  numero TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  data_cadastro DATE DEFAULT CURRENT_DATE
);

-- Produtos
CREATE TABLE produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL,
  unidade TEXT NOT NULL,
  preco_base NUMERIC(10, 2) NOT NULL,
  custo NUMERIC(10, 2) NOT NULL,
  margem_pretendida NUMERIC(10, 2) NOT NULL,
  estoque_atual NUMERIC(10, 2) NOT NULL DEFAULT 0
);

-- Custos Diferenciados do Produto (Receita do Arquitetor)
CREATE TABLE produtos_custos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID REFERENCES produtos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  grupo TEXT NOT NULL CHECK (grupo IN ('Imposto', 'Materia Prima', 'Comissao', 'Frete', 'Trade', 'Embalagem', 'Outros')),
  tipo TEXT NOT NULL CHECK (tipo IN ('Fixo', 'Variavel')),
  unidade_medida TEXT NOT NULL CHECK (unidade_medida IN ('kg', 'und', '%', 'lt', 'g')),
  valor NUMERIC(10, 2) NOT NULL,
  proporcao NUMERIC(10, 2) NOT NULL,
  base_calculo TEXT CHECK (base_calculo IN ('Venda', 'Custo'))
);

-- Orcamentos
CREATE TABLE orcamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  representante_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  valor_total NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Rascunho', 'Enviado', 'Aprovado', 'Reprovado', 'Convertido em Pedido', 'Cancelado')),
  condicao_pagamento TEXT NOT NULL,
  prazo_entrega TEXT NOT NULL,
  observacoes TEXT
);

-- Itens Orcamento
CREATE TABLE orcamentos_itens (
  orcamento_id UUID REFERENCES orcamentos(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES produtos(id),
  quantidade NUMERIC(10, 2) NOT NULL,
  preco NUMERIC(10, 2) NOT NULL,
  PRIMARY KEY (orcamento_id, produto_id)
);

-- Pedidos
CREATE TABLE pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  representante_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  valor_total NUMERIC(10, 2) NOT NULL,
  custo_total NUMERIC(10, 2) NOT NULL,
  margem NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Enviado', 'Em análise', 'Aprovado', 'Em produção', 'Faturado', 'Entregue', 'Cancelado')),
  nf_anexo TEXT,
  boleto_anexo TEXT,
  condicao_pagamento TEXT NOT NULL,
  prazo_entrega TEXT NOT NULL,
  observacoes TEXT
);

-- Itens Pedido
CREATE TABLE pedidos_itens (
  pedido_id UUID REFERENCES pedidos(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES produtos(id),
  quantidade NUMERIC(10, 2) NOT NULL,
  preco NUMERIC(10, 2) NOT NULL,
  PRIMARY KEY (pedido_id, produto_id)
);

-- Despesas
CREATE TABLE despesas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('Empresa', 'Representante', 'Pessoal')),
  categoria TEXT NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  vencimento DATE NOT NULL,
  valor NUMERIC(10, 2) NOT NULL,
  forma_pagamento TEXT NOT NULL CHECK (forma_pagamento IN ('Dinheiro', 'Cartão', 'Pix', 'Boleto', 'Cartão Crédito', 'Cartão Débito')),
  recorrente BOOLEAN DEFAULT FALSE,
  parcelas INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL CHECK (status IN ('Pendente', 'Pago', 'Atrasado')),
  comprovante_url TEXT,
  observacoes TEXT
);

-- Comissões
CREATE TABLE comissoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  representante_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  pedido_id UUID REFERENCES pedidos(id) ON DELETE CASCADE,
  nf_numero TEXT,
  valor_base NUMERIC(10, 2) NOT NULL,
  percentual NUMERIC(5, 2) NOT NULL,
  valor_comissao NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Prevista', 'Liberada', 'Paga', 'Bloqueada')),
  data_prevista DATE NOT NULL,
  data_pagamento DATE
);

-- Metas
CREATE TABLE metas_representantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  representante_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  ano INTEGER NOT NULL,
  mes INTEGER NOT NULL,
  valor NUMERIC(10, 2) NOT NULL,
  UNIQUE(representante_id, ano, mes)
);

-- Producao
CREATE TABLE producao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID REFERENCES produtos(id) ON DELETE CASCADE,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  data_inicio DATE NOT NULL,
  data_fim DATE,
  status TEXT NOT NULL CHECK (status IN ('Planejada', 'Em andamento', 'Finalizada')),
  lote TEXT NOT NULL,
  quantidade_produzida NUMERIC(10, 2) NOT NULL DEFAULT 0,
  quantidade_estimada NUMERIC(10, 2) NOT NULL,
  quantidade_materia_prima NUMERIC(10, 2) NOT NULL
);
