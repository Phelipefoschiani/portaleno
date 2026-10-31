// Gerenciamento de Compras de Mandioca e Pesagens na Roça (Saco a Saco)
import {
  PedidoCompraGeral,
  CategoriaCompra,
  carregarPedidosCompra,
  salvarPedidosCompra,
  efetivarPedidoCompra,
  excluirPedidoCompra
} from './mockStore';

export interface SacoPesagem {
  numero: number;
  peso_kg: number;
}

export interface CalculoNaRoca {
  id: string;
  numero_ticket: string;
  data: string;
  hora?: string;
  fornecedor_id: string;
  fornecedor_nome: string;
  fornecedor_propriedade?: string;
  fornecedor_cidade_uf?: string;
  fornecedor_cpf_cnpj?: string;
  fornecedor_chave_pix?: string;
  fornecedor_tipo: 'AGRICULTOR' | 'FORNECEDOR';
  variedade_mandioca?: string;
  local_pesagem: string;
  pesador_responsavel: string;
  preco_por_kg: number;
  preco_por_tonelada: number;

  // Lista de pesos saco por saco
  sacos: SacoPesagem[];

  // Totais
  total_sacos: number;
  peso_total_kg: number;
  peso_medio_saco_kg: number;
  valor_total_estimado: number;

  observacoes?: string;

  // Vínculo com Pedido de Compra
  pedido_compra_id: string;
  situacao_pagamento: 'PENDENTE_DEFINICAO' | 'JA_PAGO' | 'A_PAGAR' | 'ADIANTAMENTO_PARCIAL';
  detalhes_pagamento?: {
    tipo: 'JA_PAGO' | 'A_PAGAR' | 'ADIANTAMENTO_PARCIAL';
    forma_pagamento: string;
    data_pagamento_ou_vencimento: string;
    valor_pago?: number;
    saldo_restante?: number;
    conta_bancaria?: string;
    observacao?: string;
  };
  criado_em: string;
}

const STORAGE_KEY_CALCULOS_ROCA = 'grupo_eno_calculos_roca_v1';

// Sem dados de demonstração: o sistema começa vazio
export const CALCULOS_ROCA_INICIAIS: CalculoNaRoca[] = [];

export function carregarCalculosNaRoca(): CalculoNaRoca[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CALCULOS_ROCA);
    if (raw === null) {
      localStorage.setItem(STORAGE_KEY_CALCULOS_ROCA, JSON.stringify([]));
      return [];
    }
    const lista = JSON.parse(raw);
    return Array.isArray(lista) ? lista : [];
  } catch (e) {
    return [];
  }
}

export function salvarCalculosNaRoca(calculos: CalculoNaRoca[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_CALCULOS_ROCA, JSON.stringify(calculos));
  window.dispatchEvent(new Event('calculos_roca_updated'));
}

/**
 * Próximo número de ticket: maior número já usado + 1 (não repete após exclusão).
 * Formato: ROCA-001/26 (ano com 2 dígitos).
 */
export function proximoNumeroTicketRoca(calculos: CalculoNaRoca[] = carregarCalculosNaRoca(), ano: number = new Date().getFullYear()): string {
  const maior = calculos.reduce((max, c) => {
    const m = String(c.numero_ticket || '').match(/(\d+)/);
    const n = m ? parseInt(m[1], 10) : 0;
    return n > max ? n : max;
  }, 0);
  return `ROCA-${String(maior + 1).padStart(3, '0')}/${String(ano).slice(-2)}`;
}

/**
 * Salva a pesagem na roça e gera o Pedido de Compra correspondente.
 * NOTA: O Pedido de Compra é gerado com status 'A Confirmar' e pendente de definição de pagamento,
 * de modo que NÃO lança ainda no financeiro até o usuário dizer se foi pago ou a pagar!
 * Ao editar uma pesagem já existente, a situação de pagamento do pedido é preservada.
 */
