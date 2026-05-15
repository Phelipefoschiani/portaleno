import React, { useState, useMemo } from 'react';
import { useGlobalState } from '../GlobalStateContext';
import { CreditCard, Wallet, TrendingUp, TrendingDown, Plus, History, X, Save, ArrowRight, BarChart3, PieChart, Calendar, Banknote, Filter, ShoppingCart, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';

export default function FinanceiroPessoal() {
  const { despesas, addDespesa } = useGlobalState();
  const [showModal, setShowModal] = useState(false);
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  const personalExpenses = useMemo(() => despesas.filter(d => {
    const date = new Date(d.data);
    return d.tipo === 'Pessoal' && (date.getMonth() + 1) === filterMonth && date.getFullYear() === filterYear;
  }), [despesas, filterMonth, filterYear]);

  const [formData, setFormData] = useState({
    descricao: '',
    valor: 0,
    categoria: 'Saúde',
    data: new Date().toISOString().split('T')[0],
    recorrencia: 'Única',
    parcelas: 1,
    forma_pagamento: 'Pix'
  });

  const handleSave = () => {
    if (formData.recorrencia === 'Parcelada' && formData.parcelas > 1) {
      const valorParcela = formData.valor / formData.parcelas;
      for (let i = 0; i < formData.parcelas; i++) {
        const d = new Date(formData.data);
        d.setMonth(d.getMonth() + i);
        addDespesa({
          ...formData,
          descricao: `${formData.descricao} (${i + 1}/${formData.parcelas})`,
          valor: valorParcela,
          data: d.toISOString().split('T')[0],
          status: 'Pago',
          tipo: 'Pessoal',
          usuario_id: '1'
        } as any);
      }
    } else {
      addDespesa({
        ...formData,
        status: 'Pago',
        tipo: 'Pessoal',
        usuario_id: '1'
      } as any);
    }
    setShowModal(false);
  };

  // Analysis for the filters
  const totalSpent = personalExpenses.reduce((acc, d) => acc + d.valor, 0);
  
  const categoriesMap = useMemo(() => {
    const map: { [key: string]: number } = {};
    personalExpenses.forEach(exp => {
      map[exp.categoria] = (map[exp.categoria] || 0) + exp.valor;
    });
    return Object.entries(map).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);
  }, [personalExpenses]);

  // Forecast for next months (ignoring current filter year/month? Usually forecast is from today onwards)
  const forecastData = useMemo(() => {
    const months: { [key: string]: number } = {};
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const label = d.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase();
      months[label] = 0;
    }
    despesas.filter(d => d.tipo === 'Pessoal').forEach(exp => {
      const date = new Date(exp.data);
      const label = date.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase();
      if (months[label] !== undefined) months[label] += exp.valor;
    });
    return Object.entries(months).map(([name, total]) => ({ name, total }));
  }, [despesas]);

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-fade-in pb-20">
      {/* Header com Filtros */}
      <div className="bg-primary p-10 rounded-[50px] text-white shadow-3xl shadow-primary/20 flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden">
         <div className="absolute top-0 right-0 p-8 opacity-5"><Wallet size={150} /></div>
         <div className="relative z-10">
            <h1 className="text-4xl font-black tracking-tighter">Meu Financeiro</h1>
            <p className="text-accent/60 font-medium">Controle pessoal de gastos e projeções futuras.</p>
         </div>
         
         <div className="relative z-10 flex flex-wrap gap-4 items-center">
            <div className="flex bg-white/10 rounded-2xl p-1 border border-white/10 backdrop-blur-md">
              <select 
                value={filterMonth}
                onChange={(e) => setFilterMonth(Number(e.target.value))}
                className="bg-transparent text-white px-4 py-2 border-none outline-none font-bold text-sm cursor-pointer"
              >
                {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((m, i) => (
                  <option key={i} value={i+1} className="text-gray-900">{m}</option>
                ))}
              </select>
              <select 
                value={filterYear}
                onChange={(e) => setFilterYear(Number(e.target.value))}
                className="bg-transparent text-white px-4 py-2 border-none outline-none font-bold text-sm cursor-pointer border-l border-white/10"
              >
                {[2024, 2025, 2026].map(y => (
                  <option key={y} value={y} className="text-gray-900">{y}</option>
                ))}
              </select>
            </div>
            <button 
              onClick={() => setShowModal(true)}
              className="bg-accent text-primary px-8 py-4 rounded-3xl font-black text-sm uppercase hover:scale-105 transition-all shadow-xl shadow-accent/20 flex items-center gap-2"
            >
               <Plus size={18} /> Novo Lançamento
            </button>
         </div>
      </div>

      {/* Gráfico no Topo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm space-y-8">
            <div className="flex justify-between items-center">
               <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Ganhos vs Gastos (Projeção)</h3>
               <div className="flex gap-4 text-[9px] font-black uppercase">
                  <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-primary"></span> Compromissado</div>
               </div>
            </div>
            <div className="h-[300px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={forecastData}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                     <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900, fill: '#94a3b8'}} />
                     <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900, fill: '#94a3b8'}} />
                     <Tooltip 
                        cursor={{fill: '#f8fafc'}} 
                        contentStyle={{borderRadius: '20px', border: 'none', shadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}}
                     />
                     <Bar dataKey="total" radius={[12, 12, 0, 0]} barSize={45}>
                        {forecastData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={index === 0 ? '#efbf04' : '#1a4332'} />
                        ))}
                     </Bar>
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>

         <div className="bg-primary p-10 rounded-[40px] text-white flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10"><TrendingDown size={150} /></div>
            <div className="space-y-2 relative z-10">
               <p className="text-[10px] font-black opacity-40 uppercase tracking-widest">Gasto Total no Período</p>
               <h2 className="text-5xl font-black tracking-tighter">R$ {totalSpent.toLocaleString('pt-BR')}</h2>
            </div>
            <div className="space-y-4 relative z-10 pt-10">
               <div className="p-5 bg-white/10 rounded-2xl border border-white/5 backdrop-blur-sm">
                  <p className="text-[10px] font-black opacity-50 uppercase mb-2">Maior Categoria</p>
                  <div className="flex justify-between items-end">
                     <span className="text-xl font-black text-accent">{categoriesMap[0]?.name || '-'}</span>
                     <span className="text-xs font-bold opacity-60">R$ {categoriesMap[0]?.total.toLocaleString('pt-BR') || 0}</span>
                  </div>
               </div>
               <p className="text-[11px] font-medium opacity-40 leading-relaxed italic">
                  "Seus lançamentos sugerem um aumento de 5% em relação ao mês anterior."
               </p>
            </div>
         </div>
      </div>

      {/* Tabelas de Gastos */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
         {/* Tabela de Extrato Detalhado */}
         <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
            <div className="p-10 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
               <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Extrato de Lançamentos</h3>
               <Calendar size={18} className="text-gray-300" />
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-10">
               <div className="space-y-4">
                  {personalExpenses.length > 0 ? (
                    personalExpenses.sort((a, b) => b.data.localeCompare(a.data)).map((exp) => (
                      <div key={exp.id} className="flex justify-between items-center p-6 bg-white border border-gray-50 rounded-3xl hover:shadow-xl hover:shadow-gray-200/40 transition-all cursor-pointer group">
                         <div className="flex items-center gap-5">
                            <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                               {exp.forma_pagamento === 'Pix' ? <TrendingUp size={20} /> : <CreditCard size={20} />}
                            </div>
                            <div>
                               <p className="text-sm font-black text-gray-800">{exp.descricao}</p>
                               <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{exp.categoria}</span>
                                  <span className="w-1 h-1 rounded-full bg-gray-200"></span>
                                  <span className="text-[9px] font-black text-primary uppercase">{exp.forma_pagamento}</span>
                               </div>
                            </div>
                         </div>
                         <div className="text-right">
                            <p className="text-lg font-black text-red-500">R$ {exp.valor.toLocaleString('pt-BR')}</p>
                            <p className="text-[10px] font-bold text-gray-300 font-mono italic">{new Date(exp.data).toLocaleDateString('pt-BR')}</p>
                         </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-20 text-center opacity-20">
                       <History size={60} className="mx-auto mb-4" />
                       <p className="font-black uppercase tracking-widest text-xs">Sem registros para este filtro</p>
                    </div>
                  )}
               </div>
            </div>
         </div>

         {/* Tabela de Analise por Categorias */}
         <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
            <div className="p-10 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
               <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Resumo por Categoria</h3>
               <PieChart size={18} className="text-gray-300" />
            </div>
            <div className="p-10">
               <table className="w-full">
                  <thead>
                     <tr className="bg-gray-50/50">
                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Categoria</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Gasto</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">%</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                     {categoriesMap.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50 transition-all">
                           <td className="px-6 py-5">
                              <div className="flex items-center gap-3">
                                 <div className="w-2.5 h-2.5 rounded-full bg-primary/20"></div>
                                 <span className="text-sm font-bold text-gray-700">{item.name}</span>
                              </div>
                           </td>
                           <td className="px-6 py-5 text-right">
                              <span className="text-sm font-black text-gray-900">R$ {item.total.toLocaleString('pt-BR')}</span>
                           </td>
                           <td className="px-6 py-5 text-right">
                              <div className="flex flex-col items-end gap-1">
                                 <span className="text-[11px] font-black text-primary">{(item.total / (totalSpent || 1) * 100).toFixed(1)}%</span>
                                 <div className="w-16 h-1 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary" style={{ width: `${(item.total / (totalSpent || 1) * 100)}%` }}></div>
                                 </div>
                              </div>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>
      </div>

      {/* Modal Novo Lançamento */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/40 backdrop-blur-sm">
           <div className="bg-white rounded-[40px] shadow-3xl w-full max-w-xl overflow-hidden flex flex-col scale-in">
              <div className="p-8 bg-primary text-white flex justify-between items-start">
                 <div>
                    <h2 className="text-2xl font-black tracking-tighter">Novo Gasto Pessoal</h2>
                    <p className="text-xs opacity-60 font-medium">Controle seu dinheiro com precisão</p>
                 </div>
                 <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-all"><X size={24} /></button>
              </div>
              <div className="p-10 space-y-8">
                 <div className="space-y-4">
                    <div>
                       <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Descrição do Gasto</label>
                       <input 
                         type="text"
                         placeholder="Ex: Compra Mercado"
                         value={formData.descricao}
                         onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                         className="w-full px-6 py-4 rounded-2xl border-2 border-gray-100 focus:border-primary/20 bg-gray-50/50 outline-none font-bold" 
                       />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Valor Total</label>
                          <input 
                            type="number"
                            value={formData.valor}
                            onChange={(e) => setFormData({...formData, valor: Number(e.target.value)})}
                            className="w-full px-6 py-4 rounded-2xl border-2 border-primary/10 bg-primary/5 text-primary text-xl font-black outline-none" 
                          />
                       </div>
                       <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Forma</label>
                          <select 
                             value={formData.forma_pagamento}
                             onChange={(e) => setFormData({...formData, forma_pagamento: e.target.value})}
                             className="w-full px-6 py-4 rounded-2xl border-2 border-gray-100 bg-gray-50/50 outline-none font-bold"
                          >
                             <option>Pix</option>
                             <option>Dinheiro</option>
                             <option>Cartão Crédito</option>
                             <option>Cartão Débito</option>
                          </select>
                       </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Recorrência</label>
                          <select 
                             value={formData.recorrencia}
                             onChange={(e) => setFormData({...formData, recorrencia: e.target.value})}
                             className="w-full px-6 py-4 rounded-2xl border-2 border-gray-100 bg-gray-50/50 outline-none font-bold"
                          >
                             <option>Única</option>
                             <option>Parcelada</option>
                          </select>
                       </div>
                       {formData.recorrencia === 'Parcelada' && (
                          <div>
                             <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Qtd Parcelas</label>
                             <input 
                               type="number"
                               min="1"
                               value={formData.parcelas}
                               onChange={(e) => setFormData({...formData, parcelas: Number(e.target.value)})}
                               className="w-full px-6 py-4 rounded-2xl border-2 border-gray-100" 
                             />
                          </div>
                       )}
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Vencimento / Data</label>
                       <input 
                         type="date"
                         value={formData.data}
                         onChange={(e) => setFormData({...formData, data: e.target.value})}
                         className="w-full px-6 py-4 rounded-2xl border-2 border-gray-100 bg-gray-50/50" 
                       />
                    </div>
                 </div>
              </div>
              <div className="p-8 bg-gray-50 flex justify-end gap-3">
                 <button onClick={() => setShowModal(false)} className="px-6 py-2.5 font-bold text-gray-400">Cancelar</button>
                 <button 
                  onClick={handleSave}
                  disabled={!formData.descricao || !formData.valor}
                  className="px-10 py-4 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/20 hover:bg-secondary transition-all"
                 >
                   Salvar Registro
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
