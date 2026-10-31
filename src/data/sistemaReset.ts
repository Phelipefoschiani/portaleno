// Módulo de Gerenciamento de Reset do Sistema e Modo Novo Usuário
// Permite zerar completamente o sistema para testes limpos,
// bem como restaurar dados de demonstração ou criar cenários de teste específicos.

import { PEDIDOS_VENDA_INICIAIS } from './pedidosVendaData';
import { PEDIDOS_COMPRA_INICIAIS } from './mockStore';
import { CALCULOS_ROCA_INICIAIS } from './calculoRocaData';
import {
  TITULOS_RECEBER_INICIAIS,
  TITULOS_PAGAR_INICIAIS,
  DESPESAS_OPERACIONAIS_INICIAIS,
  RECEITAS_EXTRAS_INICIAIS,
  NOTAS_SAIDA_INICIAIS,
  NOTAS_ENTRADA_INICIAIS,
  CAIXA_INVESTIMENTO_INICIAL
} from './financeiroData';
import {
  ESTOQUE_PRODUTOS_INICIAIS,
  MATERIAS_PRIMAS_INICIAIS,
  RECEITAS_INICIAIS,
  FICHAS_TECNICAS_INICIAIS,
  TABELAS_PRECO_INICIAIS,
  ProdutoEstoque
} from './produtosData';
import { CLIENTES_INICIAIS, Cliente } from './clientesData';

const KEY_MODO_LIMPO = 'grupo_eno_modo_limpo_v1';

export function isModoLimpoAtivo(): boolean {
  if (typeof window === 'undefined') return true;
  // Se ainda não houver flag definida, assume modo limpo ativo por solicitação do usuário
  const val = localStorage.getItem(KEY_MODO_LIMPO);
  if (val === null) {
    localStorage.setItem(KEY_MODO_LIMPO, 'true');
    return true;
  }
  return val === 'true';
}

export function limparTodoOSistema(manterCadastrosBase: boolean = false): void {
  if (typeof window === 'undefined') return;

  // 1. Marca flag de sistema limpo (novo usuário)
  localStorage.setItem(KEY_MODO_LIMPO, 'true');

  // 2. Limpa Pedidos, Vendas e Orçamentos
  localStorage.setItem('grupo_eno_pedidos_venda_v1', JSON.stringify([]));
  localStorage.setItem('grupo_eno_vendas_rca_v1', JSON.stringify([]));

  // 3. Limpa Pedidos de Compra e Cálculos na Roça
  localStorage.setItem('grupo_eno_pedidos_compra_v2', JSON.stringify([]));
  localStorage.setItem('grupo_eno_calculos_roca_v1', JSON.stringify([]));

  // 4. Limpa todo o Financeiro
  localStorage.setItem('grupo_eno_financeiro_receber_v1', JSON.stringify([]));
  localStorage.setItem('grupo_eno_financeiro_pagar_v1', JSON.stringify([]));
  localStorage.setItem('grupo_eno_financeiro_despesas_v1', JSON.stringify([]));
  localStorage.setItem('grupo_eno_financeiro_receitas_v1', JSON.stringify([]));
  localStorage.setItem('grupo_eno_financeiro_notas_saida_v1', JSON.stringify([]));
  localStorage.setItem('grupo_eno_financeiro_notas_entrada_v1', JSON.stringify([]));
  localStorage.setItem('grupo_eno_financeiro_caixa_invest_v1', JSON.stringify([]));

  // 5. Limpa Sítio e Combustíveis
  localStorage.setItem('grupo_eno_sitio_despesas_v1', JSON.stringify({
    totalLitrosDisponivel: 0,
    despesas: []
  }));

  // 6. Cadastros de Clientes, Produtos e Receitas
  if (!manterCadastrosBase) {
    localStorage.setItem('grupo_eno_clientes_v1', JSON.stringify([]));
    localStorage.setItem('grupo_eno_produtos_estoque_v1', JSON.stringify([]));
    localStorage.setItem('grupo_eno_materia_prima_v1', JSON.stringify([]));
    localStorage.setItem('grupo_eno_receitas_v1', JSON.stringify([]));
    localStorage.setItem('grupo_eno_fichas_tecnicas_v1', JSON.stringify([]));
    localStorage.setItem('grupo_eno_tabelas_preco_v1', JSON.stringify([]));
  }

  // 7. Dispara todos os eventos para recarregar as telas em tempo real
  dispatchTodosEventos();
}

