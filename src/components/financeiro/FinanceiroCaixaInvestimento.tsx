import React, { useState, useEffect, useMemo } from 'react';
import { Plus, ArrowDownLeft, ArrowLeftRight, SlidersHorizontal, Save } from 'lucide-react';
import { CabecalhoPagina, BotaoPrimario, BotaoSecundario } from '../ui/CabecalhoPagina';
import { SeletorFiltro } from '../ui/BarraFiltros';
import { Th, Td, tabela } from '../ui/TabelaDados';
import { StatusChip, type TomStatus } from '../ui/StatusChip';
import { CardNumero } from '../ui/CardNumero';
import { EstadoVazio } from '../ui/EstadoVazio';
import { ModalFolha, Campo, campo, FaixaFin, moedaSemSimbolo } from './finUi';
import {
  CaixaInvestimento,
  carregarCaixaInvestimento,
  salvarCaixaInvestimento,
  formatarMoeda,
  numeroSeguro,
  carregarDespesas,
  salvarDespesas,
  DespesaOperacional,
  registrarBaixaNoCaixa,
  transferirEntreFundosCaixa,
  carregarMovimentosCaixa,
  MovimentoCaixa,
  FundoCaixa,
  ROTULO_FUNDO_CAIXA,
  conferirSaldoParaPagar,
  ORIGENS_MOVIMENTO_CAIXA
} from '../../data/financeiroData';
import { hojeISO, paraISO, formatarDataBR, mesAtualKey } from '../../lib/datas';
import { FinanceiroNavTabs } from './FinanceiroNavTabs';

interface Props {
  onNavigate?: (tabId: string) => void;
}

