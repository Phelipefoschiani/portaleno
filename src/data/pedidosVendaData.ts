// Store e Definições de Pedidos de Venda do Grupo ENO
// Unifica o ciclo de vida comercial da fecularia:
// Orçamentos -> Em Produção -> A Faturar -> Faturados -> Entregues -> Relatórios

import { carregarEstoqueProdutos, ProdutoEstoque } from './produtosData';
import { integrarFaturamentoPedidoVenda } from './pipelineIntegrado';
import { gerarOrdensDoPedido, integrarProducaoDoPedido, encerrarOrdensDoPedido } from './ordensProducaoData';
import { obterClientesParaVenda, ClienteLookup } from './clientesData';
import { hojeISO, paraISO } from '../lib/datas';

export type EtapaPedidoVenda = 
  | 'ORCAMENTO' 
  | 'EM_PRODUCAO' 
  | 'A_FATURAR' 
  | 'FATURADO' 
  | 'ENTREGUE';

export interface ItemPedidoVenda {
  produto_id: string;
  produto_nome: string;
  tipo_embalagem: 'Saco 25kg' | 'Big Bag 1000kg' | 'Fardo 10x1kg' | 'Caixa' | 'Granel' | string;
  quantidade: number;
  quantidade_produzida?: number; // Qtd de embalagens (sacos/fardos) já finalizadas
  peso_unitario_kg: number;
  peso_total_kg: number;
  preco_unitario: number;
  subtotal: number;
  lote_producao?: string;
  unidades_por_fardo?: number; // Para conversão Fardo <-> Unitário
  comissao_percentual?: number;
  comissao_valor?: number;
  comissao_regra?: string;
}

export interface ApontamentoProducao {
  id: string;
  data: string;
  produto_id?: string;
  produto_nome?: string;
  tipo_embalagem?: string;
  quantidade_produzida_embalagens?: number;
  quantidade_produzida_kg: number;
  operador: string;
  lote?: string;
  observacao?: string;
}

export interface PedidoVenda {
  id: string;
  numero_pedido: string;
  tipo: 'ORCAMENTO' | 'PEDIDO_VENDA';
  etapa: EtapaPedidoVenda;
  // Cliente vinculado
  cliente_id: string;
  cliente_nome: string;
  cliente_cnpj_cpf: string;
  cliente_cidade_uf: string;
  cliente_limite_credito?: number;
  cliente_status_credito?: 'Liberado' | 'Em Análise' | 'Bloqueado';
  // RCA vinculado
  rca_id: string;
  rca_nome: string;
  comissao_percentual: number;
  comissao_valor: number;
  comissao_regra?: string; // regra aplicada (ver comissoesData.CamposComissaoPedido)
  comissao_itens?: any[]; // comissão calculada por item
  // Datas
  data_emissao: string; // YYYY-MM-DD
  data_validade_orcamento?: string; // YYYY-MM-DD
  data_previsao_entrega: string; // YYYY-MM-DD
  data_inicio_producao?: string;
  data_conclusao_producao?: string;
  data_faturamento?: string;
  data_entrega_realizada?: string;
  // Produção Industrial e Lote
  lote_producao?: string;
  data_fabricacao?: string;
  data_vencimento?: string;
  apontamentos_producao?: ApontamentoProducao[];
  quantidade_produzida_acumulada_kg?: number;
  // Itens & Valores
  itens: ItemPedidoVenda[];
  peso_total_kg: number;
  valor_total: number;
  // Saldo a faturar vs faturado
  valor_faturado?: number;
  saldo_a_faturar?: number;
  // Condições Comerciais
  forma_pagamento: string;
  prazo_pagamento: string;
  tipo_frete: 'FOB (Retira na Fábrica)' | 'CIF (Entrega Grupo ENO)';
  transportadora?: string;
  placa_veiculo?: string;
  motorista_nome?: string;
  // Programação e Comprovante de Entrega
  programacao_entrega?: {
    data_programada: string;
    transportadora: string;
    motorista: string;
    telefone_motorista?: string;
    placa: string;
    status_rota: 'AGUARDANDO_COLETA' | 'EM_TRANSITO' | 'ENTREGUE';
    recebedor_nome?: string;
    recebedor_documento?: string;
    data_hora_entrega?: string;
  };
  // Dados Fiscais (Importação e Guarda de NF externa - sem conexão SEFAZ)
  nota_fiscal?: {
    numero: string;
    serie: string;
    chave_acesso: string;
    data_emissao: string;
    xml_importado?: boolean;
    nome_arquivo_xml?: string;
    arquivo_anexado?: string;
    tipo_arquivo?: 'XML' | 'PDF';
    valor_nota?: number;
    observacao_fiscal?: string;
    arquivo_conteudo?: string;
    protocolo?: string; // protocolo de autorização da SEFAZ (lido do XML)
    peso_liquido_kg?: number; // pesos dos volumes da nota
    peso_bruto_kg?: number;
  };
  observacoes?: string;
  /**
   * Quem gerou o pedido:
   * - 'Venda Direta': admin sem RCA
   * - 'Admin': admin lançou com RCA vinculado
   * - 'RCA': feito pelo próprio RCA no portal dele
   * - 'Portal do Cliente' / 'Portal Portfólio VIP': portais
   * - 'Sugestão Reposição': Pedido Sugestivo
   */
  origem: 'Venda Direta' | 'Admin' | 'RCA' | 'Portal Portfólio VIP' | 'Sugestão Reposição' | 'Portal do Cliente';
  subtipo_venda?: 'Orçamento' | 'Pedido Sugestivo' | 'Pedido';
  modo_exibicao_padrao?: 'FARDO' | 'UNITARIO';
  tabela_id?: string;
  tabela_nome?: string;
  // Controles de integração (evitam lançar estoque/financeiro duas vezes)
  producao_integrada?: boolean;
  faturamento_integrado?: boolean;
}

