import { Cliente, Produto, Pedido, Orcamento, Despesa, Comissao, Producao, User } from './types';

export const mockUsers: User[] = [
  { id: '1', nome: 'Representante Teste', login: 'teste', perfil: 'representante', ativo: true },
  { id: '2', nome: 'Gerente Admin', login: 'adm', perfil: 'gerente', ativo: true }
];

export const mockMetas = [
  { id: '1', representante_id: '1', ano: new Date().getFullYear(), mes: new Date().getMonth() + 1, valor: 50000 }
];

export const mockProdutos: Produto[] = [
  { id: '1', nome: 'Massa de mandioca', categoria: 'In Natura', unidade: 'kg', preco_base: 12.50, custo: 8.20, margem_pretendida: 35, estoque_atual: 1500, estoque_minimo: 500, ativo: true },
  { id: '2', nome: 'Bolo de mandioca 400g', categoria: 'Panificação', unidade: 'un', preco_base: 18.90, custo: 10.50, margem_pretendida: 45, estoque_atual: 200, estoque_minimo: 50, ativo: true },
  { id: '3', nome: 'Bolo de mandioca 1kg', categoria: 'Panificação', unidade: 'un', preco_base: 35.00, custo: 21.00, margem_pretendida: 40, estoque_atual: 80, estoque_minimo: 20, ativo: true },
  { id: '4', nome: 'Mandioca palito', categoria: 'Congelados', unidade: 'pacote', preco_base: 22.00, custo: 14.50, margem_pretendida: 30, estoque_atual: 450, estoque_minimo: 100, ativo: true },
  { id: '5', nome: 'Mandioca gourmet', categoria: 'Congelados', unidade: 'pacote', preco_base: 28.00, custo: 18.00, margem_pretendida: 35, estoque_atual: 120, estoque_minimo: 30, ativo: true },
];

export const mockClientes: Cliente[] = [
  {
    id: '1',
    representante_id: '1',
    razao_social: 'Supermercado Silva LTDA',
    nome_fantasia: 'Silva Super',
    cnpj_cpf: '12.345.678/0001-90',
    telefone: '(11) 99999-9999',
    whatsapp: '(11) 99999-9999',
    email: 'compras@silvasuper.com',
    endereco: 'Rua das Flores, 123',
    bairro: 'Centro',
    cidade: 'São Paulo',
    estado: 'SP',
    cep: '01234-567',
    canal: 'Supermercado',
    data_cadastro: '2024-01-10',
    status: 'Liberado'
  },
  {
    id: '2',
    representante_id: '1',
    razao_social: 'Distribuidora Alimentos S.A',
    nome_fantasia: 'Alisul',
    cnpj_cpf: '98.765.432/0001-10',
    telefone: '(11) 88888-8888',
    whatsapp: '(11) 88888-8888',
    email: 'contato@alisul.com',
    endereco: 'Av. Industrial, 456',
    bairro: 'Distrito Industrial',
    cidade: 'Campinas',
    estado: 'SP',
    cep: '13000-000',
    canal: 'Distribuidor',
    data_cadastro: '2024-02-15',
    status: 'Aguardando liberação'
  }
];

export const mockPedidos: Pedido[] = [
  { id: '1001', representante_id: '1', cliente_id: '1', data: '2024-05-01', items: [{ produto_id: '1', quantidade: 200, preco: 12.50 }], valor_total: 2500.50, custo_total: 1800.00, margem: 28.01, status: 'Faturado', data_faturamento: '2024-05-02', nf_anexo: 'NF1001.xml' },
  { id: '1002', representante_id: '1', cliente_id: '1', data: '2024-05-05', items: [{ produto_id: '2', quantidade: 100, preco: 12.00 }], valor_total: 1200.00, custo_total: 850.00, margem: 29.17, status: 'Aguardando Produção' },
];

export const mockOrcamentos: Orcamento[] = [
  { id: '501', representante_id: '1', cliente_id: '1', data: '2024-05-08', items: [{ produto_id: '1', quantidade: 256, preco: 12.50 }], valor_total: 3200.00, status: 'Enviado', condicao_pagamento: '30 dias', prazo_entrega: '7 dias' }
];

export const mockDespesas: Despesa[] = [
  { id: '1', usuario_id: '1', tipo: 'Representante', categoria: 'Operacional', data: '2024-05-01', vencimento: '2024-05-01', valor: 250.00, forma_pagamento: 'Dinheiro', recorrente: false, parcelas: 1, parcela_atual: 1, status: 'Paga', descricao: 'Combustível - Visitas' },
  { id: '2', usuario_id: '2', tipo: 'Empresa', categoria: 'Administrativa', data: '2024-05-01', vencimento: '2024-05-15', valor: 4500.00, forma_pagamento: 'Boleto', recorrente: true, parcelas: 1, parcela_atual: 1, status: 'Em aberto', descricao: 'Aluguel Galpão' },
  { id: '3', usuario_id: '2', tipo: 'Empresa', categoria: 'Mandioca / Matéria Prima', data: '2024-05-02', vencimento: '2024-05-02', valor: 12500.00, forma_pagamento: 'Pix', recorrente: false, parcelas: 1, parcela_atual: 1, status: 'Paga', descricao: 'Compra 5 Toneladas Mandioca Branca' },
  { id: '4', usuario_id: '2', tipo: 'Empresa', categoria: 'Operacional', data: '2024-05-05', vencimento: '2024-05-10', valor: 850.00, forma_pagamento: 'Boleto', recorrente: false, parcelas: 1, parcela_atual: 1, status: 'Paga', descricao: 'Manutenção Descascador' },
  { id: '5', usuario_id: '2', tipo: 'Empresa', categoria: 'Ocasionais', data: '2024-05-10', vencimento: '2024-05-10', valor: 320.00, forma_pagamento: 'Dinheiro', recorrente: false, parcelas: 1, parcela_atual: 1, status: 'Paga', descricao: 'Brindes Evento Local' },
  { id: '6', usuario_id: '1', tipo: 'Pessoal', categoria: 'Saúde', data: '2024-05-12', vencimento: '2024-05-12', valor: 180.00, forma_pagamento: 'Pix', recorrente: false, parcelas: 1, parcela_atual: 1, status: 'Pago', descricao: 'Farmácia' },
  { id: '7', usuario_id: '1', tipo: 'Pessoal', categoria: 'Alimentação', data: '2024-06-15', vencimento: '2024-06-15', valor: 450.00, forma_pagamento: 'Cartão Crédito', recorrente: false, parcelas: 1, parcela_atual: 1, status: 'Em aberto', descricao: 'Supermercado Mensal' },
];

export const mockComissoes: Comissao[] = [
  { id: '1', representante_id: '1', pedido_id: '1001', valor_base: 2500.50, percentual: 5.0, valor_comissao: 125.02, status: 'Liberada', data_prevista: '2024-06-01' }
];

export const mockProducao: Producao[] = [
  { id: '1', produto_id: '1', data: '2024-05-07', data_inicio: '2024-05-07', status: 'Finalizada', lote: 'L20240507-A', quantidade_produzida: 500, quantidade_estimada: 500, quantidade_materia_prima: 800, perda: 300, rendimento: 62.5, validade: '2024-06-07', custo_lote: 4100.00 }
];
