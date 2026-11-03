import React, { useState } from 'react';
import { EMPRESA } from '../../lib/empresa';
import {
  Building2,
  Calendar,
  Clock,
  CreditCard,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  Package,
  Image as ImageIcon,
  Users,
  DollarSign,
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  Check,
  Copy,
  FileText,
  Plus,
  Minus,
  Trash2,
  ChevronRight,
  MapPin,
  Phone,
  Mail,
  Sparkles,
  Info,
  Maximize2,
  X,
  Send
} from 'lucide-react';
import {
  CadastroProvisorio,
  PortfolioProduto,
  PortfolioEvento,
  PortfolioParceiro,
  PedidoPortifolio,
  ItemPedidoPortifolio,
  PRODUTOS_PORTFOLIO,
  EVENTOS_PORTFOLIO,
  PARCEIROS_PORTFOLIO,
  isCadastroExpirado,
  isAcessoPortfolioBloqueado,
  getDiasRestantes
} from '../../data/portfolioData';
import { obterRcaPorId, registrarPedidoPortfolio, carregarPedidosPortfolio } from '../../data/cadastrosData';
import { formatarDataBR } from '../../lib/datas';

interface PortalConvidadoExclusivoProps {
  cadastro: CadastroProvisorio;
  onVoltar: () => void;
  onNovoPedidoRealizado?: (pedido: PedidoPortifolio) => void;
}

