import React, { useState, useEffect } from 'react';
import {
  QrCode,
  Printer,
  Barcode,
  Layers,
  Sparkles,
  Calendar,
  CheckCircle2,
  Package
} from 'lucide-react';
import { carregarEstoqueProdutos, carregarFichasTecnicas, ProdutoEstoque } from '../../data/produtosData';
import { hojeISO, parseData, formatarDataBR } from '../../lib/datas';
import { ProdutosNavTabs } from './ProdutosNavTabs';

interface Props {
  onNavigate?: (tabId: string) => void;
}

export function ProdutosEtiqueta({ onNavigate }: Props) {
  // Produtos reais do estoque (Cadastro de Produtos)
  const [produtos, setProdutos] = useState<ProdutoEstoque[]>(() => carregarEstoqueProdutos());
  const [produtoSelId, setProdutoSelId] = useState(() => carregarEstoqueProdutos()[0]?.id || '');
  const [lote, setLote] = useState(`LOTE-ENO-${hojeISO().slice(2).replace(/-/g, '')}`);
  const [dataFabricacao, setDataFabricacao] = useState(hojeISO());
  const [quantidadeEtiquetas, setQuantidadeEtiquetas] = useState('1');

  useEffect(() => {
    const atualizar = () => setProdutos(carregarEstoqueProdutos());
    window.addEventListener('produtos_updated', atualizar);
    return () => window.removeEventListener('produtos_updated', atualizar);
  }, []);

  useEffect(() => {
    if (!produtos.some(p => p.id === produtoSelId)) setProdutoSelId(produtos[0]?.id || '');
  }, [produtos]);

  const produto = produtos.find(p => p.id === produtoSelId) || produtos[0];

  // Validade pela ficha técnica do produto (prazo em meses); 24 meses quando não informado
  const calcValidade = () => {
    const d = parseData(dataFabricacao);
    if (!d || !produto) return '-';
    const ficha = carregarFichasTecnicas().find(f => f.produto_id === produto.id || f.produto_nome === produto.nome);
    const meses = ficha?.prazo_validade_meses && ficha.prazo_validade_meses > 0 ? ficha.prazo_validade_meses : 24;
    d.setMonth(d.getMonth() + meses);
    return formatarDataBR(hojeISO(d));
  };

  if (!produto) {
    return (
      <div className="relative h-full w-full flex flex-col bg-[#f8faf8] text-slate-800 overflow-hidden">
        <ProdutosNavTabs activeTab="produtos_etiqueta" onNavigate={onNavigate} />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md text-center bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-3">
            <Package className="w-8 h-8 text-slate-400 mx-auto" />
            <h2 className="font-black text-slate-900">Nenhum produto cadastrado</h2>
            <p className="text-xs text-slate-500">Cadastre um produto acabado no estoque para emitir etiquetas.</p>
            <button
              onClick={() => onNavigate?.('produtos_estoque_cadastro')}
              className="px-4 py-2 rounded-lg bg-emerald-900 hover:bg-emerald-950 text-white font-bold text-xs cursor-pointer"
            >
              Ir para Cadastro de Produtos
            </button>
          </div>
        </div>
      </div>
    );
  }

  const dataFabricacaoFormatada = formatarDataBR(dataFabricacao);
  const validadeFormatada = calcValidade();
  const codigoBarrasSimulado = `78989${Math.abs(produto.nome.length * 12345678).toString().padEnd(8, '0')}`;

  return (
    <div className="relative h-full w-full flex flex-col bg-[#f8faf8] text-slate-800 overflow-hidden">
      
      {/* 1. NAVEGAÇÃO DE PRODUTOS */}
      <ProdutosNavTabs activeTab="produtos_etiqueta" onNavigate={onNavigate} />

      {/* 2. CABEÇALHO COMPACTO & MINIMALISTA */}
      <div className="bg-white border-b border-slate-200/80 px-6 py-3.5 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Emissão de Etiquetas & Rastreabilidade de Lotes</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                Padrão Industrial
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Geração de etiquetas de identificação com código de barras, lote, rastreabilidade e dados técnicos para sacaria e Big Bags.
            </p>
          </div>

          <button
            onClick={() => window.print()}
            className="
              flex items-center gap-2 px-4 py-2 rounded-xl
              bg-emerald-900 hover:bg-emerald-950 text-white font-bold text-xs
              shadow-xs transition-all cursor-pointer
            "
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Lote ({quantidadeEtiquetas} un)</span>
          </button>
        </div>
      </div>

      {/* 3. CORPO DIVIDIDO: CONFIGURAÇÃO À ESQUERDA, PRÉVIA REALISTA À DIREITA */}
      <div className="flex-1 p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Painel de Configuração */}
        <div className="md:col-span-5 bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-4 text-xs h-fit">
          <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
            Configurar Etiqueta de Paletização
          </h3>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Produto Acabado</label>
            <select
              value={produtoSelId}
              onChange={(e) => setProdutoSelId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-emerald-700 cursor-pointer"
            >
              {produtos.map(p => (
                <option key={p.id} value={p.id}>{p.nome} ({p.tipo_embalagem})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Número do Lote</label>
              <input
                type="text"
                value={lote}
                onChange={(e) => setLote(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-700"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Data de Fabricação</label>
              <input
                type="date"
                value={dataFabricacao}
                onChange={(e) => setDataFabricacao(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-mono text-slate-800 focus:outline-none focus:border-emerald-700"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Quantidade de Etiquetas a Imprimir</label>
            <input
              type="number"
              min="1"
              value={quantidadeEtiquetas}
              onChange={(e) => setQuantidadeEtiquetas(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-700"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              1 Palete padrão de saco 25kg = 40 sacos (1.000 kg).
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1 text-slate-600">
            <div className="flex justify-between">
              <span>Validade Calculada:</span>
              <strong className="text-slate-800 font-mono">{validadeFormatada}</strong>
            </div>
            <div className="flex justify-between">
              <span>Peso Líquido Unitário:</span>
              <strong className="text-slate-800 font-mono">{produto.peso_unitario_kg} kg</strong>
            </div>
          </div>
        </div>

        {/* Prévia Realista da Etiqueta Industrial */}
        <div className="md:col-span-7 flex flex-col items-center justify-center">
          <div className="w-full max-w-md bg-white border-2 border-slate-900 rounded-lg p-6 shadow-md text-slate-900 font-sans space-y-4">
            
            {/* Cabeçalho da Etiqueta */}
            <div className="text-center border-b-2 border-slate-900 pb-3">
              <span className="text-[10px] font-black tracking-widest uppercase block text-slate-500">GRUPO ENO AGROINDUSTRIAL</span>
              <h2 className="text-base font-black tracking-tight uppercase mt-0.5">{produto.nome}</h2>
              <span className="text-xs font-bold text-slate-700">PESO LÍQUIDO: {produto.peso_unitario_kg} KG</span>
            </div>

            {/* Informações de Rastreabilidade */}
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono border-b-2 border-slate-900 pb-3">
              <div>
                <span className="text-slate-500 text-[10px] block font-sans">LOTE INDUSTRIAL:</span>
                <strong className="text-xs font-black">{lote}</strong>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block font-sans">REGISTRO SIF/MAPA:</span>
                <strong className="text-xs font-black">nº 0048/2024</strong>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block font-sans">FABRICAÇÃO:</span>
                <strong className="text-xs font-bold">{dataFabricacaoFormatada}</strong>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block font-sans">VALIDADE (24 MESES):</span>
                <strong className="text-xs font-bold">{validadeFormatada}</strong>
              </div>
            </div>

            {/* Dados de Conservação & Alergênicos */}
            <div className="text-[10px] text-slate-600 space-y-0.5">
              <p><strong>NÃO CONTÉM GLÚTEN.</strong> Produto 100% natural obtido da raiz de mandioca fresca.</p>
              <p>Conservar em local seco, arejado, sobre estrados e afastado de paredes.</p>
              <p className="text-[9px] text-slate-400">Indústria Brasileira • CNPJ 14.285.901/0001-44 • Rod. PR-180 km 12</p>
            </div>

            {/* Simulação de Código de Barras EAN-13 */}
            <div className="pt-2 text-center flex flex-col items-center">
              <div className="h-12 w-64 bg-slate-900 flex items-center justify-center tracking-widest text-white font-mono text-[10px] font-bold">
                ||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
              </div>
              <span className="font-mono text-[10px] text-slate-700 tracking-wider mt-1">{codigoBarrasSimulado}</span>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
