import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  Package,
  ShoppingBag,
  Tractor,
  DollarSign,
  ArrowUpRight,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Plus,
  FileText,
  Boxes,
  Users,
  ChevronRight,
  RefreshCw,
  Fuel,
  Wallet,
  Trash2
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import { carregarPedidosVenda, PedidoVenda } from '../../data/pedidosVendaData';
import { carregarEstoqueProdutos, ProdutoEstoque } from '../../data/produtosData';
import { carregarCalculosNaRoca, CalculoNaRoca } from '../../data/calculoRocaData';
import { obterConsolidadoGeral } from '../../data/pipelineIntegrado';
import { limparTodoOSistema } from '../../data/sistemaReset';
import {
  carregarTitulosReceber,
  carregarReceitasExtras,
  formatarMoeda as formatarMoedaSegura,
  numeroSeguro
} from '../../data/financeiroData';
import { parseData, somarDias, hojeISO, formatarDataBR, compararDatas } from '../../lib/datas';

interface VisaoGeralProps {
  onNavigate: (pageId: string) => void;
}

export function VisaoGeralDashboard({ onNavigate }: VisaoGeralProps) {
  const [pedidos, setPedidos] = useState<PedidoVenda[]>([]);
  const [produtos, setProdutos] = useState<ProdutoEstoque[]>([]);
  const [calculosRoca, setCalculosRoca] = useState<CalculoNaRoca[]>([]);
  const [consolidado, setConsolidado] = useState(() => obterConsolidadoGeral());

  const recarregar = () => {
    setPedidos(carregarPedidosVenda());
    setProdutos(carregarEstoqueProdutos());
    setCalculosRoca(carregarCalculosNaRoca());
    setConsolidado(obterConsolidadoGeral());
  };

  useEffect(() => {
    recarregar();
    const handleUpdate = () => recarregar();
    window.addEventListener('pedidos_venda_updated', handleUpdate);
    window.addEventListener('pedidos_compra_updated', handleUpdate);
    window.addEventListener('financeiro_updated', handleUpdate);
    window.addEventListener('produtos_updated', handleUpdate);
    window.addEventListener('calculos_roca_updated', handleUpdate);
    window.addEventListener('sitio_controle_despesas_updated', handleUpdate);
    window.addEventListener('sistema_reset_updated', handleUpdate);

    return () => {
      window.removeEventListener('sistema_reset_updated', handleUpdate);
      window.removeEventListener('pedidos_venda_updated', handleUpdate);
      window.removeEventListener('pedidos_compra_updated', handleUpdate);
      window.removeEventListener('financeiro_updated', handleUpdate);
      window.removeEventListener('produtos_updated', handleUpdate);
      window.removeEventListener('calculos_roca_updated', handleUpdate);
      window.removeEventListener('sitio_controle_despesas_updated', handleUpdate);
    };
  }, []);

  // Gráfico de faturamento real das últimas 5 semanas (títulos a receber por emissão + receitas extras por data)
  const dadosFaturamento = useMemo(() => {
    const hoje = hojeISO();
    const semanas = Array.from({ length: 5 }, (_, i) => {
      const fim = somarDias(hoje, -7 * (4 - i));
      const inicio = somarDias(fim, -6);
      return { inicio, fim, semana: formatarDataBR(inicio).slice(0, 5), faturado: 0 };
    });
    const lancar = (data: string | undefined, valor: unknown) => {
      if (!parseData(data)) return;
      const s = semanas.find(w => compararDatas(data, w.inicio) >= 0 && compararDatas(data, w.fim) <= 0);
      if (s) s.faturado += numeroSeguro(valor);
    };
    carregarTitulosReceber().forEach(t => lancar(t.data_emissao, t.valor));
    carregarReceitasExtras().forEach(r => lancar(r.data, r.valor));
    return semanas.map(({ semana, faturado }) => ({ semana, faturado: Number(faturado.toFixed(2)) }));
  }, [consolidado]);

  // Dados para distribuição de produtos em estoque
  const dadosMixProducao = produtos.slice(0, 5).map(p => ({
    nome: (p.nome || '').length > 18 ? (p.nome || '').substring(0, 16) + '...' : (p.nome || ''),
    sacos: numeroSeguro(p.estoque_atual_sacos),
    kg: numeroSeguro(p.estoque_atual_kg)
  }));

  // Formatação de moeda protegida contra NaN/undefined
  const formatarMoeda = (val: unknown) => formatarMoedaSegura(val);

  const handleZerarSistema = () => {
    const ok = window.confirm(
      'ATENÇÃO: isto vai APAGAR PERMANENTEMENTE todos os dados do sistema:\n\n' +
      '• Pedidos de venda, orçamentos e pedidos de compra\n' +
      '• Cálculos na roça\n' +
      '• Clientes, agricultores, fornecedores, produtos, receitas e tabelas de preço\n' +
      '• Todo o financeiro (a receber, a pagar, despesas, receitas, notas e caixa)\n' +
      '• Controle do sítio (combustível e despesas)\n\n' +
      'Os usuários e o login são mantidos. Esta ação NÃO pode ser desfeita.\n\nDeseja continuar?'
    );
    if (!ok) return;
    const digitado = window.prompt('Para confirmar, digite APAGAR (em maiúsculas):');
    if ((digitado || '').trim() !== 'APAGAR') {
      window.alert('Confirmação não conferiu. Nenhum dado foi apagado.');
      return;
    }
    limparTodoOSistema(false);
    window.location.reload();
  };

  return (
    <div className="h-full w-full overflow-y-auto px-4 sm:px-6 py-4 space-y-6 bg-[#f4f7f4] text-slate-800">
      
      {/* 1. Header Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Visão Geral
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={recarregar}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-800 text-white hover:bg-emerald-900 text-xs font-bold transition-colors shadow-sm cursor-pointer"
            title="Atualizar dados"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* 2. Grid de KPIs Interligados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Faturamento */}
        <div 
          onClick={() => onNavigate('pedidos_orcamentos_sugestivo')}
          className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-emerald-500"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Faturamento
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 group-hover:scale-105 transition-transform">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono tabular-nums">
              {formatarMoeda(consolidado.faturamentoTotal)}
            </div>
            <div className="mt-1 text-xs text-slate-500 font-medium">
              Vendas e faturamento
            </div>
          </div>
        </div>

        {/* KPI 2: Despesas & Resultado */}
        <div 
          onClick={() => onNavigate('financeiro_lancar_despesas')}
          className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-emerald-500"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Despesas & Lucro
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-700 group-hover:scale-105 transition-transform">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono tabular-nums">
              {formatarMoeda(consolidado.totalDespesas)}
            </div>
            <div className="mt-1 text-xs font-bold text-emerald-800">
              Lucro: {formatarMoeda(consolidado.lucroLiquido)}
            </div>
          </div>
        </div>

        {/* KPI 3: Estoque de Matéria-Prima */}
        <div 
          onClick={() => onNavigate('produtos_materia_prima')}
          className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-emerald-500"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Matéria-Prima
            </span>
            <div className="w-9 h-9 rounded-xl bg-lime-50 flex items-center justify-center text-lime-800 group-hover:scale-105 transition-transform">
              <Tractor className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono tabular-nums">
              {numeroSeguro(consolidado.totalMateriaPrimaTon).toFixed(1)} <span className="text-sm font-medium text-slate-500">Ton</span>
            </div>
            <div className="mt-1 text-xs text-slate-500 font-medium">
              Raiz e insumos em estoque
            </div>
          </div>
        </div>

        {/* KPI 4: Estoque de Produtos */}
        <div 
          onClick={() => onNavigate('produtos_estoque_cadastro')}
          className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-emerald-500"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Produto Acabado
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700 group-hover:scale-105 transition-transform">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono tabular-nums">
              {numeroSeguro(consolidado.totalSacosEstoque).toLocaleString('pt-BR')} <span className="text-sm font-medium text-slate-500">sacos</span>
            </div>
            <div className="mt-1 text-xs text-slate-500 font-medium">
              ~{(numeroSeguro(consolidado.totalKgEstoque) / 1000).toFixed(1)} Ton disponíveis
            </div>
          </div>
        </div>

        {/* KPI 5: Combustível do Sítio */}
        <div 
          onClick={() => onNavigate('cadastro_controle_sitio')}
          className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-emerald-500"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Combustível Sítio
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700 group-hover:scale-105 transition-transform">
              <Fuel className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono tabular-nums">
              {numeroSeguro(consolidado.totalLitrosCombustivelSitio).toLocaleString('pt-BR')} <span className="text-sm font-medium text-slate-500">L</span>
            </div>
            <div className="mt-1 text-xs text-slate-500 font-medium">
              Tanque disponível
            </div>
          </div>
        </div>
      </div>

      {/* 3. Ações Rápidas */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3.5">
          Atalhos
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <button
            onClick={() => onNavigate('pedidos_orcamentos_sugestivo')}
            className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-emerald-50/70 hover:border-emerald-300 transition-all text-left cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-800 text-white flex items-center justify-center shrink-0 shadow-sm">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-900">Vendas</div>
            </div>
          </button>

          <button
            onClick={() => onNavigate('calculo_na_roca')}
            className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-emerald-50/70 hover:border-emerald-300 transition-all text-left cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-lime-800 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-900">Cálculo na Roça</div>
            </div>
          </button>

          <button
            onClick={() => onNavigate('pedidos_em_producao')}
            className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-emerald-50/70 hover:border-emerald-300 transition-all text-left cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-700 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-900">Produção ({consolidado.pedidosEmProducao})</div>
            </div>
          </button>

          <button
            onClick={() => onNavigate('produtos_estoque_cadastro')}
            className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-emerald-50/70 hover:border-emerald-300 transition-all text-left cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-800 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Boxes className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-900">Estoque</div>
            </div>
          </button>

          <button
            onClick={() => onNavigate('financeiro_lancar_despesas')}
            className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-emerald-50/70 hover:border-emerald-300 transition-all text-left cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-800 text-white flex items-center justify-center shrink-0 shadow-sm">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-900">Financeiro</div>
            </div>
          </button>
        </div>
      </div>

      {/* 4. Gráficos de Produção e Vendas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 1: Vendas */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900">Evolução de Vendas</h3>
            <span className="text-[11px] font-semibold text-slate-400">Últimas 5 semanas (início da semana)</span>
          </div>

          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dadosFaturamento} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="corRealizado" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="semana" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  formatter={(value: any) => [formatarMoeda(value), 'Faturado']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="faturado" name="Faturado" stroke="#059669" strokeWidth={2.5} fillOpacity={1} fill="url(#corRealizado)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Mix de Estoque */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900">Estoque por Produto</h3>
            <button
              onClick={() => onNavigate('produtos_estoque_cadastro')}
              className="text-xs font-bold text-emerald-800 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
            >
              <span>Ver todos</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosMixProducao} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="nome" tick={{ fontSize: 11, fill: '#334155' }} axisLine={false} tickLine={false} width={110} />
                <Tooltip 
                  formatter={(value: any) => [`${value} sacos`, 'Estoque']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Bar dataKey="sacos" fill="#047857" radius={[0, 6, 6, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 5. Tabela de Pedidos Recentes & Monitor da Roça */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Painel de Pedidos Recentes */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900">Pedidos Recentes</h3>
            <button
              onClick={() => onNavigate('pedidos_orcamentos_sugestivo')}
              className="text-xs font-bold text-emerald-800 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
            >
              <span>Ver todos</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="pb-2.5">Nº Pedido</th>
                  <th className="pb-2.5">Cliente</th>
                  <th className="pb-2.5">Valor</th>
                  <th className="pb-2.5 text-right">Etapa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pedidos.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">Nenhum pedido cadastrado.</td>
                  </tr>
                )}
                {pedidos.slice(0, 5).map((ped) => (
                  <tr key={ped.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 font-bold text-slate-800 font-mono">
                      {ped.numero_pedido}
                    </td>
                    <td className="py-2.5 text-slate-700 truncate max-w-[140px]">
                      {ped.cliente_nome}
                    </td>
                    <td className="py-2.5 font-semibold text-slate-900 font-mono tabular-nums">
                      {formatarMoeda(ped.valor_total)}
                    </td>
                    <td className="py-2.5 text-right">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        ped.etapa === 'FATURADO'
                          ? 'bg-emerald-100 text-emerald-800'
                          : ped.etapa === 'EM_PRODUCAO'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {String(ped.etapa || '').replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Painel de Últimas Pesagens na Roça */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900">Entradas na Roça</h3>
            <button
              onClick={() => onNavigate('calculo_na_roca')}
              className="text-xs font-bold text-emerald-800 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
            >
              <span>Ver todos</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="pb-2.5">Ticket</th>
                  <th className="pb-2.5">Produtor</th>
                  <th className="pb-2.5">Peso Total</th>
                  <th className="pb-2.5 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {calculosRoca.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">Nenhuma entrada registrada.</td>
                  </tr>
                )}
                {calculosRoca.slice(0, 5).map((calc) => (
                  <tr key={calc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 font-bold text-slate-800 font-mono">
                      {calc.numero_ticket}
                    </td>
                    <td className="py-2.5 text-slate-700 truncate max-w-[140px]">
                      {calc.fornecedor_nome}
                    </td>
                    <td className="py-2.5 font-semibold text-slate-900 font-mono tabular-nums">
                      {numeroSeguro(calc.peso_total_kg).toLocaleString('pt-BR')} kg
                    </td>
                    <td className="py-2.5 text-right font-bold text-emerald-800 font-mono tabular-nums">
                      {formatarMoeda(calc.valor_total_estimado)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* 6. Danger Zone - Reset do Sistema (Solicitado pelo Usuário) */}
      <div className="pt-8 pb-4">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-black text-red-900 uppercase tracking-wider">Zona de Risco</h3>
              <p className="text-xs text-red-700 font-medium mt-0.5">
                Esta ação apaga permanentemente todos os pedidos, cadastros, produtos, receitas, financeiro e controle do sítio para que você possa iniciar do zero. Usuários e login são mantidos.
              </p>
            </div>
          </div>
          <button
            onClick={handleZerarSistema}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-md transition-all cursor-pointer whitespace-nowrap active:scale-95"
          >
            <Trash2 className="w-4 h-4" />
            <span>Zerar Banco de Dados Todo</span>
          </button>
        </div>
      </div>

    </div>
  );
}
