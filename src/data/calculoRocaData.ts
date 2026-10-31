// Gerenciamento de Compras de Mandioca e Pesagens na Roça (Saco a Saco)
import { 
  PedidoCompraGeral, 
  carregarPedidosCompra, 
  salvarPedidosCompra,
  AGRICULTORES_CADASTRADOS,
  FORNECEDORES_CADASTRADOS 
} from './mockStore';
import { integrarEntradaMateriaPrima } from './pipelineIntegrado';

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

// Dados iniciais realistas para demonstração imediata
export const CALCULOS_ROCA_INICIAIS: CalculoNaRoca[] = [
  {
    id: 'roca_001',
    numero_ticket: 'ROCA-042/26',
    data: '01/10/2026',
    hora: '08:45',
    fornecedor_id: AGRICULTORES_CADASTRADOS[0]?.id || 'agr_1',
    fornecedor_nome: AGRICULTORES_CADASTRADOS[0]?.nome_completo || 'João Ferreira da Silva',
    fornecedor_propriedade: AGRICULTORES_CADASTRADOS[0]?.nome_propriedade || 'Sítio São José',
    fornecedor_cidade_uf: `${AGRICULTORES_CADASTRADOS[0]?.endereco.municipio || 'Paranavaí'}/${AGRICULTORES_CADASTRADOS[0]?.endereco.uf || 'PR'}`,
    fornecedor_cpf_cnpj: AGRICULTORES_CADASTRADOS[0]?.cpf_cnpj || '123.456.789-00',
    fornecedor_chave_pix: AGRICULTORES_CADASTRADOS[0]?.chave_pix || '44998877665',
    fornecedor_tipo: 'AGRICULTOR',
    variedade_mandioca: 'Mandioca Branca Industrial (IAC 14)',
    local_pesagem: 'Sítio São José - Talhão 02 (Barracão da Roça)',
    pesador_responsavel: 'Phelipe - Gerência de Suprimentos',
    preco_por_kg: 0.62,
    preco_por_tonelada: 620.00,
    sacos: [
      { numero: 1, peso_kg: 50.8 },
      { numero: 2, peso_kg: 51.2 },
      { numero: 3, peso_kg: 49.5 },
      { numero: 4, peso_kg: 52.0 },
      { numero: 5, peso_kg: 50.3 },
      { numero: 6, peso_kg: 48.9 },
      { numero: 7, peso_kg: 51.5 },
      { numero: 8, peso_kg: 50.1 },
      { numero: 9, peso_kg: 52.4 },
      { numero: 10, peso_kg: 49.8 },
      { numero: 11, peso_kg: 50.6 },
      { numero: 12, peso_kg: 51.0 },
      { numero: 13, peso_kg: 49.2 },
      { numero: 14, peso_kg: 50.9 },
      { numero: 15, peso_kg: 51.7 },
      { numero: 16, peso_kg: 50.4 },
      { numero: 17, peso_kg: 52.1 },
      { numero: 18, peso_kg: 49.6 },
      { numero: 19, peso_kg: 50.7 },
      { numero: 20, peso_kg: 51.3 },
    ],
    total_sacos: 20,
    peso_total_kg: 1014.5,
    peso_medio_saco_kg: 50.7,
    valor_total_estimado: 628.99,
    observacoes: 'Mandioca colhida fresca pela manhã com ótima textura e sem podridão. Teor de amido aparente elevado.',
    pedido_compra_id: 'ped_roca_001',
    situacao_pagamento: 'PENDENTE_DEFINICAO',
    criado_em: new Date().toISOString()
  },
  {
    id: 'roca_002',
    numero_ticket: 'ROCA-041/26',
    data: '30/09/2026',
    hora: '14:20',
    fornecedor_id: AGRICULTORES_CADASTRADOS[1]?.id || 'agr_2',
    fornecedor_nome: AGRICULTORES_CADASTRADOS[1]?.nome_completo || 'Antônio Carlos Ribeiro',
    fornecedor_propriedade: AGRICULTORES_CADASTRADOS[1]?.nome_propriedade || 'Fazenda Santa Luzia',
    fornecedor_cidade_uf: `${AGRICULTORES_CADASTRADOS[1]?.endereco.municipio || 'Nova Esperança'}/${AGRICULTORES_CADASTRADOS[1]?.endereco.uf || 'PR'}`,
    fornecedor_cpf_cnpj: AGRICULTORES_CADASTRADOS[1]?.cpf_cnpj || '987.654.321-11',
    fornecedor_chave_pix: AGRICULTORES_CADASTRADOS[1]?.chave_pix || 'antonio@agro.com.br',
    fornecedor_tipo: 'AGRICULTOR',
    variedade_mandioca: 'Mandioca Amarela (Casca Roxa)',
    local_pesagem: 'Fazenda Santa Luzia - Área de Carga',
    pesador_responsavel: 'Carlos Eduardo - Equipe de Campo',
    preco_por_kg: 0.60,
    preco_por_tonelada: 600.00,
    sacos: [
      { numero: 1, peso_kg: 52.5 },
      { numero: 2, peso_kg: 53.0 },
      { numero: 3, peso_kg: 51.8 },
      { numero: 4, peso_kg: 52.2 },
      { numero: 5, peso_kg: 50.9 },
      { numero: 6, peso_kg: 51.4 },
      { numero: 7, peso_kg: 53.1 },
      { numero: 8, peso_kg: 52.0 },
      { numero: 9, peso_kg: 51.6 },
      { numero: 10, peso_kg: 52.8 },
      { numero: 11, peso_kg: 52.1 },
      { numero: 12, peso_kg: 51.9 },
    ],
    total_sacos: 12,
    peso_total_kg: 625.3,
    peso_medio_saco_kg: 52.1,
    valor_total_estimado: 375.18,
    observacoes: 'Raízes selecionadas sem destopo excessivo.',
    pedido_compra_id: 'ped_roca_002',
    situacao_pagamento: 'JA_PAGO',
    detalhes_pagamento: {
      tipo: 'JA_PAGO',
      forma_pagamento: 'PIX no Ato',
      data_pagamento_ou_vencimento: '30/09/2026',
      valor_pago: 375.18,
      conta_bancaria: 'Banco do Brasil - Conta Movimento',
      observacao: 'Pago via PIX no encerramento da pesagem na roça'
    },
    criado_em: new Date().toISOString()
  }
];

