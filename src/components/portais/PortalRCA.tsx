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
  ClienteVinculado,
  CLIENTES_DISPONIVEIS,
  VendaComissaoRCA
} from '../cadastros/CadastroRCA';

// Mock de vendas e comissões do RCA
const VENDAS_RCA_MOCK: VendaComissaoRCA[] = [
  {
    id: 'vc_01',
    rca_id: 'rca_001',
    numero_pedido: 'PED-2026-0089',
    cliente_id: 'cli_001',
    cliente_nome: 'Supermercados Alvorada Ltda',
    cliente_cidade: 'Mogi Guaçu/SP',
    grupo_produto_nome: 'Goma de Tapioca Hidratada',
    tipo_regra_aplicada: 'Por Grupo',
    data: '08/03/2026',
    mes_referencia: 'Mar/26',
    valor_faturado: 24800.00,
    percentual_comissao: 4.5,
    valor_comissao: 1116.00,
    status_comissao: 'Pago (PIX)',
    data_pagamento_pix: '15/03/2026'
  },
  {
    id: 'vc_02',
    rca_id: 'rca_001',
    numero_pedido: 'PED-2026-0074',
    cliente_id: 'cli_002',
    cliente_nome: 'Distribuidora de Alimentos Vale Verde S.A.',
    cliente_cidade: 'Cotia/SP',
    grupo_produto_nome: 'Fécula de Mandioca Nativa Industrial',
    tipo_regra_aplicada: 'Por Cliente',
    data: '01/03/2026',
    mes_referencia: 'Mar/26',
    valor_faturado: 42000.00,
    percentual_comissao: 3.0,
    valor_comissao: 1260.00,
    status_comissao: 'Pago (PIX)',
    data_pagamento_pix: '15/03/2026'
  },
  {
    id: 'vc_03',
    rca_id: 'rca_001',
    numero_pedido: 'PED-1048',
    cliente_id: 'cli_004',
    cliente_nome: 'Atacadão de Alimentos Jacarezinho Ltda',
    cliente_cidade: 'Jacarezinho/PR',
    grupo_produto_nome: 'Fécula Modificada Catiônica',
    tipo_regra_aplicada: 'Por Cliente',
    data: '10/03/2026',
    mes_referencia: 'Mar/26',
    valor_faturado: 48500.00,
    percentual_comissao: 2.5,
    valor_comissao: 1212.50,
    status_comissao: 'Liberado'
  },
  {
    id: 'vc_04',
    rca_id: 'rca_001',
    numero_pedido: 'PED-1052',
    cliente_id: 'cli_006',
    cliente_nome: 'Rede Muffato & Cia Londrina',
    cliente_cidade: 'Londrina/PR',
    grupo_produto_nome: 'Polvilho Azedo Especial',
    tipo_regra_aplicada: 'Taxa Geral',
    data: '08/03/2026',
    mes_referencia: 'Mar/26',
    valor_faturado: 92000.00,
    percentual_comissao: 3.5,
    valor_comissao: 3220.00,
    status_comissao: 'Liberado'
  },
  {
    id: 'vc_05',
    rca_id: 'rca_001',
    numero_pedido: 'PED-1039',
    cliente_id: 'cli_005',
    cliente_nome: 'Supermercado Central de Cambará Eireli',
    cliente_cidade: 'Cambará/PR',
    grupo_produto_nome: 'Farinha de Mandioca Torrada Biju',
    tipo_regra_aplicada: 'Taxa Geral',
    data: '05/03/2026',
    mes_referencia: 'Mar/26',
    valor_faturado: 32000.00,
    percentual_comissao: 3.5,
    valor_comissao: 1120.00,
    status_comissao: 'Pendente'
  }
];

interface PortalRCAProps {
  onVoltar: () => void;
  rcaIdInicial?: string;
}

export function PortalRCA({ onVoltar, rcaIdInicial }: PortalRCAProps) {
  const [abaAtiva, setAbaAtiva] = useState<'carteira' | 'comissoes' | 'tabela_precos'>('carteira');
  const [buscaCliente, setBuscaCliente] = useState('');
  const [filtroMes, setFiltroMes] = useState('TODOS');

  // Representante logado (Marcos Silva)
  const rcaLogado = {
    nome: 'Marcos Silva Representações Comerciais Ltda',
    codigo: 'RCA-001',
    regiao: 'Norte Pioneiro / PR e Vale do Paranapanema / SP',
    chave_pix: '38.452.910/0001-82 (CNPJ)',
    tabela_padrao: 'Tabela Padrão (Distribuição)',
    comissao_base: '3.5%'
  };

  // Clientes da carteira deste RCA
  const clientesCarteira = useMemo(() => {
    return CLIENTES_DISPONIVEIS.filter(c => {
      const matchBusca =
        !buscaCliente ||
        c.razao_social.toLowerCase().includes(buscaCliente.toLowerCase()) ||
        (c.nome_fantasia && c.nome_fantasia.toLowerCase().includes(buscaCliente.toLowerCase())) ||
        c.municipio.toLowerCase().includes(buscaCliente.toLowerCase());
      return matchBusca;
    });
  }, [buscaCliente]);

  // Vendas filtradas
  const vendasFiltradas = useMemo(() => {
    const modoLimpo = typeof window !== 'undefined' && localStorage.getItem('grupo_eno_modo_limpo_v1') === 'true';
    if (modoLimpo) return [];
    return VENDAS_RCA_MOCK.filter(v => {
      if (filtroMes === 'TODOS') return true;
      return v.mes_referencia.toLowerCase().includes(filtroMes.toLowerCase());
    });
  }, [filtroMes]);

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
      totalClientes: CLIENTES_DISPONIVEIS.length,
      totalFaturado,
      totalComissoes,
      comissoesPagas,
      comissoesLiberadas
    };
  }, [vendasFiltradas]);

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
                        <div className="text-slate-400">{cli.ultima_compra_data}</div>
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
                  <option value="Mar/26">Março / 2026</option>
                  <option value="Fev/26">Fevereiro / 2026</option>
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
                  {vendasFiltradas.map(venda => (
                    <tr key={venda.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="font-mono font-bold text-slate-900">{venda.numero_pedido}</div>
                        <div className="text-[11px] text-slate-400">{venda.data}</div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        <div>{venda.cliente_nome}</div>
                        <div className="text-[11px] text-slate-400 font-normal">{venda.cliente_cidade}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        {venda.grupo_produto_nome || 'Fécula Industrial'}
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
