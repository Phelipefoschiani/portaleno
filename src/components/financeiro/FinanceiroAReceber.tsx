import React, { useState, useEffect, useMemo } from 'react';
import { CampoNumero } from '../ui/CampoNumero';
import { Plus, Copy, Check, Save } from 'lucide-react';
import { CabecalhoPagina, BotaoPrimario, BotaoSecundario } from '../ui/CabecalhoPagina';
import { BarraFiltros, Segmentado, CampoBusca } from '../ui/BarraFiltros';
import { TabelaDados, Th, Td, tabela } from '../ui/TabelaDados';
import { StatusChip } from '../ui/StatusChip';
import { CardNumero } from '../ui/CardNumero';
import { EstadoVazio } from '../ui/EstadoVazio';
import {
  ModalFolha, Campo, campo, FaixaFin, ListaCartoes, ItemCartao, tomTitulo, moedaSemSimbolo,
  botaoLinhaPrimario,
} from './finUi';
import {
  TituloReceber,
  carregarTitulosReceber,
  salvarTitulosReceber,
  statusEfetivoReceber,
  dataNoMesAtual,
  somarValores,
  formatarMoeda,
  registrarBaixaNoCaixa
} from '../../data/financeiroData';
import { hojeISO, somarDias, paraISO, formatarDataBR, compararDatas } from '../../lib/datas';
import { FinanceiroNavTabs } from './FinanceiroNavTabs';

interface Props {
  onNavigate?: (tabId: string) => void;
}

