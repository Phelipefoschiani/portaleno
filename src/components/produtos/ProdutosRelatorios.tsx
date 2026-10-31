import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Package,
  Layers,
  Download,
  Printer,
  Sparkles,
  PieChart as PieChartIcon
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import {
  ESTOQUE_PRODUTOS_INICIAIS,
  MATERIAS_PRIMAS_INICIAIS
} from '../../data/produtosData';
import { ProdutosNavTabs } from './ProdutosNavTabs';

interface Props {
  onNavigate?: (tabId: string) => void;
}

export function ProdutosRelatorios({ onNavigate }: Props) {
  const produtos = ESTOQUE_PRODUTOS_INICIAIS;
  const materias = MATERIAS_PRIMAS_INICIAIS;

  const totalEstoqueKg = produtos.reduce((acc, p) => acc + p.estoque_atual_kg, 0);
  const totalRaizTon = materias.find(m => m.categoria === 'Raiz In Natura')?.estoque_atual || 0;

  const dadosGrafico = produtos.map(p => ({
    nome: p.nome.split(' ')[0] + ' ' + (p.nome.split(' ')[1] || ''),
    estoqueTon: parseFloat((p.estoque_atual_kg / 1000).toFixed(1)),
    minimoTon: parseFloat((p.estoque_minimo_kg / 1000).toFixed(1))
  }));

  const handleExportarCsv = () => {
    const cabecalho = 'Codigo,Nome,Categoria,Embalagem,Estoque_Sacos,Estoque_Ton,Preco_Unitario\n';
    const linhas = produtos.map(p =>
      `"${p.codigo}","${p.nome}","${p.categoria}","${p.tipo_embalagem}",${p.estoque_atual_sacos},${(p.estoque_atual_kg / 1000).toFixed(2)},${p.preco_unitario_venda.toFixed(2)}`
    ).join('\n');

    const blob = new Blob([cabecalho + linhas], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_estoque_produtos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="relative h-full w-full flex flex-col bg-[#f8faf8] text-slate-800 overflow-y-auto">
      
      {/* 1. NAVEGAÇÃO DE PRODUTOS */}
      <ProdutosNavTabs activeTab="produtos_relatorios" onNavigate={onNavigate} />

      {/* 2. CABEÇALHO COMPACTO & MINIMALISTA */}
      <div className="bg-white border-b border-slate-200/80 px-6 py-3.5 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Relatórios Industriais & Posição de Estoque</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                Consolidado
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Balanço de massa, curva de produtos acabados vs matérias-primas e capacidade produtiva instalada.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportarCsv}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar CSV</span>
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>
          </div>
        </div>

        {/* STAT BAR MINIMALISTA EM LINHA */}
        <div className="flex flex-wrap items-center gap-6 pt-3 mt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Estoque Acabado Total:</span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              {(totalEstoqueKg / 1000).toLocaleString('pt-BR')} Toneladas
            </span>
          </div>
          <div className="w-px h-4 bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Raiz no Pátio (Autonomia):</span>
            <span className="font-mono font-bold text-slate-900">
              {totalRaizTon.toLocaleString('pt-BR')} Ton (~4 dias de moagem)
            </span>
          </div>
          <div className="w-px h-4 bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Taxa de Extração Média:</span>
            <span className="font-mono font-bold text-emerald-700">
              26.5% de rendimento de amido
            </span>
          </div>
        </div>
      </div>

      {/* 3. GRÁFICO E TABELAS */}
      <div className="p-6 space-y-6">
        
        {/* Gráfico de Estoque Atual vs Mínimo */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
          <div className="mb-4">
            <h3 className="font-bold text-sm text-slate-900">Posição de Estoque Atual vs Estoque Mínimo (Toneladas)</h3>
            <p className="text-xs text-slate-400">Garante que a fábrica nunca sofra ruptura nas entregas para indústrias e distribuidores.</p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosGrafico}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="nome" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '11px' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="estoqueTon" name="Estoque Atual (Ton)" fill="#064e3b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="minimoTon" name="Estoque Mínimo (Ton)" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tabela de Posição de Estoque */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
          <div className="mb-3">
            <h3 className="font-bold text-sm text-slate-900">Resumo Físico por Linha de Produto</h3>
          </div>

          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500 border-b border-slate-200">
                <th className="py-2.5 px-3">Produto</th>
                <th className="py-2.5 px-3">Categoria</th>
                <th className="py-2.5 px-3 text-right">Saldo em Sacos</th>
                <th className="py-2.5 px-3 text-right">Saldo em Toneladas</th>
                <th className="py-2.5 px-3 text-right">Valor em Estoque</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {produtos.map((p, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60">
                  <td className="py-2.5 px-3 font-sans font-medium text-slate-900">{p.nome}</td>
                  <td className="py-2.5 px-3 font-sans text-slate-600">{p.categoria}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-800">{p.estoque_atual_sacos.toLocaleString('pt-BR')} un</td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-800">{(p.estoque_atual_kg / 1000).toLocaleString('pt-BR')} Ton</td>
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-800">
                    {(p.estoque_atual_sacos * p.preco_unitario_venda).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}
