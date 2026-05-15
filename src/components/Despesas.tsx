import React, { useState } from 'react';
import { useGlobalState } from '../GlobalStateContext';
import { useAuth } from '../AuthContext';
import { Plus, Search, Wallet, TrendingDown, CheckCircle, X, Download, FileText, Filter, Calendar, Repeat, CreditCard, Trash2, Edit2 } from 'lucide-react';
import { Despesa } from '../types';

export default function Despesas() {
  const { user } = useAuth();
  const { despesas, addDespesa, updateDespesa, deleteDespesa } = useGlobalState();
  const isGerente = user?.perfil === 'gerente';

  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  
  const [formData, setFormData] = useState<Partial<Despesa>>({
    descricao: '',
    valor: 0,
    categoria: 'Operacional',
    tipo: isGerente ? 'Empresa' : 'Pessoal',
    data: new Date().toISOString().split('T')[0],
    status: 'Pendente',
    recorrencia: 'Única',
    parcelas: 1,
    forma_pagamento: 'Dinheiro'
  });

  const handleSave = () => {
    addDespesa({
      ...formData,
      usuario_id: user?.id || '1',
    } as Despesa);
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja excluir esta despesa?')) {
      deleteDespesa(id);
    }
  };

  const filteredDespesas = despesas.filter(d => {
    const accessMatch = isGerente ? d.tipo === 'Empresa' : d.usuario_id === user?.id;
    const date = new Date(d.data);
    const monthMatch = (date.getMonth() + 1) === filterMonth;
    const yearMatch = date.getFullYear() === filterYear;
    const searchMatch = d.descricao.toLowerCase().includes(searchTerm.toLowerCase());
    return accessMatch && monthMatch && yearMatch && searchMatch;
  });

  const totalPendente = filteredDespesas.filter(d => d.status === 'Pendente').reduce((acc, d) => acc + d.valor, 0);
  const totalPago = filteredDespesas.filter(d => d.status === 'Pago' || d.status === 'Aprovado').reduce((acc, d) => acc + d.valor, 0);

  return (
    <div className="space-y-8">
      {/* Header Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
           <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Gasto no Período</span>
              <div className="p-2 bg-red-50 text-danger rounded-lg"><TrendingDown size={14} /></div>
           </div>
           <h3 className="text-2xl font-bold text-gray-800 tracking-tighter">R$ {(totalPendente + totalPago).toLocaleString('pt-BR')}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm border-l-4 border-l-green-500">
           <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Pago</span>
              <div className="p-2 bg-green-50 text-green-600 rounded-lg"><CheckCircle size={14} /></div>
           </div>
           <h3 className="text-2xl font-bold text-green-600">R$ {totalPago.toLocaleString('pt-BR')}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm border-l-4 border-l-warning">
           <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">A Pagar</span>
              <div className="p-2 bg-warning/10 text-warning rounded-lg"><Calendar size={14} /></div>
           </div>
           <h3 className="text-2xl font-bold text-warning">R$ {totalPendente.toLocaleString('pt-BR')}</h3>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex flex-wrap gap-4 flex-1 w-full">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar despesa..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white"
            />
          </div>
          <select 
            value={filterMonth}
            onChange={(e) => setFilterMonth(Number(e.target.value))}
            className="px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-600"
          >
            {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((m, i) => (
              <option key={i} value={i+1}>{m}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 w-full lg:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-all">
             <Download size={18} /> Relatório
          </button>
          <button 
            onClick={() => setShowModal(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-secondary shadow-lg shadow-primary/20 transition-all"
          >
            <Plus size={18} /> Adicionar Despesa
          </button>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
           <table className="w-full text-left">
             <thead>
               <tr className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
                 <th className="px-6 py-5">Vencimento</th>
                 <th className="px-6 py-5">Descrição / Recorrência</th>
                 <th className="px-6 py-5">Categoria</th>
                 <th className="px-6 py-5">Forma</th>
                 <th className="px-6 py-5">Valor</th>
                 <th className="px-6 py-5 text-center">Status</th>
                 <th className="px-6 py-5 text-center">Ações</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-gray-50">
               {filteredDespesas.length > 0 ? filteredDespesas.sort((a, b) => b.data.localeCompare(a.data)).map((d) => (
                 <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                   <td className="px-6 py-5 text-sm font-bold text-gray-400 font-mono">
                     {new Date(d.data).toLocaleDateString('pt-BR')}
                   </td>
                   <td className="px-6 py-5">
                     <p className="text-sm font-bold text-gray-800">{d.descricao}</p>
                     <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${d.recorrencia === 'Única' ? 'border-gray-200 text-gray-400' : 'border-primary/30 text-primary'}`}>
                           <Repeat size={10} className="inline mr-1" /> {d.recorrencia} 
                           {d.recorrencia === 'Parcelada' && ` (${d.parcelas}x)`}
                        </span>
                     </div>
                   </td>
                   <td className="px-6 py-5">
                      <span className="text-[10px] font-bold px-2 py-1 bg-accent/30 text-primary rounded-lg uppercase">{d.categoria}</span>
                   </td>
                   <td className="px-6 py-5 text-gray-500 font-medium text-xs">
                      <CreditCard size={14} className="inline mr-1 opacity-50" /> {d.forma_pagamento}
                   </td>
                   <td className="px-6 py-5">
                      <span className="text-sm font-black text-danger">R$ {d.valor.toLocaleString('pt-BR')}</span>
                   </td>
                   <td className="px-6 py-5 text-center">
                      <span className={`text-[9px] font-black px-2 py-1 rounded-full uppercase ${
                        d.status === 'Pago' || d.status === 'Aprovado' ? 'bg-green-100 text-green-700' :
                        d.status === 'Cancelado' ? 'bg-red-50 text-red-300' :
                        'bg-warning/10 text-warning'
                      }`}>
                        {d.status}
                      </span>
                   </td>
                   <td className="px-6 py-5">
                      <div className="flex justify-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                         {isGerente && d.status === 'Pendente' && (
                           <button onClick={() => updateDespesa(d.id, { status: 'Pago' })} title="Confirmar Pagamento" className="p-2 text-green-600 hover:bg-green-50 rounded-lg"><CheckCircle size={16} /></button>
                         )}
                         <button className="p-2 text-gray-400 hover:text-primary hover:bg-accent/30 rounded-lg"><Edit2 size={16} /></button>
                         <button onClick={() => handleDelete(d.id)} className="p-2 text-gray-400 hover:text-danger hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                      </div>
                   </td>
                 </tr>
               )) : (
                 <tr>
                    <td colSpan={7} className="py-20 text-center text-gray-400 font-bold">Nenhuma despesa para este período.</td>
                 </tr>
               )}
             </tbody>
           </table>
        </div>
      </div>

      {/* Modal Nova Despesa */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/40 backdrop-blur-sm">
           <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col scale-in">
              <div className="p-8 bg-primary text-white flex justify-between items-center">
                 <div>
                    <h2 className="text-2xl font-black tracking-tighter">Novo Lançamento</h2>
                    <p className="text-xs opacity-60 font-medium">Cadastre compras recorrentes ou pontuais</p>
                 </div>
                 <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-all"><X size={24} /></button>
              </div>
              <div className="p-10 space-y-8 custom-scrollbar max-h-[70vh] overflow-y-auto">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                       <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Descrição da Despesa</label>
                       <input 
                         type="text"
                         placeholder="Ex: Compra de Mandioca In Natura - Lote #44"
                         value={formData.descricao}
                         onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                         className="w-full px-5 py-4 rounded-2xl border-2 border-gray-100 focus:border-primary/20 bg-gray-50/50 outline-none transition-all font-bold text-gray-700" 
                       />
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Categoria</label>
                       <select 
                         value={formData.categoria}
                         onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                         className="w-full px-5 py-4 rounded-2xl border-2 border-gray-100 bg-gray-50/50 focus:border-primary/20 outline-none font-bold text-gray-600"
                       >
                          <option>Operacional</option>
                          <option>Mandioca / Matéria Prima</option>
                          <option>Administrativa</option>
                          <option>Marketing</option>
                          <option>Logística</option>
                          <option>Impostos</option>
                          <option>Pessoal / RH</option>
                          <option>Ocasionais</option>
                       </select>
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Valor Total (R$)</label>
                       <input 
                         type="number"
                         value={formData.valor}
                         onChange={(e) => setFormData({...formData, valor: Number(e.target.value)})}
                         className="w-full px-5 py-4 rounded-2xl border-2 border-primary/10 bg-primary/5 text-primary text-xl font-black outline-none" 
                       />
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Forma de Pagamento</label>
                       <select 
                         value={formData.forma_pagamento}
                         onChange={(e) => setFormData({...formData, forma_pagamento: e.target.value as any})}
                         className="w-full px-5 py-4 rounded-2xl border-2 border-gray-100 bg-gray-50/50 outline-none font-bold text-gray-600"
                       >
                          <option>Dinheiro</option>
                          <option>Pix</option>
                          <option>Cartão de Crédito</option>
                          <option>Cartão de Débito</option>
                          <option>Boleto</option>
                       </select>
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Recorrência</label>
                       <select 
                         value={formData.recorrencia}
                         onChange={(e) => setFormData({...formData, recorrencia: e.target.value as any})}
                         className="w-full px-5 py-4 rounded-2xl border-2 border-gray-100 bg-gray-50/50 outline-none font-bold text-gray-600"
                       >
                          <option>Única</option>
                          <option>Mensal Recorrente</option>
                          <option>Parcelada</option>
                       </select>
                    </div>
                    {formData.recorrencia === 'Parcelada' && (
                       <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Número de Parcelas</label>
                          <input 
                            type="number"
                            min="1"
                            value={formData.parcelas}
                            onChange={(e) => setFormData({...formData, parcelas: Number(e.target.value)})}
                            className="w-full px-5 py-3 rounded-2xl border-2 border-gray-100 focus:border-primary/20 outline-none font-bold" 
                          />
                       </div>
                    )}
                    <div>
                       <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Vencimento</label>
                       <input 
                         type="date"
                         value={formData.data}
                         onChange={(e) => setFormData({...formData, data: e.target.value})}
                         className="w-full px-5 py-3 rounded-2xl border-2 border-gray-100 focus:border-primary/20 outline-none font-bold text-gray-600" 
                       />
                    </div>
                 </div>
              </div>
              <div className="p-8 bg-gray-50 flex justify-end gap-3 rounded-b-[40px]">
                 <button onClick={() => setShowModal(false)} className="px-8 py-3 font-bold text-gray-400 hover:text-gray-600">Cancelar</button>
                 <button 
                  onClick={handleSave}
                  disabled={!formData.descricao || !formData.valor}
                  className="px-12 py-4 bg-primary text-white rounded-2xl font-black tracking-tight hover:bg-secondary disabled:opacity-30 shadow-xl shadow-primary/20 transition-all flex items-center gap-2"
                 >
                   <FileText size={18} /> Lançar Despesa
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
