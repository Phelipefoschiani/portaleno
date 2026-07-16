const fs = require('fs');
const file = 'src/components/Fornecedores.tsx';
let content = fs.readFileSync(file, 'utf8');

const stateRegex = /const \[compraForm, setCompraForm\] = useState\(\{[\s\S]*?\}\);/;
const newState = `
  const [ordemCompraForm, setOrdemCompraForm] = useState({
    fornecedor_id: '',
    quantidade_total: '',
    data: new Date().toISOString().split('T')[0]
  });
`;
content = content.replace(stateRegex, match => match + newState);

const submitRegex = /const handleSaveCompra = \(e: React\.FormEvent\) => \{[\s\S]*?\}\n    \};\n\n    addCompraMandioca\([\s\S]*?\);\n\n    setActiveModal\('none'\);\n    setCompraForm\(\{[\s\S]*?\}\);\n  \};/;
const newSubmit = `
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
`;
// Actually, it's easier to just insert after handleSaveCompra definition
content = content.replace(/(const handleSaveCompra =[\s\S]*?  \};\n)/, match => match + '\n' + newSubmit);

fs.writeFileSync(file, content);