export function restaurarDadosDemonstracao(): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem(KEY_MODO_LIMPO, 'false');

  localStorage.setItem('grupo_eno_pedidos_venda_v1', JSON.stringify(PEDIDOS_VENDA_INICIAIS));
  localStorage.setItem('grupo_eno_pedidos_compra_v2', JSON.stringify(PEDIDOS_COMPRA_INICIAIS));
  localStorage.setItem('grupo_eno_calculos_roca_v1', JSON.stringify(CALCULOS_ROCA_INICIAIS));

  localStorage.setItem('grupo_eno_financeiro_receber_v1', JSON.stringify(TITULOS_RECEBER_INICIAIS));
  localStorage.setItem('grupo_eno_financeiro_pagar_v1', JSON.stringify(TITULOS_PAGAR_INICIAIS));
  localStorage.setItem('grupo_eno_financeiro_despesas_v1', JSON.stringify(DESPESAS_OPERACIONAIS_INICIAIS));
  localStorage.setItem('grupo_eno_financeiro_receitas_v1', JSON.stringify(RECEITAS_EXTRAS_INICIAIS));
  localStorage.setItem('grupo_eno_financeiro_notas_saida_v1', JSON.stringify(NOTAS_SAIDA_INICIAIS));
  localStorage.setItem('grupo_eno_financeiro_notas_entrada_v1', JSON.stringify(NOTAS_ENTRADA_INICIAIS));
  localStorage.setItem('grupo_eno_financeiro_caixa_invest_v1', JSON.stringify(CAIXA_INVESTIMENTO_INICIAL));

  localStorage.setItem('grupo_eno_clientes_v1', JSON.stringify(CLIENTES_INICIAIS));
  localStorage.setItem('grupo_eno_produtos_estoque_v1', JSON.stringify(ESTOQUE_PRODUTOS_INICIAIS));
  localStorage.setItem('grupo_eno_materia_prima_v1', JSON.stringify(MATERIAS_PRIMAS_INICIAIS));
  localStorage.setItem('grupo_eno_receitas_v1', JSON.stringify(RECEITAS_INICIAIS));
  localStorage.setItem('grupo_eno_fichas_tecnicas_v1', JSON.stringify(FICHAS_TECNICAS_INICIAIS));
  localStorage.setItem('grupo_eno_tabelas_preco_v1', JSON.stringify(TABELAS_PRECO_INICIAIS));

  dispatchTodosEventos();
}

/**
 * Cria um cenário prático para o usuário testar exatamente o comportamento pedido:
 * 1 cliente cadastrado
 * 1 produto cadastrado SEM RECEITA e SEM CUSTO
 * 1 produto cadastrado COM RECEITA e COM CUSTO (para comparação)
 */
export function criarCenarioTesteNovoUsuario(): void {
  if (typeof window === 'undefined') return;

  // Garante que pedidos e financeiro começam vazios
  limparTodoOSistema(true);

  // Cadastra 1 cliente de teste
  const clienteTeste: Cliente = {
    id: 'cli_teste_novo_01',
    empresa_id: 'emp_grupo_eno',
    tipo_pessoa: 'PJ',
    razao_nome: 'Supermercado Teste do Brasil Ltda',
    fantasia: 'Supermercado Teste',
    cpf_cnpj: '45.123.987/0001-99',
    email: 'compras@mercadoteste.com.br',
    telefone: '(11) 98765-4321',
    endereco: {
      cep: '01001-000',
      logradouro: 'Av. Paulista',
      numero: '1000',
      bairro: 'Bela Vista',
      municipio: 'São Paulo',
      uf: 'SP'
    },
    forma_pagamento_id: 'fp_1',
    forma_pagamento_nome: 'Boleto Bancário',
    prazo_pagamento_id: 'pp_5',
    prazo_pagamento_nome: '28 Dias',
    ativo: true,
    criado_em: new Date().toISOString()
  };

  localStorage.setItem('grupo_eno_clientes_v1', JSON.stringify([clienteTeste]));

  // Cadastra 1 produto SEM custo e SEM receita (o caso que o usuário quer testar!)
  const prodSemCustoEReceita: ProdutoEstoque = {
    id: 'prod_teste_sem_custo_receita',
    codigo: 'PROD-PEND-01',
    nome: 'Fécula Especial 25kg (Sem Custo e Sem Receita)',
    categoria: 'Féculas Nativas',
    tipo_embalagem: 'Saco 25kg',
    peso_unitario_kg: 25,
    estoque_atual_sacos: 0,
    estoque_atual_kg: 0,
    estoque_minimo_kg: 1000,
    localizacao_galpao: 'Galpão A',
    preco_unitario_venda: 95.00,
    lote_recente: 'LOTE-TESTE',
    status: 'EM_ESTOQUE',
    // SEM receita e SEM custo:
    receita_id: undefined,
    receita_nome: undefined,
    custo_materia_prima: 0,
    custo_operacional: 0,
    custo_total: 0, // Falta custo!
    margem_lucro_percentual: 0
  };

  // Cadastra 1 produto COM custo e COM receita para servir de comparação
  const prodCompleto: ProdutoEstoque = {
    id: 'prod_teste_completo',
    codigo: 'PROD-COMP-02',
    nome: 'Polvilho Azedo Premium 25kg (Com Receita e Custo)',
    categoria: 'Polvilhos',
    tipo_embalagem: 'Saco 25kg',
    peso_unitario_kg: 25,
    estoque_atual_sacos: 100,
    estoque_atual_kg: 2500,
    estoque_minimo_kg: 500,
    localizacao_galpao: 'Galpão B',
    preco_unitario_venda: 120.00,
    lote_recente: 'LOTE-001',
    status: 'EM_ESTOQUE',
    // COM receita e COM custo:
    receita_id: 'rec_polvilho_teste',
    receita_nome: 'Receita Padrão Polvilho Azedo',
    custo_materia_prima: 62.50,
    custo_operacional: 15.00,
    custo_total: 77.50, // Custo configurado!
    margem_lucro_percentual: 35.4
  };

  localStorage.setItem('grupo_eno_produtos_estoque_v1', JSON.stringify([prodSemCustoEReceita, prodCompleto]));

  dispatchTodosEventos();
}

function dispatchTodosEventos(): void {
  window.dispatchEvent(new Event('pedidos_venda_updated'));
  window.dispatchEvent(new Event('pedidos_compra_updated'));
  window.dispatchEvent(new Event('calculos_roca_updated'));
  window.dispatchEvent(new Event('financeiro_updated'));
  window.dispatchEvent(new Event('produtos_updated'));
  window.dispatchEvent(new Event('clientes_updated'));
  window.dispatchEvent(new Event('sitio_updated'));
  window.dispatchEvent(new Event('sistema_reset_updated'));
}
