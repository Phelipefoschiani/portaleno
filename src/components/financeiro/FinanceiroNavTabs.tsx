import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  CreditCard,
  Receipt,
  FileText,
  FileCheck2,
  TrendingUp,
  Landmark
} from 'lucide-react';
import { carregarTitulosReceber, carregarTitulosPagar } from '../../data/financeiroData';

export interface FinanceiroNavTabsProps {
  activeTab: 
    | 'financeiro_a_receber'
    | 'financeiro_a_pagar'
    | 'financeiro_lancar_despesas'
    | 'financeiro_notas_saida'
    | 'financeiro_notas_entrada'
    | 'financeiro_lancar_receita'
    | 'financeiro_caixa_investimento';
  onNavigate?: (tabId: string) => void;
}

export function FinanceiroNavTabs({ activeTab, onNavigate }: FinanceiroNavTabsProps) {
  const [counts, setCounts] = useState({
    aReceber: 0,
    aPagar: 0
  });

  const atualizarContagens = () => {
    const rec = carregarTitulosReceber();
    const pag = carregarTitulosPagar();
    setCounts({
      aReceber: rec.filter(r => r.status !== 'PAGO').length,
      aPagar: pag.filter(p => p.status !== 'PAGO').length
    });
  };

  useEffect(() => {
    atualizarContagens();
    const handleUpdate = () => atualizarContagens();
    window.addEventListener('financeiro_updated', handleUpdate);
    return () => window.removeEventListener('financeiro_updated', handleUpdate);
  }, []);

  const tabs = [
    {
      id: 'financeiro_a_receber',
      label: 'A Receber',
      count: counts.aReceber,
      icon: <DollarSign className="w-3.5 h-3.5" />
    },
    {
      id: 'financeiro_a_pagar',
      label: 'A Pagar',
      count: counts.aPagar,
      icon: <CreditCard className="w-3.5 h-3.5" />
    },
    {
      id: 'financeiro_lancar_despesas',
      label: 'Lançar Despesas',
      icon: <Receipt className="w-3.5 h-3.5" />
    },
    {
      id: 'financeiro_notas_saida',
      label: 'Notas de Saída (NF-e)',
      icon: <FileCheck2 className="w-3.5 h-3.5" />
    },
    {
      id: 'financeiro_notas_entrada',
      label: 'Notas de Entrada',
      icon: <FileText className="w-3.5 h-3.5" />
    },
    {
      id: 'financeiro_lancar_receita',
      label: 'Lançar Receita / Resíduos',
      icon: <TrendingUp className="w-3.5 h-3.5" />
    },
    {
      id: 'financeiro_caixa_investimento',
      label: 'Caixa & Investimento',
      icon: <Landmark className="w-3.5 h-3.5" />
    }
  ];

  return (
    <div className="w-full bg-white border-b border-slate-200/80 px-6 py-2 flex items-center gap-1.5 overflow-x-auto shrink-0 select-none no-scrollbar">
      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-2 hidden md:inline">
        Financeiro:
      </span>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onNavigate && onNavigate(tab.id)}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer
              ${isActive 
                ? 'bg-emerald-900 text-white shadow-xs font-bold' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-medium'
              }
            `}
          >
            <span className={isActive ? 'text-lime-300' : 'text-slate-400'}>
              {tab.icon}
            </span>
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={`
                px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold
                ${isActive 
                  ? 'bg-emerald-800 text-emerald-100 border border-emerald-700' 
                  : 'bg-slate-100 text-slate-600'
                }
              `}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
