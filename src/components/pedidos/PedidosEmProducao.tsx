import React, { useState, useEffect, useMemo } from 'react';
import {
  Factory,
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  Package,
  Layers,
  HardHat,
  Eye,
  AlertCircle,
  X,
  Printer,
  Sparkles,
  ShieldCheck,
  Check,
  Plus,
  Calendar,
  CalendarDays,
  Tag,
  AlertTriangle,
  Lock,
  Trash2,
  TrendingUp,
  FileCheck
} from 'lucide-react';
import {
  PedidoVenda,
  ApontamentoProducao,
  carregarPedidosVenda,
  salvarPedidosVenda,
  moverPedidoEtapa
} from '../../data/pedidosVendaData';
import { pesoDoItemKg, pacotesDoItem } from '../../data/pedidosVendaData';
import { PedidosNavTabs } from './PedidosNavTabs';
import {
  OrdemProducao,
  EVENTO_OPS,
  carregarOrdensProducao,
  ordensDoPedido,
  sincronizarOrdensComPedido,
  garantirOrdensDosPedidosEmProducao
} from '../../data/ordensProducaoData';
import { calcularConsumoProducao, ConsumoMateriaPrimaProducao } from '../../data/pipelineIntegrado';
import { TabelaMateriaPrimaOP } from '../producao/OrdensProducaoPainel';

// MP necessária para o que falta produzir no pedido (consolidada por matéria-prima)
function necessidadeRestantePedido(p: PedidoVenda): ConsumoMateriaPrimaProducao[] {
  const mapa = new Map<string, ConsumoMateriaPrimaProducao>();
  p.itens.forEach(it => {
    const restante = Math.max(0, pacotesDoItem(it) - pacotesDoItem(it, Number(it.quantidade_produzida) || 0));
    if (restante <= 0) return;
    calcularConsumoProducao(it.produto_id, restante, { produtoNome: it.produto_nome, pesoUnitarioKg: it.peso_unitario_kg }).forEach(c => {
      const ac = mapa.get(c.materia_prima_id);
      if (!ac) mapa.set(c.materia_prima_id, { ...c });
      else ac.quantidade_necessaria = parseFloat((ac.quantidade_necessaria + c.quantidade_necessaria).toFixed(4));
    });
  });
  return Array.from(mapa.values()).map(c => ({ ...c, falta: Math.max(0, parseFloat((c.quantidade_necessaria - c.estoque_atual).toFixed(4))) }));
}

interface Props {
  onNavigate?: (tabId: string) => void;
}

