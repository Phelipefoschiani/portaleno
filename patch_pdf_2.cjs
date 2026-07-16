const fs = require('fs');
const file = 'src/components/Fornecedores.tsx';
let content = fs.readFileSync(file, 'utf8');

const updatedExportFunc = `
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
    pdf.text(\`\${new Date(c.data).toLocaleDateString()}\`, 20, 115);
    pdf.setFontSize(14);
    pdf.setTextColor(6, 78, 59);
    pdf.text(\`\${c.quantidade_total.toFixed(2)} KG\`, 80, 115);
    
    pdf.save(\`ordem_compra_\${f.nome.replace(/\\s+/g, '_')}_\${c.data}.pdf\`);
  };
`;

content = content.replace(/const exportarOrdemCompra = \(id: string\) => \{[\s\S]*?    pdf\.save\([\s\S]*?\);\n  \};/, updatedExportFunc.trim());

fs.writeFileSync(file, content);
