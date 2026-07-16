import { formatCurrency } from "../types";
import React, { useState, useMemo } from 'react';
import {  useGlobalState } from '../GlobalStateContext';
import {  Produto, CustoDiferenciado } from '../types';
import {  Search, Plus, Edit2, X, Package, Trash2, PieChart, DollarSign, Calculator, ChevronDown, FileText, BarChart2 } from 'lucide-react';

const DEFAULT_CUSTO_GRUPOS = ['Matéria Prima', 'Insumos', 'Impostos', 'Comissão', 'Frete', 'Embalagem', 'Outros'];

const MultiSelect = ({ options, selected, onChange, placeholder, getLabel }: { 
  options: any[]; selected: any[]; onChange: (v: any[]) => void; placeholder: string; getLabel?: (v: any) => string 
}) => {
  const [open, setOpen] = useState(false);
  const toggle = (val: any) => {
     if (selected.includes(val)) onChange(selected.filter(v => v !== val));
     else onChange([...selected, val]);
  };
  const toggleAll = () => {
     if (selected.length === options.length) onChange([]);
     else onChange(options);
  };
  return (
    <div className="relative w-full">
      <div 
        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 cursor-pointer flex justify-between items-center" 
        onClick={() => setOpen(!open)}
      >
         <span className="truncate">{selected.length === 0 ? placeholder : selected.length === options.length ? 'Todos Selecionados' : `${selected.length} selecionados`}</span>
         <ChevronDown size={16} />
      </div>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)}></div>
          <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl z-20 max-h-48 overflow-y-auto">
            <label className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
              <input type="checkbox" checked={selected.length === options.length && options.length > 0} onChange={toggleAll} className="mr-2 rounded text-primary focus:ring-primary" />
              <span className="text-sm font-black text-primary">Selecionar Todos</span>
            </label>
            {options.map((opt, i) => (
              <label key={i} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} className="mr-2 rounded text-primary focus:ring-primary" />
                <span className="text-sm font-medium">{getLabel ? getLabel(opt) : opt}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
};


const Produtos: React.FC<{ empresa?: string }> = ({ empresa }) => {
  const { produtos, pedidos, producao, addProduto, updateProduto, deleteProduto } = useGlobalState();
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);
  const [deleteConf, setDeleteConf] = useState<string | null>(null);

  // Derive dynamic groups
  const availableGroups = useMemo(() => {
    const groups = new Set(DEFAULT_CUSTO_GRUPOS);
    produtos.forEach(p => {
      if (p.custos_detalhados) {
        p.custos_detalhados.forEach(c => {
          if (c.grupo === 'Outros' && c.nome && c.nome !== 'Outros') {
            groups.add(c.nome);
          }
        });
      }
    });
    return Array.from(groups);
  }, [produtos]);

  // Form
  const [formData, setFormData] = useState<Partial<Produto>>({
    codigo: '', nome: '', unidade: 'kg', quantidade_unidade: 1, preco_base: 0, categoria: 'Geral', ativo: true
  });

  const [custos, setCustos] = useState<CustoDiferenciado[]>([]);
  const [novoCustoGrupo, setNovoCustoGrupo] = useState('Matéria Prima');
  const [custoDetail, setCustoDetail] = useState({
    nome: '', valorKg: '',
    undCompra: 'kg', qtdCompra: '', valorCompra: '',
    undUso: 'g', qtdUso: '',
    perc: '',
    tipoEmbalagem: 'Unitário', valorEmbalagem: '', qtdEmbalagem: '',
    undOutro: 'un', valorUndOutro: '', utilOutro: ''
  });

  const getMultiplicador = (u: string) => {
    if (u === 'g' || u === 'ml') return 1;
    if (u === 'kg' || u === 'l' || u === 'L') return 1000;
    return 1;
  };

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportType, setReportType] = useState<'Vendido' | 'Produzido'>('Vendido');
  const [reportSelectedProducts, setReportSelectedProducts] = useState<string[]>([]);
  const [reportSelectedYears, setReportSelectedYears] = useState<string[]>([]);
  const [reportSelectedMonths, setReportSelectedMonths] = useState<string[]>([]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    pedidos.forEach(p => { if (p.data) years.add(p.data.split('-')[0]); });
    producao.forEach(p => { if (p.data) years.add(p.data.split('-')[0]); });
    return Array.from(years).sort().reverse();
  }, [pedidos, producao]);
  
  const availableMonths = ['01','02','03','04','05','06','07','08','09','10','11','12'];
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const getMonthName = (m: string) => monthNames[parseInt(m) - 1];

  const generateReport = () => {
     let filteredProducts = produtos;
     if (reportSelectedProducts.length > 0) {
        filteredProducts = produtos.filter(p => reportSelectedProducts.includes(p.id));
     }

     if (reportType === 'Vendido') {
         // Vendido MOSTRA TOTAL FATURADO, KG VENDIDOS DE CADA PRODUTO, MARGEM BRUTA DE CADA, E CLIENTES ATENDEIDOS
         let totalFaturado = 0;
         let clientesAtendidos = new Set<string>();
         
         const byProduct: Record<string, { faturado: number; kgVendidos: number; custoTotal: number }> = {};
         
         filteredProducts.forEach(p => {
             byProduct[p.id] = { faturado: 0, kgVendidos: 0, custoTotal: 0 };
         });

         pedidos.forEach(pedido => {
             if (pedido.status === 'Cancelado') return;
             if (!pedido.data) return;
             const ano = pedido.data.split('-')[0];
             const mes = pedido.data.split('-')[1];
             if (reportSelectedYears.length > 0 && !reportSelectedYears.includes(ano)) return;
             if (reportSelectedMonths.length > 0 && !reportSelectedMonths.includes(mes)) return;

             let hasRelevantProduct = false;
             pedido.items.forEach(item => {
                 if (reportSelectedProducts.length === 0 || reportSelectedProducts.includes(item.produto_id)) {
                     const prod = produtos.find(p => p.id === item.produto_id);
                     if (prod) {
                        hasRelevantProduct = true;
                        const val = item.preco * item.quantidade;
                        totalFaturado += val;
                        
                        let qtyKg = item.quantidade;
                        if (prod.unidade === 'g') qtyKg = (item.quantidade * (prod.quantidade_unidade || 1)) / 1000;
                        else if (prod.unidade === 'kg') qtyKg = item.quantidade * (prod.quantidade_unidade || 1);
                        else qtyKg = item.quantidade; // fallback
                        
                        if (!byProduct[item.produto_id]) {
                           byProduct[item.produto_id] = { faturado: 0, kgVendidos: 0, custoTotal: 0 };
                        }
                        byProduct[item.produto_id].faturado += val;
                        byProduct[item.produto_id].kgVendidos += qtyKg;
                        byProduct[item.produto_id].custoTotal += (prod.custo || 0) * item.quantidade;
                     }
                 }
             });
             
             if (hasRelevantProduct) {
                 clientesAtendidos.add(pedido.cliente_id);
             }
         });

         return {
             type: 'Vendido',
             totalFaturado,
             totalClientes: clientesAtendidos.size,
             byProduct: Object.entries(byProduct).map(([id, data]) => {
                 const p = produtos.find(p => p.id === id);
                 const margemBruta = data.faturado > 0 ? ((data.faturado - data.custoTotal) / data.faturado) * 100 : 0;
                 return {
                     nome: p?.nome || 'Desconhecido',
                     faturado: data.faturado,
                     kgVendidos: data.kgVendidos,
                     margemBruta
                 };
             }).filter(x => x.kgVendidos > 0)
         };
     } else {
         // Produzido MOSTRA INSUMOS UTILIZADOS TOTAL DE TODOS OS CUSTOS SABE,TOTAL PRODUZIDO, TOTAL DE CUSTO QUE DEU, TOTAL DE MATERIA PRIMA USADA, A MARGEM MEDIA QUE DEU SOMANDO TUDO SABE
         let totalProduzido = 0;
         let totalCusto = 0;
         let totalMateriaPrima = 0;
         let totalValorVendaEsperado = 0;

         producao.forEach(prod => {
             if (!prod.data) return;
             const ano = prod.data.split('-')[0];
             const mes = prod.data.split('-')[1];
             if (reportSelectedYears.length > 0 && !reportSelectedYears.includes(ano)) return;
             if (reportSelectedMonths.length > 0 && !reportSelectedMonths.includes(mes)) return;
             
             if (reportSelectedProducts.length === 0 || reportSelectedProducts.includes(prod.produto_id)) {
                 const p = produtos.find(x => x.id === prod.produto_id);
                 if (p) {
                     totalProduzido += prod.quantidade_produzida;
                     totalCusto += prod.custo_lote || 0;
                     totalMateriaPrima += prod.quantidade_materia_prima || 0;
                     totalValorVendaEsperado += (p.preco_base || 0) * prod.quantidade_produzida;
                 }
             }
         });
         
         const margemMedia = totalValorVendaEsperado > 0 ? ((totalValorVendaEsperado - totalCusto) / totalValorVendaEsperado) * 100 : 0;

         return {
             type: 'Produzido',
             totalProduzido,
             totalCusto,
             totalMateriaPrima,
             margemMedia
         };
     }
  };

  const currentReport = useMemo(() => generateReport(), [reportType, reportSelectedProducts, reportSelectedYears, reportSelectedMonths, pedidos, producao, produtos]);

  if (empresa !== 'estancia') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-white rounded-3xl border border-gray-100 shadow-sm p-8 text-center">
        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
          <Package size={40} className="text-gray-300" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-2">Empresa em Configuração</h2>
        <p className="text-gray-500 max-w-md font-medium">
          O painel de Produtos está disponível apenas para a Estância Nova Olinda.
        </p>
      </div>
    );
  }

  const filteredProdutos = useMemo(() => {
    if (!searchTerm) return produtos;
    const lower = searchTerm.toLowerCase();
    return produtos.filter(p => 
      p.nome.toLowerCase().includes(lower) || (p.codigo && p.codigo.toLowerCase().includes(lower))
    );
  }, [produtos, searchTerm]);

  const custoTotal = useMemo(() => {
    const pVenda = Number(formData.preco_base) || 0;
    return custos.reduce((acc, curr) => {
      if (curr.tipo === 'Variavel') {
        return acc + (pVenda * (curr.proporcao || 0) / 100);
      }
      return acc + curr.valor;
    }, 0);
  }, [custos, formData.preco_base]);

  const margemBruta = useMemo(() => {
    const pVenda = Number(formData.preco_base) || 0;
    if (pVenda > 0) {
      return ((pVenda - custoTotal) / pVenda) * 100;
    }
    return 0;
  }, [formData.preco_base, custoTotal]);

  const valorBruto = useMemo(() => {
    const pVenda = Number(formData.preco_base) || 0;
    return pVenda - custoTotal;
  }, [formData.preco_base, custoTotal]);

  const previewCusto = useMemo(() => {
    let valor = 0;
    let tipo: 'Fixo' | 'Variavel' = 'Fixo';
    let proporcao = 1;
    let grupo = novoCustoGrupo;

    if (grupo === 'Matéria Prima') {
        const perKg = Number(custoDetail.valorKg) || 0;
        let usedKg = Number(formData.quantidade_unidade) || 0;
        if (formData.unidade === 'g') usedKg = usedKg / 1000;
        valor = perKg * usedKg;
    } else if (grupo === 'Insumos') {
        const vC = Number(custoDetail.valorCompra) || 0;
        const qC = Number(custoDetail.qtdCompra) || 1;
        const qU = Number(custoDetail.qtdUso) || 0;
        const mC = getMultiplicador(custoDetail.undCompra);
        const mU = getMultiplicador(custoDetail.undUso);
        const costPerUnit = qC * mC > 0 ? (vC / (qC * mC)) : 0;
        valor = costPerUnit * (qU * mU);
    } else if (grupo === 'Impostos' || grupo === 'Comissão' || grupo === 'Frete') {
        tipo = 'Variavel';
        proporcao = Number(custoDetail.perc) || 0;
        valor = Number(formData.preco_base || 0) * (proporcao / 100);
    } else if (grupo === 'Embalagem') {
        const vE = Number(custoDetail.valorEmbalagem) || 0;
        if (custoDetail.tipoEmbalagem === 'Fardo' || custoDetail.tipoEmbalagem === 'Caixa') {
            const qE = Number(custoDetail.qtdEmbalagem) || 1;
            valor = qE > 0 ? vE / qE : 0;
        } else {
            valor = vE;
        }
    } else {
        const vUnd = Number(custoDetail.valorUndOutro) || 0;
        const uti = Number(custoDetail.utilOutro) || 1;
        valor = vUnd * uti;
    }

    return { valor, tipo, proporcao };
  }, [novoCustoGrupo, custoDetail, formData.quantidade_unidade, formData.unidade, formData.preco_base]);

  const handleOpenForm = (p?: Produto) => {
    if (p) {
      setEditingProduto(p);
      setFormData(p);
      setCustos(p.custos_detalhados || []);
    } else {
      setEditingProduto(null);
      setFormData({
        codigo: '', nome: '', unidade: 'kg', quantidade_unidade: 1, preco_base: 0, categoria: 'Geral', ativo: true
      });
      setCustos([]);
    }
    setDeleteConf(null);
    setIsModalOpen(true);
  };

  const handleAddCusto = () => {
    let grupo = novoCustoGrupo;
    let nome = novoCustoGrupo;
    let valor = 0;
    let tipo: 'Fixo' | 'Variavel' = 'Fixo';
    let proporcao = 1;
    
    if (grupo === 'Matéria Prima') {
        const perKg = Number(custoDetail.valorKg) || 0;
        let usedKg = Number(formData.quantidade_unidade) || 0;
        if (formData.unidade === 'g') usedKg = usedKg / 1000;
        valor = perKg * usedKg;
    } else if (grupo === 'Insumos') {
        nome = custoDetail.nome || 'Insumo';
        const vC = Number(custoDetail.valorCompra) || 0;
        const qC = Number(custoDetail.qtdCompra) || 1;
        const qU = Number(custoDetail.qtdUso) || 0;
        const mC = getMultiplicador(custoDetail.undCompra);
        const mU = getMultiplicador(custoDetail.undUso);
        const costPerUnit = qC * mC > 0 ? (vC / (qC * mC)) : 0;
        valor = costPerUnit * (qU * mU);
    } else if (grupo === 'Impostos') {
        nome = custoDetail.nome || 'Imposto';
        tipo = 'Variavel';
        proporcao = Number(custoDetail.perc) || 0;
    } else if (grupo === 'Comissão') {
        tipo = 'Variavel';
        proporcao = Number(custoDetail.perc) || 0;
    } else if (grupo === 'Frete') {
        tipo = 'Variavel';
        proporcao = Number(custoDetail.perc) || 0;
    } else if (grupo === 'Embalagem') {
        nome = custoDetail.nome || 'Embalagem';
        const vE = Number(custoDetail.valorEmbalagem) || 0;
        if (custoDetail.tipoEmbalagem === 'Fardo' || custoDetail.tipoEmbalagem === 'Caixa') {
            const qE = Number(custoDetail.qtdEmbalagem) || 1;
            valor = qE > 0 ? vE / qE : 0;
        } else {
            valor = vE;
        }
    } else {
        nome = custoDetail.nome || (grupo === 'Outros' ? 'Outro Custo' : grupo);
        const vUnd = Number(custoDetail.valorUndOutro) || 0;
        const uti = Number(custoDetail.utilOutro) || 1;
        valor = vUnd * uti;
    }

    if (tipo === 'Fixo' && valor <= 0) return;
    if (tipo === 'Variavel' && proporcao <= 0) return;
    
    let isCustom = !DEFAULT_CUSTO_GRUPOS.includes(grupo) || grupo === 'Outros';
    let mappedGroup: any = isCustom ? 'Outros' : grupo;
    if (mappedGroup === 'Matéria Prima') mappedGroup = 'Materia Prima';
    if (mappedGroup === 'Comissão') mappedGroup = 'Comissao';
    if (mappedGroup === 'Impostos') mappedGroup = 'Imposto';
    
    const computedVal = tipo === 'Variavel' ? (Number(formData.preco_base || 0) * (proporcao / 100)) : valor;

    const novo: CustoDiferenciado = {
      id: `custo_${Date.now()}_${Math.random()}`,
      nome,
      grupo: mappedGroup,
      tipo,
      unidade_medida: 'und',
      valor: computedVal,
      proporcao
    };

    setCustos([...custos, novo]);
    setCustoDetail({
        nome: '', valorKg: '', undCompra: 'kg', qtdCompra: '', valorCompra: '',
        undUso: 'g', qtdUso: '', perc: '', tipoEmbalagem: 'Unitário', valorEmbalagem: '', qtdEmbalagem: '',
        undOutro: 'un', valorUndOutro: '', utilOutro: ''
    });
  };

  const handleRemoveCusto = (id: string) => {
    setCustos(custos.filter(c => c.id !== id));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome) return;

    const saveObj = {
      ...formData,
      preco_base: Number(formData.preco_base),
      quantidade_unidade: Number(formData.quantidade_unidade),
      custo: custoTotal,
      custos_detalhados: custos,
      margem_pretendida: margemBruta,
      ativo: true
    } as Produto;

    if (editingProduto) {
      updateProduto(editingProduto.id, saveObj);
    } else {
      // fill missing
      if (!saveObj.estoque_atual) saveObj.estoque_atual = 0;
      if (!saveObj.estoque_minimo) saveObj.estoque_minimo = 0;
      addProduto(saveObj);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Produtos</h2>
          <p className="text-sm font-medium text-gray-500">Gestão de catálogo e composição de custos</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar protudo..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 focus:border-primary rounded-xl outline-none text-sm font-bold text-gray-700 transition-all"
            />
          </div>
          <button 
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-white border border-gray-200 text-gray-700 font-black text-sm uppercase tracking-widest rounded-xl hover:bg-gray-50 transition-all shadow-sm flex-shrink-0"
          >
            <BarChart2 size={18} /> <span className="hidden sm:inline">Relatório</span>
          </button>
          <button 
            onClick={() => handleOpenForm()}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-primary text-white font-black text-sm uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all shadow-lg flex-shrink-0"
          >
            <Plus size={18} /> <span className="hidden sm:inline">Novo Produto</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
          <Package size={20} className="text-primary" />
          <h3 className="font-bold text-primary uppercase text-xs tracking-widest">Base de Produtos</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <th className="px-6 py-4">Cód.</th>
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4 text-center">Unidade</th>
                <th className="px-6 py-4 text-right">Preço Venda</th>
                <th className="px-6 py-4 text-right">Custo Total</th>
                <th className="px-6 py-4 text-right">Margem</th>
                <th className="px-6 py-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredProdutos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400 font-medium">Nenhum produto cadastrado.</td>
                </tr>
              ) : (
                filteredProdutos.map(p => {
                  const mrg = p.preco_base > 0 ? ((p.preco_base - p.custo) / p.preco_base) * 100 : 0;
                  return (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors text-sm font-medium text-gray-800">
                    <td className="px-6 py-4 font-bold text-gray-500">{p.codigo || '-'}</td>
                    <td className="px-6 py-4 font-bold text-gray-900">{p.nome}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-md text-[10px] font-bold uppercase">{p.quantidade_unidade} {p.unidade}</span>
                    </td>
                    <td className="px-6 py-4 text-right font-black text-gray-900">R$ {formatCurrency(p.preco_base)}</td>
                    <td className="px-6 py-4 text-right font-black text-red-500">R$ {formatCurrency(p.custo)}</td>
                    <td className="px-6 py-4 text-right font-black text-primary">{mrg.toFixed(1)}%</td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleOpenForm(p)}
                        className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-primary hover:text-white transition-all shadow-sm"
                      >
                        <Edit2 size={18} />
                      </button>
                    </td>
                  </tr>
                )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-primary/40 backdrop-blur-sm">
           <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col scale-in">
              
              <div className="p-8 bg-primary text-white flex justify-between items-center shrink-0">
                 <div>
                    <h2 className="text-2xl font-black tracking-tight">{editingProduto ? 'Editar Produto' : 'Novo Produto'}</h2>
                    <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mt-1">Dados, Unidades e Composição de Custos</p>
                 </div>
                 <button onClick={() => setIsModalOpen(false)} className="hover:rotate-90 transition-all text-white/60 hover:text-white">
                   <X size={24} />
                 </button>
              </div>

              <div className="flex-1 flex overflow-hidden">
                 <div className="flex-1 overflow-y-auto bg-gray-50 p-6 flex flex-col gap-6 w-2/3">
                    
                    <form id="prod-form" onSubmit={handleSave} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="col-span-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Código</label>
                          <input type="text" value={formData.codigo || ''} onChange={e => setFormData({...formData, codigo: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none hover:border-gray-300 focus:border-primary transition-all" />
                        </div>
                        <div className="col-span-1 md:col-span-3">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Nome do Produto <span className="text-red-500">*</span></label>
                          <input required type="text" value={formData.nome || ''} onChange={e => setFormData({...formData, nome: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none hover:border-gray-300 focus:border-primary transition-all" />
                        </div>
                        
                        <div className="col-span-1 border-t border-gray-100 pt-4 mt-2">
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Unidade</label>
                           <select value={formData.unidade} onChange={e => setFormData({...formData, unidade: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none hover:border-gray-300 focus:border-primary transition-all">
                             <option value="kg">KG</option>
                             <option value="g">Grama (g)</option>
                             <option value="un">Unidade (un)</option>
                             <option value="cx">Caixa (cx)</option>
                           </select>
                        </div>
                        <div className="col-span-1 border-t border-gray-100 pt-4 mt-2">
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Quantidade ({formData.unidade})</label>
                           <input type="number" step="any" value={formData.quantidade_unidade} onChange={e => setFormData({...formData, quantidade_unidade: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none hover:border-gray-300 focus:border-primary transition-all" />
                        </div>
                        <div className="col-span-2 border-t border-gray-100 pt-4 mt-2">
                           <label className="text-[10px] font-black text-primary/70 uppercase tracking-widest mb-1 block">Preço de Venda (R$) <span className="text-red-500">*</span></label>
                           <input 
                             required 
                             type="text" 
                             value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(formData.preco_base) || 0)} 
                             onChange={e => {
                               const rawValue = e.target.value.replace(/\D/g, '');
                               const numValue = Number(rawValue) / 100;
                               setFormData({...formData, preco_base: numValue});
                             }} 
                             className="w-full bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 text-lg font-black text-primary outline-none focus:border-primary transition-all" 
                           />
                        </div>
                      </div>
                    </form>

                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                       <div className="flex items-center gap-2 mb-4">
                         <DollarSign size={20} className="text-orange-500" />
                         <h3 className="font-bold text-gray-900 uppercase text-xs tracking-widest">Adicionar Custos</h3>
                       </div>
                       
                       <div className="flex flex-wrap items-end gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-200">
                          <div className="min-w-[150px] flex-1">
                             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Tipo de Custo</label>
                             <select 
                                value={novoCustoGrupo} 
                                onChange={e => {
                                   const val = e.target.value;
                                   setNovoCustoGrupo(val);
                                   if (val !== 'Outros' && !['Matéria Prima', 'Insumos', 'Impostos', 'Comissão', 'Frete', 'Embalagem'].includes(val)) {
                                      setCustoDetail(prev => ({ ...prev, nome: val }));
                                   } else {
                                      setCustoDetail(prev => ({ ...prev, nome: '' }));
                                   }
                                }} 
                                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none focus:border-primary"
                             >
                                {availableGroups.map(g => <option key={g} value={g}>{g}</option>)}
                             </select>
                          </div>
                          
                          {novoCustoGrupo === 'Matéria Prima' && (
                            <div className="w-32">
                               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Valor KG (R$)</label>
                               <input type="number" step="0.01" value={custoDetail.valorKg} onChange={e => setCustoDetail({...custoDetail, valorKg: e.target.value})} className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none focus:border-primary" placeholder="0.00" />
                            </div>
                          )}

                          {novoCustoGrupo === 'Insumos' && (
                            <>
                               <div className="min-w-[150px] flex-1">
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Nome</label>
                                  <input type="text" value={custoDetail.nome} onChange={e => setCustoDetail({...custoDetail, nome: e.target.value})} className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none focus:border-primary" placeholder="Ex: Sal" />
                               </div>
                               <div className="w-20"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Und</label><select value={custoDetail.undCompra} onChange={e => setCustoDetail({...custoDetail, undCompra: e.target.value})} className="w-full bg-white border border-gray-300 rounded-lg px-2 py-2 text-sm font-bold text-gray-900 outline-none focus:border-primary"><option value="kg">KG</option><option value="g">g</option><option value="l">L</option><option value="ml">ml</option><option value="un">un</option></select></div>
                               <div className="w-20"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Qtd</label><input type="number" step="any" value={custoDetail.qtdCompra} onChange={e => setCustoDetail({...custoDetail, qtdCompra: e.target.value})} className="w-full bg-white border border-gray-300 rounded-lg px-2 py-2 text-sm font-bold text-gray-900 outline-none focus:border-primary" /></div>
                               <div className="w-24"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">R$ Total</label><input type="number" step="0.01" value={custoDetail.valorCompra} onChange={e => setCustoDetail({...custoDetail, valorCompra: e.target.value})} className="w-full bg-white border border-gray-300 rounded-lg px-2 py-2 text-sm font-bold text-gray-900 outline-none focus:border-primary" /></div>
                               
                               <div className="w-20"><label className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1 block">Und Uso</label><select value={custoDetail.undUso} onChange={e => setCustoDetail({...custoDetail, undUso: e.target.value})} className="w-full bg-white border border-orange-200 rounded-lg px-2 py-2 text-sm font-bold text-gray-900 outline-none focus:border-orange-500"><option value="kg">KG</option><option value="g">g</option><option value="l">L</option><option value="ml">ml</option><option value="un">un</option></select></div>
                               <div className="w-20"><label className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1 block">Qtd Usada</label><input type="number" step="any" value={custoDetail.qtdUso} onChange={e => setCustoDetail({...custoDetail, qtdUso: e.target.value})} className="w-full bg-white border border-orange-200 rounded-lg px-2 py-2 text-sm font-bold text-gray-900 outline-none focus:border-orange-500" /></div>
                            </>
                          )}

                          {novoCustoGrupo === 'Impostos' && (
                            <>
                               <div className="min-w-[150px] flex-1">
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Nome do Imposto</label>
                                  <input type="text" value={custoDetail.nome} onChange={e => setCustoDetail({...custoDetail, nome: e.target.value})} className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none focus:border-primary" />
                               </div>
                               <div className="w-24">
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">% Valor</label>
                                  <input type="number" step="0.01" value={custoDetail.perc} onChange={e => setCustoDetail({...custoDetail, perc: e.target.value})} className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none focus:border-primary" placeholder="0.0" />
                               </div>
                            </>
                          )}

                          {(novoCustoGrupo === 'Comissão' || novoCustoGrupo === 'Frete') && (
                            <div className="w-24">
                               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">% Referência</label>
                               <input type="number" step="0.01" value={custoDetail.perc} onChange={e => setCustoDetail({...custoDetail, perc: e.target.value})} className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none focus:border-primary" placeholder="0.0" />
                            </div>
                          )}

                          {novoCustoGrupo === 'Embalagem' && (
                            <>
                               <div className="min-w-[120px] flex-1">
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Nome</label>
                                  <input type="text" value={custoDetail.nome} onChange={e => setCustoDetail({...custoDetail, nome: e.target.value})} className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none focus:border-primary" />
                               </div>
                               <div className="w-28">
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Tipo</label>
                                  <select value={custoDetail.tipoEmbalagem} onChange={e => setCustoDetail({...custoDetail, tipoEmbalagem: e.target.value})} className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none focus:border-primary"><option value="Unitário">Unitário</option><option value="Fardo">Fardo</option><option value="Caixa">Caixa</option></select>
                               </div>
                               <div className="w-24">
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Valor (R$)</label>
                                  <input type="number" step="0.01" value={custoDetail.valorEmbalagem} onChange={e => setCustoDetail({...custoDetail, valorEmbalagem: e.target.value})} className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none focus:border-primary" />
                               </div>
                               {custoDetail.tipoEmbalagem !== 'Unitário' && (
                                 <div className="w-20">
                                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Qtd. Unid.</label>
                                   <input type="number" step="1" value={custoDetail.qtdEmbalagem} onChange={e => setCustoDetail({...custoDetail, qtdEmbalagem: e.target.value})} className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none focus:border-primary" />
                                 </div>
                               )}
                            </>
                          )}

                          {(!DEFAULT_CUSTO_GRUPOS.includes(novoCustoGrupo) || novoCustoGrupo === 'Outros') && (
                            <div className="w-full space-y-3">
                               <div className="flex gap-3">
                                 <div className="min-w-[120px] flex-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Nome do Custo</label>
                                    <input type="text" value={custoDetail.nome} onChange={e => setCustoDetail({...custoDetail, nome: e.target.value})} placeholder={novoCustoGrupo === 'Outros' ? "Ex: Energia" : ""} className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none focus:border-primary" />
                                 </div>
                                 <div className="w-24">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Und</label>
                                    <select value={custoDetail.undOutro} onChange={e => setCustoDetail({...custoDetail, undOutro: e.target.value, undUso: e.target.value})} className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none focus:border-primary">
                                        <option value="un">un</option>
                                        <option value="kg">kg</option>
                                        <option value="l">L</option>
                                        <option value="ml">ml</option>
                                        <option value="g">g</option>
                                        <option value="kw">kw</option>
                                        <option value="m³">m³</option>
                                    </select>
                                 </div>
                                 <div className="w-28"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Valor da Und</label><input type="number" step="0.01" value={custoDetail.valorUndOutro} onChange={e => setCustoDetail({...custoDetail, valorUndOutro: e.target.value})} className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none focus:border-primary" /></div>
                               </div>
                               <div className="flex gap-3">
                                 <div className="w-32"><label className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1 block">Und Utilização</label><input type="text" value={custoDetail.undUso} readOnly className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-500 outline-none cursor-not-allowed" /></div>
                                 <div className="w-28"><label className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1 block">Qtd. Utilização</label><input type="number" step="any" value={custoDetail.utilOutro} onChange={e => setCustoDetail({...custoDetail, utilOutro: e.target.value})} className="w-full bg-white border border-orange-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none focus:border-orange-500" /></div>
                               </div>
                            </div>
                          )}
                          
                          <div className="w-full flex justify-between items-end mt-2 pt-4 border-t border-gray-200">
                             <div>
                               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Prévia do Custo</p>
                               <p className="text-xl font-black text-red-500">R$ {formatCurrency(previewCusto.valor)}</p>
                             </div>
                             <button type="button" onClick={handleAddCusto} className="h-10 px-6 bg-orange-500 text-white font-black text-sm uppercase tracking-widest rounded-lg hover:bg-orange-600 transition-all flex items-center gap-2">
                                <Plus size={18} /> Adicionar
                             </button>
                          </div>
                       </div>
                    </div>

                 </div>

                 {/* Right Panel - Resumo de Custos */}
                 <div className="w-1/3 bg-white border-l border-gray-100 p-6 flex flex-col h-full overflow-y-auto">
                    <h3 className="font-bold text-gray-900 uppercase text-xs tracking-widest border-b border-gray-100 pb-4 mb-4">Composição do Preço</h3>
                    
                    <div className="space-y-4 mb-6 shrink-0">
                       <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex justify-between items-center">
                         <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Preço de Venda</span>
                         <span className="text-xl font-black text-gray-900">R$ {Number(formData.preco_base || 0).toFixed(2)}</span>
                       </div>
                       <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex justify-between items-center">
                         <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Custo Total</span>
                         <span className="text-xl font-black text-red-600">R$ {formatCurrency(custoTotal)}</span>
                       </div>
                       <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex justify-between items-center">
                         <div>
                            <span className="text-[10px] font-black text-primary/70 uppercase tracking-widest block mb-1">Lucro Bruto</span>
                            <span className="text-2xl font-black text-primary block">R$ {formatCurrency(valorBruto)}</span>
                         </div>
                         <div className="text-right">
                            <span className="text-[10px] font-black text-primary/70 uppercase tracking-widest block mb-1">Margem</span>
                            <span className="text-2xl font-black text-primary block">{margemBruta.toFixed(1)}%</span>
                         </div>
                       </div>
                    </div>

                    <h4 className="font-bold text-gray-600 uppercase text-[10px] tracking-widest mb-3">Custos Adicionados</h4>
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                       {custos.length === 0 ? (
                         <p className="text-xs text-gray-400 font-medium text-center py-8">Nenhum custo adicionado.</p>
                       ) : (
                         <div className="flex flex-col gap-2">
                           {custos.map((c) => {
                             const pVenda = Number(formData.preco_base) || 0;
                             const computedVal = c.tipo === 'Variavel' ? (pVenda * (c.proporcao || 0) / 100) : c.valor;
                             const percentOfCost = custoTotal > 0 ? (computedVal / custoTotal) * 100 : 0;
                             return (
                               <div key={c.id} className="group relative bg-white border border-gray-100 flex items-center justify-between p-3 rounded-xl hover:border-gray-300 transition-all">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-gray-800 text-sm">{c.nome}</span>
                                        <span className="text-[10px] text-gray-400 font-bold uppercase bg-gray-100 px-1.5 py-0.5 rounded">{c.grupo}</span>
                                    </div>
                                    <div className="text-xs font-medium text-gray-500">
                                        {c.tipo === 'Variavel' ? `(${c.proporcao}%) de R$ ` : 'R$ '}{computedVal.toFixed(2)}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                     <div className="font-black text-red-500 text-sm">R$ {formatCurrency(computedVal)}</div>
                                     <div className="text-[10px] text-gray-400 font-bold">{percentOfCost.toFixed(1)}%</div>
                                  </div>
                                  <button onClick={() => handleRemoveCusto(c.id)} type="button" className="absolute top-1/2 -translate-y-1/2 -right-3 w-8 h-8 bg-white border border-gray-200 text-red-400 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:-right-4 transition-all shadow-sm hover:text-red-600 hover:border-red-200">
                                    <X size={14} />
                                  </button>
                               </div>
                             );
                           })}
                         </div>
                       )}
                    </div>
                 </div>
              </div>

              <div className="p-6 bg-white border-t border-gray-100 flex justify-between items-center shrink-0">
                <div>
                   {editingProduto && (
                     <button type="button" onClick={() => setDeleteConf(editingProduto.id)} className="px-6 py-3 bg-white border border-red-200 text-red-600 font-black text-sm uppercase tracking-widest rounded-xl hover:bg-red-50 transition-all flex items-center gap-2">
                       <Trash2 size={18} /> Deletar
                     </button>
                   )}
                </div>
                <div className="flex gap-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 bg-gray-100 text-gray-600 font-black text-sm uppercase tracking-widest rounded-xl hover:bg-gray-200 transition-all">Cancelar</button>
                  <button type="submit" form="prod-form" className="px-8 py-3 bg-primary text-white font-black text-sm uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all shadow-lg">Salvar Produto</button>
                </div>
              </div>

           </div>
        </div>
      )}

      {/* Delete confirmation overlay */}
      {deleteConf && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] shadow-2xl p-8 max-w-md w-full text-center scale-in">
             <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
               <Trash2 size={40} />
             </div>
             <h3 className="text-2xl font-black text-gray-900 mb-2">Excluir Produto?</h3>
             <p className="text-gray-500 font-medium mb-8 text-sm">Tem certeza que deseja excluir este produto do catálogo?</p>
             <div className="flex gap-4">
               <button onClick={() => setDeleteConf(null)} className="flex-1 py-4 bg-gray-100 text-gray-600 font-black text-sm uppercase tracking-widest rounded-xl hover:bg-gray-200 transition-all">Cancelar</button>
               <button onClick={() => { deleteProduto(deleteConf); setIsModalOpen(false); setDeleteConf(null); }} className="flex-1 py-4 bg-red-600 text-white font-black text-sm uppercase tracking-widest rounded-xl hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all">Sim, Excluir</button>
             </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-8 bg-primary/40 backdrop-blur-sm">
           <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col scale-in">
              <div className="p-6 bg-white border-b border-gray-100 flex justify-between items-center shrink-0">
                 <div>
                    <h2 className="text-2xl font-black tracking-tight text-gray-900">Relatórios de Produto</h2>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Análise de produção e vendas</p>
                 </div>
                 <button onClick={() => setIsReportModalOpen(false)} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-all hover:rotate-90">
                   <X size={20} />
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                 {/* Filters */}
                 <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                       <div>
                         <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Produtos</label>
                         <MultiSelect 
                           options={produtos.map(p => p.id)} 
                           selected={reportSelectedProducts} 
                           onChange={setReportSelectedProducts} 
                           placeholder="Todos"
                           getLabel={(id) => produtos.find(p => p.id === id)?.nome || id}
                         />
                       </div>
                       <div>
                         <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Ano</label>
                         <MultiSelect 
                           options={availableYears} 
                           selected={reportSelectedYears} 
                           onChange={setReportSelectedYears} 
                           placeholder="Todos"
                         />
                       </div>
                       <div>
                         <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Mês</label>
                         <MultiSelect 
                           options={availableMonths} 
                           selected={reportSelectedMonths} 
                           onChange={setReportSelectedMonths} 
                           placeholder="Todos"
                           getLabel={getMonthName}
                         />
                       </div>
                       <div>
                         <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Tipo de Relatório</label>
                         <div className="flex bg-gray-100 rounded-lg p-1">
                            <button 
                              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${reportType === 'Vendido' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                              onClick={() => setReportType('Vendido')}
                            >
                               Vendido
                            </button>
                            <button 
                              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${reportType === 'Produzido' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                              onClick={() => setReportType('Produzido')}
                            >
                               Produzido
                            </button>
                         </div>
                       </div>
                    </div>
                 </div>

                 {/* Results */}
                 {currentReport.type === 'Vendido' ? (
                   <div className="space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
                           <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4"><DollarSign size={24} /></div>
                           <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Faturado</h4>
                           <p className="text-3xl font-black text-gray-900">R$ {currentReport.totalFaturado?.toFixed(2) || '0.00'}</p>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
                           <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4"><Package size={24} /></div>
                           <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">KG Vendidos</h4>
                           <p className="text-3xl font-black text-gray-900">{(currentReport.byProduct?.reduce((a, b: any) => a + b.kgVendidos, 0))?.toFixed(2) || '0.00'} kg</p>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
                           <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-4"><Search size={24} /></div>
                           <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Clientes Atendidos</h4>
                           <p className="text-3xl font-black text-gray-900">{currentReport.totalClientes || 0}</p>
                        </div>
                     </div>
                     
                     <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                       <h4 className="p-6 pb-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Detalhamento por Produto</h4>
                       <table className="w-full text-left border-collapse">
                         <thead>
                           <tr className="border-b border-gray-100">
                             <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50">Produto</th>
                             <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 text-right">KG Vendidos</th>
                             <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 text-right">Faturado (R$)</th>
                             <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 text-right">Margem Bruta</th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-gray-100">
                           {currentReport.byProduct?.length === 0 ? (
                             <tr><td colSpan={4} className="p-8 text-center text-gray-400 font-medium">Nenhuma venda encontrada para os filtros.</td></tr>
                           ) : currentReport.byProduct?.map((p: any, i: number) => (
                             <tr key={i} className="hover:bg-gray-50">
                               <td className="p-4 font-bold text-gray-900">{p.nome}</td>
                               <td className="p-4 font-medium text-gray-600 text-right">{p.kgVendidos.toFixed(2)}</td>
                               <td className="p-4 font-black text-green-600 text-right">R$ {formatCurrency(p.faturado)}</td>
                               <td className="p-4 font-black text-primary text-right">{p.margemBruta.toFixed(1)}%</td>
                             </tr>
                           ))}
                         </tbody>
                       </table>
                     </div>
                   </div>
                 ) : (
                   <div className="space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
                           <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4"><Package size={24} /></div>
                           <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Produzido</h4>
                           <p className="text-3xl font-black text-gray-900">{currentReport.totalProduzido || 0} und/kg</p>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
                           <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4"><Calculator size={24} /></div>
                           <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Custo Total</h4>
                           <p className="text-3xl font-black text-red-600">R$ {currentReport.totalCusto?.toFixed(2) || '0.00'}</p>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
                           <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4"><PieChart size={24} /></div>
                           <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Matéria Prima</h4>
                           <p className="text-3xl font-black text-gray-900">{currentReport.totalMateriaPrima?.toFixed(2) || '0.00'} kg</p>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
                           <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4"><DollarSign size={24} /></div>
                           <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Margem Média Esperada</h4>
                           <p className="text-3xl font-black text-green-600">{currentReport.margemMedia?.toFixed(1) || '0.0'}%</p>
                        </div>
                     </div>
                     <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden p-6 text-center text-gray-500 text-sm">
                       * INSUMOS UTILIZADOS: O cálculo base baseia-se nas matérias primas mapeadas e no custo em lote apurado na produção. Para uma versão mais refinada é possível detalhar via componentes de insumo cadastrados por unidade (dependência do módulo de suprimentos).
                     </div>
                   </div>
                 )}
              </div>
           </div>
        </div>
      )}

    </div>
  );
};
export default Produtos;
