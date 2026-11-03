// Persistência compartilhada dos cadastros (agricultores, fornecedores, RCAs, equipe de produção,
// cadastros provisórios do portfólio e pedidos do portfólio).
// Todas as telas que listam esses cadastros devem ler daqui, nunca de constantes fixas.

import type { Agricultor, Fornecedor } from './mockStore';
import type { CadastroProvisorio, PedidoPortifolio } from './portfolioData';
import type { Cliente } from './clientesData';
import type { PedidoVenda } from './pedidosVendaData';
import { carregarTitulosPagar, statusEfetivoPagar } from './financeiroData';

export const EVENTO_CADASTROS_ATUALIZADOS = 'cadastros_updated';

const STORAGE_KEY_AGRICULTORES = 'grupo_eno_agricultores_v1';
const STORAGE_KEY_FORNECEDORES = 'grupo_eno_fornecedores_v1';
const STORAGE_KEY_RCAS = 'grupo_eno_rcas_v1';
const STORAGE_KEY_VENDAS_RCA = 'grupo_eno_vendas_rca_v1';
const STORAGE_KEY_COLABORADORES_PRODUCAO = 'grupo_eno_colaboradores_producao_v1';
const STORAGE_KEY_CADASTROS_PROVISORIOS = 'grupo_eno_cadastros_provisorios_v1';
const STORAGE_KEY_PEDIDOS_PORTFOLIO = 'grupo_eno_pedidos_portfolio_v1';

function lerLista<T>(chave: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(chave);
    if (!raw) return [];
    const lista = JSON.parse(raw);
    return Array.isArray(lista) ? lista : [];
  } catch (e) {
    return [];
  }
}

