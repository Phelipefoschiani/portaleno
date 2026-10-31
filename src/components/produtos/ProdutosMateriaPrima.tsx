import React, { useState, useEffect, useMemo } from 'react';
import {
  Boxes,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Scale,
  Edit2,
  Trash2,
  X,
  Save,
  Check,
  TrendingDown,
  Layers
} from 'lucide-react';
import {
  MateriaPrimaEstoque,
  carregarMateriaPrima,
  salvarMateriaPrima
} from '../../data/produtosData';
import { ProdutosNavTabs } from './ProdutosNavTabs';

interface Props {
  onNavigate?: (tabId: string) => void;
}

export function ProdutosMateriaPrima({ onNavigate }: Props) {
  const [materias, setMaterias] = useState<MateriaPrimaEstoque[]>([]);
  const [busca, setBusca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('TODAS');

  // Modal
  const [modalAberto, setModalAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState<MateriaPrimaEstoque | null>(null);

  const [formData, setFormData] = useState({
    codigo: '',
    nome: '',
    categoria: 'Raiz In Natura' as MateriaPrimaEstoque['categoria'],
    unidade_medida: 'TON' as MateriaPrimaEstoque['unidade_medida'],
    estoque_atual: 100,
    estoque_minimo: 50,
    custo_medio_unitario: 600,
    fornecedor_principal: '',
    localizacao_patio: 'Pátio de Descarga'
  });

  const recarregar = () => {
    setMaterias(carregarMateriaPrima());
  };

  useEffect(() => {
    recarregar();
    const handleUpdate = () => recarregar();
    window.addEventListener('produtos_updated', handleUpdate);
    return () => window.removeEventListener('produtos_updated', handleUpdate);
  }, []);

  // Métricas
  const metricas = useMemo(() => {
    const raizTon = materias.find(m => m.categoria === 'Raiz In Natura')?.estoque_atual || 0;
    const lenhaM3 = materias.find(m => m.categoria === 'Biomassa / Lenha')?.estoque_atual || 0;
    const sacariaUn = materias.find(m => m.codigo === 'MAT-SAC-RAF25')?.estoque_atual || 0;
    const alertas = materias.filter(m => m.status !== 'NORMAL').length;

    return { raizTon, lenhaM3, sacariaUn, alertas };
  }, [materias]);

  const materiasFiltradas = useMemo(() => {
    return materias.filter(m => {
      const match =
        m.nome.toLowerCase().includes(busca.toLowerCase()) ||
        m.codigo.toLowerCase().includes(busca.toLowerCase()) ||
        m.fornecedor_principal.toLowerCase().includes(busca.toLowerCase());

      if (!match) return false;
      if (filtroCategoria !== 'TODAS' && m.categoria !== filtroCategoria) return false;
      return true;
    });
  }, [materias, busca, filtroCategoria]);

  const handleAbrirNovo = () => {
    setModoEdicao(null);
    setFormData({
      codigo: `MAT-${Date.now().toString().slice(-4)}`,
      nome: '',
      categoria: 'Raiz In Natura',
      unidade_medida: 'TON',
      estoque_atual: 50,
      estoque_minimo: 20,
      custo_medio_unitario: 600,
      fornecedor_principal: '',
      localizacao_patio: 'Pátio Central'
    });
    setModalAberto(true);
  };

  const handleAbrirEdicao = (item: MateriaPrimaEstoque) => {
    setModoEdicao(item);
    setFormData({
      codigo: item.codigo,
      nome: item.nome,
      categoria: item.categoria,
      unidade_medida: item.unidade_medida,
      estoque_atual: item.estoque_atual,
      estoque_minimo: item.estoque_minimo,
      custo_medio_unitario: item.custo_medio_unitario,
      fornecedor_principal: item.fornecedor_principal,
      localizacao_patio: item.localizacao_patio
    });
    setModalAberto(true);
  };

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    const status: MateriaPrimaEstoque['status'] = 
      formData.estoque_atual <= formData.estoque_minimo * 0.5 ? 'CRITICO' :
      formData.estoque_atual <= formData.estoque_minimo ? 'REPOSICAO_NECESSARIA' : 'NORMAL';

    if (modoEdicao) {
      const atualizados = materias.map(m => {
        if (m.id === modoEdicao.id) {
          return {
            ...m,
            ...formData,
            status
          };
        }
        return m;
      });
      salvarMateriaPrima(atualizados);
    } else {
      const novo: MateriaPrimaEstoque = {
        id: `mat_${Date.now()}`,
        ...formData,
        status
      };
      salvarMateriaPrima([novo, ...materias]);
    }
    setModalAberto(false);
  };

  const handleExcluir = (id: string) => {
    if (confirm('Deseja excluir esta matéria-prima do estoque?')) {
      salvarMateriaPrima(materias.filter(m => m.id !== id));
    }
  };

  return (
    <div className="relative h-full w-full flex flex-col bg-[#f8faf8] text-slate-800 overflow-hidden">
      
      {/* 1. NAVEGAÇÃO DE PRODUTOS */}
      <ProdutosNavTabs activeTab="produtos_materia_prima" onNavigate={onNavigate} />

      {/* 2. CABEÇALHO COMPACTO & MINIMALISTA */}
      <div className="bg-white border-b border-slate-200/80 px-6 py-3.5 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Matéria-Prima & Insumos Industriais</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                {materias.length} insumos
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
            <span>Novo Insumo / Matéria-Prima</span>
          </button>
        </div>

        {/* STAT BAR MINIMALISTA EM LINHA */}
        <div className="flex flex-wrap items-center gap-6 pt-3 mt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Raiz no Pátio / Silos:</span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              {metricas.raizTon.toLocaleString('pt-BR')} Toneladas
            </span>
          </div>
          <div className="w-px h-4 bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Lenha Caldeira:</span>
            <span className="font-mono font-bold text-slate-900">
              {metricas.lenhaM3} m³ (estéreos)
            </span>
          </div>
          <div className="w-px h-4 bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Sacos Ráfia 25kg:</span>
            <span className="font-mono font-bold text-slate-900">
              {metricas.sacariaUn.toLocaleString('pt-BR')} un
            </span>
          </div>
          <div className="w-px h-4 bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Status Insumos:</span>
            <span className={`font-mono font-bold ${metricas.alertas > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
              {metricas.alertas > 0 ? `${metricas.alertas} precisando reposição` : 'Estoque abastecido'}
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
            placeholder="Buscar por Insumo, Código ou Fornecedor..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-700 font-medium"
          />
        </div>

        <select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
          className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 cursor-pointer focus:outline-none"
        >
          <option value="TODAS">Todas as Categorias</option>
          <option value="Raiz In Natura">Raiz In Natura</option>
          <option value="Biomassa / Lenha">Biomassa / Lenha</option>
          <option value="Embalagens">Embalagens</option>
          <option value="Insumos Industriais">Insumos Industriais</option>
        </select>
      </div>

      {/* 4. TABELA LIMPA */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 text-slate-500 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-5">Insumo & Código</th>
                <th className="py-3 px-4">Categoria</th>
                <th className="py-3 px-4">Localização</th>
                <th className="py-3 px-4">Estoque Atual</th>
                <th className="py-3 px-4">Custo Médio</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {materiasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                    Nenhum insumo encontrado.
                  </td>
                </tr>
              ) : (
                materiasFiltradas.map((item) => {
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-slate-900">{item.nome}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {item.codigo} • Fornec: {item.fornecedor_principal || 'Produtores Regionais'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        {item.categoria}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">
                        {item.localizacao_patio}
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        <div className="font-bold text-slate-900">
                          {item.estoque_atual.toLocaleString('pt-BR')} {item.unidade_medida}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Mínimo: {item.estoque_minimo} {item.unidade_medida}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {item.custo_medio_unitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        <span className="text-[10px] text-slate-400 font-normal font-sans ml-1">/{item.unidade_medida}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        {item.status === 'NORMAL' ? (
                          <div className="flex items-center gap-1.5 text-emerald-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            <span className="font-medium">Normal</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-amber-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            <span className="font-medium">Reposição Necessária</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleAbrirEdicao(item)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                            title="Editar Insumo"
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

      {/* 5. MODAL NOVO / EDITAR INSUMO (AMPLO E HORIZONTAL) */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-6 flex justify-center items-start animate-fadeIn">
          <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col my-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)]">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <Layers className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm sm:text-base text-white">
                  {modoEdicao ? 'Editar Matéria-Prima / Insumo' : 'Cadastrar Matéria-Prima / Insumo'}
                </h3>
              </div>
              <button onClick={() => setModalAberto(false)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSalvar} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Código *</label>
                  <input
                    type="text"
                    required
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-700"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Categoria *</label>
                  <select
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-emerald-700 cursor-pointer"
                  >
                    <option value="Raiz In Natura">Raiz In Natura</option>
                    <option value="Biomassa / Lenha">Biomassa / Lenha</option>
                    <option value="Embalagens">Embalagens</option>
                    <option value="Insumos Industriais">Insumos Industriais</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unidade de Medida</label>
                  <select
                    value={formData.unidade_medida}
                    onChange={(e) => setFormData({ ...formData, unidade_medida: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-slate-800 font-medium focus:outline-none focus:border-emerald-700 cursor-pointer"
                  >
                    <option value="TON">TON (Tonelada)</option>
                    <option value="KG">KG (Quilo)</option>
                    <option value="ESTÉREO (m³)">ESTÉREO (m³)</option>
                    <option value="UN">UN (Unidade)</option>
                    <option value="LITRO">LITRO</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Saldo Atual</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.estoque_atual}
                    onChange={(e) => setFormData({ ...formData, estoque_atual: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold font-mono text-center text-slate-800 focus:outline-none focus:border-emerald-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Descrição do Insumo *</label>
                  <input
                    type="text"
                    required
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: Raiz de Mandioca In Natura Lavada"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold text-slate-800 focus:outline-none focus:border-emerald-700"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Custo Médio (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.custo_medio_unitario}
                    onChange={(e) => setFormData({ ...formData, custo_medio_unitario: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold font-mono text-center text-slate-800 focus:outline-none focus:border-emerald-700"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fornecedor Principal</label>
                  <input
                    type="text"
                    value={formData.fornecedor_principal}
                    onChange={(e) => setFormData({ ...formData, fornecedor_principal: e.target.value })}
                    placeholder="Ex: Cooperativa ou Empresa"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-emerald-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Localização no Pátio / Silos</label>
                <input
                  type="text"
                  value={formData.localizacao_patio}
                  onChange={(e) => setFormData({ ...formData, localizacao_patio: e.target.value })}
                  placeholder="Ex: Pátio de Descarga & Silos"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-emerald-700"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-900 hover:bg-emerald-950 text-white font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm hover:shadow"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Insumo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
