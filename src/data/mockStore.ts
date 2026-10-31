// Store compartilhado para sincronização entre Cadastros e Pedidos de Compra
import { integrarEntradaMateriaPrima } from './pipelineIntegrado';

export type StatusPedidoCompra = 'A Confirmar' | 'Confirmado' | 'Programado' | 'Orçamento' | 'Entregue (A Pagar)' | 'Pago';

export type CategoriaCompra = 
  | 'Mandioca / Matéria-Prima'
  | 'Mercado / Cozinha / Copa'
  | 'Embalagens'
  | 'Manutenção & Peças'
  | 'Combustível & Lubrificantes'
  | 'Químicos & Laboratório'
  | 'Insumos Agrícolas'
  | 'Limpeza & Escritório'
  | 'Outros';

export interface PedidoCompraGeral {
  id: string;
  data: string;
  tipo_parceiro: 'AGRICULTOR' | 'FORNECEDOR';
  // Agricultor (quando aplicável)
  agricultor_id?: string;
  agricultor_nome?: string;
  agricultor_propriedade?: string;
  agricultor_cpf_cnpj?: string;
  agricultor_ie?: string;
  agricultor_cidade_uf?: string;
  agricultor_chave_pix?: string;
  // Fornecedor (quando aplicável)
  fornecedor_id?: string;
  fornecedor_nome?: string;
  fornecedor_fantasia?: string;
  fornecedor_cnpj?: string;
  fornecedor_ie?: string;
  fornecedor_cidade_uf?: string;
  fornecedor_chave_pix?: string;
  fornecedor_telefone?: string;
  // Solicitante e Local de Compra
  comprador_nome?: string;
  local_compra?: string;
  // Detalhes da Compra
  item_descricao: string;
  categoria: CategoriaCompra;
  quantidade: number;
  unidade_medida: 'KG' | 'Sacos' | 'Litros' | 'Unidades' | 'Caixas' | 'Toneladas' | 'Pacotes' | 'Fardos';
  valor_unitario: number;
  valor_total: number;
  // Refugo de mandioca (apenas quando for mandioca)
  residuo_destopo_casca_kg?: number;
  // Status e Pagamento
  status_pedido: StatusPedidoCompra;
  forma_pagamento: 'PIX' | 'Boleto Bancário' | 'Transferência TED' | 'À Vista Dinheiro' | 'Cartão Corporativo';
  data_pagamento?: string;
  observacoes?: string;
}

export interface Agricultor {
  id: string;
  empresa_id: string;
  tipo_pessoa: 'PF' | 'PJ';
  nome_completo: string;
  nome_propriedade: string;
  cpf_cnpj: string;
  ie_rural: string;
  telefone: string;
  email?: string;
  endereco: {
    estrada_linha: string;
    comunidade_bairro: string;
    municipio: string;
    uf: string;
    cep: string;
    ponto_referencia?: string;
  };
  area_hectares?: number;
  capacidade_estimada_safra_ton?: number;
  chave_pix: string;
  tipo_chave_pix: 'CPF' | 'CNPJ' | 'Celular' | 'E-mail' | 'Aleatória';
  titular_pix?: string;
  banco_nome?: string;
  agencia?: string;
  conta?: string;
  observacoes_financeiras?: string;
  ativo: boolean;
  criado_em: string;
}

export interface Fornecedor {
  id: string;
  empresa_id: string;
  tipo_pessoa: 'PF' | 'PJ';
  razao_nome: string;
  fantasia?: string;
  cpf_cnpj: string;
  ie_rg?: string;
  email: string;
  telefone: string;
  endereco: {
    cep: string;
    logradouro: string;
    numero: string;
    bairro: string;
    municipio: string;
    uf: string;
    complemento?: string;
  };
  forma_pagamento_nome?: string;
  chave_pix?: string;
  ativo: boolean;
  criado_em: string;
}

export const AGRICULTORES_CADASTRADOS: Agricultor[] = [];

export const FORNECEDORES_CADASTRADOS: Fornecedor[] = [];

export const PEDIDOS_COMPRA_INICIAIS: PedidoCompraGeral[] = [];

const STORAGE_KEY_PEDIDOS_COMPRA = 'grupo_eno_pedidos_compra_v2';