export function PortalConvidadoExclusivo({
  cadastro,
  onVoltar,
  onNovoPedidoRealizado
}: PortalConvidadoExclusivoProps) {
  // Permissões de exibição definidas no Cadastro Provisório
  const perm = cadastro.permissoes || ({} as CadastroProvisorio['permissoes']);
  const abaInicial: 'fotos' | 'precos' | 'eventos' | 'parceiros' | 'pedido' =
    perm.ver_fotos ? 'fotos' : perm.ver_precos ? 'precos' : perm.ver_eventos ? 'eventos' : perm.ver_parceiros ? 'parceiros' : 'pedido';
  const [activeTab, setActiveTab] = useState<'fotos' | 'precos' | 'eventos' | 'parceiros' | 'pedido'>(abaInicial);

  // RCA responsável (telefone do cadastro de RCA, nunca o do convidado)
  const rcaResponsavel = obterRcaPorId(cadastro.rca_responsavel_id);
  const telefoneRca = (rcaResponsavel?.whatsapp || rcaResponsavel?.telefone || '').replace(/\D/g, '');
  const nomeRca = rcaResponsavel ? (rcaResponsavel.nome_fantasia || rcaResponsavel.nome_completo) : '';
  const [erroPedido, setErroPedido] = useState<string>('');

  // Imagem em destaque ampliada no modal
  const [fotoModal, setFotoModal] = useState<{ url: string; titulo: string; specs?: { rotulo: string; valor: string }[] } | null>(null);

  // Evento selecionado para modal de confirmação de presença
  const [eventoModal, setEventoModal] = useState<PortfolioEvento | null>(null);
  const [presencaConfirmada, setPresencaConfirmada] = useState(false);

  // Estado do Carrinho de Pedidos do Convidado
  const [carrinho, setCarrinho] = useState<{
    produto: PortfolioProduto;
    embalagem: 'Saco 25kg' | 'Big Bag 1000kg';
    quantidade: number;
  }[]>([]);

  const [formaPagamento, setFormaPagamento] = useState<string>(
    cadastro.permissoes.forma_pagamento_autorizada || 'Boleto Bancário 28 Dias'
  );
  const [enderecoEntrega, setEnderecoEntrega] = useState<string>(
    cadastro.cidade ? `${cadastro.cidade}/${cadastro.uf}` : ''
  );
  const [observacoesPedido, setObservacoesPedido] = useState<string>('');
  const [pedidoSucesso, setPedidoSucesso] = useState<PedidoPortifolio | null>(null);

  const expirado = isCadastroExpirado(cadastro.data_vencimento);
  const acessoBloqueado = isAcessoPortfolioBloqueado(cadastro);
  const diasRestantes = getDiasRestantes(cadastro.data_vencimento);

  // Formatação de data
  const dataVencFormatada = () => {
    if (!cadastro.data_vencimento) return 'Não definida';
    return formatarDataBR(cadastro.data_vencimento);
  };

  // Cálculos do Carrinho
  const calcularSubtotalItem = (item: { produto: PortfolioProduto; embalagem: 'Saco 25kg' | 'Big Bag 1000kg'; quantidade: number }) => {
    const preco = item.embalagem === 'Big Bag 1000kg' ? item.produto.preco_big_bag : item.produto.preco_saco_25kg;
    return preco * item.quantidade;
  };

  const calcularPesoTotalKg = () => {
    return carrinho.reduce((acc, item) => {
      const pesoUnit = item.embalagem === 'Big Bag 1000kg' ? 1000 : 25;
      return acc + (pesoUnit * item.quantidade);
    }, 0);
  };

  const calcularTotalGeral = () => {
    return carrinho.reduce((acc, item) => acc + calcularSubtotalItem(item), 0);
  };

  // Adicionar produto ao carrinho
  const handleAdicionarAoCarrinho = (prod: PortfolioProduto, embalagem: 'Saco 25kg' | 'Big Bag 1000kg') => {
    const existeIndex = carrinho.findIndex(i => i.produto.id === prod.id && i.embalagem === embalagem);
    if (existeIndex >= 0) {
      const novo = [...carrinho];
      novo[existeIndex].quantidade += 1;
      setCarrinho(novo);
    } else {
      setCarrinho([...carrinho, { produto: prod, embalagem, quantidade: 1 }]);
    }
    setActiveTab('pedido');
  };

  // Alterar quantidade
  const handleAlterarQuantidade = (index: number, delta: number) => {
    const novo = [...carrinho];
    const qtd = novo[index].quantidade + delta;
    if (qtd <= 0) {
      novo.splice(index, 1);
    } else {
      novo[index].quantidade = qtd;
    }
    setCarrinho(novo);
  };

  // Remover item
  const handleRemoverItem = (index: number) => {
    const novo = [...carrinho];
    novo.splice(index, 1);
    setCarrinho(novo);
  };

  // Finalizar envio do pedido
  const handleFinalizarPedido = () => {
    setErroPedido('');
    if (carrinho.length === 0) return;
    // Revalida no momento do envio (o cadastro pode ter vencido com a tela aberta)
    if (isAcessoPortfolioBloqueado(cadastro)) {
      setErroPedido('Seu acesso ao portfólio está expirado ou bloqueado. Solicite a renovação ao seu RCA.');
      return;
    }
    if (!perm.liberar_pedidos) {
      setErroPedido('A emissão de pedidos não está liberada para este cadastro.');
      return;
    }
    const totalPedido = calcularTotalGeral();
    const limite = Number(perm.limite_valor_pedido) || 0;
    if (limite > 0 && totalPedido > limite) {
      setErroPedido(`O pedido (R$ ${totalPedido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) ultrapassa o limite autorizado de R$ ${limite.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`);
      return;
    }

    const novoPedido: PedidoPortifolio = {
      id: `ped_port_${Date.now()}`,
      // Sequencial no ano (o sorteio de 3 dígitos repetia números)
      numero_pedido: (() => {
        const ano = new Date().getFullYear();
        const maior = carregarPedidosPortfolio().reduce((max, p) => {
          const prefixo = `PED-VIP-${ano}-`;
          const num = String(p.numero_pedido || '').startsWith(prefixo) ? parseInt(String(p.numero_pedido).slice(prefixo.length), 10) : NaN;
          const m = Number.isFinite(num) ? [prefixo, String(num)] : null;
          return m ? Math.max(max, parseInt(m[1], 10)) : max;
        }, 0);
        return `PED-VIP-${ano}-${String(maior + 1).padStart(3, '0')}`;
      })(),
      cadastro_provisorio_id: cadastro.id,
      nome_convidado: cadastro.nome_convidado,
      empresa_solicitante: cadastro.empresa_solicitante,
      rca_nome: nomeRca || cadastro.rca_responsavel_nome || 'Central de Vendas Grupo ENO',
      data_hora: new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
      status: 'Aguardando Aprovação',
      itens: carrinho.map(item => ({
        produto_id: item.produto.id,
        produto_nome: item.produto.nome,
        tipo_embalagem: item.embalagem,
        quantidade: item.quantidade,
        preco_unitario: item.embalagem === 'Big Bag 1000kg' ? item.produto.preco_big_bag : item.produto.preco_saco_25kg,
        subtotal: calcularSubtotalItem(item)
      })),
      valor_total: calcularTotalGeral(),
      forma_pagamento: formaPagamento,
      endereco_entrega: enderecoEntrega,
      observacoes_pedido: observacoesPedido || 'Pedido gerado pelo Portfólio Reservado'
    };

    // Grava de verdade (lista 'grupo_eno_pedidos_portfolio_v1' + histórico do cadastro)
    registrarPedidoPortfolio(novoPedido);
    setPedidoSucesso(novoPedido);
    if (onNovoPedidoRealizado) {
      onNovoPedidoRealizado(novoPedido);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#0a1510] text-slate-100 flex flex-col overflow-y-auto select-none">

      {/* ========================================================= */}
      {/* 1. TOPO EXCLUSIVO DO PORTAL RESERVADO (SHOWROOM VIP)       */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-40 w-full bg-[#041d13]/95 backdrop-blur-md border-b border-emerald-800/50 shadow-2xl">
        <div className="mx-auto flex h-14 sm:h-[72px] w-full max-w-[1700px] items-center justify-between gap-2 px-3 sm:px-8">

          {/* Logo e Identificação */}
          <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
            <button
              onClick={onVoltar}
              aria-label="Sair do portal"
              className="
                flex items-center justify-center gap-1.5 h-10 min-w-10 px-2.5 sm:px-3 rounded-md text-xs sm:text-sm font-bold shrink-0
                bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-200
                transition-colors cursor-pointer shadow-sm
              "
              title="Voltar ao Painel"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Voltar ao Painel</span>
            </button>

            <div className="hidden sm:block h-6 w-px bg-emerald-800/60" />

            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <img src={EMPRESA.logo} alt="" className="h-8 w-8 sm:h-10 sm:w-10 object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)] shrink-0" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[15px] sm:text-2xl font-extrabold tracking-tight text-white whitespace-nowrap">Grupo ENO</span>
                  <span className="hidden sm:inline px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-amber-400/20 text-amber-300 border border-amber-400/40">
                    Portfólio Reservado VIP
                  </span>
                </div>
                <p className="text-xs text-emerald-300/80 font-medium hidden sm:block">
                  Área Exclusiva para Convidados & Parceiros Homologados
                </p>
              </div>
            </div>
          </div>

          {/* Dados do Convidado e Vencimento */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end text-right">
              <div className="flex items-center gap-1.5 text-xs text-white font-bold">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span>{cadastro.nome_convidado}</span>
              </div>
              <span className="text-[11px] text-emerald-300/80 tabular-nums truncate max-w-[240px]">
                {cadastro.empresa_solicitante}
              </span>
            </div>

            {/* Badge de Validade / Vencimento */}
            {expirado ? (
              <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-md bg-red-950/80 border border-red-500/80 text-red-200 text-xs font-bold shadow-lg shrink-0">
                <AlertCircle className="w-4 h-4 text-red-400 animate-pulse" />
                <span>Expirado<span className="hidden sm:inline"> ({dataVencFormatada()})</span></span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-md bg-emerald-950/90 border border-emerald-500/60 text-emerald-200 text-xs font-bold shadow-lg shrink-0">
                <Clock className="w-4 h-4 text-emerald-400 hidden sm:block" />
                <span className="hidden sm:inline">Válido até {dataVencFormatada()}</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-800 text-[10px] text-emerald-100 tabular-nums">
                  {diasRestantes}d restantes
                </span>
              </div>
            )}

            {/* Permissão de Pedido Badge */}
            {cadastro.permissoes.liberar_pedidos ? (
              <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-lime-500/20 border border-lime-400/50 text-lime-300 text-xs font-extrabold">
                <Unlock className="w-3.5 h-3.5" />
                <span>Pedidos Liberados</span>
              </div>
            ) : (
              <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-400 text-xs font-semibold">
                <Lock className="w-3.5 h-3.5" />
                <span>Apenas Consulta</span>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. ALERTA CASO EXPIRADO                                   */}
      {/* ========================================================= */}
      {acessoBloqueado && (
        <div className="w-full bg-gradient-to-r from-red-900/90 via-rose-900/90 to-red-900/90 border-b border-red-500/60 p-4 text-white text-center shadow-lg">
          <div className="mx-auto max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-left">
              <AlertCircle className="w-7 h-7 text-red-300 shrink-0" />
              <div>
                <h4 className="font-extrabold text-sm sm:text-base text-white">
                  {expirado
                    ? <>Atenção: Seu cadastro provisório de portfólio venceu em {dataVencFormatada()}.</>
                    : <>Atenção: Seu acesso ao portfólio está bloqueado.</>}
                </h4>
                <p className="text-xs text-red-100">
                  Para prorrogar o prazo de acesso ou formalizar orçamentos, entre em contato diretamente com o seu Representante Comercial (RCA).
                </p>
              </div>
            </div>
            {telefoneRca && (
            <a
              href={`https://wa.me/55${telefoneRca}?text=Ol%C3%A1%2C%20gostaria%20de%20solicitar%20a%20renova%C3%A7%C3%A3o%20do%20meu%20acesso%20ao%20Portf%C3%B3lio%20VIP%20Grupo%20ENO`}
              target="_blank"
              rel="noreferrer"
              className="
                px-4 py-2 rounded-xl bg-white text-red-900 font-extrabold text-xs sm:text-sm
                hover:bg-red-50 transition-colors shadow-md shrink-0 flex items-center gap-2
              "
            >
              <Phone className="w-4 h-4" />
              <span>Falar com RCA ({nomeRca})</span>
            </a>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. HERO BANNER DE BOAS-VINDAS AO CONVIDADO                */}
      {/* ========================================================= */}
      <section className="relative w-full bg-gradient-to-b from-[#062418] via-[#083020] to-[#0a1510] border-b border-emerald-900/60 py-5 sm:py-8 px-4 sm:px-8">
        <div className="mx-auto max-w-[1700px]">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-3xl">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                Seja bem-vindo, {cadastro.nome_convidado}
              </h1>
              <p className="text-sm sm:text-base text-emerald-200/80 leading-relaxed line-clamp-3 sm:line-clamp-none">
                Este é o showroom digital reservado do <strong className="text-white font-bold">Grupo ENO</strong> preparado especialmente para a equipe da <strong className="text-white font-bold">{cadastro.empresa_solicitante}</strong>. Aqui você tem acesso em primeira mão às fotos em alta resolução de nossas linhas de féculas e polvilhos, agenda de eventos e feiras, parceiros homologados e tabela de preços com condições especiais de negociação.
              </p>
            </div>

            {/* Cartão de Resumo do Acesso */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-[#031910]/90 border border-emerald-700/50 rounded-2xl p-4 shadow-xl">
              <div className="border-r border-emerald-800/40 pr-3">
                <span className="text-[11px] uppercase tracking-wider text-emerald-400/80 font-bold block">Tabela Atribuída</span>
                <span className="text-xs sm:text-sm font-extrabold text-white truncate block">
                  {cadastro.permissoes.tabela_preco_nome || 'Tabela Padrão'}
                </span>
              </div>
              <div className="border-r border-emerald-800/40 pr-3">
                <span className="text-[11px] uppercase tracking-wider text-emerald-400/80 font-bold block">Status do Passe</span>
                <span className={`text-xs sm:text-sm font-extrabold ${acessoBloqueado ? 'text-red-400' : 'text-emerald-300'}`}>
                  {acessoBloqueado ? (expirado ? 'Expirado' : 'Bloqueado') : 'Ativo e Válido'}
                </span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-[11px] uppercase tracking-wider text-emerald-400/80 font-bold block">Emissão de Pedidos</span>
                <span className={`text-xs sm:text-sm font-extrabold ${cadastro.permissoes.liberar_pedidos ? 'text-lime-400' : 'text-slate-400'}`}>
                  {cadastro.permissoes.liberar_pedidos ? 'Liberado (Online)' : 'Sob Consulta'}
                </span>
              </div>
            </div>
          </div>

          {/* Abas de Navegação do Portfólio */}
          <div className="mt-5 sm:mt-8 -mx-4 px-4 sm:mx-0 sm:px-0 flex flex-nowrap sm:flex-wrap items-center gap-2 sm:gap-3 overflow-x-auto border-t border-emerald-800/40 pt-4 sm:pt-6" role="tablist" aria-label="Seções do portfólio">
            {perm.ver_fotos && (
            <button
              onClick={() => setActiveTab('fotos')}
              className={`
                shrink-0 whitespace-nowrap flex items-center gap-2 sm:gap-2.5 h-11 px-4 sm:px-5 rounded-md text-[13px] sm:text-sm font-extrabold transition-all cursor-pointer
                ${activeTab === 'fotos'
                  ? 'bg-gradient-to-r from-emerald-700 to-emerald-600 text-white shadow-lg shadow-emerald-700/30'
                  : 'bg-[#031b12] text-emerald-200/80 hover:bg-[#06281b] hover:text-white border border-emerald-800/50'
                }
              `}
            >
              <ImageIcon className="w-4.5 h-4.5" />
              <span>Fotos & Lotes da Indústria</span>
            </button>
            )}

            {perm.ver_precos && (
            <button
              onClick={() => setActiveTab('precos')}
              className={`
                shrink-0 whitespace-nowrap flex items-center gap-2 sm:gap-2.5 h-11 px-4 sm:px-5 rounded-md text-[13px] sm:text-sm font-extrabold transition-all cursor-pointer
                ${activeTab === 'precos'
                  ? 'bg-gradient-to-r from-emerald-700 to-emerald-600 text-white shadow-lg shadow-emerald-700/30'
                  : 'bg-[#031b12] text-emerald-200/80 hover:bg-[#06281b] hover:text-white border border-emerald-800/50'
                }
              `}
            >
              <DollarSign className="w-4.5 h-4.5" />
              <span>Tabela de Preços & Condições</span>
            </button>
            )}

            {perm.ver_eventos && (
            <button
              onClick={() => setActiveTab('eventos')}
              className={`
                shrink-0 whitespace-nowrap flex items-center gap-2 sm:gap-2.5 h-11 px-4 sm:px-5 rounded-md text-[13px] sm:text-sm font-extrabold transition-all cursor-pointer
                ${activeTab === 'eventos'
                  ? 'bg-gradient-to-r from-emerald-700 to-emerald-600 text-white shadow-lg shadow-emerald-700/30'
                  : 'bg-[#031b12] text-emerald-200/80 hover:bg-[#06281b] hover:text-white border border-emerald-800/50'
                }
              `}
            >
              <Calendar className="w-4.5 h-4.5" />
              <span>Eventos, Feiras & Encontros</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-400/20 text-amber-300 tabular-nums font-bold">
                {EVENTOS_PORTFOLIO.length}
              </span>
            </button>
            )}

            {perm.ver_parceiros && (
            <button
              onClick={() => setActiveTab('parceiros')}
              className={`
                shrink-0 whitespace-nowrap flex items-center gap-2 sm:gap-2.5 h-11 px-4 sm:px-5 rounded-md text-[13px] sm:text-sm font-extrabold transition-all cursor-pointer
                ${activeTab === 'parceiros'
                  ? 'bg-gradient-to-r from-emerald-700 to-emerald-600 text-white shadow-lg shadow-emerald-700/30'
                  : 'bg-[#031b12] text-emerald-200/80 hover:bg-[#06281b] hover:text-white border border-emerald-800/50'
                }
              `}
            >
              <Users className="w-4.5 h-4.5" />
              <span>Parceiros & Produtores Certificados</span>
            </button>
            )}

            <button
              onClick={() => setActiveTab('pedido')}
              className={`
                shrink-0 whitespace-nowrap flex items-center gap-2 sm:gap-2.5 h-11 px-4 sm:px-5 rounded-md text-[13px] sm:text-sm font-extrabold transition-all cursor-pointer relative
                ${activeTab === 'pedido'
                  ? 'bg-gradient-to-r from-amber-500 to-emerald-600 text-slate-950 font-black shadow-lg shadow-amber-500/20'
                  : cadastro.permissoes.liberar_pedidos
                    ? 'bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-400/40'
                    : 'bg-[#031b12] text-slate-400 hover:bg-[#06281b] border border-slate-700/60'
                }
              `}
            >
              <ShoppingBag className="w-4.5 h-4.5" />
              <span>
                {cadastro.permissoes.liberar_pedidos ? 'Fazer Pedido Online' : 'Fazer Pedidos (Bloqueado)'}
              </span>
              {cadastro.permissoes.liberar_pedidos && (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-400 text-slate-950 font-black">
                  {carrinho.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 4. CONTEÚDO PRINCIPAL DAS ABAS                            */}
      {/* ========================================================= */}
      <main className="flex-1 w-full max-w-[1700px] mx-auto px-3 sm:px-8 py-5 sm:py-8">
        {acessoBloqueado ? (
          <div className="bg-[#041c12] rounded-3xl border border-red-500/40 p-8 sm:p-12 text-center max-w-3xl mx-auto shadow-2xl space-y-4">
            <div className="mx-auto w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-300">
              <Lock className="w-10 h-10 stroke-[2.2]" />
            </div>
            <h2 className="text-2xl font-black text-white">Acesso ao portfólio indisponível</h2>
            <p className="text-sm text-slate-300 max-w-xl mx-auto">
              {expirado ? `Seu cadastro provisório venceu em ${dataVencFormatada()}.` : 'Seu cadastro provisório está bloqueado.'} Solicite a renovação ao seu Representante Comercial.
            </p>
          </div>
        ) : (
        <>

        {/* ======================================================= */}
        {/* ABA 1: FOTOS & LOTES DA INDÚSTRIA                       */}
        {/* ======================================================= */}
        {activeTab === 'fotos' && perm.ver_fotos && (
          <div className="space-y-8 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-900/60 pb-5">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
                  <ImageIcon className="w-6 h-6 text-emerald-400" />
                  <span>Galeria de Fotos da Fábrica, Lavouras & Lotes Técnicos</span>
                </h2>
                <p className="text-xs sm:text-sm text-emerald-300/80 mt-1">
                  Imagens reais de nossa estrutura industrial em Jacarezinho/PR, processos de moagem, flash drying e expedição de sacarias.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs text-emerald-300 font-semibold bg-emerald-950/80 border border-emerald-700/50 px-3.5 py-2 rounded-xl">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Auditoria FSSC 22000 & Rastreabilidade de Origem</span>
              </div>
            </div>

            {/* Grid de Produtos com Fotos e Especificações */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {PRODUTOS_PORTFOLIO.map((prod) => (
                <div
                  key={prod.id}
                  className="
                    bg-[#031e13] rounded-2xl border border-emerald-700/40 overflow-hidden shadow-xl
                    hover:border-emerald-500/70 transition-all duration-200 flex flex-col group
                  "
                >
                  {/* Foto Principal com Zoom */}
                  <div className="relative h-60 w-full overflow-hidden bg-emerald-950">
                    <img
                      src={prod.foto_url}
                      alt={prod.nome}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#031e13] via-transparent to-black/30" />

                    {/* Badge da Categoria */}
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold tracking-wide uppercase bg-emerald-950/90 text-emerald-300 border border-emerald-700/60 shadow">
                        {prod.categoria}
                      </span>
                    </div>

                    {/* Botão Ampliar Foto */}
                    <button
                      onClick={() => setFotoModal({ url: prod.foto_url, titulo: prod.nome, specs: prod.especificacoes })}
                      className="
                        absolute bottom-3 right-3 p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white
                        border border-white/20 transition-colors shadow-md cursor-pointer flex items-center gap-1.5 text-xs font-bold
                      "
                      title="Ampliar Foto e Especificações"
                    >
                      <Maximize2 className="w-4 h-4" />
                      <span>Ver Detalhes</span>
                    </button>
                  </div>

                  {/* Informações */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <h3 className="text-lg font-black text-white group-hover:text-emerald-300 transition-colors">
                        {prod.nome}
                      </h3>
                      <p className="text-xs text-emerald-400 font-semibold mt-0.5">
                        {prod.subtitulo}
                      </p>
                      <p className="text-xs text-slate-300/80 leading-relaxed mt-2.5 line-clamp-3">
                        {prod.descricao}
                      </p>
                    </div>

                    {/* Especificações Técnicas Rápidas */}
                    <div className="bg-[#02140d] rounded-xl p-3 border border-emerald-800/40 space-y-1.5 text-xs">
                      {prod.especificacoes.slice(0, 3).map((spec, sIdx) => (
                        <div key={sIdx} className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">{spec.rotulo}:</span>
                          <span className="text-emerald-200 font-bold tabular-nums">{spec.valor}</span>
                        </div>
                      ))}
                    </div>

                    {/* Preços e Ações */}
                    <div className="pt-3 border-t border-emerald-800/40 flex items-center justify-between">
                      {perm.ver_precos ? (
                      <div>
                        <span className="text-[10px] uppercase text-emerald-400/80 font-bold block">A partir de</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg font-black text-white tabular-nums">
                            R$ {prod.preco_kg.toFixed(2).replace('.', ',')}
                          </span>
                          <span className="text-[11px] text-slate-400">/ kg</span>
                        </div>
                      </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-bold">Preço sob consulta</span>
                      )}

                      {cadastro.permissoes.liberar_pedidos ? (
                        <button
                          onClick={() => handleAdicionarAoCarrinho(prod, 'Saco 25kg')}
                          className="
                            px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white
                            text-xs font-extrabold transition-colors shadow-md flex items-center gap-1.5 cursor-pointer
                          "
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>Adicionar Pedido</span>
                        </button>
                      ) : perm.ver_precos && (
                        <button
                          onClick={() => setActiveTab('precos')}
                          className="
                            px-3 py-1.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-300
                            border border-emerald-700/50 text-xs font-bold transition-colors cursor-pointer
                          "
                        >
                          Ver Tabela
                        </button>
                      )}
                    </div>

                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================= */}
        {/* ABA 2: TABELA DE PREÇOS & CONDIÇÕES                     */}
        {/* ======================================================= */}
        {activeTab === 'precos' && perm.ver_precos && (
          <div className="space-y-8 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-900/60 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
                    <DollarSign className="w-6 h-6 text-emerald-400" />
                    <span>Tabela Oficial de Preços Grupo ENO</span>
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-400/20 text-amber-300 border border-amber-400/40">
                    {cadastro.permissoes.tabela_preco_nome || 'Tabela Padrão'}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-emerald-300/80 mt-1">
                  Valores válidos para entregas CIF/FOB com desconto especial para pagamento via PIX ou faturamento em boleto cadastrado.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-emerald-300 tabular-nums">
                  Base de Cotação: Paraná (PR) e São Paulo (SP)
                </span>
              </div>
            </div>

            {/* Celular: preços em cartões */}
            <ul className="sm:hidden rounded-2xl border border-emerald-700/40 bg-[#031d12] divide-y divide-emerald-800/30">
              {PRODUTOS_PORTFOLIO.map((prod) => (
                <li key={prod.id} className="px-4 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[11px] text-emerald-400/80">{prod.categoria} · {prod.disponibilidade_safra}</div>
                      <div className="font-extrabold text-white text-[15px] leading-snug">{prod.nome}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="tabular-nums font-extrabold text-white text-[17px]">R$ {prod.preco_kg.toFixed(2).replace('.', ',')}</div>
                      <div className="text-[11px] text-emerald-300/80">por kg</div>
                    </div>
                  </div>
                  <div className="mt-2 flex justify-between text-[12px] tabular-nums text-emerald-200/90">
                    <span>Saco 25 kg <strong className="text-white">R$ {prod.preco_saco_25kg.toFixed(2).replace('.', ',')}</strong></span>
                    <span>Big Bag <strong className="text-white">R$ {prod.preco_big_bag.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
                  </div>
                  {cadastro.permissoes.liberar_pedidos && (
                    <div className="mt-2.5 flex gap-2">
                      <button onClick={() => handleAdicionarAoCarrinho(prod, 'Saco 25kg')} className="flex-1 h-10 rounded-md bg-emerald-800/80 active:bg-emerald-700 text-white text-[13px] font-bold cursor-pointer">+ Saco 25 kg</button>
                      <button onClick={() => handleAdicionarAoCarrinho(prod, 'Big Bag 1000kg')} className="flex-1 h-10 rounded-md bg-emerald-600 active:bg-emerald-500 text-white text-[13px] font-bold cursor-pointer">+ Big Bag</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>

            {/* Tabela de Preços Detalhada */}
            <div className="hidden sm:block overflow-x-auto rounded-2xl border border-emerald-700/40 bg-[#031d12] shadow-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#02140c] border-b border-emerald-800/60 text-[11px] font-extrabold uppercase tracking-wider text-emerald-300">
                    <th className="py-4 px-6">Produto / Especificação</th>
                    <th className="py-4 px-4">Categoria</th>
                    <th className="py-4 px-4 text-right">Preço por KG</th>
                    <th className="py-4 px-4 text-right">Saco de 25 KG</th>
                    <th className="py-4 px-4 text-right">Big Bag (1.000 KG)</th>
                    <th className="py-4 px-4 text-center">Safra / Estoque</th>
                    <th className="py-4 px-6 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-800/30 text-xs sm:text-sm">
                  {PRODUTOS_PORTFOLIO.map((prod) => (
                    <tr key={prod.id} className="hover:bg-emerald-950/40 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-extrabold text-white">{prod.nome}</div>
                        <div className="text-xs text-emerald-400/80">{prod.subtitulo}</div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-900/60 text-emerald-200 border border-emerald-700/40">
                          {prod.categoria}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right tabular-nums font-extrabold text-white text-base">
                        R$ {prod.preco_kg.toFixed(2).replace('.', ',')}
                      </td>
                      <td className="py-4 px-4 text-right tabular-nums font-bold text-emerald-200">
                        R$ {prod.preco_saco_25kg.toFixed(2).replace('.', ',')}
                      </td>
                      <td className="py-4 px-4 text-right tabular-nums font-bold text-emerald-300">
                        R$ {prod.preco_big_bag.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-900/70 text-emerald-300 border border-emerald-600/40">
                          <CheckCircle2 className="w-3.5 h-3.5 text-lime-400" />
                          <span>{prod.disponibilidade_safra}</span>
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        {cadastro.permissoes.liberar_pedidos ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleAdicionarAoCarrinho(prod, 'Saco 25kg')}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-800/80 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
                              title="Adicionar Saco 25kg"
                            >
                              + 25kg
                            </button>
                            <button
                              onClick={() => handleAdicionarAoCarrinho(prod, 'Big Bag 1000kg')}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer"
                              title="Adicionar Big Bag 1000kg"
                            >
                              + Big Bag
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Sob Cotação</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Condições Comerciais Gerais */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-[#031d12] rounded-2xl p-5 border border-emerald-800/40 space-y-2">
                <div className="flex items-center gap-2 text-emerald-300 font-extrabold text-sm">
                  <CreditCard className="w-4.5 h-4.5 text-emerald-400" />
                  <span>Condições de Pagamento</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Faturamento em 28, 35 ou 42 dias mediante aprovação de crédito comercial. Desconto financeiro de 4.5% para liquidação via PIX imediato após pesagem de carga.
                </p>
              </div>

              <div className="bg-[#031d12] rounded-2xl p-5 border border-emerald-800/40 space-y-2">
                <div className="flex items-center gap-2 text-emerald-300 font-extrabold text-sm">
                  <Package className="w-4.5 h-4.5 text-emerald-400" />
                  <span>Embalagens e Paletização</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Sacos de ráfia valvulada de 25kg paletizados e plastificados com filme stretch para proteção contra umidade, ou Big Bags de ráfia virgem de 1.000kg com alças de içamento reforçadas.
                </p>
              </div>

              <div className="bg-[#031d12] rounded-2xl p-5 border border-emerald-800/40 space-y-2">
                <div className="flex items-center gap-2 text-emerald-300 font-extrabold text-sm">
                  <FileText className="w-4.5 h-4.5 text-emerald-400" />
                  <span>Laudos e Rastreabilidade</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Todos os lotes faturados acompanham Laudo de Análise Físico-Química e Microbiológica assinado pelo Responsável Técnico químico do Grupo ENO com CRQ ativo.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================= */}
        {/* ABA 3: EVENTOS, FEIRAS & ENCONTROS                      */}
        {/* ======================================================= */}
        {activeTab === 'eventos' && perm.ver_eventos && (
          <div className="space-y-8 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-900/60 pb-5">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
                  <Calendar className="w-6 h-6 text-emerald-400" />
                  <span>Agenda Oficial de Eventos & Feiras do Grupo ENO</span>
                </h2>
                <p className="text-xs sm:text-sm text-emerald-300/80 mt-1">
                  Encontros presenciais de negócios, estandes em feiras do agronegócio e dias de campo abertos para convidados credenciados.
                </p>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-400/10 border border-amber-400/40 text-amber-300 text-xs font-bold">
                <Sparkles className="w-4 h-4" />
                <span>Atendimento VIP & Degustação nos Estandes</span>
              </div>
            </div>

            {/* Grid de Eventos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {EVENTOS_PORTFOLIO.map((ev) => (
                <div
                  key={ev.id}
                  className="
                    bg-[#031e13] rounded-2xl border border-emerald-700/40 overflow-hidden shadow-xl
                    hover:border-emerald-500/70 transition-all duration-200 flex flex-col sm:flex-row
                  "
                >
                  {/* Foto do Evento */}
                  <div className="sm:w-2/5 h-52 sm:h-auto relative overflow-hidden bg-emerald-950">
                    <img
                      src={ev.imagem_url}
                      alt={ev.titulo}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#031e13] sm:bg-gradient-to-r sm:from-transparent sm:to-[#031e13]" />
                    <span className="absolute top-3 left-3 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-black/70 text-white border border-white/20">
                      {ev.tipo}
                    </span>
                  </div>

                  {/* Detalhes do Evento */}
                  <div className="sm:w-3/5 p-5 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{ev.data_inicio} {ev.data_fim !== ev.data_inicio ? `a ${ev.data_fim}` : ''}</span>
                        <span>•</span>
                        <Clock className="w-3.5 h-3.5" />
                        <span>{ev.horario}</span>
                      </div>

                      <h3 className="text-base sm:text-lg font-black text-white mt-1.5 leading-snug">
                        {ev.titulo}
                      </h3>

                      <p className="text-xs text-slate-300/80 leading-relaxed mt-2 line-clamp-3">
                        {ev.descricao}
                      </p>
                    </div>

                    <div className="space-y-1.5 pt-3 border-t border-emerald-800/40 text-xs">
                      <div className="flex items-center gap-2 text-emerald-300">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">{ev.local} ({ev.cidade_uf})</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300 font-semibold">
                        <Building2 className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                        <span>{ev.estande}</span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={() => {
                          setEventoModal(ev);
                          setPresencaConfirmada(false);
                        }}
                        className="
                          w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-700 to-emerald-600
                          hover:from-emerald-500 hover:to-lime-500 text-white font-extrabold text-xs sm:text-sm
                          shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer
                        "
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirmar Presença / Agendar Reunião VIP</span>
                      </button>
                    </div>

                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================= */}
        {/* ABA 4: PARCEIROS & PRODUTORES CERTIFICADOS              */}
        {/* ======================================================= */}
        {activeTab === 'parceiros' && perm.ver_parceiros && (
          <div className="space-y-8 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-900/60 pb-5">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
                  <Users className="w-6 h-6 text-emerald-400" />
                  <span>Rede de Parceiros, Produtores & Certificadoras Homologadas</span>
                </h2>
                <p className="text-xs sm:text-sm text-emerald-300/80 mt-1">
                  Transparência de ponta a ponta: conheça as famílias produtoras de mandioca, certificadoras de qualidade e operadores logísticos do Grupo ENO.
                </p>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-700/50 text-emerald-300 text-xs font-bold">
                <ShieldCheck className="w-4 h-4 text-lime-400" />
                <span>100% dos Parceiros Auditados</span>
              </div>
            </div>

            {/* Grid de Parceiros */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {PARCEIROS_PORTFOLIO.map((parc) => (
                <div
                  key={parc.id}
                  className="
                    bg-[#031e13] rounded-2xl border border-emerald-700/40 p-6 shadow-xl
                    hover:border-emerald-500/70 transition-all flex flex-col justify-between space-y-5
                  "
                >
                  <div className="flex items-start gap-4">
                    <img
                      src={parc.foto_url}
                      alt={parc.nome}
                      className="w-20 h-20 rounded-2xl object-cover border border-emerald-600/50 shadow-md shrink-0"
                    />
                    <div className="space-y-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-900/80 text-emerald-300 border border-emerald-700/40">
                        {parc.categoria}
                      </span>
                      <h3 className="text-base sm:text-lg font-black text-white leading-snug">
                        {parc.nome}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{parc.regiao}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300/90 leading-relaxed">
                    {parc.descricao}
                  </p>

                  <div className="pt-4 border-t border-emerald-800/40 flex flex-wrap items-center gap-2">
                    {parc.selos.map((selo, sIdx) => (
                      <span
                        key={sIdx}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#02140d] text-emerald-300 border border-emerald-700/50 flex items-center gap-1"
                      >
                        <Check className="w-3 h-3 text-lime-400" />
                        <span>{selo}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================= */}
        {/* ABA 5: FAZER PEDIDOS (ONLINE SE LIBERADO)               */}
        {/* ======================================================= */}
        {activeTab === 'pedido' && (
          <div className="space-y-8 animate-fadeIn">

            {/* SE O PEDIDO NÃO ESTIVER LIBERADO PARA ESSE CONVIDADO */}
            {!cadastro.permissoes.liberar_pedidos ? (
              <div className="bg-[#041c12] rounded-3xl border border-amber-500/40 p-8 sm:p-12 text-center max-w-3xl mx-auto shadow-2xl space-y-6">
                <div className="mx-auto w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
                  <Lock className="w-10 h-10 stroke-[2.2]" />
                </div>

                <div className="space-y-2">
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/40">
                    Acesso Restrito para Emissão de Pedidos
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-white">
                    A Emissão Direta de Pedidos está Bloqueada para este Portfólio
                  </h2>
                  <p className="text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
                    Seu cadastro provisório possui autorização para consulta de fotos, laudos técnicos, eventos e preços vigentes. A formalização de pedidos online requer liberação prévia pelo administrador comercial do Grupo ENO ou pelo seu RCA responsável.
                  </p>
                </div>

                <div className="bg-[#02120a] rounded-2xl p-5 border border-emerald-800/50 text-left max-w-lg mx-auto space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Representante Comercial Responsável:
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-base font-extrabold text-white">
                        {nomeRca || 'Equipe Comercial Grupo ENO'}
                      </div>
                      <div className="text-xs text-slate-400">
                        Atendimento ao Cliente & Cadastros Provisórios
                      </div>
                    </div>
                    {telefoneRca && (
                      <div className="text-xs text-emerald-300 tabular-nums font-bold">
                        {rcaResponsavel?.whatsapp || rcaResponsavel?.telefone}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
                  {telefoneRca && (
                  <a
                    href={`https://wa.me/55${telefoneRca}?text=Ol%C3%A1%20${encodeURIComponent(nomeRca || 'Comercial')}%2C%20sou%20${encodeURIComponent(cadastro.nome_convidado)}%20da%20${encodeURIComponent(cadastro.empresa_solicitante)}.%20Estou%20no%20Portf%C3%B3lio%20Reservado%20VIP%20e%20gostaria%20de%20solicitar%20a%20libera%C3%A7%C3%A3o%20para%20fazer%20pedidos.`}
                    target="_blank"
                    rel="noreferrer"
                    className="
                      w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-700 to-emerald-600
                      hover:from-emerald-500 hover:to-lime-500 text-white font-black text-sm
                      shadow-xl shadow-emerald-700/20 transition-all flex items-center justify-center gap-2.5
                    "
                  >
                    <Phone className="w-4.5 h-4.5" />
                    <span>Solicitar Liberação de Pedido no WhatsApp</span>
                  </a>
                  )}

                  <button
                    onClick={() => setActiveTab('fotos')}
                    className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition-colors cursor-pointer"
                  >
                    Continuar Explorando o Catálogo
                  </button>
                </div>
              </div>
            ) : (
              /* SE O PEDIDO ESTIVER LIBERADO */
              <div className="space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-900/60 pb-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
                        <ShoppingBag className="w-6 h-6 text-lime-400" />
                        <span>Central de Emissão de Pedidos do Convidado</span>
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-lime-500/20 text-lime-300 border border-lime-400/40">
                        Liberado com Condição Especial
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-emerald-300/80 mt-1">
                      Monte sua programação de compras diretamente nesta tela. O pedido será transmitido à expedição e ao RCA com confirmação imediata.
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">Limite Autorizado</span>
                    <span className="text-base tabular-nums font-black text-lime-400">
                      {cadastro.permissoes.limite_valor_pedido
                        ? `Até R$ ${cadastro.permissoes.limite_valor_pedido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        : 'Sem limite restritivo'
                      }
                    </span>
                  </div>
                </div>

                {/* MODAL DE SUCESSO DE PEDIDO REALIZADO */}
                {pedidoSucesso && (
                  <div className="bg-[#032a1b] rounded-3xl border border-lime-400/70 p-6 sm:p-8 shadow-2xl text-center space-y-4">
                    <div className="mx-auto w-16 h-16 rounded-full bg-lime-500/20 text-lime-400 flex items-center justify-center border border-lime-400/40">
                      <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-lime-400 uppercase tracking-wider">
                        Transmissão Concluída com Sucesso!
                      </span>
                      <h3 className="text-2xl font-black text-white mt-1">
                        Pedido Registrado: {pedidoSucesso.numero_pedido}
                      </h3>
                      <p className="text-xs sm:text-sm text-emerald-200 mt-2 max-w-xl mx-auto">
                        Seu pedido no valor total de <strong className="text-white tabular-nums">R$ {pedidoSucesso.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> foi transmitido para a equipe de faturamento e para o RCA <strong className="text-white">{pedidoSucesso.rca_nome}</strong>.
                      </p>
                    </div>

                    <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                      <button
                        onClick={() => {
                          setPedidoSucesso(null);
                          setCarrinho([]);
                        }}
                        className="px-5 py-2.5 rounded-xl bg-lime-500 hover:bg-lime-400 text-emerald-950 font-black text-xs transition-colors cursor-pointer"
                      >
                        Fazer Novo Pedido
                      </button>
                      <button
                        onClick={onVoltar}
                        className="px-5 py-2.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 border border-emerald-700/60 text-white font-bold text-xs transition-colors cursor-pointer"
                      >
                        Voltar ao Painel Geral
                      </button>
                    </div>
                  </div>
                )}

                {/* Se não enviou o pedido ainda, exibe o fluxo do carrinho */}
                {!pedidoSucesso && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                    {/* COLUNA ESQUERDA: ITENS DO PEDIDO (8 cols) */}
                    <div className="lg:col-span-8 space-y-6">

                      {/* Tabela de Itens no Carrinho */}
                      <div className="bg-[#031d12] rounded-2xl border border-emerald-700/40 p-3.5 sm:p-5 shadow-xl space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-1 border-b border-emerald-800/40 pb-3">
                          <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                            <Package className="w-5 h-5 text-emerald-400" />
                            <span>Itens do Pedido ({carrinho.length})</span>
                          </h3>
                          <span className="text-xs text-emerald-300 tabular-nums">
                            Peso Total: {calcularPesoTotalKg().toLocaleString('pt-BR')} KG ({(calcularPesoTotalKg() / 1000).toFixed(2)} Toneladas)
                          </span>
                        </div>

                        {carrinho.length === 0 ? (
                          <div className="py-12 text-center text-slate-400 space-y-3">
                            <ShoppingBag className="w-12 h-12 mx-auto text-emerald-800" />
                            <p className="text-sm font-semibold">Nenhum produto adicionado ao pedido ainda.</p>
                            <button
                              onClick={() => setActiveTab('precos')}
                              className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
                            >
                              Ver Catálogo de Preços
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {carrinho.map((item, index) => (
                              <div
                                key={index}
                                className="
                                  bg-[#02140d] rounded-xl p-4 border border-emerald-800/50 flex flex-col sm:flex-row
                                  sm:items-center justify-between gap-4 hover:border-emerald-600/50 transition-colors
                                "
                              >
                                <div className="flex items-center gap-3">
                                  <img
                                    src={item.produto.foto_url}
                                    alt={item.produto.nome}
                                    className="w-14 h-14 rounded-xl object-cover border border-emerald-700/40 shrink-0"
                                  />
                                  <div>
                                    <h4 className="font-extrabold text-sm text-white">
                                      {item.produto.nome}
                                    </h4>
                                    <div className="flex items-center gap-2 text-xs text-emerald-300 mt-0.5">
                                      <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-[10px] font-bold">
                                        {item.embalagem}
                                      </span>
                                      <span>
                                        Unitário: R$ {(item.embalagem === 'Big Bag 1000kg' ? item.produto.preco_big_bag : item.produto.preco_saco_25kg).toFixed(2).replace('.', ',')}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-emerald-900/50">
                                  {/* Seletor de Quantidade */}
                                  <div className="flex items-center gap-2 bg-[#010d08] rounded-xl p-1 border border-emerald-800/60">
                                    <button
                                      onClick={() => handleAlterarQuantidade(index, -1)}
                                      className="w-10 h-10 sm:w-7 sm:h-7 rounded-lg bg-emerald-950 hover:bg-emerald-800 text-white flex items-center justify-center transition-colors cursor-pointer"
                                      title="Diminuir"
                                    >
                                      <Minus className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="w-10 text-center tabular-nums font-extrabold text-white text-sm">
                                      {item.quantidade}
                                    </span>
                                    <button
                                      onClick={() => handleAlterarQuantidade(index, 1)}
                                      className="w-10 h-10 sm:w-7 sm:h-7 rounded-lg bg-emerald-950 hover:bg-emerald-800 text-white flex items-center justify-center transition-colors cursor-pointer"
                                      title="Aumentar"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  {/* Subtotal do Item */}
                                  <div className="text-right min-w-[110px]">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Subtotal</span>
                                    <span className="tabular-nums font-black text-white text-base">
                                      R$ {calcularSubtotalItem(item).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                  </div>

                                  {/* Remover */}
                                  <button
                                    onClick={() => handleRemoverItem(index)}
                                    className="w-10 h-10 inline-flex items-center justify-center rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-950/40 transition-colors cursor-pointer"
                                    title="Remover Item"
                                    aria-label="Remover item"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Botão Adicionar Mais Itens */}
                        <div className="pt-2 flex justify-between items-center">
                          <button
                            onClick={() => setActiveTab('precos')}
                            className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Adicionar outros produtos do catálogo</span>
                          </button>
                        </div>
                      </div>

                      {/* Informações de Faturamento e Entrega */}
                      <div className="bg-[#031d12] rounded-2xl border border-emerald-700/40 p-5 shadow-xl space-y-4">
                        <h3 className="text-base font-extrabold text-white flex items-center gap-2 border-b border-emerald-800/40 pb-3">
                          <MapPin className="w-5 h-5 text-emerald-400" />
                          <span>Endereço de Entrega & Observações Operacionais</span>
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-emerald-300 uppercase tracking-wider mb-1.5">
                              Local de Descarga
                            </label>
                            <input
                              type="text"
                              value={enderecoEntrega}
                              onChange={(e) => setEnderecoEntrega(e.target.value)}
                              className="w-full bg-[#02140d] border border-emerald-700/60 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
                              placeholder="Endereço com rua, número, galpão e cidade"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-emerald-300 uppercase tracking-wider mb-1.5">
                              Forma de Pagamento Autorizada
                            </label>
                            <select
                              value={formaPagamento}
                              onChange={(e) => setFormaPagamento(e.target.value)}
                              className="w-full bg-[#02140d] border border-emerald-700/60 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium cursor-pointer"
                            >
                              <option value="Boleto Bancário 28 Dias">Boleto Bancário 28 Dias</option>
                              <option value="Boleto Bancário 35 Dias">Boleto Bancário 35 Dias</option>
                              <option value="PIX Imediato (4.5% Desconto)">PIX Imediato (4.5% Desconto)</option>
                              <option value="Faturamento Especial 30/60 Dias">Faturamento Especial 30/60 Dias</option>
                            </select>
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-xs font-bold text-emerald-300 uppercase tracking-wider mb-1.5">
                              Instruções Especiais / Observações de Carga
                            </label>
                            <textarea
                              rows={2}
                              value={observacoesPedido}
                              onChange={(e) => setObservacoesPedido(e.target.value)}
                              className="w-full bg-[#02140d] border border-emerald-700/60 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
                              placeholder="Ex: Entrega em caminhão sider, janela de recebimento das 08h às 17h, laudo com lote anexo."
                            />
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* COLUNA DIREITA: RESUMO FINANCEIRO (4 cols) */}
                    <div className="lg:col-span-4 sticky top-24 space-y-4">
                      <div className="bg-gradient-to-b from-[#032a19] to-[#021c11] rounded-2xl border border-emerald-600/60 p-6 shadow-2xl space-y-5">
                        <div className="border-b border-emerald-700/50 pb-4">
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-300">
                            Resumo do Pedido VIP
                          </span>
                          <h4 className="text-xl font-black text-white mt-0.5">
                            Total a Faturar
                          </h4>
                        </div>

                        <div className="space-y-3 text-xs sm:text-sm">
                          <div className="flex items-center justify-between text-slate-300">
                            <span>Quantidade de Itens:</span>
                            <span className="tabular-nums font-bold text-white">{carrinho.length} linhas</span>
                          </div>

                          <div className="flex items-center justify-between text-slate-300">
                            <span>Carga Estimada:</span>
                            <span className="tabular-nums font-bold text-white">
                              {calcularPesoTotalKg().toLocaleString('pt-BR')} kg
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-slate-300">
                            <span>Frete:</span>
                            <span className="font-bold text-emerald-300">CIF (Incluso pela Indústria)</span>
                          </div>

                          <div className="flex items-center justify-between text-slate-300">
                            <span>Condição:</span>
                            <span className="font-bold text-white truncate max-w-[180px]">{formaPagamento}</span>
                          </div>

                          <div className="pt-3 border-t border-emerald-700/50 flex items-baseline justify-between">
                            <span className="text-sm font-extrabold text-emerald-200">Total do Pedido:</span>
                            <span className="text-2xl font-black text-lime-400 tabular-nums">
                              R$ {calcularTotalGeral().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>

                        {erroPedido && (
                          <div className="flex items-start gap-2 rounded-xl border border-red-400/60 bg-red-900/40 p-3 text-xs font-semibold text-red-100">
                            <AlertCircle className="w-4 h-4 shrink-0 text-red-300" />
                            <span>{erroPedido}</span>
                          </div>
                        )}

                        {/* Botão de Transmitir Pedido */}
                        <button
                          onClick={handleFinalizarPedido}
                          disabled={carrinho.length === 0 || acessoBloqueado}
                          className="
                            w-full py-4 px-6 rounded-xl bg-gradient-to-r from-lime-500 to-emerald-600
                            hover:from-lime-400 hover:to-emerald-500 text-slate-950 font-black text-sm
                            shadow-xl shadow-lime-500/20 transition-all flex items-center justify-center gap-2
                            cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed
                          "
                        >
                          <Send className="w-4.5 h-4.5 stroke-[2.5]" />
                          <span>Transmitir Pedido para o Grupo ENO</span>
                        </button>

                        <div className="flex items-center gap-2 text-[11px] text-emerald-300/80 leading-tight">
                          <Info className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>
                            Ao transmitir, este pedido será vinculado à sua conta provisória e notificado ao RCA responsável.
                          </span>
                        </div>
                      </div>
                    </div>

                  </div>
                )}

              </div>
            )}

          </div>
        )}

        </>
        )}
      </main>

      {/* ========================================================= */}
      {/* 5. MODAL DE ZOOM DE FOTO / ESPECIFICAÇÕES TÉCNICAS (AMPLO) */}
      {/* ========================================================= */}
      {fotoModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md sm:p-6 flex justify-center items-stretch sm:items-start animate-fadeIn">
          <div className="relative w-full max-w-5xl lg:max-w-6xl bg-[#031d12] border border-emerald-600/70 sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col sm:my-auto h-dvh sm:h-auto sm:max-h-[calc(100vh-3.5rem)]">
            <div className="shrink-0 flex items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-emerald-800/60 bg-[#02140c]">
              <div className="flex items-center gap-2 text-white font-extrabold text-base min-w-0">
                <ImageIcon className="w-5 h-5 text-emerald-400" />
                <span>{fotoModal.titulo}</span>
              </div>
              <button
                onClick={() => setFotoModal(null)}
                aria-label="Fechar"
                className="w-10 h-10 inline-flex items-center justify-center shrink-0 rounded-md hover:bg-emerald-900 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 min-h-0 p-4 sm:p-6 overflow-y-auto space-y-6">
              <div className="rounded-2xl overflow-hidden max-h-[460px] bg-black">
                <img
                  src={fotoModal.url}
                  alt={fotoModal.titulo}
                  className="w-full h-full object-contain mx-auto"
                />
              </div>

              {fotoModal.specs && (
                <div className="bg-[#02130b] rounded-2xl p-4 border border-emerald-800/40">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300 mb-3">
                    Laudo & Parâmetros Físico-Químicos Homologados
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {fotoModal.specs.map((sp, idx) => (
                      <div key={idx} className="bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-800/40">
                        <span className="text-[10px] text-slate-400 block">{sp.rotulo}</span>
                        <span className="text-xs font-bold text-white tabular-nums">{sp.valor}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. MODAL DE CONFIRMAÇÃO DE PRESENÇA EM EVENTO (AMPLO)     */}
      {/* ========================================================= */}
      {eventoModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md sm:p-6 flex justify-center items-stretch sm:items-start animate-fadeIn">
          <div className="relative w-full max-w-3xl sm:max-w-4xl bg-[#031d12] border border-emerald-600/70 sm:rounded-2xl overflow-hidden shadow-2xl p-4 sm:p-8 space-y-5 sm:my-auto h-dvh sm:h-auto sm:max-h-[calc(100vh-3.5rem)] overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between border-b border-emerald-800/60 pb-3">
              <div className="flex items-center gap-2 text-white font-black text-base">
                <Calendar className="w-5 h-5 text-amber-400" />
                <span>Credenciamento VIP para Evento</span>
              </div>
              <button
                onClick={() => setEventoModal(null)}
                className="p-1 rounded-lg hover:bg-emerald-900 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {presencaConfirmada ? (
              <div className="py-6 text-center space-y-4">
                <div className="mx-auto w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40">
                  <Check className="w-8 h-8 stroke-[3]" />
                </div>
                <h4 className="text-lg font-black text-white">Presença Registrada com Sucesso!</h4>
                <p className="text-xs text-slate-300">
                  Seu nome (<strong className="text-white">{cadastro.nome_convidado}</strong>) e empresa (<strong className="text-white">{cadastro.empresa_solicitante}</strong>) foram incluídos na recepção VIP do estande <strong className="text-emerald-300">{eventoModal.estande}</strong>.
                </p>
                <button
                  onClick={() => setEventoModal(null)}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs transition-colors cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h4 className="text-base font-extrabold text-white">{eventoModal.titulo}</h4>
                  <p className="text-xs text-emerald-300">
                    {eventoModal.local} ({eventoModal.cidade_uf}) • Estande {eventoModal.estande}
                  </p>
                </div>

                <div className="bg-[#02130b] rounded-xl p-3 border border-emerald-800/50 text-xs space-y-1 text-slate-300">
                  <p>• Data: <strong className="text-white">{eventoModal.data_inicio} {eventoModal.data_fim !== eventoModal.data_inicio ? `a ${eventoModal.data_fim}` : ''}</strong></p>
                  <p>• Horário VIP: <strong className="text-white">{eventoModal.horario}</strong></p>
                  <p>• Convidado: <strong className="text-white">{cadastro.nome_convidado} ({cadastro.empresa_solicitante})</strong></p>
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    onClick={() => setPresencaConfirmada(true)}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-500 hover:to-lime-500 text-white font-extrabold text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar Agendamento</span>
                  </button>
                  <button
                    onClick={() => setEventoModal(null)}
                    className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