export function criarCalculoNaRocaELancarPedidoCompra(novoCalculo: CalculoNaRoca): { sucesso: boolean; pedidoCompraId: string } {
  if (typeof window === 'undefined') return { sucesso: false, pedidoCompraId: '' };

  // 1. Salva nos cálculos da roça
  const calculos = carregarCalculosNaRoca();
  const index = calculos.findIndex(c => c.id === novoCalculo.id);
  if (index >= 0) {
    calculos[index] = novoCalculo;
  } else {
    calculos.unshift(novoCalculo);
  }
  salvarCalculosNaRoca(calculos);

  // 2. Cria ou atualiza o Pedido de Compra correspondente
  const pedidos = carregarPedidosCompra();
  const pedidoExistenteIndex = pedidos.findIndex(p => p.id === novoCalculo.pedido_compra_id);

  const novoPedido: PedidoCompraGeral = {
    id: novoCalculo.pedido_compra_id,
    data: novoCalculo.data,
    tipo_parceiro: novoCalculo.fornecedor_tipo,
    agricultor_id: novoCalculo.fornecedor_tipo === 'AGRICULTOR' ? novoCalculo.fornecedor_id : undefined,
    agricultor_nome: novoCalculo.fornecedor_tipo === 'AGRICULTOR' ? novoCalculo.fornecedor_nome : undefined,
    agricultor_propriedade: novoCalculo.fornecedor_propriedade,
    agricultor_cpf_cnpj: novoCalculo.fornecedor_cpf_cnpj,
    agricultor_cidade_uf: novoCalculo.fornecedor_cidade_uf,
    agricultor_chave_pix: novoCalculo.fornecedor_chave_pix,
    fornecedor_id: novoCalculo.fornecedor_tipo === 'FORNECEDOR' ? novoCalculo.fornecedor_id : undefined,
    fornecedor_nome: novoCalculo.fornecedor_tipo === 'FORNECEDOR' ? novoCalculo.fornecedor_nome : undefined,
    fornecedor_cnpj: novoCalculo.fornecedor_tipo === 'FORNECEDOR' ? novoCalculo.fornecedor_cpf_cnpj : undefined,
    fornecedor_cidade_uf: novoCalculo.fornecedor_tipo === 'FORNECEDOR' ? novoCalculo.fornecedor_cidade_uf : undefined,
    fornecedor_chave_pix: novoCalculo.fornecedor_tipo === 'FORNECEDOR' ? novoCalculo.fornecedor_chave_pix : undefined,
    comprador_nome: novoCalculo.pesador_responsavel,
    local_compra: novoCalculo.local_pesagem,
    item_descricao: `Mandioca na Roça (${novoCalculo.total_sacos} sacos${novoCalculo.variedade_mandioca ? ` - ${novoCalculo.variedade_mandioca}` : ''})`,
    categoria: 'Mandioca / Matéria-Prima',
    quantidade: novoCalculo.peso_total_kg,
    unidade_medida: 'KG',
    valor_unitario: novoCalculo.preco_por_kg,
    valor_total: novoCalculo.valor_total_estimado,
    status_pedido: 'A Confirmar',
    forma_pagamento: 'PIX',
    observacoes: `[Cálculo na Roça - Ticket ${novoCalculo.numero_ticket}] Pesagem saco a saco realizada em ${novoCalculo.data}${novoCalculo.hora ? ` às ${novoCalculo.hora}` : ''}. Total: ${novoCalculo.total_sacos} sacos (Média: ${novoCalculo.peso_medio_saco_kg} kg/saco).`
  };

  if (pedidoExistenteIndex >= 0) {
    const existente = pedidos[pedidoExistenteIndex];
    pedidos[pedidoExistenteIndex] = {
      ...existente,
      ...novoPedido,
      // Preserva situação de pagamento e integrações já realizadas
      status_pedido: existente.status_pedido,
      forma_pagamento: existente.forma_pagamento,
      data_pagamento: existente.data_pagamento,
      categoria: existente.categoria || novoPedido.categoria,
      entrada_estoque: existente.entrada_estoque,
      efetivado_em: existente.efetivado_em,
      observacoes: existente.observacoes || novoPedido.observacoes
    };
  } else {
    pedidos.unshift(novoPedido);
  }

  salvarPedidosCompra(pedidos);

  return { sucesso: true, pedidoCompraId: novoCalculo.pedido_compra_id };
}

/**
 * Define (ou redefine) o pagamento do cálculo da roça e sincroniza com Pedido de Compra e Financeiro.
 * Idempotente: redefinir substitui título/despesa anteriores e a entrada no estoque acontece uma única vez.
 * `edicoes` permite gravar ajustes feitos no modal (produto, valor, categoria).
 */
