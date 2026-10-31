import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Users, 
  Phone, 
  Calendar, 
  Clock, 
  Briefcase, 
  Building2, 
  Save, 
  X, 
  Filter, 
  Sparkles,
  HardHat,
  Factory,
  ShieldCheck,
  Check,
  AlertCircle
} from 'lucide-react';
import {
  carregarColaboradoresProducao,
  salvarColaboradoresProducao,
  EVENTO_CADASTROS_ATUALIZADOS,
  ColaboradorProducao,
} from '../../data/cadastrosData';
import { useListaPersistida } from '../../lib/useListaPersistida';

// Tipo e persistência centralizados em cadastrosData
export type { ColaboradorProducao } from '../../data/cadastrosData';

/** @deprecated dados de exemplo removidos; os colaboradores ficam no armazenamento local */
export const COLABORADORES_PRODUCAO_INICIAIS: ColaboradorProducao[] = [];

export const SETORES_PRODUCAO = [
  'Lavagem e Recepção',
  'Ralação e Moagem',
  'Secagem e Amido',
  'Ensaque e Expedição',
  'Caldeira e Utilidades',
  'Laboratório e Qualidade',
  'Manutenção Mecânica'
];

export function CadastroProducao() {
  const [colaboradores, setColaboradores] = useListaPersistida<ColaboradorProducao>(carregarColaboradoresProducao, salvarColaboradoresProducao, EVENTO_CADASTROS_ATUALIZADOS);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'ATIVO' | 'INATIVO' | 'FERIAS'>('TODOS');
  const [setorFilter, setSetorFilter] = useState<string>('TODOS');

  // Modal
  const [modalAberto, setModalAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState<ColaboradorProducao | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    matricula: string;
    nome_completo: string;
    cargo: string;
    setor: string;
    cpf: string;
    telefone: string;
    status: 'ATIVO' | 'INATIVO' | 'FERIAS';
    observacoes: string;
  }>({
    matricula: '',
    nome_completo: '',
    cargo: '',
    setor: 'Ralação e Moagem',
    cpf: '',
    telefone: '',
    status: 'ATIVO',
    observacoes: ''
  });

  // Métricas
  const metricas = useMemo(() => {
    const total = colaboradores.length;
    const ativos = colaboradores.filter(c => c.status === 'ATIVO').length;
    const ferias = colaboradores.filter(c => c.status === 'FERIAS').length;
    const inativos = colaboradores.filter(c => c.status === 'INATIVO').length;
    return { total, ativos, ferias, inativos };
  }, [colaboradores]);

  // Lista Filtrada
  const colaboradoresFiltrados = useMemo(() => {
    return colaboradores.filter(c => {
      const matchText = 
        c.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.matricula.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.cargo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.setor.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchText) return false;
      if (statusFilter !== 'TODOS' && c.status !== statusFilter) return false;
      if (setorFilter !== 'TODOS' && c.setor !== setorFilter) return false;

      return true;
    });
  }, [colaboradores, searchTerm, statusFilter, setorFilter]);

  // Abrir modal novo
  const handleAbrirNovo = () => {
    const proximaMatriculaNum = 100 + colaboradores.length + 1;
    setFormData({
      matricula: `PRD-${proximaMatriculaNum}`,
      nome_completo: '',
      cargo: '',
      setor: 'Ralação e Moagem',
      cpf: '',
      telefone: '',
      status: 'ATIVO',
      observacoes: ''
    });
    setModoEdicao(null);
    setModalAberto(true);
  };

  // Abrir modal edição
  const handleAbrirEdicao = (colab: ColaboradorProducao) => {
    setModoEdicao(colab);
    setFormData({
      matricula: colab.matricula,
      nome_completo: colab.nome_completo,
      cargo: colab.cargo,
      setor: colab.setor,
      cpf: colab.cpf,
      telefone: colab.telefone,
      status: colab.status,
      observacoes: colab.observacoes || ''
    });
    setModalAberto(true);
  };

  // Salvar
  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome_completo.trim() || !formData.cargo.trim()) {
      alert('Por favor, preencha o Nome Completo e o Cargo do colaborador.');
      return;
    }

    if (modoEdicao) {
      setColaboradores(prev => prev.map(c => {
        if (c.id === modoEdicao.id) {
          return {
            ...c,
            ...formData
          };
        }
        return c;
      }));
    } else {
      const novoColab: ColaboradorProducao = {
        id: `prd_${Date.now()}`,
        ...formData
      };
      setColaboradores(prev => [novoColab, ...prev]);
    }

    setModalAberto(false);
  };

  // Alternar Status rápido
  const handleToggleStatus = (id: string) => {
    setColaboradores(prev => prev.map(c => {
      if (c.id === id) {
        const proximoStatus = c.status === 'ATIVO' ? 'INATIVO' : 'ATIVO';
        return { ...c, status: proximoStatus };
      }
      return c;
    }));
  };

  // Excluir
  const handleExcluir = (id: string) => {
    if (confirm('Deseja realmente remover este colaborador do cadastro de produção?')) {
      setColaboradores(prev => prev.filter(c => c.id !== id));
    }
  };

  return (
    <div className="relative h-full w-full flex flex-col bg-[#f4f8f5] text-slate-800 overflow-hidden">
      
      {/* ========================================================= */}
      {/* 1. CABEÇALHO & CARDS DE INDICADORES (MÉTRICAS)            */}
      {/* ========================================================= */}
      <div className="bg-white border-b border-emerald-900/10 px-6 py-4 shadow-xs shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-800 text-white shadow-sm">
                <HardHat className="w-5 h-5 text-emerald-200" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Cadastro Produção
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                  Registro simplificado dos colaboradores e operadores da linha de produção do Grupo ENO.
                </p>
              </div>
            </div>
          </div>

          {/* Botão Novo Colaborador */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleAbrirNovo}
              className="
                flex items-center gap-2 px-5 py-2.5 rounded-xl
                bg-gradient-to-r from-emerald-700 to-lime-600 hover:from-emerald-800 hover:to-lime-700
                text-white font-extrabold text-xs sm:text-sm shadow-md transition-all cursor-pointer
              "
            >
              <Plus className="w-4.5 h-4.5 stroke-[3]" />
              <span>Novo Colaborador</span>
            </button>
          </div>

        </div>

        {/* CARDS DE INDICADORES SIMPLES (TOTAL, ATIVOS, INATIVOS) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-4">
          <div className="bg-[#f8fbf9] rounded-xl p-3.5 border border-emerald-900/10 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Total Equipe</span>
              <span className="text-2xl font-black text-slate-900 font-mono">{metricas.total}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-100/60 text-emerald-700">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-[#f8fbf9] rounded-xl p-3.5 border border-emerald-900/10 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">Ativos em Operação</span>
              <span className="text-2xl font-black text-emerald-700 font-mono">{metricas.ativos}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-[#f8fbf9] rounded-xl p-3.5 border border-emerald-900/10 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-600 block">Inativos</span>
              <span className="text-2xl font-black text-red-600 font-mono">{metricas.inativos}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-red-100 text-red-700">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. BARRA DE BUSCA E FILTROS                               */}
      {/* ========================================================= */}
      <div className="bg-[#eef4f0] px-6 py-3 border-b border-emerald-900/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
        
        {/* Campo de Busca */}
        <div className="flex-1 min-w-[280px] max-w-md relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por Nome, Matrícula, Cargo ou Setor..."
            className="
              w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-emerald-900/15 text-xs sm:text-sm
              text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-600 shadow-2xs font-medium
            "
          />
        </div>

        {/* Filtros de Status e Setor */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white rounded-xl border border-emerald-900/15 p-1 shadow-2xs">
            <button
              onClick={() => setStatusFilter('TODOS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === 'TODOS' ? 'bg-emerald-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos ({colaboradores.length})
            </button>
            <button
              onClick={() => setStatusFilter('ATIVO')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === 'ATIVO' ? 'bg-emerald-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ativos
            </button>
            <button
              onClick={() => setStatusFilter('FERIAS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === 'FERIAS' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Férias
            </button>
            <button
              onClick={() => setStatusFilter('INATIVO')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === 'INATIVO' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Inativos
            </button>
          </div>

          {/* Filtro por Setor */}
          <select
            value={setorFilter}
            onChange={(e) => setSetorFilter(e.target.value)}
            className="
              bg-white border border-emerald-900/15 rounded-xl px-3 py-2 text-xs font-bold
              text-slate-700 focus:outline-none focus:border-emerald-600 shadow-2xs cursor-pointer
            "
          >
            <option value="TODOS">Todos os Setores</option>
            {SETORES_PRODUCAO.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

      </div>

      {/* ========================================================= */}
      {/* 3. TABELA DE COLABORADORES DA PRODUÇÃO                    */}
      {/* ========================================================= */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="bg-white rounded-2xl border border-emerald-900/10 shadow-xs overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#022013] text-emerald-200 border-b border-emerald-900/40 text-[11px] font-extrabold uppercase tracking-wider">
                <th className="py-3.5 px-6">Matrícula / Colaborador</th>
                <th className="py-3.5 px-4">Função / Cargo</th>
                <th className="py-3.5 px-4">Setor da Produção</th>
                <th className="py-3.5 px-4">Contato</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-900/5 text-xs sm:text-sm">
              {colaboradoresFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-semibold">
                    Nenhum colaborador de produção encontrado.
                  </td>
                </tr>
              ) : (
                colaboradoresFiltrados.map((item) => {
                  return (
                    <tr key={item.id} className="hover:bg-emerald-50/40 transition-colors">
                      
                      {/* Matrícula & Nome */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono font-bold text-xs shadow-inner">
                            {item.matricula}
                          </span>
                          <span className="font-extrabold text-slate-900 text-sm">{item.nome_completo}</span>
                        </div>
                        {item.cpf && (
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            CPF: {item.cpf}
                          </div>
                        )}
                      </td>

                      {/* Cargo / Função */}
                      <td className="py-4 px-4 font-bold text-slate-800">
                        {item.cargo}
                      </td>

                      {/* Setor */}
                      <td className="py-4 px-4">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {item.setor}
                        </span>
                      </td>

                      {/* Telefone */}
                      <td className="py-4 px-4 text-xs font-mono text-slate-600">
                        {item.telefone || '-'}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => handleToggleStatus(item.id)}
                          className="cursor-pointer"
                          title="Clique para alternar status"
                        >
                          {item.status === 'ATIVO' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Ativo</span>
                            </span>
                          ) : item.status === 'FERIAS' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              <span>Férias</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-red-100 text-red-800 border border-red-300 hover:bg-red-200">
                              <XCircle className="w-3.5 h-3.5 text-red-600" />
                              <span>Inativo</span>
                            </span>
                          )}
                        </button>
                      </td>

                      {/* Ações */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleAbrirEdicao(item)}
                            className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer"
                            title="Editar Colaborador"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleExcluir(item.id)}
                            className="p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                            title="Excluir Colaborador"
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

      {/* ========================================================= */}
      {/* 4. MODAL NOVO / EDITAR COLABORADOR (AMPLO E HORIZONTAL)   */}
      {/* ========================================================= */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-6 flex justify-center items-start animate-fadeIn">
          <div className="relative w-full max-w-5xl lg:max-w-6xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-emerald-900/20 flex flex-col my-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)]">
            
            {/* Topo do Modal */}
            <div className="bg-[#022013] text-white px-7 py-4 flex items-center justify-between border-b border-emerald-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <HardHat className="w-5 h-5 text-lime-400" />
                <h3 className="font-black text-lg text-white">
                  {modoEdicao ? 'Editar Colaborador da Produção' : 'Novo Colaborador da Produção'}
                </h3>
              </div>
              <button
                onClick={() => setModalAberto(false)}
                className="p-1.5 rounded-xl hover:bg-emerald-900 text-emerald-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulário Simples em Grade Equilibrada e Larga */}
            <form onSubmit={handleSalvar} className="p-6 sm:p-8 overflow-y-auto space-y-4 flex-1">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Matrícula / Registro *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.matricula}
                    onChange={(e) => setFormData({ ...formData, matricula: e.target.value })}
                    placeholder="Ex: PRD-109"
                    className="w-full bg-[#f8fbf9] border border-emerald-900/20 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nome Completo do Colaborador *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nome_completo}
                    onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
                    placeholder="Ex: João Ferreira da Silva"
                    className="w-full bg-[#f8fbf9] border border-emerald-900/20 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cargo / Função na Produção *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.cargo}
                    onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                    placeholder="Ex: Operador de Máquinas, Ensacador, etc."
                    className="w-full bg-[#f8fbf9] border border-emerald-900/20 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Setor de Atuação
                  </label>
                  <select
                    value={formData.setor}
                    onChange={(e) => setFormData({ ...formData, setor: e.target.value })}
                    className="w-full bg-[#f8fbf9] border border-emerald-900/20 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-600 font-medium cursor-pointer"
                  >
                    {SETORES_PRODUCAO.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    CPF
                  </label>
                  <input
                    type="text"
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                    placeholder="000.000.000-00"
                    className="w-full bg-[#f8fbf9] border border-emerald-900/20 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    placeholder="(00) 00000-0000"
                    className="w-full bg-[#f8fbf9] border border-emerald-900/20 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Status do Colaborador
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full bg-[#f8fbf9] border border-emerald-900/20 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-emerald-600 cursor-pointer"
                  >
                    <option value="ATIVO">Ativo</option>
                    <option value="FERIAS">Em Férias</option>
                    <option value="INATIVO">Inativo</option>
                  </select>
                </div>

                <div className="sm:col-span-2 lg:col-span-4">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Observações / Anotações
                  </label>
                  <textarea
                    rows={2}
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    placeholder="Ex: Treinamentos, certificados de segurança NR ou observações..."
                    className="w-full bg-[#f8fbf9] border border-emerald-900/20 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-600 font-medium"
                  />
                </div>

              </div>

              {/* Botões do Rodapé */}
              <div className="pt-4 border-t border-emerald-900/10 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="
                    px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs
                    shadow-md transition-all flex items-center gap-2 cursor-pointer
                  "
                >
                  <Save className="w-4 h-4" />
                  <span>{modoEdicao ? 'Salvar Alterações' : 'Cadastrar Colaborador'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
