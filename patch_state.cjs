const fs = require('fs');
const file = 'src/components/Fornecedores.tsx';
let content = fs.readFileSync(file, 'utf8');

const newState = `
  const [ordemCompraForm, setOrdemCompraForm] = useState({
    fornecedor_id: '',
    quantidade_total: '',
    data: new Date().toISOString().split('T')[0]
  });
`;

content = content.replace(/(const \[analiseForm)/, match => newState + "\n  " + match);

content = content.replace(/tipo_pesagem: 'sacos' \| 'total'; pesoInput: string; sacos: string\[\]; preco_quilo: string;/, "tipo_pesagem: 'sacos' | 'total'; pesoInput: string; sacos: string[]; preco_quilo: string; ordem_compra_id?: string;");

fs.writeFileSync(file, content);
