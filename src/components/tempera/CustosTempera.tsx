import React, { useState, useEffect } from 'react';
import { Search, CreditCard, Plus, Edit2, Trash2, Box, Percent, DollarSign, X, Eye, CheckCircle } from 'lucide-react';
import { formatCurrency } from '../../types';

interface ProdutoTemperaType {
  id: string;
  codigo: string;
  nome: string;
  preco_unitario: number;
}

interface CustoItem {
  id: string;
  produto_id: string;
  tipo: 'materia_prima' | 'adicional';
  nome: string;
  // Materia Prima fields
  unidade?: string;
  quantidade_total?: number;
  valor_total?: number;
  quantidade_usada?: number;
  // Adicional fields
  tipo_adicional?: 'percentual' | 'fixo';
  valor_base?: number;
  // Result
  valor_calculado: number;
}

export const CustosTempera: React.FC<{ empresa: string }> = ({ empresa }) => {
  const [produtos, setProdutos] = useState<ProdutoTemperaType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Custos State: { [produto_id]: CustoItem[] }
  const [custos, setCustos] = useState<Record<string, CustoItem[]>>({});
  
  // Modal States
  const [selectedProduct, setSelectedProduct] = useState<ProdutoTemperaType | null>(null);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [modalMPOpen, setModalMPOpen] = useState(false);
  const [modalAdicionalOpen, setModalAdicionalOpen] = useState(false);
  
  // Forms States
  const [formDataMP, setFormDataMP] = useState<Partial<CustoItem>>({ unidade: 'g' });
  const [formDataAdicional, setFormDataAdicional] = useState<Partial<CustoItem>>({ tipo_adicional: 'percentual' });
  const [metaMargemReducao, setMetaMargemReducao] = useState<string>('30');
  const [metaPrecoReducao, setMetaPrecoReducao] = useState<string>('');

  // Banco de Materia Prima states
  const [activeTab, setActiveTab] = useState<'produtos' | 'banco'>('produtos');
  const [editingCell, setEditingCell] = useState<{ id: string, field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  useEffect(() => {
    const savedProdutos = localStorage.getItem('tempera_produtos');
    if (savedProdutos) {
      try {
        setProdutos(JSON.parse(savedProdutos));
      } catch (e) {
        console.error(e);
      }
    }
    
    const savedCustos = localStorage.getItem('tempera_custos_produtos');
    if (savedCustos) {
      try {
        setCustos(JSON.parse(savedCustos));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const saveCustos = (newCustos: Record<string, CustoItem[]>) => {
    setCustos(newCustos);
    localStorage.setItem('tempera_custos_produtos', JSON.stringify(newCustos));
  };

  const handleOpenList = (prod: ProdutoTemperaType, viewOnly: boolean = false) => {
    // Reload products from localStorage to get latest prices
    const savedProdutos = localStorage.getItem('tempera_produtos');
    if (savedProdutos) {
       try {
         const updatedProdutos = JSON.parse(savedProdutos);
         setProdutos(updatedProdutos);
         // Find the latest version of the selected product
         const updatedProd = updatedProdutos.find((p: ProdutoTemperaType) => p.id === prod.id);
         setSelectedProduct(updatedProd || prod);
       } catch (e) {
         console.error("Error loading updated products", e);
         setSelectedProduct(prod);
       }
    } else {
       setSelectedProduct(prod);
    }
    setIsViewOnly(viewOnly);
  };

  const bancoMateriasPrimas = React.useMemo(() => {
    const map = new Map<string, any>();
    Object.values(custos).forEach((prodCustos: any) => {
      if (Array.isArray(prodCustos)) {
        prodCustos.forEach(c => {
          if (c.tipo === 'materia_prima') {
            const key = (c.nome || '').toLowerCase().trim();
            if (!map.has(key)) {
              map.set(key, { 
                nomeOriginal: c.nome, 
                unidade: c.unidade, 
                quantidade_total: c.quantidade_total, 
                valor_total: c.valor_total 
              });
            }
          }
        });
      }
    });
    return Array.from(map.values());
  }, [custos]);

  const startEditing = (item: any, field: string, value: any) => {
    setEditingCell({ id: item.nomeOriginal, field });
    setEditValue(value !== undefined && value !== null ? value.toString() : '');
  };

  const handleInlineMoneyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value === '') {
      setEditValue('');
      return;
    }
    const numericValue = parseInt(value, 10) / 100;
    setEditValue(formatMoneyInput(numericValue));
  };

  const saveInlineEdit = () => {
    if (!editingCell) return;
    const { id, field } = editingCell;
    const newCustos = { ...custos };

    Object.keys(newCustos).forEach(prodId => {
      newCustos[prodId] = newCustos[prodId].map(c => {
        if (c.tipo === 'materia_prima' && (c.nome || '').toLowerCase().trim() === id.toLowerCase().trim()) {
          const newCusto = { ...c };
          
          if (field === 'nome') {
            newCusto.nome = editValue;
          } else if (field === 'unidade') {
            newCusto.unidade = editValue;
          } else if (field === 'quantidade_total') {
            newCusto.quantidade_total = parseFloat(editValue.replace(',', '.')) || 0;
          } else if (field === 'valor_total') {
            newCusto.valor_total = parseFloat(editValue.replace(/\./g, '').replace(',', '.')) || 0;
          }

          if (newCusto.quantidade_total && newCusto.valor_total && newCusto.quantidade_usada) {
            newCusto.valor_calculado = (newCusto.valor_total / newCusto.quantidade_total) * newCusto.quantidade_usada;
          } else {
            newCusto.valor_calculado = 0;
          }
          return newCusto;
        }
        return c;
      });
    });
    
    saveCustos(newCustos);
    setEditingCell(null);
  };

  const handleInlineKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveInlineEdit();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  // ----- HANDLERS FOR MATERIA PRIMA -----
  const handleMPChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormDataMP(prev => ({ 
      ...prev, 
      [name]: name === 'nome' || name === 'unidade' ? value : parseFloat(value) || 0 
    }));
  };

  const handleMPMoneyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value === '') {
      setFormDataMP(prev => ({ ...prev, valor_total: undefined }));
      return;
    }
    const numericValue = parseInt(value, 10) / 100;
    setFormDataMP(prev => ({ ...prev, valor_total: numericValue }));
  };

  const formatMoneyInput = (val: number | undefined) => {
    if (val === undefined) return '';
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getLabelQuantidadeUsada = () => {
    switch(formDataMP.unidade) {
      case 'g': return 'Gramas Usadas na Produção';
      case 'ml': return 'Mililitros Usados na Produção';
      case 'kg': return 'Quilos Usados na Produção';
      case 'l': return 'Litros Usados na Produção';
      case 'un': return 'Unidades Usadas na Produção';
      default: return 'Quantidade Usada na Produção';
    }
  };

  const calcularMP = () => {
    if (formDataMP.quantidade_total && formDataMP.valor_total && formDataMP.quantidade_usada) {
      return (formDataMP.valor_total / formDataMP.quantidade_total) * formDataMP.quantidade_usada;
    }
    return 0;
  };

  const saveMateriaPrima = () => {
    if (!selectedProduct) return;
    if (!formDataMP.nome) {
      alert("O nome do insumo/produto é obrigatório.");
      return;
    }

    const newItem: CustoItem = {
      id: Math.random().toString(36).substr(2, 9),
      produto_id: selectedProduct.id,
      tipo: 'materia_prima',
      nome: formDataMP.nome,
      unidade: formDataMP.unidade,
      quantidade_total: formDataMP.quantidade_total,
      valor_total: formDataMP.valor_total,
      quantidade_usada: formDataMP.quantidade_usada,
      valor_calculado: calcularMP()
    };

    const prodCustos = custos[selectedProduct.id] || [];
    saveCustos({ ...custos, [selectedProduct.id]: [...prodCustos, newItem] });
    setModalMPOpen(false);
    setFormDataMP({ unidade: 'g' });
  };

  // ----- HANDLERS FOR ADICIONAIS -----
  const handleAdicionalChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormDataAdicional(prev => ({ 
      ...prev, 
      [name]: name === 'nome' || name === 'tipo_adicional' ? value : parseFloat(value) || 0 
    }));
  };

  const calcularAdicional = () => {
    if (!selectedProduct) return 0;
    if (formDataAdicional.tipo_adicional === 'percentual') {
      return ((formDataAdicional.valor_base || 0) / 100) * (selectedProduct.preco_unitario || 0);
    }
    return formDataAdicional.valor_base || 0;
  };

  const saveAdicional = () => {
    if (!selectedProduct) return;
    if (!formDataAdicional.nome) {
      alert("O nome do custo é obrigatório.");
      return;
    }

    const newItem: CustoItem = {
      id: Math.random().toString(36).substr(2, 9),
      produto_id: selectedProduct.id,
      tipo: 'adicional',
      nome: formDataAdicional.nome,
      tipo_adicional: formDataAdicional.tipo_adicional as 'percentual' | 'fixo',
      valor_base: formDataAdicional.valor_base,
      valor_calculado: calcularAdicional()
    };

    const prodCustos = custos[selectedProduct.id] || [];
    saveCustos({ ...custos, [selectedProduct.id]: [...prodCustos, newItem] });
    setModalAdicionalOpen(false);
    setFormDataAdicional({ tipo_adicional: 'percentual' });
  };

  // ----- DELETE CUSTO -----
  const deleteCusto = (id: string) => {
    if (!selectedProduct) return;
    if (window.confirm("Deseja realmente excluir este custo?")) {
      const prodCustos = custos[selectedProduct.id] || [];
      saveCustos({ ...custos, [selectedProduct.id]: prodCustos.filter(c => c.id !== id) });
    }
  };

  const filtered = produtos.filter(p => 
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentProdCustos = React.useMemo(() => {
    if (!selectedProduct) return [];
    const prodCustos = custos[selectedProduct.id] || [];
    
    return prodCustos.map(c => {
      if (c.tipo === 'adicional' && c.tipo_adicional === 'percentual') {
        const newValorCalculado = ((c.valor_base || 0) / 100) * (selectedProduct.preco_unitario || 0);
        return { ...c, valor_calculado: newValorCalculado };
      }
      return c;
    });
  }, [selectedProduct, custos]);
  const totalCusto = currentProdCustos.reduce((acc, c) => acc + c.valor_calculado, 0);

  useEffect(() => {
    if (selectedProduct) {
      const pv = selectedProduct.preco_unitario || 0;
      setMetaPrecoReducao(pv.toString());
    }
  }, [selectedProduct?.id]);

  return (
    <div className="p-8 w-full max-w-[98%] mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-black text-primary tracking-tight flex items-center gap-2">
            <CreditCard size={32} />
            Custos
          </h2>
          <p className="text-gray-500 mt-1">Gerenciamento de custos de produção e impostos dos produtos</p>
        </div>
      </div>

      <div className="flex gap-4 mb-6 border-b border-gray-100 pb-4">
        <button 
          onClick={() => setActiveTab('produtos')}
          className={`px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'produtos' ? 'bg-primary text-white shadow-md' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
        >
          Produtos
        </button>
        <button 
          onClick={() => setActiveTab('banco')}
          className={`px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'banco' ? 'bg-primary text-white shadow-md' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
        >
          Banco de Matéria Prima
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {activeTab === 'produtos' ? (
          <>
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
                <th className="px-6 py-4 font-bold text-center w-32">Código</th>
                <th className="px-6 py-4 font-bold text-center">Nome do Produto</th>
                <th className="px-6 py-4 font-bold text-center">Ações</th>
                <th className="px-6 py-4 font-bold text-center w-24">Visualizar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    Nenhum produto cadastrado.
                  </td>
                </tr>
              ) : (
                filtered.map(prod => {
                  const hasCustos = (custos[prod.id] || []).length > 0;
                  return (
                    <tr key={prod.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900 text-center">{prod.codigo || '-'}</td>
                      <td className="px-6 py-4 font-bold text-primary text-center">{prod.nome}</td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => handleOpenList(prod, false)}
                          className={`px-4 py-2 rounded-xl font-bold transition-colors text-sm flex items-center gap-2 mx-auto ${
                            hasCustos 
                            ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' 
                            : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                          }`}
                        >
                          {hasCustos ? <Edit2 size={16} /> : <Plus size={16} />}
                          {hasCustos ? 'Editar Custos' : 'Adicionar Custos'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {hasCustos ? (
                          <button 
                            onClick={() => handleOpenList(prod, true)}
                            className="p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 rounded-lg transition-colors mx-auto flex"
                            title="Ver Custos"
                          >
                            <Eye size={20} />
                          </button>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        </>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-center border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-bold text-center">Matéria Prima</th>
                  <th className="px-6 py-4 font-bold text-center">Unidade</th>
                  <th className="px-6 py-4 font-bold text-center">Qtd. Embalagem</th>
                  <th className="px-6 py-4 font-bold text-center">Valor Embalagem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bancoMateriasPrimas.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                      Nenhuma matéria prima registrada nos custos.
                    </td>
                  </tr>
                ) : (
                  bancoMateriasPrimas.map((item, idx) => (
                    <tr key={idx} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="px-6 py-4 font-bold text-primary text-center cursor-pointer" onDoubleClick={() => startEditing(item, 'nome', item.nomeOriginal)} title="Clique duplo para editar">
                        {editingCell?.id === item.nomeOriginal && editingCell?.field === 'nome' ? (
                          <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} onKeyDown={handleInlineKeyDown} onBlur={() => setEditingCell(null)} className="w-full text-center px-2 py-1 rounded border-2 border-primary focus:outline-none text-gray-900" />
                        ) : item.nomeOriginal}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-700 text-center cursor-pointer" onDoubleClick={() => startEditing(item, 'unidade', item.unidade)} title="Clique duplo para editar">
                        {editingCell?.id === item.nomeOriginal && editingCell?.field === 'unidade' ? (
                          <select autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} onKeyDown={handleInlineKeyDown} onBlur={() => setEditingCell(null)} className="w-full text-center px-2 py-1 rounded border-2 border-primary focus:outline-none text-gray-900">
                            <option value="g">Gramas (g)</option>
                            <option value="ml">Mililitros (ml)</option>
                            <option value="kg">Quilos (kg)</option>
                            <option value="l">Litros (L)</option>
                            <option value="un">Unidades</option>
                          </select>
                        ) : (item.unidade === 'g' ? 'Gramas (g)' : 
                             item.unidade === 'ml' ? 'Mililitros (ml)' : 
                             item.unidade === 'kg' ? 'Quilos (kg)' : 
                             item.unidade === 'l' ? 'Litros (L)' : 
                             item.unidade === 'un' ? 'Unidades' : item.unidade)}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-700 text-center cursor-pointer" onDoubleClick={() => startEditing(item, 'quantidade_total', item.quantidade_total)} title="Clique duplo para editar">
                        {editingCell?.id === item.nomeOriginal && editingCell?.field === 'quantidade_total' ? (
                          <input autoFocus type="number" value={editValue} onChange={e => setEditValue(e.target.value)} onKeyDown={handleInlineKeyDown} onBlur={() => setEditingCell(null)} className="w-full text-center px-2 py-1 rounded border-2 border-primary focus:outline-none text-gray-900" />
                        ) : item.quantidade_total}
                      </td>
                      <td className="px-6 py-4 font-bold text-red-600 text-center cursor-pointer" onDoubleClick={() => startEditing(item, 'valor_total', formatMoneyInput(item.valor_total))} title="Clique duplo para editar">
                        {editingCell?.id === item.nomeOriginal && editingCell?.field === 'valor_total' ? (
                          <div className="relative inline-block w-full max-w-[120px]">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">R$</span>
                            <input autoFocus type="text" value={editValue} onChange={handleInlineMoneyChange} onKeyDown={handleInlineKeyDown} onBlur={() => setEditingCell(null)} className="w-full text-center pl-8 pr-2 py-1 rounded border-2 border-primary focus:outline-none font-bold text-red-600" />
                          </div>
                        ) : `R$ ${formatCurrency(item.valor_total || 0)}`}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: LISTA DE CUSTOS E MARGEM */}
      {selectedProduct && !modalMPOpen && !modalAdicionalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-[1600px] shadow-2xl overflow-hidden flex flex-col h-[90vh]">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
              <div>
                <h3 className="text-2xl font-black text-primary">Análise de Custos e Margem</h3>
                <p className="text-gray-500 font-medium">{selectedProduct.codigo} - {selectedProduct.nome}</p>
              </div>
              <button onClick={() => setSelectedProduct(null)} className="text-gray-400 hover:text-gray-600">
                <X size={28} />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
                {/* Coluna 1: Lista de Custos (Span 5) */}
                <div className="lg:col-span-5 flex flex-col h-full bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center shrink-0">
                    <h4 className="font-bold text-gray-700">Custos Detalhados</h4>
                  </div>
                  <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
                    {!isViewOnly && (
                      <div className="flex gap-2 mb-6">
                        <button 
                          onClick={() => setModalMPOpen(true)}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl font-bold flex justify-center items-center gap-1 transition-all shadow-sm text-sm"
                        >
                          <Plus size={16} /> Matéria Prima
                        </button>
                        <button 
                          onClick={() => setModalAdicionalOpen(true)}
                          className="flex-1 bg-primary hover:bg-blue-800 text-white px-3 py-2 rounded-xl font-bold flex justify-center items-center gap-1 transition-all shadow-sm text-sm"
                        >
                          <Plus size={16} /> Adicional
                        </button>
                      </div>
                    )}

                    {currentProdCustos.length === 0 ? (
                      <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                        <p className="text-gray-500 text-sm">Nenhum custo cadastrado.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {currentProdCustos.map(c => (
                          <div key={c.id} className="p-3 border border-gray-100 rounded-xl hover:bg-gray-50/50 transition-colors flex justify-between items-center group">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`w-2 h-2 rounded-full ${c.tipo === 'materia_prima' ? 'bg-emerald-500' : 'bg-blue-500'}`}></span>
                                <span className="font-bold text-gray-800 text-sm">{c.nome}</span>
                              </div>
                              <span className="text-xs text-gray-500 block">
                                {c.tipo === 'materia_prima' 
                                  ? `${c.quantidade_usada}${c.unidade} de ${c.quantidade_total}${c.unidade} (R$ ${formatCurrency(c.valor_total || 0)})`
                                  : c.tipo_adicional === 'percentual' 
                                    ? `${c.valor_base}% sobre venda`
                                    : `Valor Fixo`}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-red-600">R$ {formatCurrency(c.valor_calculado)}</span>
                              {!isViewOnly && (
                                <button onClick={() => deleteCusto(c.id)} className="text-gray-300 hover:text-red-500 transition-colors" title="Excluir">
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
                    <span className="text-gray-500 font-bold text-sm">Custo Total:</span>
                    <span className="text-xl font-black text-red-600">R$ {formatCurrency(totalCusto)}</span>
                  </div>
                </div>

                {/* Coluna 2: Diagnóstico e Metas (Span 3) */}
                <div className="lg:col-span-3 flex flex-col gap-4">
                  {(() => {
                    const precoVenda = selectedProduct.preco_unitario || 0;
                    const lucroAtual = precoVenda - totalCusto;
                    const margemAtual = precoVenda > 0 ? (lucroAtual / precoVenda) * 100 : 0;
                    const markupAtual = totalCusto > 0 ? (lucroAtual / totalCusto) * 100 : 0;
                    
                    const precoAlvo = parseFloat(metaPrecoReducao) || 0;
                    const margemAlvo = parseFloat(metaMargemReducao) || 0;
                    const custoAlvo = precoAlvo * (1 - (margemAlvo / 100));

                    return (
                      <>
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                          <h4 className="font-black text-gray-900 uppercase text-xs tracking-widest border-b border-gray-100 pb-2">1. Diagnóstico Atual</h4>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-gray-500">Preço Tabela</span>
                            <span className="font-black text-gray-900">R$ {formatCurrency(precoVenda)}</span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-gray-500">Custo Atual</span>
                            <span className="font-black text-red-600">R$ {formatCurrency(totalCusto)}</span>
                          </div>

                          <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                            <span className="text-sm font-bold text-gray-500">Lucro Líquido</span>
                            <span className={`font-black ${lucroAtual >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>R$ {formatCurrency(lucroAtual)}</span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <div className={`p-3 rounded-xl flex flex-col items-center justify-center ${lucroAtual >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                              <span className="text-[9px] font-black uppercase text-center mb-1">Margem (Cima p/ Baixo)</span>
                              <span className="text-lg font-black">{margemAtual.toFixed(1)}%</span>
                            </div>
                            <div className={`p-3 rounded-xl flex flex-col items-center justify-center ${lucroAtual >= 0 ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>
                              <span className="text-[9px] font-black uppercase text-center mb-1">Margem (Baixo p/ Cima)</span>
                              <span className="text-lg font-black">{markupAtual.toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-primary/5 rounded-2xl border border-primary/10 p-5 flex-1 flex flex-col justify-center">
                          <h4 className="font-black text-primary uppercase text-xs tracking-widest mb-2 text-center">2. Definição de Metas</h4>
                          <p className="text-[11px] text-gray-600 mb-5 text-center leading-relaxed">Qual o preço máximo que o mercado paga e a margem inegociável que você precisa?</p>
                          
                          <div className="grid grid-cols-2 gap-3 mb-5">
                            <div className="flex flex-col">
                              <label className="text-[10px] font-bold text-primary uppercase tracking-widest text-center mb-2">Preço Teto (R$)</label>
                              <div className="relative">
                                <input 
                                  type="number" 
                                  value={metaPrecoReducao} 
                                  onChange={e => setMetaPrecoReducao(e.target.value)} 
                                  className="w-full text-center py-2.5 rounded-xl border border-primary/20 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-lg font-black text-primary bg-white shadow-sm"
                                />
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/50 font-black text-sm">R$</span>
                              </div>
                            </div>
                            <div className="flex flex-col">
                              <label className="text-[10px] font-bold text-primary uppercase tracking-widest text-center mb-2">Margem Mínima (%)</label>
                              <div className="relative">
                                <input 
                                  type="number" 
                                  value={metaMargemReducao} 
                                  onChange={e => setMetaMargemReducao(e.target.value)} 
                                  className="w-full text-center py-2.5 rounded-xl border border-primary/20 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-lg font-black text-primary bg-white shadow-sm"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/50 font-black text-sm">%</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-white rounded-xl p-4 border border-primary/20 text-center shadow-sm">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Seu Custo Alvo Máximo:</span>
                            <span className="text-2xl font-black text-emerald-600">R$ {formatCurrency(custoAlvo)}</span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Coluna 3: Plano de Ação e Redução (Span 4) */}
                <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col h-full overflow-hidden">
                  <h4 className="font-black text-gray-900 uppercase text-xs tracking-widest border-b border-gray-100 pb-2 mb-4 shrink-0">3. Plano de Ação (Cortes)</h4>
                  
                  {(() => {
                    const precoAlvo = parseFloat(metaPrecoReducao) || 0;
                    const margemAlvo = parseFloat(metaMargemReducao) || 0;
                    const custoAlvo = precoAlvo * (1 - (margemAlvo / 100));
                    const reducaoNecessaria = totalCusto - custoAlvo;
                    const reducaoPercentual = totalCusto > 0 ? (reducaoNecessaria / totalCusto) * 100 : 0;
                    
                    const matPrimas = currentProdCustos.filter(c => c.tipo === 'materia_prima');
                    const matPrimasSort = [...matPrimas].sort((a, b) => b.valor_calculado - a.valor_calculado);

                    if (precoAlvo === 0) {
                      return (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-gray-50 rounded-xl border border-gray-100">
                          <p className="text-sm text-gray-500 font-medium">Defina sua meta no Simulador para visualizar o plano de redução.</p>
                        </div>
                      );
                    }

                    if (reducaoNecessaria <= 0) {
                      return (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-emerald-50 rounded-xl border border-emerald-100">
                          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3">
                            <CheckCircle size={24} />
                          </div>
                          <h5 className="font-black text-emerald-700 mb-1">Meta Atingida!</h5>
                          <p className="text-sm text-emerald-600/80 font-medium">O custo atual (R$ {formatCurrency(totalCusto)}) já atende à margem de {margemAlvo}% no preço de R$ {formatCurrency(precoAlvo)}.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="flex flex-col h-full overflow-hidden">
                        <div className="bg-red-50 p-5 rounded-xl border border-red-100 mb-5 shrink-0">
                          <p className="text-xs font-bold text-red-600/70 uppercase mb-2">Meta de Redução Necessária</p>
                          <div className="flex items-end gap-2 mb-2">
                            <span className="text-3xl font-black text-red-700">R$ {formatCurrency(reducaoNecessaria)}</span>
                            <span className="text-base font-bold text-red-600 mb-1">(-{reducaoPercentual.toFixed(1)}%)</span>
                          </div>
                          <p className="text-xs text-red-600/80 font-medium">O custo atual de <strong className="text-red-700">R$ {formatCurrency(totalCusto)}</strong> não atende à sua meta. Você precisa cortá-lo para chegar em <strong className="text-red-700">R$ {formatCurrency(custoAlvo)}</strong>.</p>
                        </div>

                        <h5 className="font-bold text-gray-700 text-xs mb-3 shrink-0">Onde você pode cortar (Impacto no Custo)</h5>

                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                          {matPrimasSort.length === 0 ? (
                            <p className="text-xs text-gray-400">Nenhuma matéria prima cadastrada.</p>
                          ) : (
                            matPrimasSort.map(mp => {
                              const pesoNoCusto = (mp.valor_calculado / totalCusto) * 100;
                              return (
                                <div key={mp.id} className="space-y-1">
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="font-bold text-gray-700 truncate mr-2">{mp.nome}</span>
                                    <span className="font-black text-gray-900 whitespace-nowrap">{pesoNoCusto.toFixed(1)}%</span>
                                  </div>
                                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                    <div 
                                      className="bg-orange-400 h-full rounded-full" 
                                      style={{ width: `${pesoNoCusto}%` }}
                                    ></div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ADICIONAR MATÉRIA PRIMA */}
      {modalMPOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-emerald-50">
              <h3 className="text-xl font-black text-emerald-700 flex items-center gap-2">
                <Box className="text-emerald-600" />
                Matéria Prima / Insumo
              </h3>
              <button onClick={() => setModalMPOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Nome do Produto Usado</label>
                <input type="text" name="nome" value={formDataMP.nome || ''} onChange={handleMPChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-gray-50" placeholder="Ex: Farinha de Trigo" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Unidade</label>
                  <select name="unidade" value={formDataMP.unidade || 'g'} onChange={handleMPChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-gray-50">
                    <option value="g">Gramas (g)</option>
                    <option value="ml">Mililitros (ml)</option>
                    <option value="kg">Quilos (kg)</option>
                    <option value="l">Litros (L)</option>
                    <option value="un">Unidades</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Quantidade da Embalagem</label>
                  <input type="number" name="quantidade_total" value={formDataMP.quantidade_total || ''} onChange={handleMPChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-gray-50" placeholder="Ex: 1000" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Valor da Embalagem</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">R$</span>
                    <input type="text" name="valor_total" value={formatMoneyInput(formDataMP.valor_total)} onChange={handleMPMoneyChange} className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-gray-50" placeholder="0,00" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-emerald-700 mb-2">{getLabelQuantidadeUsada()}</label>
                  <input type="number" name="quantidade_usada" value={formDataMP.quantidade_usada || ''} onChange={handleMPChange} className="w-full px-4 py-3 rounded-xl border-2 border-emerald-200 focus:outline-none focus:border-emerald-500 bg-emerald-50 text-emerald-900 font-bold" placeholder="Quanto foi usado?" />
                </div>
              </div>

              <div className="mt-4 p-4 bg-gray-100 rounded-xl flex justify-between items-center">
                <span className="text-gray-600 font-bold">Custo Calculado:</span>
                <span className="text-xl font-black text-red-600">R$ {formatCurrency(calcularMP())}</span>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-3xl">
              <button onClick={() => setModalMPOpen(false)} className="px-6 py-3 font-bold text-gray-600 hover:bg-gray-200 rounded-xl">Cancelar</button>
              <button onClick={saveMateriaPrima} className="px-6 py-3 font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm">Salvar Custo</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ADICIONAR CUSTOS ADICIONAIS */}
      {modalAdicionalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-blue-50">
              <h3 className="text-xl font-black text-blue-700 flex items-center gap-2">
                <Percent className="text-blue-600" />
                Custos Adicionais
              </h3>
              <button onClick={() => setModalAdicionalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Nome (Imposto, Comissão, etc)</label>
                <input type="text" name="nome" value={formDataAdicional.nome || ''} onChange={handleAdicionalChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-gray-50" placeholder="Ex: Imposto Simples" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Tipo de Cálculo</label>
                  <select name="tipo_adicional" value={formDataAdicional.tipo_adicional || 'percentual'} onChange={handleAdicionalChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-gray-50">
                    <option value="percentual">Percentual sobre a Venda (%)</option>
                    <option value="fixo">Valor Fixo (R$)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-primary mb-2">
                    {formDataAdicional.tipo_adicional === 'percentual' ? 'Porcentagem (%)' : 'Valor (R$)'}
                  </label>
                  <input type="number" step="0.01" name="valor_base" value={formDataAdicional.valor_base || ''} onChange={handleAdicionalChange} className="w-full px-4 py-3 rounded-xl border-2 border-blue-200 focus:outline-none focus:border-primary bg-blue-50 text-blue-900 font-bold" placeholder="0" />
                </div>
              </div>

              {formDataAdicional.tipo_adicional === 'percentual' && (
                <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  Calculando com base no preço unitário de venda: <strong className="text-gray-800">R$ {formatCurrency(selectedProduct?.preco_unitario || 0)}</strong>
                </p>
              )}

              <div className="mt-4 p-4 bg-gray-100 rounded-xl flex justify-between items-center">
                <span className="text-gray-600 font-bold">Custo Calculado:</span>
                <span className="text-xl font-black text-red-600">R$ {formatCurrency(calcularAdicional())}</span>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-3xl">
              <button onClick={() => setModalAdicionalOpen(false)} className="px-6 py-3 font-bold text-gray-600 hover:bg-gray-200 rounded-xl">Cancelar</button>
              <button onClick={saveAdicional} className="px-6 py-3 font-bold bg-primary hover:bg-blue-800 text-white rounded-xl shadow-sm">Salvar Custo Adicional</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustosTempera;
