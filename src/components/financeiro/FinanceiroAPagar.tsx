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
  ModalFolha, Campo, campo, FaixaFin, ListaCartoes, ItemCartao, tomTitulo, moedaSemSimbolo, botaoLinhaPrimario,
} from './finUi';
import {
  TituloPagar,
  carregarTitulosPagar,
  salvarTitulosPagar,
  statusEfetivoPagar,
  dataNoMesAtual,
  somarValores,
  formatarMoeda,
  registrarBaixaNoCaixa,
  conferirSaldoParaPagar
} from '../../data/financeiroData';
import { hojeISO, somarDias, paraISO, formatarDataBR, compararDatas } from '../../lib/datas';
import { FinanceiroNavTabs } from './FinanceiroNavTabs';

interface Props {
  onNavigate?: (tabId: string) => void;
}

export function FinanceiroAPagar({ onNavigate }: Props) {
  const [titulos, setTitulos] = useState<TituloPagar[]>([]);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  // Modal Novo
  const [modalNovo, setModalNovo] = useState(false);
  const [formData, setFormData] = useState({
    numero_documento: '',
    favorecido_nome: '',
    tipo_favorecido: 'Agricultor' as TituloPagar['tipo_favorecido'],
    categoria: 'Mandioca / Matéria-Prima' as TituloPagar['categoria'],
    valor: 0,
    data_emissao: hojeISO(),
    data_vencimento: '',
    forma_pagamento: 'PIX',
    chave_pix: '',
    observacoes: ''
  });

  // Status VENCIDO é calculado na exibição (não pago + vencimento anterior a hoje)
  const recarregar = () => {
    const lista = carregarTitulosPagar()
      .map(t => ({ ...t, status: statusEfetivoPagar(t) }))
      .sort((a, b) => compararDatas(a.data_vencimento, b.data_vencimento));
    setTitulos(lista);
  };

  useEffect(() => {
    recarregar();
    const handleUpdate = () => recarregar();
    window.addEventListener('financeiro_updated', handleUpdate);
    return () => window.removeEventListener('financeiro_updated', handleUpdate);
  }, []);

  const metricas = useMemo(() => {
    const pendentes = titulos.filter(t => t.status !== 'PAGO');
    const aPagar = somarValores(pendentes, t => t.valor);
    const pagoMes = somarValores(
      titulos.filter(t => t.status === 'PAGO' && dataNoMesAtual(t.data_pagamento)),
      t => t.valor
    );
    const qtdAPagar = pendentes.length;
    const vencidos = titulos.filter(t => t.status === 'VENCIDO');
    const qtdVencidos = vencidos.length;
    const valorVencido = somarValores(vencidos, t => t.valor);
    const qtdPagos = titulos.filter(t => t.status === 'PAGO').length;

    return { aPagar, pagoMes, qtdAPagar, qtdVencidos, valorVencido, qtdPagos };
  }, [titulos]);

  const titulosFiltrados = useMemo(() => {
    return titulos.filter(t => {
      const match =
        (t.favorecido_nome || '').toLowerCase().includes(busca.toLowerCase()) ||
        (t.numero_documento || '').toLowerCase().includes(busca.toLowerCase()) ||
        (t.categoria || '').toLowerCase().includes(busca.toLowerCase());

      if (!match) return false;
      if (filtroStatus !== 'TODOS' && t.status !== filtroStatus) return false;
      return true;
    });
  }, [titulos, busca, filtroStatus]);

  const handlePagarTitulo = (id: string, doc: string) => {
    if (confirm(`Confirmar liquidação do pagamento ${doc}?`)) {
      // Atualiza a partir do armazenamento (sem gravar o status calculado de exibição)
      const armazenados = carregarTitulosPagar();
      const alvo = armazenados.find(t => t.id === id);
      if (!alvo || alvo.status === 'PAGO') return;
      // Só liquida se o caixa tiver saldo para o pagamento
      const semSaldo = conferirSaldoParaPagar(alvo.valor);
      if (semSaldo) {
        alert(semSaldo);
        return;
      }
      const atualizados: TituloPagar[] = armazenados.map(t =>
        t.id === id ? { ...t, status: 'PAGO' as const, data_pagamento: hojeISO() } : t
      );
      salvarTitulosPagar(atualizados);
      // Saída do caixa (uma única vez por título)
      registrarBaixaNoCaixa(`pagar:${id}`, -alvo.valor, { descricao: `Pagamento ${alvo.numero_documento} - ${alvo.favorecido_nome}${alvo.categoria ? ` (${alvo.categoria})` : ''}` });
    }
  };

  const handleCopiarPix = (pix: string, id: string) => {
    navigator.clipboard.writeText(pix);
    setCopiadoId(id);
    setTimeout(() => setCopiadoId(null), 2000);
  };

  const handleSalvarNovo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!(formData.valor > 0)) {
      alert('Informe um valor maior que zero.');
      return;
    }
    const novo: TituloPagar = {
      id: `pag_${Date.now()}`,
      ...formData,
      data_emissao: paraISO(formData.data_emissao) || hojeISO(),
      data_vencimento: paraISO(formData.data_vencimento),
      status: 'A_PAGAR'
    };
    salvarTitulosPagar([novo, ...carregarTitulosPagar()]);
    setModalNovo(false);
  };

  const abrirNovo = () => {
    setFormData({
      numero_documento: `PAG-${Math.floor(1000 + Math.random() * 9000)}`,
      favorecido_nome: '',
      tipo_favorecido: 'Agricultor',
      categoria: 'Mandioca / Matéria-Prima',
      valor: 0,
      data_emissao: hojeISO(),
      data_vencimento: somarDias(hojeISO(), 7),
      forma_pagamento: 'PIX',
      chave_pix: '',
      observacoes: ''
    });
    setModalNovo(true);
  };

  const rotuloStatus = (s: string) => (s === 'PAGO' ? 'Pago' : s === 'VENCIDO' ? 'Vencido' : 'A vencer');
  const semNenhum = titulos.length === 0;
  const vazioPorFiltro = !semNenhum && titulosFiltrados.length === 0;

  const estadoVazio = (
    <EstadoVazio
      titulo={vazioPorFiltro ? 'Nenhum título com esses filtros' : 'Nenhuma conta a pagar'}
      texto={
        vazioPorFiltro
          ? 'Mude a situação ou a busca para ver os outros títulos.'
          : 'Compras de mandioca, notas de entrada e despesas a prazo entram aqui. Lance à mão o que veio de fora do sistema.'
      }
      acao={
        vazioPorFiltro ? (
          <BotaoSecundario onClick={() => { setBusca(''); setFiltroStatus('TODOS'); }}>Limpar filtros</BotaoSecundario>
        ) : (
          <BotaoPrimario onClick={abrirNovo}><Plus className="w-4 h-4" /> Nova conta</BotaoPrimario>
        )
      }
    />
  );

  return (
    <div className="relative h-full w-full flex flex-col bg-papel-2 text-tinta overflow-hidden">
      <FinanceiroNavTabs activeTab="financeiro_a_pagar" onNavigate={onNavigate} />

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1700px]">
          <CabecalhoPagina
            titulo="Contas a pagar"
            resumo={
              semNenhum ? 'Nenhum título lançado' : (
                <>
                  <span className="font-semibold text-tinta-2">{metricas.qtdAPagar} {metricas.qtdAPagar === 1 ? 'título pendente' : 'títulos pendentes'}</span>
                  {metricas.qtdVencidos > 0 && <span className="text-st-vencido font-semibold"> · {metricas.qtdVencidos} {metricas.qtdVencidos === 1 ? 'vencido' : 'vencidos'}</span>}
                </>
              )
            }
            acoes={semNenhum ? undefined : (
              <BotaoPrimario onClick={abrirNovo} className="w-full sm:w-auto h-11 sm:h-9">
                <Plus className="w-4 h-4" /> Nova conta
              </BotaoPrimario>
            )}
          />

          {!semNenhum && (
            <div className="px-4 sm:px-6 pb-4">
              <FaixaFin colunas="lg:grid-cols-[1.45fr_1fr_1fr]">
                <CardNumero destaque rotulo="A pagar" unidade="R$" unidadeAntes valor={moedaSemSimbolo(metricas.aPagar)}
                  detalhe={`${metricas.qtdAPagar} ${metricas.qtdAPagar === 1 ? 'título' : 'títulos'}`} />
                <CardNumero rotulo="Vencido" unidade="R$" unidadeAntes valor={moedaSemSimbolo(metricas.valorVencido)}
                  detalhe={metricas.qtdVencidos > 0 ? `${metricas.qtdVencidos} em atraso` : 'Nada atrasado'}
                  alerta={metricas.qtdVencidos > 0 ? 'vencido' : undefined}
                  onClick={metricas.qtdVencidos > 0 ? () => setFiltroStatus('VENCIDO') : undefined} />
                <CardNumero rotulo="Pago no mês" unidade="R$" unidadeAntes valor={moedaSemSimbolo(metricas.pagoMes)} />
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
                  { valor: 'A_PAGAR', rotulo: 'A vencer', contagem: metricas.qtdAPagar - metricas.qtdVencidos },
                  { valor: 'VENCIDO', rotulo: 'Vencidos', contagem: metricas.qtdVencidos },
                  { valor: 'PAGO', rotulo: 'Pagos', contagem: metricas.qtdPagos },
                ]}
              />
              <CampoBusca valor={busca} onChange={setBusca} placeholder="Buscar favorecido, documento ou categoria" className="w-full md:w-80" />
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
                          <div className="text-[11.5px] text-cinza tabular-nums truncate">{item.numero_documento} · {item.categoria}</div>
                          <div className="text-[14px] font-bold text-tinta truncate">{item.favorecido_nome}</div>
                        </div>
                        <StatusChip tom={tomTitulo(item.status)} className="shrink-0">{rotuloStatus(item.status)}</StatusChip>
                      </div>
                      <div className="flex items-end justify-between gap-2 mt-2">
                        <span className={`text-[12px] tabular-nums ${item.status === 'VENCIDO' ? 'text-st-vencido font-semibold' : 'text-cinza'}`}>
                          {item.status === 'PAGO' ? `Pago em ${formatarDataBR(item.data_pagamento)}` : `Vence ${formatarDataBR(item.data_vencimento)}`}
                        </span>
                        <span className="text-[17px] font-extrabold tracking-[-0.01em] tabular-nums text-tinta">{formatarMoeda(item.valor)}</span>
                      </div>
                      {(item.status !== 'PAGO' || item.chave_pix) && (
                        <div className="flex gap-2 mt-2.5">
                          {item.chave_pix && (
                            <button type="button" onClick={() => handleCopiarPix(item.chave_pix!, item.id)}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-md border border-linha-forte text-tinta-2 text-[13px] font-semibold active:bg-papel-3">
                              {copiadoId === item.id ? <Check className="w-4 h-4 text-st-pago" /> : <Copy className="w-4 h-4" />}
                              {copiadoId === item.id ? 'Copiado' : 'Copiar PIX'}
                            </button>
                          )}
                          {item.status !== 'PAGO' && (
                            <button type="button" onClick={() => handlePagarTitulo(item.id, item.numero_documento)}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-md bg-eno-800 text-white text-[13px] font-semibold active:bg-eno-900">
                              <Check className="w-4 h-4" /> Confirmar pagamento
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
                      <Th>Favorecido e documento</Th>
                      <Th>Categoria</Th>
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
                          <div className="font-semibold text-tinta truncate">{item.favorecido_nome}</div>
                          <div className="text-[11.5px] text-cinza tabular-nums truncate">{item.numero_documento} · {item.tipo_favorecido}</div>
                        </Td>
                        <Td className="max-w-[260px]">
                          <div className="truncate">{item.categoria}</div>
                          {item.chave_pix && (
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="text-[11px] text-cinza tabular-nums truncate">PIX {item.chave_pix}</span>
                              <button type="button" onClick={() => handleCopiarPix(item.chave_pix!, item.id)}
                                className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded text-cinza hover:bg-papel-3 hover:text-tinta cursor-pointer"
                                title="Copiar chave PIX" aria-label="Copiar chave PIX">
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
                            <button type="button" onClick={() => handlePagarTitulo(item.id, item.numero_documento)} className={botaoLinhaPrimario} title="Confirmar pagamento realizado">
                              <Check className="w-3.5 h-3.5" /> Pagar
                            </button>
                          ) : (
                            <span className="text-[12px] text-cinza tabular-nums">Pago {formatarDataBR(item.data_pagamento)}</span>
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
          titulo="Nova conta a pagar"
          subtitulo="Obrigação com agricultor, fornecedor ou prestador"
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
            <Campo rotulo="Favorecido (agricultor ou fornecedor)" className="sm:col-span-2">
              <input type="text" required value={formData.favorecido_nome}
                onChange={e => setFormData({ ...formData, favorecido_nome: e.target.value })}
                placeholder="Nome do produtor ou razão social" className={campo} />
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
                placeholder="NF 1042 ou PED-982" className={campo} />
            </Campo>
            <Campo rotulo="Categoria de custo">
              <select value={formData.categoria}
                onChange={e => setFormData({ ...formData, categoria: e.target.value as any })}
                className={`${campo} cursor-pointer`}>
                <option value="Mandioca / Matéria-Prima">Mandioca / Matéria-Prima</option>
                <option value="Lenha & Biomassa">Lenha & Biomassa</option>
                <option value="Embalagens">Embalagens</option>
                <option value="Energia / Concessionárias">Energia / Concessionárias</option>
                <option value="Manutenção Mecânica">Manutenção Mecânica</option>
                <option value="Fretes">Fretes</option>
                <option value="Comissão de RCA">Comissão de RCA</option>
              </select>
            </Campo>
            <Campo rotulo="Forma de pagamento">
              <input type="text" value={formData.forma_pagamento}
                onChange={e => setFormData({ ...formData, forma_pagamento: e.target.value })}
                placeholder="Boleto, TED, PIX" className={campo} />
            </Campo>
            <Campo rotulo="Chave PIX (opcional)">
              <input type="text" value={formData.chave_pix}
                onChange={e => setFormData({ ...formData, chave_pix: e.target.value })}
                placeholder="CNPJ, CPF, telefone ou e-mail" className={campo} />
            </Campo>
          </div>
        </ModalFolha>
      )}
    </div>
  );
}
