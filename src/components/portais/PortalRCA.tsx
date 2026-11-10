import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  LayoutDashboard,
  ShoppingCart,
  Wallet,
  UserPlus,
} from 'lucide-react';
import {
  RCA,
  carregarRcas,
  saldoAdiantamentoRca,
  carregarVendasRca,
  montarClientesVinculados,
  montarVendasComissaoRca,
  EVENTO_CADASTROS_ATUALIZADOS,
} from '../../data/cadastrosData';
import { carregarClientes } from '../../data/clientesData';
import { carregarPedidosVenda } from '../../data/pedidosVendaData';
import { formatarDataBR } from '../../lib/datas';
import { sincronizarTitulosComissao, rotuloRegraComissao } from '../../data/comissoesData';
import { PedidosOrcamentosSugestivo } from '../pedidos/PedidosOrcamentosSugestivo';
import { CadastroClientes } from '../cadastros/CadastroClientes';
import { CabecalhoPagina, BotaoSecundario } from '../ui/CabecalhoPagina';
import { FaixaNumeros, CardNumero } from '../ui/CardNumero';
import { Painel } from '../ui/Painel';
import { StatusChip } from '../ui/StatusChip';
import { EstadoVazio } from '../ui/EstadoVazio';
import { CampoBusca, SeletorFiltro } from '../ui/BarraFiltros';
import { TabelaDados, Th, Td, tabela } from '../ui/TabelaDados';
import { MolduraPortal, SeletorAdminPortal } from './MolduraPortal';

interface PortalRCAProps {
  onVoltar: () => void;
  /** id do RCA vinculado ao usuário logado (sessão) */
  rcaId?: string | null;
  /** ADMIN pode escolher qual RCA visualizar */
  permitirSelecaoAdmin?: boolean;
}

type AbaPortal = 'resumo' | 'pedidos' | 'clientes' | 'comissoes';

