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
import { carregarColaboradoresProducao } from '../../data/cadastrosData';
import { carregarLotesMP, lotesDisponiveisMP, rotuloLoteMP, EVENTO_LOTES_MP, LoteMateriaPrima } from '../../data/lotesMateriaPrimaData';
import { formatarDataBR, hojeISO } from '../../lib/datas';
import { PedidosNavTabs } from '../pedidos/PedidosNavTabs';
import { CabecalhoPagina, BotaoPrimario, BotaoSecundario } from '../ui/CabecalhoPagina';
import { BarraFiltros, CampoBusca, Segmentado, SeletorFiltro } from '../ui/BarraFiltros';
import { TabelaDados, Th, Td, tabela } from '../ui/TabelaDados';
import { StatusChip } from '../ui/StatusChip';
import { EstadoVazio } from '../ui/EstadoVazio';

interface Props {
  // ADMIN: tela no fluxo de Pedidos | PRODUCAO: portal do chão de fábrica (sem valores financeiros)
  modo?: 'ADMIN' | 'PRODUCAO';
  onNavigate?: (tabId: string) => void;
}

type FiltroStatus = 'ABERTAS' | StatusOrdemProducao | 'TODAS';

// Pares [id da MP, ids dos lotes] de um mapa de lotes escolhidos
const paresLotes = (r?: Record<string, string[]>): [string, string[]][] => Object.keys(r || {}).map(k => [k, (r || {})[k] || []]);

const fmt = (n: number, casas = 3) => (Number(n) || 0).toLocaleString('pt-BR', { maximumFractionDigits: casas });

const TOM_STATUS: Record<StatusOrdemProducao, 'aguardando' | 'producao' | 'pago' | 'neutro'> = {
  PLANEJADA: 'aguardando',
  EM_PRODUCAO: 'producao',
  CONCLUIDA: 'pago',
  CANCELADA: 'neutro'
};

const ROTULO_STATUS: Record<StatusOrdemProducao, { rotulo: string; classe: string }> = {
  PLANEJADA: { rotulo: 'Planejada', classe: 'bg-st-producao-bg text-st-producao border-st-producao/30' },
  EM_PRODUCAO: { rotulo: 'Em Produção', classe: 'bg-st-aguardando-bg text-st-aguardando border-ouro' },
  CONCLUIDA: { rotulo: 'Concluída', classe: 'bg-eno-50 text-eno-800 border-eno-100' },
  CANCELADA: { rotulo: 'Cancelada', classe: 'bg-papel-3/60 text-cinza border-linha' }
};

