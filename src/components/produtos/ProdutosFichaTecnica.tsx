import React, { useState, useEffect, useMemo } from 'react';
import { CampoNumero } from '../ui/CampoNumero';
import {
  FileText,
  Plus,
  Eye,
  Edit2,
  Trash2,
  Search,
  Printer,
  X,
  CheckCircle2,
  Copy,
  Check,
  Building2,
  Save,
  ShieldCheck,
  PlusCircle
} from 'lucide-react';
import {
  FichaTecnica,
  ItemFichaTecnica,
  FICHAS_TECNICAS_INICIAIS,
  carregarFichasTecnicas,
  salvarFichasTecnicas,
  carregarEstoqueProdutos,
  carregarReceitas,
  assinaturaComposicaoReceita,
  consumoPorPacoteDaReceita,
  ReceitaIndustrial
} from '../../data/produtosData';
import { RefreshCw, FlaskConical } from 'lucide-react';

const fmtQtd = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 4 });

// Itens da ficha gerados a partir da composição da receita (MP, quantidade por pacote e por batelada)
function itensDaReceita(rec?: ReceitaIndustrial): ItemFichaTecnica[] {
  if (!rec) return [];
  return consumoPorPacoteDaReceita(rec).map(c => ({
    item_nome: c.materia_prima_nome,
    quantidade: `${fmtQtd(c.quantidade_por_pacote)} ${c.unidade_medida}/pacote (${fmtQtd(c.quantidade_receita)} ${c.unidade_medida} na batelada de ${rec.rendimento_pacotes})`,
    origem: 'RECEITA' as const,
    materia_prima_id: c.materia_prima_id
  }));
}
import { ProdutosNavTabs } from './ProdutosNavTabs';

interface Props {
  onNavigate?: (tabId: string) => void;
}

// Normaliza itens garantindo que mesmo fichas antigas tenham o array dinâmico
function normalizarFichas(fichas: FichaTecnica[]): FichaTecnica[] {
  return fichas.map(f => {
    if (f.itens_especificacao && Array.isArray(f.itens_especificacao) && f.itens_especificacao.length > 0) {
      return f;
    }
    const itens: ItemFichaTecnica[] = [];
    if (f.umidade_maxima_percentual) itens.push({ item_nome: 'Umidade Máxima', quantidade: `${f.umidade_maxima_percentual}%` });
    if (f.ph_faixa) itens.push({ item_nome: 'Faixa de pH', quantidade: f.ph_faixa });
    if (f.acidez_maxima_cm3) itens.push({ item_nome: 'Acidez Titulável', quantidade: `${f.acidez_maxima_cm3} cm³` });
    if (f.cinzas_maximas_percentual) itens.push({ item_nome: 'Teor de Cinzas', quantidade: `${f.cinzas_maximas_percentual}%` });
    if (f.viscosidade_brookfield_cp) itens.push({ item_nome: 'Viscosidade Brookfield', quantidade: `${f.viscosidade_brookfield_cp} cP` });
    if (f.prazo_validade_meses) itens.push({ item_nome: 'Prazo de Validade', quantidade: `${f.prazo_validade_meses} meses` });
    if (itens.length === 0) {
      itens.push({ item_nome: 'Item Principal', quantidade: '100%' });
    }
    return { ...f, itens_especificacao: itens };
  });
}

