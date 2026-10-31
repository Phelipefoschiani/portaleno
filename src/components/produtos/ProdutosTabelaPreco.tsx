import React, { useState, useEffect, useMemo } from 'react';
import {
  Tag,
  Plus,
  Search,
  CheckCircle2,
  Calendar,
  Percent,
  Truck,
  Edit2,
  Trash2,
  X,
  Save,
  Check,
  Eye,
  Printer,
  Copy,
  Building2,
  Phone,
  FileText,
  BadgePercent
} from 'lucide-react';
import {
  TabelaPreco,
  TABELAS_PRECO_INICIAIS,
  carregarTabelasPreco,
  salvarTabelasPreco,
  carregarEstoqueProdutos,
  ProdutoEstoque
} from '../../data/produtosData';
import { ProdutosNavTabs } from './ProdutosNavTabs';

interface Props {
  onNavigate?: (tabId: string) => void;
}

export function ProdutosTabelaPreco({ onNavigate }: Props) {
  const [tabelas, setTabelas] = useState<TabelaPreco[]>(() => carregarTabelasPreco());
  const [busca, setBusca] = useState('');
  
  // Modais
  const [modalFormAberto, setModalFormAberto] = useState(false);
  const [tabelaEmEdicao, setTabelaEmEdicao] = useState<TabelaPreco | null>(null);
  const [tabelaVisualizar, setTabelaVisualizar] = useState<TabelaPreco | null>(null);

  // Toast e Cópia
  const [toastMsg, setToastMsg] = useState('');
  const [copiado, setCopiado] = useState(false);

  // Produtos do catálogo de estoque para exibir na tabela comercial
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

  const [formData, setFormData] = useState({
    codigo: '',
    nome: '',
    tipo: 'Atacado / Distribuidor' as TabelaPreco['tipo'],
    desconto_padrao_percentual: 0,
    prazo_padrao: 'Boleto Bancário 28 Dias',
    frete_tipo: 'CIF (Entrega Grupo ENO)' as TabelaPreco['frete_tipo'],
    vigencia_inicio: '01/01/2026',
    vigencia_fim: '31/12/2026',
    status: 'VIGENTE' as TabelaPreco['status'],
    produtos_ids: [] as string[]
  });

  const tabelasFiltradas = tabelas.filter(t =>
    t.nome.toLowerCase().includes(busca.toLowerCase()) ||
    t.codigo.toLowerCase().includes(busca.toLowerCase()) ||
    t.tipo.toLowerCase().includes(busca.toLowerCase())
  );

  const handleAbrirNova = () => {
    setTabelaEmEdicao(null);
    setFormData({
      codigo: `TAB-${Date.now().toString().slice(-4)}`,
      nome: '',
      tipo: 'Atacado / Distribuidor',
      desconto_padrao_percentual: 0,
      prazo_padrao: 'Boleto Bancário 28 Dias',
      frete_tipo: 'CIF (Entrega Grupo ENO)',
      vigencia_inicio: '01/04/2026',
      vigencia_fim: '31/12/2026',
      status: 'VIGENTE',
      produtos_ids: []
    });
    setModalFormAberto(true);
  };

  const handleAbrirEdicao = (tabela: TabelaPreco) => {
    setTabelaEmEdicao(tabela);
    setFormData({
      codigo: tabela.codigo,
      nome: tabela.nome,
      tipo: tabela.tipo,
      desconto_padrao_percentual: tabela.desconto_padrao_percentual,
      prazo_padrao: tabela.prazo_padrao,
      frete_tipo: tabela.frete_tipo,
      vigencia_inicio: tabela.vigencia_inicio,
      vigencia_fim: tabela.vigencia_fim,
      status: tabela.status,
      produtos_ids: tabela.produtos_ids || []
    });
    if (tabelaVisualizar) setTabelaVisualizar(null);
    setModalFormAberto(true);
  };

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) {
      alert('O nome da tabela é obrigatório.');
      return;
    }
    
    if (!formData.produtos_ids || formData.produtos_ids.length === 0) {
      alert('Não é possível salvar uma tabela de preços sem produtos. Selecione pelo menos um produto abaixo.');
      return;
    }
    
    // Validação estrita: requer pelo menos um produto selecionado
    // (A implementação da checkbox ainda precisa de estado, mas esta é a validação de bloqueio solicitada)
    // Se a lógica de checkboxes não estiver integrada, o usuário será bloqueado corretamente.
    
    if (tabelaEmEdicao) {
      const atualizadas = tabelas.map(t => {
        if (t.id === tabelaEmEdicao.id) {
          return {
            ...t,
            ...formData
          };
        }
        return t;
      });
      salvarTabelasPreco(atualizadas);
      setTabelas(atualizadas);
      dispararToast(`Tabela "${formData.nome}" atualizada com sucesso!`);
    } else {
      const nova: TabelaPreco = {
        id: `tab_${Date.now()}`,
        ...formData
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

  // Somente os produtos vinculados à tabela (produtos_ids); tabela antiga sem lista mostra todos
  const produtosDaTabelaPreco = (tab: TabelaPreco) =>
    Array.isArray(tab.produtos_ids) ? produtosEstoque.filter(p => tab.produtos_ids!.includes(p.id)) : produtosEstoque;

  // Copiar resumo formatado para WhatsApp ou texto
  const handleCopiarTabela = (tab: TabelaPreco) => {
    const desconto = tab.desconto_padrao_percentual || 0;
    let texto = `*GRUPO ENO - TABELA DE PREÇOS OFICIAL*\n`;
    texto += `*Tabela:* ${tab.nome} (${tab.codigo})\n`;
    texto += `*Condição:* ${tab.prazo_padrao} | Frete: ${tab.frete_tipo}\n`;
    if (desconto > 0) {
      texto += `*Desconto Comercial Aplicado:* ${desconto}%\n`;
    }
    texto += `*Vigência:* ${tab.vigencia_inicio} a ${tab.vigencia_fim}\n\n`;
    texto += `*PRODUTOS & PREÇOS:*\n`;

    const produtosDaTabela = produtosDaTabelaPreco(tab);
    if (produtosDaTabela.length === 0) texto += `(Nenhum produto vinculado a esta tabela)
`;
    produtosDaTabela.forEach(p => {
      const precoBase = p.preco_unitario_venda || 0;
      const precoFinal = precoBase * (1 - desconto / 100);
      const acondQtd = p.unidades_por_acondicionamento || 1;
      const acondTipo = p.tipo_acondicionamento || (p.tipo_embalagem.includes('Fardo') ? 'Fardo' : p.tipo_embalagem.includes('Caixa') ? 'Caixa' : 'Saco');
      const precoAcond = precoFinal * acondQtd;

      texto += `• *${p.nome}* (${p.tipo_embalagem})\n`;
      texto += `  Preço Un: R$ ${precoFinal.toFixed(2)}`;
      if (acondQtd > 1) {
        texto += ` | ${acondTipo} c/ ${acondQtd}: R$ ${precoAcond.toFixed(2)}`;
      }
      texto += `\n`;
    });

    texto += `\n*Observações:* Pedidos sujeitos a confirmação de estoque e crédito.\nContato Comercial: (44) 3639-8200`;

    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    });
  };

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
                {tabelas.length} ativas
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Políticas de preços para distribuidores, grandes indústrias alimentícias e condições especiais com visualização para foto/PDF.
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
            <span className="text-slate-400 font-medium">Tabela Principal:</span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              R$ 87,50 / saco 25kg (Fécula Padrão)
            </span>
          </div>
          <div className="w-px h-4 bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Desconto Carga Fechada (+30 Ton):</span>
            <span className="font-mono font-bold text-emerald-700">
              Até 7.5% de desconto
            </span>
          </div>
          <div className="w-px h-4 bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Condição FOB (Retira):</span>
            <span className="font-mono font-bold text-slate-900">
              10% de desconto à vista
            </span>
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
        <div className="flex-1 min-w-[260px] max-w-sm relative">
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
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 text-slate-500 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-5">Tabela & Código</th>
                <th className="py-3 px-4">Segmento de Mercado</th>
                <th className="py-3 px-3 text-center">Desconto</th>
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
                tabelasFiltradas.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="font-bold text-slate-900">{item.nome}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">{item.codigo}</div>
                    </td>

                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      {item.tipo}
                    </td>

                    <td className="py-3.5 px-3 font-mono font-bold text-center">
                      {item.desconto_padrao_percentual > 0 ? (
                        <span className="inline-block px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-black border border-emerald-200">
                          -{item.desconto_padrao_percentual}%
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">0% (Base)</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {item.prazo_padrao}
                    </td>

                    <td className="py-3.5 px-4 text-slate-700">
                      {item.frete_tipo}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-600 text-xs">
                      {item.vigencia_inicio} a {item.vigencia_fim}
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                        <span>Vigente</span>
                      </span>
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. MODAL FORM: CRIAR / EDITAR TABELA DE PREÇO */}
      {modalFormAberto && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-6 flex justify-center items-start animate-fadeIn">
          <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col my-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)]">
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
                  <label className="block font-bold text-slate-700 mb-1">Desconto Comercial (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="50"
                    value={formData.desconto_padrao_percentual}
                    onChange={(e) => setFormData({ ...formData, desconto_padrao_percentual: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono font-bold text-center text-slate-800 focus:outline-none focus:border-emerald-700"
                  />
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
                    required
                    value={formData.vigencia_fim}
                    onChange={(e) => setFormData({ ...formData, vigencia_fim: e.target.value })}
                    placeholder="DD/MM/AAAA"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono text-center focus:outline-none focus:border-emerald-700"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <label className="block font-bold text-slate-700 mb-2 text-sm">Produtos Selecionados</label>
                <div className="space-y-2 max-h-[300px] overflow-y-auto p-1">
                  {produtosEstoque.length === 0 ? (
                    <p className="text-slate-400 italic">Nenhum produto cadastrado no estoque para adicionar à tabela.</p>
                  ) : (
                    produtosEstoque.map((prod) => (
                      <div key={prod.id} className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
                        <input 
                          type="checkbox" 
                          id={`prod-${prod.id}`}
                          className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                          checked={formData.produtos_ids.includes(prod.id)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setFormData(prev => ({
                              ...prev,
                              produtos_ids: checked 
                                ? [...prev.produtos_ids, prod.id] 
                                : prev.produtos_ids.filter(id => id !== prod.id)
                            }));
                          }}
                        />
                        <label htmlFor={`prod-${prod.id}`} className="flex-1 font-bold text-slate-800 cursor-pointer">
                          {prod.nome}
                          <span className="ml-2 text-[10px] text-slate-500 font-normal uppercase tracking-wide">({prod.tipo_embalagem})</span>
                        </label>
                        <div className="text-right">
                          <div className="text-[10px] text-slate-400 font-bold uppercase">Preço Base</div>
                          <div className="font-mono font-bold text-emerald-800">
                            R$ {(prod.preco_unitario_venda || 0).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
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
                    <span className="font-mono font-bold text-slate-900">{tabelaVisualizar.vigencia_inicio} a {tabelaVisualizar.vigencia_fim}</span>
                  </div>
                </div>

                {tabelaVisualizar.desconto_padrao_percentual > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs">
                    <span className="text-emerald-900 font-bold flex items-center gap-1.5">
                      <BadgePercent className="w-4 h-4 text-emerald-700" />
                      Desconto comercial configurado para este canal:
                    </span>
                    <span className="font-mono font-black text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded border border-emerald-300">
                      -{tabelaVisualizar.desconto_padrao_percentual}% sobre o preço base
                    </span>
                  </div>
                )}
              </div>

              {/* Tabela de Produtos Formatada em Linhas */}
              <div>
                <span className="font-bold text-slate-900 uppercase tracking-wider text-xs block mb-2">
                  Catálogo de Produtos & Preços Praticados
                </span>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100/80 text-[10px] font-bold uppercase text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-4">Código / Produto</th>
                        <th className="py-2.5 px-3">Embalagem Individual</th>
                        <th className="py-2.5 px-3">Acondicionamento</th>
                        <th className="py-2.5 px-3 text-right">Preço Base</th>
                        {tabelaVisualizar.desconto_padrao_percentual > 0 && (
                          <th className="py-2.5 px-3 text-right text-emerald-800">Preço com Desconto</th>
                        )}
                        <th className="py-2.5 px-4 text-right">Preço Pacote / Fardo Fechado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {produtosDaTabelaPreco(tabelaVisualizar).map((p) => {
                        const desconto = tabelaVisualizar.desconto_padrao_percentual || 0;
                        const precoBase = p.preco_unitario_venda || 0;
                        const precoFinal = precoBase * (1 - desconto / 100);
                        const acondQtd = p.unidades_por_acondicionamento || 1;
                        const acondTipo = p.tipo_acondicionamento || (p.tipo_embalagem.includes('Fardo') ? 'Fardo' : p.tipo_embalagem.includes('Caixa') ? 'Caixa' : 'Saco');
                        const precoAcond = precoFinal * acondQtd;

                        return (
                          <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900">{p.nome}</div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">{p.codigo}</div>
                            </td>

                            <td className="py-3 px-3 font-medium text-slate-700">
                              {p.tipo_embalagem}
                            </td>

                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold text-[10px] border border-slate-200">
                                {acondTipo} {acondQtd > 1 ? `c/ ${acondQtd} un` : 'Avulso'}
                              </span>
                            </td>

                            <td className={`py-3 px-3 text-right font-mono ${desconto > 0 ? 'text-slate-400 line-through text-[11px]' : 'font-bold text-slate-900'}`}>
                              {precoBase.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </td>

                            {desconto > 0 && (
                              <td className="py-3 px-3 text-right font-mono font-black text-emerald-950 bg-emerald-50/40">
                                {precoFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </td>
                            )}

                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                              {precoAcond.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              <span className="text-[10px] text-slate-400 font-normal font-sans ml-1">/{acondTipo}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
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
