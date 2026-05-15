import React, { useState } from 'react';
import { useGlobalState } from '../GlobalStateContext';
import { useAuth } from '../AuthContext';
import { Package, Search, ArrowRightLeft, TrendingUp, TrendingDown, Clock, Filter, List, Grid } from 'lucide-react';

export default function Estoque() {
  const { produtos } = useGlobalState();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  const filteredProdutos = produtos.filter(p => 
    p.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm col-span-2">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Giro de Estoque (7 dias)</h3>
              <div className="flex gap-2">
                 <div className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
                    <TrendingUp size={12} /> +12%
                 </div>
              </div>
           </div>
           <div className="flex items-end gap-2 h-20">
              {[40, 65, 50, 75, 90, 60, 85].map((val, i) => (
                <div key={i} className="flex-1 bg-primary/10 rounded-t-lg relative group transition-all hover:bg-primary/30">
                   <div style={{ height: `${val}%` }} className="bg-primary rounded-t-lg transition-all"></div>
                </div>
              ))}
           </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-center text-center">
           <div className="p-3 bg-accent text-primary rounded-full mx-auto mb-3"><ArrowRightLeft size={24} /></div>
           <h4 className="text-lg font-bold text-gray-800">12</h4>
           <p className="text-[10px] font-bold text-gray-400 uppercase">Movimentações Hoje</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-center text-center">
           <div className="p-3 bg-red-50 text-danger rounded-full mx-auto mb-3"><Package size={24} /></div>
           <h4 className="text-lg font-bold text-danger">3</h4>
           <p className="text-[10px] font-bold text-gray-400 uppercase">Abaixo do Mínimo</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar produto no estoque..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-primary/10"
          />
        </div>
        <div className="flex items-center gap-3 bg-white p-1 rounded-xl border border-gray-100">
           <button onClick={() => setViewMode('table')} className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-primary text-white' : 'text-gray-400 hover:text-primary'}`}><List size={18} /></button>
           <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-primary text-white' : 'text-gray-400 hover:text-primary'}`}><Grid size={18} /></button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
           <table className="w-full text-left">
             <thead>
               <tr className="bg-gray-50/50 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                 <th className="px-8 py-6">Status</th>
                 <th className="px-8 py-6">Produto</th>
                 <th className="px-8 py-6 text-center">Estoque Atual</th>
                 <th className="px-8 py-6 text-center">Referência</th>
                 <th className="px-8 py-6">Última Entrada</th>
                 <th className="px-8 py-6 text-right">Ação</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-gray-50">
               {filteredProdutos.map((p) => {
                 const isLow = p.estoque_atual < p.estoque_minimo;
                 return (
                   <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                     <td className="px-8 py-5">
                        <div className={`w-3 h-3 rounded-full ${isLow ? 'bg-danger animate-pulse' : 'bg-green-500'}`}></div>
                     </td>
                     <td className="px-8 py-5">
                        <p className="text-sm font-bold text-gray-800">{p.nome}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">{p.categoria}</p>
                     </td>
                     <td className="px-8 py-5 text-center">
                        <div className="flex flex-col items-center">
                           <span className={`text-sm font-black ${isLow ? 'text-danger' : 'text-primary'}`}>{p.estoque_atual} {p.unidade}</span>
                           <div className="w-16 h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                              <div 
                                className={`h-full ${isLow ? 'bg-danger' : 'bg-primary'}`} 
                                style={{ width: `${Math.min((p.estoque_atual / (p.estoque_minimo * 2)) * 100, 100)}%` }}
                              ></div>
                           </div>
                        </div>
                     </td>
                     <td className="px-8 py-5 text-center">
                        <span className="text-xs font-bold text-gray-400">Min: {p.estoque_minimo} {p.unidade}</span>
                     </td>
                     <td className="px-8 py-5">
                        <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                           <Clock size={14} className="text-accent" />
                           {new Date().toLocaleDateString('pt-BR')} {/* Mock */}
                        </div>
                     </td>
                     <td className="px-8 py-5 text-right">
                        <button className="text-[10px] font-black uppercase text-primary hover:underline underline-offset-4 decoration-2">Movimentar</button>
                     </td>
                   </tr>
                 );
               })}
             </tbody>
           </table>
        </div>
      </div>
    </div>
  );
}
