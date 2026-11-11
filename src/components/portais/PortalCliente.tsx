import React, { useMemo, useState } from 'react';
import {
  Plus,
  LayoutDashboard,
  ClipboardList,
  ChevronRight,
  MessageCircle,
  AlertCircle,
} from 'lucide-react';
import { carregarClientes, Cliente } from '../../data/clientesData';
import { carregarPedidosVenda, PedidoVenda } from '../../data/pedidosVendaData';
import { carregarRcas, EVENTO_CADASTROS_ATUALIZADOS } from '../../data/cadastrosData';
import { carregarTabelasPreco } from '../../data/produtosData';
import { tabelaPrecoAtiva } from '../../data/precosData';
import { formatarDataBR, compararDatas } from '../../lib/datas';
import { PedidosOrcamentosSugestivo } from '../pedidos/PedidosOrcamentosSugestivo';
import { ROTULO_ETAPA_VENDA, TOM_ETAPA_VENDA } from '../pedidos/etapaVenda';
import { CabecalhoPagina } from '../ui/CabecalhoPagina';
import { FaixaNumeros, CardNumero } from '../ui/CardNumero';
import { Painel } from '../ui/Painel';
import { StatusChip } from '../ui/StatusChip';
import { EstadoVazio } from '../ui/EstadoVazio';
import { MolduraPortal, SeletorAdminPortal } from './MolduraPortal';

interface PortalClienteProps {
  onVoltar: () => void;
  /** id do cliente vinculado ao usuário logado (sessão) */
  clienteId?: string | null;
  /** ADMIN pode escolher qual cliente visualizar */
  permitirSelecaoAdmin?: boolean;
}

type AbaPortal = 'inicio' | 'pedidos';

const moeda = (v: number) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const nomeCliente = (c: Cliente) => c.fantasia || c.razao_nome;