export function carregarCalculosNaRoca(): CalculoNaRoca[] {
  const modoLimpo = typeof window !== 'undefined' && localStorage.getItem('grupo_eno_modo_limpo_v1') === 'true';
  if (typeof window === 'undefined') return modoLimpo ? [] : CALCULOS_ROCA_INICIAIS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CALCULOS_ROCA);
    if (raw === null) {
      if (modoLimpo) {
        localStorage.setItem(STORAGE_KEY_CALCULOS_ROCA, JSON.stringify([]));
        return [];
      }
      localStorage.setItem(STORAGE_KEY_CALCULOS_ROCA, JSON.stringify(CALCULOS_ROCA_INICIAIS));
      return CALCULOS_ROCA_INICIAIS;
    }
    return JSON.parse(raw);
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
 * Salva a pesagem na roça e gera o Pedido de Compra correspondente.
 * NOTA: O Pedido de Compra é gerado com status 'A Confirmar' e pendente de definição de pagamento,
 * de modo que NÃO lança ainda no financeiro até o usuário dizer se foi pago ou a pagar!
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
    item_descricao: `Mandioca na Roça (${novoCalculo.total_sacos} sacos - ${novoCalculo.variedade_mandioca})`,
    categoria: 'Mandioca / Matéria-Prima',
    quantidade: novoCalculo.peso_total_kg,
    unidade_medida: 'KG',
    valor_unitario: novoCalculo.preco_por_kg,
    valor_total: novoCalculo.valor_total_estimado,
    status_pedido: 'A Confirmar',
    forma_pagamento: 'PIX',
    observacoes: `[Cálculo na Roça - Ticket ${novoCalculo.numero_ticket}] Pesagem saco a saco realizada em ${novoCalculo.data} às ${novoCalculo.hora}. Total: ${novoCalculo.total_sacos} sacos (Média: ${novoCalculo.peso_medio_saco_kg} kg/saco). Situação de pagamento: Aguardando definição pelo usuário no Pedido de Compra.`
  };

  if (pedidoExistenteIndex >= 0) {
    pedidos[pedidoExistenteIndex] = {
      ...pedidos[pedidoExistenteIndex],
      ...novoPedido
    };
  } else {
    pedidos.unshift(novoPedido);
  }

  salvarPedidosCompra(pedidos);

  return { sucesso: true, pedidoCompraId: novoCalculo.pedido_compra_id };
}

/**
 * Define o pagamento do cálculo da roça e sincroniza com Pedido de Compra e Financeiro
 */
