import React, { useState, useMemo } from 'react';
import { CampoNumero } from '../ui/CampoNumero';
import {
  Search,
  Plus,
  Edit2,
  CheckCircle2,
  XCircle,
  Building2,
  User,
  Phone,
  Mail,
  Save,
  Clock,
  Trash2,
  Users,
  Lock,
  Unlock,
  AlertCircle,
  RefreshCw,
  X,
  Calendar,
  Sparkles
} from 'lucide-react';
import {
  CadastroProvisorio,
  isCadastroExpirado,
  getDiasRestantes,
  PermissoesPortifolio,
  PedidoPortifolio
} from '../../data/portfolioData';
import {
  carregarCadastrosProvisorios,
  salvarCadastrosProvisorios,
  carregarPedidosPortfolio,
  salvarPedidosPortfolio,
  carregarRcas,
  EVENTO_CADASTROS_ATUALIZADOS,
} from '../../data/cadastrosData';
import { useListaPersistida } from '../../lib/useListaPersistida';
import { hojeISO, somarDias, formatarDataBR } from '../../lib/datas';
import { CabecalhoPagina, BotaoPrimario } from '../ui/CabecalhoPagina';
import { BarraFiltros, Segmentado, CampoBusca, SeletorFiltro } from '../ui/BarraFiltros';
import { StatusChip } from '../ui/StatusChip';
import { EstadoVazio } from '../ui/EstadoVazio';
import { ModalCadastro, BotaoLinha, BotaoCartao } from './FormularioCadastro';
import { ListaCadastro, LinkLinha } from './ListaCadastro';

interface CadastroProvisorioPortifolioProps {
  onNavigateToCliente?: (clienteId: string) => void;
}

