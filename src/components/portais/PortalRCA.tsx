import React, { useState, useMemo } from 'react';
import {
  Briefcase,
  Users,
  DollarSign,
  TrendingUp,
  Percent,
  Search,
  CheckCircle2,
  Clock,
  ArrowLeft,
  ShoppingBag,
  Building2,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  Plus,
  FileText,
  Filter,
  Check,
  ChevronRight,
  ExternalLink
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

interface PortalRCAProps {
  onVoltar: () => void;
  /** id do RCA vinculado ao usuário logado (sessão) */
  rcaId?: string | null;
  /** ADMIN pode escolher qual RCA visualizar */
  permitirSelecaoAdmin?: boolean;
}

export function PortalRCA({ onVoltar, rcaId, permitirSelecaoAdmin = false }: PortalRCAProps) {
  const [abaAtiva, setAbaAtiva] = useState<'carteira' | 'comissoes' | 'tabela_precos'>('carteira');
  const [buscaCliente, setBuscaCliente] = useState('');
  const [filtroMes, setFiltroMes] = useState('TODOS');

  // Recarrega quando cadastros, clientes ou pedidos mudarem
  const [versao, setVersao] = useState(0);
  React.useEffect(() => {
    const h = () => setVersao(v => v + 1);
    const eventos = [EVENTO_CADASTROS_ATUALIZADOS, 'clientes_updated', 'pedidos_venda_updated', 'sistema_reset_updated'];
    eventos.forEach(ev => window.addEventListener(ev, h));
    return () => eventos.forEach(ev => window.removeEventListener(ev, h));
  }, []);

  const rcas = useMemo(() => carregarRcas(), [versao]);
  const [rcaSelecionadoAdmin, setRcaSelecionadoAdmin] = useState<string>(rcaId || '');
  const rcaIdEfetivo = permitirSelecaoAdmin ? (rcaSelecionadoAdmin || rcaId || '') : (rcaId || '');

  // Representante logado: SEMPRE o RCA vinculado ao usuário da sessão
  const rca: RCA | undefined = useMemo(() => rcas.find(r => r.id === rcaIdEfetivo), [rcas, rcaIdEfetivo]);

  const rcaLogado = rca ? {
    nome: rca.nome_fantasia || rca.nome_completo,
    codigo: rca.codigo_rca,
    regiao: rca.regiao_atuacao || '-',
    chave_pix: rca.chave_pix ? `${rca.chave_pix} (${rca.tipo_chave_pix})` : 'Não cadastrada',
    tabela_padrao: rca.tabela_preco_padrao_nome || '-',
    comissao_base: `${Number(rca.comissao_padrao_percentual) || 0}%`
  } : null;

  const pedidosVenda = useMemo(() => carregarPedidosVenda(), [versao]);

  // Somente os clientes cujo vendedor_id é o id deste RCA
  const clientesDoRca = useMemo(() => {
    if (!rca) return [];
    return montarClientesVinculados(carregarClientes().filter(c => c.vendedor_id === rca.id), pedidosVenda);
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
      className="bg-emerald-950 border border-emerald-600/60 text-emerald-100 text-xs font-bold rounded-xl px-3 py-1.5 outline-none cursor-pointer"
      title="Visualizar como (somente administrador)"
    >
      <option value="">Administrador: escolha um RCA</option>
      {rcas.map(r => (
        <option key={r.id} value={r.id}>{r.codigo_rca} · {r.nome_fantasia || r.nome_completo}</option>
      ))}
    </select>
  ) : null;

  if (!rca || !rcaLogado) {
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
                Portal do RCA & Representante Comercial
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

  return (
    <div className="min-h-screen bg-[#f8faf9] text-slate-800 flex flex-col font-sans select-none">

      {/* 1. CABEÇALHO DO PORTAL DO RCA */}
      <header className="sticky top-0 z-30 bg-[#022013] text-white border-b border-emerald-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">

          <div className="flex items-center gap-3">
            <button
              onClick={onVoltar}
              className="p-2 sm:p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Voltar ao Painel Principal"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white shadow-sm">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
                Grupo ENO · Força de Vendas
              </div>
              <h1 className="text-base sm:text-xl font-black text-white tracking-tight leading-none">
                Portal do RCA & Representante Comercial
              </h1>
            </div>
          </div>

          {/* Identificação do RCA */}
          <div className="flex items-center gap-3">
            {seletorAdmin}
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-[11px] text-emerald-300 font-semibold">{rcaLogado.codigo}</span>
              <span className="text-xs font-black text-white truncate max-w-[240px]">
                {rcaLogado.nome}
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-emerald-900/80 border border-emerald-600/50 text-[11px] font-mono text-emerald-200">
              Taxa Base: <strong>{rcaLogado.comissao_base}</strong>
            </div>
          </div>

        </div>
      </header>

      {/* 2. CONTEÚDO PRINCIPAL */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Painel de Identificação e Chave PIX */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900">{rcaLogado.nome}</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                Representante Comercial Homologado
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
              <span>Região de Atuação: <strong>{rcaLogado.regiao}</strong></span>
              <span>•</span>
              <span>Tabela Padrão: <strong>{rcaLogado.tabela_padrao}</strong></span>
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs w-full md:w-auto">
            <div className="text-[10px] uppercase font-bold text-emerald-800 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
              Chave PIX para Depósito de Comissões
            </div>
            <div className="font-mono font-bold text-slate-900 mt-0.5">{rcaLogado.chave_pix}</div>
          </div>
        </div>

        {/* 4 Cards de Métricas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="text-xs font-bold text-slate-500">Carteira de Clientes</div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
              {metricas.totalClientes}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Compradores vinculados</div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="text-xs font-bold text-slate-500">Faturamento Realizado</div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">
              R$ {metricas.totalFaturado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Pedidos faturados pela fábrica</div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="text-xs font-bold text-slate-500">Comissões a Receber (Liberadas)</div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
              R$ {metricas.comissoesLiberadas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">Prontas para repasse PIX</div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="text-xs font-bold text-slate-500">Comissões Já Liquidadas</div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">
              R$ {metricas.comissoesPagas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Extrato quitado em conta</div>
          </div>
        </div>

        {/* Abas do RCA: Carteira de Clientes x Extrato de Comissões */}
        <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-2xl w-fit">
          <button
            onClick={() => setAbaAtiva('carteira')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
              abaAtiva === 'carteira' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Carteira de Clientes Vinculada ({clientesCarteira.length})
          </button>
          <button
            onClick={() => setAbaAtiva('comissoes')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
              abaAtiva === 'comissoes' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Extrato de Comissões & Pedidos ({vendasFiltradas.length})
          </button>
        </div>

        {/* ABA CARTEIRA */}
        {abaAtiva === 'carteira' && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  Clientes Vinculados à Sua Representação
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Consulte os dados, prazos de pagamento e histórico de compras da sua carteira
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar cliente ou cidade..."
                  value={buscaCliente}
                  onChange={e => setBuscaCliente(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
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
                      <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                        {cli.qtd_compras} pedidos
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        R$ {cli.valor_total_compras.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
          </div>
        )}

        {/* ABA COMISSÕES */}
        {abaAtiva === 'comissoes' && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  Extrato de Comissões por Pedido Faturado
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Detalhamento de cada faturamento, percentual aplicado e status da liberação
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">Filtrar:</span>
                <select
                  value={filtroMes}
                  onChange={e => setFiltroMes(e.target.value)}
                  className="bg-white border border-slate-200 text-xs font-bold rounded-xl px-3 py-1.5 outline-none cursor-pointer"
                >
                  <option value="TODOS">Todos os Períodos</option>
                  {mesesDisponiveis.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
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
                        R$ {venda.valor_faturado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-800">
                        {venda.percentual_comissao.toFixed(1)}%
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-700 text-sm">
                        R$ {venda.valor_comissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        {venda.status_comissao === 'Pago (PIX)' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Pago (PIX)</span>
                          </span>
                        ) : venda.status_comissao === 'Liberado' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-lime-100 text-lime-900 border border-lime-300">
                            <span>Liberado</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Aguardando</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

    </div>
  );
}
