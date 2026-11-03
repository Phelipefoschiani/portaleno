import React, { useState, useEffect, useRef, useMemo } from 'react';
import { LogOut, ChevronDown, ChevronRight, Menu, X } from 'lucide-react';
import { CadastroClientes } from './cadastros/CadastroClientes';
import { CadastroFornecedores } from './cadastros/CadastroFornecedores';
import { CadastroAgricultores } from './cadastros/CadastroAgricultores';
import { CadastroRCA } from './cadastros/CadastroRCA';
import { CadastroProvisorioPortifolio } from './cadastros/CadastroProvisorioPortifolio';
import { CadastroProducao } from './cadastros/CadastroProducao';
import { CalculoNaRocaComponent } from './pedidos/CalculoNaRoca';
import { PedidoCompra } from './pedidos/PedidoCompra';
import { PedidosOrcamentosSugestivo } from './pedidos/PedidosOrcamentosSugestivo';
import { PedidosEmProducao } from './pedidos/PedidosEmProducao';
import { OrdensProducaoPainel } from './producao/OrdensProducaoPainel';
import { PedidosAFaturar } from './pedidos/PedidosAFaturar';
import { PedidosFaturados } from './pedidos/PedidosFaturados';
import { PedidosEntregues } from './pedidos/PedidosEntregues';
import { PedidosRelatorios } from './pedidos/PedidosRelatorios';
import { ProdutosReceita } from './produtos/ProdutosReceita';
import { ProdutosEstoqueCadastro } from './produtos/ProdutosEstoqueCadastro';
import { ProdutosMateriaPrima } from './produtos/ProdutosMateriaPrima';
import { ProdutosRelatorios } from './produtos/ProdutosRelatorios';
import { ProdutosFichaTecnica } from './produtos/ProdutosFichaTecnica';
import { ProdutosTabelaPreco } from './produtos/ProdutosTabelaPreco';
import { ProdutosEtiqueta } from './produtos/ProdutosEtiqueta';
import { FinanceiroAReceber } from './financeiro/FinanceiroAReceber';
import { FinanceiroAPagar } from './financeiro/FinanceiroAPagar';
import { FinanceiroLancarDespesas } from './financeiro/FinanceiroLancarDespesas';
import { FinanceiroNotasSaida } from './financeiro/FinanceiroNotasSaida';
import { FinanceiroNotasEntrada } from './financeiro/FinanceiroNotasEntrada';
import { FinanceiroLancarReceita } from './financeiro/FinanceiroLancarReceita';
import { FinanceiroCaixaInvestimento } from './financeiro/FinanceiroCaixaInvestimento';
import { VisaoGeralDashboard } from './visao_geral/VisaoGeralDashboard';
import { PortalControleSitio } from './portais/PortalControleSitio';
import { UsuariosAcessos } from './cadastros/UsuariosAcessos';
import { obterSessao } from '../lib/auth';
import { EMPRESA } from '../lib/empresa';
import { carregarPedidosVenda } from '../data/pedidosVendaData';
import { carregarOrdensProducao, EVENTO_OPS } from '../data/ordensProducaoData';
import { carregarTitulosReceber, carregarTitulosPagar } from '../data/financeiroData';
import { DentroDoShell } from './ui/ShellContext';

type AdminDashboardProps = {
  onLogout: () => void;
  initialPageId?: string;
  /** Abre um portal externo para o administrador "visualizar como" */
  onAbrirPortal?: (destino: 'RCA' | 'CLIENTE' | 'AGRICULTOR') => void;
};

type MenuItem = {
  id: string;
  label: string;
  /** Coluna do menu (agrupa itens relacionados). */
  secao: string;
};

type MenuGroup = {
  id: string;
  label: string;
  items: MenuItem[];
};

type PaginaAtiva = { id: string; groupLabel: string; pageLabel: string };

const VISAO_GERAL: PaginaAtiva = { id: 'visao_geral', groupLabel: 'Visão Geral', pageLabel: 'Visão Geral' };