// Tabela de MP necessária x estoque, com alerta vermelho do que falta
export function TabelaMateriaPrimaOP({ itens, titulo, real }: { itens: ConsumoMateriaPrimaProducao[]; titulo: string; real?: boolean }) {
  if (itens.length === 0) {
    return (
      <div className="text-[11px] text-cinza italic px-1">
        {real ? 'Nenhuma matéria-prima baixada.' : 'Sem matéria-prima calculada (produto sem receita ou quantidade zerada).'}
      </div>
    );
  }
  return (
    <div className="rounded-md border border-linha overflow-x-auto">
      <div className="bg-papel-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-cinza border-b border-linha">{titulo}</div>
      <table className="w-full text-[11px] [&_th]:whitespace-nowrap [&_td.text-right]:whitespace-nowrap">
        <thead>
          <tr className="text-cinza text-[10px] uppercase">
            <th className="text-left py-1 px-3 font-bold">Matéria-prima</th>
            <th className="text-right py-1 px-3 font-bold">{real ? 'Necessário' : 'Necessária'}</th>
            <th className="text-right py-1 px-3 font-bold">{real ? 'Estoque na baixa' : 'Estoque atual'}</th>
            {real && <th className="text-right py-1 px-3 font-bold">Baixado</th>}
            {real && <th className="text-left py-1 px-3 font-bold">Lotes usados</th>}
            <th className="text-right py-1 px-3 font-bold">Falta</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-linha tabular-nums">
          {itens.map(c => (
            <tr key={c.materia_prima_id} className={c.falta > 0 ? 'bg-st-vencido-bg/70' : ''}>
              <td className="py-1 px-3 font-sans font-semibold text-tinta">
                {c.materia_prima_nome}
                {c.unidade_incompativel && <span className="ml-1 text-[9px] text-st-aguardando font-bold">(unidade incompatível na receita)</span>}
              </td>
              <td className="py-1 px-3 text-right">{fmt(c.quantidade_necessaria)} {c.unidade}</td>
              <td className="py-1 px-3 text-right text-tinta-2">{fmt(c.estoque_atual)} {c.unidade}</td>
              {real && <td className="py-1 px-3 text-right">{fmt(c.quantidade_consumida || 0)} {c.unidade}</td>}
              {real && (
                <td className="py-1 px-3 text-left font-sans text-tinta-2">
                  {(c.lotes_usados || []).length === 0
                    ? '-'
                    : (c.lotes_usados || []).map(u => `${u.lote} (${fmt(u.quantidade)} ${u.unidade})`).join(' · ')}
                </td>
              )}
              <td className={`py-1 px-3 text-right font-bold ${c.falta > 0 ? 'text-st-vencido' : 'text-eno-700'}`}>
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
  const [erroAcao, setErroAcao] = useState('');
  const [formLotesMp, setFormLotesMp] = useState<Record<string, string[]>>({});
  const [lotesMp, setLotesMp] = useState<LoteMateriaPrima[]>([]);

  const recarregar = () => {
    setOps(carregarOrdensProducao());
    setProdutos(carregarEstoqueProdutos());
    setLotesMp(carregarLotesMP());
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
    window.addEventListener(EVENTO_LOTES_MP, h);
    return () => {
      window.removeEventListener(EVENTO_LOTES_MP, h);
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
    setOpAcao({ op, tipo });
    setErroAcao('');
    setFormPacotes(tipo === 'CONCLUIR' ? String(op.quantidade_produzida_pacotes || 0) : '');
    // Lote, fabricação e validade são informados pela produção (só vêm preenchidos se já foram lançados antes)
    setFormLote(op.lote || '');
    setFormFabricacao(op.data_fabricacao || '');
    setFormValidade(op.data_validade || '');
    setFormOperador('');
    setFormObs('');
    // Lotes de MP: no apontamento a produção escolhe; na conclusão já vêm os declarados nos apontamentos
    setFormLotesMp(tipo === 'CONCLUIR' ? { ...(op.lotes_mp || {}) } : {});
  };

  const alternarLoteMp = (mpId: string, loteId: string) => {
    setFormLotesMp(atual => {
      const ids = atual[mpId] || [];
      return { ...atual, [mpId]: ids.includes(loteId) ? ids.filter(i => i !== loteId) : [...ids, loteId] };
    });
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
    setErroAcao('');
    const { op, tipo } = opAcao;
    const pacotes = parseFloat(formPacotes) || 0;
    if (!formLote.trim()) {
      setErroAcao('Informe o lote de fabricação.');
      return;
    }
    if (!formFabricacao) {
      setErroAcao('Informe a data de fabricação.');
      return;
    }
    if (formFabricacao > hojeISO()) {
      setErroAcao('A data de fabricação não pode ser futura.');
      return;
    }
    if (!formValidade) {
      setErroAcao('Informe a data de validade.');
      return;
    }
    if (formValidade <= formFabricacao) {
      setErroAcao('A validade precisa ser depois da data de fabricação.');
      return;
    }
    // De qual lote saiu cada matéria-prima (obrigatório quando há lote cadastrado com saldo)
    const semLote = consumoAcao.filter(c => c.quantidade_necessaria > 0 && lotesDisponiveisMP(c.materia_prima_id).length > 0 && (formLotesMp[c.materia_prima_id] || []).length === 0);
    if (semLote.length > 0) {
      setErroAcao(`Marque de qual lote saiu a matéria-prima:\n${semLote.map(c => `• ${c.materia_prima_nome}`).join('\n')}`);
      return;
    }
    const lotesEscolhidos = Object.fromEntries(paresLotes(formLotesMp).filter(([, ids]) => ids.length > 0)) as Record<string, string[]>;
    const textoLotes = paresLotes(lotesEscolhidos)
      .map(([mpId, ids]) => {
        const doMp = lotesMp.filter(l => ids.includes(l.id));
        return doMp.length ? `${doMp[0].materia_prima_nome}: ${doMp.map(rotuloLoteMP).join(', ')}` : '';
      })
      .filter(Boolean)
      .join(' · ');
    if (tipo === 'APONTAR') {
      if (pacotes === 0) {
        setErroAcao('Informe a quantidade de pacotes produzidos (use negativo para corrigir).');
        return;
      }
      apontarProducaoOP(op.id, pacotes, {
        operador: formOperador || undefined,
        observacao: formObs || undefined,
        lote: formLote,
        data_fabricacao: formFabricacao,
        data_validade: formValidade,
        lotes_mp: lotesEscolhidos,
        lotes_mp_texto: textoLotes || undefined
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
      data_validade: formValidade,
      lotes_mp: lotesEscolhidos
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
      <div className="mx-auto w-full max-w-[1700px] shrink-0">
        <CabecalhoPagina
          titulo="Ordens de produção"
          className={modo === 'PRODUCAO' ? 'pt-4' : ''}
          resumo={
            <>
              {contagem.ABERTAS} {contagem.ABERTAS === 1 ? 'aberta' : 'abertas'} · {contagem.EM_PRODUCAO} em produção · {contagem.PLANEJADA} planejadas
              {contagem.comFalta > 0 && (
                <span className="text-st-vencido font-semibold"> · {contagem.comFalta} com falta de matéria-prima</span>
              )}
            </>
          }
          acoes={
            <BotaoPrimario onClick={() => setNovaAberta(true)} className="w-full sm:w-auto h-10 sm:h-9">
              <Plus className="w-4 h-4" />
              Nova OP para estoque
            </BotaoPrimario>
          }
        />
        <BarraFiltros>
          <Segmentado<FiltroStatus>
            rotuloAria="Situação das ordens"
            valor={filtro}
            onChange={setFiltro}
            className="w-full md:w-fit [&>button]:h-9 sm:[&>button]:h-7"
            opcoes={filtros.map(f => ({ valor: f.id, rotulo: f.rotulo, contagem: contagem[f.id] }))}
          />
          <CampoBusca valor={busca} onChange={setBusca} placeholder="Buscar OP, produto, pedido ou lote" className="w-full md:w-72" />
        </BarraFiltros>
      </div>

      {/* LISTA DE OPs */}
      <div className="flex-1 min-h-0 overflow-y-auto">
       <div className="mx-auto w-full max-w-[1700px] px-4 sm:px-6 pb-6 space-y-3">
        {opsFiltradas.length === 0 && (
          <div className="bg-papel rounded-md border border-linha">
            <EstadoVazio
              titulo={ops.length === 0 ? 'Nenhuma ordem de produção' : 'Nenhuma ordem neste filtro'}
              texto={
                ops.length === 0
                  ? 'As OPs nascem dos pedidos aprovados para produção. Para produzir para o estoque, crie uma OP avulsa.'
                  : 'Troque a situação acima ou limpe a busca.'
              }
            />
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
            <div key={op.id} className={`bg-papel rounded-md border p-4 space-y-3 ${temFalta ? 'border-st-vencido/40' : 'border-linha'}`}>
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="tabular-nums font-extrabold text-tinta text-sm">{op.numero}</span>
                    <StatusChip tom={TOM_STATUS[op.status]}>{st.rotulo}</StatusChip>
                    {op.origem === 'PEDIDO' ? (
                      <span className="inline-flex items-center gap-1 text-[11.5px] text-tinta-2 min-w-0">
                        <ShoppingBag className="w-3 h-3" /> {op.pedido_numero} · {op.cliente_nome}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11.5px] text-cinza">
                        <Warehouse className="w-3 h-3" /> Para estoque
                      </span>
                    )}
                    {temFalta && (
                      <StatusChip tom="vencido">Falta matéria-prima</StatusChip>
                    )}
                  </div>
                  <div className="text-[15px] font-bold text-tinta">
                    {op.produto_nome}
                  </div>
                  <div className="text-[11px] text-cinza flex items-center gap-1.5 flex-wrap">
                    <FlaskConical className="w-3 h-3" />
                    <span>{op.receita_nome ? `Receita: ${op.receita_nome}` : 'Sem receita vinculada'}</span>
                    <span>•</span>
                    <span>Criada {formatarDataBR(op.data_criacao)}</span>
                    {op.data_prevista && <><span>•</span><span>Prevista {formatarDataBR(op.data_prevista)}</span></>}
                    {op.data_conclusao && <><span>•</span><span>Concluída {formatarDataBR(op.data_conclusao)}</span></>}
                  </div>
                  {(op.lote || op.data_validade) && (
                    <div className="text-[11px] text-tinta-2 flex items-center gap-1.5 flex-wrap">
                      <Tag className="w-3 h-3" />
                      <span>Lote <strong className="tabular-nums">{op.lote || '-'}</strong></span>
                      <span>• Fab. {formatarDataBR(op.data_fabricacao)}</span>
                      <span>• Val. {formatarDataBR(op.data_validade)}</span>
                    </div>
                  )}
                  {op.status !== 'CONCLUIDA' && paresLotes(op.lotes_mp).some(([, ids]) => ids.length > 0) && (
                    <div className="text-[11px] text-tinta-2">
                      <span className="text-cinza">Lotes de MP: </span>
                      {paresLotes(op.lotes_mp)
                        .map(([, ids]) => {
                          const doMp = lotesMp.filter(l => ids.includes(l.id));
                          return doMp.length ? `${doMp[0].materia_prima_nome}: ${doMp.map(rotuloLoteMP).join(', ')}` : '';
                        })
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  )}
                </div>

                <div className="lg:min-w-[240px] space-y-2">
                  <div className="text-xs">
                    <div className="flex justify-between font-semibold text-tinta-2">
                      <span>Produzido</span>
                      <span className="tabular-nums text-tinta">
                        {fmt(op.quantidade_produzida_pacotes)} / {fmt(op.quantidade_planejada_pacotes)} pct
                      </span>
                    </div>
                    {un > 1 && (
                      <div className="text-[10px] text-cinza text-right tabular-nums">
                        {fmt(op.quantidade_produzida_pacotes / un)} / {fmt(op.quantidade_planejada_pacotes / un)} {op.tipo_embalagem || 'embalagens'} ({un} pct)
                      </div>
                    )}
                    <div className="h-1.5 bg-papel-3/60 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-eno-600" style={{ width: `${progresso}%` }} />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 lg:justify-end max-lg:[&>button]:flex-1 max-lg:[&>button]:justify-center max-sm:[&>button]:h-11">
                    {op.status === 'PLANEJADA' && (
                      <button onClick={() => handleIniciar(op)} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-st-producao hover:opacity-90 text-white text-[12.5px] font-bold cursor-pointer">
                        <Play className="w-4 h-4" /> Iniciar
                      </button>
                    )}
                    {aberta && (
                      <button onClick={() => abrirAcao(op, 'APONTAR')} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-eno-800 hover:bg-eno-900 text-white text-[12.5px] font-bold cursor-pointer">
                        <PenLine className="w-4 h-4" /> Apontar produção
                      </button>
                    )}
                    {aberta && (
                      <button onClick={() => abrirAcao(op, 'CONCLUIR')} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-papel border border-eno-700 text-eno-800 hover:bg-eno-50 text-[12.5px] font-bold cursor-pointer">
                        <CheckCircle2 className="w-4 h-4" /> Concluir
                      </button>
                    )}
                    {aberta && modo === 'ADMIN' && (
                      <button onClick={() => handleCancelar(op)} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-st-vencido hover:bg-st-vencido-bg text-[12.5px] font-bold cursor-pointer">
                        <XCircle className="w-4 h-4" /> Cancelar
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
      </div>

      {/* MODAL: NOVA OP PARA ESTOQUE */}
      {novaAberta && (
        <div className="fixed inset-0 z-50 bg-eno-900/60 flex items-stretch sm:items-center justify-center p-0 sm:p-4">
          <form onSubmit={handleCriarNova} className="min-w-0 max-sm:[&_input:not([type=checkbox]):not([type=radio]):not([type=file])]:min-h-11 max-sm:[&_input]:text-base max-sm:[&_select]:min-h-11 max-sm:[&_select]:text-base max-sm:[&_textarea]:text-base bg-papel rounded-none sm:rounded-md w-full max-w-2xl h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[90vh] overflow-y-auto shadow-xl text-xs flex flex-col">
            <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-2 border-b border-linha sticky top-0 bg-papel z-10">
              <h3 className="font-extrabold text-tinta text-sm">Nova Ordem de Produção para Estoque</h3>
              <button type="button" onClick={() => setNovaAberta(false)} className="inline-flex items-center justify-center w-10 h-10 -mr-2 shrink-0 rounded-md hover:bg-papel-3/60 cursor-pointer" aria-label="Fechar"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 sm:p-5 space-y-3 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-7">
                  <label className="block font-bold text-tinta-2 mb-1">Produto *</label>
                  <select
                    value={novaProdutoId}
                    onChange={e => setNovaProdutoId(e.target.value)}
                    className="w-full bg-papel border border-linha-forte rounded-md px-3 py-2 font-bold text-tinta focus:outline-none focus:border-eno-700"
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
                  <label className="block font-bold text-tinta-2 mb-1">Pacotes *</label>
                  <input type="number" min="1" step="1" value={novaQtd} onChange={e => setNovaQtd(e.target.value)} className="w-full border border-linha-forte rounded-md px-3 py-2 tabular-nums font-bold text-right focus:outline-none focus:border-eno-700" />
                </div>
                <div className="sm:col-span-3">
                  <label className="block font-bold text-tinta-2 mb-1">Previsão</label>
                  <input type="date" value={novaData} onChange={e => setNovaData(e.target.value)} className="w-full border border-linha-forte rounded-md px-3 py-2 tabular-nums focus:outline-none focus:border-eno-700" />
                </div>
              </div>
              <div>
                <label className="block font-bold text-tinta-2 mb-1">Observação</label>
                <input type="text" value={novaObs} onChange={e => setNovaObs(e.target.value)} className="w-full border border-linha-forte rounded-md px-3 py-2 focus:outline-none focus:border-eno-700" />
              </div>
              {novaProdutoId && (parseFloat(novaQtd) || 0) > 0 && (
                <TabelaMateriaPrimaOP itens={previaNova} titulo="Matéria-prima necessária x estoque atual" />
              )}
              {previaNova.some(c => c.falta > 0) && (
                <div className="p-2.5 rounded-md bg-st-vencido-bg border border-st-vencido/30 text-st-vencido font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> O estoque de matéria-prima não cobre esta OP. Você pode criar mesmo assim.
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t border-linha flex justify-end gap-2 sticky bottom-0 bg-papel max-sm:[&>button]:flex-1 max-sm:[&>button]:min-h-11">
              <button type="button" onClick={() => setNovaAberta(false)} className="px-4 py-2 rounded-md bg-papel-3/60 hover:bg-linha font-bold cursor-pointer">Cancelar</button>
              <button type="submit" className="px-4 py-2 rounded-md bg-eno-900 hover:bg-eno-950 text-white font-bold cursor-pointer">Criar OP</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: APONTAR / CONCLUIR */}
      {opAcao && (
        <div className="fixed inset-0 z-50 bg-eno-900/60 flex items-stretch sm:items-center justify-center p-0 sm:p-4">
          <form onSubmit={handleConfirmarAcao} className="min-w-0 max-sm:[&_input:not([type=checkbox]):not([type=radio]):not([type=file])]:min-h-11 max-sm:[&_input]:text-base max-sm:[&_select]:min-h-11 max-sm:[&_select]:text-base max-sm:[&_textarea]:text-base bg-papel rounded-none sm:rounded-md w-full max-w-2xl h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[90vh] overflow-y-auto shadow-xl text-xs flex flex-col">
            <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-2 border-b border-linha sticky top-0 bg-papel z-10">
              <h3 className="font-extrabold text-tinta text-sm">
                {opAcao.tipo === 'APONTAR' ? 'Apontar produção' : 'Concluir'} — {opAcao.op.numero} · {opAcao.op.produto_nome}
              </h3>
              <button type="button" onClick={() => setOpAcao(null)} className="inline-flex items-center justify-center w-10 h-10 -mr-2 shrink-0 rounded-md hover:bg-papel-3/60 cursor-pointer" aria-label="Fechar"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 sm:p-5 space-y-3 flex-1">
              <div className="text-[11px] text-tinta-2">
                Planejado: <strong className="tabular-nums">{fmt(opAcao.op.quantidade_planejada_pacotes)} pct</strong> · Já apontado: <strong className="tabular-nums">{fmt(opAcao.op.quantidade_produzida_pacotes)} pct</strong>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-tinta-2 mb-1">
                    {opAcao.tipo === 'APONTAR' ? 'Pacotes produzidos agora *' : 'Total produzido (pct) *'}
                  </label>
                  <input type="number" step="1" value={formPacotes} onChange={e => setFormPacotes(e.target.value)} className="w-full border-2 border-eno-600 rounded-md px-3 py-2 tabular-nums font-extrabold text-right focus:outline-none" />
                </div>
                <div>
                  <label className="block font-bold text-tinta-2 mb-1">Lote *</label>
                  <input type="text" value={formLote} onChange={e => setFormLote(e.target.value)} placeholder="Nº do lote" className="w-full border border-linha-forte rounded-md px-3 py-2 tabular-nums font-bold focus:outline-none focus:border-eno-700" />
                  {!formLote && (
                    <button type="button" onClick={() => setFormLote(loteSugeridoOP(opAcao.op.numero))} className="mt-1 text-[11px] font-bold text-eno-700 underline cursor-pointer">
                      Usar sugestão: {loteSugeridoOP(opAcao.op.numero)}
                    </button>
                  )}
                </div>
                <div>
                  <label className="block font-bold text-tinta-2 mb-1">Fabricação *</label>
                  <input
                    type="date"
                    value={formFabricacao}
                    max={hojeISO()}
                    onChange={e => setFormFabricacao(e.target.value)}
                    className="w-full border border-linha-forte rounded-md px-3 py-2 tabular-nums focus:outline-none focus:border-eno-700"
                  />
                  {!formFabricacao && (
                    <button type="button" onClick={() => setFormFabricacao(hojeISO())} className="mt-1 text-[11px] font-bold text-eno-700 underline cursor-pointer">
                      Usar hoje
                    </button>
                  )}
                </div>
                <div>
                  <label className="block font-bold text-tinta-2 mb-1">Validade *</label>
                  <input type="date" value={formValidade} min={formFabricacao || undefined} onChange={e => setFormValidade(e.target.value)} className="w-full border border-linha-forte rounded-md px-3 py-2 tabular-nums focus:outline-none focus:border-eno-700" />
                  {!formValidade && formFabricacao && (
                    <button type="button" onClick={() => setFormValidade(validadePadraoProduto(opAcao.op.produto_id, formFabricacao))} className="mt-1 text-[11px] font-bold text-eno-700 underline cursor-pointer">
                      Usar prazo da ficha técnica: {formatarDataBR(validadePadraoProduto(opAcao.op.produto_id, formFabricacao))}
                    </button>
                  )}
                </div>
              </div>
              {opAcao.tipo === 'APONTAR' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-tinta-2 mb-1">Operador / Turno</label>
                    <input type="text" list="colaboradores-op" value={formOperador} onChange={e => setFormOperador(e.target.value)} className="w-full border border-linha-forte rounded-md px-3 py-2 focus:outline-none focus:border-eno-700" />
                    <datalist id="colaboradores-op">
                      {carregarColaboradoresProducao().filter(c => c.status === 'ATIVO').map(c => <option key={c.id} value={c.nome_completo} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className="block font-bold text-tinta-2 mb-1">Observação</label>
                    <input type="text" value={formObs} onChange={e => setFormObs(e.target.value)} className="w-full border border-linha-forte rounded-md px-3 py-2 focus:outline-none focus:border-eno-700" />
                  </div>
                </div>
              )}
              {consumoAcao.some(c => c.quantidade_necessaria > 0) && (
                <div className="rounded-md border border-linha">
                  <div className="bg-papel-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-cinza border-b border-linha">
                    Lotes de matéria-prima usados *
                  </div>
                  <div className="divide-y divide-linha">
                    {consumoAcao.filter(c => c.quantidade_necessaria > 0).map(c => {
                      const disponiveis = lotesMp
                        .filter(l => l.materia_prima_id === c.materia_prima_id && (l.saldo > 0.0001 || (formLotesMp[c.materia_prima_id] || []).includes(l.id)))
                        .sort((a, b) => (a.data_validade || '9999').localeCompare(b.data_validade || '9999') || a.data_entrada.localeCompare(b.data_entrada));
                      const marcados = formLotesMp[c.materia_prima_id] || [];
                      return (
                        <div key={c.materia_prima_id} className="px-3 py-2 space-y-1.5">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="font-bold text-tinta">{c.materia_prima_nome}</span>
                            <span className="text-[10.5px] text-cinza tabular-nums shrink-0">{fmt(c.quantidade_necessaria)} {c.unidade}</span>
                          </div>
                          {disponiveis.length === 0 ? (
                            <div className="text-[11px] text-cinza italic">
                              Nenhum lote com saldo. Lance a entrada desta matéria-prima com o lote do fornecedor.
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {disponiveis.map(l => {
                                const ativo = marcados.includes(l.id);
                                return (
                                  <button
                                    key={l.id}
                                    type="button"
                                    onClick={() => alternarLoteMp(c.materia_prima_id, l.id)}
                                    aria-pressed={ativo}
                                    className={`text-left px-2.5 py-1.5 rounded-md border text-[11px] leading-tight cursor-pointer max-w-full ${ativo ? 'border-eno-700 bg-eno-50 text-eno-900' : 'border-linha-forte bg-papel text-tinta-2 hover:bg-papel-2'}`}
                                  >
                                    <span className="font-bold tabular-nums break-all">{rotuloLoteMP(l)}</span>
                                    <span className="block text-[10px] text-cinza tabular-nums">
                                      saldo {fmt(l.saldo)} {l.unidade}{l.data_validade ? ` · val. ${formatarDataBR(l.data_validade)}` : ''}{l.fornecedor_nome ? ` · ${l.fornecedor_nome}` : ''}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <TabelaMateriaPrimaOP
                itens={consumoAcao}
                titulo={opAcao.tipo === 'CONCLUIR' ? 'Baixa de matéria-prima na conclusão (receita x produzido)' : 'Matéria-prima correspondente a este apontamento (baixa só na conclusão)'}
              />
              {consumoAcao.some(c => c.falta > 0) && (
                <div className="p-2.5 rounded-md bg-st-vencido-bg border border-st-vencido/30 text-st-vencido font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> Matéria-prima insuficiente no estoque. É possível seguir; a falta fica registrada na OP.
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t border-linha flex flex-wrap justify-end gap-2 sticky bottom-0 bg-papel max-sm:[&>button]:flex-1 max-sm:[&>button]:min-h-11">
              {erroAcao && (
                <div role="alert" className="basis-full p-2.5 rounded-md bg-st-vencido-bg border border-st-vencido/30 text-st-vencido font-semibold whitespace-pre-line flex items-start gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-px" /> <span>{erroAcao}</span>
                </div>
              )}
              <button type="button" onClick={() => setOpAcao(null)} className="px-4 py-2 rounded-md bg-papel-3/60 hover:bg-linha font-bold cursor-pointer">Voltar</button>
              <button type="submit" className="px-4 py-2 rounded-md bg-eno-900 hover:bg-eno-950 text-white font-bold cursor-pointer">
                {opAcao.tipo === 'APONTAR' ? 'Registrar apontamento' : 'Concluir OP'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );

  if (modo === 'PRODUCAO') {
    return <div className="w-full flex flex-col text-tinta">{conteudo}</div>;
  }

  return (
    <div className="relative h-full w-full flex flex-col bg-papel-2 text-tinta overflow-hidden">
      <PedidosNavTabs activeTab="pedidos_ordens_producao" onNavigate={onNavigate} />
      {conteudo}
    </div>
  );
}
