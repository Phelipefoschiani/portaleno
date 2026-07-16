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
    
    // Empresa Box
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(226, 232, 240);
    pdf.roundedRect(14, 45, 182, 30, 3, 3, "FD");
    
    pdf.setFont("helvetica", "bold");
    pdf.text("DADOS DA ESTÂNCIA", 20, 52);
    pdf.setFont("helvetica", "normal");
    pdf.text("Estância Nova Olinda", 20, 59);
    pdf.text("Cnpj/Cpf: (Informar Documento)", 20, 66);

    // Fornecedor Box
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(226, 232, 240);
    pdf.roundedRect(14, 80, 182, 35, 3, 3, "FD");
    
    pdf.setFont("helvetica", "bold");
    pdf.text("DADOS DO FORNECEDOR", 20, 87);
    pdf.setFont("helvetica", "normal");
    pdf.text(\`Nome: \${f.nome}\`, 20, 94);
    pdf.text(\`Contato: \${f.telefone || 'N/A'}\`, 20, 101);
    pdf.text(\`Localidade: \${f.cidade || 'N/A'} - \${f.estado || 'N/A'}\`, 20, 108);

    // Order Box
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(14, 120, 182, 35, 3, 3, "FD");
    pdf.setFont("helvetica", "bold");
    pdf.text("DETALHES DA ORDEM", 20, 127);
    pdf.setFont("helvetica", "normal");
    pdf.text(\`Data Prevista: \${new Date(c.data).toLocaleDateString()}\`, 20, 134);
    pdf.text(\`Quantidade Prevista (Total In Natura): \${c.quantidade_total.toFixed(2)} kg\`, 20, 141);
    
    // Footer
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text("Este documento é uma Ordem de Compra sugestiva e não substitui o romaneio final.", 105, 280, { align: "center" });

    pdf.save(\`ordem_compra_\${f.nome.replace(/\\s+/g, '_')}_\${c.data}.pdf\`);
  };
`;

content = content.replace(/const exportarOrdemCompra = \(id: string\) => \{[\s\S]*?    pdf\.save\([\s\S]*?\);\n  \};/, updatedExportFunc.trim());

fs.writeFileSync(file, content);