// ============================================================
// CONVERSÃO FARDO/CAIXA <-> PACOTE
// item.quantidade está na embalagem de venda (fardo/caixa/saco); estoque_atual_sacos conta PACOTES.
// ============================================================

// Quantos pacotes vão em cada embalagem de venda do item (1 para saco/avulso)
export function unidadesPorEmbalagemItem(item: Pick<ItemPedidoVenda, 'unidades_por_fardo'>): number {
  const f = Number(item.unidades_por_fardo);
  return f > 0 ? f : 1;
}

// Pacotes correspondentes a uma quantidade de embalagens do item
export function pacotesDoItem(item: Pick<ItemPedidoVenda, 'quantidade' | 'unidades_por_fardo'>, quantidadeEmbalagens: number = item.quantidade): number {
  return (Number(quantidadeEmbalagens) || 0) * unidadesPorEmbalagemItem(item);
}

// Peso (kg) correspondente a uma quantidade de embalagens do item
export function pesoDoItemKg(
  item: Pick<ItemPedidoVenda, 'quantidade' | 'unidades_por_fardo' | 'peso_unitario_kg'>,
  quantidadeEmbalagens: number = item.quantidade
): number {
  return pacotesDoItem(item, quantidadeEmbalagens) * (Number(item.peso_unitario_kg) || 0);
}

// Limpa todo o estado de produção, faturamento e entrega (usado ao repetir pedido / voltar para orçamento)
export function limparEstadoProducaoFaturamento(pedido: PedidoVenda): PedidoVenda {
  return {
    ...pedido,
    data_inicio_producao: undefined,
    data_conclusao_producao: undefined,
    data_faturamento: undefined,
    data_entrega_realizada: undefined,
    lote_producao: undefined,
    data_fabricacao: undefined,
    data_vencimento: undefined,
    apontamentos_producao: [],
    quantidade_produzida_acumulada_kg: 0,
    valor_faturado: undefined,
    saldo_a_faturar: undefined,
    transportadora: undefined,
    placa_veiculo: undefined,
    motorista_nome: undefined,
    programacao_entrega: undefined,
    nota_fiscal: undefined,
    producao_integrada: undefined,
    faturamento_integrado: undefined,
    itens: pedido.itens.map(it => ({
      ...it,
      quantidade_produzida: undefined,
      lote_producao: undefined
    }))
  };
}


// Carrega os produtos de venda dinamicamente a partir do estoque e custos configurados
export function obterProdutosVendaDisponiveis() {
  if (typeof window !== 'undefined') {
    try {
      const modoLimpo = localStorage.getItem('grupo_eno_modo_limpo_v1') === 'true';
      const produtosEstoque = carregarEstoqueProdutos();
      if (produtosEstoque && produtosEstoque.length > 0) {
        return produtosEstoque.map(p => {
          // Embalagem do cadastro do produto (Fardo, Caixa...) e quantas unidades vão em cada uma
          const emb = (p.tipo_acondicionamento && p.tipo_acondicionamento !== 'Avulso' ? p.tipo_acondicionamento : p.tipo_embalagem) as any;
          const unidades = p.unidades_por_acondicionamento || 1;
          // O produto não tem preço próprio: o orçamento aplica o preço da tabela (precosData.calcularPrecoNaTabela)
          const precoAcond = 0;
          
          return {
            id: p.id,
            nome: p.nome,
            codigo: p.codigo,
            tipo_embalagem: emb,
            peso_unitario_kg: p.peso_unitario_kg,
            preco_unitario: precoAcond, // Preço da embalagem de expedição (fardo/caixa/saco)
            preco_unitario_avulso: 0, // Preço unitário do pacote individual (vem da tabela de preço)
            unidades_por_fardo: unidades,
            tipo_acondicionamento: p.tipo_acondicionamento || 'Caixa',
            categoria: p.categoria,
            custo_total: p.custo_total,
            receita_id: p.receita_id,
            receita_nome: p.receita_nome,
            custo_materia_prima: p.custo_materia_prima
          };
        });
      } else if (modoLimpo) {
        return [];
      }
    } catch (e) {
      // Fallback
    }
  }
  return [];
}

// Carrega os clientes dinamicamente a partir do store compartilhado (Cadastro de Clientes)
export function obterClientesDisponiveis(): ClienteLookup[] {
  if (typeof window === 'undefined') return [];
  return obterClientesParaVenda();
}


