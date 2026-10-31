import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Plus,
  Copy,
  Check,
  Printer,
  Eye,
  X,
  Building2,
  Calendar,
  Scale,
  ShieldCheck,
  DollarSign
} from 'lucide-react';
import {
  NotaFiscalEntrada,
  carregarNotasEntrada,
  salvarNotasEntrada,
  numeroSeguro,
  somarValores
} from '../../data/financeiroData';
import { hojeISO, formatarDataBR, compararDatas } from '../../lib/datas';
import { FinanceiroNavTabs } from './FinanceiroNavTabs';

interface Props {
  onNavigate?: (tabId: string) => void;
}

export function FinanceiroNotasEntrada({ onNavigate }: Props) {
  const [notas, setNotas] = useState<NotaFiscalEntrada[]>([]);

  // Lê do armazenamento e acompanha atualizações feitas em outras telas (ex.: compras integradas)
  useEffect(() => {
    const recarregar = () =>
      setNotas([...carregarNotasEntrada()].sort((a, b) => compararDatas(b.data_emissao, a.data_emissao)));
    recarregar();
    window.addEventListener('financeiro_updated', recarregar);
    window.addEventListener('sistema_reset_updated', recarregar);
    return () => {
      window.removeEventListener('financeiro_updated', recarregar);
      window.removeEventListener('sistema_reset_updated', recarregar);
    };
  }, []);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'Agricultor' | 'Fornecedor'>('TODOS');
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const [modalVisualizar, setModalVisualizar] = useState<NotaFiscalEntrada | null>(null);
  const [modalNovo, setModalNovo] = useState(false);

  // Form para nova NF-e de entrada
  const [formData, setFormData] = useState({
    numero: '',
    serie: '1',
    chave_acesso: '',
    parceiro_nome: '',
    tipo_parceiro: 'Agricultor' as 'Agricultor' | 'Fornecedor',
    cnpj_cpf: '',
    produto_descricao: '',
    peso_liquido_kg: 0,
    valor_total: 0,
    data_emissao: hojeISO()
  });

  const notasFiltradas = notas.filter(n => {
    const matchBusca = 
      String(n.numero || '').includes(busca) ||
      (n.parceiro_nome || '').toLowerCase().includes(busca.toLowerCase()) ||
      (n.chave_acesso || '').includes(busca) ||
      (n.cnpj_cpf || '').includes(busca) ||
      (n.produto_descricao || '').toLowerCase().includes(busca.toLowerCase());
    const matchTipo = filtroTipo === 'TODOS' || n.tipo_parceiro === filtroTipo;
    return matchBusca && matchTipo;
  });

  // Métricas
  const totalNotas = notas.length;
  const totalValor = somarValores(notas, n => n.valor_total);
  const totalPesoTon = (somarValores(notas, n => n.peso_liquido_kg) / 1000).toFixed(1);

  const handleCopiarChave = (chave: string, id: string) => {
    navigator.clipboard.writeText(chave);
    setCopiadoId(id);
    setTimeout(() => setCopiadoId(null), 2000);
  };

  const handleSalvarNovaNota = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.numero || !formData.parceiro_nome) return;

    const novaNota: NotaFiscalEntrada = {
      id: `nfe_ent_${Date.now()}`,
      numero: formData.numero,
      serie: formData.serie,
      chave_acesso: formData.chave_acesso || `412603${Math.floor(10000000000000 + Math.random() * 90000000000000)}5500100000${formData.numero.replace(/\D/g, '')}1000000001`,
      parceiro_nome: formData.parceiro_nome,
      tipo_parceiro: formData.tipo_parceiro,
      cnpj_cpf: formData.cnpj_cpf || '000.000.000-00',
      produto_descricao: formData.produto_descricao,
      peso_liquido_kg: Number(formData.peso_liquido_kg) || 0,
      valor_total: Number(formData.valor_total) || 0,
      data_emissao: hojeISO(),
      status_sefaz: 'AUTORIZADA'
    };

    const atualizadas = [novaNota, ...carregarNotasEntrada()];
    setNotas(atualizadas);
    salvarNotasEntrada(atualizadas);
    setModalNovo(false);
    setFormData({
      numero: '',
      serie: '1',
      chave_acesso: '',
      parceiro_nome: '',
      tipo_parceiro: 'Agricultor',
      cnpj_cpf: '',
      produto_descricao: '',
      peso_liquido_kg: 0,
      valor_total: 0,
      data_emissao: hojeISO()
    });
  };

  return (
    <div className="relative h-full w-full flex flex-col bg-[#f8faf8] text-slate-800 overflow-hidden">
      
      {/* 1. NAVEGAÇÃO FINANCEIRO */}
      <FinanceiroNavTabs activeTab="financeiro_notas_entrada" onNavigate={onNavigate} />

      {/* 2. CABEÇALHO COMPACTO & MINIMALISTA */}
      <div className="bg-white border-b border-slate-200/80 px-6 py-3.5 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Notas Fiscais de Entrada (NFe-E)</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                {totalNotas} documentos
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setModalNovo(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-900 hover:bg-emerald-950 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Registrar Nota de Entrada</span>
            </button>
          </div>
        </div>

        {/* 3. BARRA HORIZONTAL DE MÉTRICAS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/70">
            <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Escriturado</div>
              <div className="text-sm font-black text-slate-900 font-mono">
                {totalNotas} notas
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/70">
            <Scale className="w-4 h-4 text-blue-700 shrink-0" />
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Carga Líquida</div>
              <div className="text-sm font-black text-blue-900 font-mono">
                {totalPesoTon} Toneladas
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/70 col-span-2 sm:col-span-1">
            <DollarSign className="w-4 h-4 text-emerald-700 shrink-0" />
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Volume Financeiro</div>
              <div className="text-sm font-black text-emerald-900 font-mono">
                {totalValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. BARRA DE BUSCA E FILTROS */}
      <div className="bg-[#f1f5f2] px-6 py-2.5 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex-1 min-w-[260px] max-w-sm relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por NF-e, Agricultor, Fornecedor ou Chave..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-700 font-medium"
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-500 font-semibold text-[11px] mr-1">Origem:</span>
          {(['TODOS', 'Agricultor', 'Fornecedor'] as const).map((tipo) => (
            <button
              key={tipo}
              onClick={() => setFiltroTipo(tipo)}
              className={`px-2.5 py-1 rounded-md font-medium text-xs transition-colors cursor-pointer ${
                filtroTipo === tipo
                  ? 'bg-slate-800 text-white font-bold'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tipo === 'TODOS' ? 'Todos' : tipo}
            </button>
          ))}
        </div>
      </div>

      {/* 5. TABELA LIMPA */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 text-slate-500 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-5">Nota / Série</th>
                <th className="py-3 px-4">Remetente (Produtor / Fornecedor)</th>
                <th className="py-3 px-4">Item & Matéria-Prima</th>
                <th className="py-3 px-4">Peso Líquido</th>
                <th className="py-3 px-4">Valor Total</th>
                <th className="py-3 px-4">Data Emissão</th>
                <th className="py-3 px-4">SEFAZ</th>
                <th className="py-3 px-5 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {notasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Nenhuma nota fiscal de entrada encontrada com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                notasFiltradas.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-5 font-mono font-bold text-slate-900">
                      NF-e {item.numero}
                      <div className="text-[10px] text-slate-400 font-normal">Série {item.serie}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{item.parceiro_nome}</div>
                      <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider ${
                          item.tipo_parceiro === 'Agricultor'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {item.tipo_parceiro}
                        </span>
                        <span>{item.cnpj_cpf}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {item.produto_descricao}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                      {(numeroSeguro(item.peso_liquido_kg) / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1 })} Ton
                      <div className="text-[10px] text-slate-400 font-normal">
                        {numeroSeguro(item.peso_liquido_kg).toLocaleString('pt-BR')} kg
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-black text-emerald-950">
                      {numeroSeguro(item.valor_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 font-medium whitespace-nowrap">
                      {formatarDataBR(item.data_emissao)}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        {item.status_sefaz}
                      </span>
                    </td>

                    <td className="py-3.5 px-5 text-right">
                      <button
                        onClick={() => setModalVisualizar(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs font-semibold cursor-pointer transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                        <span>Espelho</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL VISUALIZAR ESPELHO DANFE (AMPLO E HORIZONTAL) */}
      {modalVisualizar && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 backdrop-blur-xs p-3 sm:p-6 flex justify-center items-start animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl sm:max-w-5xl w-full overflow-hidden my-auto flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)] animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-sm sm:text-base">
                  Espelho da Nota Fiscal de Entrada - Nº {modalVisualizar.numero}
                </h3>
              </div>
              <button
                onClick={() => setModalVisualizar(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Chave de Acesso (44 dígitos SEFAZ)</span>
                  <button
                    onClick={() => handleCopiarChave(modalVisualizar.chave_acesso, modalVisualizar.id)}
                    className="flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer"
                  >
                    {copiadoId === modalVisualizar.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copiada com sucesso!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Chave</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="font-mono text-xs sm:text-sm font-bold text-slate-800 break-all select-all">
                  {modalVisualizar.chave_acesso}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Remetente / Parceiro
                  </span>
                  <p className="font-bold text-slate-900 text-sm">{modalVisualizar.parceiro_nome}</p>
                  <p className="text-slate-500 font-mono mt-0.5">{modalVisualizar.cnpj_cpf}</p>
                  <p className="text-emerald-700 mt-1 font-bold">Tipo: {modalVisualizar.tipo_parceiro}</p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Destinatário (Fábrica)
                  </span>
                  <p className="font-bold text-slate-900 text-sm">Grupo ENO Agroindustrial Ltda</p>
                  <p className="text-slate-500 font-mono mt-0.5">CNPJ: 14.882.301/0001-92</p>
                  <p className="text-slate-600 mt-1 font-medium">Paranavaí - PR</p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Produto:</span>
                    <span className="font-bold text-slate-800">{modalVisualizar.produto_descricao}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Peso Líquido:</span>
                    <span className="font-bold font-mono text-slate-800">
                      {numeroSeguro(modalVisualizar.peso_liquido_kg).toLocaleString('pt-BR')} kg
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Data Emissão:</span>
                    <span className="font-bold font-mono text-slate-800">{formatarDataBR(modalVisualizar.data_emissao)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1.5 border-t border-slate-200">
                    <span className="text-xs font-bold text-slate-900">Total Escriturado:</span>
                    <span className="text-sm font-black font-mono text-emerald-900">
                      {numeroSeguro(modalVisualizar.valor_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold cursor-pointer"
              >
                <Printer className="w-4 h-4 text-slate-500" />
                <span>Imprimir Espelho DANFE</span>
              </button>
              <button
                onClick={() => setModalVisualizar(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR NOVA NOTA DE ENTRADA (AMPLO E HORIZONTAL) */}
      {modalNovo && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 backdrop-blur-xs p-3 sm:p-6 flex justify-center items-start animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl sm:max-w-5xl lg:max-w-6xl w-full overflow-hidden my-auto flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)] animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-900/80 border border-emerald-700 flex items-center justify-center text-emerald-300">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm sm:text-base">
                    Registrar Nota Fiscal de Entrada (NF-e de Compra / Romaneio)
                  </h3>
                  <p className="text-[11px] text-slate-400">Escrituração de mandioca in natura, biomassa, embalagens e insumos</p>
                </div>
              </div>
              <button
                onClick={() => setModalNovo(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSalvarNovaNota} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Número NF-e *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.numero}
                    onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                    placeholder="Ex: 001.241"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-700 bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Série
                  </label>
                  <input
                    type="text"
                    value={formData.serie}
                    onChange={(e) => setFormData({ ...formData, serie: e.target.value })}
                    placeholder="1"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono text-slate-900 focus:outline-none focus:border-emerald-700 bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Tipo de Parceiro
                  </label>
                  <select
                    value={formData.tipo_parceiro}
                    onChange={(e) => setFormData({ ...formData, tipo_parceiro: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-900 font-semibold focus:outline-none focus:border-emerald-700 bg-slate-50 cursor-pointer"
                  >
                    <option value="Agricultor">Produtor Rural (Agricultor)</option>
                    <option value="Fornecedor">Fornecedor Geral</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    CPF ou CNPJ do Parceiro
                  </label>
                  <input
                    type="text"
                    value={formData.cnpj_cpf}
                    onChange={(e) => setFormData({ ...formData, cnpj_cpf: e.target.value })}
                    placeholder="000.000.000-00"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono text-slate-900 focus:outline-none focus:border-emerald-700 bg-slate-50"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Nome do Remetente (Produtor / Empresa) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.parceiro_nome}
                    onChange={(e) => setFormData({ ...formData, parceiro_nome: e.target.value })}
                    placeholder="Ex: Sítio São José - João da Silva"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-900 font-bold focus:outline-none focus:border-emerald-700 bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Produto / Descrição
                  </label>
                  <input
                    type="text"
                    value={formData.produto_descricao}
                    onChange={(e) => setFormData({ ...formData, produto_descricao: e.target.value })}
                    placeholder="Ex: Mandioca Raiz In Natura"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-900 focus:outline-none focus:border-emerald-700 bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Peso Líquido Balança (kg)
                  </label>
                  <input
                    type="number"
                    value={formData.peso_liquido_kg || ''}
                    onChange={(e) => setFormData({ ...formData, peso_liquido_kg: Number(e.target.value) })}
                    placeholder="28000"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono text-slate-900 focus:outline-none focus:border-emerald-700 bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Valor Total da NF-e (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.valor_total || ''}
                    onChange={(e) => setFormData({ ...formData, valor_total: Number(e.target.value) })}
                    placeholder="16800.00"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono font-bold text-emerald-950 focus:outline-none focus:border-emerald-700 bg-slate-50"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Chave de Acesso SEFAZ (Opcional - Gerada automaticamente se vazia)
                  </label>
                  <input
                    type="text"
                    value={formData.chave_acesso}
                    onChange={(e) => setFormData({ ...formData, chave_acesso: e.target.value })}
                    placeholder="4126..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono text-slate-700 focus:outline-none focus:border-emerald-700 bg-slate-50"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalNovo(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-900 hover:bg-emerald-950 text-white font-bold cursor-pointer shadow-sm transition-all"
                >
                  Registrar e Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