export function FinanceiroAReceber({ onNavigate }: Props) {
  const [titulos, setTitulos] = useState<TituloReceber[]>([]);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  // Modal Novo Título
  const [modalNovo, setModalNovo] = useState(false);
  const [formData, setFormData] = useState({
    numero_documento: '',
    cliente_nome: '',
    cliente_cnpj: '',
    valor: 0,
    data_emissao: hojeISO(),
    data_vencimento: '',
    forma_pagamento: '',
    banco_emissor: '',
    observacoes: ''
  });

  // Status VENCIDO é calculado na exibição (não pago + vencimento anterior a hoje)
  const recarregar = () => {
    const lista = carregarTitulosReceber()
      .map(t => ({ ...t, status: statusEfetivoReceber(t) }))
      .sort((a, b) => compararDatas(a.data_vencimento, b.data_vencimento));
    setTitulos(lista);
  };

  useEffect(() => {
    recarregar();
    const handleUpdate = () => recarregar();
    window.addEventListener('financeiro_updated', handleUpdate);
    return () => window.removeEventListener('financeiro_updated', handleUpdate);
  }, []);

  // Métricas
  const metricas = useMemo(() => {
    const pendentes = titulos.filter(t => t.status !== 'PAGO');
    const emAberto = somarValores(pendentes, t => t.valor);
    const recebidoMes = somarValores(
      titulos.filter(t => t.status === 'PAGO' && dataNoMesAtual(t.data_pagamento)),
      t => t.valor
    );
    const qtdAberto = pendentes.length;
    const vencidos = titulos.filter(t => t.status === 'VENCIDO');
    const qtdVencidos = vencidos.length;
    const valorVencido = somarValores(vencidos, t => t.valor);
    const qtdPagos = titulos.filter(t => t.status === 'PAGO').length;

    return { emAberto, recebidoMes, qtdAberto, qtdVencidos, valorVencido, qtdPagos };
  }, [titulos]);

  const titulosFiltrados = useMemo(() => {
    return titulos.filter(t => {
      const match =
        (t.cliente_nome || '').toLowerCase().includes(busca.toLowerCase()) ||
        (t.numero_documento || '').toLowerCase().includes(busca.toLowerCase()) ||
        (t.cliente_cnpj || '').includes(busca);

      if (!match) return false;
      if (filtroStatus !== 'TODOS' && t.status !== filtroStatus) return false;
      return true;
    });
  }, [titulos, busca, filtroStatus]);

  // Baixa de título
  const handleBaixarTitulo = (id: string, doc: string) => {
    if (confirm(`Confirmar liquidação / baixa do título ${doc}?`)) {
      // Atualiza a partir do armazenamento (sem gravar o status calculado de exibição)
      const armazenados = carregarTitulosReceber();
      const alvo = armazenados.find(t => t.id === id);
      if (!alvo || alvo.status === 'PAGO') return;
      const atualizados: TituloReceber[] = armazenados.map(t =>
        t.id === id ? { ...t, status: 'PAGO' as const, data_pagamento: hojeISO() } : t
      );
      salvarTitulosReceber(atualizados);
      // Entrada no caixa (uma única vez por título)
      registrarBaixaNoCaixa(`receber:${id}`, alvo.valor, { descricao: `Recebimento ${alvo.numero_documento} - ${alvo.cliente_nome}` });
    }
  };

  const handleCopiarLinha = (linha: string, id: string) => {
    navigator.clipboard.writeText(linha);
    setCopiadoId(id);
    setTimeout(() => setCopiadoId(null), 2000);
  };

  const handleSalvarNovo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!(formData.valor > 0)) {
      alert('Informe um valor maior que zero.');
      return;
    }
    const novo: TituloReceber = {
      id: `rec_${Date.now()}`,
      ...formData,
      data_emissao: paraISO(formData.data_emissao) || hojeISO(),
      data_vencimento: paraISO(formData.data_vencimento),
      status: 'EM_ABERTO'
    };
    salvarTitulosReceber([novo, ...carregarTitulosReceber()]);
    setModalNovo(false);
  };

  const abrirNovo = () => {
    setFormData({
      numero_documento: `DUP-${Math.floor(1000 + Math.random() * 9000)}`,
      cliente_nome: '',
      cliente_cnpj: '',
      valor: 0,
      data_emissao: hojeISO(),
      data_vencimento: somarDias(hojeISO(), 28),
      forma_pagamento: '',
      banco_emissor: '',
      observacoes: ''
    });
    setModalNovo(true);
  };

  const rotuloStatus = (s: string) => (s === 'PAGO' ? 'Recebido' : s === 'VENCIDO' ? 'Vencido' : 'A vencer');
  const semNenhum = titulos.length === 0;
  const vazioPorFiltro = !semNenhum && titulosFiltrados.length === 0;

  const estadoVazio = (
    <EstadoVazio
      titulo={vazioPorFiltro ? 'Nenhum título com esses filtros' : 'Nenhum título a receber'}
      texto={
        vazioPorFiltro
          ? 'Mude a situação ou a busca para ver os outros títulos.'
          : 'As duplicatas das vendas faturadas entram aqui sozinhas. Lance à mão só o que veio de fora do sistema.'
      }
      acao={
        vazioPorFiltro ? (
          <BotaoSecundario onClick={() => { setBusca(''); setFiltroStatus('TODOS'); }}>Limpar filtros</BotaoSecundario>
        ) : (
          <BotaoPrimario onClick={abrirNovo}><Plus className="w-4 h-4" /> Novo título</BotaoPrimario>
        )
      }
    />
  );

  return (
    <div className="relative h-full w-full flex flex-col bg-papel-2 text-tinta overflow-hidden">
      <FinanceiroNavTabs activeTab="financeiro_a_receber" onNavigate={onNavigate} />

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1700px]">
          <CabecalhoPagina
            titulo="Contas a receber"
            resumo={
              semNenhum ? 'Nenhum título lançado' : (
                <>
                  <span className="font-semibold text-tinta-2">{metricas.qtdAberto} {metricas.qtdAberto === 1 ? 'título em aberto' : 'títulos em aberto'}</span>
                  {metricas.qtdVencidos > 0 && <span className="text-st-vencido font-semibold"> · {metricas.qtdVencidos} {metricas.qtdVencidos === 1 ? 'vencido' : 'vencidos'}</span>}
                </>
              )
            }
            acoes={semNenhum ? undefined : (
              <BotaoPrimario onClick={abrirNovo} className="w-full sm:w-auto h-11 sm:h-9">
                <Plus className="w-4 h-4" /> Novo título
              </BotaoPrimario>
            )}
          />

          {!semNenhum && (
            <div className="px-4 sm:px-6 pb-4">
              <FaixaFin colunas="lg:grid-cols-[1.45fr_1fr_1fr]">
                <CardNumero destaque rotulo="Em aberto na carteira" unidade="R$" unidadeAntes valor={moedaSemSimbolo(metricas.emAberto)}
                  detalhe={`${metricas.qtdAberto} ${metricas.qtdAberto === 1 ? 'título' : 'títulos'}`} />
                <CardNumero rotulo="Vencido" unidade="R$" unidadeAntes valor={moedaSemSimbolo(metricas.valorVencido)}
                  detalhe={metricas.qtdVencidos > 0 ? `${metricas.qtdVencidos} para cobrar` : 'Nada atrasado'}
                  alerta={metricas.qtdVencidos > 0 ? 'vencido' : undefined}
                  onClick={metricas.qtdVencidos > 0 ? () => setFiltroStatus('VENCIDO') : undefined} />
                <CardNumero rotulo="Recebido no mês" unidade="R$" unidadeAntes valor={moedaSemSimbolo(metricas.recebidoMes)} />
              </FaixaFin>
            </div>
          )}

          {!semNenhum && (
            <BarraFiltros>
              <Segmentado<string>
                rotuloAria="Situação dos títulos"
                valor={filtroStatus}
                onChange={setFiltroStatus}
                opcoes={[
                  { valor: 'TODOS', rotulo: 'Todos', contagem: titulos.length },
                  { valor: 'EM_ABERTO', rotulo: 'A vencer', contagem: metricas.qtdAberto - metricas.qtdVencidos },
                  { valor: 'VENCIDO', rotulo: 'Vencidos', contagem: metricas.qtdVencidos },
                  { valor: 'PAGO', rotulo: 'Recebidos', contagem: metricas.qtdPagos },
                ]}
              />
              <CampoBusca valor={busca} onChange={setBusca} placeholder="Buscar cliente, documento ou CNPJ" className="w-full md:w-80" />
            </BarraFiltros>
          )}

          <div className="px-4 sm:px-6 pb-6">
            {titulosFiltrados.length === 0 ? (
              <div className="bg-papel border border-linha rounded-md">{estadoVazio}</div>
            ) : (
              <>
                <ListaCartoes>
                  {titulosFiltrados.map(item => (
                    <ItemCartao key={item.id}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[11.5px] text-cinza tabular-nums truncate">{item.numero_documento}{item.banco_emissor ? ` · ${item.banco_emissor}` : ''}</div>
                          <div className="text-[14px] font-bold text-tinta truncate">{item.cliente_nome}</div>
                        </div>
                        <StatusChip tom={tomTitulo(item.status)} className="shrink-0">{rotuloStatus(item.status)}</StatusChip>
                      </div>
                      <div className="flex items-end justify-between gap-2 mt-2">
                        <span className={`text-[12px] tabular-nums ${item.status === 'VENCIDO' ? 'text-st-vencido font-semibold' : 'text-cinza'}`}>
                          {item.status === 'PAGO' ? `Recebido em ${formatarDataBR(item.data_pagamento)}` : `Vence ${formatarDataBR(item.data_vencimento)}`}
                        </span>
                        <span className="text-[17px] font-extrabold tracking-[-0.01em] tabular-nums text-tinta">{formatarMoeda(item.valor)}</span>
                      </div>
                      {(item.status !== 'PAGO' || item.linha_digitavel) && (
                        <div className="flex gap-2 mt-2.5">
                          {item.linha_digitavel && (
                            <button type="button" onClick={() => handleCopiarLinha(item.linha_digitavel!, item.id)}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-md border border-linha-forte text-tinta-2 text-[13px] font-semibold active:bg-papel-3">
                              {copiadoId === item.id ? <Check className="w-4 h-4 text-st-pago" /> : <Copy className="w-4 h-4" />}
                              {copiadoId === item.id ? 'Copiado' : 'Copiar boleto'}
                            </button>
                          )}
                          {item.status !== 'PAGO' && (
                            <button type="button" onClick={() => handleBaixarTitulo(item.id, item.numero_documento)}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-md bg-eno-800 text-white text-[13px] font-semibold active:bg-eno-900">
                              <Check className="w-4 h-4" /> Dar baixa
                            </button>
                          )}
                        </div>
                      )}
                    </ItemCartao>
                  ))}
                </ListaCartoes>

                <TabelaDados className="hidden sm:block">
                  <thead className={tabela.thead}>
                    <tr>
                      <Th>Cliente e documento</Th>
                      <Th>Cobrança</Th>
                      <Th>Vencimento</Th>
                      <Th>Situação</Th>
                      <Th numero>Valor</Th>
                      <Th className="text-right">Ação</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {titulosFiltrados.map(item => (
                      <tr key={item.id} className={tabela.tr}>
                        <Td className="max-w-[320px]">
                          <div className="font-semibold text-tinta truncate">{item.cliente_nome}</div>
                          <div className="text-[11.5px] text-cinza tabular-nums truncate">
                            {item.numero_documento}{item.cliente_cnpj ? ` · ${item.cliente_cnpj}` : ''}
                          </div>
                        </Td>
                        <Td className="max-w-[260px]">
                          <div className="truncate">{item.banco_emissor || item.forma_pagamento || <span className="text-cinza-claro">—</span>}</div>
                          {item.linha_digitavel && (
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="text-[11px] text-cinza tabular-nums truncate">{item.linha_digitavel}</span>
                              <button type="button" onClick={() => handleCopiarLinha(item.linha_digitavel!, item.id)}
                                className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded text-cinza hover:bg-papel-3 hover:text-tinta cursor-pointer"
                                title="Copiar linha digitável" aria-label="Copiar linha digitável">
                                {copiadoId === item.id ? <Check className="w-3.5 h-3.5 text-st-pago" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          )}
                        </Td>
                        <Td className="whitespace-nowrap tabular-nums">
                          <div className={`font-semibold ${item.status === 'VENCIDO' ? 'text-st-vencido' : 'text-tinta'}`}>{formatarDataBR(item.data_vencimento)}</div>
                          <div className="text-[11.5px] text-cinza">Emitido {formatarDataBR(item.data_emissao)}</div>
                        </Td>
                        <Td><StatusChip tom={tomTitulo(item.status)}>{rotuloStatus(item.status)}</StatusChip></Td>
                        <Td numero><span className="font-bold text-tinta text-[13.5px]">{formatarMoeda(item.valor)}</span></Td>
                        <Td className="text-right whitespace-nowrap">
                          {item.status !== 'PAGO' ? (
                            <button type="button" onClick={() => handleBaixarTitulo(item.id, item.numero_documento)} className={botaoLinhaPrimario} title="Confirmar recebimento">
                              <Check className="w-3.5 h-3.5" /> Dar baixa
                            </button>
                          ) : (
                            <span className="text-[12px] text-cinza tabular-nums">Recebido {formatarDataBR(item.data_pagamento)}</span>
                          )}
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

      {modalNovo && (
        <ModalFolha
          titulo="Novo título a receber"
          subtitulo="Duplicata, fatura ou valor a receber de cliente"
          onFechar={() => setModalNovo(false)}
          onSubmit={handleSalvarNovo}
          largura="sm:max-w-2xl"
          rodape={
            <>
              <BotaoSecundario onClick={() => setModalNovo(false)}>Cancelar</BotaoSecundario>
              <BotaoPrimario type="submit"><Save className="w-4 h-4" /> Gravar título</BotaoPrimario>
            </>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo rotulo="Cliente" className="sm:col-span-2">
              <input type="text" required value={formData.cliente_nome}
                onChange={e => setFormData({ ...formData, cliente_nome: e.target.value })}
                placeholder="Razão social ou nome do cliente" className={campo} />
            </Campo>
            <Campo rotulo="Valor (R$)">
              <CampoNumero step="0.01" min={0} casas={2} ocultarZero required value={formData.valor}
                onChange={n => setFormData({ ...formData, valor: n })} placeholder="0,00" className={`${campo} font-semibold`} />
            </Campo>
            <Campo rotulo="Vencimento">
              <input type="date" required value={paraISO(formData.data_vencimento)}
                onChange={e => setFormData({ ...formData, data_vencimento: e.target.value })} className={campo} />
            </Campo>
            <Campo rotulo="Nº do documento">
              <input type="text" required value={formData.numero_documento}
                onChange={e => setFormData({ ...formData, numero_documento: e.target.value })}
                placeholder="DUP-4029 ou NF-e 891" className={campo} />
            </Campo>
            <Campo rotulo="CNPJ / CPF">
              <input type="text" inputMode="numeric" value={formData.cliente_cnpj}
                onChange={e => setFormData({ ...formData, cliente_cnpj: e.target.value })}
                placeholder="00.000.000/0000-00" className={campo} />
            </Campo>
            <Campo rotulo="Forma de pagamento">
              <input type="text" value={formData.forma_pagamento}
                onChange={e => setFormData({ ...formData, forma_pagamento: e.target.value })}
                placeholder="Boleto 30/60, TED, PIX" className={campo} />
            </Campo>
            <Campo rotulo="Banco da cobrança">
              <input type="text" value={formData.banco_emissor}
                onChange={e => setFormData({ ...formData, banco_emissor: e.target.value })}
                placeholder="Sicredi, Itaú, Banco do Brasil" className={campo} />
            </Campo>
          </div>
        </ModalFolha>
      )}
    </div>
  );
}
