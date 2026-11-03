import React, { useState, useEffect, useMemo } from 'react';
import { CampoNumero } from '../ui/CampoNumero';
import {
  Package,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  TrendingDown,
  Layers,
  Building2,
  DollarSign,
  Edit2,
  Eye,
  Trash2,
  X,
  Save,
  Check,
  FlaskConical,
  Boxes,
  Percent,
  Calculator,
  ArrowRight
} from 'lucide-react';
import {
  ProdutoEstoque,
  ReceitaIndustrial,
  ImpostoProduto,
  carregarEstoqueProdutos,
  salvarEstoqueProdutos,
  carregarReceitas,
  calcularStatusProduto,
  vincularReceitaAoProduto,
  consumoPorPacoteDaReceita,
  calcularImpostosCusto,
  derivarTipoEmbalagem,
  carregarTabelasPreco,
  TabelaPreco
} from '../../data/produtosData';
import { calcularPrecoNaTabela, carregarPrecosDoProduto, salvarPrecosDoProduto } from '../../data/precosData';
import { PrecosProdutoTabelas, tabelasDoCadastroDeProduto } from './PrecosProdutoTabelas';
import { CategoriaProdutoCampo, useCategoriasProduto } from './CategoriaProdutoCampo';
import { formatarMoeda } from '../../data/financeiroData';
import { hojeISO } from '../../lib/datas';

const loteSugerido = () => `LOTE-ENO-${hojeISO().slice(2).replace(/-/g, '')}`;
import { ProdutosNavTabs } from './ProdutosNavTabs';

interface Props {
  onNavigate?: (tabId: string) => void;
}