export function PortalCliente({ onVoltar, clienteId, permitirSelecaoAdmin = false }: PortalClienteProps) {
  const [aba, setAba] = useState<AbaPortal>('inicio');
  // Atalho "Fazer pedido": abre o formulário (o número muda a cada clique)
  const [sinalNovoPedido, setSinalNovoPedido] = useState(0);

  const [versao, setVersao] = useState(0);
  React.useEffect(() => {
    const h = () => setVersao(v => v + 1);
    const eventos = [EVENTO_CADASTROS_ATUALIZADOS, 'clientes_updated', 'pedidos_venda_updated', 'tabelas_preco_updated', 'sistema_reset_updated'];
    eventos.forEach(ev => window.addEventListener(ev, h));
    return () => eventos.forEach(ev => window.removeEventListener(ev, h));
  }, []);

  const clientes = useMemo(() => carregarClientes(), [versao]);
  const [clienteAdmin, setClienteAdmin] = useState<string>(clienteId || '');
  const clienteIdEfetivo = permitirSelecaoAdmin ? (clienteAdmin || clienteId || '') : (clienteId || '');
  // Sempre o cliente vinculado à sessão (o admin escolhe qual visualizar)
  const cliente = useMemo(() => clientes.find(c => c.id === clienteIdEfetivo), [clientes, clienteIdEfetivo]);

  // Somente os pedidos deste cliente
  const pedidos = useMemo(
    () => (cliente ? carregarPedidosVenda().filter(p => p.cliente_id === cliente.id) : []),
    [cliente, versao]
  );

  const resumo = useMemo(() => {
    const comprados = pedidos.filter(p => p.etapa === 'FATURADO' || p.etapa === 'ENTREGUE');
    const andamento = pedidos.filter(p => p.etapa === 'ORCAMENTO' || p.etapa === 'EM_PRODUCAO' || p.etapa === 'A_FATURAR');
    const ordenados = [...pedidos].sort((a, b) => compararDatas(b.data_emissao, a.data_emissao));
    return {
      totalComprado: comprados.reduce((acc, p) => acc + (Number(p.valor_total) || 0), 0),
      qtdComprados: comprados.length,
      andamento,
      aguardando: andamento.filter(p => p.etapa === 'ORCAMENTO').length,
      producao: andamento.filter(p => p.etapa !== 'ORCAMENTO').length,
      ultimo: ordenados[0],
      recentes: ordenados.slice(0, 4),
    };
  }, [pedidos]);

  const representante = useMemo(
    () => (cliente?.vendedor_id ? carregarRcas().find(r => r.id === cliente.vendedor_id) : undefined),
    [cliente, versao]
  );
  const tabelaLiberada = useMemo(() => {
    if (!cliente?.tabela_preco_id) return false;
    const t = carregarTabelasPreco().find(x => x.id === cliente.tabela_preco_id);
    return !!t && tabelaPrecoAtiva(t);
  }, [cliente, versao]);
  const podePedir = !!cliente && cliente.ativo && tabelaLiberada;

  const fazerPedido = () => {
    setAba('pedidos');
    if (podePedir) setSinalNovoPedido(n => n + 1);
  };


  const seletorAdmin = permitirSelecaoAdmin ? (
    <SeletorAdminPortal
      valor={clienteIdEfetivo}
      onChange={v => { setClienteAdmin(v); setAba('inicio'); }}
      vazio="Administrador: escolha um cliente"
      opcoes={clientes.map(c => ({ id: c.id, rotulo: `${nomeCliente(c)}${c.endereco?.municipio ? ` · ${c.endereco.municipio}` : ''}` }))}
    />
  ) : null;

  if (!cliente) {
    return (
      <MolduraPortal portal="Portal do Cliente" onVoltar={onVoltar} ehAdmin={permitirSelecaoAdmin} seletorAdmin={seletorAdmin}>
        <div className="px-3 sm:px-5 pt-6">
          <div className="bg-papel border border-linha rounded-md">
            <EstadoVazio
              titulo="Usuário sem cliente vinculado"
              texto={permitirSelecaoAdmin
                ? 'Escolha um cliente no seletor acima para ver o portal como ele vê.'
                : 'Seu login ainda não está ligado a um cadastro de cliente. Fale com a fábrica.'}
            />
          </div>
        </div>
      </MolduraPortal>
    );
  }

  const zap = (representante?.whatsapp || representante?.telefone || '').replace(/\D/g, '');
  const nomeRep = representante ? (representante.nome_fantasia || representante.nome_completo) : '';
  const cidade = cliente.endereco?.municipio ? `${cliente.endereco.municipio}/${cliente.endereco.uf}` : '';

  return (
    <MolduraPortal<AbaPortal>
      portal="Portal do Cliente"
      conta={nomeCliente(cliente)}
      contexto={[cliente.codigo_cliente ? `Código ${cliente.codigo_cliente}` : '', cidade].filter(Boolean).join(' · ')}
      onVoltar={onVoltar}
      ehAdmin={permitirSelecaoAdmin}
      seletorAdmin={seletorAdmin}
      abas={[
        { id: 'inicio', rotulo: 'Início', Icone: LayoutDashboard },
        { id: 'pedidos', rotulo: 'Meus pedidos', curto: 'Pedidos', Icone: ClipboardList, badge: resumo.andamento.length },
      ]}
      abaAtiva={aba}
      onAba={setAba}
      acao={{ rotulo: 'Fazer pedido', curto: 'Pedir', Icone: Plus, onClick: fazerPedido, disabled: !podePedir }}
    >
      {(!cliente.ativo || !tabelaLiberada) && (
        <div className="mx-3 sm:mx-5 mt-4 flex items-start gap-2.5 rounded-md border border-st-aguardando/25 bg-st-aguardando-bg px-3.5 py-3 text-[13px] text-st-aguardando">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            {!cliente.ativo
              ? 'Seu cadastro está inativo no momento. Você pode consultar o histórico, mas novos pedidos dependem da liberação da fábrica.'
              : 'Sua tabela de preço ainda não foi liberada para pedidos pelo portal. Fale com seu representante.'}
          </span>
        </div>
      )}

      {/* ================= INÍCIO ================= */}
      {aba === 'inicio' && (
        <>
          <CabecalhoPagina
            titulo={nomeCliente(cliente)}
            resumo={
              resumo.aguardando > 0
                ? `${resumo.aguardando} ${resumo.aguardando === 1 ? 'pedido aguardando' : 'pedidos aguardando'} aprovação da fábrica`
                : resumo.andamento.length > 0
                  ? `${resumo.andamento.length} ${resumo.andamento.length === 1 ? 'pedido em andamento' : 'pedidos em andamento'}`
                  : 'Nenhum pedido em andamento'
            }
            className="!px-3 sm:!px-5"
          />
          <div className="px-3 sm:px-5 space-y-4">
            <FaixaNumeros>
              <CardNumero
                destaque
                rotulo="Total comprado"
                unidade="R$"
                unidadeAntes
                valor={(resumo.totalComprado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                detalhe={`${resumo.qtdComprados} ${resumo.qtdComprados === 1 ? 'pedido faturado' : 'pedidos faturados'}`}
              />
              <CardNumero rotulo="Em andamento" valor={resumo.andamento.length} detalhe="aprovação a faturamento" onClick={() => setAba('pedidos')} />
              <CardNumero
                rotulo="Aguardando"
                valor={resumo.aguardando}
                detalhe={resumo.aguardando > 0 ? 'aprovação da fábrica' : 'nada pendente'}
                alerta={resumo.aguardando > 0 ? 'aguardando' : undefined}
                onClick={() => setAba('pedidos')}
              />
              <CardNumero rotulo="Em produção" valor={resumo.producao} detalhe="já aprovados" />
              <CardNumero
                rotulo="Último pedido"
                valor={resumo.ultimo ? formatarDataBR(resumo.ultimo.data_emissao) : '—'}
                detalhe={resumo.ultimo ? resumo.ultimo.numero_pedido : 'nenhum ainda'}
              />
            </FaixaNumeros>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] items-start">
              <Painel
                titulo="Pedidos recentes"
                contexto={pedidos.length > 0 ? `${pedidos.length} no total` : undefined}
                link={pedidos.length > 0 ? { rotulo: 'Ver todos', onClick: () => setAba('pedidos') } : undefined}
                semPadding
              >
                {resumo.recentes.length === 0 ? (
                  <EstadoVazio
                    titulo="Você ainda não fez pedidos pelo portal"
                    texto="Escolha os produtos da sua tabela em Fazer pedido. A fábrica aprova e você acompanha cada etapa por aqui."
                  />
                ) : (
                  <ul>
                    {resumo.recentes.map((p: PedidoVenda) => (
                      <li key={p.id} className="border-b border-linha last:border-b-0">
                        <button
                          type="button"
                          onClick={() => setAba('pedidos')}
                          className="w-full flex items-center gap-3 px-4 py-3 min-h-[56px] text-left hover:bg-papel-3/50 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ouro"
                        >
                          <span className="flex-1 min-w-0">
                            <span className="block text-[11.5px] text-cinza tabular-nums">{p.numero_pedido} · {formatarDataBR(p.data_emissao)}</span>
                            <span className="block text-[13px] font-semibold text-tinta truncate">{p.itens.map(i => i.produto_nome).join(', ')}</span>
                          </span>
                          <span className="text-right shrink-0">
                            <span className="block text-[15px] font-extrabold tabular-nums text-tinta">{moeda(p.valor_total)}</span>
                            <StatusChip tom={TOM_ETAPA_VENDA[p.etapa] || 'neutro'} className="mt-1">{ROTULO_ETAPA_VENDA[p.etapa]}</StatusChip>
                          </span>
                          <ChevronRight className="w-4 h-4 text-cinza-claro shrink-0 hidden sm:block" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Painel>

              <Painel titulo="Suas condições">
                <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2.5 text-[13px]">
                  <dt className="text-cinza">Pagamento</dt>
                  <dd className="font-semibold text-tinta text-right">{cliente.prazo_pagamento_nome || 'À vista'}</dd>
                  <dt className="text-cinza">Tabela</dt>
                  <dd className="font-semibold text-tinta text-right truncate">{cliente.tabela_preco_nome || '—'}</dd>
                  <dt className="text-cinza">Representante</dt>
                  <dd className="font-semibold text-tinta text-right truncate">{nomeRep || 'Atendimento da fábrica'}</dd>
                </dl>
                {representante && zap ? (
                  <a
                    href={`https://wa.me/55${zap.replace(/^55/, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 flex items-center justify-center gap-2 h-11 sm:h-9 rounded-md border border-linha-forte bg-papel text-[13px] font-semibold text-tinta-2 hover:bg-papel-3 transition-colors focus-visible:outline-2 focus-visible:outline-ouro"
                  >
                    <MessageCircle className="w-4 h-4 text-eno-700" />
                    Falar com {nomeRep.split(' ')[0]} no WhatsApp
                  </a>
                ) : (
                  <p className="mt-4 text-[12px] text-cinza">
                    {representante ? 'Seu representante ainda não tem telefone cadastrado.' : 'Seus pedidos são atendidos direto pela fábrica.'}
                  </p>
                )}
              </Painel>
            </div>
          </div>
        </>
      )}

      {/* ================= MEUS PEDIDOS =================
          Fica sempre montado (escondido no Início) para o atalho "Fazer pedido" abrir o formulário sem reabrir ao trocar de aba. */}
      <div key={`ped_${cliente.id}`} className={aba === 'pedidos' ? 'px-3 sm:px-5 pt-4' : 'hidden'}>
        <PedidosOrcamentosSugestivo clienteFixoId={cliente.id} abrirNovoSinal={sinalNovoPedido} />
      </div>
    </MolduraPortal>
  );
}
