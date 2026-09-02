import React, { useState, useEffect } from 'react';
import { X, Download, FileText, Check, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Produto } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from '../types';

interface PriceTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  produtos: Produto[];
}

const getBase64ImageFromUrl = async (imageUrl: string): Promise<string | null> => {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return null;
    
    // Protect against SPA fallback returning HTML instead of an image
    const contentType = response.headers.get('content-type');
    if (contentType && !contentType.startsWith('image/')) {
      return null;
    }

    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error("Error loading image", e);
    return null;
  }
};

export const PriceTableModal: React.FC<PriceTableModalProps> = ({ isOpen, onClose, produtos }) => {
  const [viewMode, setViewMode] = useState<'fardo' | 'unidade'>('fardo');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [observacao, setObservacao] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const getMultiplier = (name: string): number => {
    const match = name.match(/\((\d+)x(\d+)\)/);
    if (match) {
      return parseInt(match[2], 10);
    }
    return 1;
  };


  
  const getPesoFardo = (p) => {
    let basePeso = p.quantidade_unidade || 0;
    if (basePeso === 0) return '-';
    return `${Number(basePeso).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg`;
  };

  const getDisplayUnit = (p: Produto, viewMode: 'unidade' | 'fardo', multiplier: number, hasPack: boolean) => {
    const name = p.nome.toLowerCase();
    const unit = (p.unidade || '').toLowerCase();

    const isGram = unit === 'g' || name.includes('g') || name.includes('grama') || name.includes('gr');
    const isKg = unit === 'kg' || name.includes('kg') || name.includes('kilo');

    if (!hasPack) {
      const pesoUnitario = p.quantidade_unidade || 0;
      if (isGram && !isKg) {
        const grams = pesoUnitario < 10 ? Math.round(pesoUnitario * 1000) : pesoUnitario;
        return `${grams} g`;
      } else if (isKg || (!isGram && pesoUnitario >= 1)) {
        return `${pesoUnitario % 1 === 0 ? pesoUnitario : pesoUnitario.toFixed(2)} kg`;
      } else if (pesoUnitario < 1 && pesoUnitario > 0) {
        return `${Math.round(pesoUnitario * 1000)} g`;
      } else {
        return `${pesoUnitario} ${unit || 'un'}`;
      }
    } else {
      if (viewMode === 'unidade') {
        const pesoUnitario = (p.quantidade_unidade || 0) / multiplier;
        if (isGram && !isKg) {
          const grams = pesoUnitario < 10 ? Math.round(pesoUnitario * 1000) : pesoUnitario;
          return `${grams} g`;
        } else if (isKg || (!isGram && pesoUnitario >= 1)) {
          return `${pesoUnitario % 1 === 0 ? pesoUnitario : pesoUnitario.toFixed(2)} kg`;
        } else if (pesoUnitario < 1 && pesoUnitario > 0) {
          return `${Math.round(pesoUnitario * 1000)} g`;
        } else {
          return `${pesoUnitario % 1 === 0 ? pesoUnitario : pesoUnitario.toFixed(2)} ${unit || 'un'}`;
        }
      } else {
        return `${multiplier} un`;
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSelectedProductIds(produtos.filter(p => p.ativo).map(p => p.id));
      const savedLogo = localStorage.getItem('savedLogo');
      if (savedLogo) {
        setLogoSrc(savedLogo);
      } else {
        getBase64ImageFromUrl('/logo.png').then(src => setLogoSrc(src));
      }
    } else {
      setSelectedProductIds([]);
      setObservacao('');
      setViewMode('fardo');
    }
  }, [isOpen, produtos]);

  const toggleProduct = (id: string) => {
    setSelectedProductIds(prev => 
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF({ orientation: viewMode === 'unidade' ? 'landscape' : 'portrait' });
      const selectedProds = produtos.filter(p => selectedProductIds.includes(p.id));

      if (logoSrc) {
        doc.addImage(logoSrc, 'PNG', 14, 10, 30, 30);
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(27, 67, 50); // Primary green
        doc.text("ESTÂNCIA NOVA OLINDA", 50, 24);
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text(`${viewMode === 'unidade' ? 'Cadastramento' : 'Tabela de Preços'}`, 50, 32);
      } else {
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(27, 67, 50); 
        doc.text("ESTÂNCIA NOVA OLINDA", 14, 22);
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text(`${viewMode === 'unidade' ? 'Cadastramento' : 'Tabela de Preços'}`, 14, 30);
      }
      
      const tableData = selectedProds.map(p => {
        const multiplier = getMultiplier(p.nome);
        const hasPack = multiplier > 1 || p.unidade === 'cx' || p.unidade === 'fd';
        const parts = p.nome.split(' - ');
        let legacyBarcode = '-';
        let nomeProduto = p.nome;
        
        if (parts.length > 1) {
          legacyBarcode = parts.pop() || '-';
          nomeProduto = parts.join(' - ');
        }

        const barcodeFardo = p.codigo_barras || "";
        const barcodeUnit = p.codigo_barras_unitario || legacyBarcode;

        let barcodeExibicao = viewMode === 'fardo' ? (barcodeFardo || barcodeUnit) : barcodeUnit;
        let nomeExibicao = nomeProduto;
        
        if (viewMode === 'unidade' && hasPack && barcodeUnit && barcodeUnit !== '-') {
          nomeExibicao = `${nomeProduto}\n${barcodeUnit}`;
        }

        let precoExibicao = p.preco_base;
        let valorUnitarioExibicao = p.preco_base;
        
        if (hasPack) {
           valorUnitarioExibicao = p.preco_base / multiplier;
        }

        if (hasPack && viewMode === 'unidade') {
          precoExibicao = p.preco_base / multiplier;
        }

        const unidadeExibicao = getDisplayUnit(p, viewMode, multiplier, hasPack);
        const pesoFardo = getPesoFardo(p);
        
        if (viewMode === 'fardo') {
           return [
             nomeProduto,
             `R$ ${formatCurrency(valorUnitarioExibicao)}`,
             unidadeExibicao,
             `R$ ${formatCurrency(precoExibicao)}`
           ];
        } else {
           return [
             nomeProduto,
             `R$ ${formatCurrency(valorUnitarioExibicao)}`,
             barcodeUnit && barcodeUnit !== '-' ? barcodeUnit : '-',
             `R$ ${formatCurrency(p.preco_base)}`,
             `${multiplier} un`,
             pesoFardo,
             barcodeFardo && barcodeFardo !== '-' ? barcodeFardo : '-'
           ];
        }
      });

      const headRows = viewMode === 'fardo' 
        ? [['Produto', 'Valor Unitário', 'Qtd. Fardo/Caixa', 'Preço Fardo/Caixa']]
        : [['Produto', 'Valor Unitário', 'Cód. Barras Unitário', 'Valor Fardo/Caixa', 'Qtd. Fardo/Caixa', 'Peso Fardo/Caixa', 'Cód. Barras Fardo/Caixa']];
        
      const colStyles = viewMode === 'fardo' 
        ? {
          0: { cellWidth: 'auto', fontSize: 7.5, halign: 'left' },
          1: { cellWidth: 25, halign: 'center' },
          2: { cellWidth: 35, halign: 'center' },
          3: { cellWidth: 35, halign: 'center' }
        } : {
          0: { cellWidth: 'auto', fontSize: 7.5, halign: 'left' },
          1: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 35, halign: 'center' },
          3: { cellWidth: 20, halign: 'center' },
          4: { cellWidth: 15, halign: 'center' },
          5: { cellWidth: 20, halign: 'center' },
          6: { cellWidth: 35, halign: 'center' }
        };

      autoTable(doc, {
        startY: 40,
        head: headRows,
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [27, 67, 50], halign: 'center' },
        didParseCell: (data) => {
          if (data.section === 'head' && data.column.index === 0) {
            data.cell.styles.halign = 'left';
          }
        },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: colStyles as any
      });

      if (observacao.trim()) {
        const finalY = (doc as any).lastAutoTable.finalY || 50;
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text("Observações:", 14, finalY + 10);
        
        doc.setFont("helvetica", "normal");
        const splitText = doc.splitTextToSize(observacao, 180);
        doc.text(splitText, 14, finalY + 16);
      }

      doc.save(`Tabela_Precos_Estancia_${new Date().getTime()}.pdf`);
    } catch (err) {
      console.error("Error generating PDF preview", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedProds = produtos.filter(p => selectedProductIds.includes(p.id));

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-[1350px] h-[88vh] rounded-[2rem] shadow-2xl overflow-hidden bg-white border border-gray-100 flex flex-col lg:flex-row"
          >
            {/* Left Panel: Controls */}
            <div className="w-full lg:w-[520px] bg-gray-50 flex flex-col border-r border-gray-200">
              <div className="p-6 border-b border-gray-200 bg-white flex justify-between items-center shrink-0">
                <div>
                  <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                    <FileText size={20} className="text-primary" />
                    Tabela de Preços
                  </h2>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Configurar Exportação</p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">
                    Exportar como:
                  </label>
                  <div className="flex bg-white p-1 rounded-2xl border border-gray-200 shadow-sm">
                    <button
                      onClick={() => setViewMode('unidade')}
                      className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                        viewMode === 'unidade' 
                          ? 'bg-primary text-white shadow-lg shadow-emerald-100' 
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      Cadastramento
                    </button>
                    <button
                      onClick={() => setViewMode('fardo')}
                      className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                        viewMode === 'fardo' 
                          ? 'bg-primary text-white shadow-lg shadow-emerald-100' 
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      Tabela de Preço
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">
                    Logomarca do PDF
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-white border border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-primary/50 transition-colors">
                    {logoSrc ? (
                      <div className="w-8 h-8 rounded overflow-hidden flex items-center justify-center bg-gray-50 border shrink-0">
                        <img src={logoSrc} alt="Logo" className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded bg-gray-50 border flex items-center justify-center text-gray-400 shrink-0">
                        <FileText size={14} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900">{logoSrc ? 'Logo carregada' : 'Adicionar Logo'}</p>
                      <p className="text-[10px] text-gray-500 font-medium">Clique para {logoSrc ? 'alterar' : 'enviar'} imagem</p>
                    </div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            const base64 = reader.result as string;
                            setLogoSrc(base64);
                            localStorage.setItem('savedLogo', base64);
                          };
                          reader.readAsDataURL(file);
                        }
                      }} 
                    />
                  </label>
                  {logoSrc && (
                     <button onClick={() => { setLogoSrc(null); localStorage.removeItem('savedLogo'); }} className="text-[10px] text-red-500 font-bold mt-2 hover:underline">Remover logomarca</button>
                  )}
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Produtos Selecionados ({selectedProductIds.length})
                    </label>
                    <button 
                      onClick={() => setSelectedProductIds(selectedProductIds.length === produtos.length ? [] : produtos.map(p => p.id))}
                      className="text-[10px] font-black text-primary uppercase hover:underline"
                    >
                      {selectedProductIds.length === produtos.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                    </button>
                  </div>
                  <div className="relative mb-3">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text"
                      placeholder="Pesquisar por código ou nome..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div className="space-y-2 max-h-[260px] overflow-y-auto pr-2 custom-scrollbar">
                    {produtos
                      .filter(p => {
                        const q = searchQuery.toLowerCase();
                        const codigo = (p.codigo || '').toLowerCase();
                        const nome = (p.nome || '').toLowerCase();
                        return codigo.includes(q) || nome.includes(q);
                      })
                      .map(p => (
                      <div 
                        key={p.id} 
                        onClick={() => toggleProduct(p.id)}
                        className={`flex items-center gap-3 p-3 bg-white border rounded-xl cursor-pointer transition-colors ${selectedProductIds.includes(p.id) ? 'border-primary/50' : 'border-gray-200 hover:border-primary/30'}`}
                      >
                        <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border transition-colors ${selectedProductIds.includes(p.id) ? 'bg-primary border-primary text-white' : 'border-gray-300'}`}>
                          {selectedProductIds.includes(p.id) && <Check size={14} strokeWidth={3} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 leading-tight">
                            {p.codigo ? <span className="text-primary font-black mr-2 bg-primary/10 px-1.5 py-0.5 rounded text-xs">{p.codigo}</span> : null}
                            {p.nome}
                          </p>
                          <p className="text-xs text-gray-500 font-medium mt-1">
                            {getDisplayUnit(p, viewMode, getMultiplier(p.nome), getMultiplier(p.nome) > 1 || p.unidade === 'cx' || p.unidade === 'fd')} • R$ {formatCurrency(viewMode === 'unidade' && (getMultiplier(p.nome) > 1 || p.unidade === 'cx' || p.unidade === 'fd') ? p.preco_base / getMultiplier(p.nome) : p.preco_base)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">
                    Observações no Rodapé
                  </label>
                  <textarea 
                    rows={4}
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    placeholder="Adicione termos, condições de pagamento ou validade da tabela..."
                    className="w-full px-4 py-3 rounded-xl border outline-none font-medium resize-none bg-white border-gray-200 text-gray-900 focus:border-primary transition-all text-sm"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 bg-white shrink-0">
                <button 
                  onClick={handleDownload}
                  disabled={isGenerating || selectedProductIds.length === 0}
                  className="w-full py-4 bg-primary text-white font-black text-sm uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Download size={18} />
                  {isGenerating ? 'Gerando...' : 'Exportar PDF'}
                </button>
              </div>
            </div>

            {/* Right Panel: HTML Mockup Preview */}
            <div className="flex-1 bg-gray-200 relative hidden lg:flex flex-col items-center p-8 overflow-y-auto">
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-gray-900/80 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase z-10 shadow-xl">
                Pré-visualização do Documento
              </div>
              
              <div className="bg-white shadow-2xl mt-8 mb-8 p-[40px] text-black w-full max-w-[800px] shrink-0" style={{ minHeight: '1122px' }}>
                <div className="flex gap-4 items-center mb-8">
                  {logoSrc && <img src={logoSrc} alt="Logo" className="w-[85px] h-[85px] object-contain" />}
                  <div>
                    <h1 className="text-[28px] font-bold tracking-tight" style={{ color: '#1b4332' }}>ESTÂNCIA NOVA OLINDA</h1>
                    <p className="text-[16px] text-gray-500 font-medium">
                      {viewMode === 'unidade' ? 'Cadastramento' : 'Tabela de Preços'}
                    </p>
                  </div>
                </div>

                <table className="w-full text-left border-collapse text-[12px] mb-8 mt-4">
                  <thead>
                    {viewMode === 'fardo' ? (
                      <tr style={{ backgroundColor: '#1b4332', color: 'white' }}>
                        <th className="p-2 font-bold w-[50%] text-left">Produto</th>
                        <th className="p-2 font-bold w-[15%] text-center">Valor Unitário</th>
                        <th className="p-2 font-bold w-[15%] text-center">Qtd. Fardo/Caixa</th>
                        <th className="p-2 font-bold w-[20%] text-center">Preço Fardo/Caixa</th>
                      </tr>
                    ) : (
                      <tr style={{ backgroundColor: '#1b4332', color: 'white' }}>
                        <th className="p-2 font-bold w-[30%] text-left">Produto</th>
                        <th className="p-2 font-bold w-[10%] text-center">Valor Unitário</th>
                        <th className="p-2 font-bold w-[15%] text-center">Cód. Barras Unitário</th>
                        <th className="p-2 font-bold w-[10%] text-center">Valor Fardo/Caixa</th>
                        <th className="p-2 font-bold w-[10%] text-center">Qtd. Fardo/Caixa</th>
                        <th className="p-2 font-bold w-[10%] text-center">Peso Fardo/Caixa</th>
                        <th className="p-2 font-bold w-[15%] text-center">Cód. Barras Fardo/Caixa</th>
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    {selectedProds.map((p, idx) => {
                      const multiplier = getMultiplier(p.nome);
                      const hasPack = multiplier > 1 || p.unidade === 'cx' || p.unidade === 'fd';
                      const parts = p.nome.split(' - ');
                      let legacyBarcode = '-';
                      let nomeProduto = p.nome;
                      
                      if (parts.length > 1) {
                        legacyBarcode = parts.pop() || '-';
                        nomeProduto = parts.join(' - ');
                      }

                      const barcodeFardo = p.codigo_barras || "";
                      const barcodeUnit = p.codigo_barras_unitario || legacyBarcode;
                      const barcodeExibicao = viewMode === 'fardo' ? (barcodeFardo || barcodeUnit) : barcodeUnit;

                      let precoExibicao = p.preco_base;
                      let valorUnitarioExibicao = p.preco_base;
                      
                      if (hasPack) {
                        valorUnitarioExibicao = p.preco_base / multiplier;
                      }

                      if (hasPack && viewMode === 'unidade') {
                        precoExibicao = p.preco_base / multiplier;
                      }

                      const unidadeExibicao = getDisplayUnit(p, viewMode, multiplier, hasPack);
                      const pesoFardo = getPesoFardo(p);

                      if (viewMode === 'fardo') {
                        return (
                          <tr key={p.id} className={idx % 2 === 1 ? 'bg-gray-50' : 'bg-white'}>
                            <td className="p-2 font-medium text-[11px]">
                              <div>{nomeProduto}</div>
                            </td>
                            <td className="p-2 text-center text-gray-600 font-medium">
                              R$ {formatCurrency(valorUnitarioExibicao)}
                            </td>
                            <td className="p-2 text-center text-gray-600 font-medium">
                              {unidadeExibicao}
                            </td>
                            <td className="p-2 text-center font-medium">
                              R$ {formatCurrency(precoExibicao)}
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={p.id} className={idx % 2 === 1 ? 'bg-gray-50' : 'bg-white'}>
                          <td className="p-2 font-medium text-[11px]">
                            <div>{nomeProduto}</div>
                          </td>
                          <td className="p-2 text-center text-gray-600 font-medium">
                            R$ {formatCurrency(valorUnitarioExibicao)}
                          </td>
                          <td className="p-2 text-center text-gray-600 font-medium text-[11px] break-all">
                            {barcodeUnit && barcodeUnit !== '-' ? barcodeUnit : '-'}
                          </td>
                          <td className="p-2 text-center text-gray-600 font-medium">
                            R$ {formatCurrency(p.preco_base)}
                          </td>
                          <td className="p-2 text-center text-gray-600 font-medium">
                            {multiplier} un
                          </td>
                          <td className="p-2 text-center text-gray-600 font-medium">
                            {pesoFardo}
                          </td>
                          <td className="p-2 text-center text-gray-600 font-medium text-[11px] break-all">
                            {barcodeFardo && barcodeFardo !== '-' ? barcodeFardo : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {observacao.trim() && (
                  <div className="mt-8">
                    <h2 className="text-[14px] font-bold mb-2">Observações:</h2>
                    <p className="text-[14px] text-gray-700 whitespace-pre-wrap">{observacao}</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