// Contadores mostrados no submenu (só aparecem quando > 0)
function useContagensSubmenu() {
  const ler = () => {
    const pedidos = carregarPedidosVenda();
    const porEtapa = (e: string) => pedidos.filter(p => p.etapa === e).length;
    return {
      pedidos_orcamentos_sugestivo: porEtapa('ORCAMENTO'),
      pedidos_em_producao: porEtapa('EM_PRODUCAO'),
      pedidos_ordens_producao: carregarOrdensProducao().filter(o => o.status === 'PLANEJADA' || o.status === 'EM_PRODUCAO').length,
      pedidos_a_faturar: porEtapa('A_FATURAR'),
      pedidos_faturados: porEtapa('FATURADO'),
      pedidos_entregues: porEtapa('ENTREGUE'),
      financeiro_a_receber: carregarTitulosReceber().filter(t => t.status !== 'PAGO').length,
      financeiro_a_pagar: carregarTitulosPagar().filter(t => t.status !== 'PAGO').length,
    } as Record<string, number>;
  };
  const [contagens, setContagens] = useState(ler);
  useEffect(() => {
    const h = () => setContagens(ler());
    const eventos = ['pedidos_venda_updated', EVENTO_OPS, 'financeiro_updated', 'sistema_reset_updated'];
    eventos.forEach(ev => window.addEventListener(ev, h));
    return () => eventos.forEach(ev => window.removeEventListener(ev, h));
  }, []);
  return contagens;
}

// Itens cujo número pede ação (cor âmbar no submenu)
const CONTAGEM_PEDE_ACAO = new Set(['pedidos_orcamentos_sugestivo', 'pedidos_a_faturar']);

const PERFIL_ROTULO: Record<string, string> = {
  ADMIN: 'Administrador',
  RCA: 'Representante',
  CLIENTE: 'Cliente',
  AGRICULTOR: 'Agricultor',
  PRODUCAO: 'Produção',
  SITIO: 'Sítio',
  PROVISORIO: 'Provisório',
};

