import React, { useState, useEffect } from 'react';
import { Copy, Check, Printer, Eye } from 'lucide-react';
import { CabecalhoPagina, BotaoPrimario, BotaoSecundario } from '../ui/CabecalhoPagina';
import { BarraFiltros, CampoBusca } from '../ui/BarraFiltros';
import { TabelaDados, Th, Td, tabela } from '../ui/TabelaDados';
import { StatusChip } from '../ui/StatusChip';
import { EstadoVazio } from '../ui/EstadoVazio';
import { ModalFolha, ListaCartoes, ItemCartao, botaoLinhaSecundario } from './finUi';
import {
  NotaFiscalSaida,
  carregarNotasSaida,
  formatarMoeda,
  numeroSeguro
} from '../../data/financeiroData';
import { formatarDataBR, compararDatas } from '../../lib/datas';
import { FinanceiroNavTabs } from './FinanceiroNavTabs';
import { ChaveAcesso } from '../ui/ChaveAcesso';

interface Props {
  onNavigate?: (tabId: string) => void;
}

export function FinanceiroNotasSaida({ onNavigate }: Props) {
  const [notas, setNotas] = useState<NotaFiscalSaida[]>([]);
  const [busca, setBusca] = useState('');
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const [modalVisualizar, setModalVisualizar] = useState<NotaFiscalSaida | null>(null);

  // Lê do armazenamento e acompanha atualizações feitas em outras telas
  useEffect(() => {
    const recarregar = () =>
      setNotas([...carregarNotasSaida()].sort((a, b) => compararDatas(b.data_emissao, a.data_emissao)));
    recarregar();
    window.addEventListener('financeiro_updated', recarregar);
    window.addEventListener('sistema_reset_updated', recarregar);
    return () => {
      window.removeEventListener('financeiro_updated', recarregar);
      window.removeEventListener('sistema_reset_updated', recarregar);
    };
  }, []);

  const notasFiltradas = notas.filter(n =>
    String(n.numero || '').includes(busca) ||
    (n.cliente_nome || '').toLowerCase().includes(busca.toLowerCase()) ||
    (n.chave_acesso || '').includes(busca) ||
    (n.cnpj_cpf || '').includes(busca)
  );

  const handleCopiarChave = (chave: string, id: string) => {
    navigator.clipboard.writeText(chave);
    setCopiadoId(id);
    setTimeout(() => setCopiadoId(null), 2000);
  };

  const autorizada = (n: NotaFiscalSaida) => !n.status_sefaz || n.status_sefaz === 'AUTORIZADA';
  const rotuloSefaz = (n: NotaFiscalSaida) =>
    autorizada(n) ? 'Autorizada' : n.status_sefaz === 'CANCELADA' ? 'Cancelada' : 'Inutilizada';
  const valorAutorizado = notas.filter(autorizada).reduce((a, n) => a + numeroSeguro(n.valor_total), 0);
  const toneladas = (n: NotaFiscalSaida) => (numeroSeguro(n.peso_liquido_kg) / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 });

  return (
    <div className="relative h-full w-full flex flex-col bg-papel-2 text-tinta overflow-hidden">
      <FinanceiroNavTabs activeTab="financeiro_notas_saida" onNavigate={onNavigate} />

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1700px]">
          <CabecalhoPagina
            titulo="Notas de saída"
            resumo={
              notas.length === 0 ? 'Nenhuma NF-e emitida' : (
                <>
                  <span className="font-semibold text-tinta-2">{notas.length} {notas.length === 1 ? 'NF-e emitida' : 'NF-e emitidas'}</span>
                  <span> · {formatarMoeda(valorAutorizado)} autorizados</span>
                </>
              )
            }
          />

          {notas.length > 0 && (
            <BarraFiltros>
              <span className="hidden md:block" />
              <CampoBusca valor={busca} onChange={setBusca} placeholder="Buscar nº, cliente, CNPJ ou chave" className="w-full md:w-80" />
            </BarraFiltros>
          )}

          <div className="px-4 sm:px-6 pb-6">
            {notasFiltradas.length === 0 ? (
              <div className="bg-papel border border-linha rounded-md">
                <EstadoVazio
                  titulo={notas.length === 0 ? 'Nenhuma nota de saída ainda' : 'Nenhuma nota com essa busca'}
                  texto={notas.length === 0
                    ? 'As NF-e aparecem aqui quando um pedido é faturado em Pedidos › A faturar.'
                    : 'Confira o número, o nome do cliente ou a chave de acesso.'}
                  acao={notas.length > 0 ? <BotaoSecundario onClick={() => setBusca('')}>Limpar busca</BotaoSecundario> : undefined}
                />
              </div>
            ) : (
              <>
                <ListaCartoes>
                  {notasFiltradas.map(item => (
                    <ItemCartao key={item.id}>
                      <button type="button" onClick={() => setModalVisualizar(item)} className="w-full text-left">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-[11.5px] text-cinza tabular-nums">NF-e {item.numero} · série {item.serie} · {formatarDataBR(item.data_emissao)}</div>
                            <div className="text-[14px] font-bold text-tinta truncate">{item.cliente_nome}</div>
                          </div>
                          <StatusChip tom={autorizada(item) ? 'pago' : 'vencido'} className="shrink-0">{rotuloSefaz(item)}</StatusChip>
                        </div>
                        <div className="flex items-end justify-between gap-2 mt-2">
                          <span className="text-[12px] text-cinza tabular-nums">{toneladas(item)} t</span>
                          <span className="text-[17px] font-extrabold tracking-[-0.01em] tabular-nums text-tinta">{formatarMoeda(item.valor_total)}</span>
                        </div>
                      </button>
                      <div className="flex gap-2 mt-2.5">
                        <button type="button" onClick={() => handleCopiarChave(item.chave_acesso, item.id)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-md border border-linha-forte text-tinta-2 text-[13px] font-semibold active:bg-papel-3">
                          {copiadoId === item.id ? <Check className="w-4 h-4 text-st-pago" /> : <Copy className="w-4 h-4" />}
                          {copiadoId === item.id ? 'Chave copiada' : 'Copiar chave'}
                        </button>
                        <button type="button" onClick={() => setModalVisualizar(item)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-md border border-linha-forte text-tinta-2 text-[13px] font-semibold active:bg-papel-3">
                          <Eye className="w-4 h-4" /> Ver espelho
                        </button>
                      </div>
                    </ItemCartao>
                  ))}
                </ListaCartoes>

                <TabelaDados className="hidden sm:block">
                  <thead className={tabela.thead}>
                    <tr>
                      <Th>NF-e</Th>
                      <Th>Destinatário</Th>
                      <Th>Chave de acesso</Th>
                      <Th>Emissão</Th>
                      <Th>SEFAZ</Th>
                      <Th numero>Valor</Th>
                      <Th className="text-right">Ação</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {notasFiltradas.map(item => (
                      <tr key={item.id} className={tabela.tr}>
                        <Td className="whitespace-nowrap">
                          <div className="font-semibold text-tinta tabular-nums">{item.numero}</div>
                          <div className="text-[11.5px] text-cinza">Série {item.serie}</div>
                        </Td>
                        <Td className="max-w-[300px]">
                          <div className="font-semibold text-tinta truncate">{item.cliente_nome}</div>
                          <div className="text-[11.5px] text-cinza tabular-nums truncate">{item.cnpj_cpf}</div>
                        </Td>
                        <Td className="max-w-[240px]">
                          <div className="flex items-center gap-1 min-w-0">
                            <span className="text-[11.5px] text-cinza tabular-nums truncate">{item.chave_acesso}</span>
                            <button type="button" onClick={() => handleCopiarChave(item.chave_acesso, item.id)}
                              className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded text-cinza hover:bg-papel-3 hover:text-tinta cursor-pointer"
                              title="Copiar chave de acesso (44 dígitos)" aria-label="Copiar chave de acesso">
                              {copiadoId === item.id ? <Check className="w-3.5 h-3.5 text-st-pago" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </Td>
                        <Td className="whitespace-nowrap tabular-nums">{formatarDataBR(item.data_emissao)}</Td>
                        <Td><StatusChip tom={autorizada(item) ? 'pago' : 'vencido'}>{rotuloSefaz(item)}</StatusChip></Td>
                        <Td numero>
                          <div className="font-bold text-tinta text-[13.5px]">{formatarMoeda(item.valor_total)}</div>
                          <div className="text-[11.5px] text-cinza font-normal">{toneladas(item)} t</div>
                        </Td>
                        <Td className="text-right">
                          <button type="button" onClick={() => setModalVisualizar(item)} className={botaoLinhaSecundario} title="Ver espelho fiscal">
                            <Eye className="w-3.5 h-3.5" /> Ver
                          </button>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </TabelaDados>
              </>
            )}
          </div>
        </div>
      </div>

      {modalVisualizar && (
        <ModalFolha
          titulo={`NF-e ${modalVisualizar.numero}`}
          subtitulo={`Série ${modalVisualizar.serie} · emitida em ${formatarDataBR(modalVisualizar.data_emissao)}`}
          onFechar={() => setModalVisualizar(null)}
          largura="sm:max-w-2xl"
          zIndex="z-50"
          rodape={
            <>
              <BotaoSecundario onClick={() => window.print()}><Printer className="w-4 h-4" /> Imprimir DANFE</BotaoSecundario>
              <BotaoPrimario onClick={() => setModalVisualizar(null)}>Fechar</BotaoPrimario>
            </>
          }
        >
          <div className="space-y-5">
            <div className="flex items-end justify-between gap-3 bg-papel border border-linha rounded-md px-4 py-3.5">
              <div className="min-w-0">
                <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-cinza">Valor da nota</div>
                <div className="mt-1 text-[28px] font-extrabold tracking-[-0.02em] tabular-nums leading-none text-tinta">{formatarMoeda(modalVisualizar.valor_total)}</div>
              </div>
              <StatusChip tom={autorizada(modalVisualizar) ? 'pago' : 'vencido'} className="shrink-0">{rotuloSefaz(modalVisualizar)}</StatusChip>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-[13.5px]">
              <div className="min-w-0">
                <dt className="text-[11px] font-bold uppercase tracking-[0.1em] text-cinza">Destinatário</dt>
                <dd className="font-semibold text-tinta break-words">{modalVisualizar.cliente_nome}</dd>
                <dd className="text-[12px] text-cinza tabular-nums">{modalVisualizar.cnpj_cpf}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-[0.1em] text-cinza">Natureza da operação</dt>
                <dd className="text-tinta-2">Venda de produção do estabelecimento</dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-[0.1em] text-cinza">Peso líquido</dt>
                <dd className="text-tinta-2 tabular-nums">{toneladas(modalVisualizar)} t</dd>
              </div>
            </dl>

            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-cinza">Chave de acesso</span>
                <button type="button" onClick={() => handleCopiarChave(modalVisualizar.chave_acesso, modalVisualizar.id)}
                  className="inline-flex items-center gap-1 h-10 sm:h-8 px-2.5 rounded-md text-[12.5px] font-semibold text-eno-700 hover:bg-papel-3 cursor-pointer">
                  {copiadoId === modalVisualizar.id ? <Check className="w-3.5 h-3.5 text-st-pago" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiadoId === modalVisualizar.id ? 'Copiada' : 'Copiar'}
                </button>
              </div>
              <div className="bg-papel border border-linha rounded-md px-3 py-2.5 text-[13px] tabular-nums tracking-[0.04em] text-tinta break-all select-all">
                <ChaveAcesso chave={modalVisualizar.chave_acesso} />
              </div>
            </div>
          </div>
        </ModalFolha>
      )}
    </div>
  );
}