function gravarLista<T>(chave: string, lista: T[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(chave, JSON.stringify(lista));
  window.dispatchEvent(new Event(EVENTO_CADASTROS_ATUALIZADOS));
}

// =====================================================================
// AGRICULTORES E FORNECEDORES (assinaturas usadas por outros módulos)
// =====================================================================

export function carregarAgricultores(): Agricultor[] {
  return lerLista<Agricultor>(STORAGE_KEY_AGRICULTORES);
}

export function salvarAgricultores(lista: Agricultor[]): void {
  gravarLista(STORAGE_KEY_AGRICULTORES, lista);
}

export function carregarFornecedores(): Fornecedor[] {
  return lerLista<Fornecedor>(STORAGE_KEY_FORNECEDORES);
}

export function salvarFornecedores(lista: Fornecedor[]): void {
  gravarLista(STORAGE_KEY_FORNECEDORES, lista);
}

// =====================================================================
// QUEM FORNECE CADA MATÉRIA-PRIMA
// Mandioca (Raiz In Natura) vem dos Agricultores; as demais, dos Fornecedores
// que têm a matéria-prima vinculada. Sem vínculo = "Sem fornecedor".
// =====================================================================

export const SEM_FORNECEDOR = 'Sem fornecedor';

interface MateriaPrimaRef {
  id: string;
  nome: string;
  codigo?: string;
  categoria?: string;
  unidade_medida?: string;
}

const itensFornecidos = (f: Fornecedor): any[] => {
  const lista = (f as any).produtos_fornecidos;
  return Array.isArray(lista) ? lista : [];
};

export const ehMandioca = (mp: MateriaPrimaRef) => mp.categoria === 'Raiz In Natura';

/** Fornecedores cadastrados que têm esta matéria-prima vinculada. */
export function fornecedoresDaMateriaPrima(mp: MateriaPrimaRef): Fornecedor[] {
  return carregarFornecedores().filter(f => f.ativo !== false && itensFornecidos(f).some(i => String(i.materia_prima_id) === String(mp.id)));
}

/** Texto de origem exibido na lista de matérias-primas. */
export function origemDaMateriaPrima(mp: MateriaPrimaRef): { texto: string; semFornecedor: boolean } {
  if (ehMandioca(mp)) {
    const qtd = carregarAgricultores().filter(a => a.ativo !== false).length;
    return { texto: qtd > 0 ? `Agricultores (${qtd})` : 'Agricultores (nenhum cadastrado)', semFornecedor: qtd === 0 };
  }
  const nomes = fornecedoresDaMateriaPrima(mp).map(f => f.fantasia || f.razao_nome);
  if (nomes.length > 0) return { texto: nomes.join(', '), semFornecedor: false };
  return { texto: SEM_FORNECEDOR, semFornecedor: true };
}

/**
 * Define o fornecedor de uma matéria-prima (grava o vínculo no cadastro do fornecedor).
 * fornecedorId vazio = "Sem fornecedor" (remove os vínculos existentes).
 */
export function definirFornecedorDaMateriaPrima(mp: MateriaPrimaRef, fornecedorId: string): void {
  const lista = carregarFornecedores().map(f => {
    const itens = itensFornecidos(f);
    const tem = itens.some(i => String(i.materia_prima_id) === String(mp.id));
    if (f.id === fornecedorId) {
      if (tem) return f;
      const novo = {
        id: `prod_${Date.now()}`,
        produto_id: mp.id,
        materia_prima_id: mp.id,
        codigo_referencia: mp.codigo,
        codigo_materia_prima: mp.codigo,
        nome: mp.nome,
        unidade: mp.unidade_medida || '',
        categoria: mp.categoria === 'Embalagens' ? 'Embalagens' : 'Matéria-Prima',
        integrado_materia_prima: true
      };
      return { ...f, produtos_fornecidos: [...itens, novo] } as Fornecedor;
    }
    if (tem) {
      return { ...f, produtos_fornecidos: itens.filter(i => String(i.materia_prima_id) !== String(mp.id)) } as Fornecedor;
    }
    return f;
  });
  salvarFornecedores(lista);
}

// Compras de mandioca: a única fonte é o Cálculo na Roça (calculoRocaData.ts).
// O antigo romaneio manual ('grupo_eno_romaneios_mandioca_v1') foi descontinuado.

// =====================================================================
// RCAs (Representantes Comerciais) e vendas/comissões
// =====================================================================

/**
 * 'geral' = Pela venda (% sobre o total); 'por_produto' = % por produto (produto sem regra usa o padrão).
 * 'por_grupo' | 'por_cliente' | 'misto' continuam como modelos avançados.
 */
export type ModeloComissao = 'geral' | 'por_produto' | 'por_grupo' | 'por_cliente' | 'misto';

export interface ComissaoProduto {
  produto_id: string;
  produto_nome: string;
  percentual: number;
}

export interface ComissaoGrupo {
  id: string;
  grupo_id: string;
  grupo_nome: string;
  percentual: number;
}

export interface ComissaoCliente {
  id: string;
  cliente_id: string;
  cliente_nome: string;
  cliente_cidade?: string;
  percentual: number;
}

export interface RCA {
  id: string;
  empresa_id: string;
  codigo_rca: string;
  tipo_pessoa: 'PF' | 'PJ';
  nome_completo: string;
  nome_fantasia?: string;
  cpf_cnpj: string;
  rg_ie?: string;
  telefone: string;
  whatsapp?: string;
  email: string;
  endereco: {
    cep: string;
    logradouro: string;
    numero: string;
    bairro: string;
    municipio: string;
    uf: string;
    complemento?: string;
  };
  regiao_atuacao: string;
  estados_atuacao: string[];
  cidades_principais?: string;
  tabela_preco_padrao_id?: string;
  tabela_preco_padrao_nome?: string;
  modelo_comissao: ModeloComissao;
  comissao_padrao_percentual: number;
  comissoes_por_grupo: ComissaoGrupo[];
  comissoes_por_cliente: ComissaoCliente[];
  /** Usado quando modelo_comissao === 'por_produto' */
  comissoes_por_produto?: ComissaoProduto[];
  chave_pix: string;
  tipo_chave_pix: 'CPF' | 'CNPJ' | 'Celular' | 'E-mail' | 'Aleatória';
  /** Dia do mês seguinte ao faturamento em que a comissão vence no Contas a Pagar (padrão 10) */
  dia_vencimento_comissao?: number;
  titular_pix?: string;
  banco_nome?: string;
  agencia?: string;
  conta?: string;
  observacoes_financeiras?: string;
  /** Espelho do vínculo; a fonte da verdade é Cliente.vendedor_id === RCA.id */
  clientes_vinculados_ids: string[];
  status: 'Ativo' | 'Inativo' | 'Em Férias';
  data_admissao_contrato: string;
  observacoes?: string;
  criado_em: string;
}

export interface VendaComissaoRCA {
  id: string;
  rca_id: string;
  numero_pedido: string;
  cliente_id: string;
  cliente_nome: string;
  cliente_cidade: string;
  grupo_produto_nome?: string;
  tipo_regra_aplicada: 'Por Cliente' | 'Por Grupo' | 'Por Produto' | 'Taxa Geral' | 'Mista';
  data: string;
  mes_referencia: string;
  valor_faturado: number;
  percentual_comissao: number;
  valor_comissao: number;
  status_comissao: 'Pago (PIX)' | 'Liberado' | 'Pendente';
  data_pagamento_pix?: string;
  pedido_id?: string;
  /** Título no Contas a Pagar (comissão vira conta a pagar ao faturar) */
  titulo_pagar_id?: string;
  titulo_status?: 'A_PAGAR' | 'PAGO' | 'VENCIDO';
  titulo_vencimento?: string;
}

export function carregarRcas(): RCA[] {
  return lerLista<RCA>(STORAGE_KEY_RCAS);
}

export function salvarRcas(lista: RCA[]): void {
  gravarLista(STORAGE_KEY_RCAS, lista);
}

export function obterRcaPorId(id?: string | null): RCA | undefined {
  if (!id) return undefined;
  return carregarRcas().find(r => r.id === id);
}

/**
 * Mantém o espelho RCA.clientes_vinculados_ids coerente com Cliente.vendedor_id (fonte da verdade):
 * o cliente fica só na carteira do RCA informado (ou de nenhum, se rcaId vazio).
 */
export function sincronizarEspelhoClienteRca(clienteId: string, rcaId?: string | null): void {
  if (!clienteId) return;
  const rcas = carregarRcas();
  let alterou = false;
  const atualizados = rcas.map(r => {
    const ids = r.clientes_vinculados_ids || [];
    const tem = ids.includes(clienteId);
    if (r.id === rcaId && !tem) {
      alterou = true;
      return { ...r, clientes_vinculados_ids: [...ids, clienteId] };
    }
    if (r.id !== rcaId && tem) {
      alterou = true;
      return { ...r, clientes_vinculados_ids: ids.filter(id => id !== clienteId) };
    }
    return r;
  });
  if (alterou) salvarRcas(atualizados);
}

/** Lista simplificada de RCAs para selects (id real do cadastro). */
export function obterRcasLookup(): { id: string; nome: string; regiao: string; telefone: string; comissao: number; ativo: boolean }[] {
  return carregarRcas().map(r => ({
    id: r.id,
    nome: r.nome_fantasia || r.nome_completo,
    regiao: r.regiao_atuacao || '',
    telefone: r.whatsapp || r.telefone || '',
    comissao: Number(r.comissao_padrao_percentual) || 0,
    ativo: r.status !== 'Inativo',
  }));
}

export function carregarVendasRca(): VendaComissaoRCA[] {
  return lerLista<VendaComissaoRCA>(STORAGE_KEY_VENDAS_RCA);
}

export function salvarVendasRca(lista: VendaComissaoRCA[]): void {
  gravarLista(STORAGE_KEY_VENDAS_RCA, lista);
}

const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
function mesRef(dataISO: string): string {
  const m = String(dataISO || '').match(/^(\d{4})-(\d{2})/);
  if (!m) return '';
  return `${MESES_ABREV[Number(m[2]) - 1]}/${m[1].slice(-2)}`;
}

/**
 * Comissões do RCA a partir dos pedidos de venda reais faturados/entregues (rca_id do pedido).
 * Status real vem do título de comissão no Contas a Pagar ('pag_com_<pedidoId>'):
 * PAGO → 'Pago (PIX)'; em aberto → 'Liberado'. Sem título (faturado antes da regra) usa o status
 * legado gravado em 'grupo_eno_vendas_rca_v1' (mesmo id).
 */
export function montarVendasComissaoRca(pedidos: PedidoVenda[], vendasSalvas: VendaComissaoRCA[] = carregarVendasRca()): VendaComissaoRCA[] {
  const salvasPorId = new Map(vendasSalvas.map(v => [v.id, v]));
  const titulos = new Map(
    carregarTitulosPagar().filter(t => String(t.id).startsWith('pag_com_')).map(t => [t.id, t])
  );
  const derivadas: VendaComissaoRCA[] = pedidos
    .filter(p => p.rca_id && p.tipo === 'PEDIDO_VENDA' && (p.etapa === 'FATURADO' || p.etapa === 'ENTREGUE'))
    .map(p => {
      const id = `vrca_${p.id}`;
      const salva = salvasPorId.get(id);
      const titulo = titulos.get(`pag_com_${p.id}`);
      const data = p.data_faturamento || p.data_emissao;
      const valorFaturado = Number(p.valor_faturado) || Number(p.nota_fiscal?.valor_nota) || Number(p.valor_total) || 0;
      const total = Number(p.valor_total) || 0;
      const regraPedido = (p as PedidoVenda & { comissao_regra?: string }).comissao_regra;
      const regra: VendaComissaoRCA['tipo_regra_aplicada'] =
        regraPedido === 'Por Cliente' || regraPedido === 'Por Grupo' || regraPedido === 'Por Produto' || regraPedido === 'Mista' ? regraPedido : 'Taxa Geral';
      const percentual = total > 0 && Number(p.comissao_valor) > 0
        ? Math.round(((Number(p.comissao_valor) / total) * 100) * 100) / 100
        : Number(p.comissao_percentual) || 0;
      const valorComissao = titulo ? Number(titulo.valor) || 0 : Math.round(valorFaturado * percentual) / 100;
      const statusTitulo = titulo ? statusEfetivoPagar(titulo) : undefined;
      const itensComissao = (p as PedidoVenda & { comissao_itens?: { grupo?: string }[] }).comissao_itens || [];
      const grupos = Array.from(new Set(itensComissao.map(i => i.grupo || '').filter(Boolean)));
      return {
        id,
        rca_id: p.rca_id,
        pedido_id: p.id,
        numero_pedido: p.numero_pedido,
        cliente_id: p.cliente_id,
        cliente_nome: p.cliente_nome,
        cliente_cidade: p.cliente_cidade_uf,
        grupo_produto_nome: grupos.length > 0 ? grupos.join(', ') : (p.itens || []).map(i => i.produto_nome).join(', '),
        tipo_regra_aplicada: regra,
        data,
        mes_referencia: mesRef(data),
        valor_faturado: valorFaturado,
        percentual_comissao: percentual,
        valor_comissao: valorComissao,
        status_comissao: titulo
          ? (titulo.status === 'PAGO' ? 'Pago (PIX)' : 'Liberado')
          : (salva?.status_comissao || 'Liberado'),
        data_pagamento_pix: titulo ? titulo.data_pagamento : salva?.data_pagamento_pix,
        titulo_pagar_id: titulo?.id,
        titulo_status: statusTitulo,
        titulo_vencimento: titulo?.data_vencimento,
      };
    });
  const idsDerivados = new Set(derivadas.map(v => v.id));
  return [...derivadas, ...vendasSalvas.filter(v => !idsDerivados.has(v.id))];
}

/** Cliente vinculado à carteira do RCA (visão consolidada de cliente + pedidos). */
export interface ClienteVinculado {
  id: string;
  razao_social: string;
  nome_fantasia?: string;
  cpf_cnpj: string;
  municipio: string;
  uf: string;
  telefone: string;
  email: string;
  tabela_preco_nome: string;
  forma_pagamento_nome: string;
  prazo_pagamento_nome: string;
  status: 'Ativo' | 'Inativo';
  vendedor_id?: string;
  qtd_compras: number;
  valor_total_compras: number;
  ticket_medio: number;
  ultima_compra_data: string;
  ultima_compra_valor: number;
  ultima_compra_pedido: string;
}

/** Monta a visão de clientes (com estatísticas de pedidos reais) a partir dos cadastros. */
export function montarClientesVinculados(clientes: Cliente[], pedidos: PedidoVenda[]): ClienteVinculado[] {
  return clientes.map(c => {
    const doCliente = pedidos
      .filter(p => p.cliente_id === c.id && p.tipo === 'PEDIDO_VENDA')
      .sort((a, b) => String(b.data_emissao).localeCompare(String(a.data_emissao)));
    const total = doCliente.reduce((acc, p) => acc + (Number(p.valor_total) || 0), 0);
    const ultima = doCliente[0];
    return {
      id: c.id,
      razao_social: c.razao_nome || c.fantasia || 'Cliente sem nome',
      nome_fantasia: c.fantasia,
      cpf_cnpj: c.cpf_cnpj || '',
      municipio: c.endereco?.municipio || '',
      uf: c.endereco?.uf || '',
      telefone: c.telefone || '',
      email: c.email || '',
      tabela_preco_nome: c.tabela_preco_nome || '-',
      forma_pagamento_nome: c.forma_pagamento_nome || '-',
      prazo_pagamento_nome: c.prazo_pagamento_nome || '-',
      status: c.ativo ? 'Ativo' : 'Inativo',
      vendedor_id: c.vendedor_id,
      qtd_compras: doCliente.length,
      valor_total_compras: total,
      ticket_medio: doCliente.length ? total / doCliente.length : 0,
      ultima_compra_data: ultima?.data_emissao || '',
      ultima_compra_valor: ultima ? Number(ultima.valor_total) || 0 : 0,
      ultima_compra_pedido: ultima?.numero_pedido || '',
    };
  });
}

// =====================================================================
// EQUIPE DE PRODUÇÃO
// =====================================================================

export interface ColaboradorProducao {
  id: string;
  matricula: string;
  nome_completo: string;
  cargo: string;
  setor: string;
  cpf: string;
  telefone: string;
  status: 'ATIVO' | 'INATIVO' | 'FERIAS';
  observacoes?: string;
}

export function carregarColaboradoresProducao(): ColaboradorProducao[] {
  return lerLista<ColaboradorProducao>(STORAGE_KEY_COLABORADORES_PRODUCAO);
}

export function salvarColaboradoresProducao(lista: ColaboradorProducao[]): void {
  gravarLista(STORAGE_KEY_COLABORADORES_PRODUCAO, lista);
}

// =====================================================================
// CADASTROS PROVISÓRIOS (PORTFÓLIO VIP) E SEUS PEDIDOS
// =====================================================================

export function carregarCadastrosProvisorios(): CadastroProvisorio[] {
  return lerLista<CadastroProvisorio>(STORAGE_KEY_CADASTROS_PROVISORIOS);
}

export function salvarCadastrosProvisorios(lista: CadastroProvisorio[]): void {
  gravarLista(STORAGE_KEY_CADASTROS_PROVISORIOS, lista);
}

export function obterCadastroProvisorioPorId(id?: string | null): CadastroProvisorio | undefined {
  if (!id) return undefined;
  return carregarCadastrosProvisorios().find(c => c.id === id);
}

export function carregarPedidosPortfolio(): PedidoPortifolio[] {
  return lerLista<PedidoPortifolio>(STORAGE_KEY_PEDIDOS_PORTFOLIO);
}

export function salvarPedidosPortfolio(lista: PedidoPortifolio[]): void {
  gravarLista(STORAGE_KEY_PEDIDOS_PORTFOLIO, lista);
}

/** Grava um pedido transmitido pelo convidado e atualiza o histórico do cadastro provisório. */
export function registrarPedidoPortfolio(pedido: PedidoPortifolio): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_PEDIDOS_PORTFOLIO, JSON.stringify([pedido, ...carregarPedidosPortfolio()]));
  const cadastros = carregarCadastrosProvisorios().map(c =>
    c.id === pedido.cadastro_provisorio_id
      ? { ...c, pedidos_realizados: [pedido, ...(c.pedidos_realizados || [])] }
      : c
  );
  gravarLista(STORAGE_KEY_CADASTROS_PROVISORIOS, cadastros);
}
