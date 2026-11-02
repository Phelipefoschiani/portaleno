import React, { useState, useEffect, useMemo } from 'react';
import {
  Tractor,
  Calendar,
  Scale,
  DollarSign,
  TrendingUp,
  MapPin,
  Clock,
  ArrowLeft,
  FileText,
  Search,
  CheckCircle2,
  Printer,
  ChevronRight,
  User,
  ShieldCheck,
  Phone,
  CreditCard,
  Building2,
  Sparkles,
  Download
} from 'lucide-react';
import {
  CalculoNaRoca,
  carregarCalculosNaRoca,
  pesosDoCalculo,
  descricaoDesconto
} from '../../data/calculoRocaData';
import { ExtratoAgricultor } from '../pedidos/ComprovantesRoca';
import { formatarMoeda } from '../../data/financeiroData';
import type { Agricultor } from '../../data/mockStore';
import { carregarAgricultores, EVENTO_CADASTROS_ATUALIZADOS } from '../../data/cadastrosData';
import { formatarDataBR } from '../../lib/datas';

interface PortalAgricultorProps {
  onVoltar: () => void;
  /** id do agricultor vinculado ao usuário logado (sessão) */
  agricultorId?: string | null;
  /** ADMIN pode escolher qual produtor visualizar */
  permitirSelecaoAdmin?: boolean;
}

