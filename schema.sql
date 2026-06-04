-- database_schema.sql (Padrão compatível com PostgreSQL)

-- 1. Criação das Extensões Necessárias
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- Para gen_random_uuid() caso versões mais antigas do Postgres

-- 2. Criação das Tabelas Base Principais

CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    login VARCHAR(255) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    perfil VARCHAR(50) NOT NULL,
    ativo BOOLEAN DEFAULT true,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(50),
    nome VARCHAR(255) NOT NULL,
    categoria VARCHAR(100),
    unidade VARCHAR(20),
    quantidade_unidade NUMERIC(10,3),
    preco_base NUMERIC(15,2) NOT NULL,
    custo NUMERIC(15,2) NOT NULL,
    margem_pretendida NUMERIC(5,2),
    estoque_atual NUMERIC(10,3) DEFAULT 0,
    estoque_minimo NUMERIC(10,3) DEFAULT 0,
    ativo BOOLEAN DEFAULT true
);

CREATE TABLE fornecedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    telefone VARCHAR(50),
    rua_linha VARCHAR(255),
    numero VARCHAR(50),
    cidade VARCHAR(100),
    estado VARCHAR(2),
    ponto_referencia VARCHAR(255),
    contato_secundario VARCHAR(255)
);

-- 3. Criação das Tabelas Dependentes Simples

CREATE TABLE metas_representante (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    representante_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    ano INT NOT NULL,
    mes INT NOT NULL,
    valor NUMERIC(15,2) NOT NULL
);

CREATE TABLE objetivos_empresa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ano INT NOT NULL,
    mes INT NOT NULL,
    valor NUMERIC(15,2) NOT NULL
);

CREATE TABLE clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    representante_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    razao_social VARCHAR(255) NOT NULL,
    nome_fantasia VARCHAR(255),
    cnpj_cpf VARCHAR(50) NOT NULL,
    inscricao_estadual VARCHAR(50),
    telefone VARCHAR(50),
    whatsapp VARCHAR(50),
    email VARCHAR(255),
    cep VARCHAR(20),
    endereco VARCHAR(255),
    numero VARCHAR(50),
    bairro VARCHAR(100),
    cidade VARCHAR(100),
    estado VARCHAR(2),
    responsavel VARCHAR(255),
    canal VARCHAR(100),
    categorias JSONB, -- Vetor JSON para suportar multi-categorias
    status VARCHAR(50),
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    observacoes TEXT
);

CREATE TABLE custos_diferenciados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produto_id UUID REFERENCES produtos(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    grupo VARCHAR(50) NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    unidade_medida VARCHAR(10),
    valor NUMERIC(15,2) NOT NULL,
    proporcao NUMERIC(10,2) NOT NULL,
    base_calculo VARCHAR(50)
);

-- 4. Operações, Orçamentos e Pedidos

CREATE TABLE orcamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    representante_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    data TIMESTAMP NOT NULL,
    valor_total NUMERIC(15,2) NOT NULL,
    status VARCHAR(50) NOT NULL,
    condicao_pagamento VARCHAR(100),
    prazo_entrega VARCHAR(100),
    observacoes TEXT
);

CREATE TABLE itens_orcamento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orcamento_id UUID REFERENCES orcamentos(id) ON DELETE CASCADE,
    produto_id UUID REFERENCES produtos(id) ON DELETE RESTRICT,
    quantidade NUMERIC(10,3) NOT NULL,
    preco NUMERIC(15,2) NOT NULL,
    tipo VARCHAR(50),
    desconto NUMERIC(15,2) DEFAULT 0
);

CREATE TABLE pedidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    representante_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    data TIMESTAMP NOT NULL,
    valor_total NUMERIC(15,2) NOT NULL,
    custo_total NUMERIC(15,2) NOT NULL,
    margem NUMERIC(5,2) NOT NULL,
    status VARCHAR(50) NOT NULL,
    nf_anexo TEXT,
    nf_numero VARCHAR(50),
    nf_serie VARCHAR(20),
    nf_chave VARCHAR(100),
    nf_data_emissao TIMESTAMP,
    nf_valor_total NUMERIC(15,2),
    data_faturamento TIMESTAMP,
    data_entrega TIMESTAMP,
    previsao_entrega TIMESTAMP,
    observacoes TEXT,
    data_fabricacao TIMESTAMP,
    data_vencimento TIMESTAMP,
    lote VARCHAR(50),
    forma_pagamento_nf VARCHAR(100),
    data_pagamento_nf TIMESTAMP,
    adiantado BOOLEAN DEFAULT false,
    data_adiantamento TIMESTAMP,
    valor_adiantado_recebido NUMERIC(15,2),
    juros_adiantamento NUMERIC(15,2),
    recebido BOOLEAN DEFAULT false,
    data_recebimento TIMESTAMP,
    juros_recebido NUMERIC(15,2)
);

