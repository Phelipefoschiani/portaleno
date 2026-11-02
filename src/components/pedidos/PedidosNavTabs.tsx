import React, { useState, useEffect } from 'react';
import {
  FileText,
  Factory,
  Receipt,
  Truck,
  CheckCheck,
  BarChart3,
  ClipboardList
} from 'lucide-react';
import { carregarPedidosVenda } from '../../data/pedidosVendaData';
import { carregarOrdensProducao, EVENTO_OPS } from '../../data/ordensProducaoData';

export interface PedidosNavTabsProps {
  activeTab: 'pedidos_orcamentos_sugestivo' | 'pedidos_em_producao' | 'pedidos_ordens_producao' | 'pedidos_a_faturar' | 'pedidos_faturados' | 'pedidos_entregues' | 'pedidos_relatorios';
  onNavigate?: (tabId: string) => void;
}

export function PedidosNavTabs({ activeTab, onNavigate }: PedidosNavTabsProps) {
  const [counts, setCounts] = useState({
    orcamentos: 0,
    producao: 0,
    afaturar: 0,
    faturados: 0,
    entregues: 0,
    ops: 0,
  });

  const atualizarContadores = () => {
    const todos = carregarPedidosVenda();
    setCounts({
      orcamentos: todos.filter(p => p.etapa === 'ORCAMENTO').length,
      producao: todos.filter(p => p.etapa === 'EM_PRODUCAO').length,
      afaturar: todos.filter(p => p.etapa === 'A_FATURAR').length,
      faturados: todos.filter(p => p.etapa === 'FATURADO').length,
      entregues: todos.filter(p => p.etapa === 'ENTREGUE').length,
      ops: carregarOrdensProducao().filter(o => o.status === 'PLANEJADA' || o.status === 'EM_PRODUCAO').length,
    });
  };

  useEffect(() => {
    atualizarContadores();
    const handleUpdate = () => atualizarContadores();
    window.addEventListener('pedidos_venda_updated', handleUpdate);
    window.addEventListener(EVENTO_OPS, handleUpdate);
    return () => {
      window.removeEventListener('pedidos_venda_updated', handleUpdate);
      window.removeEventListener(EVENTO_OPS, handleUpdate);
    };
  }, []);

  const tabs = [
    {
      id: 'pedidos_orcamentos_sugestivo',
      label: 'Vendas',
      count: counts.orcamentos,
      icon: <FileText className="w-3.5 h-3.5" />
    },
    {
      id: 'pedidos_em_producao',
      label: 'Em Produção',
      count: counts.producao,
      icon: <Factory className="w-3.5 h-3.5" />
    },
    {
      id: 'pedidos_ordens_producao',
      label: 'Ordens de Produção',
      count: counts.ops,
      icon: <ClipboardList className="w-3.5 h-3.5" />
    },
    {
      id: 'pedidos_a_faturar',
      label: 'A Faturar',
      count: counts.afaturar,
      countHighlight: counts.afaturar > 0,
      icon: <Receipt className="w-3.5 h-3.5" />
    },
    {
      id: 'pedidos_faturados',
      label: 'Faturados',
      count: counts.faturados,
      icon: <Truck className="w-3.5 h-3.5" />
    },
    {
      id: 'pedidos_entregues',
      label: 'Entregues',
      count: counts.entregues,
      icon: <CheckCheck className="w-3.5 h-3.5" />
    },
    {
      id: 'pedidos_relatorios',
      label: 'Relatórios',
      icon: <BarChart3 className="w-3.5 h-3.5" />
    }
  ];

  return (
    <div className="w-full bg-white border-b border-slate-200/80 px-6 py-2 flex items-center gap-1.5 overflow-x-auto shrink-0 select-none no-scrollbar">
      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-2 hidden md:inline">
        Fluxo:
      </span>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onNavigate && onNavigate(tab.id)}
            className={`
              flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer
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
                  : tab.countHighlight 
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
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
