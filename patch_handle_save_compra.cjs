const fs = require('fs');
const file = 'src/components/Fornecedores.tsx';
let content = fs.readFileSync(file, 'utf8');

const newSave = `  const handleSaveCompra = (e: React.FormEvent) => {
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
    
    const prq = Number((compraForm as any).preco_quilo) || 1.25;

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
      valor_total: total * prq
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
      ordem_compra_id: ''
    } as any);
  };`;

content = content.replace(/const handleSaveCompra = \(e: React\.FormEvent\) => \{[\s\S]*?    setCompraForm\([\s\S]*?\);\n  \};/, newSave);

fs.writeFileSync(file, content);