export function definirPagamentoCalculoRoca(
  calculoId: string, 
  dadosPagamento: {
    tipo: 'JA_PAGO' | 'A_PAGAR' | 'ADIANTAMENTO_PARCIAL';
    forma_pagamento: string;
    data_pagamento_ou_vencimento: string;
    valor_pago?: number;
    saldo_restante?: number;
    conta_bancaria?: string;
    observacao?: string;
  }
): { sucesso: boolean; mensagem: string } {
  const calculos = carregarCalculosNaRoca();
  const cIndex = calculos.findIndex(c => c.id === calculoId);
  if (cIndex === -1) return { sucesso: false, mensagem: 'Pesagem na roça não encontrada' };

  const calculo = calculos[cIndex];
  calculo.situacao_pagamento = dadosPagamento.tipo;
  calculo.detalhes_pagamento = dadosPagamento;
  calculos[cIndex] = calculo;
  salvarCalculosNaRoca(calculos);

  // Atualiza o Pedido de Compra correspondente
  const pedidos = carregarPedidosCompra();
  const pIndex = pedidos.findIndex(p => p.id === calculo.pedido_compra_id);
  if (pIndex >= 0) {
    const pedido = pedidos[pIndex];

    if (dadosPagamento.tipo === 'JA_PAGO') {
      pedido.status_pedido = 'Pago';
      pedido.data_pagamento = dadosPagamento.data_pagamento_ou_vencimento;
      pedido.forma_pagamento = (dadosPagamento.forma_pagamento as any) || 'PIX';
      pedido.observacoes = `${pedido.observacoes || ''} | Pagamento: Quitado no ato em ${dadosPagamento.data_pagamento_ou_vencimento} via ${dadosPagamento.forma_pagamento}. Conta: ${dadosPagamento.conta_bancaria || 'Caixa'}.`;

      // Lança no financeiro como despesa paga
      try {
        const rawDespesas = localStorage.getItem('grupo_eno_financeiro_despesas_v1');
        const despesas = rawDespesas ? JSON.parse(rawDespesas) : [];
        despesas.unshift({
          id: `desp_roca_paga_${calculo.id}_${Date.now()}`,
          data: dadosPagamento.data_pagamento_ou_vencimento,
          categoria: 'Matéria-Prima Mandioca',
          descricao: `[Compra na Roça Paga] Mandioca (${calculo.total_sacos} sacos - ${calculo.peso_total_kg} kg) - Produtor: ${calculo.fornecedor_nome}`,
          valor: calculo.valor_total_estimado,
          setor: 'Fábrica & Moagem',
          responsavel: calculo.pesador_responsavel,
          forma_pagamento: dadosPagamento.forma_pagamento,
          comprovante_anexo: true
        });
        localStorage.setItem('grupo_eno_financeiro_despesas_v1', JSON.stringify(despesas));
        window.dispatchEvent(new Event('financeiro_updated'));
      } catch (err) {
        console.error(err);
      }

    } else if (dadosPagamento.tipo === 'A_PAGAR') {
      pedido.status_pedido = 'Entregue (A Pagar)';
      pedido.forma_pagamento = (dadosPagamento.forma_pagamento as any) || 'PIX';
      pedido.observacoes = `${pedido.observacoes || ''} | Pagamento: A pagar programado para ${dadosPagamento.data_pagamento_ou_vencimento} via ${dadosPagamento.forma_pagamento}.`;

      // Lança no Contas a Pagar do financeiro com vencimento
      try {
        const rawPagar = localStorage.getItem('grupo_eno_financeiro_pagar_v1');
        const titulosPagar = rawPagar ? JSON.parse(rawPagar) : [];
        titulosPagar.unshift({
          id: `pag_roca_${calculo.id}_${Date.now()}`,
          pedido_compra_id: pedido.id,
          numero_documento: `TICKET-${calculo.numero_ticket}`,
          favorecido_nome: calculo.fornecedor_nome,
          tipo_favorecido: calculo.fornecedor_tipo === 'AGRICULTOR' ? 'Agricultor' : 'Fornecedor',
          categoria: 'Mandioca / Matéria-Prima',
          valor: calculo.valor_total_estimado,
          data_emissao: calculo.data,
          data_vencimento: dadosPagamento.data_pagamento_ou_vencimento,
          status: 'A_PAGAR',
          forma_pagamento: dadosPagamento.forma_pagamento,
          chave_pix: calculo.fornecedor_chave_pix,
          observacoes: `Compra na Roça (${calculo.total_sacos} sacos - ${calculo.peso_total_kg} kg) - Ticket ${calculo.numero_ticket}`
        });
        localStorage.setItem('grupo_eno_financeiro_pagar_v1', JSON.stringify(titulosPagar));
        window.dispatchEvent(new Event('financeiro_updated'));
      } catch (err) {
        console.error(err);
      }

    } else if (dadosPagamento.tipo === 'ADIANTAMENTO_PARCIAL') {
      pedido.status_pedido = 'Entregue (A Pagar)';
      pedido.observacoes = `${pedido.observacoes || ''} | Adiantamento de R$ ${(dadosPagamento.valor_pago || 0).toFixed(2)} pago em ${dadosPagamento.data_pagamento_ou_vencimento}. Saldo restante: R$ ${(dadosPagamento.saldo_restante || 0).toFixed(2)}.`;

      try {
        // Despesa do adiantamento
        const rawDespesas = localStorage.getItem('grupo_eno_financeiro_despesas_v1');
        const despesas = rawDespesas ? JSON.parse(rawDespesas) : [];
        despesas.unshift({
          id: `desp_roca_adiant_${calculo.id}_${Date.now()}`,
          data: dadosPagamento.data_pagamento_ou_vencimento,
          categoria: 'Matéria-Prima Mandioca',
          descricao: `[Adiantamento Compra Roça] Mandioca (${calculo.total_sacos} sacos) - Produtor: ${calculo.fornecedor_nome}`,
          valor: dadosPagamento.valor_pago || 0,
          setor: 'Fábrica & Moagem',
          responsavel: calculo.pesador_responsavel,
          forma_pagamento: dadosPagamento.forma_pagamento,
          comprovante_anexo: true
        });
        localStorage.setItem('grupo_eno_financeiro_despesas_v1', JSON.stringify(despesas));

        // Saldo a pagar
        const rawPagar = localStorage.getItem('grupo_eno_financeiro_pagar_v1');
        const titulosPagar = rawPagar ? JSON.parse(rawPagar) : [];
        titulosPagar.unshift({
          id: `pag_roca_saldo_${calculo.id}_${Date.now()}`,
          pedido_compra_id: pedido.id,
          numero_documento: `TICKET-${calculo.numero_ticket}-SALDO`,
          favorecido_nome: calculo.fornecedor_nome,
          tipo_favorecido: calculo.fornecedor_tipo === 'AGRICULTOR' ? 'Agricultor' : 'Fornecedor',
          categoria: 'Mandioca / Matéria-Prima',
          valor: dadosPagamento.saldo_restante || 0,
          data_emissao: calculo.data,
          data_vencimento: dadosPagamento.data_pagamento_ou_vencimento,
          status: 'A_PAGAR',
          forma_pagamento: dadosPagamento.forma_pagamento,
          chave_pix: calculo.fornecedor_chave_pix,
          observacoes: `Saldo restante de compra na roça Ticket ${calculo.numero_ticket}`
        });
        localStorage.setItem('grupo_eno_financeiro_pagar_v1', JSON.stringify(titulosPagar));
        window.dispatchEvent(new Event('financeiro_updated'));
      } catch (err) {
        console.error(err);
      }
    }

    pedidos[pIndex] = pedido;
    salvarPedidosCompra(pedidos);
  }

  // Integra com o estoque de Matéria-Prima
  try {
    integrarEntradaMateriaPrima({
      descricaoItem: `Mandioca na Roça (${calculo.total_sacos} sacos - ${calculo.variedade_mandioca || 'Industrial'})`,
      quantidade: calculo.peso_total_kg,
      unidade: 'KG',
      valorTotal: calculo.valor_total_estimado,
      fornecedorNome: calculo.fornecedor_nome,
      fornecedorCpfCnpj: calculo.fornecedor_cpf_cnpj,
      numeroNF: `ROCA-${calculo.numero_ticket}`,
      data: calculo.data
    });
  } catch (err) {
    console.error('Erro ao integrar estoque de mandioca da roça:', err);
  }

  return {
    sucesso: true,
    mensagem: dadosPagamento.tipo === 'JA_PAGO'
      ? 'Pagamento registrado como PAGO no ato e lançado no caixa do Financeiro!'
      : 'Pagamento registrado como A PAGAR e incluído no Contas a Pagar do Financeiro!'
  };
}