const moeda = (v: number) => `R$ ${(Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Rótulo curto do modelo de comissão para o RCA */
function descreverModeloComissao(rca: RCA): string {
  const pct = `${Number(rca.comissao_padrao_percentual) || 0}%`;
  switch (rca.modelo_comissao) {
    case 'por_produto': {
      const n = (rca.comissoes_por_produto || []).length;
      return `Por produto${n > 0 ? ` (${n} com % próprio)` : ''} · padrão ${pct}`;
    }
    case 'por_grupo': return `Por grupo de produto · padrão ${pct}`;
    case 'por_cliente': return `Por cliente · padrão ${pct}`;
    case 'misto': return `Misto · padrão ${pct}`;
    default: return `Pela venda · ${pct} sobre o total`;
  }
}

export function PortalRCA({ onVoltar, rcaId, permitirSelecaoAdmin = false }: PortalRCAProps) {
  const [abaAtiva, setAbaAtiva] = useState<AbaPortal>('resumo');
  // Atalhos do Resumo abrem o formulário direto (o número muda a cada clique)
  const [abrirFormPedido, setAbrirFormPedido] = useState(0);
  const [abrirFormCliente, setAbrirFormCliente] = useState(0);
  const [buscaCliente, setBuscaCliente] = useState('');
  const [filtroMes, setFiltroMes] = useState('TODOS');

  // Recarrega quando cadastros, clientes ou pedidos mudarem
  const [versao, setVersao] = useState(0);
  React.useEffect(() => {
    const h = () => setVersao(v => v + 1);
    const eventos = [EVENTO_CADASTROS_ATUALIZADOS, 'clientes_updated', 'pedidos_venda_updated', 'sistema_reset_updated', 'financeiro_updated'];
    eventos.forEach(ev => window.addEventListener(ev, h));
    return () => eventos.forEach(ev => window.removeEventListener(ev, h));
  }, []);

  const rcas = useMemo(() => carregarRcas(), [versao]);
  const [rcaSelecionadoAdmin, setRcaSelecionadoAdmin] = useState<string>(rcaId || '');
  const rcaIdEfetivo = permitirSelecaoAdmin ? (rcaSelecionadoAdmin || rcaId || '') : (rcaId || '');

  // Representante logado: SEMPRE o RCA vinculado ao usuário da sessão
  const rca: RCA | undefined = useMemo(() => rcas.find(r => r.id === rcaIdEfetivo), [rcas, rcaIdEfetivo]);
  const saldoAdiantamento = useMemo(() => saldoAdiantamentoRca(rca), [rca]);

  const pedidosVenda = useMemo(() => carregarPedidosVenda(), [versao]);
  // Comissão de pedido excluído/estornado (ainda não paga) sai do Contas a Pagar
  React.useEffect(() => {
    sincronizarTitulosComissao(pedidosVenda);
  }, [pedidosVenda]);

  // Somente os clientes cujo vendedor_id é o id deste RCA
  const clientesDoRca = useMemo(() => {
    if (!rca) return [];
    return montarClientesVinculados(
      carregarClientes().filter(c => c.vendedor_id === rca.id),
      pedidosVenda.filter(p => p.rca_id === rca.id) // estatísticas só com os pedidos dele
    );
  }, [rca, pedidosVenda, versao]);

  const clientesCarteira = useMemo(() => {
    const termo = buscaCliente.toLowerCase();
    return clientesDoRca.filter(c =>
      !buscaCliente ||
      c.razao_social.toLowerCase().includes(termo) ||
      (c.nome_fantasia && c.nome_fantasia.toLowerCase().includes(termo)) ||
      c.municipio.toLowerCase().includes(termo)
    );
  }, [clientesDoRca, buscaCliente]);

  // Somente vendas/comissões deste RCA
  const vendasDoRca = useMemo(() => {
    if (!rca) return [];
    return montarVendasComissaoRca(pedidosVenda, carregarVendasRca()).filter(v => v.rca_id === rca.id);
  }, [rca, pedidosVenda, versao]);

  const mesesDisponiveis = useMemo(
    () => Array.from(new Set(vendasDoRca.map(v => v.mes_referencia).filter(Boolean))),
    [vendasDoRca]
  );

  const vendasFiltradas = useMemo(() => {
    return vendasDoRca.filter(v => filtroMes === 'TODOS' || v.mes_referencia === filtroMes);
  }, [vendasDoRca, filtroMes]);

  // Pedidos do RCA aguardando aprovação da fábrica
  const aguardandoAprovacao = useMemo(
    () => (rca ? pedidosVenda.filter(p => p.rca_id === rca.id && p.etapa === 'ORCAMENTO').length : 0),
    [rca, pedidosVenda]
  );

  // Métricas de Comissões e Carteira
  const metricas = useMemo(() => {
    const totalFaturado = vendasFiltradas.reduce((acc, v) => acc + v.valor_faturado, 0);
    const totalComissoes = vendasFiltradas.reduce((acc, v) => acc + v.valor_comissao, 0);
    const comissoesPagas = vendasFiltradas
      .filter(v => v.status_comissao === 'Pago (PIX)')
      .reduce((acc, v) => acc + v.valor_comissao, 0);
    const comissoesLiberadas = vendasFiltradas
      .filter(v => v.status_comissao === 'Liberado')
      .reduce((acc, v) => acc + v.valor_comissao, 0);

    return {
      totalClientes: clientesDoRca.length,
      totalFaturado,
      totalComissoes,
      comissoesPagas,
      comissoesLiberadas
    };
  }, [vendasFiltradas, clientesDoRca]);

  const seletorAdmin = permitirSelecaoAdmin ? (
    <SeletorAdminPortal
      valor={rcaIdEfetivo}
      onChange={setRcaSelecionadoAdmin}
      vazio="Administrador: escolha um RCA"
      opcoes={rcas.map(r => ({ id: r.id, rotulo: `${r.codigo_rca} · ${r.nome_fantasia || r.nome_completo}` }))}
    />
  ) : null;

  if (!rca) {
    return (
      <MolduraPortal portal="Portal do RCA" onVoltar={onVoltar} ehAdmin={permitirSelecaoAdmin} seletorAdmin={seletorAdmin}>
        <div className="px-3 sm:px-5 pt-6">
          <div className="bg-papel border border-linha rounded-md">
            <EstadoVazio
              titulo="Usuário sem RCA vinculado"
              texto={permitirSelecaoAdmin
                ? 'Escolha um representante no seletor acima para ver o portal como ele vê.'
                : 'Peça ao administrador para vincular seu usuário a um RCA cadastrado em Usuários e acessos.'}
            />
          </div>
        </div>
      </MolduraPortal>
    );
  }

  const nomeRca = rca.nome_fantasia || rca.nome_completo;
  const chavePix = rca.chave_pix ? `${rca.chave_pix} (${rca.tipo_chave_pix})` : 'Não cadastrada';
  const modeloComissao = descreverModeloComissao(rca);
  const valorBR = (v: number) => (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const statusComissao = (venda: typeof vendasFiltradas[number]) =>
    venda.status_comissao === 'Pago (PIX)' ? (
      <StatusChip tom="pago">Pago{venda.data_pagamento_pix ? ` ${formatarDataBR(venda.data_pagamento_pix)}` : ''}</StatusChip>
    ) : venda.titulo_pagar_id ? (
      <span className="inline-flex flex-col items-end sm:items-center gap-0.5">
        <StatusChip tom={venda.titulo_status === 'VENCIDO' ? 'vencido' : 'aguardando'}>
          {venda.titulo_status === 'VENCIDO' ? 'Atrasada' : 'A receber'}
        </StatusChip>
        {venda.titulo_vencimento && (
          <span className="text-[11px] text-cinza tabular-nums">previsto {formatarDataBR(venda.titulo_vencimento)}</span>
        )}
      </span>
    ) : venda.status_comissao === 'Liberado' ? (
      <StatusChip tom="aguardando">Liberada</StatusChip>
    ) : (
      <StatusChip tom="neutro">Aguardando faturamento</StatusChip>
    );

  const irParaPedido = () => { setAbaAtiva('pedidos'); setAbrirFormPedido(n => n + 1); };
  const irParaNovoCliente = () => { setAbaAtiva('clientes'); setAbrirFormCliente(n => n + 1); };

  return (
    <MolduraPortal<AbaPortal>
      portal="Portal do RCA"
      conta={nomeRca}
      contexto={rca.codigo_rca}
      onVoltar={onVoltar}
      ehAdmin={permitirSelecaoAdmin}
      seletorAdmin={seletorAdmin}
      abas={[
        { id: 'resumo', rotulo: 'Resumo', Icone: LayoutDashboard },
        { id: 'pedidos', rotulo: 'Meus pedidos', curto: 'Pedidos', Icone: ShoppingCart, badge: aguardandoAprovacao },
        { id: 'clientes', rotulo: 'Meus clientes', curto: 'Clientes', Icone: Users },
        { id: 'comissoes', rotulo: 'Comissões', Icone: Wallet },
      ]}
      abaAtiva={abaAtiva}
      onAba={setAbaAtiva}
      acao={{ rotulo: 'Fazer pedido', curto: 'Pedir', Icone: Plus, onClick: irParaPedido }}
    >
      {/* ================= RESUMO ================= */}
      {abaAtiva === 'resumo' && (
        <>
          <CabecalhoPagina
            titulo={nomeRca}
            resumo={
              aguardandoAprovacao > 0
                ? `${aguardandoAprovacao} ${aguardandoAprovacao === 1 ? 'pedido aguardando' : 'pedidos aguardando'} aprovação da fábrica · ${clientesDoRca.length} na carteira`
                : `${clientesDoRca.length} ${clientesDoRca.length === 1 ? 'cliente' : 'clientes'} na carteira${rca.regiao_atuacao ? ` · ${rca.regiao_atuacao}` : ''}`
            }
            className="!px-3 sm:!px-5"
          />
          <div className="px-3 sm:px-5 space-y-4">
            <FaixaNumeros>
              <CardNumero
                destaque
                rotulo="Comissão a receber"
                unidade="R$"
                unidadeAntes
                valor={valorBR(metricas.comissoesLiberadas)}
                detalhe={modeloComissao}
                onClick={() => setAbaAtiva('comissoes')}
              />
              {saldoAdiantamento > 0 && (
                <CardNumero
                  rotulo="Você deve (adiantamento)"
                  unidade="R$"
                  unidadeAntes
                  valor={valorBR(saldoAdiantamento)}
                  detalhe="descontado das próximas comissões"
                  alerta="aguardando"
                />
              )}
              <CardNumero rotulo="Já recebido" unidade="R$" unidadeAntes valor={valorBR(metricas.comissoesPagas)} detalhe="pago por PIX" />
              <CardNumero rotulo="Faturado" unidade="R$" unidadeAntes valor={valorBR(metricas.totalFaturado)} detalhe="pedidos da sua carteira" />
              <CardNumero rotulo="Clientes" valor={metricas.totalClientes} detalhe="na carteira" onClick={() => setAbaAtiva('clientes')} />
              <CardNumero
                rotulo="Aguardando"
                valor={aguardandoAprovacao}
                detalhe={aguardandoAprovacao > 0 ? 'aprovação da fábrica' : 'nada pendente'}
                alerta={aguardandoAprovacao > 0 ? 'aguardando' : undefined}
                onClick={() => setAbaAtiva('pedidos')}
              />
            </FaixaNumeros>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] items-start">
              {/* Carteira (leitura rápida) */}
              <Painel titulo="Sua carteira" contexto="prazo, tabela e compras" semPadding>
                <div className="px-3 sm:px-4 py-3 border-b border-linha">
                  <CampoBusca valor={buscaCliente} onChange={setBuscaCliente} placeholder="Buscar cliente ou cidade" className="sm:max-w-xs [&_input]:h-10 sm:[&_input]:h-8" />
                </div>
                {clientesCarteira.length === 0 ? (
                  <EstadoVazio
                    titulo={clientesDoRca.length === 0 ? 'Sua carteira está vazia' : 'Nenhum cliente com essa busca'}
                    texto={clientesDoRca.length === 0 ? 'Cadastre o primeiro cliente. Ele entra direto na sua carteira e a fábrica define a tabela.' : 'Tente o nome fantasia ou a cidade.'}
                    acao={clientesDoRca.length === 0 ? <BotaoSecundario onClick={irParaNovoCliente}><UserPlus className="w-4 h-4" /> Adicionar cliente</BotaoSecundario> : undefined}
                  />
                ) : (
                  <>
                    {/* Celular: cartões */}
                    <ul className="sm:hidden">
                      {clientesCarteira.map(cli => (
                        <li key={cli.id} className="px-3.5 py-3 border-b border-linha last:border-b-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-[14px] font-bold text-tinta truncate">{cli.razao_social}</div>
                              <div className="text-[11.5px] text-cinza truncate">{cli.municipio}/{cli.uf} · {cli.prazo_pagamento_nome}</div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-[15px] font-extrabold text-tinta tabular-nums">{moeda(cli.valor_total_compras)}</div>
                              <div className="text-[11px] text-cinza tabular-nums">{cli.qtd_compras} {cli.qtd_compras === 1 ? 'pedido' : 'pedidos'}</div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                    {/* A partir de sm: tabela densa */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className={tabela.table}>
                        <thead className={tabela.thead}>
                          <tr>
                            <Th>Cliente</Th>
                            <Th>Cidade</Th>
                            <Th>Tabela e prazo</Th>
                            <Th numero>Pedidos</Th>
                            <Th numero>Volume</Th>
                            <Th numero>Último</Th>
                          </tr>
                        </thead>
                        <tbody>
                          {clientesCarteira.map(cli => (
                            <tr key={cli.id} className={tabela.tr}>
                              <Td>
                                <div className="font-semibold text-tinta">{cli.razao_social}</div>
                                <div className="text-[11.5px] text-cinza tabular-nums">{cli.nome_fantasia ? `${cli.nome_fantasia} · ` : ''}{cli.cpf_cnpj}</div>
                              </Td>
                              <Td>
                                <div>{cli.municipio}/{cli.uf}</div>
                                <div className="text-[11.5px] text-cinza tabular-nums">{cli.telefone}</div>
                              </Td>
                              <Td>
                                <div className="text-tinta">{cli.tabela_preco_nome}</div>
                                <div className="text-[11.5px] text-cinza">{cli.forma_pagamento_nome} · {cli.prazo_pagamento_nome}</div>
                              </Td>
                              <Td numero>{cli.qtd_compras}</Td>
                              <Td numero className="font-semibold text-tinta">{moeda(cli.valor_total_compras)}</Td>
                              <Td numero>
                                <div className="text-tinta">{cli.ultima_compra_pedido || '—'}</div>
                                <div className="text-[11.5px] text-cinza">{cli.ultima_compra_data ? formatarDataBR(cli.ultima_compra_data) : ''}</div>
                              </Td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </Painel>

              <Painel titulo="Seus dados">
                <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2.5 text-[13px]">
                  <dt className="text-cinza">Chave PIX</dt>
                  <dd className="font-semibold text-tinta text-right break-all tabular-nums">{chavePix}</dd>
                  <dt className="text-cinza">Região</dt>
                  <dd className="font-semibold text-tinta text-right truncate">{rca.regiao_atuacao || '—'}</dd>
                  <dt className="text-cinza">Tabela padrão</dt>
                  <dd className="font-semibold text-tinta text-right truncate">{rca.tabela_preco_padrao_nome || '—'}</dd>
                  <dt className="text-cinza">Comissão</dt>
                  <dd className="font-semibold text-tinta text-right">{modeloComissao}</dd>
                </dl>
                {clientesDoRca.length > 0 && (
                  <BotaoSecundario onClick={irParaNovoCliente} className="mt-4 w-full h-11 sm:h-9">
                    <UserPlus className="w-4 h-4" /> Adicionar cliente
                  </BotaoSecundario>
                )}
              </Painel>
            </div>
          </div>
        </>
      )}

      {/* ================= MEUS PEDIDOS ================= */}
      {abaAtiva === 'pedidos' && (
        // key no wrapper: troca de RCA (visualizar como) remonta a tela com o estado limpo
        <div key={`ped_${rca.id}`} className="px-3 sm:px-5 pt-4">
          <PedidosOrcamentosSugestivo
            rcaFixoId={rca.id}
            abrirNovoSinal={abrirFormPedido}
            onNavigate={tab => { if (tab === 'cadastro_clientes') setAbaAtiva('clientes'); }}
          />
        </div>
      )}

      {/* ================= MEUS CLIENTES ================= */}
      {abaAtiva === 'clientes' && (
        <div key={`cli_${rca.id}`} className="px-3 sm:px-5 pt-4 flex flex-col md:h-[calc(100dvh-6.25rem-2rem)] md:min-h-[520px]">
          <CadastroClientes rcaFixoId={rca.id} abrirNovoSinal={abrirFormCliente} />
        </div>
      )}

      {/* ================= COMISSÕES ================= */}
      {abaAtiva === 'comissoes' && (
        <>
          <CabecalhoPagina
            titulo="Comissões"
            resumo={<>Sua regra: {modeloComissao}</>}
            className="!px-3 sm:!px-5"
            acoes={
              <SeletorFiltro value={filtroMes} onChange={e => setFiltroMes(e.target.value)} aria-label="Período" className="h-10 sm:h-8 w-full sm:w-auto">
                <option value="TODOS">Todos os períodos</option>
                {mesesDisponiveis.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </SeletorFiltro>
            }
          />
          <div className="px-3 sm:px-5 space-y-3">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-cinza">
              <span>A receber <strong className="text-tinta tabular-nums">{moeda(metricas.comissoesLiberadas)}</strong></span>
              <span>Recebido <strong className="text-st-pago tabular-nums">{moeda(metricas.comissoesPagas)}</strong></span>
              <span>Total do período <strong className="text-tinta tabular-nums">{moeda(metricas.totalComissoes)}</strong></span>
            </div>

            {vendasFiltradas.length === 0 ? (
              <div className="bg-papel border border-linha rounded-md">
                <EstadoVazio titulo="Nenhum pedido faturado ainda" texto="A comissão aparece aqui quando a fábrica faturar um pedido da sua carteira." />
              </div>
            ) : (
              <>
                {/* Celular: cartões */}
                <ul className="sm:hidden bg-papel border border-linha rounded-md">
                  {vendasFiltradas.map(venda => (
                    <li key={venda.id} className="px-3.5 py-3 border-b border-linha last:border-b-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[11.5px] text-cinza tabular-nums">{venda.numero_pedido} · {formatarDataBR(venda.data)}</div>
                          <div className="text-[14px] font-bold text-tinta truncate">{venda.cliente_nome}</div>
                          <div className="text-[11.5px] text-cinza tabular-nums">{venda.percentual_comissao.toFixed(2)}% de {moeda(venda.valor_faturado)}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-[17px] font-extrabold text-tinta tabular-nums">{moeda(venda.valor_comissao)}</div>
                          <div className="mt-1">{statusComissao(venda)}</div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>

                <TabelaDados className="hidden sm:block">
                  <thead className={tabela.thead}>
                    <tr>
                      <Th>Pedido</Th>
                      <Th>Cliente</Th>
                      <Th>Produto</Th>
                      <Th numero>Faturado</Th>
                      <Th numero>Regra</Th>
                      <Th numero>Comissão</Th>
                      <Th className="text-center">Situação</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendasFiltradas.map(venda => (
                      <tr key={venda.id} className={tabela.tr}>
                        <Td>
                          <div className="font-semibold text-tinta tabular-nums">{venda.numero_pedido}</div>
                          <div className="text-[11.5px] text-cinza tabular-nums">{formatarDataBR(venda.data)}</div>
                        </Td>
                        <Td>
                          <div className="font-semibold text-tinta">{venda.cliente_nome}</div>
                          <div className="text-[11.5px] text-cinza">{venda.cliente_cidade}</div>
                        </Td>
                        <Td>{venda.grupo_produto_nome || '—'}</Td>
                        <Td numero>{moeda(venda.valor_faturado)}</Td>
                        <Td numero>
                          <div className="text-[11px] text-cinza">{rotuloRegraComissao(venda.tipo_regra_aplicada)}</div>
                          <div className="text-tinta">{venda.percentual_comissao.toFixed(2)}%</div>
                        </Td>
                        <Td numero className="font-extrabold text-tinta">{moeda(venda.valor_comissao)}</Td>
                        <Td className="text-center">{statusComissao(venda)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </TabelaDados>
              </>
            )}
          </div>
        </>
      )}
    </MolduraPortal>
  );
}
