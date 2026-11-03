import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Store,
  Plus,
  LayoutDashboard,
  ClipboardList,
  ChevronRight,
  Clock,
  Factory,
  Truck,
  MessageCircle,
  AlertCircle,
} from 'lucide-react';
import { carregarClientes, Cliente } from '../../data/clientesData';
import { carregarPedidosVenda, PedidoVenda } from '../../data/pedidosVendaData';
import { carregarRcas, EVENTO_CADASTROS_ATUALIZADOS } from '../../data/cadastrosData';
import { carregarTabelasPreco } from '../../data/produtosData';
import { tabelaPrecoAtiva } from '../../data/precosData';
import { formatarDataBR, compararDatas } from '../../lib/datas';
import { PedidosOrcamentosSugestivo } from '../pedidos/PedidosOrcamentosSugestivo';

interface PortalClienteProps {
  onVoltar: () => void;
  /** id do cliente vinculado ao usuário logado (sessão) */
  clienteId?: string | null;
  /** ADMIN pode escolher qual cliente visualizar */
  permitirSelecaoAdmin?: boolean;
}

type AbaPortal = 'inicio' | 'pedidos';

const moeda = (v: number) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const SITUACAO: Record<PedidoVenda['etapa'], { rotulo: string; cls: string }> = {
  ORCAMENTO: { rotulo: 'Aguardando aprovação', cls: 'bg-amber-100 text-amber-900 border-amber-300' },
  EM_PRODUCAO: { rotulo: 'Em produção', cls: 'bg-sky-100 text-sky-900 border-sky-300' },
  A_FATURAR: { rotulo: 'A faturar', cls: 'bg-violet-100 text-violet-900 border-violet-300' },
  FATURADO: { rotulo: 'Faturado', cls: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  ENTREGUE: { rotulo: 'Entregue', cls: 'bg-slate-200 text-slate-800 border-slate-300' },
};

const nomeCliente = (c: Cliente) => c.fantasia || c.razao_nome;

export function PortalCliente({ onVoltar, clienteId, permitirSelecaoAdmin = false }: PortalClienteProps) {
  const [aba, setAba] = useState<AbaPortal>('inicio');
  // Atalho "Fazer pedido": abre o formulário (o número muda a cada clique)
  const [sinalNovoPedido, setSinalNovoPedido] = useState(0);

  const [versao, setVersao] = useState(0);
  React.useEffect(() => {
    const h = () => setVersao(v => v + 1);
    const eventos = [EVENTO_CADASTROS_ATUALIZADOS, 'clientes_updated', 'pedidos_venda_updated', 'tabelas_preco_updated', 'sistema_reset_updated'];
    eventos.forEach(ev => window.addEventListener(ev, h));
    return () => eventos.forEach(ev => window.removeEventListener(ev, h));
  }, []);

  const clientes = useMemo(() => carregarClientes(), [versao]);
  const [clienteAdmin, setClienteAdmin] = useState<string>(clienteId || '');
  const clienteIdEfetivo = permitirSelecaoAdmin ? (clienteAdmin || clienteId || '') : (clienteId || '');
  // Sempre o cliente vinculado à sessão (o admin escolhe qual visualizar)
  const cliente = useMemo(() => clientes.find(c => c.id === clienteIdEfetivo), [clientes, clienteIdEfetivo]);

  // Somente os pedidos deste cliente
  const pedidos = useMemo(
    () => (cliente ? carregarPedidosVenda().filter(p => p.cliente_id === cliente.id) : []),
    [cliente, versao]
  );

  const resumo = useMemo(() => {
    const comprados = pedidos.filter(p => p.etapa === 'FATURADO' || p.etapa === 'ENTREGUE');
    const andamento = pedidos.filter(p => p.etapa === 'ORCAMENTO' || p.etapa === 'EM_PRODUCAO' || p.etapa === 'A_FATURAR');
    const ordenados = [...pedidos].sort((a, b) => compararDatas(b.data_emissao, a.data_emissao));
    return {
      totalComprado: comprados.reduce((acc, p) => acc + (Number(p.valor_total) || 0), 0),
      qtdComprados: comprados.length,
      andamento,
      aguardando: andamento.filter(p => p.etapa === 'ORCAMENTO').length,
      producao: andamento.filter(p => p.etapa !== 'ORCAMENTO').length,
      ultimo: ordenados[0],
      recentes: ordenados.slice(0, 4),
    };
  }, [pedidos]);

  const representante = useMemo(
    () => (cliente?.vendedor_id ? carregarRcas().find(r => r.id === cliente.vendedor_id) : undefined),
    [cliente, versao]
  );
  const tabelaLiberada = useMemo(() => {
    if (!cliente?.tabela_preco_id) return false;
    const t = carregarTabelasPreco().find(x => x.id === cliente.tabela_preco_id);
    return !!t && tabelaPrecoAtiva(t);
  }, [cliente, versao]);
  const podePedir = !!cliente && cliente.ativo && tabelaLiberada;

  const fazerPedido = () => {
    setAba('pedidos');
    if (podePedir) setSinalNovoPedido(n => n + 1);
  };

  const seletorAdmin = permitirSelecaoAdmin ? (
    <select
      value={clienteIdEfetivo}
      onChange={e => { setClienteAdmin(e.target.value); setAba('inicio'); }}
      className="bg-emerald-950 border border-emerald-600/60 text-emerald-100 text-xs font-bold rounded-xl px-3 py-1.5 outline-none cursor-pointer max-w-[170px] sm:max-w-[260px]"
      title="Visualizar como (somente administrador)"
    >
      <option value="">Administrador: escolha um cliente</option>
      {clientes.map(c => (
        <option key={c.id} value={c.id}>{nomeCliente(c)}{c.endereco?.municipio ? ` · ${c.endereco.municipio}` : ''}</option>
      ))}
    </select>
  ) : null;

  const cabecalho = (titulo: string, sub?: string) => (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onVoltar}
          className="p-2 sm:p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          title={permitirSelecaoAdmin ? 'Voltar ao painel' : 'Sair'}
          aria-label={permitirSelecaoAdmin ? 'Voltar ao painel' : 'Sair'}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="hidden sm:flex w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 items-center justify-center text-white shadow-sm shrink-0">
          <Store className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] sm:text-[11px] font-bold text-emerald-300 uppercase tracking-[0.14em] truncate">{sub || 'Grupo ENO · Portal do Cliente'}</div>
          <h1 className="text-base sm:text-xl font-black text-white tracking-tight leading-tight truncate">{titulo}</h1>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">{seletorAdmin}</div>
    </div>
  );

  if (!cliente) {
    return (
      <div className="min-h-screen bg-[#f8faf9] text-slate-800 flex flex-col font-sans">
        <header className="bg-[#022013] text-white border-b border-emerald-800 shadow-md">{cabecalho('Portal do Cliente')}</header>
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl border border-amber-200 p-8 max-w-md text-center">
            <Store className="w-10 h-10 mx-auto text-amber-500 mb-3" />
            <h2 className="text-lg font-black text-slate-900">Usuário sem cliente vinculado</h2>
            <p className="text-sm text-slate-500 mt-1">
              {permitirSelecaoAdmin
                ? 'Selecione um cliente acima para visualizar o portal.'
                : 'Seu login ainda não está ligado a um cadastro de cliente. Fale com a fábrica.'}
            </p>
          </div>
        </main>
      </div>
    );
  }

  const zap = (representante?.whatsapp || representante?.telefone || '').replace(/\D/g, '');
  const nomeRep = representante ? (representante.nome_fantasia || representante.nome_completo) : '';

  const abas: { id: AbaPortal; rotulo: string; Icone: typeof LayoutDashboard; badge?: number }[] = [
    { id: 'inicio', rotulo: 'Início', Icone: LayoutDashboard },
    { id: 'pedidos', rotulo: 'Meus Pedidos', Icone: ClipboardList, badge: resumo.andamento.length },
  ];

  return (
    <div className="min-h-screen bg-[#f8faf9] text-slate-800 flex flex-col font-sans">
      <header className="sticky top-0 z-30 bg-[#022013] text-white border-b border-emerald-800 shadow-md">
        {cabecalho(nomeCliente(cliente), `Grupo ENO · Portal do Cliente${cliente.endereco?.municipio ? ` · ${cliente.endereco.municipio}/${cliente.endereco.uf}` : ''}`)}

        {/* Abas (tablet/desktop) */}
        <nav className="hidden sm:block border-t border-emerald-900/80" aria-label="Seções do portal">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center gap-1">
            {abas.map(({ id, rotulo, Icone, badge }) => (
              <button
                key={id}
                onClick={() => setAba(id)}
                aria-current={aba === id ? 'page' : undefined}
                className={`relative flex items-center gap-2 px-4 py-3 text-xs font-bold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded-t-lg ${
                  aba === id ? 'text-white' : 'text-emerald-200/70 hover:text-white'
                }`}
              >
                <Icone className="w-4 h-4" />
                <span>{rotulo}</span>
                {!!badge && <span className="tabular-nums text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-800 text-emerald-100">{badge}</span>}
                {aba === id && <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-full bg-gradient-to-r from-emerald-400 via-lime-300 to-emerald-400" />}
              </button>
            ))}
            <button
              onClick={fazerPedido}
              disabled={!podePedir}
              className="ml-auto my-1.5 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-lime-400 text-emerald-950 text-xs font-black shadow-[0_8px_24px_-10px_rgba(132,204,22,0.9)] transition-transform hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0 cursor-pointer disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-300"
            >
              <Plus className="w-4 h-4" /> Fazer Pedido
            </button>
          </div>
        </nav>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-28 sm:pb-6 space-y-5">
        {(!cliente.ativo || !tabelaLiberada) && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
            <span>
              {!cliente.ativo
                ? 'Seu cadastro está inativo no momento. Você pode consultar o histórico, mas novos pedidos dependem da liberação da fábrica.'
                : 'Sua tabela de preço ainda não foi liberada para pedidos pelo portal. Fale com seu representante.'}
            </span>
          </div>
        )}

        {/* ================= INÍCIO ================= */}
        {aba === 'inicio' && (
          <>
            {/* Faixa principal: total comprado em destaque */}
            <section className="relative overflow-hidden rounded-2xl bg-[#022013] text-white px-5 py-6 sm:px-8 sm:py-8">
              <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-16 w-80 h-80 rounded-full bg-emerald-500/25 blur-3xl" />
              <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 left-10 w-72 h-72 rounded-full bg-lime-400/10 blur-3xl" />
              <div className="relative grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-end">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-300">Total comprado</div>
                  <div className="mt-1 text-4xl sm:text-6xl font-black tracking-tight tabular-nums bg-gradient-to-r from-white via-emerald-100 to-lime-200 bg-clip-text text-transparent">
                    {moeda(resumo.totalComprado)}
                  </div>
                  <div className="mt-2 text-xs text-emerald-200/80">
                    {resumo.qtdComprados} {resumo.qtdComprados === 1 ? 'pedido faturado' : 'pedidos faturados'} com o Grupo ENO
                  </div>
                </div>
                <dl className="grid grid-cols-3 gap-3 sm:gap-6">
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-300/80">Em andamento</dt>
                    <dd className="mt-1 text-xl sm:text-2xl font-black tabular-nums">{resumo.andamento.length}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-300/80">Aguardando</dt>
                    <dd className="mt-1 text-xl sm:text-2xl font-black tabular-nums">{resumo.aguardando}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-300/80">Último pedido</dt>
                    <dd className="mt-1 text-sm sm:text-base font-black tabular-nums">
                      {resumo.ultimo ? formatarDataBR(resumo.ultimo.data_emissao) : '—'}
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="relative mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-emerald-100/80">
                <span>Pagamento: <strong className="text-white">{cliente.prazo_pagamento_nome || 'À vista'}</strong></span>
                <span>Tabela: <strong className="text-white">{cliente.tabela_preco_nome || '—'}</strong></span>
                <span>Representante: <strong className="text-white">{nomeRep || 'Atendimento direto da fábrica'}</strong></span>
              </div>
            </section>

            {/* Ações */}
            <section className="grid grid-cols-1 sm:grid-cols-[1.3fr_1fr] gap-3">
              <button
                onClick={fazerPedido}
                disabled={!podePedir}
                className="group flex items-center gap-4 rounded-2xl bg-white border border-slate-200 px-5 py-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-[0_14px_30px_-18px_rgba(6,78,59,0.6)] disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:border-slate-200 disabled:hover:shadow-none cursor-pointer disabled:cursor-not-allowed"
              >
                <span className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-700 to-emerald-950 text-white flex items-center justify-center shadow-[0_8px_20px_-8px_rgba(6,78,59,0.8)]">
                  <Plus className="w-6 h-6" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-base font-black text-slate-900">Fazer pedido</span>
                  <span className="block text-xs text-slate-500">
                    {resumo.aguardando > 0
                      ? `${resumo.aguardando} ${resumo.aguardando === 1 ? 'pedido aguardando' : 'pedidos aguardando'} aprovação da fábrica`
                      : 'Produtos e preços da sua tabela'}
                  </span>
                </span>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all" />
              </button>
              {representante ? (
                <a
                  href={zap ? `https://wa.me/55${zap.replace(/^55/, '')}` : undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group flex items-center gap-4 rounded-2xl bg-white border border-slate-200 px-5 py-4 text-left transition-all duration-200 ${zap ? 'hover:-translate-y-0.5 hover:border-emerald-400' : 'pointer-events-none'}`}
                >
                  <span className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-black text-slate-900 truncate">{nomeRep}</span>
                    <span className="block text-xs text-slate-500 truncate">{zap ? 'Falar com seu representante no WhatsApp' : 'Seu representante comercial'}</span>
                  </span>
                </a>
              ) : (
                <div className="flex items-center gap-4 rounded-2xl bg-white border border-slate-200 px-5 py-4">
                  <span className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center">
                    <Factory className="w-5 h-5" />
                  </span>
                  <span className="text-xs text-slate-600">Seus pedidos são atendidos direto pela fábrica.</span>
                </div>
              )}
            </section>

            {/* Pedidos recentes */}
            <section className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden">
              <div className="px-4 sm:px-6 py-4 flex items-center justify-between gap-3 border-b border-slate-100">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Pedidos recentes</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Acompanhe a situação de cada pedido</p>
                </div>
                {pedidos.length > 0 && (
                  <button onClick={() => setAba('pedidos')} className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer">
                    Ver todos <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
              {resumo.recentes.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <p className="text-sm font-bold text-slate-800">Você ainda não fez pedidos pelo portal.</p>
                  <p className="text-xs text-slate-500 mt-1">Use "Fazer pedido" para escolher os produtos da sua tabela. A fábrica aprova e você acompanha tudo por aqui.</p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {resumo.recentes.map(p => {
                    const s = SITUACAO[p.etapa];
                    const IconeEtapa = p.etapa === 'ORCAMENTO' ? Clock : p.etapa === 'EM_PRODUCAO' ? Factory : Truck;
                    return (
                      <li key={p.id}>
                        <button
                          onClick={() => setAba('pedidos')}
                          className="w-full flex items-center gap-3 px-4 sm:px-6 py-3.5 text-left hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <span className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                            <IconeEtapa className="w-4 h-4" />
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block font-mono text-[11px] font-bold text-slate-500">{p.numero_pedido} · {formatarDataBR(p.data_emissao)}</span>
                            <span className="block text-xs text-slate-600 truncate">{p.itens.map(i => i.produto_nome).join(', ')}</span>
                          </span>
                          <span className="text-right shrink-0">
                            <span className="block text-sm sm:text-base font-black tabular-nums text-emerald-900">{moeda(p.valor_total)}</span>
                            <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${s.cls}`}>{s.rotulo}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        )}

        {/* ================= MEUS PEDIDOS =================
            Fica sempre montado (escondido no Início) para o atalho "Fazer pedido" abrir o formulário sem reabrir ao trocar de aba. */}
        <div key={`ped_${cliente.id}`} className={aba === 'pedidos' ? '' : 'hidden'}>
          <PedidosOrcamentosSugestivo clienteFixoId={cliente.id} abrirNovoSinal={sinalNovoPedido} />
        </div>
      </main>

      {/* Navegação inferior no celular: Fazer Pedido no centro, ao alcance do polegar */}
      <nav
        className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-[#022013] border-t border-emerald-800 grid grid-cols-3 items-end"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Seções do portal"
      >
        <button
          onClick={() => setAba('inicio')}
          aria-current={aba === 'inicio' ? 'page' : undefined}
          className={`relative flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-bold ${aba === 'inicio' ? 'text-white' : 'text-emerald-200/60'}`}
        >
          {aba === 'inicio' && <span className="absolute top-0 inset-x-8 h-[3px] rounded-b-full bg-gradient-to-r from-emerald-400 to-lime-300" />}
          <LayoutDashboard className="w-5 h-5" />
          <span>Início</span>
        </button>
        <button
          onClick={fazerPedido}
          disabled={!podePedir}
          className="flex flex-col items-center justify-center gap-1 pb-2 -mt-5 text-[10px] font-black text-lime-200 disabled:opacity-40"
        >
          <span className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-lime-300 text-emerald-950 flex items-center justify-center shadow-[0_10px_28px_-8px_rgba(132,204,22,0.85)] ring-4 ring-[#022013]">
            <Plus className="w-7 h-7" />
          </span>
          <span>Fazer Pedido</span>
        </button>
        <button
          onClick={() => setAba('pedidos')}
          aria-current={aba === 'pedidos' ? 'page' : undefined}
          className={`relative flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-bold ${aba === 'pedidos' ? 'text-white' : 'text-emerald-200/60'}`}
        >
          {aba === 'pedidos' && <span className="absolute top-0 inset-x-8 h-[3px] rounded-b-full bg-gradient-to-r from-emerald-400 to-lime-300" />}
          <span className="relative">
            <ClipboardList className="w-5 h-5" />
            {resumo.andamento.length > 0 && (
              <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-amber-400 text-[9px] font-black text-amber-950 flex items-center justify-center tabular-nums">{resumo.andamento.length}</span>
            )}
          </span>
          <span>Meus Pedidos</span>
        </button>
      </nav>
    </div>
  );
}
