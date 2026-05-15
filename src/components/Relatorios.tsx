import React, { useState } from 'react';
import { useGlobalState } from '../GlobalStateContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area, Cell } from 'recharts';
import { BarChart3, TrendingUp, Users, ShoppingCart, Download, Filter, Factory, Gauge } from 'lucide-react';

export default function Relatorios() {
  const { pedidos, clientes, producao, despesas } = useGlobalState();
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);

  // Logic: Calculate metrics from real state
  const faturadosNoMes = pedidos.filter(p => {
    const d = new Date(p.data);
    return (d.getMonth() + 1) === filterMonth && p.status === 'Faturado';
  });

  const totalFaturado = faturadosNoMes.reduce((acc, p) => acc + p.valor_total, 0);
  const totalPedidos = faturadosNoMes.length;
  const totalClientes = new Set(faturadosNoMes.map(p => p.cliente_id)).size;

  const volumeProduzido = producao.filter(pr => {
    const d = new Date(pr.data_fabricacao);
    return (d.getMonth() + 1) === filterMonth;
  }).reduce((acc, pr) => acc + pr.quantidade_real, 0);

  const materiaPrimaComprada = despesas.filter(d => {
    const dt = new Date(d.data);
    return (dt.getMonth() + 1) === filterMonth && (d.categoria?.toLowerCase().includes('matéria prima') || d.categoria?.toLowerCase().includes('materia prima'));
  }).reduce((acc, d) => acc + d.valor, 0);

  const salesData = [
    { name: 'Jan', vendas: 45000 },
    { name: 'Fev', vendas: 52000 },
    { name: 'Mar', vendas: 48000 },
    { name: 'Abr', vendas: 61000 },
    { name: 'Mai', vendas: totalFaturado || 75000 },
  ];

  const productionByDay = Array.from({ length: 7 }, (_, i) => ({
    name: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'][i],
    kg: Math.floor(Math.random() * 500) + 200
  }));

   return (
    <div className="space-y-10 animate-fade-in">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-primary p-10 rounded-[40px] text-white">
         <div>
            <h2 className="text-3xl font-black tracking-tighter">Central de Inteligência Grupo ENO</h2>
            <p className="text-sm text-accent/60 font-medium">Analise volumetria, faturamento e supply chain em tempo real.</p>
         </div>
         <div className="flex gap-3">
            <select 
               value={filterMonth}
               onChange={(e) => setFilterMonth(Number(e.target.value))}
               className="bg-white/10 text-white border border-white/20 px-6 py-3 rounded-2xl font-bold outline-none"
            >
               {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map((m, i) => (
                  <option key={i} value={i+1} className="text-primary">{m}</option>
               ))}
            </select>
            <button className="flex items-center gap-2 px-8 py-3 bg-accent text-primary rounded-2xl font-black shadow-xl shadow-accent/20 transition-all hover:scale-105">
               <Download size={18} /> Exportar BI
            </button>
         </div>
      </div>

      {/* Mini Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <div className="bg-white p-8 rounded-[35px] border border-gray-100 shadow-sm space-y-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl w-fit"><TrendingUp size={24} /></div>
            <div>
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Faturamento Período</p>
               <h4 className="text-2xl font-black text-gray-900 leading-none">R$ {totalFaturado.toLocaleString('pt-BR')}</h4>
            </div>
         </div>
         <div className="bg-white p-8 rounded-[35px] border border-gray-100 shadow-sm space-y-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-2xl w-fit"><Factory size={24} /></div>
            <div>
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Produção Total (KG)</p>
               <h4 className="text-2xl font-black text-gray-900 leading-none">{volumeProduzido.toLocaleString('pt-BR')} KG</h4>
            </div>
         </div>
         <div className="bg-white p-8 rounded-[35px] border border-gray-100 shadow-sm space-y-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl w-fit"><Users size={24} /></div>
            <div>
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Clientes Atendidos</p>
               <h4 className="text-2xl font-black text-gray-900 leading-none">{totalClientes} Ativos</h4>
            </div>
         </div>
         <div className="bg-white p-8 rounded-[35px] border border-gray-100 shadow-sm space-y-4">
            <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl w-fit"><Gauge size={24} /></div>
            <div>
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Matéria Prima Comprada</p>
               <h4 className="text-2xl font-black text-gray-900 leading-none">R$ {materiaPrimaComprada.toLocaleString('pt-BR')}</h4>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
         {/* Revenue Evolution */}
         <div className="bg-white p-10 rounded-[45px] border border-gray-100 shadow-sm">
            <h3 className="text-lg font-black text-primary mb-10 flex items-center gap-3">
               <TrendingUp size={22} className="text-secondary" /> Evolução de Faturamento
            </h3>
            <div className="h-72">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesData}>
                     <defs>
                        <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#1a4332" stopOpacity={0.1}/>
                           <stop offset="95%" stopColor="#1a4332" stopOpacity={0}/>
                        </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                     <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 800, fill: '#cbd5e1'}} dy={10} />
                     <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 800, fill: '#cbd5e1'}} />
                     <Tooltip 
                        contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px'}}
                        itemStyle={{fontWeight: 900, color: '#1a4332'}}
                     />
                     <Area type="monotone" dataKey="vendas" stroke="#1a4332" strokeWidth={4} fill="url(#revenueGrad)" />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* Production Volume Chart */}
         <div className="bg-white p-10 rounded-[45px] border border-gray-100 shadow-sm">
            <h3 className="text-lg font-black text-primary mb-10 flex items-center gap-3">
               <Factory size={22} className="text-secondary" /> Produção Diária (KG)
            </h3>
            <div className="h-72">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={productionByDay}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                     <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 800, fill: '#cbd5e1'}} />
                     <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 800, fill: '#cbd5e1'}} />
                     <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '20px', border: 'none'}} />
                     <Bar dataKey="kg" radius={[12, 12, 12, 12]} barSize={30}>
                        {productionByDay.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={index > 4 ? '#2d6a4f' : '#b7e4c7'} />
                        ))}
                     </Bar>
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>
      </div>
    </div>
  );
}
