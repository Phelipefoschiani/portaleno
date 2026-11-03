import React, { useState, useEffect, useMemo } from 'react';
import {
  Tag,
  Plus,
  Search,
  CheckCircle2,
  Edit2,
  Trash2,
  X,
  Save,
  Check,
  Eye,
  Printer,
  Copy,
  Building2,
  AlertCircle,
  LayoutList
} from 'lucide-react';
import {
  TabelaPreco,
  carregarTabelasPreco,
  salvarTabelasPreco,
  carregarEstoqueProdutos,
  ProdutoEstoque
} from '../../data/produtosData';
import {
  calcularPrecoNaTabela,
  camposDePreco,
  MostrarPrecoTabela,
  OPCOES_MOSTRAR_PRECO,
  mostraAcondicionamento,
  mostraUnitario,
  nomeMostrarPreco,
  tabelaPrecoAtiva
} from '../../data/precosData';
import { formatarMoeda } from '../../data/financeiroData';
import { formatarDataBR, hojeISO } from '../../lib/datas';
import { ProdutosNavTabs } from './ProdutosNavTabs';
import { CampoPrecoTabela } from './CampoPrecoTabela';

interface Props {
  onNavigate?: (tabId: string) => void;
}

const pesoTexto = (p: ProdutoEstoque) =>
  Number(p.peso_unitario_kg) > 0
    ? Number(p.peso_unitario_kg) < 1
      ? `${(Number(p.peso_unitario_kg) * 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} g`
      : `${Number(p.peso_unitario_kg).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} kg`
    : '';

const ordenarProdutos = (lista: ProdutoEstoque[]) =>
  [...lista].sort(
    (a, b) =>
      String(a.categoria || '').localeCompare(String(b.categoria || ''), 'pt-BR') ||
      String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR')
  );

