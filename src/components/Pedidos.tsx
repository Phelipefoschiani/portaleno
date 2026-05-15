import React, { useState } from 'react';
import { useGlobalState } from '../GlobalStateContext';
import { useAuth } from '../AuthContext';
import { Plus, Search, Filter, Eye, Download, XCircle, CheckCircle, FileUp, X, Save, Trash2 } from 'lucide-react';
import { Pedido } from '../types';

export default function Pedidos() {
  const { user } = useAuth();
  const { pedidos, clientes, produtos, updatePedido, addPedido, deletePedido } = useGlobalState();
  const isGerente = user?.perfil === 'gerente';

  const [showModal, setShowModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState<{produto_id: string, quantidade: number, preco: number}[]>([]);
  const [formData, setFormData] = useState<Partial<Pedido>>({
    cliente_id: '',
    status: 'Enviado',
    observacoes: ''
  });

  const [loadingFaturamento, setLoadingFaturamento] = useState<string | null>(null);

  const handleOpenModal = () => {
    setFormData({
      cliente_id: '',
      status: 'Enviado',
      observacoes: ''
    });
    setSelectedItems([]);
    setShowModal(true);
  };

  const handleFaturar = (pedidoId: string) => {
    setLoadingFaturamento(pedidoId);
    setTimeout(() => {
      updatePedido(pedidoId, { status: 'Faturado', nf_anexo: `NF-${pedidoId}-XML_Importado.xml` });
      setLoadingFaturamento(null);
      alert('Nota Fiscal emitida e importada para o portal com sucesso!');
    }, 1500);
  };

  const addItem = () => {
    setSelectedItems([...selectedItems, { produto_id: '', quantidade: 1, preco: 0 }]);
  };

  const removeItem = (idx: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: string, value: any) => {
    const newItems = [...selectedItems];
    (newItems[idx] as any)[field] = value;
    if (field === 'produto_id') {
      const prod = produtos.find(p => p.id === value);
      if (prod) newItems[idx].preco = prod.preco_base;
    }
    setSelectedItems(newItems);
  };

  const totalPedido = selectedItems.reduce((acc, item) => acc + (item.quantidade * item.preco), 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Faturado': return 'bg-green-100 text-green-700';
      case 'Entregue': return 'bg-primary text-white';
      case 'Cancelado': return 'bg-red-100 text-red-700';
      case 'Aprovado': return 'bg-secondary/20 text-secondary';
      case 'Em produção': return 'bg-orange-100 text-orange-700';
      case 'Em análise': return 'bg-warning/10 text-warning';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  const handleSave = () => {
    addPedido({
      ...formData,
      valor_total: totalPedido,
      data: new Date().toISOString().split('T')[0],
      representante_id: user?.id || '1',
      custo_total: totalPedido * 0.7,
      margem: 30,
      items: selectedItems
    } as Pedido);
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Deseja realmente excluir este pedido?')) {
      deletePedido(id);
    }
  };

  const filteredPedidos = pedidos.filter(p => isGerente ? true : p.representante_id === user?.id);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar..." 
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          {!isGerente && (
            <button 
              onClick={handleOpenModal}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-secondary shadow-lg shadow-primary/20 transition-all"
            >
              <Plus size={18} /> Novo Pedido
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <th className="px-6 py-4">Nº Pedido</th>
                {isGerente && <th className="px-6 py-4 text-center">Origem</th>}
                <th className="px-6 py-4">Cliente / Data</th>
                <th className="px-6 py-4 text-right">Valor Total</th>
                {isGerente && <th className="px-6 py-4 text-center">Margem</th>}
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">NF-e Vinculada</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredPedidos.map((pedido) => (
                <tr key={pedido.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-bold text-gray-900">#PED-{pedido.id.substring(0, 8)}</td>
                  {isGerente && <td className="px-6 py-4 text-[10px] text-gray-400 text-center font-bold uppercase">Portal / Web</td>}
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-gray-800 tracking-tight">
                      {clientes.find(c => c.id === pedido.cliente_id)?.razao_social || 'Desconhecido'}
                    </p>
                    <p className="text-xs text-gray-500">{new Date(pedido.data).toLocaleDateString('pt-BR')}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-sm font-bold text-gray-900">R$ {pedido.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    {isGerente && <p className="text-[10px] text-gray-400 font-medium tracking-tight">Custo: R$ {pedido.custo_total.toLocaleString('pt-BR')}</p>}
                  </td>
                  {isGerente && (
                    <td className="px-6 py-4 text-center">
                      <span className={`text-xs font-bold ${pedido.margem > 25 ? 'text-green-600' : 'text-warning'}`}>
                        {pedido.margem}%
                      </span>
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${getStatusColor(pedido.status)}`}>
                      {pedido.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1 text-[10px]">
                      {pedido.nf_numero ? (
                        <div className="flex flex-col">
                           <span className="font-bold text-primary flex items-center gap-1">
                             NF {pedido.nf_numero} / {pedido.nf_serie}
                           </span>
                           <span className="text-[9px] text-gray-400 font-mono truncate max-w-[100px]">{pedido.nf_chave}</span>
                        </div>
                      ) : (
                        <span className="text-gray-300 italic">Aguardando faturamento...</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-1">
                      <button title="Ver Detalhes" className="p-2 text-gray-400 hover:text-primary hover:bg-accent/30 rounded-lg transition-all"><Eye size={18} /></button>
                      {isGerente && (
                        <div className="flex gap-1">
                          {pedido.status === 'Enviado' && (
                            <button 
                              onClick={() => updatePedido(pedido.id, { status: 'Aprovado' })}
                              title="Aprovar" className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                            >
                              <CheckCircle size={18} />
                            </button>
                          )}
                          {pedido.status === 'Aprovado' && (
                            <button 
                              onClick={() => updatePedido(pedido.id, { status: 'Em produção' })}
                              title="Iniciar Produção" className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                            >
                              <CheckCircle size={18} />
                            </button>
                          )}
                          <button 
                             onClick={() => handleDelete(pedido.id)}
                             title="Excluir" className="p-2 text-gray-300 hover:text-danger hover:bg-red-50 rounded-lg transition-all"
                          >
                             <Trash2 size={18} />
                          </button>
                        </div>
                      )}
                      {(pedido.status === 'Enviado' || isGerente) && pedido.status !== 'Cancelado' && pedido.status !== 'Entregue' && pedido.status !== 'Faturado' && !isGerente && (
                        <button 
                          onClick={() => updatePedido(pedido.id, { status: 'Cancelado' })}
                          title="Cancelar" className="p-2 text-gray-300 hover:text-danger hover:bg-red-50 rounded-lg transition-all"
                        >
                          <XCircle size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Novo Pedido Simples */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col scale-in">
            <div className="p-6 bg-primary text-white flex justify-between items-center">
              <h2 className="text-xl font-bold">Novo Pedido Direto</h2>
              <button onClick={() => setShowModal(false)}><X size={24} /></button>
            </div>
            <div className="p-8 space-y-6 overflow-y-auto max-h-[60vh]">
               <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Cliente</label>
                  <select 
                    value={formData.cliente_id}
                    onChange={(e) => setFormData({...formData, cliente_id: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 bg-white outline-none"
                  >
                    <option value="">Selecione...</option>
                    {clientes.filter(c => c.status === 'Liberado').map(c => (
                      <option key={c.id} value={c.id}>{c.razao_social}</option>
                    ))}
                  </select>
               </div>

               <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Produtos</label>
                    <button onClick={addItem} className="text-xs font-bold text-secondary tracking-widest hover:underline">+ ADICIONAR</button>
                  </div>
                  {selectedItems.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center bg-gray-50 p-2 rounded-xl border border-gray-100">
                      <select 
                        value={item.produto_id}
                        onChange={(e) => updateItem(idx, 'produto_id', e.target.value)}
                        className="flex-1 px-2 py-1.5 rounded-lg border border-gray-200 text-xs bg-white outline-none"
                      >
                        <option value="">Produto...</option>
                        {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                      </select>
                      <input 
                        type="number"
                        placeholder="Qtd"
                        value={item.quantidade}
                        onChange={(e) => updateItem(idx, 'quantidade', Number(e.target.value))}
                        className="w-16 px-2 py-1.5 rounded-lg border border-gray-200 text-xs bg-white outline-none"
                      />
                      <button onClick={() => removeItem(idx)} className="text-red-400 p-1"><XCircle size={16} /></button>
                    </div>
                  ))}
               </div>

               <div className="pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm font-bold text-gray-400 uppercase">Total do Pedido</span>
                    <span className="text-2xl font-black text-primary">R$ {totalPedido.toLocaleString('pt-BR')}</span>
                  </div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Observações</label>
                  <textarea 
                    value={formData.observacoes}
                    onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                    rows={2}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 resize-none text-sm bg-white outline-none"
                  ></textarea>
               </div>
            </div>
            <div className="p-6 bg-gray-50 flex justify-end gap-3">
               <button onClick={() => setShowModal(false)} className="px-6 py-2.5 font-bold text-gray-500">Cancelar</button>
               <button 
                onClick={handleSave}
                disabled={!formData.cliente_id || selectedItems.length === 0}
                className="px-8 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-secondary disabled:opacity-50 transition-all shadow-lg shadow-primary/20"
               >
                 Enviar Pedido
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