export function AdminDashboard({ onLogout, initialPageId, onAbrirPortal }: AdminDashboardProps) {
  const sessao = obterSessao();
  const ehAdmin = sessao?.perfil === 'ADMIN';

  const menuGroups: MenuGroup[] = useMemo(() => [
    {
      id: 'cadastros',
      label: 'Cadastros',
      items: [
        { id: 'cadastro_clientes', label: 'Clientes', secao: 'Comercial' },
        { id: 'cadastro_rca', label: 'Representantes (RCA)', secao: 'Comercial' },
        { id: 'cadastro_provisorio_portifolio', label: 'Cadastro provisório', secao: 'Comercial' },
        { id: 'cadastro_fornecedores', label: 'Fornecedores', secao: 'Suprimentos' },
        { id: 'cadastro_agricultores', label: 'Agricultores', secao: 'Suprimentos' },
        { id: 'cadastro_producao_usuarios', label: 'Equipe de produção', secao: 'Operação' },
        { id: 'cadastro_controle_sitio', label: 'Controle do sítio', secao: 'Operação' },
        // Gestão de logins: somente ADMIN
        ...(ehAdmin ? [{ id: 'usuarios_acessos', label: 'Usuários e acessos', secao: 'Operação' }] : []),
      ],
    },
    {
      id: 'pedidos',
      label: 'Pedidos',
      items: [
        { id: 'pedidos_orcamentos_sugestivo', label: 'Vendas', secao: 'Venda' },
        { id: 'pedidos_em_producao', label: 'Em produção', secao: 'Venda' },
        { id: 'pedidos_ordens_producao', label: 'Ordens de produção', secao: 'Venda' },
        { id: 'pedidos_a_faturar', label: 'A faturar', secao: 'Expedição' },
        { id: 'pedidos_faturados', label: 'Faturados', secao: 'Expedição' },
        { id: 'pedidos_entregues', label: 'Entregues', secao: 'Expedição' },
        { id: 'calculo_na_roca', label: 'Cálculo na roça', secao: 'Compra' },
        { id: 'pedidos_compra', label: 'Pedido de compra', secao: 'Compra' },
        { id: 'pedidos_relatorios', label: 'Relatórios', secao: 'Compra' },
      ],
    },
    {
      id: 'produtos',
      label: 'Produtos',
      items: [
        { id: 'produtos_estoque_cadastro', label: 'Produtos acabados', secao: 'Estoque' },
        { id: 'produtos_materia_prima', label: 'Matéria-prima', secao: 'Estoque' },
        { id: 'produtos_receita', label: 'Receitas', secao: 'Engenharia' },
        { id: 'produtos_ficha_tecnica', label: 'Ficha técnica', secao: 'Engenharia' },
        { id: 'produtos_tabela_preco', label: 'Tabela de preço', secao: 'Comercial' },
        { id: 'produtos_etiqueta', label: 'Etiquetas', secao: 'Comercial' },
        { id: 'produtos_relatorios', label: 'Relatórios', secao: 'Comercial' },
      ],
    },
    {
      id: 'financeiro',
      label: 'Financeiro',
      items: [
        { id: 'financeiro_a_receber', label: 'A receber', secao: 'Títulos' },
        { id: 'financeiro_a_pagar', label: 'A pagar', secao: 'Títulos' },
        { id: 'financeiro_caixa_investimento', label: 'Caixa e investimento', secao: 'Títulos' },
        { id: 'financeiro_lancar_receita', label: 'Lançar receita', secao: 'Lançamentos' },
        { id: 'financeiro_lancar_despesas', label: 'Lançar despesas', secao: 'Lançamentos' },
        { id: 'financeiro_notas_saida', label: 'Notas fiscais de saída', secao: 'Fiscal' },
        { id: 'financeiro_notas_entrada', label: 'Notas fiscais de entrada', secao: 'Fiscal' },
      ],
    },
  ], [ehAdmin]);

  const paginaPorId = (pageId?: string): PaginaAtiva | null => {
    for (const group of menuGroups) {
      const item = group.items.find(i => i.id === pageId);
      if (item) return { id: item.id, groupLabel: group.label, pageLabel: item.label };
    }
    return null;
  };

  const [activePage, setActivePage] = useState<PaginaAtiva>(() => paginaPorId(initialPageId) || VISAO_GERAL);
  const [selectedClienteIdForNavigation, setSelectedClienteIdForNavigation] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [menuMovelAberto, setMenuMovelAberto] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const contagens = useContagensSubmenu();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) setOpenDropdown(null);
    }
    function handleEsc(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpenDropdown(null);
        setMenuMovelAberto(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const irPara = (pagina: PaginaAtiva) => {
    setActivePage(pagina);
    setOpenDropdown(null);
    setMenuMovelAberto(false);
  };

  const handleSelectVisaoGeral = () => irPara(VISAO_GERAL);

  // Navegação universal por id (usada pela Visão Geral e pelas abas internas de cada módulo)
  const handleNavigateUniversal = (pageId: string) => {
    const pagina = paginaPorId(pageId);
    irPara(pagina || VISAO_GERAL);
  };

  const handleNavigateToCliente = (clienteId: string) => {
    setSelectedClienteIdForNavigation(clienteId);
    handleNavigateUniversal('cadastro_clientes');
  };

  const grupoAtivo = menuGroups.find(g => g.label === activePage.groupLabel) || null;

  // Itens agrupados por coluna (mega-menu)
  const colunas = (group: MenuGroup) => {
    const mapa = new Map<string, MenuItem[]>();
    group.items.forEach(i => mapa.set(i.secao, [...(mapa.get(i.secao) || []), i]));
    return [...mapa.entries()];
  };

  const dataHoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  const seletorPortal = (classe: string) =>
    onAbrirPortal && (
      <label className={classe}>
        <span className="sr-only">Ver portal como</span>
        <select
          value=""
          onChange={e => {
            const v = e.target.value as 'RCA' | 'CLIENTE' | 'AGRICULTOR' | '';
            if (v) onAbrirPortal(v);
          }}
          className="bg-transparent outline-none cursor-pointer appearance-none pr-4"
          title="Abrir um portal para visualizar como o usuário"
        >
          <option value="" className="text-tinta">Ver portal…</option>
          <option value="CLIENTE" className="text-tinta">Portal do Cliente</option>
          <option value="RCA" className="text-tinta">Portal do RCA</option>
          <option value="AGRICULTOR" className="text-tinta">Portal do Agricultor</option>
        </select>
        <ChevronDown className="w-3 h-3 -ml-3.5 pointer-events-none opacity-70" />
      </label>
    );

  const itemNavClasse = (ativo: boolean) =>
    `relative flex h-full items-center gap-1 px-3 text-[13.5px] font-semibold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-ouro ${
      ativo ? 'text-white' : 'text-white/70 hover:text-white'
    }`;

  const filete = <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-t-sm filete-ouro" aria-hidden />;

  return (
    <div className="relative h-dvh w-full bg-papel-2 text-tinta flex flex-col overflow-hidden">

      {/* ========================================================= */}
      {/* 1. BARRA SUPERIOR: marca + módulos + usuário              */}
      {/* ========================================================= */}
      <header ref={navRef} className="relative z-40 shrink-0 bg-[linear-gradient(100deg,#042013_0%,#0b3d24_100%)] text-white">
        <div className="mx-auto flex h-14 w-full max-w-[1700px] items-stretch px-3 sm:px-5">
          {/* Marca */}
          <button
            type="button"
            onClick={handleSelectVisaoGeral}
            className="flex items-center gap-2.5 pr-4 lg:pr-6 lg:mr-2 lg:border-r lg:border-white/10 cursor-pointer"
            title="Ir para a Visão Geral"
          >
            <img src={EMPRESA.logo} alt="" className="h-8 w-8 object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]" />
            <span className="leading-none text-left">
              <span className="block text-[15px] font-extrabold tracking-[-0.01em]">Grupo ENO</span>
              <span className="block mt-1 text-[9.5px] font-bold uppercase tracking-[0.2em] text-ouro">Gestão</span>
            </span>
          </button>

          {/* Módulos (desktop) */}
          <nav className="hidden lg:flex items-stretch" aria-label="Módulos">
            <button type="button" onClick={handleSelectVisaoGeral} className={itemNavClasse(activePage.id === 'visao_geral')}>
              Visão Geral
              {activePage.id === 'visao_geral' && filete}
            </button>
            {menuGroups.map(group => {
              const isOpen = openDropdown === group.id;
              const ativo = activePage.groupLabel === group.label;
              const cols = colunas(group);
              return (
                <div key={group.id} className="relative flex">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-haspopup="true"
                    onClick={() => setOpenDropdown(isOpen ? null : group.id)}
                    className={`${itemNavClasse(ativo || isOpen)} ${isOpen ? 'bg-white/[0.06]' : ''}`}
                  >
                    {group.label}
                    <ChevronDown className={`w-3.5 h-3.5 opacity-60 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
                    {ativo && filete}
                  </button>

                  {isOpen && (
                    <div
                      className="absolute left-0 top-full z-50 mt-px rounded-b-md bg-papel text-tinta border border-linha border-t-0 shadow-[0_18px_40px_-12px_rgba(4,32,19,0.45)] overflow-hidden"
                      role="menu"
                    >
                      <div className="h-[2px] filete-ouro" aria-hidden />
                      <div className={`grid gap-x-1 p-2 ${cols.length >= 3 ? 'grid-cols-3 w-[600px]' : 'grid-cols-2 w-[420px]'}`}>
                        {cols.map(([secao, itens]) => (
                          <div key={secao} className="py-1">
                            <div className="px-3 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-cinza">{secao}</div>
                            {itens.map(item => {
                              const sel = activePage.id === item.id;
                              const n = contagens[item.id];
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  role="menuitem"
                                  onClick={() => irPara({ id: item.id, groupLabel: group.label, pageLabel: item.label })}
                                  className={`relative flex w-full items-center justify-between gap-3 rounded-[5px] px-3 py-2 text-left text-[13.5px] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ouro ${
                                    sel ? 'bg-papel-3 font-bold text-tinta' : 'font-medium text-tinta-2 hover:bg-papel-2 hover:text-tinta'
                                  }`}
                                >
                                  {sel && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-ouro" aria-hidden />}
                                  <span>{item.label}</span>
                                  {n > 0 && <span className="text-[12px] tabular-nums text-cinza">{n}</span>}
                                </button>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Direita: portal, usuário, sair */}
          <div className="ml-auto flex items-center gap-1 sm:gap-3">
            {seletorPortal('hidden lg:flex items-center gap-1 h-8 px-2.5 rounded-md border border-white/15 text-[12.5px] font-medium text-white/75 hover:text-white hover:border-white/30 transition-colors')}
            {sessao && (
              <div className="hidden sm:block text-right leading-tight pl-1">
                <div className="text-[13px] font-semibold text-white truncate max-w-[180px]">{sessao.nome || sessao.usuario}</div>
                <div className="text-[10.5px] text-white/50">{PERFIL_ROTULO[sessao.perfil] || sessao.perfil}</div>
              </div>
            )}
            <button
              type="button"
              onClick={onLogout}
              className="hidden lg:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-[12.5px] font-medium text-white/70 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ouro"
              title="Sair do sistema"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sair
            </button>
            {/* Celular / tablet: botão de menu */}
            <button
              type="button"
              onClick={() => setMenuMovelAberto(v => !v)}
              aria-expanded={menuMovelAberto}
              aria-label={menuMovelAberto ? 'Fechar menu' : 'Abrir menu'}
              className="lg:hidden inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-white/20 text-[13px] font-semibold text-white cursor-pointer"
            >
              {menuMovelAberto ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              Menu
            </button>
          </div>
        </div>

        {/* Painel do menu no celular */}
        {menuMovelAberto && (
          <div className="lg:hidden absolute inset-x-0 top-full z-50 max-h-[calc(100dvh-3.5rem)] overflow-y-auto bg-eno-900 border-t border-white/10 shadow-[0_24px_40px_-10px_rgba(0,0,0,0.6)]">
            <div className="px-4 py-3">
              <button
                type="button"
                onClick={handleSelectVisaoGeral}
                className={`w-full text-left py-2.5 text-[15px] font-bold ${activePage.id === 'visao_geral' ? 'text-ouro' : 'text-white'}`}
              >
                Visão Geral
              </button>
              {menuGroups.map(group => (
                <div key={group.id} className="border-t border-white/10 py-2.5">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45 mb-1">{group.label}</div>
                  <div className="grid grid-cols-2 gap-x-3">
                    {group.items.map(item => {
                      const sel = activePage.id === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => irPara({ id: item.id, groupLabel: group.label, pageLabel: item.label })}
                          className={`text-left py-2 text-[14px] ${sel ? 'text-ouro font-bold' : 'text-white/85 font-medium'}`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div className="border-t border-white/10 pt-3 mt-1 flex flex-wrap items-center justify-between gap-3 text-[13px]">
                <div className="text-white/80">
                  {sessao?.nome || sessao?.usuario}
                  <span className="text-white/45"> · {PERFIL_ROTULO[sessao?.perfil || ''] || ''}</span>
                </div>
                <div className="flex items-center gap-2">
                  {seletorPortal('flex items-center gap-1 h-8 px-2.5 rounded-md border border-white/20 text-white/80')}
                  <button type="button" onClick={onLogout} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-white/20 text-white/80">
                    <LogOut className="w-3.5 h-3.5" /> Sair
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ========================================================= */}
      {/* 2. FAIXA DA SEÇÃO: breadcrumb + submenu                   */}
      {/* ========================================================= */}
      <div className="relative z-30 shrink-0 bg-papel border-b border-linha">
        <div className="mx-auto flex w-full max-w-[1700px] flex-col md:flex-row md:items-stretch md:h-11 px-3 sm:px-5">
          <div className="flex items-center gap-1.5 h-9 md:h-auto pr-5 md:mr-1 md:border-r md:border-linha text-[12.5px] whitespace-nowrap">
            {grupoAtivo ? (
              <>
                <span className="text-cinza">{grupoAtivo.label}</span>
                <ChevronRight className="w-3.5 h-3.5 text-cinza-claro" />
                <span className="font-bold text-tinta">{activePage.pageLabel}</span>
              </>
            ) : (
              <span className="font-bold text-tinta">Visão Geral</span>
            )}
          </div>

          {grupoAtivo ? (
            <nav className="-mx-3 px-3 md:mx-0 md:px-0 flex items-stretch overflow-x-auto h-10 md:h-auto" aria-label={`Telas de ${grupoAtivo.label}`}>
              {grupoAtivo.items.map((item, idx) => {
                const sel = activePage.id === item.id;
                const n = contagens[item.id];
                const novaSecao = idx > 0 && grupoAtivo.items[idx - 1].secao !== item.secao;
                return (
                  <React.Fragment key={item.id}>
                    {novaSecao && <span className="self-center mx-1.5 h-4 w-px bg-linha-forte shrink-0" aria-hidden />}
                    <button
                      type="button"
                      onClick={() => irPara({ id: item.id, groupLabel: grupoAtivo.label, pageLabel: item.label })}
                      aria-current={sel ? 'page' : undefined}
                      className={`relative shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 text-[13px] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-ouro ${
                        sel ? 'font-bold text-tinta' : 'font-medium text-cinza hover:text-tinta'
                      }`}
                    >
                      {item.label}
                      {n > 0 && (
                        <span className={`tabular-nums text-[11.5px] ${CONTAGEM_PEDE_ACAO.has(item.id) ? 'font-bold text-st-aguardando' : 'text-cinza-claro'}`}>{n}</span>
                      )}
                      {sel && <span className="absolute inset-x-2 bottom-0 h-[2px] bg-eno-800" aria-hidden />}
                    </button>
                  </React.Fragment>
                );
              })}
            </nav>
          ) : (
            <div className="hidden md:flex items-center ml-auto text-[12.5px] text-cinza first-letter:uppercase">{dataHoje}</div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. CONTEÚDO DA PÁGINA                                     */}
      {/* ========================================================= */}
      <main className="relative flex-1 min-h-0 flex flex-col w-full overflow-hidden">
        <DentroDoShell.Provider value={true}>
          <div className="w-full h-full flex-1 flex flex-col overflow-hidden">
            {activePage.id === 'visao_geral' ? (
              <VisaoGeralDashboard onNavigate={handleNavigateUniversal} />
            ) : activePage.id === 'calculo_na_roca' ? (
              <CalculoNaRocaComponent onNavigate={handleNavigateUniversal} />
            ) : activePage.id === 'cadastro_clientes' ? (
              <CadastroClientes clienteIdInicial={selectedClienteIdForNavigation} />
            ) : activePage.id === 'cadastro_fornecedores' ? (
              <CadastroFornecedores />
            ) : activePage.id === 'cadastro_agricultores' ? (
              <CadastroAgricultores />
            ) : activePage.id === 'cadastro_rca' ? (
              <CadastroRCA onNavigateToCliente={handleNavigateToCliente} />
            ) : activePage.id === 'cadastro_provisorio_portifolio' ? (
              <CadastroProvisorioPortifolio onNavigateToCliente={handleNavigateToCliente} />
            ) : activePage.id === 'cadastro_producao_usuarios' ? (
              <CadastroProducao />
            ) : activePage.id === 'usuarios_acessos' && ehAdmin ? (
              <UsuariosAcessos />
            ) : activePage.id === 'cadastro_controle_sitio' ? (
              <PortalControleSitio onVoltar={handleSelectVisaoGeral} />
            ) : activePage.id === 'pedidos_compra' ? (
              <PedidoCompra />
            ) : activePage.id === 'pedidos_orcamentos_sugestivo' ? (
              <PedidosOrcamentosSugestivo onNavigate={handleNavigateUniversal} />
            ) : activePage.id === 'pedidos_em_producao' ? (
              <PedidosEmProducao onNavigate={handleNavigateUniversal} />
            ) : activePage.id === 'pedidos_ordens_producao' ? (
              <OrdensProducaoPainel modo="ADMIN" onNavigate={handleNavigateUniversal} />
            ) : activePage.id === 'pedidos_a_faturar' ? (
              <PedidosAFaturar onNavigate={handleNavigateUniversal} />
            ) : activePage.id === 'pedidos_faturados' ? (
              <PedidosFaturados onNavigate={handleNavigateUniversal} />
            ) : activePage.id === 'pedidos_entregues' ? (
              <PedidosEntregues onNavigate={handleNavigateUniversal} />
            ) : activePage.id === 'pedidos_relatorios' ? (
              <PedidosRelatorios onNavigate={handleNavigateUniversal} />
            ) : activePage.id === 'produtos_estoque_cadastro' ? (
              <ProdutosEstoqueCadastro onNavigate={handleNavigateUniversal} />
            ) : activePage.id === 'produtos_receita' ? (
              <ProdutosReceita onNavigate={handleNavigateUniversal} />
            ) : activePage.id === 'produtos_materia_prima' ? (
              <ProdutosMateriaPrima onNavigate={handleNavigateUniversal} />
            ) : activePage.id === 'produtos_relatorios' ? (
              <ProdutosRelatorios onNavigate={handleNavigateUniversal} />
            ) : activePage.id === 'produtos_ficha_tecnica' ? (
              <ProdutosFichaTecnica onNavigate={handleNavigateUniversal} />
            ) : activePage.id === 'produtos_tabela_preco' ? (
              <ProdutosTabelaPreco onNavigate={handleNavigateUniversal} />
            ) : activePage.id === 'produtos_etiqueta' ? (
              <ProdutosEtiqueta onNavigate={handleNavigateUniversal} />
            ) : activePage.id === 'financeiro_a_receber' ? (
              <FinanceiroAReceber onNavigate={handleNavigateUniversal} />
            ) : activePage.id === 'financeiro_a_pagar' ? (
              <FinanceiroAPagar onNavigate={handleNavigateUniversal} />
            ) : activePage.id === 'financeiro_lancar_despesas' ? (
              <FinanceiroLancarDespesas onNavigate={handleNavigateUniversal} />
            ) : activePage.id === 'financeiro_notas_saida' ? (
              <FinanceiroNotasSaida onNavigate={handleNavigateUniversal} />
            ) : activePage.id === 'financeiro_notas_entrada' ? (
              <FinanceiroNotasEntrada onNavigate={handleNavigateUniversal} />
            ) : activePage.id === 'financeiro_lancar_receita' ? (
              <FinanceiroLancarReceita onNavigate={handleNavigateUniversal} />
            ) : activePage.id === 'financeiro_caixa_investimento' ? (
              <FinanceiroCaixaInvestimento onNavigate={handleNavigateUniversal} />
            ) : (
              <div className="flex-1 flex items-center justify-center text-[13px] text-cinza">Tela não disponível.</div>
            )}
          </div>
        </DentroDoShell.Provider>
      </main>
    </div>
  );
}
