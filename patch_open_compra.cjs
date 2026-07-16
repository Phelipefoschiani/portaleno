const fs = require('fs');
const file = 'src/components/Fornecedores.tsx';
let content = fs.readFileSync(file, 'utf8');

const newOpenCompra = `  const openCompraModal = () => {
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
  };`;

content = content.replace(/const openCompraModal = \(\) => \{[\s\S]*?    setActiveModal\('compra'\);\n  \};/, newOpenCompra);

fs.writeFileSync(file, content);