export function ProdutosEstoqueCadastro({ onNavigate }: Props) {
  const [produtos, setProdutos] = useState<ProdutoEstoque[]>([]);
  const [receitas, setReceitas] = useState<ReceitaIndustrial[]>([]);
  const [busca, setBusca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('TODAS');

  // Modal Novo / Edição
  const [modalAberto, setModalAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState<ProdutoEstoque | null>(null);
  // Preço do produto em cada tabela de preço (tabelaId -> preço do pacote)
  const [precosTabelas, setPrecosTabelas] = useState<Record<string, number>>({});
  const categorias = useCategoriasProduto();
  const [tabelasPreco, setTabelasPreco] = useState<TabelaPreco[]>(() => carregarTabelasPreco());

  // Form State (preço de venda e embalagem primária não ficam no produto: preço vem das tabelas,
  // embalagem é derivada do peso unitário)
  const [formData, setFormData] = useState({
    codigo: '',
    nome: '',
    categoria: '' as ProdutoEstoque['categoria'],
    peso_unitario_kg: 1,
    estoque_atual_sacos: 0,
    estoque_minimo_kg: 0,
    localizacao_galpao: '',
    lote_recente: loteSugerido(),
    // Vínculo com a Receita e Custos
    receita_id: '',
    receita_nome: '',
    custo_materia_prima: 0,
    impostos: [] as ImpostoProduto[],
    custo_operacional: 0,
    tipo_acondicionamento: 'Caixa' as 'Fardo' | 'Caixa' | 'Saco' | 'Avulso',
    unidades_por_acondicionamento: 10
  });

  const recarregar = () => {
    setProdutos(carregarEstoqueProdutos());
    setReceitas(carregarReceitas());
    setTabelasPreco(carregarTabelasPreco());
  };

  useEffect(() => {
    recarregar();
    const handleUpdate = () => recarregar();
    window.addEventListener('produtos_updated', handleUpdate);
    window.addEventListener('receitas_updated', handleUpdate);
    window.addEventListener('tabelas_preco_updated', handleUpdate);
    return () => {
      window.removeEventListener('produtos_updated', handleUpdate);
      window.removeEventListener('receitas_updated', handleUpdate);
      window.removeEventListener('tabelas_preco_updated', handleUpdate);
    };
  }, []);

  // Preços do produto nas tabelas (lista): faixa de preço e pior margem líquida
  const resumoTabelas = (prod: ProdutoEstoque) => {
    const calcs = tabelasPreco
      .map(t => calcularPrecoNaTabela(prod, t))
      .filter(c => c.na_tabela);
    if (calcs.length === 0) return null;
    const precos = calcs.map(c => c.preco);
    return {
      qtd: calcs.length,
      min: Math.min(...precos),
      max: Math.max(...precos),
      negativas: calcs.filter(c => c.margem_negativa).length
    };
  };

  // Seleção de Receita no formulário (puxa proporção e custo de insumos automaticamente)
  const handleSelecionarReceita = (receitaId: string) => {
    const rec = receitas.find(r => r.id === receitaId);
    if (!rec) {
      setFormData(prev => ({
        ...prev,
        receita_id: '',
        receita_nome: '',
        custo_materia_prima: 0
      }));
      return;
    }

    const custoTotalRec = rec.custo_total_materias_primas || (rec.materias_primas || []).reduce((acc, m) => acc + (m.custo_total || 0), 0);
    const rendimento = rec.rendimento_pacotes && rec.rendimento_pacotes > 0 ? rec.rendimento_pacotes : 1;
    // Pega o custo da receita e divide pela quantidade de unidades que ela rende:
    const custoInsumo = rec.custo_por_pacote && rec.custo_por_pacote > 0 ? rec.custo_por_pacote : (custoTotalRec / rendimento);
    const peso = rec.peso_por_pacote_kg || 1;
    const tipoEmb = (rec.tipo_embalagem as any) || 'Pacote 1kg';
    const acond: 'Fardo' | 'Caixa' | 'Saco' = tipoEmb.includes('Fardo') ? 'Fardo' : tipoEmb.includes('Caixa') ? 'Caixa' : tipoEmb.includes('Saco') ? 'Saco' : 'Caixa';
    const unidades = tipoEmb.includes('Fardo') ? 10 : tipoEmb.includes('Caixa') ? 10 : 1;

    setFormData(prev => ({
      ...prev,
      receita_id: rec.id,
      receita_nome: rec.nome || rec.produto_nome || '',
      nome: prev.nome ? prev.nome : (rec.nome || rec.produto_nome || ''),
      peso_unitario_kg: peso,
      custo_materia_prima: parseFloat(custoInsumo.toFixed(2)),
      tipo_acondicionamento: acond,
      unidades_por_acondicionamento: unidades
    }));
  };

  // Cálculos do formulário em tempo real. Custo = insumos + operacional + impostos de base Custo/Fixo.
  // Impostos de base Venda incidem sobre o preço de cada tabela (margem na seção "Preços nas tabelas").
  const calculosFormulario = useMemo(() => {
    const custoMp = formData.custo_materia_prima || 0;
    const custoOp = formData.custo_operacional || 0;
    const baseCusto = custoMp + custoOp;
    const impostosValor = calcularImpostosCusto(formData.impostos, baseCusto);
    const impostosVenda = formData.impostos.filter(i => i.base === 'Venda');
    const percentualVenda = impostosVenda.filter(i => i.tipo === 'Porcentagem').reduce((a, i) => a + (Number(i.valor) || 0), 0);
    const valorFixoVenda = impostosVenda.filter(i => i.tipo !== 'Porcentagem').reduce((a, i) => a + (Number(i.valor) || 0), 0);
    return {
      custoMp,
      custoOp,
      impostosValor,
      custoTotal: baseCusto + impostosValor,
      percentualVenda,
      valorFixoVenda
    };
  }, [formData]);

  const handleAdicionarImposto = () => {
    const novo: ImpostoProduto = {
      id: `imp_${Date.now()}`,
      nome: 'ICMS',
      base: 'Venda',
      tipo: 'Porcentagem',
      valor: 7.0
    };
    setFormData(prev => ({ ...prev, impostos: [...prev.impostos, novo] }));
  };

  const handleRemoverImposto = (id: string) => {
    setFormData(prev => ({ ...prev, impostos: prev.impostos.filter(i => i.id !== id) }));
  };

  const handleAtualizarImposto = (id: string, campo: keyof ImpostoProduto, valor: any) => {
    setFormData(prev => ({
      ...prev,
      impostos: prev.impostos.map(i => i.id === id ? { ...i, [campo]: valor } : i)
    }));
  };

  // Métricas
  const metricas = useMemo(() => {
    const totalItens = produtos.length;
    const volumeTotalKg = produtos.reduce((acc, p) => acc + p.estoque_atual_kg, 0);
    // A custo: o produto não tem preço próprio (cada tabela tem o seu)
    const valorPatrimonial = produtos.reduce((acc, p) => acc + (Number(p.estoque_atual_sacos) || 0) * (Number(p.custo_total) || 0), 0);
    const criticos = produtos.filter(p => p.status === 'ESTOQUE_BAIXO' || p.status === 'CRITICO').length;

    return { totalItens, volumeTotalKg, valorPatrimonial, criticos };
  }, [produtos]);

  // Filtros
  const produtosFiltrados = useMemo(() => {
    return produtos.filter(p => {
      const match =
        p.nome.toLowerCase().includes(busca.toLowerCase()) ||
        p.codigo.toLowerCase().includes(busca.toLowerCase()) ||
        p.localizacao_galpao.toLowerCase().includes(busca.toLowerCase());

      if (!match) return false;
      if (filtroCategoria !== 'TODAS' && p.categoria !== filtroCategoria) return false;
      return true;
    });
  }, [produtos, busca, filtroCategoria]);

  const handleAbrirNovo = () => {
    setModoEdicao(null);
    setPrecosTabelas({});
    // Só receitas com matéria-prima podem originar produto
    const recPadrao = receitas.find(r => (r.materias_primas || []).length > 0);
    const custoMp = recPadrao ? (recPadrao.custo_por_pacote || 0) : 0;
    const tipoEmb = (recPadrao?.tipo_embalagem as any) || 'Pacote 1kg';
    const acond: 'Fardo' | 'Caixa' | 'Saco' = tipoEmb.includes('Fardo') ? 'Fardo' : tipoEmb.includes('Caixa') ? 'Caixa' : tipoEmb.includes('Saco') ? 'Saco' : 'Caixa';
    const unidades = tipoEmb.includes('Fardo') ? 10 : tipoEmb.includes('Caixa') ? 10 : 1;

    setFormData({
      codigo: `PRD-${Date.now().toString().slice(-4)}`,
      nome: recPadrao ? (recPadrao.nome || recPadrao.produto_nome || '') : '',
      categoria: filtroCategoria !== 'TODAS' ? filtroCategoria : categorias.length === 1 ? categorias[0] : '',
      peso_unitario_kg: recPadrao?.peso_por_pacote_kg || 1,
      estoque_atual_sacos: 0,
      estoque_minimo_kg: 0,
      localizacao_galpao: '',
      lote_recente: loteSugerido(),
      receita_id: recPadrao ? recPadrao.id : '',
      receita_nome: recPadrao ? (recPadrao.nome || recPadrao.produto_nome || '') : '',
      custo_materia_prima: parseFloat(custoMp.toFixed(2)),
      impostos: [],
      custo_operacional: 0,
      tipo_acondicionamento: acond,
      unidades_por_acondicionamento: unidades
    });
    setModalAberto(true);
  };

  const handleAbrirEdicao = (prod: ProdutoEstoque) => {
    setModoEdicao(prod);
    setPrecosTabelas(carregarPrecosDoProduto(prod.id));
    setFormData({
      codigo: prod.codigo,
      nome: prod.nome,
      categoria: prod.categoria,
      peso_unitario_kg: prod.peso_unitario_kg,
      estoque_atual_sacos: prod.estoque_atual_sacos,
      estoque_minimo_kg: prod.estoque_minimo_kg,
      localizacao_galpao: prod.localizacao_galpao,
      lote_recente: prod.lote_recente,
      receita_id: prod.receita_id || '',
      receita_nome: prod.receita_nome || '',
      custo_materia_prima: prod.custo_materia_prima || 0,
      impostos: prod.impostos || [],
      custo_operacional: prod.custo_operacional || 0,
      tipo_acondicionamento: (prod.tipo_acondicionamento as any) || 'Caixa',
      unidades_por_acondicionamento: prod.unidades_por_acondicionamento || 10
    });
    setModalAberto(true);
  };

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!(formData.unidades_por_acondicionamento >= 1)) {
      alert('Informe quantas unidades vão em cada ' + formData.tipo_acondicionamento.toLowerCase() + ' (mínimo 1).');
      return;
    }
    if (!(formData.peso_unitario_kg > 0)) {
      alert('Informe o peso de cada unidade (kg).');
      return;
    }
    const pesoTotal = formData.estoque_atual_sacos * formData.peso_unitario_kg;
    const status: ProdutoEstoque['status'] = calcularStatusProduto(pesoTotal, formData.estoque_minimo_kg);

    const dadosCusto = {
      receita_id: formData.receita_id || undefined,
      receita_nome: formData.receita_nome || undefined,
      custo_materia_prima: calculosFormulario.custoMp,
      impostos: formData.impostos,
      impostos_valor: parseFloat(calculosFormulario.impostosValor.toFixed(2)),
      custo_operacional: formData.custo_operacional,
      custo_total: parseFloat(calculosFormulario.custoTotal.toFixed(2)),
      tipo_acondicionamento: formData.tipo_acondicionamento,
      unidades_por_acondicionamento: formData.unidades_por_acondicionamento,
      // Embalagem primária derivada do peso (compatibilidade com telas que leem tipo_embalagem)
      tipo_embalagem: derivarTipoEmbalagem(formData.peso_unitario_kg),
      // Preço/margem do produto são legados: o preço vem só das tabelas
      preco_venda_acondicionamento: undefined,
      margem_lucro_percentual: undefined
    };

    if (!String(formData.categoria || '').trim()) {
      alert('Escolha a categoria do produto (ou crie uma no botão +).');
      return;
    }

    // Validação estrita: produto só existe com receita, e a receita precisa ter matéria-prima
    const recVinculada = receitas.find(r => r.id === formData.receita_id);
    if (!formData.receita_id || !recVinculada) {
      alert('Erro: É obrigatório selecionar uma receita válida para o produto.');
      return;
    }
    if ((recVinculada.materias_primas || []).length === 0) {
      alert('Erro: A receita selecionada não tem nenhuma matéria-prima. Cadastre a composição da receita antes de cadastrar o produto.');
      return;
    }
    if (calculosFormulario.custoTotal <= 0) {
      alert('Erro: O produto deve possuir um custo de produção calculado (Ficha Técnica/Receita).');
      return;
    }

    const produtoId = modoEdicao ? modoEdicao.id : `prod_est_${Date.now()}`;

    if (modoEdicao) {
      const atualizados = produtos.map(p => {
        if (p.id === modoEdicao.id) {
          return {
            ...p,
            ...formData,
            ...dadosCusto,
            estoque_atual_kg: pesoTotal,
            status
          };
        }
        return p;
      });
      salvarEstoqueProdutos(atualizados);
    } else {
      const novo: ProdutoEstoque = {
        id: produtoId,
        ...formData,
        preco_unitario_venda: 0,
        ...dadosCusto,
        estoque_atual_kg: pesoTotal,
        status
      };
      salvarEstoqueProdutos([novo, ...produtos]);
    }

    // Vínculo gravado nos dois lados (receita.produto_id) e preços nas tabelas
    vincularReceitaAoProduto(produtoId, formData.nome, formData.receita_id);
    // Tabelas com valor passam a ter o produto; tabelas ativas deixadas em branco deixam de vendê-lo
    salvarPrecosDoProduto(produtoId, precosTabelas, tabelasDoCadastroDeProduto().map(t => t.id));

    setModalAberto(false);
  };

  const handleExcluir = (id: string) => {
    if (confirm('Deseja excluir este item do cadastro de produtos?')) {
      salvarEstoqueProdutos(produtos.filter(p => p.id !== id));
    }
  };

  return (
    <div className="relative h-full w-full flex flex-col bg-[#f8faf8] text-slate-800 overflow-hidden">
      
      {/* 1. NAVEGAÇÃO DE PRODUTOS */}
      <ProdutosNavTabs activeTab="produtos_estoque_cadastro" onNavigate={onNavigate} />

      {/* 2. CABEÇALHO COMPACTO & MINIMALISTA */}
      <div className="bg-white border-b border-slate-200/80 px-6 py-3.5 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Produtos Acabados (Estoque & Cadastro)</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                {metricas.totalItens} produtos
              </span>
            </h1>
          </div>

          <button
            onClick={handleAbrirNovo}
            className="
              flex items-center gap-2 px-4 py-2 rounded-xl
              bg-emerald-900 hover:bg-emerald-950 text-white font-bold text-xs
              shadow-xs transition-all cursor-pointer
            "
          >
            <Plus className="w-4 h-4" />
            <span>Novo Produto Acabado</span>
          </button>
        </div>

        {/* STAT BAR MINIMALISTA EM LINHA */}
        <div className="flex flex-wrap items-center gap-6 pt-3 mt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Estoque Físico Total:</span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              {(metricas.volumeTotalKg / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} Toneladas
            </span>
          </div>
          <div className="w-px h-4 bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Valor em Estoque (a custo):</span>
            <span className="font-mono font-bold text-slate-900">
              {metricas.valorPatrimonial.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
          <div className="w-px h-4 bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Abaixo do Mínimo:</span>
            <span className={`font-mono font-bold ${metricas.criticos > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
              {metricas.criticos} itens
            </span>
          </div>
        </div>
      </div>

      {/* 3. BARRA DE BUSCA E FILTROS */}
      <div className="bg-[#f1f5f2] px-6 py-2.5 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex-1 min-w-[260px] max-w-sm relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por Código, Produto ou Galpão..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-700 font-medium"
          />
        </div>

        <select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
          className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 cursor-pointer focus:outline-none"
        >
          <option value="TODAS">Todas as Categorias</option>
          {categorias.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* 4. TABELA LIMPA */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 text-slate-500 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-5">Código / Produto</th>
                <th className="py-3 px-3">Categoria</th>
                <th className="py-3 px-3">Acondicionamento</th>
                <th className="py-3 px-3 text-right">Custo Total</th>
                <th className="py-3 px-4 text-right">Preço nas Tabelas</th>
                <th className="py-3 px-4">Saldo Estoque</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {produtosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                    Nenhum produto encontrado.
                  </td>
                </tr>
              ) : (
                produtosFiltrados.map((item) => {
                  const custoTotalUnit = item.custo_total || item.custo_materia_prima || 0;
                  const resumo = resumoTabelas(item);
                  const acondQtd = item.unidades_por_acondicionamento || 1;
                  const acondTipo = item.tipo_acondicionamento || (item.tipo_embalagem.includes('Fardo') ? 'Fardo' : item.tipo_embalagem.includes('Caixa') ? 'Caixa' : 'Saco');

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-slate-900">{item.nome}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <span>{item.codigo}</span>
                          <span>•</span>
                          <span>{item.tipo_embalagem}</span>
                          {item.receita_nome && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 text-[10px] font-semibold border border-emerald-200">
                              <FlaskConical className="w-2.5 h-2.5" />
                              <span className="truncate max-w-[140px]">{item.receita_nome}</span>
                            </span>
                          )}
                        </div>
                        {(() => {
                          const consumo = consumoPorPacoteDaReceita(receitas.find(r => r.id === item.receita_id));
                          if (consumo.length === 0) return null;
                          return (
                            <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                              <span className="font-semibold text-slate-600">Consome por pacote:</span>{' '}
                              {consumo.map(c => `${c.quantidade_por_pacote.toLocaleString('pt-BR', { maximumFractionDigits: 4 })} ${c.unidade_medida} ${c.materia_prima_nome}`).join(' · ')}
                            </div>
                          );
                        })()}
                      </td>

                      <td className="py-3.5 px-3 font-medium text-slate-700">
                        {item.categoria}
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800 font-bold text-[11px] border border-slate-200">
                          {acondTipo} {acondQtd > 1 ? `c/ ${acondQtd} un` : 'Avulso'}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-700">
                        {custoTotalUnit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        {item.impostos_valor !== undefined && item.impostos_valor > 0 && (
                          <div className="text-[10px] text-slate-400 font-normal">
                            (+{item.impostos_valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} imp.)
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {!resumo ? (
                          <span className="text-[11px] font-semibold text-amber-700">sem preço em tabela</span>
                        ) : (
                          <>
                            <div className="font-mono font-bold tabular-nums text-slate-900">
                              {resumo.min === resumo.max
                                ? formatarMoeda(resumo.min)
                                : `${formatarMoeda(resumo.min)} – ${formatarMoeda(resumo.max)}`}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              em {resumo.qtd} {resumo.qtd === 1 ? 'tabela' : 'tabelas'}
                              {resumo.negativas > 0 && (
                                <span className="ml-1 font-bold text-red-700">• margem negativa em {resumo.negativas}</span>
                              )}
                            </div>
                          </>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        <div className="font-bold text-slate-900">
                          {item.estoque_atual_sacos.toLocaleString('pt-BR')} {(() => {
                            const emb = String(item.tipo_embalagem || '');
                            return emb.startsWith('Big Bag') ? 'bags' : emb.includes('Caixa') ? 'caixas' : emb.includes('Fardo') ? 'fardos' : emb.startsWith('Saco') ? 'sacos' : 'pacotes';
                          })()}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {(item.estoque_atual_kg / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} Ton
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        {item.status === 'EM_ESTOQUE' ? (
                          <div className="flex items-center gap-1.5 text-emerald-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            <span className="font-medium text-xs">Normal</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-amber-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            <span className="font-medium text-xs">Estoque Baixo</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleAbrirEdicao(item)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                            title="Editar Produto"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleExcluir(item.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. MODAL NOVO / EDITAR PRODUTO */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-6 flex justify-center items-start animate-fadeIn">
          <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col my-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)]">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <Package className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">
                    {modoEdicao ? `Editar Produto: ${formData.nome}` : 'Cadastrar Novo Produto Acabado'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Vincule a receita de produção, configure caixa/fardo, impostos e o preço em cada tabela de preço.
                  </p>
                </div>
              </div>
              <button onClick={() => setModalAberto(false)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSalvar} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              
              {/* 1. VÍNCULO COM A RECEITA DE PRODUÇÃO (PUXA PROPORÇÃO E CUSTO AUTOMATICAMENTE) */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/80 pb-2">
                  <span className="font-bold text-emerald-950 uppercase tracking-wider text-xs flex items-center gap-1.5">
                    <FlaskConical className="w-4 h-4 text-emerald-700" />
                    <span>1. Receita de Produção Vinculada (Proporção & Insumos)</span>
                  </span>
                  <span className="text-[11px] text-emerald-800 font-semibold">
                    Calcula automaticamente o custo dos insumos a partir da matéria-prima
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-8">
                    <label className="block font-bold text-slate-800 mb-1">
                      Selecione a Receita Base *
                    </label>
                    <select
                      value={formData.receita_id}
                      onChange={(e) => handleSelecionarReceita(e.target.value)}
                      className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-700 cursor-pointer shadow-2xs"
                    >
                      <option value="" disabled>-- Selecione a receita do produto --</option>
                      {receitas.map((rec) => {
                        const semMp = (rec.materias_primas || []).length === 0;
                        return (
                          <option key={rec.id} value={rec.id} disabled={semMp}>
                            {rec.codigo} - {rec.nome || rec.produto_nome} ({rec.rendimento_pacotes} pacotes de {rec.peso_por_pacote_kg || 25}kg){semMp ? ' — sem matéria-prima' : ''}
                          </option>
                        );
                      })}
                    </select>
                    {!receitas.some(r => (r.materias_primas || []).length > 0) && (
                      <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 font-semibold text-[11px] space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>
                            Para cadastrar um produto é preciso ter uma receita com ao menos 1 matéria-prima.
                            {receitas.length === 0 ? ' Nenhuma receita cadastrada.' : ' Nenhuma receita tem matéria-prima.'}
                          </span>
                        </div>
                        {onNavigate && (
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => { setModalAberto(false); onNavigate('produtos_materia_prima'); }}
                              className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 hover:bg-amber-100 font-bold cursor-pointer"
                            >
                              Cadastrar Matéria-Prima →
                            </button>
                            <button
                              type="button"
                              onClick={() => { setModalAberto(false); onNavigate('produtos_receita'); }}
                              className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 hover:bg-amber-100 font-bold cursor-pointer"
                            >
                              Cadastrar Receita →
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="sm:col-span-4 bg-white p-2.5 rounded-xl border border-emerald-200 text-center">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                      Custo Insumos (por Unidade)
                    </span>
                    <span className="font-mono text-base font-black text-emerald-950">
                      {calculosFormulario.custoMp.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                    {(() => {
                      const recSel = receitas.find(r => r.id === formData.receita_id);
                      if (!recSel) return <span className="text-[10px] text-slate-400 block font-mono">por pacote/unidade</span>;
                      const totalRec = recSel.custo_total_materias_primas || (recSel.materias_primas || []).reduce((acc, m) => acc + (m.custo_total || 0), 0);
                      const rend = recSel.rendimento_pacotes || 1;
                      const un = formData.unidades_por_acondicionamento || 1;
                      return (
                        <>
                          <span className="text-[10px] text-emerald-800 font-mono block mt-0.5 font-bold">
                            {totalRec.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} ÷ {rend} un
                          </span>
                          {un > 1 && (
                            <span className="text-[10px] text-slate-600 font-mono block font-bold">
                              {(calculosFormulario.custoMp * un).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} /{formData.tipo_acondicionamento} ({un} un)
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Detalhamento das Proporções da Receita Vinculada (TUDO EM LINHAS DE UMA TABELA) */}
                {(() => {
                  const recSelecionada = receitas.find(r => r.id === formData.receita_id);
                  if (!recSelecionada || !recSelecionada.materias_primas || recSelecionada.materias_primas.length === 0) return null;
                  const totalRec = recSelecionada.custo_total_materias_primas || recSelecionada.materias_primas.reduce((acc, m) => acc + (m.custo_total || 0), 0);
                  const rend = recSelecionada.rendimento_pacotes || 1;

                  return (
                    <div className="mt-3 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                      <div className="bg-slate-100/90 px-3.5 py-2 border-b border-slate-200 text-[11px] font-bold text-slate-800 flex flex-wrap items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 font-mono text-[10px] font-black border border-emerald-300">
                            Custo da Receita ÷ {rend} un
                          </span>
                          <span>Composição de Insumos da Receita ({rend} {recSelecionada.tipo_embalagem || 'pacotes'} de {recSelecionada.peso_por_pacote_kg || 1}kg)</span>
                        </div>
                        <span className="text-emerald-900 font-mono text-[11px] font-bold">
                          {totalRec.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} ÷ {rend} = {calculosFormulario.custoMp.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} /un
                        </span>
                      </div>
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500 border-b border-slate-200">
                            <th className="py-2 px-3">Matéria-Prima</th>
                            <th className="py-2 px-3 text-right">Qtd na Receita</th>
                            <th className="py-2 px-3 text-right">Divisão por Unidade</th>
                            <th className="py-2 px-3 text-right">Custo na Receita</th>
                            <th className="py-2 px-3 text-right">Custo por Unidade</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                          {recSelecionada.materias_primas.map((mp, i) => {
                            const propUnitaria = (mp.quantidade / rend);
                            const custoTotalMp = mp.custo_total || (mp.quantidade * (mp.custo_unitario || 0));
                            const custoUnInsumo = (custoTotalMp / rend);
                            return (
                              <tr key={i} className="hover:bg-slate-50/70">
                                <td className="py-2 px-3 font-sans font-bold text-slate-800">{mp.materia_prima_nome}</td>
                                <td className="py-2 px-3 text-right text-slate-600">{mp.quantidade.toLocaleString('pt-BR')} {mp.unidade_medida}</td>
                                <td className="py-2 px-3 text-right font-bold text-emerald-900">
                                  {propUnitaria < 0.1 ? propUnitaria.toFixed(3) : propUnitaria.toFixed(2)} {mp.unidade_medida}
                                </td>
                                <td className="py-2 px-3 text-right text-slate-500">
                                  {custoTotalMp.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </td>
                                <td className="py-2 px-3 text-right font-black text-emerald-950 bg-emerald-50/30">
                                  {custoUnInsumo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>

              {/* 2. IDENTIFICAÇÃO DO PRODUTO & CATEGORIA */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <span className="font-bold text-slate-800 uppercase tracking-wider text-xs block">
                  2. Identificação Comercial do Produto
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-6">
                    <label className="block font-bold text-slate-700 mb-1">Nome Comercial do Produto *</label>
                    <input
                      type="text"
                      required
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      placeholder="Ex: Mandioca Gourmet Palito Congelada (Pacote 1kg)"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-800 focus:outline-none focus:border-emerald-700 shadow-2xs"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block font-bold text-slate-700 mb-1">Código Interno *</label>
                    <input
                      type="text"
                      required
                      value={formData.codigo}
                      onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-700 shadow-2xs"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block font-bold text-slate-700 mb-1">Categoria *</label>
                    <CategoriaProdutoCampo
                      value={formData.categoria}
                      onChange={(categoria) => setFormData(prev => ({ ...prev, categoria }))}
                    />
                  </div>
                </div>
              </div>

              {/* 3. ACONDICIONAMENTO (FARDO OU CAIXA E QUANTOS QUE VAI) */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-xs flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-emerald-700" />
                    <span>3. Acondicionamento de Envio (Fardo ou Caixa)</span>
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Define como o produto é despachado e cobrado no pedido
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Acondicionamento *</label>
                    <select
                      value={formData.tipo_acondicionamento}
                      onChange={(e) => setFormData({ ...formData, tipo_acondicionamento: e.target.value as any })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-emerald-700 cursor-pointer shadow-2xs"
                    >
                      <option value="Caixa">Caixa</option>
                      <option value="Fardo">Fardo</option>
                      <option value="Saco">Saco</option>
                      <option value="Avulso">Avulso / Granel</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-emerald-950 mb-1">Quantos que vai (Qtd) *</label>
                    <CampoNumero
                      inteiro
                      required
                      min={1}
                      value={formData.unidades_por_acondicionamento}
                      onChange={(n) => setFormData({ ...formData, unidades_por_acondicionamento: n })}
                      placeholder="Ex: 10 ou 12"
                      className="w-full bg-white border-2 border-emerald-500 rounded-xl px-3 py-2 font-mono font-black text-center text-emerald-950 text-sm focus:outline-none focus:border-emerald-700 shadow-xs"
                    />
                    <span className="text-[10px] text-emerald-800 font-semibold block text-center mt-0.5">
                      unidades por {formData.tipo_acondicionamento.toLowerCase()}
                    </span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Peso de cada unidade (kg)</label>
                    <CampoNumero
                      step="any"
                      min={0}
                      value={formData.peso_unitario_kg}
                      onChange={(n) => setFormData({ ...formData, peso_unitario_kg: n })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-800 text-center focus:outline-none focus:border-emerald-700 shadow-2xs"
                    />
                    <span className="text-[10px] text-slate-500 block text-center mt-0.5">
                      {derivarTipoEmbalagem(formData.peso_unitario_kg)} • {(formData.peso_unitario_kg * formData.unidades_por_acondicionamento).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg por {formData.tipo_acondicionamento.toLowerCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. CUSTOS, IMPOSTOS SOBRE O PRODUTO E FORMAÇÃO DE PREÇO */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <span className="font-bold text-slate-800 uppercase tracking-wider text-xs block">
                  4. Custos & Impostos
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Custo Insumos (R$)</label>
                    <CampoNumero
                      step="0.01"
                      min={0}
                      value={formData.custo_materia_prima}
                      onChange={(n) => setFormData({ ...formData, custo_materia_prima: n })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-800 text-right focus:outline-none focus:border-emerald-700 shadow-2xs"
                    />
                    <span className="text-[10px] text-slate-400 block text-right mt-0.5">da receita</span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Custos Operacionais (R$)</label>
                    <CampoNumero
                      step="0.01"
                      min={0}
                      value={formData.custo_operacional}
                      onChange={(n) => setFormData({ ...formData, custo_operacional: n })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-800 text-right focus:outline-none focus:border-emerald-700 shadow-2xs"
                    />
                    <span className="text-[10px] text-slate-400 block text-right mt-0.5">energia/mão de obra</span>
                  </div>

                  <div className="bg-emerald-950 p-3 rounded-xl text-white flex flex-col justify-center text-right shadow-xs">
                    <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider block">
                      Custo Total s/ Impostos
                    </span>
                    <span className="font-mono text-base font-black text-lime-300">
                      {(formData.custo_materia_prima + formData.custo_operacional).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                </div>

                {/* SEÇÃO DE IMPOSTOS DINÂMICOS - SOLICITADO PELO USUÁRIO */}
                <div className="p-3 bg-white/40 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-1.5">
                      <Percent className="w-4 h-4 text-emerald-700" />
                      <span className="text-[11px] font-black text-slate-700 uppercase tracking-wide">
                        Impostos e Taxas sobre o Produto
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAdicionarImposto}
                      className="text-[10px] bg-emerald-800 hover:bg-emerald-950 text-white px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer shadow-2xs"
                    >
                      + Adicionar Imposto
                    </button>
                  </div>

                  {formData.impostos.length === 0 ? (
                    <div className="py-4 text-center text-[10px] text-slate-400 italic">
                      Nenhum imposto configurado para este produto.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {formData.impostos.map((imp) => (
                        <div key={imp.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end bg-white p-2.5 rounded-xl border border-slate-100 shadow-3xs">
                          <div className="sm:col-span-3">
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Nome do Imposto</label>
                            <input
                              type="text"
                              value={imp.nome}
                              onChange={(e) => handleAtualizarImposto(imp.id, 'nome', e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-bold text-slate-800 focus:outline-none focus:border-emerald-600"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Base de Calc.</label>
                            <select
                              value={imp.base}
                              onChange={(e) => handleAtualizarImposto(imp.id, 'base', e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-1.5 text-[11px] font-medium text-slate-700 focus:outline-none focus:border-emerald-600 cursor-pointer"
                            >
                              <option value="Venda">Preço da tabela</option>
                              <option value="Custo">Custo Prod.</option>
                              <option value="Fixo">Valor Fixo</option>
                            </select>
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Tipo</label>
                            <select
                              value={imp.tipo}
                              onChange={(e) => handleAtualizarImposto(imp.id, 'tipo', e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-1.5 text-[11px] font-medium text-slate-700 focus:outline-none focus:border-emerald-600 cursor-pointer"
                            >
                              <option value="Porcentagem">% Porcentagem</option>
                              <option value="Valor">$ Valor Real</option>
                            </select>
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Valor / Alíquota</label>
                            <CampoNumero
                              step="any"
                              min={0}
                              value={imp.valor}
                              onChange={(n) => handleAtualizarImposto(imp.id, 'valor', n)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-mono font-bold text-right text-emerald-950 focus:outline-none focus:border-emerald-600"
                            />
                          </div>
                          <div className="sm:col-span-2 text-right px-1">
                            <div className="text-[9px] font-bold text-slate-400 uppercase">Impacto Un.</div>
                            {imp.base === 'Venda' ? (
                              <div className="text-[11px] font-mono font-black text-amber-800 leading-tight">
                                {imp.tipo === 'Porcentagem'
                                  ? `${(Number(imp.valor) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`
                                  : formatarMoeda(Number(imp.valor) || 0)}
                                <span className="block text-[9px] font-sans font-semibold text-slate-500">
                                  {imp.tipo === 'Porcentagem' ? 'sobre o preço da tabela' : 'por venda (na margem)'}
                                </span>
                              </div>
                            ) : (
                              <div className="text-[11px] font-mono font-black text-emerald-800">
                                {(() => {
                                  const baseCusto = formData.custo_materia_prima + formData.custo_operacional;
                                  const baseCalc = imp.base === 'Custo' ? baseCusto : 0;
                                  const res = imp.tipo === 'Porcentagem' ? (baseCalc * (imp.valor || 0)) / 100 : (imp.valor || 0);
                                  return formatarMoeda(res);
                                })()}
                                <span className="block text-[9px] font-sans font-semibold text-slate-500">no custo</span>
                              </div>
                            )}
                          </div>
                          <div className="sm:col-span-1 text-center pb-1">
                            <button
                              type="button"
                              onClick={() => handleRemoverImposto(imp.id)}
                              className="p-1.5 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                              title="Remover imposto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                </div>

                <div className="bg-emerald-900 p-4 rounded-2xl text-white flex items-center justify-between shadow-md">
                  <div>
                    <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider block">
                      Custo Final Industrial (Insumos + Operacional + Impostos de Custo)
                    </span>
                    <span className="font-mono text-xl font-black text-lime-300">
                      {calculosFormulario.custoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-emerald-300 font-bold uppercase block">Por {formData.tipo_acondicionamento}</span>
                    <span className="font-mono text-sm font-bold text-emerald-100">
                      {(calculosFormulario.custoTotal * formData.unidades_por_acondicionamento).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-500">
                  O produto não tem preço próprio: o preço de venda é definido em cada tabela de preço, logo abaixo.
                </p>
              </div>

              {/* 4.1 PREÇOS NAS TABELAS DE PREÇO */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3">
                <span className="font-bold text-slate-800 uppercase tracking-wider text-xs block">
                  5. Preços nas tabelas
                </span>
                <PrecosProdutoTabelas
                  custoUnitario={calculosFormulario.custoTotal}
                  impostos={formData.impostos}
                  unidades={formData.unidades_por_acondicionamento || 1}
                  tipoAcondicionamento={formData.tipo_acondicionamento}
                  valor={precosTabelas}
                  onChange={setPrecosTabelas}
                />
              </div>

              {/* 5. ESTOQUE E LOCALIZAÇÃO NO GALPÃO */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Saldo Atual ({formData.tipo_acondicionamento}s)
                  </label>
                  <CampoNumero
                    inteiro
                    min={0}
                    value={formData.estoque_atual_sacos}
                    onChange={(n) => setFormData({ ...formData, estoque_atual_sacos: n })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-bold font-mono text-center text-slate-800 focus:outline-none focus:border-emerald-700 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Estoque Mínimo Alerta (kg)</label>
                  <CampoNumero
                    min={0}
                    value={formData.estoque_minimo_kg}
                    onChange={(n) => setFormData({ ...formData, estoque_minimo_kg: n })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono text-slate-800 text-center focus:outline-none focus:border-emerald-700 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Localização no Galpão</label>
                  <input
                    type="text"
                    value={formData.localizacao_galpao}
                    onChange={(e) => setFormData({ ...formData, localizacao_galpao: e.target.value })}
                    placeholder="Ex: Galpão C - Setor Congelados"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-emerald-700 shadow-2xs"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-900 hover:bg-emerald-950 text-white font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs hover:shadow text-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Produto Acabado</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
