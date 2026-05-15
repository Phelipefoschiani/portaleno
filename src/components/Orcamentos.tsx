import React, { useState } from 'react';
import { useGlobalState } from '../GlobalStateContext';
import { useAuth } from '../AuthContext';
import { Plus, Search, Filter, Eye, Edit2, Send, CheckSquare, Trash2, X, PlusCircle, MinusCircle, Save } from 'lucide-react';
import { Orcamento, Produto } from '../types';

export default function Orcamentos() {
  const { user } = useAuth();
  const { orcamentos, clientes, produtos, addOrcamento, updateOrcamento, addPedido, deleteOrcamento } = useGlobalState();
  const isGerente = user?.perfil === 'gerente';

  const [showModal, setShowModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState<{produto_id: string, quantidade: number, preco: number}[]>([]);
  const [formData, setFormData] = useState<Partial<Orcamento>>({
    cliente_id: '',
    condicao_pagamento: '',
    prazo_entrega: '',
    observacoes: '',
    status: 'Rascunho'
  });

  const [searchTerm, setSearchTerm] = useState('');

  const handleOpenModal = () => {
    setFormData({
      cliente_id: '',
      condicao_pagamento: '',
      prazo_entrega: '',
      observacoes: '',
      status: 'Rascunho',
      items: []
    });
    setSelectedItems([]);
    setShowModal(true);
  };

  const addItem = () => {
    setSelectedItems([...selectedItems, { produto_id: '', quantidade: 1, preco: 0 }]);
  };

  const removeItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...selectedItems];
    (newItems[index] as any)[field] = value;
    
    if (field === 'produto_id') {
      const prod = produtos.find(p => p.id === value);
      if (prod) newItems[index].preco = prod.preco_base;
    }
    
    setSelectedItems(newItems);
  };

  const totalOrcamento = selectedItems.reduce((acc, item) => acc + (item.quantidade * item.preco), 0);

  const handleSave = () => {
    addOrcamento({
      ...formData,
      valor_total: totalOrcamento,
      items: selectedItems,
      data: new Date().toISOString().split('T')[0],
      representante_id: user?.id || '1',
    } as Orcamento);
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja excluir este orçamento?')) {
      deleteOrcamento(id);
    }
  };

  const handleConverter = (orc: Orcamento) => {
    if (orc.status === 'Aprovado') {
      const custoTotal = orc.items.reduce((acc, it) => {
        const prod = produtos.find(p => p.id === it.produto_id);
        return acc + (it.quantidade * (prod?.custo || 0));
      }, 0);

      addPedido({
        cliente_id: orc.cliente_id,
        representante_id: orc.representante_id,
        items: orc.items,
        data: new Date().toISOString().split('T')[0],
        valor_total: orc.valor_total,
        custo_total: custoTotal,
        margem: orc.valor_total > 0 ? ((orc.valor_total - custoTotal) / orc.valor_total) * 100 : 0,
        status: 'Enviado',
        observacoes: `Convertido do Orçamento #${orc.id}`
      });
      updateOrcamento(orc.id, { status: 'Convertido em Pedido' });
      alert('Orçamento convertido em Pedido com sucesso!');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Aprovado': return 'bg-green-100 text-green-700';
      case 'Reprovado': return 'bg-red-100 text-red-700';
      case 'Enviado': return 'bg-blue-100 text-blue-700';
      case 'Convertido em Pedido': return 'bg-primary text-white';
      case 'Cancelado': return 'bg-red-50 text-red-500';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredOrcamentos = orcamentos.filter(o => {
    const accessMatch = isGerente ? true : o.representante_id === user?.id;
    const client = clientes.find(c => c.id === o.cliente_id);
    const searchMatch = 
      o.id.includes(searchTerm) || 
      client?.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client?.nome_fantasia.toLowerCase().includes(searchTerm.toLowerCase());
    return accessMatch && searchMatch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por orçamento ou cliente..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          {(isGerente || true) && (
            <button 
              onClick={handleOpenModal}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-secondary shadow-lg shadow-primary/20 transition-all"
            >
              <Plus size={18} /> Novo Orçamento
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <th className="px-6 py-4">Nº Orçamento</th>
                <th className="px-6 py-4">Cliente / Data</th>
                <th className="px-6 py-4">Valor Total</th>
                {isGerente && <th className="px-6 py-4">Representante</th>}
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredOrcamentos.map((orc) => (
                <tr key={orc.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-bold text-gray-400">#ORC-{orc.id}</td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-gray-800">
                      {clientes.find(c => c.id === orc.cliente_id)?.razao_social || 'Cliente não encontrado'}
                    </p>
                    <p className="text-xs text-gray-500">{new Date(orc.data).toLocaleDateString('pt-BR')}</p>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-primary">R$ {orc.valor_total.toLocaleString('pt-BR')}</td>
                  {isGerente && <td className="px-6 py-4 text-sm text-gray-600">Representante Teste</td>}
                  <td className="px-6 py-4 text-center">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${getStatusColor(orc.status)}`}>
                      {orc.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-1">
                      <button title="Ver Detalhes" className="p-2 text-gray-400 hover:text-primary hover:bg-accent/30 rounded-lg transition-all"><Eye size={18} /></button>
                      {orc.status === 'Rascunho' && (
                        <>
                          <button title="Editar" className="p-2 text-gray-400 hover:text-secondary hover:bg-accent/30 rounded-lg transition-all"><Edit2 size={16} /></button>
                          <button onClick={() => updateOrcamento(orc.id, { status: 'Enviado' })} title="Enviar" className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Send size={18} /></button>
                        </>
                      )}
                      {isGerente && orc.status === 'Enviado' && (
                        <div className="flex gap-1">
                          <button onClick={() => updateOrcamento(orc.id, { status: 'Aprovado' })} title="Aprovar" className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"><CheckSquare size={18} /></button>
                          <button onClick={() => updateOrcamento(orc.id, { status: 'Reprovado' })} title="Reprovar" className="p-2 text-danger hover:bg-red-50 rounded-lg transition-all"><X size={18} /></button>
                        </div>
                      )}
                      {orc.status === 'Aprovado' && (
                        <button onClick={() => handleConverter(orc)} title="Converter em Pedido" className="p-2 text-primary hover:bg-accent/30 rounded-lg transition-all"><CheckSquare size={18} /></button>
                      )}
                      {isGerente && (
                        <button onClick={() => handleDelete(orc.id)} title="Excluir" className="p-2 text-gray-300 hover:text-danger hover:bg-red-50 rounded-lg transition-all"><Trash2 size={18} /></button>
                      )}
                      {orc.status !== 'Cancelado' && orc.status !== 'Convertido em Pedido' && !isGerente && (
                        <button onClick={() => updateOrcamento(orc.id, { status: 'Cancelado' })} title="Cancelar" className="p-2 text-gray-300 hover:text-danger hover:bg-red-50 rounded-lg transition-all"><X size={18} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal - Novo Orçamento */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col scale-in">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-primary text-white">
              <h2 className="text-xl font-bold">Novo Orçamento Comercial</h2>
              <button onClick={() => setShowModal(false)} className="text-white/70 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Cliente</label>
                  <select 
                    value={formData.cliente_id}
                    onChange={(e) => setFormData({...formData, cliente_id: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Selecione o Cliente</option>
                    {clientes.filter(c => c.status === 'Liberado' || c.representante_id === user?.id).map(c => (
                      <option key={c.id} value={c.id}>{c.razao_social}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Pagamento</label>
                  <input 
                    type="text" 
                    placeholder="Ex: 30 dias / Boleto"
                    value={formData.condicao_pagamento}
                    onChange={(e) => setFormData({...formData, condicao_pagamento: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Prazo de Entrega</label>
                  <input 
                    type="text" 
                    placeholder="Ex: 5 dias úteis"
                    value={formData.prazo_entrega}
                    onChange={(e) => setFormData({...formData, prazo_entrega: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20" 
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <h3 className="text-sm font-bold text-primary italic">Itens do Orçamento</h3>
                  <button onClick={addItem} className="text-secondary hover:text-primary transition-colors flex items-center gap-1 text-xs font-bold font-mono">
                    <PlusCircle size={14} /> ADICIONAR PRODUTO
                  </button>
                </div>

                <div className="space-y-3">
                  {selectedItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-3 items-end bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                      <div className="col-span-4">
                        <label className="block text-[10px] font-bold text-gray-400 mb-1">PRODUTO</label>
                        <select 
                          value={item.produto_id}
                          onChange={(e) => updateItem(idx, 'produto_id', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                        >
                          <option value="">Selecione...</option>
                          {produtos.map(p => (
                            <option key={p.id} value={p.id}>{p.nome}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-gray-400 mb-1">QUANT.</label>
                        <input 
                          type="number" 
                          value={item.quantidade}
                          onChange={(e) => updateItem(idx, 'quantidade', Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" 
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-gray-400 mb-1">PREÇO UN.</label>
                        <input 
                          type="number" 
                          value={item.preco}
                          onChange={(e) => updateItem(idx, 'preco', Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" 
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="block text-[10px] font-bold text-gray-400 mb-1">SUBTOTAL</label>
                        <div className="px-3 py-2 bg-white rounded-lg border border-secondary/20 text-sm font-bold text-primary">
                          R$ {(item.quantidade * item.preco).toLocaleString('pt-BR')}
                        </div>
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <button onClick={() => removeItem(idx)} className="p-2 text-danger hover:bg-red-50 rounded-lg transition-all">
                          <MinusCircle size={20} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 flex justify-between items-start gap-8">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Observações</label>
                  <textarea 
                    rows={4}
                    value={formData.observacoes}
                    onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  ></textarea>
                </div>
                <div className="w-72 bg-primary/5 p-6 rounded-2xl border border-primary/10">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-4">Resumo Financeiro</p>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Subtotal</span>
                      <span className="font-medium">R$ {totalOrcamento.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Impostos (Estimado)</span>
                      <span className="font-medium text-gray-400">R$ 0,00</span>
                    </div>
                    <div className="h-px bg-gray-200 my-2"></div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-primary font-bold">TOTAL</span>
                      <span className="text-xl font-bold text-primary tracking-tight">R$ {totalOrcamento.toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button 
                onClick={() => setShowModal(false)}
                className="px-6 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-200 transition-all"
              >
                Descartar
              </button>
              <button 
                onClick={handleSave}
                disabled={!formData.cliente_id || selectedItems.length === 0}
                className="px-8 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-secondary flex items-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={18} /> Salvar como Rascunho
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
