import React, { useState, useMemo } from 'react';
import {
  Briefcase,
  Users,
  Search,
  CheckCircle2,
  Clock,
  ArrowLeft,
  CreditCard,
  Plus,
  LayoutDashboard,
  ShoppingCart,
  Wallet,
  UserPlus,
  ChevronRight
} from 'lucide-react';
import {
  RCA,
  carregarRcas,
  carregarVendasRca,
  montarClientesVinculados,
  montarVendasComissaoRca,
  EVENTO_CADASTROS_ATUALIZADOS,
} from '../../data/cadastrosData';
import { carregarClientes } from '../../data/clientesData';
import { carregarPedidosVenda } from '../../data/pedidosVendaData';
import { formatarDataBR } from '../../lib/datas';
import { sincronizarTitulosComissao, rotuloRegraComissao } from '../../data/comissoesData';
import { PedidosOrcamentosSugestivo } from '../pedidos/PedidosOrcamentosSugestivo';
import { CadastroClientes } from '../cadastros/CadastroClientes';

interface PortalRCAProps {
  onVoltar: () => void;
  /** id do RCA vinculado ao usuário logado (sessão) */
  rcaId?: string | null;
  /** ADMIN pode escolher qual RCA visualizar */
  permitirSelecaoAdmin?: boolean;
}

type AbaPortal = 'resumo' | 'pedidos' | 'clientes' | 'comissoes';

