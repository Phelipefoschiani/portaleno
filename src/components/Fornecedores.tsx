import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import React, { useState, useMemo } from 'react';
import { useGlobalState } from '../GlobalStateContext';
import { Fornecedor, CompraMandioca } from '../types';
import { Search, Plus, Edit2, X, Factory, Trash2, AlertTriangle, FileText, ShoppingCart, History, Calendar, Calculator, CheckCircle2 } from 'lucide-react';

const Fornecedores: React.FC<{ empresa?: string }> = ({ empresa }) => {
  const { fornecedores, addFornecedor, updateFornecedor, deleteFornecedor, comprasMandioca, addCompraMandioca, updateCompraMandioca, deleteCompraMandioca } = useGlobalState();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [activeModal, setActiveModal] = useState<'none' | 'form' | 'compra' | 'historico' | 'analise' | 'relatorio' | 'ordemCompra' | 'relatorioOrdem'>('none');

  const [relatorioOrdem, setRelatorioOrdem] = useState({
     ordem_id: '',
     fornecedor_id: '',
     total_recebido: 0,
     pesagens: [] as number[],
     tipo_pesagem: 'total'
  });
  const [editingFornecedor, setEditingFornecedor] = useState<Fornecedor | null>(null);
  const [selectedFornecedorId, setSelectedFornecedorId] = useState<string>('');
  const [selectedCompraId, setSelectedCompraId] = useState<string>('');
  const [deleteStep, setDeleteStep] = useState<'none' | 'first' | 'second'>('none');
  const [compraToDelete, setCompraToDelete] = useState<string | null>(null);

  // Form states - Fornecedor
  const [formData, setFormData] = useState<Partial<Fornecedor>>({
    nome: '', telefone: '', rua_linha: '', numero: '', cidade: '', estado: '', ponto_referencia: '', contato_secundario: ''
  });

  // Form states - Compra
  const [compraForm, setCompraForm] = useState<{
    fornecedor_id: string; data: string; tipo_pesagem: 'sacos' | 'total'; pesoInput: string; sacos: string[]; preco_quilo: string; ordem_compra_id?: string;
  }>({
    fornecedor_id: '', data: new Date().toISOString().split('T')[0], tipo_pesagem: 'sacos', pesoInput: '', sacos: [''], preco_quilo: '1.25'
  });

  // Form states - Analise
  
  const [ordemCompraForm, setOrdemCompraForm] = useState({
    fornecedor_id: '',
    quantidade_total: '',
    data: new Date().toISOString().split('T')[0]
  });

  const [analiseForm, setAnaliseForm] = useState<{casca_kg: string; destopo_kg: string}>({casca_kg: '', destopo_kg: ''});

  // Form states - Relatorio
  const [relatorioForm, setRelatorioForm] = useState<{ano: string; mes: string; fornecedores: string[]; agrupamento: 'fornecedor' | 'pedido'}>({
    ano: new Date().getFullYear().toString(), mes: 'Todos', fornecedores: [], agrupamento: 'fornecedor'
  });

  if (empresa !== 'estancia') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-white rounded-3xl border border-gray-100 shadow-sm p-8 text-center">
        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
          <Factory size={40} className="text-gray-300" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-2">Empresa em Configuração</h2>
        <p className="text-gray-500 max-w-md font-medium">
          O painel de Fornecedores de Mandioca está disponível apenas para a Estância Nova Olinda.
        </p>
      </div>
    );
  }

  // Derived state
  const filteredFornecedores = useMemo(() => {
    if (!searchTerm) return fornecedores;
    const lower = searchTerm.toLowerCase();
    return fornecedores.filter(f => 
      f.nome.toLowerCase().includes(lower) || f.cidade.toLowerCase().includes(lower)
    );
  }, [fornecedores, searchTerm]);

  // Handlers - Fornecedor Form
  const openFormModal = (f?: Fornecedor) => {
    if (f) {
      setEditingFornecedor(f);
      setFormData(f);
    } else {
      setEditingFornecedor(null);
      setFormData({nome: '', telefone: '', rua_linha: '', numero: '', cidade: '', estado: '', ponto_referencia: '', contato_secundario: ''});
    }
    setActiveModal('form');
  };

  const handleSaveFornecedor = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingFornecedor) {
      updateFornecedor(editingFornecedor.id, formData as Fornecedor);
    } else {
      addFornecedor(formData as Fornecedor);
    }
    setActiveModal('none');
  };

  const handleDeleteClick = () => setDeleteStep('first');
  const confirmDeleteFirst = () => {
    if (!editingFornecedor) return;
    const hasData = comprasMandioca.some(c => c.fornecedor_id === editingFornecedor.id);
    if (hasData) {
      setDeleteStep('second');
    } else {
      deleteFornecedor(editingFornecedor.id);
      setActiveModal('none');
      setDeleteStep('none');
    }
  };
  const executeDelete = () => {
    if (editingFornecedor) {
      deleteFornecedor(editingFornecedor.id);
      setActiveModal('none');
      setDeleteStep('none');
    }
  };

  // Handlers - Compra
    const openCompraModal = () => {
    setCompraForm({
      fornecedor_id: '',
      data: new Date().toISOString().split('T')[0],
      tipo_pesagem: 'sacos',
      pesoInput: '',
      sacos: [''],
      preco_quilo: '1.25',
      ordem_compra_id: ''
    } as any);
    setActiveModal('compra');
  };

  const handleSacoChange = (idx: number, val: string) => {
    const updated = [...compraForm.sacos];
    updated[idx] = val;
    setCompraForm({...compraForm, sacos: updated});
  };

  const addSaco = () => setCompraForm({...compraForm, sacos: [...compraForm.sacos, '']});
  const removeSaco = (idx: number) => {
    const updated = compraForm.sacos.filter((_, i) => i !== idx);
    setCompraForm({...compraForm, sacos: updated});
  };

  const currentTotalCompra = useMemo(() => {
    if (compraForm.tipo_pesagem === 'total') return Number(compraForm.pesoInput) || 0;
    return compraForm.sacos.reduce((acc, curr) => acc + (Number(curr) || 0), 0);
  }, [compraForm]);

    const handleSaveCompra = (e: React.FormEvent) => {
    e.preventDefault();
    if (!compraForm.fornecedor_id) return alert('Selecione um fornecedor.');
    
    let total = 0;
    let pesagens: number[] = [];
    if (compraForm.tipo_pesagem === 'total') {
      total = Number(compraForm.pesoInput);
    } else {
      pesagens = compraForm.sacos.map(Number).filter(n => !isNaN(n));
      total = pesagens.reduce((sum, n) => sum + n, 0);
    }
    if (total <= 0) return alert('Insira pesos válidos.');
    
    const prq = Number(compraForm.preco_quilo) || 1.25;

    addCompraMandioca({
      fornecedor_id: compraForm.fornecedor_id,
      data: compraForm.data,
      tipo_pesagem: compraForm.tipo_pesagem,
      pesagens_sacos: pesagens,
      quantidade_total: total,
      status_pagamento: 'Pendente',
      casca_kg: 0,
      destopo_kg: 0,
      preco_quilo: prq,
      valor_total: total * prq,
      ordem_compra_id: compraForm.ordem_compra_id || undefined
    });

    if (compraForm.ordem_compra_id) {
       updateCompraMandioca(compraForm.ordem_compra_id, { status_pagamento: 'Ordem Cumprida' });
       setRelatorioOrdem({
          ordem_id: compraForm.ordem_compra_id,
          fornecedor_id: compraForm.fornecedor_id,
          total_recebido: total,
          pesagens: pesagens,
          tipo_pesagem: compraForm.tipo_pesagem
       });
       setActiveModal('relatorioOrdem');
    } else {
       setActiveModal('none');
    }

    setCompraForm({
      fornecedor_id: '',
      tipo_pesagem: 'sacos',
      sacos: [],
      pesoInput: '',
      data: new Date().toISOString().split('T')[0],
      preco_quilo: '1.25',
      ordem_compra_id: ''
    } as any);
  };


  const handleSaveOrdemCompra = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ordemCompraForm.fornecedor_id) return alert('Selecione um fornecedor.');
    
    addCompraMandioca({
      fornecedor_id: ordemCompraForm.fornecedor_id,
      data: ordemCompraForm.data,
      tipo_pesagem: 'total',
      pesagens_sacos: [],
      quantidade_total: Number(ordemCompraForm.quantidade_total) || 0,
      status_pagamento: 'Ordem de Compra',
      casca_kg: 0,
      destopo_kg: 0
    });

    setActiveModal('none');
    setOrdemCompraForm({
      fornecedor_id: '',
      quantidade_total: '',
      data: new Date().toISOString().split('T')[0]
    });
  };

  // Handlers - Historico / Analise
  const openHistorico = (fornId: string) => {
    setSelectedFornecedorId(fornId);
    setActiveModal('historico');
  };

  const handleDeleteCompra = (id: string) => {
    const comp = comprasMandioca.find(x => x.id === id);
    if (comp && comp.ordem_compra_id) {
      updateCompraMandioca(comp.ordem_compra_id, { status_pagamento: 'Ordem de Compra' });
    }
    deleteCompraMandioca(id);
  };

  const exportarCompraDetalhada = (compraId: string) => {
    const c = comprasMandioca.find(x => x.id === compraId);
    if (!c) return;
    const f = fornecedores.find(x => x.id === c.fornecedor_id);
    if (!f) return;

    const pdf = new jsPDF();
    
    // Header
    pdf.setFillColor(6, 78, 59); // emerald-900
    pdf.rect(0, 0, 210, 40, "F");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.setTextColor(255, 255, 255);
    pdf.text("COMPROVANTE DE ENTRADA DE CARGA", 105, 18, { align: "center" });

    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(200, 220, 210);
    pdf.text("DETALHAMENTO DE PESAGEM E RENDIMENTO DA MATÉRIA-PRIMA", 105, 28, { align: "center" });

    // Fornecedor Box
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(226, 232, 240);
    pdf.roundedRect(14, 45, 182, 35, 3, 3, "FD");
    
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(6, 78, 59);
    pdf.setFontSize(10);
    pdf.text("FORNECEDOR", 20, 52);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(40, 40, 40);
    pdf.text(`Nome: ${f.nome}`, 20, 59);
    pdf.text(`Contato: ${f.telefone || 'N/A'}`, 20, 66);
    pdf.text(`Localidade: ${f.cidade || 'N/A'} - ${f.estado || 'N/A'}`, 20, 73);

    // Info Carga
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(226, 232, 240);
    pdf.roundedRect(14, 85, 182, 38, 3, 3, "FD");

    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(6, 78, 59);
    pdf.text("DADOS DA CARGA", 20, 92);
    
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.1);
    pdf.line(20, 95, 190, 95);

    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);
    pdf.text("DATA DA ENTRADA", 20, 102);
    pdf.text("TIPO DE PESAGEM", 65, 102);
    pdf.text("PREÇO POR KG", 110, 102);
    pdf.text("VALOR TOTAL ESTIMADO", 150, 102);

    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(40, 40, 40);
    pdf.text(`${new Date(c.data).toLocaleDateString('pt-BR')}`, 20, 108);
    pdf.text(`${c.tipo_pesagem === 'sacos' ? 'Por Sacos' : 'Lote Fechado'}`, 65, 108);
    pdf.text(`R$ ${(c.preco_quilo || 1.25).toFixed(2)}`, 110, 108);
    pdf.text(`R$ ${(c.valor_total || (c.quantidade_total * (c.preco_quilo || 1.25))).toFixed(2)}`, 150, 108);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(6, 78, 59);
    pdf.text(`Peso Total Recebido (Entregue): ${c.quantidade_total.toFixed(1)} KG`, 20, 118);

    let currentY = 130;

    // Associated purchase order comparison
    if (c.ordem_compra_id) {
      const ordem = comprasMandioca.find(o => o.id === c.ordem_compra_id);
      if (ordem) {
        pdf.setFillColor(240, 249, 255); // light blue
        pdf.setDrawColor(186, 230, 253);
        pdf.roundedRect(14, currentY, 182, 38, 3, 3, "FD");

        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(3, 105, 161); // sky-700
        pdf.setFontSize(10);
        pdf.text("VÍNCULO COM ORDEM DE COMPRA", 20, currentY + 7);

        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(40, 40, 40);
        pdf.setFontSize(9);
        pdf.text(`Ordem de Compra solicitada em: ${new Date(ordem.data).toLocaleDateString('pt-BR')}`, 20, currentY + 14);
        pdf.text(`Quantidade Solicitada na Ordem: ${ordem.quantidade_total.toFixed(1)} KG`, 20, currentY + 20);
        pdf.text(`Quantidade Real Recebida: ${c.quantidade_total.toFixed(1)} KG`, 20, currentY + 26);

        const diferenca = c.quantidade_total - ordem.quantidade_total;
        const isPos = diferenca > 0;
        const isNeg = diferenca < 0;

        pdf.setFont("helvetica", "bold");
        pdf.text("Diferença da Carga:", 20, currentY + 32);
        if (isPos) {
          pdf.setTextColor(180, 83, 9); // orange
          pdf.text(`+${diferenca.toFixed(1)} KG (Excedente - Pagar Diferença ao Fornecedor)`, 55, currentY + 32);
        } else if (isNeg) {
          pdf.setTextColor(220, 38, 38); // red
          pdf.text(`${diferenca.toFixed(1)} KG (Sobra - Valor fica de Crédito)`, 55, currentY + 32);
        } else {
          pdf.setTextColor(22, 163, 74); // green
          pdf.text("0.0 KG (Entregue exatamente o peso solicitado)", 55, currentY + 32);
        }
        currentY += 44;
      }
    }

    // Sacos Details
    if (c.tipo_pesagem === 'sacos' && c.pesagens_sacos && c.pesagens_sacos.length > 0) {
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(6, 78, 59);
      pdf.setFontSize(11);
      pdf.text("PESAGEM DETALHADA (SACO POR SACO)", 14, currentY);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(60, 60, 60);

      let startX = 14;
      let startY = currentY + 7;
      c.pesagens_sacos.forEach((peso, idx) => {
        const col = idx % 5;
        const row = Math.floor(idx / 5);
        const xPos = startX + (col * 38);
        const yPos = startY + (row * 8);

        if (yPos < 280) {
          pdf.text(`Saco ${idx + 1}: ${peso.toFixed(1)} KG`, xPos, yPos);
        }
      });
      
      const totalSacos = c.pesagens_sacos.length;
      const mediaSacos = c.quantidade_total / totalSacos;
      const finalY = startY + Math.ceil(totalSacos / 5) * 8 + 4;
      if (finalY < 280) {
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(40, 40, 40);
        pdf.text(`Total de Sacos: ${totalSacos} un  |  Média por Saco: ${mediaSacos.toFixed(1)} KG`, 14, finalY);
      }
    }

    pdf.save(`comprovante_carga_${f.nome.replace(/\s+/g, '_')}_${c.data}.pdf`);
  };

  const exportarRelatorioRecebimento = (ordemId: string, fornId: string, totalRecebido: number, pesagens: number[], tipoPesagem: string) => {
    const ordem = comprasMandioca.find(c => c.id === ordemId);
    const f = fornecedores.find(x => x.id === fornId);
    if (!ordem || !f) return;

    const pdf = new jsPDF();
    
    // Header
    pdf.setFillColor(6, 78, 59); // emerald-900
    pdf.rect(0, 0, 210, 40, "F");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.setTextColor(255, 255, 255);
    pdf.text("RELATÓRIO DE RECEBIMENTO", 105, 18, { align: "center" });

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(200, 220, 210);
    pdf.text("DIFERENÇA ENTRE SOLICITADO E ENTREGUE", 105, 28, { align: "center" });

    // Fornecedor Box
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(226, 232, 240);
    pdf.roundedRect(14, 45, 182, 35, 3, 3, "FD");
    
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(40, 40, 40);
    pdf.setFontSize(10);
    pdf.text("DADOS DO FORNECEDOR", 20, 52);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Nome: ${f.nome}`, 20, 59);
    pdf.text(`Contato: ${f.telefone || 'N/A'}`, 20, 66);
    pdf.text(`Localidade: ${f.cidade || 'N/A'} - ${f.estado || 'N/A'}`, 20, 73);

    // Comparativo Box
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(6, 78, 59);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(14, 85, 182, 35, 3, 3, "FD");
    
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(6, 78, 59);
    pdf.setFontSize(12);
    pdf.text("COMPARATIVO DE QUANTIDADES", 20, 95);
    
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.1);
    pdf.line(20, 98, 190, 98);

    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.text("PREVISTO (ORDEM DE COMPRA)", 20, 106);
    pdf.text("REAL RECEBIDO", 95, 106);
    pdf.text("DIFERENÇA", 155, 106);
    
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(40, 40, 40);
    pdf.text(`${ordem.quantidade_total.toFixed(2)} KG`, 20, 113);
    pdf.text(`${totalRecebido.toFixed(2)} KG`, 95, 113);
    
    const diferenca = totalRecebido - ordem.quantidade_total;
    const isPos = diferenca > 0;
    const isNeg = diferenca < 0;
    
    if (isPos) {
      pdf.setTextColor(180, 83, 9); // orange/amber
    } else if (isNeg) {
      pdf.setTextColor(220, 38, 38); // red
    } else {
      pdf.setTextColor(22, 163, 74); // green
    }
    pdf.text(`${isPos ? '+' : ''}${diferenca.toFixed(2)} KG`, 155, 113);

    // Detalhamento Sacos (if tipoPesagem === 'sacos')
    if (tipoPesagem === 'sacos' && pesagens.length > 0) {
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(6, 78, 59);
      pdf.setFontSize(12);
      pdf.text("DETALHAMENTO DE PESAGEM (SACO A SACO)", 14, 132);
      
      // Let's create a grid or list of sacos
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(60, 60, 60);
      
      let startX = 14;
      let startY = 141;
      pesagens.forEach((peso, idx) => {
        const col = idx % 5;
        const row = Math.floor(idx / 5);
        const xPos = startX + (col * 38);
        const yPos = startY + (row * 8);
        
        // Don't draw past page height
        if (yPos < 280) {
          pdf.text(`Saco ${idx + 1}: ${peso.toFixed(1)} KG`, xPos, yPos);
        }
      });
    }

    pdf.save(`relatorio_recebimento_${f.nome.replace(/\s+/g, '_')}_${ordem.data}.pdf`);
  };

  
  const exportarOrdemCompra = (id: string) => {
    const c = comprasMandioca.find((x: any) => x.id === id);
    if (!c) return;
    const f = fornecedores.find((x: any) => x.id === c.fornecedor_id);
    if (!f) return;

    const pdf = new jsPDF();
    
    pdf.setFillColor(6, 78, 59); // emerald-900
    pdf.rect(0, 0, 210, 40, "F");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(22);
    pdf.setTextColor(255, 255, 255);
    pdf.text("ORDEM DE COMPRA", 105, 20, { align: "center" });

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(200, 220, 210);
    pdf.text("DOCUMENTO DE PREVISÃO DE CARGA", 105, 28, { align: "center" });

    // Info
    pdf.setTextColor(40, 40, 40);
    pdf.setFontSize(10);
    
    // Fornecedor Box
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(226, 232, 240);
    pdf.roundedRect(14, 45, 182, 35, 3, 3, "FD");
    
    pdf.setFont("helvetica", "bold");
    pdf.text("DADOS DO FORNECEDOR", 20, 52);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Nome: ${f.nome}`, 20, 59);
    pdf.text(`Contato: ${f.telefone || 'N/A'}`, 20, 66);
    pdf.text(`Localidade: ${f.cidade || 'N/A'} - ${f.estado || 'N/A'}`, 20, 73);

    // Order Box - More beautiful
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(6, 78, 59);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(14, 85, 182, 45, 3, 3, "FD");
    
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(6, 78, 59);
    pdf.setFontSize(12);
    pdf.text("DETALHES DA ORDEM", 20, 95);
    
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.1);
    pdf.line(20, 98, 190, 98);

    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.text("DATA PREVISTA", 20, 108);
    pdf.text("QUANTIDADE PREVISTA (IN NATURA)", 80, 108);
    
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(40, 40, 40);
    pdf.text(`${new Date(c.data).toLocaleDateString()}`, 20, 115);
    pdf.setFontSize(14);
    pdf.setTextColor(6, 78, 59);
    pdf.text(`${c.quantidade_total.toFixed(2)} KG`, 80, 115);
    
    pdf.save(`ordem_compra_${f.nome.replace(/\s+/g, '_')}_${c.data}.pdf`);
  };

  const openAnalise = (compraId: string) => {
    const c = comprasMandioca.find(x => x.id === compraId);
    if (c) {
      setSelectedCompraId(compraId);
      setAnaliseForm({
        casca_kg: c.casca_kg ? c.casca_kg.toString() : '',
        destopo_kg: c.destopo_kg ? c.destopo_kg.toString() : ''
      });
      setActiveModal('analise');
    }
  };

  const handleSaveAnalise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompraId) return;
    updateCompraMandioca(selectedCompraId, {
      casca_kg: Number(analiseForm.casca_kg) || 0,
      destopo_kg: Number(analiseForm.destopo_kg) || 0
    });
    setActiveModal('historico');
  };

  const getHistoricoList = (fornId: string) => {
    return comprasMandioca
      .filter(c => c.fornecedor_id === fornId && c.status_pagamento !== 'Ordem Cumprida')
      .sort((a,b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header & Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Fornecedores de Mandioca</h2>
          <p className="text-sm font-medium text-gray-500">Gestão dos fornecedores de matéria-prima e pesagens</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nome ou cidade..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 focus:border-primary rounded-xl outline-none text-sm font-bold text-gray-700 transition-all"
            />
          </div>
          <button 
            onClick={() => setActiveModal('relatorio')}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-white border-2 border-gray-100 text-gray-600 font-black text-sm uppercase tracking-widest rounded-xl hover:border-gray-300 transition-all shadow-sm flex-shrink-0"
          >
            <FileText size={18} /> <span className="hidden sm:inline">Relatório</span>
          </button>
          <button 
            onClick={() => setActiveModal("ordemCompra")}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-white border-2 border-primary text-primary font-black text-sm uppercase tracking-widest rounded-xl hover:bg-primary/5 transition-all shadow-sm flex-shrink-0"
          >
            <FileText size={18} /> <span className="hidden sm:inline">Ordem de Compra</span>
          </button>
          <button 
            onClick={openCompraModal}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-white border-2 border-primary text-primary font-black text-sm uppercase tracking-widest rounded-xl hover:bg-primary/5 transition-all shadow-sm flex-shrink-0"
          >
            <ShoppingCart size={18} /> <span className="hidden sm:inline">Incluir Compra</span>
          </button>
          <button 
            onClick={() => openFormModal()}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-primary text-white font-black text-sm uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all shadow-lg flex-shrink-0"
          >
            <Plus size={18} /> <span className="hidden sm:inline">Novo Fornecedor</span>
          </button>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
          <Factory size={20} className="text-primary" />
          <h3 className="font-bold text-primary uppercase text-xs tracking-widest">Base de Fornecedores</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">Cidade / Estado</th>
                <th className="px-6 py-4">Contato</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredFornecedores.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400 font-medium">Nenhum fornecedor encontrado.</td>
                </tr>
              ) : (
                filteredFornecedores.map(forn => (
                  <tr key={forn.id} className="hover:bg-gray-50/50 transition-colors text-sm font-medium text-gray-800">
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900 text-base">{forn.nome}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-700">{forn.cidade}</p>
                      <p className="text-xs text-gray-500">{forn.estado}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p>{forn.telefone}</p>
                      <p className="text-xs text-gray-500">{forn.contato_secundario}</p>
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                       <button 
                        onClick={() => openHistorico(forn.id)}
                        className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-primary hover:text-white transition-all shadow-sm"
                        title="Histórico de Compras"
                      >
                        <History size={18} />
                      </button>
                      <button 
                        onClick={() => openFormModal(forn)}
                        className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-primary hover:text-white transition-all shadow-sm"
                        title="Editar Fornecedor"
                      >
                        <Edit2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL 1: FORNECEDOR FORM --- */}
      {activeModal === 'form' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-primary/40 backdrop-blur-sm">
           <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-4xl h-[85vh] overflow-hidden flex flex-col scale-in">
              <div className="p-8 bg-primary text-white flex justify-between items-center shrink-0">
                 <div>
                    <h2 className="text-2xl font-black tracking-tight">{editingFornecedor ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h2>
                    <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mt-1">Dados Residenciais & Contato</p>
                 </div>
                 <button onClick={() => {setActiveModal('none'); setDeleteStep('none');}} className="hover:rotate-90 transition-all text-white/60 hover:text-white">
                   <X size={24} />
                 </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
                <form id="fornec-form" onSubmit={handleSaveFornecedor} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-1 md:col-span-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Nome Completo <span className="text-red-500">*</span></label>
                      <input required type="text" value={formData.nome || ''} onChange={(e) => setFormData({...formData, nome: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none hover:border-gray-300 focus:border-primary transition-all" />
                    </div>
                    <div className="col-span-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Telefone <span className="text-red-500">*</span></label>
                      <input required type="text" value={formData.telefone || ''} onChange={(e) => setFormData({...formData, telefone: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none hover:border-gray-300 focus:border-primary transition-all" />
                    </div>
                    <div className="col-span-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Contato Secundário</label>
                      <input type="text" value={formData.contato_secundario || ''} onChange={(e) => setFormData({...formData, contato_secundario: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none hover:border-gray-300 focus:border-primary transition-all" />
                    </div>

                    <div className="col-span-1 md:col-span-2 pb-2 border-b border-gray-100 mt-2">
                       <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider">Endereço</h3>
                    </div>

                    <div className="col-span-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Rua / Linha</label>
                      <input type="text" value={formData.rua_linha || ''} onChange={(e) => setFormData({...formData, rua_linha: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none hover:border-gray-300 focus:border-primary transition-all" />
                    </div>
                    <div className="col-span-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Número</label>
                      <input type="text" value={formData.numero || ''} onChange={(e) => setFormData({...formData, numero: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none hover:border-gray-300 focus:border-primary transition-all" />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Ponto de Referência</label>
                      <input type="text" value={formData.ponto_referencia || ''} onChange={(e) => setFormData({...formData, ponto_referencia: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none hover:border-gray-300 focus:border-primary transition-all" />
                    </div>
                    <div className="col-span-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Cidade</label>
                      <input type="text" value={formData.cidade || ''} onChange={(e) => setFormData({...formData, cidade: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none hover:border-gray-300 focus:border-primary transition-all" />
                    </div>
                    <div className="col-span-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Estado</label>
                      <input type="text" value={formData.estado || ''} onChange={(e) => setFormData({...formData, estado: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none hover:border-gray-300 focus:border-primary transition-all" />
                    </div>
                  </div>
                </form>
              </div>

              <div className="p-6 bg-white border-t border-gray-100 flex justify-end gap-4 shrink-0">
                {editingFornecedor && (
                  <button type="button" onClick={handleDeleteClick} className="px-6 py-3 bg-red-600 text-white font-black text-sm uppercase tracking-widest rounded-xl hover:bg-red-700 transition-all shadow-lg mr-auto flex items-center gap-2">Deletar</button>
                )}
                <button type="button" onClick={() => setActiveModal('none')} className="px-6 py-3 bg-gray-100 text-gray-600 font-black text-sm uppercase tracking-widest rounded-xl hover:bg-gray-200 transition-all">Cancelar</button>
                <button type="submit" form="fornec-form" className="px-8 py-3 bg-primary text-white font-black text-sm uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all shadow-lg">Salvar</button>
              </div>
           </div>
        </div>
      )}

      {/* --- OVERLAYS DELETAR FORNECEDOR --- */}
      {deleteStep !== 'none' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] shadow-2xl p-8 max-w-md w-full text-center scale-in">
            {deleteStep === 'first' && (
              <>
                <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6"><Trash2 size={40} /></div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">Excluir Fornecedor?</h3>
                <p className="text-gray-500 font-medium mb-8 text-sm">Tem certeza? Esta ação não pode ser desfeita.</p>
                <div className="flex gap-4">
                  <button onClick={() => setDeleteStep('none')} className="flex-1 py-4 bg-gray-100 text-gray-600 font-black text-sm uppercase tracking-widest rounded-xl hover:bg-gray-200 transition-all">Cancelar</button>
                  <button onClick={confirmDeleteFirst} className="flex-1 py-4 bg-red-600 text-white font-black text-sm uppercase tracking-widest rounded-xl hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all">Sim</button>
                </div>
              </>
            )}
            {deleteStep === 'second' && (
              <>
                <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-6"><AlertTriangle size={40} /></div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">Atenção! Dados Vinculados</h3>
                <p className="text-gray-500 font-medium mb-8 text-sm">Este fornecedor possui pesagens vinculadas. Se excluir, perderá esse histórico.</p>
                <div className="flex flex-col gap-3">
                  <button onClick={executeDelete} className="w-full py-4 bg-orange-600 text-white font-black text-sm uppercase tracking-widest rounded-xl hover:bg-orange-700 transition-all">Excluir Tudo</button>
                  <button onClick={() => setDeleteStep('none')} className="w-full py-4 bg-gray-100 text-gray-600 font-black text-sm uppercase tracking-widest rounded-xl hover:bg-gray-200 transition-all">Cancelar</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      
      
      {/* --- MODAL RELATORIO DE ORDEM DE COMPRA --- */}
      {activeModal === 'relatorioOrdem' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-8 bg-primary/40 backdrop-blur-sm">
           <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col scale-in" id="relatorio-diferenca">
              <div className="p-8 bg-primary text-white flex justify-between items-center shrink-0">
                 <div>
                    <h2 className="text-2xl font-black tracking-tight">Relatório de Recebimento</h2>
                    <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mt-1">Comparativo de Ordem de Compra</p>
                 </div>
                 <button onClick={() => setActiveModal('none')} className="hover:rotate-90 transition-all text-white/60 hover:text-white"><X size={24} /></button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 bg-gray-50 space-y-6">
                {(() => {
                  const ordem = comprasMandioca.find(c => c.id === relatorioOrdem.ordem_id);
                  const forn = fornecedores.find(f => f.id === relatorioOrdem.fornecedor_id);
                  if (!ordem || !forn) return null;
                  
                  const diferenca = relatorioOrdem.total_recebido - ordem.quantidade_total;
                  const isPos = diferenca > 0;
                  const isNeg = diferenca < 0;

                  return (
                    <>
                      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <h3 className="font-bold text-gray-800 mb-4 uppercase tracking-widest text-xs border-b pb-2">Resumo do Recebimento</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                             <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Fornecedor</span>
                             <span className="font-bold text-gray-800">{forn.nome}</span>
                          </div>
                          <div>
                             <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Data da Carga</span>
                             <span className="font-bold text-gray-800">{new Date().toLocaleDateString()}</span>
                          </div>
                          <div>
                             <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Previsto (Ordem)</span>
                             <span className="font-black text-blue-600 text-lg">{ordem.quantidade_total.toFixed(2)} kg</span>
                          </div>
                          <div>
                             <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Recebido Real</span>
                             <span className="font-black text-emerald-600 text-lg">{relatorioOrdem.total_recebido.toFixed(2)} kg</span>
                          </div>
                        </div>
                        
                        <div className={`mt-4 p-4 rounded-xl border ${isPos ? 'bg-orange-50 border-orange-200' : isNeg ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                           <span className={`text-xs font-black uppercase tracking-widest block mb-1 ${isPos ? 'text-orange-700' : isNeg ? 'text-red-700' : 'text-green-700'}`}>Diferença</span>
                           <span className={`text-2xl font-black ${isPos ? 'text-orange-600' : isNeg ? 'text-red-600' : 'text-green-600'}`}>
                             {isPos ? '+' : ''}{diferenca.toFixed(2)} kg
                           </span>
                        </div>
                      </div>

                      {relatorioOrdem.tipo_pesagem === 'sacos' && relatorioOrdem.pesagens.length > 0 && (
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                           <h3 className="font-bold text-gray-800 mb-4 uppercase tracking-widest text-xs border-b pb-2">Detalhamento dos Sacos</h3>
                           <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                             {relatorioOrdem.pesagens.map((peso, idx) => (
                               <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-center">
                                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block">Saco {idx + 1}</span>
                                  <span className="font-bold text-gray-800">{peso.toFixed(1)}</span>
                               </div>
                             ))}
                           </div>
                           <div className="mt-4 pt-4 border-t flex justify-between items-center font-black">
                              <span className="text-gray-500 uppercase tracking-widest text-xs">Total de Sacos: {relatorioOrdem.pesagens.length}</span>
                              <span className="text-gray-900">{relatorioOrdem.total_recebido.toFixed(1)} kg</span>
                           </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
              <div className="p-6 bg-white border-t border-gray-100 flex justify-end gap-4 shrink-0 flex-wrap">
                <button type="button" onClick={() => setActiveModal('none')} className="px-6 py-3 bg-gray-100 text-gray-600 font-black text-sm uppercase tracking-widest rounded-xl hover:bg-gray-200 transition-all">Fechar</button>
                <button type="button" onClick={() => {
                  import('html2canvas').then(({ default: html2canvas }) => {
                    const el = document.getElementById('relatorio-diferenca');
                    if (el) {
                      const buttons = el.querySelector('.bg-white.border-t.border-gray-100.flex.justify-end');
                      if (buttons) (buttons as HTMLElement).style.display = 'none';
                      html2canvas(el, { scale: 2 }).then(canvas => {
                        const link = document.createElement('a');
                        link.download = `relatorio_recebimento_${relatorioOrdem.fornecedor_id}.jpg`;
                        link.href = canvas.toDataURL('image/jpeg', 0.9);
                        link.click();
                        if (buttons) (buttons as HTMLElement).style.display = 'flex';
                      });
                    }
                  });
                }} className="px-6 py-3 bg-white border border-gray-200 text-gray-700 font-black text-sm uppercase tracking-widest rounded-xl hover:bg-gray-50 transition-all">
                   Salvar em JPG
                </button>
                <button type="button" onClick={() => exportarRelatorioRecebimento(relatorioOrdem.ordem_id, relatorioOrdem.fornecedor_id, relatorioOrdem.total_recebido, relatorioOrdem.pesagens, relatorioOrdem.tipo_pesagem)} className="px-8 py-3 bg-primary text-white font-black text-sm uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all shadow-lg flex items-center gap-2">
                   Salvar PDF (A4)
                </button>
              </div>
           </div>
        </div>
      )}

      {/* --- MODAL ORDEM DE COMPRA --- */}
      {activeModal === 'ordemCompra' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-primary/40 backdrop-blur-sm">
           <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-xl max-h-[85vh] overflow-hidden flex flex-col scale-in">
              <div className="p-8 bg-primary text-white flex justify-between items-center shrink-0">
                 <div>
                    <h2 className="text-2xl font-black tracking-tight">Ordem de Compra</h2>
                    <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mt-1">Planejamento de Carga</p>
                 </div>
                 <button onClick={() => setActiveModal('none')} className="hover:rotate-90 transition-all text-white/60 hover:text-white"><X size={24} /></button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
                <form id="ordem-compra-form" onSubmit={handleSaveOrdemCompra} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-1 md:col-span-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Fornecedor <span className="text-red-500">*</span></label>
                       <select required value={ordemCompraForm.fornecedor_id} onChange={(e) => setOrdemCompraForm({...ordemCompraForm, fornecedor_id: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none hover:border-gray-300 focus:border-primary transition-all">
                          <option value="">Selecione...</option>
                          {fornecedores.map((f) => (
                             <option key={f.id} value={f.id}>{f.nome}</option>
                          ))}
                       </select>
                    </div>

                    {compraForm.ordem_compra_id && (
                       <div className="col-span-1 md:col-span-3 bg-blue-50 border border-blue-100 rounded-xl p-4 flex justify-between items-center">
                          <div>
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block">Ordem de Compra Selecionada</span>
                            <span className="text-sm font-bold text-blue-900">Total Previsto:</span>
                          </div>
                          <span className="text-xl font-black text-blue-700">
                             {comprasMandioca.find(c => c.id === compraForm.ordem_compra_id)?.quantidade_total.toFixed(2)} kg
                          </span>
                       </div>
                    )}


                    <div className="col-span-1 md:col-span-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Quantidade Prevista (KG) <span className="text-red-500">*</span></label>
                      <input required type="number" step="0.01" min="0" value={ordemCompraForm.quantidade_total} onChange={(e) => setOrdemCompraForm({...ordemCompraForm, quantidade_total: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none hover:border-gray-300 focus:border-primary transition-all" />
                    </div>

                    <div className="col-span-1 md:col-span-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Data <span className="text-red-500">*</span></label>
                      <input required type="date" value={ordemCompraForm.data} onChange={(e) => setOrdemCompraForm({...ordemCompraForm, data: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none hover:border-gray-300 focus:border-primary transition-all" />
                    </div>
                  </div>
                </form>
              </div>
              <div className="p-6 bg-white border-t border-gray-100 flex justify-end gap-4 shrink-0">
                <button type="button" onClick={() => setActiveModal('none')} className="px-6 py-3 bg-gray-100 text-gray-600 font-black text-sm uppercase tracking-widest rounded-xl hover:bg-gray-200 transition-all">Cancelar</button>
                <button type="submit" form="ordem-compra-form" className="px-8 py-3 bg-primary text-white font-black text-sm uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all shadow-lg flex items-center gap-2">
                   Salvar Ordem
                </button>
              </div>
           </div>
        </div>
      )}

      {/* --- MODAL 2: INCLUIR COMPRA --- */}
      {activeModal === 'compra' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-primary/40 backdrop-blur-sm">
           <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col scale-in">
              <div className="p-8 bg-primary text-white flex justify-between items-center shrink-0">
                 <div>
                    <h2 className="text-2xl font-black tracking-tight">Incluir Compra</h2>
                    <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mt-1">Lançamento de Entrada de Mandioca</p>
                 </div>
                 <button onClick={() => setActiveModal('none')} className="hover:rotate-90 transition-all text-white/60 hover:text-white"><X size={24} /></button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
                <form id="compra-form" onSubmit={handleSaveCompra} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="col-span-1 md:col-span-3">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Fornecedor <span className="text-red-500">*</span></label>
                       <select required value={compraForm.fornecedor_id} onChange={(e) => {
                          const val = e.target.value;
                          const ordens = comprasMandioca.filter(c => c.fornecedor_id === val && c.status_pagamento === 'Ordem de Compra');
                          const novaOrdem = ordens.length > 0 ? ordens[0].id : '';
                          setCompraForm({...compraForm, fornecedor_id: val, ordem_compra_id: novaOrdem});
                       }} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none hover:border-gray-300 focus:border-primary transition-all">
                         <option value="">Selecione um fornecedor...</option>
                         {fornecedores.map(f => (
                           <option key={f.id} value={f.id}>{f.nome} - {f.cidade}</option>
                         ))}
                       </select>
                    </div>
                    {compraForm.fornecedor_id && comprasMandioca.filter(c => c.fornecedor_id === compraForm.fornecedor_id && c.status_pagamento === 'Ordem de Compra').length > 0 && (
                       <div className="col-span-1 md:col-span-3">
                          <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1 block">Ordem de Compra Vinculada (Opcional)</label>
                          <select value={compraForm.ordem_compra_id || ''} onChange={(e) => setCompraForm({...compraForm, ordem_compra_id: e.target.value})} className="w-full bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm font-bold text-blue-900 outline-none hover:border-blue-300 focus:border-blue-500 transition-all">
                            <option value="">Nenhuma ordem vinculada</option>
                            {comprasMandioca.filter(c => c.fornecedor_id === compraForm.fornecedor_id && c.status_pagamento === 'Ordem de Compra').map(o => (
                              <option key={o.id} value={o.id}>Ordem de {new Date(o.data).toLocaleDateString()} - {o.quantidade_total.toFixed(2)} kg</option>
                            ))}
                          </select>
                       </div>
                    )}
                    {compraForm.ordem_compra_id && (
                       <div className="col-span-1 md:col-span-3 bg-blue-50 border border-blue-100 rounded-xl p-4 flex justify-between items-center">
                          <div>
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block">Ordem de Compra Selecionada</span>
                            <span className="text-sm font-bold text-blue-900">Total Previsto:</span>
                          </div>
                          <span className="text-xl font-black text-blue-700">
                             {comprasMandioca.find(c => c.id === compraForm.ordem_compra_id)?.quantidade_total.toFixed(2)} kg
                          </span>
                       </div>
                    )}

                    <div className="col-span-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Data <span className="text-red-500">*</span></label>
                      <input required type="date" value={compraForm.data} onChange={(e) => setCompraForm({...compraForm, data: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none hover:border-gray-300 focus:border-primary transition-all" />
                    </div>

                    <div className="col-span-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Preço por Kg (R$) <span className="text-red-500">*</span></label>
                      <input required type="number" step="0.01" min="0.01" value={compraForm.preco_quilo} onChange={(e) => setCompraForm({...compraForm, preco_quilo: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none hover:border-gray-300 focus:border-primary transition-all" />
                    </div>

                    <div className="col-span-1">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Tipo de Pesagem</label>
                       <div className="flex gap-2">
                         <button type="button" onClick={() => setCompraForm({...compraForm, tipo_pesagem: 'sacos'})} className={`flex-1 py-2 text-xs font-bold rounded-lg border ${compraForm.tipo_pesagem === 'sacos' ? 'bg-primary text-white border-primary' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}>Por Sacos / Caixas</button>
                         <button type="button" onClick={() => setCompraForm({...compraForm, tipo_pesagem: 'total'})} className={`flex-1 py-2 text-xs font-bold rounded-lg border ${compraForm.tipo_pesagem === 'total' ? 'bg-primary text-white border-primary' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}>Total Lote</button>
                       </div>
                    </div>
                  </div>

                  {compraForm.tipo_pesagem === 'sacos' ? (
                     <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                       <h4 className="text-xs font-bold text-gray-900 mb-3 uppercase tracking-wider">Pesagens dos Sacos (kg)</h4>
                       <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                         {compraForm.sacos.map((s, idx) => (
                           <div key={idx} className="flex items-center gap-3">
                              <span className="font-bold text-gray-400 w-6 text-right whitespace-nowrap">{idx + 1} -</span>
                              <input type="number" step="0.1" value={s} onChange={(e) => handleSacoChange(idx, e.target.value)} className="w-32 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none focus:border-primary transition-all" placeholder="0.0 kg" />
                              <button type="button" onClick={() => removeSaco(idx)} className="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50"><X size={18} /></button>
                           </div>
                         ))}
                         <div>
                            <button type="button" onClick={addSaco} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-primary font-bold text-sm rounded-lg hover:border-primary hover:bg-primary/5 transition-all"><Plus size={16} /> Adicionar Linha</button>
                         </div>
                       </div>
                     </div>
                  ) : (
                     <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Peso Total (kg) <span className="text-red-500">*</span></label>
                        <input type="number" step="0.1" value={compraForm.pesoInput} onChange={(e) => setCompraForm({...compraForm, pesoInput: e.target.value})} className="w-1/2 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:border-primary" placeholder="0.0" />
                     </div>
                  )}

                                    <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-primary uppercase text-xs tracking-widest">Total Calculado (Carga)</span>
                      <span className="text-2xl font-black text-primary">{currentTotalCompra.toFixed(1)} kg</span>
                    </div>
                    {compraForm.ordem_compra_id && (
                      (() => {
                         const ordem = comprasMandioca.find(c => c.id === compraForm.ordem_compra_id);
                         if (!ordem) return null;
                         const diferenca = currentTotalCompra - ordem.quantidade_total;
                         const isPos = diferenca > 0;
                         const isNeg = diferenca < 0;
                         return (
                           <div className={`mt-2 p-3 rounded-lg border ${isPos ? 'bg-orange-50 border-orange-200' : isNeg ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                              <div className="flex justify-between items-center">
                                <span className={`text-[10px] font-black uppercase tracking-widest ${isPos ? 'text-orange-700' : isNeg ? 'text-red-700' : 'text-green-700'}`}>Diferença p/ Ordem:</span>
                                <span className={`font-black ${isPos ? 'text-orange-600' : isNeg ? 'text-red-600' : 'text-green-600'}`}>
                                   {isPos ? '+' : ''}{diferenca.toFixed(1)} kg
                                </span>
                              </div>
                           </div>
                         );
                      })()
                    )}
                  </div>

                </form>
              </div>
              <div className="p-6 bg-white border-t border-gray-100 flex justify-end gap-4 shrink-0">
                <button type="button" onClick={() => setActiveModal('none')} className="px-6 py-3 bg-gray-100 text-gray-600 font-black text-sm uppercase tracking-widest rounded-xl hover:bg-gray-200">Cancelar</button>
                <button type="submit" form="compra-form" className="px-8 py-3 bg-primary text-white font-black text-sm uppercase tracking-widest rounded-xl hover:bg-primary/90">Salvar Compra</button>
              </div>
           </div>
        </div>
      )}

      {/* --- MODAL 3: HISTORICO --- */}
      {activeModal === 'historico' && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center p-4 sm:p-8 bg-black/40 backdrop-blur-sm">
           <div className="bg-white rounded-[40px] shadow-2xl w-[98%] xl:max-w-[1550px] max-h-[92vh] overflow-hidden flex flex-col scale-in">
              <div className="p-8 bg-primary text-white flex justify-between items-center shrink-0">
                 <div>
                    <h2 className="text-2xl font-black tracking-tight">Histórico de Compras</h2>
                    <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mt-1">Fornecedor: {fornecedores.find(f => f.id === selectedFornecedorId)?.nome}</p>
                 </div>
                 <button onClick={() => setActiveModal('none')} className="hover:rotate-90 transition-all text-white/60 hover:text-white"><X size={24} /></button>
              </div>
              <div className="p-0 overflow-y-auto flex-1 bg-gray-50">
                 <div className="overflow-x-auto w-full">
                    <table className="w-full text-left min-w-full">
                       <thead className="bg-white sticky top-0 border-b border-gray-200 z-10">
                         <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                           <th className="px-6 py-4">Data</th>
                           <th className="px-6 py-4 text-right">Qtd Inicial</th>
                           <th className="px-6 py-4 text-right text-red-500/70">Casca</th>
                           <th className="px-6 py-4 text-right text-red-500/70">Destopo</th>
                           <th className="px-6 py-4 text-right text-primary">Limpa</th>
                           <th className="px-6 py-4 text-center">Rendimento</th>
                           <th className="px-6 py-4 text-center">Status Pag.</th>
                           <th className="px-6 py-4 text-right">Ação</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-100">
                         {getHistoricoList(selectedFornecedorId).length === 0 ? (
                           <tr><td colSpan={8} className="px-6 py-12 text-center text-gray-400 font-medium">Nenhum histórico encontrado.</td></tr>
                         ) : getHistoricoList(selectedFornecedorId).map(c => {
                           const casca = c.casca_kg || 0;
                           const destopo = c.destopo_kg || 0;
                           const limpa = c.quantidade_total - casca - destopo;
                           const cascaPerc = c.quantidade_total > 0 ? (casca / c.quantidade_total) * 100 : 0;
                           const destopoPerc = c.quantidade_total > 0 ? (destopo / c.quantidade_total) * 100 : 0;
                           const rendimento = c.quantidade_total > 0 ? (limpa / c.quantidade_total) * 100 : 0;
                           return (
                           <tr key={c.id} className="hover:bg-gray-100/50 transition-colors text-sm font-medium">
                             <td className="px-6 py-4 text-gray-900 font-bold whitespace-nowrap">{new Date(c.data).toLocaleDateString('pt-BR')}</td>
                             <td className="px-6 py-4 text-right text-gray-600 whitespace-nowrap">{c.quantidade_total.toFixed(1)} kg</td>
                             <td className="px-6 py-4 text-right text-red-500 whitespace-nowrap">{casca > 0 ? `${casca.toFixed(1)} kg / ${cascaPerc.toFixed(1)}%` : '-'}</td>
                             <td className="px-6 py-4 text-right text-red-500 whitespace-nowrap">{destopo > 0 ? `${destopo.toFixed(1)} kg / ${destopoPerc.toFixed(1)}%` : '-'}</td>
                             <td className="px-6 py-4 text-right text-primary font-black whitespace-nowrap">{limpa.toFixed(1)} kg</td>
                             <td className="px-6 py-4 text-center font-bold text-gray-800 whitespace-nowrap">{rendimento.toFixed(1)}%</td>
                             <td className="px-6 py-4 text-center whitespace-nowrap">
                               <div className="flex flex-col items-center gap-1">
                                 <span className={`inline-block px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${c.status_pagamento === 'Pago' ? 'bg-green-100 text-green-700' : c.status_pagamento === 'Ordem de Compra' ? 'bg-blue-100 text-blue-700' : c.status_pagamento === 'Ordem Cumprida' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>{c.status_pagamento}</span>
                                 {c.ordem_compra_id && (
                                   <span className="inline-block px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-black uppercase tracking-wide">
                                     Pedido/Ordem de Compra
                                   </span>
                                 )}
                               </div>
                             </td>
                             <td className="px-6 py-4 text-right whitespace-nowrap">
                                <button onClick={() => openAnalise(c.id)} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-bold uppercase rounded-lg hover:bg-gray-50 transition-all shadow-sm">Análise Carga</button>
                                {c.status_pagamento !== 'Ordem de Compra' && (
                                   <button onClick={() => exportarCompraDetalhada(c.id)} className="ml-2 px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold uppercase rounded-lg hover:bg-indigo-100 transition-all shadow-sm" title="Exportar Comprovante Detalhado">Exportar Recibo</button>
                                )}
                                {c.status_pagamento === 'Ordem de Compra' && (
                                   <button onClick={() => exportarOrdemCompra(c.id)} className="ml-2 px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase rounded-lg hover:bg-blue-100 transition-all shadow-sm">Exportar Ordem</button>
                                )}
                                {c.ordem_compra_id && (
                                   <button onClick={() => {
                                     setRelatorioOrdem({
                                        ordem_id: c.ordem_compra_id,
                                        fornecedor_id: c.fornecedor_id,
                                        total_recebido: c.quantidade_total,
                                        pesagens: c.pesagens_sacos || [],
                                        tipo_pesagem: c.tipo_pesagem || 'total'
                                     });
                                     setActiveModal('relatorioOrdem');
                                   }} className="ml-2 px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold uppercase rounded-lg hover:bg-emerald-100 transition-all shadow-sm">Ver Relatório</button>
                                )}
                                {compraToDelete === c.id ? (
                                    <div className="inline-flex items-center gap-1.5 ml-2 bg-red-50 border border-red-200 rounded-lg p-1">
                                       <span className="text-[10px] font-black text-red-600 uppercase px-1">Excluir?</span>
                                       <button onClick={() => { handleDeleteCompra(c.id); setCompraToDelete(null); }} className="px-2 py-1 bg-red-600 text-white text-[9px] font-black uppercase rounded-md hover:bg-red-700 transition-all">Sim</button>
                                       <button onClick={() => setCompraToDelete(null)} className="px-2 py-1 bg-gray-200 text-gray-700 text-[9px] font-black uppercase rounded-md hover:bg-gray-300 transition-all">Não</button>
                                    </div>
                                 ) : (
                                    c.status_pagamento !== 'Pago' && (
                                       <button onClick={() => setCompraToDelete(c.id)} className="ml-2 px-4 py-2 bg-red-50 border border-red-200 text-red-600 text-xs font-bold uppercase rounded-lg hover:bg-red-100 hover:text-red-700 transition-all shadow-sm" title="Excluir Registro">Excluir</button>
                                    )
                                 )}
                             </td>
                           </tr>
                         )})}
                       </tbody>
                    </table>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* --- MODAL 4: ANALISE DA CARGA --- */}
      {activeModal === 'analise' && (() => {
         const compra = comprasMandioca.find(c => c.id === selectedCompraId);
         if (!compra) return null;
         const total = compra.quantidade_total;
         const valCasca = Number(analiseForm.casca_kg) || 0;
         const valDestopo = Number(analiseForm.destopo_kg) || 0;
         const limpa = total - valCasca - valDestopo;
         const rendimento = total > 0 ? (limpa / total) * 100 : 0;

         return (
         <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-xl scale-in overflow-hidden">
             <div className="p-6 bg-primary text-white flex justify-between items-center">
                <div>
                   <h3 className="text-xl font-black">Análise da Carga</h3>
                   <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest mt-1">{new Date(compra.data).toLocaleDateString()}</p>
                </div>
                <button onClick={() => setActiveModal('historico')} className="text-white/60 hover:text-white"><X size={24} /></button>
             </div>
             <form onSubmit={handleSaveAnalise} className="p-8 space-y-6">
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <span className="font-bold text-gray-500 uppercase text-xs tracking-widest">Total In Natura</span>
                  <span className="font-black text-xl text-gray-900">{total} kg</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Casca (kg)</label>
                    <input type="number" step="0.1" value={analiseForm.casca_kg} onChange={(e) => setAnaliseForm({...analiseForm, casca_kg: e.target.value})} className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Destopo (kg)</label>
                    <input type="number" step="0.1" value={analiseForm.destopo_kg} onChange={(e) => setAnaliseForm({...analiseForm, destopo_kg: e.target.value})} className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-primary" />
                  </div>
                </div>

                <div className="flex gap-4 p-5 bg-primary/5 border border-primary/20 rounded-2xl">
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-primary/70 uppercase tracking-widest">Mandioca Limpa</p>
                    <p className="text-2xl font-black text-primary">{limpa.toFixed(1)} kg</p>
                  </div>
                  <div className="flex-1 border-l border-primary/20 pl-4">
                    <p className="text-[10px] font-black text-primary/70 uppercase tracking-widest">Rendimento</p>
                    <p className="text-2xl font-black text-primary">{rendimento.toFixed(1)}%</p>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                   <button type="button" onClick={() => setActiveModal('historico')} className="flex-1 py-4 bg-gray-100 text-gray-600 font-black text-sm uppercase tracking-widest rounded-xl hover:bg-gray-200">Cancelar</button>
                   <button type="submit" className="flex-1 py-4 bg-primary text-white font-black text-sm uppercase tracking-widest rounded-xl hover:bg-primary/90 shadow-lg">Salvar Análise</button>
                </div>
             </form>
           </div>
         </div>
         );
      })()}

      {/* --- RELATORIO --- */}
      {activeModal === 'relatorio' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-primary/40 backdrop-blur-sm">
           <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-7xl h-[85vh] overflow-hidden flex flex-col scale-in">
              <div className="p-8 bg-primary text-white flex justify-between items-center shrink-0">
                 <div>
                    <h2 className="text-2xl font-black tracking-tight">Relatório de Rendimento</h2>
                    <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mt-1">Análise de matéria-prima e aproveitamento</p>
                 </div>
                 <button onClick={() => setActiveModal('none')} className="hover:rotate-90 transition-all text-white/60 hover:text-white"><X size={24} /></button>
              </div>

              <div className="flex-1 flex overflow-hidden">
                <div className="w-64 bg-gray-50 border-r border-gray-100 p-6 flex flex-col gap-6 overflow-y-auto">
                   <div>
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Ano</label>
                     <select value={relatorioForm.ano} onChange={(e) => setRelatorioForm({...relatorioForm, ano: e.target.value})} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none hover:border-gray-300">
                       {[2023, 2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                     </select>
                   </div>
                   <div>
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Mês</label>
                     <select value={relatorioForm.mes} onChange={(e) => setRelatorioForm({...relatorioForm, mes: e.target.value})} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none hover:border-gray-300">
                       <option value="Todos">Todos os meses</option>
                       {['01 - Janeiro', '02 - Fevereiro', '03 - Março', '04 - Abril', '05 - Maio', '06 - Junho', '07 - Julho', '08 - Agosto', '09 - Setembro', '10 - Outubro', '11 - Novembro', '12 - Dezembro'].map((m) => (
                         <option key={m.substring(0,2)} value={m.substring(0,2)}>{m}</option>
                       ))}
                     </select>
                   </div>
                   <div>
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Fornecedores</label>
                     <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                        <label className="flex items-center gap-2 text-sm font-bold text-gray-700 cursor-pointer">
                           <input type="checkbox" checked={relatorioForm.fornecedores.length === 0} onChange={(e) => {
                             if(e.target.checked) setRelatorioForm({...relatorioForm, fornecedores: []});
                           }} className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4" />
                           Todos
                        </label>
                        {fornecedores.map(f => (
                           <label key={f.id} className="flex items-center gap-2 text-sm font-bold text-gray-700 cursor-pointer">
                              <input type="checkbox" 
                                checked={relatorioForm.fornecedores.includes(f.id)} 
                                onChange={(e) => {
                                  if(e.target.checked) {
                                    setRelatorioForm({...relatorioForm, fornecedores: [...relatorioForm.fornecedores, f.id]});
                                  } else {
                                    setRelatorioForm({...relatorioForm, fornecedores: relatorioForm.fornecedores.filter(id => id !== f.id)});
                                  }
                                }} 
                                className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4" 
                              />
                              {f.nome}
                           </label>
                        ))}
                     </div>
                   </div>
                </div>

                <div className="flex-1 p-8 overflow-y-auto bg-white">
                  {(() => {
                    const filtered = comprasMandioca.filter(c => {
                      const date = new Date(c.data);
                      const anoMatch = date.getFullYear().toString() === relatorioForm.ano;
                      const mesMatch = relatorioForm.mes === 'Todos' || (date.getMonth() + 1).toString().padStart(2, '0') === relatorioForm.mes;
                      const fornMatch = relatorioForm.fornecedores.length === 0 || relatorioForm.fornecedores.includes(c.fornecedor_id);
                      return anoMatch && mesMatch && fornMatch;
                    });

                    const totalInNatura = filtered.reduce((acc, curr) => acc + curr.quantidade_total, 0);
                    const totalCasca = filtered.reduce((acc, curr) => acc + (curr.casca_kg || 0), 0);
                    const totalDestopo = filtered.reduce((acc, curr) => acc + (curr.destopo_kg || 0), 0);
                    const totalLimpa = totalInNatura - totalCasca - totalDestopo;
                    const rendimentoGeral = totalInNatura > 0 ? (totalLimpa / totalInNatura) * 100 : 0;

                    // Group by Fornecedor
                    const byForn = filtered.reduce((acc, curr) => {
                      if (!acc[curr.fornecedor_id]) {
                        acc[curr.fornecedor_id] = { inNatura: 0, casca: 0, destopo: 0, name: fornecedores.find(x => x.id === curr.fornecedor_id)?.nome || 'Desconhecido' };
                      }
                      acc[curr.fornecedor_id].inNatura += curr.quantidade_total;
                      acc[curr.fornecedor_id].casca += curr.casca_kg || 0;
                      acc[curr.fornecedor_id].destopo += curr.destopo_kg || 0;
                      return acc;
                    }, {} as Record<string, {inNatura: number; casca: number; destopo: number; name: string}>);

                    return (
                      <div className="space-y-8 animate-fade-in">
                        <div className="flex justify-end">
                           <div className="flex bg-gray-50 border border-gray-100 p-1 rounded-xl gap-1">
                            <button 
                              onClick={() => setRelatorioForm({...relatorioForm, agrupamento: 'fornecedor'})}
                              className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${relatorioForm.agrupamento === 'fornecedor' ? 'bg-primary text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                              Agrupado
                            </button>
                            <button 
                              onClick={() => setRelatorioForm({...relatorioForm, agrupamento: 'pedido'})}
                              className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${relatorioForm.agrupamento === 'pedido' ? 'bg-primary text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                              Por Pedido
                            </button>
                           </div>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                           <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
                             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">In Natura Total</p>
                             <p className="text-2xl font-black text-gray-900">{totalInNatura.toFixed(1)}</p>
                           </div>
                           <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
                             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Casca + Destopo</p>
                             <p className="text-2xl font-black text-gray-600">{(totalCasca + totalDestopo).toFixed(1)}</p>
                           </div>
                           <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5">
                             <p className="text-[10px] font-black text-primary/70 uppercase tracking-widest mb-1">Mandioca Limpa</p>
                             <p className="text-2xl font-black text-primary">{totalLimpa.toFixed(1)}</p>
                           </div>
                           <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-white">
                             <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Aproveitamento</p>
                             <p className="text-2xl font-black text-white">{rendimentoGeral.toFixed(1)}%</p>
                           </div>
                        </div>

                        <div>
                          <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider mb-4">
                            {relatorioForm.agrupamento === 'fornecedor' ? 'Análise Consolidada por Fornecedor' : 'Análise Detalhada por Pedido/Carga'}
                          </h3>
                          {Object.keys(byForn).length === 0 ? (
                            <p className="text-sm text-gray-500 font-medium">Nenhum dado encontrado para os filtros selecionados.</p>
                          ) : (
                            <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
                              <table className="w-full text-left min-w-[800px]">
                                <thead className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                  <tr>
                                    <th className="px-6 py-4">{relatorioForm.agrupamento === 'fornecedor' ? 'Fornecedor' : 'Data / Fornecedor'}</th>
                                    <th className="px-6 py-4 text-right">In Natura</th>
                                    <th className="px-6 py-4 text-right">Casca</th>
                                    <th className="px-6 py-4 text-right">Destopo</th>
                                    <th className="px-6 py-4 text-right">M. Limpa</th>
                                    <th className="px-6 py-4 text-right">Rend. %</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {relatorioForm.agrupamento === 'fornecedor' ? (
                                    (Object.values(byForn) as Array<{inNatura: number; casca: number; destopo: number; name: string}>).map((data, idx) => {
                                      const limpa = data.inNatura - data.casca - data.destopo;
                                      const cascaPerc = data.inNatura > 0 ? (data.casca / data.inNatura) * 100 : 0;
                                      const destPerc = data.inNatura > 0 ? (data.destopo / data.inNatura) * 100 : 0;
                                      const rend = data.inNatura > 0 ? (limpa / data.inNatura) * 100 : 0;
                                      return (
                                        <tr key={idx} className="hover:bg-gray-50/50 transition-colors text-sm font-medium border-l-4 border-l-transparent hover:border-l-primary">
                                          <td className="px-6 py-4 font-black text-gray-900">{data.name}</td>
                                          <td className="px-6 py-4 text-right text-gray-600 font-bold">{data.inNatura.toFixed(1)}</td>
                                          <td className="px-6 py-4 text-right text-red-500 whitespace-nowrap">{data.casca.toFixed(1)} ({cascaPerc.toFixed(1)}%)</td>
                                          <td className="px-6 py-4 text-right text-red-500 whitespace-nowrap">{data.destopo.toFixed(1)} ({destPerc.toFixed(1)}%)</td>
                                          <td className="px-6 py-4 text-right text-primary font-black">{limpa.toFixed(1)}</td>
                                          <td className="px-6 py-4 text-right font-black text-gray-900">{rend.toFixed(1)}%</td>
                                        </tr>
                                      );
                                    })
                                  ) : (
                                    filtered.sort((a,b) => new Date(b.data).getTime() - new Date(a.data).getTime()).map((c, idx) => {
                                      const casca = c.casca_kg || 0;
                                      const destopo = c.destopo_kg || 0;
                                      const limpa = c.quantidade_total - casca - destopo;
                                      const cascaPerc = c.quantidade_total > 0 ? (casca / c.quantidade_total) * 100 : 0;
                                      const destPerc = c.quantidade_total > 0 ? (destopo / c.quantidade_total) * 100 : 0;
                                      const rend = c.quantidade_total > 0 ? (limpa / c.quantidade_total) * 100 : 0;
                                      const fornName = fornecedores.find(f => f.id === c.fornecedor_id)?.nome || '---';
                                      return (
                                        <tr key={idx} className="hover:bg-gray-50/50 transition-colors text-sm font-medium border-l-4 border-l-transparent hover:border-l-primary">
                                          <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                              <span className="font-black text-gray-900">{new Date(c.data).toLocaleDateString('pt-BR')}</span>
                                              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{fornName}</span>
                                            </div>
                                          </td>
                                          <td className="px-6 py-4 text-right text-gray-600 font-bold">{c.quantidade_total.toFixed(1)}</td>
                                          <td className="px-6 py-4 text-right text-red-500 whitespace-nowrap">{casca.toFixed(1)} ({cascaPerc.toFixed(1)}%)</td>
                                          <td className="px-6 py-4 text-right text-red-500 whitespace-nowrap">{destopo.toFixed(1)} ({destPerc.toFixed(1)}%)</td>
                                          <td className="px-6 py-4 text-right text-primary font-black">{limpa.toFixed(1)}</td>
                                          <td className="px-6 py-4 text-right font-black text-gray-900">{rend.toFixed(1)}%</td>
                                        </tr>
                                      );
                                    })
                                  )}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};
export default Fornecedores;