export function carregarPedidosCompra(): PedidoCompraGeral[] {
  const modoLimpo = typeof window !== 'undefined' && localStorage.getItem('grupo_eno_modo_limpo_v1') === 'true';
  if (typeof window === 'undefined') return modoLimpo ? [] : PEDIDOS_COMPRA_INICIAIS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PEDIDOS_COMPRA);
    if (raw === null) {
      if (modoLimpo) {
        localStorage.setItem(STORAGE_KEY_PEDIDOS_COMPRA, JSON.stringify([]));
        return [];
      }
      localStorage.setItem(STORAGE_KEY_PEDIDOS_COMPRA, JSON.stringify(PEDIDOS_COMPRA_INICIAIS));
      return PEDIDOS_COMPRA_INICIAIS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function salvarPedidosCompra(pedidos: PedidoCompraGeral[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_PEDIDOS_COMPRA, JSON.stringify(pedidos));
  window.dispatchEvent(new Event('pedidos_compra_updated'));
}

/**
 * Confirma o Pedido de Compra (sem alteração de produto ou valor)
 * Move para 'Confirmado' e gera automaticamente uma despesa no Financeiro:
 * - Mandioca -> 'Matéria-Prima Mandioca'
 * - Embalagens -> 'Embalagens'
 * - Insumos (Químicos, Aditivos, Insumos Agrícolas) -> 'Insumos'
 * - Outros (Mercado, Manutenção, Combustível, Limpeza, Outros) -> 'Outros'
 */
export function confirmarPedidoCompraELancarDespesa(pedidoId: string): { sucesso: boolean; mensagem: string; categoriaFinanceiro: string } {
  if (typeof window === 'undefined') return { sucesso: false, mensagem: 'Janela indisponível', categoriaFinanceiro: '' };

  const pedidos = carregarPedidosCompra();
  const index = pedidos.findIndex(p => p.id === pedidoId);
  if (index === -1) return { sucesso: false, mensagem: 'Pedido não encontrado', categoriaFinanceiro: '' };

  const pedido = pedidos[index];
  
  // 1. Determina a categoria financeira exata conforme regra do Grupo ENO
  let categoriaFinanceiro: 'Matéria-Prima Mandioca' | 'Insumos' | 'Embalagens' | 'Outros' = 'Outros';
  let setorFinanceiro: 'Fábrica & Moagem' | 'Secador & Caldeira' | 'Frotas & Logística' | 'Administrativo & TI' | 'Qualidade & Laboratório' = 'Fábrica & Moagem';

  const descLower = pedido.item_descricao.toLowerCase();
  const catOriginal = pedido.categoria;

  if (catOriginal === 'Mandioca / Matéria-Prima' || descLower.includes('mandioca') || descLower.includes('raiz')) {
    categoriaFinanceiro = 'Matéria-Prima Mandioca';
    setorFinanceiro = 'Fábrica & Moagem';
  } else if (catOriginal === 'Embalagens' || descLower.includes('saco') || descLower.includes('big bag') || descLower.includes('embalag')) {
    categoriaFinanceiro = 'Embalagens';
    setorFinanceiro = 'Fábrica & Moagem';
  } else if (
    catOriginal === 'Químicos & Laboratório' ||
    catOriginal === 'Insumos Agrícolas' ||
    descLower.includes('quimic') ||
    descLower.includes('ácido') ||
    descLower.includes('aditivo') ||
    descLower.includes('insumo')
  ) {
    categoriaFinanceiro = 'Insumos';
    setorFinanceiro = 'Qualidade & Laboratório';
  } else {
    categoriaFinanceiro = 'Outros';
    if (catOriginal === 'Combustível & Lubrificantes') setorFinanceiro = 'Frotas & Logística';
    else if (catOriginal === 'Mercado / Cozinha / Copa' || catOriginal === 'Limpeza & Escritório') setorFinanceiro = 'Administrativo & TI';
    else if (catOriginal === 'Manutenção & Peças') setorFinanceiro = 'Fábrica & Moagem';
    else setorFinanceiro = 'Administrativo & TI';
  }

  // 2. Atualiza o status do pedido de compra para Confirmado
  pedido.status_pedido = 'Confirmado';
  pedidos[index] = pedido;
  salvarPedidosCompra(pedidos);

  // 3. Lança a Despesa Operacional no Financeiro
  try {
    const rawDespesas = localStorage.getItem('grupo_eno_financeiro_despesas_v1');
    const despesas = rawDespesas ? JSON.parse(rawDespesas) : [];
    const parceiroNome = pedido.tipo_parceiro === 'AGRICULTOR' 
      ? (pedido.agricultor_nome || 'Produtor Rural') 
      : (pedido.fornecedor_nome || 'Fornecedor');

    const novaDespesa = {
      id: `desp_auto_pc_${pedido.id}_${Date.now()}`,
      data: pedido.data || new Date().toLocaleDateString('pt-BR'),
      categoria: categoriaFinanceiro,
      descricao: `[Pedido de Compra Confirmado] ${pedido.item_descricao} - Fornecido por: ${parceiroNome}`,
      valor: pedido.valor_total,
      setor: setorFinanceiro,
      responsavel: 'Gestão de Suprimentos / Fecularia',
      forma_pagamento: pedido.forma_pagamento || 'PIX',
      comprovante_anexo: true
    };

    despesas.unshift(novaDespesa);
    localStorage.setItem('grupo_eno_financeiro_despesas_v1', JSON.stringify(despesas));

    // 4. Lança também no Contas a Pagar do Financeiro
    const rawPagar = localStorage.getItem('grupo_eno_financeiro_pagar_v1');
    const titulosPagar = rawPagar ? JSON.parse(rawPagar) : [];
    const novoTituloPagar = {
      id: `pag_auto_pc_${pedido.id}_${Date.now()}`,
      pedido_compra_id: pedido.id,
      numero_documento: `PC-${pedido.id.toUpperCase()}`,
      favorecido_nome: parceiroNome,
      tipo_favorecido: pedido.tipo_parceiro === 'AGRICULTOR' ? 'Agricultor' : 'Fornecedor',
      categoria: categoriaFinanceiro === 'Matéria-Prima Mandioca' ? 'Mandioca / Matéria-Prima' : categoriaFinanceiro === 'Embalagens' ? 'Embalagens' : 'Mandioca / Matéria-Prima',
      valor: pedido.valor_total,
      data_emissao: pedido.data || new Date().toLocaleDateString('pt-BR'),
      data_vencimento: new Date(Date.now() + 7 * 86400000).toLocaleDateString('pt-BR'),
      status: 'A_PAGAR',
      forma_pagamento: pedido.forma_pagamento || 'PIX',
      chave_pix: pedido.agricultor_chave_pix || pedido.fornecedor_chave_pix,
      observacoes: `Origem: Pedido de compra confirmado (${pedido.item_descricao} - Qtd: ${pedido.quantidade} ${pedido.unidade_medida})`
    };

    titulosPagar.unshift(novoTituloPagar);
    localStorage.setItem('grupo_eno_financeiro_pagar_v1', JSON.stringify(titulosPagar));

    // 5. Integra com o estoque de matéria-prima e NF de Entrada
    try {
      integrarEntradaMateriaPrima({
        descricaoItem: pedido.item_descricao,
        quantidade: pedido.quantidade,
        unidade: pedido.unidade_medida,
        valorTotal: pedido.valor_total,
        fornecedorNome: parceiroNome,
        fornecedorCpfCnpj: pedido.agricultor_cpf_cnpj || pedido.fornecedor_cnpj,
        numeroNF: `PC-${pedido.id.toUpperCase()}`,
        data: pedido.data
      });
    } catch (e) {
      console.error('Erro na integração:', e);
    }

    // Notifica o app de que o financeiro e estoque foram atualizados
    window.dispatchEvent(new Event('financeiro_updated'));
    window.dispatchEvent(new Event('produtos_updated'));
  } catch (err) {
    console.error('Erro ao integrar com financeiro:', err);
  }

  return {
    sucesso: true,
    mensagem: `Pedido de Compra confirmado com sucesso! Lançado no Estoque de Matéria-Prima e no Financeiro como "${categoriaFinanceiro}".`,
    categoriaFinanceiro
  };
}

