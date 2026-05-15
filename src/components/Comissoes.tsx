import React from 'react';
import { useGlobalState } from '../GlobalStateContext';
import { useAuth } from '../AuthContext';
import { Percent, Wallet, Clock, CheckCircle, TrendingUp, Filter, Download } from 'lucide-react';

export default function Comissoes() {
  const { user } = useAuth();
  const { comissoes, usuarios } = useGlobalState();
  const isGerente = user?.perfil === 'gerente';

  const filteredComissoes = comissoes.filter(c => isGerente ? true : c.representante_id === user?.id);
  
  const totalPrevisto = filteredComissoes.filter(c => c.status === 'Prevista').reduce((acc, c) => acc + c.valor_comissao, 0);
  const totalPago = filteredComissoes.filter(c => c.status === 'Pago').reduce((acc, c) => acc + c.valor_comissao, 0);

  return (
    <div className="space-y-8">
      {/* Header Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Ganhos no Período</p>
           <h3 className="text-2xl font-bold text-primary">R$ {(totalPrevisto + totalPago).toLocaleString('pt-BR')}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
           <div className="flex justify-between items-center mb-1">
             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Já Recebido</p>
             <CheckCircle size={14} className="text-green-600" />
           </div>
           <h3 className="text-2xl font-bold text-green-600">R$ {totalPago.toLocaleString('pt-BR')}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
           <div className="flex justify-between items-center mb-1">
             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">A Receber</p>
             <Clock size={14} className="text-warning" />
           </div>
           <h3 className="text-2xl font-bold text-warning">R$ {totalPrevisto.toLocaleString('pt-BR')}</h3>
        </div>
      </div>

      <div className="space-y-6">
         <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-primary flex items-center gap-2"><Percent size={18} /> Detalhamento de Comissões</h3>
            <div className="flex gap-2">
               <button className="p-2 bg-white rounded-lg border border-gray-200 text-gray-400 hover:text-primary"><Filter size={16} /></button>
               <button className="p-2 bg-white rounded-lg border border-gray-200 text-gray-400 hover:text-primary"><Download size={16} /></button>
            </div>
         </div>

         <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
               <table className="w-full text-left">
                 <thead>
                   <tr className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                     <th className="px-6 py-4">Data Pagto.</th>
                     {isGerente && <th className="px-6 py-4">Representante</th>}
                     <th className="px-6 py-4">Ref. Pedido</th>
                     <th className="px-6 py-4">Valor Base</th>
                     <th className="px-6 py-4">Comissão</th>
                     <th className="px-6 py-4">Status</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                   {filteredComissoes.map((c) => (
                     <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                       <td className="px-6 py-4 text-xs font-bold text-gray-500 font-mono">
                         {new Date(c.data_prevista || '').toLocaleDateString('pt-BR')}
                       </td>
                       {isGerente && (
                         <td className="px-6 py-4 text-sm font-medium text-gray-700 uppercase">
                           {usuarios.find(u => u.id === c.representante_id)?.nome.split(' ')[0]}
                         </td>
                       )}
                       <td className="px-6 py-4">
                          <span className="text-sm font-bold text-gray-900 cursor-pointer hover:text-primary transition-colors">#PED-{c.pedido_id}</span>
                       </td>
                       <td className="px-6 py-4">
                          <span className="text-sm text-gray-600 font-medium tracking-tight">R$ {c.valor_base.toLocaleString('pt-BR')}</span>
                       </td>
                       <td className="px-6 py-4">
                          <p className="text-sm font-extrabold text-primary">R$ {c.valor_comissao.toLocaleString('pt-BR')}</p>
                          <span className="text-[10px] font-bold text-accent px-1.5 py-0.5 bg-accent/20 rounded">{c.percentual}%</span>
                       </td>
                       <td className="px-6 py-4">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${
                            c.status === 'Pago' ? 'bg-green-100 text-green-700' : 'bg-warning/10 text-warning'
                          }`}>
                            {c.status}
                          </span>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>
         </div>
      </div>
    </div>
  );
}
