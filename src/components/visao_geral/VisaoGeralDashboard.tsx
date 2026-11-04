import React, { useState, useEffect, useMemo } from 'react';
import { ChevronRight, RefreshCw, Trash2 } from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import { carregarPedidosVenda, PedidoVenda } from '../../data/pedidosVendaData';
import {
  carregarEstoqueProdutos,
  carregarMateriaPrima,
  calcularStatusProduto,
  calcularStatusMateriaPrima,
  ProdutoEstoque
} from '../../data/produtosData';
import { carregarCalculosNaRoca, CalculoNaRoca } from '../../data/calculoRocaData';
import { carregarOrdensProducao, necessidadeMateriaPrimaOP, EVENTO_OPS } from '../../data/ordensProducaoData';
import { carregarClientes } from '../../data/clientesData';
import { obterConsolidadoGeral } from '../../data/pipelineIntegrado';
import { limparTodoOSistema } from '../../data/sistemaReset';
import {
  carregarTitulosReceber,
  carregarTitulosPagar,
  carregarReceitasExtras,
  carregarCaixaInvestimento,
  statusEfetivoReceber,
  statusEfetivoPagar,
  dataNoMesAtual,
  formatarMoeda as formatarMoedaSegura,
  numeroSeguro
} from '../../data/financeiroData';
import { parseData, somarDias, hojeISO, formatarDataBR, compararDatas } from '../../lib/datas';
import { AlertasEstoqueProducao } from './AlertasEstoqueProducao';
import { CabecalhoPagina, BotaoSecundario } from '../ui/CabecalhoPagina';
import { FaixaNumeros, CardNumero } from '../ui/CardNumero';
import { Painel } from '../ui/Painel';
import { StatusChip, PontoStatus, TomStatus } from '../ui/StatusChip';
import { tabela } from '../ui/TabelaDados';
import { CORES } from '../ui/tokens';
import { ROTULO_ETAPA_VENDA, TOM_ETAPA_VENDA } from '../pedidos/etapaVenda';

interface VisaoGeralProps {
  onNavigate: (pageId: string) => void;
}

interface Pendencia {
  id: string;
  tom: TomStatus;
  titulo: string;
  detalhe?: string;
  valor?: number;
  destino: string;
}

const ORDEM_TOM: Record<TomStatus, number> = { vencido: 0, aguardando: 1, producao: 2, neutro: 3, pago: 4 };

