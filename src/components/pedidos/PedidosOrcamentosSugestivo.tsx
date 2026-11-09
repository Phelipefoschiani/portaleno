import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CampoNumero } from '../ui/CampoNumero';
import html2canvas from 'html2canvas-pro';
import { gerarPdfDeElemento } from '../../lib/pdfDeElemento';
import { FaixaMarcaEno } from '../FaixaMarcaEno';
import { EMPRESA } from '../../lib/empresa';
import {
  FileText,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  Building2,
  User,
  Package,
  Calendar,
  DollarSign,
  AlertCircle,
  Eye,
  Trash2,
  Printer,
  Sparkles,
  X,
  Save,
  Check,
  Download,
  Image as ImageIcon,
  FileSpreadsheet,
  Share2,
  FileDown,
  Layers,
  ArrowLeftRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Pencil
} from 'lucide-react';
import { numeroPedidoNovo, codigoDoCliente, aplicarCodigosNoArmazenamento } from '../../lib/codigos';
import { FORMAS_PAGAMENTO, lerCondicao, normalizarDias, textoCondicao } from '../../lib/prazoPagamento';
import {
  PedidoVenda,
  carregarPedidosVenda,
  salvarPedidosVenda,
  moverPedidoEtapa,
  obterProdutosVendaDisponiveis,
  obterClientesDisponiveis,
  pesoDoItemKg
} from '../../data/pedidosVendaData';
import {
  carregarTabelasPreco,
  TabelaPreco,
  verificarDisponibilidadeProduto
} from '../../data/produtosData';
import { obterRcasLookup, obterRcaPorId, EVENTO_CADASTROS_ATUALIZADOS } from '../../data/cadastrosData';
import { calcularPrecoNaTabela, mostrarPrecoDaTabela, precoUnitarioNaTabela, tabelaPrecoAtiva } from '../../data/precosData';
import { calcularComissaoPedido, CamposComissaoPedido, removerTituloComissaoDoPedido, rotuloRegraComissao } from '../../data/comissoesData';
import { formatarMoeda } from '../../data/financeiroData';
import { carregarClientes } from '../../data/clientesData';
import { hojeISO, somarDias, formatarDataBR } from '../../lib/datas';

// Tabela utilizável na venda: não arquivada e dentro da vigência
const tabelaPrecoUtilizavel = (t: TabelaPreco): boolean => tabelaPrecoAtiva(t);

// Produto de venda (obterProdutosVendaDisponiveis) com o preço da tabela pela regra única (precosData)
function aplicarPrecoDaTabela<P extends { id: string; preco_unitario: number; preco_unitario_avulso?: number; custo_total?: number; tipo_acondicionamento?: string; unidades_por_fardo?: number }>(
  p: P,
  tab: TabelaPreco
): P {
  const calc = calcularPrecoNaTabela({
    id: p.id,
    custo_total: p.custo_total,
    tipo_acondicionamento: p.tipo_acondicionamento,
    unidades_por_acondicionamento: p.unidades_por_fardo
  }, tab);
  return { ...p, preco_unitario: calc.preco_acondicionamento, preco_unitario_avulso: calc.preco };
}

// Produto é vendido na tabela só quando tem valor nela (em branco = não vendido)
const vendidoNaTabela = (produtoId: string, tab?: TabelaPreco | null) => !!tab && precoUnitarioNaTabela(tab, produtoId) > 0;

// "Mostrar preço" da tabela define como a venda é lançada: só caixa/fardo, só unitário, ou o vendedor escolhe (null)
const modoObrigatorioDaTabela = (tab?: TabelaPreco | null): 'FARDO' | 'UNITARIO' | null => {
  if (!tab) return null;
  const m = mostrarPrecoDaTabela(tab);
  return m === 'ACONDICIONAMENTO' ? 'FARDO' : m === 'UNITARIO' ? 'UNITARIO' : null;
};

// Fator de conversão fardo/caixa -> pacotes (1 quando vendido avulso/saco)
const fatorItem = (n?: number) => (Number(n) > 0 ? Number(n) : 1);

// Embalagem que o pedido usa: o acondicionamento do produto (Fardo, Caixa, Saco) quando existe
const tipoEmbalagemDoProduto = (p: any): string =>
  p && p.tipo_acondicionamento && p.tipo_acondicionamento !== 'Avulso' ? p.tipo_acondicionamento : p?.tipo_embalagem;

// Peso (kg) de um item do formulário: embalagens × pacotes por embalagem × peso do pacote
function pesoItemFormulario(it: { produtoId: string; quantidade: number; unidadesPorFardo?: number; modo?: string }, produtos: any[]): number {
  const prod = produtos.find(p => p.id === it.produtoId);
  if (!prod) return 0;
  const fator = it.modo === 'UNITARIO' ? 1 : fatorItem(it.unidadesPorFardo || prod.unidades_por_fardo);
  return (Number(it.quantidade) || 0) * fator * (Number(prod.peso_unitario_kg) || 0);
}
import { PedidosNavTabs } from './PedidosNavTabs';
import { CabecalhoPagina, BotaoPrimario, BotaoSecundario } from '../ui/CabecalhoPagina';
import { BarraFiltros, Segmentado, CampoBusca, SeletorFiltro } from '../ui/BarraFiltros';
import { TabelaDados, Th, Td, tabela } from '../ui/TabelaDados';
import { StatusChip } from '../ui/StatusChip';
import { EstadoVazio } from '../ui/EstadoVazio';
import { TOM_ETAPA_VENDA } from './etapaVenda';

interface Props {
  onNavigate?: (tabId: string) => void;
  /**
   * Portal do RCA: o RCA do pedido é sempre este; lista só os pedidos dele (todas as etapas, as
   * posteriores em leitura), clientes só da carteira dele, sem aprovar para produção, sem navegação
   * do admin e sem custo/receita interna.
   */
  rcaFixoId?: string;
  /**
   * Portal do Cliente: cliente fixo, RCA = vendedor do cliente (comissão continua calculada), tabela do
   * cliente travada, lista só os pedidos desse cliente; sem comissão, custos, estoque ou ações do admin.
   * O pedido entra como 'Pedido' na etapa ORCAMENTO (aguardando aprovação), origem 'Portal do Cliente'.
   */
  clienteFixoId?: string;
  /** Quando muda (> 0), abre o formulário de novo pedido (atalho do portal do RCA). */
  abrirNovoSinal?: number;
}

type FiltroEtapaRca = 'ORCAMENTO' | 'EM_PRODUCAO' | 'A_FATURAR' | 'FATURADO' | 'ENTREGUE' | 'TODAS';

// Peso legível: abaixo de 1 tonelada mostra em kg
const textoPeso = (kg: number) =>
  (Number(kg) || 0) >= 1000
    ? `${((Number(kg) || 0) / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} t`
    : `${(Number(kg) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg`;

const ROTULO_ETAPA: Record<PedidoVenda['etapa'], string> = {
  ORCAMENTO: 'Aguardando aprovação',
  EM_PRODUCAO: 'Em produção',
  A_FATURAR: 'A faturar',
  FATURADO: 'Faturado',
  ENTREGUE: 'Entregue',
};

const COR_ETAPA: Record<PedidoVenda['etapa'], string> = {
  ORCAMENTO: 'bg-amber-100 text-amber-900 border-amber-300',
  EM_PRODUCAO: 'bg-sky-100 text-sky-900 border-sky-300',
  A_FATURAR: 'bg-violet-100 text-violet-900 border-violet-300',
  FATURADO: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  ENTREGUE: 'bg-slate-200 text-slate-800 border-slate-300',
};

/** Origem efetiva: pedidos antigos do admin sem RCA foram gravados como 'RCA' por engano. */
const origemEfetiva = (p: PedidoVenda): string =>
  p.origem === 'RCA' && !p.rca_id ? 'Venda Direta' : (p.origem || 'Venda Direta');

const ROTULO_ORIGEM: Record<string, string> = {
  Admin: 'Admin (c/ RCA)',
  RCA: 'Portal do RCA',
};

