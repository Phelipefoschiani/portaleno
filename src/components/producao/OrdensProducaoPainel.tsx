import React, { useEffect, useMemo, useState } from 'react';
import {
  ClipboardList,
  Plus,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  X,
  Package,
  FlaskConical,
  ShoppingBag,
  Warehouse,
  Tag,
  PenLine
} from 'lucide-react';
import {
  OrdemProducao,
  StatusOrdemProducao,
  EVENTO_OPS,
  carregarOrdensProducao,
  criarOrdemProducaoEstoque,
  iniciarOrdemProducao,
  apontarProducaoOP,
  concluirOrdemProducao,
  cancelarOrdemProducao,
  necessidadeMateriaPrimaOP,
  garantirOrdensDosPedidosEmProducao,
  validadePadraoProduto,
  loteSugeridoOP
} from '../../data/ordensProducaoData';
import { calcularConsumoProducao, ConsumoMateriaPrimaProducao } from '../../data/pipelineIntegrado';
import { carregarEstoqueProdutos, ProdutoEstoque } from '../../data/produtosData';
import { formatarDataBR, hojeISO } from '../../lib/datas';
import { PedidosNavTabs } from '../pedidos/PedidosNavTabs';

interface Props {
  // ADMIN: tela no fluxo de Pedidos | PRODUCAO: portal do chão de fábrica (sem valores financeiros)
  modo?: 'ADMIN' | 'PRODUCAO';
  onNavigate?: (tabId: string) => void;
}

type FiltroStatus = 'ABERTAS' | StatusOrdemProducao | 'TODAS';

const fmt = (n: number, casas = 3) => (Number(n) || 0).toLocaleString('pt-BR', { maximumFractionDigits: casas });

const ROTULO_STATUS: Record<StatusOrdemProducao, { rotulo: string; classe: string }> = {
  PLANEJADA: { rotulo: 'Planejada', classe: 'bg-sky-50 text-sky-800 border-sky-200' },
  EM_PRODUCAO: { rotulo: 'Em Produção', classe: 'bg-amber-50 text-amber-800 border-amber-300' },
  CONCLUIDA: { rotulo: 'Concluída', classe: 'bg-emerald-50 text-emerald-800 border-emerald-300' },
  CANCELADA: { rotulo: 'Cancelada', classe: 'bg-slate-100 text-slate-500 border-slate-200' }
};