export function FinanceiroCaixaInvestimento({ onNavigate }: Props) {
  const [caixa, setCaixa] = useState<CaixaInvestimento>(() => carregarCaixaInvestimento());
  const [movimentos, setMovimentos] = useState<MovimentoCaixa[]>(() => carregarMovimentosCaixa());
  const [filtroMes, setFiltroMes] = useState<string>(() => mesAtualKey());
  const [filtroOrigem, setFiltroOrigem] = useState<string>('TODAS');
  // Saldo inicial / aporte e ajuste manual
  const [modalMovimento, setModalMovimento] = useState<'INICIAL' | 'AJUSTE' | null>(null);
  const [formMov, setFormMov] = useState({
    valor: '',
    fundo: 'saldo_disponivel_industrial' as FundoCaixa,
    sentido: 'ENTRADA' as 'ENTRADA' | 'SAIDA',
    descricao: '',
    data: hojeISO()
  });
  const [modalNovoInvest, setModalNovoInvest] = useState(false);
  const [modalTransferencia, setModalTransferencia] = useState(false);

  // Form para novo projeto de investimento
  const [formInvest, setFormInvest] = useState({
    titulo: '',
    valor: '',
    categoria: 'Modernização de Maquinário',
    data: new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
    status: 'PLANEJADO' as 'CONCLUIDO' | 'EM_ANDAMENTO' | 'PLANEJADO',
    fonte: 'saldo_disponivel_industrial' as FundoCaixa | 'NENHUM'
  });

  // Form para transferência entre fundos
  const [formTransf, setFormTransf] = useState({
    origem: 'saldo_disponivel_industrial' as 'saldo_disponivel_industrial' | 'fundo_reserva_safra' | 'fundo_modernizacao_maquinario',
    destino: 'fundo_reserva_safra' as 'saldo_disponivel_industrial' | 'fundo_reserva_safra' | 'fundo_modernizacao_maquinario',
    valor: ''
  });

  useEffect(() => {
    const handleUpdate = () => {
      setCaixa(carregarCaixaInvestimento());
      setMovimentos(carregarMovimentosCaixa());
    };
    handleUpdate();
    window.addEventListener('financeiro_updated', handleUpdate);
    window.addEventListener('sistema_reset_updated', handleUpdate);
    return () => {
      window.removeEventListener('financeiro_updated', handleUpdate);
      window.removeEventListener('sistema_reset_updated', handleUpdate);
    };
  }, []);

  const totalPatrimonioLiquido =
    numeroSeguro(caixa.saldo_disponivel_industrial) +
    numeroSeguro(caixa.fundo_reserva_safra) +
    numeroSeguro(caixa.fundo_modernizacao_maquinario);

  // Extrato filtrado (mês AAAA-MM e origem), do mais recente para o mais antigo
  const movimentosFiltrados = useMemo(() => {
    return movimentos
      .filter(m => (!filtroMes || String(m.data || '').slice(0, 7) === filtroMes) && (filtroOrigem === 'TODAS' || m.origem === filtroOrigem))
      .slice()
      .reverse();
  }, [movimentos, filtroMes, filtroOrigem]);

  // Entradas/saídas do mês (transferência entre fundos não é entrada nem saída da empresa)
  const resumoMes = useMemo(() => {
    const doMes = movimentos.filter(m => String(m.data || '').slice(0, 7) === filtroMes && m.origem !== 'Transferência');
    const entradas = doMes.filter(m => m.tipo === 'ENTRADA').reduce((acc, m) => acc + numeroSeguro(m.valor), 0);
    const saidas = doMes.filter(m => m.tipo === 'SAIDA').reduce((acc, m) => acc + numeroSeguro(m.valor), 0);
    return { entradas, saidas, resultado: entradas - saidas };
  }, [movimentos, filtroMes]);

  const handleSalvarInvestimento = (e: React.FormEvent) => {
    e.preventDefault();
    const valor = numeroSeguro(formInvest.valor);
    if (!formInvest.titulo || !(valor > 0)) {
      alert('Informe o título e um valor maior que zero.');
      return;
    }

    const id = `inv_${Date.now()}`;
    const fonte = formInvest.fonte;
    // Investimento debitado só sai se o fundo escolhido tiver saldo
    if (fonte !== 'NENHUM') {
      const semSaldo = conferirSaldoParaPagar(valor, 0, fonte);
      if (semSaldo) {
        alert(semSaldo);
        return;
      }
    }
    const despesaId = fonte !== 'NENHUM' ? `desp_inv_${id}` : undefined;
    const novoProjeto = {
      id,
      data: formInvest.data,
      titulo: formInvest.titulo,
      valor,
      categoria: formInvest.categoria,
      status: formInvest.status,
      ...(despesaId ? { despesa_id: despesaId, fundo_origem: fonte } : {})
    };
    const atual = carregarCaixaInvestimento();
    salvarCaixaInvestimento({ ...atual, investimentos_recentes: [novoProjeto, ...atual.investimentos_recentes] });

    // Investimento debitado: vira despesa paga (categoria Investimento) e sai do fundo escolhido.
    // A chave do caixa é a da própria despesa: excluir a despesa estorna o mesmo valor (sem contar duas vezes).
    if (despesaId && fonte !== 'NENHUM') {
      const descricao = `[Investimento] ${formInvest.titulo} - ${formInvest.categoria}`;
      const despesa: DespesaOperacional & Record<string, unknown> = {
        id: despesaId,
        tipo_despesa: 'REALIZADA',
        status_despesa: 'PAGO',
        investimento_id: id,
        data: hojeISO(),
        categoria: 'Investimento',
        descricao,
        valor,
        setor: 'Fábrica & Moagem',
        responsavel: 'Diretoria',
        forma_pagamento: ROTULO_FUNDO_CAIXA[fonte]
      };
      salvarDespesas([despesa, ...carregarDespesas()]);
      registrarBaixaNoCaixa(`despesa:${despesaId}`, -valor, { origem: 'Investimento', descricao, fundo: fonte });
    }

    setCaixa(carregarCaixaInvestimento());
    setMovimentos(carregarMovimentosCaixa());
    setModalNovoInvest(false);
    setFormInvest({
      titulo: '',
      valor: '',
      categoria: 'Modernização de Maquinário',
      data: new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
      status: 'PLANEJADO',
      fonte: 'saldo_disponivel_industrial'
    });
  };

  const abrirModalMovimento = (modo: 'INICIAL' | 'AJUSTE') => {
    setFormMov({ valor: '', fundo: 'saldo_disponivel_industrial', sentido: 'ENTRADA', descricao: '', data: hojeISO() });
    setModalMovimento(modo);
  };

  const handleSalvarMovimento = (e: React.FormEvent) => {
    e.preventDefault();
    const v = numeroSeguro(formMov.valor);
    if (!(v > 0)) {
      alert('Informe um valor maior que zero.');
      return;
    }
    if (modalMovimento === 'AJUSTE' && !formMov.descricao.trim()) {
      alert('Informe o motivo do ajuste.');
      return;
    }
    const inicial = modalMovimento === 'INICIAL';
    const delta = inicial || formMov.sentido === 'ENTRADA' ? v : -v;
    registrarBaixaNoCaixa(`${inicial ? 'inicial' : 'ajuste'}:${Date.now()}`, delta, {
      origem: inicial ? 'Saldo inicial' : 'Ajuste',
      descricao: formMov.descricao.trim() || (inicial ? 'Saldo inicial / aporte' : 'Ajuste'),
      data: paraISO(formMov.data) || hojeISO(),
      fundo: formMov.fundo
    });
    setCaixa(carregarCaixaInvestimento());
    setMovimentos(carregarMovimentosCaixa());
    setModalMovimento(null);
  };

  const handleEfetuarTransferencia = (e: React.FormEvent) => {
    e.preventDefault();
    const v = numeroSeguro(formTransf.valor);
    if (!v || v <= 0) return;
    if (formTransf.origem === formTransf.destino) {
      alert('Origem e destino devem ser diferentes.');
      return;
    }

    if (caixa[formTransf.origem] < v) {
      alert('Saldo insuficiente na conta de origem selecionada.');
      return;
    }

    // Grava no extrato (saída da origem + entrada no destino)
    transferirEntreFundosCaixa(formTransf.origem, formTransf.destino, v);
    setCaixa(carregarCaixaInvestimento());
    setMovimentos(carregarMovimentosCaixa());
    setModalTransferencia(false);
    setFormTransf({
      origem: 'saldo_disponivel_industrial',
      destino: 'fundo_reserva_safra',
      valor: ''
    });
  };

  const tomInvest = (s: string): TomStatus => (s === 'CONCLUIDO' ? 'pago' : s === 'EM_ANDAMENTO' ? 'producao' : 'aguardando');
  const rotuloInvest = (s: string) => (s === 'CONCLUIDO' ? 'Concluído' : s === 'EM_ANDAMENTO' ? 'Em execução' : 'Planejado');
  const nomeMes = (() => {
    const [a, m] = String(filtroMes || '').split('-').map(Number);
    if (!a || !m) return 'todo o período';
    return new Date(a, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  })();

  return (
    <div className="relative h-full w-full flex flex-col bg-papel-2 text-tinta overflow-hidden">
      <FinanceiroNavTabs activeTab="financeiro_caixa_investimento" onNavigate={onNavigate} />

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1700px]">
          <CabecalhoPagina
            titulo="Caixa e investimentos"
            resumo={
              <>
                <span className="font-semibold text-tinta-2">Patrimônio {formatarMoeda(totalPatrimonioLiquido)}</span>
                <span> · caixa, reserva de safra e modernização</span>
              </>
            }
            acoes={
              <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:w-auto">
                <BotaoSecundario onClick={() => abrirModalMovimento('AJUSTE')} className="h-11 sm:h-9">
                  <SlidersHorizontal className="w-4 h-4" /> Ajuste
                </BotaoSecundario>
                <BotaoSecundario onClick={() => setModalTransferencia(true)} className="h-11 sm:h-9">
                  <ArrowLeftRight className="w-4 h-4" /> Transferir
                </BotaoSecundario>
                <BotaoSecundario onClick={() => setModalNovoInvest(true)} className="h-11 sm:h-9">
                  <Plus className="w-4 h-4" /> Investimento
                </BotaoSecundario>
                <BotaoPrimario onClick={() => abrirModalMovimento('INICIAL')} className="h-11 sm:h-9">
                  <ArrowDownLeft className="w-4 h-4" /> Aporte
                </BotaoPrimario>
              </div>
            }
          />

          <div className="px-4 sm:px-6 pb-8 space-y-5">
            {/* Fundos */}
            <FaixaFin colunas="lg:grid-cols-[1.45fr_1fr_1fr]">
              <CardNumero destaque rotulo="Caixa operacional" unidade="R$" unidadeAntes
                valor={moedaSemSimbolo(numeroSeguro(caixa.saldo_disponivel_industrial))}
                detalhe="Liquidez imediata · contas movimento"
                alerta={numeroSeguro(caixa.saldo_disponivel_industrial) <= 0 ? 'vencido' : undefined} />
              <CardNumero rotulo="Reserva de safra" unidade="R$" unidadeAntes
                valor={moedaSemSimbolo(numeroSeguro(caixa.fundo_reserva_safra))}
                detalhe="Compra à vista no pico de moagem" />
              <CardNumero rotulo="Modernização" unidade="R$" unidadeAntes
                valor={moedaSemSimbolo(numeroSeguro(caixa.fundo_modernizacao_maquinario))}
                detalhe={`Rende ${formatarMoeda(caixa.rendimento_mensal_estimado)}/mês`} />
            </FaixaFin>

            {/* Extrato */}
            <section className="bg-papel border border-linha rounded-md min-w-0">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between px-4 pt-3.5 pb-3 border-b border-linha">
                <div className="min-w-0">
                  <h2 className="text-[15px] font-bold tracking-[-0.01em] text-tinta">Extrato do caixa</h2>
                  <p className="text-[12px] text-cinza">Cada entrada e saída, com a origem e o saldo depois dela.</p>
                </div>
                <div className="grid grid-cols-2 gap-2 md:flex">
                  <input
                    type="month"
                    value={filtroMes}
                    onChange={e => setFiltroMes(e.target.value)}
                    aria-label="Mês do extrato"
                    className="h-10 sm:h-8 min-w-0 rounded-md border border-linha-forte bg-papel px-2.5 text-[13px] font-medium text-tinta-2 tabular-nums focus:outline-none focus:border-eno-700"
                  />
                  <SeletorFiltro value={filtroOrigem} onChange={e => setFiltroOrigem(e.target.value)} aria-label="Origem do movimento" className="h-10 sm:h-8 min-w-0">
                    <option value="TODAS">Todas as origens</option>
                    {ORIGENS_MOVIMENTO_CAIXA.map(o => <option key={o} value={o}>{o}</option>)}
                  </SeletorFiltro>
                </div>
              </div>

              <dl className="grid grid-cols-2 md:grid-cols-4 gap-px bg-linha border-b border-linha">
                <div className="bg-papel px-4 py-3 min-w-0">
                  <dt className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-cinza">Entradas</dt>
                  <dd className="mt-1 text-[16px] font-extrabold tabular-nums text-st-pago truncate">{formatarMoeda(resumoMes.entradas)}</dd>
                </div>
                <div className="bg-papel px-4 py-3 min-w-0">
                  <dt className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-cinza">Saídas</dt>
                  <dd className="mt-1 text-[16px] font-extrabold tabular-nums text-st-vencido truncate">{formatarMoeda(resumoMes.saidas)}</dd>
                </div>
                <div className="bg-papel px-4 py-3 min-w-0">
                  <dt className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-cinza">Resultado</dt>
                  <dd className={`mt-1 text-[16px] font-extrabold tabular-nums truncate ${resumoMes.resultado < 0 ? 'text-st-vencido' : 'text-tinta'}`}>{formatarMoeda(resumoMes.resultado)}</dd>
                </div>
                <div className="bg-papel px-4 py-3 min-w-0">
                  <dt className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-cinza">Saldo do caixa</dt>
                  <dd className="mt-1 text-[16px] font-extrabold tabular-nums text-tinta truncate">{formatarMoeda(caixa.saldo_disponivel_industrial)}</dd>
                </div>
              </dl>

              {movimentosFiltrados.length === 0 ? (
                <EstadoVazio
                  titulo={`Nenhuma movimentação em ${nomeMes}`}
                  texto={movimentos.length === 0
                    ? 'Comece lançando o saldo inicial do caixa. Depois, pagamentos, recebimentos e despesas pagas entram aqui sozinhos.'
                    : 'Escolha outro mês ou outra origem para ver o extrato.'}
                  acao={movimentos.length === 0
                    ? <BotaoPrimario onClick={() => abrirModalMovimento('INICIAL')}><ArrowDownLeft className="w-4 h-4" /> Lançar saldo inicial</BotaoPrimario>
                    : undefined}
                />
              ) : (
                <>
                  <ul className="sm:hidden">
                    {movimentosFiltrados.map(m => (
                      <li key={m.id} className="px-4 py-3 border-b border-linha last:border-b-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-[11.5px] text-cinza tabular-nums truncate">{formatarDataBR(m.data)} · {m.origem} · {ROTULO_FUNDO_CAIXA[m.fundo] || m.fundo}</div>
                            <div className="text-[13.5px] font-semibold text-tinta line-clamp-2">{m.descricao}</div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className={`text-[15px] font-extrabold tabular-nums whitespace-nowrap ${m.tipo === 'ENTRADA' ? 'text-st-pago' : 'text-st-vencido'}`}>
                              {m.tipo === 'ENTRADA' ? '+' : '−'} {formatarMoeda(m.valor)}
                            </div>
                            <div className="text-[11.5px] text-cinza tabular-nums whitespace-nowrap">saldo {formatarMoeda(m.saldo_apos)}</div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="hidden sm:block overflow-x-auto">
                    <table className={tabela.table}>
                      <thead className={tabela.thead}>
                        <tr>
                          <Th>Data</Th>
                          <Th>Origem</Th>
                          <Th>Descrição</Th>
                          <Th>Fundo</Th>
                          <Th numero>Valor</Th>
                          <Th numero>Saldo após</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {movimentosFiltrados.map(m => (
                          <tr key={m.id} className={tabela.tr}>
                            <Td className="whitespace-nowrap tabular-nums">{formatarDataBR(m.data)}</Td>
                            <Td className="whitespace-nowrap">{m.origem}</Td>
                            <Td className="text-tinta">{m.descricao}</Td>
                            <Td className="whitespace-nowrap text-cinza">{ROTULO_FUNDO_CAIXA[m.fundo] || m.fundo}</Td>
                            <Td numero>
                              <span className={`font-bold ${m.tipo === 'ENTRADA' ? 'text-st-pago' : 'text-st-vencido'}`}>
                                {m.tipo === 'ENTRADA' ? '+' : '−'} {formatarMoeda(m.valor)}
                              </span>
                            </Td>
                            <Td numero className="text-tinta">{formatarMoeda(m.saldo_apos)}</Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>

            {/* Investimentos */}
            <section className="bg-papel border border-linha rounded-md min-w-0">
              <div className="flex items-baseline justify-between gap-3 px-4 pt-3.5 pb-3 border-b border-linha">
                <div className="min-w-0">
                  <h2 className="text-[15px] font-bold tracking-[-0.01em] text-tinta">Projetos de investimento</h2>
                  <p className="text-[12px] text-cinza">Máquinas, caldeiras, automação e melhorias da fecularia.</p>
                </div>
                <span className="shrink-0 text-[12px] text-cinza tabular-nums">
                  {caixa.investimentos_recentes.length} {caixa.investimentos_recentes.length === 1 ? 'projeto' : 'projetos'}
                </span>
              </div>
              {caixa.investimentos_recentes.length === 0 ? (
                <EstadoVazio
                  titulo="Nenhum projeto de investimento"
                  texto="Cadastre a compra de um equipamento ou obra. Se escolher um fundo, o valor sai dele como despesa de investimento."
                  acao={<BotaoSecundario onClick={() => setModalNovoInvest(true)}><Plus className="w-4 h-4" /> Novo investimento</BotaoSecundario>}
                />
              ) : (
                <>
                  <ul className="sm:hidden">
                    {caixa.investimentos_recentes.map(inv => (
                      <li key={inv.id} className="px-4 py-3 border-b border-linha last:border-b-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-[11.5px] text-cinza truncate">{inv.data} · {inv.categoria}</div>
                            <div className="text-[14px] font-bold text-tinta line-clamp-2">{inv.titulo}</div>
                          </div>
                          <StatusChip tom={tomInvest(inv.status)} className="shrink-0">{rotuloInvest(inv.status)}</StatusChip>
                        </div>
                        <div className="mt-1.5 text-right text-[16px] font-extrabold tabular-nums text-tinta">{formatarMoeda(inv.valor)}</div>
                      </li>
                    ))}
                  </ul>
                  <div className="hidden sm:block overflow-x-auto">
                    <table className={tabela.table}>
                      <thead className={tabela.thead}>
                        <tr>
                          <Th>Período</Th>
                          <Th>Projeto</Th>
                          <Th>Categoria</Th>
                          <Th>Situação</Th>
                          <Th numero>Valor</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {caixa.investimentos_recentes.map(inv => (
                          <tr key={inv.id} className={tabela.tr}>
                            <Td className="whitespace-nowrap">{inv.data}</Td>
                            <Td className="font-semibold text-tinta">{inv.titulo}</Td>
                            <Td>{inv.categoria}</Td>
                            <Td><StatusChip tom={tomInvest(inv.status)}>{rotuloInvest(inv.status)}</StatusChip></Td>
                            <Td numero><span className="font-bold text-tinta">{formatarMoeda(inv.valor)}</span></Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          </div>
        </div>
      </div>

      {/* MODAL NOVO PROJETO DE INVESTIMENTO */}
      {modalNovoInvest && (
        <ModalFolha
          titulo="Novo investimento"
          subtitulo="Máquina, obra ou melhoria. Se debitar de um fundo, vira despesa paga de Investimento."
          onFechar={() => setModalNovoInvest(false)}
          onSubmit={handleSalvarInvestimento}
          largura="sm:max-w-2xl"
          rodape={
            <>
              <BotaoSecundario onClick={() => setModalNovoInvest(false)}>Cancelar</BotaoSecundario>
              <BotaoPrimario type="submit"><Save className="w-4 h-4" /> Salvar projeto</BotaoPrimario>
            </>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo rotulo="Projeto *" className="sm:col-span-2">
              <input type="text" required value={formInvest.titulo}
                onChange={e => setFormInvest({ ...formInvest, titulo: e.target.value })}
                placeholder="Secador flash dryer adicional 20 t/h" className={campo} />
            </Campo>
            <Campo rotulo="Valor estimado (R$) *">
              <input type="number" step="0.01" required inputMode="decimal" value={formInvest.valor}
                onChange={e => setFormInvest({ ...formInvest, valor: e.target.value })}
                placeholder="150000,00" className={`${campo} font-semibold`} />
            </Campo>
            <Campo rotulo="Período">
              <input type="text" value={formInvest.data}
                onChange={e => setFormInvest({ ...formInvest, data: e.target.value })}
                placeholder="abril de 2026" className={campo} />
            </Campo>
            <Campo rotulo="Categoria">
              <select value={formInvest.categoria} onChange={e => setFormInvest({ ...formInvest, categoria: e.target.value })} className={`${campo} cursor-pointer`}>
                <option value="Modernização de Maquinário">Modernização de Maquinário</option>
                <option value="Eficiência Energética & Vapor">Eficiência Energética & Vapor</option>
                <option value="Automação Fabril & Pesagem">Automação Fabril & Pesagem</option>
                <option value="Energia Solar Renovável">Energia Solar Renovável</option>
                <option value="Armazenamento & Silos">Armazenamento & Silos</option>
                <option value="Tratamento de Efluentes & Sustentabilidade">Tratamento de Efluentes</option>
              </select>
            </Campo>
            <Campo rotulo="Situação">
              <select value={formInvest.status} onChange={e => setFormInvest({ ...formInvest, status: e.target.value as any })} className={`${campo} cursor-pointer`}>
                <option value="PLANEJADO">Planejado</option>
                <option value="EM_ANDAMENTO">Em execução</option>
                <option value="CONCLUIDO">Concluído</option>
              </select>
            </Campo>
            <Campo rotulo="Sai de" dica="O valor só sai se o fundo tiver saldo." className="sm:col-span-2">
              <select value={formInvest.fonte} onChange={e => setFormInvest({ ...formInvest, fonte: e.target.value as FundoCaixa | 'NENHUM' })} className={`${campo} cursor-pointer`}>
                <option value="saldo_disponivel_industrial">Caixa industrial (disp. {formatarMoeda(caixa.saldo_disponivel_industrial)})</option>
                <option value="fundo_reserva_safra">Reserva de safra (disp. {formatarMoeda(caixa.fundo_reserva_safra)})</option>
                <option value="fundo_modernizacao_maquinario">Modernização (disp. {formatarMoeda(caixa.fundo_modernizacao_maquinario)})</option>
                <option value="NENHUM">Não debitar agora (só planejamento)</option>
              </select>
            </Campo>
          </div>
        </ModalFolha>
      )}

      {/* MODAL TRANSFERÊNCIA ENTRE FUNDOS */}
      {modalTransferencia && (
        <ModalFolha
          titulo="Transferir entre fundos"
          subtitulo="Remanejamento interno: não conta como entrada nem saída da empresa"
          onFechar={() => setModalTransferencia(false)}
          onSubmit={handleEfetuarTransferencia}
          largura="sm:max-w-xl"
          rodape={
            <>
              <BotaoSecundario onClick={() => setModalTransferencia(false)}>Cancelar</BotaoSecundario>
              <BotaoPrimario type="submit"><ArrowLeftRight className="w-4 h-4" /> Confirmar transferência</BotaoPrimario>
            </>
          }
        >
          <div className="grid grid-cols-1 gap-4">
            <Campo rotulo="De">
              <select value={formTransf.origem} onChange={e => setFormTransf({ ...formTransf, origem: e.target.value as any })} className={`${campo} cursor-pointer`}>
                <option value="saldo_disponivel_industrial">Caixa industrial (disp. {formatarMoeda(caixa.saldo_disponivel_industrial)})</option>
                <option value="fundo_reserva_safra">Reserva de safra (disp. {formatarMoeda(caixa.fundo_reserva_safra)})</option>
                <option value="fundo_modernizacao_maquinario">Modernização (disp. {formatarMoeda(caixa.fundo_modernizacao_maquinario)})</option>
              </select>
            </Campo>
            <Campo rotulo="Para">
              <select value={formTransf.destino} onChange={e => setFormTransf({ ...formTransf, destino: e.target.value as any })} className={`${campo} cursor-pointer`}>
                <option value="fundo_reserva_safra">Reserva de safra</option>
                <option value="saldo_disponivel_industrial">Caixa operacional industrial</option>
                <option value="fundo_modernizacao_maquinario">Modernização</option>
              </select>
            </Campo>
            <Campo rotulo="Valor (R$) *">
              <input type="number" step="0.01" required inputMode="decimal" value={formTransf.valor}
                onChange={e => setFormTransf({ ...formTransf, valor: e.target.value })}
                placeholder="0,00" className={`${campo} font-semibold`} />
            </Campo>
          </div>
        </ModalFolha>
      )}

      {/* MODAL SALDO INICIAL / APORTE E AJUSTE */}
      {modalMovimento && (
        <ModalFolha
          titulo={modalMovimento === 'INICIAL' ? 'Saldo inicial ou aporte' : 'Ajuste de caixa'}
          subtitulo={modalMovimento === 'INICIAL'
            ? 'Dinheiro que entra no fundo escolhido (abertura do caixa ou aporte dos sócios)'
            : 'Correção após conferir o extrato do banco. O motivo fica registrado.'}
          onFechar={() => setModalMovimento(null)}
          onSubmit={handleSalvarMovimento}
          largura="sm:max-w-xl"
          rodape={
            <>
              <BotaoSecundario onClick={() => setModalMovimento(null)}>Cancelar</BotaoSecundario>
              <BotaoPrimario type="submit"><Save className="w-4 h-4" /> Lançar no caixa</BotaoPrimario>
            </>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo rotulo="Fundo" className={modalMovimento === 'AJUSTE' ? '' : 'sm:col-span-2'}>
              <select value={formMov.fundo} onChange={e => setFormMov({ ...formMov, fundo: e.target.value as FundoCaixa })} className={`${campo} cursor-pointer`}>
                {(Object.keys(ROTULO_FUNDO_CAIXA) as FundoCaixa[]).map(f => (
                  <option key={f} value={f}>{ROTULO_FUNDO_CAIXA[f]}</option>
                ))}
              </select>
            </Campo>
            {modalMovimento === 'AJUSTE' && (
              <Campo rotulo="Tipo">
                <select value={formMov.sentido} onChange={e => setFormMov({ ...formMov, sentido: e.target.value as 'ENTRADA' | 'SAIDA' })} className={`${campo} cursor-pointer`}>
                  <option value="ENTRADA">Entrada (soma ao saldo)</option>
                  <option value="SAIDA">Saída (subtrai do saldo)</option>
                </select>
              </Campo>
            )}
            <Campo rotulo="Valor (R$) *">
              <input type="number" step="0.01" min="0.01" required inputMode="decimal" value={formMov.valor}
                onChange={e => setFormMov({ ...formMov, valor: e.target.value })}
                placeholder="0,00" className={`${campo} font-semibold`} />
            </Campo>
            <Campo rotulo="Data">
              <input type="date" value={formMov.data} onChange={e => setFormMov({ ...formMov, data: e.target.value })} className={campo} />
            </Campo>
            <Campo rotulo={modalMovimento === 'AJUSTE' ? 'Motivo do ajuste *' : 'Descrição'} className="sm:col-span-2">
              <input type="text" required={modalMovimento === 'AJUSTE'} value={formMov.descricao}
                onChange={e => setFormMov({ ...formMov, descricao: e.target.value })}
                placeholder={modalMovimento === 'AJUSTE' ? 'Conferência do extrato bancário' : 'Saldo inicial da conta movimento'}
                className={campo} />
            </Campo>
          </div>
        </ModalFolha>
      )}
    </div>
  );
}