export function definirPagamentoCalculoRoca(
  calculoId: string,
  dadosPagamento: {
    tipo: 'JA_PAGO' | 'A_PAGAR' | 'ADIANTAMENTO_PARCIAL';
    forma_pagamento: string;
    data_pagamento_ou_vencimento: string;
    data_vencimento_saldo?: string;
    valor_pago?: number;
    saldo_restante?: number;
    conta_bancaria?: string;
    observacao?: string;
  },
  edicoes?: { item_descricao?: string; valor_total?: number; categoria?: CategoriaCompra }
): { sucesso: boolean; mensagem: string } {
  const calculos = carregarCalculosNaRoca();
  const cIndex = calculos.findIndex(c => c.id === calculoId);
  if (cIndex === -1) return { sucesso: false, mensagem: 'Pesagem na roça não encontrada' };

  const calculo = calculos[cIndex];
  const pedidos = carregarPedidosCompra();
  let pedido = pedidos.find(p => p.id === calculo.pedido_compra_id);
  if (!pedido) {
    // Pedido de compra removido: recria a partir da pesagem antes de lançar
    criarCalculoNaRocaELancarPedidoCompra(calculo);
    pedido = carregarPedidosCompra().find(p => p.id === calculo.pedido_compra_id);
    if (!pedido) return { sucesso: false, mensagem: 'Pedido de compra vinculado não encontrado.' };
  }

  const res = efetivarPedidoCompra(pedido.id, {
    tipo: dadosPagamento.tipo,
    data: dadosPagamento.data_pagamento_ou_vencimento,
    data_vencimento_saldo: dadosPagamento.data_vencimento_saldo,
    forma_pagamento: dadosPagamento.forma_pagamento,
    item_descricao: edicoes?.item_descricao,
    valor_total: edicoes?.valor_total,
    categoria: edicoes?.categoria,
    valor_pago: dadosPagamento.valor_pago,
    conta_bancaria: dadosPagamento.conta_bancaria,
    observacao: dadosPagamento.observacao,
    numero_documento: `TICKET-${calculo.numero_ticket}`,
    ids_legados: [calculo.id]
  });
  if (!res.sucesso) return res;

  const valorFinal = typeof edicoes?.valor_total === 'number' && !isNaN(edicoes.valor_total)
    ? edicoes.valor_total
    : calculo.valor_total_estimado;
  const pago = dadosPagamento.tipo === 'ADIANTAMENTO_PARCIAL' ? Math.min(valorFinal, dadosPagamento.valor_pago || 0) : undefined;

  const atualizados = carregarCalculosNaRoca().map(c =>
    c.id === calculoId
      ? {
          ...c,
          situacao_pagamento: dadosPagamento.tipo,
          detalhes_pagamento: {
            ...dadosPagamento,
            valor_pago: dadosPagamento.tipo === 'JA_PAGO' ? valorFinal : dadosPagamento.tipo === 'A_PAGAR' ? 0 : pago,
            saldo_restante: dadosPagamento.tipo === 'ADIANTAMENTO_PARCIAL' ? Math.max(0, valorFinal - (pago || 0)) : dadosPagamento.tipo === 'A_PAGAR' ? valorFinal : 0
          }
        }
      : c
  );
  salvarCalculosNaRoca(atualizados);

  return {
    sucesso: true,
    mensagem: dadosPagamento.tipo === 'JA_PAGO'
      ? `Pagamento registrado como PAGO e lançado como despesa no Financeiro. ${res.mensagem}`
      : dadosPagamento.tipo === 'A_PAGAR'
        ? `Pagamento registrado como A PAGAR e incluído no Contas a Pagar do Financeiro. ${res.mensagem}`
        : `Adiantamento registrado e saldo incluído no Contas a Pagar. ${res.mensagem}`
  };
}

/**
 * Exclui a pesagem na roça.
 * - Se já houve pagamento (total ou adiantamento), a exclusão é bloqueada.
 * - Caso contrário, o pedido de compra gerado é removido junto (com títulos e entrada de estoque estornados).
 */
export function excluirCalculoNaRoca(calculoId: string): { sucesso: boolean; mensagem: string } {
  const calculos = carregarCalculosNaRoca();
  const calculo = calculos.find(c => c.id === calculoId);
  if (!calculo) return { sucesso: false, mensagem: 'Pesagem não encontrada.' };

  const pedido = carregarPedidosCompra().find(p => p.id === calculo.pedido_compra_id);
  const houvePagamento =
    calculo.situacao_pagamento === 'JA_PAGO' ||
    calculo.situacao_pagamento === 'ADIANTAMENTO_PARCIAL' ||
    pedido?.status_pedido === 'Pago';
  if (houvePagamento) {
    return {
      sucesso: false,
      mensagem: 'Esta pesagem já tem pagamento registrado e não pode ser excluída. Estorne o pagamento no Financeiro antes.'
    };
  }

  if (pedido) excluirPedidoCompra(pedido.id, [calculo.id]);
  salvarCalculosNaRoca(calculos.filter(c => c.id !== calculoId));
  return { sucesso: true, mensagem: `Pesagem ${calculo.numero_ticket} excluída${pedido ? ' junto com o pedido de compra gerado' : ''}.` };
}
