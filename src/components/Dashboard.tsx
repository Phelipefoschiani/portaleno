import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useGlobalState } from '../GlobalStateContext';
import { 
  DollarSign, 
  Target, 
  TrendingUp, 
  PackageCheck, 
  FileText, 
  Users, 
  AlertCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingCart,
  Percent,
  Package,
  Plus,
  Wallet,
  ChevronDown,
  Check,
  Filter,
  Factory
} from 'lucide-react';

const Card: React.FC<{ title: string; value: string; icon: any; color: string }> = ({ title, value, icon: Icon, color }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4">
    <div className="flex justify-between items-start">
      <div className={`p-3 rounded-xl ${color} bg-opacity-10 text-${color.split('-')[1] || 'primary'}-600`}>
        <Icon size={24} className={color.startsWith('text-') ? color : `text-${color}`} />
      </div>
    </div>
    <div>
      <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
    </div>
  </div>
);

const Dashboard: React.FC<{ setActiveTab?: (tab: string) => void }> = ({ setActiveTab }) => {
  const { user } = useAuth();
  const { pedidos, clientes, orcamentos, despesas, produtos, comissoes, producao, addProducao, usuarios } = useGlobalState();
  const isGerente = user?.perfil === 'gerente';

  const [selectedYears, setSelectedYears] = useState<number[]>([new Date().getFullYear()]);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [prodInput, setProdInput] = useState<Record<string, number>>({});

  const availableYears = (Array.from(new Set((pedidos || []).map(p => new Date(p.data).getFullYear()))) as number[]).sort((a, b) => b - a);
  if (availableYears.length === 0) availableYears.push(new Date().getFullYear());

  const availableMonths = [
    { v: 0, l: 'Jan' }, { v: 1, l: 'Fev' }, { v: 2, l: 'Mar' }, { v: 3, l: 'Abr' },
    { v: 4, l: 'Mai' }, { v: 5, l: 'Jun' }, { v: 6, l: 'Jul' }, { v: 7, l: 'Ago' },
    { v: 8, l: 'Set' }, { v: 9, l: 'Out' }, { v: 10, l: 'Nov' }, { v: 11, l: 'Dez' }
  ];

  const handleYearToggle = (y: number) => {
    if (selectedYears.includes(y)) setSelectedYears(selectedYears.filter(i => i !== y));
    else setSelectedYears([...selectedYears, y]);
  };
  const handleMonthToggle = (m: number) => {
    if (selectedMonths.includes(m)) setSelectedMonths(selectedMonths.filter(i => i !== m));
    else setSelectedMonths([...selectedMonths, m]);
  };

  const isFiltroAtivo = (dataStr: string) => {
    if (selectedYears.length === 0 && selectedMonths.length === 0) return true;
    const date = new Date(dataStr);
    const y = date.getFullYear();
    const m = date.getMonth();
    
    const yearMatch = selectedYears.length === 0 || selectedYears.includes(y);
    const monthMatch = selectedMonths.length === 0 || selectedMonths.includes(m);
    return yearMatch && monthMatch;
  };

  const filteredPedidos = pedidos.filter(p => isFiltroAtivo(p.data));
  const filteredOrcamentos = orcamentos.filter(o => isFiltroAtivo(o.data));

  const userPedidos = isGerente ? filteredPedidos : filteredPedidos.filter(p => p.representante_id === user?.id);
  const userOrcamentos = isGerente ? filteredOrcamentos : filteredOrcamentos.filter(o => o.representante_id === user?.id);
  const userComissoes = isGerente ? comissoes : comissoes.filter(c => c.representante_id === user?.id);

  const faturamentoTotal = userPedidos.filter(p => p.status === 'Faturado').reduce((acc, p) => acc + p.valor_total, 0);
  const comissaoTotal = userComissoes.reduce((acc, c) => acc + c.valor_comissao, 0);

  const handleAddProducao = (prodId: string) => {
    const qtd = prodInput[prodId];
    if (qtd && qtd > 0) {
      addProducao({
        id: Date.now().toString(),
        produto_id: prodId,
        data: new Date().toISOString(),
        lote: `LT-${Math.floor(Math.random() * 1000)}`,
        quantidade_produzida: qtd,
        quantidade_materia_prima: qtd * 1.5,
        perda: qtd * 0.05,
        rendimento: 0.95,
        validade: new Date(Date.now() + 30*24*60*60*1000).toISOString(),
        custo_lote: qtd * 2.5
      });
      setProdInput({ ...prodInput, [prodId]: 0 });
      alert('Produção registrada com sucesso!');
    }
  };

  if (isGerente) {
    return (
      <div className="space-y-8 relative">
        {/* Filters */}
        <div className="flex gap-4 items-center bg-white p-4 rounded-3xl shadow-sm border border-gray-100 relative z-20">
          <Filter size={20} className="text-primary hidden sm:block ml-2" />
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest hidden sm:block">Filtro de Período</span>
          
          <div className="relative">
            <button 
              onClick={() => { setShowYearDropdown(!showYearDropdown); setShowMonthDropdown(false); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 rounded-2xl text-sm font-bold text-gray-700 hover:bg-gray-100 transition-all border border-transparent hover:border-gray-200"
            >
              Anos ({selectedYears.length === 0 ? 'Todos' : selectedYears.length}) <ChevronDown size={14} className="text-gray-400" />
            </button>
            {showYearDropdown && (
              <div className="absolute top-14 left-0 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-50">
                <div className="flex justify-between items-center px-2 pb-2 mb-2 border-b border-gray-100">
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Anos Disponíveis</span>
                  <button onClick={() => setSelectedYears([])} className="text-[10px] uppercase font-bold tracking-widest text-primary hover:underline">Limpar</button>
                </div>
                {availableYears.map(y => (
                  <button 
                    key={y}
                    onClick={() => handleYearToggle(y)}
                    className={`w-full flex justify-between items-center px-3 py-2 rounded-xl text-sm font-bold transition-all ${selectedYears.includes(y) ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    <span>{y}</span>
                    {selectedYears.includes(y) && <Check size={14} className="text-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <button 
              onClick={() => { setShowMonthDropdown(!showMonthDropdown); setShowYearDropdown(false); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 rounded-2xl text-sm font-bold text-gray-700 hover:bg-gray-100 transition-all border border-transparent hover:border-gray-200"
            >
              Meses ({selectedMonths.length === 0 ? 'Todos' : selectedMonths.length}) <ChevronDown size={14} className="text-gray-400" />
            </button>
            {showMonthDropdown && (
              <div className="absolute top-14 left-0 w-64 bg-white rounded-3xl shadow-xl border border-gray-100 p-3 z-50">
                <div className="flex justify-between items-center pb-3 mb-3 border-b border-gray-100">
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest pl-1">Meses do Ano</span>
                  <button onClick={() => setSelectedMonths([])} className="text-[10px] uppercase tracking-widest font-bold text-primary hover:underline pr-1">Limpar</button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {availableMonths.map(m => (
                    <button 
                      key={m.v}
                      onClick={() => handleMonthToggle(m.v)}
                      className={`flex justify-center items-center px-2 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all ${
                        selectedMonths.includes(m.v) 
                        ? 'bg-primary text-white shadow-md shadow-primary/20' 
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100'
                      }`}
                    >
                      <span>{m.l}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
          <Card title="Faturamento do Período" value={`R$ ${faturamentoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={DollarSign} color="primary" />
          <Card title="Pedidos em Produção" value={filteredPedidos.filter(p => p.status === 'Em produção').length.toString()} icon={ShoppingCart} color="warning" />
          <Card title="Clientes Positivados" value={Array.from(new Set(filteredPedidos.filter(p => p.status === 'Faturado').map(p=>p.cliente_id))).length.toString()} icon={Users} color="secondary" />
          
          <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-2 relative">
             <h3 className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-2"><Target size={14}/> Metas dos Representantes</h3>
             <div className="overflow-x-auto flex-1">
               <table className="w-full text-left">
                  <thead>
                     <tr className="text-[9px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-100">
                        <th className="pb-2">Nome</th>
                        <th className="pb-2 text-right">Meta</th>
                        <th className="pb-2 text-right">Faturado</th>
                        <th className="pb-2 text-right">Alcance</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                     {(usuarios || []).filter(u => u.perfil === 'representante').map((rep) => {
                        const fatRep = (pedidos || []).filter(p => p.status === 'Faturado' && p.representante_id === rep.id).reduce((acc, p) => acc + p.valor_total, 0);
                        const metaRep = 0; // Metas desabilitadas temporariamente
                        let percent = 0;
                        if (metaRep > 0) percent = Math.min(100, (fatRep / metaRep) * 100);
                        
                        return (
                           <tr key={rep.id}>
                              <td className="py-2 text-[10px] font-bold text-gray-800">{rep.nome.split(' ')[0]}</td>
                              <td className="py-2 text-[10px] font-medium text-gray-500 text-right">R$ {metaRep.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                              <td className="py-2 text-[10px] font-bold text-primary text-right">R$ {fatRep.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                              <td className="py-2 text-[10px] font-black text-right min-w-[50px]">
                                 <span className={percent >= 100 ? 'text-green-500' : (percent >= 70 ? 'text-blue-500' : 'text-danger')}>
                                    {percent.toFixed(0)}%
                                 </span>
                              </td>
                           </tr>
                        );
                     })}
                  </tbody>
               </table>
             </div>
          </div>
        </div>

        {/* Produção Section */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
           <div className="lg:col-span-3 bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-gray-100 relative z-10 overflow-hidden">
             <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-8">
               <div className="flex items-center gap-4">
                 <div className="p-4 bg-primary/10 rounded-2xl text-primary"><Factory size={28} /></div>
                 <div>
                   <h3 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Capacidade & Demanda</h3>
                   <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Cálculo baseado em pedidos pendentes</p>
                 </div>
               </div>
               <div className="flex items-center gap-2 bg-warning/5 px-4 py-2 rounded-xl">
                  <AlertCircle size={14} className="text-warning" />
                  <p className="text-[10px] font-bold text-warning uppercase select-none">Exibindo apenas pedidos não faturados</p>
               </div>
             </div>
             
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse min-w-[700px]">
                 <thead>
                   <tr className="border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/50">
                     <th className="py-3 px-4 rounded-tl-xl">Produto</th>
                     <th className="py-3 px-4 text-center">Pedidos Pendentes</th>
                     <th className="py-3 px-4 text-center">Produzido Total</th>
                     <th className="py-3 px-4 text-center">Status Produção</th>
                     <th className="py-3 px-4 text-center w-32">Progresso</th>
                     <th className="py-3 px-4 text-center">Média Diária</th>
                     <th className="py-3 px-4 rounded-tr-xl text-right">Registrar (kg)</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                   {produtos.map(p => {
                      // Active demand from orders that are not Faturado or Cancelado
                      const pendentes = pedidos.filter(ped => 
                        (ped.status === 'Em produção' || ped.status === 'Aprovado') &&
                        ped.items?.some(i => i.produto_id === p.id)
                      ).reduce((acc, ped) => {
                        const item = ped.items?.find(i => i.produto_id === p.id);
                        return acc + (item?.quantidade || 0);
                      }, 0);

                      const meta = pendentes; 
                      
                      const produzidoHoje = producao
                         .filter(pr => pr.produto_id === p.id && new Date(pr.data).toDateString() === new Date().toDateString())
                         .reduce((acc,pr)=>acc+pr.quantidade_produzida, 0);
                      const produzidoTotal = producao
                         .filter(pr => pr.produto_id === p.id)
                         .reduce((acc,pr)=>acc+pr.quantidade_produzida, 0);
                      
                      const faltam = Math.max(0, meta - produzidoTotal);
                      const percent = meta > 0 ? Math.min(100, Math.floor((produzidoTotal / meta) * 100)) : (produzidoTotal > 0 ? 100 : 0);

                      if (meta === 0 && produzidoTotal === 0) return null;

                      return (
                        <tr key={p.id} className="hover:bg-gray-50 transition-colors group">
                          <td className="py-4 px-4 font-black text-gray-900 text-sm whitespace-nowrap">{p.nome}</td>
                          <td className="py-4 px-4 text-center font-bold text-gray-500 whitespace-nowrap">{meta} <span className="text-[10px]">{p.unidade}</span></td>
                          <td className="py-4 px-4 text-center font-bold text-gray-900 whitespace-nowrap">{produzidoTotal} <span className="text-[10px]">{p.unidade}</span></td>
                          <td className="py-4 px-4 text-center whitespace-nowrap">
                            {faltam > 0 ? (
                              <span className="bg-warning/10 text-warning px-3 py-1 font-bold text-xs rounded-lg inline-block">Faltam {faltam} {p.unidade}</span>
                            ) : (
                              <span className="bg-green-100 text-green-700 px-3 py-1 font-bold text-xs rounded-lg inline-block">Estoque OK</span>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex flex-col gap-1 items-center">
                              <span className={`text-[10px] font-black ${percent === 100 ? 'text-green-500' : 'text-primary'}`}>{percent}%</span>
                              <div className="w-full h-1.5 bg-gray-200/60 rounded-full overflow-hidden">
                                <div className={`h-full transition-all duration-1000 ${percent === 100 ? 'bg-green-500' : 'bg-primary'}`} style={{ width: `${percent}%` }}></div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center whitespace-nowrap">
                             <span className="font-black text-primary text-sm">{produzidoHoje} <span className="text-[10px]/none">kg/hoje</span></span>
                          </td>
                          <td className="py-4 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <input 
                                type="number"
                                placeholder="0"
                                value={prodInput[p.id] || ''}
                                onChange={(e) => setProdInput({...prodInput, [p.id]: Number(e.target.value)})}
                                className="w-16 px-2 py-1.5 rounded-lg border border-gray-200 text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white outline-none transition-all text-center"
                              />
                              <button 
                                onClick={() => handleAddProducao(p.id)}
                                disabled={!prodInput[p.id]}
                                className="p-1.5 bg-primary text-white rounded-lg hover:bg-secondary transition-all disabled:opacity-50 disabled:bg-gray-300"
                              >
                                <Plus size={16}/>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                   })}
                 </tbody>
               </table>
             </div>
           </div>

           {/* Live Production Status */}
           <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col gap-6">
              <div className="flex items-center gap-3">
                 <div className="w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
                 <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Em Tempo Real</h4>
              </div>
              <div className="space-y-6">
                <div>
                   <p className="text-xl font-black text-gray-800 tracking-tighter">
                     {pedidos.filter(p => p.status === 'Em produção').length} Pedidos
                   </p>
                   <p className="text-[10px] font-bold text-gray-400 uppercase">Sendo produzidos agora</p>
                </div>

                <div className="space-y-3">
                   {pedidos.filter(p => p.status === 'Em produção').slice(0, 3).map(ped => (
                     <div key={ped.id} className="p-3 bg-orange-50/50 rounded-xl border border-orange-100/50 flex flex-col gap-1">
                        <div className="flex justify-between items-center">
                           <span className="text-[10px] font-black text-orange-600 uppercase">#{ped.id.substring(0,6)}</span>
                           <span className="text-[8px] font-bold text-orange-400">Iniciado {new Date(ped.data).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs font-bold text-gray-700 truncate">
                          {ped.items?.length || 0} itens em preparo...
                        </p>
                        {ped.previsao_entrega && (
                          <div className="mt-1 flex items-center gap-1.5 px-2 py-1 bg-orange-100 text-orange-700 rounded-lg w-fit">
                             <Clock size={10} />
                             <span className="text-[9px] font-black uppercase">Entrega: {new Date(ped.previsao_entrega).toLocaleDateString('pt-BR')}</span>
                          </div>
                        )}
                     </div>
                   ))}
                   {pedidos.filter(p => p.status === 'Em produção').length === 0 && (
                     <div className="py-4 text-center border-2 border-dashed border-gray-100 rounded-2xl">
                        <p className="text-[10px] font-bold text-gray-300 uppercase">Pátio Silencioso</p>
                     </div>
                   )}
                </div>
              </div>
           </div>
        </div>

        {/* Bottom row: Alertas & Metas */}
        <div className="grid grid-cols-1 relative z-10 w-full">
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col w-full">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-black text-gray-900 flex items-center gap-3 tracking-tight">
                <div className="p-2.5 bg-warning/10 text-warning rounded-xl"><AlertCircle size={24} /></div> 
                Alertas Financeiros & Sistema
              </h3>
            </div>
            
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <th className="pb-4 pt-2">Aviso</th>
                    <th className="pb-4 pt-2">Data</th>
                    <th className="pb-4 pt-2 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {produtos.filter(p => p.estoque_atual < p.estoque_minimo).slice(0,3).map(p => (
                    <tr key={p.id} className="group hover:bg-gray-50 transition-colors">
                      <td className="py-4">
                        <p className="font-bold text-gray-700 text-sm flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-danger"></span>
                          Estoque Crítico
                        </p>
                        <p className="text-xs font-medium text-gray-500 mt-1">{p.nome} abaixo do mínimo ({p.estoque_atual} {p.unidade})</p>
                      </td>
                      <td className="py-4 text-[10px] uppercase tracking-widest font-bold text-gray-400">Hoje</td>
                      <td className="py-4 text-right">
                        <button className="text-[10px] uppercase tracking-widest font-black text-primary hover:bg-primary/5 px-3 py-2 rounded-xl transition-colors">Ver Estoque</button>
                      </td>
                    </tr>
                  ))}
                  <tr className="group hover:bg-gray-50 transition-colors">
                    <td className="py-4">
                      <p className="font-bold text-gray-700 text-sm flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-warning"></span>
                        Financeiro
                      </p>
                      <p className="text-xs font-medium text-gray-500 mt-1">Conta de Energia vence em 2 dias</p>
                    </td>
                    <td className="py-4 text-[10px] uppercase tracking-widest font-bold text-gray-400">Em 2 dias</td>
                    <td className="py-4 text-right">
                      <button 
                        onClick={() => setActiveTab && setActiveTab('despesas')}
                        className="text-[10px] uppercase tracking-widest font-black text-primary hover:bg-primary/5 px-3 py-2 rounded-xl transition-colors"
                      >
                        Pagar Conta
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Representante View
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const userMetaValor = 0; // Metas desabilitadas temporariamente
  const percentAtingido = userMetaValor > 0 ? ((faturamentoTotal / userMetaValor) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card title="Faturamento" value={`R$ ${faturamentoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={DollarSign} color="primary" />
        <Card title={`Meta (${currentMonth.toString().padStart(2, '0')}/${currentYear})`} value={`R$ ${userMetaValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={Target} color="secondary" />
        <Card title="Atingido" value={`${percentAtingido}%`} icon={TrendingUp} color="green-600" />
        <Card title="Comissão" value={`R$ ${comissaoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={Percent} color="warning" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button className="p-4 bg-primary text-white rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-secondary transition-all shadow-lg shadow-primary/20 group">
          <Plus size={24} className="group-hover:rotate-90 transition-transform" />
          <span className="text-xs font-bold">Novo Pedido</span>
        </button>
        <button className="p-4 bg-white border border-gray-100 text-earth rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-primary transition-all group">
          <Users size={24} className="text-primary group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold text-gray-600">Novo Cliente</span>
        </button>
        <button className="p-4 bg-white border border-gray-100 text-earth rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-primary transition-all group">
          <FileText size={24} className="text-primary group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold text-gray-600">Novo Orçamento</span>
        </button>
        <button className="p-4 bg-white border border-gray-100 text-earth rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-primary transition-all group">
          <Wallet size={24} className="text-primary group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold text-gray-600">Lançar Despesa</span>
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-primary">Últimos Pedidos</h3>
            <button className="text-sm font-bold text-secondary hover:underline">Ver todos</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">
                  <th className="pb-4 text-center">Nº</th>
                  <th className="pb-4">Cliente</th>
                  <th className="pb-4">Data</th>
                  <th className="pb-4">Valor</th>
                  <th className="pb-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {userPedidos.slice(0, 5).map((ped) => (
                  <tr key={ped.id} className="hover:bg-gray-50 group">
                    <td className="py-4 text-sm font-bold text-gray-300 text-center group-hover:text-primary transition-colors">{ped.id}</td>
                    <td className="py-4 text-sm font-semibold text-gray-800">{ped.cliente_nome}</td>
                    <td className="py-4 text-sm text-gray-500">{new Date(ped.data).toLocaleDateString('pt-BR')}</td>
                    <td className="py-4 text-sm font-bold text-gray-900">R$ {ped.valor_total.toLocaleString('pt-BR')}</td>
                    <td className="py-4">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${
                        ped.status === 'Faturado' ? 'bg-green-100 text-green-700' : 
                        ped.status === 'Cancelado' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {ped.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-primary mb-6">Alertas Comerciais</h3>
          <div className="space-y-4">
            {userOrcamentos.filter(o => o.status === 'Aprovado').map(o => (
              <div key={o.id} className="p-4 bg-green-50 rounded-xl border border-green-100 flex gap-4">
                <TrendingUp className="text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-bold text-green-600 text-sm">Orçamento Aprovado</p>
                  <p className="text-xs text-green-800/70 leading-relaxed">#{o.id} - {o.cliente_nome}</p>
                </div>
              </div>
            ))}
            <div className="p-4 bg-warning/10 rounded-xl border border-warning/20 flex gap-4">
              <Clock className="text-warning flex-shrink-0" />
              <div>
                <p className="font-bold text-warning text-sm">Orçamentos em Aberto</p>
                <p className="text-xs text-warning/70 leading-relaxed">{userOrcamentos.filter(o => o.status === 'Enviado').length} unidades</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
