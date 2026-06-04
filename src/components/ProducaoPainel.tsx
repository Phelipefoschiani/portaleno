import React, { useState, useMemo, useEffect } from 'react';
import { useGlobalState } from '../GlobalStateContext';
import { useAuth } from '../AuthContext';
import { Pedido, ItemPedido, Produto } from '../types';
import { 
  CheckCircle, 
  Clock, 
  Eye, 
  Check, 
  Activity, 
  TrendingUp, 
  Boxes, 
  X,
  Package,
  Calendar,
  Save,
  ChevronRight,
  AlertTriangle,
  Edit,
  Plus
} from 'lucide-react';

interface ProducaoPainelProps {
  empresa?: string;
}

const ProducaoPainel: React.FC<ProducaoPainelProps> = ({ empresa }) => {
  const { 
    pedidos, 
    produtos, 
    clientes, 
    updatePedido 
  } = useGlobalState();

  const { user } = useAuth();

  // Role simulation: 'gerente' | 'operador' (producao)
  const [roleMode, setRoleMode] = useState<'gerente' | 'operador'>(user?.perfil === 'producao' ? 'operador' : 'gerente');

  useEffect(() => {
    if (user?.perfil === 'producao') {
      setRoleMode('operador');
    }
  }, [user]);
  
  // Tabs for statuses of pending orders
  const [statusFilter, setStatusFilter] = useState<'all' | 'Aguardando Produção' | 'Em produção' | 'Pronto'>('all');
  
  // Search query
  const [searchQuery, setSearchQuery] = useState('');

  // Selected order for supply list modal
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);

  // Draft quantities for operator edits (mapped by orderId -> array of item quantities)
  const [drafts, setDrafts] = useState<Record<string, number[]>>({});

  // Operator Lote/Dates Configuration Modal State
  const [isLoteModalOpen, setIsLoteModalOpen] = useState(false);
  const [selectedLotePedido, setSelectedLotePedido] = useState<Pedido | null>(null);
  const [opDataFabricacao, setOpDataFabricacao] = useState("");
  const [opDataVencimento, setOpDataVencimento] = useState("");
  const [opLoteCodigo, setOpLoteCodigo] = useState("");

  const handleOpenDefinirLoteModal = (pedido: Pedido) => {
    const today = new Date().toISOString().split("T")[0];
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + 60); // 60 days default shelf-life
    const expStr = expDate.toISOString().split("T")[0];

    const now = new Date();
    const datePart = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getFullYear()).substring(2)}`;
    const rndPart = Math.floor(100 + Math.random() * 900);
    const generatedLote = `LOT-${datePart}-${rndPart}`;

    setSelectedLotePedido(pedido);
    setOpDataFabricacao(pedido.data_fabricacao || today);
    setOpDataVencimento(pedido.data_vencimento || expStr);
    setOpLoteCodigo(pedido.lote || generatedLote);
    setIsLoteModalOpen(true);
  };

  const handleConfirmDefinirLote = () => {
    if (!selectedLotePedido || !opDataFabricacao || !opDataVencimento || !opLoteCodigo.trim()) {
      return;
    }

    updatePedido(selectedLotePedido.id, {
      data_fabricacao: opDataFabricacao,
      data_vencimento: opDataVencimento,
      lote: opLoteCodigo.trim()
    });

    setIsLoteModalOpen(false);
    setSelectedLotePedido(null);
  };

  // Filter orders related to production statuses: "Aguardando Produção", "Em produção" or "Pronto"
  const productionOrders = useMemo(() => {
    return pedidos.filter(p => 
      p.status === 'Aguardando Produção' || 
      p.status === 'Em produção' || 
      p.status === 'Pronto'
    );
  }, [pedidos]);

  // Map clients and products for lightning-fast lookups
  const clientMap = useMemo(() => {
    const map = new Map<string, string>();
    clientes.forEach(c => {
      map.set(c.id, c.nome_fantasia || c.razao_social);
    });
    return map;
  }, [clientes]);

  const productMap = useMemo(() => {
    const map = new Map<string, Produto>();
    produtos.forEach(p => {
      map.set(p.id, p);
    });
    return map;
  }, [produtos]);

  // Apply filters and searches
  const filteredOrders = useMemo(() => {
    return productionOrders.filter(p => {
      const clientName = clientMap.get(p.cliente_id)?.toLowerCase() || '';
      const orderCode = p.id.toUpperCase();
      const matchesSearch = clientName.includes(searchQuery.toLowerCase()) || orderCode.includes(searchQuery.toLowerCase());
      
      if (statusFilter === 'all') {
        return matchesSearch;
      }
      return p.status === statusFilter && matchesSearch;
    });
  }, [productionOrders, statusFilter, searchQuery, clientMap]);

  // Helper to get either the draft quantity or actual saved quantity of an item
  const getDraftValue = (pedido: Pedido, itemIdx: number): number => {
    if (drafts[pedido.id] !== undefined) {
      return drafts[pedido.id][itemIdx];
    }
    return pedido.items[itemIdx].quantidade_produzida || 0;
  };

  // Helper to check if an order has pending unsaved changes
  const hasChanges = (pedido: Pedido): boolean => {
    const draft = drafts[pedido.id];
    if (!draft) return false;
    return draft.some((val, idx) => val !== (pedido.items[idx].quantidade_produzida || 0));
  };

  // Calculate produced units vs expectation for a single order (accounting for operator edits)
  const getOrderProgress = (order: Pedido) => {
    let expected = 0;
    let produced = 0;
    order.items.forEach((it, idx) => {
      expected += it.quantidade;
      produced += getDraftValue(order, idx);
    });
    const percentage = expected > 0 ? Math.round((produced / expected) * 100) : 0;
    return { expected, produced, percentage };
  };

  // Global KPIs for the dashboard cards based on actual saved database values
  const kpis = useMemo(() => {
    const ordersAwaiting = productionOrders.filter(p => p.status === 'Aguardando Produção').length;
    const ordersOnGoing = productionOrders.filter(p => p.status === 'Em produção').length;
    const ordersCompleted = productionOrders.filter(p => p.status === 'Pronto').length;

    let totalExpectedUnits = 0;
    let totalProducedUnits = 0;

    productionOrders.forEach(p => {
      p.items.forEach(it => {
        totalExpectedUnits += it.quantidade;
        totalProducedUnits += it.quantidade_produzida || 0;
      });
    });

    const completionRate = totalExpectedUnits > 0 ? (totalProducedUnits / totalExpectedUnits) * 100 : 0;

    return {
      ordersAwaiting,
      ordersOnGoing,
      ordersCompleted,
      totalExpectedUnits,
      totalProducedUnits,
      completionRate
    };
  }, [productionOrders]);

  // Grab all pending insumos from all orders
  const getAllPendingInsumos = () => {
    const list: (import('../types').SolicitacaoInsumo & { pedidoId: string })[] = [];
    pedidos.forEach(p => {
      if (p.solicitacoes_insumos) {
        for (const sol of p.solicitacoes_insumos) {
          if (sol.status === 'Pendente') {
            list.push({ ...sol, pedidoId: p.id });
          }
        }
      }
    });
    return list;
  };

  // Set draft value for specific order item index
  const handleUpdateItemProductionDraft = (pedido: Pedido, itemIdx: number, stepVolume: number) => {
    const currentDraft = drafts[pedido.id] 
      ? [...drafts[pedido.id]] 
      : pedido.items.map(it => it.quantidade_produzida || 0);

    const targetItem = pedido.items[itemIdx];
    const currentVal = currentDraft[itemIdx];
    const newVal = Math.min(Math.max(0, currentVal + stepVolume), targetItem.quantidade);

    currentDraft[itemIdx] = newVal;

    setDrafts(prev => ({
      ...prev,
      [pedido.id]: currentDraft
    }));
  };

  // Reset order production draft locally
  const handleResetOrderProductionDraft = (pedido: Pedido) => {
    setDrafts(prev => ({
      ...prev,
      [pedido.id]: pedido.items.map(() => 0)
    }));
  };

  // Complete order production draft locally
  const handleCompleteOrderProductionDraft = (pedido: Pedido) => {
    setDrafts(prev => ({
      ...prev,
      [pedido.id]: pedido.items.map(it => it.quantidade)
    }));
  };

  // COMMIT and submit local draft changes to database
  const handleSendProductionUpdate = (orderId: string) => {
    const targetOrder = pedidos.find(p => p.id === orderId);
    if (!targetOrder) return;

    const draft = drafts[orderId];
    if (!draft) return; // No unsaved changes to commit

    const updatedItems = targetOrder.items.map((item, idx) => ({
      ...item,
      quantidade_produzida: draft[idx]
    }));

    // Auto calculate order status transition based on progress change
    let status: 'Aguardando Produção' | 'Em produção' | 'Pronto' = 'Em produção';
    const totalOrdered = updatedItems.reduce((acc, curr) => acc + curr.quantidade, 0);
    const totalProduced = updatedItems.reduce((acc, curr) => acc + (curr.quantidade_produzida || 0), 0);

    if (totalProduced === 0) {
      status = 'Aguardando Produção';
    } else if (totalProduced === totalOrdered) {
      status = 'Pronto';
    } else {
      status = 'Em produção';
    }

    updatePedido(orderId, { 
      items: updatedItems,
      status: status
    });

    // Clear local draft for this order
    setDrafts(prev => {
      const copy = { ...prev };
      delete copy[orderId];
      return copy;
    });

    // Keep the current open details modal updated if selected
    if (selectedPedido && selectedPedido.id === orderId) {
      setSelectedPedido({
        ...selectedPedido,
        items: updatedItems,
        status: status
      });
    }
  };

  // DYNAMICALLY GENERATES THE RAW INGREDIENT DEMAND FOR AN ORDER
  // Derived from product.custos_detalhados or defaults (Pão de queijo/Mandioca/Ingredientes)
  const dynamicRecipes = useMemo(() => {
    if (!selectedPedido) return [];

    const rawMaterialsNeeded: Record<string, { nome: string; totalNecessario: number; unidade: string }> = {};

    selectedPedido.items.forEach(it => {
      const prod = productMap.get(it.produto_id);
      const remainingToProduce = Math.max(0, it.quantidade - (it.quantidade_produzida || 0));

      if (prod && remainingToProduce > 0) {
        // Option 1: Retrieve from costs detailed (Matéria Prima / Insumo)
        const materiasPrimas = prod.custos_detalhados?.filter(c => 
          c.grupo === 'Matéria Prima' || 
          c.grupo === 'Insumos' || 
          c.grupo === 'Embalagem'
        );

        if (materiasPrimas && materiasPrimas.length > 0) {
          materiasPrimas.forEach(mp => {
            const matKey = mp.nome.toLowerCase();
            const conversionUnit = mp.unidade_medida || 'kg';
            
            // Proportion represents recipe amount per unit of final product
            const amountNeeded = mp.proporcao * remainingToProduce;

            if (rawMaterialsNeeded[matKey]) {
              rawMaterialsNeeded[matKey].totalNecessario += amountNeeded;
            } else {
              rawMaterialsNeeded[matKey] = {
                nome: mp.nome,
                totalNecessario: amountNeeded,
                unidade: conversionUnit
              };
            }
          });
        } else {
          // Option 2: Fallback recipes simulation so it never looks blank
          const isPaoDeQueijo = prod.nome.toLowerCase().includes('queijo');
          const isMandiocaPrato = prod.nome.toLowerCase().includes('mandioca') || prod.nome.toLowerCase().includes('farinha');

          const mockRecipes = isPaoDeQueijo ? [
            { nome: 'Polvilho Doce', proporcao: 0.45, unidade: 'kg' },
            { nome: 'Queijo Meia Cura', proporcao: 0.35, unidade: 'kg' },
            { nome: 'Leite Integral', proporcao: 0.20, unidade: 'l' },
            { nome: 'Embalagem Plástica 1kg', proporcao: 1.0, unidade: 'un' }
          ] : isMandiocaPrato ? [
            { nome: 'Mandioca in Natura descascada', proporcao: 1.10, unidade: 'kg' },
            { nome: 'Conservante de Alimento', proporcao: 0.005, unidade: 'kg' },
            { nome: 'Embalagem a Vácuo Estância', proporcao: 1.0, unidade: 'un' }
          ] : [
            { nome: 'Insumo Base Mandioca', proporcao: 0.85, unidade: 'kg' },
            { nome: 'Tempero Especial', proporcao: 0.02, unidade: 'kg' },
            { nome: 'Caixa de papelão despacho', proporcao: 0.04, unidade: 'un' }
          ];

          mockRecipes.forEach(mp => {
            const matKey = mp.nome.toLowerCase();
            const amountNeeded = mp.proporcao * remainingToProduce;

            if (rawMaterialsNeeded[matKey]) {
              rawMaterialsNeeded[matKey].totalNecessario += amountNeeded;
            } else {
              rawMaterialsNeeded[matKey] = {
                nome: mp.nome,
                totalNecessario: amountNeeded,
                unidade: mp.unidade
              };
            }
          });
        }
      }
    });

    return Object.values(rawMaterialsNeeded);
  }, [selectedPedido, productMap]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* HEADER SECTION WITH PERMISSION ROLE SWITCHER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[28px] shadow-sm border border-gray-100 animate-fade-in">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Painel de Acompanhamento e Produção</h2>
          <p className="text-sm text-gray-500 font-medium">Controle de lotes, insumos e apontamentos de fabricação.</p>
        </div>

        {/* Dynamic Mode Switcher */}
        {user?.perfil !== 'producao' && (
          <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-2xl border border-gray-100 self-start md:self-auto shrink-0 shadow-inner">
            <button
              onClick={() => setRoleMode('gerente')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                roleMode === 'gerente' 
                  ? 'bg-primary text-white shadow-sm' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Eye size={14} />
              Gerente (Acompanhamento)
            </button>
            <button
              onClick={() => setRoleMode('operador')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                roleMode === 'operador' 
                  ? 'bg-accent text-primary shadow-sm' 
                  : 'text-gray-400 hover:text-accent'
              }`}
            >
              <Activity size={14} />
              Produção (Apontamentos e Enviar)
            </button>
          </div>
        )}
      </div>

      {/* KPI DASHBOARD SECTION (Sleek 3 column grid as requested, no extra shopping lists card) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* KPI: Awaiting Production */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Aguardando Início</p>
              <h3 className="text-3xl font-black text-gray-950 mt-1">{kpis.ordersAwaiting}</h3>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl"><Clock size={20} /></div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-50 text-xs font-bold text-gray-400">
            Fila de espera para fabricação
          </div>
        </div>

        {/* KPI: In Production */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Em Fabricação</p>
              <h3 className="text-3xl font-black text-primary mt-1">{kpis.ordersOnGoing}</h3>
            </div>
            <div className="p-3 bg-primary/5 text-primary rounded-2xl"><Activity size={20} /></div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-50 text-xs font-bold text-gray-400">
            Lotes ativos na fábrica
          </div>
        </div>

        {/* KPI: Absolute progress rate */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Rendimento Total</p>
              <h3 className="text-3xl font-black text-emerald-600 mt-1">
                {Math.round(kpis.completionRate)}%
              </h3>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><TrendingUp size={20} /></div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${kpis.completionRate}%` }}
              ></div>
            </div>
            <p className="text-[10px] font-bold text-gray-400 mt-2 text-right">
              {kpis.totalProducedUnits.toLocaleString('pt-BR')} de {kpis.totalExpectedUnits.toLocaleString('pt-BR')} unidades
            </p>
          </div>
        </div>
      </div>

      {getAllPendingInsumos().length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-[28px] p-6 flex flex-col md:flex-row gap-6 md:items-start shadow-sm">
          <div className="flex items-center gap-3 md:w-1/3">
            <div className="p-3 bg-amber-100 text-amber-700 rounded-full shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-amber-900 tracking-tight">Solicitações de Insumos</h3>
              <p className="text-[10px] font-bold text-amber-700/80 uppercase tracking-widest mt-0.5">
                {user?.perfil === 'producao' ? 'Aguardando Compra' : 'Pendente de Compra'}
              </p>
            </div>
          </div>
          
          <div className="flex-1 flex flex-wrap gap-2">
            {getAllPendingInsumos().map(sol => (
              <div key={sol.pedidoId + sol.id} className="bg-white border text-left border-amber-100 rounded-xl p-3 flex flex-col justify-between gap-2 min-w-[200px] shadow-sm">
                <div>
                  <span className="text-[9px] font-black text-gray-400 block uppercase tracking-widest">Pedido #{sol.pedidoId.toUpperCase().substring(0,6)}</span>
                  <p className="text-xs font-black text-gray-800 capitalize mt-0.5 truncate">{sol.item}</p>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-1 rounded">
                    {sol.quantidade.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} {sol.unidade}
                  </span>
                  
                  {user?.perfil !== 'producao' && (
                    <button
                      onClick={() => {
                        const targetOrder = pedidos.find(p => p.id === sol.pedidoId);
                        if (!targetOrder) return;
                        const solUpdate = (targetOrder.solicitacoes_insumos || []).map(s => 
                          s.id === sol.id ? { ...s, status: 'Comprado' as const } : s
                        );
                        updatePedido(targetOrder.id, { solicitacoes_insumos: solUpdate });
                      }}
                      className="text-[9px] font-black uppercase text-amber-600 hover:text-emerald-600 border border-amber-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all rounded px-2 py-1"
                    >
                      Marcar Comprado
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FILTER & INTERACTIVE CONTROL BAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-[24px] shadow-sm border border-gray-100">
        {/* Status filters */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
              statusFilter === 'all'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
            }`}
          >
            Todos ({productionOrders.length})
          </button>
          <button
            onClick={() => setStatusFilter('Aguardando Produção')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 ${
              statusFilter === 'Aguardando Produção'
                ? 'bg-amber-100 text-amber-700 font-black shadow-sm'
                : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            Aguardando ({productionOrders.filter(p => p.status === 'Aguardando Produção').length})
          </button>
          <button
            onClick={() => setStatusFilter('Em produção')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 ${
              statusFilter === 'Em produção'
                ? 'bg-blue-100 text-blue-700 font-black shadow-sm'
                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            Em Produção ({productionOrders.filter(p => p.status === 'Em produção').length})
          </button>
          <button
            onClick={() => setStatusFilter('Pronto')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 ${
              statusFilter === 'Pronto'
                ? 'bg-emerald-100 text-emerald-700 font-black shadow-sm'
                : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Pronto/Concluídos ({productionOrders.filter(p => p.status === 'Pronto').length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full lg:w-72">
          <input
            type="text"
            placeholder="Buscar por cliente ou código..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-4 pr-4 py-2.5 text-sm font-semibold outline-none focus:border-primary transition-all text-gray-950 placeholder-gray-400"
          />
        </div>
      </div>

      {/* MAIN ORDERS AREA */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-[32px] border border-gray-100 flex flex-col items-center justify-center gap-4 shadow-sm animate-fade-in">
          <div className="p-4 bg-gray-50 text-gray-400 rounded-full">
            <Boxes size={40} />
          </div>
          <h3 className="text-lg font-black text-gray-900">Nenhum lote ou pedido ativo</h3>
          <p className="text-gray-500 text-sm max-w-md">Não foram localizados pedidos nos filtros selecionados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start animate-fade-in">
          {filteredOrders.map((pedido) => {
            const progressInfo = getOrderProgress(pedido);
            const clientName = clientMap.get(pedido.cliente_id) || 'Cliente Desconhecido';
            const orderDraftChanges = hasChanges(pedido);

            return (
              <div 
                key={pedido.id} 
                className={`bg-white rounded-[32px] shadow-sm border overflow-hidden flex flex-col group hover:shadow-md transition-all duration-300 ${
                  orderDraftChanges ? 'border-amber-400' : 'border-gray-100'
                }`}
              >
                {/* Visual Accent header depending on status */}
                <div className={`h-1.5 w-full ${
                  pedido.status === 'Pronto' ? 'bg-emerald-500' :
                  pedido.status === 'Em produção' ? 'bg-blue-500' : 'bg-amber-400'
                }`} />

                <div className="p-6 lg:p-8 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Header line */}
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Pedido</span>
                        <h4 className="text-base font-black text-gray-950">{pedido.id.toUpperCase().substring(0, 11)}</h4>
                      </div>
                      
                      {/* Status indicator pills */}
                      <div className="flex items-center gap-1.5">
                        {orderDraftChanges && (
                          <span className="px-2 py-0.5 bg-amber-500 text-white rounded-full text-[9px] font-black uppercase tracking-widest animate-pulse">
                            Alterado
                          </span>
                        )}
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          pedido.status === 'Pronto' 
                            ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20' 
                            : pedido.status === 'Em produção'
                              ? 'bg-blue-500/10 text-blue-700 border border-blue-500/20'
                              : 'bg-amber-500/10 text-amber-700 border border-amber-500/20'
                        }`}>
                          {pedido.status}
                        </span>
                      </div>
                    </div>

                    {/* Client & Date */}
                    <div className="mt-4 pb-4 border-b border-gray-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Cliente</p>
                          <h4 className="text-sm font-extrabold text-gray-900 truncate mt-0.5 max-w-[180px]">{clientName}</h4>
                        </div>
                        <p className="text-[10px] text-gray-400 flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                          <Calendar size={12} />
                          <span className="font-bold">{new Date(pedido.data).toLocaleDateString('pt-BR')}</span>
                        </p>
                      </div>

                      {pedido.lote ? (
                        <div className="mt-3 bg-indigo-50/40 border border-indigo-100/50 p-3 rounded-2xl relative">
                          <button
                            onClick={() => handleOpenDefinirLoteModal(pedido)}
                            className="absolute right-2.5 top-2.5 p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-all"
                            title="Editar Dados do Lote"
                          >
                            <Edit size={12} />
                          </button>
                          
                          <div className="grid grid-cols-3 gap-2 text-left">
                            <div>
                              <span className="text-[8px] font-black text-indigo-400 block uppercase tracking-wider">Lote</span>
                              <span className="font-extrabold text-[10px] text-indigo-900 font-mono tracking-tight">{pedido.lote}</span>
                            </div>
                            <div>
                              <span className="text-[8px] font-black text-indigo-400 block uppercase tracking-wider">Fabricação</span>
                              <span className="font-bold text-[10px] text-indigo-900">
                                {pedido.data_fabricacao ? new Date(pedido.data_fabricacao + "T12:00:00").toLocaleDateString('pt-BR') : '-'}
                              </span>
                            </div>
                            <div>
                              <span className="text-[8px] font-black text-indigo-400 block uppercase tracking-wider">Vencimento</span>
                              <span className="font-bold text-[10px] text-indigo-900">
                                {pedido.data_vencimento ? new Date(pedido.data_vencimento + "T12:00:00").toLocaleDateString('pt-BR') : '-'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 bg-amber-50/70 border border-amber-200/50 p-3 rounded-2xl flex flex-col gap-2">
                          <div className="flex items-start gap-1.5 text-amber-800 text-[10px] font-bold leading-normal">
                            <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                            <span>Lote e datas de fabricação/vencimento não configurados.</span>
                          </div>
                          <button
                            onClick={() => handleOpenDefinirLoteModal(pedido)}
                            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black text-[10px] uppercase tracking-wider py-1.5 px-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1"
                          >
                            <Plus size={12} /> Configurar Lote / Datas
                          </button>
                        </div>
                      )}
                    </div>

                    {/* ITEM PROGRESS SEGMENT */}
                    <div className="mt-5 space-y-4">
                      <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-gray-400">
                        <span>Produtos Fabricados</span>
                        <span className="text-gray-900 font-extrabold">{progressInfo.percentage}%</span>
                      </div>

                      {/* Global Progress bar */}
                      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            pedido.status === 'Pronto' ? 'bg-emerald-500' : 'bg-primary'
                          }`}
                          style={{ width: `${progressInfo.percentage}%` }}
                        ></div>
                      </div>

                      {/* Detailed product items inside the order */}
                      <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 space-y-3 mt-4">
                        {pedido.items.map((item, idx) => {
                          const prod = productMap.get(item.produto_id);
                          const prodName = prod?.nome || 'Insumo Mandioca';
                          const prodUn = prod?.unidade || 'Un';
                          const produced = getDraftValue(pedido, idx);
                          const expected = item.quantidade;
                          const ratio = expected > 0 ? (produced / expected) * 100 : 0;

                          return (
                            <div key={idx} className="text-xs bg-white p-3 rounded-xl border border-gray-50 flex flex-col gap-2 shadow-sm">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h5 className="font-extrabold text-gray-900">{prodName}</h5>
                                  <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">
                                    Meta: <span className="text-gray-700 font-extrabold">{expected} {prodUn}</span>
                                  </p>
                                </div>
                                <span className={`font-black tracking-tight ${ratio >= 100 ? 'text-emerald-600' : 'text-primary'}`}>
                                  {produced} / {expected} {prodUn}
                                </span>
                              </div>

                              {/* Item progress bar */}
                              <div className="w-full bg-gray-50 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-300 ${ratio >= 100 ? 'bg-emerald-500' : 'bg-primary/80'}`}
                                  style={{ width: `${ratio}%` }}
                                ></div>
                              </div>

                              {/* OPERATOR/PRODUCTION REGISTER CONTROLS */}
                              {roleMode === 'operador' && (
                                <div className="flex items-center justify-between gap-2 mt-1.5 pt-1.5 border-t border-gray-100/60">
                                  {!pedido.lote ? (
                                    <span className="text-[9px] font-black text-amber-700 uppercase tracking-widest bg-amber-50 px-2 py-1 rounded">
                                      Defina o lote acima para apontar dados
                                    </span>
                                  ) : (
                                    <>
                                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Ajustar Qtd:</span>
                                      <div className="flex items-center gap-1 bg-gray-50 p-0.5 rounded-lg border border-gray-100 scale-95 origin-right">
                                        <button 
                                          onClick={() => handleUpdateItemProductionDraft(pedido, idx, -10)}
                                          disabled={produced === 0}
                                          className="px-2 py-0.5 bg-white border border-gray-200 hover:bg-gray-100 rounded text-[10px] font-black text-gray-700 disabled:opacity-40 transition-all font-mono"
                                        >
                                          -10
                                        </button>
                                        <button 
                                          onClick={() => handleUpdateItemProductionDraft(pedido, idx, -1)}
                                          disabled={produced === 0}
                                          className="px-2 py-0.5 bg-white border border-gray-200 hover:bg-gray-100 rounded text-[10px] font-black text-gray-700 disabled:opacity-40 transition-all font-mono"
                                        >
                                          -1
                                        </button>
                                        <button 
                                          onClick={() => handleUpdateItemProductionDraft(pedido, idx, 1)}
                                          disabled={produced >= expected}
                                          className="px-2 py-0.5 bg-accent hover:bg-accent/80 text-primary font-bold rounded text-[10px] disabled:opacity-40 transition-all font-mono"
                                        >
                                          +1
                                        </button>
                                        <button 
                                          onClick={() => handleUpdateItemProductionDraft(pedido, idx, 10)}
                                          disabled={produced >= expected}
                                          className="px-2 py-0.5 bg-accent hover:bg-accent/80 text-primary font-bold rounded text-[10px] disabled:opacity-40 transition-all font-mono"
                                          title="Lançar lote de 10"
                                        >
                                          +10
                                        </button>
                                        <button 
                                          onClick={() => handleUpdateItemProductionDraft(pedido, idx, expected - produced)}
                                          disabled={produced >= expected}
                                          className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[10px] uppercase tracking-wider disabled:opacity-40 transition-all"
                                          title="Confirmar Conclusão Total"
                                        >
                                          Meta
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* BOTTOM ACTIONS BAR */}
                  <div className="mt-6 pt-5 border-t border-gray-100 flex flex-wrap gap-2 justify-between items-center bg-white">
                    {/* Visual indicators of extra requests */}
                    <button
                      onClick={() => setSelectedPedido(pedido)}
                      className="flex items-center gap-2 px-3.5 py-2 text-xs font-black uppercase tracking-wider bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-100 rounded-xl transition-all"
                    >
                      <Package size={14} />
                      Insumos / Demanda
                    </button>

                    {/* Operational draft control and Submit Button */}
                    {roleMode === 'operador' && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {pedido.lote ? (
                          <>
                            <button
                              onClick={() => handleResetOrderProductionDraft(pedido)}
                              className="px-3 py-2 text-[10px] font-black text-gray-400 hover:text-red-500 uppercase tracking-widest transition-all rounded-lg"
                              title="Reiniciar rascunho de progresso do lote"
                            >
                              Zerar
                            </button>
                            
                            <button
                              onClick={() => handleCompleteOrderProductionDraft(pedido)}
                              className="px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-100 text-gray-600 font-extrabold text-[10px] uppercase tracking-widest rounded-xl transition-all"
                            >
                              Fazer Tudo
                            </button>

                            <button
                              onClick={() => handleSendProductionUpdate(pedido.id)}
                              disabled={!orderDraftChanges}
                              className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center gap-1.5 ${
                                orderDraftChanges
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse'
                                  : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                              }`}
                            >
                              <Save size={14} />
                              Enviar Apontamento
                            </button>
                          </>
                        ) : (
                          <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider bg-amber-50 px-3 py-2 rounded-xl border border-amber-100/50">
                            Aguardando Lote
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --- INGREDIENTS DEMAND WINDOW MODAL --- */}
      {selectedPedido && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-primary/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-4xl h-[80vh] overflow-hidden flex flex-col scale-in">
            {/* Modal Header */}
            <div className="p-6 sm:p-8 bg-primary text-white flex justify-between items-center shrink-0">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-accent font-sans">Análise de Demanda de Receitas</span>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-1">
                  Lista de Insumos - Pedido #{selectedPedido.id.toUpperCase().substring(0, 11)}
                </h2>
                <p className="text-xs text-white/70 font-semibold mt-1">
                  Abastecimento planejado para atender o cliente: <strong className="text-accent underline font-extrabold">{clientMap.get(selectedPedido.cliente_id)}</strong>
                </p>
              </div>

              <button 
                onClick={() => setSelectedPedido(null)}
                className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white outline-none"
                title="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content - Beautiful 2 Column Layout with Left=Recipe Demand and Right=Pending items */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 flex flex-col md:flex-row gap-8 bg-gray-50">
              
              {/* LEFT HALF: AUTO RECIPE / INGREDIENT DEMAND */}
              <div className="flex-1 flex flex-col gap-6">
                <div className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                    <div className="p-2 bg-primary/5 text-primary rounded-xl"><Boxes size={18} /></div>
                    <div>
                      <h3 className="font-extrabold text-gray-950 text-sm">Demanda Estimada de Receita</h3>
                      <p className="text-[10px] text-gray-400 font-bold">Insumos/Matéria prima calculada para as quantidades restantes.</p>
                    </div>
                  </div>

                  {dynamicRecipes.length === 0 ? (
                    <div className="p-6 text-center text-xs text-gray-400 font-bold bg-gray-50 rounded-xl space-y-1">
                      <CheckCircle size={28} className="text-emerald-500 mx-auto" />
                      <p className="text-gray-900 mt-2">Nenhuma matéria prima pendente!</p>
                      <p className="text-[10px] text-gray-400">Todos os produtos já foram fabricados para este pedido.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
                      {dynamicRecipes.map((recipeItem, idx) => {
                        const jaSolicitado = selectedPedido.solicitacoes_insumos?.some(s => s.item.toLowerCase() === recipeItem.nome.toLowerCase() && s.status === 'Pendente');

                        return (
                          <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 border border-gray-100 rounded-xl shadow-inner gap-3">
                            <div className="flex-1">
                              <span className="text-xs font-black text-gray-900 capitalize block">{recipeItem.nome}</span>
                              <span className="text-[10px] font-bold text-gray-500">
                                Demanda: {recipeItem.totalNecessario.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} {recipeItem.unidade}
                              </span>
                            </div>
                            
                            {user?.perfil === 'producao' ? (
                              <button
                                onClick={() => {
                                  if (jaSolicitado) return; // Prevent duplicate pending request
                                  const novaSol = {
                                    id: Math.random().toString(36).substring(2, 9),
                                    item: recipeItem.nome,
                                    quantidade: recipeItem.totalNecessario,
                                    unidade: recipeItem.unidade,
                                    urgente: true,
                                    status: 'Pendente' as const
                                  };
                                  const atualizadas = [...(selectedPedido.solicitacoes_insumos || []), novaSol];
                                  updatePedido(selectedPedido.id, { solicitacoes_insumos: atualizadas });
                                  setSelectedPedido({ ...selectedPedido, solicitacoes_insumos: atualizadas });
                                }}
                                disabled={jaSolicitado}
                                className={`px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-1 shrink-0 ${
                                  jaSolicitado 
                                    ? 'bg-amber-100 text-amber-700 opacity-60' 
                                    : 'bg-primary hover:bg-primary/90 text-white'
                                }`}
                              >
                                {jaSolicitado ? <><Check size={12}/> Solicitado</> : <><Plus size={12}/> Pedir Compra</>}
                              </button>
                            ) : (
                               <span className="text-xs font-black text-primary bg-primary/5 px-2.5 py-1 rounded-lg shrink-0">
                                 {recipeItem.totalNecessario.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} {recipeItem.unidade}
                               </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT HALF: DETAILED REMAINING UNITS LEFT TO PRODUCE */}
              <div className="flex-1 flex flex-col gap-6">
                <div className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><CheckCircle size={18} /></div>
                    <div>
                      <h3 className="font-extrabold text-gray-950 text-sm">Status / Faltantes</h3>
                      <p className="text-[10px] text-gray-400 font-bold">Unidades de produtos que ainda precisam ser fabricados.</p>
                    </div>
                  </div>

                  <div className="space-y-3.5 max-h-[40vh] overflow-y-auto pr-1">
                    {selectedPedido.items.map((it, idx) => {
                      const prod = productMap.get(it.produto_id);
                      const rem = Math.max(0, it.quantidade - (it.quantidade_produzida || 0));

                      return (
                        <div key={idx} className="flex items-center justify-between text-xs p-3 bg-gray-50 border border-gray-50 rounded-xl">
                          <span className="font-extrabold text-gray-700 truncate max-w-[200px]">{prod?.nome || 'Insumo'}</span>
                          <span className={`font-black uppercase tracking-wider text-[10px] px-2.5 py-1 rounded-lg ${
                            rem === 0 
                              ? 'text-emerald-700 bg-emerald-100/50' 
                              : 'text-amber-700 bg-amber-100/50'
                          }`}>
                            {rem === 0 ? 'Concluído' : `${rem} de ${it.quantidade} faltantes`}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {selectedPedido.items.every(it => (it.quantidade_produzida || 0) >= it.quantidade) && (
                    <div className="p-3 bg-emerald-50 rounded-xl text-emerald-800 text-[11px] font-black text-center flex items-center justify-center gap-1">
                      <Check size={16} /> Lote 100% Finalizado e pronto para entrega!
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-white border-t border-gray-100 flex justify-end shrink-0 gap-3">
              <button
                onClick={() => setSelectedPedido(null)}
                className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all"
              >
                Fechar Insumos
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Operator Setup Lote and Dates Modal */}
      {isLoteModalOpen && selectedLotePedido && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-primary/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[32px] shadow-2xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto scale-in">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-primary block">Parâmetros de Linha de Fábrica</span>
                <h3 className="text-xl font-black text-gray-900 mt-1">Dados de Rastreabilidade</h3>
              </div>
              <button
                onClick={() => setIsLoteModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                title="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-6 p-4 bg-gray-50 rounded-2xl border border-gray-100 text-xs">
              <p className="text-gray-400 font-bold uppercase tracking-wider">Lote para o Pedido</p>
              <h4 className="text-sm font-black text-gray-950 mt-1">
                #{selectedLotePedido.id.toUpperCase().substring(0, 11)}
              </h4>
              <p className="mt-1 text-gray-600">
                Cliente: <span className="font-bold text-gray-900">{clientMap.get(selectedLotePedido.cliente_id)}</span>
              </p>
            </div>

            <div className="space-y-4">
              {/* LOTE CODE */}
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1.5">
                  Código do Lote <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={opLoteCodigo}
                    onChange={(e) => setOpLoteCodigo(e.target.value)}
                    placeholder="Ex: LOT-230526-781"
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-4 pr-16 py-2.5 text-sm font-semibold outline-none focus:border-primary transition-all text-gray-950 placeholder-gray-400 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      const datePart = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getFullYear()).substring(2)}`;
                      const rndPart = Math.floor(100 + Math.random() * 900);
                      setOpLoteCodigo(`LOT-${datePart}-${rndPart}`);
                    }}
                    className="absolute right-2 top-2 px-2.5 py-1.5 text-[10px] uppercase font-black tracking-widest text-primary hover:text-white bg-primary/5 hover:bg-primary rounded-xl transition-all"
                    title="Regerar lote aleatório"
                  >
                    Gerar
                  </button>
                </div>
              </div>

              {/* DATA FABRICACAO */}
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1.5">
                  Data de Fabricação <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={opDataFabricacao}
                  onChange={(e) => setOpDataFabricacao(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-primary transition-all text-gray-950"
                />
              </div>

              {/* DATA VENCIMENTO */}
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1.5">
                  Data de Vencimento <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={opDataVencimento}
                  onChange={(e) => setOpDataVencimento(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-primary transition-all text-gray-950"
                />
              </div>
            </div>

            {/* Modal Controls */}
            <div className="flex gap-3 mt-8">
              <button
                type="button"
                onClick={() => setIsLoteModalOpen(false)}
                className="flex-1 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-500 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all border border-gray-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDefinirLote}
                disabled={!opDataFabricacao || !opDataVencimento || !opLoteCodigo.trim()}
                className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary-hover disabled:bg-gray-200 disabled:text-gray-400 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm"
              >
                Salvar Configurações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProducaoPainel;
