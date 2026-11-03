import React, { useState, useMemo } from 'react';
import { CampoNumero } from '../ui/CampoNumero';
import {
  Search,
  Plus,
  Edit2,
  CheckCircle2,
  XCircle,
  Building2,
  User,
  Phone,
  Mail,
  Save,
  Clock,
  Trash2,
  Users,
  Lock,
  Unlock,
  AlertCircle,
  RefreshCw,
  X,
  Calendar,
  Sparkles
} from 'lucide-react';
import {
  CadastroProvisorio,
  isCadastroExpirado,
  getDiasRestantes,
  PermissoesPortifolio,
  PedidoPortifolio
} from '../../data/portfolioData';
import {
  carregarCadastrosProvisorios,
  salvarCadastrosProvisorios,
  carregarPedidosPortfolio,
  salvarPedidosPortfolio,
  carregarRcas,
  EVENTO_CADASTROS_ATUALIZADOS,
} from '../../data/cadastrosData';
import { useListaPersistida } from '../../lib/useListaPersistida';
import { hojeISO, somarDias, formatarDataBR } from '../../lib/datas';

interface CadastroProvisorioPortifolioProps {
  onNavigateToCliente?: (clienteId: string) => void;
}

export function CadastroProvisorioPortifolio({
  onNavigateToCliente
}: CadastroProvisorioPortifolioProps) {
  // Lista de Cadastros Provisórios de Portfólio
  // Persistidos no armazenamento local (cadastrosData)
  const [cadastros, setCadastros] = useListaPersistida<CadastroProvisorio>(carregarCadastrosProvisorios, salvarCadastrosProvisorios, EVENTO_CADASTROS_ATUALIZADOS);
  // Pedidos transmitidos pelos convidados no Portal VIP
  const [pedidosPortfolio, setPedidosPortfolio] = useListaPersistida<PedidoPortifolio>(carregarPedidosPortfolio, salvarPedidosPortfolio, EVENTO_CADASTROS_ATUALIZADOS);
  // RCAs cadastrados para o responsável pelo convidado
  const [rcasCadastrados] = useListaPersistida(carregarRcas, () => {}, EVENTO_CADASTROS_ATUALIZADOS);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'ATIVOS' | 'EXPIRADOS'>('TODOS');

  // Modais de Criação / Edição
  const [modalAberto, setModalAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState<CadastroProvisorio | null>(null);

  // Estado do Formulário
  const [formData, setFormData] = useState<{
    nome_convidado: string;
    empresa_solicitante: string;
    cargo: string;
    cpf_cnpj: string;
    email: string;
    telefone_whatsapp: string;
    cidade: string;
    uf: string;
    rca_responsavel_id: string;
    data_vencimento: string;
    permissoes: PermissoesPortifolio;
    observacoes: string;
  }>({
    nome_convidado: '',
    empresa_solicitante: '',
    cargo: '',
    cpf_cnpj: '',
    email: '',
    telefone_whatsapp: '',
    cidade: '',
    uf: 'PR',
    rca_responsavel_id: '',
    data_vencimento: '',
    permissoes: {
      ver_fotos: true,
      ver_precos: true,
      tabela_preco_nome: 'Tabela Padrão (Distribuição)',
      ver_eventos: true,
      ver_parceiros: true,
      liberar_pedidos: false,
      limite_valor_pedido: 50000,
      forma_pagamento_autorizada: 'Boleto Bancário 28 Dias'
    },
    observacoes: ''
  });

  // Contadores para métricas no topo (Apenas Total, Ativos e Expirados)
  const metricas = useMemo(() => {
    const total = cadastros.length;
    const ativos = cadastros.filter(c => !isCadastroExpirado(c.data_vencimento)).length;
    const expirados = cadastros.filter(c => isCadastroExpirado(c.data_vencimento)).length;

    return {
      total,
      ativos,
      expirados
    };
  }, [cadastros]);

  // Lista filtrada
  const cadastrosFiltrados = useMemo(() => {
    return cadastros.filter(c => {
      const matchText =
        c.nome_convidado.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.empresa_solicitante.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.cidade.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchText) return false;

      const isExp = isCadastroExpirado(c.data_vencimento);

      if (statusFilter === 'ATIVOS' && isExp) return false;
      if (statusFilter === 'EXPIRADOS' && !isExp) return false;

      return true;
    });
  }, [cadastros, searchTerm, statusFilter]);

  // Abrir modal para novo cadastro
  const handleAbrirNovo = () => {
    const dataVencDefault = somarDias(hojeISO(), 30);

    setFormData({
      nome_convidado: '',
      empresa_solicitante: '',
      cargo: '',
      cpf_cnpj: '',
      email: '',
      telefone_whatsapp: '',
      cidade: '',
      uf: 'PR',
      rca_responsavel_id: '',
      data_vencimento: dataVencDefault,
      permissoes: {
        ver_fotos: true,
        ver_precos: true,
        tabela_preco_nome: 'Tabela Padrão (Distribuição)',
        ver_eventos: true,
        ver_parceiros: true,
        liberar_pedidos: false,
        limite_valor_pedido: 50000,
        forma_pagamento_autorizada: 'Boleto Bancário 28 Dias'
      },
      observacoes: ''
    });
    setModoEdicao(null);
    setModalAberto(true);
  };

  // Abrir modal para edição
  const handleAbrirEdicao = (c: CadastroProvisorio) => {
    setModoEdicao(c);
    setFormData({
      nome_convidado: c.nome_convidado,
      empresa_solicitante: c.empresa_solicitante,
      cargo: c.cargo || '',
      cpf_cnpj: c.cpf_cnpj,
      email: c.email,
      telefone_whatsapp: c.telefone_whatsapp,
      cidade: c.cidade,
      uf: c.uf,
      rca_responsavel_id: c.rca_responsavel_id || '',
      data_vencimento: c.data_vencimento,
      permissoes: { ...c.permissoes },
      observacoes: c.observacoes || ''
    });
    setModalAberto(true);
  };

  // Atalhos rápidos de prorrogação no formulário
  const handleSetDiasVencimento = (dias: number) => {
    setFormData(prev => ({
      ...prev,
      data_vencimento: somarDias(hojeISO(), dias)
    }));
  };

  // Salvar formulário
  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome_convidado.trim() || !formData.empresa_solicitante.trim() || !formData.data_vencimento) {
      alert('Por favor, preencha o Nome, Empresa e Data de Vencimento.');
      return;
    }

    const rcaSel = rcasCadastrados.find(r => r.id === formData.rca_responsavel_id);
    const rcaCampos = {
      rca_responsavel_id: rcaSel?.id,
      rca_responsavel_nome: rcaSel ? (rcaSel.nome_fantasia || rcaSel.nome_completo) : undefined,
    };

    if (modoEdicao) {
      setCadastros(prev => prev.map(c => {
        if (c.id === modoEdicao.id) {
          const exp = isCadastroExpirado(formData.data_vencimento);
          return {
            ...c,
            ...formData,
            ...rcaCampos,
            status: c.status === 'BLOQUEADO' ? 'BLOQUEADO' : (exp ? 'EXPIRADO' : 'ATIVO')
          };
        }
        return c;
      }));
    } else {
      const randomCode = Math.floor(1000 + Math.random() * 9000);
      const novoId = `port_${Date.now()}`;
      const exp = isCadastroExpirado(formData.data_vencimento);

      const novoCadastro: CadastroProvisorio = {
        id: novoId,
        codigo_acesso: `ENO-VIP-${randomCode}`,
        nome_convidado: formData.nome_convidado,
        empresa_solicitante: formData.empresa_solicitante,
        cargo: formData.cargo,
        cpf_cnpj: formData.cpf_cnpj,
        email: formData.email,
        telefone_whatsapp: formData.telefone_whatsapp,
        cidade: formData.cidade,
        uf: formData.uf,
        ...rcaCampos,
        data_criacao: hojeISO(),
        data_vencimento: formData.data_vencimento,
        status: exp ? 'EXPIRADO' : 'ATIVO',
        permissoes: formData.permissoes,
        observacoes: formData.observacoes,
        visualizacoes_count: 0,
        pedidos_realizados: []
      };

      setCadastros(prev => [novoCadastro, ...prev]);
    }

    setModalAberto(false);
  };

  // Alternar rapidamente a liberação de pedidos na tabela
  const handleToggleLiberarPedidos = (id: string) => {
    setCadastros(prev => prev.map(c => {
      if (c.id === id) {
        return {
          ...c,
          permissoes: {
            ...c.permissoes,
            liberar_pedidos: !c.permissoes.liberar_pedidos
          }
        };
      }
      return c;
    }));
  };

  // Prorrogação rápida (+15d) na tabela
  const handleProrrogarRapido = (id: string, diasMais: number) => {
    setCadastros(prev => prev.map(c => {
      if (c.id === id) {
        const novaDataStr = somarDias(hojeISO(), diasMais);
        return {
          ...c,
          data_vencimento: novaDataStr,
          status: 'ATIVO'
        };
      }
      return c;
    }));
  };

  // Excluir cadastro provisório
  const handleExcluir = (id: string) => {
    if (confirm('Deseja realmente excluir este cadastro provisório de portfólio?')) {
      setCadastros(prev => prev.filter(c => c.id !== id));
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
                <Sparkles className="w-5 h-5 text-emerald-200" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Cadastro Provisório Portfólio
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                  Cadastros temporários com data limite para consulta de fotos, eventos, preços, parceiros e liberação de pedidos.
                </p>
              </div>
            </div>
          </div>

          {/* Botão Novo Cadastro Provisório */}
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
              <span>Novo Cadastro Provisório</span>
            </button>
          </div>

        </div>

        {/* CARDS DE KPIS LIMPOS (APENAS TOTAL, ATIVOS E EXPIRADOS) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-4">
          <div className="bg-[#f8fbf9] rounded-xl p-3.5 border border-emerald-900/10 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Total de Cadastros</span>
              <span className="text-2xl font-black text-slate-900 font-mono">{metricas.total}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-100/60 text-emerald-700">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-[#f8fbf9] rounded-xl p-3.5 border border-emerald-900/10 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">Acessos Ativos</span>
              <span className="text-2xl font-black text-emerald-700 font-mono">{metricas.ativos}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-[#f8fbf9] rounded-xl p-3.5 border border-emerald-900/10 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-600 block">Cadastros Expirados</span>
              <span className="text-2xl font-black text-red-600 font-mono">{metricas.expirados}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-red-100 text-red-700">
              <AlertCircle className="w-5 h-5" />
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
            placeholder="Buscar por Convidado, Empresa, E-mail ou Cidade..."
            className="
              w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-emerald-900/15 text-xs sm:text-sm
              text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-600 shadow-2xs font-medium
            "
          />
        </div>

        {/* Filtros de Status */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white rounded-xl border border-emerald-900/15 p-1 shadow-2xs">
            <button
              onClick={() => setStatusFilter('TODOS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === 'TODOS' ? 'bg-emerald-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos ({cadastros.length})
            </button>
            <button
              onClick={() => setStatusFilter('ATIVOS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === 'ATIVOS' ? 'bg-emerald-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ativos
            </button>
            <button
              onClick={() => setStatusFilter('EXPIRADOS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === 'EXPIRADOS' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Expirados
            </button>
          </div>
        </div>

      </div>

      {/* ========================================================= */}
      {/* 3. TABELA LIMPA E DIRETA                                  */}
      {/* ========================================================= */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="bg-white rounded-2xl border border-emerald-900/10 shadow-xs overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#022013] text-emerald-200 border-b border-emerald-900/40 text-[11px] font-extrabold uppercase tracking-wider">
                <th className="py-3.5 px-6">Convidado / Empresa</th>
                <th className="py-3.5 px-4">Data de Vencimento</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-center">Liberar Pedidos?</th>
                <th className="py-3.5 px-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-900/5 text-xs sm:text-sm">
              {cadastrosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-semibold">
                    Nenhum cadastro provisório encontrado.
                  </td>
                </tr>
              ) : (
                cadastrosFiltrados.map((item) => {
                  const expirado = isCadastroExpirado(item.data_vencimento);
                  const diasRestantes = getDiasRestantes(item.data_vencimento);
                  const dataVencFormatada = formatarDataBR(item.data_vencimento);

                  return (
                    <tr key={item.id} className="hover:bg-emerald-50/40 transition-colors">

                      {/* Convidado & Empresa */}
                      <td className="py-4 px-6">
                        <div className="font-extrabold text-slate-900 text-sm">{item.nome_convidado}</div>
                        <div className="text-xs text-emerald-800 font-semibold flex items-center gap-1.5 mt-0.5">
                          <Building2 className="w-3.5 h-3.5 shrink-0" />
                          <span>{item.empresa_solicitante}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1 font-mono">
                          <span>{item.cidade}/{item.uf}</span>
                          <span>•</span>
                          <span>{item.telefone_whatsapp}</span>
                        </div>
                      </td>

                      {/* Data de Vencimento */}
                      <td className="py-4 px-4 font-mono font-bold text-slate-900">
                        {dataVencFormatada}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        {expirado ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-red-100 text-red-800 border border-red-300">
                            <XCircle className="w-3.5 h-3.5 text-red-600" />
                            <span>Expirado</span>
                          </span>
                        ) : diasRestantes <= 2 ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                            <span>Vence em {diasRestantes}d</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Ativo ({diasRestantes} dias)</span>
                          </span>
                        )}
                      </td>

                      {/* Liberar Pedidos Toggle */}
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => handleToggleLiberarPedidos(item.id)}
                          className={`
                            inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs
                            ${item.permissoes.liberar_pedidos
                              ? 'bg-lime-600 text-white hover:bg-lime-700'
                              : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                            }
                          `}
                          title={item.permissoes.liberar_pedidos ? 'Clique para Bloquear Pedidos' : 'Clique para Liberar Pedidos'}
                        >
                          {item.permissoes.liberar_pedidos ? (
                            <>
                              <Unlock className="w-3.5 h-3.5" />
                              <span>Liberado</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3.5 h-3.5" />
                              <span>Bloqueado</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Ações */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">

                          {/* Prorrogar Vencimento Rápido (+15 dias) */}
                          <button
                            onClick={() => handleProrrogarRapido(item.id, 15)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                            title="Prorrogar +15 Dias"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>+15d</span>
                          </button>

                          {/* Editar */}
                          <button
                            onClick={() => handleAbrirEdicao(item)}
                            className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer"
                            title="Editar Cadastro"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Excluir */}
                          <button
                            onClick={() => handleExcluir(item.id)}
                            className="p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                            title="Excluir Cadastro"
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

        {/* PEDIDOS TRANSMITIDOS PELOS CONVIDADOS (PORTAL VIP) */}
        <div className="mt-6 bg-white rounded-2xl border border-emerald-900/10 shadow-xs overflow-hidden">
          <div className="px-6 py-3.5 border-b border-emerald-900/10 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900">Pedidos recebidos pelo Portfólio VIP</h3>
            <span className="text-xs font-bold text-slate-500">{pedidosPortfolio.length} pedido(s)</span>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#022013] text-emerald-200 text-[11px] font-extrabold uppercase tracking-wider">
                <th className="py-3 px-6">Pedido / Data</th>
                <th className="py-3 px-4">Convidado / Empresa</th>
                <th className="py-3 px-4">RCA</th>
                <th className="py-3 px-4">Itens</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-900/5 text-xs sm:text-sm">
              {pedidosPortfolio.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-semibold">
                    Nenhum pedido transmitido pelos convidados ainda.
                  </td>
                </tr>
              ) : (
                pedidosPortfolio.map(ped => (
                  <tr key={ped.id} className="hover:bg-emerald-50/40 align-top">
                    <td className="py-3 px-6">
                      <div className="font-mono font-bold text-slate-900">{ped.numero_pedido}</div>
                      <div className="text-[11px] text-slate-500">{ped.data_hora}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{ped.nome_convidado}</div>
                      <div className="text-[11px] text-emerald-800 font-semibold">{ped.empresa_solicitante}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{ped.rca_nome || '-'}</td>
                    <td className="py-3 px-4 text-[11px] text-slate-600">
                      {ped.itens.map((it, idx) => (
                        <div key={idx}>{it.quantidade}x {it.produto_nome} ({it.tipo_embalagem})</div>
                      ))}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-slate-900">
                      R$ {Number(ped.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-6">
                      <select
                        value={ped.status}
                        onChange={(e) => {
                          const status = e.target.value as PedidoPortifolio['status'];
                          setPedidosPortfolio(prev => prev.map(p => p.id === ped.id ? { ...p, status } : p));
                        }}
                        className="bg-white border border-emerald-900/20 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-600"
                      >
                        <option value="Aguardando Aprovação">Aguardando Aprovação</option>
                        <option value="Aprovado pelo RCA">Aprovado pelo RCA</option>
                        <option value="Em Faturamento">Em Faturamento</option>
                        <option value="Entregue">Entregue</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. MODAL NOVO CADASTRO / EDIÇÃO - MAIS LARGO QUE ALTO     */}
      {/* (LAYOUT HORIZONTAL / LANDSCAPE AMPLO PARA NÃO CORTAR)     */}
      {/* ========================================================= */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-6 flex justify-center items-start animate-fadeIn">
          <div className="relative w-full max-w-5xl lg:max-w-6xl xl:max-w-7xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-emerald-900/20 flex flex-col my-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)]">

            {/* Topo do Modal */}
            <div className="bg-[#022013] text-white px-7 py-4 flex items-center justify-between border-b border-emerald-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-lime-400" />
                <h3 className="font-black text-lg text-white">
                  {modoEdicao ? 'Editar Cadastro Provisório' : 'Novo Cadastro Provisório'}
                </h3>
              </div>
              <button
                onClick={() => setModalAberto(false)}
                className="p-1.5 rounded-xl hover:bg-emerald-900 text-emerald-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo do Formulário em Layout Amplo (2 Colunas Lado a Lado) */}
            <form onSubmit={handleSalvar} className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1">

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-start">

                {/* COLUNA ESQUERDA: DADOS PESSOAIS & EMPRESA */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-emerald-900 border-b border-emerald-900/10 pb-1.5 flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-700" />
                    <span>Dados do Convidado & Empresa</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Nome do Convidado / Prospect *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.nome_convidado}
                        onChange={(e) => setFormData({ ...formData, nome_convidado: e.target.value })}
                        placeholder="Ex: Carlos Eduardo Drummond"
                        className="w-full bg-[#f8fbf9] border border-emerald-900/20 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-600 font-medium"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Empresa / Razão Social *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.empresa_solicitante}
                        onChange={(e) => setFormData({ ...formData, empresa_solicitante: e.target.value })}
                        placeholder="Ex: Laticínios Vale Verde S/A"
                        className="w-full bg-[#f8fbf9] border border-emerald-900/20 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-600 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        CPF ou CNPJ
                      </label>
                      <input
                        type="text"
                        value={formData.cpf_cnpj}
                        onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value })}
                        placeholder="00.000.000/0001-00"
                        className="w-full bg-[#f8fbf9] border border-emerald-900/20 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-600 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        WhatsApp / Celular
                      </label>
                      <input
                        type="text"
                        value={formData.telefone_whatsapp}
                        onChange={(e) => setFormData({ ...formData, telefone_whatsapp: e.target.value })}
                        placeholder="(00) 00000-0000"
                        className="w-full bg-[#f8fbf9] border border-emerald-900/20 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-600 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        E-mail
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="contato@empresa.com.br"
                        className="w-full bg-[#f8fbf9] border border-emerald-900/20 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-600 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Cidade & UF
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={formData.cidade}
                          onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                          placeholder="Cidade"
                          className="col-span-2 bg-[#f8fbf9] border border-emerald-900/20 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-600 font-medium"
                        />
                        <input
                          type="text"
                          value={formData.uf}
                          maxLength={2}
                          onChange={(e) => setFormData({ ...formData, uf: e.target.value.toUpperCase() })}
                          placeholder="UF"
                          className="bg-[#f8fbf9] border border-emerald-900/20 rounded-xl px-2 py-2 text-xs text-slate-800 text-center font-bold uppercase focus:outline-none focus:border-emerald-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        RCA Responsável
                      </label>
                      <select
                        value={formData.rca_responsavel_id}
                        onChange={(e) => setFormData({ ...formData, rca_responsavel_id: e.target.value })}
                        className="w-full bg-[#f8fbf9] border border-emerald-900/20 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-600 font-medium"
                      >
                        <option value="">Sem RCA (botão "Fale com seu RCA" fica oculto)</option>
                        {rcasCadastrados.map(r => (
                          <option key={r.id} value={r.id}>
                            {r.codigo_rca} · {r.nome_fantasia || r.nome_completo}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* COLUNA DIREITA: VENCIMENTO & LIBERAÇÃO DE PEDIDOS */}
                <div className="space-y-4">

                  {/* Bloco de Vencimento */}
                  <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-900/10 space-y-2.5">
                    <h4 className="text-xs font-black uppercase tracking-wider text-emerald-900 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-emerald-700" />
                      <span>Data de Vencimento do Acesso *</span>
                    </h4>

                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="date"
                        required
                        value={formData.data_vencimento}
                        onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
                        className="bg-white border border-emerald-900/30 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600 shadow-2xs"
                      />

                      {/* Atalhos Rápidos */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSetDiasVencimento(7)}
                          className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-emerald-100 border border-emerald-900/20 text-xs font-bold text-emerald-900 cursor-pointer shadow-2xs"
                        >
                          +7d
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetDiasVencimento(15)}
                          className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-emerald-100 border border-emerald-900/20 text-xs font-bold text-emerald-900 cursor-pointer shadow-2xs"
                        >
                          +15d
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetDiasVencimento(30)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-800 text-white text-xs font-bold cursor-pointer shadow-xs"
                        >
                          +30d
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetDiasVencimento(60)}
                          className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-emerald-100 border border-emerald-900/20 text-xs font-bold text-emerald-900 cursor-pointer shadow-2xs"
                        >
                          +60d
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Bloco de Liberação de Pedidos */}
                  <div className={`p-4 rounded-2xl border transition-all ${
                    formData.permissoes.liberar_pedidos
                      ? 'bg-lime-50/80 border-lime-400'
                      : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                          <span>Liberar Emissão de Pedidos</span>
                          {formData.permissoes.liberar_pedidos && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-lime-200 text-lime-900">
                              LIBERADO
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Permite ao convidado transmitir pedidos online através do portfólio.
                        </p>
                      </div>

                      {/* Switch Toggle */}
                      <button
                        type="button"
                        onClick={() => setFormData({
                          ...formData,
                          permissoes: { ...formData.permissoes, liberar_pedidos: !formData.permissoes.liberar_pedidos }
                        })}
                        className={`
                          w-13 h-7 rounded-full p-1 transition-colors cursor-pointer flex items-center
                          ${formData.permissoes.liberar_pedidos ? 'bg-lime-600 justify-end' : 'bg-slate-300 justify-start'}
                        `}
                      >
                        <div className="w-5 h-5 rounded-full bg-white shadow-md" />
                      </button>
                    </div>

                    {formData.permissoes.liberar_pedidos && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-lime-200 animate-fadeIn">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Limite para Pedidos (R$)
                          </label>
                          <CampoNumero
                            min={0}
                            ocultarZero
                            value={formData.permissoes.limite_valor_pedido}
                            onChange={(n) => setFormData({
                              ...formData,
                              permissoes: { ...formData.permissoes, limite_valor_pedido: n }
                            })}
                            placeholder="Ex: 50000"
                            className="w-full bg-white border border-lime-400 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-slate-900"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Condição de Pagamento
                          </label>
                          <select
                            value={formData.permissoes.forma_pagamento_autorizada}
                            onChange={(e) => setFormData({
                              ...formData,
                              permissoes: { ...formData.permissoes, forma_pagamento_autorizada: e.target.value }
                            })}
                            className="w-full bg-white border border-lime-400 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 cursor-pointer"
                          >
                            <option value="Boleto Bancário 28 Dias">Boleto Bancário 28 Dias</option>
                            <option value="Boleto Bancário 35 Dias">Boleto Bancário 35 Dias</option>
                            <option value="PIX Imediato (4.5% Desconto)">PIX Imediato (4.5% Desconto)</option>
                            <option value="Faturamento Especial 30/60 Dias">Faturamento Especial 30/60 Dias</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Observações */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Observações Comerciais
                    </label>
                    <textarea
                      rows={2}
                      value={formData.observacoes}
                      onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                      placeholder="Informações adicionais sobre o prospect ou negociação..."
                      className="w-full bg-[#f8fbf9] border border-emerald-900/20 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-600 font-medium"
                    />
                  </div>

                </div>

              </div>

              {/* Botões do Rodapé do Modal */}
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
                  <span>{modoEdicao ? 'Salvar Alterações' : 'Criar Cadastro'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