export function ProdutosFichaTecnica({ onNavigate }: Props) {
  const [fichas, setFichas] = useState<FichaTecnica[]>(() => normalizarFichas(carregarFichasTecnicas()));
  const [busca, setBusca] = useState('');
  const [produtosEstoque, setProdutosEstoque] = useState(() => carregarEstoqueProdutos());
  const [receitas, setReceitas] = useState<ReceitaIndustrial[]>(() => carregarReceitas());
  const [formReceitaId, setFormReceitaId] = useState('');
  const [formAssinatura, setFormAssinatura] = useState('');
  const [formValidadeMeses, setFormValidadeMeses] = useState<number>(24);

  const receitaDoProduto = (produtoId: string) => {
    const prod = produtosEstoque.find(p => p.id === produtoId);
    return prod?.receita_id ? receitas.find(r => r.id === prod.receita_id) : undefined;
  };

  // Substitui os itens vindos da receita, mantendo os itens livres preenchidos
  const aplicarItensDaReceita = (produtoId: string, itensAtuais: ItemFichaTecnica[]) => {
    const rec = receitaDoProduto(produtoId);
    const livres = itensAtuais.filter(it => it.origem !== 'RECEITA' && (it.item_nome.trim() !== '' || it.quantidade.trim() !== ''));
    const daReceita = itensDaReceita(rec);
    setFormReceitaId(rec?.id || '');
    setFormAssinatura(assinaturaComposicaoReceita(rec));
    const novos = [...daReceita, ...livres];
    setFormItens(novos.length > 0 ? novos : [{ item_nome: '', quantidade: '' }]);
  };

  const fichaDesatualizada = (f: FichaTecnica) => {
    if (!f.produto_id) return false;
    const rec = receitaDoProduto(f.produto_id);
    if (!rec) return false;
    return f.receita_id !== rec.id || (f.receita_assinatura || '') !== assinaturaComposicaoReceita(rec);
  };
  
  // Modais
  const [fichaVisualizar, setFichaVisualizar] = useState<FichaTecnica | null>(null);
  const [modalFormAberto, setModalFormAberto] = useState(false);
  const [fichaEmEdicao, setFichaEmEdicao] = useState<FichaTecnica | null>(null);
  
  // Toast & Copiar
  const [toastMsg, setToastMsg] = useState('');
  const [copiado, setCopiado] = useState(false);

  // Form State: Dinâmico sem espaços fixos forçados!
  const [formProdutoId, setFormProdutoId] = useState('');
  const [formProdutoNome, setFormProdutoNome] = useState('');
  const [formCodigo, setFormCodigo] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formRegistroMapa, setFormRegistroMapa] = useState('');
  
  // A pessoa adiciona as coisas que quer e a quantidade que quer!
  const [formItens, setFormItens] = useState<ItemFichaTecnica[]>([
    { item_nome: '', quantidade: '' }
  ]);

  const dispararToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  useEffect(() => {
    const handleAtualizacao = () => {
      setFichas(normalizarFichas(carregarFichasTecnicas()));
      setProdutosEstoque(carregarEstoqueProdutos());
      setReceitas(carregarReceitas());
    };
    window.addEventListener('fichas_tecnicas_updated', handleAtualizacao);
    window.addEventListener('produtos_updated', handleAtualizacao);
    window.addEventListener('receitas_updated', handleAtualizacao);
    return () => {
      window.removeEventListener('fichas_tecnicas_updated', handleAtualizacao);
      window.removeEventListener('produtos_updated', handleAtualizacao);
      window.removeEventListener('receitas_updated', handleAtualizacao);
    };
  }, []);

  const fichasFiltradas = fichas.filter(f =>
    f.produto_nome.toLowerCase().includes(busca.toLowerCase()) ||
    (f.codigo && f.codigo.toLowerCase().includes(busca.toLowerCase())) ||
    (f.registro_sif_mapa && f.registro_sif_mapa.toLowerCase().includes(busca.toLowerCase())) ||
    (f.itens_especificacao && f.itens_especificacao.some(it => it.item_nome.toLowerCase().includes(busca.toLowerCase())))
  );

  // Adicionar uma nova linha de item livre
  const handleAdicionarItemLinha = () => {
    setFormItens([...formItens, { item_nome: '', quantidade: '' }]);
  };

  // Atualizar campo de uma linha
  const handleAtualizarItemLinha = (idx: number, campo: keyof ItemFichaTecnica, valor: string) => {
    const novos = [...formItens];
    novos[idx] = { ...novos[idx], [campo]: valor };
    setFormItens(novos);
  };

  // Remover uma linha
  const handleRemoverItemLinha = (idx: number) => {
    if (formItens.length === 1) {
      setFormItens([{ item_nome: '', quantidade: '' }]);
      return;
    }
    setFormItens(formItens.filter((_, i) => i !== idx));
  };

  // Abrir Modal para Nova Ficha
  const handleAbrirNova = () => {
    setFichaEmEdicao(null);
    setFormProdutoId('');
    setFormProdutoNome('');
    setFormCodigo(`FT-${Date.now().toString().slice(-4)}`);
    setFormDescricao('');
    setFormRegistroMapa('SIF nº 0048/2024');
    setFormReceitaId('');
    setFormAssinatura('');
    setFormValidadeMeses(24);
    // Inicia com linhas livres para o usuário colocar o que quiser e a quantidade que quiser
    setFormItens([
      { item_nome: '', quantidade: '' },
      { item_nome: '', quantidade: '' }
    ]);
    setModalFormAberto(true);
  };

  // Abrir Modal para Editar Ficha
  const handleAbrirEdicao = (ficha: FichaTecnica) => {
    setFichaEmEdicao(ficha);
    setFormProdutoId(ficha.produto_id || '');
    setFormProdutoNome(ficha.produto_nome);
    setFormCodigo(ficha.codigo || `FT-${Date.now().toString().slice(-4)}`);
    setFormDescricao(ficha.descricao_padrao || '');
    setFormRegistroMapa(ficha.registro_sif_mapa || '');
    setFormReceitaId(ficha.receita_id || '');
    setFormAssinatura(ficha.receita_assinatura || '');
    setFormValidadeMeses(Number(ficha.prazo_validade_meses) || 24);
    
    // Se a ficha já tem itens, carrega eles; senão, cria uma linha vazia
    if (ficha.itens_especificacao && ficha.itens_especificacao.length > 0) {
      setFormItens(ficha.itens_especificacao.map(it => ({ ...it })));
    } else {
      setFormItens([{ item_nome: '', quantidade: '' }]);
    }

    if (fichaVisualizar) setFichaVisualizar(null);
    setModalFormAberto(true);
  };

  // Salvar (Criar ou Editar)
  const handleSalvarFicha = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProdutoNome.trim()) return;

    // Filtra apenas itens preenchidos
    const itensValidos = formItens.filter(it => it.item_nome.trim() !== '' || it.quantidade.trim() !== '');

    if (itensValidos.length === 0) {
      alert('Por favor, adicione ao menos um item com sua quantidade.');
      return;
    }

    if (fichaEmEdicao) {
      const atualizadas = fichas.map(f => {
        if (f.id === fichaEmEdicao.id) {
          return {
            ...f,
            produto_id: formProdutoId,
            produto_nome: formProdutoNome,
            codigo: formCodigo,
            descricao_padrao: formDescricao,
            registro_sif_mapa: formRegistroMapa,
            itens_especificacao: itensValidos,
            receita_id: formReceitaId || undefined,
            receita_assinatura: formAssinatura || undefined,
            prazo_validade_meses: formValidadeMeses > 0 ? formValidadeMeses : undefined
          };
        }
        return f;
      });
      salvarFichasTecnicas(atualizadas);
      setFichas(atualizadas);
      dispararToast(`Ficha técnica de "${formProdutoNome}" atualizada com sucesso!`);
    } else {
      const nova: FichaTecnica = {
        id: `ft_${Date.now()}`,
        produto_id: formProdutoId,
        produto_nome: formProdutoNome,
        codigo: formCodigo,
        descricao_padrao: formDescricao,
        registro_sif_mapa: formRegistroMapa,
        itens_especificacao: itensValidos,
        receita_id: formReceitaId || undefined,
        receita_assinatura: formAssinatura || undefined,
        prazo_validade_meses: formValidadeMeses > 0 ? formValidadeMeses : undefined
      };
      const atualizadas = [nova, ...fichas];
      salvarFichasTecnicas(atualizadas);
      setFichas(atualizadas);
      dispararToast(`Nova ficha técnica de "${formProdutoNome}" incluída com sucesso!`);
    }

    setModalFormAberto(false);
  };

  // Excluir
  const handleExcluir = (id: string, nome: string) => {
    if (window.confirm(`Tem certeza que deseja excluir a ficha técnica "${nome}"?`)) {
      const atualizadas = fichas.filter(f => f.id !== id);
      salvarFichasTecnicas(atualizadas);
      setFichas(atualizadas);
      if (fichaVisualizar?.id === id) setFichaVisualizar(null);
      dispararToast(`Ficha técnica "${nome}" excluída.`);
    }
  };

  // Copiar resumo
  const handleCopiarTexto = (f: FichaTecnica) => {
    let texto = `*FICHA TÉCNICA - GRUPO ENO*\n`;
    texto += `*Produto:* ${f.produto_nome}\n`;
    if (f.codigo) texto += `*Código:* ${f.codigo}\n`;
    if (f.registro_sif_mapa) texto += `*Registro:* ${f.registro_sif_mapa}\n`;
    if (f.descricao_padrao) texto += `*Descrição:* ${f.descricao_padrao}\n`;
    texto += `\n*ITENS & QUANTIDADES DEFINIDAS:*\n`;

    (f.itens_especificacao || []).forEach(it => {
      texto += `• ${it.item_nome}: ${it.quantidade}\n`;
    });

    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    });
  };

  return (
    <div className="relative h-full w-full flex flex-col bg-[#f8faf8] text-slate-800 overflow-hidden">
      
      {/* 1. NAVEGAÇÃO DE PRODUTOS */}
      <ProdutosNavTabs activeTab="produtos_ficha_tecnica" onNavigate={onNavigate} />

      {/* 2. CABEÇALHO COMPACTO & MINIMALISTA */}
      <div className="bg-white border-b border-slate-200/80 px-6 py-3.5 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Fichas Técnicas & Especificações</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
                {fichas.length} cadastradas
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Você adiciona os itens e as quantidades que quiser, sem campos engessados ou obrigatórios.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAbrirNova}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-900 hover:bg-emerald-950 text-white font-bold text-xs shadow-xs transition-all cursor-pointer hover:shadow"
            >
              <Plus className="w-4 h-4" />
              <span>+ Incluir Nova Ficha Técnica</span>
            </button>
          </div>
        </div>

        {/* STAT BAR MINIMALISTA EM LINHA */}
        <div className="flex flex-wrap items-center gap-6 pt-3 mt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Formato:</span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              Itens e Quantidades Livres
            </span>
          </div>
          <div className="w-px h-4 bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Exportação:</span>
            <span className="font-mono font-bold text-emerald-700">
              Pronto para Impressão, PDF ou Foto
            </span>
          </div>
          <div className="w-px h-4 bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Flexibilidade:</span>
            <span className="font-mono font-bold text-slate-900">
              Você define o que vai na ficha
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
            placeholder="Buscar por Produto, Código ou Item..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-700 font-medium"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium hidden sm:block">
          Mostrando <span className="font-bold text-slate-800">{fichasFiltradas.length}</span> fichas
        </div>
      </div>

      {/* 4. TABELA DE FICHAS TÉCNICAS (TUDO EM LINHAS DE UMA TABELA) */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 text-slate-500 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-5">Produto / Nome da Ficha</th>
                <th className="py-3 px-3">Código</th>
                <th className="py-3 px-4">O que tem na Ficha (Itens & Quantidades)</th>
                <th className="py-3 px-3 text-center">Total de Itens</th>
                <th className="py-3 px-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {fichasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                    Nenhuma ficha técnica cadastrada. Clique em "+ Incluir Nova Ficha Técnica".
                  </td>
                </tr>
              ) : (
                fichasFiltradas.map((f) => {
                  const itens = f.itens_especificacao || [];
                  return (
                    <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                          <span>{f.produto_nome}</span>
                          {fichaDesatualizada(f) && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-50 border border-amber-300 text-amber-800 text-[10px] font-bold">
                              Receita alterada — atualizar ficha
                            </span>
                          )}
                        </div>
                        {f.descricao_padrao && (
                          <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{f.descricao_padrao}</div>
                        )}
                      </td>

                      <td className="py-3.5 px-3 font-mono font-bold text-slate-700">
                        {f.codigo || f.registro_sif_mapa || '—'}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1.5 max-w-xl">
                          {itens.slice(0, 4).map((it, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px] text-slate-800"
                            >
                              <span className="font-semibold text-slate-900">{it.item_nome}:</span>
                              <span className="font-mono font-bold text-emerald-800">{it.quantidade}</span>
                            </span>
                          ))}
                          {itens.length > 4 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-[10px] text-slate-500 font-semibold">
                              +{itens.length - 4} mais...
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-900">
                        {itens.length} {itens.length === 1 ? 'item' : 'itens'}
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setFichaVisualizar(f)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-900 hover:bg-emerald-950 text-white font-bold text-xs shadow-2xs cursor-pointer transition-colors"
                            title="Visualizar laudo completo para foto ou impressão"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver Ficha</span>
                          </button>

                          <button
                            onClick={() => handleAbrirEdicao(f)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-800 hover:bg-emerald-50 transition-colors cursor-pointer border border-transparent hover:border-emerald-200"
                            title="Editar Ficha Técnica"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleExcluir(f.id, f.produto_nome)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer border border-transparent hover:border-red-200"
                            title="Excluir Ficha Técnica"
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

      {/* 5. MODAL FORM: INCLUIR / EDITAR FICHA TÉCNICA (TOTALMENTE LIVRE, SEM ESPAÇOS FORÇADOS) */}
      {modalFormAberto && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-6 flex justify-center items-start animate-fadeIn">
          <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col my-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)]">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm sm:text-base text-white">
                  {fichaEmEdicao ? `Editar Ficha: ${fichaEmEdicao.produto_nome}` : 'Nova Ficha Técnica'}
                </h3>
              </div>
              <button
                onClick={() => setModalFormAberto(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSalvarFicha} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              
              {/* Informações Básicas da Ficha */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-8">
                  <label className="block font-bold text-slate-800 mb-1">
                    Vincular ao Produto do Estoque *
                  </label>
                  <select
                    required
                    value={formProdutoId}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const prod = produtosEstoque.find(p => p.id === selectedId);
                      setFormProdutoId(selectedId);
                      if (prod) setFormProdutoNome(prod.nome);
                      // Preenche automaticamente com as matérias-primas da receita do produto
                      aplicarItensDaReceita(selectedId, formItens);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-700"
                  >
                    <option value="">-- Selecione um Produto --</option>
                    {produtosEstoque.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nome} ({p.tipo_embalagem})
                      </option>
                    ))}
                    {/* Opção para nome livre caso não queira vincular (opcional, mas o user pediu pra puxar o produto) */}
                    {formProdutoId === '' && formProdutoNome !== '' && (
                      <option value="">{formProdutoNome} (Não vinculado)</option>
                    )}
                  </select>
                </div>

                <div className="sm:col-span-4">
                  <label className="block font-bold text-slate-800 mb-1">
                    Código / Referência (Opcional)
                  </label>
                  <input
                    type="text"
                    value={formCodigo}
                    onChange={(e) => setFormCodigo(e.target.value)}
                    placeholder="Ex: FT-001"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Descrição Geral ou Observações (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={formDescricao}
                  onChange={(e) => setFormDescricao(e.target.value)}
                  placeholder="Escreva qualquer detalhe ou observação sobre o produto..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-700 leading-relaxed"
                />
              </div>

              {/* VÍNCULO COM A RECEITA + VALIDADE */}
              {(() => {
                const rec = formProdutoId ? receitaDoProduto(formProdutoId) : undefined;
                const desatualizada = !!rec && (formReceitaId !== rec.id || formAssinatura !== assinaturaComposicaoReceita(rec));
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className={`sm:col-span-8 p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 ${desatualizada ? 'bg-amber-50 border-amber-300' : 'bg-emerald-50/60 border-emerald-200'}`}>
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-800">
                        <FlaskConical className="w-3.5 h-3.5 text-emerald-700" />
                        {formProdutoId
                          ? rec
                            ? <span>Receita: <strong>{rec.nome || rec.produto_nome}</strong>{desatualizada ? ' — a composição mudou desde a última atualização da ficha' : ' — itens da composição sincronizados'}</span>
                            : <span>Produto sem receita vinculada (cadastre a receita no produto).</span>
                          : <span>Escolha o produto para puxar as matérias-primas da receita.</span>}
                      </div>
                      {rec && (
                        <button
                          type="button"
                          onClick={() => aplicarItensDaReceita(formProdutoId, formItens)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${desatualizada ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-white border border-emerald-300 text-emerald-900 hover:bg-emerald-100'}`}
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Atualizar da receita</span>
                        </button>
                      )}
                    </div>
                    <div className="sm:col-span-4">
                      <label className="block font-bold text-slate-800 mb-1">Prazo de Validade (meses)</label>
                      <CampoNumero
                        inteiro
                        min={1}
                        value={formValidadeMeses}
                        onChange={(n) => setFormValidadeMeses(n)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-700"
                      />
                      <span className="text-[10px] text-slate-500">Usado na validade padrão das Ordens de Produção</span>
                    </div>
                  </div>
                );
              })()}

              {/* SEÇÃO DINÂMICA: A PESSOA ADICIONA AS COISAS QUE QUER E A QUANTIDADE */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/70 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                  <div>
                    <span className="font-bold text-slate-900 text-xs uppercase tracking-wider block">
                      Itens & Quantidades da Ficha Técnica
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Adicione as especificações, insumos ou propriedades que você quer e informe a quantidade/valor de cada um.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAdicionarItemLinha}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-900 hover:bg-emerald-950 text-white font-bold text-xs transition-colors cursor-pointer shadow-2xs shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Adicionar Item / Coisa</span>
                  </button>
                </div>

                {/* Tabela Dinâmica em Linhas */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 text-[10px] font-bold uppercase text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">O que você quer colocar (Item / Especificação)</th>
                        <th className="py-2.5 px-3 w-48 sm:w-64">Quantidade / Valor</th>
                        <th className="py-2.5 px-2 w-12 text-center">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {formItens.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80">
                          {/* Nome do item que a pessoa quer colocar */}
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              required
                              value={item.item_nome}
                              onChange={(e) => handleAtualizarItemLinha(idx, 'item_nome', e.target.value)}
                              placeholder={`Ex: ${idx === 0 ? 'Mandioca Selecionada' : idx === 1 ? 'Umidade' : 'Embalagem'}`}
                              className="w-full bg-slate-50 hover:bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-700"
                            />
                            {item.origem === 'RECEITA' && (
                              <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700">da receita</span>
                            )}
                          </td>

                          {/* Quantidade ou valor que a pessoa quer colocar */}
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              required
                              value={item.quantidade}
                              onChange={(e) => handleAtualizarItemLinha(idx, 'quantidade', e.target.value)}
                              placeholder={`Ex: ${idx === 0 ? '1 kg' : idx === 1 ? '12%' : '1 unidade'}`}
                              className="w-full bg-slate-50 hover:bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-emerald-950 focus:outline-none focus:border-emerald-700"
                            />
                          </td>

                          {/* Remover Linha */}
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoverItemLinha(idx)}
                              className="p-1 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Remover este item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-500 font-medium">
                    Total de itens nesta ficha: <strong className="text-slate-800">{formItens.filter(it => it.item_nome.trim() !== '').length}</strong>
                  </span>

                  <button
                    type="button"
                    onClick={handleAdicionarItemLinha}
                    className="text-xs text-emerald-800 hover:text-emerald-950 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Adicionar mais uma linha</span>
                  </button>
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
                  <span>{fichaEmEdicao ? 'Salvar Alterações' : 'Salvar Ficha'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL VISUALIZAR ESPELHO DA FICHA TÉCNICA (PRONTO PARA PDF / IMPRESSÃO / FOTO) */}
      {fichaVisualizar && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-6 flex justify-center items-start animate-fadeIn">
          <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col my-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)]">
            
            {/* Barra Superior de Ações */}
            <div className="bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm sm:text-base text-white">
                  Ficha Técnica: {fichaVisualizar.produto_nome}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAbrirEdicao(fichaVisualizar)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-white font-bold transition-colors cursor-pointer border border-slate-700"
                  title="Editar dados da ficha"
                >
                  <Edit2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Editar</span>
                </button>
                <button
                  onClick={() => setFichaVisualizar(null)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Conteúdo Imprimível / Laudo Timbrado */}
            <div id="laudo-imprimivel" className="p-6 sm:p-8 space-y-5 text-xs overflow-y-auto flex-1 bg-white">
              
              {/* Cabeçalho Corporativo Oficial */}
              <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-6 h-6 text-emerald-900" />
                    <span className="text-xl font-black text-slate-900 tracking-tight">GRUPO ENO AGROINDUSTRIAL</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Fecularia & Mandioca Gourmet • Rodovia PR-482, km 14 • CNPJ: 14.882.910/0001-44
                  </p>
                </div>

                <div className="text-right">
                  <div className="inline-block px-3 py-1 bg-emerald-900 text-white font-black rounded-lg text-xs uppercase font-mono tracking-wider">
                    FICHA TÉCNICA OFICIAL
                  </div>
                  {fichaVisualizar.codigo && (
                    <div className="text-[11px] text-slate-500 mt-1 font-mono">
                      Código: <span className="font-bold text-slate-900">{fichaVisualizar.codigo}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Título do Produto */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Produto</span>
                  <h2 className="text-lg font-black text-slate-900">{fichaVisualizar.produto_nome}</h2>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Emissão</span>
                  <span className="font-mono font-bold text-slate-800 text-xs">{new Date().toLocaleDateString('pt-BR')}</span>
                </div>
              </div>

              {/* Descrição se houver */}
              {fichaVisualizar.descricao_padrao && (
                <div className="p-4 rounded-xl border border-slate-200 bg-white">
                  <span className="font-bold text-slate-900 block text-xs uppercase tracking-wider mb-1">
                    Descrição do Produto / Processo:
                  </span>
                  <p className="text-slate-700 leading-relaxed text-[11px]">{fichaVisualizar.descricao_padrao}</p>
                </div>
              )}

              {/* Tabela de Itens e Quantidades Cadastradas em Linhas */}
              <div>
                <span className="font-bold text-slate-900 uppercase tracking-wider text-xs block mb-2">
                  Especificações, Insumos e Parâmetros da Ficha
                </span>
                <table className="w-full text-left border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <thead className="bg-slate-100/90 text-[10px] font-bold uppercase text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4">Item / Especificação</th>
                      <th className="py-2.5 px-4 text-right">Quantidade / Valor Definido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-mono">
                    {(fichaVisualizar.itens_especificacao || []).map((it, idx) => (
                      <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                        <td className="py-2.5 px-4 font-sans font-medium text-slate-800">
                          {it.item_nome}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                          {it.quantidade}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Rodapé do Laudo */}
              <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between text-[11px] text-slate-500">
                <div>
                  Controle de Qualidade • <span className="font-bold text-slate-700">Grupo ENO</span>
                </div>
                <div className="font-mono text-[10px]">
                  Documento emitido eletronicamente pelo Sistema de Gestão Industrial
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
                  onClick={() => handleCopiarTexto(fichaVisualizar)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 cursor-pointer text-xs shadow-2xs transition-colors"
                >
                  {copiado ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
                  <span>{copiado ? 'Copiado!' : 'Copiar Texto Resumo'}</span>
                </button>
              </div>

              <button
                onClick={() => setFichaVisualizar(null)}
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