// Tabela de MP necessária x estoque, com alerta vermelho do que falta
export function TabelaMateriaPrimaOP({ itens, titulo, real }: { itens: ConsumoMateriaPrimaProducao[]; titulo: string; real?: boolean }) {
  if (itens.length === 0) {
    return (
      <div className="text-[11px] text-slate-400 italic px-1">
        {real ? 'Nenhuma matéria-prima baixada.' : 'Sem matéria-prima calculada (produto sem receita ou quantidade zerada).'}
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">{titulo}</div>
      <table className="w-full text-[11px]">
        <thead>
          <tr className="text-slate-400 text-[10px] uppercase">
            <th className="text-left py-1 px-3 font-bold">Matéria-prima</th>
            <th className="text-right py-1 px-3 font-bold">{real ? 'Necessário' : 'Necessária'}</th>
            <th className="text-right py-1 px-3 font-bold">{real ? 'Estoque na baixa' : 'Estoque atual'}</th>
            {real && <th className="text-right py-1 px-3 font-bold">Baixado</th>}
            <th className="text-right py-1 px-3 font-bold">Falta</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-mono">
          {itens.map(c => (
            <tr key={c.materia_prima_id} className={c.falta > 0 ? 'bg-red-50/70' : ''}>
              <td className="py-1 px-3 font-sans font-semibold text-slate-800">
                {c.materia_prima_nome}
                {c.unidade_incompativel && <span className="ml-1 text-[9px] text-amber-700 font-bold">(unidade incompatível na receita)</span>}
              </td>
              <td className="py-1 px-3 text-right">{fmt(c.quantidade_necessaria)} {c.unidade}</td>
              <td className="py-1 px-3 text-right text-slate-600">{fmt(c.estoque_atual)} {c.unidade}</td>
              {real && <td className="py-1 px-3 text-right">{fmt(c.quantidade_consumida || 0)} {c.unidade}</td>}
              <td className={`py-1 px-3 text-right font-bold ${c.falta > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                {c.falta > 0 ? `-${fmt(c.falta)} ${c.unidade}` : 'OK'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function OrdensProducaoPainel({ modo = 'ADMIN', onNavigate }: Props) {
  const [ops, setOps] = useState<OrdemProducao[]>([]);
  const [produtos, setProdutos] = useState<ProdutoEstoque[]>([]);
  const [filtro, setFiltro] = useState<FiltroStatus>('ABERTAS');
  const [busca, setBusca] = useState('');
  const [versao, setVersao] = useState(0); // força recálculo das necessidades quando o estoque muda

  // Nova OP para estoque
  const [novaAberta, setNovaAberta] = useState(false);
  const [novaProdutoId, setNovaProdutoId] = useState('');
  const [novaQtd, setNovaQtd] = useState('');
  const [novaData, setNovaData] = useState('');
  const [novaObs, setNovaObs] = useState('');

  // Apontamento / conclusão
  const [opAcao, setOpAcao] = useState<{ op: OrdemProducao; tipo: 'APONTAR' | 'CONCLUIR' } | null>(null);
  const [formPacotes, setFormPacotes] = useState('');
  const [formLote, setFormLote] = useState('');
  const [formFabricacao, setFormFabricacao] = useState('');
  const [formValidade, setFormValidade] = useState('');
  const [formOperador, setFormOperador] = useState('');
  const [formObs, setFormObs] = useState('');

  const recarregar = () => {
    setOps(carregarOrdensProducao());
    setProdutos(carregarEstoqueProdutos());
    setVersao(v => v + 1);
  };

  useEffect(() => {
    try {
      garantirOrdensDosPedidosEmProducao();
    } catch (e) {
      console.error('Erro ao gerar OPs dos pedidos em produção:', e);
    }
    recarregar();
    const h = () => recarregar();
    window.addEventListener(EVENTO_OPS, h);
    window.addEventListener('produtos_updated', h);
    window.addEventListener('pedidos_venda_updated', h);
    return () => {
      window.removeEventListener(EVENTO_OPS, h);
      window.removeEventListener('produtos_updated', h);
      window.removeEventListener('pedidos_venda_updated', h);
    };
  }, []);

  // Necessidade de MP de cada OP aberta (o que falta produzir)
  const necessidades = useMemo(() => {
    const mapa = new Map<string, ConsumoMateriaPrimaProducao[]>();
    ops.forEach(op => {
      if (op.status === 'PLANEJADA' || op.status === 'EM_PRODUCAO') mapa.set(op.id, necessidadeMateriaPrimaOP(op, 'RESTANTE'));
    });
    return mapa;
  }, [ops, versao]);

  const contagem = useMemo(() => ({
    ABERTAS: ops.filter(o => o.status === 'PLANEJADA' || o.status === 'EM_PRODUCAO').length,
    PLANEJADA: ops.filter(o => o.status === 'PLANEJADA').length,
    EM_PRODUCAO: ops.filter(o => o.status === 'EM_PRODUCAO').length,
    CONCLUIDA: ops.filter(o => o.status === 'CONCLUIDA').length,
    CANCELADA: ops.filter(o => o.status === 'CANCELADA').length,
    TODAS: ops.length,
    comFalta: ops.filter(o => (necessidades.get(o.id) || []).some(c => c.falta > 0)).length
  }), [ops, necessidades]);

  const opsFiltradas = useMemo(() => {
    const b = busca.trim().toLowerCase();
    return ops
      .filter(o => {
        if (filtro === 'ABERTAS') return o.status === 'PLANEJADA' || o.status === 'EM_PRODUCAO';
        if (filtro === 'TODAS') return true;
        return o.status === filtro;
      })
      .filter(o =>
        !b ||
        o.numero.toLowerCase().includes(b) ||
        o.produto_nome.toLowerCase().includes(b) ||
        (o.pedido_numero || '').toLowerCase().includes(b) ||
        (o.cliente_nome || '').toLowerCase().includes(b) ||
        (o.lote || '').toLowerCase().includes(b)
      )
      .sort((a, b2) => {
        const ordem: Record<StatusOrdemProducao, number> = { EM_PRODUCAO: 0, PLANEJADA: 1, CONCLUIDA: 2, CANCELADA: 3 };
        if (ordem[a.status] !== ordem[b2.status]) return ordem[a.status] - ordem[b2.status];
        return String(b2.data_criacao).localeCompare(String(a.data_criacao)) || b2.numero.localeCompare(a.numero);
      });
  }, [ops, filtro, busca]);

  const previaNova = useMemo(() => {
    const qtd = parseFloat(novaQtd) || 0;
    if (!novaProdutoId || qtd <= 0) return [];
    return calcularConsumoProducao(novaProdutoId, qtd);
  }, [novaProdutoId, novaQtd, versao]);

  const handleCriarNova = (e: React.FormEvent) => {
    e.preventDefault();
    const qtd = parseFloat(novaQtd) || 0;
    if (!novaProdutoId || qtd <= 0) {
      alert('Escolha o produto e informe a quantidade de pacotes.');
      return;
    }
    if (previaNova.some(c => c.falta > 0)) {
      const lista = previaNova.filter(c => c.falta > 0).map(c => `• ${c.materia_prima_nome}: faltam ${fmt(c.falta)} ${c.unidade}`).join('\n');
      if (!confirm(`Atenção: o estoque de matéria-prima não cobre esta OP.\n\n${lista}\n\nCriar a OP mesmo assim?`)) return;
    }
    const op = criarOrdemProducaoEstoque({ produto_id: novaProdutoId, quantidade_pacotes: qtd, data_prevista: novaData, observacoes: novaObs });
    if (!op) {
      alert('Não foi possível criar a OP.');
      return;
    }
    setNovaAberta(false);
    setNovaProdutoId('');
    setNovaQtd('');
    setNovaData('');
    setNovaObs('');
    setFiltro('ABERTAS');
  };

  const abrirAcao = (op: OrdemProducao, tipo: 'APONTAR' | 'CONCLUIR') => {
    const fab = op.data_fabricacao || hojeISO();
    setOpAcao({ op, tipo });
    setFormPacotes(tipo === 'CONCLUIR' ? String(op.quantidade_produzida_pacotes || 0) : '');
    setFormLote(op.lote || loteSugeridoOP(op.numero));
    setFormFabricacao(fab);
    setFormValidade(op.data_validade || validadePadraoProduto(op.produto_id, fab));
    setFormOperador('');
    setFormObs('');
  };

  const handleIniciar = (op: OrdemProducao) => {
    const falta = (necessidades.get(op.id) || []).filter(c => c.falta > 0);
    if (falta.length > 0) {
      const lista = falta.map(c => `• ${c.materia_prima_nome}: faltam ${fmt(c.falta)} ${c.unidade}`).join('\n');
      if (!confirm(`Atenção: falta matéria-prima para a ${op.numero}.\n\n${lista}\n\nIniciar a produção mesmo assim?`)) return;
    }
    iniciarOrdemProducao(op.id);
  };

  const handleCancelar = (op: OrdemProducao) => {
    const extra = op.origem === 'PEDIDO' ? `\n\nEsta OP veio do pedido ${op.pedido_numero}. Ao cancelar, a produção desse item será lançada pelo pedido quando ele for para "A Faturar".` : '';
    if (confirm(`Cancelar a ${op.numero} (${op.produto_nome})?${extra}`)) cancelarOrdemProducao(op.id);
  };

  const handleConfirmarAcao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!opAcao) return;
    const { op, tipo } = opAcao;
    const pacotes = parseFloat(formPacotes) || 0;
    if (!formLote.trim()) {
      alert('Informe o lote de fabricação.');
      return;
    }
    if (!formValidade) {
      alert('Informe a data de validade.');
      return;
    }
    if (tipo === 'APONTAR') {
      if (pacotes === 0) {
        alert('Informe a quantidade de pacotes produzidos (use negativo para corrigir).');
        return;
      }
      apontarProducaoOP(op.id, pacotes, {
        operador: formOperador || undefined,
        observacao: formObs || undefined,
        lote: formLote,
        data_fabricacao: formFabricacao,
        data_validade: formValidade
      });
      setOpAcao(null);
      return;
    }
    // CONCLUIR
    if (pacotes <= 0 && !confirm('Nenhum pacote produzido. Concluir a OP sem entrada de produto no estoque?')) return;
    const consumo = calcularConsumoProducao(op.produto_id, pacotes, { produtoNome: op.produto_nome, pesoUnitarioKg: op.peso_unitario_kg });
    const falta = consumo.filter(c => c.falta > 0);
    const aviso = falta.length > 0
      ? `\n\nATENÇÃO — matéria-prima insuficiente (o estoque ficará zerado nestes itens):\n${falta.map(c => `• ${c.materia_prima_nome}: faltam ${fmt(c.falta)} ${c.unidade}`).join('\n')}`
      : '';
    if (!confirm(`Concluir a ${op.numero}?\n\n• Entrada no estoque: ${fmt(pacotes)} pacotes de ${op.produto_nome}\n• Lote: ${formLote} · Validade: ${formatarDataBR(formValidade)}\n• Baixa de matéria-prima pela receita${aviso}`)) return;
    concluirOrdemProducao(op.id, {
      pacotes_produzidos: pacotes,
      lote: formLote,
      data_fabricacao: formFabricacao,
      data_validade: formValidade
    });
    setOpAcao(null);
  };

  const filtros: { id: FiltroStatus; rotulo: string }[] = [
    { id: 'ABERTAS', rotulo: 'Abertas' },
    { id: 'PLANEJADA', rotulo: 'Planejadas' },
    { id: 'EM_PRODUCAO', rotulo: 'Em Produção' },
    { id: 'CONCLUIDA', rotulo: 'Concluídas' },
    { id: 'CANCELADA', rotulo: 'Canceladas' },
    { id: 'TODAS', rotulo: 'Todas' }
  ];

  const consumoAcao = useMemo(() => {
    if (!opAcao) return [];
    const base = opAcao.tipo === 'CONCLUIR' ? parseFloat(formPacotes) || 0 : Math.abs(parseFloat(formPacotes) || 0);
    return calcularConsumoProducao(opAcao.op.produto_id, base, { produtoNome: opAcao.op.produto_nome, pesoUnitarioKg: opAcao.op.peso_unitario_kg });
  }, [opAcao, formPacotes, versao]);

  const conteudo = (
    <>
      {/* CABEÇALHO */}
      <div className="bg-white border-b border-slate-200/80 px-6 py-3.5 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2 flex-wrap">
            <ClipboardList className="w-5 h-5 text-emerald-700" />
            <span>Ordens de Produção</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
              {contagem.ABERTAS} abertas
            </span>
            {contagem.comFalta > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 flex items-center gap-1 font-mono">
                <AlertTriangle className="w-3 h-3" />
                <span>{contagem.comFalta} com falta de matéria-prima</span>
              </span>
            )}
          </h1>
          <button
            onClick={() => setNovaAberta(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-900 hover:bg-emerald-950 text-white font-bold text-xs cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Nova OP para Estoque</span>
          </button>
        </div>
      </div>

      {/* FILTROS */}
      <div className="bg-[#f1f5f2] px-6 py-2.5 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap gap-1.5">
          {filtros.map(f => (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${filtro === f.id ? 'bg-emerald-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
            >
              {f.rotulo} <span className="font-mono opacity-70">{contagem[f.id]}</span>
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar OP, produto, pedido, lote..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs focus:outline-none focus:border-emerald-700"
          />
        </div>
      </div>

      {/* LISTA DE OPs */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-3">
        {opsFiltradas.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 py-12 text-center text-slate-400 text-sm font-medium">
            Nenhuma ordem de produção neste filtro.
          </div>
        )}
        {opsFiltradas.map(op => {
          const st = ROTULO_STATUS[op.status];
          const nec = necessidades.get(op.id) || [];
          const temFalta = nec.some(c => c.falta > 0);
          const aberta = op.status === 'PLANEJADA' || op.status === 'EM_PRODUCAO';
          const progresso = op.quantidade_planejada_pacotes > 0 ? Math.min(100, Math.round((op.quantidade_produzida_pacotes / op.quantidade_planejada_pacotes) * 100)) : 0;
          const un = op.unidades_por_embalagem || 1;
          return (
            <div key={op.id} className={`bg-white rounded-xl border shadow-xs p-4 space-y-3 ${temFalta ? 'border-red-300' : 'border-slate-200'}`}>
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-black text-slate-900 text-sm">{op.numero}</span>
                    <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${st.classe}`}>{st.rotulo}</span>
                    {op.origem === 'PEDIDO' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-violet-50 border border-violet-200 text-violet-800 text-[10px] font-bold">
                        <ShoppingBag className="w-3 h-3" /> {op.pedido_numero} · {op.cliente_nome}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold">
                        <Warehouse className="w-3 h-3" /> Para estoque
                      </span>
                    )}
                    {temFalta && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold">
                        <AlertTriangle className="w-3 h-3" /> Falta matéria-prima
                      </span>
                    )}
                  </div>
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-emerald-700" /> {op.produto_nome}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap">
                    <FlaskConical className="w-3 h-3" />
                    <span>{op.receita_nome ? `Receita: ${op.receita_nome}` : 'Sem receita vinculada'}</span>
                    <span>•</span>
                    <span>Criada {formatarDataBR(op.data_criacao)}</span>
                    {op.data_prevista && <><span>•</span><span>Prevista {formatarDataBR(op.data_prevista)}</span></>}
                    {op.data_conclusao && <><span>•</span><span>Concluída {formatarDataBR(op.data_conclusao)}</span></>}
                  </div>
                  {(op.lote || op.data_validade) && (
                    <div className="text-[11px] text-slate-600 flex items-center gap-1.5 flex-wrap">
                      <Tag className="w-3 h-3" />
                      <span>Lote <strong className="font-mono">{op.lote || '-'}</strong></span>
                      <span>• Fab. {formatarDataBR(op.data_fabricacao)}</span>
                      <span>• Val. {formatarDataBR(op.data_validade)}</span>
                    </div>
                  )}
                </div>

                <div className="min-w-[220px] space-y-2">
                  <div className="text-xs">
                    <div className="flex justify-between font-semibold text-slate-600">
                      <span>Produzido</span>
                      <span className="font-mono text-slate-900">
                        {fmt(op.quantidade_produzida_pacotes)} / {fmt(op.quantidade_planejada_pacotes)} pct
                      </span>
                    </div>
                    {un > 1 && (
                      <div className="text-[10px] text-slate-400 text-right font-mono">
                        {fmt(op.quantidade_produzida_pacotes / un)} / {fmt(op.quantidade_planejada_pacotes / un)} {op.tipo_embalagem || 'embalagens'} ({un} pct)
                      </div>
                    )}
                    <div className="h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-emerald-600" style={{ width: `${progresso}%` }} />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 justify-end">
                    {op.status === 'PLANEJADA' && (
                      <button onClick={() => handleIniciar(op)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-700 hover:bg-sky-800 text-white text-[11px] font-bold cursor-pointer">
                        <Play className="w-3 h-3" /> Iniciar
                      </button>
                    )}
                    {aberta && (
                      <button onClick={() => abrirAcao(op, 'APONTAR')} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-[11px] font-bold cursor-pointer">
                        <PenLine className="w-3 h-3" /> Apontar
                      </button>
                    )}
                    {aberta && (
                      <button onClick={() => abrirAcao(op, 'CONCLUIR')} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-[11px] font-bold cursor-pointer">
                        <CheckCircle2 className="w-3 h-3" /> Concluir
                      </button>
                    )}
                    {aberta && modo === 'ADMIN' && (
                      <button onClick={() => handleCancelar(op)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-red-700 hover:bg-red-50 text-[11px] font-bold cursor-pointer">
                        <XCircle className="w-3 h-3" /> Cancelar
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {aberta && (
                <TabelaMateriaPrimaOP
                  itens={nec}
                  titulo={`Matéria-prima necessária para o que falta produzir (${fmt(Math.max(0, op.quantidade_planejada_pacotes - op.quantidade_produzida_pacotes))} pct) x estoque atual`}
                />
              )}
              {op.status === 'CONCLUIDA' && (
                <TabelaMateriaPrimaOP itens={op.consumo_real || []} titulo="Consumo real gravado na conclusão" real />
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL: NOVA OP PARA ESTOQUE */}
      {novaAberta && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <form onSubmit={handleCriarNova} className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl text-xs">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
              <h3 className="font-black text-slate-900 text-sm">Nova Ordem de Produção para Estoque</h3>
              <button type="button" onClick={() => setNovaAberta(false)} className="p-1 rounded-lg hover:bg-slate-100 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-7">
                  <label className="block font-bold text-slate-700 mb-1">Produto *</label>
                  <select
                    value={novaProdutoId}
                    onChange={e => setNovaProdutoId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none focus:border-emerald-700"
                  >
                    <option value="">-- Selecione --</option>
                    {produtos.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.codigo} - {p.nome} (estoque: {fmt(p.estoque_atual_sacos, 0)} pct){p.receita_id ? '' : ' — sem receita'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Pacotes *</label>
                  <input type="number" min="1" step="1" value={novaQtd} onChange={e => setNovaQtd(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-right focus:outline-none focus:border-emerald-700" />
                </div>
                <div className="sm:col-span-3">
                  <label className="block font-bold text-slate-700 mb-1">Previsão</label>
                  <input type="date" value={novaData} onChange={e => setNovaData(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono focus:outline-none focus:border-emerald-700" />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Observação</label>
                <input type="text" value={novaObs} onChange={e => setNovaObs(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-700" />
              </div>
              {novaProdutoId && (parseFloat(novaQtd) || 0) > 0 && (
                <TabelaMateriaPrimaOP itens={previaNova} titulo="Matéria-prima necessária x estoque atual" />
              )}
              {previaNova.some(c => c.falta > 0) && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-800 font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> O estoque de matéria-prima não cobre esta OP. Você pode criar mesmo assim.
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t border-slate-200 flex justify-end gap-2">
              <button type="button" onClick={() => setNovaAberta(false)} className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold cursor-pointer">Cancelar</button>
              <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-900 hover:bg-emerald-950 text-white font-bold cursor-pointer">Criar OP</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: APONTAR / CONCLUIR */}
      {opAcao && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <form onSubmit={handleConfirmarAcao} className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl text-xs">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
              <h3 className="font-black text-slate-900 text-sm">
                {opAcao.tipo === 'APONTAR' ? 'Apontar produção' : 'Concluir'} — {opAcao.op.numero} · {opAcao.op.produto_nome}
              </h3>
              <button type="button" onClick={() => setOpAcao(null)} className="p-1 rounded-lg hover:bg-slate-100 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="text-[11px] text-slate-600">
                Planejado: <strong className="font-mono">{fmt(opAcao.op.quantidade_planejada_pacotes)} pct</strong> · Já apontado: <strong className="font-mono">{fmt(opAcao.op.quantidade_produzida_pacotes)} pct</strong>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {opAcao.tipo === 'APONTAR' ? 'Pacotes produzidos agora *' : 'Total produzido (pct) *'}
                  </label>
                  <input type="number" step="1" value={formPacotes} onChange={e => setFormPacotes(e.target.value)} className="w-full border-2 border-emerald-600 rounded-xl px-3 py-2 font-mono font-black text-right focus:outline-none" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Lote *</label>
                  <input type="text" value={formLote} onChange={e => setFormLote(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold focus:outline-none focus:border-emerald-700" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fabricação</label>
                  <input
                    type="date"
                    value={formFabricacao}
                    onChange={e => {
                      setFormFabricacao(e.target.value);
                      if (e.target.value) setFormValidade(validadePadraoProduto(opAcao.op.produto_id, e.target.value));
                    }}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono focus:outline-none focus:border-emerald-700"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Validade *</label>
                  <input type="date" value={formValidade} onChange={e => setFormValidade(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono focus:outline-none focus:border-emerald-700" />
                </div>
              </div>
              {opAcao.tipo === 'APONTAR' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Operador / Turno</label>
                    <input type="text" value={formOperador} onChange={e => setFormOperador(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-700" />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Observação</label>
                    <input type="text" value={formObs} onChange={e => setFormObs(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-700" />
                  </div>
                </div>
              )}
              <TabelaMateriaPrimaOP
                itens={consumoAcao}
                titulo={opAcao.tipo === 'CONCLUIR' ? 'Baixa de matéria-prima na conclusão (receita x produzido)' : 'Matéria-prima correspondente a este apontamento (baixa só na conclusão)'}
              />
              {consumoAcao.some(c => c.falta > 0) && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-800 font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> Matéria-prima insuficiente no estoque. É possível seguir; a falta fica registrada na OP.
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t border-slate-200 flex justify-end gap-2">
              <button type="button" onClick={() => setOpAcao(null)} className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold cursor-pointer">Voltar</button>
              <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-900 hover:bg-emerald-950 text-white font-bold cursor-pointer">
                {opAcao.tipo === 'APONTAR' ? 'Registrar apontamento' : 'Concluir OP'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );

  if (modo === 'PRODUCAO') {
    return <div className="w-full flex flex-col bg-[#f8faf8] text-slate-800 rounded-2xl border border-slate-200 overflow-hidden min-h-[60vh]">{conteudo}</div>;
  }

  return (
    <div className="relative h-full w-full flex flex-col bg-[#f8faf8] text-slate-800 overflow-hidden">
      <PedidosNavTabs activeTab="pedidos_ordens_producao" onNavigate={onNavigate} />
      {conteudo}
    </div>
  );
}