export const PEDIDOS_VENDA_INICIAIS: PedidoVenda[] = [];

// Helper para persistência reativa no browser (localStorage)
const STORAGE_KEY = 'grupo_eno_pedidos_venda_v1';

export function carregarPedidosVenda(): PedidoVenda[] {
  const modoLimpo = typeof window !== 'undefined' && localStorage.getItem('grupo_eno_modo_limpo_v1') === 'true';
  if (typeof window === 'undefined') return modoLimpo ? [] : PEDIDOS_VENDA_INICIAIS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      if (modoLimpo) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
        return [];
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(PEDIDOS_VENDA_INICIAIS));
      return PEDIDOS_VENDA_INICIAIS;
    }
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

export function salvarPedidosVenda(pedidos: PedidoVenda[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pedidos));
    // Dispara evento customizado para sincronizar abas e telas se estiverem montadas
    window.dispatchEvent(new Event('pedidos_venda_updated'));
  } catch (err) {
    console.error('Erro ao salvar pedidos no localStorage:', err);
  }
}

export function moverPedidoEtapa(
  pedidoId: string, 
  novaEtapa: EtapaPedidoVenda, 
  dadosExtras?: Partial<PedidoVenda>
): PedidoVenda[] {
  const atuais = carregarPedidosVenda();
  const dataHoje = hojeISO();

  const atualizados = atuais.map(p => {
    if (p.id === pedidoId) {
      // Saindo de orçamento para produção: nenhum resquício de produção/faturamento anterior
      const base = p.etapa === 'ORCAMENTO' && novaEtapa === 'EM_PRODUCAO' ? limparEstadoProducaoFaturamento(p) : p;
      const updated: PedidoVenda = {
        ...base,
        etapa: novaEtapa,
        ...dadosExtras
      };
      // Datas sempre gravadas como AAAA-MM-DD
      if (updated.data_faturamento) updated.data_faturamento = paraISO(updated.data_faturamento) || dataHoje;
      if (updated.nota_fiscal?.data_emissao) {
        updated.nota_fiscal = { ...updated.nota_fiscal, data_emissao: paraISO(updated.nota_fiscal.data_emissao) || dataHoje };
      }

      if (novaEtapa === 'EM_PRODUCAO') {
        updated.tipo = 'PEDIDO_VENDA';
        // O número é gerado ao criar o pedido (ano-RCA-cliente-sequência); só cria um se faltar
        if (!updated.numero_pedido) {
          updated.numero_pedido = `PED-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        }
        if (!updated.data_inicio_producao) updated.data_inicio_producao = dataHoje;
        // Inicializa quantidade_produzida em cada item se ainda não estiver definida
        updated.itens = updated.itens.map(it => ({
          ...it,
          quantidade_produzida: it.quantidade_produzida ?? 0
        }));
      } else if (novaEtapa === 'A_FATURAR') {
        if (!updated.data_conclusao_producao) updated.data_conclusao_producao = dataHoje;
        // Integração: conclui as Ordens de Produção do pedido (entrada de produto + baixa de MP, uma vez por OP)
        // e integra pelo modo legado apenas itens sem OP
        try {
          if (!updated.producao_integrada) {
            integrarProducaoDoPedido(updated);
            updated.producao_integrada = true;
          }
        } catch (e) {
          console.error('Erro na integração de produção:', e);
        }
      } else if (novaEtapa === 'FATURADO') {
        if (!updated.data_faturamento) updated.data_faturamento = dataHoje;
        if (!updated.nota_fiscal) {
          updated.nota_fiscal = {
            numero: updated.numero_pedido.replace(/\D/g, ''),
            serie: '1',
            chave_acesso: '',
            data_emissao: updated.data_faturamento
          };
        }
        // Integração: baixa estoque de produto vendido, gera Título a Receber e NF-e de Saída
        try {
          if (!updated.faturamento_integrado) {
            integrarFaturamentoPedidoVenda(updated);
            updated.faturamento_integrado = true;
          }
        } catch (e) {
          console.error('Erro na integração de faturamento:', e);
        }
      } else if (novaEtapa === 'ENTREGUE') {
        if (!updated.data_entrega_realizada) {
          updated.data_entrega_realizada = `${dataHoje} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        }
      }

      return updated;
    }
    return p;
  });

  salvarPedidosVenda(atualizados);

  // Ordens de Produção acompanham a etapa do pedido
  try {
    const anterior = atuais.find(p => p.id === pedidoId);
    const pedidoAtualizado = atualizados.find(p => p.id === pedidoId);
    if (pedidoAtualizado && novaEtapa === 'EM_PRODUCAO') {
      gerarOrdensDoPedido(pedidoAtualizado, { novoCiclo: anterior?.etapa === 'ORCAMENTO' });
    } else if (novaEtapa === 'ORCAMENTO') {
      encerrarOrdensDoPedido(pedidoId);
    }
  } catch (e) {
    console.error('Erro ao gerar ordens de produção do pedido:', e);
  }
  return atualizados;
}