export function PortalAgricultor({ onVoltar, agricultorId, permitirSelecaoAdmin = false }: PortalAgricultorProps) {
  const [agricultores, setAgricultores] = useState<Agricultor[]>(() => carregarAgricultores());
  useEffect(() => {
    const h = () => setAgricultores(carregarAgricultores());
    window.addEventListener(EVENTO_CADASTROS_ATUALIZADOS, h);
    return () => window.removeEventListener(EVENTO_CADASTROS_ATUALIZADOS, h);
  }, []);
  // Para não-administradores o produtor é sempre o vínculo da sessão (sem troca)
  const [agricultorAdminId, setAgricultorAdminId] = useState<string>(agricultorId || '');
  const agricultorSelecionadoId = permitirSelecaoAdmin ? (agricultorAdminId || agricultorId || '') : (agricultorId || '');
  const [calculos, setCalculos] = useState<CalculoNaRoca[]>([]);
  const [ticketModal, setTicketModal] = useState<CalculoNaRoca | null>(null);

  // Carregar dados de cálculos na roça
  useEffect(() => {
    const carregar = () => {
      setCalculos(carregarCalculosNaRoca());
    };
    carregar();
    window.addEventListener('calculos_roca_updated', carregar);
    return () => window.removeEventListener('calculos_roca_updated', carregar);
  }, []);

  // Produtor selecionado
  const agricultorAtivo = useMemo(() => {
    // Sem fallback para outro produtor: só o vinculado
    return agricultores.find(a => a.id === agricultorSelecionadoId);
  }, [agricultores, agricultorSelecionadoId]);

  // Pesagens pertencentes a este agricultor
  const pesagensDoAgricultor = useMemo(() => {
    if (!agricultorAtivo) return [];
    // Filtro por id exato (nunca por nome)
    return calculos.filter(c => c.fornecedor_tipo === 'AGRICULTOR' && c.fornecedor_id === agricultorAtivo.id);
  }, [calculos, agricultorAtivo]);

  return (
    <div className="min-h-screen bg-[#f8faf9] text-slate-800 flex flex-col font-sans select-none">

      {/* 1. TOPO DO PORTAL DEDICADO DO AGRICULTOR */}
      <header className="sticky top-0 z-30 bg-[#022013] text-white border-b border-emerald-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">

          <div className="flex items-center gap-3">
            <button
              onClick={onVoltar}
              className="p-2 sm:p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Voltar ao Painel Principal"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white shadow-sm">
              <Tractor className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
                Grupo ENO · Mandiocultura
              </div>
              <h1 className="text-base sm:text-xl font-black text-white tracking-tight leading-none">
                Portal do Produtor Rural & Pesagens
              </h1>
            </div>
          </div>

          {/* Seletor de Agricultor / Conta do Produtor */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-[11px] text-emerald-300 font-semibold">Produtor Conectado</span>
              <span className="text-xs font-black text-white truncate max-w-[220px]">
                {agricultorAtivo?.nome_completo || 'Produtor Rural'}
              </span>
            </div>
            {permitirSelecaoAdmin && (
            <select
              value={agricultorSelecionadoId}
              onChange={(e) => setAgricultorAdminId(e.target.value)}
              className="bg-emerald-950/80 border border-emerald-600/50 text-white text-xs font-bold rounded-xl px-3 py-2 outline-none cursor-pointer hover:border-emerald-400"
              title="Visualizar como (somente administrador)"
            >
              <option value="" className="bg-slate-900 text-white">Administrador: escolha um produtor</option>
              {agricultores.map(a => (
                <option key={a.id} value={a.id} className="bg-slate-900 text-white">
                  {a.nome_completo} ({a.nome_propriedade || 'Propriedade'})
                </option>
              ))}
            </select>
            )}
          </div>

        </div>
      </header>

      {/* 2. CONTEÚDO PRINCIPAL */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {!agricultorAtivo && (
          <div className="bg-white rounded-2xl border border-amber-200 p-8 max-w-md mx-auto text-center shadow-xs">
            <Tractor className="w-10 h-10 mx-auto text-amber-500 mb-3" />
            <h2 className="text-lg font-black text-slate-900">Usuário sem agricultor vinculado</h2>
            <p className="text-sm text-slate-500 mt-1">
              {permitirSelecaoAdmin
                ? 'Selecione um produtor cadastrado acima para visualizar o portal.'
                : 'Peça ao administrador para vincular seu usuário a um agricultor cadastrado em "Usuários e Acessos".'}
            </p>
          </div>
        )}

        {/* Identificação do Agricultor e Propriedade */}
        {agricultorAtivo && (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <User className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black text-slate-900">
                    {agricultorAtivo.nome_completo}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Fornecedor Ativo de Mandioca
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 mt-1">
                  <span className="flex items-center gap-1 font-semibold text-emerald-800">
                    <Building2 className="w-3.5 h-3.5" />
                    {agricultorAtivo.nome_propriedade || 'Propriedade Rural'}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {agricultorAtivo.endereco.municipio}/{agricultorAtivo.endereco.uf} ({agricultorAtivo.endereco.comunidade_bairro})
                  </span>
                  <span>•</span>
                  <span className="font-mono">CPF/CNPJ: {agricultorAtivo.cpf_cnpj}</span>
                </div>
              </div>
            </div>

            {/* Dados PIX cadastrados para liquidação imediata */}
            <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-xl p-3 text-xs w-full md:w-auto">
              <div className="text-[10px] uppercase font-bold text-emerald-800 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
                Dados PIX Cadastrados para Pagamento
              </div>
              <div className="font-mono font-bold text-slate-900 mt-1 text-sm">
                {agricultorAtivo.chave_pix || 'Aguardando cadastro de chave'}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Tipo: {agricultorAtivo.tipo_chave_pix} · Banco: {agricultorAtivo.banco_nome || 'Conta Bancária Rural'}
              </div>
            </div>
          </div>
        )}

        {/* Extrato: totais, filtro por período/safra, pagamentos e comprovantes (somente as pesagens deste produtor) */}
        {agricultorAtivo && (
          <ExtratoAgricultor calculos={pesagensDoAgricultor} onVerTicket={setTicketModal} />
        )}

      </main>

      {/* Modal Visualizar Ticket Individual */}
      {ticketModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-emerald-900/20 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-700">Comprovante Oficial de Pesagem</span>
                <h3 className="text-lg font-black text-slate-900">{ticketModal.numero_ticket}</h3>
              </div>
              <button
                onClick={() => setTicketModal(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl">
                <div>
                  <div className="text-slate-500">Produtor:</div>
                  <div className="font-bold text-slate-900">{ticketModal.fornecedor_nome}</div>
                </div>
                <div>
                  <div className="text-slate-500">Data / Hora:</div>
                  <div className="font-bold text-slate-900">{formatarDataBR(ticketModal.data)} {ticketModal.hora}</div>
                </div>
                <div>
                  <div className="text-slate-500">Local da Roça:</div>
                  <div className="font-bold text-slate-900">{ticketModal.local_pesagem}</div>
                </div>
                <div>
                  <div className="text-slate-500">Pesador / Conferente:</div>
                  <div className="font-bold text-slate-900">{ticketModal.pesador_responsavel}</div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-3">
                <div className="font-bold text-slate-800 mb-2">Resumo da Carga:</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="bg-emerald-50 p-2 rounded-lg">
                    <div className="text-[10px] text-slate-500">Total Sacos</div>
                    <div className="text-base font-black text-emerald-800">{ticketModal.total_sacos} sc</div>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg">
                    <div className="text-[10px] text-slate-500">Peso Bruto</div>
                    <div className="text-base font-black text-slate-800">{pesosDoCalculo(ticketModal).bruto.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} kg</div>
                  </div>
                  <div className="bg-amber-50 p-2 rounded-lg">
                    <div className="text-[10px] text-slate-500">Desconto</div>
                    <div className="text-base font-black text-amber-700">- {pesosDoCalculo(ticketModal).desconto.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} kg</div>
                  </div>
                  <div className="bg-emerald-50 p-2 rounded-lg">
                    <div className="text-[10px] text-slate-500">Peso Líquido</div>
                    <div className="text-base font-black text-emerald-800">{pesosDoCalculo(ticketModal).liquido.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} kg</div>
                  </div>
                </div>
                {descricaoDesconto(ticketModal) && (
                  <div className="mt-2 text-[11px] text-amber-800">Desconto aplicado: {descricaoDesconto(ticketModal)}</div>
                )}
                <div className="mt-1 text-[11px] text-slate-500">Média por saco: {ticketModal.peso_medio_saco_kg.toFixed(1)} kg</div>
              </div>

              <div className="bg-emerald-950 text-white rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-emerald-300 uppercase font-semibold">Valor Total Líquido</div>
                  <div className="text-xs text-slate-300">{formatarMoeda(ticketModal.preco_por_kg)} por kg × peso líquido</div>
                </div>
                <div className="text-xl font-black text-emerald-400">
                  {formatarMoeda(ticketModal.valor_total_estimado)}
                </div>
              </div>

              {ticketModal.sacos && ticketModal.sacos.length > 0 && (
                <div className="mt-2">
                  <div className="font-bold text-slate-800 mb-1 text-[11px]">Listagem dos Sacos Pesados:</div>
                  <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl p-2 grid grid-cols-4 gap-1 text-[11px] font-mono bg-slate-50">
                    {ticketModal.sacos.map(s => (
                      <div key={s.numero} className="p-1 bg-white rounded border border-slate-200 text-center">
                        <span className="text-slate-400">#{s.numero}:</span> <span className="font-bold text-slate-800">{s.peso_kg.toFixed(1)}kg</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setTicketModal(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 cursor-pointer"
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
