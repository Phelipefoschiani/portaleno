// Store e Definições de Pedidos de Venda do Grupo ENO
// Unifica o ciclo de vida comercial da fecularia:
// Orçamentos -> Em Produção -> A Faturar -> Faturados -> Entregues -> Relatórios

import { carregarEstoqueProdutos, ProdutoEstoque } from './produtosData';
import { integrarConclusaoProducao, integrarFaturamentoPedidoVenda } from './pipelineIntegrado';
import { obterClientesParaVenda, ClienteLookup } from './clientesData';

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
  };
  observacoes?: string;
  origem: 'Venda Direta' | 'RCA' | 'Portal Portfólio VIP' | 'Sugestão Reposição';
  subtipo_venda?: 'Orçamento' | 'Pedido Sugestivo' | 'Pedido';
  modo_exibicao_padrao?: 'FARDO' | 'UNITARIO';
}

export const PRODUTOS_VENDA_DISPONIVEIS: any[] = [];

// Carrega os produtos de venda dinamicamente a partir do estoque e custos configurados
export function obterProdutosVendaDisponiveis() {
  if (typeof window !== 'undefined') {
    try {
      const modoLimpo = localStorage.getItem('grupo_eno_modo_limpo_v1') === 'true';
      const produtosEstoque = carregarEstoqueProdutos();
      if (produtosEstoque && produtosEstoque.length > 0) {
        return produtosEstoque.map(p => {
          const emb = (p.tipo_acondicionamento === 'Caixa' ? 'Caixa' : p.tipo_acondicionamento === 'Fardo' ? 'Fardo 10x1kg' : p.tipo_embalagem) as any;
          const unidades = p.unidades_por_acondicionamento || (p.tipo_acondicionamento === 'Fardo' ? 10 : p.tipo_acondicionamento === 'Caixa' ? 10 : 1);
          // Preço do fardo ou caixa fechada:
          const precoAcond = p.preco_venda_acondicionamento || (p.preco_unitario_venda * unidades);
          
          return {
            id: p.id,
            nome: p.nome,
            codigo: p.codigo,
            tipo_embalagem: emb,
            peso_unitario_kg: p.peso_unitario_kg,
            preco_unitario: precoAcond, // Preço da embalagem de expedição (fardo/caixa/saco)
            preco_unitario_avulso: p.preco_unitario_venda, // Preço unitário do pacote individual
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
  return PRODUTOS_VENDA_DISPONIVEIS;
}

// Carrega os clientes dinamicamente a partir do store compartilhado
export function obterClientesDisponiveis(): ClienteLookup[] {
  if (typeof window !== 'undefined') {
    const clientes = obterClientesParaVenda();
    if (clientes.length > 0) return clientes;
    const modoLimpo = localStorage.getItem('grupo_eno_modo_limpo_v1') === 'true';
    if (modoLimpo) return [];
  }
  return CLIENTES_LOOKUP;
}

export const CLIENTES_LOOKUP: any[] = [];

export const RCAS_LOOKUP = [
  { id: 'rca_001', nome: 'Marcos Vinicius Silveira', regiao: 'SP Interior / Campinas' },
  { id: 'rca_002', nome: 'Aline de Cássia Nogueira', regiao: 'Grande SP e Litoral' },
  { id: 'rca_003', nome: 'Ricardo Antunes Fagundes', regiao: 'Norte do Paraná / MG' },
  { id: 'rca_004', nome: 'Diretoria Comercial Grupo ENO', regiao: 'Contas Nacionais / Grandes Indústrias' }
];

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
  const dataHoje = new Date().toISOString().split('T')[0];

  const atualizados = atuais.map(p => {
    if (p.id === pedidoId) {
      const updated: PedidoVenda = {
        ...p,
        etapa: novaEtapa,
        ...dadosExtras
      };

      if (novaEtapa === 'EM_PRODUCAO') {
        updated.tipo = 'PEDIDO_VENDA';
        if (!updated.numero_pedido.startsWith('PED-')) {
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
        // Integração: baixa matérias-primas e alimenta estoque de produto acabado
        try {
          integrarConclusaoProducao(updated);
        } catch (e) {
          console.error('Erro na integração de produção:', e);
        }
      } else if (novaEtapa === 'FATURADO') {
        if (!updated.data_faturamento) updated.data_faturamento = dataHoje;
        if (!updated.nota_fiscal) {
          const numNf = Math.floor(4890 + Math.random() * 50);
          updated.nota_fiscal = {
            numero: `00${numNf}`,
            serie: '1',
            chave_acesso: `412603${p.cliente_cnpj_cpf.replace(/\D/g, '').padEnd(14, '0')}5500100000${numNf}10${numNf}9944`,
            data_emissao: `${dataHoje.split('-').reverse().join('/')} 10:30`
          };
        }
        // Integração: baixa estoque de produto vendido, gera Título a Receber e NF-e de Saída
        try {
          integrarFaturamentoPedidoVenda(updated);
        } catch (e) {
          console.error('Erro na integração de faturamento:', e);
        }
      } else if (novaEtapa === 'ENTREGUE') {
        if (!updated.data_entrega_realizada) {
          updated.data_entrega_realizada = `${dataHoje.split('-').reverse().join('/')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        }
      }

      return updated;
    }
    return p;
  });

  salvarPedidosVenda(atualizados);
  return atualizados;
}