export function CadastroProvisorioPortifolio({
  onNavigateToCliente
}: CadastroProvisorioPortifolioProps) {
  // Lista de Cadastros Provisórios de Portfólio
  // Persistidos no armazenamento local (cadastrosData)
  const [cadastros, setCadastros] = useListaPersistida<CadastroProvisorio>(carregarCadastrosProvisorios, salvarCadastrosProvisorios, EVENTO_CADASTROS_ATUALIZADOS);
  // Pedidos transmitidos pelos convidados no Portal VIP
  const [pedidosPortfolio, setPedidosPortfolio] = useListaPersistida<PedidoPortifolio>(carregarPedidosPortfolio, salvarPedidosPortfolio, EVENTO_CADASTROS_ATUALIZADOS);
  // RCAs cadastrados para o responsável pelo convidado
  const [rcasCadastrados] = useListaPersistida(carregarRcas, () => {}, EVENTO_CADASTROS_ATUALIZADOS);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'ATIVOS' | 'EXPIRADOS'>('TODOS');

  // Modais de Criação / Edição
  const [modalAberto, setModalAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState<CadastroProvisorio | null>(null);

  // Estado do Formulário
  const [formData, setFormData] = useState<{
    nome_convidado: string;
    empresa_solicitante: string;
    cargo: string;
    cpf_cnpj: string;
    email: string;
    telefone_whatsapp: string;
    cidade: string;
    uf: string;
    rca_responsavel_id: string;
    data_vencimento: string;
    permissoes: PermissoesPortifolio;
    observacoes: string;
  }>({
    nome_convidado: '',
    empresa_solicitante: '',
    cargo: '',
    cpf_cnpj: '',
    email: '',
    telefone_whatsapp: '',
    cidade: '',
    uf: 'PR',
    rca_responsavel_id: '',
    data_vencimento: '',
    permissoes: {
      ver_fotos: true,
      ver_precos: true,
      tabela_preco_nome: 'Tabela Padrão (Distribuição)',
      ver_eventos: true,
      ver_parceiros: true,
      liberar_pedidos: false,
      limite_valor_pedido: 50000,
      forma_pagamento_autorizada: 'Boleto Bancário 28 Dias'
    },
    observacoes: ''
  });

  // Contadores para métricas no topo (Apenas Total, Ativos e Expirados)
  const metricas = useMemo(() => {
    const total = cadastros.length;
    const ativos = cadastros.filter(c => !isCadastroExpirado(c.data_vencimento)).length;
    const expirados = cadastros.filter(c => isCadastroExpirado(c.data_vencimento)).length;

    return {
      total,
      ativos,
      expirados
    };
  }, [cadastros]);

  // Lista filtrada
  const cadastrosFiltrados = useMemo(() => {
    return cadastros.filter(c => {
      const matchText =
        c.nome_convidado.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.empresa_solicitante.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.cidade.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchText) return false;

      const isExp = isCadastroExpirado(c.data_vencimento);

      if (statusFilter === 'ATIVOS' && isExp) return false;
      if (statusFilter === 'EXPIRADOS' && !isExp) return false;

      return true;
    });
  }, [cadastros, searchTerm, statusFilter]);

  // Abrir modal para novo cadastro
  const handleAbrirNovo = () => {
    const dataVencDefault = somarDias(hojeISO(), 30);

    setFormData({
      nome_convidado: '',
      empresa_solicitante: '',
      cargo: '',
      cpf_cnpj: '',
      email: '',
      telefone_whatsapp: '',
      cidade: '',
      uf: 'PR',
      rca_responsavel_id: '',
      data_vencimento: dataVencDefault,
      permissoes: {
        ver_fotos: true,
        ver_precos: true,
        tabela_preco_nome: 'Tabela Padrão (Distribuição)',
        ver_eventos: true,
        ver_parceiros: true,
        liberar_pedidos: false,
        limite_valor_pedido: 50000,
        forma_pagamento_autorizada: 'Boleto Bancário 28 Dias'
      },
      observacoes: ''
    });
    setModoEdicao(null);
    setModalAberto(true);
  };

  // Abrir modal para edição
  const handleAbrirEdicao = (c: CadastroProvisorio) => {
    setModoEdicao(c);
    setFormData({
      nome_convidado: c.nome_convidado,
      empresa_solicitante: c.empresa_solicitante,
      cargo: c.cargo || '',
      cpf_cnpj: c.cpf_cnpj,
      email: c.email,
      telefone_whatsapp: c.telefone_whatsapp,
      cidade: c.cidade,
      uf: c.uf,
      rca_responsavel_id: c.rca_responsavel_id || '',
      data_vencimento: c.data_vencimento,
      permissoes: { ...c.permissoes },
      observacoes: c.observacoes || ''
    });
    setModalAberto(true);
  };

  // Atalhos rápidos de prorrogação no formulário
  const handleSetDiasVencimento = (dias: number) => {
    setFormData(prev => ({
      ...prev,
      data_vencimento: somarDias(hojeISO(), dias)
    }));
  };

  // Salvar formulário
  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome_convidado.trim() || !formData.empresa_solicitante.trim() || !formData.data_vencimento) {
      alert('Por favor, preencha o Nome, Empresa e Data de Vencimento.');
      return;
    }

    const rcaSel = rcasCadastrados.find(r => r.id === formData.rca_responsavel_id);
    const rcaCampos = {
      rca_responsavel_id: rcaSel?.id,
      rca_responsavel_nome: rcaSel ? (rcaSel.nome_fantasia || rcaSel.nome_completo) : undefined,
    };

    if (modoEdicao) {
      setCadastros(prev => prev.map(c => {
        if (c.id === modoEdicao.id) {
          const exp = isCadastroExpirado(formData.data_vencimento);
          return {
            ...c,
            ...formData,
            ...rcaCampos,
            status: c.status === 'BLOQUEADO' ? 'BLOQUEADO' : (exp ? 'EXPIRADO' : 'ATIVO')
          };
        }
        return c;
      }));
    } else {
      const randomCode = Math.floor(1000 + Math.random() * 9000);
      const novoId = `port_${Date.now()}`;
      const exp = isCadastroExpirado(formData.data_vencimento);

      const novoCadastro: CadastroProvisorio = {
        id: novoId,
        codigo_acesso: `ENO-VIP-${randomCode}`,
        nome_convidado: formData.nome_convidado,
        empresa_solicitante: formData.empresa_solicitante,
        cargo: formData.cargo,
        cpf_cnpj: formData.cpf_cnpj,
        email: formData.email,
        telefone_whatsapp: formData.telefone_whatsapp,
        cidade: formData.cidade,
        uf: formData.uf,
        ...rcaCampos,
        data_criacao: hojeISO(),
        data_vencimento: formData.data_vencimento,
        status: exp ? 'EXPIRADO' : 'ATIVO',
        permissoes: formData.permissoes,
        observacoes: formData.observacoes,
        visualizacoes_count: 0,
        pedidos_realizados: []
      };

      setCadastros(prev => [novoCadastro, ...prev]);
    }

    setModalAberto(false);
  };

  // Alternar rapidamente a liberação de pedidos na tabela
  const handleToggleLiberarPedidos = (id: string) => {
    setCadastros(prev => prev.map(c => {
      if (c.id === id) {
        return {
          ...c,
          permissoes: {
            ...c.permissoes,
            liberar_pedidos: !c.permissoes.liberar_pedidos
          }
        };
      }
      return c;
    }));
  };

  // Prorrogação rápida (+15d) na tabela
  const handleProrrogarRapido = (id: string, diasMais: number) => {
    setCadastros(prev => prev.map(c => {
      if (c.id === id) {
        const novaDataStr = somarDias(hojeISO(), diasMais);
        return {
          ...c,
          data_vencimento: novaDataStr,
          status: 'ATIVO'
        };
      }
      return c;
    }));
  };

  // Excluir cadastro provisório
  const handleExcluir = (id: string) => {
    if (confirm('Deseja realmente excluir este cadastro provisório de portfólio?')) {
      setCadastros(prev => prev.filter(c => c.id !== id));
    }
  };

  const statusVip = (item: CadastroProvisorio) => {
    const dias = getDiasRestantes(item.data_vencimento);
    if (isCadastroExpirado(item.data_vencimento)) return <StatusChip tom="vencido">Expirado</StatusChip>;
    if (dias <= 2) return <StatusChip tom="aguardando">Vence em {dias}d</StatusChip>;
    return <StatusChip tom="pago">Ativo · {dias} dias</StatusChip>;
  };
  const chavePedidos = (item: CadastroProvisorio, grande?: boolean) => (
    <button
      type="button"
      onClick={() => handleToggleLiberarPedidos(item.id)}
      aria-pressed={item.permissoes.liberar_pedidos}
      title={item.permissoes.liberar_pedidos ? 'Clique para bloquear pedidos' : 'Clique para liberar pedidos'}
      className={`inline-flex items-center justify-center gap-1.5 ${grande ? 'h-10 w-full' : 'h-8'} px-2.5 rounded-md text-[12.5px] font-semibold border transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ouro ${
        item.permissoes.liberar_pedidos
          ? 'bg-st-pago-bg text-st-pago border-st-pago/25'
          : 'bg-papel text-cinza border-linha-forte hover:text-tinta'
      }`}
    >
      {item.permissoes.liberar_pedidos ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
      {item.permissoes.liberar_pedidos ? 'Pedidos liberados' : 'Pedidos bloqueados'}
    </button>
  );

  return (
    <div className="relative h-full w-full min-h-0 flex flex-col bg-papel-2 text-tinta overflow-hidden">
      <div className="mx-auto w-full max-w-[1700px]">
        <CabecalhoPagina
          titulo="Acessos VIP"
          resumo={
            metricas.total === 0
              ? 'Cadastros provisórios com prazo para ver o portfólio, preços e fazer pedidos'
              : `${metricas.total} ${metricas.total === 1 ? 'cadastro' : 'cadastros'} · ${metricas.ativos} ${metricas.ativos === 1 ? 'ativo' : 'ativos'}${metricas.expirados ? ` · ${metricas.expirados} expirados` : ''}`
          }
          acoes={
            metricas.total === 0 ? undefined : (
              <BotaoPrimario onClick={handleAbrirNovo} className="w-full sm:w-auto h-10 sm:h-9">
                <Plus className="w-4 h-4" /> Novo acesso VIP
              </BotaoPrimario>
            )
          }
        />
        {metricas.total > 0 && (
          <BarraFiltros>
            <Segmentado<'TODOS' | 'ATIVOS' | 'EXPIRADOS'>
              rotuloAria="Situação"
              valor={statusFilter as 'TODOS' | 'ATIVOS' | 'EXPIRADOS'}
              onChange={v => setStatusFilter(v)}
              opcoes={[
                { valor: 'TODOS', rotulo: 'Todos', contagem: metricas.total },
                { valor: 'ATIVOS', rotulo: 'Ativos', contagem: metricas.ativos },
                { valor: 'EXPIRADOS', rotulo: 'Expirados', contagem: metricas.expirados },
              ]}
            />
            <CampoBusca valor={searchTerm} onChange={setSearchTerm} placeholder="Buscar convidado, empresa ou cidade" className="w-full md:w-80 [&_input]:h-10 sm:[&_input]:h-8" />
          </BarraFiltros>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1700px] px-4 sm:px-6 pb-6 space-y-5">
          {cadastrosFiltrados.length === 0 ? (
            <div className="bg-papel border border-linha rounded-md">
              {metricas.total === 0 ? (
                <EstadoVazio
                  titulo="Nenhum acesso VIP criado"
                  texto="Crie um acesso com data limite para um comprador conhecer o portfólio, ver preços e, se liberado, fazer pedidos."
                  acao={<BotaoPrimario onClick={handleAbrirNovo} className="h-10 sm:h-9"><Plus className="w-4 h-4" /> Novo acesso VIP</BotaoPrimario>}
                />
              ) : (
                <EstadoVazio titulo="Nenhum acesso com esses filtros" texto="Confira a busca ou volte para Todos." />
              )}
            </div>
          ) : (
            <ListaCadastro<CadastroProvisorio>
              itens={cadastrosFiltrados}
              chave={c => c.id}
              cartao={c => ({
                sobre: `${c.codigo_acesso} · vence ${formatarDataBR(c.data_vencimento)}`,
                titulo: c.nome_convidado,
                subtitulo: `${c.empresa_solicitante} · ${c.cidade}/${c.uf}`,
                status: statusVip(c),
                detalhes: [c.telefone_whatsapp],
              })}
              acoesCartao={c => (
                <div className="flex flex-col gap-2 w-full">
                  {chavePedidos(c, true)}
                  <div className="flex gap-2">
                    <BotaoCartao onClick={() => handleProrrogarRapido(c.id, 15)} className="flex-1"><RefreshCw className="w-3.5 h-3.5" /> +15 dias</BotaoCartao>
                    <BotaoCartao onClick={() => handleAbrirEdicao(c)} className="flex-1"><Edit2 className="w-3.5 h-3.5" /> Editar</BotaoCartao>
                    <BotaoCartao perigo onClick={() => handleExcluir(c.id)} rotulo={`Excluir ${c.nome_convidado}`} className="w-10 !px-0"><Trash2 className="w-4 h-4" /></BotaoCartao>
                  </div>
                </div>
              )}
              colunas={[
                {
                  titulo: 'Convidado',
                  render: c => (
                    <>
                      <div className="font-semibold text-tinta">{c.nome_convidado}</div>
                      <div className="text-[11.5px] text-cinza">{c.empresa_solicitante} · {c.cidade}/{c.uf}</div>
                    </>
                  ),
                },
                { titulo: 'Código', className: 'tabular-nums whitespace-nowrap', render: c => c.codigo_acesso },
                { titulo: 'Telefone', className: 'tabular-nums whitespace-nowrap', render: c => c.telefone_whatsapp || '—' },
                { titulo: 'Vencimento', className: 'tabular-nums whitespace-nowrap', render: c => formatarDataBR(c.data_vencimento) },
                { titulo: 'Situação', render: c => statusVip(c) },
                { titulo: 'Pedidos', render: c => chavePedidos(c) },
              ]}
              acoesLinha={c => (
                <>
                  <LinkLinha onClick={() => handleProrrogarRapido(c.id, 15)} title="Prorrogar 15 dias"><RefreshCw className="w-3.5 h-3.5" /> +15d</LinkLinha>
                  <BotaoLinha rotulo="Editar acesso" onClick={() => handleAbrirEdicao(c)}><Edit2 className="w-4 h-4" /></BotaoLinha>
                  <BotaoLinha perigo rotulo="Excluir acesso" onClick={() => handleExcluir(c.id)}><Trash2 className="w-4 h-4" /></BotaoLinha>
                </>
              )}
            />
          )}

          {/* PEDIDOS TRANSMITIDOS PELOS CONVIDADOS (PORTAL VIP) */}
          <section>
            <div className="flex items-baseline justify-between gap-3 pt-2 pb-2.5">
              <h2 className="text-[17px] font-bold tracking-[-0.01em] text-tinta">Pedidos recebidos pelo Portal VIP</h2>
              <span className="text-[12px] text-cinza tabular-nums">{pedidosPortfolio.length} {pedidosPortfolio.length === 1 ? 'pedido' : 'pedidos'}</span>
            </div>
            {pedidosPortfolio.length === 0 ? (
              <div className="bg-papel border border-linha rounded-md">
                <EstadoVazio titulo="Nenhum pedido dos convidados ainda" texto="Quando um convidado com pedidos liberados enviar um pedido pelo Portal VIP, ele aparece aqui para acompanhar." />
              </div>
            ) : (
              <ListaCadastro<PedidoPortifolio>
                itens={pedidosPortfolio}
                chave={p => p.id}
                cartao={p => ({
                  sobre: `${p.numero_pedido} · ${p.data_hora}`,
                  titulo: p.nome_convidado,
                  subtitulo: `${p.empresa_solicitante}${p.rca_nome ? ` · ${p.rca_nome}` : ''}`,
                  status: <span className="text-[15px] font-extrabold tabular-nums text-tinta">R$ {Number(p.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>,
                  detalhes: p.itens.map(it => `${it.quantidade}x ${it.produto_nome} (${it.tipo_embalagem})`),
                })}
                acoesCartao={p => (
                  <SeletorFiltro
                    value={p.status}
                    aria-label={`Situação do pedido ${p.numero_pedido}`}
                    onChange={(e) => {
                      const status = e.target.value as PedidoPortifolio['status'];
                      setPedidosPortfolio(prev => prev.map(x => x.id === p.id ? { ...x, status } : x));
                    }}
                    className="w-full h-10"
                  >
                    <option value="Aguardando Aprovação">Aguardando aprovação</option>
                    <option value="Aprovado pelo RCA">Aprovado pelo RCA</option>
                    <option value="Em Faturamento">Em faturamento</option>
                    <option value="Entregue">Entregue</option>
                  </SeletorFiltro>
                )}
                colunas={[
                  {
                    titulo: 'Pedido',
                    render: p => (
                      <>
                        <div className="font-semibold text-tinta tabular-nums">{p.numero_pedido}</div>
                        <div className="text-[11.5px] text-cinza tabular-nums">{p.data_hora}</div>
                      </>
                    ),
                  },
                  {
                    titulo: 'Convidado',
                    render: p => (
                      <>
                        <div className="font-semibold text-tinta">{p.nome_convidado}</div>
                        <div className="text-[11.5px] text-cinza">{p.empresa_solicitante}</div>
                      </>
                    ),
                  },
                  { titulo: 'RCA', render: p => p.rca_nome || '—' },
                  {
                    titulo: 'Itens',
                    render: p => (
                      <div className="text-[12px]">
                        {p.itens.map((it, idx) => <div key={idx}>{it.quantidade}x {it.produto_nome} ({it.tipo_embalagem})</div>)}
                      </div>
                    ),
                  },
                  { titulo: 'Total', numero: true, className: 'font-semibold text-tinta', render: p => `R$ ${Number(p.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
                  {
                    titulo: 'Situação',
                    render: p => (
                      <SeletorFiltro
                        value={p.status}
                        aria-label={`Situação do pedido ${p.numero_pedido}`}
                        onChange={(e) => {
                          const status = e.target.value as PedidoPortifolio['status'];
                          setPedidosPortfolio(prev => prev.map(x => x.id === p.id ? { ...x, status } : x));
                        }}
                      >
                        <option value="Aguardando Aprovação">Aguardando aprovação</option>
                        <option value="Aprovado pelo RCA">Aprovado pelo RCA</option>
                        <option value="Em Faturamento">Em faturamento</option>
                        <option value="Entregue">Entregue</option>
                      </SeletorFiltro>
                    ),
                  },
                ]}
              />
            )}
          </section>
        </div>
      </div>

      {/* Novo / editar acesso VIP */}
      {modalAberto && (
        <ModalCadastro
          onSubmit={handleSalvar}
          onFechar={() => setModalAberto(false)}
          titulo={modoEdicao ? 'Editar acesso VIP' : 'Novo acesso VIP'}
          subtitulo="Dados do convidado, prazo do acesso e o que ele pode ver e fazer"
          rotuloSalvar={modoEdicao ? 'Salvar alterações' : 'Criar acesso'}
          largura="max-w-6xl"
        >
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-start">

                {/* COLUNA ESQUERDA: DADOS PESSOAIS & EMPRESA */}
                <div className="space-y-4">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-eno-900 border-b border-linha pb-1.5 flex items-center gap-2">
                    <User className="w-4 h-4 text-eno-700" />
                    <span>Dados do Convidado & Empresa</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-tinta-2 mb-1">
                        Nome do Convidado / Prospect *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.nome_convidado}
                        onChange={(e) => setFormData({ ...formData, nome_convidado: e.target.value })}
                        placeholder="Ex: Carlos Eduardo Drummond"
                        className="w-full bg-papel border border-linha-forte rounded-md px-3.5 py-2 text-xs text-tinta focus:outline-none focus:border-eno-600 font-medium"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-tinta-2 mb-1">
                        Empresa / Razão Social *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.empresa_solicitante}
                        onChange={(e) => setFormData({ ...formData, empresa_solicitante: e.target.value })}
                        placeholder="Ex: Laticínios Vale Verde S/A"
                        className="w-full bg-papel border border-linha-forte rounded-md px-3.5 py-2 text-xs text-tinta focus:outline-none focus:border-eno-600 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-tinta-2 mb-1">
                        CPF ou CNPJ
                      </label>
                      <input
                        type="text"
                        value={formData.cpf_cnpj}
                        onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value })}
                        placeholder="00.000.000/0001-00"
                        className="w-full bg-papel border border-linha-forte rounded-md px-3.5 py-2 text-xs text-tinta focus:outline-none focus:border-eno-600 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-tinta-2 mb-1">
                        WhatsApp / Celular
                      </label>
                      <input
                        type="text"
                        value={formData.telefone_whatsapp}
                        onChange={(e) => setFormData({ ...formData, telefone_whatsapp: e.target.value })}
                        placeholder="(00) 00000-0000"
                        className="w-full bg-papel border border-linha-forte rounded-md px-3.5 py-2 text-xs text-tinta focus:outline-none focus:border-eno-600 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-tinta-2 mb-1">
                        E-mail
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="contato@empresa.com.br"
                        className="w-full bg-papel border border-linha-forte rounded-md px-3.5 py-2 text-xs text-tinta focus:outline-none focus:border-eno-600 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-tinta-2 mb-1">
                        Cidade & UF
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={formData.cidade}
                          onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                          placeholder="Cidade"
                          className="col-span-2 bg-papel border border-linha-forte rounded-md px-3 py-2 text-xs text-tinta focus:outline-none focus:border-eno-600 font-medium"
                        />
                        <input
                          type="text"
                          value={formData.uf}
                          maxLength={2}
                          onChange={(e) => setFormData({ ...formData, uf: e.target.value.toUpperCase() })}
                          placeholder="UF"
                          className="bg-papel border border-linha-forte rounded-md px-2 py-2 text-xs text-tinta text-center font-bold uppercase focus:outline-none focus:border-eno-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-tinta-2 mb-1">
                        RCA Responsável
                      </label>
                      <select
                        value={formData.rca_responsavel_id}
                        onChange={(e) => setFormData({ ...formData, rca_responsavel_id: e.target.value })}
                        className="w-full bg-papel border border-linha-forte rounded-md px-3 py-2 text-xs text-tinta focus:outline-none focus:border-eno-600 font-medium"
                      >
                        <option value="">Sem RCA (botão "Fale com seu RCA" fica oculto)</option>
                        {rcasCadastrados.map(r => (
                          <option key={r.id} value={r.id}>
                            {r.codigo_rca} · {r.nome_fantasia || r.nome_completo}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* COLUNA DIREITA: VENCIMENTO & LIBERAÇÃO DE PEDIDOS */}
                <div className="space-y-4">

                  {/* Bloco de Vencimento */}
                  <div className="bg-eno-50/70 p-4 rounded-md border border-linha space-y-2.5">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-eno-900 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-eno-700" />
                      <span>Data de Vencimento do Acesso *</span>
                    </h4>

                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="date"
                        required
                        value={formData.data_vencimento}
                        onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
                        className="bg-papel border border-eno-900/30 rounded-md px-3 py-1.5 text-xs font-bold text-tinta focus:outline-none focus:border-eno-600 "
                      />

                      {/* Atalhos Rápidos */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSetDiasVencimento(7)}
                          className="px-2.5 py-1.5 rounded-lg bg-papel hover:bg-eno-100 border border-linha-forte text-xs font-bold text-eno-900 cursor-pointer "
                        >
                          +7d
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetDiasVencimento(15)}
                          className="px-2.5 py-1.5 rounded-lg bg-papel hover:bg-eno-100 border border-linha-forte text-xs font-bold text-eno-900 cursor-pointer "
                        >
                          +15d
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetDiasVencimento(30)}
                          className="px-2.5 py-1.5 rounded-lg bg-eno-800 text-white text-xs font-bold cursor-pointer "
                        >
                          +30d
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetDiasVencimento(60)}
                          className="px-2.5 py-1.5 rounded-lg bg-papel hover:bg-eno-100 border border-linha-forte text-xs font-bold text-eno-900 cursor-pointer "
                        >
                          +60d
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Bloco de Liberação de Pedidos */}
                  <div className={`p-4 rounded-md border transition-all ${
                    formData.permissoes.liberar_pedidos
                      ? 'bg-eno-600/80 border-eno-600'
                      : 'bg-papel-2 border-linha'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-extrabold uppercase tracking-wider text-tinta flex items-center gap-2">
                          <span>Liberar Emissão de Pedidos</span>
                          {formData.permissoes.liberar_pedidos && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-eno-600 text-eno-600">
                              LIBERADO
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-tinta-2 mt-0.5">
                          Permite ao convidado transmitir pedidos online através do portfólio.
                        </p>
                      </div>

                      {/* Switch Toggle */}
                      <button
                        type="button"
                        onClick={() => setFormData({
                          ...formData,
                          permissoes: { ...formData.permissoes, liberar_pedidos: !formData.permissoes.liberar_pedidos }
                        })}
                        className={`
                          w-13 h-7 rounded-full p-1 transition-colors cursor-pointer flex items-center
                          ${formData.permissoes.liberar_pedidos ? 'bg-eno-600 justify-end' : 'bg-slate-300 justify-start'}
                        `}
                      >
                        <div className="w-5 h-5 rounded-full bg-papel " />
                      </button>
                    </div>

                    {formData.permissoes.liberar_pedidos && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-eno-600 animate-fadeIn">
                        <div>
                          <label className="block text-[11px] font-bold text-tinta-2 uppercase tracking-wider mb-1">
                            Limite para Pedidos (R$)
                          </label>
                          <CampoNumero
                            min={0}
                            ocultarZero
                            value={formData.permissoes.limite_valor_pedido}
                            onChange={(n) => setFormData({
                              ...formData,
                              permissoes: { ...formData.permissoes, limite_valor_pedido: n }
                            })}
                            placeholder="Ex: 50000"
                            className="w-full bg-papel border border-eno-600 rounded-md px-3 py-1.5 text-xs tabular-nums font-bold text-tinta"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-tinta-2 uppercase tracking-wider mb-1">
                            Condição de Pagamento
                          </label>
                          <select
                            value={formData.permissoes.forma_pagamento_autorizada}
                            onChange={(e) => setFormData({
                              ...formData,
                              permissoes: { ...formData.permissoes, forma_pagamento_autorizada: e.target.value }
                            })}
                            className="w-full bg-papel border border-eno-600 rounded-md px-2.5 py-1.5 text-xs font-bold text-tinta cursor-pointer"
                          >
                            <option value="Boleto Bancário 28 Dias">Boleto Bancário 28 Dias</option>
                            <option value="Boleto Bancário 35 Dias">Boleto Bancário 35 Dias</option>
                            <option value="PIX Imediato (4.5% Desconto)">PIX Imediato (4.5% Desconto)</option>
                            <option value="Faturamento Especial 30/60 Dias">Faturamento Especial 30/60 Dias</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Observações */}
                  <div>
                    <label className="block text-xs font-bold text-tinta-2 mb-1">
                      Observações Comerciais
                    </label>
                    <textarea
                      rows={2}
                      value={formData.observacoes}
                      onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                      placeholder="Informações adicionais sobre o prospect ou negociação..."
                      className="w-full bg-papel border border-linha-forte rounded-md p-2.5 text-xs text-tinta focus:outline-none focus:border-eno-600 font-medium"
                    />
                  </div>

                </div>

              </div>

            </div>
        </ModalCadastro>
      )}

    </div>
  );
}
