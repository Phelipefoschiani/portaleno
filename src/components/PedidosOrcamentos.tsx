import React, { useState, useMemo } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useGlobalState } from "../GlobalStateContext";
import { Pedido, Orcamento, ItemPedido } from "../types";
import {
  FileText,
  Plus,
  Search,
  Edit,
  Trash2,
  CheckCircle,
  Package,
  FileInput,
  User as UserIcon,
  X,
  DollarSign,
  Printer,
  FileOutput,
  Calculator,
  Eye,
  Play,
  AlertTriangle,
  Download,
} from "lucide-react";
import { useAuth } from "../AuthContext";

const PedidosOrcamentos: React.FC<{ empresa?: string }> = ({ empresa }) => {
  const {
    pedidos,
    orcamentos,
    clientes,
    produtos,
    usuarios,
    addPedido,
    updatePedido,
    deletePedido,
    addOrcamento,
    updateOrcamento,
    deleteOrcamento,
    addDespesa,
  } = useGlobalState();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [viewFilter, setViewFilter] = useState<
    "Todos" | "Orcamentos" | "Pedidos" | "Prontos"
  >("Todos");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"Novo" | "Visualizar Orcamento" | "Visualizar Pedido">(
    "Novo",
  );
  const [selectedItem, setSelectedItem] = useState<Orcamento | Pedido | null>(
    null,
  );

  // NF Visualizer Modal State
  const [isNfModalOpen, setIsNfModalOpen] = useState(false);
  const [selectedNfPedido, setSelectedNfPedido] = useState<Pedido | null>(null);

  // Form State for "Novo"
  const [formData, setFormData] = useState({
    cliente_id: "",
    representante_id: "",
    items: [] as ItemPedido[],
    prazo_entrega: "15 dias",
    previsao_entrega: "",
    observacoes: "",
    condicao_pagamento: "A Combinar",
  });

  const [newItem, setNewItem] = useState({
    produto_id: "",
    quantidade: 1,
    preco: 0,
    tipo: "venda" as "venda" | "bonificacao",
    desconto: 0,
  });

  // Custom NF number state for confirmation dialog
  const [inputNfNumero, setInputNfNumero] = useState("");
  const [inputChaveAcesso, setInputChaveAcesso] = useState("");
  const [inputValorTotal, setInputValorTotal] = useState<number | null>(null);
  const [inputDataEmissao, setInputDataEmissao] = useState("");
  const [inputFormaPagamentoNf, setInputFormaPagamentoNf] = useState("Pix");
  const [inputDataPagamentoNf, setInputDataPagamentoNf] = useState("");
  const [uploadedNfBase64, setUploadedNfBase64] = useState("");
  const [isAnalyzingNf, setIsAnalyzingNf] = useState(false);
  const [nfAnalysisError, setNfAnalysisError] = useState<string | null>(null);
  const [extractedNfData, setExtractedNfData] = useState<any | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingFileBase64, setPendingFileBase64] = useState<string>("");
  const [nfModalTab, setNfModalTab] = useState<"Anexo" | "Espelho">("Anexo");
  const [isNfImageZoomed, setIsNfImageZoomed] = useState(false);

  const handleDownloadPdf = () => {
    if (!selectedNfPedido || !selectedNfPedido.nf_anexo) return;
    const base64Data = selectedNfPedido.nf_anexo;
    const filename = `NotaFiscal_Pedido_${selectedNfPedido.id.split("_")[1] || selectedNfPedido.id.substring(0, 6)}_NF_${selectedNfPedido.nf_numero || "XML"}.pdf`;

    const link = document.createElement("a");
    link.href = base64Data;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetForm = () => {
    setFormData({ 
      cliente_id: "", 
      representante_id: "", 
      items: [],
      prazo_entrega: "15 dias",
      previsao_entrega: "",
      observacoes: "",
      condicao_pagamento: "A Combinar"
    });
    setNewItem({
      produto_id: "",
      quantidade: 1,
      preco: 0,
      tipo: "venda",
      desconto: 0,
    });
    setSelectedItem(null);
  };

  const handleOpenNovo = () => {
    resetForm();
    setModalType("Novo");
    setIsModalOpen(true);
  };

  const handleOpenVisualizarOrcamento = (o: Orcamento) => {
    setSelectedItem(o);
    setModalType("Visualizar Orcamento");
    setIsModalOpen(true);
  };

  const handleOpenVisualizarPedido = (p: Pedido) => {
    setSelectedItem(p);
    setModalType("Visualizar Pedido");
    setIsModalOpen(true);
  };

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleDownloadPDF = async (mode: string, filenamePrefix: string) => {
    if (!selectedItem) return;

    setIsGeneratingPDF(true);
    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const cliente = clientes.find((c) => c.id === selectedItem.cliente_id);
      const vendedor = usuarios.find((u) => u.id === selectedItem.representante_id);

      // Header Banner
      pdf.setFillColor(27, 67, 50);
      pdf.rect(0, 0, 210, 35, 'F');

      const isPedido = mode === "Pedido" || mode === "NFe";

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(22);
      pdf.setTextColor(255, 255, 255);
      pdf.text("ESTÂNCIA NOVA OLINDA", 105, 18, { align: "center" });

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(200, 220, 210);
      const subtitle = filenamePrefix === "Orcamento" ? "ORÇAMENTO DE VENDA" : "CONFIRMAÇÃO DE PEDIDO DE VENDA";
      pdf.text(subtitle, 105, 26, { align: "center" });

      // Info Summary
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(40, 40, 40);
      
      pdf.text(`Número: #${selectedItem.id.split("_")[1] || selectedItem.id.substring(0, 8)}`, 14, 45);
      pdf.text(`Data: ${new Date(selectedItem.data).toLocaleDateString("pt-BR")}`, 14, 52);

      // Section 1: Cliente
      pdf.setFillColor(245, 247, 246);
      pdf.rect(14, 60, 182, 8, 'F');
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(27, 67, 50);
      pdf.text("DADOS DO CLIENTE", 16, 66);

      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(30, 30, 30);
      pdf.text(`Razão Social:`, 16, 75);
      pdf.setFont("helvetica", "normal");
      pdf.text(`${cliente?.razao_social || "Não Informado"}`, 42, 75);

      pdf.setFont("helvetica", "bold");
      pdf.text(`CNPJ/CPF:`, 16, 81);
      pdf.setFont("helvetica", "normal");
      pdf.text(`${cliente?.cnpj_cpf || "Não Informado"}`, 36, 81);

      pdf.setFont("helvetica", "bold");
      pdf.text(`Endereço:`, 16, 87);
      pdf.setFont("helvetica", "normal");
      pdf.text(`${cliente?.endereco || ""} - ${cliente?.cidade || ""} / ${cliente?.estado || ""}`, 34, 87);

      // Section 2: Logística e Pagamento
      pdf.setFillColor(245, 247, 246);
      pdf.rect(14, 97, 182, 8, 'F');
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(27, 67, 50);
      pdf.text("LOGÍSTICA E PAGAMENTO", 16, 103);

      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(30, 30, 30);
      pdf.text(`Pagamento:`, 16, 112);
      pdf.setFont("helvetica", "normal");
      pdf.text(`${selectedItem.condicao_pagamento || "A Combinar"}`, 39, 112);

      pdf.setFont("helvetica", "bold");
      pdf.text(`Prazo Entrega:`, 16, 118);
      pdf.setFont("helvetica", "normal");
      pdf.text(`${selectedItem.prazo_entrega || "A Combinar"}`, 43, 118);

      let yPos = 130;

      if (selectedItem.observacoes) {
        pdf.setFillColor(245, 247, 246);
        pdf.rect(14, yPos, 182, 8, 'F');
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        pdf.setTextColor(27, 67, 50);
        pdf.text("OBSERVAÇÕES", 16, yPos + 6);
        
        pdf.setFont("helvetica", "italic");
        pdf.setTextColor(60, 60, 60);
        pdf.setFontSize(9);
        const splitText = pdf.splitTextToSize(selectedItem.observacoes, 180);
        pdf.text(splitText, 16, yPos + 15);
        yPos += 18 + (splitText.length * 4);
      }

      // Preparar Itens da Tabela
      const tableData = selectedItem.items.map((it: any) => {
        const p = produtos.find((x) => x.id === it.produto_id);
        const precoEf = it.tipo === 'bonificacao' ? 0 : it.preco - (it.desconto || 0);
        const tipoLabel = it.tipo === 'bonificacao' ? " (Bonificação)" : "";
        return [
          (p?.nome || "Produto Desconhecido") + tipoLabel,
          it.quantidade.toString(),
          `R$ ${precoEf.toFixed(2)}`,
          `R$ ${(it.quantidade * precoEf).toFixed(2)}`
        ];
      });

      // Simple Table
      autoTable(pdf, {
        startY: yPos,
        head: [['Produto', 'Quantidade', 'Preço Unitário', 'Subtotal']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [27, 67, 50], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 4, textColor: [60,60,60] },
        alternateRowStyles: { fillColor: [245, 247, 246] },
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { cellWidth: 25, halign: 'center' },
          2: { cellWidth: 35, halign: 'right' },
          3: { cellWidth: 35, halign: 'right' }
        },
      });

      // @ts-ignore
      const finalY = pdf.lastAutoTable.finalY || yPos + 40;

      // Wrap up Totals
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.setTextColor(20, 20, 20);
      pdf.text(`VALOR TOTAL: R$ ${selectedItem.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 196, finalY + 10, { align: "right" });

      // Signatures
      if (isPedido) {
        let sigY = finalY + 40;
        if (sigY > 260) {
            pdf.addPage();
            sigY = 40;
        }
        
        pdf.setDrawColor(150, 150, 150);
        pdf.setLineWidth(0.5);
        pdf.line(20, sigY, 90, sigY);
        pdf.line(120, sigY, 190, sigY);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.text("Assinatura do Cliente", 55, sigY + 5, { align: "center" });
        pdf.setFont("helvetica", "bold");
        pdf.text(cliente?.razao_social || "", 55, sigY + 10, { align: "center" });

        pdf.setFont("helvetica", "normal");
        pdf.text("Autorização de Venda", 155, sigY + 5, { align: "center" });
        pdf.setFont("helvetica", "bold");
        pdf.text("Estância Nova Olinda", 155, sigY + 10, { align: "center" });
      }

      pdf.save(`${filenamePrefix}_${selectedItem?.id.substring(0, 8) || 'export'}.pdf`);
    } catch (error) {
      console.error("Erro ao gerar PDF", error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleSelectItemProduto = (produtoId: string) => {
    const prod = produtos.find((p) => p.id === produtoId);
    if (prod) {
      setNewItem((prev) => ({
        ...prev,
        produto_id: produtoId,
        preco: prod.preco_base || 0,
        desconto: 0,
        tipo: "venda",
      }));
    }
  };

  const handleAddItem = () => {
    if (!newItem.produto_id || newItem.quantidade <= 0) return;
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { ...newItem }],
    }));
    setNewItem({
      produto_id: "",
      quantidade: 1,
      preco: 0,
      tipo: "venda",
      desconto: 0,
    });
  };

  const handleRemoveItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  // Calculation for the Cart
  const cartSummary = useMemo(() => {
    let valor_total = 0;
    let custo_total = 0;
    let imposto_total = 0;
    let comissao_total = 0;
    let frete_total = 0;

    formData.items.forEach((item) => {
      const prod = produtos.find((p) => p.id === item.produto_id);
      if (prod) {
        // Price after discount if applicable
        const precoEfetivo =
          item.tipo === "bonificacao" ? 0 : item.preco - (item.desconto || 0);
        let itemValorTotal = precoEfetivo * item.quantidade;
        let itemCustoTotal = (prod.custo || 0) * item.quantidade;

        valor_total += itemValorTotal;
        custo_total += itemCustoTotal;

        if (prod.custos_detalhados) {
          prod.custos_detalhados.forEach((c) => {
            let val = 0;
            if (c.tipo === "Variavel")
              val = (itemValorTotal * (c.proporcao || 0)) / 100;
            else val = c.valor * item.quantidade;

            if (c.grupo === "Imposto") imposto_total += val;
            if (c.grupo === "Comissao") comissao_total += val;
            if (c.grupo === "Frete") frete_total += val;
          });
        }
      }
    });

    const lucro_total = valor_total - custo_total;

    return {
      valor_total,
      custo_total,
      imposto_total,
      comissao_total,
      frete_total,
      lucro_total,
    };
  }, [formData.items, produtos]);

  const [isConfirmOpen, setIsConfirmOpen] = useState<{
    isOpen: boolean;
    pedId?: string;
    type?: "Faturar" | "Alert";
    message?: string;
  }>({ isOpen: false });

  // intermediate expense popup state
  const [faturamentoExpenseStep, setFaturamentoExpenseStep] = useState<{
    isOpen: boolean;
    pedId?: string;
    comNota?: boolean;
    nfNumero?: string;
    nfChave?: string;
    nfValorTotal?: number;
    nfDataEmissao?: string;
    nfAnexo?: string;
    formaPagamentoNf?: string;
    dataPagamentoNf?: string;
  }>({ isOpen: false });

  const getExpensesForPedido = (ped: Pedido) => {
    let imposto_total = 0;
    let comissao_total = 0;
    let frete_total = 0;

    ped.items.forEach((item) => {
      const prod = produtos.find((p) => p.id === item.produto_id);
      if (prod) {
        const precoEfetivo =
          item.tipo === "bonificacao" ? 0 : item.preco - (item.desconto || 0);
        const itemValorTotal = precoEfetivo * item.quantidade;

        if (prod.custos_detalhados) {
          prod.custos_detalhados.forEach((c) => {
            let val = 0;
            if (c.tipo === "Variavel") {
              val = (itemValorTotal * (c.proporcao || 0)) / 100;
            } else {
              val = c.valor * item.quantidade;
            }

            if (c.grupo === "Imposto") imposto_total += val;
            if (c.grupo === "Comissao") comissao_total += val;
            if (c.grupo === "Frete") frete_total += val;
          });
        }
      }
    });

    return { imposto_total, comissao_total, frete_total };
  };

  const executeFinalFaturamento = (
    pedId: string,
    comNota: boolean,
    includeExpenses: boolean,
    completedNfNumero?: string,
    completedNfChave?: string,
    completedNfValorTotal?: number,
    completedNfDataEmissao?: string,
    completedNfAnexo?: string,
    completedFormaPagamento?: string,
    completedDataPagamento?: string
  ) => {
    const ped = pedidos.find((p) => p.id === pedId);
    if (!ped) return;

    const cli = clientes.find((c) => c.id === ped.cliente_id);
    const cliName = cli?.razao_social || "Consumidor";

    const updateData: any = {
      status: "Faturado",
      data_faturamento: new Date().toISOString().split("T")[0],
    };

    if (comNota) {
      updateData.nf_numero = completedNfNumero || inputNfNumero.trim() || undefined;
      updateData.nf_chave = completedNfChave || inputChaveAcesso || undefined;
      updateData.nf_valor_total = completedNfValorTotal !== undefined ? completedNfValorTotal : (inputValorTotal !== null ? inputValorTotal : undefined);
      updateData.nf_data_emissao = completedNfDataEmissao || inputDataEmissao || undefined;
      updateData.nf_anexo = completedNfAnexo || uploadedNfBase64 || "simulated_danfe";
      updateData.forma_pagamento_nf = completedFormaPagamento || inputFormaPagamentoNf || "Pix";
      updateData.data_pagamento_nf = completedDataPagamento || inputDataPagamentoNf || new Date().toISOString().split("T")[0];
    } else {
      updateData.nf_numero = undefined;
      updateData.nf_chave = undefined;
      updateData.nf_valor_total = undefined;
      updateData.nf_anexo = undefined;
      updateData.forma_pagamento_nf = undefined;
      updateData.data_pagamento_nf = undefined;
    }

    updatePedido(pedId, updateData);

    if (includeExpenses) {
      const costs = getExpensesForPedido(ped);
      const todayStr = new Date().toISOString().split("T")[0];

      if (costs.imposto_total > 0) {
        addDespesa({
          usuario_id: user?.id || "1",
          tipo: "Empresa",
          categoria: "Imposto",
          data: todayStr,
          vencimento: todayStr,
          valor: costs.imposto_total,
          forma_pagamento: "Boleto",
          recorrente: false,
          parcelas: 1,
          parcela_atual: 1,
          status: "Em aberto",
          descricao: `Imposto s/ Faturamento Pedido #${ped.id.split("_")[1] || ped.id.substring(0, 6)} - ${cliName}`,
          tipo_despesa: "variavel"
        });
      }

      if (costs.frete_total > 0) {
        addDespesa({
          usuario_id: user?.id || "1",
          tipo: "Empresa",
          categoria: "Frete",
          data: todayStr,
          vencimento: todayStr,
          valor: costs.frete_total,
          forma_pagamento: "Boleto",
          recorrente: false,
          parcelas: 1,
          parcela_atual: 1,
          status: "Em aberto",
          descricao: `Frete Pedido #${ped.id.split("_")[1] || ped.id.substring(0, 6)} - ${cliName}`,
          tipo_despesa: "variavel"
        });
      }

      if (costs.comissao_total > 0) {
        addDespesa({
          usuario_id: user?.id || "1",
          tipo: "Empresa",
          categoria: "Comissao",
          data: todayStr,
          vencimento: todayStr,
          valor: costs.comissao_total,
          forma_pagamento: "Pix",
          recorrente: false,
          parcelas: 1,
          parcela_atual: 1,
          status: "Em aberto",
          descricao: `Comissão Representante Pedido #${ped.id.split("_")[1] || ped.id.substring(0, 6)} - ${cliName}`,
          tipo_despesa: "variavel"
        });
      }
    }

    setIsConfirmOpen({ isOpen: false });
    setFaturamentoExpenseStep({ isOpen: false });
  };

  // Iniciar Produção Modal State
  const [isProduzirModalOpen, setIsProduzirModalOpen] = useState(false);
  const [produzirPedidoId, setProduzirPedidoId] = useState<string | null>(null);
  const [dataFabricacao, setDataFabricacao] = useState("");
  const [dataVencimento, setDataVencimento] = useState("");
  const [loteCodigo, setLoteCodigo] = useState("");

  const handleProduzirClick = (pedId: string) => {
    const today = new Date().toISOString().split("T")[0];
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + 60); // 60 days default shelf-life
    const expStr = expDate.toISOString().split("T")[0];

    const now = new Date();
    const datePart = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getFullYear()).substring(2)}`;
    const rndPart = Math.floor(100 + Math.random() * 900);
    const generatedLote = `LOT-${datePart}-${rndPart}`;

    setProduzirPedidoId(pedId);
    setDataFabricacao(today);
    setDataVencimento(expStr);
    setLoteCodigo(generatedLote);
    setIsProduzirModalOpen(true);
  };

  const handleConfirmProduzir = () => {
    if (!produzirPedidoId || !dataFabricacao || !dataVencimento || !loteCodigo.trim()) {
      return;
    }
    updatePedido(produzirPedidoId, {
      status: "Em produção",
      data_fabricacao: dataFabricacao,
      data_vencimento: dataVencimento,
      lote: loteCodigo.trim()
    });
    setIsProduzirModalOpen(false);
    setProduzirPedidoId(null);
  };

  const handleGerarOrcamento = () => {
    if (!formData.cliente_id || formData.items.length === 0)
      return setIsConfirmOpen({
        isOpen: true,
        type: "Alert",
        message: "Selecione cliente e adicione itens.",
      });
    addOrcamento({
      cliente_id: formData.cliente_id,
      representante_id: formData.representante_id,
      data: new Date().toISOString().split("T")[0],
      items: formData.items,
      valor_total: cartSummary.valor_total,
      status: "Orçamento",
      condicao_pagamento: formData.condicao_pagamento,
      prazo_entrega: formData.prazo_entrega,
      observacoes: formData.observacoes,
    });
    setIsModalOpen(false);
  };

  const handleGerarPedido = (fromOrcamento?: Orcamento) => {
    if (fromOrcamento) {
      addPedido({
        cliente_id: fromOrcamento.cliente_id,
        representante_id: fromOrcamento.representante_id,
        data: new Date().toISOString().split("T")[0],
        items: fromOrcamento.items,
        valor_total: fromOrcamento.valor_total,
        custo_total: fromOrcamento.valor_total * 0.4, // Estimate 40%
        margem: fromOrcamento.valor_total * 0.6,
        status: "Aguardando Produção",
        observacoes: fromOrcamento.observacoes,
        previsao_entrega: fromOrcamento.prazo_entrega
      });
      updateOrcamento(fromOrcamento.id, { status: "Convertido em Pedido" });
      setIsModalOpen(false);
    } else {
      if (!formData.cliente_id || formData.items.length === 0)
        return setIsConfirmOpen({
          isOpen: true,
          type: "Alert",
          message: "Selecione cliente e adicione itens.",
        });
      addPedido({
        cliente_id: formData.cliente_id,
        representante_id: formData.representante_id,
        data: new Date().toISOString().split("T")[0],
        items: formData.items,
        valor_total: cartSummary.valor_total,
        custo_total: cartSummary.custo_total,
        margem: cartSummary.lucro_total,
        status: "Aguardando Produção",
        observacoes: formData.observacoes,
        previsao_entrega: formData.previsao_entrega || formData.prazo_entrega
      });
      setIsModalOpen(false);
    }
  };

  const handleFaturarClick = (ped: Pedido) => {
    // Empty start as requested - can only be filled after DANFE analysis is run or bypassed
    setInputNfNumero("");
    setInputChaveAcesso("");
    setInputValorTotal(null);
    setInputDataEmissao("");
    setUploadedNfBase64("");
    setPendingFile(null);
    setExtractedNfData(null);
    setNfAnalysisError(null);
    setInputFormaPagamentoNf("Pix");
    setInputDataPagamentoNf(new Date().toISOString().split("T")[0]);
    setIsConfirmOpen({
      isOpen: true,
      type: "Faturar",
      pedId: ped.id,
      message: `Faturar Pedido #${ped.id.split("_")[1] || ped.id.substring(0, 6)}: deseja registrar a Nota Fiscal agora?`,
    });
  };

  const handleConfirmFaturamento = (comNota: boolean) => {
    if (isConfirmOpen.pedId) {
      const ped = pedidos.find(p => p.id === isConfirmOpen.pedId);
      const costs = ped ? getExpensesForPedido(ped) : { imposto_total: 0, frete_total: 0, comissao_total: 0 };
      const hasCosts = costs.imposto_total > 0 || costs.frete_total > 0 || costs.comissao_total > 0;

      if (ped && hasCosts) {
        // Open the intermediate prompt of expenses
        setFaturamentoExpenseStep({
          isOpen: true,
          pedId: isConfirmOpen.pedId,
          comNota: comNota,
          nfNumero: inputNfNumero.trim() || undefined,
          nfChave: inputChaveAcesso || undefined,
          nfValorTotal: inputValorTotal !== null ? inputValorTotal : undefined,
          nfDataEmissao: inputDataEmissao || undefined,
          nfAnexo: uploadedNfBase64 || undefined,
          formaPagamentoNf: inputFormaPagamentoNf,
          dataPagamentoNf: inputDataPagamentoNf
        });
        setIsConfirmOpen({ isOpen: false });
      } else {
        // Just execute right away
        executeFinalFaturamento(
          isConfirmOpen.pedId,
          comNota,
          false,
          inputNfNumero.trim() || undefined,
          inputChaveAcesso || undefined,
          inputValorTotal !== null ? inputValorTotal : undefined,
          inputDataEmissao || undefined,
          uploadedNfBase64 || undefined,
          inputFormaPagamentoNf,
          inputDataPagamentoNf
        );
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingFile(file);
      setNfAnalysisError(null);
    }
  };

  const handleLoadNfFile = async () => {
    if (!pendingFile) return;

    setIsAnalyzingNf(true);
    setNfAnalysisError(null);
    setExtractedNfData(null);

    try {
      const reader = new FileReader();
      const file = pendingFile;
      reader.onload = async () => {
        const base64 = reader.result as string;
        setUploadedNfBase64(base64);
        try {
          const res = await fetch("/api/faturamento/upload-nf", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileBase64: base64,
              filename: file.name,
              mimeType: file.type,
            }),
          });

          if (!res.ok) {
            throw new Error(
              "Não foi possível se conectar com o módulo de extração inteligente do servidor.",
            );
          }

          const resData = await res.json();
          if (resData.success && resData.data) {
            const extracted = resData.data;
            setExtractedNfData(extracted);
            if (extracted.nf_numero) {
              setInputNfNumero(extracted.nf_numero);
            }
            if (extracted.chave_acesso) {
              setInputChaveAcesso(extracted.chave_acesso);
            }
            if (extracted.data_emissao) {
              setInputDataEmissao(extracted.data_emissao);
            } else {
              setInputDataEmissao(new Date().toISOString().split("T")[0]);
            }
            if (extracted.valor_total) {
              setInputValorTotal(Number(extracted.valor_total));
            }
          } else {
            throw new Error(
              resData.error ||
                "Módulo de IA não conseguiu ler o arquivo de forma estruturada.",
            );
          }
        } catch (err: any) {
          setNfAnalysisError(
            err.message ||
              "Falha de processamento na leitura inteligente do arquivo.",
          );
        } finally {
          setIsAnalyzingNf(false);
        }
      };
      reader.onerror = () => {
        setNfAnalysisError("Falha ao ler o arquivo selecionado localmente.");
        setIsAnalyzingNf(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error(err);
      setNfAnalysisError(
        err.message ||
          "Falha de processamento na leitura inteligente do arquivo.",
      );
      setIsAnalyzingNf(false);
    }
  };

  const handleOpenNfVisualizer = (ped: Pedido) => {
    setSelectedNfPedido(ped);
    setNfModalTab(ped.nf_anexo ? "Anexo" : "Espelho");
    setIsNfModalOpen(true);
  };

  // Pedidos list filtering and memos
  const allItems = useMemo(() => {
    let list: Array<{ type: "Orcamento" | "Pedido"; data: any; date: string }> =
      [];
    orcamentos.forEach((o) => {
      if (o.status !== "Cancelado" && o.status !== "Convertido em Pedido") {
        list.push({ type: "Orcamento", data: o, date: o.data });
      }
    });
    pedidos.forEach((p) => {
      if (p.status !== "Cancelado") {
        list.push({ type: "Pedido", data: p, date: p.data });
      }
    });

    // Filters
    if (viewFilter === "Orcamentos")
      list = list.filter((i) => i.type === "Orcamento");
    if (viewFilter === "Pedidos")
      list = list.filter(
        (i) => i.type === "Pedido" && i.data.status !== "Pronto",
      );
    if (viewFilter === "Prontos")
      list = list.filter(
        (i) => i.type === "Pedido" && i.data.status === "Pronto",
      );

    if (searchTerm) {
      list = list.filter((i) => {
        const cli = clientes.find((c) => c.id === i.data.cliente_id);
        const isFaturado = i.type === "Pedido" && i.data.status === "Faturado";
        const idToShow =
          isFaturado && i.data.nf_numero
            ? `NF-${i.data.nf_numero}`
            : i.data.id.split("_")[1] || i.data.id;
        return (
          cli?.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cli?.nome_fantasia.toLowerCase().includes(searchTerm.toLowerCase()) ||
          idToShow.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    return list.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [pedidos, orcamentos, viewFilter, searchTerm, clientes]);

  const pedidosProntosParaFaturar = useMemo(() => {
    return pedidos.filter((p) => p.status === "Pronto");
  }, [pedidos]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-gray-900">
            Orçamentos e Pedidos
          </h2>
          <p className="text-sm text-gray-500 font-medium mt-1">
            Gerencie propostas e acompanhe o andamento dos pedidos
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Buscar por cliente ou ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none shadow-sm w-64"
            />
          </div>
          <button
            onClick={handleOpenNovo}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary/90 transition-all shadow-md focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            <Plus size={18} /> <span className="hidden sm:inline">Novo</span>
          </button>
        </div>
      </div>

      {/* Pedidos Finalizados na Produção Banners */}
      {pedidosProntosParaFaturar.length > 0 && (
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-[30px] p-6 shadow-sm space-y-4 scale-in">
          <div className="flex items-center gap-3 text-emerald-800">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
              <CheckCircle
                className="text-emerald-600 animate-pulse"
                size={24}
              />
            </div>
            <div>
              <h3 className="font-black text-base tracking-tight text-emerald-900">
                Pedidos Finalizados na Fábrica!
              </h3>
              <p className="text-xs font-semibold text-emerald-700">
                A produção terminou estas solicitações. Emita o faturamento
                comercial agora.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pedidosProntosParaFaturar.map((p) => {
              const cli = clientes.find((c) => c.id === p.cliente_id);
              const totalVolume = p.items.reduce(
                (acc, it) => acc + it.quantidade,
                0,
              );
              return (
                <div
                  key={p.id}
                  className="bg-white border border-emerald-100 rounded-2xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-all"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-mono text-xs font-black text-emerald-800 bg-emerald-100/60 px-2 py-0.5 rounded">
                        PED-{p.id.split("_")[1] || p.id.substring(0, 6)}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400">
                        {new Date(p.data).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-gray-900 text-sm line-clamp-1">
                      {cli?.nome_fantasia || cli?.razao_social || "Cliente"}
                    </h4>
                    <p className="text-xs font-bold text-gray-500 mt-1">
                      {totalVolume} unidades prontas
                    </p>
                    <div className="mt-4 flex justify-between items-end border-t border-gray-100 pt-3">
                      <span className="text-xs text-gray-400 font-bold">
                        Total:
                      </span>
                      <span className="text-base font-black text-emerald-600">
                        R$ {p.valor_total.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleFaturarClick(p)}
                    className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest py-3 rounded-xl transition-all shadow-md shadow-emerald-500/10 flex items-center justify-center gap-2"
                  >
                    <DollarSign size={15} /> Faturar Pedido
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-white border border-gray-200 rounded-xl w-fit">
        {["Todos", "Orcamentos", "Pedidos", "Prontos"].map((tab) => (
          <button
            key={tab}
            onClick={() => setViewFilter(tab as any)}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
              viewFilter === tab
                ? "bg-primary/10 text-primary"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Main Table List */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-3xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest min-w-[124px]">
                ID / Tipo
              </th>
              <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Data
              </th>
              <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Cliente
              </th>
              <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Total
              </th>
              <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Status
              </th>
              <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {allItems.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="p-8 text-center text-gray-400 font-medium"
                >
                  Nenhum registro encontrado.
                </td>
              </tr>
            ) : (
              allItems.map((item, idx) => {
                const cli = clientes.find((c) => c.id === item.data.cliente_id);
                const isFaturado =
                  item.type === "Pedido" && item.data.status === "Faturado";
                return (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-mono font-black text-gray-900 text-xs tracking-tight">
                          {isFaturado && item.data.nf_numero
                            ? `NF-${item.data.nf_numero}`
                            : item.data.id.split("_")[1] ||
                              item.data.id.substring(0, 6)}
                        </span>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                          {item.type}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm font-medium text-gray-600">
                        {new Date(item.date).toLocaleDateString("pt-BR", {
                          timeZone: "UTC",
                        })}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm font-bold text-gray-900">
                        {cli?.nome_fantasia || "Desconhecido"}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm font-black text-green-600">
                        R$ {(item.data.valor_total || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-bold rounded-lg ${
                          item.data.status === "Faturado"
                            ? "bg-green-100 text-green-700"
                            : item.data.status === "Pronto"
                              ? "bg-emerald-100 text-emerald-800"
                              : item.data.status === "Em produção"
                                ? "bg-orange-100 text-orange-700"
                                : item.data.status === "Aguardando Produção"
                                  ? "bg-amber-100 text-amber-700"
                                  : item.data.status === "Orçamento"
                                    ? "bg-purple-100 text-purple-700"
                                    : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {item.data.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        {/* Quick Testing Controls to trigger production stages */}
                        {item.type === "Pedido" &&
                          item.data.status === "Aguardando Produção" && (
                            <button
                              onClick={() => handleProduzirClick(item.data.id)}
                              className="px-2 py-1 bg-orange-500 hover:bg-orange-600 text-white font-bold text-[10px] rounded transition-colors shadow-sm"
                              title="Enviar para Fábrica"
                            >
                              Produzir
                            </button>
                          )}
                        {item.type === "Pedido" &&
                          item.data.status === "Em produção" && (
                            <button
                              onClick={() =>
                                updatePedido(item.data.id, { status: "Pronto" })
                              }
                              className="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] rounded transition-colors shadow-sm"
                              title="Indicar Conclusão de Fábrica"
                            >
                              Pronto!
                            </button>
                          )}

                        {item.type === "Pedido" && (
                          <button
                            onClick={() =>
                              handleOpenVisualizarPedido(item.data as Pedido)
                            }
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors tooltip-trigger"
                            title="Ver Pedido"
                          >
                            <Eye size={16} />
                          </button>
                        )}

                        {item.type === "Orcamento" && (
                          <>
                            <button
                              onClick={() =>
                                handleOpenVisualizarOrcamento(item.data)
                              }
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors tooltip-trigger"
                              title="Ver Orçamento"
                            >
                              <FileText size={16} />
                            </button>
                            <button
                              onClick={() => handleGerarPedido(item.data)}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors tooltip-trigger"
                              title="Gerar Pedido"
                            >
                              <Package size={16} />
                            </button>
                          </>
                        )}

                        {item.type === "Pedido" &&
                          item.data.status === "Pronto" && (
                            <button
                              onClick={() => handleFaturarClick(item.data)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors shadow-sm flex items-center gap-1"
                              title="Importar Nota Fiscal / Faturar"
                            >
                              <DollarSign size={14} /> Faturar
                            </button>
                          )}

                        {item.type === "Pedido" &&
                          item.data.status === "Faturado" && (
                            <>
                              {!item.data.nf_numero && (
                                <button
                                  onClick={() => handleFaturarClick(item.data)}
                                  className="px-2.5 py-1 bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs rounded-lg transition-all shadow-xs flex items-center gap-1"
                                  title="Importar Nota Fiscal comercial"
                                >
                                  <FileInput size={13} /> Importar NF
                                </button>
                              )}
                              {item.data.nf_numero && (
                                <button
                                  onClick={() =>
                                    handleOpenNfVisualizer(item.data)
                                  }
                                  className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                                  title="Ver Informações DANFE"
                                >
                                  <Search size={16} />
                                </button>
                              )}
                            </>
                          )}

                        {/* Administrative Cascade Deletion for BOTH orders and proposals */}
                        <button
                          onClick={() => {
                            if (
                              window.confirm(
                                `Tem certeza de que realmente deseja deletar este ${item.type === "Pedido" ? "pedido" : "orçamento"}? Esta ação limpará de forma irreversível qualquer vínculo, comissão ou despesa associada.`,
                              )
                            ) {
                              if (item.type === "Pedido")
                                deletePedido(item.data.id);
                              else deleteOrcamento(item.data.id);
                            }
                          }}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          title="Deletar Registro (Acesso Gerencial)"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Creation Modal */}
      {isModalOpen && modalType === "Novo" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-primary/40 backdrop-blur-sm">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col scale-in">
            <div className="p-6 bg-white border-b border-gray-100 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-gray-900">
                  Novo Pedido/Orçamento
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-gray-50 flex flex-col gap-8">
              <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">
                      Cliente
                    </label>
                    <select
                      value={formData.cliente_id}
                      onChange={(e) =>
                        setFormData({ ...formData, cliente_id: e.target.value })
                      }
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold opacity-90 focus:border-primary outline-none"
                    >
                      <option value="">Selecione o Cliente</option>
                      {clientes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.razao_social} ({c.nome_fantasia})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">
                      Representante (Opcional)
                    </label>
                    <select
                      value={formData.representante_id}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          representante_id: e.target.value,
                        })
                      }
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold opacity-90 focus:border-primary outline-none"
                    >
                      <option value="">Sem Representante / Gerente</option>
                      {usuarios
                        .filter((u) => u.perfil === "representante")
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.nome}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">
                      Condição de Pagamento
                    </label>
                    <select
                      value={formData.condicao_pagamento}
                      onChange={(e) =>
                        setFormData({ ...formData, condicao_pagamento: e.target.value })
                      }
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold focus:border-primary outline-none"
                    >
                      <option value="A Combinar">A Combinar</option>
                      <option value="Boleto">Boleto</option>
                      <option value="Pix">Pix</option>
                      <option value="Dinheiro">Dinheiro</option>
                      <option value="Bonificação">Bonificação</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">
                      Prazo de Entrega
                    </label>
                    <input
                      type="text"
                      value={formData.prazo_entrega}
                      readOnly
                      placeholder="Calculado auto."
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-500 outline-none cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">
                      Data Prevista de Entrega
                    </label>
                    <input
                      type="date"
                      value={formData.previsao_entrega}
                      onChange={(e) => {
                        const dateStr = e.target.value;
                        let prazo = "A definir";
                        if (dateStr) {
                          const dateObj = new Date(dateStr);
                          const today = new Date();
                          const diffTime = dateObj.getTime() - today.getTime();
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          if (diffDays === 0) prazo = "Hoje";
                          else if (diffDays === 1) prazo = "1 dia";
                          else if (diffDays > 1) prazo = `${diffDays} dias`;
                          else prazo = "Atrasado";
                        }
                        setFormData({ ...formData, previsao_entrega: dateStr, prazo_entrega: prazo })
                      }}
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold focus:border-primary outline-none"
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">
                    Observações do Pedido
                  </label>
                  <textarea
                    value={formData.observacoes}
                    onChange={(e) =>
                      setFormData({ ...formData, observacoes: e.target.value })
                    }
                    placeholder="Informações adicionais..."
                    rows={2}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold focus:border-primary outline-none"
                  />
                </div>

                <div className="mt-8 border-t border-gray-100 pt-6">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">
                    Adicionar Produto
                  </h3>

                  <div className="space-y-4">
                    {/* Step 1: Selection by Name */}
                    <div className="flex flex-col sm:flex-row gap-3 items-end">
                      <div className="flex-1">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 shadow-xs block">
                          Selecione o Produto
                        </label>
                        <select
                          value={newItem.produto_id}
                          onChange={(e) =>
                            handleSelectItemProduto(e.target.value)
                          }
                          className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2 text-sm font-bold opacity-90 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition-all"
                        >
                          <option value="">Selecione o Produto</option>
                          {produtos.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nome} (
                              {p.codigo || p.id.substring(0, 6).toUpperCase()})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Venda / Bonificação Toggle */}
                      <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setNewItem({ ...newItem, tipo: "venda" })
                          }
                          className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                            newItem.tipo === "venda"
                              ? "bg-white text-emerald-800 shadow-sm"
                              : "text-gray-400 hover:text-gray-600"
                          }`}
                        >
                          Venda
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setNewItem({ ...newItem, tipo: "bonificacao" })
                          }
                          className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                            newItem.tipo === "bonificacao"
                              ? "bg-white text-blue-800 shadow-sm"
                              : "text-gray-400 hover:text-gray-600"
                          }`}
                        >
                          Bonificação
                        </button>
                      </div>
                    </div>

                    {/* Step 2: Information Panel (Visible after selection) */}
                    {newItem.produto_id &&
                      (() => {
                        const p = produtos.find(
                          (x) => x.id === newItem.produto_id,
                        );
                        if (!p) return null;
                        return (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fadeIn">
                            {/* Panel Information (Read-only attributes) */}
                            <div className="lg:col-span-4 grid grid-cols-2 lg:grid-cols-3 gap-3 bg-gray-50 border border-gray-200 p-4 rounded-2xl">
                              <div>
                                <span className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">
                                  Nome
                                </span>
                                <span className="text-sm font-black text-gray-800 block truncate">
                                  {p.nome}
                                </span>
                              </div>
                              <div>
                                <span className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">
                                  Unidade / Peso
                                </span>
                                <span className="text-xs font-bold text-gray-600 block">
                                  {p.unidade} - {p.quantidade_unidade || 1}
                                </span>
                              </div>
                              <div>
                                <span className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">
                                  Preço de Venda
                                </span>
                                <span className="text-sm font-black text-emerald-700 block">
                                  R$ {p.preco_base.toFixed(2)}
                                </span>
                              </div>
                            </div>

                            {/* Inputs for adding to cart */}
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block px-1">
                                Qtd. Pedida
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  min="1"
                                  value={newItem.quantidade}
                                  onChange={(e) =>
                                    setNewItem({
                                      ...newItem,
                                      quantidade: Number(e.target.value),
                                    })
                                  }
                                  className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-sm font-black text-gray-900 focus:border-emerald-600 outline-none"
                                />
                              </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block px-1">
                                Área de Desconto (Unitário)
                              </label>
                              <div className="relative">
                                <input
                                  type="text"
                                  disabled={newItem.tipo === "bonificacao"}
                                  value={newItem.desconto === 0 ? "" : newItem.desconto}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(",", ".");
                                    if (val === "") {
                                      setNewItem({ ...newItem, desconto: 0 });
                                    } else if (!isNaN(Number(val))) {
                                      setNewItem({ ...newItem, desconto: Number(val) });
                                    }
                                  }}
                                  className={`w-full bg-white border border-gray-300 rounded-xl px-9 py-2.5 text-sm font-black text-red-600 focus:border-red-500 outline-none ${newItem.tipo === "bonificacao" ? "bg-gray-100 opacity-50 cursor-not-allowed" : ""}`}
                                  placeholder="0.00"
                                />
                                <DollarSign
                                  size={14}
                                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                                />
                              </div>
                            </div>

                            <div className="md:col-span-2 flex items-end">
                              <button
                                onClick={handleAddItem}
                                className={`w-full h-[46px] rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md ${
                                  newItem.tipo === "venda"
                                    ? "bg-emerald-800 hover:bg-emerald-900 text-white"
                                    : "bg-blue-800 hover:bg-blue-900 text-white"
                                }`}
                              >
                                <Plus size={16} /> Adicionar ao Pedido
                              </button>
                            </div>

                            {/* Applied values preview */}
                            <div className="lg:col-span-4 pt-2 border-t border-dashed border-gray-200 mt-2 flex justify-between items-center text-[10px] font-bold">
                              <div className="flex gap-4">
                                <span className="text-gray-400">
                                  Preço Unit. Efetivo:{" "}
                                  <span className="text-gray-900">
                                    R${" "}
                                    {(newItem.tipo === "bonificacao"
                                      ? 0
                                      : p.preco_base - newItem.desconto
                                    ).toFixed(2)}
                                  </span>
                                </span>
                                <span className="text-gray-400">
                                  Total do Item:{" "}
                                  <span className="text-emerald-700 font-extrabold">
                                    R${" "}
                                    {(
                                      (newItem.tipo === "bonificacao"
                                        ? 0
                                        : p.preco_base - newItem.desconto) *
                                      newItem.quantidade
                                    ).toFixed(2)}
                                  </span>
                                </span>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded text-[8px] uppercase tracking-tighter ${newItem.tipo === "venda" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}
                              >
                                Operação: {newItem.tipo}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                  </div>
                </div>
              </div>

              {/* Cart */}
              {formData.items.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                    <h3 className="p-6 pb-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Itens do Pedido
                    </h3>
                    <div className="px-6 pb-6 overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-gray-100 text-left">
                            <th className="py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                              Produto / Tipo
                            </th>
                            <th className="py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">
                              Qtd
                            </th>
                            <th className="py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">
                              Unidade
                            </th>
                            <th className="py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right px-2">
                              Desc. (Un.)
                            </th>
                            <th className="py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">
                              Total
                            </th>
                            <th className="py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {formData.items.map((item, idx) => {
                            const p = produtos.find(
                              (x) => x.id === item.produto_id,
                            );
                            const precoEfetivo =
                              item.tipo === "bonificacao"
                                ? 0
                                : item.preco - (item.desconto || 0);
                            return (
                              <tr key={idx} className="group">
                                <td className="py-4">
                                  <div className="flex flex-col">
                                    <span className="font-black text-gray-900 text-xs">
                                      {p?.nome || "Produto Removido"}
                                    </span>
                                    <span
                                      className={`text-[9px] font-black uppercase tracking-tighter ${item.tipo === "venda" ? "text-emerald-600" : "text-blue-600"}`}
                                    >
                                      {item.tipo || "venda"}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-4 font-black text-gray-900 text-xs text-center bg-gray-50/50">
                                  {item.quantidade}
                                </td>
                                <td className="py-4 font-bold text-gray-500 text-[10px] text-right uppercase">
                                  R$ {item.preco.toFixed(2)}
                                </td>
                                <td className="py-4 font-black text-red-600 text-xs text-right px-2">
                                  {item.desconto && item.desconto > 0
                                    ? `- R$ ${item.desconto.toFixed(2)}`
                                    : "—"}
                                </td>
                                <td className="py-4 font-black text-gray-950 text-sm text-right">
                                  R$ {(precoEfetivo * item.quantidade).toFixed(2)}
                                </td>
                                <td className="py-4 text-right">
                                  <button
                                    onClick={() => handleRemoveItem(idx)}
                                    className="text-gray-300 hover:text-red-500 p-1.5 rounded-lg transition-colors"
                                  >
                                    <X size={14} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-primary text-white rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                    <div>
                      <h3 className="text-[10px] font-black text-accent/70 uppercase tracking-widest mb-6">
                        Resumo Financeiro
                      </h3>

                      <div className="space-y-4">
                        <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/10">
                          <span className="text-xs font-bold text-accent">
                            Total do Pedido
                          </span>
                          <span className="text-lg font-black shrink-0 ml-4">
                            R$ {cartSummary.valor_total.toFixed(2)}
                          </span>
                        </div>

                        <div className="space-y-2 mt-4 bg-white/5 p-4 rounded-xl border border-white/10 text-sm">
                          <div className="flex justify-between text-white/80">
                            <span>Custo Produtivo</span>
                            <span>R$ {cartSummary.custo_total.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-white/80">
                            <span>Impostos</span>
                            <span>
                              R$ {cartSummary.imposto_total.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between text-white/80">
                            <span>Comissão</span>
                            <span>
                              R$ {cartSummary.comissao_total.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between text-white/80">
                            <span>Frete</span>
                            <span>R$ {cartSummary.frete_total.toFixed(2)}</span>
                          </div>
                          <div className="border-t border-white/20 my-2 pt-2 flex justify-between font-bold text-green-400">
                            <span>Lucro Bruto Estimado</span>
                            <span>R$ {cartSummary.lucro_total.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 flex flex-col gap-3">
                      <button
                        onClick={handleGerarOrcamento}
                        className="w-full bg-white/20 hover:bg-white/30 text-white font-black text-sm uppercase tracking-widest py-4 rounded-xl transition-all shadow-sm"
                      >
                        Gerar Orçamento
                      </button>
                      <button
                        onClick={() => handleGerarPedido()}
                        className="w-full bg-accent hover:bg-accent/90 text-primary font-black text-sm uppercase tracking-widest py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                      >
                        <Package size={18} /> Gerar Pedido
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Proposal Visualizer */}
      {isModalOpen && modalType === "Visualizar Orcamento" && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-primary/40 backdrop-blur-sm">
          <div
            className="bg-white rounded-[40px] shadow-2xl w-full max-w-4xl h-[90vh] overflow-hidden flex flex-col scale-in relative"
            id="print-area"
          >
            <div className="p-8 bg-gray-50 border-b border-gray-100 flex justify-between items-start hide-on-print shrink-0">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-gray-900">
                  Orçamento #{selectedItem.id.split("_")[1]}
                </h2>
                <p className="text-sm font-medium text-gray-500 mt-1">
                  Data:{" "}
                  {new Date(selectedItem.data).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDownloadPDF("Orcamento", "Orcamento")}
                  disabled={isGeneratingPDF}
                  className={`w-10 h-10 border rounded-full flex items-center justify-center transition-all shadow-sm tooltip-trigger ${
                    isGeneratingPDF ? "bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                  }`}
                  title="Exportar Orçamento"
                >
                  <Printer size={18} />
                </button>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-12 overflow-y-auto print-content bg-white flex-1 animate-fadeIn">
              <div className="hidden print-header mb-8 text-center pb-8 border-b-2 border-gray-200 font-sans">
                <h1 className="text-3xl font-black uppercase tracking-tighter text-gray-900">
                  GRUPO ENO
                </h1>
                <p className="text-sm text-gray-500 tracking-widest uppercase font-bold mt-1">
                  Orçamento Comercial
                </p>
              </div>

              <div className="mb-10 font-sans">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
                  Dados do Cliente
                </h3>
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="font-black text-gray-900 text-lg mb-1">
                      {clientes.find((c) => c.id === selectedItem.cliente_id)?.razao_social}
                    </p>
                    <p className="text-sm text-gray-600 font-medium">
                      CNPJ: {clientes.find((c) => c.id === selectedItem.cliente_id)?.cnpj_cpf}
                    </p>
                    <p className="text-sm text-gray-600 font-medium capitalize">
                      Cidade: {clientes.find((c) => c.id === selectedItem.cliente_id)?.cidade} - {clientes.find((c) => c.id === selectedItem.cliente_id)?.estado}
                    </p>
                  </div>
                  <div className="md:border-l md:pl-6 border-gray-200">
                    <p className="text-sm font-bold text-gray-700">Condições Comerciais:</p>
                    <p className="text-xs text-gray-600 mt-1"><strong>Pagamento:</strong> {selectedItem.condicao_pagamento || "A Combinar"}</p>
                    <p className="text-xs text-gray-600 mt-1"><strong>Prazo de Entrega:</strong> {selectedItem.prazo_entrega || "15 dias"}</p>
                  </div>
                </div>
              </div>

              {selectedItem.observacoes && (
                <div className="mb-10 font-sans">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
                    Observações
                  </h3>
                  <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                    <p className="text-sm text-gray-700 italic">{selectedItem.observacoes}</p>
                  </div>
                </div>
              )}

              <div className="font-sans">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
                  Itens
                </h3>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-gray-900">
                      <th className="py-4 text-xs font-black text-gray-900 uppercase tracking-widest">
                        Produto
                      </th>
                      <th className="py-4 text-xs font-black text-gray-900 uppercase tracking-widest text-center">
                        Qtd
                      </th>
                      <th className="py-4 text-xs font-black text-gray-900 uppercase tracking-widest text-right">
                        Preço Unitário
                      </th>
                      <th className="py-4 text-xs font-black text-gray-900 uppercase tracking-widest text-right">
                        Subtotal
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedItem.items.map((it: any, i: number) => {
                      const p = produtos.find((x) => x.id === it.produto_id);
                      return (
                        <tr key={i}>
                          <td className="py-4 font-bold text-gray-800">
                            {p?.nome}
                          </td>
                          <td className="py-4 font-medium text-gray-600 text-center">
                            {it.quantidade}
                          </td>
                          <td className="py-4 font-medium text-gray-600 text-right">
                            R$ {it.preco.toFixed(2)}
                          </td>
                          <td className="py-4 font-black text-gray-900 text-right">
                            R$ {(it.quantidade * it.preco).toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-900">
                      <td
                        colSpan={3}
                        className="py-6 font-black text-right tracking-widest uppercase text-gray-400 text-sm"
                      >
                        Total do Orçamento
                      </td>
                      <td className="py-6 font-black text-2xl text-right text-gray-900">
                        R$ {selectedItem.valor_total.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-200 hide-on-print flex gap-4 shrink-0">
              <button
                onClick={() => {
                  deleteOrcamento(selectedItem.id);
                  setIsModalOpen(false);
                }}
                className="flex-1 px-6 py-4 bg-white border border-red-200 text-red-600 font-black text-sm uppercase tracking-widest rounded-xl hover:bg-red-50 transition-all"
              >
                Deletar Orçamento
              </button>
              <button
                onClick={() => handleGerarPedido(selectedItem as Orcamento)}
                className="flex-[2] px-6 py-4 bg-primary text-white font-black text-sm uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all shadow-md"
              >
                Gerar Pedido a Partir do Orçamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pedido Visualizer */}
      {isModalOpen && modalType === "Visualizar Pedido" && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-primary/40 backdrop-blur-sm">
          <div
            className="bg-white rounded-[40px] shadow-2xl w-full max-w-4xl h-[90vh] overflow-hidden flex flex-col scale-in relative"
          >
            <div className="p-8 bg-gray-50 border-b border-gray-100 flex justify-between items-start hide-on-print shrink-0">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-gray-900">
                  Pedido #{selectedItem.id.split("_")[1] || selectedItem.id.substring(0, 6)}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded ${
                        selectedItem.status === "Faturado"
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}>
                    {selectedItem.status}
                  </span>
                  <p className="text-sm font-medium text-gray-500">
                    Data: {new Date(selectedItem.data).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDownloadPDF("Pedido", "Pedido")}
                  disabled={isGeneratingPDF}
                  className={`w-10 h-10 border rounded-full flex items-center justify-center transition-all shadow-sm tooltip-trigger ${
                    isGeneratingPDF ? "bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                  }`}
                  title="Exportar Pedido"
                >
                  <Printer size={18} />
                </button>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div id="print-area-pedido-content" className="p-12 overflow-y-auto print-content bg-white flex-1 animate-fadeIn text-gray-900">
              {/* Header inside print area */}
              <div className="mb-8 text-center pb-8 border-b-2 border-gray-200 font-sans">
                <h1 className="text-3xl font-black uppercase tracking-tighter text-gray-900">
                  ESTÂNCIA NOVA OLINDA
                </h1>
                <p className="text-sm text-gray-500 tracking-widest uppercase font-bold mt-1">
                  Confirmação de Pedido de Venda
                </p>
              </div>

              <div className="mb-10 font-sans">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
                  Dados do Cliente
                </h3>
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="font-black text-gray-900 text-lg mb-1">
                      {clientes.find((c) => c.id === selectedItem.cliente_id)?.razao_social}
                    </p>
                    <p className="text-sm text-gray-600 font-medium">
                      CNPJ: {clientes.find((c) => c.id === selectedItem.cliente_id)?.cnpj_cpf}
                    </p>
                    <p className="text-sm text-gray-600 font-medium capitalize">
                      Endereço: {clientes.find((c) => c.id === selectedItem.cliente_id)?.endereco}, {clientes.find((c) => c.id === selectedItem.cliente_id)?.cidade} - {clientes.find((c) => c.id === selectedItem.cliente_id)?.estado}
                    </p>
                  </div>
                  <div className="md:border-l md:pl-6 border-gray-200">
                    <p className="text-sm font-bold text-gray-700">Previsão e Logística:</p>
                    <p className="text-xs text-gray-600 mt-1"><strong>Data Prevista:</strong> {(selectedItem as Pedido).previsao_entrega ? new Date((selectedItem as Pedido).previsao_entrega!).toLocaleDateString("pt-BR", {timeZone: 'UTC'}) : "A definir"}</p>
                    {selectedItem.status === 'Faturado' && (
                      <p className="text-xs text-gray-600 mt-1"><strong>Nº NF:</strong> {(selectedItem as Pedido).nf_numero || "N/A"}</p>
                    )}
                    <p className="text-xs text-gray-600 mt-1"><strong>Vendedor:</strong> {usuarios.find(u => u.id === selectedItem.representante_id)?.nome || "Venda Direta"}</p>
                  </div>
                </div>
              </div>

              {selectedItem.observacoes && (
                <div className="mb-10 font-sans">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
                    Observações do Pedido
                  </h3>
                  <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                    <p className="text-sm text-gray-700 italic">{selectedItem.observacoes}</p>
                  </div>
                </div>
              )}

              <div className="font-sans">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
                  Itens do Pedido
                </h3>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-gray-900">
                      <th className="py-4 text-xs font-black text-gray-900 uppercase tracking-widest">
                        Produto
                      </th>
                      <th className="py-4 text-xs font-black text-gray-900 uppercase tracking-widest text-center">
                        Qtd
                      </th>
                      <th className="py-4 text-xs font-black text-gray-900 uppercase tracking-widest text-right">
                        Preço Unit.
                      </th>
                      <th className="py-4 text-xs font-black text-gray-900 uppercase tracking-widest text-right">
                        Subtotal
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedItem.items.map((it: any, i: number) => {
                      const p = produtos.find((x) => x.id === it.produto_id);
                      const precoEf = it.tipo === 'bonificacao' ? 0 : it.preco - (it.desconto || 0);
                      return (
                        <tr key={i}>
                          <td className="py-4">
                            <span className="font-bold text-gray-800">{p?.nome}</span>
                            {it.tipo === 'bonificacao' && <span className="ml-2 text-[8px] font-black uppercase text-blue-600 bg-blue-50 px-1 py-0.5 rounded">Bonificação</span>}
                          </td>
                          <td className="py-4 font-bold text-gray-900 text-center">
                            {it.quantidade}
                          </td>
                          <td className="py-4 font-medium text-gray-600 text-right">
                            R$ {precoEf.toFixed(2)}
                          </td>
                          <td className="py-4 font-black text-gray-950 text-right font-mono">
                            R$ {(it.quantidade * precoEf).toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-900">
                      <td
                        colSpan={3}
                        className="py-6 font-black text-right tracking-widest uppercase text-gray-400 text-xs"
                      >
                        Valor Total do Pedido
                      </td>
                      <td className="py-6 font-black text-2xl text-right text-emerald-700 font-mono">
                        R$ {selectedItem.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Signature section for printing */}
              <div className="mt-20 grid grid-cols-2 gap-12 font-sans">
                <div className="text-center pt-8 border-t border-gray-400">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Assinatura do Cliente</p>
                  <p className="text-xs font-bold text-gray-800">{clientes.find((c) => c.id === selectedItem.cliente_id)?.razao_social}</p>
                </div>
                <div className="text-center pt-8 border-t border-gray-400">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Autorização de Venda</p>
                  <p className="text-xs font-bold text-gray-800">Estância Nova Olinda</p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-200 hide-on-print flex gap-4 shrink-0">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-6 py-4 bg-white border border-gray-200 text-gray-600 font-black text-sm uppercase tracking-widest rounded-xl hover:bg-gray-50 transition-all"
              >
                Fechar Visualização
              </button>
              <button
                onClick={() => handleDownloadPDF("Pedido", "Pedido")}
                disabled={isGeneratingPDF}
                className={`flex-1 px-6 py-4 text-white font-black text-sm uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center justify-center gap-2 ${
                  isGeneratingPDF ? "bg-emerald-400 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                <Printer size={18} /> {isGeneratingPDF ? "Gerando..." : "Exportar Pedido"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isNfModalOpen && selectedNfPedido && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-primary/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-4xl h-[85vh] overflow-hidden flex flex-col scale-in relative">
            <div className="p-6 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row justify-between sm:items-center gap-4 shrink-0 text-left">
              <div className="text-left">
                <h3 className="text-lg font-black text-gray-900 text-left">
                  Visualização de Nota Fiscal faturada
                </h3>
                <p className="text-xs text-gray-500 font-medium text-left">
                  Faturamento e DANFE do Pedido #
                  {selectedNfPedido.id.split("_")[1] ||
                    selectedNfPedido.id.substring(0, 6)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {/* TAB SELECTION ZONE */}
                <div className="bg-gray-200 p-1 rounded-xl flex gap-1">
                  <button
                    onClick={() => setNfModalTab("Anexo")}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all ${nfModalTab === "Anexo" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-950"}`}
                  >
                    Nota Fiscal Anexada (PDF/Imagem)
                  </button>
                  <button
                    onClick={() => setNfModalTab("Espelho")}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all ${nfModalTab === "Espelho" ? "bg-white text-gray-950 shadow-sm" : "text-gray-500 hover:text-gray-950"}`}
                  >
                    DANFE Auxiliar
                  </button>
                </div>

                <div className="flex gap-1.5 shrink-0">
                  {nfModalTab === "Espelho" && (
                    <button
                      onClick={() => handleDownloadPDF("NFe", "NFe")}
                      disabled={isGeneratingPDF}
                      className={`w-10 h-10 border rounded-full flex items-center justify-center transition-all shadow-sm tooltip-trigger ${
                        isGeneratingPDF ? "bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed" : "bg-white text-gray-750 border-gray-200 hover:bg-gray-100"
                      }`}
                      title="Exportar Nota Fiscal"
                    >
                      <Printer size={18} />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setIsNfModalOpen(false);
                      setIsNfImageZoomed(false);
                    }}
                    className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* MODAL MAIN DYNAMIC VIEWER SCENE */}
            {nfModalTab === "Anexo" ? (
              <div className="flex-1 w-full h-full bg-gray-100 flex flex-col justify-center items-center overflow-hidden relative p-1">
                {/* Lightbox inline zoom container to bypass Microsoft Edge pop-up blocker */}
                {isNfImageZoomed &&
                  selectedNfPedido.nf_anexo &&
                  selectedNfPedido.nf_anexo !== "simulated_danfe" && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 transition-all animate-fadeIn">
                      <button
                        onClick={() => setIsNfImageZoomed(false)}
                        className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white rounded-full p-2.5 font-bold cursor-pointer transition-all flex items-center justify-center border border-white/15"
                      >
                        <X size={20} />
                      </button>
                      <img
                        src={selectedNfPedido.nf_anexo}
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl scale-in"
                        alt="Nota Fiscal Visualização Zoom"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}

                {selectedNfPedido.nf_anexo &&
                selectedNfPedido.nf_anexo !== "simulated_danfe" ? (
                  <>
                    {selectedNfPedido.nf_anexo.startsWith(
                      "data:application/pdf",
                    ) || selectedNfPedido.nf_anexo.includes("pdf") ? (
                      <div className="w-full h-full flex flex-col p-4 bg-gray-50/50 space-y-4 overflow-y-auto scrollbar-thin">
                        {/* Beautiful Notice Panel bypassing the Iframe Block */}
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm text-left">
                          <div className="flex items-start gap-4 text-left">
                            <AlertTriangle size={24} className="text-amber-600 shrink-0 mt-0.5" />
                            <div className="text-left font-sans">
                              <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider mb-0.5 font-sans">Visualização de PDF</h4>
                              <p className="text-[11px] font-bold text-gray-500 leading-tight font-sans">
                                O navegador impede a exibição direta de arquivos PDF em páginas incorporadas. Geramos o espelho digital abaixo. Clique para fazer o download do documento oficial original.
                              </p>
                            </div>
                          </div>
                          <button 
                            type="button"
                            onClick={handleDownloadPdf}
                            className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all hover:scale-[1.02] font-sans pointer-events-auto"
                          >
                            <Download size={14} /> Baixar PDF Original (Completo)
                          </button>
                        </div>

                        {/* Display the beautiful pure CSS simulated DANFE view populated with the exact values from the uploaded PDF */}
                        <div className="w-full flex justify-center items-start">
                          <div className="w-full max-w-3xl bg-white border border-gray-350 shadow-lg relative p-6 font-mono text-[9px] text-gray-800 space-y-3 leading-tight select-none">
                            {/* Digital Stamp Watermark */}
                            <div className="absolute right-12 top-1/3 -rotate-12 border-4 border-emerald-500/20 text-emerald-500/20 font-black text-2xl tracking-widest px-6 py-2 rounded-xl pointer-events-none uppercase font-sans">
                              DOCUMENTO ANEXADO (PDF)
                            </div>
                            
                            {/* Dash-cut Receipt on Top */}
                            <div className="border border-black p-2 flex justify-between gap-4 items-center mb-1 text-left">
                              <div className="flex-1 text-left">
                                <p className="font-bold">RECEBEMOS DA ESTÂNCIA NOVA OLINDA OS PRODUTOS/SERVIÇOS CONSTANTES DA NOTA FISCAL INDICADA AO LADO</p>
                                <p className="mt-1 text-[8px] text-gray-500 font-sans">DATA DE RECEBIMENTO: _____/_____/_________  |  ASSINATURA E IDENTIFICAÇÃO DO RECEBEDOR: __________________________________________________</p>
                              </div>
                              <div className="text-center border-l border-black pl-4 h-full flex flex-col justify-center min-w-[120px]">
                                <p className="text-[10px] font-black font-sans">NF-e</p>
                                <p className="text-xs font-black text-gray-900 mt-1 font-sans">Nº {selectedNfPedido.nf_numero || '56123'}</p>
                                <p className="text-[7px] text-gray-500 uppercase tracking-widest mt-0.5 font-sans">SÉRIE 1</p>
                              </div>
                            </div>
                            <div className="border-t border-dashed border-gray-600 my-2 h-0"></div>

                            {/* Core DANFE Header info */}
                            <div className="grid grid-cols-1 md:grid-cols-3 border border-black text-left">
                              <div className="p-2 border-r border-black flex flex-col justify-between text-left">
                                <div>
                                  <p className="font-extrabold text-xs text-gray-950 font-sans">ESTÂNCIA NOVA OLINDA</p>
                                  <p className="text-[8px] font-semibold text-gray-600 mt-0.5 font-sans">GRUPO ENO LTDA</p>
                                  <p className="text-[7.5px] text-gray-500 mt-1 font-sans">RODOVIA PA-150, KM 12 - ZONA RURAL</p>
                                  <p className="text-[7.5px] text-gray-500 font-sans">TAILÂNDIA - PARÁ - CEP: 68690-000</p>
                                  <p className="text-[7.5px] text-gray-500 font-sans">FONE: (91) 3752-1920</p>
                                </div>
                              </div>
                              <div className="p-2 border-r border-black text-center flex flex-col justify-center min-w-[140px]">
                                <p className="font-black text-[12px] uppercase tracking-wide font-sans">DANFE</p>
                                <p className="text-[7px] text-gray-500 font-sans">Documento Auxiliar da Nota Fiscal Eletrônica</p>
                                <div className="flex justify-around items-center mt-2.5 text-[8px] font-bold">
                                  <div>
                                    <p className="font-sans">0 - ENTRADA</p>
                                    <p className="border border-black w-6 mx-auto mt-0.5 font-black text-center font-sans">1</p>
                                    <p className="text-[7px] font-sans">1 - SAÍDA</p>
                                  </div>
                                  <div>
                                    <p className="font-black font-sans">Nº {selectedNfPedido.nf_numero || '56123'}</p>
                                    <p className="text-[7px] text-gray-500 font-bold uppercase mt-1 font-sans">SÉRIE: 1</p>
                                    <p className="text-[7px] text-gray-500 font-bold uppercase font-sans">PÁGINA: 1/1</p>
                                  </div>
                                </div>
                              </div>
                              <div className="p-2 flex flex-col justify-between items-stretch text-left">
                                <div className="text-left font-sans">
                                  <span className="block text-[7px] font-bold uppercase tracking-wider text-gray-400 font-sans">CHAVE DE ACESSO</span>
                                  <p className="font-black text-[9px] tracking-wider font-mono text-gray-900 break-all select-all text-left">
                                    {(selectedNfPedido.nf_chave || '35260512345678000190550010000' + (selectedNfPedido.nf_numero || '56123') + '100293841029').replace(/\s/g, "")}
                                  </p>
                                </div>
                                <div className="mt-2 text-center flex flex-col items-center justify-center border-t border-black/10 pt-2 pointer-events-none">
                                  {/* Beautiful CSS pure Barcode */}
                                  <div className="h-6 flex items-stretch gap-0.5 bg-white px-2 pr-4">
                                    <div className="w-[1px] bg-black"></div>
                                    <div className="w-[3px] bg-black"></div>
                                    <div className="w-[1px] bg-white"></div>
                                    <div className="w-[1px] bg-black"></div>
                                    <div className="w-[1.5px] bg-black"></div>
                                    <div className="w-[2px] bg-white"></div>
                                    <div className="w-[3px] bg-black"></div>
                                    <div className="w-[1px] bg-black"></div>
                                    <div className="w-[1.5px] bg-white"></div>
                                    <div className="w-[2px] bg-black"></div>
                                    <div className="w-[1px] bg-white"></div>
                                    <div className="w-[4px] bg-black"></div>
                                    <div className="w-[1.5px] bg-black"></div>
                                    <div className="w-[1px] bg-white"></div>
                                    <div className="w-[2.5px] bg-black"></div>
                                    <div className="w-[1.5px] bg-black"></div>
                                    <div className="w-[1px] bg-white"></div>
                                    <div className="w-[1px] bg-black"></div>
                                    <div className="w-[3.5px] bg-black"></div>
                                    <div className="w-[2px] bg-white"></div>
                                    <div className="w-[1.5px] bg-black"></div>
                                  </div>
                                  <p className="text-[7px] text-gray-400 mt-1 font-sans">Consulta de autenticidade no portal nacional da NF-e</p>
                                </div>
                              </div>
                            </div>

                            {/* Remessa details */}
                            <div className="grid grid-cols-1 md:grid-cols-4 border border-black text-[8px] text-left">
                              <div className="p-1 border-r border-black text-left col-span-2">
                                <span className="text-[7px] text-gray-400 block font-bold font-sans">NATUREZA DA OPERAÇÃO</span>
                                <span className="font-extrabold text-[9px] text-gray-900 block font-sans truncate">VENDA DE PRODUÇÃO DO ESTABELECIMENTO</span>
                              </div>
                              <div className="p-1 border-r border-black text-left">
                                <span className="text-[7px] text-gray-400 block font-bold font-sans">INSCRIÇÃO ESTADUAL</span>
                                <span className="font-extrabold text-[9px] font-sans">394.810.239.110</span>
                              </div>
                              <div className="p-1 text-left">
                                <span className="text-[7px] text-gray-400 block font-bold font-mono">CNPJ</span>
                                <span className="font-extrabold text-[9px] font-sans">12.345.678/0001-90</span>
                              </div>
                            </div>

                            {/* Destinatário */}
                            <div className="border border-black p-2 text-left">
                              <span className="block text-[8px] font-black text-gray-500 uppercase tracking-wider mb-1 text-left font-sans font-extrabold">DESTINATÁRIO / REMETENTE</span>
                              {(() => {
                                const cli = clientes.find(c => c.id === selectedNfPedido.cliente_id);
                                return (
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[9px] text-left font-sans">
                                    <div className="md:col-span-2 text-left font-sans">
                                      <span className="text-gray-400 text-[7px] block font-sans">NOME / RAZÃO SOCIAL</span>
                                      <span className="font-black text-gray-900 block font-sans">{cli?.razao_social || 'CONFERENTE DE CARGAS AGRÍCOLAS'}</span>
                                    </div>
                                    <div className="text-left font-sans">
                                      <span className="text-gray-400 text-[7px] block font-sans">CNPJ / CPF</span>
                                      <span className="font-black text-gray-900 block font-sans">{cli?.cnpj_cpf || '00.000.000/0001-00'}</span>
                                    </div>
                                    <div className="text-left font-sans">
                                      <span className="text-gray-400 text-[7px] block font-sans">DATA EMISSÃO</span>
                                      <span className="font-black text-gray-900 block font-sans">{selectedNfPedido.nf_data_emissao ? new Date(selectedNfPedido.nf_data_emissao).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : new Date().toLocaleDateString('pt-BR')}</span>
                                    </div>
                                    <div className="md:col-span-2 text-left">
                                      <span className="text-gray-400 text-[7px] block font-sans">ENDEREÇO</span>
                                      <span className="font-bold text-gray-800 block text-left truncate font-sans">{cli?.endereco || 'Zona Industrial Rural Central, S/N'}</span>
                                    </div>
                                    <div className="text-left font-sans">
                                      <span className="text-gray-400 text-[7px] block font-sans">BAIRRO / DISTRITO</span>
                                      <span className="font-bold text-gray-800 block text-left truncate font-sans">{cli?.bairro || 'Centro'}</span>
                                    </div>
                                    <div className="text-left font-sans font-sans">
                                      <span className="text-gray-400 text-[7px] block font-sans">CIDADES - UF</span>
                                      <span className="font-bold text-gray-800 block text-left truncate font-sans">{cli?.cidade || 'Altamira'} - {cli?.estado || 'PA'}</span>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>

                            {/* Imposto Calculado */}
                            {(() => {
                              const totalVal = selectedNfPedido.nf_valor_total !== undefined ? selectedNfPedido.nf_valor_total : selectedNfPedido.valor_total;
                              return (
                                <div className="border border-black p-2 text-left">
                                  <span className="block text-[8px] font-black text-gray-500 uppercase tracking-wider mb-1 font-sans">CÁLCULO DO IMPOSTO</span>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[9px] text-left font-sans">
                                    <div className="text-left font-sans">
                                      <span className="text-gray-400 text-[7px] block font-sans">BASE DE CÁLCULO ICMS</span>
                                      <span className="font-extrabold block text-left font-sans">R$ {(totalVal * 0.18).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="text-left font-sans">
                                      <span className="text-gray-400 text-[7px] block font-sans">VALOR DO ICMS</span>
                                      <span className="font-extrabold block text-left font-sans">R$ {(totalVal * 0.05).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="text-left font-sans">
                                      <span className="text-gray-400 text-[7px] block font-sans">VALOR DO FRETE</span>
                                      <span className="font-bold block text-left font-sans">R$ 0,00</span>
                                    </div>
                                    <div className="text-left bg-emerald-50 p-1 border border-emerald-200 rounded font-sans">
                                      <span className="text-emerald-800 text-[7px] block font-black font-sans">VALOR TOTAL DA NOTA</span>
                                      <span className="font-black text-[10px] text-emerald-950 block text-left font-sans">
                                        R$ {totalVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Table Items */}
                            <div className="border border-black text-left">
                              <div className="p-1 px-2 border-b border-black bg-gray-50 font-sans">
                                <span className="text-[7.5px] font-black uppercase text-gray-500 tracking-wider">DADOS DOS PRODUTOS / SERVIÇOS</span>
                              </div>
                              <table className="w-full text-left font-mono text-[8px] leading-tight border-collapse">
                                <thead>
                                  <tr className="border-b border-black text-left font-black">
                                    <th className="p-1 border-r border-black text-left w-14 font-sans text-[7.5px]">CÓD. PROD.</th>
                                    <th className="p-1 border-r border-black text-left font-sans text-[7.5px]">DESCRIÇÃO DOS PRODUTOS</th>
                                    <th className="p-1 border-r border-black text-center w-8 font-sans text-[7.5px]">UNID.</th>
                                    <th className="p-1 border-r border-black text-center w-10 font-sans text-[7.5px]">QTD.</th>
                                    <th className="p-1 border-r border-black text-right w-14 font-sans text-[7.5px]">V. UNITÁRIO</th>
                                    <th className="p-1 text-right w-16 font-sans text-[7.5px]">VALOR TOTAL</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-black/10 font-sans">
                                  {selectedNfPedido.items.map((it, ind) => {
                                    const p = produtos.find(prod => prod.id === it.produto_id);
                                    const valTotalItem = it.quantidade * it.preco;
                                    return (
                                      <tr key={ind} className="font-sans">
                                        <td className="p-1 border-r border-black font-bold text-left">{p?.codigo || p?.id.substring(0, 5).toUpperCase() || "PRD-01"}</td>
                                        <td className="p-1 border-r border-black font-extrabold text-left text-gray-900 font-sans">{p?.nome || 'Insumo de Mandioca / Farinha Integral'}</td>
                                        <td className="p-1 border-r border-black text-center uppercase font-sans">{p?.unidade || 'Un'}</td>
                                        <td className="p-1 border-r border-black text-center font-sans">{it.quantidade}</td>
                                        <td className="p-1 border-r border-black text-right font-sans">R$ {it.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        <td className="p-1 text-right font-black text-gray-950 font-sans">R$ {valTotalItem.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>

                            {/* Footer details */}
                            <div className="border border-black p-2 text-left">
                              <p className="font-extrabold text-[7.5px] uppercase text-gray-500 tracking-wider font-sans">INFORMAÇÕES COMPLEMENTARES</p>
                              <p className="text-[7px] text-gray-650 font-sans">EMITIDA CONFORME SEFAZ DO ESTADO DO PARÁ - HOMOLOGADA VIA PROCESSO SELETIVO MANUAL E CONTINGÊNCIA FINANCEIRA.</p>
                              <p className="text-[7px] text-gray-650 leading-tight font-sans">PREVISÃO DE TRANSPORTE E ENTREGA: {selectedNfPedido.previsao_entrega ? new Date(selectedNfPedido.previsao_entrega).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : 'EM DIAGNÓSTICO LOGÍSTICO'}.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full overflow-auto flex justify-center items-center p-4 bg-gray-50">
                        <img
                          src={selectedNfPedido.nf_anexo}
                          className="max-w-full max-h-full object-contain rounded-2xl shadow-xl border border-gray-250 cursor-pointer hover:scale-[1.01] transition-all"
                          alt="Nota Fiscal Imagem Anexada"
                          referrerPolicy="no-referrer"
                          onClick={() => setIsNfImageZoomed(true)}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  // GORGEOUS HIGHLY-DETAILED PHYSICAL DANFE SIMULATION SHEET WITH A REAL BARCODE AND SEFAZ STAMP OVERLAYS
                  <div className="w-full h-full overflow-y-auto bg-gray-250 p-4 sm:p-6 flex justify-center items-start scrollbar-thin">
                    <div id="nf-print-area" className="w-full max-w-3xl bg-white border border-gray-350 shadow-2xl relative p-6 font-mono text-[9px] text-gray-800 space-y-3 leading-tight select-none">
                      {/* SEFAZ Homologation Watermark */}
                      <div className="absolute right-12 top-1/3 -rotate-12 border-4 border-emerald-500/25 text-emerald-500/25 font-black text-3xl tracking-widest px-6 py-2 rounded-xl pointer-events-none uppercase">
                        Autorizada SEFAZ
                      </div>

                      {/* Dash-cut Receipt on Top */}
                      <div className="border border-black p-2 flex justify-between gap-4 items-center mb-1 text-left">
                        <div className="flex-1 text-left">
                          <p className="font-bold">
                            RECEBEMOS DE ESTÂNCIA NOVA OLINDA OS
                            PRODUTOS/SERVIÇOS CONSTANTES DA NOTA FISCAL INDICADA
                            AO LADO
                          </p>
                          <p className="mt-1 text-[8px] text-gray-500">
                            DATA DE RECEBIMENTO: _____/_____/_________ |
                            ASSINATURA E IDENTIFICAÇÃO DO RECEBEDOR:
                            __________________________________________________
                          </p>
                        </div>
                        <div className="text-center border-l border-black pl-4 h-full flex flex-col justify-center min-w-[120px]">
                          <p className="text-[10px] font-black">NF-e</p>
                          <p className="text-xs font-black text-gray-900 mt-1">
                            Nº {selectedNfPedido.nf_numero || "56123"}
                          </p>
                          <p className="text-[7px] text-gray-500 uppercase tracking-widest mt-0.5">
                            SÉRIE 1
                          </p>
                        </div>
                      </div>
                      <div className="border-t border-dashed border-gray-600 my-2 h-0"></div>

                      {/* Core DANFE Header info */}
                      <div className="grid grid-cols-1 md:grid-cols-3 border border-black text-left">
                        <div className="p-2 border-r border-black flex flex-col justify-between text-left">
                          <div>
                            <p className="font-extrabold text-xs text-gray-950">
                              ESTÂNCIA NOVA OLINDA
                            </p>
                            <p className="text-[8px] font-semibold text-gray-600 mt-0.5">
                              GRUPO ENO LTDA
                            </p>
                            <p className="text-[7.5px] text-gray-500 mt-1">
                              RODOVIA PA-150, KM 12 - ZONA RURAL
                            </p>
                            <p className="text-[7.5px] text-gray-500">
                              TAILÂNDIA - PARÁ - CEP: 68690-000
                            </p>
                            <p className="text-[7.5px] text-gray-500">
                              FONE: (91) 3752-1920
                            </p>
                          </div>
                        </div>
                        <div className="p-2 border-r border-black text-center flex flex-col justify-center min-w-[140px]">
                          <p className="font-black text-[12px] uppercase tracking-wide">
                            DANFE
                          </p>
                          <p className="text-[7px] text-gray-500">
                            Documento Auxiliar da Nota Fiscal Eletrônica
                          </p>
                          <div className="flex justify-around items-center mt-2.5 text-[8px] font-bold">
                            <div>
                              <p>0 - ENTRADA</p>
                              <p className="border border-black w-6 mx-auto mt-0.5 font-black text-center">
                                1
                              </p>
                              <p className="text-[7px]">1 - SAÍDA</p>
                            </div>
                            <div>
                              <p className="font-black">
                                Nº {selectedNfPedido.nf_numero || "56123"}
                              </p>
                              <p className="text-[7px] text-gray-500 font-bold uppercase mt-1">
                                SÉRIE: 1
                              </p>
                              <p className="text-[7px] text-gray-500 font-bold uppercase">
                                PÁGINA: 1/1
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="p-2 flex flex-col justify-between items-stretch text-left">
                          <div className="text-left">
                            <span className="block text-[7px] font-bold uppercase tracking-wider text-gray-400">
                              CHAVE DE ACESSO
                            </span>
                            <p className="font-black text-[9px] tracking-wider font-mono text-gray-900 break-all select-all text-left">
                              {(
                                selectedNfPedido.nf_chave ||
                                "3526 0512 3456 7800 0190 5500 1000 0" +
                                  (selectedNfPedido.nf_numero || "56123") +
                                  " 1002 9384 1029"
                              ).replace(/\s/g, "")}
                            </p>
                          </div>
                          <div className="mt-2 text-center flex flex-col items-center justify-center border-t border-black/10 pt-2 pointer-events-none">
                            {/* Beautiful CSS pure Barcode */}
                            <div className="h-6 flex items-stretch gap-0.5 bg-white px-2 pr-4">
                              <div className="w-[1.5px] bg-black"></div>
                              <div className="w-[3px] bg-black"></div>
                              <div className="w-[1px] bg-white"></div>
                              <div className="w-[1px] bg-black"></div>
                              <div className="w-[1.5px] bg-black"></div>
                              <div className="w-[2px] bg-white"></div>
                              <div className="w-[3px] bg-black"></div>
                              <div className="w-[1px] bg-black"></div>
                              <div className="w-[1.5px] bg-white"></div>
                              <div className="w-[2px] bg-black"></div>
                              <div className="w-[1px] bg-white"></div>
                              <div className="w-[4px] bg-black"></div>
                              <div className="w-[1.5px] bg-black"></div>
                              <div className="w-[1px] bg-white"></div>
                              <div className="w-[2.5px] bg-black"></div>
                              <div className="w-[1.5px] bg-black"></div>
                              <div className="w-[1px] bg-white"></div>
                              <div className="w-[1px] bg-black"></div>
                              <div className="w-[3.5px] bg-black"></div>
                              <div className="w-[2px] bg-white"></div>
                              <div className="w-[1.5px] bg-black"></div>
                            </div>
                            <p className="text-[7px] text-gray-400 mt-1">
                              Consulta de autenticidade no portal nacional da
                              NF-e
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Natureza da Operação e Protocolo */}
                      <div className="border border-black grid grid-cols-1 md:grid-cols-2 text-left">
                        <div className="p-1 border-r border-black text-left">
                          <span className="text-[7px] text-gray-400 block font-bold">
                            NATUREZA DA OPERAÇÃO
                          </span>
                          <span className="font-black text-[9px]">
                            Venda de produção do estabelecimento
                          </span>
                        </div>
                        <div className="p-1 text-left">
                          <span className="text-[7px] text-gray-400 block font-bold font-mono">
                            PROTOCOLO DE AUTORIZAÇÃO DE USO
                          </span>
                          <span className="font-extrabold text-[9px]">
                            135260029384910 -{" "}
                            {selectedNfPedido.nf_data_emissao
                              ? new Date(
                                  selectedNfPedido.nf_data_emissao,
                                ).toLocaleDateString("pt-BR", {
                                  timeZone: "UTC",
                                })
                              : new Date().toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                      </div>

                      {/* Destinatário */}
                      <div className="border border-black p-2 text-left">
                        <span className="block text-[8px] font-black text-gray-500 uppercase tracking-wider mb-1 text-left">
                          DESTINATÁRIO / REMETENTE
                        </span>
                        {(() => {
                          const cli = clientes.find(
                            (c) => c.id === selectedNfPedido.cliente_id,
                          );
                          return (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[9px] text-left">
                              <div className="md:col-span-2 text-left">
                                <span className="text-gray-400 text-[7px] block">
                                  NOME / RAZÃO SOCIAL
                                </span>
                                <span className="font-black text-gray-900 block">
                                  {cli?.razao_social ||
                                    "CONFERENTE DE CARGAS AGRÍCOLAS"}
                                </span>
                              </div>
                              <div className="text-left">
                                <span className="text-gray-400 text-[7px] block">
                                  CNPJ / CPF
                                </span>
                                <span className="font-black text-gray-900 block">
                                  {cli?.cnpj_cpf || "00.000.000/0001-00"}
                                </span>
                              </div>
                              <div className="text-left">
                                <span className="text-gray-400 text-[7px] block">
                                  DATA EMISSÃO
                                </span>
                                <span className="font-black text-gray-900 block">
                                  {selectedNfPedido.nf_data_emissao
                                    ? new Date(
                                        selectedNfPedido.nf_data_emissao,
                                      ).toLocaleDateString("pt-BR", {
                                        timeZone: "UTC",
                                      })
                                    : new Date().toLocaleDateString("pt-BR")}
                                </span>
                              </div>
                              <div className="md:col-span-2 text-left">
                                <span className="text-gray-400 text-[7px] block">
                                  ENDEREÇO
                                </span>
                                <span className="font-bold text-gray-800 block text-left truncate">
                                  {cli?.endereco ||
                                    "Zona Industrial Rural Central, S/N"}
                                </span>
                              </div>
                              <div className="text-left">
                                <span className="text-gray-400 text-[7px] block">
                                  BAIRRO / DISTRITO
                                </span>
                                <span className="font-bold text-gray-800 block text-left truncate">
                                  {cli?.bairro || "Centro"}
                                </span>
                              </div>
                              <div className="text-left">
                                <span className="text-gray-400 text-[7px] block">
                                  CIDADES - UF
                                </span>
                                <span className="font-bold text-gray-800 block text-left truncate">
                                  {cli?.cidade || "Altamira"} -{" "}
                                  {cli?.estado || "PA"}
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Imposto Calculado */}
                      {(() => {
                        const totalVal =
                          selectedNfPedido.nf_valor_total !== undefined
                            ? selectedNfPedido.nf_valor_total
                            : selectedNfPedido.valor_total;
                        return (
                          <div className="border border-black p-2 text-left">
                            <span className="block text-[8px] font-black text-gray-500 uppercase tracking-wider mb-1">
                              CÁLCULO DO IMPOSTO
                            </span>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[9px] text-left">
                              <div className="text-left">
                                <span className="text-gray-400 text-[7px] block">
                                  BASE DE CÁLCULO ICMS
                                </span>
                                <span className="font-extrabold block text-left">
                                  R${" "}
                                  {(totalVal * 0.18).toLocaleString("pt-BR", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                              </div>
                              <div className="text-left">
                                <span className="text-gray-400 text-[7px] block">
                                  VALOR DO ICMS
                                </span>
                                <span className="font-extrabold block text-left">
                                  R${" "}
                                  {(totalVal * 0.05).toLocaleString("pt-BR", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                              </div>
                              <div className="text-left">
                                <span className="text-gray-400 text-[7px] block">
                                  VALOR DO FRETE
                                </span>
                                <span className="font-bold block text-left">
                                  R$ 0,00
                                </span>
                              </div>
                              <div className="text-left bg-emerald-50 p-1 border border-emerald-200 rounded">
                                <span className="text-emerald-800 text-[7px] block font-black font-sans">
                                  VALOR TOTAL DA NOTA
                                </span>
                                <span className="font-black text-[10px] text-emerald-950 block text-left">
                                  R${" "}
                                  {totalVal.toLocaleString("pt-BR", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Table Items */}
                      <div className="border border-black text-left">
                        <div className="p-1 px-2 border-b border-black bg-gray-50 font-sans">
                          <span className="text-[7.5px] font-black uppercase text-gray-500 tracking-wider">
                            DADOS DOS PRODUTOS / SERVIÇOS
                          </span>
                        </div>
                        <table className="w-full text-left font-mono text-[8px] leading-tight border-collapse">
                          <thead>
                            <tr className="border-b border-black text-left font-black">
                              <th className="p-1 border-r border-black text-left w-14">
                                CÓD. PROD.
                              </th>
                              <th className="p-1 border-r border-black text-left">
                                DESCRIÇÃO DOS PRODUTOS
                              </th>
                              <th className="p-1 border-r border-black text-center w-8">
                                UNID.
                              </th>
                              <th className="p-1 border-r border-black text-center w-10">
                                QTD.
                              </th>
                              <th className="p-1 border-r border-black text-right w-14">
                                V. UNITÁRIO
                              </th>
                              <th className="p-1 text-right w-16">
                                VALOR TOTAL
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-black/10">
                            {selectedNfPedido.items.map((it, ind) => {
                              const p = produtos.find(
                                (prod) => prod.id === it.produto_id,
                              );
                              const valTotalItem = it.quantidade * it.preco;
                              return (
                                <tr key={ind}>
                                  <td className="p-1 border-r border-black font-bold text-left">
                                    {p?.codigo ||
                                      p?.id.substring(0, 5).toUpperCase() ||
                                      "PRD-01"}
                                  </td>
                                  <td className="p-1 border-r border-black font-extrabold text-left text-gray-900">
                                    {p?.nome ||
                                      "Insumo de Mandioca / Farinha Integral"}
                                  </td>
                                  <td className="p-1 border-r border-black text-center uppercase">
                                    {p?.unidade || "Un"}
                                  </td>
                                  <td className="p-1 border-r border-black text-center">
                                    {it.quantidade}
                                  </td>
                                  <td className="p-1 border-r border-black text-right">
                                    R${" "}
                                    {it.preco.toLocaleString("pt-BR", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}
                                  </td>
                                  <td className="p-1 text-right font-black text-gray-950">
                                    R${" "}
                                    {valTotalItem.toLocaleString("pt-BR", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Footer details */}
                      <div className="border border-black p-2 text-left">
                        <p className="font-extrabold text-[7.5px] uppercase text-gray-500 tracking-wider font-sans">
                          INFORMAÇÕES COMPLEMENTARES
                        </p>
                        <p className="text-[7px] text-gray-650">
                          EMITIDA CONFORME SEFAZ DO ESTADO DO PARÁ - HOMOLOGADA
                          VIA PROCESSO SELETIVO MANUAL E CONTINGÊNCIA
                          FINANCEIRA.
                        </p>
                        <p className="text-[7px] text-gray-650 leading-tight">
                          PREVISÃO DE TRANSPORTE E ENTREGA:{" "}
                          {selectedNfPedido.previsao_entrega
                            ? new Date(
                                selectedNfPedido.previsao_entrega,
                              ).toLocaleDateString("pt-BR", { timeZone: "UTC" })
                            : "EM DIAGNÓSTICO LOGÍSTICO"}
                          .
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-8 font-sans space-y-6 text-left scrollbar-thin">
                {/* NF Access Key block */}
                <div className="border border-gray-300 rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 text-left">
                  <div className="md:col-span-2 text-left">
                    <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest text-left font-sans">
                      Chave de Acesso
                    </span>
                    <span className="font-mono text-xs font-bold text-gray-800 tracking-wider text-left break-all block">
                      {selectedNfPedido.nf_chave ||
                        "3526 0512 3456 7800 0190 5500 1000 0" +
                          (selectedNfPedido.nf_numero || "28374") +
                          " 1002 9384 1029"}
                    </span>
                  </div>
                  <div className="text-left font-sans">
                    <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest text-left">
                      Número da Nota Fiscal
                    </span>
                    <span className="text-xs font-black text-emerald-800 block text-left">
                      {selectedNfPedido.nf_numero || "56123"}
                    </span>
                  </div>
                </div>

                {/* Issuer and Receiver grids */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left font-sans">
                  <div className="border border-gray-200 rounded-lg p-4 text-left">
                    <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 text-left">
                      Emitente
                    </span>
                    <p className="font-black text-sm text-gray-900 text-left">
                      ESTÂNCIA NOVA OLINDA
                    </p>
                    <p className="text-xs text-gray-600 font-medium text-left">
                      GRUPO ENO LTDA
                    </p>
                    <p className="text-[11px] text-gray-500 mt-2 font-semibold text-left">
                      CNPJ: 12.345.678/0001-90
                    </p>
                    <p className="text-[11px] text-gray-500 font-medium text-left">
                      Insc. Estadual: 394.810.239.110
                    </p>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4 text-left">
                    <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 text-left">
                      Destinatário / Remetente
                    </span>
                    {(() => {
                      const cli = clientes.find(
                        (c) => c.id === selectedNfPedido.cliente_id,
                      );
                      return (
                        <div className="text-left">
                          <p className="font-black text-sm text-gray-900 text-left">
                            {cli?.razao_social || "Desconhecido"}
                          </p>
                          <p className="text-xs text-gray-600 font-medium text-left">
                            Fantasia: {cli?.nome_fantasia || "N/A"}
                          </p>
                          <p className="text-[11px] text-gray-500 mt-2 font-semibold text-left">
                            CNPJ/CPF: {cli?.cnpj_cpf || "00.000.000/0001-00"}
                          </p>
                          <p className="text-[11px] text-gray-500 font-medium text-left">
                            Cidade/UF: {cli?.cidade || "N/A"} -{" "}
                            {cli?.estado || "SP"}
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Factoring and values summaries */}
                {(() => {
                  const totalVal =
                    selectedNfPedido.nf_valor_total !== undefined
                      ? selectedNfPedido.nf_valor_total
                      : selectedNfPedido.valor_total;
                  return (
                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50 text-left font-sans">
                      <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 text-left bg-transparent">
                        Cálculo do Imposto
                      </span>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-bold text-gray-700 text-left bg-transparent">
                        <div className="text-left bg-transparent">
                          <span className="block text-[9px] font-bold text-gray-400 text-left">
                            Base do Cálculo ICMS
                          </span>
                          <span className="block text-left">
                            R${" "}
                            {(totalVal * 0.18).toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                        <div className="text-left bg-transparent">
                          <span className="block text-[9px] font-bold text-gray-400 text-left">
                            Valor do ICMS
                          </span>
                          <span className="block text-left">
                            R${" "}
                            {(totalVal * 0.05).toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                        <div className="text-left bg-transparent flex flex-col justify-center">
                          <span className="block text-[9px] font-bold text-gray-400 text-left font-sans font-bold">
                            Valor do Frete
                          </span>
                          <span className="block text-left">R$ 0,00</span>
                        </div>
                        <div className="text-left bg-transparent flex flex-col justify-center">
                          <span className="block text-[9px] font-bold text-gray-400 text-left font-black">
                            Total da Nota
                          </span>
                          <span className="text-emerald-700 font-black block text-left">
                            R${" "}
                            {totalVal.toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Products Grid */}
                <div className="border border-gray-200 rounded-lg overflow-hidden text-left bg-white font-sans">
                  <table className="w-full text-left border-collapse bg-white">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-200 text-[10px] font-black text-gray-400 uppercase tracking-wider text-left">
                        <th className="p-3 text-left">Código</th>
                        <th className="p-3 text-left">Descrição do Produto</th>
                        <th className="p-3 text-center w-12">Unidade</th>
                        <th className="p-3 text-center w-16">Quantidade</th>
                        <th className="p-3 text-right w-24">Preço Unitário</th>
                        <th className="p-3 text-right w-28 font-black">
                          Valor Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-xs text-gray-800 font-medium bg-white">
                      {selectedNfPedido.items.map((it, ind) => {
                        const p = produtos.find(
                          (prod) => prod.id === it.produto_id,
                        );
                        return (
                          <tr
                            key={ind}
                            className="hover:bg-gray-50/50 bg-white"
                          >
                            <td className="p-3 font-mono text-gray-500 text-left">
                              {p?.codigo || p?.id.substring(0, 6).toUpperCase()}
                            </td>
                            <td className="p-3 font-bold text-gray-900 text-left">
                              {p?.nome || "Insumo de Mandioca"}
                            </td>
                            <td className="p-3 text-center uppercase">
                              {p?.unidade || "Un"}
                            </td>
                            <td className="p-3 text-center">{it.quantidade}</td>
                            <td className="p-3 text-right">
                              R${" "}
                              {it.preco.toLocaleString("pt-BR", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                            <td className="p-3 text-right font-bold text-gray-900">
                              R${" "}
                              {(it.quantidade * it.preco).toLocaleString(
                                "pt-BR",
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                },
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Iniciar Produção Modal */}
      {isProduzirModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-primary/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-[32px] shadow-2xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto scale-in">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 block">Processo de Fabricação</span>
                <h3 className="text-xl font-black text-gray-900 mt-1">Iniciar Produção</h3>
              </div>
              <button
                onClick={() => setIsProduzirModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                title="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-6 p-4 bg-gray-50 rounded-2xl border border-gray-100 text-xs">
              <p className="text-gray-400 font-bold uppercase tracking-wider">Pedido selecionado</p>
              <h4 className="text-sm font-black text-gray-950 mt-1">
                #{produzirPedidoId?.toUpperCase().substring(0, 11)}
              </h4>
              {(() => {
                const ped = pedidos.find(p => p.id === produzirPedidoId);
                const cli = ped ? clientes.find(c => c.id === ped.cliente_id) : null;
                const cliName = cli ? (cli.nome_fantasia || cli.razao_social) : "Cliente Desconhecido";
                return (
                  <div className="mt-2 text-gray-600 font-medium">
                    <p>Cliente: <span className="font-bold text-gray-900">{cliName}</span></p>
                    <p className="mt-2 font-bold text-gray-700">Produtos no lote:</p>
                    <ul className="list-disc leading-relaxed list-inside pl-1 mt-1 text-gray-500">
                      {ped?.items.map((it, idx) => {
                        const prod = produtos.find(p => p.id === it.produto_id);
                        return (
                          <li key={idx} className="truncate">
                            {it.quantidade}x {prod?.nome || "Mandioca"}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })()}
            </div>

            <div className="space-y-4">
              {/* LOTE CODE */}
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1.5">
                  Identificador do Lote <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={loteCodigo}
                    onChange={(e) => setLoteCodigo(e.target.value)}
                    placeholder="Ex: LOT-230526-781"
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-4 pr-16 py-2.5 text-sm font-semibold outline-none focus:border-primary transition-all text-gray-950 placeholder-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      const datePart = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getFullYear()).substring(2)}`;
                      const rndPart = Math.floor(100 + Math.random() * 900);
                      setLoteCodigo(`LOT-${datePart}-${rndPart}`);
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
                  value={dataFabricacao}
                  onChange={(e) => setDataFabricacao(e.target.value)}
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
                  value={dataVencimento}
                  onChange={(e) => setDataVencimento(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-primary transition-all text-gray-950"
                />
              </div>
            </div>

            {/* Modal Controls */}
            <div className="flex gap-3 mt-8">
              <button
                type="button"
                onClick={() => setIsProduzirModalOpen(false)}
                className="flex-1 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-500 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all border border-gray-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmProduzir}
                disabled={!dataFabricacao || !dataVencimento || !loteCodigo.trim()}
                className="flex-1 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm"
              >
                Iniciar Produção
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {isConfirmOpen.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-primary/40 backdrop-blur-sm animate-fadeIn">
          <div
            className={`bg-white rounded-[28px] shadow-2xl p-6 w-full ${isConfirmOpen.type === "Faturar" ? "max-w-2xl text-left" : "max-w-sm"} max-h-[90vh] overflow-y-auto scale-in`}
          >
            <h3 className="text-lg font-black text-gray-900 mb-1">
              Faturamento Comercial
            </h3>
            <p className="text-xs font-semibold text-gray-500 mb-4">
              {isConfirmOpen.message}
            </p>

            {isConfirmOpen.type === "Faturar" ? (
              (() => {
                const currentPed = pedidos.find(
                  (p) => p.id === isConfirmOpen.pedId,
                );
                const currentCli = currentPed
                  ? clientes.find((c) => c.id === currentPed.cliente_id)
                  : null;

                const pedidoVal = currentPed?.valor_total || 0;
                const notaVal = inputValorTotal !== null ? inputValorTotal : 0;
                const valMatches = Math.abs(pedidoVal - notaVal) < 0.05;

                return (
                  <div className="space-y-4 animate-fadeIn text-left mt-3">
                    {/* 1. DADOS DO PEDIDO DE SISTEMA */}
                    <div className="bg-blue-50/70 border border-blue-100 p-3.5 rounded-2xl relative text-left">
                      <span className="block text-[8px] font-black text-blue-800 uppercase tracking-widest mb-1 text-left">
                        Dados do Pedido (Sistema)
                      </span>
                      <div className="flex justify-between items-center gap-4 text-left">
                        <div className="text-left">
                          <p className="font-extrabold text-xs text-gray-900 line-clamp-1 text-left">
                            {currentCli?.razao_social || "Cliente não definido"}
                          </p>
                          <p className="text-[9px] text-gray-500 font-bold mt-0.5 text-left">
                            Nº do Pedido: #
                            {currentPed?.id.split("_")[1] ||
                              currentPed?.id.substring(0, 6)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="block text-[8px] font-bold text-gray-400 uppercase tracking-wider text-right">
                            Valor no Sistema
                          </span>
                          <span className="text-xs font-black text-blue-700 block">
                            R$ {pedidoVal.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 2. AREA DE ANEXAR DANFE */}
                    <div className="border border-emerald-100 bg-emerald-50/50 rounded-2xl p-4 text-center hover:bg-emerald-100/35 transition-all text-left">
                      {isAnalyzingNf ? (
                        <div className="flex flex-col items-center justify-center py-4 space-y-3">
                          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                          <div className="text-center">
                            <p className="text-xs font-extrabold text-emerald-800 tracking-tight flex items-center justify-center gap-1">
                              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping text-[10px]"></span>
                              Analisando com IA...
                            </p>
                            <p className="text-[10px] font-bold text-gray-400 mt-1">
                              Lendo PDF/DANFE e calculando paridade
                              financeira...
                            </p>
                          </div>
                        </div>
                      ) : pendingFile ? (
                        <div className="flex flex-col items-center justify-center py-1 space-y-3 mx-auto max-w-xs text-center">
                          <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 mx-auto">
                            <FileText size={16} />
                          </div>
                          <div className="text-center w-full px-2">
                            <p className="text-xs font-extrabold text-gray-850 break-all">
                              {pendingFile.name}
                            </p>
                            <p className="text-[9px] font-bold text-gray-400 mt-0.5">
                              Tamanho: {(pendingFile.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                          <div className="flex gap-2 w-full pt-1">
                            <button
                              type="button"
                              onClick={handleLoadNfFile}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] py-2 px-3 rounded-lg transition-all shadow-md flex items-center justify-center gap-1.5"
                            >
                              <Play size={10} fill="white" /> Carregar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPendingFile(null);
                                setExtractedNfData(null);
                                setUploadedNfBase64("");
                                setInputValorTotal(null);
                              }}
                              className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-[11px] py-2 px-3 rounded-lg transition-all"
                            >
                              Limpar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label className="cursor-pointer block text-center py-2">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mx-auto">
                              <FileInput size={20} />
                            </div>
                            <div>
                              <p className="text-xs font-black text-gray-750">
                                Selecione o DANFE (PDF ou Imagem)
                              </p>
                              <p className="text-[10px] font-bold text-gray-400 mt-1 max-w-sm mx-auto">
                                Importe o comprovante de faturamento comercial
                                para conferir os dados automaticamente.
                              </p>
                            </div>
                          </div>
                          <input
                            type="file"
                            accept=".pdf,image/*,.xml,.txt"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>

                    {nfAnalysisError && (
                      <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-[11px] font-bold text-red-600 text-left">
                        {nfAnalysisError}
                      </div>
                    )}

                    {/* 3. PAINEL DE CONFERENCIA MUTUA (SE HOUVER DADOS EXTRAIDOS) */}
                    {extractedNfData && (
                      <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl space-y-2.5 text-xs font-bold text-gray-700 animate-slideDown text-left">
                        <p className="text-[9px] font-black text-emerald-950 uppercase tracking-widest flex items-center gap-1 text-left">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                          Paridade de Valores e Conferência de Faturamento:
                        </p>

                        <div className="grid grid-cols-2 gap-3 bg-white p-2.5 rounded-xl border border-gray-100 shadow-xs text-left">
                          <div className="text-left">
                            <span className="text-gray-400 text-[8px] uppercase tracking-wide block">
                              Valor do Pedido (Sistema)
                            </span>
                            <span className="block text-gray-950 font-black text-xs">
                              R$ {pedidoVal.toFixed(2)}
                            </span>
                          </div>
                          <div className="text-left">
                            <span className="text-gray-400 text-[8px] uppercase tracking-wide block">
                              Valor da Nota
                            </span>
                            <span className="block text-emerald-800 font-black text-xs">
                              R${" "}
                              {inputValorTotal !== null
                                ? inputValorTotal.toFixed(2)
                                : "---"}
                            </span>
                          </div>
                        </div>

                        {valMatches ? (
                          <div className="flex items-center gap-1.5 bg-emerald-100/60 border border-emerald-350 text-emerald-950 p-2 rounded-xl text-[10px] font-extrabold text-left">
                            <CheckCircle
                              size={13}
                              className="text-emerald-750 shrink-0"
                            />
                            <span>
                              Os valores conferem perfeitamente no sistema!
                              Faturamento liberado com segurança.
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-start gap-1.5 bg-amber-50 border border-amber-300 text-amber-950 p-2 rounded-xl text-[9px] text-left">
                            <AlertTriangle
                              size={14}
                              className="text-amber-600 shrink-0 mt-0.5"
                            />
                            <div>
                              <span className="font-extrabold block text-amber-900 text-left">
                                Divergência de Valores Detectada!
                              </span>
                              <span className="font-semibold text-gray-650 text-[9px] leading-tight block mt-0.5 text-left">
                                O valor da Nota Fiscal comercial difere em R${" "}
                                {Math.abs(
                                  pedidoVal - (inputValorTotal || 0),
                                ).toFixed(2)}{" "}
                                do pedido do sistema. Certique-se de que os
                                dados estão corretos antes de avançar.
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 3.1 FORMA DE PAGAMENTO E LIMITE DE RECEBIMENTO DA NF */}
                    {extractedNfData && (
                      <div className="p-4 bg-emerald-50/70 border border-emerald-150 rounded-2xl space-y-3 text-xs font-bold text-gray-700 animate-slideDown text-left">
                        <span className="block text-[8px] font-black text-emerald-800 uppercase tracking-widest text-left">
                          Condições Financeiras e Quitação da NF
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                          <div className="text-left">
                            <label className="text-[9px] font-black text-gray-500 uppercase block mb-1 text-left">
                              Forma de Pagamento
                            </label>
                            <select
                              value={inputFormaPagamentoNf}
                              onChange={(e) => setInputFormaPagamentoNf(e.target.value)}
                              className="w-full bg-white border border-gray-250 rounded-xl px-3 py-2 text-xs font-black text-gray-950 outline-none focus:border-emerald-500 transition-all cursor-pointer"
                            >
                              <option value="Dinheiro">Dinheiro</option>
                              <option value="Pix">Pix</option>
                              <option value="Boleto">Boleto</option>
                              <option value="Bonificação">Bonificação</option>
                            </select>
                          </div>
                          <div className="text-left">
                            <label className="text-[9px] font-black text-gray-500 uppercase block mb-1 text-left">
                              Data Limite do Pagamento
                            </label>
                            <input
                              type="date"
                              required
                              value={inputDataPagamentoNf}
                              onChange={(e) => setInputDataPagamentoNf(e.target.value)}
                              className="w-full bg-white border border-gray-250 rounded-xl px-3 py-2 text-xs font-bold text-gray-950 outline-none focus:border-emerald-500 transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* FORM DADOS DA NOTA - DISPONIVEL PARA PREENCHIMENTO E AJUSTES */}
                    <div className="space-y-3 bg-gray-50 border border-gray-200 p-3.5 rounded-2xl text-left">
                      <span className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 text-left">
                        Dados da Nota Fiscal Comercial
                      </span>

                      <div className="grid grid-cols-2 gap-3 text-left">
                        <div className="text-left">
                          <label className="text-[8px] font-black text-gray-500 uppercase block mb-1 text-left">
                            Nº Nota Fiscal (NF-e)
                          </label>
                          <input
                            type="text"
                            value={inputNfNumero}
                            disabled={true}
                            readOnly={true}
                            className="w-full bg-gray-100/75 border border-gray-300 rounded-xl px-3 py-1.5 text-xs font-black outline-none text-gray-900 cursor-not-allowed select-all"
                            placeholder={
                              !extractedNfData
                                ? "Aguardando análise de DANFE..."
                                : "Não extraído"
                            }
                          />
                        </div>
                        <div className="text-left">
                          <label className="text-[8px] font-black text-gray-500 uppercase block mb-1 text-left">
                            Data de Emissão
                          </label>
                          <input
                            type="text"
                            value={
                              inputDataEmissao
                                ? inputDataEmissao.split("-").reverse().join("/")
                                : ""
                            }
                            disabled={true}
                            readOnly={true}
                            className="w-full bg-gray-100/75 border border-gray-300 rounded-xl px-3 py-1.5 text-xs font-bold outline-none text-gray-900 cursor-not-allowed select-all"
                            placeholder={
                              !extractedNfData
                                ? "Aguardando análise de DANFE..."
                                : "Não extraída"
                            }
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                        <div className="text-left">
                          <label className="text-[8px] font-black text-gray-500 uppercase block mb-1 text-left">
                            Valor Total da Nota (R$)
                          </label>
                          <input
                            type="text"
                            value={
                              inputValorTotal !== null
                                ? inputValorTotal.toLocaleString("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                  })
                                : ""
                            }
                            disabled={true}
                            readOnly={true}
                            className="w-full bg-gray-100/75 border border-gray-300 rounded-xl px-3 py-1.5 text-xs font-black outline-none text-emerald-800 cursor-not-allowed select-all"
                            placeholder={
                              !extractedNfData
                                ? "Aguardando análise de DANFE..."
                                : "R$ 0,00"
                            }
                          />
                        </div>
                        <div className="text-left">
                          <label className="text-[8px] font-black text-gray-500 uppercase block mb-1 text-left">
                            Chave de Acesso (44 dígitos)
                          </label>
                          <input
                            type="text"
                            value={inputChaveAcesso}
                            disabled={true}
                            readOnly={true}
                            className="w-full bg-gray-100/75 border border-gray-300 rounded-xl px-3 py-1.5 text-[10px] font-mono font-bold outline-none text-gray-900 cursor-not-allowed select-all break-all"
                            placeholder={
                              !extractedNfData
                                ? "Aguardando análise de DANFE..."
                                : "Não extraída"
                            }
                            maxLength={44}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 pt-2 text-center">
                      <button
                        onClick={() => handleConfirmFaturamento(true)}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-md shadow-emerald-250"
                      >
                        Sim, Registrar com esta NF
                      </button>
                      <button
                        onClick={() => handleConfirmFaturamento(false)}
                        className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-bold text-xs hover:bg-gray-200 transition-all"
                      >
                        Faturar agora e preencher NF depois
                      </button>
                      <button
                        onClick={() => setIsConfirmOpen({ isOpen: false })}
                        className="w-full bg-white border border-gray-200 text-gray-500 py-2.5 rounded-xl font-bold text-xs hover:bg-gray-50 transition-all text-center"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                );
              })()
            ) : (
              <button
                onClick={() => setIsConfirmOpen({ isOpen: false })}
                className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 transition-all"
              >
                OK
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4. MODAL DE SELECAO DE DESPESAS SEGUINTES AO FATURAMENTO */}
      {faturamentoExpenseStep.isOpen && faturamentoExpenseStep.pedId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-[32px] shadow-2xl p-8 w-full max-w-md scale-in text-left">
            <h3 className="text-lg font-black text-gray-900 mb-2">
              Inserir Despesas Automáticas?
            </h3>
            <p className="text-xs font-semibold text-gray-500 mb-5 leading-normal">
              O pedido do sistema possui custos detalhados configurados. Deseja já incluir as despesas variáveis como <strong>Imposto</strong>, <strong>Frete</strong> e <strong>Comissão</strong> deste faturamento no seu Histórico de Despesas?
            </p>

            {(() => {
              const ped = pedidos.find(p => p.id === faturamentoExpenseStep.pedId);
              const costs = ped ? getExpensesForPedido(ped) : { imposto_total: 0, frete_total: 0, comissao_total: 0 };
              return (
                <div className="bg-rose-50/50 border border-rose-100 p-4 rounded-2xl mb-6 space-y-2 text-xs">
                  <span className="block text-[8px] font-black text-rose-950 uppercase tracking-widest mb-1">
                    Lançamentos a serem gerados:
                  </span>
                  {costs.imposto_total > 0 && (
                    <div className="flex justify-between font-bold text-gray-700">
                      <span>Imposto (Variável)</span>
                      <span className="text-rose-700 font-mono font-bold">R$ {costs.imposto_total.toFixed(2)}</span>
                    </div>
                  )}
                  {costs.frete_total > 0 && (
                    <div className="flex justify-between font-bold text-gray-700">
                      <span>Frete (Variável)</span>
                      <span className="text-rose-700 font-mono font-bold">R$ {costs.frete_total.toFixed(2)}</span>
                    </div>
                  )}
                  {costs.comissao_total > 0 && (
                    <div className="flex justify-between font-bold text-gray-700">
                      <span>Comissão do Representante</span>
                      <span className="text-rose-700 font-mono font-bold">R$ {costs.comissao_total.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="flex flex-col gap-2">
              <button
                onClick={() =>
                  executeFinalFaturamento(
                    faturamentoExpenseStep.pedId!,
                    !!faturamentoExpenseStep.comNota,
                    true,
                    faturamentoExpenseStep.nfNumero,
                    faturamentoExpenseStep.nfChave,
                    faturamentoExpenseStep.nfValorTotal,
                    faturamentoExpenseStep.nfDataEmissao,
                    faturamentoExpenseStep.nfAnexo,
                    faturamentoExpenseStep.formaPagamentoNf,
                    faturamentoExpenseStep.dataPagamentoNf
                  )
                }
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-md"
              >
                Sim, Incluir Despesas no Histórico
              </button>
              <button
                onClick={() =>
                  executeFinalFaturamento(
                    faturamentoExpenseStep.pedId!,
                    !!faturamentoExpenseStep.comNota,
                    false,
                    faturamentoExpenseStep.nfNumero,
                    faturamentoExpenseStep.nfChave,
                    faturamentoExpenseStep.nfValorTotal,
                    faturamentoExpenseStep.nfDataEmissao,
                    faturamentoExpenseStep.nfAnexo,
                    faturamentoExpenseStep.formaPagamentoNf,
                    faturamentoExpenseStep.dataPagamentoNf
                  )
                }
                className="w-full bg-gray-105 hover:bg-gray-200 text-gray-750 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
              >
                Não, Apenas faturar o pedido
              </button>
              <button
                onClick={() => setFaturamentoExpenseStep({ isOpen: false })}
                className="w-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-400 py-2.5 rounded-xl font-semibold text-xs tracking-wide transition-all text-center"
              >
                Cancelar Faturamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PedidosOrcamentos;
