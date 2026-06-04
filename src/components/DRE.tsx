import React, { useState, useMemo } from 'react';
import { useGlobalState } from '../GlobalStateContext';
import { 
  TrendingUp, 
  TrendingDown, 
  ChevronDown, 
  ChevronUp, 
  Calendar, 
  DollarSign, 
  Users, 
  Package, 
  AlertCircle, 
  Percent, 
  FileSpreadsheet, 
  Info, 
  Truck, 
  ArrowUpDown, 
  Plus, 
  Minus,
  CheckCircle,
  HelpCircle,
  Eye,
  EyeOff
} from 'lucide-react';

interface DREProps {
  empresa: string;
}

export const DRE: React.FC<DREProps> = ({ empresa }) => {
  const { 
    pedidos, 
    despesas, 
    comprasMandioca, 
    comissoes, 
    usuarios, 
    clientes, 
    produtos, 
    fornecedores 
  } = useGlobalState();

  // Filters for the DRE
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>(5); // May as default

  // Expanded card tracking - streamlined to our new 9-step structure
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    receitaBruta: false,
    deducoes: false,
    cpv: false,
    despesasFixas: false,
    despesasVariaveis: false,
    receitasFinanceiras: false,
  });

  const toggleExpand = (section: string) => {
    setExpanded(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const [openDescriptions, setOpenDescriptions] = useState<Record<string, boolean>>({});

  const toggleDescription = (id: string) => {
    setOpenDescriptions(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const expandAll = () => {
    setExpanded({
      receitaBruta: true,
      deducoes: true,
      cpv: true,
      despesasFixas: true,
      despesasVariaveis: true,
      receitasFinanceiras: true,
    });
  };

  const collapseAll = () => {
    setExpanded({
      receitaBruta: false,
      deducoes: false,
      cpv: false,
      despesasFixas: false,
      despesasVariaveis: false,
      receitasFinanceiras: false,
    });
  };

  const MONTHS_NAMES = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  // Helper to check if a date falls into the period
  const isDateInPeriod = (dateStr: string | undefined, year: number, month: number | 'all') => {
    if (!dateStr) return false;
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length < 2) return false;
    const itemYear = parseInt(parts[0], 10);
    const itemMonth = parseInt(parts[1], 10);

    if (itemYear !== year) return false;
    if (month !== 'all' && itemMonth !== month) return false;
    return true;
  };

  const getRepName = (id: string) => {
    return usuarios.find(u => u.id === id)?.nome || `Representante (${id})`;
  };

  const getClientName = (id: string) => {
    const cli = clientes.find(c => c.id === id);
    return cli ? `${cli.nome_fantasia || cli.razao_social}` : `Cliente (${id})`;
  };

  const getProductName = (id: string) => {
    return produtos.find(p => p.id === id)?.nome || `Produto (${id})`;
  };

  // --- DRE CORE MEMOIZED COMPUTATIONS ---
  const dreData = useMemo(() => {
    // 1. FILTER TRANSACTIONS BY PERIOD
    // Select only 'Faturado' orders
    const periodPedidos = pedidos.filter(p => 
      p.status === 'Faturado' && isDateInPeriod(p.data_faturamento || p.data, selectedYear, selectedMonth)
    );

    // Filter despesas
    const periodDespesas = despesas.filter(d => 
      isDateInPeriod(d.data || d.data_pagamento, selectedYear, selectedMonth) && d.status !== 'Cancelada'
    );

    // Filter mandioca purchases
    const periodMandioca = comprasMandioca.filter(c => 
      isDateInPeriod(c.data, selectedYear, selectedMonth)
    );

    // Filter commissions
    const periodComissoes = comissoes.filter(com => 
      isDateInPeriod(com.data_pagamento || com.data_prevista, selectedYear, selectedMonth) && com.status !== 'Bloqueada'
    );

    // --- 2. CALCULATE CATEGORIES & BREAKDOWNS ---
    
    // RECEITA OPERACIONAL BRUTA
    let receitaBruta = 0;
    const repRevenueMap: Record<string, number> = {};
    const clientRevenueMap: Record<string, number> = {};
    const channelRevenueMap: Record<string, number> = {
      'Supermercado': 0,
      'Food Service': 0,
      'Distribuidor': 0,
      'Atacado': 0,
      'Varejo': 0,
      'Outro': 0
    };

    periodPedidos.forEach(p => {
      const orderVal = p.valor_total || 0;
      receitaBruta += orderVal;

      // Map representative
      const repId = p.representante_id || 'unassigned';
      repRevenueMap[repId] = (repRevenueMap[repId] || 0) + orderVal;

      // Map client
      const cliId = p.cliente_id || 'unknown';
      clientRevenueMap[cliId] = (clientRevenueMap[cliId] || 0) + orderVal;

      // Map client channel
      const clientObj = clientes.find(c => c.id === p.cliente_id);
      const canal = clientObj?.canal || 'Outro';
      channelRevenueMap[canal] = (channelRevenueMap[canal] || 0) + orderVal;
    });

    // DEDUÇÕES DA RECEITA
    let descontosConcedidosSimplificado = 0;
    let bonificacoesSimplificado = 0;
    
    periodPedidos.forEach(p => {
      if (p.items) {
        p.items.forEach(itm => {
          if (itm.tipo === 'bonificacao') {
            bonificacoesSimplificado += (itm.quantidade * (itm.preco || 0));
          } else if (itm.desconto) {
            descontosConcedidosSimplificado += (itm.desconto * itm.quantidade);
          }
        });
      }
    });

    // Taxes/Impostos directly registered
    let impostosDespesas = 0;
    const impostosDetalhamento: { desc: string; valor: number; data: string }[] = [];
    
    periodDespesas.forEach(d => {
      if (d.categoria === 'Imposto' || d.categoria === 'Tributos') {
        impostosDespesas += d.valor;
        impostosDetalhamento.push({
          desc: d.descricao || 'Imposto s/ Faturamento',
          valor: d.valor,
          data: d.data
        });
      }
    });

    // Simulated general tax if not explicitly registered (8% average)
    const impostosEstimados = impostosDespesas === 0 ? Math.round(receitaBruta * 0.08 * 100) / 100 : impostosDespesas;

    const totalDeducoes = descontosConcedidosSimplificado + bonificacoesSimplificado + impostosEstimados;
    const receitaLiquida = Math.max(0, receitaBruta - totalDeducoes);

    // CUSTO DOS PRODUTOS (CPV)
    let cpvIndustrial = 0;
    const productCPVMap: Record<string, { qty: number; totalCost: number }> = {};

    periodPedidos.forEach(p => {
      const orderCusto = p.custo_total || 0;
      cpvIndustrial += orderCusto;

      if (p.items) {
        p.items.forEach(itm => {
          const prodId = itm.produto_id;
          const prodObj = produtos.find(pr => pr.id === prodId);
          const baseCusto = prodObj?.custo || 0;
          const calculatedCusto = baseCusto * itm.quantidade;

          if (!productCPVMap[prodId]) {
            productCPVMap[prodId] = { qty: 0, totalCost: 0 };
          }
          productCPVMap[prodId].qty += itm.quantidade;
          productCPVMap[prodId].totalCost += calculatedCusto;
        });
      }
    });

    // Mandioca raw material cost
    let totalMandioca = 0;
    const mandiocaBreakdown: { fornecedor: string; data: string; peso: number; total: number }[] = [];

    periodMandioca.forEach(man => {
      const val = man.valor_total || 0;
      totalMandioca += val;
      const forn = fornecedores.find(f => f.id === man.fornecedor_id);
      mandiocaBreakdown.push({
        fornecedor: forn?.nome || 'Fornecedor s/ nome',
        data: man.data,
        peso: man.quantidade_total || 0,
        total: val
      });
    });

    // Commission calculations for representatives
    let totalComissoes = 0;
    const comissoesBreakdown: Record<string, number> = {};

    periodComissoes.forEach(com => {
      const val = com.valor_comissao || 0;
      totalComissoes += val;
      comissoesBreakdown[com.representante_id] = (comissoesBreakdown[com.representante_id] || 0) + val;
    });

    // CPV total: Industry Direct Cost + Mandioca root purchase
    const custosProdutos = cpvIndustrial + totalMandioca;
    const lucroBruto = Math.max(0, receitaLiquida - custosProdutos);

    // FINANCIAL RESULTS (Receitas Financeiras)
    let receitasFinanceiras = 0;
    let despesasFinanceiras = 0;

    const jurosRecebidosDetalhes: { data: string; desc: string; valor: number }[] = [];
    const jurosPagosDetalhes: { data: string; desc: string; valor: number }[] = [];

    // Late fees received from clients
    periodPedidos.forEach(p => {
      if (p.juros_recebido && p.juros_recebido > 0) {
        receitasFinanceiras += p.juros_recebido;
        jurosRecebidosDetalhes.push({
          data: p.data_recebimento || p.data,
          desc: `Juros recebidos NF nº ${p.nf_numero || p.id}`,
          valor: p.juros_recebido
        });
      }
    });

    // Late fees and interests paid
    periodDespesas.forEach(d => {
      if (d.juros_pago && d.juros_pago > 0) {
        despesasFinanceiras += d.juros_pago;
        jurosPagosDetalhes.push({
          data: d.data_pagamento || d.data,
          desc: `Atraso/Juros: ${d.descricao}`,
          valor: d.juros_pago
        });
      }
    });

    // NF prepayment / antecipacao fees
    periodPedidos.forEach(p => {
      if (p.juros_adiantamento && p.juros_adiantamento > 0) {
        despesasFinanceiras += p.juros_adiantamento;
        jurosPagosDetalhes.push({
          data: p.data_adiantamento || p.data,
          desc: `Tarifa desconto Duplicata NF nº ${p.nf_numero || p.id}`,
          valor: p.juros_adiantamento
        });
      }
    });

    // --- STREAMLINED OPERATIVE GROUPING ENGINE ---
    // Instead of long generic lists, let's group fixed and variable expenses by category!
    const despesasFixasAgrupadas: Record<string, { total: number; itens: typeof periodDespesas }> = {};
    const despesasVariaveisAgrupadas: Record<string, { total: number; itens: any[] }> = {};

    let totalDespesasFixas = 0;
    let totalDespesasVariaveis = 0;

    periodDespesas.forEach(d => {
      // Direct taxes/mandioca are handled separately
      if (d.categoria === 'Imposto' || d.categoria === 'Tributos' || d.compra_mandioca_id) {
        return;
      }

      // Skip Imposto de Renda / CSLL entirely as explicitly requested
      const cat = (d.categoria || '').toUpperCase();
      const desc = (d.descricao || '').toUpperCase();
      const isIrpjCsll = cat === 'IRPJ' || cat === 'CSLL' || desc.includes('IRPJ') || desc.includes('CSLL') || desc.includes('IMPOSTO DE RENDA') || desc.includes('CSLL') || desc.includes('CONTRIBUIÇÃO SOCIAL INTERNA');

      if (isIrpjCsll) {
        return;
      }

      // Check if Fixed Expense
      const isFixa = d.tipo_despesa === 'fixa' || [
        'Aluguel', 'Salário', 'Prolabore', 'Energia', 'Agua', 'Internet', 'Contador', 'Decimo Terceiro', 'Ferias', 'Fgts', 'Controle Fiscal'
      ].includes(d.categoria);

      const catName = d.categoria || 'Gerais / Administrativas';

      if (isFixa) {
        if (!despesasFixasAgrupadas[catName]) {
          despesasFixasAgrupadas[catName] = { total: 0, itens: [] };
        }
        despesasFixasAgrupadas[catName].total += d.valor;
        despesasFixasAgrupadas[catName].itens.push(d);
        totalDespesasFixas += d.valor;
      } else {
        if (!despesasVariaveisAgrupadas[catName]) {
          despesasVariaveisAgrupadas[catName] = { total: 0, itens: [] };
        }
        despesasVariaveisAgrupadas[catName].total += d.valor;
        despesasVariaveisAgrupadas[catName].itens.push(d);
        totalDespesasVariaveis += d.valor;
      }
    });

    // Invert Comissões into commercial variables inside the Despesas Variáveis block
    if (totalComissoes > 0) {
      const comCat = 'Comissões de Vendas';
      if (!despesasVariaveisAgrupadas[comCat]) {
        despesasVariaveisAgrupadas[comCat] = { total: 0, itens: [] };
      }
      despesasVariaveisAgrupadas[comCat].total += totalComissoes;
      Object.entries(comissoesBreakdown).forEach(([repId, val]) => {
        despesasVariaveisAgrupadas[comCat].itens.push({
          id: `comission-itm-${repId}`,
          data: '',
          categoria: 'Comissões de Vendas',
          descricao: `Comissão do Representante ${getRepName(repId)}`,
          valor: val
        });
      });
      totalDespesasVariaveis += totalComissoes;
    }

    // Invert Despesas Financeiras (tariffs and charges) into variables
    if (despesasFinanceiras > 0) {
      const finCat = 'Tarifas e Custos Financeiros';
      if (!despesasVariaveisAgrupadas[finCat]) {
        despesasVariaveisAgrupadas[finCat] = { total: 0, itens: [] };
      }
      despesasVariaveisAgrupadas[finCat].total += despesasFinanceiras;
      jurosPagosDetalhes.forEach((j, index) => {
        despesasVariaveisAgrupadas[finCat].itens.push({
          id: `fincost-itm-${index}`,
          data: j.data,
          categoria: 'Tarifas e Custos Financeiros',
          descricao: j.desc,
          valor: j.valor
        });
      });
      totalDespesasVariaveis += despesasFinanceiras;
    }

    // New 9-step bottom line result
    const resultadoOperacional = lucroBruto - totalDespesasFixas - totalDespesasVariaveis + receitasFinanceiras;

    return {
      receitaBruta,
      repRevenueMap,
      clientRevenueMap,
      channelRevenueMap,
      descontosConcedidosSimplificado,
      bonificacoesSimplificado,
      impostosEstimados,
      impostosDetalhamento,
      totalDeducoes,
      receitaLiquida,
      cpvIndustrial,
      productCPVMap,
      totalMandioca,
      mandiocaBreakdown,
      totalComissoes,
      comissoesBreakdown,
      totalDespesasFixas,
      despesasFixasAgrupadas,
      totalDespesasVariaveis,
      despesasVariaveisAgrupadas,
      receitasFinanceiras,
      despesasFinanceiras,
      jurosRecebidosDetalhes,
      jurosPagosDetalhes,
      resultadoOperacional,
      custosProdutos,
      lucroBruto
    };
  }, [pedidos, despesas, comprasMandioca, comissoes, usuarios, clientes, produtos, fornecedores, selectedYear, selectedMonth]);

  // Handle wrong company profile
  if (empresa !== "estancia") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-white rounded-3xl border border-gray-100 shadow-sm p-8 text-center">
        <div className="p-4 bg-orange-50 text-orange-600 rounded-full mb-4 animate-bounce">
          <AlertCircle size={32} />
        </div>
        <h3 className="text-lg font-black text-slate-800">DRE Não Disponível</h3>
        <p className="text-gray-450 text-xs mt-2 max-w-sm font-semibold">
          A visualização da Demonstração de Resultado do Exercício consolidada está configurada especificamente e exclusivamente para a empresa <strong>Estância Nova Olinda</strong> no momento.
        </p>
      </div>
    );
  }

  // Percentage safe calculator
  const percentOfBruta = (val: number) => {
    if (dreData.receitaBruta === 0) return "0,0%";
    return `${((val / dreData.receitaBruta) * 100).toFixed(1)}%`;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* HEADER CARD */}
      <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
            Demonstrações Contábeis & Gerenciais
          </span>
          <h2 className="text-2xl font-black text-gray-900 mt-2 flex items-center gap-2">
            <FileSpreadsheet size={24} className="text-indigo-600" />
            DRE - Demonstração do Resultado
          </h2>
          <p className="text-xs text-gray-455 font-semibold mt-1">
            Quadro financeiro estruturado com agrupamento de faturamentos, custos de produto, despesas fixas, despesas variáveis e receitas financeiras.
          </p>
        </div>

        {/* TIME RANGE SELECTORS */}
        <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-2xl border border-gray-200 shrink-0">
          <Calendar size={16} className="text-gray-400 ml-2" />
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-transparent text-gray-800 text-xs font-bold outline-none cursor-pointer py-1"
          >
            <option value={2025}>2025 (Histórico)</option>
            <option value={2026}>2026 (Atual)</option>
            <option value={2027}>2027 (Projeção)</option>
          </select>

          <span className="text-gray-300">|</span>

          <select
            value={selectedMonth}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedMonth(val === 'all' ? 'all' : Number(val));
            }}
            className="bg-transparent text-gray-800 text-xs font-bold outline-none cursor-pointer py-1 pr-2"
          >
            <option value="all">Ano Completo</option>
            {MONTHS_NAMES.map((name, idx) => (
              <option key={idx + 1} value={idx + 1}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* TOP SUMMARY CARDS (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-[28px] border border-gray-100 shadow-3xs flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <TrendingUp size={22} />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-extrabold uppercase">Receita Bruta</span>
            <h4 className="text-md font-black text-gray-900 mt-1">
              R$ {dreData.receitaBruta.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </h4>
          </div>
        </div>

        <div className="bg-white p-5 rounded-[28px] border border-gray-100 shadow-3xs flex items-center gap-4">
          <div className="p-3 bg-indigo-50/70 text-indigo-700 rounded-2xl">
            <Percent size={22} />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-extrabold uppercase">Receita Líquida</span>
            <h4 className="text-md font-black text-gray-900 mt-1">
              R$ {dreData.receitaLiquida.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </h4>
          </div>
        </div>

        <div className="bg-white p-5 rounded-[28px] border border-gray-100 shadow-3xs flex items-center gap-4">
          <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl">
            <Package size={22} />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-extrabold uppercase">Lucro Bruto</span>
            <h4 className="text-md font-black text-gray-900 mt-1">
              R$ {dreData.lucroBruto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </h4>
          </div>
        </div>

        <div className={`bg-white p-5 rounded-[28px] border shadow-3xs flex items-center gap-4 transition duration-200 ${
          dreData.resultadoOperacional >= 0 
            ? 'border-emerald-100 bg-emerald-50/15' 
            : 'border-red-100 bg-red-50/15'
        }`}>
          <div className={`p-3 rounded-2xl ${
            dreData.resultadoOperacional >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-750'
          }`}>
            {dreData.resultadoOperacional >= 0 ? <CheckCircle size={22} /> : <TrendingDown size={22} />}
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-extrabold uppercase">Resultado Operacional</span>
            <h4 className={`text-md font-black mt-1 ${
              dreData.resultadoOperacional >= 0 ? 'text-emerald-700' : 'text-red-700'
            }`}>
              R$ {dreData.resultadoOperacional.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </h4>
          </div>
        </div>

      </div>

      {/* CONTROLS AREA */}
      <div className="flex justify-between items-center bg-gray-100/50 px-4 py-3 rounded-2xl border border-gray-200/50">
        <span className="text-[10px] font-black text-gray-500 uppercase flex items-center gap-1.5">
          <Info size={14} className="text-gray-400" />
          Dica: Clique no botão + para ver as despesas abertas de forma organizada e agrupada por categoria
        </span>
        <div className="flex gap-2">
          <button 
            onClick={expandAll}
            className="px-3 py-1 bg-white border border-gray-250 text-gray-700 text-[10px] font-black uppercase tracking-wide rounded-lg cursor-pointer hover:bg-gray-150 transition"
          >
            Expandir Tudo
          </button>
          <button 
            onClick={collapseAll}
            className="px-3 py-1 bg-white border border-gray-250 text-gray-700 text-[10px] font-black uppercase tracking-wide rounded-lg cursor-pointer hover:bg-gray-150 transition"
          >
            Recolher Tudo
          </button>
        </div>
      </div>

      {/* DRE STRUCTURE TABLE */}
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-xs overflow-hidden">
        
        {/* Table header */}
        <div className="grid grid-cols-12 bg-slate-50 border-b border-gray-150/75 p-4 lg:px-6 text-2xs font-extrabold uppercase tracking-widest text-slate-500">
          <div className="col-span-6 md:col-span-8">Estrutura de Resultados (DRE)</div>
          <div className="col-span-4 md:col-span-2 text-right">Valor em R$</div>
          <div className="col-span-2 text-right">% Receita</div>
        </div>

        {/* --- 1. RECEITA BRUTA LINE --- */}
        <div className="border-b border-gray-100 group">
          <div className="grid grid-cols-12 p-4 lg:px-6 items-center hover:bg-slate-50/40 transition">
            <div className="col-span-6 md:col-span-8 flex items-center gap-3">
              <button 
                onClick={() => toggleExpand('receitaBruta')}
                className="w-7 h-7 bg-indigo-50 border border-indigo-150/60 rounded-lg hover:bg-indigo-100 text-indigo-700 transition flex items-center justify-center cursor-pointer"
              >
                {expanded.receitaBruta ? <Minus size={14} className="stroke-[3px]" /> : <Plus size={14} className="stroke-[3px]" />}
              </button>
              <div>
                <span className="text-xs font-black text-gray-900 block md:inline-block">1. Receita Bruta de Vendas</span>
                <span className="text-[9px] text-gray-400 font-bold ml-0 md:ml-3 block md:inline-block">Faturamento bruto total sobre pedidos faturados</span>
              </div>
            </div>
            <div className="col-span-4 md:col-span-2 text-right text-xs font-black text-gray-900 font-mono">
              + R$ {dreData.receitaBruta.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <div className="col-span-2 text-right text-xs font-extrabold text-slate-500 font-mono">
              100,0%
            </div>
          </div>
          {/* Expanded 1 */}
          {expanded.receitaBruta && (
            <div className="bg-slate-50/60 border-t border-gray-100/80 divide-y divide-gray-100 animate-fadeIn">
              {pedidos.filter(p => p.status === 'Faturado' && isDateInPeriod(p.data_faturamento || p.data, selectedYear, selectedMonth)).length === 0 ? (
                <p className="text-xs text-gray-450 font-semibold p-4 text-center">Nenhum pedido faturado para o período selecionado.</p>
              ) : (
                pedidos.filter(p => p.status === 'Faturado' && isDateInPeriod(p.data_faturamento || p.data, selectedYear, selectedMonth)).map((p, idx) => {
                  const itemsStr = p.items ? p.items.map(itm => `${itm.quantidade}x ${getProductName(itm.produto_id)}`).join(', ') : 'Nenhum item cadastrado';
                  const pId = `pedido-${p.id}`;
                  const orderVal = p.valor_total || 0;
                  const clientName = getClientName(p.cliente_id);
                  const repName = getRepName(p.representante_id);
                  const dateStr = (p.data_faturamento || p.data || '').split('T')[0].split('-').reverse().join('/');
                  
                  return (
                    <div key={p.id} className="last:border-b-0">
                      <div className="grid grid-cols-12 py-2.5 px-4 lg:px-6 items-center hover:bg-slate-100/50 transition">
                        <div className="col-span-6 md:col-span-8 pl-8 md:pl-12 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                          <span className="font-bold text-gray-750 text-2xs md:text-xs">
                            NF nº {p.nf_numero || `S/N (${p.id.slice(0,6)})`} - {clientName} <span className="text-[10px] text-gray-400 font-medium font-sans">({dateStr})</span>
                          </span>
                        </div>
                        <div className="col-span-4 md:col-span-2 text-right font-semibold text-xs font-mono text-gray-800">
                          R$ {orderVal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </div>
                        <div className="col-span-1 text-right font-mono text-2xs font-semibold text-gray-500">
                          {percentOfBruta(orderVal)}
                        </div>
                        <div className="col-span-1 text-right flex justify-end">
                          <button
                            onClick={() => toggleDescription(pId)}
                            className="p-1 text-gray-400 hover:text-indigo-600 rounded hover:bg-slate-150/50 transition cursor-pointer"
                            title="Ver itens e detalhes"
                          >
                            {openDescriptions[pId] ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>
                      {openDescriptions[pId] && (
                        <div className="bg-indigo-50/25 border-t border-b border-indigo-100/30 py-2.5 px-12 md:px-20 text-[10px] text-gray-650 font-medium leading-relaxed font-sans space-y-1 animate-fadeIn">
                          <div><strong>Canal de Venda:</strong> {clientes.find(c => c.id === p.cliente_id)?.canal || 'Outro'}</div>
                          <div><strong>Representante:</strong> {repName}</div>
                          <div><strong>Itens do Pedido:</strong> {itemsStr}</div>
                          {p.observacao && <div><strong>Observações:</strong> {p.observacao}</div>}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* --- 2. DEDUCOES LINE --- */}
        <div className="border-b border-gray-100">
          <div className="grid grid-cols-12 p-4 lg:px-6 items-center hover:bg-slate-50/40 transition">
            <div className="col-span-6 md:col-span-8 flex items-center gap-3">
              <button 
                onClick={() => toggleExpand('deducoes')}
                className="w-7 h-7 bg-red-50 border border-red-150 rounded-lg hover:bg-red-100 text-red-700 transition flex items-center justify-center cursor-pointer"
              >
                {expanded.deducoes ? <Minus size={14} className="stroke-[3px]" /> : <Plus size={14} className="stroke-[3px]" />}
              </button>
              <div>
                <span className="text-xs font-black text-gray-900 block md:inline-block">2. (-) Deduções da Receita</span>
                <span className="text-[9px] text-gray-400 font-bold ml-0 md:ml-3 block md:inline-block">Impostos sobre faturamento e descontos/bonificações concedidos</span>
              </div>
            </div>
            <div className="col-span-4 md:col-span-2 text-right text-xs font-black text-rose-650 font-mono">
              - R$ {dreData.totalDeducoes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <div className="col-span-2 text-right text-xs font-extrabold text-slate-500 font-mono">
              {percentOfBruta(dreData.totalDeducoes)}
            </div>
          </div>

          {/* Expanded 2 */}
          {expanded.deducoes && (
            <div className="bg-slate-50/60 border-t border-gray-100/80 divide-y divide-gray-100 animate-fadeIn">
              
              {/* Descontos comerciais */}
              <div className="last:border-b-0">
                <div className="grid grid-cols-12 py-2.5 px-4 lg:px-6 items-center hover:bg-slate-100/50 transition">
                  <div className="col-span-6 md:col-span-8 pl-8 md:pl-12 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                    <span className="font-bold text-gray-750 text-2xs md:text-xs"> Descontos Comerciais Aplicados em Vendas </span>
                  </div>
                  <div className="col-span-4 md:col-span-2 text-right font-semibold text-xs font-mono text-gray-800">
                    R$ {dreData.descontosConcedidosSimplificado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </div>
                  <div className="col-span-1 text-right font-mono text-2xs font-semibold text-gray-500">
                    {percentOfBruta(dreData.descontosConcedidosSimplificado)}
                  </div>
                  <div className="col-span-1 text-right flex justify-end">
                    <button
                      onClick={() => toggleDescription('deduc-descontos')}
                      className="p-1 text-gray-400 hover:text-indigo-600 rounded hover:bg-slate-150/50 transition cursor-pointer"
                    >
                      {openDescriptions['deduc-descontos'] ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                {openDescriptions['deduc-descontos'] && (
                  <div className="bg-indigo-50/25 border-t border-b border-indigo-100/30 py-2.5 px-12 md:px-20 text-[10px] text-gray-650 font-medium leading-relaxed font-sans animate-fadeIn">
                    Valor total de descontos comerciais concedidos diretamente nos itens dos pedidos que foram faturados neste período. Descontos de faturamento ajudam no acompanhamento de negociações comerciais e campanhas de preço.
                  </div>
                )}
              </div>

              {/* Bonificações */}
              <div className="last:border-b-0">
                <div className="grid grid-cols-12 py-2.5 px-4 lg:px-6 items-center hover:bg-slate-100/50 transition">
                  <div className="col-span-6 md:col-span-8 pl-8 md:pl-12 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                    <span className="font-bold text-gray-750 text-2xs md:text-xs"> Bonificações de Produtos & Amostras Grátis </span>
                  </div>
                  <div className="col-span-4 md:col-span-2 text-right font-semibold text-xs font-mono text-gray-800">
                    R$ {dreData.bonificacoesSimplificado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </div>
                  <div className="col-span-1 text-right font-mono text-2xs font-semibold text-gray-500">
                    {percentOfBruta(dreData.bonificacoesSimplificado)}
                  </div>
                  <div className="col-span-1 text-right flex justify-end">
                    <button
                      onClick={() => toggleDescription('deduc-bonificacoes')}
                      className="p-1 text-gray-400 hover:text-indigo-600 rounded hover:bg-slate-150/50 transition cursor-pointer"
                    >
                      {openDescriptions['deduc-bonificacoes'] ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                {openDescriptions['deduc-bonificacoes'] && (
                  <div className="bg-indigo-50/25 border-t border-b border-indigo-100/30 py-2.5 px-12 md:px-20 text-[10px] text-gray-650 font-medium leading-relaxed font-sans animate-fadeIn">
                    Valor correspondente aos itens de pedidos faturados em regime de bonificação (preço zerado para o cliente mas custo interno considerado). Essencial para auditar estratégias promocionais e brindes industriais.
                  </div>
                )}
              </div>

              {/* Impostos */}
              <div className="last:border-b-0">
                <div className="grid grid-cols-12 py-2.5 px-4 lg:px-6 items-center hover:bg-slate-100/50 transition">
                  <div className="col-span-6 md:col-span-8 pl-8 md:pl-12 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                    <span className="font-bold text-gray-750 text-2xs md:text-xs"> Impostos e Tributos S/ Faturamento </span>
                  </div>
                  <div className="col-span-4 md:col-span-2 text-right font-semibold text-xs font-mono text-gray-800">
                    R$ {dreData.impostosEstimados.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </div>
                  <div className="col-span-1 text-right font-mono text-2xs font-semibold text-gray-500">
                    {percentOfBruta(dreData.impostosEstimados)}
                  </div>
                  <div className="col-span-1 text-right flex justify-end">
                    <button
                      onClick={() => toggleDescription('deduc-impostos')}
                      className="p-1 text-gray-400 hover:text-indigo-600 rounded hover:bg-slate-150/50 transition cursor-pointer"
                    >
                      {openDescriptions['deduc-impostos'] ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                {openDescriptions['deduc-impostos'] && (
                  <div className="bg-indigo-50/25 border-t border-b border-indigo-100/30 py-2.5 px-12 md:px-20 text-[10px] text-gray-655 font-medium leading-relaxed font-sans space-y-1.5 animate-fadeIn font-semibold">
                    <div>Estimativa de taxas fiscais e tributação direta sobre a Receita de Vendas.</div>
                    {dreData.impostosDetalhamento.length > 0 ? (
                      <div className="mt-1 pt-1 border-t border-gray-100 space-y-1">
                        <div className="font-bold text-gray-700 text-[9px] uppercase tracking-wider">Lançamentos reais de impostos encontrados:</div>
                        {dreData.impostosDetalhamento.map((imp, lIdx) => (
                          <div key={lIdx} className="flex justify-between max-w-sm font-semibold pl-2 text-red-700 font-mono">
                            <span>• {imp.desc} (pago em {imp.data.split('-').reverse().join('/')}):</span>
                            <span>R$ {imp.valor.toLocaleString("pt-BR")}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-amber-600 font-semibold text-[9px]">Apenas lançamentos simulados no momento (8% fixo aproximado com base no regime tributário).</div>
                    )}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

        {/* --- 3. RECEITA LIQUIDA LINE (Subtotal) --- */}
        <div className="border-b border-gray-150/70 bg-indigo-50/15">
          <div className="grid grid-cols-12 p-4 lg:px-6 items-center">
            <div className="col-span-8 md:col-span-8 pl-10 md:pl-12">
              <span className="text-xs font-black text-indigo-900 uppercase">3. (=) Receita Líquida</span>
              <span className="text-[8px] text-slate-450 font-bold ml-0 md:ml-3 block md:inline-block">Receita Líquida = Receita Bruta - Deduções</span>
            </div>
            <div className="col-span-4 md:col-span-2 text-right text-xs font-black text-indigo-750 font-mono">
              R$ {dreData.receitaLiquida.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <div className="col-span-2 text-right text-xs font-extrabold text-slate-500 font-mono">
              {percentOfBruta(dreData.receitaLiquida)}
            </div>
          </div>
        </div>

        {/* --- 4. CUSTO DOS PRODUTOS (CPV) --- */}
        <div className="border-b border-gray-100">
          <div className="grid grid-cols-12 p-4 lg:px-6 items-center hover:bg-slate-50/40 transition">
            <div className="col-span-6 md:col-span-8 flex items-center gap-3">
              <button 
                onClick={() => toggleExpand('cpv')}
                className="w-7 h-7 bg-red-50 border border-red-150 rounded-lg hover:bg-red-100 text-red-700 transition flex items-center justify-center cursor-pointer"
              >
                {expanded.cpv ? <Minus size={14} className="stroke-[3px]" /> : <Plus size={14} className="stroke-[3px]" />}
              </button>
              <div>
                <span className="text-xs font-black text-gray-900 block md:inline-block">4. (-) Custo dos Produtos (CPV)</span>
                <span className="text-[9px] text-gray-400 font-bold ml-0 md:ml-3 block md:inline-block">Custos industriais de fabricação do produto e compras de mandioca</span>
              </div>
            </div>
            <div className="col-span-4 md:col-span-2 text-right text-xs font-black text-rose-650 font-mono">
              - R$ {dreData.custosProdutos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <div className="col-span-2 text-right text-xs font-extrabold text-slate-500 font-mono">
              {percentOfBruta(dreData.custosProdutos)}
            </div>
          </div>

          {/* Expanded 4 */}
          {expanded.cpv && (
            <div className="bg-slate-50/60 border-t border-gray-100/80 divide-y divide-gray-100 animate-fadeIn">
              
              {/* Custos com Matéria-Prima Mandioca */}
              <div className="last:border-b-0">
                <div className="grid grid-cols-12 py-2.5 px-4 lg:px-6 items-center hover:bg-slate-100/50 transition">
                  <div className="col-span-6 md:col-span-8 pl-8 md:pl-12 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                    <span className="font-bold text-gray-750 text-2xs md:text-xs"> Custos com Matéria-Prima Mandioca (Entradas de Raiz) </span>
                  </div>
                  <div className="col-span-4 md:col-span-2 text-right font-semibold text-xs font-mono text-gray-800">
                    R$ {dreData.totalMandioca.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </div>
                  <div className="col-span-1 text-right font-mono text-2xs font-semibold text-gray-500">
                    {percentOfBruta(dreData.totalMandioca)}
                  </div>
                  <div className="col-span-1 text-right flex justify-end">
                    <button
                      onClick={() => toggleDescription('cpv-mandioca')}
                      className="p-1 text-gray-400 hover:text-indigo-600 rounded hover:bg-slate-150/50 transition cursor-pointer"
                    >
                      {openDescriptions['cpv-mandioca'] ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                {openDescriptions['cpv-mandioca'] && (
                  <div className="bg-indigo-50/25 border-t border-b border-indigo-100/30 py-3 px-12 md:px-20 text-[10px] text-gray-655 font-semibold font-medium leading-relaxed font-sans space-y-2 animate-fadeIn">
                    <div className="font-bold text-gray-750 uppercase tracking-wider text-[9px]">Detalhamento das compras de mandioca no período:</div>
                    {dreData.mandiocaBreakdown.length === 0 ? (
                      <div className="text-gray-400 font-semibold italic">Nenhuma compra de mandioca raiz faturada no período.</div>
                    ) : (
                      <div className="max-h-48 overflow-y-auto space-y-1.5 border-t border-gray-100/60 pt-2">
                        <div className="grid grid-cols-12 text-[8px] font-extrabold text-slate-400 uppercase tracking-widest pb-1">
                          <div className="col-span-6">Fornecedor</div>
                          <div className="col-span-3 text-center">Data</div>
                          <div className="col-span-3 text-right">Valor Líquido</div>
                        </div>
                        {dreData.mandiocaBreakdown.map((man, mIdx) => (
                          <div key={mIdx} className="grid grid-cols-12 font-semibold text-gray-600 hover:text-gray-950 font-mono text-2xs">
                            <div className="col-span-6 truncate font-sans text-xs font-semibold">{man.fornecedor} {man.peso > 0 && `(${man.peso.toLocaleString('pt-BR')} kg)`}</div>
                            <div className="col-span-3 text-center font-sans text-xs">{man.data.split('-').reverse().join('/')}</div>
                            <div className="col-span-3 text-right">R$ {man.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Custos de Industrialização e Produção */}
              <div className="last:border-b-0">
                <div className="grid grid-cols-12 py-2.5 px-4 lg:px-6 items-center hover:bg-slate-100/50 transition">
                  <div className="col-span-6 md:col-span-8 pl-8 md:pl-12 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                    <span className="font-bold text-gray-750 text-2xs md:text-xs"> Custos de Fabricação e Industrialização de Produtos </span>
                  </div>
                  <div className="col-span-4 md:col-span-2 text-right font-semibold text-xs font-mono text-gray-800">
                    R$ {dreData.cpvIndustrial.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </div>
                  <div className="col-span-1 text-right font-mono text-2xs font-semibold text-gray-500">
                    {percentOfBruta(dreData.cpvIndustrial)}
                  </div>
                  <div className="col-span-1 text-right flex justify-end">
                    <button
                      onClick={() => toggleDescription('cpv-industrializacao')}
                      className="p-1 text-gray-400 hover:text-indigo-600 rounded hover:bg-slate-150/50 transition cursor-pointer"
                    >
                      {openDescriptions['cpv-industrializacao'] ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                {openDescriptions['cpv-industrializacao'] && (
                  <div className="bg-indigo-50/25 border-t border-b border-indigo-100/30 py-3 px-12 md:px-20 text-[10px] text-gray-655 font-semibold font-medium leading-relaxed font-sans space-y-2 animate-fadeIn font-semibold">
                    <div className="font-bold text-gray-750 uppercase tracking-wider text-[9px]">Detalhamento de custo industrial unitário s/ itens faturados:</div>
                    {Object.keys(dreData.productCPVMap).length === 0 ? (
                      <div className="text-gray-400 font-semibold italic">Nenhum faturamento de itens industriais no período.</div>
                    ) : (
                      <div className="max-h-48 overflow-y-auto space-y-1.5 border-t border-gray-100/60 pt-2">
                        <div className="grid grid-cols-12 text-[8px] font-extrabold text-slate-400 uppercase tracking-widest pb-1">
                          <div className="col-span-6">Produto</div>
                          <div className="col-span-3 text-center">Quantidade</div>
                          <div className="col-span-3 text-right">Custo de Fabr.</div>
                        </div>
                        {Object.entries(dreData.productCPVMap).map(([prodId, pInfo]: [string, any]) => (
                          <div key={prodId} className="grid grid-cols-12 font-semibold text-gray-600 hover:text-gray-950 font-mono text-2xs">
                            <div className="col-span-6 truncate font-sans text-xs font-semibold">{getProductName(prodId)}</div>
                            <div className="col-span-3 text-center font-sans text-xs">{pInfo.qty} un</div>
                            <div className="col-span-3 text-right">R$ {pInfo.totalCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

        {/* --- 5. LUCRO BRUTO LINE (Subtotal) --- */}
        <div className="border-b border-gray-150/70 bg-indigo-50/15">
          <div className="grid grid-cols-12 p-4 lg:px-6 items-center">
            <div className="col-span-8 md:col-span-8 pl-10 md:pl-12">
              <span className="text-xs font-black text-indigo-900 uppercase">5. (=) Lucro Bruto</span>
              <span className="text-[8px] text-slate-450 font-bold ml-0 md:ml-3 block md:inline-block">Lucro Bruto = Receita Líquida - Custos CPV</span>
            </div>
            <div className="col-span-4 md:col-span-2 text-right text-xs font-black text-indigo-750 font-mono">
              R$ {dreData.lucroBruto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <div className="col-span-2 text-right text-xs font-extrabold text-slate-500 font-mono">
              {percentOfBruta(dreData.lucroBruto)}
            </div>
          </div>
        </div>

        {/* --- 6. DESPESAS FIXAS --- */}
        <div className="border-b border-gray-100">
          <div className="grid grid-cols-12 p-4 lg:px-6 items-center hover:bg-slate-50/40 transition">
            <div className="col-span-6 md:col-span-8 flex items-center gap-3">
              <button 
                onClick={() => toggleExpand('despesasFixas')}
                className="w-7 h-7 bg-red-50 border border-red-150 rounded-lg hover:bg-red-100 text-red-700 transition flex items-center justify-center cursor-pointer"
              >
                {expanded.despesasFixas ? <Minus size={14} className="stroke-[3px]" /> : <Plus size={14} className="stroke-[3px]" />}
              </button>
              <div>
                <span className="text-xs font-black text-gray-900 block md:inline-block">6. (-) Despesas Fixas</span>
                <span className="text-[9px] text-gray-400 font-bold ml-0 md:ml-3 block md:inline-block">Gerais e operacionais administrativas (Aluguel, salários, energia, etc)</span>
              </div>
            </div>
            <div className="col-span-4 md:col-span-2 text-right text-xs font-black text-rose-650 font-mono">
              - R$ {dreData.totalDespesasFixas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <div className="col-span-2 text-right text-xs font-extrabold text-slate-500 font-mono">
              {percentOfBruta(dreData.totalDespesasFixas)}
            </div>
          </div>

          {/* Expanded 6 */}
          {expanded.despesasFixas && (
            <div className="bg-slate-50/60 border-t border-gray-100/80 divide-y divide-gray-100 animate-fadeIn">
              {Object.keys(dreData.despesasFixasAgrupadas).length === 0 ? (
                <p className="text-xs text-gray-450 font-semibold p-4 text-center">Nenhuma despesa fixa lançada no período.</p>
              ) : (
                (Object.entries(dreData.despesasFixasAgrupadas) as [string, { total: number; itens: any[] }][]).map(([categoria, info]) => (
                  <div key={categoria} className="divide-y divide-gray-100/65">
                    {/* Category Subheader Line in table */}
                    <div className="grid grid-cols-12 bg-slate-100/80 border-t border-b border-gray-100 px-4 lg:px-6 py-1.5 items-center select-none">
                      <div className="col-span-8 pl-8 md:pl-12 text-[9px] font-black uppercase tracking-widest text-indigo-900/90">
                        📁 CATEGORIA: {categoria}
                      </div>
                      <div className="col-span-4 md:col-span-2 text-right text-[10px] font-extrabold text-indigo-950 font-sans">
                        Subtotal: R$ {info.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </div>
                      <div className="col-span-2 text-right text-[10px] font-semibold text-gray-500">
                        {percentOfBruta(info.total)}
                      </div>
                    </div>

                    {/* Category Items flat table lines */}
                    {info.itens.sort((a,b)=> new Date(b.data).getTime() - new Date(a.data).getTime()).map((itm) => {
                      const itmDateStr = (itm.data_pagamento || itm.data || '').split('-').reverse().join('/');
                      const isOpened = !!openDescriptions[itm.id];
                      return (
                        <div key={itm.id} className="last:border-b-0">
                          <div className="grid grid-cols-12 py-2.5 px-4 lg:px-6 items-center hover:bg-slate-100/50 transition">
                            <div className="col-span-6 md:col-span-8 pl-10 md:pl-16 flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                              <span className="font-bold text-gray-800 text-2xs md:text-xs truncate max-w-sm">
                                {itm.descricao || 'Despesa sem descrição'} <span className="text-[10px] text-gray-400 font-medium font-sans">({itmDateStr})</span>
                              </span>
                            </div>
                            <div className="col-span-4 md:col-span-2 text-right font-semibold text-xs font-mono text-gray-800">
                              R$ {itm.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </div>
                            <div className="col-span-1 text-right font-mono text-2xs font-semibold text-gray-500">
                              {percentOfBruta(itm.valor)}
                            </div>
                            <div className="col-span-1 text-right flex justify-end">
                              <button
                                onClick={() => toggleDescription(itm.id)}
                                className="p-1 text-gray-400 hover:text-indigo-600 rounded hover:bg-slate-150/55 transition cursor-pointer font-sans text-xs"
                                title="Ver detalhes da despesa"
                              >
                                {isOpened ? <EyeOff size={14} /> : <Eye size={14} />}
                              </button>
                            </div>
                          </div>
                          {isOpened && (
                            <div className="bg-indigo-50/25 border-t border-b border-indigo-100/30 py-2.5 px-12 md:px-24 text-[10px] text-gray-655 font-medium font-semibold leading-relaxed font-sans space-y-1 animate-fadeIn">
                              <div><strong>Descrição completa:</strong> {itm.descricao || 'Sem descrição cadastrada.'}</div>
                              <div><strong>Data de vencimento / pagamento:</strong> {itmDateStr}</div>
                              <div><strong>Categoria contábil:</strong> {itm.categoria || categoria}</div>
                              <div><strong>Tipo de pagamento / Guia:</strong> {itm.tipo_pagamento || 'Normal'}</div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* --- 7. DESPESAS VARIAVEIS --- */}
        <div className="border-b border-gray-100">
          <div className="grid grid-cols-12 p-4 lg:px-6 items-center hover:bg-slate-50/40 transition">
            <div className="col-span-6 md:col-span-8 flex items-center gap-3">
              <button 
                onClick={() => toggleExpand('despesasVariaveis')}
                className="w-7 h-7 bg-red-50 border border-red-150 rounded-lg hover:bg-red-100 text-red-700 transition flex items-center justify-center cursor-pointer"
              >
                {expanded.despesasVariaveis ? <Minus size={14} className="stroke-[3px]" /> : <Plus size={14} className="stroke-[3px]" />}
              </button>
              <div>
                <span className="text-xs font-black text-gray-900 block md:inline-block">7. (-) Despesas Variáveis</span>
                <span className="text-[9px] text-gray-400 font-bold ml-0 md:ml-3 block md:inline-block">Comissões de representantes, fretes comerciais, despesas bancárias e tarifas</span>
              </div>
            </div>
            <div className="col-span-4 md:col-span-2 text-right text-xs font-black text-rose-650 font-mono">
              - R$ {dreData.totalDespesasVariaveis.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <div className="col-span-2 text-right text-xs font-extrabold text-slate-500 font-mono">
              {percentOfBruta(dreData.totalDespesasVariaveis)}
            </div>
          </div>

          {/* Expanded 7 */}
          {expanded.despesasVariaveis && (
            <div className="bg-slate-50/60 border-t border-gray-100/80 divide-y divide-gray-100 animate-fadeIn">
              {Object.keys(dreData.despesasVariaveisAgrupadas).length === 0 ? (
                <p className="text-xs text-gray-450 font-semibold p-4 text-center">Nenhuma despesa variável lançada no período.</p>
              ) : (
                (Object.entries(dreData.despesasVariaveisAgrupadas) as [string, { total: number; itens: any[] }][]).map(([categoria, info]) => (
                  <div key={categoria} className="divide-y divide-gray-100/65">
                    {/* Category Subheader Line in table */}
                    <div className="grid grid-cols-12 bg-slate-100/80 border-t border-b border-gray-100 px-4 lg:px-6 py-1.5 items-center select-none">
                      <div className="col-span-8 pl-8 md:pl-12 text-[9px] font-black uppercase tracking-widest text-amber-900/90">
                        ⚡ CATEGORIA: {categoria}
                      </div>
                      <div className="col-span-4 md:col-span-2 text-right text-[10px] font-extrabold text-amber-950 font-sans">
                        Subtotal: R$ {info.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </div>
                      <div className="col-span-2 text-right text-[10px] font-semibold text-gray-500">
                        {percentOfBruta(info.total)}
                      </div>
                    </div>

                    {/* Category Items flat table lines */}
                    {info.itens.map((itm: any) => {
                      const itmDateStr = itm.data ? itm.data.split('-').reverse().join('/') : '-';
                      const isOpened = !!openDescriptions[itm.id];
                      return (
                        <div key={itm.id} className="last:border-b-0">
                          <div className="grid grid-cols-12 py-2.5 px-4 lg:px-6 items-center hover:bg-slate-100/50 transition">
                            <div className="col-span-6 md:col-span-8 pl-10 md:pl-16 flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                              <span className="font-bold text-gray-800 text-2xs md:text-xs truncate max-w-sm">
                                {itm.descricao || 'Despesa Variável'} {itm.data && <span className="text-[10px] text-gray-400 font-medium">({itmDateStr})</span>}
                              </span>
                            </div>
                            <div className="col-span-4 md:col-span-2 text-right font-semibold text-xs font-mono text-gray-800">
                              R$ {itm.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </div>
                            <div className="col-span-1 text-right font-mono text-2xs font-semibold text-gray-500">
                              {percentOfBruta(itm.valor)}
                            </div>
                            <div className="col-span-1 text-right flex justify-end">
                              <button
                                onClick={() => toggleDescription(itm.id)}
                                className="p-1 text-gray-400 hover:text-indigo-600 rounded hover:bg-slate-150/50 transition cursor-pointer"
                                title="Ver detalhes da despesa"
                              >
                                {isOpened ? <EyeOff size={14} /> : <Eye size={14} />}
                              </button>
                            </div>
                          </div>
                          {isOpened && (
                            <div className="bg-indigo-50/25 border-t border-b border-indigo-100/30 py-2.5 px-12 md:px-24 text-[10px] text-gray-655 font-medium leading-relaxed font-sans space-y-1 animate-fadeIn font-semibold">
                              <div><strong>Descrição completa:</strong> {itm.descricao || 'Lançamento de despesa variável operacional.'}</div>
                              {itm.data && <div><strong>Data de competência / lançamento:</strong> {itmDateStr}</div>}
                              <div><strong>Categoria contábil:</strong> {itm.categoria || categoria}</div>
                              {itm.id.startsWith('comission-itm-') && (
                                <div className="text-indigo-600 font-semibold">• Gerado de comissões faturadas no período para o representante fiscalizado.</div>
                              )}
                              {itm.id.startsWith('fincost-itm-') && (
                                <div className="text-amber-600 font-semibold">• Despesa financeira de tarifas, adiantamento ou juros de boletos/duplicatas faturadas.</div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* --- 8. RECEITAS FINANCEIRAS --- */}
        <div className="border-b border-gray-100">
          <div className="grid grid-cols-12 p-4 lg:px-6 items-center hover:bg-slate-50/40 transition">
            <div className="col-span-6 md:col-span-8 flex items-center gap-3">
              <button 
                onClick={() => toggleExpand('receitasFinanceiras')}
                className="w-7 h-7 bg-emerald-50 border border-emerald-150 rounded-lg hover:bg-emerald-100 text-emerald-700 transition flex items-center justify-center cursor-pointer"
              >
                {expanded.receitasFinanceiras ? <Minus size={14} className="stroke-[3px]" /> : <Plus size={14} className="stroke-[3px]" />}
              </button>
              <div>
                <span className="text-xs font-black text-gray-900 block md:inline-block">8. (+) Receitas Financeiras</span>
                <span className="text-[9px] text-gray-400 font-bold ml-0 md:ml-3 block md:inline-block">Juros decorrentes de recebimentos atrasados obtidos de clientes</span>
              </div>
            </div>
            <div className="col-span-4 md:col-span-2 text-right text-xs font-black text-emerald-700 font-mono">
              + R$ {dreData.receitasFinanceiras.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <div className="col-span-2 text-right text-xs font-extrabold text-slate-500 font-mono">
              {percentOfBruta(dreData.receitasFinanceiras)}
            </div>
          </div>

          {/* Expanded 8 */}
          {expanded.receitasFinanceiras && (
            <div className="bg-slate-50/60 border-t border-gray-100/80 divide-y divide-gray-100 animate-fadeIn">
              {dreData.jurosRecebidosDetalhes.length === 0 ? (
                <p className="text-xs text-gray-450 font-semibold p-4 text-center">Nenhuma receita financeira cadastrada no período selecionado.</p>
              ) : (
                dreData.jurosRecebidosDetalhes.map((r, index) => {
                  const rId = `rec-financial-${index}`;
                  const isOpened = !!openDescriptions[rId];
                  const rDateStr = r.data ? r.data.split('T')[0].split('-').reverse().join('/') : '-';
                  return (
                    <div key={index} className="last:border-b-0">
                      <div className="grid grid-cols-12 py-2.5 px-4 lg:px-6 items-center hover:bg-slate-100/50 transition">
                        <div className="col-span-6 md:col-span-8 pl-8 md:pl-12 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                          <span className="font-bold text-gray-800 text-2xs md:text-xs truncate max-w-sm font-sans">
                            {r.desc} <span className="text-[10px] text-gray-400 font-medium font-sans">({rDateStr})</span>
                          </span>
                        </div>
                        <div className="col-span-4 md:col-span-2 text-right font-semibold text-xs font-mono text-emerald-700">
                          + R$ {r.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </div>
                        <div className="col-span-1 text-right font-mono text-2xs font-semibold text-gray-500">
                          {percentOfBruta(r.valor)}
                        </div>
                        <div className="col-span-1 text-right flex justify-end">
                          <button
                            onClick={() => toggleDescription(rId)}
                            className="p-1 text-gray-400 hover:text-indigo-600 rounded hover:bg-slate-150/50 transition cursor-pointer font-sans"
                            title="Ver detalhes da receita financeira"
                          >
                            {isOpened ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>
                      {isOpened && (
                        <div className="bg-indigo-50/25 border-t border-b border-indigo-100/30 py-2.5 px-12 md:px-24 text-[10px] text-gray-655 font-semibold font-medium leading-relaxed font-sans space-y-1 animate-fadeIn">
                          <div><strong>Origem do recebimento:</strong> {r.desc}</div>
                          <div><strong>Data da transação:</strong> {rDateStr}</div>
                          <div><strong>Valor registrado de juros/multas:</strong> R$ {r.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                          <div className="text-emerald-600 font-semibold">• Esta receita é classificada como rendimentos capitais ou penalidades aplicadas sob inadimplência contratual de clientes.</div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* --- 9. RESULTADO OPERACIONAL FINAL (Completely replaces Imposto de Renda / CSLL) --- */}
        <div className={`border-t border-gray-250 ${
          dreData.resultadoOperacional >= 0 ? "bg-emerald-500/10" : "bg-rose-500/10"
        }`}>
          <div className="grid grid-cols-12 p-5 lg:px-6 items-center">
            <div className="col-span-6 md:col-span-8 pl-6">
              <span className="text-sm font-black text-gray-900 uppercase">9. (=) Resultado Operacional</span>
              <span className="text-[9px] text-gray-500 font-bold ml-0 md:ml-3 block md:inline-block">Resultado consolidado final da competência gerencial do negócio</span>
            </div>
            <div className={`col-span-4 md:col-span-2 text-right text-sm font-black font-mono ${
              dreData.resultadoOperacional >= 0 ? "text-emerald-700 font-extrabold" : "text-rose-700 font-extrabold"
            }`}>
              R$ {dreData.resultadoOperacional.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <div className="col-span-2 text-right text-xs font-black text-gray-900 font-mono">
              {percentOfBruta(dreData.resultadoOperacional)}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
