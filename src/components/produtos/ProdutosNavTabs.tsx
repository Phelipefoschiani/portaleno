import React from 'react';
import { useDentroDoShell } from '../ui/ShellContext';
import {
  FlaskConical,
  Calculator,
  Package,
  Boxes,
  BarChart3,
  FileCheck2,
  Tag,
  QrCode
} from 'lucide-react';

export interface ProdutosNavTabsProps {
  activeTab: 
    | 'produtos_receita'
    | 'produtos_estoque_cadastro'
    | 'produtos_materia_prima'
    | 'produtos_relatorios'
    | 'produtos_ficha_tecnica'
    | 'produtos_tabela_preco'
    | 'produtos_etiqueta';
  onNavigate?: (tabId: string) => void;
}

export function ProdutosNavTabs({ activeTab, onNavigate }: ProdutosNavTabsProps) {
  // Dentro do shell administrativo o submenu da seção já aparece na faixa superior
  const dentroDoShell = useDentroDoShell();
  const tabs = [
    {
      id: 'produtos_estoque_cadastro',
      label: 'Produtos Acabados',
      icon: <Package className="w-3.5 h-3.5" />
    },
    {
      id: 'produtos_materia_prima',
      label: 'Matéria-Prima',
      icon: <Boxes className="w-3.5 h-3.5" />
    },
    {
      id: 'produtos_receita',
      label: 'Receitas & Rendimento',
      icon: <FlaskConical className="w-3.5 h-3.5" />
    },
    {
      id: 'produtos_ficha_tecnica',
      label: 'Ficha Técnica',
      icon: <FileCheck2 className="w-3.5 h-3.5" />
    },
    {
      id: 'produtos_tabela_preco',
      label: 'Tabela de Preço',
      icon: <Tag className="w-3.5 h-3.5" />
    },
    {
      id: 'produtos_etiqueta',
      label: 'Etiquetas & Lotes',
      icon: <QrCode className="w-3.5 h-3.5" />
    },
    {
      id: 'produtos_relatorios',
      label: 'Relatórios',
      icon: <BarChart3 className="w-3.5 h-3.5" />
    }
  ];

  if (dentroDoShell) return null;

  return (
    <div className="w-full bg-white border-b border-slate-200/80 px-6 py-2 flex items-center gap-1.5 overflow-x-auto shrink-0 select-none no-scrollbar">
      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-2 hidden md:inline">
        Produtos:
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
          </button>
        );
      })}
    </div>
  );
}