export function PedidosEmProducao({ onNavigate }: Props) {
  const [pedidos, setPedidos] = useState<PedidoVenda[]>([]);
  const [busca, setBusca] = useState('');
  
  // Modal de Acompanhamento e Apontamento por Produto
  const [modalProducao, setModalProducao] = useState<PedidoVenda | null>(null);
  
  // Modal de Bloqueio / Exigência Obrigatória de Lote e Vencimento
  const [modalBloqueioLote, setModalBloqueioLote] = useState<PedidoVenda | null>(null);

  // Form de Apontamento por Produto
  const [produtoSelecionadoId, setProdutoSelecionadoId] = useState<string>('');
  const [qtdEmbalagensInput, setQtdEmbalagensInput] = useState<string>('');
  const [dataApontamento, setDataApontamento] = useState(new Date().toLocaleDateString('pt-BR'));
  const [operadorTurno, setOperadorTurno] = useState('Turno A (Manhã) - Carlos Ferreira');
  const [observacaoApontamento, setObservacaoApontamento] = useState('');

  // Rastreabilidade Obrigatória
  const [loteInput, setLoteInput] = useState('');
  const [dataFabricacaoInput, setDataFabricacaoInput] = useState('');
  const [dataVencimentoInput, setDataVencimentoInput] = useState('');

  const [ordens, setOrdens] = useState<OrdemProducao[]>([]);
  const [versaoEstoque, setVersaoEstoque] = useState(0);

  const recarregar = () => {
    const todos = carregarPedidosVenda();
    setPedidos(todos.filter(p => p.etapa === 'EM_PRODUCAO'));
    setOrdens(carregarOrdensProducao());
    setVersaoEstoque(v => v + 1);
  };

  useEffect(() => {
    try {
      garantirOrdensDosPedidosEmProducao();
    } catch (e) {
      console.error('Erro ao gerar OPs dos pedidos em produção:', e);
    }
    recarregar();
    const handleUpdate = () => recarregar();
    window.addEventListener('pedidos_venda_updated', handleUpdate);
    window.addEventListener(EVENTO_OPS, handleUpdate);
    window.addEventListener('produtos_updated', handleUpdate);
    return () => {
      window.removeEventListener('pedidos_venda_updated', handleUpdate);
      window.removeEventListener(EVENTO_OPS, handleUpdate);
      window.removeEventListener('produtos_updated', handleUpdate);
    };
  }, []);

  // OP de cada item do pedido (índice do item -> OP do ciclo atual)
  const opDoItem = (pedidoId: string, idx: number) => ordensDoPedido(pedidoId, ordens).find(o => o.item_index === idx);

  // Pedidos com falta de matéria-prima para o que ainda falta produzir
  const faltaMpPorPedido = useMemo(() => {
    const mapa = new Map<string, ConsumoMateriaPrimaProducao[]>();
    pedidos.forEach(p => mapa.set(p.id, necessidadeRestantePedido(p)));
    return mapa;
  }, [pedidos, versaoEstoque]);

  // Abrir Modal de Apontamento por Produto (com opção de escolher produto inicial)
  const handleAbrirProducao = (p: PedidoVenda, produtoIdInicial?: string) => {
    setModalProducao(p);
    setLoteInput(p.lote_producao || `LOT-${new Date().getFullYear()}-${p.numero_pedido.replace(/\D/g, '')}`);
    const hoje = new Date();
    setDataFabricacaoInput(p.data_fabricacao || hoje.toLocaleDateString('pt-BR'));
    hoje.setFullYear(hoje.getFullYear() + 2); // 2 anos de validade padrão
    setDataVencimentoInput(p.data_vencimento || hoje.toLocaleDateString('pt-BR'));
    setDataApontamento(new Date().toLocaleDateString('pt-BR'));
    setQtdEmbalagensInput('');
    setObservacaoApontamento('');

    if (produtoIdInicial) {
      setProdutoSelecionadoId(produtoIdInicial);
    } else {
      // Seleciona o primeiro produto do pedido que ainda não esteja 100% concluído
      const itemPendente = p.itens.find(i => (i.quantidade_produzida || 0) < i.quantidade) || p.itens[0];
      if (itemPendente) {
        setProdutoSelecionadoId(itemPendente.produto_id);
      }
    }
  };

  // Atalho para abrir apontamento direto em um produto específico
  const handleAbrirProducaoComProduto = (p: PedidoVenda, prodId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    handleAbrirProducao(p, prodId);
  };

  // Registrar Quantidade Finalizada do Produto Selecionado
  const handleRegistrarProducaoProduto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalProducao) return;

    const qtdEmbalagens = parseInt(qtdEmbalagensInput) || 0;
    if (qtdEmbalagens <= 0) {
      alert('Informe uma quantidade válida de embalagens finalizadas.');
      return;
    }

    const todos = carregarPedidosVenda();
    const index = todos.findIndex(p => p.id === modalProducao.id);
    if (index === -1) return;

    const pedidoAtual = todos[index];
    const itemAlvoIndex = pedidoAtual.itens.findIndex(i => i.produto_id === produtoSelecionadoId);
    if (itemAlvoIndex === -1) return;

    const itemAlvo = pedidoAtual.itens[itemAlvoIndex];
    const opItem = opDoItem(pedidoAtual.id, itemAlvoIndex);
    if (opItem?.status === 'CONCLUIDA') {
      alert(`A ${opItem.numero} deste produto já foi concluída (estoque lançado). Para produzir mais, crie uma nova OP em "Ordens de Produção".`);
      return;
    }
    const qtdAnterior = itemAlvo.quantidade_produzida || 0;
    const novaQtdProduzida = qtdAnterior + qtdEmbalagens;
    // Peso considera os pacotes de cada fardo/caixa
    const pesoKgApontado = pesoDoItemKg(itemAlvo, qtdEmbalagens);

    // Atualiza o item específico
    const itensAtualizados = [...pedidoAtual.itens];
    itensAtualizados[itemAlvoIndex] = {
      ...itemAlvo,
      quantidade_produzida: novaQtdProduzida,
      lote_producao: loteInput || itemAlvo.lote_producao
    };

    // Cria apontamento com detalhes do produto
    const novoApontamento: ApontamentoProducao = {
      id: `apt_${Date.now()}`,
      data: dataApontamento,
      produto_id: itemAlvo.produto_id,
      produto_nome: itemAlvo.produto_nome,
      tipo_embalagem: itemAlvo.tipo_embalagem,
      quantidade_produzida_embalagens: qtdEmbalagens,
      quantidade_produzida_kg: pesoKgApontado,
      operador: operadorTurno,
      lote: loteInput,
      observacao: observacaoApontamento || undefined
    };

    const apontamentosAtuais = [novoApontamento, ...(pedidoAtual.apontamentos_producao || [])];
    const totalKgAcumulado = apontamentosAtuais.reduce((acc, curr) => acc + curr.quantidade_produzida_kg, 0);

    const atualizado: PedidoVenda = {
      ...pedidoAtual,
      itens: itensAtualizados,
      lote_producao: loteInput || pedidoAtual.lote_producao,
      data_fabricacao: dataFabricacaoInput || pedidoAtual.data_fabricacao || new Date().toLocaleDateString('pt-BR'),
      data_vencimento: dataVencimentoInput || pedidoAtual.data_vencimento,
      apontamentos_producao: apontamentosAtuais,
      quantidade_produzida_acumulada_kg: totalKgAcumulado
    };

    todos[index] = atualizado;
    salvarPedidosVenda(todos);
    sincronizarOrdensComPedido(atualizado);
    setModalProducao(atualizado);
    setQtdEmbalagensInput('');
    setObservacaoApontamento('');
  };

  // Remover um Apontamento
  const handleRemoverApontamento = (apontamentoId: string) => {
    if (!modalProducao) return;
    const apt = modalProducao.apontamentos_producao?.find(a => a.id === apontamentoId);
    if (!apt) return;

    if (confirm(`Remover o apontamento de ${apt.quantidade_produzida_embalagens || 0} embalagens de ${apt.produto_nome}?`)) {
      const todos = carregarPedidosVenda();
      const index = todos.findIndex(p => p.id === modalProducao.id);
      if (index === -1) return;

      const pedidoAtual = todos[index];
      const novosApontamentos = (pedidoAtual.apontamentos_producao || []).filter(a => a.id !== apontamentoId);

      const itensAtualizados = pedidoAtual.itens.map(item => {
        if (item.produto_id === apt.produto_id && apt.quantidade_produzida_embalagens) {
          const qtdRestante = Math.max(0, (item.quantidade_produzida || 0) - apt.quantidade_produzida_embalagens);
          return { ...item, quantidade_produzida: qtdRestante };
        }
        return item;
      });

      const totalKg = novosApontamentos.reduce((acc, curr) => acc + curr.quantidade_produzida_kg, 0);
      const atualizado: PedidoVenda = {
        ...pedidoAtual,
        itens: itensAtualizados,
        apontamentos_producao: novosApontamentos,
        quantidade_produzida_acumulada_kg: totalKg
      };

      todos[index] = atualizado;
      salvarPedidosVenda(todos);
      sincronizarOrdensComPedido(atualizado);
      setModalProducao(atualizado);
    }
  };

  // VALIDAÇÃO CRÍTICA: Concluir Produção e Enviar para "A Faturar"
  // SE NÃO FOR PREENCHIDO LOTE E DATA DE VENCIMENTO, NÃO PASSA PRO FATURAR!
  const handleTentarConcluirProducao = (pedido: PedidoVenda) => {
    // Sincroniza com os inputs se o modal de produção estiver aberto para este pedido
    const loteEfetivo = (modalProducao && modalProducao.id === pedido.id ? (loteInput.trim() || modalProducao.lote_producao?.trim() || '') : (pedido.lote_producao?.trim() || '')).trim();
    const vencimentoEfetivo = (modalProducao && modalProducao.id === pedido.id ? (dataVencimentoInput.trim() || modalProducao.data_vencimento?.trim() || '') : (pedido.data_vencimento?.trim() || '')).trim();
    const fabricacaoEfetiva = (modalProducao && modalProducao.id === pedido.id ? (dataFabricacaoInput.trim() || modalProducao.data_fabricacao?.trim() || new Date().toLocaleDateString('pt-BR')) : (pedido.data_fabricacao?.trim() || new Date().toLocaleDateString('pt-BR'))).trim();

    if (!loteEfetivo || !vencimentoEfetivo) {
      // Bloqueia e abre modal para preenchimento obrigatório
      setModalBloqueioLote(pedido);
      setLoteInput(loteEfetivo || pedido.lote_producao || `LOT-${new Date().getFullYear()}-${pedido.numero_pedido.replace(/\D/g, '')}`);
      const hoje = new Date();
      setDataFabricacaoInput(fabricacaoEfetiva || hoje.toLocaleDateString('pt-BR'));
      hoje.setFullYear(hoje.getFullYear() + 2);
      setDataVencimentoInput(vencimentoEfetivo || hoje.toLocaleDateString('pt-BR'));
      return;
    }

    // Se já tem lote e vencimento válidos, confirma e move para A_FATURAR
    if (confirm(`Concluir produção do pedido ${pedido.numero_pedido}?\n\n• Lote: ${loteEfetivo}\n• Vencimento: ${vencimentoEfetivo}\n\nO pedido será liberado para o setor de Faturamento.`)) {
      // Salva lote e vencimento no pedido
      const todos = carregarPedidosVenda();
      const idx = todos.findIndex(p => p.id === pedido.id);
      if (idx !== -1) {
        todos[idx] = {
          ...todos[idx],
          lote_producao: loteEfetivo,
          data_fabricacao: fabricacaoEfetiva,
          data_vencimento: vencimentoEfetivo
        };
        salvarPedidosVenda(todos);
      }

      moverPedidoEtapa(pedido.id, 'A_FATURAR', {
        lote_producao: loteEfetivo,
        data_fabricacao: fabricacaoEfetiva,
        data_vencimento: vencimentoEfetivo
      });

      if (modalProducao) setModalProducao(null);
      if (onNavigate) onNavigate('pedidos_a_faturar');
    }
  };

  // Salvar Lote e Vencimento Obrigatórios no Modal de Bloqueio e Avançar
  const handleConfirmarLoteEVencimentoAvancar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalBloqueioLote) return;

    if (!loteInput.trim()) {
      alert('O Número do Lote de Fabricação é estritamente obrigatório.');
      return;
    }
    if (!dataVencimentoInput.trim()) {
      alert('A Data de Vencimento é estritamente obrigatória.');
      return;
    }

    const todos = carregarPedidosVenda();
    const index = todos.findIndex(p => p.id === modalBloqueioLote.id);
    if (index === -1) return;

    // Atualiza o pedido com lote e vencimento e move para A_FATURAR
    todos[index] = {
      ...todos[index],
      lote_producao: loteInput.trim(),
      data_fabricacao: dataFabricacaoInput.trim() || new Date().toLocaleDateString('pt-BR'),
      data_vencimento: dataVencimentoInput.trim()
    };
    salvarPedidosVenda(todos);

    moverPedidoEtapa(modalBloqueioLote.id, 'A_FATURAR', {
      lote_producao: loteInput.trim(),
      data_fabricacao: dataFabricacaoInput.trim() || new Date().toLocaleDateString('pt-BR'),
      data_vencimento: dataVencimentoInput.trim()
    });

    setModalBloqueioLote(null);
    if (modalProducao) setModalProducao(null);
    if (onNavigate) onNavigate('pedidos_a_faturar');
  };

  // Métricas da Fábrica
  const metricas = useMemo(() => {
    const total = pedidos.length;
    const volumeTotalKg = pedidos.reduce((acc, p) => acc + p.peso_total_kg, 0);
    const volumeProduzidoAcumuladoKg = pedidos.reduce((acc, p) => acc + (p.quantidade_produzida_acumulada_kg || 0), 0);
    const pedidosSemLote = pedidos.filter(p => !p.lote_producao || !p.data_vencimento).length;

    let sacos25kg = 0;
    let bigBags = 0;

    pedidos.forEach(p => {
      p.itens.forEach(i => {
        if (i.tipo_embalagem === 'Saco 25kg') sacos25kg += i.quantidade;
        if (i.tipo_embalagem === 'Big Bag 1000kg') bigBags += i.quantidade;
      });
    });

    return { total, volumeTotalKg, volumeProduzidoAcumuladoKg, sacos25kg, bigBags, pedidosSemLote };
  }, [pedidos]);

  // Filtros
  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter(p => {
      const match =
        p.numero_pedido.toLowerCase().includes(busca.toLowerCase()) ||
        p.cliente_nome.toLowerCase().includes(busca.toLowerCase()) ||
        (p.lote_producao && p.lote_producao.toLowerCase().includes(busca.toLowerCase())) ||
        p.cliente_cidade_uf.toLowerCase().includes(busca.toLowerCase());
      return match;
    });
  }, [pedidos, busca]);

  return (
    <div className="relative h-full w-full flex flex-col bg-[#f8faf8] text-slate-800 overflow-hidden">
      
      {/* 1. NAVEGAÇÃO DE ESTEIRA UNIFICADA */}
      <PedidosNavTabs activeTab="pedidos_em_producao" onNavigate={onNavigate} />

      {/* 2. CABEÇALHO COMPACTO & MINIMALISTA */}
      <div className="bg-white border-b border-slate-200/80 px-6 py-3.5 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Em Produção</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
                {metricas.total} pedidos na esteira
              </span>
              {metricas.pedidosSemLote > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1 font-mono">
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  <span>{metricas.pedidosSemLote} pendentes de lote/vencimento</span>
                </span>
              )}
            </h1>
          </div>
        </div>

        {/* STAT BAR MINIMALISTA EM LINHA */}
        <div className="flex flex-wrap items-center gap-6 pt-3 mt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Meta Total:</span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              {(metricas.volumeTotalKg / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} Ton
            </span>
          </div>
          <div className="w-px h-4 bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Produzido no Pátio:</span>
            <span className="font-mono font-bold text-emerald-800 text-sm">
              {(metricas.volumeProduzidoAcumuladoKg / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} Ton
            </span>
          </div>
          <div className="w-px h-4 bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Sacos 25kg:</span>
            <span className="font-mono font-bold text-slate-900">
              {metricas.sacos25kg.toLocaleString('pt-BR')} un
            </span>
          </div>
          <div className="w-px h-4 bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Big Bags:</span>
            <span className="font-mono font-bold text-slate-900">
              {metricas.bigBags} un
            </span>
          </div>
        </div>
      </div>

      {/* 3. BARRA DE BUSCA */}
      <div className="bg-[#f1f5f2] px-6 py-2.5 border-b border-slate-200/80 flex items-center justify-between gap-3 shrink-0">
        <div className="flex-1 min-w-[260px] max-w-sm relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por Pedido, Lote, Cliente..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-700 font-medium"
          />
        </div>
      </div>

      {/* 4. TABELA DE PEDIDOS EM PRODUÇÃO COM VALIDAÇÃO VISUAL DE LOTE */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 text-slate-500 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-5">Pedido & Rastreabilidade</th>
                <th className="py-3 px-4">Cliente / Praça</th>
                <th className="py-3 px-4">Produtos do Pedido</th>
                <th className="py-3 px-4">Progresso Produzido</th>
                <th className="py-3 px-4">Lote & Vencimento</th>
                <th className="py-3 px-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {pedidosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    Nenhum pedido em produção no momento.
                  </td>
                </tr>
              ) : (
                pedidosFiltrados.map((item) => {
                  const produzidoKg = item.quantidade_produzida_acumulada_kg || 0;
                  const totalKg = item.peso_total_kg || 1;
                  const percentual = Math.min(100, Math.round((produzidoKg / totalKg) * 100));

                  const temLote = Boolean(item.lote_producao && item.lote_producao.trim());
                  const temVencimento = Boolean(item.data_vencimento && item.data_vencimento.trim());
                  const liberadoParaFaturar = temLote && temVencimento;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => handleAbrirProducao(item)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      title="Clique para abrir o controle de produção e apontamentos"
                    >
                      <td className="py-3.5 px-5">
                        <div className="font-mono font-bold text-slate-900 group-hover:text-emerald-900">
                          {item.numero_pedido}
                        </div>
                        {(faltaMpPorPedido.get(item.id) || []).some(c => c.falta > 0) && (
                          <div className="text-[10px] text-red-700 font-bold flex items-center gap-1 mt-0.5" title="O estoque de matéria-prima não cobre o que falta produzir">
                            <AlertTriangle className="w-3 h-3 text-red-600" />
                            <span>Falta matéria-prima</span>
                          </div>
                        )}
                        {temLote ? (
                          <div className="text-[11px] text-emerald-800 font-mono font-semibold flex items-center gap-1 mt-0.5">
                            <Tag className="w-3 h-3 text-emerald-600" />
                            <span>{item.lote_producao}</span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-amber-700 font-bold flex items-center gap-1 mt-0.5">
                            <AlertTriangle className="w-3 h-3 text-amber-500" />
                            <span>Lote Pendente</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{item.cliente_nome}</div>
                        <div className="text-[11px] text-slate-400">{item.cliente_cidade_uf}</div>
                      </td>

                      {/* Produtos do Pedido com progresso individual */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1.5">
                          {item.itens.map((it, idx) => {
                            const qtdProd = it.quantidade_produzida || 0;
                            const pct = Math.min(100, Math.round((qtdProd / it.quantidade) * 100));
                            const falta = Math.max(0, it.quantidade - qtdProd);
                            return (
                              <div
                                key={idx}
                                onClick={(e) => handleAbrirProducaoComProduto(item, it.produto_id, e)}
                                className="flex items-center justify-between gap-2 p-1 rounded-md hover:bg-emerald-50/80 transition-colors border border-transparent hover:border-emerald-200 cursor-pointer"
                                title={`Clique para apontar produção de: ${it.produto_nome}`}
                              >
                                <div className="truncate max-w-[190px]">
                                  <span className="font-mono font-bold text-slate-900">{it.quantidade}x</span>{' '}
                                  <span className="text-slate-800 font-medium hover:text-emerald-900">{it.produto_nome}</span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                    pct >= 100
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : pct > 0
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {qtdProd}/{it.quantidade} ({pct}%)
                                  </span>
                                  {falta > 0 && (
                                    <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100/70 hover:bg-emerald-200 px-1 py-0.5 rounded">
                                      +Apontar
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </td>

                      {/* Progresso Total do Pedido */}
                      <td className="py-3.5 px-4 font-mono min-w-[150px]">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="font-bold text-slate-800">{produzidoKg.toLocaleString('pt-BR')} kg</span>
                          <span className="text-slate-400 font-normal">/ {totalKg.toLocaleString('pt-BR')} kg</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              percentual >= 100 ? 'bg-emerald-600' : 'bg-emerald-700'
                            }`}
                            style={{ width: `${percentual}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-emerald-800 mt-0.5 block">
                          {percentual}% produzido
                        </span>
                      </td>

                      {/* Status de Lote & Vencimento (Regra Obrigatória) */}
                      <td className="py-3.5 px-4 font-mono">
                        {liberadoParaFaturar ? (
                          <div className="p-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                            <div className="text-[11px] font-bold text-emerald-950 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>Lote: {item.lote_producao}</span>
                            </div>
                            <div className="text-[10px] text-emerald-800 mt-0.5">
                              Venc: {item.data_vencimento}
                            </div>
                          </div>
                        ) : (
                          <div className="p-1.5 bg-amber-50 border border-amber-300 rounded-lg text-amber-900">
                            <div className="text-[10px] font-black flex items-center gap-1 text-amber-800">
                              <Lock className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>Faturamento Bloqueado</span>
                            </div>
                            <div className="text-[9px] text-amber-700 mt-0.5">
                              Exige Lote e Vencimento
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Apontar Produto */}
                          <button
                            onClick={() => handleAbrirProducao(item)}
                            className="
                              flex items-center gap-1 px-2.5 py-1.5 rounded-lg
                              bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-900
                              border border-slate-200 font-bold text-xs
                              transition-colors cursor-pointer
                            "
                            title="Apontar produção por produto, registrar lote e vencimento"
                          >
                            <HardHat className="w-3.5 h-3.5 text-emerald-800" />
                            <span>Apontar</span>
                          </button>

                          {/* Concluir e Enviar para A Faturar */}
                          <button
                            onClick={() => handleTentarConcluirProducao(item)}
                            className={`
                              flex items-center gap-1 px-3 py-1.5 rounded-lg
                              font-bold text-xs shadow-2xs transition-colors cursor-pointer
                              ${liberadoParaFaturar
                                ? 'bg-emerald-900 hover:bg-emerald-950 text-white'
                                : 'bg-amber-600 hover:bg-amber-700 text-white'
                              }
                            `}
                            title={liberadoParaFaturar
                              ? 'Concluir produção e liberar para Faturamento'
                              : 'Preencher Lote e Vencimento para liberar ao Faturamento'
                            }
                          >
                            {liberadoParaFaturar ? (
                              <>
                                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>A Faturar</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>Definir Lote p/ Faturar</span>
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. MODAL ACOMPANHAMENTO DE PRODUÇÃO COM ESCOLHA DO PRODUTO */}
      {modalProducao && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 backdrop-blur-xs p-3 sm:p-6 flex justify-center items-start animate-fadeIn">
          <div className="relative w-full max-w-5xl lg:max-w-6xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col my-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)]">
            
            {/* Cabeçalho do Modal */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <HardHat className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">
                    Acompanhamento de Produção - Pedido {modalProducao.numero_pedido}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Selecione o produto para apontar a quantidade finalizada. Rastreabilidade com lote e vencimento.
                  </p>
                </div>
              </div>
              <button onClick={() => setModalProducao(null)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
              
              {/* CARD DE PROGRESSO POR PRODUTO DO PEDIDO */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-xs flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-emerald-700" />
                    <span>Progresso Individual por Produto do Pedido</span>
                  </span>
                  <span className="text-slate-500 font-mono text-[11px]">
                    Destinatário: <strong className="text-slate-800">{modalProducao.cliente_nome}</strong> ({modalProducao.cliente_cidade_uf})
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {modalProducao.itens.map((item, idx) => {
                    const qtdProd = item.quantidade_produzida || 0;
                    const pct = Math.min(100, Math.round((qtdProd / item.quantidade) * 100));
                    const isConcluido = qtdProd >= item.quantidade;
                    const isSelected = item.produto_id === produtoSelecionadoId;

                    return (
                      <div
                        key={idx}
                        onClick={() => setProdutoSelecionadoId(item.produto_id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div>
                            <div className="font-black text-slate-900 text-xs">{item.produto_nome}</div>
                            <div className="text-[10px] text-slate-500">Embalagem: {item.tipo_embalagem}</div>
                            {(() => {
                              const op = opDoItem(modalProducao.id, idx);
                              if (!op) return null;
                              return (
                                <div className={`text-[10px] font-bold font-mono ${op.status === 'CONCLUIDA' ? 'text-emerald-700' : 'text-violet-700'}`}>
                                  {op.numero} · {op.status === 'CONCLUIDA' ? 'OP concluída (estoque lançado)' : op.status === 'EM_PRODUCAO' ? 'OP em produção' : 'OP planejada'}
                                </div>
                              );
                            })()}
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                            isConcluido
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : pct > 0
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {isConcluido ? '✓ 100% Concluído' : `${pct}% Produzido`}
                          </span>
                        </div>

                        {/* Barra de Progresso do Produto */}
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200 mt-2">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isConcluido ? 'bg-emerald-600' : 'bg-emerald-700'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        <div className="flex justify-between items-center text-[11px] font-mono mt-1.5">
                          <span className="text-slate-600">
                            Finalizado: <strong className="text-slate-900">{qtdProd}</strong> de {item.quantidade} {item.tipo_embalagem.includes('Fardo') ? 'fardos' : 'sacos'}
                          </span>
                          <span className="text-slate-500">
                            Faltam: <strong className="text-emerald-900">{Math.max(0, item.quantidade - qtdProd)}</strong>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* MATÉRIA-PRIMA NECESSÁRIA PARA O QUE FALTA PRODUZIR (AVISA, NÃO BLOQUEIA) */}
              {(() => {
                const nec = faltaMpPorPedido.get(modalProducao.id) || necessidadeRestantePedido(modalProducao);
                return (
                  <div className="space-y-2">
                    <TabelaMateriaPrimaOP itens={nec} titulo="Matéria-prima necessária para o que falta produzir x estoque atual (baixa na conclusão das OPs)" />
                    {nec.some(c => c.falta > 0) && (
                      <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-800 font-semibold flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" />
                        <span>O estoque de matéria-prima não cobre a produção restante. É possível seguir; a falta fica registrada.</span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* GRID: FORMULÁRIO DE APONTAMENTO À ESQUERDA + HISTÓRICO À DIREITA */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* FORMULÁRIO: APONTAR PRODUTO ESCOLHIDO */}
                <div className="lg:col-span-6 space-y-3.5 p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200">
                  <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2">
                    <span className="font-bold text-emerald-950 uppercase tracking-wider text-xs block">
                      Apontar Quantidade Finalizada
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-800">
                      Selecione o produto e registre
                    </span>
                  </div>

                  <form onSubmit={handleRegistrarProducaoProduto} className="space-y-3">
                    
                    {/* Seletor de Produto */}
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Produto a Apontar *
                      </label>
                      <select
                        value={produtoSelecionadoId}
                        onChange={(e) => setProdutoSelecionadoId(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-700 cursor-pointer"
                      >
                        {modalProducao.itens.map(it => {
                          const qtdProd = it.quantidade_produzida || 0;
                          const falta = Math.max(0, it.quantidade - qtdProd);
                          return (
                            <option key={it.produto_id} value={it.produto_id}>
                              {it.produto_nome} ({it.tipo_embalagem}) — Faltam {falta} de {it.quantidade}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block font-bold text-slate-700">
                            Qtd Finalizada Agora (Embalagens) *
                          </label>
                          {(() => {
                            const itemAlvo = modalProducao.itens.find(i => i.produto_id === produtoSelecionadoId);
                            const falta = itemAlvo ? Math.max(0, itemAlvo.quantidade - (itemAlvo.quantidade_produzida || 0)) : 0;
                            return (
                              <span className="text-[10px] text-slate-500 font-mono">
                                Restam: <strong className="text-emerald-800">{falta}</strong>
                              </span>
                            );
                          })()}
                        </div>
                        <input
                          type="number"
                          min="1"
                          required
                          value={qtdEmbalagensInput}
                          onChange={(e) => setQtdEmbalagensInput(e.target.value)}
                          placeholder="Ex: 50"
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-mono font-black text-emerald-950 text-sm focus:outline-none focus:border-emerald-700"
                        />
                        
                        {/* BOTÕES DE APONTAMENTO RÁPIDO */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <span className="text-[10px] text-slate-400 font-semibold">Atalhos:</span>
                          {[10, 25, 50, 100, 200].map(val => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setQtdEmbalagensInput(String(val))}
                              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-emerald-100 hover:text-emerald-900 border border-slate-200 text-[10px] font-mono font-bold text-slate-700 transition-colors cursor-pointer"
                              title={`Lançar ${val} embalagens`}
                            >
                              +{val}
                            </button>
                          ))}
                          {(() => {
                            const itemAlvo = modalProducao.itens.find(i => i.produto_id === produtoSelecionadoId);
                            const falta = itemAlvo ? Math.max(0, itemAlvo.quantidade - (itemAlvo.quantidade_produzida || 0)) : 0;
                            if (falta > 0) {
                              return (
                                <button
                                  type="button"
                                  onClick={() => setQtdEmbalagensInput(String(falta))}
                                  className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-mono font-bold transition-colors cursor-pointer"
                                  title={`Finalizar restante (${falta} unidades)`}
                                >
                                  Concluir Restante ({falta})
                                </button>
                              );
                            }
                            return null;
                          })()}
                        </div>

                        {qtdEmbalagensInput && (
                          <span className="text-[10px] text-emerald-800 font-mono mt-1 font-semibold block">
                            Equivale a: {(parseInt(qtdEmbalagensInput) * (modalProducao.itens.find(i => i.produto_id === produtoSelecionadoId)?.peso_unitario_kg || 25)).toLocaleString('pt-BR')} kg
                          </span>
                        )}
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Data do Apontamento
                        </label>
                        <input
                          type="text"
                          value={dataApontamento}
                          onChange={(e) => setDataApontamento(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-mono text-slate-800 focus:outline-none focus:border-emerald-700"
                        />
                      </div>
                    </div>

                    {/* Lote e Vencimento */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-emerald-100">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Número do Lote *
                        </label>
                        <input
                          type="text"
                          required
                          value={loteInput}
                          onChange={(e) => setLoteInput(e.target.value)}
                          placeholder="Ex: LOT-2026-F104"
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-700"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Data de Vencimento *
                        </label>
                        <input
                          type="text"
                          required
                          value={dataVencimentoInput}
                          onChange={(e) => setDataVencimentoInput(e.target.value)}
                          placeholder="DD/MM/AAAA"
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-700"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Turno / Operador</label>
                        <select
                          value={operadorTurno}
                          onChange={(e) => setOperadorTurno(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 cursor-pointer"
                        >
                          <option value="Turno A (Manhã) - Carlos Ferreira">Turno A (Manhã)</option>
                          <option value="Turno B (Tarde) - Marcelo Silveira">Turno B (Tarde)</option>
                          <option value="Turno C (Noite) - Robson Alves">Turno C (Noite)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Observações do Turno</label>
                        <input
                          type="text"
                          value={observacaoApontamento}
                          onChange={(e) => setObservacaoApontamento(e.target.value)}
                          placeholder="Ex: Ensaque concluído e paletizado"
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs cursor-pointer shadow-xs hover:shadow"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Salvar Apontamento do Produto</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* HISTÓRICO DE APONTAMENTOS */}
                <div className="lg:col-span-6 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 uppercase tracking-wider text-xs block">
                      Histórico de Apontamentos Realizados
                    </span>
                    <span className="text-slate-500 font-mono text-[11px]">
                      Total: <strong className="text-emerald-800 font-bold">{modalProducao.quantidade_produzida_acumulada_kg?.toLocaleString('pt-BR') || 0} kg</strong>
                    </span>
                  </div>
                  
                  {(!modalProducao.apontamentos_producao || modalProducao.apontamentos_producao.length === 0) ? (
                    <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                      <Factory className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p>Nenhum apontamento registrado ainda.</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Selecione um produto ao lado e lance as embalagens finalizadas.</p>
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                      <table className="w-full text-left">
                        <thead className="bg-slate-100 text-[10px] font-bold uppercase text-slate-600 border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">Data</th>
                            <th className="py-2.5 px-3">Produto / Embalagem</th>
                            <th className="py-2.5 px-3 text-right">Qtd Finalizada</th>
                            <th className="py-2.5 px-3">Operador / Lote</th>
                            <th className="py-2.5 px-2 text-right">Ação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-xs">
                          {modalProducao.apontamentos_producao.map((apt) => (
                            <tr key={apt.id} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3 font-semibold text-slate-800">{apt.data}</td>
                              <td className="py-2.5 px-3 font-sans">
                                <div className="font-bold text-slate-900 truncate max-w-[140px]" title={apt.produto_nome}>
                                  {apt.produto_nome || 'Produto'}
                                </div>
                                <div className="text-[10px] text-slate-400">{apt.tipo_embalagem}</div>
                              </td>
                              <td className="py-2.5 px-3 text-right font-black text-emerald-800">
                                {apt.quantidade_produzida_embalagens ? `${apt.quantidade_produzida_embalagens} un` : ''}
                                <div className="text-[10px] text-slate-500 font-normal">
                                  +{apt.quantidade_produzida_kg.toLocaleString('pt-BR')} kg
                                </div>
                              </td>
                              <td className="py-2.5 px-3 font-sans text-slate-600 text-[11px]">
                                <div>{apt.operador}</div>
                                {apt.lote && <div className="text-[10px] font-mono text-emerald-700 font-bold">{apt.lote}</div>}
                              </td>
                              <td className="py-2.5 px-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoverApontamento(apt.id)}
                                  className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                                  title="Remover apontamento"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>

            </div>

            {/* Rodapé do Modal */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setModalProducao(null)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Fechar
                </button>

                {loteInput.trim() && dataVencimentoInput.trim() ? (
                  <div className="hidden sm:flex items-center gap-1.5 text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 text-[11px] font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Rastreabilidade OK: Lote {loteInput} • Venc: {dataVencimentoInput}</span>
                  </div>
                ) : (
                  <div className="hidden sm:flex items-center gap-1.5 text-amber-800 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-300 text-[11px] font-bold">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Lote e Vencimento obrigatórios para liberar ao faturamento</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => handleTentarConcluirProducao(modalProducao)}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-900 hover:bg-emerald-950 text-white font-bold text-xs shadow-xs cursor-pointer transition-all hover:scale-102"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Concluir Produção & Enviar para A Faturar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL BLOQUEIO: LOTE E VENCIMENTO OBRIGATÓRIOS PARA AVANÇAR */}
      {modalBloqueioLote && (
        <div className="fixed inset-0 z-[110] overflow-y-auto bg-black/80 backdrop-blur-xs p-3 sm:p-6 flex justify-center items-center animate-fadeIn">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-amber-300 flex flex-col">
            <div className="bg-amber-600 text-white px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <Lock className="w-5 h-5 text-white" />
                <div>
                  <h3 className="font-bold text-sm text-white">
                    Rastreabilidade Obrigatória
                  </h3>
                  <p className="text-[11px] text-amber-100">
                    O pedido não pode ir para faturamento sem Lote e Vencimento.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalBloqueioLote(null)}
                className="p-1 rounded-lg hover:bg-amber-700 text-amber-200 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmarLoteEVencimentoAvancar} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs">
                <strong>Atenção:</strong> Por normas de controle de qualidade e expedição industrial do Grupo ENO, todo pedido destinado ao faturamento deve conter o <strong>Lote de Produção</strong> e a <strong>Data de Vencimento</strong> impressos na embalagem.
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Pedido:</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{modalBloqueioLote.numero_pedido} - {modalBloqueioLote.cliente_nome}</span>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Número do Lote de Fabricação *
                </label>
                <input
                  type="text"
                  required
                  value={loteInput}
                  onChange={(e) => setLoteInput(e.target.value)}
                  placeholder="Ex: LOT-2026-F104"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono font-black text-slate-900 focus:outline-none focus:border-emerald-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Data de Fabricação *
                  </label>
                  <input
                    type="text"
                    required
                    value={dataFabricacaoInput}
                    onChange={(e) => setDataFabricacaoInput(e.target.value)}
                    placeholder="DD/MM/AAAA"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-700"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Data de Vencimento *
                  </label>
                  <input
                    type="text"
                    required
                    value={dataVencimentoInput}
                    onChange={(e) => setDataVencimentoInput(e.target.value)}
                    placeholder="DD/MM/AAAA"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-700"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalBloqueioLote(null)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-emerald-900 hover:bg-emerald-950 text-white font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>Salvar e Liberar p/ Faturar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
