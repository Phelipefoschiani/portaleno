import React, { useState } from 'react';
import { useGlobalState } from '../GlobalStateContext';
import { useAuth } from '../AuthContext';
import { 
  Factory, 
  Plus, 
  Clock, 
  CheckCircle, 
  Package, 
  X, 
  Calendar, 
  TrendingUp, 
  Play, 
  ClipboardList, 
  AlertCircle,
  ChevronRight,
  Save
} from 'lucide-react';
import { Producao, Pedido } from '../types';

export default function ProducaoTab() {
  const { user } = useAuth();
  const { producao, produtos, pedidos, addProducao, updateProducao, updatePedido } = useGlobalState();
  const [showModal, setShowModal] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [activeTab, setActiveTab] = useState<'operacional' | 'historico'>('operacional');
  
  const [formData, setFormData] = useState<Partial<Producao>>({
    produto_id: '',
    quantidade_produzida: 0,
    quantidade_estimada: 0,
    lote: '',
    data_inicio: new Date().toISOString().split('T')[0],
    data_fim: '',
    validade: '',
    status: 'Em andamento'
  });

  const [previsaoEntrega, setPrevisaoEntrega] = useState('');

  // Pedidos que precisam ser produzidos
  const pedidosParaProduzir = (pedidos || []).filter(p => 
    p.status === 'Aprovado' || p.status === 'Em produção'
  );

  const handleOpenProductionModal = (pedido: Pedido) => {
    setSelectedPedido(pedido);
    setPrevisaoEntrega(pedido.previsao_entrega || '');
    // Pre-fill with first item of order for now, or we could handle multiple items
    if (pedido.items && pedido.items.length > 0) {
      const firstItem = pedido.items[0];
      setFormData({
        produto_id: firstItem.produto_id,
        quantidade_estimada: firstItem.quantidade,
        quantidade_produzida: firstItem.quantidade,
        lote: `PED-${pedido.id.substring(0,4)}-${Math.floor(Math.random()*100)}`,
        data_inicio: new Date().toISOString().split('T')[0],
        status: 'Finalizada'
      });
    }
    setShowModal(true);
  };

  const handleStartProducao = (pedidoId: string) => {
    updatePedido(pedidoId, { status: 'Em produção' });
    alert("Produção iniciada! O gerente foi notificado no dashboard.");
  };

  const handleSave = () => {
    if (!selectedPedido) return;

    // Save Production Lote
    addProducao({
      ...formData,
      data: new Date().toISOString().split('T')[0],
      data_fim: new Date().toISOString().split('T')[0],
    } as Producao);

    // Update Pedido with delivery forecast
    if (previsaoEntrega) {
      updatePedido(selectedPedido.id, { previsao_entrega: previsaoEntrega });
    }

    setShowModal(false);
    setSelectedPedido(null);
    alert("Produção e Previsão registradas com sucesso!");
  };

  const getProducaoStats = (p: Producao) => {
    const start = new Date(p.data_inicio);
    const end = p.data_fim ? new Date(p.data_fim) : new Date();
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    const mediaPorDia = p.quantidade_produzida / diffDays;
    return { diffDays, mediaPorDia };
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-100 pb-px">
        <button 
          onClick={() => setActiveTab('operacional')}
          className={`pb-4 px-2 font-bold text-sm transition-all relative ${activeTab === 'operacional' ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}
        >
          Demanda Operacional
          {activeTab === 'operacional' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />}
        </button>
        <button 
          onClick={() => setActiveTab('historico')}
          className={`pb-4 px-2 font-bold text-sm transition-all relative ${activeTab === 'historico' ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}
        >
          Histórico de Entregas
          {activeTab === 'historico' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />}
        </button>
      </div>

      {activeTab === 'operacional' ? (
        <div className="space-y-6">
          <div className="flex items-center gap-2 px-2">
             <ClipboardList size={20} className="text-primary" />
             <h3 className="font-black text-gray-800 uppercase tracking-tighter">Fila de Produção (Pedidos)</h3>
          </div>
          
          <div className="space-y-4">
            {pedidosParaProduzir.length > 0 ? pedidosParaProduzir.map(pedido => (
              <div key={pedido.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden group hover:border-accent transition-all">
                <div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="flex items-center gap-5">
                    <div className={`p-4 rounded-2xl ${pedido.status === 'Em produção' ? 'bg-orange-50 text-orange-600 animate-pulse' : 'bg-gray-50 text-gray-400'}`}>
                      <Factory size={28} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                         <h4 className="text-lg font-black text-gray-900 tracking-tight">PED-{pedido.id.substring(0, 8)}</h4>
                         <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${pedido.status === 'Em produção' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
                           {pedido.status}
                         </span>
                      </div>
                      <p className="text-xs font-bold text-gray-400 uppercase mt-1">Data: {new Date(pedido.data).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>

                  <div className="flex-1 w-full md:w-auto px-4 py-3 bg-gray-50 rounded-2xl flex flex-col gap-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Itens Necessários</p>
                    <div className="flex flex-wrap gap-2">
                      {pedido.items?.map((item, idx) => {
                        const prod = produtos.find(p => p.id === item.produto_id);
                        return (
                          <span key={idx} className="bg-white px-3 py-1.5 rounded-xl border border-gray-100 text-xs font-bold text-gray-700 flex items-center gap-2">
                            <Package size={12} className="text-primary" />
                            {item.quantidade} {prod?.unidade} {prod?.nome}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex gap-2 w-full md:w-auto">
                    {pedido.status === 'Aprovado' ? (
                      <button 
                        onClick={() => handleStartProducao(pedido.id)}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-secondary transition-all shadow-lg shadow-primary/20"
                      >
                        <Play size={16} /> Iniciar Produção
                      </button>
                    ) : (
                      <button 
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-green-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-green-700 transition-all shadow-lg shadow-green-600/20"
                        onClick={() => handleOpenProductionModal(pedido)}
                      >
                         <Save size={16} /> Registrar Produção
                      </button>
                    )}
                  </div>
                </div>
                {pedido.previsao_entrega && (
                  <div className="px-6 py-3 bg-blue-50 border-t border-blue-100 flex items-center gap-2">
                    <Clock size={12} className="text-blue-500" />
                    <p className="text-[10px] font-bold text-blue-600 uppercase">Previsão de Entrega: {new Date(pedido.previsao_entrega).toLocaleDateString('pt-BR')}</p>
                  </div>
                )}
              </div>
            )) : (
              <div className="py-20 bg-white rounded-3xl border border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 gap-4">
                 <CheckCircle size={48} className="opacity-20" />
                 <p className="font-bold">Nenhum pedido pendente de produção.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
             <h3 className="font-bold text-primary uppercase text-xs tracking-widest">Registro Geral de Produção</h3>
          </div>
          <div className="overflow-x-auto">
             <table className="w-full text-left">
               <thead>
                 <tr className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                   <th className="px-6 py-4">Lote / Período</th>
                   <th className="px-6 py-4">Produto</th>
                   <th className="px-6 py-4 text-center">Quant. Produzida</th>
                   <th className="px-6 py-4 text-center">Duração</th>
                   <th className="px-6 py-4 text-center">Média/Dia</th>
                   <th className="px-6 py-4">Status</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                 {producao.sort((a, b) => b.data.localeCompare(a.data)).map((p) => {
                   const { diffDays, mediaPorDia } = getProducaoStats(p);
                   return (
                     <tr key={p.id} className="hover:bg-gray-50/50 transition-colors text-sm">
                       <td className="px-6 py-4">
                         <p className="font-bold text-gray-800 tracking-tight">#{p.lote}</p>
                         <p className="text-[10px] text-gray-400 font-bold">{new Date(p.data_inicio).toLocaleDateString('pt-BR')} até {p.data_fim ? new Date(p.data_fim).toLocaleDateString('pt-BR') : 'Hoje'}</p>
                       </td>
                       <td className="px-6 py-4">
                         <p className="font-bold text-primary">
                           {produtos.find(prod => prod.id === p.produto_id)?.nome || 'Produto'}
                         </p>
                       </td>
                       <td className="px-6 py-4 text-center">
                         <span className="font-black text-gray-900">{p.quantidade_produzida} kg</span>
                         <p className="text-[10px] text-gray-400">de {p.quantidade_estimada} kg</p>
                       </td>
                       <td className="px-6 py-4 text-center font-bold text-gray-400">{diffDays} dia(s)</td>
                       <td className="px-6 py-4 text-center">
                          <span className="font-bold text-secondary">{mediaPorDia.toFixed(1)} kg</span>
                       </td>
                       <td className="px-6 py-4 text-right">
                          <span className={`text-[9px] font-black px-2 py-1 rounded-full uppercase ${
                            p.status === 'Finalizada' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {p.status}
                          </span>
                       </td>
                     </tr>
                   );
                 })}
               </tbody>
             </table>
          </div>
        </div>
      )}

      {/* Modal Registrar Produção do Pedido */}
      {showModal && selectedPedido && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/40 backdrop-blur-sm">
           <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col scale-in">
              <div className="p-8 bg-primary text-white flex justify-between items-center">
                 <div>
                    <h2 className="text-2xl font-black tracking-tight">Finalizar Produção</h2>
                    <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mt-1">Pedido: PED-{selectedPedido.id.substring(0,8)}</p>
                 </div>
                 <button onClick={() => setShowModal(false)} className="hover:rotate-90 transition-all"><X size={24} /></button>
              </div>
              <div className="p-10 space-y-6">
                 <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Produto sendo processado</label>
                    <select 
                      value={formData.produto_id}
                      onChange={(e) => {
                        const item = selectedPedido.items?.find(i => i.produto_id === e.target.value);
                        setFormData({...formData, produto_id: e.target.value, quantidade_estimada: item?.quantidade || 0, quantidade_produzida: item?.quantidade || 0});
                      }}
                      className="w-full px-5 py-4 rounded-2xl border-2 border-gray-100 bg-gray-50/50 outline-none font-bold text-gray-700"
                    >
                      {selectedPedido.items?.map(item => {
                        const prod = produtos.find(p => p.id === item.produto_id);
                        return <option key={item.produto_id} value={item.produto_id}>{prod?.nome} ({item.quantidade} {prod?.unidade})</option>
                      })}
                    </select>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Lote Produzido</label>
                      <input 
                        type="text"
                        value={formData.lote}
                        onChange={(e) => setFormData({...formData, lote: e.target.value})}
                        className="w-full px-5 py-4 rounded-2xl border-2 border-gray-100 bg-gray-50/50 outline-none font-bold text-gray-700" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Validade</label>
                      <input 
                        type="date"
                        value={formData.validade}
                        onChange={(e) => setFormData({...formData, validade: e.target.value})}
                        className="w-full px-5 py-4 rounded-2xl border-2 border-gray-100 bg-gray-50/50 outline-none font-bold text-gray-700" 
                      />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Quantidade Final (kg/und)</label>
                      <input 
                        type="number"
                        value={formData.quantidade_produzida}
                        onChange={(e) => setFormData({...formData, quantidade_produzida: Number(e.target.value)})}
                        className="w-full px-5 py-4 rounded-2xl border-2 border-primary/20 bg-primary/5 text-primary text-xl font-black outline-none" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-orange-600 uppercase tracking-widest mb-2">Previsão de Entrega (Para Gerente)</label>
                      <input 
                        type="date"
                        value={previsaoEntrega}
                        onChange={(e) => setPrevisaoEntrega(e.target.value)}
                        className="w-full px-5 py-4 rounded-2xl border-2 border-orange-100 bg-orange-50/50 outline-none font-bold text-orange-700" 
                      />
                    </div>
                 </div>
              </div>
              <div className="p-8 bg-gray-50 flex justify-end gap-3 rounded-b-[40px]">
                 <button onClick={() => setShowModal(false)} className="px-8 py-3 font-bold text-gray-400 hover:text-gray-600">Cancelar</button>
                 <button 
                  onClick={handleSave}
                  className="px-12 py-4 bg-primary text-white rounded-2xl font-black tracking-tight hover:bg-secondary shadow-xl shadow-primary/20 transition-all"
                 >
                   Registrar & Concluir
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