const moeda = (v: number) => `R$ ${(Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Rótulo curto do modelo de comissão para o RCA */
function descreverModeloComissao(rca: RCA): string {
  const pct = `${Number(rca.comissao_padrao_percentual) || 0}%`;
  switch (rca.modelo_comissao) {
    case 'por_produto': {
      const n = (rca.comissoes_por_produto || []).length;
      return `Por produto${n > 0 ? ` (${n} com % próprio)` : ''} · padrão ${pct}`;
    }
    case 'por_grupo': return `Por grupo de produto · padrão ${pct}`;
    case 'por_cliente': return `Por cliente · padrão ${pct}`;
    case 'misto': return `Misto · padrão ${pct}`;
    default: return `Pela venda · ${pct} sobre o total`;
  }
}

export function PortalRCA({ onVoltar, rcaId, permitirSelecaoAdmin = false }: PortalRCAProps) {
  const [abaAtiva, setAbaAtiva] = useState<AbaPortal>('resumo');
  // Atalhos do Resumo abrem o formulário direto (o número muda a cada clique)
  const [abrirFormPedido, setAbrirFormPedido] = useState(0);
  const [abrirFormCliente, setAbrirFormCliente] = useState(0);
  const [buscaCliente, setBuscaCliente] = useState('');
  const [filtroMes, setFiltroMes] = useState('TODOS');

  // Recarrega quando cadastros, clientes ou pedidos mudarem
  const [versao, setVersao] = useState(0);
  React.useEffect(() => {
    const h = () => setVersao(v => v + 1);
    const eventos = [EVENTO_CADASTROS_ATUALIZADOS, 'clientes_updated', 'pedidos_venda_updated', 'sistema_reset_updated', 'financeiro_updated'];
    eventos.forEach(ev => window.addEventListener(ev, h));
    return () => eventos.forEach(ev => window.removeEventListener(ev, h));
  }, []);

  const rcas = useMemo(() => carregarRcas(), [versao]);
  const [rcaSelecionadoAdmin, setRcaSelecionadoAdmin] = useState<string>(rcaId || '');
  const rcaIdEfetivo = permitirSelecaoAdmin ? (rcaSelecionadoAdmin || rcaId || '') : (rcaId || '');

  // Representante logado: SEMPRE o RCA vinculado ao usuário da sessão
  const rca: RCA | undefined = useMemo(() => rcas.find(r => r.id === rcaIdEfetivo), [rcas, rcaIdEfetivo]);

  const pedidosVenda = useMemo(() => carregarPedidosVenda(), [versao]);
  // Comissão de pedido excluído/estornado (ainda não paga) sai do Contas a Pagar
  React.useEffect(() => {
    sincronizarTitulosComissao(pedidosVenda);
  }, [pedidosVenda]);

  // Somente os clientes cujo vendedor_id é o id deste RCA
  const clientesDoRca = useMemo(() => {
    if (!rca) return [];
    return montarClientesVinculados(
      carregarClientes().filter(c => c.vendedor_id === rca.id),
      pedidosVenda.filter(p => p.rca_id === rca.id) // estatísticas só com os pedidos dele
    );
  }, [rca, pedidosVenda, versao]);

  const clientesCarteira = useMemo(() => {
    const termo = buscaCliente.toLowerCase();
    return clientesDoRca.filter(c =>
      !buscaCliente ||
      c.razao_social.toLowerCase().includes(termo) ||
      (c.nome_fantasia && c.nome_fantasia.toLowerCase().includes(termo)) ||
      c.municipio.toLowerCase().includes(termo)
    );
  }, [clientesDoRca, buscaCliente]);

  // Somente vendas/comissões deste RCA
  const vendasDoRca = useMemo(() => {
    if (!rca) return [];
    return montarVendasComissaoRca(pedidosVenda, carregarVendasRca()).filter(v => v.rca_id === rca.id);
  }, [rca, pedidosVenda, versao]);

  const mesesDisponiveis = useMemo(
    () => Array.from(new Set(vendasDoRca.map(v => v.mes_referencia).filter(Boolean))),
    [vendasDoRca]
  );

  const vendasFiltradas = useMemo(() => {
    return vendasDoRca.filter(v => filtroMes === 'TODOS' || v.mes_referencia === filtroMes);
  }, [vendasDoRca, filtroMes]);

  // Pedidos do RCA aguardando aprovação da fábrica
  const aguardandoAprovacao = useMemo(
    () => (rca ? pedidosVenda.filter(p => p.rca_id === rca.id && p.etapa === 'ORCAMENTO').length : 0),
    [rca, pedidosVenda]
  );

  // Métricas de Comissões e Carteira
  const metricas = useMemo(() => {
    const totalFaturado = vendasFiltradas.reduce((acc, v) => acc + v.valor_faturado, 0);
    const totalComissoes = vendasFiltradas.reduce((acc, v) => acc + v.valor_comissao, 0);
    const comissoesPagas = vendasFiltradas
      .filter(v => v.status_comissao === 'Pago (PIX)')
      .reduce((acc, v) => acc + v.valor_comissao, 0);
    const comissoesLiberadas = vendasFiltradas
      .filter(v => v.status_comissao === 'Liberado')
      .reduce((acc, v) => acc + v.valor_comissao, 0);

    return {
      totalClientes: clientesDoRca.length,
      totalFaturado,
      totalComissoes,
      comissoesPagas,
      comissoesLiberadas
    };
  }, [vendasFiltradas, clientesDoRca]);

  const seletorAdmin = permitirSelecaoAdmin ? (
    <select
      value={rcaIdEfetivo}
      onChange={e => setRcaSelecionadoAdmin(e.target.value)}
      className="bg-emerald-950 border border-emerald-600/60 text-emerald-100 text-xs font-bold rounded-xl px-3 py-1.5 outline-none cursor-pointer max-w-[180px] sm:max-w-none"
      title="Visualizar como (somente administrador)"
    >
      <option value="">Administrador: escolha um RCA</option>
      {rcas.map(r => (
        <option key={r.id} value={r.id}>{r.codigo_rca} · {r.nome_fantasia || r.nome_completo}</option>
      ))}
    </select>
  ) : null;

  if (!rca) {
    return (
      <div className="min-h-screen bg-[#f8faf9] text-slate-800 flex flex-col font-sans">
        <header className="bg-[#022013] text-white border-b border-emerald-800 shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={onVoltar}
                className="p-2 sm:p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Sair"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-base sm:text-xl font-black text-white tracking-tight leading-none">
                Portal do RCA
              </h1>
            </div>
            {seletorAdmin}
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl border border-amber-200 p-8 max-w-md text-center shadow-xs">
            <Briefcase className="w-10 h-10 mx-auto text-amber-500 mb-3" />
            <h2 className="text-lg font-black text-slate-900">Usuário sem RCA vinculado</h2>
            <p className="text-sm text-slate-500 mt-1">
              {permitirSelecaoAdmin
                ? 'Selecione um RCA cadastrado acima para visualizar o portal.'
                : 'Peça ao administrador para vincular seu usuário a um RCA cadastrado em "Usuários e Acessos".'}
            </p>
          </div>
        </main>
      </div>
    );
  }

  const nomeRca = rca.nome_fantasia || rca.nome_completo;
  const chavePix = rca.chave_pix ? `${rca.chave_pix} (${rca.tipo_chave_pix})` : 'Não cadastrada';
  const modeloComissao = descreverModeloComissao(rca);

  const abas: { id: AbaPortal; rotulo: string; curto: string; Icone: typeof LayoutDashboard; badge?: number }[] = [
    { id: 'resumo', rotulo: 'Resumo', curto: 'Resumo', Icone: LayoutDashboard },
    { id: 'pedidos', rotulo: 'Meus Pedidos', curto: 'Pedidos', Icone: ShoppingCart, badge: aguardandoAprovacao },
    { id: 'clientes', rotulo: 'Meus Clientes', curto: 'Clientes', Icone: Users, badge: clientesDoRca.length },
    { id: 'comissoes', rotulo: 'Comissões', curto: 'Comissões', Icone: Wallet },
  ];

  const statusComissao = (venda: typeof vendasFiltradas[number]) =>
    venda.status_comissao === 'Pago (PIX)' ? (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
        <span>Pago (PIX){venda.data_pagamento_pix ? ` ${formatarDataBR(venda.data_pagamento_pix)}` : ''}</span>
      </span>
    ) : venda.titulo_pagar_id ? (
      <div className="inline-flex flex-col items-center">
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border ${venda.titulo_status === 'VENCIDO' ? 'bg-red-100 text-red-800 border-red-300' : 'bg-lime-100 text-lime-900 border-lime-300'}`}>
          <Clock className="w-3 h-3" />
          <span>{venda.titulo_status === 'VENCIDO' ? 'Atrasada' : 'A receber'}</span>
        </span>
        {venda.titulo_vencimento && (
          <span className="text-[10px] text-slate-400 mt-0.5">previsto {formatarDataBR(venda.titulo_vencimento)}</span>
        )}
      </div>
    ) : venda.status_comissao === 'Liberado' ? (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-lime-100 text-lime-900 border border-lime-300">
        <span>Liberado</span>
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
        <Clock className="w-3 h-3 text-amber-600" />
        <span>Aguardando</span>
      </span>
    );

  return (
    <div className="min-h-screen bg-[#f8faf9] text-slate-800 flex flex-col font-sans">

      {/* 1. CABEÇALHO DO PORTAL DO RCA */}
      <header className="sticky top-0 z-30 bg-[#022013] text-white border-b border-emerald-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onVoltar}
              className="p-2 sm:p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
              title="Voltar / Sair"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 items-center justify-center text-white shadow-sm shrink-0">
              <Briefcase className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] sm:text-[11px] font-bold text-emerald-300 uppercase tracking-[0.14em] truncate">
                Grupo ENO · {rca.codigo_rca}
              </div>
              <h1 className="text-base sm:text-xl font-black text-white tracking-tight leading-tight truncate">
                {nomeRca}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {seletorAdmin}
          </div>
        </div>

        {/* Abas (tablet/desktop) */}
        <nav className="hidden sm:block border-t border-emerald-900/80" aria-label="Seções do portal">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1">
            {abas.map(({ id, rotulo, Icone, badge }) => (
              <button
                key={id}
                onClick={() => setAbaAtiva(id)}
                aria-current={abaAtiva === id ? 'page' : undefined}
                className={`relative flex items-center gap-2 px-4 py-3 text-xs font-bold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded-t-lg ${
                  abaAtiva === id ? 'text-white' : 'text-emerald-200/70 hover:text-white'
                }`}
              >
                <Icone className="w-4 h-4" />
                <span>{rotulo}</span>
                {!!badge && (
                  <span className="tabular-nums text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-800 text-emerald-100">{badge}</span>
                )}
                {abaAtiva === id && <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-full bg-gradient-to-r from-emerald-400 via-lime-300 to-emerald-400" />}
              </button>
            ))}
          </div>
        </nav>
      </header>

      {/* 2. CONTEÚDO PRINCIPAL (pb extra no celular por causa da barra inferior) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 sm:pb-6 space-y-5">

        {/* ================= RESUMO ================= */}
        {abaAtiva === 'resumo' && (
          <>
            {/* Faixa principal: o número que o RCA quer ver primeiro */}
            <section className="relative overflow-hidden rounded-2xl bg-[#022013] text-white px-5 py-6 sm:px-8 sm:py-8">
              <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-16 w-80 h-80 rounded-full bg-emerald-500/25 blur-3xl" />
              <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 left-10 w-72 h-72 rounded-full bg-lime-400/10 blur-3xl" />
              <div className="relative grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-end">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-300">Comissão a receber</div>
                  <div className="mt-1 text-4xl sm:text-6xl font-black tracking-tight tabular-nums bg-gradient-to-r from-white via-emerald-100 to-lime-200 bg-clip-text text-transparent">
                    {moeda(metricas.comissoesLiberadas)}
                  </div>
                  <div className="mt-2 text-xs text-emerald-200/80">
                    {modeloComissao}
                  </div>
                </div>
                <dl className="grid grid-cols-3 gap-3 sm:gap-6">
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-300/80">Já recebido</dt>
                    <dd className="mt-1 text-base sm:text-xl font-black tabular-nums">{moeda(metricas.comissoesPagas)}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-300/80">Faturado</dt>
                    <dd className="mt-1 text-base sm:text-xl font-black tabular-nums">{moeda(metricas.totalFaturado)}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-300/80">Clientes</dt>
                    <dd className="mt-1 text-base sm:text-xl font-black tabular-nums">{metricas.totalClientes}</dd>
                  </div>
                </dl>
              </div>
              <div className="relative mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-emerald-100/80">
                <span className="flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5 text-emerald-300" /> PIX: <strong className="font-mono text-white">{chavePix}</strong></span>
                <span>Região: <strong className="text-white">{rca.regiao_atuacao || '-'}</strong></span>
                <span>Tabela padrão: <strong className="text-white">{rca.tabela_preco_padrao_nome || '-'}</strong></span>
              </div>
            </section>

            {/* Ações rápidas */}
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => { setAbaAtiva('pedidos'); setAbrirFormPedido(n => n + 1); }}
                className="group flex items-center gap-4 rounded-2xl bg-white border border-slate-200 px-5 py-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-[0_14px_30px_-18px_rgba(6,78,59,0.6)] cursor-pointer"
              >
                <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-700 to-emerald-950 text-white flex items-center justify-center shadow-[0_8px_20px_-8px_rgba(6,78,59,0.8)]">
                  <Plus className="w-5 h-5" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-black text-slate-900">Fazer pedido</span>
                  <span className="block text-xs text-slate-500">
                    {aguardandoAprovacao > 0 ? `${aguardandoAprovacao} ${aguardandoAprovacao === 1 ? 'pedido aguardando' : 'pedidos aguardando'} aprovação` : 'Orçamento ou pedido para sua carteira'}
                  </span>
                </span>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all" />
              </button>
              <button
                onClick={() => { setAbaAtiva('clientes'); setAbrirFormCliente(n => n + 1); }}
                className="group flex items-center gap-4 rounded-2xl bg-white border border-slate-200 px-5 py-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-[0_14px_30px_-18px_rgba(6,78,59,0.6)] cursor-pointer"
              >
                <span className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-black text-slate-900">Adicionar cliente</span>
                  <span className="block text-xs text-slate-500">Entra direto na sua carteira</span>
                </span>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all" />
              </button>
            </section>

            {/* Carteira (leitura rápida) */}
            <section className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Sua carteira</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Prazos, tabela e histórico de compras dos seus clientes</p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar cliente ou cidade..."
                    value={buscaCliente}
                    onChange={e => setBuscaCliente(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Celular: lista */}
              <ul className="sm:hidden divide-y divide-slate-100">
                {clientesCarteira.length === 0 && (
                  <li className="py-8 px-4 text-center text-sm text-slate-500">Nenhum cliente na carteira. Use "Adicionar cliente".</li>
                )}
                {clientesCarteira.map(cli => (
                  <li key={cli.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-extrabold text-slate-900 text-sm truncate">{cli.razao_social}</div>
                        <div className="text-[11px] text-slate-500">{cli.municipio}/{cli.uf} · {cli.prazo_pagamento_nome}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-black text-slate-900 text-sm tabular-nums">{moeda(cli.valor_total_compras)}</div>
                        <div className="text-[10px] text-slate-400 tabular-nums">{cli.qtd_compras} pedidos</div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Tablet/desktop: tabela */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase tracking-wider text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-5">Cliente / Razão Social</th>
                      <th className="py-3 px-4">Localização</th>
                      <th className="py-3 px-4">Tabela & Prazo</th>
                      <th className="py-3 px-4 text-center">Compras</th>
                      <th className="py-3 px-4 text-right">Volume Total</th>
                      <th className="py-3 px-5 text-right">Último Pedido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {clientesCarteira.length === 0 && (
                      <tr><td colSpan={6} className="py-8 text-center text-slate-400 font-semibold">Nenhum cliente vinculado a este RCA.</td></tr>
                    )}
                    {clientesCarteira.map(cli => (
                      <tr key={cli.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-5">
                          <div className="font-extrabold text-slate-900 text-sm">{cli.razao_social}</div>
                          {cli.nome_fantasia && (
                            <div className="text-xs text-emerald-800 font-semibold">{cli.nome_fantasia}</div>
                          )}
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">{cli.cpf_cnpj}</div>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-700">
                          <div>{cli.municipio}/{cli.uf}</div>
                          <div className="text-[11px] text-slate-400">{cli.telefone}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">{cli.tabela_preco_nome}</div>
                          <div className="text-[11px] text-emerald-700 font-mono">{cli.forma_pagamento_nome} ({cli.prazo_pagamento_nome})</div>
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-900 tabular-nums">
                          {cli.qtd_compras} pedidos
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                          {moeda(cli.valor_total_compras)}
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono text-[11px]">
                          <div className="font-bold text-emerald-800">{cli.ultima_compra_pedido}</div>
                          <div className="text-slate-400">{cli.ultima_compra_data ? formatarDataBR(cli.ultima_compra_data) : '-'}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {/* ================= MEUS PEDIDOS ================= */}
        {abaAtiva === 'pedidos' && (
          // key no wrapper: troca de RCA (visualizar como) remonta a tela com o estado limpo
          <div key={`ped_${rca.id}`}>
            <PedidosOrcamentosSugestivo
              rcaFixoId={rca.id}
              abrirNovoSinal={abrirFormPedido}
              onNavigate={tab => { if (tab === 'cadastro_clientes') setAbaAtiva('clientes'); }}
            />
          </div>
        )}

        {/* ================= MEUS CLIENTES ================= */}
        {abaAtiva === 'clientes' && (
          <div key={`cli_${rca.id}`} className="h-[calc(100dvh-11rem)] sm:h-[calc(100dvh-10.5rem)] min-h-[480px] flex">
            <CadastroClientes rcaFixoId={rca.id} abrirNovoSinal={abrirFormCliente} />
          </div>
        )}

        {/* ================= COMISSÕES ================= */}
        {abaAtiva === 'comissoes' && (
          <section className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Extrato de comissões por pedido faturado</h3>
                <p className="text-xs text-slate-500 mt-0.5">Sua regra: <strong className="text-slate-700">{modeloComissao}</strong></p>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="filtro-mes-rca" className="text-xs font-bold text-slate-600">Período:</label>
                <select
                  id="filtro-mes-rca"
                  value={filtroMes}
                  onChange={e => setFiltroMes(e.target.value)}
                  className="bg-white border border-slate-200 text-xs font-bold rounded-xl px-3 py-1.5 outline-none cursor-pointer"
                >
                  <option value="TODOS">Todos os períodos</option>
                  {mesesDisponiveis.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="px-4 sm:px-6 py-3 flex flex-wrap gap-x-6 gap-y-1 border-b border-slate-100 text-xs">
              <span className="text-slate-500">A receber <strong className="text-slate-900 tabular-nums">{moeda(metricas.comissoesLiberadas)}</strong></span>
              <span className="text-slate-500">Recebido <strong className="text-emerald-700 tabular-nums">{moeda(metricas.comissoesPagas)}</strong></span>
              <span className="text-slate-500">Total do período <strong className="text-slate-900 tabular-nums">{moeda(metricas.totalComissoes)}</strong></span>
            </div>

            {/* Celular: cartões */}
            <ul className="sm:hidden divide-y divide-slate-100">
              {vendasFiltradas.length === 0 && (
                <li className="py-8 px-4 text-center text-sm text-slate-500">Nenhum pedido faturado ainda. A comissão aparece aqui quando a fábrica faturar.</li>
              )}
              {vendasFiltradas.map(venda => (
                <li key={venda.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-mono text-[11px] font-bold text-slate-500">{venda.numero_pedido} · {formatarDataBR(venda.data)}</div>
                      <div className="font-extrabold text-slate-900 text-sm truncate">{venda.cliente_nome}</div>
                      <div className="text-[11px] text-slate-500">{rotuloRegraComissao(venda.tipo_regra_aplicada)} · {venda.percentual_comissao.toFixed(2)}% de {moeda(venda.valor_faturado)}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-black text-emerald-700 text-base tabular-nums">{moeda(venda.valor_comissao)}</div>
                      <div className="mt-1">{statusComissao(venda)}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-5">Pedido / Data</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Produto</th>
                    <th className="py-3 px-4 text-right">Faturado</th>
                    <th className="py-3 px-4 text-center">Regra / %</th>
                    <th className="py-3 px-4 text-right">Comissão</th>
                    <th className="py-3 px-5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vendasFiltradas.length === 0 && (
                    <tr><td colSpan={7} className="py-8 text-center text-slate-400 font-semibold">Nenhum pedido faturado para este RCA.</td></tr>
                  )}
                  {vendasFiltradas.map(venda => (
                    <tr key={venda.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="font-mono font-bold text-slate-900">{venda.numero_pedido}</div>
                        <div className="text-[11px] text-slate-400">{formatarDataBR(venda.data)}</div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        <div>{venda.cliente_nome}</div>
                        <div className="text-[11px] text-slate-400 font-normal">{venda.cliente_cidade}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        {venda.grupo_produto_nome || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        {moeda(venda.valor_faturado)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="text-[10px] font-bold text-slate-500">{rotuloRegraComissao(venda.tipo_regra_aplicada)}</div>
                        <div className="font-mono font-bold text-emerald-800">{venda.percentual_comissao.toFixed(2)}%</div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-700 text-sm">
                        {moeda(venda.valor_comissao)}
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        {statusComissao(venda)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

      </main>

      {/* Navegação inferior no celular (ao alcance do polegar) */}
      <nav
        className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-[#022013] border-t border-emerald-800 grid grid-cols-4"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Seções do portal"
      >
        {abas.map(({ id, curto, Icone, badge }) => (
          <button
            key={id}
            onClick={() => setAbaAtiva(id)}
            aria-current={abaAtiva === id ? 'page' : undefined}
            className={`relative flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-bold transition-colors ${
              abaAtiva === id ? 'text-white' : 'text-emerald-200/60'
            }`}
          >
            {abaAtiva === id && <span className="absolute top-0 inset-x-6 h-[3px] rounded-b-full bg-gradient-to-r from-emerald-400 to-lime-300" />}
            <span className="relative">
              <Icone className="w-5 h-5" />
              {id === 'pedidos' && !!badge && (
                <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-amber-400 text-[9px] font-black text-amber-950 flex items-center justify-center tabular-nums">{badge}</span>
              )}
            </span>
            <span>{curto}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
