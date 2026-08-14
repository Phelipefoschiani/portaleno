import { formatCurrency } from "../types";
import React, { useState } from "react";
import {  useGlobalState } from "../GlobalStateContext";
import {  useAuth } from "../AuthContext";
import { 
  Search,
  FileText,
  Calendar,
  CheckCircle,
  Clock,
  Filter,
  DollarSign,
  Coins,
  ArrowUpRight,
  UserCheck,
  TrendingDown,
  X,
  CreditCard,
  Landmark
} from "lucide-react";
import {  Pedido } from "../types";

interface AReceberProps {
  empresa: string;
}

const AReceber: React.FC<AReceberProps> = ({ empresa }) => {
  const { pedidos, clientes, updatePedido } = useGlobalState();
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("TODOS"); // TODOS, PENDENTE ("A Receber"), RECEBIDO, ADIANTADO

  // Liquidation modal state
  const [selectedPedidoLiquida, setSelectedPedidoLiquida] = useState<Pedido | null>(null);
  const [recvDate, setRecvDate] = useState("");
  const [recvInterest, setRecvInterest] = useState<number>(0);

  if (empresa !== "estancia") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-white rounded-3xl border border-gray-100 shadow-sm p-8 text-center">
        <Landmark size={40} className="text-gray-300 mb-4" />
        <h2 className="text-xl font-black text-gray-900 tracking-tight">Módulo em Configuração</h2>
        <p className="text-gray-500 max-w-sm font-medium mt-1">
          Atualmente o painel de Contas a Receber está disponível exclusivamente para a Estância Nova Olinda.
        </p>
      </div>
    );
  }

  // Only consider orders that are "Faturado"
  const faturados = pedidos.filter(p => p.status === "Faturado");

  const filteredItems = faturados.filter((p) => {
    const cli = clientes.find((c) => c.id === p.cliente_id);
    const cliName = cli?.razao_social || "Consumidor Final";
    const cliFantasia = cli?.nome_fantasia || "N/A";
    const idStr = p.id.split("_")[1] || p.id;
    const nfNum = p.nf_numero || "";

    const matchesSearch =
      cliName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliFantasia.toLowerCase().includes(searchTerm.toLowerCase()) ||
      idStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nfNum.toLowerCase().includes(searchTerm.toLowerCase());

    // status calculation
    let isPending = !p.recebido && !p.adiantado;
    let isReceived = !!p.recebido;
    let isAdvanced = !!p.adiantado;

    let matchesStatus = true;
    if (statusFilter === "PENDENTE") matchesStatus = isPending;
    else if (statusFilter === "RECEBIDO") matchesStatus = isReceived;
    else if (statusFilter === "ADIANTADO") matchesStatus = isAdvanced;

    return matchesSearch && matchesStatus;
  });

  // Calculations
  const totalFaturado = faturados.reduce((acc, p) => acc + (p.nf_valor_total || p.valor_total || 0), 0);
  
  const totalRecebido = faturados
    .filter(p => p.recebido || p.adiantado)
    .reduce((acc, p) => {
      if (p.adiantado) {
        return acc + (p.valor_adiantado_recebido || 0);
      }
      return acc + (p.nf_valor_total || p.valor_total || 0);
    }, 0);

  const totalAReceber = faturados
    .filter(p => !p.recebido && !p.adiantado)
    .reduce((acc, p) => acc + (p.nf_valor_total || p.valor_total || 0), 0);

  const totalJurosRecebido = faturados
    .filter(p => p.recebido && p.juros_recebido)
    .reduce((acc, p) => acc + (p.juros_recebido || 0), 0);

  const totalJurosPagoAdiantamento = faturados
    .filter(p => p.adiantado && p.juros_adiantamento)
    .reduce((acc, p) => acc + (p.juros_adiantamento || 0), 0);

  const handleOpenLiquida = (ped: Pedido) => {
    setSelectedPedidoLiquida(ped);
    setRecvDate(new Date().toISOString().split("T")[0]);
    setRecvInterest(0);
  };

  const handleConfirmLiquidation = () => {
    if (!selectedPedidoLiquida) return;

    // Save
    updatePedido(selectedPedidoLiquida.id, {
      recebido: true,
      data_recebimento: recvDate,
      juros_recebido: recvInterest > 0 ? recvInterest : undefined
    });

    alert("Recepção de valor registrada com sucesso!");
    setSelectedPedidoLiquida(null);
  };

  return (
    <div className="space-y-6">
      {/* HEADER PAGE */}
      <div className="bg-white rounded-[32px] p-6 lg:p-8 border border-gray-100 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#ef4444] bg-red-50 px-3 py-1 rounded-full">
            Módulo Financeiro Central
          </span>
          <h2 className="text-2xl font-black text-gray-900 mt-2">
            Controle de Contas A Receber
          </h2>
          <p className="text-gray-500 font-medium text-xs mt-1">
            Controle detalhado de liquidações, carteira de clientes, recebimentos e controle de deságios de adiantamento.
          </p>
        </div>
      </div>

      {/* STATS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1 */}
        <div className="bg-white p-5 rounded-[24px] border border-gray-100 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle size={20} />
            </div>
            <div>
              <span className="text-gray-450 text-[10px] font-black uppercase tracking-wider block">Total Recebido</span>
              <span className="text-xl font-black text-emerald-700 mt-0.5 block">
                R$ {totalRecebido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          <p className="text-[9px] text-gray-450 mt-2.5 font-bold">Incluso recebimento líquido de adiantamentos</p>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-5 rounded-[24px] border border-gray-100 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Clock size={20} />
            </div>
            <div>
              <span className="text-gray-450 text-[10px] font-black uppercase tracking-wider block">A Receber Pendente</span>
              <span className="text-xl font-black text-blue-700 mt-0.5 block">
                R$ {totalAReceber.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          <p className="text-[9px] text-gray-450 mt-2.5 font-bold">Duplicatas faturadas aguardando vencimento/cobrança</p>
        </div>

        {/* Card 4 */}
        <div className="bg-white p-5 rounded-[24px] border border-gray-100 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-50 text-[#ef4444] rounded-xl">
              <TrendingDown size={20} />
            </div>
            <div>
              <span className="text-gray-450 text-[10px] font-black uppercase tracking-wider block">Deságios de Adiantamento (Juros Pagos)</span>
              <span className="text-xl font-black text-red-650 mt-0.5 block">
                R$ {totalJurosPagoAdiantamento.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          <p className="text-[9px] text-gray-450 mt-2.5 font-bold">Juros deduzidos e pagos ao banco/terceiros para realizar a antecipação</p>
        </div>
      </div>

      {/* FILTER & SEARCH */}
      <div className="bg-white p-4 rounded-[24px] border border-gray-100 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:max-w-md">
          <Search size={16} className="absolute left-4 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por cliente, NF ou ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-11 pr-4 py-2 text-sm font-semibold outline-none focus:border-red-500 transition-all text-gray-950 placeholder-gray-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-black uppercase mr-2">
            <Filter size={14} /> Filtro:
          </div>

          <button
            onClick={() => setStatusFilter("TODOS")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === "TODOS"
                ? "bg-[#ef4444] text-white"
                : "bg-gray-100 text-gray-650 hover:bg-gray-200"
            }`}
          >
            Todos ({faturados.length})
          </button>

          <button
            onClick={() => setStatusFilter("PENDENTE")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === "PENDENTE"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-650 hover:bg-gray-200"
            }`}
          >
            A Receber ({faturados.filter(p => !p.recebido && !p.adiantado).length})
          </button>

          <button
            onClick={() => setStatusFilter("RECEBIDO")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === "RECEBIDO"
                ? "bg-emerald-600 text-white"
                : "bg-gray-100 text-gray-650 hover:bg-gray-200"
            }`}
          >
            Recebidos ({faturados.filter(p => p.recebido).length})
          </button>

          <button
            onClick={() => setStatusFilter("ADIANTADO")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === "ADIANTADO"
                ? "bg-purple-600 text-white"
                : "bg-gray-100 text-gray-650 hover:bg-gray-200"
            }`}
          >
            Adiantados ({faturados.filter(p => p.adiantado).length})
          </button>
        </div>
      </div>

      {/* LIST TABLE */}
      <div className="bg-white rounded-[28px] border border-gray-100 shadow-xs overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-12 h-12 bg-gray-105 rounded-full flex items-center justify-center text-gray-400 mx-auto mb-3">
              <Coins size={24} />
            </div>
            <h4 className="text-sm font-black text-gray-900">Nenhum Registro de Recebimento</h4>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              Nenhuma fatura condiz com os filtros aplicados neste momento.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <th className="p-4 w-32">Documento</th>
                  <th className="p-4">Cliente / Sacado</th>
                  <th className="p-4">Previsão Pgto (Vencimento)</th>
                  <th className="p-4">Detalhamento Faturamento</th>
                  <th className="p-4 text-center">Status Recebimento</th>
                  <th className="p-4 text-right">Valor Líquido</th>
                  <th className="p-4 text-center w-24">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700 font-bold">
                {filteredItems.map((item) => {
                  const cli = clientes.find((c) => c.id === item.cliente_id);
                  const cliName = cli?.razao_social || "Consumidor Final";
                  const totalVal = item.nf_valor_total || item.valor_total || 0;

                  // Evaluate status
                  let statusLabel = "A receber";
                  let badgeStyle = "bg-blue-50 text-blue-700 border-blue-100";
                  if (item.recebido) {
                    statusLabel = "Recebido";
                    badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-100";
                  } else if (item.adiantado) {
                    statusLabel = "Adiantado";
                    badgeStyle = "bg-purple-50 text-purple-700 border-purple-100";
                  }

                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      {/* Document columns */}
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-gray-900 uppercase">
                            {item.nf_numero ? `NF-${item.nf_numero}` : "Doc Provisório"}
                          </span>
                          <span className="text-[9px] text-gray-400 mt-0.5">
                            ID: {item.id.split("_")[1] || item.id.substring(0, 6)}
                          </span>
                        </div>
                      </td>

                      {/* Client information */}
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-black text-gray-950 block max-w-xs truncate">
                            {cliName}
                          </span>
                          <span className="text-[10px] text-gray-400 font-medium">
                            CNPJ/CPF: {cli?.cnpj_cpf || "---"}
                          </span>
                        </div>
                      </td>

                      {/* Due date */}
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-gray-900">
                          <Calendar size={13} className="text-gray-450" />
                          <span>
                            {(() => {
                              try {
                                const dt = item.data_pagamento_nf || item.data_vencimento;
                                const forma = item.forma_pagamento_nf;
                                if (!dt || !dt.trim()) return "À Vista";
                                const dateObj = new Date(dt + "T12:00:00");
                                if (isNaN(dateObj.getTime())) return "À Vista";
                                const dateStr = dateObj.toLocaleDateString("pt-BR");
                                return forma ? `${forma} | ${dateStr}` : dateStr;
                              } catch (e) {
                                return "À Vista";
                              }
                            })()}
                          </span>
                        </div>
                      </td>

                      {/* Historical and current detail of liquidation */}
                      <td className="p-4">
                        <div className="text-[10px] space-y-0.5 font-semibold">
                          {item.recebido && (
                            <div className="text-emerald-700">
                              <span>Rec. em {item.data_recebimento ? new Date(item.data_recebimento + "T12:00:00").toLocaleDateString("pt-BR") : "---"}</span>
                              {item.juros_recebido ? (
                                <span className="block text-[9px] text-[#ef4444] font-black">
                                  (+ R$ {formatCurrency(item.juros_recebido)} juros cobrados)
                                </span>
                              ) : null}
                            </div>
                          )}
                          {item.adiantado && (
                            <div className="text-purple-700">
                              <span>Adiantado em {item.data_adiantamento ? new Date(item.data_adiantamento + "T12:00:00").toLocaleDateString("pt-BR") : "---"}</span>
                              <span className="block text-[9px] text-red-500 font-bold">
                                (Juros pagos: R$ {item.juros_adiantamento?.toFixed(2)})
                              </span>
                            </div>
                          )}
                          {!item.recebido && !item.adiantado && (
                            <span className="text-gray-400">Aguardando cobrança padrão</span>
                          )}
                        </div>
                      </td>

                      {/* Badge status */}
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center border rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${badgeStyle}`}>
                          {statusLabel}
                        </span>
                      </td>

                      {/* Value column */}
                      <td className="p-4 text-right text-[13px] font-black text-gray-950">
                        {item.adiantado ? (
                          <div className="flex flex-col text-right">
                            <span className="text-emerald-700 text-[13px]">
                              R$ {item.valor_adiantado_recebido?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-[9px] text-gray-450 line-through">
                              R$ {totalVal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        ) : (
                          <span>
                            R$ {totalVal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </td>

                      {/* Action column */}
                      <td className="p-4 text-center">
                        {!item.recebido && !item.adiantado ? (
                          <button
                            onClick={() => handleOpenLiquida(item)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-wider py-1.5 px-3 rounded-lg transition-colors"
                          >
                            Receber
                          </button>
                        ) : (
                          <span className="text-[10px] text-gray-400 font-medium">Liquidado</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* LIQUIDATION ACTION MODAL */}
      {selectedPedidoLiquida && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/40 backdrop-blur-sm">
          <div className="bg-white rounded-[28px] shadow-2xl p-6 w-full max-w-md scale-in text-left">
            <div className="flex justify-between items-start mb-4 border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-gray-950">
                  Liquidar Recebimento
                </h3>
                <p className="text-xs text-gray-450 font-semibold">
                  Pedido: {selectedPedidoLiquida.id.split("_")[1] || selectedPedidoLiquida.id}
                </p>
              </div>
              <button
                onClick={() => setSelectedPedidoLiquida(null)}
                className="p-1 text-gray-450 hover:text-gray-750 hover:bg-gray-100 rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-gray-450 text-[10px] font-bold block uppercase tracking-wider mb-1">
                  Cliente Sacado
                </span>
                <span className="font-extrabold text-gray-900 text-sm">
                  {clientes.find(c => c.id === selectedPedidoLiquida.cliente_id)?.razao_social || "Consumidor"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div>
                  <span className="text-gray-400 text-[9px] uppercase tracking-wider">Valor do Título:</span>
                  <span className="block font-black text-gray-900 text-sm">
                    R$ {(selectedPedidoLiquida.nf_valor_total || selectedPedidoLiquida.valor_total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-gray-450 text-[9px] uppercase tracking-wider">Forma de Cobrança:</span>
                  <span className="block font-black text-indigo-700 text-sm">
                    {selectedPedidoLiquida.forma_pagamento_nf || "Boleto"}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-gray-450 text-[10px] font-bold block uppercase tracking-wider mb-1.5">
                  Data de Recebimento Real
                </label>
                <input
                  type="date"
                  value={recvDate}
                  onChange={(e) => setRecvDate(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-gray-105 rounded-xl px-4 py-2 font-bold text-gray-700 outline-none hover:border-gray-200 transition-all text-sm"
                />
              </div>

              <div>
                <label className="text-gray-450 text-[10px] font-bold block uppercase tracking-wider mb-1">
                  Juros ou Multa Cobrada / Recebida (Opcional - R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="R$ 0,00"
                  value={recvInterest || ""}
                  onChange={(e) => setRecvInterest(Number(e.target.value) || 0)}
                  className="w-full bg-gray-50 border-2 border-gray-105 rounded-xl px-4 py-2 font-bold text-gray-750 outline-none hover:border-gray-200 transition-all text-sm"
                />
                <p className="text-[10px] text-gray-400 mt-1">Insira custos adicionais cobrados caso o cliente tenha pago com atraso.</p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleConfirmLiquidation}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider py-2.5 rounded-xl transition-all shadow-md"
                >
                  Registrar Liquidação
                </button>
                <button
                  onClick={() => setSelectedPedidoLiquida(null)}
                  className="bg-gray-150 text-gray-650 hover:bg-gray-250 font-black text-xs uppercase py-2.5 px-4 rounded-xl transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AReceber;
