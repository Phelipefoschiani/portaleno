import React, { useState } from "react";
import { useGlobalState } from "../GlobalStateContext";
import { useAuth } from "../AuthContext";
import {
  Search,
  FileText,
  Calendar,
  CheckCircle,
  Clock,
  Truck,
  Filter,
  Download,
  Printer,
  X,
  CreditCard,
  Building2,
  Package,
  Receipt,
  Eye,
  CalendarDays,
  Coins,
  ArrowUpRight
} from "lucide-react";
import { Pedido } from "../types";

interface ControleNFsProps {
  empresa: string;
}

const ControleNFs: React.FC<ControleNFsProps> = ({ empresa }) => {
  const { pedidos, clientes, produtos, updatePedido, addDespesa } = useGlobalState();
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterFormaPagamento, setFilterFormaPagamento] = useState("TODOS");
  const [filterLogistica, setFilterLogistica] = useState("TODOS");

  // Selected NF for "lupa" modal
  const [selectedPedidoNf, setSelectedPedidoNf] = useState<Pedido | null>(null);
  const [isUpdatingDelivery, setIsUpdatingDelivery] = useState(false);
  const [tempDeliveryDate, setTempDeliveryDate] = useState("");

  // Advancement form state variables
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [advDate, setAdvDate] = useState("");
  const [advReceivedAmount, setAdvReceivedAmount] = useState<number | "">("");

  // Get only Faturado orders representing a Nota Fiscal (contains faturamento or status === "Faturado")
  const nfs = pedidos.filter(
    (p) => p.status === "Faturado" || p.nf_numero
  );

  // Filters
  const filteredNfs = nfs.filter((p) => {
    const cli = clientes.find((c) => c.id === p.cliente_id);
    const cliName = cli?.razao_social || "Consumidor";
    const cliFantasia = cli?.nome_fantasia || "N/A";
    const nfNumStr = p.nf_numero || "";
    const idStr = p.id.split("_")[1] || p.id;

    const matchesSearch =
      cliName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliFantasia.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nfNumStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      idStr.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFormaPag =
      filterFormaPagamento === "TODOS" ||
      (p.forma_pagamento_nf?.toUpperCase() === filterFormaPagamento.toUpperCase());

    const deliveryStatus = p.data_entrega ? "ENTREGUE" : "PENDENTE";
    const matchesLogistica =
      filterLogistica === "TODOS" || deliveryStatus === filterLogistica;

    return matchesSearch && matchesFormaPag && matchesLogistica;
  });

  // Calculate Metrics
  const totalValue = filteredNfs.reduce(
    (acc, val) => acc + (val.nf_valor_total || val.valor_total || 0),
    0
  );
  
  const totalInvoices = filteredNfs.length;
  
  const totalDelivered = filteredNfs.filter((p) => p.data_entrega).length;
  const totalPendingDelivery = totalInvoices - totalDelivered;

  // Pie chart indicators count
  const distributionPayments = filteredNfs.reduce((acc: Record<string, number>, curr) => {
    const method = curr.forma_pagamento_nf || "Não informado";
    acc[method] = (acc[method] || 0) + 1;
    return acc;
  }, {});

  const handleOpenLupa = (ped: Pedido) => {
    setSelectedPedidoNf(ped);
    setTempDeliveryDate(ped.data_entrega || new Date().toISOString().split("T")[0]);
    setIsUpdatingDelivery(false);
    setIsAdvancing(false);
    setAdvDate(new Date().toISOString().split("T")[0]);
    const maxVal = ped.nf_valor_total || ped.valor_total || 0;
    setAdvReceivedAmount(Math.round(maxVal * 0.95 * 100) / 100);
  };

  const handleConfirmAdvancement = () => {
    if (!selectedPedidoNf || !advDate || advReceivedAmount === "") return;
    
    const maxVal = selectedPedidoNf.nf_valor_total || selectedPedidoNf.valor_total || 0;
    const receivedAmountNum = Number(advReceivedAmount);
    
    if (receivedAmountNum >= maxVal) {
      alert("O valor recebido no adiantamento deve ser menor do que o valor total da nota!");
      return;
    }
    
    const jurosValue = maxVal - receivedAmountNum;
    const cli = clientes.find((c) => c.id === selectedPedidoNf.cliente_id);
    const cliName = cli?.razao_social || "Consumidor Final";

    // Update locally selected object so UI updates immediately
    const updatedPedido: Pedido = {
      ...selectedPedidoNf,
      adiantado: true,
      data_adiantamento: advDate,
      valor_adiantado_recebido: receivedAmountNum,
      juros_adiantamento: jurosValue
    };
    
    // 1. Update in State Provider
    updatePedido(selectedPedidoNf.id, {
      adiantado: true,
      data_adiantamento: advDate,
      valor_adiantado_recebido: receivedAmountNum,
      juros_adiantamento: jurosValue
    });

    // 2. Add Interest Expense to Despesas
    addDespesa({
      usuario_id: user?.id || "1",
      tipo: "Empresa",
      categoria: "Juros / Adiantamento",
      data: advDate,
      vencimento: advDate,
      valor: jurosValue,
      forma_pagamento: "Pix",
      recorrente: false,
      parcelas: 1,
      parcela_atual: 1,
      status: "Pago",
      descricao: `Juros cobrados pelo adiantamento da NF-${selectedPedidoNf.nf_numero || "S/N"} (${cliName})`,
      tipo_despesa: "variavel",
      data_pagamento: advDate
    });

    setSelectedPedidoNf(updatedPedido);
    setIsAdvancing(false);
    alert("Adiantamento da Nota Fiscal de R$ " + maxVal.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) + " registrado com sucesso! O valor de custo/juros foi enviado para Despesas.");
  };

  const handleSaveDeliveryDate = () => {
    if (!selectedPedidoNf) return;
    
    updatePedido(selectedPedidoNf.id, {
      data_entrega: tempDeliveryDate || undefined,
    });

    // Update locally selected object
    setSelectedPedidoNf({
      ...selectedPedidoNf,
      data_entrega: tempDeliveryDate || undefined,
    });
    
    setIsUpdatingDelivery(false);
  };

  const handleDownloadDANFE = (ped: Pedido) => {
    if (ped.nf_anexo) {
      const filename = `DANFE_NF_${ped.nf_numero || "Faturado_SemNumero"}_Pedido_${ped.id.substring(0,6)}.pdf`;
      const link = document.createElement("a");
      link.href = ped.nf_anexo;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert("Comprovante/DANFE simulado. Imprima a Nota Fiscal diretamente pelo painel de impressão.");
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="bg-white rounded-[32px] p-6 lg:p-8 border border-gray-100 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#ef4444] bg-red-50 px-2.5 py-1 rounded-full">
            Painel Central de Faturamento
          </span>
          <h2 className="text-2xl font-black text-gray-900 mt-2">
            Controle Geral de Notas Fiscais
          </h2>
          <p className="text-gray-500 font-medium text-xs mt-1">
            Gestão, rastreabilidade e monitoração de impostos e prazos de liquidação das notas expedidas.
          </p>
        </div>
      </div>

      {/* KPI DASH CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* KPI 1 */}
        <div className="bg-white p-5 rounded-[24px] border border-gray-100 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-red-50 text-[#ef4444] rounded-2xl">
            <Receipt size={20} />
          </div>
          <div>
            <span className="text-gray-450 text-[10px] font-bold uppercase tracking-wider block">Notas Emitidas</span>
            <span className="text-xl font-black text-gray-900 mt-0.5 block">{totalInvoices} unidades</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white p-5 rounded-[24px] border border-gray-100 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <Truck size={20} />
          </div>
          <div>
            <span className="text-gray-450 text-[10px] font-bold uppercase tracking-wider block">Entregas Efetuadas</span>
            <span className="text-xl font-black text-emerald-700 mt-0.5 block">{totalDelivered} Notas</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white p-5 rounded-[24px] border border-gray-100 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <Clock size={20} />
          </div>
          <div>
            <span className="text-gray-450 text-[10px] font-bold uppercase tracking-wider block">Entregas Pendentes</span>
            <span className="text-xl font-black text-amber-700 mt-0.5 block">{totalPendingDelivery} cargas</span>
          </div>
        </div>
      </div>

      {/* FILTER CONTROLS BAR */}
      <div className="bg-white p-4 rounded-[24px] border border-gray-100 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:max-w-sm">
          <Search size={16} className="absolute left-4 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por cliente, NF ou Nº de pedido..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-11 pr-4 py-2 text-sm font-semibold outline-none focus:border-red-500 transition-all text-gray-950 placeholder-gray-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-extrabold uppercase">
            <Filter size={14} /> Filtrar por:
          </div>

          <select
            value={filterFormaPagamento}
            onChange={(e) => setFilterFormaPagamento(e.target.value)}
            className="bg-gray-50 border border-gray-200 py-2 px-3 rounded-xl text-xs font-bold text-gray-700 outline-none hover:bg-gray-100 cursor-pointer"
          >
            <option value="TODOS">Forma Pagamento (Todas)</option>
            <option value="Dinheiro">Dinheiro</option>
            <option value="Pix">Pix</option>
            <option value="Boleto">Boleto</option>
            <option value="Bonificação">Bonificação</option>
          </select>

          <select
            value={filterLogistica}
            onChange={(e) => setFilterLogistica(e.target.value)}
            className="bg-gray-50 border border-gray-200 py-2 px-3 rounded-xl text-xs font-bold text-gray-700 outline-none hover:bg-gray-100 cursor-pointer"
          >
            <option value="TODOS">Logística (Todas)</option>
            <option value="ENTREGUE">Entregue / Conclído</option>
            <option value="PENDENTE">Pendente de Entrega</option>
          </select>
        </div>
      </div>

      {/* MAIN INVOICE LIST TABLE */}
      <div className="bg-white rounded-[28px] border border-gray-100 shadow-xs overflow-hidden">
        {filteredNfs.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-450 mx-auto mb-3">
              <FileText size={24} />
            </div>
            <h4 className="text-sm font-black text-gray-900">Nenhuma Nota Fiscal Encontrada</h4>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              Realize o faturamento de pedidos no painel de Orçamentos e Pedidos para registrar novas Notas Fiscais.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                  <th className="p-4 w-28">Número NF</th>
                  <th className="p-4">Cliente</th>
                  <th className="p-4">Faturamento</th>
                  <th className="p-4">Cobrança (Vencimento)</th>
                  <th className="p-4">Logística / Entrega</th>
                  <th className="p-4 text-right">Valor Líquido</th>
                  <th className="p-4 text-center w-20">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700 font-bold">
                {filteredNfs.map((item) => {
                  const cli = clientes.find((c) => c.id === item.cliente_id);
                  const cliName = cli?.razao_social || "Consumidor Final";
                  const totalVal = item.nf_valor_total || item.valor_total;
                  
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      {/* NF Series label */}
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-mono text-xs font-black text-gray-900 uppercase">
                            {item.nf_numero ? `NF-${item.nf_numero}` : "SEM NOTA"}
                          </span>
                          <span className="text-[9px] text-[#ef4444] font-black tracking-widest mt-0.5">
                            SÉRIE 1
                          </span>
                        </div>
                      </td>

                      {/* Client info */}
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

                      {/* Faturamento issue date */}
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-gray-900">
                          <Calendar size={13} className="text-gray-400" />
                          <span>
                            {item.data_faturamento
                              ? new Date(item.data_faturamento + "T12:00:00").toLocaleDateString("pt-BR")
                              : item.nf_data_emissao
                              ? new Date(item.nf_data_emissao + "T12:00:00").toLocaleDateString("pt-BR")
                              : "---"}
                          </span>
                        </div>
                      </td>

                      {/* Cobranca detail */}
                      <td className="p-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1">
                            <span className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-black uppercase bg-slate-100 text-slate-800 rounded">
                              {item.forma_pagamento_nf || "Não def."}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-400 font-semibold mt-1">
                            Pgto:{" "}
                            {item.data_pagamento_nf
                              ? new Date(item.data_pagamento_nf + "T12:00:00").toLocaleDateString("pt-BR")
                              : "À Vista"}
                          </span>
                        </div>
                      </td>

                      {/* Delivery parameter */}
                      <td className="p-4">
                        {item.data_entrega ? (
                          <div className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full px-2 py-0.5">
                            <CheckCircle size={10} />
                            <span>Entregue ({new Date(item.data_entrega + "T12:00:00").toLocaleDateString("pt-BR")})</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5">
                            <Clock size={10} />
                            <span>Em Transporte</span>
                          </div>
                        )}
                      </td>

                      {/* Value column */}
                      <td className="p-4 text-right">
                        <span className="font-mono text-[13px] font-black text-gray-950">
                          R$ {totalVal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleOpenLupa(item)}
                          className="p-2 text-[#ef4444] hover:bg-red-50 rounded-lg transition-colors inline-flex items-center justify-center"
                          title="Visualizar Nota na Lupa"
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAIL LUPA MODAL */}
      {selectedPedidoNf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-[32px] shadow-2xl p-6 w-full max-w-4xl max-h-[92vh] overflow-y-auto scale-in relative">
            <div className="flex justify-between items-start mb-4 border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#ef4444] bg-red-50 px-2.5 py-1 rounded-full">
                  Ficha Auxiliar de Nota Fiscal
                </span>
                <h3 className="text-xl font-black text-gray-900 mt-2">
                  Espelho da NF-e Comercial
                </h3>
              </div>
              <button
                onClick={() => setSelectedPedidoNf(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                title="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            {/* TWO COLUMN GRID : 1. THE ACTUAL DANFE / 2. EXPEDITION & PAYMENT LOGS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* DANFE DISPLAY COL (SPAN 2) */}
              <div className="lg:col-span-2 space-y-4 border border-gray-200 rounded-[20px] p-4 bg-gray-50/20 max-h-[60vh] overflow-y-auto custom-scrollbar">
                
                {/* DANFE HEADER */}
                <div className="border border-black p-2 bg-white flex justify-between items-center text-xs">
                  <div className="text-left font-semibold max-w-[280px]">
                    <p className="font-sans font-black text-[10px]">RECEBEMOS DA ESTÂNCIA NOVA OLINDA OS PRODUTOS/SERVIÇOS CONSTANTES DA NOTA FISCAL INDICADA AO LADO</p>
                    <p className="mt-1 text-[7px] text-gray-500 font-medium">DATA DE RECEBIMENTO: _____/_____/_________  |  ASSINATURA E IDENTIFICAÇÃO DO RECEBEDOR: ___________________________</p>
                  </div>
                  <div className="text-center border-l border-black pl-3 min-w-[100px]">
                    <p className="text-[8px] font-black">NF-e</p>
                    <p className="text-[11px] font-black text-gray-900 mt-0.5">Nº {selectedPedidoNf.nf_numero || "56123"}</p>
                    <p className="text-[6px] text-gray-500 font-bold uppercase tracking-wider">SÉRIE 1</p>
                  </div>
                </div>

                {/* EMITENTE AND LOGO DETAILS */}
                <div className="border border-black p-3 bg-white grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="text-left space-y-1">
                    <div className="flex items-center gap-1">
                      <Building2 size={13} className="text-gray-400" />
                      <span className="text-[9px] font-black text-red-600">EMITENTE</span>
                    </div>
                    <p className="font-sans font-black text-[11px] text-gray-900">ESTÂNCIA NOVA OLINDA</p>
                    <p className="text-[9px] text-gray-600 font-semibold">GRUPO ENO LTDA</p>
                    <p className="text-[9px] text-gray-500 font-bold">CNPJ: 12.345.678/0001-90</p>
                  </div>
                  <div className="text-left space-y-1 sm:border-l sm:pl-4 border-black/10">
                    <span className="text-[8px] font-black text-gray-400 tracking-wider block">CHAVE DE ACESSO</span>
                    <p className="font-mono text-[9px] text-gray-900 break-all select-all font-bold">
                      {selectedPedidoNf.nf_chave || "35260512345678000190550010000" + (selectedPedidoNf.nf_numero || "56123") + "100293841029"}
                    </p>
                  </div>
                </div>

                {/* DESTINATARIO */}
                <div className="border border-black p-3 bg-white text-xs">
                  <span className="text-[8px] font-black text-red-600 tracking-wider block mb-1 text-left">DESTINATÁRIO / INDICAÇÃO DE FATURA</span>
                  {(() => {
                    const cli = clientes.find((c) => c.id === selectedPedidoNf.cliente_id);
                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                        <div className="text-left space-y-0.5">
                          <p className="font-sans font-black text-gray-900">{cli?.razao_social || "Consumidor Final"}</p>
                          <p className="text-[9px] text-gray-500">CNPJ: {cli?.cnpj_cpf || "---"}</p>
                          <p className="text-[9px] text-gray-500">IE: {cli?.inscricao_estadual || "Isento"}</p>
                        </div>
                        <div className="text-left space-y-0.5 sm:border-l sm:pl-3 border-black/10">
                          <p className="text-[9px] font-bold">Endereço: {cli?.endereco || "---"}</p>
                          <p className="text-[9px] text-gray-500">Bairro/Cidade: {cli?.bairro || "---"}, {cli?.cidade || "---"} - {cli?.estado || "SP"}</p>
                          <p className="text-[9px] text-gray-500">CEP: {cli?.cep || "---"}</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* VALORES E TRIBUTOS */}
                <div className="border border-black p-3 bg-white text-xs">
                  <span className="text-[8px] font-black text-indigo-750 tracking-wider block mb-2 text-left">TRIBUTOS E CÁLCULS MUTUOS DE PARIDADE</span>
                  {(() => {
                    const totalVal = selectedPedidoNf.nf_valor_total || selectedPedidoNf.valor_total;
                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-left font-bold">
                        <div>
                          <span className="text-[8px] text-gray-400 uppercase tracking-widest block">BASE DE CÁLCULO</span>
                          <span className="text-gray-900 text-xs font-mono">R$ {(totalVal * 0.18).toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-[8px] text-gray-400 uppercase tracking-widest block">VALOR ICMS</span>
                          <span className="text-gray-900 text-xs font-mono">R$ {(totalVal * 0.05).toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-[8px] text-gray-400 uppercase tracking-widest block">BASE ICMS SUBST.</span>
                          <span className="text-gray-900 text-xs font-mono">R$ 0,00</span>
                        </div>
                        <div>
                          <span className="text-[8px] text-[#ef4444] uppercase tracking-widest block">TOTAL DA NOTA</span>
                          <span className="text-emerald-700 text-xs font-black font-mono">R$ {totalVal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* ITENS DETALHADOS DA NOTA */}
                <div className="border border-black overflow-hidden bg-white text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-b border-black text-[8px] font-black text-gray-500 uppercase tracking-wider">
                        <th className="p-2 text-left">CÓDIGO</th>
                        <th className="p-2 text-left">DESCRIÇÃO DOS PRODUTOS</th>
                        <th className="p-2 text-center">UND</th>
                        <th className="p-2 text-center">QTDE</th>
                        <th className="p-2 text-right">VL. UNIT</th>
                        <th className="p-2 text-right">VL. TOTAL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/10 font-bold text-[10px] text-gray-800">
                      {selectedPedidoNf.items.map((it, idx) => {
                        const prod = produtos.find((p) => p.id === it.produto_id);
                        return (
                          <tr key={idx} className="hover:bg-gray-50/50">
                            <td className="p-2 font-mono text-[9px] text-gray-500">{prod?.codigo || prod?.id.substring(0, 5).toUpperCase()}</td>
                            <td className="p-2 font-black text-gray-900">{prod?.nome || "Mandioca de Mesa"}</td>
                            <td className="p-2 text-center uppercase">{prod?.unidade || "Kg"}</td>
                            <td className="p-2 text-center">{it.quantidade}</td>
                            <td className="p-2 text-right font-mono">R$ {it.preco.toFixed(2)}</td>
                            <td className="p-2 text-right font-mono font-black text-gray-900">R$ {(it.quantidade * it.preco).toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

              </div>

              {/* DETAILS LOGISTICS PANEL (SPAN 1) */}
              <div className="bg-gray-50 rounded-[20px] p-5 space-y-4 text-xs font-bold text-gray-700 flex flex-col justify-between">
                
                <div className="space-y-4">
                  <span className="text-[9px] font-black text-slate-800 uppercase tracking-wider block -mb-1">
                    Gestão Financeira & Logística
                  </span>

                  {/* FINANCE SEGMENT */}
                  <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-xs space-y-2.5">
                    <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase text-indigo-750">
                      <Coins size={10} /> Liquidação da Parcela
                    </span>
                    
                    <div className="grid grid-cols-2 gap-2 text-left">
                      <div>
                        <span className="text-gray-400 text-[8px] uppercase tracking-wider block">Forma Pgto</span>
                        <span className="text-gray-900 font-black text-xs block mt-0.5">
                          {selectedPedidoNf.forma_pagamento_nf || "Pix"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 text-[8px] uppercase tracking-wider block">Previsão</span>
                        <span className="text-gray-905 font-black text-xs block mt-0.5">
                          {selectedPedidoNf.data_pagamento_nf
                            ? new Date(selectedPedidoNf.data_pagamento_nf + "T12:00:00").toLocaleDateString("pt-BR")
                            : "À Vista"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ADIANTAMENTO E RECEBIMENTO MODULE */}
                  <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-xs space-y-2.5 text-left">
                    <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase text-purple-750">
                      <ArrowUpRight size={10} /> Antecipações & Custos
                    </span>

                    {selectedPedidoNf.adiantado ? (
                      <div className="bg-purple-50/70 p-2.5 rounded-lg border border-purple-100 space-y-1 text-[11px] text-purple-950 font-semibold">
                        <span className="text-[8px] uppercase tracking-wider block font-bold text-purple-500 font-sans">Nota Fiscal Adiantada</span>
                        <p>Data do Adiantamento: <span className="font-mono font-bold text-gray-950">{selectedPedidoNf.data_adiantamento ? new Date(selectedPedidoNf.data_adiantamento + "T12:00:00").toLocaleDateString("pt-BR") : "---"}</span></p>
                        <p>Valor Líquido Recebido: <span className="font-mono font-bold text-emerald-700">R$ {selectedPedidoNf.valor_adiantado_recebido?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span></p>
                        <p>Desconto/Juros Aplicados: <span className="font-mono font-bold text-red-650">R$ {selectedPedidoNf.juros_adiantamento?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span></p>
                      </div>
                    ) : selectedPedidoNf.recebido ? (
                      <div className="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-100 space-y-1 text-[11px] text-emerald-950 font-semibold">
                        <span className="text-[8px] uppercase tracking-wider block font-bold text-emerald-600 font-sans">Recebimento Padrão Liquidado</span>
                        <p>Liquidado em: <span className="font-mono font-bold text-gray-950">{selectedPedidoNf.data_recebimento ? new Date(selectedPedidoNf.data_recebimento + "T12:00:00").toLocaleDateString("pt-BR") : "---"}</span></p>
                        {selectedPedidoNf.juros_recebido ? (
                          <p>Acréscimo de Juros Recebido: <span className="font-mono font-bold text-emerald-100 border border-emerald-250 bg-emerald-600 px-1 py-0.5 rounded text-white text-[10px]">R$ {selectedPedidoNf.juros_recebido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span></p>
                        ) : (
                          <p className="text-[10px] text-gray-400 font-medium font-sans">Recebimento integral sem juros de atraso.</p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {!isAdvancing ? (
                          <button
                            onClick={() => setIsAdvancing(true)}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black text-[10px] uppercase py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <ArrowUpRight size={12} />
                            Adiantar esta NF
                          </button>
                        ) : (
                          <div className="border border-purple-200 bg-purple-50/30 p-2.5 rounded-xl space-y-3 animate-fadeIn text-[11px]">
                            <span className="text-[8px] uppercase tracking-wider block font-bold text-purple-650">Formulário de Adiantamento</span>
                            
                            <div className="space-y-1.5">
                              <label className="text-gray-400 text-[8px] uppercase block tracking-wider">Data do Adiantamento</label>
                              <input
                                type="date"
                                value={advDate}
                                onChange={(e) => setAdvDate(e.target.value)}
                                className="w-full bg-white border border-gray-250 rounded px-2 py-1 text-xs outline-none"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-gray-400 text-[8px] uppercase block tracking-wider">Valor Recebido Adiantado (R$)</label>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="R$ 0,00"
                                value={advReceivedAmount}
                                onChange={(e) => setAdvReceivedAmount(e.target.value === "" ? "" : Number(e.target.value))}
                                className="w-full bg-white border border-gray-250 rounded px-2 py-1 text-xs outline-none text-gray-800 font-bold"
                              />
                            </div>

                            {(() => {
                              const totalNf = selectedPedidoNf.nf_valor_total || selectedPedidoNf.valor_total || 0;
                              const diff = totalNf - (Number(advReceivedAmount) || 0);
                              return (
                                <div className="bg-white p-1.5 rounded border border-purple-100 flex justify-between text-[10px] font-bold">
                                  <span className="text-gray-400 font-semibold">Custo/Juros Retidos:</span>
                                  <span className="font-mono font-black text-red-650">
                                    {diff > 0 ? `R$ ${diff.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "R$ 0,00"}
                                  </span>
                                </div>
                              );
                            })()}

                            <div className="flex gap-1.5">
                              <button
                                onClick={handleConfirmAdvancement}
                                className="flex-1 bg-purple-600 hover:bg-purple-750 text-white text-[9px] uppercase tracking-wider py-1 rounded font-black transition-all"
                              >
                                Gravar
                              </button>
                              <button
                                onClick={() => setIsAdvancing(false)}
                                className="bg-gray-200 text-gray-700 hover:bg-gray-300 text-[9px] uppercase px-2 py-1 rounded transition-all"
                              >
                                Voltar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* LOGISTICA DATAS SEGMENT */}
                  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs space-y-3 text-left">
                    <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase text-[#ef4444]">
                      <Truck size={10} /> Rastreabilidade da Carga
                    </span>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                        <span className="text-gray-400 text-[9px] uppercase tracking-wider">Faturado em:</span>
                        <span className="text-gray-800 font-extrabold text-xs">
                          {selectedPedidoNf.data_faturamento
                            ? new Date(selectedPedidoNf.data_faturamento + "T12:00:00").toLocaleDateString("pt-BR")
                            : "---"}
                        </span>
                      </div>

                      <div className="bg-gray-50 p-2.5 rounded-lg space-y-1">
                        <span className="text-gray-400 text-[9px] uppercase block tracking-wider">Data de Entrega Final:</span>
                        {isUpdatingDelivery ? (
                          <div className="space-y-2 pt-1 animate-fadeIn">
                            <input
                              type="date"
                              value={tempDeliveryDate}
                              onChange={(e) => setTempDeliveryDate(e.target.value)}
                              className="w-full bg-white border border-gray-300 rounded-[10px] px-2 py-1.5 text-xs text-gray-900 outline-none"
                            />
                            <div className="flex gap-1">
                              <button
                                onClick={handleSaveDeliveryDate}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] uppercase px-2 py-1 rounded"
                              >
                                Gravar
                              </button>
                              <button
                                onClick={() => setIsUpdatingDelivery(false)}
                                className="bg-gray-200 text-gray-600 text-[9px] uppercase px-2 py-1 rounded"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-between items-center mt-1">
                            {selectedPedidoNf.data_entrega ? (
                              <span className="text-emerald-700 font-black text-xs">
                                {new Date(selectedPedidoNf.data_entrega + "T12:00:00").toLocaleDateString("pt-BR")}
                              </span>
                            ) : (
                              <span className="text-amber-700 font-black text-xs">Pendente</span>
                            )}
                            <button
                              onClick={() => {
                                setIsUpdatingDelivery(true);
                              }}
                              className="text-[9px] uppercase tracking-wider text-primary border border-primary/20 hover:bg-primary/5 px-2 py-1 rounded-md"
                            >
                              Alterar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-4">
                  {selectedPedidoNf.nf_anexo && (
                    <button
                      onClick={() => handleDownloadDANFE(selectedPedidoNf)}
                      className="w-full bg-emerald-650 hover:bg-emerald-750 text-white py-2.5 rounded-xl font-bold uppercase tracking-wider text-[10px] flex items-center justify-center gap-1 shadow-sm transition-all"
                    >
                      <Download size={12} /> Download PDF Original
                    </button>
                  )}
                  <button
                    onClick={() => {
                      window.print();
                    }}
                    className="w-full bg-slate-900 hover:bg-slate-950 text-white py-2.5 rounded-xl font-bold uppercase tracking-wider text-[10px] flex items-center justify-center gap-1 shadow-sm transition-all"
                  >
                    <Printer size={12} /> Imprimir DANFE Espelho
                  </button>
                  <button
                    onClick={() => setSelectedPedidoNf(null)}
                    className="w-full bg-gray-200 hover:bg-gray-300 text-gray-500 py-2.5 rounded-xl font-bold uppercase tracking-wider text-[10px] transition-all"
                  >
                    Voltar para Listagem
                  </button>
                </div>

              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ControleNFs;
