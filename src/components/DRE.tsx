import React, { useState, useMemo } from 'react';
import { useGlobalState } from '../GlobalStateContext';
import { TrendingUp, DollarSign, Building2, Wrench, Wallet, MoreHorizontal, Download, Printer, Filter } from 'lucide-react';

export default function DRE() {
  const { pedidos, despesas, comissoes } = useGlobalState();
  const [mesFiltro, setMesFiltro] = useState('Todos');

  // Extrair meses únicos para o filtro (YYYY-MM)
  const mesesDisponiveis = useMemo(() => {
    const datas = new Set<string>();
    pedidos.forEach(p => { if (p.data) datas.add(p.data.substring(0, 7)); });
    despesas.forEach(d => { if (d.data) datas.add(d.data.substring(0, 7)); });
    comissoes.forEach(c => { 
      if (c.data_pagamento) datas.add(c.data_pagamento.substring(0, 7)); 
      else if (c.data_prevista) datas.add(c.data_prevista.substring(0, 7)); 
    });
    
    return Array.from(datas).filter(Boolean).sort().reverse();
  }, [pedidos, despesas, comissoes]);

  const filterByDate = (dataStr?: string) => {
    if (mesFiltro === 'Todos') return true;
    if (!dataStr) return false;
    return dataStr.startsWith(mesFiltro);
  };
  
  const pedidosFiltrados = pedidos.filter(p => p.status === 'Faturado' && filterByDate(p.data));
  const faturamentoBruto = pedidosFiltrados.reduce((acc, p) => acc + p.valor_total, 0);
  const impostos = faturamentoBruto * 0.12; 
  const faturamentoLiquido = faturamentoBruto - impostos;
  
  const cpv = pedidosFiltrados.reduce((acc, p) => acc + p.custo_total, 0);
  const lucroBruto = faturamentoLiquido - cpv;
  
  const despesasFiltradas = despesas.filter(d => d.tipo === 'Empresa' && filterByDate(d.data));
  const despesasAdmin = despesasFiltradas.filter(d => d.categoria === 'Administrativa').reduce((acc, d) => acc + d.valor, 0);
  const despesasOp = despesasFiltradas.filter(d => d.categoria === 'Operacional').reduce((acc, d) => acc + d.valor, 0);
  const despesasOc = despesasFiltradas.filter(d => d.categoria === 'Ocasionais' || d.categoria === 'Outros').reduce((acc, d) => acc + d.valor, 0);
  
  const comissoesFiltradas = comissoes.filter(c => filterByDate(c.data_pagamento || c.data_prevista));
  const valorComissoes = comissoesFiltradas.reduce((acc, c) => acc + c.valor_comissao, 0);
  
  const totalDespesas = despesasAdmin + despesasOp + despesasOc + valorComissoes;
  const lucroLiquido = lucroBruto - totalDespesas;
  const margemLiquida = faturamentoBruto > 0 ? (lucroLiquido / faturamentoBruto) * 100 : 0;

  const formatMes = (mes: string) => {
    if (mes === 'Todos') return 'Todos';
    const [ano, m] = mes.split('-');
    return `${m}/${ano}`;
  };

  const handleExportExcel = () => {
     const csvContent = [
       ['Demonstrativo de Resultados - DRE'],
       ['Periodo', mesFiltro === 'Todos' ? 'Consolidado' : formatMes(mesFiltro)],
       [''],
       ['Receita Bruta de Vendas', faturamentoBruto.toFixed(2).replace('.', ',')],
       ['(-) Deducoes e Impostos', impostos.toFixed(2).replace('.', ',')],
       ['(=) RECEITA LIQUIDA', faturamentoLiquido.toFixed(2).replace('.', ',')],
       ['(-) Custo dos Produtos Vendidos (CPV)', cpv.toFixed(2).replace('.', ',')],
       ['(=) LUCRO BRUTO', lucroBruto.toFixed(2).replace('.', ',')],
       [''],
       ['Despesas Operacionais / Fixas'],
       ['Despesas Administrativas', despesasAdmin.toFixed(2).replace('.', ',')],
       ['Custos Operacionais', despesasOp.toFixed(2).replace('.', ',')],
       ['Comissoes e Representantes', valorComissoes.toFixed(2).replace('.', ',')],
       ['Despesas Ocasionais / Extras', despesasOc.toFixed(2).replace('.', ',')],
       [''],
       ['Resultado Liquido do Exercicio', lucroLiquido.toFixed(2).replace('.', ',')],
       ['Margem Liquida Real (%)', margemLiquida.toFixed(2).replace('.', ',')],
     ].map(e => e.join(';')).join('\n');
     
     const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
     const url = URL.createObjectURL(blob);
     const link = document.createElement('a');
     link.setAttribute('href', url);
     link.setAttribute('download', `DRE_${mesFiltro === 'Todos' ? 'Consolidado' : mesFiltro}.csv`);
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20 print-ready">
      {/* Cabeçalho */}
      <div className="bg-primary p-12 rounded-[50px] shadow-3xl shadow-primary/20 text-white relative overflow-hidden hide-on-print">
         <div className="absolute top-0 right-0 p-12 opacity-5"><DollarSign size={200} /></div>
         <div className="relative z-10 space-y-4">
            <h2 className="text-4xl font-black tracking-tighter uppercase">DRE - Demonstrativo de Resultados</h2>
            <p className="text-accent/60 font-medium max-w-md italic">Acompanhamento consolidado de performance e lucratividade real.</p>
         </div>
      </div>

      {/* Controles de Filtros e Exportação */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-[35px] border border-gray-100 shadow-sm max-w-5xl mx-auto hide-on-print">
         <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="p-3 bg-primary/5 text-primary rounded-xl shrink-0"><Filter size={20} /></div>
            <div className="flex flex-col">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 mb-1">Período de Apuração</label>
               <select 
                  value={mesFiltro}
                  onChange={(e) => setMesFiltro(e.target.value)}
                  className="w-full md:w-48 px-4 py-2.5 rounded-xl bg-gray-50 border-none text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
               >
                  <option value="Todos">Todo o Período (Consolidado)</option>
                  {mesesDisponiveis.map(m => (
                     <option key={m} value={m}>{formatMes(m)}</option>
                  ))}
               </select>
            </div>
         </div>
         <div className="flex gap-3 w-full md:w-auto">
            <button 
               onClick={() => window.print()} 
               className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-gray-50 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest shadow-sm"
               title="Imprimir visualização atual"
            >
               <Printer size={16} /> Imprimir PDF
            </button>
            <button 
               onClick={handleExportExcel} 
               className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-primary/5 text-primary hover:bg-primary hover:text-white rounded-xl transition-all font-black text-[10px] uppercase tracking-widest shadow-sm"
               title="Baixar planilha para Excel"
            >
               <Download size={16} /> Exportar Excel
            </button>
         </div>
      </div>

      {/* Estrutura DRE */}
      <div className="bg-white p-12 rounded-[50px] border border-gray-100 shadow-sm space-y-10 max-w-5xl mx-auto dre-print-container">
         <div className="flex justify-between items-center border-b border-gray-50 pb-6">
            <div className="flex flex-col">
               <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Estrutura de Resultados</h3>
               <p className="hidden print-only text-lg font-black text-primary mt-2 uppercase">DRE - {mesFiltro === 'Todos' ? 'Período Consolidado' : formatMes(mesFiltro)}</p>
            </div>
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full hide-on-print">
               <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
               <span className="text-[10px] font-black uppercase text-gray-500">{mesFiltro === 'Todos' ? 'Dados Consolidados' : `Apuração de ${formatMes(mesFiltro)}`}</span>
            </div>
         </div>

         <div className="space-y-4">
            {/* Header Line */}
            <div className="flex justify-between items-center py-6 px-10 bg-gray-50 rounded-3xl">
               <span className="text-sm font-black text-gray-900 border-l-4 border-primary pl-4 uppercase">Receita Bruta de Vendas</span>
               <span className="text-2xl font-black text-primary">R$ {faturamentoBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            
            <div className="px-10 py-6 space-y-4">
               <div className="flex justify-between items-center text-sm font-medium text-gray-500 italic">
                  <span>(-) Deduções e Impostos (Simples Nacional 12%)</span>
                  <span className="font-bold text-red-500">-R$ {impostos.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
               </div>
               <div className="flex justify-between items-center text-lg font-black text-gray-800 border-t border-gray-100 pt-6">
                  <span>(=) RECEITA LÍQUIDA</span>
                  <span>R$ {faturamentoLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
               </div>
               <div className="flex justify-between items-center text-sm font-medium text-gray-500 italic">
                  <span>(-) Custo dos Produtos Vendidos (CPV)</span>
                  <span className="font-bold text-red-500">-R$ {cpv.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
               </div>
            </div>

            <div className="flex justify-between items-center py-6 px-10 bg-accent/30 rounded-3xl border-2 border-accent/20">
               <span className="text-sm font-black text-primary uppercase">(=) LUCRO BRUTO (Margem de Contribuição)</span>
               <span className="text-2xl font-black text-primary">R$ {lucroBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            <div className="px-10 py-8 space-y-6">
               <h4 className="text-[10px] font-black text-gray-300 uppercase tracking-widest border-b border-gray-50 pb-2">Despesas Operacionais / Fixas</h4>
               <div className="flex justify-between items-center text-sm font-medium text-gray-600">
                  <span className="flex items-center gap-3"><Building2 size={16} className="text-gray-400" /> Despesas Administrativas</span>
                  <span className="text-red-500 font-bold">-R$ {despesasAdmin.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
               </div>
               <div className="flex justify-between items-center text-sm font-medium text-gray-600">
                  <span className="flex items-center gap-3"><Wrench size={16} className="text-gray-400" /> Custos Operacionais</span>
                  <span className="text-red-500 font-bold">-R$ {despesasOp.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
               </div>
               <div className="flex justify-between items-center text-sm font-medium text-gray-600">
                  <span className="flex items-center gap-3"><Wallet size={16} className="text-gray-400" /> Comissões e Representantes</span>
                  <span className="text-red-500 font-bold">-R$ {valorComissoes.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
               </div>
               <div className="flex justify-between items-center text-sm font-medium text-gray-600">
                  <span className="flex items-center gap-3"><MoreHorizontal size={16} className="text-gray-400" /> Despesas Ocasionais / Extras</span>
                  <span className="text-red-500 font-bold">-R$ {despesasOc.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
               </div>
            </div>

            <div className="flex justify-between items-center py-10 px-12 bg-secondary text-primary rounded-[40px] relative overflow-hidden shadow-2xl shadow-secondary/20 result-card-print">
               <div className="absolute top-0 right-0 p-6 opacity-10"><TrendingUp size={120} /></div>
               <div className="space-y-1 relative z-10">
                  <span className="text-xs font-black uppercase tracking-widest opacity-60">Resultado Líquido do Exercício</span>
                  <h4 className="text-4xl font-black tracking-tighter">R$ {lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h4>
               </div>
               <div className="text-right space-y-1 relative z-10">
                  <span className="text-xs font-black uppercase tracking-widest opacity-60">Margem Líquida Real</span>
                  <h4 className="text-4xl font-black tracking-tighter">{margemLiquida.toFixed(2)}%</h4>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}

