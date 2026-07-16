const fs = require('fs');
const file = 'src/components/Fornecedores.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /const \[compraForm, setCompraForm\] = useState\(\{[\s\S]*?data: new Date\(\)\.toISOString\(\)\.split\('T'\)\[0\]\n  \}\);/,
  `const [compraForm, setCompraForm] = useState({
    fornecedor_id: '',
    tipo_pesagem: 'sacos' as 'sacos' | 'total',
    sacos: [] as string[],
    pesoInput: '',
    data: new Date().toISOString().split('T')[0],
    ordem_compra_id: ''
  });`
);

fs.writeFileSync(file, content);
