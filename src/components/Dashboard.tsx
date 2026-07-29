import React, { useState, useMemo } from 'react';
import { useAuth } from '../AuthContext';
import { useGlobalState } from '../GlobalStateContext';
import { 
  DollarSign, 
  TrendingUp, 
  Package, 
  Wallet,
  CheckCircle,
  Factory,
  ArrowRight,
  Eye,
  X,
  Coins
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';

const Dashboard: React.FC<{ setActiveTab?: (tab: string) => void, empresa?: string }> = ({ setActiveTab, empresa }) => {
  const { user } = useAuth();
  const { pedidos, despesas, produtos, clientes, comissoes, producao, updatePedido, objetivosEmpresa } = useGlobalState();
  
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedPedidoInfo, setSelectedPedidoInfo] = useState<any>(null);

  if (empresa !== 'estancia') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-white rounded-3xl border border-gray-100 shadow-sm p-8 text-center">
        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
          <Factory size={40} className="text-gray-300" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-2">Empresa em Configuração</h2>
        <p className="text-gray-500 max-w-md font-medium">
          O painel para esta empresa será configurado em breve. Atualmente, os indicadores e relatórios estão disponíveis apenas para a Estância Nova Olinda.
        </p>
      </div>
    );
  }

  // Filter data by selected month and year
  const filterByDate = (dateStr: string) => {
    if (!dateStr) return false;
    try {
      const cleanStr = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
      if (cleanStr.includes("-")) {
        const parts = cleanStr.split("-");
        if (parts.length === 3 && parts[0].length === 4) {
          const yr = parseInt(parts[0], 10);
          const mo = parseInt(parts[1], 10);
          return mo === selectedMonth && yr === selectedYear;
        }
      }
      const d = new Date(cleanStr + "T12:00:00");
      if (isNaN(d.getTime())) return false;
      return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
    } catch (e) {
      return false;
    }
  };

  const getExpenseDay = (dateStr: string) => {
    if (!dateStr) return 0;
    try {
      const cleanStr = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
      if (cleanStr.includes("-")) {
        const parts = cleanStr.split("-");
        if (parts.length === 3 && parts[0].length === 4) {
          return parseInt(parts[2], 10);
        }
      }
      const d = new Date(cleanStr + "T12:00:00");
      return d.getDate();
    } catch (e) {
      return 0;
    }
  };

  const getPedidoDay = (dateStr: string) => {
    if (!dateStr) return 0;
    try {
      const cleanStr = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
      if (cleanStr.includes("-")) {
        const parts = cleanStr.split("-");
        if (parts.length === 3 && parts[0].length === 4) {
          return parseInt(parts[2], 10);
        }
      }
      const d = new Date(cleanStr + "T12:00:00");
      return d.getDate();
    } catch (e) {
      return 0;
    }
  };

  const pedidosMes = pedidos.filter(p => filterByDate(p.data));
  const despesasMes = despesas.filter(d => filterByDate(d.data || d.vencimento) && d.status !== 'Cancelada');

  // KPIs
  const faturamentoTotal = pedidosMes
    .filter(p => p.status === 'Faturado')
    .reduce((acc, p) => acc + p.valor_total, 0);

  const aReceberTotal = pedidos
    .filter(p => p.status === 'Faturado' && !p.recebido && !p.adiantado)
    .reduce((acc, p) => acc + (p.nf_valor_total || p.valor_total || 0), 0);

  const isExpenseFixed = (d: any) => d.tipo_despesa === 'fixa' || d.categoria?.toLowerCase().includes('fix');
  const isExpenseVariable = (d: any) => d.tipo_despesa === 'variavel' || d.categoria?.toLowerCase().includes('vari') || (!d.categoria?.toLowerCase().includes('fix') && d.tipo_despesa !== 'fixa');

  const despesasFixas = despesasMes.filter(isExpenseFixed).reduce((acc, d) => acc + d.valor, 0);
  const despesasVariaveis = despesasMes.filter(isExpenseVariable).reduce((acc, d) => acc + d.valor, 0);
  const despesasTotal = despesasFixas + despesasVariaveis;

  const currentGoalObj = objetivosEmpresa?.find(o => o.ano === selectedYear && o.mes === selectedMonth);
  const objetivoMes = currentGoalObj ? currentGoalObj.valor : 0;

  // Chart Data
  const diasNoMes = new Date(selectedYear, selectedMonth, 0).getDate();
  const chartData = [];

  const faturadosNoMes = pedidosMes.filter(p => p.status === 'Faturado');
  const custoFixoAoDia = despesasFixas / diasNoMes;

  let fatAcumulado = 0;
  let custoAcumulado = 0;

  for (let i = 1; i <= diasNoMes; i++) {
    const pedDia = faturadosNoMes.filter(p => getPedidoDay(p.data) === i);
    const fatDia = pedDia.reduce((acc, p) => acc + (p.valor_total || 0), 0);
    const custoProdDia = pedDia.reduce((acc, p) => acc + (p.custo_total || 0), 0);

    const despVarDia = despesasMes.filter(d => getExpenseDay(d.vencimento) === i && isExpenseVariable(d));
    const totalDespVarDia = despVarDia.reduce((acc, d) => acc + d.valor, 0);

    fatAcumulado += fatDia;
    custoAcumulado += (custoFixoAoDia + custoProdDia + totalDespVarDia);

    chartData.push({
      dia: i,
      Faturamento: Math.round(fatAcumulado),
      CustoTotal: Math.round(custoAcumulado),
      LucroBruto: Math.round(fatAcumulado - custoAcumulado)
    });
  }

  // Comissões
  const comissoesMes = comissoes.filter(c => filterByDate(c.data_prevista));
  const { usuarios } = useGlobalState();
  const getUserName = (id: string) => usuarios.find(u => u.id === id)?.nome || id;

  // Painel de Produção x Gerente
  const pedidosEmProducao = pedidos.filter(p => p.status === 'Em produção' || p.status === 'Aguardando Produção');
  const pedidosConcluidos = pedidos.filter(p => p.status === 'Faturado');

  const handleFaturar = (pedidoId: string) => {
    updatePedido(pedidoId, { status: 'Faturado', data_faturamento: new Date().toISOString() });
    alert("Pedido faturado! Em breve você o verá na página de Notas Fiscais.");
    if (setActiveTab) setActiveTab('dashboard'); // could be set to 'notas-fiscais' later
  };

  const getClientName = (id: string) => clientes.find(c => c.id === id)?.razao_social || 'Cliente Desconhecido';
  const getProdName = (id: string) => produtos.find(p => p.id === id)?.nome || 'Produto';
  
  // Calculate completion percentage for a given order item
  // For the mockup, we will assume 100% if order is near done, or some logic with Producao
  const getItemProgress = (produtoId: string, quantidadePedida: number) => {
    const produced = producao
      .filter(pr => pr.produto_id === produtoId) // simplificatio
      .reduce((acc, pr) => acc + pr.quantidade_produzida, 0);
    // As a mock, let's just make it visually interesting if there's no prod data
    const mockProgress = Math.floor(Math.random() * 100); 
    const finalVal = produced > 0 ? produced : mockProgress;
    return Math.min(100, Math.floor((finalVal / quantidadePedida) * 100));
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Visão Geral</h2>
          <p className="text-sm font-medium text-gray-500">Acompanhamento de resultados e produção</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 mb-1">Mês</span>
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-2 font-bold text-gray-700 outline-none hover:border-gray-200 transition-all cursor-pointer"
            >
              {Array.from({length: 12}).map((_, i) => (
                <option key={i+1} value={i+1}>{new Date(2000, i, 1).toLocaleString('pt-BR', { month: 'long' })}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 mb-1">Ano</span>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-2 font-bold text-gray-700 outline-none hover:border-gray-200 transition-all cursor-pointer"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-4">
           <div className="flex justify-between items-start">
             <div>
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Faturamento</p>
               <h3 className="text-3xl font-black text-gray-900 mt-1">
                 R$ {faturamentoTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
               </h3>
             </div>
             <div className="p-3 bg-secondary/10 text-secondary rounded-2xl"><DollarSign size={24} /></div>
           </div>
        </div>
        
        <div 
          onClick={() => setActiveTab && setActiveTab('objetivo')} 
          className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-4 cursor-pointer hover:shadow-md hover:border-gray-200 transition-all text-left"
        >
           <div className="flex justify-between items-start">
             <div>
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Objetivo do Mês</p>
               <h3 className="text-3xl font-black text-gray-900 mt-1">
                 R$ {objetivoMes.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
               </h3>
             </div>
             <div className="p-3 bg-primary/10 text-primary rounded-2xl"><TrendingUp size={24} /></div>
           </div>
           <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
             <div className="bg-primary h-full" style={{ width: `${Math.min(100, objetivoMes > 0 ? (faturamentoTotal / objetivoMes) * 100 : 0)}%` }} />
           </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-4">
           <div className="flex justify-between items-start">
             <div>
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Controle A Receber</p>
               <h3 className="text-3xl font-black text-blue-600 mt-1">
                 R$ {aReceberTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
               </h3>
               <p className="text-xs font-semibold text-gray-400 mt-1">Saldos de faturamentos pendentes</p>
             </div>
             <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Coins size={24} /></div>
           </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-4">
           <div className="flex justify-between items-start">
             <div>
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Despesas Totais</p>
               <h3 className="text-3xl font-black text-gray-900 mt-1">
                 R$ {despesasTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                </h3>
                <p className="text-xs font-bold text-gray-400 mt-1">Fixo: R${despesasFixas} / Var: R${despesasVariaveis}</p>
                <h3 className="hidden">
               </h3>
             </div>
             <div className="p-3 bg-red-50 text-red-500 rounded-2xl"><Wallet size={24} /></div>
           </div>
        </div>
      </div>

      {/* Pedidos Concluídos */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
          <CheckCircle size={20} className="text-green-600" />
          <h3 className="font-bold text-green-700 uppercase text-xs tracking-widest">Pedidos Concluídos</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Data Faturamento</th>
                <th className="px-6 py-4">Valor Total</th>
                <th className="px-6 py-4 text-center">Volume</th>
                <th className="px-6 py-4 text-right">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pedidosConcluidos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400 font-medium">Nenhum pedido faturado ou concluído encontrado.</td>
                </tr>
              ) : (
                pedidosConcluidos.map(pedido => {
                  const itemsCount = pedido.items.reduce((acc, item) => acc + item.quantidade, 0);
                  return (
                    <tr key={pedido.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer text-sm font-medium text-gray-800">
                      <td className="px-6 py-4">{getClientName(pedido.cliente_id)}</td>
                      <td className="px-6 py-4 text-gray-500">{new Date(pedido.data_faturamento || pedido.data).toLocaleDateString('pt-BR')}</td>
                      <td className="px-6 py-4 font-black">R$ {pedido.valor_total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                      <td className="px-6 py-4 text-center">{itemsCount}</td>
                      <td className="px-6 py-4 text-right">
                         <button 
                           onClick={() => setSelectedPedidoInfo(pedido)}
                           className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-primary hover:text-white transition-all shadow-sm"
                           title="Ver Informações"
                         >
                           <Eye size={18} />
                         </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Painel Produção x Gerente */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
          <Factory size={20} className="text-primary" />
          <h3 className="font-bold text-primary uppercase text-xs tracking-widest">Painel de Produção</h3>
        </div>
        
        {pedidosEmProducao.length === 0 ? (
          <div className="p-12 text-center text-gray-400 font-medium">Nenhum pedido em produção ou aguardando no momento.</div>
        ) : (
          <div className="p-6 space-y-6">
            {pedidosEmProducao.map(pedido => {
              const isAguardando = pedido.status === 'Aguardando Produção';
              const progressOfItems = pedido.items.map(it => isAguardando ? 0 : getItemProgress(it.produto_id, it.quantidade));
              const allItemsFinished = !isAguardando && progressOfItems.every(p => p === 100);

              return (
                <div key={pedido.id} className="bg-white border-2 border-gray-100 rounded-2xl p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-gray-100">
                    <div>
                      <div className="flex items-center gap-2">
                         <h4 className="font-black text-lg text-gray-900 tracking-tight">PED-{pedido.id.split('_')[1] || pedido.id.substring(0,6)}</h4>
                         {isAguardando ? (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-black uppercase rounded">Fila de Espera</span>
                         ) : (
                            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-black uppercase rounded animate-pulse">Andamento</span>
                         )}
                      </div>
                      <p className="text-sm font-bold text-gray-500 mt-1">{getClientName(pedido.cliente_id)}</p>
                    </div>
                    
                    {/* Interactive workflow control triggers */}
                    {isAguardando ? (
                      <button 
                        onClick={() => updatePedido(pedido.id, { status: 'Em produção' })}
                        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-black text-xs uppercase tracking-wider rounded-xl hover:bg-primary/95 transition-all shadow-md"
                      >
                        <Package size={14} /> Iniciar Produção
                      </button>
                    ) : (
                      <button 
                        onClick={() => updatePedido(pedido.id, { status: 'Pronto' })}
                        className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white font-black text-xs uppercase tracking-wider rounded-xl hover:bg-emerald-700 transition-all shadow-md"
                      >
                        <CheckCircle size={14} /> Finalizar Produção
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    {pedido.items.map((item, idx) => {
                      const perc = isAguardando ? 0 : getItemProgress(item.produto_id, item.quantidade);
                      return (
                        <div key={idx} className="flex flex-col gap-2">
                          <div className="flex justify-between items-center text-sm font-bold text-gray-700">
                            <span>{item.quantidade}x {getProdName(item.produto_id)}</span>
                            {isAguardando ? (
                              <span className="text-gray-400">0% (Aguardando)</span>
                            ) : (
                              <span className={perc === 100 ? 'text-emerald-600' : 'text-orange-500'}>{perc}% Concluído</span>
                            )}
                          </div>
                          <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                            <div className={`h-full transition-all ${isAguardando ? 'bg-gray-200' : perc === 100 ? 'bg-emerald-500' : 'bg-orange-500'}`} style={{ width: `${perc}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Break-Even Chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <h3 className="font-bold text-primary uppercase text-xs tracking-widest">Ponto de Equilíbrio & Resultado</h3>
          </div>
          <div className="p-6 flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis 
                  dataKey="dia" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#9ca3af', fontWeight: 600 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#9ca3af', fontWeight: 600 }}
                  tickFormatter={(val) => `R$${val/1000}k`}
                />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, '']}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 'bold' }} />
                <Line type="monotone" name="Custo Total (Fixo+Var)" dataKey="CustoTotal" stroke="#ef4444" strokeWidth={3} dot={false} />
                <Line type="monotone" name="Faturamento Bruto" dataKey="Faturamento" stroke="#3b82f6" strokeWidth={3} dot={false} />
                <Line type="monotone" name="Lucro Bruto" dataKey="LucroBruto" stroke="#10b981" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Comissões Representantes */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <h3 className="font-bold text-primary uppercase text-xs tracking-widest">Comissões do Mês</h3>
            <p className="text-[10px] text-gray-400 mt-1">Serão lançadas como Despesa Variável no último dia.</p>
          </div>
          <div className="p-6 flex-1 overflow-y-auto">
             <div className="space-y-4">
               {comissoesMes.length === 0 ? (
                 <p className="text-sm text-gray-500 font-medium">Nenhuma comissão prevista para este mês.</p>
               ) : (
                 comissoesMes.map(com => (
                   <div key={com.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl">
                     <div>
                       <p className="font-bold text-gray-900 tracking-tight">{getUserName(com.representante_id)}</p>
                       <p className="text-[10px] font-black text-gray-400 uppercase">PED: {com.pedido_id}</p>
                     </div>
                     <div className="text-right">
                       <p className="font-black text-secondary">R$ {com.valor_comissao.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                       <p className="text-[10px] font-bold text-gray-400">{com.percentual}% de R${com.valor_base}</p>
                     </div>
                   </div>
                 ))
               )}
             </div>
          </div>
        </div>
      </div>

      {/* Modal Detalhes do Pedido */}
      {selectedPedidoInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-primary/40 backdrop-blur-sm">
           <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col scale-in">
              <div className="p-8 bg-primary text-white flex justify-between items-center shrink-0">
                 <div>
                    <h2 className="text-2xl font-black tracking-tight">Detalhes do Pedido</h2>
                    <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mt-1">PED-{selectedPedidoInfo.id.substring(0,8)}</p>
                 </div>
                 <button onClick={() => setSelectedPedidoInfo(null)} className="hover:rotate-90 transition-all text-white/60 hover:text-white"><X size={24} /></button>
              </div>
              <div className="p-8 overflow-y-auto flex-1 bg-gray-50 flex flex-col lg:flex-row gap-8">
                {/* Info Lateral */}
                <div className="lg:w-1/3 space-y-6">
                  <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6 shrink-0 h-full">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Cliente</p>
                      <p className="font-bold text-gray-900 text-lg">{getClientName(selectedPedidoInfo.cliente_id)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</p>
                      <span className="inline-block px-3 py-1 bg-green-100 text-green-700 text-xs font-black uppercase rounded-lg">{selectedPedidoInfo.status}</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Data Emissão</p>
                      <p className="font-bold text-gray-700">{new Date(selectedPedidoInfo.data).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Valor Total</p>
                      <p className="font-black text-primary text-3xl">R$ {selectedPedidoInfo.valor_total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                    </div>
                  </div>
                </div>

                {/* Itens */}
                <div className="lg:w-2/3 flex flex-col">
                  <div className="bg-white rounded-3xl border border-gray-100 shadow-sm flex-1 p-8">
                    <h4 className="font-bold text-gray-900 mb-6 border-b border-gray-100 pb-4">Itens do Pedido</h4>
                    <div className="space-y-3">
                      {selectedPedidoInfo.items?.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center bg-gray-50 p-6 rounded-2xl border border-gray-100">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black">
                              {(item.quantidade).toString().padStart(2, '0')}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 text-lg">{getProdName(item.produto_id)}</p>
                              <p className="text-sm text-gray-500 font-medium">{item.quantidade} x R$ {item.preco.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Subtotal</p>
                            <p className="font-black text-gray-900 text-xl">R$ {(item.quantidade * item.preco).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
