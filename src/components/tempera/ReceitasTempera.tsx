import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Box, Eye, CheckCircle, ChefHat } from 'lucide-react';
import { formatCurrency } from '../../types';

interface ReceitaItem {
  id: string;
  nome: string;
  unidade: string;
  quantidade_total: number;
  valor_total: number;
  quantidade_usada: number;
  valor_calculado: number;
}

interface Receita {
  id: string;
  nome: string;
  unidade_rendimento: string;
  rendimento: number;
  itens: ReceitaItem[];
}

export const ReceitasTempera: React.FC<{ empresa: string }> = ({ empresa }) => {
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedReceita, setSelectedReceita] = useState<Receita | null>(null);
  
  const [modalNewReceitaOpen, setModalNewReceitaOpen] = useState(false);
  const [formNewReceita, setFormNewReceita] = useState<{nome: string; unidade: string; rendimento: string}>({nome: '', unidade: 'g', rendimento: ''});
  
  const [modalItemOpen, setModalItemOpen] = useState(false);
  const [formItem, setFormItem] = useState<Partial<ReceitaItem>>({ unidade: 'g' });

  useEffect(() => {
    const saved = localStorage.getItem('tempera_receitas');
    if (saved) {
      try {
        setReceitas(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const saveReceitas = (newReceitas: Receita[]) => {
    setReceitas(newReceitas);
    localStorage.setItem('tempera_receitas', JSON.stringify(newReceitas));
  };

  const handleCreateReceita = () => {
    if (!formNewReceita.nome || !formNewReceita.rendimento) return;
    const nr: Receita = {
      id: crypto.randomUUID(),
      nome: formNewReceita.nome,
      unidade_rendimento: formNewReceita.unidade,
      rendimento: parseFloat(formNewReceita.rendimento) || 1,
      itens: []
    };
    saveReceitas([...receitas, nr]);
    setModalNewReceitaOpen(false);
    setFormNewReceita({nome: '', unidade: 'g', rendimento: ''});
  };

  const handleDeleteReceita = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Deseja excluir esta receita?')) {
      saveReceitas(receitas.filter(r => r.id !== id));
      if (selectedReceita?.id === id) setSelectedReceita(null);
    }
  };

  const handleUpdateRendimento = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedReceita) return;
    const val = parseFloat(e.target.value) || 0;
    const updated = { ...selectedReceita, rendimento: val };
    const all = receitas.map(r => r.id === updated.id ? updated : r);
    saveReceitas(all);
    setSelectedReceita(updated);
  };

  const handleSaveItem = () => {
    if (!selectedReceita) return;
    if (!formItem.nome || !formItem.quantidade_total || !formItem.valor_total || !formItem.quantidade_usada) return;

    const qt = parseFloat(formItem.quantidade_total.toString());
    const vt = parseFloat(formItem.valor_total.toString());
    const qu = parseFloat(formItem.quantidade_usada.toString());
    
    const valor_calculado = (vt / qt) * qu;

    const newItem: ReceitaItem = {
      id: formItem.id || crypto.randomUUID(),
      nome: formItem.nome,
      unidade: formItem.unidade || 'g',
      quantidade_total: qt,
      valor_total: vt,
      quantidade_usada: qu,
      valor_calculado
    };

    let updatedItens;
    if (formItem.id) {
      updatedItens = selectedReceita.itens.map(i => i.id === newItem.id ? newItem : i);
    } else {
      updatedItens = [...selectedReceita.itens, newItem];
    }
    
    const updatedReceita = { ...selectedReceita, itens: updatedItens };
    const all = receitas.map(r => r.id === updatedReceita.id ? updatedReceita : r);
    saveReceitas(all);
    setSelectedReceita(updatedReceita);
    setModalItemOpen(false);
    setFormItem({ unidade: 'g' });
  };

  const handleDeleteItem = (itemId: string) => {
    if (!selectedReceita) return;
    if (confirm('Deseja excluir este item?')) {
      const updatedItens = selectedReceita.itens.filter(i => i.id !== itemId);
      const updatedReceita = { ...selectedReceita, itens: updatedItens };
      const all = receitas.map(r => r.id === updatedReceita.id ? updatedReceita : r);
      saveReceitas(all);
      setSelectedReceita(updatedReceita);
    }
  };

  const filteredReceitas = receitas.filter(r => r.nome.toLowerCase().includes(searchTerm.toLowerCase()));

  // Render modal item
  const renderItemModal = () => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl">
        <h3 className="text-xl font-black text-primary mb-6">{formItem.id ? 'Editar Ingrediente' : 'Novo Ingrediente'}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Ingrediente</label>
            <input type="text" value={formItem.nome || ''} onChange={e => setFormItem({...formItem, nome: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" placeholder="Ex: Farinha de Trigo" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Unidade</label>
              <select value={formItem.unidade || 'g'} onChange={e => setFormItem({...formItem, unidade: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
                <option value="g">Gramas (g)</option>
                <option value="kg">Quilogramas (kg)</option>
                <option value="ml">Mililitros (ml)</option>
                <option value="l">Litros (l)</option>
                <option value="un">Unidade (un)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Embalagem Fechada (Qtd)</label>
              <input type="number" step="0.01" value={formItem.quantidade_total || ''} onChange={e => setFormItem({...formItem, quantidade_total: parseFloat(e.target.value)})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl" placeholder="Ex: 1000" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Valor Pago (R$)</label>
              <input type="number" step="0.01" value={formItem.valor_total || ''} onChange={e => setFormItem({...formItem, valor_total: parseFloat(e.target.value)})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl" placeholder="Ex: 15.90" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Qtd Utilizada na Receita</label>
              <input type="number" step="0.01" value={formItem.quantidade_usada || ''} onChange={e => setFormItem({...formItem, quantidade_usada: parseFloat(e.target.value)})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl" placeholder="Ex: 250" />
            </div>
          </div>
          
          {formItem.quantidade_total && formItem.valor_total && formItem.quantidade_usada && (
            <div className="bg-primary/5 rounded-xl p-4 mt-2">
              <p className="text-sm font-bold text-primary">Custo Calculado: R$ {formatCurrency((parseFloat(formItem.valor_total.toString()) / parseFloat(formItem.quantidade_total.toString())) * parseFloat(formItem.quantidade_usada.toString()))}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <button onClick={() => setModalItemOpen(false)} className="px-6 py-3 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">Cancelar</button>
          <button onClick={handleSaveItem} className="px-6 py-3 bg-primary text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">Salvar Ingrediente</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-8 w-full max-w-[98%] mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Receitas</h1>
          <p className="text-gray-500 mt-1 font-medium">Gerencie suas receitas e custo de produção</p>
        </div>
        <button
          onClick={() => {
            setFormNewReceita({nome: '', unidade: 'g', rendimento: ''});
            setModalNewReceitaOpen(true);
          }}
          className="bg-primary hover:bg-primary/90 text-white px-6 py-3.5 rounded-2xl flex items-center gap-2 font-bold shadow-lg shadow-primary/20 transition-all active:scale-95"
        >
          <Plus size={20} />
          <span>Nova Receita</span>
        </button>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 h-[calc(100vh-180px)]">
        
        {/* Left Side: Lista de Receitas */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar receita..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {filteredReceitas.map((r) => {
              const totalCost = r.itens.reduce((acc, curr) => acc + curr.valor_calculado, 0);
              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedReceita(r)}
                  className={`p-4 rounded-2xl cursor-pointer transition-all border ${
                    selectedReceita?.id === r.id
                      ? 'bg-primary/5 border-primary/20'
                      : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedReceita?.id === r.id ? 'bg-primary text-white shadow-md' : 'bg-gray-100 text-gray-500'}`}>
                        <ChefHat size={20} />
                      </div>
                      <div>
                        <h3 className={`font-black ${selectedReceita?.id === r.id ? 'text-primary' : 'text-gray-900'}`}>{r.nome}</h3>
                        <p className="text-xs text-gray-500 font-medium">Rende: {r.rendimento} {r.unidade_rendimento}</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteReceita(r.id, e)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100/50">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Custo Receita</span>
                    <span className="font-black text-gray-900">R$ {formatCurrency(totalCost)}</span>
                  </div>
                </div>
              );
            })}
            {filteredReceitas.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <ChefHat size={48} className="mx-auto mb-4 opacity-20" />
                <p>Nenhuma receita encontrada</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Detalhes da Receita */}
        {selectedReceita ? (
          <div className="lg:col-span-8 bg-white rounded-3xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                  <ChefHat size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900">{selectedReceita.nome}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-medium text-gray-500">Ajustar Rendimento da Receita:</span>
                    <div className="relative">
                      <input 
                        type="number" 
                        value={selectedReceita.rendimento} 
                        onChange={handleUpdateRendimento}
                        className="w-24 pl-3 pr-8 py-1 bg-white border border-gray-200 rounded-lg text-sm font-bold text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">{selectedReceita.unidade_rendimento}</span>
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setFormItem({ unidade: 'g' });
                  setModalItemOpen(true);
                }}
                className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-bold shadow-lg shadow-gray-900/20 transition-all flex items-center gap-2"
              >
                <Plus size={18} />
                <span>Adicionar Ingrediente</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-3 mb-6">
                {selectedReceita.itens.length === 0 ? (
                   <div className="text-center p-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <ChefHat size={40} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 font-medium">Nenhum ingrediente adicionado.</p>
                  </div>
                ) : (
                  selectedReceita.itens.map(item => (
                    <div key={item.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between hover:border-gray-200 transition-colors shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-50 text-gray-500 rounded-xl flex items-center justify-center font-bold">
                          {item.unidade}
                        </div>
                        <div>
                          <h4 className="font-black text-gray-900">{item.nome}</h4>
                          <p className="text-xs text-gray-500 mt-1">Usa: {item.quantidade_usada}{item.unidade} (de {item.quantidade_total}{item.unidade} por R$ {formatCurrency(item.valor_total)})</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Custo</span>
                          <span className="font-black text-gray-900">R$ {formatCurrency(item.valor_calculado)}</span>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => { setFormItem(item); setModalItemOpen(true); }} className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"><Edit2 size={16} /></button>
                          <button onClick={() => handleDeleteItem(item.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Rodapé de Resumo */}
            {selectedReceita.itens.length > 0 && (
              <div className="border-t border-gray-100 p-6 bg-gray-50">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl p-4 border border-gray-200 flex flex-col justify-center items-center">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Custo Total da Receita</span>
                    <span className="text-2xl font-black text-gray-900">
                      R$ {formatCurrency(selectedReceita.itens.reduce((a, b) => a + b.valor_calculado, 0))}
                    </span>
                  </div>
                  <div className="bg-primary/10 rounded-2xl p-4 border border-primary/20 flex flex-col justify-center items-center">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Custo por {selectedReceita.unidade_rendimento}</span>
                    <span className="text-2xl font-black text-primary">
                      R$ {formatCurrency(selectedReceita.rendimento > 0 ? selectedReceita.itens.reduce((a, b) => a + b.valor_calculado, 0) / selectedReceita.rendimento : 0)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="lg:col-span-8 bg-gray-50/50 rounded-3xl border border-gray-200 border-dashed flex flex-col items-center justify-center text-gray-400">
            <ChefHat size={64} className="mb-4 opacity-50" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Selecione uma Receita</h3>
            <p className="font-medium text-gray-500">Crie ou selecione uma receita na lista ao lado para ver e adicionar ingredientes.</p>
          </div>
        )}
      </div>

      {modalNewReceitaOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-black text-primary mb-6">Nova Receita</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nome da Receita</label>
                <input type="text" value={formNewReceita.nome} onChange={e => setFormNewReceita({...formNewReceita, nome: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl" placeholder="Ex: Massa de Empanado" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Rendimento (Qtd)</label>
                  <input type="number" step="0.01" value={formNewReceita.rendimento} onChange={e => setFormNewReceita({...formNewReceita, rendimento: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl" placeholder="Ex: 10" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Unidade</label>
                  <select value={formNewReceita.unidade} onChange={e => setFormNewReceita({...formNewReceita, unidade: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
                    <option value="g">Gramas (g)</option>
                    <option value="kg">Quilogramas (kg)</option>
                    <option value="un">Unidades (un)</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => setModalNewReceitaOpen(false)} className="px-6 py-3 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl">Cancelar</button>
              <button onClick={handleCreateReceita} className="px-6 py-3 bg-primary text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/20">Criar Receita</button>
            </div>
          </div>
        </div>
      )}

      {modalItemOpen && renderItemModal()}
    </div>
  );
};
export default ReceitasTempera;