export function ProdutosTabelaPreco({ onNavigate }: Props) {
  const [tabelas, setTabelas] = useState<TabelaPreco[]>(() => carregarTabelasPreco());
  const [busca, setBusca] = useState('');

  // Modais
  const [modalFormAberto, setModalFormAberto] = useState(false);
  const [tabelaEmEdicao, setTabelaEmEdicao] = useState<TabelaPreco | null>(null);
  const [tabelaVisualizar, setTabelaVisualizar] = useState<TabelaPreco | null>(null);
  const [buscaProdutoForm, setBuscaProdutoForm] = useState('');

  // Toast e Cópia
  const [toastMsg, setToastMsg] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [mostrarCustos, setMostrarCustos] = useState(false);

  // Todos os produtos cadastrados (a grade da tabela lista todos; sem valor = não vendido)
  const [produtosEstoque, setProdutosEstoque] = useState<ProdutoEstoque[]>(() => carregarEstoqueProdutos());

  const dispararToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  useEffect(() => {
    const handleAtualizacao = () => {
      setTabelas(carregarTabelasPreco());
      setProdutosEstoque(carregarEstoqueProdutos());
    };
    window.addEventListener('tabelas_preco_updated', handleAtualizacao);
    window.addEventListener('produtos_updated', handleAtualizacao);
    return () => {
      window.removeEventListener('tabelas_preco_updated', handleAtualizacao);
      window.removeEventListener('produtos_updated', handleAtualizacao);
    };
  }, []);

  const formVazio = () => ({
    codigo: `TAB-${Date.now().toString().slice(-4)}`,
    nome: '',
    tipo: 'Atacado / Distribuidor' as TabelaPreco['tipo'],
    mostrar_preco: 'AMBOS' as MostrarPrecoTabela,
    precos_fixos: {} as Record<string, number>,
    prazo_padrao: 'Boleto Bancário 28 Dias',
    frete_tipo: 'CIF (Entrega Grupo ENO)' as TabelaPreco['frete_tipo'],
    vigencia_inicio: formatarDataBR(hojeISO()),
    vigencia_fim: `31/12/${new Date().getFullYear()}`,
    status: 'VIGENTE' as TabelaPreco['status']
  });

  const [formData, setFormData] = useState(formVazio);

  const tabelasFiltradas = tabelas.filter(t =>
    t.nome.toLowerCase().includes(busca.toLowerCase()) ||
    t.codigo.toLowerCase().includes(busca.toLowerCase()) ||
    t.tipo.toLowerCase().includes(busca.toLowerCase())
  );

  // Produtos que não têm preço em nenhuma tabela ativa (não podem ser vendidos)
  const produtosSemTabela = useMemo(() => {
    const ativas = tabelas.filter(tabelaPrecoAtiva);
    return produtosEstoque.filter(p => !ativas.some(t => calcularPrecoNaTabela(p, t).na_tabela));
  }, [tabelas, produtosEstoque]);

  const handleAbrirNova = () => {
    setTabelaEmEdicao(null);
    setBuscaProdutoForm('');
    setFormData(formVazio());
    setModalFormAberto(true);
  };

  const handleAbrirEdicao = (tabela: TabelaPreco) => {
    setTabelaEmEdicao(tabela);
    setBuscaProdutoForm('');
    setFormData({
      codigo: tabela.codigo,
      nome: tabela.nome,
      tipo: tabela.tipo,
      mostrar_preco: tabela.mostrar_preco || 'AMBOS',
      precos_fixos: { ...(tabela.precos_fixos || {}) },
      prazo_padrao: tabela.prazo_padrao,
      frete_tipo: tabela.frete_tipo,
      vigencia_inicio: tabela.vigencia_inicio,
      vigencia_fim: tabela.vigencia_fim,
      status: tabela.status
    });
    if (tabelaVisualizar) setTabelaVisualizar(null);
    setModalFormAberto(true);
  };

  // Prévia com os dados do formulário (antes de salvar)
  const previaNoForm = (prod: ProdutoEstoque) => calcularPrecoNaTabela(prod, { precos_fixos: formData.precos_fixos });

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) {
      alert('O nome da tabela é obrigatório.');
      return;
    }

    // Só valem preços de produtos que existem
    const idsProdutos = new Set(produtosEstoque.map(p => p.id));
    const precos: Record<string, number> = {};
    Object.entries(formData.precos_fixos).forEach(([id, v]) => {
      if (idsProdutos.has(id)) precos[id] = Number(v) || 0;
    });
    const campos = camposDePreco(precos);

    if ((campos.produtos_ids || []).length === 0 &&
      !window.confirm('Nenhum produto tem preço nesta tabela, então nada poderá ser vendido por ela. Salvar mesmo assim?')) {
      return;
    }

    const negativos = produtosEstoque.filter(p => previaNoForm(p).margem_negativa);
    if (negativos.length > 0 && !window.confirm(`Atenção: margem líquida negativa em ${negativos.map(p => p.nome).join(', ')}. Salvar mesmo assim?`)) {
      return;
    }

    const dadosTabela = {
      codigo: formData.codigo,
      nome: formData.nome,
      tipo: formData.tipo,
      mostrar_preco: formData.mostrar_preco,
      prazo_padrao: formData.prazo_padrao,
      frete_tipo: formData.frete_tipo,
      vigencia_inicio: formData.vigencia_inicio,
      vigencia_fim: formData.vigencia_fim,
      status: formData.status,
      ...campos
    };

    if (tabelaEmEdicao) {
      const atualizadas = tabelas.map(t => {
        if (t.id !== tabelaEmEdicao.id) return t;
        const { ajuste_percentual, margem_percentual, desconto_padrao_percentual, ...resto } = t;
        return { ...resto, ...dadosTabela };
      });
      salvarTabelasPreco(atualizadas);
      setTabelas(atualizadas);
      dispararToast(`Tabela "${formData.nome}" atualizada com sucesso!`);
    } else {
      const nova: TabelaPreco = {
        id: `tab_${Date.now()}`,
        ...dadosTabela
      };
      const atualizadas = [nova, ...tabelas];
      salvarTabelasPreco(atualizadas);
      setTabelas(atualizadas);
      dispararToast(`Nova tabela de preços "${formData.nome}" criada com sucesso!`);
    }

    setModalFormAberto(false);
  };

  const handleExcluir = (id: string, nome: string) => {
    if (window.confirm(`Tem certeza que deseja excluir a tabela "${nome}"?`)) {
      const atualizadas = tabelas.filter(t => t.id !== id);
      salvarTabelasPreco(atualizadas);
      setTabelas(atualizadas);
      if (tabelaVisualizar?.id === id) setTabelaVisualizar(null);
      dispararToast(`Tabela de preços "${nome}" excluída.`);
    }
  };

  // Produtos com valor na tabela (os vendidos por ela)
  const produtosDaTabelaPreco = (tab: TabelaPreco) =>
    ordenarProdutos(produtosEstoque.filter(p => calcularPrecoNaTabela(p, tab).na_tabela));

  const textoVigencia = (tab: TabelaPreco) =>
    `${tab.vigencia_inicio || '-'} a ${tab.vigencia_fim || 'sem término'}`;

  // Copiar resumo formatado para WhatsApp ou texto (respeita "Mostrar preço" da tabela)
  const handleCopiarTabela = (tab: TabelaPreco) => {
    let texto = `*GRUPO ENO - TABELA DE PREÇOS OFICIAL*\n`;
    texto += `*Tabela:* ${tab.nome} (${tab.codigo})\n`;
    texto += `*Condição:* ${tab.prazo_padrao} | Frete: ${tab.frete_tipo}\n`;
    texto += `*Vigência:* ${textoVigencia(tab)}\n\n`;
    texto += `*PRODUTOS & PREÇOS:*\n`;

    const produtosDaTabela = produtosDaTabelaPreco(tab);
    if (produtosDaTabela.length === 0) texto += `(Nenhum produto com preço nesta tabela)\n`;
    produtosDaTabela.forEach(p => {
      const calc = calcularPrecoNaTabela(p, tab);
      const peso = pesoTexto(p);
      texto += `• *${p.nome}*${peso ? ` (${peso})` : ''}\n`;
      const partes: string[] = [];
      if (mostraUnitario(tab) || calc.unidades <= 1) partes.push(`Unidade: ${formatarMoeda(calc.preco)}`);
      if (mostraAcondicionamento(tab) && calc.unidades > 1) {
        partes.push(`${calc.tipo_acondicionamento} c/ ${calc.unidades}: ${formatarMoeda(calc.preco_acondicionamento)}`);
      }
      texto += `  ${partes.join(' | ')}\n`;
    });

    texto += `\n*Observações:* Pedidos sujeitos a confirmação de estoque e crédito.\nContato Comercial: (44) 3639-8200`;

    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    });
  };

  const produtosNoForm = useMemo(() => {
    const q = buscaProdutoForm.trim().toLowerCase();
    const lista = ordenarProdutos(produtosEstoque);
    if (!q) return lista;
    return lista.filter(p =>
      p.nome.toLowerCase().includes(q) ||
      String(p.codigo || '').toLowerCase().includes(q) ||
      String(p.categoria || '').toLowerCase().includes(q)
    );
  }, [produtosEstoque, buscaProdutoForm]);

  const comPrecoNoForm = produtosEstoque.filter(p => Number(formData.precos_fixos[p.id]) > 0).length;

  return (
    <div className="relative h-full w-full flex flex-col bg-[#f8faf8] text-slate-800 overflow-hidden">

      {/* 1. NAVEGAÇÃO DE PRODUTOS */}
      <ProdutosNavTabs activeTab="produtos_tabela_preco" onNavigate={onNavigate} />

      {/* 2. CABEÇALHO COMPACTO & MINIMALISTA */}
      <div className="bg-white border-b border-slate-200/80 px-6 py-3.5 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Tabelas de Preços & Condições Comerciais</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
                {tabelas.filter(tabelaPrecoAtiva).length} ativas
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Cada tabela tem o valor de cada produto. Produto sem valor na tabela não é vendido por ela.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAbrirNova}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-900 hover:bg-emerald-950 text-white font-bold text-xs shadow-xs transition-all cursor-pointer hover:shadow"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nova Tabela de Preço</span>
            </button>
          </div>
        </div>

        {/* STAT BAR MINIMALISTA EM LINHA */}
        <div className="flex flex-wrap items-center gap-6 pt-3 mt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Produtos cadastrados:</span>
            <span className="font-mono font-bold text-slate-900 tabular-nums">{produtosEstoque.length}</span>
          </div>
          <div className="w-px h-4 bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-2" title={produtosSemTabela.map(p => p.nome).join(', ')}>
            <span className="text-slate-400 font-medium">Sem preço em nenhuma tabela ativa:</span>
            <span className={`font-mono font-bold tabular-nums ${produtosSemTabela.length > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
              {produtosSemTabela.length}
            </span>
            {produtosSemTabela.length > 0 && (
              <span className="text-[11px] text-amber-700 truncate max-w-[320px]">
                ({produtosSemTabela.slice(0, 3).map(p => p.nome).join(', ')}{produtosSemTabela.length > 3 ? '…' : ''})
              </span>
            )}
          </div>
        </div>
      </div>

      {toastMsg && (
        <div className="mx-6 mt-3 p-3 bg-emerald-100 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-bold flex items-center gap-2 animate-fadeIn shrink-0">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 3. BARRA DE BUSCA */}
      <div className="bg-[#f1f5f2] px-6 py-2.5 border-b border-slate-200/80 flex items-center justify-between gap-3 shrink-0">
        <div className="flex-1 min-w-[220px] max-w-sm relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por Tabela, Código ou Segmento..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-700 font-medium"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium hidden sm:block">
          Mostrando <span className="font-bold text-slate-800">{tabelasFiltradas.length}</span> tabelas comerciais
        </div>
      </div>

      {/* 4. TABELA LIMPA EM LINHAS */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-x-auto">
          <table className="w-full min-w-[860px] text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 text-slate-500 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-5">Tabela & Código</th>
                <th className="py-3 px-4">Segmento de Mercado</th>
                <th className="py-3 px-3 text-center">Produtos / Mostra</th>
                <th className="py-3 px-4">Condição de Pagamento</th>
                <th className="py-3 px-4">Frete</th>
                <th className="py-3 px-4">Vigência</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {tabelasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                    Nenhuma tabela de preços cadastrada. Clique em "+ Nova Tabela de Preço".
                  </td>
                </tr>
              ) : (
                tabelasFiltradas.map((item) => {
                  const qtd = produtosEstoque.filter(p => calcularPrecoNaTabela(p, item).na_tabela).length;
                  const negativos = produtosEstoque.filter(p => calcularPrecoNaTabela(p, item).margem_negativa).length;
                  return (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="font-bold text-slate-900">{item.nome}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">{item.codigo}</div>
                    </td>

                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      {item.tipo}
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <div className="font-mono font-black tabular-nums text-slate-900">
                        {qtd}<span className="text-slate-400 font-bold">/{produtosEstoque.length}</span>
                      </div>
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 text-[10px] uppercase tracking-wide">
                        {nomeMostrarPreco(item)}
                      </span>
                      {negativos > 0 && (
                        <div className="text-[10px] text-red-700 font-bold mt-0.5">{negativos} com margem negativa</div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {item.prazo_padrao}
                    </td>

                    <td className="py-3.5 px-4 text-slate-700">
                      {item.frete_tipo}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-600 text-xs">
                      {textoVigencia(item)}
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      {(() => {
                        const ativa = tabelaPrecoAtiva(item);
                        const rotulo = item.status === 'ARQUIVADA' ? 'Arquivada' : ativa ? 'Vigente' : item.status === 'PROGRAMADA' ? 'Programada' : 'Fora da vigência';
                        return (
                          <span className={`inline-flex items-center gap-1.5 font-medium ${ativa ? 'text-emerald-700' : 'text-slate-400'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${ativa ? 'bg-emerald-600' : 'bg-slate-400'}`} />
                            <span>{rotulo}</span>
                          </span>
                        );
                      })()}
                    </td>

                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setTabelaVisualizar(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-900 hover:bg-emerald-950 text-white font-bold text-xs shadow-2xs cursor-pointer transition-colors"
                          title="Visualizar tabela formatada para foto ou PDF"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Visualizar</span>
                        </button>

                        <button
                          onClick={() => handleAbrirEdicao(item)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-800 hover:bg-emerald-50 transition-colors cursor-pointer border border-transparent hover:border-emerald-200"
                          title="Editar Tabela"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleExcluir(item.id, item.nome)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer border border-transparent hover:border-red-200"
                          title="Excluir Tabela"
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

      {/* 5. MODAL FORM: CRIAR / EDITAR TABELA DE PREÇO */}
      {modalFormAberto && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-6 flex justify-center items-start animate-fadeIn">
          <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col my-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)]">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <Tag className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm sm:text-base text-white">
                  {tabelaEmEdicao ? `Editar Tabela: ${tabelaEmEdicao.nome}` : 'Criar Nova Tabela de Preço'}
                </h3>
              </div>
              <button
                onClick={() => setModalFormAberto(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSalvar} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-3">
                  <label className="block font-bold text-slate-700 mb-1">Código da Tabela *</label>
                  <input
                    type="text"
                    required
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-700"
                  />
                </div>

                <div className="sm:col-span-6">
                  <label className="block font-bold text-slate-700 mb-1">Nome da Tabela Comercial *</label>
                  <input
                    type="text"
                    required
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: Tabela Atacado Mandioca & Féculas - Região Sul"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold text-slate-800 focus:outline-none focus:border-emerald-700"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as TabelaPreco['status'] })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium text-slate-800 focus:outline-none focus:border-emerald-700 cursor-pointer"
                  >
                    <option value="VIGENTE">Vigente</option>
                    <option value="PROGRAMADA">Programada</option>
                    <option value="ARQUIVADA">Arquivada</option>
                  </select>
                </div>
              </div>

              {/* MOSTRAR PREÇO: UNITÁRIO, CAIXA/FARDO OU AMBOS */}
              <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <label className="block font-bold text-slate-700">Mostrar preço</label>
                  <span className="text-[10px] text-slate-500">Vale para visualizar, imprimir, copiar no WhatsApp e para a venda nesta tabela</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" role="radiogroup">
                  {OPCOES_MOSTRAR_PRECO.map(o => {
                    const ativo = formData.mostrar_preco === o.id;
                    return (
                      <button
                        key={o.id}
                        type="button"
                        role="radio"
                        aria-checked={ativo}
                        onClick={() => setFormData({ ...formData, mostrar_preco: o.id })}
                        className={`text-left p-2.5 rounded-lg border transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40 ${ativo ? 'bg-emerald-900 border-emerald-900 text-white' : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-400'}`}
                      >
                        <div className="font-bold">{o.nome}</div>
                        <div className={`text-[10px] ${ativo ? 'text-emerald-200' : 'text-slate-400'}`}>{o.descricao}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Segmento / Canal de Venda</label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value as TabelaPreco['tipo'] })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium text-slate-800 focus:outline-none focus:border-emerald-700 cursor-pointer"
                  >
                    <option value="Atacado / Distribuidor">Atacado / Distribuidor</option>
                    <option value="Grandes Indústrias (Carga Fechada)">Grandes Indústrias (Carga Fechada)</option>
                    <option value="Varejo / Padarias">Varejo / Padarias</option>
                    <option value="Pagamento à Vista (FOB)">Pagamento à Vista (FOB)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Modalidade do Frete</label>
                  <select
                    value={formData.frete_tipo}
                    onChange={(e) => setFormData({ ...formData, frete_tipo: e.target.value as TabelaPreco['frete_tipo'] })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium text-slate-800 focus:outline-none focus:border-emerald-700 cursor-pointer"
                  >
                    <option value="CIF (Entrega Grupo ENO)">CIF (Entrega por conta do Grupo ENO)</option>
                    <option value="FOB (Retira Fábrica)">FOB (Retira na Fábrica pelo Cliente)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Condição de Pagamento Padrão</label>
                  <input
                    type="text"
                    required
                    value={formData.prazo_padrao}
                    onChange={(e) => setFormData({ ...formData, prazo_padrao: e.target.value })}
                    placeholder="Ex: Boleto 28 Dias ou À Vista Antecipado"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-emerald-700"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Início da Vigência</label>
                  <input
                    type="text"
                    required
                    value={formData.vigencia_inicio}
                    onChange={(e) => setFormData({ ...formData, vigencia_inicio: e.target.value })}
                    placeholder="DD/MM/AAAA"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono text-center focus:outline-none focus:border-emerald-700"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Término da Vigência</label>
                  <input
                    type="text"
                    value={formData.vigencia_fim}
                    onChange={(e) => setFormData({ ...formData, vigencia_fim: e.target.value })}
                    placeholder="DD/MM/AAAA"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono text-center focus:outline-none focus:border-emerald-700"
                  />
                </div>
              </div>

              {/* GRADE: TODOS OS PRODUTOS (BRANCO = NÃO VENDIDO NESTA TABELA) */}
              <div className="pt-4 border-t border-slate-200 space-y-2">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 text-sm flex items-center gap-1.5">
                      <LayoutList className="w-4 h-4 text-emerald-700" />
                      Valor de cada produto nesta tabela
                    </label>
                    <span className="text-[11px] text-slate-500">
                      <span className="font-mono font-bold tabular-nums text-emerald-800">{comPrecoNoForm}</span> de{' '}
                      <span className="font-mono font-bold tabular-nums">{produtosEstoque.length}</span> produtos com preço • em branco = não vendido nesta tabela
                    </span>
                  </div>
                  {produtosEstoque.length > 8 && (
                    <div className="relative w-full sm:w-64">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={buscaProdutoForm}
                        onChange={(e) => setBuscaProdutoForm(e.target.value)}
                        placeholder="Filtrar produto ou categoria"
                        className="w-full pl-7 pr-2 py-1.5 rounded-lg bg-white border border-slate-200 text-xs focus:outline-none focus:border-emerald-700"
                      />
                    </div>
                  )}
                </div>

                {produtosEstoque.length === 0 ? (
                  <p className="text-slate-400 italic">Nenhum produto cadastrado. Cadastre em Produtos Acabados.</p>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-[380px] overflow-y-auto">
                    <table className="w-full min-w-[720px] text-left border-collapse">
                      <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3">Produto</th>
                          <th className="py-2 px-3 w-[230px]">Preço na tabela</th>
                          <th className="py-2 px-3 text-right">Custo</th>
                          <th className="py-2 px-3 text-right">Imp. venda</th>
                          <th className="py-2 px-3 text-right">Margem líquida</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {produtosNoForm.map(prod => {
                          const calc = previaNoForm(prod);
                          const unitario = Number(formData.precos_fixos[prod.id]) || 0;
                          const alterar = (v: number | undefined) =>
                            setFormData(prev => {
                              const novo = { ...prev.precos_fixos };
                              if (v === undefined) delete novo[prod.id];
                              else novo[prod.id] = v;
                              return { ...prev, precos_fixos: novo };
                            });
                          return (
                            <tr key={prod.id} className={calc.margem_negativa ? 'bg-red-50/70' : calc.na_tabela ? '' : 'bg-slate-50/40'}>
                              <td className="py-2 px-3">
                                <div className={`font-bold ${calc.na_tabela ? 'text-slate-900' : 'text-slate-500'}`}>{prod.nome}</div>
                                <div className="text-[10px] text-slate-400">
                                  <span className="font-mono">{prod.codigo}</span>
                                  {prod.categoria && <> • {prod.categoria}</>}
                                  {' • '}
                                  {calc.unidades > 1 ? `${calc.tipo_acondicionamento} c/ ${calc.unidades}` : calc.tipo_acondicionamento}
                                </div>
                              </td>
                              <td className="py-2 px-3">
                                <CampoPrecoTabela
                                  unitario={unitario > 0 ? unitario : undefined}
                                  unidades={calc.unidades}
                                  tipoAcondicionamento={calc.tipo_acondicionamento}
                                  mostrarUnitario={formData.mostrar_preco !== 'ACONDICIONAMENTO'}
                                  mostrarCaixa={formData.mostrar_preco !== 'UNITARIO'}
                                  alerta={calc.margem_negativa}
                                  onChange={alterar}
                                />
                              </td>
                              <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-600">
                                {calc.custo > 0 ? formatarMoeda(calc.custo) : '—'}
                              </td>
                              <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-600">
                                {calc.na_tabela ? formatarMoeda(calc.impostos_venda) : '—'}
                              </td>
                              <td className="py-2 px-3 text-right font-mono tabular-nums font-bold">
                                {!calc.na_tabela ? (
                                  <span className="text-slate-300 font-normal font-sans text-[10px]">não vendido</span>
                                ) : (
                                  <span className={calc.margem_negativa ? 'text-red-700 inline-flex items-center gap-1' : (calc.margem_liquida_percentual ?? 0) < 10 ? 'text-amber-700' : 'text-emerald-800'}>
                                    {calc.margem_negativa && <AlertCircle className="w-3 h-3" />}
                                    {formatarMoeda(calc.margem_liquida)}
                                    <span className="text-[10px] font-semibold ml-1">({(calc.margem_liquida_percentual ?? 0).toFixed(1)}%)</span>
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {produtosNoForm.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-slate-400">Nenhum produto encontrado para "{buscaProdutoForm}".</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
                <p className="text-[10px] text-slate-400">
                  Digite o valor unitário ou o da caixa/fardo (o outro acompanha pela quantidade do acondicionamento do produto).
                  Margem líquida = preço − custo do produto − impostos de venda do produto, por unidade.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalFormAberto(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-emerald-900 hover:bg-emerald-950 text-white font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{tabelaEmEdicao ? 'Salvar Alterações' : 'Criar Tabela'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL VISUALIZAR TABELA DE PREÇOS (PRONTO PARA FOTO, WHATSAPP OU PDF) */}
      {tabelaVisualizar && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-6 flex justify-center items-start animate-fadeIn">
          <div className="relative w-full max-w-4xl lg:max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col my-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)]">
            
            {/* Barra Superior de Ações */}
            <div className="bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <Tag className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm sm:text-base text-white">
                  Visualização da Tabela Comercial: {tabelaVisualizar.nome}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAbrirEdicao(tabelaVisualizar)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-white font-bold transition-colors cursor-pointer border border-slate-700"
                  title="Editar dados da tabela"
                >
                  <Edit2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Editar</span>
                </button>
                <button
                  onClick={() => setTabelaVisualizar(null)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Conteúdo Imprimível / Catálogo Comercial Formatado */}
            <div id="tabela-preco-imprimivel" className="p-6 sm:p-8 space-y-5 text-xs overflow-y-auto flex-1 bg-white">
              
              {/* Cabeçalho Comercial Oficial com Informações da Empresa */}
              <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-6 h-6 text-emerald-900" />
                    <span className="text-xl font-black text-slate-900 tracking-tight">GRUPO ENO AGROINDUSTRIAL</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Fecularia & Mandioca Gourmet • Rodovia PR-482, km 14 • CNPJ: 14.882.910/0001-44
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium flex items-center gap-2 mt-0.5">
                    <span>Telefone: (44) 3639-8200</span>
                    <span>•</span>
                    <span>E-mail: comercial@grupoeno.com.br</span>
                  </p>
                </div>

                <div className="text-right">
                  <div className="inline-block px-3 py-1 bg-emerald-900 text-white font-black rounded-lg text-xs uppercase font-mono tracking-wider">
                    TABELA DE PREÇOS VIGENTE
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 font-mono">
                    Código: <span className="font-bold text-slate-900">{tabelaVisualizar.codigo}</span>
                  </div>
                </div>
              </div>

              {/* Informações da Política Comercial Desta Tabela */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Nome da Tabela</span>
                    <span className="font-bold text-slate-900 text-sm">{tabelaVisualizar.nome}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Segmento / Canal</span>
                    <span className="font-medium text-slate-800">{tabelaVisualizar.tipo}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Prazo & Frete</span>
                    <span className="font-medium text-slate-800">{tabelaVisualizar.prazo_padrao} • {tabelaVisualizar.frete_tipo}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Vigência Oficial</span>
                    <span className="font-mono font-bold text-slate-900">{textoVigencia(tabelaVisualizar)}</span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-emerald-900 font-bold">Preços apresentados:</span>
                  <span className="font-black text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded border border-emerald-300 uppercase tracking-wide text-[11px]">
                    {nomeMostrarPreco(tabelaVisualizar)}
                  </span>
                </div>
              </div>

              {/* Tabela de Produtos Formatada em Linhas */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="font-bold text-slate-900 uppercase tracking-wider text-xs block">
                    Catálogo de Produtos & Preços Praticados
                  </span>
                  <label className="print:hidden flex items-center gap-1.5 text-[11px] text-slate-500 font-medium cursor-pointer" data-html2canvas-ignore="true">
                    <input
                      type="checkbox"
                      checked={mostrarCustos}
                      onChange={(e) => setMostrarCustos(e.target.checked)}
                      className="w-3.5 h-3.5 cursor-pointer"
                    />
                    Mostrar custo e margem (uso interno, não imprime)
                  </label>
                </div>

                {(() => {
                  const verUn = mostraUnitario(tabelaVisualizar);
                  const verCx = mostraAcondicionamento(tabelaVisualizar);
                  const lista = produtosDaTabelaPreco(tabelaVisualizar);
                  return (
                <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100/80 text-[10px] font-bold uppercase text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-4">Código / Produto</th>
                        <th className="py-2.5 px-3">Peso / Acondicionamento</th>
                        {mostrarCustos && <th className="py-2.5 px-3 text-right print:hidden">Custo</th>}
                        {mostrarCustos && <th className="py-2.5 px-3 text-right print:hidden">Imp. venda</th>}
                        {mostrarCustos && <th className="py-2.5 px-3 text-right print:hidden">Margem líquida</th>}
                        {verUn && <th className="py-2.5 px-3 text-right text-emerald-800">Preço Unitário</th>}
                        {verCx && <th className="py-2.5 px-4 text-right text-emerald-800">Preço Caixa / Fardo</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {lista.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400">Nenhum produto com preço nesta tabela.</td>
                        </tr>
                      )}
                      {lista.map((p) => {
                        const calc = calcularPrecoNaTabela(p, tabelaVisualizar);
                        return (
                          <tr key={p.id} className={`transition-colors ${mostrarCustos && calc.margem_negativa ? 'bg-red-50/70' : 'hover:bg-slate-50/60'}`}>
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900">{p.nome}</div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">{p.codigo}</div>
                            </td>

                            <td className="py-3 px-3">
                              <span className="text-slate-600 font-medium mr-1.5">{pesoTexto(p)}</span>
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold text-[10px] border border-slate-200">
                                {calc.tipo_acondicionamento} {calc.unidades > 1 ? `c/ ${calc.unidades} un` : 'Avulso'}
                              </span>
                            </td>

                            {mostrarCustos && (
                              <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-600 print:hidden">
                                {calc.custo > 0 ? formatarMoeda(calc.custo) : '—'}
                              </td>
                            )}
                            {mostrarCustos && (
                              <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-600 print:hidden">
                                {formatarMoeda(calc.impostos_venda)}
                              </td>
                            )}
                            {mostrarCustos && (
                              <td className={`py-3 px-3 text-right font-mono tabular-nums font-bold print:hidden ${calc.margem_negativa ? 'text-red-700' : 'text-slate-800'}`}>
                                {formatarMoeda(calc.margem_liquida)}
                                <span className="block text-[9px] font-sans">
                                  {calc.margem_negativa ? 'margem negativa' : `${(calc.margem_liquida_percentual ?? 0).toFixed(1)}%`}
                                </span>
                              </td>
                            )}

                            {verUn && (
                              <td className="py-3 px-3 text-right font-mono tabular-nums font-black text-emerald-950 bg-emerald-50/40">
                                {formatarMoeda(calc.preco)}
                              </td>
                            )}

                            {verCx && (
                              <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                                {formatarMoeda(calc.preco_acondicionamento)}
                                <span className="text-[10px] text-slate-400 font-normal font-sans ml-1">/{calc.unidades > 1 ? calc.tipo_acondicionamento : 'un'}</span>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                  );
                })()}
              </div>

              {/* Condições Gerais e Observações Comerciais */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1.5">
                <span className="font-bold text-slate-900 block uppercase tracking-wider text-[10px]">
                  Condições Gerais de Faturamento e Entrega:
                </span>
                <p>• Preços expressos em Reais (R$), com impostos inclusos conforme legislação tributária vigente.</p>
                <p>• Carga Fechada (+30 Toneladas) possui frete CIF bonificado e prioridade de carregamento na fábrica.</p>
                <p>• Pedidos faturados sujeitos à análise prévia de crédito e disponibilidade física no galpão industrial.</p>
              </div>

              {/* Rodapé com Assinatura Comercial */}
              <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between text-[11px] text-slate-500">
                <div>
                  Diretoria Comercial • <span className="font-bold text-slate-800">Grupo ENO Agroindustrial</span>
                </div>
                <div className="font-mono text-[10px]">
                  Documento gerado automaticamente pelo ERP Grupo ENO • {new Date().toLocaleDateString('pt-BR')}
                </div>
              </div>

            </div>

            {/* Rodapé de Ações do Modal */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-900 hover:bg-emerald-950 text-white font-bold cursor-pointer text-xs shadow-xs transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir / Salvar em PDF</span>
                </button>

                <button
                  onClick={() => handleCopiarTabela(tabelaVisualizar)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 cursor-pointer text-xs shadow-2xs transition-colors"
                  title="Copiar texto formatado para enviar no WhatsApp ou gerar foto"
                >
                  {copiado ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
                  <span>{copiado ? 'Tabela Copiada!' : 'Copiar para WhatsApp (Texto/Foto)'}</span>
                </button>
              </div>

              <button
                onClick={() => setTabelaVisualizar(null)}
                className="px-6 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs cursor-pointer"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
