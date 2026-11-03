import React, { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
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
import { CabecalhoPagina } from '../ui/CabecalhoPagina';
import { EstadoVazio } from '../ui/EstadoVazio';
import { MolduraPortal, SeletorAdminPortal } from './MolduraPortal';

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

  const kg = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 3 });
  const seletorAdmin = permitirSelecaoAdmin ? (
    <SeletorAdminPortal
      valor={agricultorSelecionadoId}
      onChange={setAgricultorAdminId}
      vazio="Administrador: escolha um produtor"
      opcoes={agricultores.map(a => ({ id: a.id, rotulo: `${a.nome_completo} (${a.nome_propriedade || 'Propriedade'})` }))}
    />
  ) : null;

  return (
    <MolduraPortal
      portal="Portal do Produtor"
      conta={agricultorAtivo?.nome_completo}
      contexto={agricultorAtivo ? agricultorAtivo.nome_propriedade || undefined : undefined}
      onVoltar={onVoltar}
      ehAdmin={permitirSelecaoAdmin}
      seletorAdmin={seletorAdmin}
    >
      {!agricultorAtivo && (
        <div className="px-3 sm:px-5 pt-6">
          <div className="bg-papel border border-linha rounded-md">
            <EstadoVazio
              titulo="Usuário sem agricultor vinculado"
              texto={permitirSelecaoAdmin
                ? 'Escolha um produtor no seletor acima para ver o portal como ele vê.'
                : 'Peça ao administrador para vincular seu usuário a um agricultor cadastrado em Usuários e acessos.'}
            />
          </div>
        </div>
      )}

      {agricultorAtivo && (
        <>
          <CabecalhoPagina
            titulo={agricultorAtivo.nome_completo}
            resumo={[
              agricultorAtivo.nome_propriedade,
              `${agricultorAtivo.endereco.municipio}/${agricultorAtivo.endereco.uf}${agricultorAtivo.endereco.comunidade_bairro ? ` (${agricultorAtivo.endereco.comunidade_bairro})` : ''}`,
              agricultorAtivo.cpf_cnpj,
            ].filter(Boolean).join(' · ')}
            className="!px-3 sm:!px-5"
          />
          {/* PIX cadastrado para pagamento: uma linha, sem caixa extra */}
          <div className="mx-3 sm:mx-5 mb-4 flex flex-wrap items-baseline gap-x-3 sm:gap-x-6 gap-y-1 border-y border-linha py-2.5 text-[13px]">
            <span className="basis-full sm:basis-auto text-[10.5px] font-bold uppercase tracking-[0.14em] text-cinza">PIX para pagamento</span>
            <span className="font-semibold text-tinta tabular-nums break-all">{agricultorAtivo.chave_pix || 'Chave ainda não cadastrada'}</span>
            <span className="text-cinza">{agricultorAtivo.tipo_chave_pix}{agricultorAtivo.banco_nome ? ` · ${agricultorAtivo.banco_nome}` : ''}</span>
          </div>
          {/* Extrato: totais, filtro por período/safra, pagamentos e comprovantes (somente as pesagens deste produtor) */}
          <div className="px-3 sm:px-5">
            <ExtratoAgricultor calculos={pesagensDoAgricultor} onVerTicket={setTicketModal} />
          </div>
        </>
      )}

      {/* Comprovante de pesagem: tela cheia no celular, janela no computador */}
      {ticketModal && (
        <div className="fixed inset-0 z-50 bg-eno-950/60 flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label={`Comprovante ${ticketModal.numero_ticket}`}>
          <div className="bg-papel w-full sm:max-w-lg h-dvh sm:h-auto sm:max-h-[90vh] sm:rounded-md border border-linha flex flex-col overflow-hidden shadow-[0_24px_60px_-20px_rgba(4,32,19,0.6)]">
            <div className="h-[3px] filete-ouro shrink-0" aria-hidden />
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-linha shrink-0">
              <div className="min-w-0">
                <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-cinza">Comprovante de pesagem</div>
                <h3 className="text-[18px] font-extrabold text-tinta tabular-nums truncate">{ticketModal.numero_ticket}</h3>
              </div>
              <button
                type="button"
                onClick={() => setTicketModal(null)}
                className="w-10 h-10 inline-flex items-center justify-center rounded-md text-cinza hover:text-tinta hover:bg-papel-3 cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 text-[13px]">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div><dt className="text-[11.5px] text-cinza">Produtor</dt><dd className="font-semibold text-tinta">{ticketModal.fornecedor_nome}</dd></div>
                <div><dt className="text-[11.5px] text-cinza">Data e hora</dt><dd className="font-semibold text-tinta tabular-nums">{formatarDataBR(ticketModal.data)} {ticketModal.hora}</dd></div>
                <div><dt className="text-[11.5px] text-cinza">Local da roça</dt><dd className="font-semibold text-tinta">{ticketModal.local_pesagem}</dd></div>
                <div><dt className="text-[11.5px] text-cinza">Pesador</dt><dd className="font-semibold text-tinta">{ticketModal.pesador_responsavel}</dd></div>
              </dl>

              <div className="border border-linha rounded-md overflow-hidden">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-linha">
                  {[
                    ['Sacos', `${ticketModal.total_sacos}`],
                    ['Peso bruto', `${kg(pesosDoCalculo(ticketModal).bruto)} kg`],
                    ['Desconto', `− ${kg(pesosDoCalculo(ticketModal).desconto)} kg`],
                    ['Peso líquido', `${kg(pesosDoCalculo(ticketModal).liquido)} kg`],
                  ].map(([r, v]) => (
                    <div key={r} className="bg-papel px-3 py-2.5">
                      <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-cinza">{r}</div>
                      <div className="mt-1 text-[15px] font-extrabold text-tinta tabular-nums">{v}</div>
                    </div>
                  ))}
                </div>
                <div className="px-3 py-2 text-[12px] text-cinza border-t border-linha tabular-nums">
                  Média por saco: {ticketModal.peso_medio_saco_kg.toFixed(1)} kg
                  {descricaoDesconto(ticketModal) && <span className="block text-st-aguardando">Desconto aplicado: {descricaoDesconto(ticketModal)}</span>}
                </div>
              </div>

              <div className="bg-eno-900 text-white rounded-md px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ouro-claro">Valor líquido</div>
                  <div className="text-[12px] text-white/70 tabular-nums">{formatarMoeda(ticketModal.preco_por_kg)} por kg × peso líquido</div>
                </div>
                <div className="text-[22px] font-extrabold tabular-nums">{formatarMoeda(ticketModal.valor_total_estimado)}</div>
              </div>

              {ticketModal.sacos && ticketModal.sacos.length > 0 && (
                <div>
                  <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-cinza mb-1.5">Sacos pesados</div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-1 text-[12px] tabular-nums">
                    {ticketModal.sacos.map(s => (
                      <div key={s.numero} className="px-2 py-1 bg-papel-2 rounded border border-linha text-center">
                        <span className="text-cinza">#{s.numero}</span> <span className="font-semibold text-tinta">{s.peso_kg.toFixed(1)} kg</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="shrink-0 px-4 py-3 border-t border-linha bg-papel-2 flex justify-end" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
              <button
                type="button"
                onClick={() => setTicketModal(null)}
                className="w-full sm:w-auto h-11 sm:h-9 px-5 rounded-md bg-eno-800 text-white text-[13px] font-semibold hover:bg-eno-900 cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </MolduraPortal>
  );
}