export function PedidosOrcamentosSugestivo({ onNavigate, rcaFixoId, clienteFixoId, abrirNovoSinal }: Props) {
  const modoCliente = !!clienteFixoId;
  const modoRca = !!rcaFixoId && !modoCliente;
  // Portal (RCA ou Cliente): sem aprovação, sem navegação do admin, sem custos internos
  const modoPortal = modoRca || modoCliente;
  const abrirNovoRef = useRef<() => void>(() => {});
  abrirNovoRef.current = () => abrirNovaVenda(); // definido mais abaixo; chamado só depois do render
  useEffect(() => {
    if (abrirNovoSinal) abrirNovoRef.current();
  }, [abrirNovoSinal]);
  // Cliente abre no histórico completo; RCA abre nos que aguardam aprovação
  const [filtroEtapa, setFiltroEtapa] = useState<FiltroEtapaRca>(modoCliente ? 'TODAS' : 'ORCAMENTO');
  // Pedido do RCA só pode ser alterado/excluído enquanto aguarda aprovação (etapa ORCAMENTO) e se for dele
  // Cliente: só os pedidos dele que ainda aguardam aprovação
  const podeAlterar = (p: PedidoVenda) =>
    !modoPortal ||
    (p.etapa === 'ORCAMENTO' && (modoCliente ? p.cliente_id === clienteFixoId : p.rca_id === rcaFixoId));
  const [pedidos, setPedidos] = useState<PedidoVenda[]>([]);
  const [busca, setBusca] = useState('');
  const [filtroOrigem, setFiltroOrigem] = useState<string>('TODAS');
  const [filtroSubtipo, setFiltroSubtipo] = useState<'TODOS' | 'Orçamento' | 'Pedido Sugestivo' | 'Pedido'>('TODOS');

  // Modal Novo / Proposta Comercial
  const [modalNovo, setModalNovo] = useState(false);
  const [modalDetalhes, setModalDetalhes] = useState<PedidoVenda | null>(null);

  // Clientes e Produtos de venda carregados dinamicamente dos cadastros
  // Portal do RCA: só a carteira dele (vendedor_id) e só ele como RCA
  const clientesDoEscopo = () => {
    const todos = obterClientesDisponiveis();
    if (modoCliente) return todos.filter(c => c.id === clienteFixoId);
    return modoRca ? todos.filter(c => c.rca_id === rcaFixoId) : todos;
  };
  const rcasDoEscopo = () => {
    const todos = obterRcasLookup();
    // Portal do Cliente: só o representante (vendedor) do cliente
    if (modoCliente) {
      const cli = obterClientesDisponiveis().find(c => c.id === clienteFixoId);
      return cli?.rca_id ? todos.filter(r => r.id === cli.rca_id) : [];
    }
    // Admin: todos (o select mostra os ativos + o RCA já gravado no pedido, mesmo inativo)
    return modoRca ? todos.filter(r => r.id === rcaFixoId) : todos;
  };
  // Portal do Cliente: só a tabela de preço do cadastro do cliente
  const tabelasDoEscopo = () => {
    const ativas = carregarTabelasPreco().filter(tabelaPrecoUtilizavel);
    if (!modoCliente) return ativas;
    const cli = obterClientesDisponiveis().find(c => c.id === clienteFixoId);
    return cli?.tabela_preco_id ? ativas.filter(t => t.id === cli.tabela_preco_id) : [];
  };
  const [clientesDisponiveis, setClientesDisponiveis] = useState(() => clientesDoEscopo());
  const [produtosDisponiveis, setProdutosDisponiveis] = useState(() => obterProdutosVendaDisponiveis());
  const [tabelasDisponiveis, setTabelasDisponiveis] = useState(() => tabelasDoEscopo());
  const [rcasDisponiveis, setRcasDisponiveis] = useState(() => rcasDoEscopo());

  // Form State
  const [subtipoForm, setSubtipoForm] = useState<'Orçamento' | 'Pedido Sugestivo' | 'Pedido'>('Orçamento');
  const [modoLancamentoForm, setModoLancamentoForm] = useState<'FARDO' | 'UNITARIO'>('FARDO');
  const [clienteIdForm, setClienteIdForm] = useState(() => clientesDoEscopo()[0]?.id || '');
  const [tabelaIdForm, setTabelaIdForm] = useState('');
  const [rcaIdFormLivre, setRcaIdForm] = useState('');
  const rcaIdForm = modoRca ? (rcaFixoId || '') : modoCliente ? (rcasDisponiveis[0]?.id || '') : rcaIdFormLivre;
  const [tipoFreteForm, setTipoFreteForm] = useState<'FOB (Retira na Fábrica)' | 'CIF (Entrega Grupo ENO)'>('CIF (Entrega Grupo ENO)');
  // Condição de pagamento: forma + dias digitados (ex.: 28 ou 28/35/42)
  const [formaPagamentoForm, setFormaPagamentoForm] = useState(FORMAS_PAGAMENTO[0]);
  const [diasPagamentoForm, setDiasPagamentoForm] = useState('28');
  const prazoPagamentoForm = textoCondicao(formaPagamentoForm, diasPagamentoForm);
  const setPrazoPagamentoForm = (texto: string) => {
    const c = lerCondicao(texto);
    setFormaPagamentoForm(c.forma);
    setDiasPagamentoForm(c.dias);
  };
  // Pedido sendo editado (null = nova venda)
  const [pedidoEmEdicao, setPedidoEmEdicao] = useState<PedidoVenda | null>(null);
  const [diasValidadeForm, setDiasValidadeForm] = useState('7');
  const [observacoesForm, setObservacoesForm] = useState('');

  // Controle de visualização e exportação do documento
  const [tipoDocumentoVisualizacao, setTipoDocumentoVisualizacao] = useState<
    'Orçamento' | 'Pedido Sugestivo' | 'Pedido'
  >('Orçamento');
  const [modoExibicao, setModoExibicao] = useState<'FARDO' | 'UNITARIO'>('FARDO');
  // Documento com ou sem a foto dos produtos (escolha na barra de exportação)
  const [comFotoDoc, setComFotoDoc] = useState(false);
  const [zoomDocumento, setZoomDocumento] = useState<number>(100);
  const [gerandoExportacao, setGerandoExportacao] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Itens do Form
  const [itensForm, setItensForm] = useState<Array<{
    produtoId: string;
    tipoEmbalagem: 'Saco 25kg' | 'Big Bag 1000kg' | 'Fardo 10x1kg' | 'Caixa' | 'Granel' | string;
    quantidade: number;
    precoUnitario: number;
    unidadesPorFardo?: number;
    modo?: 'FARDO' | 'UNITARIO'; // cada item pode ser por caixa/fardo ou por unidade (conforme a tabela)
  }>>([]); // itens só entram depois de escolher a tabela de preço

  // Modo do item (caixa/fardo ou unidade); itens antigos seguem o modo geral do formulário
  const modoItem = (it: { modo?: 'FARDO' | 'UNITARIO' }) => it.modo || modoLancamentoForm;

  // Carregar pedidos, produtos e clientes
  const recarregar = () => {
    const todos = carregarPedidosVenda();
    // Admin: só a etapa de vendas (ORCAMENTO). RCA: todos os pedidos dele, em qualquer etapa.
    // Cliente: todos os pedidos dele, em qualquer etapa (nunca de outro cliente)
    setPedidos(
      modoCliente
        ? todos.filter(p => p.cliente_id === clienteFixoId)
        : modoRca
        ? todos.filter(p => p.rca_id === rcaFixoId)
        : todos.filter(p => p.etapa === 'ORCAMENTO')
    );
    const prods = obterProdutosVendaDisponiveis();
    const clis = clientesDoEscopo();
    const tabs = tabelasDoEscopo();
    setProdutosDisponiveis(prods);
    setClientesDisponiveis(clis);
    setTabelasDisponiveis(tabs);
    setRcasDisponiveis(rcasDoEscopo());
    if (clis.length > 0 && !clienteIdForm) {
      setClienteIdForm(clis[0].id);
    }
  };

  useEffect(() => {
    recarregar();
    const handleUpdate = () => recarregar();
    window.addEventListener('pedidos_venda_updated', handleUpdate);
    window.addEventListener('produtos_updated', handleUpdate);
    window.addEventListener('clientes_updated', handleUpdate);
    window.addEventListener('tabelas_preco_updated', handleUpdate);
    window.addEventListener('sistema_reset_updated', handleUpdate);
    window.addEventListener(EVENTO_CADASTROS_ATUALIZADOS, handleUpdate);
    return () => {
      window.removeEventListener(EVENTO_CADASTROS_ATUALIZADOS, handleUpdate);
      window.removeEventListener('pedidos_venda_updated', handleUpdate);
      window.removeEventListener('produtos_updated', handleUpdate);
      window.removeEventListener('clientes_updated', handleUpdate);
      window.removeEventListener('tabelas_preco_updated', handleUpdate);
      window.removeEventListener('sistema_reset_updated', handleUpdate);
    };
  }, []);

  const produtosFiltradosPorTabela = useMemo(() => {
    if (!tabelaIdForm) return [];
    const tab = tabelasDisponiveis.find(t => t.id === tabelaIdForm);
    if (!tab) return [];
    return produtosDisponiveis.filter(p => vendidoNaTabela(p.id, tab)).map(p => aplicarPrecoDaTabela(p, tab));
  }, [tabelaIdForm, tabelasDisponiveis, produtosDisponiveis]);

  const tabelaSelecionadaForm = tabelasDisponiveis.find(t => t.id === tabelaIdForm) || null;
  const modoObrigatorioForm = modoObrigatorioDaTabela(tabelaSelecionadaForm);

  // Preço de um produto da tabela conforme o modo de lançamento
  const precoNoModo = (prod: any, modo: 'FARDO' | 'UNITARIO') =>
    modo === 'FARDO'
      ? prod.preco_unitario
      : (prod.preco_unitario_avulso || prod.preco_unitario / fatorItem(prod.unidades_por_fardo));

  // Comissão estimada (modelo do RCA: geral / por grupo = categoria do produto / por cliente / misto)
  const comissaoForm = useMemo(() => {
    const rca = rcaIdForm ? obterRcaPorId(rcaIdForm) : undefined;
    return calcularComissaoPedido(
      rca,
      clienteIdForm,
      itensForm.map(it => ({
        produto_id: it.produtoId,
        subtotal: (Number(it.quantidade) || 0) * (Number(it.precoUnitario) || 0),
        categoria: produtosDisponiveis.find(p => p.id === it.produtoId)?.categoria
      }))
    );
  }, [itensForm, rcaIdForm, clienteIdForm, produtosDisponiveis]);

  // Estoque x quantidade pedida (em pacotes, somando linhas do mesmo produto). Só avisa, não bloqueia.
  const faltaEstoquePorProduto = useMemo(() => {
    const pacotes = new Map<string, number>();
    itensForm.forEach(it => {
      if (!it.produtoId) return;
      const qtdPacotes = modoItem(it) === 'FARDO' ? (Number(it.quantidade) || 0) * fatorItem(it.unidadesPorFardo) : Number(it.quantidade) || 0;
      pacotes.set(it.produtoId, (pacotes.get(it.produtoId) || 0) + qtdPacotes);
    });
    const res = new Map<string, { pedido: number; disponivel: number; falta: number }>();
    pacotes.forEach((qtd, id) => {
      const v = verificarDisponibilidadeProduto(id, qtd);
      res.set(id, { pedido: qtd, disponivel: v.disponivel, falta: v.falta });
    });
    return res;
  }, [itensForm, modoLancamentoForm, produtosDisponiveis]);

  // Abrir formulário de nova venda sempre limpo
  const abrirNovaVenda = () => {
    setPedidoEmEdicao(null);
    setDiasValidadeForm('7');
    setFormaPagamentoForm(FORMAS_PAGAMENTO[0]);
    setDiasPagamentoForm('28');
    setSubtipoForm(modoCliente ? 'Pedido' : 'Orçamento');
    setModoLancamentoForm('FARDO');
    setTabelaIdForm('');
    setItensForm([]);
    setObservacoesForm('');
    const cli = clientesDisponiveis.find(c => c.id === clienteIdForm) || clientesDisponiveis[0];
    setClienteIdForm(cli?.id || '');
    setRcaIdForm(cli?.rca_id || '');
    if (cli?.prazo) setPrazoPagamentoForm(cli.prazo);
    const tabCli = cli?.tabela_preco_id ? tabelasDisponiveis.find(t => t.id === cli.tabela_preco_id) : undefined;
    if (tabCli) {
      setTabelaIdForm(tabCli.id);
      setModoLancamentoForm(modoObrigatorioDaTabela(tabCli) || 'FARDO');
    }
    setModalNovo(true);
  };

  // Abrir um pedido existente para edição (mesmo formulário, já preenchido)
  const abrirEdicaoVenda = (pedido: PedidoVenda) => {
    if (!podeAlterar(pedido)) return;
    setPedidoEmEdicao(pedido);
    setSubtipoForm(pedido.subtipo_venda || (pedido.tipo === 'PEDIDO_VENDA' ? 'Pedido' : 'Orçamento'));
    const modo = pedido.modo_exibicao_padrao || 'FARDO';
    setModoLancamentoForm(modo);
    setClienteIdForm(pedido.cliente_id);
    setTabelaIdForm(pedido.tabela_id || '');
    setRcaIdForm(pedido.rca_id || '');
    setTipoFreteForm(pedido.tipo_frete);
    const cond = lerCondicao(pedido.prazo_pagamento || pedido.forma_pagamento, pedido.forma_pagamento || FORMAS_PAGAMENTO[0]);
    setFormaPagamentoForm(cond.forma);
    setDiasPagamentoForm(cond.dias);
    setObservacoesForm(pedido.observacoes || '');
    if (pedido.data_validade_orcamento) {
      const dias = Math.round(
        (new Date(`${pedido.data_validade_orcamento}T00:00:00`).getTime() - new Date(`${pedido.data_emissao}T00:00:00`).getTime()) / 86400000
      );
      setDiasValidadeForm(String(dias > 0 ? dias : 7));
    }
    // Itens voltam no modo em que foram lançados
    setItensForm(pedido.itens.map(it => {
      const fator = fatorItem(it.unidades_por_fardo);
      const fatorProduto = fatorItem(produtosDisponiveis.find(p => p.id === it.produto_id)?.unidades_por_fardo ?? it.unidades_por_fardo);
      // Item gravado como unidade avulsa volta como "unidade" com a embalagem real do produto
      if (fator <= 1 && fatorProduto > 1) {
        return {
          produtoId: it.produto_id,
          tipoEmbalagem: it.tipo_embalagem,
          quantidade: it.quantidade,
          precoUnitario: it.preco_unitario,
          unidadesPorFardo: fatorProduto,
          modo: 'UNITARIO' as const
        };
      }
      const emUnitario = modo === 'UNITARIO' && fator > 1;
      return {
        produtoId: it.produto_id,
        tipoEmbalagem: it.tipo_embalagem,
        quantidade: emUnitario ? it.quantidade * fator : it.quantidade,
        precoUnitario: emUnitario ? it.preco_unitario / fator : it.preco_unitario,
        unidadesPorFardo: it.unidades_por_fardo,
        modo
      };
    }));
    setModalNovo(true);
  };

  // Ao trocar o cliente, sugere o RCA e o prazo cadastrados para ele
  const handleTrocarCliente = (id: string) => {
    setClienteIdForm(id);
    const cli = clientesDisponiveis.find(c => c.id === id);
    if (cli) {
      setRcaIdForm(cli.rca_id || '');
      if (cli.prazo) setPrazoPagamentoForm(cli.prazo);
      // Tabela de preço do cadastro do cliente (se ativa e nenhum item lançado ainda)
      const tabCli = cli.tabela_preco_id ? tabelasDisponiveis.find(t => t.id === cli.tabela_preco_id) : undefined;
      // RCA/portal: a tabela é sempre a do cliente (definida pela fábrica); troca refaz os itens
      if (modoPortal) {
        if (tabCli) handleTrocarTabela(tabCli.id);
        else {
          setTabelaIdForm('');
          setItensForm([]);
        }
        return;
      }
      if (tabCli && itensForm.length === 0) {
        setTabelaIdForm(tabCli.id);
        const obrig = modoObrigatorioDaTabela(tabCli);
        if (obrig) setModoLancamentoForm(obrig);
      }
    }
  };

  // Ao trocar a tabela: refaz os preços dos itens lançados e remove os que não pertencem à nova tabela
  const handleTrocarTabela = (id: string) => {
    setTabelaIdForm(id);
    const tab = tabelasDisponiveis.find(t => t.id === id);
    if (!tab) {
      setItensForm([]);
      return;
    }
    // Tabela só de caixa/fardo ou só de unitário força o modo de lançamento
    const modoAlvo = modoObrigatorioDaTabela(tab) || modoLancamentoForm;
    const removidos: string[] = [];
    const arredondados: string[] = [];
    const novos = itensForm
      .map(it => {
        const prod = produtosDisponiveis.find(p => p.id === it.produtoId);
        if (!prod || !vendidoNaTabela(prod.id, tab)) {
          if (prod) removidos.push(prod.nome);
          return null;
        }
        const fator = fatorItem(it.unidadesPorFardo);
        // Tabela que obriga um modo converte o item; tabela que aceita os dois mantém o modo do item
        const modoAtual = modoItem(it);
        const modoNovo = modoObrigatorioDaTabela(tab) || modoAtual;
        let quantidade = it.quantidade;
        if (modoNovo !== modoAtual) {
          if (modoNovo === 'UNITARIO') quantidade = it.quantidade * fator;
          else {
            const fardos = it.quantidade / fator;
            quantidade = Math.max(1, Math.ceil(fardos));
            if (quantidade !== fardos) arredondados.push(prod.nome);
          }
        }
        const comPrecoTabela = aplicarPrecoDaTabela(prod, tab);
        return { ...it, modo: modoNovo, quantidade, precoUnitario: parseFloat(precoNoModo(comPrecoTabela, modoNovo).toFixed(4)) };
      })
      .filter(Boolean) as typeof itensForm;
    setItensForm(novos);
    setModoLancamentoForm(modoAlvo);
    if (removidos.length > 0) {
      alert(`Itens removidos por não terem preço na tabela "${tab.nome}": ${removidos.join(', ')}`);
    }
    if (arredondados.length > 0) {
      alert(`A tabela "${tab.nome}" vende por caixa/fardo. Quantidade arredondada para caixas/fardos inteiros em: ${arredondados.join(', ')}`);
    }
  };

  // Trocar Fardo <-> Unitário convertendo quantidade e preço dos itens já lançados
  const handleTrocarModo = (novoModo: 'FARDO' | 'UNITARIO') => {
    if (novoModo === modoLancamentoForm) return;
    if (modoObrigatorioForm && novoModo !== modoObrigatorioForm) {
      alert(`A tabela "${tabelaSelecionadaForm?.nome}" vende só ${modoObrigatorioForm === 'FARDO' ? 'por caixa/fardo' : 'por unidade'}.`);
      return;
    }
    if (novoModo === 'FARDO') {
      const naoFecha = itensForm.filter(it => modoItem(it) === 'UNITARIO' && it.quantidade % fatorItem(it.unidadesPorFardo) !== 0);
      if (naoFecha.length > 0) {
        alert('Algumas quantidades em unidades não fecham fardos/caixas inteiros. Ajuste para múltiplos da embalagem antes de trocar para "Por Fardo".');
        return;
      }
    }
    setItensForm(itensForm.map(it => converterItemParaModo(it, novoModo)));
    setModoLancamentoForm(novoModo);
  };

  // Converte um item para caixa/fardo ou unidade (quantidade e preço)
  function converterItemParaModo<T extends { quantidade: number; precoUnitario: number; unidadesPorFardo?: number; modo?: 'FARDO' | 'UNITARIO' }>(
    it: T,
    novoModo: 'FARDO' | 'UNITARIO'
  ): T {
    const atual = modoItem(it);
    if (atual === novoModo) return { ...it, modo: novoModo };
    const fator = fatorItem(it.unidadesPorFardo);
    return novoModo === 'UNITARIO'
      ? { ...it, modo: novoModo, quantidade: it.quantidade * fator, precoUnitario: parseFloat((it.precoUnitario / fator).toFixed(4)) }
      : { ...it, modo: novoModo, quantidade: Math.max(1, Math.ceil(it.quantidade / fator)), precoUnitario: parseFloat((it.precoUnitario * fator).toFixed(4)) };
  }

  // Opções de venda do item conforme a tabela: caixa/fardo, unidade ou as duas
  const opcoesVendaItem = (fator: number, tipoAcond?: string) => {
    const obrig = modoObrigatorioForm;
    const rotuloCaixa = `${tipoAcond && !/unid/i.test(tipoAcond) ? tipoAcond : 'Caixa'}${fator > 1 ? ` c/ ${fator} un` : ''}`;
    const opcoes: { modo: 'FARDO' | 'UNITARIO'; rotulo: string }[] = [];
    if (obrig !== 'UNITARIO' && fator > 1) opcoes.push({ modo: 'FARDO', rotulo: rotuloCaixa });
    if (obrig !== 'FARDO' || fator <= 1) opcoes.push({ modo: 'UNITARIO', rotulo: 'Unidade' });
    return opcoes;
  };

  // Quando abrir o modal de detalhes (Visualizador de Documento)
  const abrirVisualizacao = (pedido: PedidoVenda) => {
    setModalDetalhes(pedido);
    setZoomDocumento(100);
    if (pedido.subtipo_venda) {
      setTipoDocumentoVisualizacao(pedido.subtipo_venda);
    } else if (pedido.origem === 'Sugestão Reposição') {
      setTipoDocumentoVisualizacao('Pedido Sugestivo');
    } else if (pedido.tipo === 'PEDIDO_VENDA') {
      setTipoDocumentoVisualizacao('Pedido');
    } else {
      setTipoDocumentoVisualizacao('Orçamento');
    }
    const obrig = modoObrigatorioDaTabela(carregarTabelasPreco().find(t => t.id === pedido.tabela_id));
    setModoExibicao(obrig || pedido.modo_exibicao_padrao || 'FARDO');
  };

  // Documento: tabela só de caixa/fardo ou só unitário não alterna a apresentação
  const modoObrigatorioDocumento = modalDetalhes
    ? modoObrigatorioDaTabela(tabelasDisponiveis.find(t => t.id === modalDetalhes.tabela_id) || carregarTabelasPreco().find(t => t.id === modalDetalhes.tabela_id))
    : null;

  // Helper para obter valores calculados por Fardo vs Unitário
  const calcularValoresItem = (it: any, modo: 'FARDO' | 'UNITARIO') => {
    const prod = produtosDisponiveis.find(p => p.id === it.produto_id);
    const fator = fatorItem(it.unidades_por_fardo || prod?.unidades_por_fardo);

    if (modo === 'UNITARIO') {
      const qtdUnit = it.quantidade * fator;
      const precoUnit = it.preco_unitario / fator;
      const unidadeNome = it.tipo_embalagem === 'Fardo 10x1kg' ? 'pct 1kg' : (it.tipo_embalagem === 'Caixa' || it.tipo_embalagem === 'Fardo') ? 'un' : 'kg';
      return {
        apresentacao: fator > 1 ? `${it.tipo_embalagem} x ${fator} ${unidadeNome}` : `${it.tipo_embalagem} (${fator} ${unidadeNome})`,
        quantidade: qtdUnit,
        unidadeRotulo: unidadeNome,
        preco: precoUnit,
        subtotal: it.subtotal
      };
    } else {
      const unidadeNome = it.tipo_embalagem.includes('Fardo') ? 'fardos' : it.tipo_embalagem.includes('Caixa') ? 'caixas' : 'sacos';
      return {
        apresentacao: it.tipo_embalagem,
        quantidade: it.quantidade,
        unidadeRotulo: unidadeNome,
        preco: it.preco_unitario,
        subtotal: it.subtotal
      };
    }
  };

  // Exportar Excel (.csv compatível com Microsoft Excel e acentuação brasileira)
  const exportarExcel = (pedido: PedidoVenda) => {
    const separador = ';';
    let csv = '\uFEFF'; // BOM UTF-8 para abrir perfeitamente no Excel
    csv += `GRUPO ENO AGROINDUSTRIAL - ${tipoDocumentoVisualizacao.toUpperCase()} (${modoExibicao === 'FARDO' ? 'MODO FARDO' : 'MODO UNITÁRIO'})\n`;
    csv += `Número Documento${separador}${pedido.numero_pedido}\n`;
    csv += `Tipo de Documento${separador}${tipoDocumentoVisualizacao}\n`;
    csv += `Apresentação de Valores${separador}${modoExibicao === 'FARDO' ? 'Fardo / Embalagem Agrupada' : 'Unitário (Kg / Pacote Individual)'}\n`;
    csv += `Cliente${separador}${pedido.cliente_nome}\n`;
    csv += `CNPJ/CPF${separador}${pedido.cliente_cnpj_cpf}\n`;
    csv += `Cidade/UF${separador}${pedido.cliente_cidade_uf}\n`;
    csv += `RCA Responsável${separador}${pedido.rca_nome}\n`;
    csv += `Data Emissão${separador}${formatarDataBR(pedido.data_emissao)}\n`;
    csv += `Condição de Frete${separador}${pedido.tipo_frete}\n`;
    csv += `Prazo de Pagamento${separador}${pedido.prazo_pagamento}\n\n`;

    // Tabela de itens conforme modo
    if (modoExibicao === 'FARDO') {
      csv += `Item${separador}Embalagem${separador}Qtd (Fardos/Sacos)${separador}Preço por Fardo (R$)${separador}Subtotal (R$)\n`;
      pedido.itens.forEach(it => {
        csv += `"${it.produto_nome}"${separador}"${it.tipo_embalagem}"${separador}${it.quantidade}${separador}${it.preco_unitario.toFixed(2).replace('.', ',')}${separador}${it.subtotal.toFixed(2).replace('.', ',')}\n`;
      });
    } else {
      csv += `Item${separador}Apresentação${separador}Qtd (Unidades/Kg)${separador}Preço Unitário (R$)${separador}Subtotal (R$)\n`;
      pedido.itens.forEach(it => {
        const valores = calcularValoresItem(it, 'UNITARIO');
        csv += `"${it.produto_nome}"${separador}"${valores.apresentacao}"${separador}${valores.quantidade}${separador}${valores.preco.toFixed(2).replace('.', ',')}${separador}${valores.subtotal.toFixed(2).replace('.', ',')}\n`;
      });
    }

    csv += `\nTOTAL GERAL${separador}${separador}${(pedido.peso_total_kg / 1000).toFixed(2).replace('.', ',')} Ton${separador}${separador}R$ ${pedido.valor_total.toFixed(2).replace('.', ',')}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const modoTag = modoExibicao === 'FARDO' ? 'Fardo' : 'Unitario';
    const nomeArquivo = `${tipoDocumentoVisualizacao.replace(/\s+/g, '_')}_${pedido.numero_pedido}_${modoTag}.csv`;
    link.setAttribute('download', nomeArquivo);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Exportar Imagem PNG
  const exportarPNG = async (pedido: PedidoVenda) => {
    if (!printRef.current) return;
    try {
      setGerandoExportacao(true);
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#fbfaf5'
      });

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      const modoTag = modoExibicao === 'FARDO' ? 'Fardo' : 'Unitario';
      const nomeArquivo = `${tipoDocumentoVisualizacao.replace(/\s+/g, '_')}_${pedido.numero_pedido}_${modoTag}.png`;
      link.download = nomeArquivo;
      link.click();
    } catch (err) {
      console.error('Erro ao gerar PNG:', err);
    } finally {
      setGerandoExportacao(false);
    }
  };

  // Prévia A4 no visualizador = o mesmo PDF que é baixado (refeita ao trocar nome do documento ou modo)
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!modalDetalhes) return;
    let url: string | null = null;
    let cancelado = false;
    setPdfPreviewUrl(null);
    const timer = setTimeout(async () => {
      if (!printRef.current || cancelado) return;
      try {
        const pdf = await gerarPdfDeElemento(printRef.current);
        if (cancelado) return;
        pdf.setProperties({ title: `${tipoDocumentoVisualizacao} ${modalDetalhes.numero_pedido} - ${modalDetalhes.cliente_nome}` });
        url = URL.createObjectURL(pdf.output('blob'));
        setPdfPreviewUrl(url);
      } catch (err) {
        console.error('Erro ao gerar prévia:', err);
      }
    }, 150);
    return () => {
      cancelado = true;
      clearTimeout(timer);
      if (url) URL.revokeObjectURL(url);
    };
  }, [modalDetalhes, tipoDocumentoVisualizacao, modoExibicao, comFotoDoc]);

  // Exportar Documento PDF Oficial A4
  const exportarPDF = async (pedido: PedidoVenda) => {
    if (!printRef.current) return;
    try {
      setGerandoExportacao(true);
      // Documento inteiro, com quebra de página entre os itens
      const pdf = await gerarPdfDeElemento(printRef.current);

      const modoTag = modoExibicao === 'FARDO' ? 'Fardo' : 'Unitario';
      const nomeArquivo = `${tipoDocumentoVisualizacao.replace(/\s+/g, '_')}_${pedido.numero_pedido}_${modoTag}.pdf`;
      pdf.save(nomeArquivo);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
    } finally {
      setGerandoExportacao(false);
    }
  };

  // Portal do RCA: contagem por etapa e recorte pela etapa escolhida
  const contagemEtapas = useMemo(() => {
    const c: Record<FiltroEtapaRca, number> = { ORCAMENTO: 0, EM_PRODUCAO: 0, A_FATURAR: 0, FATURADO: 0, ENTREGUE: 0, TODAS: pedidos.length };
    pedidos.forEach(p => { c[p.etapa] = (c[p.etapa] || 0) + 1; });
    return c;
  }, [pedidos]);
  const pedidosNaEtapa = useMemo(
    () => (modoPortal && filtroEtapa !== 'TODAS' ? pedidos.filter(p => p.etapa === filtroEtapa) : pedidos),
    [pedidos, modoPortal, filtroEtapa]
  );

  // Métricas
  const metricas = useMemo(() => {
    const base = pedidosNaEtapa;
    const total = base.length;
    const valorTotal = base.reduce((acc, p) => acc + p.valor_total, 0);
    const volumeTotalKg = base.reduce((acc, p) => acc + p.peso_total_kg, 0);
    const orcamentos = base.filter(p => !p.subtipo_venda || p.subtipo_venda === 'Orçamento').length;
    const sugestivos = base.filter(p => p.subtipo_venda === 'Pedido Sugestivo' || p.origem === 'Sugestão Reposição').length;
    const pedidosVenda = base.filter(p => p.subtipo_venda === 'Pedido' || p.tipo === 'PEDIDO_VENDA').length;

    return { total, valorTotal, volumeTotalKg, orcamentos, sugestivos, pedidosVenda };
  }, [pedidosNaEtapa]);

  // Filtros
  const pedidosFiltrados = useMemo(() => {
    return pedidosNaEtapa.filter(p => {
      const matchBusca =
        p.numero_pedido.toLowerCase().includes(busca.toLowerCase()) ||
        p.cliente_nome.toLowerCase().includes(busca.toLowerCase()) ||
        p.rca_nome.toLowerCase().includes(busca.toLowerCase()) ||
        p.cliente_cidade_uf.toLowerCase().includes(busca.toLowerCase());

      if (!matchBusca) return false;
      if (filtroOrigem !== 'TODAS' && origemEfetiva(p) !== filtroOrigem) return false;

      if (filtroSubtipo !== 'TODOS') {
        if (filtroSubtipo === 'Pedido Sugestivo') {
          if (p.subtipo_venda !== 'Pedido Sugestivo' && p.origem !== 'Sugestão Reposição') return false;
        } else if (filtroSubtipo === 'Orçamento') {
          if (p.subtipo_venda && p.subtipo_venda !== 'Orçamento') return false;
          if (!p.subtipo_venda && p.origem === 'Sugestão Reposição') return false;
        } else if (filtroSubtipo === 'Pedido') {
          if (p.subtipo_venda !== 'Pedido' && p.tipo !== 'PEDIDO_VENDA') return false;
        }
      }

      return true;
    });
  }, [pedidosNaEtapa, busca, filtroOrigem, filtroSubtipo]);

  const handleAddItem = () => {
    if (!tabelaIdForm) {
      alert(modoPortal
        ? 'Este cliente ainda não tem tabela de preço liberada pela fábrica. Sem tabela não é possível lançar produtos.'
        : 'Por favor, selecione primeiro uma Tabela de Preço para carregar os produtos e preços permitidos.');
      return;
    }
    const defaultProd = produtosFiltradosPorTabela[0];
    if (!defaultProd) {
      alert('Esta tabela de preços não possui produtos vinculados ou disponíveis.');
      return;
    }
    // Primeira opção que a tabela permite para o produto (caixa/fardo ou unidade)
    const modoInicial =
      opcoesVendaItem(fatorItem(defaultProd.unidades_por_fardo), defaultProd.tipo_acondicionamento).find(o => o.modo === modoLancamentoForm)?.modo ||
      opcoesVendaItem(fatorItem(defaultProd.unidades_por_fardo), defaultProd.tipo_acondicionamento)[0]?.modo ||
      modoLancamentoForm;
    setItensForm([
      ...itensForm,
      {
        produtoId: defaultProd.id,
        tipoEmbalagem: tipoEmbalagemDoProduto(defaultProd),
        quantidade: modoInicial === 'FARDO' ? 1 : fatorItem(defaultProd.unidades_por_fardo),
        precoUnitario: precoNoModo(defaultProd, modoInicial),
        unidadesPorFardo: fatorItem(defaultProd.unidades_por_fardo),
        modo: modoInicial
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (itensForm.length <= 1) return;
    setItensForm(itensForm.filter((_, i) => i !== index));
  };

  // Salvar novo registro de venda (Orçamento, Sugestivo ou Pedido)
  const handleSalvarNovo = (e: React.FormEvent) => {
    e.preventDefault();

    if (!clienteIdForm) {
      alert('Selecione um cliente para prosseguir com a venda ou orçamento.');
      return;
    }

    if (!tabelaIdForm) {
      alert(modoPortal
        ? 'Este cliente ainda não tem tabela de preço liberada pela fábrica. Peça ao administrador para definir a tabela no cadastro do cliente.'
        : 'Selecione uma Tabela de Preço válida para prosseguir.');
      return;
    }
    // RCA/cliente: o pedido usa sempre a tabela do cadastro do cliente
    if (modoPortal) {
      const tabDoCliente = clientesDisponiveis.find(c => c.id === clienteIdForm)?.tabela_preco_id;
      if (tabDoCliente !== tabelaIdForm) {
        alert('A tabela de preço deste cliente mudou. Abra o pedido de novo para atualizar os preços.');
        return;
      }
    }

    if (itensForm.length === 0 || !itensForm[0].produtoId) {
      alert('Adicione pelo menos um produto à proposta para salvar.');
      return;
    }
    if (itensForm.some(it => !it.quantidade || it.quantidade <= 0)) {
      alert('Informe uma quantidade maior que zero em todos os itens.');
      return;
    }
    const clienteSel = clientesDisponiveis.find(c => c.id === clienteIdForm);
    if (!clienteSel) {
      alert('Cliente selecionado não encontrado no cadastro. Selecione um cliente válido.');
      return;
    }
    const rcaSel = rcasDisponiveis.find(r => r.id === rcaIdForm);
    if (modoCliente) {
      if (clienteSel.id !== clienteFixoId) {
        alert('Pedido inválido para este cadastro.');
        return;
      }
      if (carregarClientes().find(c => c.id === clienteFixoId)?.ativo === false) {
        alert('Seu cadastro está inativo. Fale com a fábrica para liberar novos pedidos.');
        return;
      }
      if (!tabelasDisponiveis.some(t => t.id === tabelaIdForm)) {
        alert('A tabela de preço deste pedido não está disponível para o seu cadastro. Fale com seu representante.');
        return;
      }
      if (itensForm.some(it => !produtosFiltradosPorTabela.some(p => p.id === it.produtoId))) {
        alert('Há itens que não fazem parte da sua tabela de preço. Remova-os para continuar.');
        return;
      }
      if (pedidoEmEdicao) {
        const atual = carregarPedidosVenda().find(p => p.id === pedidoEmEdicao.id);
        if (!atual || !podeAlterar(atual)) {
          alert('Este pedido já foi aprovado pela fábrica e não pode mais ser alterado.');
          setPedidoEmEdicao(null);
          setModalNovo(false);
          return;
        }
      }
    } else if (modoPortal) {
      if (!rcaSel) {
        alert('Seu cadastro de RCA não foi encontrado. Fale com o administrador.');
        return;
      }
      // Revalida no armazenamento: só edita pedido próprio que ainda aguarda aprovação
      if (pedidoEmEdicao) {
        const atual = carregarPedidosVenda().find(p => p.id === pedidoEmEdicao.id);
        if (!atual || !podeAlterar(atual)) {
          alert('Este pedido já foi aprovado pela fábrica (ou não é seu) e não pode mais ser alterado.');
          setPedidoEmEdicao(null);
          setModalNovo(false);
          return;
        }
      }
    }

    const dataHojeStr = pedidoEmEdicao?.data_emissao || hojeISO();
    const dataValidadeStr = somarDias(dataHojeStr, parseInt(diasValidadeForm) || 7);

    // Portal do Cliente: o preço é sempre o da tabela (não editável)
    const itensBase = modoCliente
      ? itensForm.map(it => {
          const p = produtosFiltradosPorTabela.find(x => x.id === it.produtoId);
          return p ? { ...it, tipoEmbalagem: tipoEmbalagemDoProduto(p) || it.tipoEmbalagem, precoUnitario: precoNoModo(p, modoItem(it)) } : it;
        })
      : itensForm;
    const itensMapeados = itensBase.map(it => {
      const prod = produtosFiltradosPorTabela.find(p => p.id === it.produtoId) || produtosDisponiveis.find(p => p.id === it.produtoId);
      if (!prod) return null;
      let fator = fatorItem(it.unidadesPorFardo || prod.unidades_por_fardo);
      let tipoEmbalagem = it.tipoEmbalagem || tipoEmbalagemDoProduto(prod);
      let qtdReal = it.quantidade;
      let precoReal = it.precoUnitario;
      const subtotal = it.quantidade * it.precoUnitario;

      // Lançado em unitário: vira fardos quando fecha embalagens inteiras; senão fica avulso (sem arredondar)
      if (modoItem(it) === 'UNITARIO' && fator > 1) {
        if (it.quantidade % fator === 0) {
          qtdReal = it.quantidade / fator;
          precoReal = it.precoUnitario * fator;
        } else {
          fator = 1;
          tipoEmbalagem = 'Unitário (avulso)';
        }
      }

      const item = {
        produto_id: prod.id,
        produto_nome: prod.nome,
        tipo_embalagem: tipoEmbalagem,
        quantidade: qtdReal,
        peso_unitario_kg: prod.peso_unitario_kg,
        peso_total_kg: 0,
        preco_unitario: precoReal,
        subtotal,
        unidades_por_fardo: fator
      };
      // Peso considera os pacotes de cada fardo/caixa
      item.peso_total_kg = pesoDoItemKg(item);
      return item;
    }).filter(Boolean) as any[];

    const valorTotal = itensMapeados.reduce((acc, i) => acc + i.subtotal, 0);
    const pesoTotal = itensMapeados.reduce((acc, i) => acc + i.peso_total_kg, 0);
    // Comissão pelo modelo do RCA, item a item (grava regra e valores no pedido e em cada item)
    const comissaoCalc = calcularComissaoPedido(
      rcaSel ? obterRcaPorId(rcaSel.id) : undefined,
      clienteSel.id,
      itensMapeados.map(i => ({
        produto_id: i.produto_id,
        subtotal: i.subtotal,
        categoria: produtosDisponiveis.find(p => p.id === i.produto_id)?.categoria
      }))
    );
    itensMapeados.forEach((i, idx) => {
      const c = comissaoCalc.itens[idx];
      i.comissao_percentual = c?.percentual ?? 0;
      i.comissao_valor = c?.valor ?? 0;
      i.comissao_regra = c?.regra;
    });
    const comissaoPercentual = comissaoCalc.percentual_efetivo;
    const comissaoValor = comissaoCalc.valor;

    const prefixo = subtipoForm === 'Orçamento' ? 'ORC' : subtipoForm === 'Pedido Sugestivo' ? 'SUG' : 'PED';
    aplicarCodigosNoArmazenamento();
    const novoNum = numeroPedidoNovo(hojeISO(), codigoDoCliente(clienteSel.id), carregarPedidosVenda());

    const tabelaSel = tabelasDisponiveis.find(t => t.id === tabelaIdForm);

    const novoRegistro: PedidoVenda & CamposComissaoPedido = {
      // Edição: mantém o que não é do formulário (histórico, datas de etapa etc.)
      ...(pedidoEmEdicao || {}),
      id: pedidoEmEdicao?.id || `ped_venda_${Date.now()}`,
      numero_pedido: pedidoEmEdicao?.numero_pedido || novoNum,
      tipo: subtipoForm === 'Pedido' ? 'PEDIDO_VENDA' : 'ORCAMENTO',
      etapa: 'ORCAMENTO',
      subtipo_venda: subtipoForm,
      modo_exibicao_padrao: modoLancamentoForm,
      tabela_id: tabelaIdForm,
      tabela_nome: tabelaSel?.nome,
      cliente_id: clienteSel.id,
      cliente_nome: clienteSel.nome,
      cliente_cnpj_cpf: clienteSel.cnpj,
      cliente_cidade_uf: clienteSel.cidade_uf,
      cliente_limite_credito: clienteSel.limite_credito,
      cliente_status_credito: clienteSel.status_credito,
      rca_id: rcaSel?.id || '',
      rca_nome: rcaSel?.nome || 'Venda Direta',
      comissao_percentual: comissaoPercentual,
      comissao_valor: comissaoValor,
      comissao_regra: rcaSel ? comissaoCalc.regra : 'Sem RCA',
      comissao_itens: comissaoCalc.itens,
      data_emissao: dataHojeStr,
      data_validade_orcamento: dataValidadeStr,
      data_previsao_entrega: dataValidadeStr,
      itens: itensMapeados,
      peso_total_kg: pesoTotal,
      valor_total: valorTotal,
      forma_pagamento: formaPagamentoForm,
      prazo_pagamento: prazoPagamentoForm,
      tipo_frete: tipoFreteForm,
      // Pedido feito pelo cliente segue identificado como 'Portal do Cliente' (também quando o admin edita).
      // Admin sem RCA = 'Venda Direta'; admin com RCA = 'Admin'; 'RCA' só quando feito no portal do RCA.
      origem: modoCliente || pedidoEmEdicao?.origem === 'Portal do Cliente'
        ? 'Portal do Cliente'
        : pedidoEmEdicao?.origem === 'Portal Portfólio VIP'
        ? 'Portal Portfólio VIP'
        : subtipoForm === 'Pedido Sugestivo'
        ? 'Sugestão Reposição'
        : modoRca || (pedidoEmEdicao?.origem === 'RCA' && rcaSel)
        ? 'RCA'
        : rcaSel ? 'Admin' : 'Venda Direta',
      observacoes: observacoesForm
    };

    const todosAtuais = carregarPedidosVenda();
    const atualizados = pedidoEmEdicao
      ? todosAtuais.map(p => (p.id === pedidoEmEdicao.id ? novoRegistro : p))
      : [novoRegistro, ...todosAtuais];
    salvarPedidosVenda(atualizados);
    setPedidoEmEdicao(null);
    setModalNovo(false);
  };

  // Ação Rápida: Aprovar e Enviar para Produção
  const handleAprovarParaProducao = (pedidoId: string, numero: string) => {
    if (modoPortal) return; // aprovação é exclusiva do administrador
    if (confirm(`Aprovar a venda / proposta ${numero} e enviar diretamente para a FILA DE PRODUÇÃO?`)) {
      moverPedidoEtapa(pedidoId, 'EM_PRODUCAO');
      if (onNavigate) onNavigate('pedidos_em_producao');
    }
  };

  // Excluir Proposta / Venda
  const handleExcluir = (pedidoId: string) => {
    const alvo = carregarPedidosVenda().find(p => p.id === pedidoId);
    if (!alvo || !podeAlterar(alvo)) {
      if (modoPortal) alert('Só é possível excluir pedidos seus que ainda aguardam aprovação.');
      return;
    }
    if (confirm('Deseja realmente remover esta venda/cotação?')) {
      const todos = carregarPedidosVenda();
      const filtrados = todos.filter(p => p.id !== pedidoId);
      salvarPedidosVenda(filtrados);
      removerTituloComissaoDoPedido(pedidoId); // comissão não paga não fica órfã
    }
  };

  // Rótulo do tipo da venda (mesma regra usada nos filtros)
  const subtipoDe = (item: PedidoVenda) =>
    item.subtipo_venda || (item.origem === 'Sugestão Reposição' ? 'Pedido Sugestivo' : item.tipo === 'PEDIDO_VENDA' ? 'Pedido' : 'Orçamento');
  const ROTULO_SUBTIPO: Record<string, string> = { 'Pedido Sugestivo': 'Pedido sugestivo', Pedido: 'Pedido de venda', 'Orçamento': 'Orçamento' };
  const filtrosAtivos = busca.trim() !== '' || filtroOrigem !== 'TODAS' || filtroSubtipo !== 'TODOS';
  const limparFiltros = () => {
    setBusca('');
    setFiltroOrigem('TODAS');
    setFiltroSubtipo('TODOS');
  };
  const hojeLista = hojeISO();
  const validadeVencida = (d?: string) => !!d && d < hojeLista;
  const moedaBR = (v: unknown) => formatarMoeda(v);
  const vazioPorFiltro = filtrosAtivos && pedidosNaEtapa.length > 0;

  const semNenhuma = pedidosNaEtapa.length === 0 && !filtrosAtivos;
  const resumoCabecalho = semNenhuma && !modoPortal ? (
    <span>Nenhuma venda em negociação</span>
  ) : modoCliente ? (
    <span>{metricas.total} {filtroEtapa === 'TODAS' ? (metricas.total === 1 ? 'pedido no histórico' : 'pedidos no histórico') : 'nesta situação'}</span>
  ) : (
    <>
      <span className="font-semibold text-tinta-2">
        {metricas.total} {modoPortal ? (filtroEtapa === 'ORCAMENTO' ? 'aguardando aprovação' : 'nesta situação') : metricas.total === 1 ? 'venda em negociação' : 'vendas em negociação'}
      </span>
      <span> · {moedaBR(metricas.valorTotal)}</span>
      {metricas.volumeTotalKg > 0 && <span> · {textoPeso(metricas.volumeTotalKg)}</span>}
    </>
  );

  const estadoVazio = (
    <EstadoVazio
      titulo={
        vazioPorFiltro
          ? 'Nenhuma venda com esses filtros'
          : modoPortal
          ? pedidos.length === 0 ? 'Você ainda não enviou pedidos' : 'Nenhum pedido nesta situação'
          : 'Nenhuma venda ainda'
      }
      texto={
        vazioPorFiltro
          ? 'Mude o tipo, a origem ou a busca para ver as outras vendas.'
          : modoCliente
          ? 'Clique em "Fazer pedido" para escolher os produtos da sua tabela de preço.'
          : modoPortal
          ? 'Clique em "Fazer pedido" para montar um orçamento ou pedido para um cliente da sua carteira.'
          : 'Orçamentos, pedidos sugestivos e pedidos de venda ficam aqui até serem aprovados para a produção.'
      }
      acao={
        vazioPorFiltro ? (
          <BotaoSecundario onClick={limparFiltros}>Limpar filtros</BotaoSecundario>
        ) : (
          <BotaoPrimario onClick={() => abrirNovaVenda()}>
            <Plus className="w-4 h-4" />
            {modoPortal ? 'Fazer pedido' : 'Nova venda'}
          </BotaoPrimario>
        )
      }
    />
  );

  return (
    <div className={`relative w-full flex flex-col text-tinta ${modoPortal ? 'bg-papel rounded-md border border-linha overflow-hidden' : 'h-full overflow-hidden bg-papel-2'}`}>

      {/* Abas antigas do fluxo: só fora do shell (dentro dele o submenu fica na faixa superior) */}
      {!modoPortal && <PedidosNavTabs activeTab="pedidos_orcamentos_sugestivo" onNavigate={onNavigate} />}

      {/* 1. CABEÇALHO DA PÁGINA */}
      <div className={modoPortal ? '' : 'mx-auto w-full max-w-[1700px]'}>
        <CabecalhoPagina
          titulo={modoPortal ? 'Meus pedidos' : 'Vendas'}
          resumo={resumoCabecalho}
          className={modoPortal ? 'pt-4' : ''}
          acoes={
            // Lista vazia: a ação fica só no estado vazio (uma ação primária por área)
            semNenhuma ? undefined : (
            <BotaoPrimario onClick={() => abrirNovaVenda()} className={modoPortal ? 'w-full sm:w-auto h-10 sm:h-9' : ''}>
              <Plus className="w-4 h-4" />
              {modoPortal ? 'Fazer pedido' : 'Nova venda'}
            </BotaoPrimario>
            )
          }
        >
          {modoPortal && (
            <p className="text-[12px] text-cinza mt-2 max-w-2xl">
              {modoCliente
                ? 'Seu pedido fica aguardando a aprovação da fábrica. Até lá você pode alterar; depois, só acompanhar.'
                : 'Pedidos enviados ficam aguardando a aprovação da fábrica. Depois de aprovados, só leitura.'}
            </p>
          )}
          {/* Portal: situação dos pedidos */}
          {modoPortal && (
            <Segmentado<FiltroEtapaRca>
              className="mt-3 w-full sm:w-fit"
              rotuloAria="Situação dos pedidos"
              valor={filtroEtapa}
              onChange={setFiltroEtapa}
              opcoes={([
                ['ORCAMENTO', 'Aguardando aprovação'],
                ['EM_PRODUCAO', 'Em produção'],
                ['A_FATURAR', 'A faturar'],
                ['FATURADO', 'Faturados'],
                ['ENTREGUE', 'Entregues'],
                ['TODAS', 'Todos'],
              ] as [FiltroEtapaRca, string][]).map(([v, r]) => ({ valor: v, rotulo: r, contagem: contagemEtapas[v] || 0 }))}
            />
          )}
        </CabecalhoPagina>

        {/* 2. FILTROS EM UMA LINHA: tipo · busca · origem */}
        <BarraFiltros>
          {!modoCliente ? (
            <Segmentado<'TODOS' | 'Orçamento' | 'Pedido Sugestivo' | 'Pedido'>
              rotuloAria="Tipo de venda"
              valor={filtroSubtipo}
              onChange={setFiltroSubtipo}
              opcoes={[
                { valor: 'TODOS', rotulo: 'Todas', contagem: metricas.total },
                { valor: 'Orçamento', rotulo: 'Orçamentos', contagem: metricas.orcamentos },
                { valor: 'Pedido Sugestivo', rotulo: 'Sugestivos', contagem: metricas.sugestivos },
                { valor: 'Pedido', rotulo: 'Pedidos de venda', contagem: metricas.pedidosVenda },
              ]}
            />
          ) : (
            <span className="hidden md:block" />
          )}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <CampoBusca
              valor={busca}
              onChange={setBusca}
              placeholder={modoCliente ? 'Buscar nº do pedido' : 'Buscar venda, cliente ou RCA'}
              className="flex-1 md:flex-none md:w-72"
            />
            {!modoPortal && (
              <SeletorFiltro value={filtroOrigem} onChange={e => setFiltroOrigem(e.target.value)} aria-label="Origem da venda" className="max-w-[46%] md:max-w-none">
                <option value="TODAS">Todas as origens</option>
                <option value="RCA">Portal do RCA</option>
                <option value="Admin">Admin (com RCA)</option>
                <option value="Venda Direta">Venda direta</option>
                <option value="Sugestão Reposição">Sugestão de reposição</option>
                <option value="Portal Portfólio VIP">Portal VIP</option>
                <option value="Portal do Cliente">Portal do Cliente</option>
              </SeletorFiltro>
            )}
          </div>
        </BarraFiltros>
      </div>

      {/* 3. LISTA: cartões no celular, tabela densa a partir de sm */}
      <div className={modoPortal ? 'px-3 pb-4 sm:px-6 sm:pb-6' : 'flex-1 min-h-0 overflow-y-auto'}>
        <div className={modoPortal ? '' : 'mx-auto w-full max-w-[1700px] px-4 sm:px-6 pb-6'}>
          {pedidosFiltrados.length === 0 ? (
            <div className="bg-papel border border-linha rounded-md">{estadoVazio}</div>
          ) : (
            <>
              {/* Celular: cartões */}
              <ul className="sm:hidden bg-papel border border-linha rounded-md">
                {pedidosFiltrados.map(item => {
                  const editavel = podeAlterar(item);
                  return (
                    <li key={item.id} className="px-3.5 py-3 border-b border-linha last:border-b-0">
                      <button type="button" onClick={() => abrirVisualizacao(item)} className="w-full text-left">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-[11.5px] text-cinza tabular-nums">{item.numero_pedido} · {ROTULO_SUBTIPO[subtipoDe(item)] || subtipoDe(item)}</div>
                            {modoCliente ? (
                              <div className="text-[13px] font-semibold text-tinta line-clamp-2">
                                {item.itens.map(i => `${i.quantidade}x ${i.produto_nome}`).join(' · ')}
                              </div>
                            ) : (
                              <>
                                <div className="text-[14px] font-bold text-tinta truncate">{item.cliente_nome}</div>
                                <div className="text-[11.5px] text-cinza truncate">{item.cliente_cidade_uf}{!modoPortal && item.rca_nome ? ` · ${item.rca_nome}` : ''}</div>
                              </>
                            )}
                          </div>
                          {modoPortal && (
                            <StatusChip tom={TOM_ETAPA_VENDA[item.etapa] || 'neutro'} className="shrink-0">{ROTULO_ETAPA[item.etapa]}</StatusChip>
                          )}
                        </div>
                        <div className="flex items-end justify-between mt-2">
                          <span className="text-[11.5px] text-cinza tabular-nums">{formatarDataBR(item.data_emissao)} · {item.prazo_pagamento}</span>
                          <span className="text-[17px] font-extrabold tracking-[-0.01em] tabular-nums text-tinta">{moedaBR(item.valor_total)}</span>
                        </div>
                      </button>
                      <div className="flex gap-2 mt-2.5">
                        {!modoPortal && (
                          <button
                            type="button"
                            onClick={() => handleAprovarParaProducao(item.id, item.numero_pedido)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-md bg-eno-800 text-white text-[12.5px] font-semibold"
                          >
                            <Check className="w-3.5 h-3.5" /> Aprovar
                          </button>
                        )}
                        {editavel && (
                          <button
                            type="button"
                            onClick={() => abrirEdicaoVenda(item)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-md border border-linha-forte text-tinta-2 text-[12.5px] font-semibold active:bg-papel-3"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Editar
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => abrirVisualizacao(item)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-md border border-linha-forte text-tinta-2 text-[12.5px] font-semibold active:bg-papel-3"
                        >
                          <Eye className="w-3.5 h-3.5" /> Ver / PDF
                        </button>
                        {editavel && (
                          <button
                            type="button"
                            onClick={() => handleExcluir(item.id)}
                            className="px-3 h-9 rounded-md border border-linha-forte text-cinza active:bg-st-vencido-bg active:text-st-vencido"
                            aria-label={`Excluir ${item.numero_pedido}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>

              {/* A partir de sm: tabela densa */}
              <TabelaDados className="hidden sm:block">
                <thead className={tabela.thead}>
                  <tr>
                    <Th>Venda</Th>
                    {!modoCliente && <Th>Cliente</Th>}
                    <Th>{modoPortal ? 'Situação' : 'RCA'}</Th>
                    <Th>Itens</Th>
                    <Th>Validade</Th>
                    <Th numero>Valor</Th>
                    <Th className="text-right">Ações</Th>
                  </tr>
                </thead>
                <tbody>
                  {pedidosFiltrados.map(item => {
                    const itensResumo = item.itens.map(i => `${i.quantidade}x ${i.tipo_embalagem}`).join(' + ');
                    const origem = ROTULO_ORIGEM[origemEfetiva(item)] || origemEfetiva(item);
                    const vencida = item.etapa === 'ORCAMENTO' && validadeVencida(item.data_validade_orcamento);
                    return (
                      <tr
                        key={item.id}
                        onClick={() => abrirVisualizacao(item)}
                        className={`${tabela.tr} cursor-pointer group`}
                        title="Clique para abrir o documento"
                      >
                        <Td>
                          <div className="font-semibold text-tinta tabular-nums whitespace-nowrap group-hover:text-eno-700">{item.numero_pedido}</div>
                          <div className="text-[11.5px] text-cinza whitespace-nowrap">
                            {ROTULO_SUBTIPO[subtipoDe(item)] || subtipoDe(item)}
                            {!modoCliente && (
                              <>
                                {' · '}
                                <span className={item.origem === 'Portal do Cliente' ? 'text-st-producao font-semibold' : ''}>{origem}</span>
                              </>
                            )}
                          </div>
                        </Td>
                        {!modoCliente && (
                          <Td className="max-w-[260px]">
                            <div className="font-semibold text-tinta truncate">{item.cliente_nome}</div>
                            <div className="text-[11.5px] text-cinza truncate">{item.cliente_cidade_uf}</div>
                          </Td>
                        )}
                        <Td className="whitespace-nowrap">
                          {modoPortal ? (
                            <StatusChip tom={TOM_ETAPA_VENDA[item.etapa] || 'neutro'}>{ROTULO_ETAPA[item.etapa]}</StatusChip>
                          ) : (
                            item.rca_nome || <span className="text-cinza-claro">Sem RCA</span>
                          )}
                        </Td>
                        <Td className="max-w-[240px]">
                          <div className="truncate" title={itensResumo}>{itensResumo}</div>
                          <div className="text-[11.5px] text-cinza tabular-nums">{textoPeso(item.peso_total_kg)}</div>
                        </Td>
                        <Td className="whitespace-nowrap tabular-nums">
                          {item.data_validade_orcamento ? (
                            vencida ? (
                              <StatusChip tom="vencido">Venceu {formatarDataBR(item.data_validade_orcamento)}</StatusChip>
                            ) : (
                              formatarDataBR(item.data_validade_orcamento)
                            )
                          ) : (
                            <span className="text-cinza-claro">—</span>
                          )}
                        </Td>
                        <Td numero>
                          <div className="font-bold text-tinta text-[13.5px]">{moedaBR(item.valor_total)}</div>
                          <div className="text-[11.5px] text-cinza font-normal">{item.prazo_pagamento}</div>
                        </Td>
                        <Td className="text-right">
                          <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                            {!modoPortal && (
                              <button
                                type="button"
                                onClick={() => handleAprovarParaProducao(item.id, item.numero_pedido)}
                                className="inline-flex items-center gap-1 h-7 px-2.5 rounded-[5px] bg-eno-800 hover:bg-eno-900 text-white text-[12px] font-semibold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ouro"
                                title="Aprovar e enviar para produção"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Aprovar
                              </button>
                            )}
                            {podeAlterar(item) && (
                              <button
                                type="button"
                                onClick={() => abrirEdicaoVenda(item)}
                                className="inline-flex items-center gap-1 h-7 px-2 rounded-[5px] text-tinta-2 hover:bg-papel-3 text-[12px] font-semibold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ouro"
                                title="Editar itens, cliente, tabela e condições"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                Editar
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => abrirVisualizacao(item)}
                              className="inline-flex items-center gap-1 h-7 px-2 rounded-[5px] text-tinta-2 hover:bg-papel-3 text-[12px] font-semibold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ouro"
                              title="Abrir o documento para ver antes de exportar"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Ver
                            </button>
                            {podeAlterar(item) && (
                              <button
                                type="button"
                                onClick={() => handleExcluir(item.id)}
                                className="inline-flex items-center justify-center h-7 w-7 rounded-[5px] text-cinza-claro hover:bg-st-vencido-bg hover:text-st-vencido transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ouro"
                                title="Excluir"
                                aria-label={`Excluir ${item.numero_pedido}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </TabelaDados>
            </>
          )}
        </div>
      </div>

      {/* 5. MODAL NOVA VENDA / PROPOSTA COMERCIAL */}
      {modalNovo && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 backdrop-blur-xs p-0 sm:p-6 flex justify-center items-stretch sm:items-start animate-fadeIn">
          <div className="min-w-0 max-sm:[&_input:not([type=checkbox]):not([type=radio]):not([type=file])]:min-h-11 max-sm:[&_input]:text-base max-sm:[&_select]:min-h-11 max-sm:[&_select]:text-base max-sm:[&_textarea]:text-base relative w-full max-w-5xl lg:max-w-6xl bg-papel rounded-none sm:rounded-md shadow-2xl overflow-hidden border-0 sm:border border-linha flex flex-col sm:my-auto h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[calc(100vh-3.5rem)]">
            <div className="bg-eno-900 text-white px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between border-b border-eno-800 shrink-0">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-ouro-claro" />
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">
                    {pedidoEmEdicao ? `Editar ${pedidoEmEdicao.numero_pedido}` : modoCliente ? 'Novo pedido' : 'Nova Venda / Proposta Comercial'}
                  </h3>
                  <p className="text-[11px] text-eno-100/70 max-sm:hidden">
                    {pedidoEmEdicao
                      ? (modoCliente ? 'Altere itens e quantidades. O número e a data do pedido são mantidos.' : 'Altere itens, cliente, tabela ou condições. O número e a data de emissão são mantidos.')
                      : modoCliente
                      ? 'Escolha os produtos da sua tabela. O pedido segue para aprovação da fábrica.'
                      : modoPortal
                      ? 'Monte o pedido para um cliente da sua carteira. Ele segue para aprovação da fábrica.'
                      : 'Cadastre um novo Orçamento, Pedido Sugestivo ou Pedido de Venda.'}
                  </p>
                </div>
              </div>
              <button onClick={() => setModalNovo(false)} className="inline-flex items-center justify-center w-10 h-10 -mr-2 shrink-0 rounded-md hover:bg-eno-800 text-eno-100 hover:text-white transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSalvarNovo} className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 text-xs">
              
              {/* Escolha do Tipo de Documento e Modo de Lançamento */}
              <div className="p-3.5 bg-papel-2 rounded-md border border-linha flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-3">
                {modoCliente ? (
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-cinza">Documento</span>
                    <span className="block text-sm font-extrabold text-tinta">Pedido de compra</span>
                  </div>
                ) : (
                <div>
                  <label className="block font-bold text-tinta-2 mb-1">Tipo de Documento Comercial *</label>
                  <div className="flex w-full sm:inline-flex sm:w-auto flex-wrap rounded-md bg-papel p-0.5 border border-linha-forte max-sm:[&>button]:flex-1 max-sm:[&>button]:min-h-10 max-sm:[&>button]:justify-center">
                    <button
                      type="button"
                      onClick={() => setSubtipoForm('Orçamento')}
                      className={`px-3 py-1.5 rounded-md font-bold text-xs transition-all cursor-pointer ${
                        subtipoForm === 'Orçamento'
                          ? 'bg-eno-800 text-white'
                          : 'text-tinta-2 hover:text-tinta'
                      }`}
                    >
                      Orçamento Comercial
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubtipoForm('Pedido Sugestivo')}
                      className={`px-3 py-1.5 rounded-md font-bold text-xs transition-all cursor-pointer ${
                        subtipoForm === 'Pedido Sugestivo'
                          ? 'bg-eno-800 text-white'
                          : 'text-tinta-2 hover:text-tinta'
                      }`}
                    >
                      Pedido Sugestivo (Reposição)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubtipoForm('Pedido')}
                      className={`px-3 py-1.5 rounded-md font-bold text-xs transition-all cursor-pointer ${
                        subtipoForm === 'Pedido'
                          ? 'bg-eno-800 text-white'
                          : 'text-tinta-2 hover:text-tinta'
                      }`}
                    >
                      Pedido de Venda
                    </button>
                  </div>
                </div>
                )}

                {/* Alternador de Modo de Preenchimento: Fardo vs Unitário */}
                <div>
                  <label className="block font-bold text-tinta-2 mb-1">Preenchimento de Itens</label>
                  <div className="flex w-full sm:inline-flex sm:w-auto flex-wrap rounded-md bg-papel p-0.5 border border-linha-forte max-sm:[&>button]:flex-1 max-sm:[&>button]:min-h-10 max-sm:[&>button]:justify-center">
                    <button
                      type="button"
                      onClick={() => handleTrocarModo('FARDO')}
                      disabled={modoObrigatorioForm === 'UNITARIO'}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold text-xs transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
                        modoLancamentoForm === 'FARDO'
                          ? 'bg-eno-800 text-white'
                          : 'text-tinta-2 hover:text-tinta'
                      }`}
                      title={modoObrigatorioForm === 'UNITARIO' ? 'Esta tabela vende só por unidade' : 'Lançar valores em Fardos ou Embalagens'}
                    >
                      <Package className="w-3.5 h-3.5" />
                      <span>Por Fardo / Saco</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTrocarModo('UNITARIO')}
                      disabled={modoObrigatorioForm === 'FARDO'}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold text-xs transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
                        modoLancamentoForm === 'UNITARIO'
                          ? 'bg-eno-800 text-white'
                          : 'text-tinta-2 hover:text-tinta'
                      }`}
                      title={modoObrigatorioForm === 'FARDO' ? 'Esta tabela vende só por caixa/fardo' : 'Lançar valores por Unidade ou Kg individual'}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Por Unitário / Kg</span>
                    </button>
                  </div>
                  {modoObrigatorioForm && (
                    <span className="block text-[10px] text-cinza mt-0.5">
                      Tabela vende só {modoObrigatorioForm === 'FARDO' ? 'por caixa/fardo' : 'por unidade'}
                    </span>
                  )}
                </div>
              </div>

              {/* Verificação se existem produtos cadastrados */}
              {modoCliente && (tabelasDisponiveis.length === 0 || (tabelaIdForm && produtosFiltradosPorTabela.length === 0)) && (
                <div className="p-3.5 bg-st-aguardando-bg border border-ouro rounded-md flex items-start gap-2.5 text-st-aguardando">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-st-aguardando" />
                  <span className="text-[12px] font-medium">
                    Sua tabela de preço ainda não está liberada para pedidos pelo portal. Fale com seu representante ou com a fábrica.
                  </span>
                </div>
              )}

              {produtosDisponiveis.length === 0 && !modoCliente && (
                <div className="p-3.5 bg-st-aguardando-bg border-2 border-ouro rounded-md space-y-2">
                  <div className="flex items-start gap-2.5">
                    <Package className="w-5 h-5 text-st-aguardando shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-st-aguardando text-xs">Nenhum Produto Cadastrado no Catálogo!</h4>
                      <p className="text-st-aguardando text-[11px] mt-0.5">
                        Não há produtos no catálogo da fábrica. Cadastre seus produtos acabados antes de formular orçamentos ou vendas.
                      </p>
                    </div>
                  </div>
                  <div className={`flex flex-wrap gap-2 pt-1 ${modoPortal ? 'hidden' : ''}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setModalNovo(false);
                        onNavigate?.('produtos_estoque_cadastro');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-ouro-escuro hover:bg-ouro-escuro text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Package className="w-3.5 h-3.5" />
                      <span>+ Cadastrar Produto no Estoque</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block font-bold text-tinta-2 mb-1">{modoCliente ? 'Cliente' : 'Cliente Solicitante *'}</label>
                  {modoCliente ? (
                    <div className="w-full bg-eno-50 border border-eno-100 rounded-lg px-3 py-2 text-eno-800 font-bold truncate" title={clientesDisponiveis[0]?.nome}>
                      {clientesDisponiveis[0]?.nome || 'Cadastro não encontrado'}
                    </div>
                  ) : clientesDisponiveis.length === 0 ? (
                    <div className="p-2.5 bg-st-aguardando-bg border border-ouro rounded-lg text-[11px] text-st-aguardando space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertCircle className="w-3.5 h-3.5 text-st-aguardando shrink-0" />
                        <span>{modoPortal ? 'Sua carteira não tem clientes ativos.' : 'Falta Cadastrar Cliente!'}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setModalNovo(false);
                            onNavigate?.('cadastro_clientes');
                          }}
                          className="px-2 py-1 rounded bg-ouro-escuro hover:bg-ouro-escuro text-white font-bold text-[10px] cursor-pointer"
                        >
                          {modoPortal ? '+ Adicionar em Meus Clientes' : '+ Cadastrar Cliente'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <select
                      value={clienteIdForm}
                      onChange={(e) => handleTrocarCliente(e.target.value)}
                      className="w-full bg-papel-2 border border-linha rounded-lg px-3 py-2 text-tinta font-medium focus:outline-none focus:border-eno-700 cursor-pointer"
                    >
                      {clientesDisponiveis.map(c => (
                        <option key={c.id} value={c.id}>{c.nome} ({c.cidade_uf})</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-tinta-2 mb-1">Tabela de Preço *</label>
                  {modoPortal ? (
                    // RCA e cliente: a tabela é a do cadastro do cliente, definida pela fábrica
                    tabelasDisponiveis.find(t => t.id === tabelaIdForm) ? (
                      <div className="w-full bg-papel-3/60 border border-linha rounded-lg px-3 py-2 text-tinta font-bold truncate" title="Tabela definida pela fábrica para este cliente">
                        {tabelasDisponiveis.find(t => t.id === tabelaIdForm)?.nome}
                      </div>
                    ) : (
                      <div className="w-full bg-st-aguardando-bg border border-ouro rounded-lg px-3 py-2 text-st-aguardando font-bold text-[11px]">
                        {clienteIdForm ? 'Cliente sem tabela liberada — a fábrica precisa definir a tabela de preço' : 'Escolha o cliente'}
                      </div>
                    )
                  ) : tabelasDisponiveis.length === 0 ? (
                    <div className="p-2.5 bg-st-aguardando-bg border border-ouro rounded-lg text-[11px] text-st-aguardando">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertCircle className="w-3.5 h-3.5 text-st-aguardando shrink-0" />
                        <span>Falta Cadastrar Tabela!</span>
                      </div>
                    </div>
                  ) : (
                    <select
                      value={tabelaIdForm}
                      onChange={(e) => handleTrocarTabela(e.target.value)}
                      className="w-full bg-papel-2 border border-linha rounded-lg px-3 py-2 font-bold text-tinta focus:outline-none focus:border-eno-700 cursor-pointer"
                    >
                      <option value="">-- Selecione a Tabela --</option>
                      {tabelasDisponiveis.map((tab) => (
                        <option key={tab.id} value={tab.id}>
                          {tab.nome} ({tab.codigo})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-tinta-2 mb-1">{modoCliente ? 'Seu representante' : 'RCA Responsável'}</label>
                  {modoPortal ? (
                    <div className="w-full bg-eno-50 border border-eno-100 rounded-lg px-3 py-2 text-eno-800 font-bold truncate">
                      {rcasDisponiveis[0]?.nome || (modoCliente ? 'Atendimento direto da fábrica' : 'Você')}
                    </div>
                  ) : (
                  <select
                    value={rcaIdForm}
                    onChange={(e) => setRcaIdForm(e.target.value)}
                    className="w-full bg-papel-2 border border-linha rounded-lg px-3 py-2 text-tinta font-medium focus:outline-none focus:border-eno-700 cursor-pointer"
                  >
                    <option value="">Venda Direta (sem RCA)</option>
                    {rcasDisponiveis.filter(r => r.ativo || r.id === rcaIdForm).map(r => (
                      <option key={r.id} value={r.id}>{r.nome}{r.regiao ? ` - ${r.regiao}` : ''}{r.ativo ? '' : ' (inativo)'}</option>
                    ))}
                  </select>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-tinta-2 mb-1">Tipo de Frete</label>
                  <select
                    value={tipoFreteForm}
                    onChange={(e) => setTipoFreteForm(e.target.value as any)}
                    className="w-full bg-papel-2 border border-linha rounded-lg px-3 py-2 text-tinta font-medium focus:outline-none focus:border-eno-700 cursor-pointer"
                  >
                    <option value="CIF (Entrega Grupo ENO)">CIF (Entrega Grupo ENO)</option>
                    <option value="FOB (Retira na Fábrica)">FOB (Retira na Fábrica)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-tinta-2 mb-1">Pagamento</label>
                  {modoCliente ? (
                    <div className="w-full bg-papel-3/60 border border-linha rounded-lg px-3 py-2 text-tinta font-bold truncate" title="Condição do seu cadastro">
                      {prazoPagamentoForm}
                    </div>
                  ) : (
                  <>
                  <div className="flex gap-2">
                    <select
                      value={formaPagamentoForm}
                      onChange={(e) => setFormaPagamentoForm(e.target.value)}
                      className="flex-1 min-w-0 bg-papel-2 border border-linha rounded-lg px-2 py-2 text-tinta font-medium focus:outline-none focus:border-eno-700 cursor-pointer"
                    >
                      {FORMAS_PAGAMENTO.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <div className="relative w-28 shrink-0">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={diasPagamentoForm}
                        onChange={(e) => setDiasPagamentoForm(e.target.value.replace(/[^\d/ ,]/g, ''))}
                        onBlur={(e) => setDiasPagamentoForm(normalizarDias(e.target.value))}
                        placeholder="28"
                        title="Dias para pagar. Parcelas: 28/35/42. Vazio = à vista."
                        className="w-full bg-papel-2 border border-linha rounded-lg pl-2.5 pr-9 py-2 font-bold tabular-nums text-tinta focus:outline-none focus:border-eno-700"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-cinza">dias</span>
                    </div>
                  </div>
                  <span className="block mt-1 text-[10px] text-cinza">{prazoPagamentoForm} · use "/" para parcelas</span>
                  </>
                  )}
                </div>
              </div>

              {/* Itens */}
              <div className="pt-2 border-t border-linha">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-bold text-cinza uppercase tracking-[0.12em] text-[10.5px]">
                    Itens da Venda ({modoLancamentoForm === 'FARDO' ? 'Preço e Qtd por Fardo/Embalagem' : 'Preço e Qtd por Unitário/Kg'})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="inline-flex items-center gap-1 h-10 sm:h-7 px-2.5 rounded-md text-eno-700 hover:bg-papel-3 font-bold cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Item</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {itensForm.length === 0 ? (
                    <div className="p-3 bg-papel-3/60 rounded-lg text-cinza text-center text-xs font-medium">
                      Nenhum item adicionado. Clique no botão acima para escolher produtos.
                    </div>
                  ) : (
                    itensForm.map((item, idx) => {
                      const prod = produtosDisponiveis.find(p => p.id === item.produtoId);
                      // Receita/custo são dados internos da fábrica: o RCA não vê esses avisos
                      const faltaReceita = !modoPortal && prod && !prod.receita_id;
                      const faltaCusto = !modoPortal && prod && (!prod.custo_total || prod.custo_total <= 0);
                      const comissaoItem = comissaoForm.itens[idx];
                      const estoqueItem = item.produtoId ? faltaEstoquePorProduto.get(item.produtoId) : undefined;

                      return (
                        <div key={idx} className="p-3 bg-papel-2 rounded-md border border-linha space-y-2">
                          {item.produtoId && (
                            <div className="text-[11.5px] font-semibold text-tinta-2 tabular-nums">
                              Peso deste item: <span className="text-tinta">{pesoItemFormulario(item, produtosDisponiveis).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg</span>
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
                            <div className="col-span-2 sm:flex-1 sm:min-w-[200px]">
                              <select
                                value={item.produtoId}
                                onChange={(e) => {
                                  const newProd = produtosFiltradosPorTabela.find(p => p.id === e.target.value);
                                  const updated = [...itensForm];
                                  updated[idx].produtoId = e.target.value;
                                  if (newProd) {
                                    updated[idx].tipoEmbalagem = tipoEmbalagemDoProduto(newProd);
                                    updated[idx].unidadesPorFardo = fatorItem(newProd.unidades_por_fardo);
                                    const opcoes = opcoesVendaItem(fatorItem(newProd.unidades_por_fardo), newProd.tipo_acondicionamento);
                                    const modoNovo = opcoes.find(o => o.modo === modoItem(updated[idx]))?.modo || opcoes[0]?.modo || modoLancamentoForm;
                                    updated[idx].modo = modoNovo;
                                    updated[idx].precoUnitario = precoNoModo(newProd, modoNovo);
                                  }
                                  setItensForm(updated);
                                }}
                                className="w-full bg-papel border border-linha rounded px-2 py-1 text-xs cursor-pointer font-medium"
                              >
                                <option value="">-- Selecione o Produto --</option>
                                {produtosFiltradosPorTabela.map(p => (
                                  <option key={p.id} value={p.id}>
                                    {p.nome} ({p.tipo_embalagem || 'Un'})
                                  </option>
                                ))}
                              </select>
                            </div>

                            {(() => {
                              // Só o que a tabela permite: caixa/fardo do produto, unidade, ou os dois
                              const opcoes = opcoesVendaItem(fatorItem(item.unidadesPorFardo), prod?.tipo_acondicionamento);
                              const atual = modoItem(item);
                              return (
                                <div className="col-span-2 sm:col-span-1 sm:w-40">
                                  <label className="text-[10px] text-cinza block -mb-0.5">Vender por</label>
                                  <select
                                    value={atual}
                                    onChange={(e) => {
                                      const novo = e.target.value as 'FARDO' | 'UNITARIO';
                                      const updated = [...itensForm];
                                      updated[idx] = converterItemParaModo(updated[idx], novo);
                                      setItensForm(updated);
                                    }}
                                    disabled={opcoes.length < 2}
                                    className="w-full bg-papel border border-linha rounded px-2 py-1 text-xs cursor-pointer font-semibold text-tinta-2 disabled:bg-papel-3/60 disabled:cursor-default"
                                    title={opcoes.length < 2 ? 'A tabela de preço vende este produto só desta forma' : 'Caixa/fardo ou unidade'}
                                  >
                                    {opcoes.map(o => <option key={o.modo} value={o.modo}>{o.rotulo}</option>)}
                                  </select>
                                </div>
                              );
                            })()}

                            <div className="sm:w-24">
                              <label className="text-[10px] text-cinza block -mb-0.5">
                                {modoItem(item) === 'FARDO' ? 'Qtd (Caixas)' : 'Qtd (Unid.)'}
                              </label>
                              <CampoNumero
                                inteiro
                                min={0}
                                value={item.quantidade}
                                aria-label="Quantidade do item"
                                onChange={(n) => {
                                  const updated = [...itensForm];
                                  updated[idx] = { ...updated[idx], quantidade: Math.max(0, n) };
                                  setItensForm(updated);
                                }}
                                className="w-full bg-papel border border-linha rounded px-2 py-1 text-center font-bold"
                              />
                            </div>

                            <div className="sm:w-28">
                              <label className="text-[10px] text-cinza block -mb-0.5">
                                {modoItem(item) === 'FARDO' ? 'Preço Caixa' : 'Preço Unitário'}
                              </label>
                              <CampoNumero
                                step="0.01"
                                min={0}
                                casas={2}
                                value={item.precoUnitario}
                                readOnly={modoCliente}
                                aria-label="Preço do item"
                                onChange={(n) => {
                                  if (modoCliente) return;
                                  const updated = [...itensForm];
                                  updated[idx] = { ...updated[idx], precoUnitario: n };
                                  setItensForm(updated);
                                }}
                                className={`w-full border border-linha rounded px-2 py-1 text-center tabular-nums font-bold ${modoCliente ? 'bg-papel-3/60 text-tinta-2' : 'bg-papel'}`}
                              />
                            </div>

                            <div className="sm:w-32 sm:text-right tabular-nums font-bold text-tinta max-sm:text-[15px] max-sm:self-center">
                              {(item.quantidade * item.precoUnitario).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              {rcaIdForm && comissaoItem && !modoCliente && (
                                <div className="text-[10px] font-sans font-medium text-st-producao" title={`Regra aplicada: ${comissaoItem.regra}${comissaoItem.grupo ? ` • Grupo: ${comissaoItem.grupo}` : ''}`}>
                                  Comissão {comissaoItem.percentual}% • {formatarMoeda(comissaoItem.valor)}
                                  <span className="block text-st-producao">{rotuloRegraComissao(comissaoItem.regra)}</span>
                                </div>
                              )}
                            </div>

                            {itensForm.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="justify-self-end inline-flex items-center justify-center w-10 h-10 sm:w-7 sm:h-7 rounded-md hover:text-st-vencido hover:bg-st-vencido-bg text-cinza transition-colors cursor-pointer"
                                aria-label="Remover item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* ESTOQUE: avisa quanto falta (não bloqueia a venda) */}
                          {!modoCliente && estoqueItem && estoqueItem.falta > 0 && (
                            <div className="p-2 bg-st-vencido-bg border border-st-vencido/30 rounded-md text-[11px] text-st-vencido flex items-center gap-1.5 font-medium">
                              <AlertCircle className="w-3.5 h-3.5 text-st-vencido shrink-0" />
                              <span>
                                <strong>Estoque não cobre:</strong> pedido {estoqueItem.pedido.toLocaleString('pt-BR')} pacotes • em estoque {estoqueItem.disponivel.toLocaleString('pt-BR')} • <strong>faltam {estoqueItem.falta.toLocaleString('pt-BR')} pacotes</strong>. Você pode seguir; a diferença precisará ser produzida.
                              </span>
                            </div>
                          )}

                          {/* AVISOS ESPECÍFICOS DE FALTA DE RECEITA E DE FALTA DE CUSTO */}
                          {faltaReceita && (
                            <div className="p-2 bg-st-aguardando-bg/90 border border-ouro rounded-md text-[11px] text-st-aguardando flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 font-medium">
                                <AlertCircle className="w-3.5 h-3.5 text-st-aguardando shrink-0" />
                                <span>
                                  <strong>Sem Receita / Ficha Técnica:</strong> Este produto não tem fórmula de matéria-prima vinculada. A fábrica não saberá quais insumos baixar do estoque ao produzir.
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setModalNovo(false);
                                  onNavigate?.('produtos_receita');
                                }}
                                className="px-2 py-0.5 rounded bg-ouro-escuro hover:bg-ouro-escuro text-white font-bold text-[10px] cursor-pointer transition-colors shadow-2xs"
                              >
                                Configurar Receita
                              </button>
                            </div>
                          )}

                          {faltaCusto && (
                            <div className="p-2 bg-st-aguardando-bg/90 border border-ouro rounded-md text-[11px] text-st-aguardando flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 font-medium">
                                <AlertCircle className="w-3.5 h-3.5 text-st-aguardando shrink-0" />
                                <span>
                                  <strong>Sem Custo de Produção:</strong> Custo industrial não apurado (vincule uma receita com matérias-primas e informe o custo operacional no cadastro do produto). O produto pode ser orçado pelo preço informado, mas o CMV e a margem bruta ficarão zerados.
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setModalNovo(false);
                                  onNavigate?.('produtos_estoque_cadastro');
                                }}
                                className="px-2 py-0.5 rounded bg-ouro-escuro hover:bg-ouro-escuro text-white font-bold text-[10px] cursor-pointer transition-colors shadow-2xs"
                              >
                                Ver Custo no Produto
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* DIAGNÓSTICO E CHECKLIST DA VENDA */}
              {(() => {
                const temAlgumaFaltaReceita = itensForm.some(it => {
                  const p = produtosDisponiveis.find(x => x.id === it.produtoId);
                  return p && !p.receita_id;
                });
                const temAlgumaFaltaCusto = itensForm.some(it => {
                  const p = produtosDisponiveis.find(x => x.id === it.produtoId);
                  return p && (!p.custo_total || p.custo_total <= 0);
                });

                let temFaltaEstoque = false;
                faltaEstoquePorProduto.forEach(v => { if (v.falta > 0) temFaltaEstoque = true; });

                return (
                  <>
                  {rcaIdForm && itensForm.length > 0 && !modoCliente && (
                    <div className="p-3 bg-st-producao-bg border border-st-producao/30 rounded-md flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-st-producao">
                        Comissão estimada do RCA ({rotuloRegraComissao(comissaoForm.regra)}):
                      </span>
                      <span className="tabular-nums font-extrabold text-st-producao">
                        {formatarMoeda(comissaoForm.valor)}
                        <span className="font-sans font-medium text-st-producao ml-1">({comissaoForm.percentual_efetivo}% efetivo sobre {formatarMoeda(comissaoForm.base)})</span>
                      </span>
                      <span className="w-full text-[10px] text-st-producao">Vira conta a pagar ao RCA quando o pedido for faturado (base = valor faturado).</span>
                    </div>
                  )}
                  <div className="p-3 bg-eno-900 text-cinza-claro rounded-md flex flex-wrap items-center justify-between gap-2 text-xs border border-eno-800">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-bold text-white uppercase text-[10px] tracking-wider">Status do Pedido:</span>
                      <span className={clienteIdForm ? 'text-ouro-claro font-bold' : 'text-st-vencido font-bold'}>
                        {clienteIdForm ? '✓ Cliente OK' : 'Falta Cliente'}
                      </span>
                      {!modoPortal && (
                      <span className={temAlgumaFaltaReceita ? 'text-st-aguardando font-bold' : 'text-ouro-claro font-bold'}>
                        {temAlgumaFaltaReceita ? 'Receita Pendente' : '✓ Receita OK'}
                      </span>
                      )}
                      {!modoPortal && (
                      <span className={temAlgumaFaltaCusto ? 'text-st-aguardando font-bold' : 'text-ouro-claro font-bold'}>
                        {temAlgumaFaltaCusto ? 'Custo Pendente' : '✓ Custo OK'}
                      </span>
                      )}
                      {!modoCliente && (
                      <span className={temFaltaEstoque ? 'text-st-vencido font-bold' : 'text-ouro-claro font-bold'}>
                        {temFaltaEstoque ? 'Estoque Insuficiente' : '✓ Estoque OK'}
                      </span>
                      )}
                      {modoCliente && (
                        <span className={itensForm.length > 0 ? 'text-ouro-claro font-bold' : 'text-st-aguardando font-bold'}>
                          {itensForm.length > 0 ? `✓ ${itensForm.length} ${itensForm.length === 1 ? 'item' : 'itens'}` : 'Adicione itens'}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-cinza italic">
                      {modoPortal
                        ? 'Ao salvar, o pedido fica aguardando a aprovação da fábrica.'
                        : temAlgumaFaltaReceita || temAlgumaFaltaCusto
                        ? 'Você pode salvar como orçamento. O sistema emitirá alertas quando enviado para produção.'
                        : 'Apuração comercial e técnica completa!'}
                    </p>
                  </div>
                  </>
                );
              })()}

              <div>
                <label className="block font-bold text-tinta-2 mb-1">{modoCliente ? 'Observações (entrega, horário, contato...)' : 'Observações da Proposta Comercial'}</label>
                <textarea
                  rows={2}
                  value={observacoesForm}
                  onChange={(e) => setObservacoesForm(e.target.value)}
                  placeholder="Ex: Tabela especial negociada, frete CIF programado para entrega semanal..."
                  className="w-full bg-papel-2 border border-linha rounded-lg p-2.5 text-tinta font-medium focus:outline-none focus:border-eno-700"
                />
              </div>

              <div className="pt-3 border-t border-linha flex flex-wrap items-center justify-end gap-2 max-sm:sticky max-sm:-bottom-4 max-sm:z-10 max-sm:-mx-4 max-sm:-mb-4 max-sm:px-4 max-sm:pb-4 max-sm:bg-papel max-sm:[&>button]:flex-1 max-sm:[&>button]:justify-center max-sm:[&>button]:min-h-11">
                <div className="mr-auto max-sm:w-full">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-cinza">Peso total</span>
                  <span className="block text-base font-extrabold tracking-tight tabular-nums text-tinta">
                    {itensForm.reduce((acc, it) => acc + pesoItemFormulario(it, produtosDisponiveis), 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg
                  </span>
                </div>
                {modoCliente && (
                  <div className="mr-auto max-sm:w-full">
                    <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-cinza">Total do pedido</span>
                    <span className="block text-xl font-extrabold tracking-tight tabular-nums text-eno-800">
                      {formatarMoeda(itensForm.reduce((acc, it) => acc + (Number(it.quantidade) || 0) * (Number(it.precoUnitario) || 0), 0))}
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setModalNovo(false)}
                  className="px-4 py-2 rounded-lg bg-papel-3/60 hover:bg-linha text-tinta-2 font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-eno-900 hover:bg-eno-950 text-white font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>{modoCliente ? (pedidoEmEdicao ? 'Salvar alterações' : 'Enviar pedido') : modoPortal ? `Enviar ${subtipoForm} p/ aprovação` : `Salvar ${subtipoForm}`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL VISUALIZADOR DE DOCUMENTO COMERCIAL (PRÉVIA OFICIAL ANTES DE EXPORTAR) */}
      {modalDetalhes && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 backdrop-blur-xs p-0 sm:p-6 flex justify-center items-stretch sm:items-start animate-fadeIn">
          <div className="min-w-0 max-sm:[&_input:not([type=checkbox]):not([type=radio]):not([type=file])]:min-h-11 max-sm:[&_input]:text-base max-sm:[&_select]:min-h-11 max-sm:[&_select]:text-base max-sm:[&_textarea]:text-base relative w-full max-w-6xl xl:max-w-7xl bg-eno-900 rounded-none sm:rounded-md shadow-2xl overflow-hidden border-0 sm:border border-eno-800 flex flex-col sm:my-auto h-[100dvh] sm:h-[calc(100vh-2.5rem)]">
            
            {/* 1. TOPO: TÍTULO DO VISUALIZADOR E CONTROLES DE ZOOM */}
            <div className="bg-eno-900 text-white px-4 sm:px-5 py-2 sm:py-3 flex items-center justify-between gap-3 border-b border-eno-800 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="min-w-0">
                  <h3 className="font-extrabold text-sm text-white truncate">
                    {modalDetalhes.numero_pedido} <span className="font-normal text-eno-100/70">· prévia do documento</span>
                  </h3>
                  <p className="text-[11px] text-eno-100/70 max-sm:hidden">
                    Confira a formatação da folha, cabeçalhos, produtos e totais antes de exportar em PDF ou PNG.
                  </p>
                </div>
              </div>

              {/* Zoom fica no próprio visualizador de PDF (Ctrl + roda do mouse) */}
              <div className="flex items-center gap-2">

                <button
                  onClick={() => setModalDetalhes(null)}
                  className="inline-flex items-center justify-center w-10 h-10 -mr-2 shrink-0 rounded-md hover:bg-eno-800 text-eno-100 hover:text-white transition-colors cursor-pointer"
                  title="Fechar visualizador"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 2. BARRA DE CONFIGURAÇÃO RÁPIDA: NOME DO DOCUMENTO & FARDO/UNITÁRIO */}
            <div className="bg-eno-900 px-4 sm:px-5 py-2.5 flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-2 sm:gap-3 border-b border-eno-800 shrink-0 text-xs">
              
              {/* Escolha do Nome do Documento */}
              <div className={`flex-wrap items-center gap-2 ${modoCliente ? 'hidden' : 'flex'}`}>
                <span className="font-bold text-[10.5px] uppercase tracking-[0.12em] text-eno-100/70 max-sm:w-full">
                  Nome do Documento:
                </span>
                <div className="flex sm:inline-flex w-full sm:w-auto rounded-md bg-eno-950/60 p-0.5 max-sm:[&>button]:flex-1 max-sm:[&>button]:justify-center max-sm:[&>button]:min-h-10">
                  <button
                    type="button"
                    onClick={() => setTipoDocumentoVisualizacao('Orçamento')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      tipoDocumentoVisualizacao === 'Orçamento'
                        ? 'bg-eno-700 text-white'
                        : 'text-eno-100/80 hover:text-white'
                    }`}
                  >
                    Orçamento
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoDocumentoVisualizacao('Pedido Sugestivo')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      tipoDocumentoVisualizacao === 'Pedido Sugestivo'
                        ? 'bg-eno-700 text-white'
                        : 'text-eno-100/80 hover:text-white'
                    }`}
                  >
                    Pedido Sugestivo
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoDocumentoVisualizacao('Pedido')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      tipoDocumentoVisualizacao === 'Pedido'
                        ? 'bg-eno-700 text-white'
                        : 'text-eno-100/80 hover:text-white'
                    }`}
                  >
                    Pedido de Venda
                  </button>
                </div>
              </div>

              {/* Escolha de Unitário vs Fardo */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-[10.5px] uppercase tracking-[0.12em] text-eno-100/70 max-sm:w-full">
                  Tabela de Valores:
                </span>
                <div className="flex sm:inline-flex w-full sm:w-auto rounded-md bg-eno-950/60 p-0.5 max-sm:[&>button]:flex-1 max-sm:[&>button]:justify-center max-sm:[&>button]:min-h-10">
                  <button
                    type="button"
                    onClick={() => setModoExibicao('FARDO')}
                    disabled={modoObrigatorioDocumento === 'UNITARIO'}
                    className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-30 ${
                      modoExibicao === 'FARDO'
                        ? 'bg-eno-700 text-white'
                        : 'text-eno-100/80 hover:text-white'
                    }`}
                    title="Exibir quantidades e preços calculados por Fardo / Embalagem agrupada"
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>Modo Fardo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoExibicao('UNITARIO')}
                    disabled={modoObrigatorioDocumento === 'FARDO'}
                    className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-30 ${
                      modoExibicao === 'UNITARIO'
                        ? 'bg-eno-700 text-white'
                        : 'text-eno-100/80 hover:text-white'
                    }`}
                    title="Exibir quantidades e preços calculados por Unidade / Kg individual"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Modo Unitário</span>
                  </button>
                </div>
              </div>

            </div>

            {/* 3. PRÉVIA A4: é o próprio PDF que será baixado */}
            <div className="flex-1 min-h-0 bg-eno-800/80 p-2 sm:p-4 flex">
              {pdfPreviewUrl ? (
                <iframe
                  src={`${pdfPreviewUrl}#zoom=page-fit&navpanes=0`}
                  title="Prévia A4 do documento"
                  className="flex-1 w-full rounded-md bg-papel"
                />
              ) : (
                <div className="flex-1 flex items-center justify-center text-cinza-claro text-xs font-bold">
                  Gerando prévia A4...
                </div>
              )}
            </div>

            {/* Folha de origem do PDF (fora da tela, largura de A4 = 794px) */}
            <div aria-hidden="true" style={{ position: 'fixed', left: '-10000px', top: 0, pointerEvents: 'none' }}>
              <div>
                <div
                  ref={printRef}
                  className="w-[794px] bg-[#fbfaf5] text-[#171e1a] font-sans overflow-hidden text-xs"
                >
                  <FaixaMarcaEno
                    rotulo={
                      tipoDocumentoVisualizacao === 'Orçamento'
                        ? 'Orçamento Comercial'
                        : tipoDocumentoVisualizacao === 'Pedido Sugestivo'
                        ? 'Pedido Sugestivo'
                        : 'Pedido de Venda'
                    }
                    titulo={`Nº ${modalDetalhes.numero_pedido}`}
                    subtitulo={
                      <>
                        Emissão {formatarDataBR(modalDetalhes.data_emissao)}
                        {modalDetalhes.data_validade_orcamento && ` · Validade ${formatarDataBR(modalDetalhes.data_validade_orcamento)}`}
                        {modalDetalhes.data_previsao_entrega && tipoDocumentoVisualizacao !== 'Orçamento' && ` · Entrega prevista ${formatarDataBR(modalDetalhes.data_previsao_entrega)}`}
                      </>
                    }
                  />

                  {/* Cliente e condições */}
                  <div className="grid grid-cols-1 sm:grid-cols-[1.5fr_1fr_1fr] px-6 sm:px-8 py-4 gap-y-3 border-b border-[#e6e1d2]">
                    <div className="pr-4">
                      <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#6e7470]">Cliente</div>
                      <div className="text-[15px] font-extrabold text-[#171e1a] mt-0.5 leading-snug">{modalDetalhes.cliente_nome}</div>
                      <div className="text-[11px] text-[#6e7470] mt-0.5 tabular-nums">
                        {[modalDetalhes.cliente_cnpj_cpf && `CNPJ/CPF ${modalDetalhes.cliente_cnpj_cpf}`, modalDetalhes.cliente_cidade_uf].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <div className="sm:pl-4 sm:border-l sm:border-[#ddd6c4] space-y-2">
                      <div>
                        <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#6e7470]">Pagamento</div>
                        <div className="text-[12px] font-bold mt-0.5">
                          {/* prazo_pagamento já traz a forma ("Boleto Bancário 28 dias"): não repete */}
                          {(modalDetalhes.forma_pagamento && String(modalDetalhes.prazo_pagamento || '').toLowerCase().includes(modalDetalhes.forma_pagamento.toLowerCase())
                            ? modalDetalhes.prazo_pagamento
                            : [modalDetalhes.forma_pagamento, modalDetalhes.prazo_pagamento].filter(Boolean).join(' · ')) || '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#6e7470]">Frete</div>
                        <div className="text-[12px] font-bold mt-0.5">{modalDetalhes.tipo_frete || '-'}</div>
                      </div>
                    </div>
                    <div className="sm:pl-4 sm:border-l sm:border-[#ddd6c4] space-y-2">
                      <div>
                        <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#6e7470]">Representante</div>
                        <div className="text-[12px] font-bold mt-0.5">{modalDetalhes.rca_nome || 'Venda direta'}</div>
                      </div>
                      <div>
                        <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#6e7470]">Valores em</div>
                        <div className="text-[12px] font-bold mt-0.5">{modoExibicao === 'FARDO' ? 'Caixa / Fardo' : 'Unidade'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Itens */}
                  <div className="px-4 sm:px-8 pt-5">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#0b3d24] text-white text-[10px] font-bold uppercase tracking-[0.12em]">
                          <th className="py-2.5 pl-4 pr-3 rounded-l-md">Produto</th>
                          <th className="py-2.5 px-3">Embalagem</th>
                          <th className="py-2.5 px-3 text-right">Qtd</th>
                          <th className="py-2.5 px-3 text-right">Peso (kg)</th>
                          <th className="py-2.5 px-3 text-right">{modoExibicao === 'FARDO' ? 'Preço cx/fardo' : 'Preço unit.'}</th>
                          <th className="py-2.5 pl-3 pr-4 text-right rounded-r-md">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {modalDetalhes.itens.map((it, idx) => {
                          const valores = calcularValoresItem(it, modoExibicao);
                          return (
                            <tr key={idx} className={`border-b border-[#e6e1d2] ${idx % 2 === 1 ? 'bg-[#f6f3ea]' : ''}`}>
                              <td className="py-2.5 pl-4 pr-3">
                                <div className="flex items-center gap-2.5">
                                  {comFotoDoc && (
                                    <img
                                      src={produtosDisponiveis.find(p => p.id === it.produto_id)?.foto || ''}
                                      alt=""
                                      className="w-11 h-11 rounded object-cover border border-[#e6e1d2] shrink-0"
                                      style={{ visibility: produtosDisponiveis.find(p => p.id === it.produto_id)?.foto ? 'visible' : 'hidden' }}
                                    />
                                  )}
                                  <div className="text-[13px] font-bold">{it.produto_nome}</div>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-[11px] text-[#6e7470]">{valores.apresentacao}</td>
                              <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                <span className="text-[13px] font-extrabold tabular-nums">{valores.quantidade.toLocaleString('pt-BR')}</span>
                                <span className="text-[10px] text-[#6e7470] ml-1">{valores.unidadeRotulo}</span>
                              </td>
                              <td className="py-2.5 px-3 text-right text-[12px] tabular-nums whitespace-nowrap">
                                {(Number(it.peso_total_kg) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                              </td>
                              <td className="py-2.5 px-3 text-right text-[12px] tabular-nums whitespace-nowrap">
                                {formatarMoeda(valores.preco)}
                              </td>
                              <td className="py-2.5 pl-3 pr-4 text-right text-[14px] font-extrabold tabular-nums text-[#064e3b] whitespace-nowrap">
                                {formatarMoeda(valores.subtotal)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Observações (logo após os itens) */}
                  {modalDetalhes.observacoes && (
                    <div className="px-6 sm:px-8 pt-4">
                      <div className="w-10 h-[2px] bg-[#c9a24a] mb-2" />
                      <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#064e3b] mb-1">Observações</div>
                      <p className="text-[11px] leading-relaxed whitespace-pre-line">{modalDetalhes.observacoes}</p>
                    </div>
                  )}

                  {/* Fechamento: peso, valor total, assinaturas e rodapé — no PDF vai sempre ao pé da última página */}
                  <div data-pdf-final>
                  {/* Totais */}
                  <div className="px-4 sm:px-8 pt-4 pb-5 flex flex-col sm:flex-row sm:items-stretch justify-between gap-3">
                    <div className="flex items-center gap-6 px-4 py-3 bg-[#f3ead3] border-l-[3px] border-[#c9a24a]">
                      <div>
                        <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#6e7470]">Itens</div>
                        <div className="text-[15px] font-extrabold tabular-nums">{modalDetalhes.itens.length}</div>
                      </div>
                      <div>
                        <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#6e7470]">Peso total</div>
                        <div className="text-[15px] font-extrabold tabular-nums">
                          {modalDetalhes.peso_total_kg.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg
                        </div>
                      </div>
                    </div>
                    <div className="relative px-5 py-3 rounded-md bg-[linear-gradient(100deg,#042013,#0b3d24)] text-right overflow-hidden min-w-[230px]">
                      <div className="absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,#9c7a2e,#e2c27a,#9c7a2e)]" />
                      <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#c9a24a]">Valor total</div>
                      <div className="text-[26px] font-extrabold tracking-tight tabular-nums text-white leading-tight">
                        {formatarMoeda(modalDetalhes.valor_total)}
                      </div>
                    </div>
                  </div>

                  {/* Assinaturas */}
                  <div className="px-6 sm:px-8 pt-8 pb-5 grid grid-cols-2 gap-10 text-center text-[10px] text-[#6e7470]">
                    <div>
                      <div className="border-t border-[#171e1a]/40 pt-1.5 font-bold text-[#171e1a] text-[11px]">{modalDetalhes.cliente_nome}</div>
                      <span>De acordo do cliente</span>
                    </div>
                    <div>
                      <div className="border-t border-[#171e1a]/40 pt-1.5 font-bold text-[#171e1a] text-[11px]">{modalDetalhes.rca_nome || EMPRESA.razao}</div>
                      <span>Aprovação comercial · {EMPRESA.razao}</span>
                    </div>
                  </div>

                  <div className="px-6 sm:px-8 py-3 border-t border-[#ddd6c4] flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#6e7470]">
                    <span>{EMPRESA.razao} · Documento comercial nº {modalDetalhes.numero_pedido}</span>
                    <span className="tabular-nums">Gerado em {new Date().toLocaleDateString('pt-BR')}</span>
                  </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. BARRA DE EXPORTAÇÃO INFERIOR */}
            <div className="p-3 sm:p-3.5 bg-eno-900 border-t border-eno-800 flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-2 sm:gap-3 shrink-0">
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 max-sm:[&>button]:min-h-10 max-sm:[&>button]:justify-center">
                {/* Com ou sem foto dos produtos no documento */}
                <button
                  onClick={() => setComFotoDoc(v => !v)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-white/25 text-white font-bold text-xs transition-colors cursor-pointer hover:bg-white/10"
                  title="Incluir ou tirar a foto dos produtos no documento"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>{comFotoDoc ? 'Sem foto' : 'Com foto'}</span>
                </button>

                {/* Exportar PNG */}
                <button
                  onClick={() => exportarPNG(modalDetalhes)}
                  disabled={gerandoExportacao}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-eno-800 hover:bg-eno-700 text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                  title="Exportar imagem PNG de alta resolução para enviar no WhatsApp"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>{gerandoExportacao ? 'Gerando...' : 'PNG (WhatsApp)'}</span>
                </button>

                {/* Exportar PDF */}
                <button
                  onClick={() => exportarPDF(modalDetalhes)}
                  disabled={gerandoExportacao}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-eno-800 hover:bg-eno-700 text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                  title="Exportar documento PDF oficial formatado em folha A4"
                >
                  <FileDown className="w-4 h-4" />
                  <span>{gerandoExportacao ? 'Gerando...' : 'PDF (A4)'}</span>
                </button>

                {/* Exportar Excel */}
                <button
                  onClick={() => exportarExcel(modalDetalhes)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-eno-800 hover:bg-eno-700 text-white font-bold text-xs transition-colors cursor-pointer"
                  title="Exportar planilha formatada para Excel (.csv)"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Excel</span>
                </button>

                {/* Imprimir */}
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-eno-800 hover:bg-eno-700 text-white font-bold text-xs transition-colors cursor-pointer"
                  title="Imprimir documento"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir</span>
                </button>
              </div>

              {/* Botão de Enviar Direto para Em Produção (só admin, só etapa de vendas) */}
              {modoPortal ? (
                <span className={`px-3 py-1.5 rounded-md text-xs font-bold border text-center ${COR_ETAPA[modalDetalhes.etapa]}`}>
                  {ROTULO_ETAPA[modalDetalhes.etapa]}
                </span>
              ) : (
              <button
                onClick={() => {
                  handleAprovarParaProducao(modalDetalhes.id, modalDetalhes.numero_pedido);
                  setModalDetalhes(null);
                }}
                className="flex items-center justify-center gap-1.5 px-4 py-2 max-sm:min-h-11 rounded-md bg-ouro hover:bg-ouro-claro text-eno-950 font-extrabold text-xs cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-white"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Aprovar e mandar para produção</span>
              </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