CREATE TABLE itens_pedido (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID REFERENCES pedidos(id) ON DELETE CASCADE,
    produto_id UUID REFERENCES produtos(id) ON DELETE RESTRICT,
    quantidade NUMERIC(10,3) NOT NULL,
    preco NUMERIC(15,2) NOT NULL,
    tipo VARCHAR(50),
    desconto NUMERIC(15,2) DEFAULT 0,
    quantidade_produzida NUMERIC(10,3) DEFAULT 0
);

CREATE TABLE solicitacoes_insumo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID REFERENCES pedidos(id) ON DELETE CASCADE,
    item VARCHAR(255) NOT NULL,
    quantidade NUMERIC(10,3) NOT NULL,
    unidade VARCHAR(20),
    urgente BOOLEAN DEFAULT false,
    status VARCHAR(50)
);

CREATE TABLE producoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produto_id UUID REFERENCES produtos(id) ON DELETE CASCADE,
    data TIMESTAMP NOT NULL,
    data_inicio TIMESTAMP NOT NULL,
    data_fim TIMESTAMP,
    status VARCHAR(50) NOT NULL,
    lote VARCHAR(50) NOT NULL,
    quantidade_produzida NUMERIC(10,3) NOT NULL,
    quantidade_estimada NUMERIC(10,3) NOT NULL,
    quantidade_materia_prima NUMERIC(10,3) NOT NULL,
    perda NUMERIC(10,3) NOT NULL,
    rendimento NUMERIC(5,2) NOT NULL,
    validade TIMESTAMP NOT NULL,
    custo_lote NUMERIC(15,2) NOT NULL
);

CREATE TABLE comissoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    representante_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    pedido_id UUID REFERENCES pedidos(id) ON DELETE CASCADE,
    nf_numero VARCHAR(50),
    nf_serie VARCHAR(20),
    valor_base NUMERIC(15,2) NOT NULL,
    percentual NUMERIC(5,2) NOT NULL,
    valor_comissao NUMERIC(15,2) NOT NULL,
    status VARCHAR(50) NOT NULL,
    data_prevista TIMESTAMP NOT NULL,
    data_pagamento TIMESTAMP
);

-- 5. Tabelas de Compra e Despesas

CREATE TABLE compras_mandioca (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fornecedor_id UUID REFERENCES fornecedores(id) ON DELETE SET NULL,
    data TIMESTAMP NOT NULL,
    tipo_pesagem VARCHAR(50) NOT NULL,
    quantidade_total NUMERIC(10,3) NOT NULL,
    status_pagamento VARCHAR(50) NOT NULL,
    casca_kg NUMERIC(10,3) NOT NULL,
    destopo_kg NUMERIC(10,3) NOT NULL,
    preco_quilo NUMERIC(15,2),
    valor_total NUMERIC(15,2)
);

CREATE TABLE pesagens_mandioca (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    compra_id UUID REFERENCES compras_mandioca(id) ON DELETE CASCADE,
    peso_kg NUMERIC(10,3) NOT NULL
);

CREATE TABLE despesas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    tipo VARCHAR(50) NOT NULL,
    categoria VARCHAR(100),
    data TIMESTAMP NOT NULL,
    vencimento TIMESTAMP NOT NULL,
    valor NUMERIC(15,2) NOT NULL,
    forma_pagamento VARCHAR(50),
    recorrente BOOLEAN DEFAULT false,
    parcelas INT DEFAULT 1,
    parcela_atual INT DEFAULT 1,
    status VARCHAR(50) NOT NULL,
    descricao TEXT,
    comprovante TEXT,
    tipo_despesa VARCHAR(50),
    compra_mandioca_id UUID REFERENCES compras_mandioca(id) ON DELETE CASCADE,
    data_pagamento TIMESTAMP,
    juros_pago NUMERIC(15,2),
    dias_atraso INT
);

-- 6. Log do Sistema

CREATE TABLE log_eventos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data TIMESTAMP NOT NULL,
    hora TIME NOT NULL,
    descricao TEXT NOT NULL,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    usuario_nome VARCHAR(255),
    valor NUMERIC(15,2)
);

-- ==========================================
-- SCRIPT DE INSERÇÃO - USUÁRIOS
-- ==========================================

-- Inserindo o Usuário Administrador Principal
INSERT INTO usuarios (nome, login, senha, perfil, ativo)
VALUES ('Admin', 'admin', 'adm', 'gerente', true);

-- Comentário: 
-- Os demais usuários (como o representante e pessoal da produção) 
-- podem ser adicionados através do fluxo no próprio portal usando a conta Admin acima, 
-- ou via scripts adicionais se preferir futuramente.
