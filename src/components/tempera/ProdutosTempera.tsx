import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Box } from 'lucide-react';
import { formatCurrency, formatWeight } from '../../types';

export interface ProdutoTemperaType {
  id: string;
  codigo: string;
  nome: string;
  preco_unitario: number;
  gramas: number;
  quantidade_caixa: number;
  preco_caixa: number;
  peso_caixa: number;
  codigo_barras_unitario?: string;
  codigo_barras_caixa?: string;
}

export const ProdutosTempera: React.FC<{ empresa: string }> = ({ empresa }) => {
  const [produtos, setProdutos] = useState<ProdutoTemperaType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<ProdutoTemperaType>>({});

  useEffect(() => {
    const saved = localStorage.getItem('tempera_produtos');
    if (saved) {
      try {
        setProdutos(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const saveToLocal = (data: ProdutoTemperaType[]) => {
    setProdutos(data);
    localStorage.setItem('tempera_produtos', JSON.stringify(data));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };

  const calcularTotais = () => {
    if (formData.preco_unitario && formData.quantidade_caixa) {
      setFormData(prev => ({
        ...prev,
        preco_caixa: (prev.preco_unitario || 0) * (prev.quantidade_caixa || 0)
      }));
    }
    if (formData.gramas && formData.quantidade_caixa) {
      setFormData(prev => ({
        ...prev,
        peso_caixa: ((prev.gramas || 0) * (prev.quantidade_caixa || 0)) / 1000
      }));
    }
  };

  const handleSalvar = () => {
    if (!formData.nome) {
      alert("O nome do produto é obrigatório.");
      return;
    }

    const newProduct: ProdutoTemperaType = {
      id: formData.id || Math.random().toString(36).substr(2, 9),
      codigo: formData.codigo || '',
      nome: formData.nome || '',
      preco_unitario: formData.preco_unitario || 0,
      gramas: formData.gramas || 0,
      quantidade_caixa: formData.quantidade_caixa || 0,
      preco_caixa: formData.preco_caixa || 0,
      peso_caixa: formData.peso_caixa || 0,
      codigo_barras_unitario: formData.codigo_barras_unitario || '',
      codigo_barras_caixa: formData.codigo_barras_caixa || '',
    };

    let updatedList;
    if (formData.id) {
      updatedList = produtos.map(p => p.id === newProduct.id ? newProduct : p);
    } else {
      updatedList = [newProduct, ...produtos];
    }
    
    saveToLocal(updatedList);
    setIsModalOpen(false);
    setFormData({});
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      saveToLocal(produtos.filter(p => p.id !== itemToDelete));
      setItemToDelete(null);
    }
  };

  const openEdit = (prod: ProdutoTemperaType) => {
    setFormData(prod);
    setIsModalOpen(true);
  };

  const filtered = produtos.filter(p => 
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 w-full max-w-[98%] mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-black text-primary tracking-tight">Produtos</h2>
          <p className="text-gray-500 mt-1">Gerenciamento do catálogo de produtos</p>
        </div>
        
        <button 
          onClick={() => { setFormData({}); setIsModalOpen(true); }}
          className="bg-primary hover:bg-blue-800 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/30 transition-all"
        >
          <Plus size={20} />
          Adicionar Produto
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center gap-4 bg-gray-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text"
              placeholder="Buscar por nome ou código..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-bold text-center">Código</th>
                <th className="px-6 py-4 font-bold text-center w-[35%]">Nome do Produto</th>
                <th className="px-6 py-4 font-bold text-center">Preço Und.</th>
                <th className="px-6 py-4 font-bold text-center">Peso Unt.</th>
                <th className="px-6 py-4 font-bold text-center">Preço Caixa</th>
                <th className="px-6 py-4 font-bold text-center">Peso Caixa</th>
                <th className="px-6 py-4 font-bold text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Nenhum produto cadastrado.
                  </td>
                </tr>
              ) : (
                filtered.map(prod => (
                  <tr key={prod.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 text-center">{prod.codigo || '-'}</td>
                    <td className="px-6 py-4 font-bold text-primary text-center">{prod.nome}</td>
                    <td className="px-6 py-4 text-gray-600 text-center">R$ {formatCurrency(prod.preco_unitario)}</td>
                    <td className="px-6 py-4 text-gray-600 text-center">{formatWeight(prod.gramas)} g</td>
                    <td className="px-6 py-4 font-bold text-emerald-600 text-center">R$ {formatCurrency(prod.preco_caixa)}</td>
                    <td className="px-6 py-4 text-gray-600 text-center">{formatWeight(prod.peso_caixa)} kg</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openEdit(prod)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                          <Edit2 size={18} />
                        </button>
                        <button onClick={() => setItemToDelete(prod.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xl font-black text-primary flex items-center gap-2">
                <Box className="text-primary" />
                {formData.id ? 'Editar Produto' : 'Adicionar Novo Produto'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            
            <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
              <div className="flex flex-col gap-8">
                {/* Informações Gerais */}
                <div>
                  <h4 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Informações Gerais</h4>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-bold text-gray-700 mb-2">Código</label>
                      <input type="text" name="codigo" value={formData.codigo || ''} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-gray-50" placeholder="Ex: CX001" />
                    </div>
                    
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-bold text-gray-700 mb-2">Nome do Produto</label>
                      <input type="text" name="nome" value={formData.nome || ''} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-gray-50" placeholder="Ex: Empanado de Frango" />
                    </div>
                  </div>
                </div>

                {/* Dados Unitários */}
                <div>
                  <h4 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Dados Unitários</h4>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-bold text-gray-700 mb-2">Preço Unitário (R$)</label>
                      <input type="number" step="0.01" name="preco_unitario" value={formData.preco_unitario || ''} onChange={handleNumberChange} onBlur={calcularTotais} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-gray-50" placeholder="0,00" />
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-bold text-gray-700 mb-2">Gramas por Unidade (g)</label>
                      <input type="number" step="0.1" name="gramas" value={formData.gramas || ''} onChange={handleNumberChange} onBlur={calcularTotais} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-gray-50" placeholder="0" />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-bold text-gray-700 mb-2">Código de Barras Unitário</label>
                      <input type="text" name="codigo_barras_unitario" value={formData.codigo_barras_unitario || ''} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-gray-50" placeholder="Ex: 7891234567890" />
                    </div>
                  </div>
                </div>

                {/* Dados da Caixa */}
                <div>
                  <h4 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Dados da Caixa</h4>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-bold text-gray-700 mb-2">Qtd. na Caixa</label>
                      <input type="number" name="quantidade_caixa" value={formData.quantidade_caixa || ''} onChange={handleNumberChange} onBlur={calcularTotais} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-gray-50" placeholder="Ex: 12" />
                    </div>
                    
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-bold text-gray-700 mb-2">Preço da Caixa (R$)</label>
                      <input type="number" step="0.01" name="preco_caixa" value={formData.preco_caixa || ''} onChange={handleNumberChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-amber-50 text-amber-900 font-bold" placeholder="0,00" />
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-bold text-gray-700 mb-2">Peso da Caixa (kg)</label>
                      <input type="number" step="0.01" name="peso_caixa" value={formData.peso_caixa || ''} onChange={handleNumberChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-gray-50" placeholder="0,00" />
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-bold text-gray-700 mb-2">Código de Barras Caixa</label>
                      <input type="text" name="codigo_barras_caixa" value={formData.codigo_barras_caixa || ''} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-gray-50" placeholder="Ex: 17891234567897" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-3xl">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-3 font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              
              <button 
                onClick={handleSalvar}
                className="px-6 py-3 font-bold bg-primary hover:bg-blue-800 text-white rounded-xl transition-all shadow-sm"
              >
                Salvar Produto
              </button>
            </div>
          </div>
        </div>
      )}
      {itemToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-red-50">
              <h3 className="text-xl font-black text-red-600 flex items-center gap-2">
                <Trash2 className="text-red-600" />
                Confirmar Exclusão
              </h3>
              <button onClick={() => setItemToDelete(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            
            <div className="p-8 text-center">
              <p className="text-gray-700 text-lg mb-2">
                Tem certeza que deseja excluir este produto?
              </p>
              <p className="text-gray-500 text-sm">
                Esta ação não poderá ser desfeita.
              </p>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-3xl">
              <button 
                onClick={() => setItemToDelete(null)}
                className="px-6 py-3 font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              
              <button 
                onClick={confirmDelete}
                className="px-6 py-3 font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all shadow-sm"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProdutosTempera;
