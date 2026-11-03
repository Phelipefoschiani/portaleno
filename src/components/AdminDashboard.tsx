import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  LogOut, 
  Building2, 
  Users, 
  ShoppingBag, 
  Package, 
  DollarSign, 
  ChevronDown,
  Eye
} from 'lucide-react';
import { isModoLimpoAtivo } from '../data/sistemaReset';
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

type AdminDashboardProps = {
  onLogout: () => void;
  initialPageId?: string;
  /** Abre um portal externo para o administrador "visualizar como" */
  onAbrirPortal?: (destino: 'RCA' | 'CLIENTE' | 'AGRICULTOR') => void;
};

type MenuItem = {
  id: string;
  label: string;
};

type MenuGroup = {
  id: string;
  label: string;
  icon: React.ReactNode;
  items: MenuItem[];
};

export function AdminDashboard({ onLogout, initialPageId, onAbrirPortal }: AdminDashboardProps) {
  const getInitialPageState = () => {
    if (initialPageId === 'cadastro_agricultores') {
      return { id: 'cadastro_agricultores', groupLabel: 'Cadastros', pageLabel: 'Cadastro de Agricultores' };
    }
    if (initialPageId === 'cadastro_rca') {
      return { id: 'cadastro_rca', groupLabel: 'Cadastros', pageLabel: 'Cadastro de RCA' };
    }
    if (initialPageId === 'cadastro_provisorio_portifolio') {
      return { id: 'cadastro_provisorio_portifolio', groupLabel: 'Cadastros', pageLabel: 'Cadastro Provisório Portifólio' };
    }
    if (initialPageId === 'cadastro_producao_usuarios') {
      return { id: 'cadastro_producao_usuarios', groupLabel: 'Cadastros', pageLabel: 'Cadastro Produção' };
    }
    if (initialPageId === 'cadastro_controle_sitio') {
      return { id: 'cadastro_controle_sitio', groupLabel: 'Cadastros', pageLabel: 'Cadastro Controle do Sítio' };
    }
    return {
      id: 'visao_geral',
      groupLabel: 'Sistema',
      pageLabel: 'Visão Geral',
    };
  };

  const [activePage, setActivePage] = useState<{
    id: string;
    groupLabel: string;
    pageLabel: string;
  }>(getInitialPageState);

  const [selectedClienteIdForNavigation, setSelectedClienteIdForNavigation] = useState<string | null>(null);

  const handleNavigateToCliente = (clienteId: string) => {
    setSelectedClienteIdForNavigation(clienteId);
    setActivePage({
      id: 'cadastro_clientes',
      groupLabel: 'Cadastros',
      pageLabel: 'Cadastro de Clientes',
    });
  };

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const menuGroups: MenuGroup[] = [
    {
      id: 'cadastros',
      label: 'Cadastros',
      icon: <Users className="w-4.5 h-4.5 shrink-0" />,
      items: [
        { id: 'cadastro_clientes', label: 'Cadastro de Clientes' },
        { id: 'cadastro_fornecedores', label: 'Cadastro de Fornecedores' },
        { id: 'cadastro_agricultores', label: 'Cadastro de Agricultores' },
        { id: 'cadastro_rca', label: 'Cadastro de RCA' },
        { id: 'cadastro_provisorio_portifolio', label: 'Cadastro Provisório Portifólio' },
        { id: 'cadastro_producao_usuarios', label: 'Cadastro Produção' },
        { id: 'cadastro_controle_sitio', label: 'Cadastro Controle do Sítio' },
        // Gestão de logins: somente ADMIN
        ...(obterSessao()?.perfil === 'ADMIN' ? [{ id: 'usuarios_acessos', label: 'Usuários e Acessos' }] : []),
      ],
    },
    {
      id: 'pedidos',
      label: 'Pedidos',
      icon: <ShoppingBag className="w-4.5 h-4.5 shrink-0" />,
      items: [
        { id: 'calculo_na_roca', label: 'Cálculo na Roça' },
        { id: 'pedidos_compra', label: 'Pedido de Compra' },
        { id: 'pedidos_orcamentos_sugestivo', label: 'Vendas' },
        { id: 'pedidos_em_producao', label: 'Em Produção' },
        { id: 'pedidos_ordens_producao', label: 'Ordens de Produção' },
        { id: 'pedidos_a_faturar', label: 'A Faturar' },
        { id: 'pedidos_faturados', label: 'Faturados' },
        { id: 'pedidos_entregues', label: 'Entregues' },
        { id: 'pedidos_relatorios', label: 'Relatórios' },
      ],
    },
    {
      id: 'produtos',
      label: 'Produtos',
      icon: <Package className="w-4.5 h-4.5 shrink-0" />,
      items: [
        { id: 'produtos_estoque_cadastro', label: 'Produtos (Estoque e Cadastro)' },
        { id: 'produtos_receita', label: 'Receita' },
        { id: 'produtos_materia_prima', label: 'Matéria Prima (Estoque e Cadastro)' },
        { id: 'produtos_relatorios', label: 'Relatórios' },
        { id: 'produtos_ficha_tecnica', label: 'Ficha Técnica' },
        { id: 'produtos_tabela_preco', label: 'Tabela de Preço' },
        { id: 'produtos_etiqueta', label: 'Etiqueta' },
      ],
    },
    {
      id: 'financeiro',
      label: 'Financeiro',
      icon: <DollarSign className="w-4.5 h-4.5 shrink-0" />,
      items: [
        { id: 'financeiro_a_receber', label: 'A Receber' },
        { id: 'financeiro_a_pagar', label: 'A Pagar' },
        { id: 'financeiro_lancar_despesas', label: 'Lançar Despesas' },
        { id: 'financeiro_notas_saida', label: 'Nota Fiscais Saída' },
        { id: 'financeiro_notas_entrada', label: 'Nota Fiscais Entrada' },
        { id: 'financeiro_lancar_receita', label: 'Lançar Receita' },
        { id: 'financeiro_caixa_investimento', label: 'Caixa Investimento' },
      ],
    },
  ];

  const handleSelectPage = (groupLabel: string, item: MenuItem) => {
    setActivePage({
      id: item.id,
      groupLabel: groupLabel,
      pageLabel: item.label,
    });
    setOpenDropdown(null);
  };

  const handleSelectVisaoGeral = () => {
    setActivePage({
      id: 'visao_geral',
      groupLabel: 'Sistema',
      pageLabel: 'Visão Geral',
    });
    setOpenDropdown(null);
  };

  const handleSelectPedidosPage = (tabId: string) => {
    const itemMap: Record<string, string> = {
      'calculo_na_roca': 'Cálculo na Roça',
      'pedidos_compra': 'Pedido de Compra',
      'pedidos_orcamentos_sugestivo': 'Vendas',
      'pedidos_em_producao': 'Em Produção',
      'pedidos_ordens_producao': 'Ordens de Produção',
      'pedidos_a_faturar': 'A Faturar',
      'pedidos_faturados': 'Faturados',
      'pedidos_entregues': 'Entregues',
      'pedidos_relatorios': 'Relatórios',
    };
    setActivePage({
      id: tabId,
      groupLabel: 'Pedidos',
      pageLabel: itemMap[tabId] || 'Pedidos',
    });
  };

  const handleSelectProdutosPage = (tabId: string) => {
    const itemMap: Record<string, string> = {
      'produtos_estoque_cadastro': 'Produtos (Estoque e Cadastro)',
      'produtos_receita': 'Receita',
      'produtos_materia_prima': 'Matéria Prima (Estoque e Cadastro)',
      'produtos_relatorios': 'Relatórios',
      'produtos_ficha_tecnica': 'Ficha Técnica',
      'produtos_tabela_preco': 'Tabela de Preço',
      'produtos_etiqueta': 'Etiqueta',
    };
    setActivePage({
      id: tabId,
      groupLabel: 'Produtos',
      pageLabel: itemMap[tabId] || 'Produtos',
    });
  };

  const handleSelectFinanceiroPage = (tabId: string) => {
    const itemMap: Record<string, string> = {
      'financeiro_a_receber': 'A Receber',
      'financeiro_a_pagar': 'A Pagar',
      'financeiro_lancar_despesas': 'Lançar Despesas',
      'financeiro_notas_saida': 'Nota Fiscais Saída',
      'financeiro_notas_entrada': 'Nota Fiscais Entrada',
      'financeiro_lancar_receita': 'Lançar Receita',
      'financeiro_caixa_investimento': 'Caixa Investimento',
    };
    setActivePage({
      id: tabId,
      groupLabel: 'Financeiro',
      pageLabel: itemMap[tabId] || 'Financeiro',
    });
  };

  const handleNavigateUniversal = (pageId: string) => {
    for (const group of menuGroups) {
      const item = group.items.find(i => i.id === pageId);
      if (item) {
        setActivePage({
          id: item.id,
          groupLabel: group.label,
          pageLabel: item.label,
        });
        return;
      }
    }
    handleSelectVisaoGeral();
  };

  return (
    <div className="relative h-screen w-screen bg-[#f4f8f5] text-slate-800 flex flex-col select-none overflow-hidden">
      
      {/* ========================================================= */}
      {/* 1. FAIXA SUPERIOR DO TÍTULO                               */}
      {/* ========================================================= */}
      <header className="relative z-40 w-full bg-gradient-to-r from-[#01140b] via-[#032b17] to-[#01140b] text-white border-b border-emerald-900/40 shadow-md">
        <div className="mx-auto flex h-[64px] sm:h-[68px] w-full max-w-[1700px] items-center justify-between px-6 sm:px-10">
          
          {/* Nome do Portal */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-800/80 border border-emerald-600/40 text-emerald-200 shadow-inner">
              <Building2 className="w-5 h-5 text-emerald-300" />
            </div>
            <span className="text-[24px] sm:text-[28px] font-black tracking-[-0.035em] text-white leading-none">
              Grupo ENO
            </span>
          </div>

          {/* Perfil (Administrador), Controles de Teste e Botão Sair */}
          <div className="flex items-center gap-2.5">
            {/* Visualizar um portal como o usuário dele (RCA, cliente, agricultor) */}
            {onAbrirPortal && (
              <label className="hidden sm:flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-xl bg-emerald-900/60 border border-emerald-700/60 text-emerald-100 text-xs font-bold">
                <Eye className="w-4 h-4 text-emerald-300" />
                <span className="sr-only">Ver portal como</span>
                <select
                  value=""
                  onChange={e => {
                    const v = e.target.value as 'RCA' | 'CLIENTE' | 'AGRICULTOR' | '';
                    if (v) onAbrirPortal(v);
                  }}
                  className="bg-transparent text-emerald-50 font-bold outline-none cursor-pointer pr-1"
                  title="Abrir um portal para visualizar como o usuário"
                >
                  <option value="" className="text-slate-900">Ver portal...</option>
                  <option value="CLIENTE" className="text-slate-900">Portal do Cliente</option>
                  <option value="RCA" className="text-slate-900">Portal do RCA</option>
                  <option value="AGRICULTOR" className="text-slate-900">Portal do Agricultor</option>
                </select>
              </label>
            )}
            {/* Botão Sair Vermelho */}
            <button
              onClick={onLogout}
              className="
                flex items-center gap-2 px-3.5 py-1.5 rounded-xl
                bg-red-600 text-white border border-red-500 text-xs sm:text-sm font-extrabold
                hover:bg-red-700 hover:border-red-400
                transition-colors cursor-pointer shadow-md active:bg-red-800
              "
              title="Sair do Sistema"
            >
              <LogOut className="w-4 h-4 stroke-[2.5]" />
              <span>Sair</span>
            </button>
          </div>

        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. FAIXA DE MENUS COM DROPDOWNS DE FONTE AMPLIADA         */}
      {/* ========================================================= */}
      <nav 
        ref={dropdownRef}
        className="relative z-30 w-full bg-[#022013] text-white border-b border-emerald-900/60 shadow-[0_6px_20px_rgba(0,0,0,0.25)]"
      >
        <div className="mx-auto flex h-[52px] w-full max-w-[1700px] items-center px-4 sm:px-8">
          <div className="flex items-center gap-2">
            
            {/* Botão Visão Geral */}
            <button
              onClick={handleSelectVisaoGeral}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm sm:text-[15px] font-bold border transition-colors cursor-pointer text-white
                ${activePage.id === 'visao_geral'
                  ? 'bg-emerald-800 text-white border-emerald-500 shadow-sm'
                  : 'bg-transparent border-transparent hover:bg-emerald-900/60 hover:border-emerald-800/40'
                }
              `}
            >
              <LayoutDashboard className="w-4.5 h-4.5 text-white" />
              <span>Visão Geral</span>
            </button>

            {/* Grupos de Menus */}
            {menuGroups.map((group) => {
              const isOpen = openDropdown === group.id;
              const isGroupActive = activePage.groupLabel === group.label;

              return (
                <div key={group.id} className="relative">
                  <button
                    onClick={() => setOpenDropdown(isOpen ? null : group.id)}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg text-sm sm:text-[15px] font-bold border transition-colors cursor-pointer text-white
                      ${isGroupActive || isOpen
                        ? 'bg-emerald-800 text-white border-emerald-500 shadow-sm'
                        : 'bg-transparent border-transparent hover:bg-emerald-900/60 hover:border-emerald-800/40'
                      }
                    `}
                  >
                    <span className="text-white">{group.icon}</span>
                    <span>{group.label}</span>
                    <ChevronDown className={`w-4 h-4 text-white transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Box Ampliado com Fonte Maior e Excelente Leitura */}
                  {isOpen && (
                    <div className="absolute left-0 top-[calc(100%+6px)] z-50 min-w-[310px] rounded-2xl bg-[#011a0f] border border-emerald-600/70 p-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.65)]">
                      
                      {/* Título do grupo no Dropdown */}
                      <div className="px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-emerald-300 border-b border-emerald-800/70 mb-1.5 flex items-center justify-between">
                        <span>{group.label}</span>
                        <span className="text-[10px] text-emerald-400/80 font-normal">Selecione</span>
                      </div>

                      {/* Lista de Opções do Dropdown com Fonte Maior */}
                      <div className="space-y-1">
                        {group.items.map((item) => {
                          const isItemSelected = activePage.id === item.id;
                          return (
                            <button
                              key={item.id}
                              onClick={() => handleSelectPage(group.label, item)}
                              className={`
                                flex w-full items-center justify-between px-4 py-3 rounded-xl text-[14px] sm:text-[15px] font-bold transition-colors cursor-pointer text-left text-white leading-tight
                                ${isItemSelected
                                  ? 'bg-emerald-700 text-white font-extrabold border border-emerald-500/80 shadow-md'
                                  : 'bg-transparent hover:bg-emerald-800/90'
                                }
                              `}
                            >
                              <span>{item.label}</span>
                              {isItemSelected && (
                                <span className="h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,1)] shrink-0 ml-3" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

          </div>
        </div>
      </nav>

      {/* ========================================================= */}
      {/* 3. CONTEÚDO DA PÁGINA (ESPAÇO COMPLETO E LIBERADO)       */}
      {/* ========================================================= */}
      <main className="relative flex-1 flex flex-col w-full h-full p-2 sm:p-3 overflow-hidden">
        
        {/* CONTAINER DA JANELA: OCUPA LARGURA E ALTURA TOTAL */}
        <div className="w-full h-full flex-1 flex flex-col overflow-hidden">
          {activePage.id === 'visao_geral' ? (
            <VisaoGeralDashboard onNavigate={handleNavigateUniversal} />
          ) : activePage.id === 'calculo_na_roca' ? (
            <CalculoNaRocaComponent onNavigate={handleSelectPedidosPage} />
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
          ) : activePage.id === 'usuarios_acessos' && obterSessao()?.perfil === 'ADMIN' ? (
            <UsuariosAcessos />
          ) : activePage.id === 'cadastro_controle_sitio' ? (
            <PortalControleSitio onVoltar={handleSelectVisaoGeral} />
          ) : activePage.id === 'pedidos_compra' ? (
            <PedidoCompra />
          ) : activePage.id === 'pedidos_orcamentos_sugestivo' ? (
            <PedidosOrcamentosSugestivo onNavigate={handleSelectPedidosPage} />
          ) : activePage.id === 'pedidos_em_producao' ? (
            <PedidosEmProducao onNavigate={handleSelectPedidosPage} />
          ) : activePage.id === 'pedidos_ordens_producao' ? (
            <OrdensProducaoPainel modo="ADMIN" onNavigate={handleSelectPedidosPage} />
          ) : activePage.id === 'pedidos_a_faturar' ? (
            <PedidosAFaturar onNavigate={handleSelectPedidosPage} />
          ) : activePage.id === 'pedidos_faturados' ? (
            <PedidosFaturados onNavigate={handleSelectPedidosPage} />
          ) : activePage.id === 'pedidos_entregues' ? (
            <PedidosEntregues onNavigate={handleSelectPedidosPage} />
          ) : activePage.id === 'pedidos_relatorios' ? (
            <PedidosRelatorios onNavigate={handleSelectPedidosPage} />
          ) : activePage.id === 'produtos_estoque_cadastro' ? (
            <ProdutosEstoqueCadastro onNavigate={handleSelectProdutosPage} />
          ) : activePage.id === 'produtos_receita' ? (
            <ProdutosReceita onNavigate={handleSelectProdutosPage} />
          ) : activePage.id === 'produtos_materia_prima' ? (
            <ProdutosMateriaPrima onNavigate={handleSelectProdutosPage} />
          ) : activePage.id === 'produtos_relatorios' ? (
            <ProdutosRelatorios onNavigate={handleSelectProdutosPage} />
          ) : activePage.id === 'produtos_ficha_tecnica' ? (
            <ProdutosFichaTecnica onNavigate={handleSelectProdutosPage} />
          ) : activePage.id === 'produtos_tabela_preco' ? (
            <ProdutosTabelaPreco onNavigate={handleSelectProdutosPage} />
          ) : activePage.id === 'produtos_etiqueta' ? (
            <ProdutosEtiqueta onNavigate={handleSelectProdutosPage} />
          ) : activePage.id === 'financeiro_a_receber' ? (
            <FinanceiroAReceber onNavigate={handleSelectFinanceiroPage} />
          ) : activePage.id === 'financeiro_a_pagar' ? (
            <FinanceiroAPagar onNavigate={handleSelectFinanceiroPage} />
          ) : activePage.id === 'financeiro_lancar_despesas' ? (
            <FinanceiroLancarDespesas onNavigate={handleSelectFinanceiroPage} />
          ) : activePage.id === 'financeiro_notas_saida' ? (
            <FinanceiroNotasSaida onNavigate={handleSelectFinanceiroPage} />
          ) : activePage.id === 'financeiro_notas_entrada' ? (
            <FinanceiroNotasEntrada onNavigate={handleSelectFinanceiroPage} />
          ) : activePage.id === 'financeiro_lancar_receita' ? (
            <FinanceiroLancarReceita onNavigate={handleSelectFinanceiroPage} />
          ) : activePage.id === 'financeiro_caixa_investimento' ? (
            <FinanceiroCaixaInvestimento onNavigate={handleSelectFinanceiroPage} />
          ) : (
            /* Telas ainda não implementadas exibem a marca d'água */
            <div className="relative flex-1 flex items-center justify-center select-none overflow-hidden">
              <span 
                className="
                  text-[13vw] sm:text-[11vw] lg:text-[10vw]
                  font-black tracking-tighter
                  text-emerald-950/[0.045]
                  uppercase
                  whitespace-nowrap
                  leading-none
                "
              >
                Grupo ENO
              </span>
            </div>
          )}
        </div>

      </main>

      {/* RODAPÉ */}
      <footer className="relative z-20 w-full bg-[#01140b] text-emerald-300/60 py-2 px-6 border-t border-emerald-900/40 text-[11px] text-center font-mono">
        © 2026 Grupo ENO · Agroindústria & Mandiocultura
      </footer>

    </div>
  );
}
