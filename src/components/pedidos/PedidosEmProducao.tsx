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
import { CabecalhoPagina, BotaoPrimario, BotaoSecundario } from '../ui/CabecalhoPagina';
import { BarraFiltros, CampoBusca, Segmentado, SeletorFiltro } from '../ui/BarraFiltros';
import { TabelaDados, Th, Td, tabela } from '../ui/TabelaDados';
import { StatusChip } from '../ui/StatusChip';
import { EstadoVazio } from '../ui/EstadoVazio';
import {
  OrdemProducao,
  EVENTO_OPS,
  carregarOrdensProducao,
  ordensDoPedido,
  sincronizarOrdensComPedido,
  garantirOrdensDosPedidosEmProducao,
  validadePadraoProduto
} from '../../data/ordensProducaoData';
import { formatarDataBR, hojeISO, paraISO } from '../../lib/datas';

// Validade padrão do pedido: prazo da ficha técnica do 1º produto (24 meses quando não informado), em 'AAAA-MM-DD'
const validadePadraoPedidoISO = (p: PedidoVenda, fabricacao?: string) =>
  validadePadraoProduto(p.itens[0]?.produto_id || '', paraISO(fabricacao) || hojeISO());
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
  const [dataApontamento, setDataApontamento] = useState(hojeISO());
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
    const fab = paraISO(p.data_fabricacao) || hojeISO();
    setDataFabricacaoInput(fab);
    setDataVencimentoInput(paraISO(p.data_vencimento) || validadePadraoPedidoISO(p, fab));
    setDataApontamento(hojeISO());
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
      data: paraISO(dataApontamento) || hojeISO(),
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
      data_fabricacao: paraISO(dataFabricacaoInput) || paraISO(pedidoAtual.data_fabricacao) || hojeISO(),
      data_vencimento: paraISO(dataVencimentoInput) || paraISO(pedidoAtual.data_vencimento) || undefined,
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
    const vencimentoEfetivo = modalProducao && modalProducao.id === pedido.id
      ? (paraISO(dataVencimentoInput) || paraISO(modalProducao.data_vencimento))
      : paraISO(pedido.data_vencimento);
    const fabricacaoEfetiva = (modalProducao && modalProducao.id === pedido.id
      ? (paraISO(dataFabricacaoInput) || paraISO(modalProducao.data_fabricacao))
      : paraISO(pedido.data_fabricacao)) || hojeISO();

    if (!loteEfetivo || !vencimentoEfetivo) {
      // Bloqueia e abre modal para preenchimento obrigatório
      setModalBloqueioLote(pedido);
      setLoteInput(loteEfetivo || pedido.lote_producao || `LOT-${new Date().getFullYear()}-${pedido.numero_pedido.replace(/\D/g, '')}`);
      setDataFabricacaoInput(fabricacaoEfetiva);
      setDataVencimentoInput(vencimentoEfetivo || validadePadraoPedidoISO(pedido, fabricacaoEfetiva));
      return;
    }

    // Se já tem lote e vencimento válidos, confirma e move para A_FATURAR
    if (confirm(`Concluir produção do pedido ${pedido.numero_pedido}?\n\n• Lote: ${loteEfetivo}\n• Vencimento: ${formatarDataBR(vencimentoEfetivo)}\n\nO pedido será liberado para o setor de Faturamento.`)) {
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
    const vencISO = paraISO(dataVencimentoInput);
    if (!vencISO) {
      alert('A Data de Vencimento é estritamente obrigatória.');
      return;
    }
    const fabISO = paraISO(dataFabricacaoInput) || hojeISO();

    const todos = carregarPedidosVenda();
    const index = todos.findIndex(p => p.id === modalBloqueioLote.id);
    if (index === -1) return;

    // Atualiza o pedido com lote e vencimento e move para A_FATURAR
    todos[index] = {
      ...todos[index],
      lote_producao: loteInput.trim(),
      data_fabricacao: fabISO,
      data_vencimento: vencISO
    };
    salvarPedidosVenda(todos);

    moverPedidoEtapa(modalBloqueioLote.id, 'A_FATURAR', {
      lote_producao: loteInput.trim(),
      data_fabricacao: fabISO,
      data_vencimento: vencISO
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

  const toneladas = (kg: number) => `${(kg / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} t`;

  return (
    <div className="relative h-full w-full flex flex-col bg-papel-2 text-tinta overflow-hidden">

      {/* Abas antigas do fluxo: só fora do shell */}
      <PedidosNavTabs activeTab="pedidos_em_producao" onNavigate={onNavigate} />

      <div className="mx-auto w-full max-w-[1700px]">
        <CabecalhoPagina
          titulo="Em produção"
          resumo={
            metricas.total === 0 ? (
              'Nenhum pedido na esteira de produção.'
            ) : (
              <>
                {metricas.total} {metricas.total === 1 ? 'pedido' : 'pedidos'} · {toneladas(metricas.volumeProduzidoAcumuladoKg)} de {toneladas(metricas.volumeTotalKg)} produzidas
                {' · '}{metricas.sacos25kg.toLocaleString('pt-BR')} sacos 25 kg · {metricas.bigBags} big bags
                {metricas.pedidosSemLote > 0 && (
                  <span className="text-st-aguardando font-semibold"> · {metricas.pedidosSemLote} sem lote/vencimento</span>
                )}
              </>
            )
          }
        />
        <BarraFiltros>
          <CampoBusca valor={busca} onChange={setBusca} placeholder="Buscar pedido, lote, cliente ou cidade" className="w-full md:w-80" />
        </BarraFiltros>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1700px] px-4 sm:px-6 pb-6">
          {pedidosFiltrados.length === 0 ? (
            <div className="bg-papel border border-linha rounded-md">
              <EstadoVazio
                titulo={pedidos.length === 0 ? 'Nenhum pedido em produção' : 'Nada encontrado'}
                texto={
                  pedidos.length === 0
                    ? 'Ao aprovar uma venda em Vendas, ela entra aqui para apontar a produção, registrar lote e vencimento.'
                    : 'Confira o número do pedido, o lote ou o nome do cliente.'
                }
                acao={
                  pedidos.length === 0 && onNavigate ? (
                    <BotaoSecundario onClick={() => onNavigate('pedidos_orcamentos_sugestivo')}>Ir para Vendas</BotaoSecundario>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <>
              {/* Celular: cartões */}
              <ul className="sm:hidden bg-papel border border-linha rounded-md">
                {pedidosFiltrados.map(item => {
                  const produzidoKg = item.quantidade_produzida_acumulada_kg || 0;
                  const totalKg = item.peso_total_kg || 1;
                  const percentual = Math.min(100, Math.round((produzidoKg / totalKg) * 100));
                  const liberadoParaFaturar = Boolean(item.lote_producao && item.lote_producao.trim()) && Boolean(item.data_vencimento && item.data_vencimento.trim());
                  const faltaMp = (faltaMpPorPedido.get(item.id) || []).some(c => c.falta > 0);
                  return (
                    <li key={item.id} className="px-3.5 py-3 border-b border-linha last:border-b-0">
                      <button type="button" onClick={() => handleAbrirProducao(item)} className="w-full text-left">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-[11.5px] text-cinza tabular-nums">
                              {item.numero_pedido}{item.lote_producao ? ` · Lote ${item.lote_producao}` : ''}
                            </div>
                            <div className="text-[14px] font-bold text-tinta truncate">{item.cliente_nome}</div>
                            <div className="text-[11.5px] text-cinza truncate">
                              {item.itens.map(i => `${i.quantidade}x ${i.produto_nome}`).join(' · ')}
                            </div>
                          </div>
                          {faltaMp ? (
                            <StatusChip tom="vencido" className="shrink-0">Falta MP</StatusChip>
                          ) : liberadoParaFaturar ? (
                            <StatusChip tom="pago" className="shrink-0">Lote ok</StatusChip>
                          ) : (
                            <StatusChip tom="aguardando" className="shrink-0">Sem lote</StatusChip>
                          )}
                        </div>
                        <div className="mt-2.5">
                          <div className="flex items-baseline justify-between text-[11.5px] tabular-nums">
                            <span className="text-cinza">{produzidoKg.toLocaleString('pt-BR')} de {totalKg.toLocaleString('pt-BR')} kg</span>
                            <span className="text-[15px] font-extrabold text-tinta">{percentual}%</span>
                          </div>
                          <div className="mt-1 h-1.5 w-full bg-papel-3 rounded-full overflow-hidden">
                            <div className="h-full bg-eno-700 rounded-full" style={{ width: `${percentual}%` }} />
                          </div>
                        </div>
                      </button>
                      <div className="flex gap-2 mt-2.5">
                        <button
                          type="button"
                          onClick={() => handleAbrirProducao(item)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-md border border-linha-forte text-tinta-2 text-[12.5px] font-semibold active:bg-papel-3"
                        >
                          <HardHat className="w-3.5 h-3.5" /> Apontar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTentarConcluirProducao(item)}
                          className={`flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-md text-[12.5px] font-semibold ${
                            liberadoParaFaturar ? 'bg-eno-800 text-white' : 'bg-st-aguardando-bg text-st-aguardando'
                          }`}
                        >
                          {liberadoParaFaturar ? <Check className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                          {liberadoParaFaturar ? 'Enviar a faturar' : 'Definir lote'}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {/* A partir de sm: tabela densa */}
              <TabelaDados className="hidden sm:block">
                <thead className={tabela.thead}>
                  <tr>
                    <Th>Pedido</Th>
                    <Th>Cliente</Th>
                    <Th>Produtos · apontado</Th>
                    <Th>Progresso</Th>
                    <Th>Lote e vencimento</Th>
                    <Th className="text-right">Ações</Th>
                  </tr>
                </thead>
                <tbody>
                  {pedidosFiltrados.map(item => {
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
                        className={`${tabela.tr} cursor-pointer group align-top`}
                        title="Abrir o controle de produção e apontamentos"
                      >
                        <Td>
                          <div className="font-semibold text-tinta tabular-nums whitespace-nowrap group-hover:text-eno-700">{item.numero_pedido}</div>
                          {(faltaMpPorPedido.get(item.id) || []).some(c => c.falta > 0) && (
                            <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-st-vencido" title="O estoque de matéria-prima não cobre o que falta produzir">
                              <AlertTriangle className="w-3 h-3" /> Falta matéria-prima
                            </div>
                          )}
                        </Td>
                        <Td className="max-w-[240px]">
                          <div className="font-semibold text-tinta truncate">{item.cliente_nome}</div>
                          <div className="text-[11.5px] text-cinza truncate">{item.cliente_cidade_uf}</div>
                        </Td>
                        <Td className="min-w-[260px]">
                          <div className="space-y-0.5">
                            {item.itens.map((it, idx) => {
                              const qtdProd = it.quantidade_produzida || 0;
                              const pct = Math.min(100, Math.round((qtdProd / it.quantidade) * 100));
                              return (
                                <button
                                  type="button"
                                  key={idx}
                                  onClick={(e) => handleAbrirProducaoComProduto(item, it.produto_id, e)}
                                  className="w-full flex items-center justify-between gap-2 px-1.5 py-1 -mx-1.5 rounded-[5px] hover:bg-papel-3 transition-colors cursor-pointer text-left"
                                  title={`Apontar produção de ${it.produto_nome}`}
                                >
                                  <span className="truncate max-w-[200px] text-tinta">
                                    <span className="font-semibold tabular-nums">{it.quantidade}x</span> {it.produto_nome}
                                  </span>
                                  <span className={`shrink-0 text-[11px] tabular-nums font-semibold ${pct >= 100 ? 'text-st-pago' : pct > 0 ? 'text-st-producao' : 'text-cinza'}`}>
                                    {qtdProd}/{it.quantidade}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </Td>
                        <Td className="min-w-[160px] tabular-nums">
                          <div className="flex items-baseline justify-between text-[11.5px]">
                            <span className="font-semibold text-tinta">{percentual}%</span>
                            <span className="text-cinza">{produzidoKg.toLocaleString('pt-BR')} / {totalKg.toLocaleString('pt-BR')} kg</span>
                          </div>
                          <div className="mt-1 h-1.5 w-full bg-papel-3 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${percentual >= 100 ? 'bg-st-pago' : 'bg-eno-700'}`} style={{ width: `${percentual}%` }} />
                          </div>
                        </Td>
                        <Td className="whitespace-nowrap tabular-nums">
                          {liberadoParaFaturar ? (
                            <>
                              <div className="font-semibold text-tinta">{item.lote_producao}</div>
                              <div className="text-[11.5px] text-cinza">Venc. {formatarDataBR(item.data_vencimento)}</div>
                            </>
                          ) : (
                            <StatusChip tom="aguardando">Faturamento bloqueado</StatusChip>
                          )}
                        </Td>
                        <Td className="text-right">
                          <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleAbrirProducao(item)}
                              className="inline-flex items-center gap-1 h-7 px-2 rounded-[5px] text-tinta-2 hover:bg-papel-3 text-[12px] font-semibold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ouro"
                              title="Apontar produção por produto, registrar lote e vencimento"
                            >
                              <HardHat className="w-3.5 h-3.5" /> Apontar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleTentarConcluirProducao(item)}
                              className={`inline-flex items-center gap-1 h-7 px-2.5 rounded-[5px] text-[12px] font-semibold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ouro ${
                                liberadoParaFaturar ? 'bg-eno-800 hover:bg-eno-900 text-white' : 'bg-st-aguardando-bg text-st-aguardando hover:brightness-95'
                              }`}
                              title={liberadoParaFaturar ? 'Concluir produção e liberar para faturamento' : 'Preencher lote e vencimento para liberar ao faturamento'}
                            >
                              {liberadoParaFaturar ? <Check className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                              {liberadoParaFaturar ? 'A faturar' : 'Definir lote'}
                            </button>
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

      {/* 5. MODAL ACOMPANHAMENTO DE PRODUÇÃO COM ESCOLHA DO PRODUTO */}
      {modalProducao && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 backdrop-blur-xs p-0 sm:p-6 flex justify-center items-stretch sm:items-start animate-fadeIn">
          <div className="max-sm:[&_input:not([type=checkbox]):not([type=radio]):not([type=file])]:min-h-11 max-sm:[&_input]:text-base max-sm:[&_select]:min-h-11 max-sm:[&_select]:text-base max-sm:[&_textarea]:text-base relative w-full max-w-5xl lg:max-w-6xl bg-papel rounded-none sm:rounded-md shadow-2xl overflow-hidden border-0 sm:border border-linha flex flex-col sm:my-auto h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[calc(100vh-3.5rem)]">
            
            {/* Cabeçalho do Modal */}
            <div className="bg-eno-900 text-white px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between border-b border-eno-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <HardHat className="w-5 h-5 text-ouro-claro" />
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">
                    Acompanhamento de Produção - Pedido {modalProducao.numero_pedido}
                  </h3>
                  <p className="text-[11px] text-cinza">
                    Selecione o produto para apontar a quantidade finalizada. Rastreabilidade com lote e vencimento.
                  </p>
                </div>
              </div>
              <button onClick={() => setModalProducao(null)} className="inline-flex items-center justify-center w-10 h-10 -mr-2 shrink-0 rounded-md hover:bg-eno-800 text-eno-100 hover:text-white transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs">
              
              {/* CARD DE PROGRESSO POR PRODUTO DO PEDIDO */}
              <div className="p-4 bg-papel-2 rounded-md border border-linha space-y-3">
                <div className="flex items-center justify-between border-b border-linha pb-2">
                  <span className="font-bold text-tinta uppercase tracking-wider text-xs flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-eno-700" />
                    <span>Progresso Individual por Produto do Pedido</span>
                  </span>
                  <span className="text-cinza tabular-nums text-[11px]">
                    Destinatário: <strong className="text-tinta">{modalProducao.cliente_nome}</strong> ({modalProducao.cliente_cidade_uf})
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
                        className={`p-3 rounded-md border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-eno-50 border-eno-600 ring-2 ring-eno-700/20 shadow-xs'
                            : 'bg-papel border-linha hover:border-linha-forte'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div>
                            <div className="font-extrabold text-tinta text-xs">{item.produto_nome}</div>
                            <div className="text-[10px] text-cinza">Embalagem: {item.tipo_embalagem}</div>
                            {(() => {
                              const op = opDoItem(modalProducao.id, idx);
                              if (!op) return null;
                              return (
                                <div className={`text-[10px] font-bold tabular-nums ${op.status === 'CONCLUIDA' ? 'text-eno-700' : 'text-st-producao'}`}>
                                  {op.numero} · {op.status === 'CONCLUIDA' ? 'OP concluída (estoque lançado)' : op.status === 'EM_PRODUCAO' ? 'OP em produção' : 'OP planejada'}
                                </div>
                              );
                            })()}
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full tabular-nums ${
                            isConcluido
                              ? 'bg-eno-100 text-eno-800 border border-eno-100'
                              : pct > 0
                              ? 'bg-st-producao-bg text-st-producao border border-st-producao/30'
                              : 'bg-papel-3/60 text-tinta-2'
                          }`}>
                            {isConcluido ? '✓ 100% Concluído' : `${pct}% Produzido`}
                          </span>
                        </div>

                        {/* Barra de Progresso do Produto */}
                        <div className="w-full h-2.5 bg-papel-3/60 rounded-full overflow-hidden border border-linha mt-2">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isConcluido ? 'bg-eno-600' : 'bg-eno-700'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        <div className="flex justify-between items-center text-[11px] tabular-nums mt-1.5">
                          <span className="text-tinta-2">
                            Finalizado: <strong className="text-tinta">{qtdProd}</strong> de {item.quantidade} {item.tipo_embalagem.includes('Fardo') ? 'fardos' : 'sacos'}
                          </span>
                          <span className="text-cinza">
                            Faltam: <strong className="text-eno-800">{Math.max(0, item.quantidade - qtdProd)}</strong>
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
                      <div className="p-2.5 rounded-md bg-st-vencido-bg border border-st-vencido/30 text-st-vencido font-semibold flex items-center gap-1.5">
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
                <div className="lg:col-span-6 space-y-3.5 p-4 bg-eno-50/60 rounded-md border border-eno-100">
                  <div className="flex items-center justify-between border-b border-eno-100/80 pb-2">
                    <span className="font-bold text-eno-800 uppercase tracking-wider text-xs block">
                      Apontar Quantidade Finalizada
                    </span>
                    <span className="text-[10px] font-semibold text-eno-800">
                      Selecione o produto e registre
                    </span>
                  </div>

                  <form onSubmit={handleRegistrarProducaoProduto} className="space-y-3">
                    
                    {/* Seletor de Produto */}
                    <div>
                      <label className="block font-bold text-tinta-2 mb-1">
                        Produto a Apontar *
                      </label>
                      <select
                        value={produtoSelecionadoId}
                        onChange={(e) => setProdutoSelecionadoId(e.target.value)}
                        className="w-full bg-papel border border-linha-forte rounded-lg px-3 py-2 text-xs font-bold text-tinta focus:outline-none focus:border-eno-700 cursor-pointer"
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
                          <label className="block font-bold text-tinta-2">
                            Qtd Finalizada Agora (Embalagens) *
                          </label>
                          {(() => {
                            const itemAlvo = modalProducao.itens.find(i => i.produto_id === produtoSelecionadoId);
                            const falta = itemAlvo ? Math.max(0, itemAlvo.quantidade - (itemAlvo.quantidade_produzida || 0)) : 0;
                            return (
                              <span className="text-[10px] text-cinza tabular-nums">
                                Restam: <strong className="text-eno-800">{falta}</strong>
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
                          className="w-full bg-papel border border-linha-forte rounded-lg px-3 py-2 tabular-nums font-extrabold text-eno-800 text-sm focus:outline-none focus:border-eno-700"
                        />
                        
                        {/* BOTÕES DE APONTAMENTO RÁPIDO */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <span className="text-[10px] text-cinza font-semibold">Atalhos:</span>
                          {[10, 25, 50, 100, 200].map(val => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setQtdEmbalagensInput(String(val))}
                              className="px-2 py-0.5 rounded bg-papel-3/60 hover:bg-eno-100 hover:text-eno-800 border border-linha text-[10px] tabular-nums font-bold text-tinta-2 transition-colors cursor-pointer"
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
                                  className="px-2 py-0.5 rounded bg-eno-600 hover:bg-eno-700 text-white text-[10px] tabular-nums font-bold transition-colors cursor-pointer"
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
                          <span className="text-[10px] text-eno-800 tabular-nums mt-1 font-semibold block">
                            Equivale a: {(parseInt(qtdEmbalagensInput) * (modalProducao.itens.find(i => i.produto_id === produtoSelecionadoId)?.peso_unitario_kg || 25)).toLocaleString('pt-BR')} kg
                          </span>
                        )}
                      </div>

                      <div>
                        <label className="block font-bold text-tinta-2 mb-1">
                          Data do Apontamento
                        </label>
                        <input
                          type="date"
                          value={paraISO(dataApontamento)}
                          onChange={(e) => setDataApontamento(e.target.value)}
                          className="w-full bg-papel border border-linha-forte rounded-lg px-3 py-2 tabular-nums text-tinta focus:outline-none focus:border-eno-700"
                        />
                      </div>
                    </div>

                    {/* Lote e Vencimento */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-eno-100">
                      <div>
                        <label className="block font-bold text-tinta-2 mb-1">
                          Número do Lote *
                        </label>
                        <input
                          type="text"
                          required
                          value={loteInput}
                          onChange={(e) => setLoteInput(e.target.value)}
                          placeholder="Ex: LOT-2026-F104"
                          className="w-full bg-papel border border-linha-forte rounded-lg px-2.5 py-1.5 tabular-nums font-bold text-tinta focus:outline-none focus:border-eno-700"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-tinta-2 mb-1">
                          Data de Vencimento *
                        </label>
                        <input
                          type="date"
                          required
                          value={paraISO(dataVencimentoInput)}
                          onChange={(e) => setDataVencimentoInput(e.target.value)}
                          className="w-full bg-papel border border-linha-forte rounded-lg px-2.5 py-1.5 tabular-nums font-bold text-tinta focus:outline-none focus:border-eno-700"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-tinta-2 mb-1">Turno / Operador</label>
                        <select
                          value={operadorTurno}
                          onChange={(e) => setOperadorTurno(e.target.value)}
                          className="w-full bg-papel border border-linha-forte rounded-lg px-2.5 py-1.5 text-xs text-tinta cursor-pointer"
                        >
                          <option value="Turno A (Manhã) - Carlos Ferreira">Turno A (Manhã)</option>
                          <option value="Turno B (Tarde) - Marcelo Silveira">Turno B (Tarde)</option>
                          <option value="Turno C (Noite) - Robson Alves">Turno C (Noite)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-tinta-2 mb-1">Observações do Turno</label>
                        <input
                          type="text"
                          value={observacaoApontamento}
                          onChange={(e) => setObservacaoApontamento(e.target.value)}
                          placeholder="Ex: Ensaque concluído e paletizado"
                          className="w-full bg-papel border border-linha-forte rounded-lg px-2.5 py-1.5 text-tinta"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        className="flex items-center gap-2 px-5 py-2 rounded-md bg-eno-800 hover:bg-eno-900 text-white font-bold text-xs cursor-pointer shadow-xs hover:shadow"
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
                    <span className="font-bold text-tinta uppercase tracking-wider text-xs block">
                      Histórico de Apontamentos Realizados
                    </span>
                    <span className="text-cinza tabular-nums text-[11px]">
                      Total: <strong className="text-eno-800 font-bold">{modalProducao.quantidade_produzida_acumulada_kg?.toLocaleString('pt-BR') || 0} kg</strong>
                    </span>
                  </div>
                  
                  {(!modalProducao.apontamentos_producao || modalProducao.apontamentos_producao.length === 0) ? (
                    <div className="p-8 text-center text-cinza bg-papel-2 rounded-md border border-linha">
                      <Factory className="w-8 h-8 text-cinza-claro mx-auto mb-2" />
                      <p>Nenhum apontamento registrado ainda.</p>
                      <p className="text-[11px] text-cinza mt-0.5">Selecione um produto ao lado e lance as embalagens finalizadas.</p>
                    </div>
                  ) : (
                    <div className="border border-linha rounded-md overflow-hidden shadow-xs">
                      <table className="w-full text-left">
                        <thead className="bg-papel-3/60 text-[10px] font-bold uppercase text-tinta-2 border-b border-linha">
                          <tr>
                            <th className="py-2.5 px-3">Data</th>
                            <th className="py-2.5 px-3">Produto / Embalagem</th>
                            <th className="py-2.5 px-3 text-right">Qtd Finalizada</th>
                            <th className="py-2.5 px-3">Operador / Lote</th>
                            <th className="py-2.5 px-2 text-right">Ação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-linha tabular-nums text-xs">
                          {modalProducao.apontamentos_producao.map((apt) => (
                            <tr key={apt.id} className="hover:bg-papel-2">
                              <td className="py-2.5 px-3 font-semibold text-tinta">{formatarDataBR(apt.data)}</td>
                              <td className="py-2.5 px-3 font-sans">
                                <div className="font-bold text-tinta truncate max-w-[140px]" title={apt.produto_nome}>
                                  {apt.produto_nome || 'Produto'}
                                </div>
                                <div className="text-[10px] text-cinza">{apt.tipo_embalagem}</div>
                              </td>
                              <td className="py-2.5 px-3 text-right font-extrabold text-eno-800">
                                {apt.quantidade_produzida_embalagens ? `${apt.quantidade_produzida_embalagens} un` : ''}
                                <div className="text-[10px] text-cinza font-normal">
                                  +{apt.quantidade_produzida_kg.toLocaleString('pt-BR')} kg
                                </div>
                              </td>
                              <td className="py-2.5 px-3 font-sans text-tinta-2 text-[11px]">
                                <div>{apt.operador}</div>
                                {apt.lote && <div className="text-[10px] tabular-nums text-eno-700 font-bold">{apt.lote}</div>}
                              </td>
                              <td className="py-2.5 px-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoverApontamento(apt.id)}
                                  className="p-1 text-cinza hover:text-st-vencido rounded transition-colors"
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
            <div className="p-4 bg-papel-2 border-t border-linha flex flex-wrap items-center justify-between gap-3 shrink-0 gap-2 max-sm:[&>button]:flex-1 max-sm:[&>button]:justify-center max-sm:[&>button]:min-h-11">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setModalProducao(null)}
                  className="px-4 py-2 rounded-lg bg-papel-3/60 hover:bg-linha text-tinta-2 font-bold text-xs cursor-pointer"
                >
                  Fechar
                </button>

                {loteInput.trim() && dataVencimentoInput.trim() ? (
                  <div className="hidden sm:flex items-center gap-1.5 text-eno-800 bg-eno-50 px-3 py-1.5 rounded-lg border border-eno-100 text-[11px] font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-eno-700 shrink-0" />
                    <span>Rastreabilidade OK: Lote {loteInput} • Venc: {formatarDataBR(dataVencimentoInput)}</span>
                  </div>
                ) : (
                  <div className="hidden sm:flex items-center gap-1.5 text-st-aguardando bg-st-aguardando-bg px-3 py-1.5 rounded-lg border border-ouro text-[11px] font-bold">
                    <AlertTriangle className="w-3.5 h-3.5 text-st-aguardando shrink-0" />
                    <span>Lote e Vencimento obrigatórios para liberar ao faturamento</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => handleTentarConcluirProducao(modalProducao)}
                className="flex items-center gap-1.5 px-5 py-2 rounded-md bg-eno-900 hover:bg-eno-950 text-white font-bold text-xs shadow-xs cursor-pointer transition-all hover:scale-102"
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
        <div className="fixed inset-0 z-[110] overflow-y-auto bg-black/80 backdrop-blur-xs p-0 sm:p-6 flex justify-center items-stretch sm:items-center animate-fadeIn">
          <div className="max-sm:[&_input:not([type=checkbox]):not([type=radio]):not([type=file])]:min-h-11 max-sm:[&_input]:text-base max-sm:[&_select]:min-h-11 max-sm:[&_select]:text-base max-sm:[&_textarea]:text-base relative w-full max-w-lg bg-papel rounded-none sm:rounded-md shadow-2xl overflow-hidden border-0 sm:border border-ouro flex flex-col">
            <div className="bg-ouro-escuro text-white px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <Lock className="w-5 h-5 text-white" />
                <div>
                  <h3 className="font-bold text-sm text-white">
                    Rastreabilidade Obrigatória
                  </h3>
                  <p className="text-[11px] text-ouro-claro">
                    O pedido não pode ir para faturamento sem Lote e Vencimento.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalBloqueioLote(null)}
                className="inline-flex items-center justify-center w-10 h-10 -mr-2 shrink-0 rounded-md hover:bg-ouro-escuro text-ouro-claro hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmarLoteEVencimentoAvancar} className="p-4 sm:p-6 space-y-4 text-xs">
              <div className="p-3 bg-st-aguardando-bg rounded-md border border-ouro-claro/60 text-st-aguardando text-xs">
                <strong>Atenção:</strong> Por normas de controle de qualidade e expedição industrial do Grupo ENO, todo pedido destinado ao faturamento deve conter o <strong>Lote de Produção</strong> e a <strong>Data de Vencimento</strong> impressos na embalagem.
              </div>

              <div>
                <span className="text-cinza block font-medium">Pedido:</span>
                <span className="tabular-nums font-bold text-tinta text-sm">{modalBloqueioLote.numero_pedido} - {modalBloqueioLote.cliente_nome}</span>
              </div>

              <div>
                <label className="block font-bold text-tinta mb-1">
                  Número do Lote de Fabricação *
                </label>
                <input
                  type="text"
                  required
                  value={loteInput}
                  onChange={(e) => setLoteInput(e.target.value)}
                  placeholder="Ex: LOT-2026-F104"
                  className="w-full bg-papel-2 border border-linha-forte rounded-lg px-3 py-2 tabular-nums font-extrabold text-tinta focus:outline-none focus:border-eno-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-tinta mb-1">
                    Data de Fabricação *
                  </label>
                  <input
                    type="date"
                    required
                    value={paraISO(dataFabricacaoInput)}
                    onChange={(e) => setDataFabricacaoInput(e.target.value)}
                    className="w-full bg-papel-2 border border-linha-forte rounded-lg px-3 py-2 tabular-nums font-bold text-tinta focus:outline-none focus:border-eno-700"
                  />
                </div>

                <div>
                  <label className="block font-bold text-tinta mb-1">
                    Data de Vencimento *
                  </label>
                  <input
                    type="date"
                    required
                    value={paraISO(dataVencimentoInput)}
                    onChange={(e) => setDataVencimentoInput(e.target.value)}
                    className="w-full bg-papel-2 border border-linha-forte rounded-lg px-3 py-2 tabular-nums font-bold text-tinta focus:outline-none focus:border-eno-700"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-linha flex items-center justify-end gap-2 max-sm:sticky max-sm:-bottom-4 max-sm:z-10 max-sm:-mx-4 max-sm:-mb-4 max-sm:px-4 max-sm:pb-4 max-sm:bg-papel max-sm:[&>button]:flex-1 max-sm:[&>button]:justify-center max-sm:[&>button]:min-h-11">
                <button
                  type="button"
                  onClick={() => setModalBloqueioLote(null)}
                  className="px-4 py-2 rounded-lg bg-papel-3/60 hover:bg-linha text-tinta-2 font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-eno-900 hover:bg-eno-950 text-white font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
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
