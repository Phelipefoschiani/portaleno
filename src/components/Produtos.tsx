import React, { useState, useMemo, useEffect } from 'react';
import { useGlobalState } from '../GlobalStateContext';
import { useAuth } from '../AuthContext';
import { 
  Plus, Search, Package, TrendingUp, AlertTriangle, Edit2, 
  Trash2, X, Save, Calculator, PlusCircle, 
  ChevronRight, Info, PieChart as PieChartIcon, ArrowRight,
  Zap, Truck, BadgePercent, Target, Settings2, HelpCircle,
  Layers, Percent, DollarSign, ListPlus, ArrowUpRight,
  Beaker, Boxes
} from 'lucide-react';
import { Produto, CustoDiferenciado } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function Produtos() {
  const { user } = useAuth();
  const { produtos, addProduto, updateProduto, deleteProduto } = useGlobalState();
  const isGerente = user?.perfil === 'gerente';
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);
  
  // Builder State
  const [nome, setNome] = useState('');
  const [codigo, setCodigo] = useState('');
  const [categoria, setCategoria] = useState('');
  const [unidade, setUnidade] = useState('kg');
  const [margemPretendida, setMargemPretendida] = useState(30);
  const [precoVendaPraticado, setPrecoVendaPraticado] = useState<number>(0);
  const [custos, setCustos] = useState<CustoDiferenciado[]>([]);
  const [isCustomCategoria, setIsCustomCategoria] = useState(false);

  const uniqueCategories = useMemo(() => {
    const cats = new Set(produtos.map(p => p.categoria).filter(c => c && c.trim() !== ''));
    return Array.from(cats).sort();
  }, [produtos]);

  // Initialize modal
  const handleOpenModal = (prod?: Produto) => {
    if (prod) {
      setSelectedProduto(prod);
      setNome(prod.nome);
      setCodigo(prod.codigo || '');
      setCategoria(prod.categoria || '');
      setIsCustomCategoria(false);
      setUnidade(prod.unidade);
      setMargemPretendida(prod.margem_pretendida || 30);
      setPrecoVendaPraticado(prod.preco_base || 0);
      setCustos(prod.custos_detalhados || []);
    } else {
      setSelectedProduto(null);
      setNome('');
      setCodigo('');
      if (uniqueCategories.length > 0) {
        setCategoria(uniqueCategories[0]);
        setIsCustomCategoria(false);
      } else {
        setCategoria('');
        setIsCustomCategoria(true);
      }
      setUnidade('kg');
      setMargemPretendida(30);
      setPrecoVendaPraticado(0);
      setCustos([]);
    }
    setShowModal(true);
  };

  const addLinhaCusto = () => {
    const novo: CustoDiferenciado = {
      id: crypto.randomUUID(),
      nome: '',
      grupo: 'Materia Prima',
      tipo: 'Fixo',
      unidade_medida: 'kg',
      valor: 0,
      proporcao: 1
    };
    setCustos([...custos, novo]);
  };

  const updateLinha = (id: string, field: keyof CustoDiferenciado, value: any) => {
    setCustos(custos.map(c => {
      if (c.id === id) {
        const updated = { ...c, [field]: value };
        // Auto-switch tipo based on unidade_medida
        if (field === 'unidade_medida') {
          updated.tipo = value === '%' ? 'Variavel' : 'Fixo';
          if (value === '%') {
            updated.proporcao = 1;
            updated.base_calculo = 'Venda';
          } else {
            updated.base_calculo = undefined;
          }
        }
        return updated;
      }
      return c;
    }));
  };

  const removeLinha = (id: string) => {
    setCustos(custos.filter(c => c.id !== id));
  };

  // Math Engine
  const analysis = useMemo(() => {
    let custoDiretoBase = 0;
    let percentualSobeCusto = 0;
    let percentualSobreVenda = 0;

    custos.forEach(c => {
      if (c.tipo === 'Fixo') {
        custoDiretoBase += (c.valor * c.proporcao);
      } else if (c.unidade_medida === '%') {
        if (c.base_calculo === 'Custo') {
          percentualSobeCusto += c.valor;
        } else {
          percentualSobreVenda += c.valor;
        }
      }
    });

    const custoFinalFabrica = custoDiretoBase * (1 + percentualSobeCusto / 100);

    // Formula: Price = CustoFinalFabrica / (1 - (percentualSobreVenda + margemPretendida) / 100)
    const divisor = (1 - (percentualSobreVenda + margemPretendida) / 100);
    const precoVendaSugerido = divisor > 0 ? custoFinalFabrica / divisor : custoFinalFabrica;
    
    const lucroLiquidoReal = precoVendaPraticado - custoFinalFabrica - (precoVendaPraticado * (percentualSobreVenda / 100));
    const margemReal = precoVendaPraticado > 0 ? (lucroLiquidoReal / precoVendaPraticado) * 100 : 0;
    const impostosVariaveis = (precoVendaPraticado * (percentualSobreVenda / 100)) + (custoDiretoBase * (percentualSobeCusto / 100));

    // Dynamic Chart
    const chartData = [
      { name: 'Custo Bruto', value: custoDiretoBase, color: '#1a4332' },
      { name: 'Impostos', value: precoVendaPraticado * (percentualSobreVenda / 100), color: '#ef4444' },
      { name: 'Lucro Real', value: Math.max(0, lucroLiquidoReal), color: '#efbf04' },
    ].filter(d => d.value > 0);

    return { 
      precoVendaSugerido, 
      custoDiretoTotal: custoFinalFabrica, 
      lucroLiquidoReal, 
      margemReal,
      impostosVariaveis, 
      chartData, 
      percentualSobreVenda, 
      percentualSobeCusto 
    };
  }, [custos, margemPretendida, precoVendaPraticado]);

  const handleSave = () => {
    const finalData: Partial<Produto> = {
      nome,
      codigo,
      categoria,
      unidade,
      margem_pretendida: margemPretendida,
      custos_detalhados: custos,
      custo: analysis.custoDiretoTotal,
      preco_base: precoVendaPraticado || analysis.precoVendaSugerido,
      estoque_atual: selectedProduto?.estoque_atual || 0,
      estoque_minimo: selectedProduto?.estoque_minimo || 0,
      ativo: true
    };

    if (selectedProduto) {
      updateProduto(selectedProduto.id, finalData as Produto);
    } else {
      addProduto(finalData as Produto);
    }
    setShowModal(false);
  };

  const grupos = [
    { id: 'Materia Prima', label: 'Matéria Prima', icon: Beaker, color: 'text-emerald-600' },
    { id: 'Embalagem', label: 'Embalagem', icon: Boxes, color: 'text-amber-600' },
    { id: 'Imposto', label: 'Imposto', icon: BadgePercent, color: 'text-red-600' },
    { id: 'Comissao', label: 'Comissão', icon: DollarSign, color: 'text-blue-600' },
    { id: 'Frete', label: 'Frete', icon: Truck, color: 'text-purple-600' },
    { id: 'Trade', label: 'Trade Mkt', icon: TrendingUp, color: 'text-pink-600' },
    { id: 'Outros', label: 'Outros', icon: Settings2, color: 'text-gray-600' },
  ];

  const filteredProdutos = produtos.filter(p => 
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.codigo && p.codigo.toLowerCase().includes(searchTerm.toLowerCase())) ||
    p.categoria.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Header Estilizado */}
      <div className="bg-primary p-12 rounded-[50px] text-white shadow-3xl shadow-primary/20 relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-8">
         <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none"><Boxes size={250} /></div>
         <div className="relative z-10 space-y-3">
            <h2 className="text-4xl font-black tracking-tighter">Inventário & Engenharia</h2>
            <p className="text-accent/60 font-medium max-w-lg">Defina a estrutura de custos, grupos de despesas e precificação estratégica do Grupo ENO.</p>
         </div>
         <div className="relative z-10 flex gap-4 w-full md:w-auto">
            <div className="relative flex-1">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/30" size={18} />
              <input 
                type="text" 
                placeholder="Buscar produto..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-14 pr-6 py-5 rounded-[25px] bg-white/10 border border-white/5 outline-none placeholder:text-white/30 focus:ring-2 focus:ring-accent"
              />
            </div>
            {isGerente && (
              <button 
                onClick={() => handleOpenModal()}
                className="bg-accent text-primary px-10 py-5 rounded-[25px] font-black shadow-xl shadow-accent/20 hover:scale-105 transition-all flex items-center gap-2 whitespace-nowrap"
              >
                <PlusCircle size={20} /> Adicionar SKU
              </button>
            )}
         </div>
      </div>

      {/* Lista de Produtos */}
      <div className="bg-white rounded-[45px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-10 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Cód.</th>
                <th className="px-10 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Produto</th>
                <th className="px-10 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Categoria</th>
                <th className="px-10 py-6 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Margem/Markup</th>
                <th className="px-10 py-6 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Preço Sugerido</th>
                <th className="px-10 py-6 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredProdutos.map((produto) => (
                <tr key={produto.id} className="hover:bg-gray-50/50 transition-all group cursor-pointer" onClick={() => handleOpenModal(produto)}>
                  <td className="px-10 py-8">
                    <span className="text-xs font-black text-gray-400 font-mono">#{produto.codigo || '---'}</span>
                  </td>
                  <td className="px-10 py-8">
                    <div className="flex items-center gap-6">
                      <div className="p-4 bg-accent/20 text-primary rounded-2xl group-hover:bg-primary group-hover:text-white transition-all">
                        <Package size={22} />
                      </div>
                      <div>
                        <h3 className="font-black text-gray-800 text-lg uppercase tracking-tighter truncate max-w-[200px]">{produto.nome}</h3>
                        <p className="text-[10px] font-bold text-gray-300 uppercase">Estoque: {produto.estoque_atual} {produto.unidade}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-8">
                    <span className="text-[10px] font-black px-4 py-1.5 rounded-full bg-gray-100 text-gray-500 uppercase tracking-widest">
                      {produto.categoria}
                    </span>
                  </td>
                  <td className="px-10 py-8 text-center">
                    <div className="space-y-1">
                      <p className="text-sm font-black text-secondary">{produto.margem_pretendida || 0}%</p>
                      <p className="text-[9px] font-bold text-gray-300 uppercase italic">Markup: {((produto.preco_base / (produto.custo || 1) - 1) * 100).toFixed(0)}%</p>
                    </div>
                  </td>
                  <td className="px-10 py-8 text-right">
                    <p className="text-2xl font-black text-primary tracking-tighter">
                      R$ {produto.preco_base.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </td>
                  <td className="px-10 py-8">
                    <div className="flex justify-center gap-3">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleOpenModal(produto); }} 
                        className="flex items-center gap-2 px-4 py-2.5 bg-primary/5 text-primary hover:bg-primary hover:text-white rounded-xl transition-all font-black text-[10px] uppercase tracking-widest shadow-sm"
                      >
                        <Edit2 size={14} /> Abrir Arquiteto
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteProduto(produto.id); }} 
                        className="p-3 bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredProdutos.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-10 py-20 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-20">
                      <Search size={48} />
                      <p className="font-black uppercase tracking-widest text-xs">Nenhum produto encontrado</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Arquiteto de Preços Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/60 backdrop-blur-xl">
           <div className="bg-white rounded-[60px] shadow-4xl w-full max-w-[1400px] h-[92vh] flex flex-col overflow-hidden animate-scale-in">
              
              {/* Top Bar Modificada */}
              <div className="p-8 bg-primary text-white flex justify-between items-center relative shrink-0">
                 <div className="flex items-center gap-6 relative z-10">
                    <div className="w-12 h-12 bg-accent rounded-2xl flex items-center justify-center text-primary shadow-lg">
                      <Calculator size={24} />
                    </div>
                    <h2 className="text-2xl font-black tracking-tighter uppercase leading-none">Arquiteto de Preços</h2>
                 </div>
                 <div className="flex items-center gap-4">
                    <button 
                       onClick={handleSave}
                       className="bg-secondary text-primary px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-tighter shadow-lg hover:bg-accent transition-all flex items-center gap-2"
                    >
                       <Save size={18} /> Salvar
                    </button>
                    <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-all text-white/50 hover:text-white">
                      <X size={28} />
                    </button>
                 </div>
              </div>

              {/* Conteúdo Principal */}
              <div className="flex-1 flex flex-col xl:flex-row overflow-hidden bg-gray-50/20">
                 
                 {/* Coluna Esquerda: Formulário e Lista de Custos */}
                 <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
                    
                    {/* Identificação */}
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-end">
                       <div className="xl:col-span-2 space-y-4">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Cód. SKU</label>
                          <input 
                            value={codigo}
                            onChange={(e) => setCodigo(e.target.value)}
                            placeholder="#000"
                            className="w-full px-8 py-5 rounded-[25px] border-none shadow-sm focus:ring-2 focus:ring-primary/5 text-lg font-black text-gray-800 outline-none bg-white"
                          />
                       </div>
                       <div className="xl:col-span-4 space-y-4">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nome do Produto</label>
                          <input 
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                            placeholder="Ex: Mandioca Branca 1kg"
                            className="w-full px-8 py-5 rounded-[25px] border-none shadow-sm focus:ring-2 focus:ring-primary/5 text-lg font-black text-gray-800 outline-none bg-white"
                          />
                       </div>
                       <div className="xl:col-span-3 space-y-4">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Categoria</label>
                          <div className="relative">
                            {isCustomCategoria ? (
                              <div className="flex gap-2 relative">
                                <input 
                                  autoFocus
                                  value={categoria}
                                  onChange={(e) => setCategoria(e.target.value)}
                                  placeholder="Nova Categoria..."
                                  className="w-full px-6 py-5 rounded-[25px] border-none shadow-sm focus:ring-2 focus:ring-primary/5 text-sm font-bold text-gray-800 outline-none bg-white"
                                />
                                <button 
                                  type="button" 
                                  onClick={() => { setIsCustomCategoria(false); setCategoria(uniqueCategories[0] || ''); }}
                                  className="absolute right-2 top-0 bottom-0 px-4 text-gray-400 hover:text-red-500 transition-colors"
                                >
                                  <X size={18} />
                                </button>
                              </div>
                            ) : (
                              <select 
                                value={categoria} 
                                onChange={(e) => {
                                  if (e.target.value === 'NOVA_CATEGORIA') {
                                    setIsCustomCategoria(true);
                                    setCategoria('');
                                  } else {
                                    setCategoria(e.target.value);
                                  }
                                }} 
                                className="w-full px-6 py-5 rounded-[25px] border-none shadow-sm font-bold text-sm text-gray-600 outline-none appearance-none bg-white cursor-pointer select-none"
                              >
                                {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                <option disabled>──────</option>
                                <option value="NOVA_CATEGORIA" className="font-bold text-primary">+ Nova Categoria...</option>
                              </select>
                            )}
                          </div>
                       </div>
                       <div className="xl:col-span-3 space-y-4">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Unidade</label>
                          <select value={unidade} onChange={(e) => setUnidade(e.target.value)} className="w-full px-6 py-5 rounded-[25px] border-none shadow-sm font-bold text-sm text-gray-600 outline-none appearance-none bg-white">
                             <option>kg</option>
                             <option>un</option>
                             <option>cx</option>
                             <option>pct</option>
                          </select>
                       </div>
                    </div>

                    {/* Bancada de Custos */}
                    <div className="space-y-8">
                       <div className="flex justify-between items-center px-4">
                          <h3 className="text-xl font-black text-gray-800 tracking-tighter flex items-center gap-3">
                             <ListPlus size={24} className="text-primary" /> Engenharia de Custos
                          </h3>
                          <button 
                            onClick={addLinhaCusto}
                            className="bg-primary text-white px-8 py-4 rounded-[20px] font-black text-[10px] uppercase tracking-widest hover:bg-secondary transition-all flex items-center gap-2"
                          >
                             <Plus size={16} /> Adicionar Insumo/Custo
                          </button>
                       </div>

                       <div className="space-y-4">
                          {custos.map((line, idx) => (
                             <div key={line.id} className="bg-white p-6 lg:p-8 rounded-[40px] shadow-sm border border-gray-100 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8 items-center group">
                                
                                {/* Grupo */}
                                <div className="col-span-1 lg:col-span-3 space-y-2">
                                   <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Grupo</label>
                                   <div className="relative">
                                      <select 
                                         value={line.grupo}
                                         onChange={(e) => updateLinha(line.id, 'grupo', e.target.value)}
                                         className="w-full bg-gray-50 px-5 py-4 rounded-2xl font-black text-xs text-gray-600 outline-none appearance-none border-none"
                                      >
                                         {grupos.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                                      </select>
                                      {(() => {
                                         const g = grupos.find(item => item.id === line.grupo);
                                         const Icon = g?.icon || Settings2;
                                         return <Icon size={14} className={`absolute right-4 top-1/2 -translate-y-1/2 ${g?.color || 'text-gray-400'}`} />;
                                      })()}
                                   </div>
                                </div>

                                {/* Descrição */}
                                <div className="col-span-1 lg:col-span-3 space-y-2">
                                   <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Descrição</label>
                                   <input 
                                      value={line.nome}
                                      onChange={(e) => updateLinha(line.id, 'nome', e.target.value)}
                                      placeholder="Ex: Mandioca Branca..."
                                      className="w-full bg-transparent border-b-2 border-gray-50 focus:border-primary/10 py-3 font-bold text-gray-800 outline-none"
                                   />
                                </div>

                                {/* Valor e Medida */}
                                <div className="col-span-1 lg:col-span-3 grid grid-cols-2 gap-4">
                                   <div className="space-y-2">
                                      <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Medida</label>
                                      <select 
                                         value={line.unidade_medida}
                                         onChange={(e) => updateLinha(line.id, 'unidade_medida', e.target.value)}
                                         className="w-full bg-gray-50 px-4 py-4 rounded-2xl font-black text-xs text-gray-600 outline-none appearance-none border-none"
                                      >
                                         <option value="kg">kg</option>
                                         <option value="und">un</option>
                                         <option value="lt">lt</option>
                                         <option value="g">g</option>
                                         <option value="%">% s/ Venda</option>
                                      </select>
                                   </div>
                                   <div className="space-y-2">
                                      <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Valor Unit.</label>
                                      <input 
                                         type="number"
                                         value={line.valor}
                                         onChange={(e) => updateLinha(line.id, 'valor', Number(e.target.value))}
                                         className="w-full bg-gray-50 px-4 py-4 rounded-2xl font-black text-xs text-primary border-none outline-none"
                                      />
                                   </div>
                                </div>

                                {/* Proporção ou Base de Cálculo */}
                                <div className="col-span-1 lg:col-span-2 space-y-2">
                                   {line.unidade_medida !== '%' ? (
                                     <>
                                       <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Quantidade</label>
                                       <div className="flex items-center gap-3">
                                          <input 
                                             type="number"
                                             value={line.proporcao}
                                             onChange={(e) => updateLinha(line.id, 'proporcao', Number(e.target.value))}
                                             className="w-full bg-gray-50 px-4 py-4 rounded-2xl font-black text-xs text-gray-800 border-none outline-none"
                                          />
                                          <div className="text-right shrink-0 min-w-[70px]">
                                             <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Total</p>
                                             <p className="text-xs font-black text-primary">R$ {(line.valor * line.proporcao).toFixed(2)}</p>
                                          </div>
                                       </div>
                                     </>
                                   ) : (
                                     <div className="space-y-2">
                                        <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Incide sobre</label>
                                        <select 
                                          value={line.base_calculo}
                                          onChange={(e) => updateLinha(line.id, 'base_calculo', e.target.value)}
                                          className="w-full bg-gray-50 px-4 py-4 rounded-2xl font-black text-[10px] text-secondary border-none outline-none appearance-none"
                                        >
                                           <option value="Venda">Preço Venda</option>
                                           <option value="Custo">Preço Custo</option>
                                        </select>
                                     </div>
                                   )}
                                </div>

                                <div className="col-span-1 text-right">
                                   <button onClick={() => removeLinha(line.id)} className="p-2 lg:p-4 text-gray-200 hover:text-danger hover:bg-red-50 rounded-2xl transition-all">
                                     <Trash2 size={20} />
                                   </button>
                                </div>
                             </div>
                          ))}
                          {custos.length === 0 && (
                            <div className="py-20 text-center space-y-6 bg-white rounded-[50px] border-2 border-dashed border-gray-100">
                               <div className="inline-flex p-6 bg-gray-50 text-gray-300 rounded-full">
                                 <Beaker size={48} />
                               </div>
                               <div className="space-y-1">
                                  <p className="font-black text-gray-400 uppercase text-xs tracking-widest">A estrutura está vazia</p>
                                  <p className="text-sm font-medium text-gray-300">Comece a adicionar os custos diretos da receita.</p>
                               </div>
                            </div>
                          )}
                       </div>
                    </div>
                 </div>

                  {/* Coluna Direita: Dashboard e Resultados */}
                  <div className="w-full xl:w-[320px] 2xl:w-[420px] bg-white border-t xl:border-t-0 xl:border-l border-gray-100 p-8 flex flex-col gap-8 shrink-0 overflow-y-auto custom-scrollbar">
                     
                     {/* PREÇO DE VENDA PRATICADO */}
                     <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Preço de Venda Praticado</label>
                        <div className="group relative">
                           <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-primary/40 font-black text-lg">R$</div>
                           <input 
                              type="number"
                              value={precoVendaPraticado}
                              onChange={(e) => setPrecoVendaPraticado(Number(e.target.value))}
                              className="w-full pl-16 pr-8 py-6 rounded-[35px] bg-primary/5 border-2 border-primary/10 text-3xl font-black text-primary outline-none focus:border-primary/30 transition-all text-center"
                              placeholder="0,00"
                           />
                           <div className="absolute -top-3 right-6 bg-accent text-primary px-3 py-1 rounded-full text-[8px] font-black uppercase shadow-sm">
                              Valor de Gôndola
                           </div>
                        </div>
                        <div className="flex justify-between items-center px-4">
                           <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Sugestão pelo Alvo:</p>
                           <p className="text-xs font-black text-gray-400">R$ {analysis.precoVendaSugerido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                     </div>

                     {/* RESULTADO REAL (Dashboard Card) */}
                     <div className={`w-full p-8 rounded-[40px] text-white relative overflow-hidden transition-all duration-500 min-h-[180px] flex flex-col items-center justify-center ${analysis.lucroLiquidoReal > 0 ? 'bg-primary shadow-2xl shadow-primary/20' : 'bg-red-500 shadow-2xl shadow-red-500/20'}`}>
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transform translate-x-1/4 -translate-y-1/4">
                           <DollarSign size={120} />
                        </div>
                        <div className="relative z-10 text-center flex flex-col items-center">
                           <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Lucro Líquido Real</p>
                           <h2 className="text-4xl font-black tracking-tighter mb-4">R$ {analysis.lucroLiquidoReal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
                           <div className="inline-flex px-5 py-1.5 bg-white/20 rounded-full border border-white/20 text-sm font-black italic">
                              {analysis.margemReal.toFixed(1)}% de Margem
                           </div>
                        </div>
                     </div>

                     {/* Alvo de Rentabilidade (Slider) */}
                     <div className="bg-gray-50/50 p-6 rounded-[35px] border border-gray-100 space-y-4">
                        <div className="flex justify-between items-center px-2">
                           <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Meta Desejada</h4>
                           <span className="text-lg font-black text-secondary">{margemPretendida}%</span>
                        </div>
                        <input 
                          type="range" min="1" max="80" 
                          value={margemPretendida}
                          onChange={(e) => setMargemPretendida(Number(e.target.value))}
                          className="w-full h-1.5 bg-white rounded-full appearance-none cursor-pointer accent-secondary border border-gray-100"
                        />
                     </div>

                     {/* Outros Indicadores */}
                     <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-3">
                           <div className="p-6 bg-gray-50/30 rounded-[35px] border border-gray-100 text-center space-y-1">
                              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Custo Produção</p>
                              <p className="text-xl font-black text-gray-800 tracking-tighter">R$ {analysis.custoDiretoTotal.toFixed(2)}</p>
                           </div>
                           <div className="p-6 bg-gray-50/30 rounded-[35px] border border-gray-100 text-center space-y-1">
                              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Impostos/Taxas</p>
                              <p className="text-xl font-black text-gray-800 tracking-tighter">{analysis.percentualSobreVenda + analysis.percentualSobeCusto}%</p>
                           </div>
                        </div>

                        {/* Chart */}
                        <div className="bg-white p-6 rounded-[35px] border border-gray-100 shadow-sm space-y-4">
                           <h5 className="text-[9px] font-black text-gray-300 uppercase tracking-widest text-center">Distribuição do Preço</h5>
                           <div className="h-32 w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                 <BarChart data={analysis.chartData} layout="vertical" margin={{ left: -10, right: 30 }}>
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 8, fontWeight: 900, fill: '#cbd5e1'}} width={80} />
                                    <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={16}>
                                       {analysis.chartData.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={entry.color} />
                                       ))}
                                    </Bar>
                                 </BarChart>
                              </ResponsiveContainer>
                           </div>
                        </div>

                        <div className="p-5 bg-accent/10 rounded-[30px] flex gap-4 border border-accent/20">
                           <div className="p-2.5 bg-accent text-primary rounded-xl shrink-0 h-fit"><Info size={14} /></div>
                           <p className="text-[9px] font-medium text-primary/70 leading-relaxed italic">
                              A cada real vendido, {(analysis.margemReal/100).toFixed(2)} centavos sobram líquidos no seu caixa.
                           </p>
                        </div>
                     </div>
                  </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
