const fs = require('fs');
const file = 'src/components/Fornecedores.tsx';
let content = fs.readFileSync(file, 'utf8');

const exportFunc = `
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
    pdf.text(\`Nome: \${f.nome}\`, 20, 59);
    pdf.text(\`Contato: \${f.telefone || 'N/A'}\`, 20, 66);
    pdf.text(\`Localidade: \${f.cidade || 'N/A'} - \${f.estado || 'N/A'}\`, 20, 73);

    // Order Box
    pdf.roundedRect(14, 85, 182, 30, 3, 3, "FD");
    pdf.setFont("helvetica", "bold");
    pdf.text("DETALHES DA ORDEM", 20, 92);
    pdf.setFont("helvetica", "normal");
    pdf.text(\`Data Prevista: \${new Date(c.data).toLocaleDateString()}\`, 20, 99);
    pdf.text(\`Quantidade Prevista (Total In Natura): \${c.quantidade_total.toFixed(2)} kg\`, 20, 106);
    
    // Footer
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text("Este documento é uma Ordem de Compra sugestiva e não substitui o romaneio final.", 105, 280, { align: "center" });

    pdf.save(\`ordem_compra_\${f.nome.replace(/\\s+/g, '_')}_\${c.data}.pdf\`);
  };
`;

content = content.replace(/(const openAnalise =[\s\S]*?\n  \};\n)/, match => exportFunc + '\n  ' + match);

content = content.replace(
  /className=\{\`inline-block px-2 py-1 rounded-lg text-\[10px\] font-bold uppercase tracking-wider \$\{c\.status_pagamento === 'Pago' \? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'\}\`\}/,
  "className={`inline-block px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${c.status_pagamento === 'Pago' ? 'bg-green-100 text-green-700' : c.status_pagamento === 'Ordem de Compra' ? 'bg-blue-100 text-blue-700' : c.status_pagamento === 'Ordem Cumprida' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}"
);

content = content.replace(
  /<button onClick=\{\(\) => openAnalise\(c\.id\)\} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-bold uppercase rounded-lg hover:bg-gray-50 transition-all shadow-sm">Análise Carga<\/button>/,
  `<button onClick={() => openAnalise(c.id)} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-bold uppercase rounded-lg hover:bg-gray-50 transition-all shadow-sm">Análise Carga</button>
                             {c.status_pagamento === 'Ordem de Compra' && (
                                <button onClick={() => exportarOrdemCompra(c.id)} className="ml-2 px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase rounded-lg hover:bg-blue-100 transition-all shadow-sm">Exportar Ordem</button>
                             )}`
);

fs.writeFileSync(file, content);