// Valor monetário para a faixa de números (o "R$" fica menor, ao lado)
const moedaSemSimbolo = (v: unknown) =>
  numeroSeguro(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const plural = (n: number, um: string, varios: string) => `${n.toLocaleString('pt-BR')} ${n === 1 ? um : varios}`;

const listaNomes = (nomes: string[], max = 3) =>
  nomes.slice(0, max).join(', ') + (nomes.length > max ? ` e mais ${nomes.length - max}` : '');

export function VisaoGeralDashboard({ onNavigate }: VisaoGeralProps) {
  const [pedidos, setPedidos] = useState<PedidoVenda[]>([]);
  const [produtos, setProdutos] = useState<ProdutoEstoque[]>([]);
  const [calculosRoca, setCalculosRoca] = useState<CalculoNaRoca[]>([]);
  const [consolidado, setConsolidado] = useState(() => obterConsolidadoGeral());
  const [atualizadoEm, setAtualizadoEm] = useState(() => new Date());

  const recarregar = () => {
    setPedidos(carregarPedidosVenda());
    setProdutos(carregarEstoqueProdutos());
    setCalculosRoca(carregarCalculosNaRoca());
    setConsolidado(obterConsolidadoGeral());
    setAtualizadoEm(new Date());
  };

  useEffect(() => {
    recarregar();
    const handleUpdate = () => recarregar();
    const eventos = [
      'pedidos_venda_updated',
      'pedidos_compra_updated',
      'financeiro_updated',
      'produtos_updated',
      'calculos_roca_updated',
      'sitio_controle_despesas_updated',
      'sistema_reset_updated',
      EVENTO_OPS,
    ];
    eventos.forEach(ev => window.addEventListener(ev, handleUpdate));
    return () => eventos.forEach(ev => window.removeEventListener(ev, handleUpdate));
  }, []);

  // Números do mês e pendências (tudo calculado dos dados reais)
  const painel = useMemo(() => {
    const hoje = hojeISO();
    const receber = carregarTitulosReceber();
    const pagar = carregarTitulosPagar();
    const extras = carregarReceitasExtras();
    const caixa = carregarCaixaInvestimento();
    const soma = (l: { valor: unknown }[]) => l.reduce((a, t) => a + numeroSeguro(t.valor), 0);

    const faturamentoMes =
      soma(receber.filter(t => dataNoMesAtual(t.data_emissao))) + soma(extras.filter(r => dataNoMesAtual(r.data)));

    const recAbertos = receber.filter(t => statusEfetivoReceber(t) !== 'PAGO');
    const recVencidos = recAbertos.filter(t => statusEfetivoReceber(t) === 'VENCIDO');
    const recHoje = recAbertos.filter(t => statusEfetivoReceber(t) !== 'VENCIDO' && compararDatas(t.data_vencimento, hoje) === 0);
    const pagAbertos = pagar.filter(t => statusEfetivoPagar(t) !== 'PAGO');
    const pagVencidos = pagAbertos.filter(t => statusEfetivoPagar(t) === 'VENCIDO');
    const pagHoje = pagAbertos.filter(t => statusEfetivoPagar(t) !== 'VENCIDO' && compararDatas(t.data_vencimento, hoje) === 0);

    const todosPedidos = carregarPedidosVenda();
    const aguardando = todosPedidos.filter(p => p.etapa === 'ORCAMENTO');
    const aFaturar = todosPedidos.filter(p => p.etapa === 'A_FATURAR');
    const somaPedidos = (l: PedidoVenda[]) => l.reduce((a, p) => a + numeroSeguro(p.valor_total), 0);

    const opsAbertas = carregarOrdensProducao().filter(o => o.status === 'PLANEJADA' || o.status === 'EM_PRODUCAO');
    const opsComFalta = opsAbertas.filter(o => necessidadeMateriaPrimaOP(o, 'RESTANTE').some(c => c.falta > 0));

    const clientesSemTabela = carregarClientes().filter(c => c.ativo !== false && !c.tabela_preco_id);

    const mpBaixa = carregarMateriaPrima()
      .filter(m => (Number(m.estoque_minimo) || 0) > 0)
      .map(m => ({ nome: m.nome, status: calcularStatusMateriaPrima(m.estoque_atual, m.estoque_minimo) }))
      .filter(x => x.status !== 'NORMAL');
    const prodBaixo = carregarEstoqueProdutos()
      .filter(p => (Number(p.estoque_minimo_kg) || 0) > 0)
      .map(p => ({ nome: p.nome, status: calcularStatusProduto(p.estoque_atual_kg, p.estoque_minimo_kg) }))
      .filter(x => x.status !== 'EM_ESTOQUE');

    const maisAntigo = (l: { data_vencimento: string }[]) =>
      [...l].sort((a, b) => compararDatas(a.data_vencimento, b.data_vencimento))[0]?.data_vencimento;

    const p: Pendencia[] = [];
    if (recVencidos.length)
      p.push({
        id: 'rec_venc', tom: 'vencido', destino: 'financeiro_a_receber', valor: soma(recVencidos),
        titulo: plural(recVencidos.length, 'título a receber vencido', 'títulos a receber vencidos'),
        detalhe: `O mais antigo venceu em ${formatarDataBR(maisAntigo(recVencidos))}`,
      });
    if (pagVencidos.length)
      p.push({
        id: 'pag_venc', tom: 'vencido', destino: 'financeiro_a_pagar', valor: soma(pagVencidos),
        titulo: plural(pagVencidos.length, 'conta a pagar vencida', 'contas a pagar vencidas'),
        detalhe: `A mais antiga venceu em ${formatarDataBR(maisAntigo(pagVencidos))}`,
      });
    if (opsComFalta.length)
      p.push({
        id: 'op_falta', tom: 'vencido', destino: 'pedidos_ordens_producao',
        titulo: plural(opsComFalta.length, 'ordem de produção com falta de matéria-prima', 'ordens de produção com falta de matéria-prima'),
        detalhe: listaNomes(opsComFalta.map(o => `${o.numero} · ${o.produto_nome}`), 2),
      });
    if (mpBaixa.length)
      p.push({
        id: 'mp_baixa', tom: mpBaixa.some(x => x.status === 'CRITICO') ? 'vencido' : 'aguardando', destino: 'produtos_materia_prima',
        titulo: plural(mpBaixa.length, 'matéria-prima abaixo do mínimo', 'matérias-primas abaixo do mínimo'),
        detalhe: listaNomes(mpBaixa.map(x => x.nome)),
      });
    if (aguardando.length)
      p.push({
        id: 'aprovacao', tom: 'aguardando', destino: 'pedidos_orcamentos_sugestivo', valor: somaPedidos(aguardando),
        titulo: plural(aguardando.length, 'venda aguardando aprovação', 'vendas aguardando aprovação'),
        detalhe: listaNomes(aguardando.map(x => x.cliente_nome).filter(Boolean)),
      });
    if (recHoje.length)
      p.push({
        id: 'rec_hoje', tom: 'aguardando', destino: 'financeiro_a_receber', valor: soma(recHoje),
        titulo: plural(recHoje.length, 'título a receber vence hoje', 'títulos a receber vencem hoje'),
        detalhe: listaNomes(recHoje.map(t => t.cliente_nome)),
      });
    if (pagHoje.length)
      p.push({
        id: 'pag_hoje', tom: 'aguardando', destino: 'financeiro_a_pagar', valor: soma(pagHoje),
        titulo: plural(pagHoje.length, 'conta a pagar vence hoje', 'contas a pagar vencem hoje'),
        detalhe: listaNomes(pagHoje.map(t => t.favorecido_nome)),
      });
    if (aFaturar.length)
      p.push({
        id: 'faturar', tom: 'aguardando', destino: 'pedidos_a_faturar', valor: somaPedidos(aFaturar),
        titulo: plural(aFaturar.length, 'pedido pronto para faturar', 'pedidos prontos para faturar'),
        detalhe: listaNomes(aFaturar.map(x => x.cliente_nome).filter(Boolean)),
      });
    if (prodBaixo.length)
      p.push({
        id: 'prod_baixo', tom: prodBaixo.some(x => x.status === 'CRITICO') ? 'vencido' : 'aguardando', destino: 'produtos_estoque_cadastro',
        titulo: plural(prodBaixo.length, 'produto abaixo do estoque mínimo', 'produtos abaixo do estoque mínimo'),
        detalhe: listaNomes(prodBaixo.map(x => x.nome)),
      });
    const opsOk = opsAbertas.length - opsComFalta.length;
    if (opsOk > 0)
      p.push({
        id: 'op_abertas', tom: 'producao', destino: 'pedidos_ordens_producao',
        titulo: plural(opsOk, 'ordem de produção em andamento', 'ordens de produção em andamento'),
        detalhe: 'Matéria-prima suficiente para concluir',
      });
    if (clientesSemTabela.length)
      p.push({
        id: 'cli_tabela', tom: 'neutro', destino: 'cadastro_clientes',
        titulo: plural(clientesSemTabela.length, 'cliente sem tabela de preço', 'clientes sem tabela de preço'),
        detalhe: listaNomes(clientesSemTabela.map(c => c.fantasia || c.razao_nome || '').filter(Boolean)) || 'Sem tabela, o pedido não puxa o preço',
      });
    p.sort((a, b) => ORDEM_TOM[a.tom] - ORDEM_TOM[b.tom]);

    return {
      faturamentoMes,
      aReceber: soma(recAbertos),
      recVencidosValor: soma(recVencidos),
      recVencidosQtd: recVencidos.length,
      aPagar: soma(pagAbertos),
      pagVencidosValor: soma(pagVencidos),
      pagVencidosQtd: pagVencidos.length,
      caixa: numeroSeguro(caixa.saldo_disponivel_industrial),
      reservaSafra: numeroSeguro(caixa.fundo_reserva_safra),
      pendencias: p,
    };
  }, [consolidado, pedidos, produtos]);

  // Gráfico de faturamento real das últimas 5 semanas (títulos a receber por emissão + receitas extras por data)
  const dadosFaturamento = useMemo(() => {
    const hoje = hojeISO();
    const semanas = Array.from({ length: 5 }, (_, i) => {
      const fim = somarDias(hoje, -7 * (4 - i));
      const inicio = somarDias(fim, -6);
      return { inicio, fim, semana: formatarDataBR(inicio).slice(0, 5), faturado: 0 };
    });
    const lancar = (data: string | undefined, valor: unknown) => {
      if (!parseData(data)) return;
      const s = semanas.find(w => compararDatas(data, w.inicio) >= 0 && compararDatas(data, w.fim) <= 0);
      if (s) s.faturado += numeroSeguro(valor);
    };
    carregarTitulosReceber().forEach(t => lancar(t.data_emissao, t.valor));
    carregarReceitasExtras().forEach(r => lancar(r.data, r.valor));
    return semanas.map(({ semana, faturado }) => ({ semana, faturado: Number(faturado.toFixed(2)) }));
  }, [consolidado]);

  // Distribuição de produtos em estoque
  const dadosMixProducao = produtos.slice(0, 6).map(p => ({
    nome: (p.nome || '').length > 18 ? (p.nome || '').substring(0, 16) + '…' : (p.nome || ''),
    sacos: numeroSeguro(p.estoque_atual_sacos),
  }));

  const formatarMoeda = (val: unknown) => formatarMoedaSegura(val);

  const handleZerarSistema = () => {
    const ok = window.confirm(
      'ATENÇÃO: isto vai APAGAR PERMANENTEMENTE todos os dados do sistema:\n\n' +
      '• Pedidos de venda, orçamentos e pedidos de compra\n' +
      '• Cálculos na roça\n' +
      '• Clientes, agricultores, fornecedores, produtos, receitas e tabelas de preço\n' +
      '• Todo o financeiro (a receber, a pagar, despesas, receitas, notas e caixa)\n' +
      '• Controle do sítio (combustível e despesas)\n\n' +
      'Os usuários e o login são mantidos. Esta ação NÃO pode ser desfeita.\n\nDeseja continuar?'
    );
    if (!ok) return;
    const digitado = window.prompt('Para confirmar, digite APAGAR (em maiúsculas):');
    if ((digitado || '').trim() !== 'APAGAR') {
      window.alert('Confirmação não conferiu. Nenhum dado foi apagado.');
      return;
    }
    limparTodoOSistema(false);
    window.location.reload();
  };

  const nPend = painel.pendencias.length;
  const mesAtual = new Date().toLocaleDateString('pt-BR', { month: 'long' });
  const eixo = { fontSize: 11, fill: CORES.cinza };
  const tooltip = { borderRadius: 6, border: `1px solid ${CORES.linha}`, background: CORES.papel, fontSize: 12 };

  return (
    <div className="h-full w-full overflow-y-auto bg-papel-2 text-tinta">
      <div className="mx-auto w-full max-w-[1700px]">
        <CabecalhoPagina
          titulo="Visão Geral"
          resumo={
            <>
              {nPend === 0 ? 'Nenhuma pendência hoje' : <span className="text-tinta-2 font-semibold">{plural(nPend, 'pendência pede atenção', 'pendências pedem atenção')}</span>}
              <span className="text-cinza-claro"> · atualizado às {atualizadoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
            </>
          }
          acoes={
            <BotaoSecundario onClick={recarregar} title="Recarregar os números">
              <RefreshCw className="w-3.5 h-3.5" />
              Atualizar
            </BotaoSecundario>
          }
        />

        <div className="px-4 sm:px-6 pb-8 space-y-5">
          {/* 1. Números principais */}
          <FaixaNumeros>
            <CardNumero
              destaque
              rotulo={`Faturamento de ${mesAtual}`}
              unidade="R$"
              unidadeAntes
              valor={moedaSemSimbolo(painel.faturamentoMes)}
              detalhe={`Lucro acumulado ${formatarMoeda(consolidado.lucroLiquido)}`}
              onClick={() => onNavigate('financeiro_a_receber')}
            />
            <CardNumero
              rotulo="A receber"
              unidade="R$"
              unidadeAntes
              valor={moedaSemSimbolo(painel.aReceber)}
              detalhe={painel.recVencidosQtd ? `${formatarMoeda(painel.recVencidosValor)} vencidos` : 'Nada vencido'}
              alerta={painel.recVencidosQtd ? 'vencido' : undefined}
              onClick={() => onNavigate('financeiro_a_receber')}
            />
            <CardNumero
              rotulo="A pagar"
              unidade="R$"
              unidadeAntes
              valor={moedaSemSimbolo(painel.aPagar)}
              detalhe={painel.pagVencidosQtd ? `${formatarMoeda(painel.pagVencidosValor)} vencidos` : 'Nada vencido'}
              alerta={painel.pagVencidosQtd ? 'vencido' : undefined}
              onClick={() => onNavigate('financeiro_a_pagar')}
            />
            <CardNumero
              rotulo="Caixa disponível"
              unidade="R$"
              unidadeAntes
              valor={moedaSemSimbolo(painel.caixa)}
              detalhe={`Reserva de safra ${formatarMoeda(painel.reservaSafra)}`}
              onClick={() => onNavigate('financeiro_caixa_investimento')}
            />
            <CardNumero
              rotulo="Estoque acabado"
              unidade="sacos"
              valor={numeroSeguro(consolidado.totalSacosEstoque).toLocaleString('pt-BR')}
              detalhe={`${numeroSeguro(consolidado.totalMateriaPrimaTon).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} t de matéria-prima`}
              onClick={() => onNavigate('produtos_estoque_cadastro')}
            />
          </FaixaNumeros>

          {/* 2. Pendências + últimas vendas */}
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-5 items-start">
            <Painel titulo="Pendências de hoje" contexto={nPend ? `${nPend} ${nPend === 1 ? 'item' : 'itens'}` : undefined} semPadding>
              {nPend === 0 ? (
                <div className="px-4 py-6 text-[13px] text-cinza">
                  <span className="font-semibold text-st-pago">Tudo em dia.</span> Nenhuma venda aguardando, título vencido ou falta de matéria-prima.
                </div>
              ) : (
                <ul>
                  {painel.pendencias.map(p => (
                    <li key={p.id} className="border-b border-linha last:border-b-0">
                      <button
                        type="button"
                        onClick={() => onNavigate(p.destino)}
                        className="group w-full grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-3 text-left hover:bg-papel-3/50 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ouro"
                      >
                        <PontoStatus tom={p.tom} />
                        <span className="min-w-0">
                          <span className={`block text-[14px] font-semibold ${p.tom === 'vencido' ? 'text-st-vencido' : 'text-tinta'}`}>{p.titulo}</span>
                          {p.detalhe && <span className="block text-[12px] text-cinza line-clamp-2 sm:truncate mt-0.5">{p.detalhe}</span>}
                          {p.valor !== undefined && (
                            <span className="sm:hidden block mt-1 text-[13.5px] font-bold tabular-nums text-tinta">{formatarMoeda(p.valor)}</span>
                          )}
                        </span>
                        <span className="flex items-center gap-2">
                          {p.valor !== undefined && (
                            <span className="hidden sm:inline text-[14px] font-bold tabular-nums text-tinta whitespace-nowrap">{formatarMoeda(p.valor)}</span>
                          )}
                          <ChevronRight className="w-4 h-4 text-cinza-claro group-hover:text-eno-700 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Painel>

            <Painel titulo="Últimas vendas" link={{ rotulo: 'Ver vendas', onClick: () => onNavigate('pedidos_orcamentos_sugestivo') }} semPadding>
              {pedidos.length === 0 ? (
                <div className="px-4 py-6 text-[13px] text-cinza">Nenhuma venda registrada ainda.</div>
              ) : (
                <ul>
                  {pedidos.slice(0, 6).map(ped => (
                    <li key={ped.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 px-4 py-2.5 border-b border-linha last:border-b-0">
                      <span className="min-w-0">
                        <span className="block text-[13.5px] font-semibold text-tinta truncate">{ped.cliente_nome}</span>
                        <span className="block text-[11.5px] text-cinza tabular-nums"><span className="whitespace-nowrap">{ped.numero_pedido}</span> · <span className="whitespace-nowrap">{formatarDataBR(ped.data_emissao)}</span></span>
                      </span>
                      <span className="text-right">
                        <span className="block text-[13.5px] font-bold tabular-nums text-tinta">{formatarMoeda(ped.valor_total)}</span>
                        <StatusChip tom={TOM_ETAPA_VENDA[ped.etapa] || 'neutro'} className="mt-1">{ROTULO_ETAPA_VENDA[ped.etapa] || ped.etapa}</StatusChip>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Painel>
          </div>

          {/* 2.1 Detalhe de estoque mínimo e OPs com falta (só aparece quando há alerta) */}
          <AlertasEstoqueProducao onNavigate={onNavigate} />

          {/* 3. Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Painel titulo="Faturamento por semana" contexto="últimas 5 semanas">
              {dadosFaturamento.every(d => d.faturado === 0) ? (
                <div className="h-[220px] flex items-center justify-center text-[13px] text-cinza">Nenhum título emitido nas últimas 5 semanas.</div>
              ) : (
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dadosFaturamento} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="corRealizado" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CORES.eno600} stopOpacity={0.28} />
                        <stop offset="100%" stopColor={CORES.eno600} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke={CORES.linha} />
                    <XAxis dataKey="semana" tick={eixo} axisLine={false} tickLine={false} />
                    <YAxis tick={eixo} axisLine={false} tickLine={false} tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toLocaleString('pt-BR')} mil` : String(v))} />
                    <Tooltip formatter={(value: any) => [formatarMoeda(value), 'Faturado']} contentStyle={tooltip} />
                    <Area type="monotone" dataKey="faturado" name="Faturado" stroke={CORES.eno700} strokeWidth={2} fillOpacity={1} fill="url(#corRealizado)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              )}
            </Painel>

            <Painel titulo="Estoque por produto" contexto="sacos" link={{ rotulo: 'Ver estoque', onClick: () => onNavigate('produtos_estoque_cadastro') }}>
              {dadosMixProducao.length === 0 ? (
                <div className="h-[220px] flex items-center justify-center text-[13px] text-cinza">Nenhum produto cadastrado.</div>
              ) : (
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dadosMixProducao} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                      <CartesianGrid horizontal={false} stroke={CORES.linha} />
                      <XAxis type="number" tick={eixo} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="nome" tick={{ fontSize: 11, fill: CORES.tinta }} axisLine={false} tickLine={false} width={120} />
                      <Tooltip formatter={(value: any) => [`${value} sacos`, 'Estoque']} contentStyle={tooltip} cursor={{ fill: CORES.papel2 }} />
                      <Bar dataKey="sacos" fill={CORES.eno800} radius={[0, 3, 3, 0]} barSize={14} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Painel>
          </div>

          {/* 4. Entradas na roça */}
          <Painel titulo="Entradas na roça" link={{ rotulo: 'Ver cálculos', onClick: () => onNavigate('calculo_na_roca') }} semPadding>
            <div className="overflow-x-auto">
              <table className={tabela.table}>
                <thead className={tabela.thead}>
                  <tr>
                    <th className={tabela.th}>Ticket</th>
                    <th className={tabela.th}>Produtor</th>
                    <th className={`${tabela.th} text-right`}>Peso</th>
                    <th className={`${tabela.th} text-right`}>Valor estimado</th>
                  </tr>
                </thead>
                <tbody>
                  {calculosRoca.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-5 text-[13px] text-cinza">Nenhuma entrada registrada.</td>
                    </tr>
                  )}
                  {calculosRoca.slice(0, 5).map(calc => (
                    <tr key={calc.id} className={tabela.tr}>
                      <td className={`${tabela.td} font-semibold text-tinta tabular-nums whitespace-nowrap`}>{calc.numero_ticket}</td>
                      <td className={`${tabela.td} max-w-[220px] truncate`}>{calc.fornecedor_nome}</td>
                      <td className={`${tabela.td} text-right tabular-nums whitespace-nowrap`}>{numeroSeguro(calc.peso_total_kg).toLocaleString('pt-BR')} kg</td>
                      <td className={`${tabela.td} text-right tabular-nums font-semibold text-tinta whitespace-nowrap`}>{formatarMoeda(calc.valor_total_estimado)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Painel>

          {/* 5. Manutenção: zerar o sistema (pedido do usuário) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-linha pt-4 text-[12px] text-cinza">
            <p className="max-w-2xl">
              <span className="font-bold uppercase tracking-[0.14em] text-[10.5px] text-st-vencido mr-2">Manutenção</span>
              Apagar todos os pedidos, cadastros, produtos, financeiro e controle do sítio para recomeçar do zero. Usuários e login são mantidos.
            </p>
            <button
              type="button"
              onClick={handleZerarSistema}
              className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-st-vencido/30 text-st-vencido text-[12.5px] font-semibold hover:bg-st-vencido-bg transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Zerar banco de dados
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
