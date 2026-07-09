const fs = require('fs');
let code = fs.readFileSync('src/GlobalStateContext.tsx', 'utf8');

const replacements = [
  {
    regex: /const addUsuario = async \(u: Omit<User, \"id\">\) => \{([\s\S]*?)setUsuarios\(\(prev\) => \[\{ \.\.\.u, id: data\[0\]\.id \}, \.\.\.prev\]\);\n  \};/,
    replace: `const addUsuario = async (u: Omit<User, "id">) => {$1setUsuarios((prev) => [{ ...u, id: data[0].id }, ...prev]);\n    logEvent(\`Adicionou usuário: \${u.nome}\`);\n  };`
  },
  {
    regex: /const deleteUsuario = async \(id: string\) => \{([\s\S]*?)setUsuarios\(\(prev\) => prev\.filter\(\(u\) => u\.id !== id\)\);\n  \};/,
    replace: `const deleteUsuario = async (id: string) => {$1setUsuarios((prev) => prev.filter((u) => u.id !== id));\n    const u = usuarios.find(x => x.id === id);\n    logEvent(\`Excluiu usuário: \${u?.nome}\`);\n  };`
  },
  {
    regex: /const addCliente = async \(c: Omit<Cliente, \"id\">\) => \{([\s\S]*?)setClientes\(\(prev\) => \[\{ \.\.\.c, id: data\.id \}, \.\.\.prev\]\);\n  \};/,
    replace: `const addCliente = async (c: Omit<Cliente, "id">) => {$1setClientes((prev) => [{ ...c, id: data.id }, ...prev]);\n    logEvent(\`Adicionou cliente: \${c.nome_fantasia || c.razao_social}\`);\n  };`
  },
  {
    regex: /const deleteCliente = async \(id: string\) => \{([\s\S]*?)setClientes\(\(prev\) => prev\.filter\(\(c\) => c\.id !== id\)\);\n  \};/,
    replace: `const deleteCliente = async (id: string) => {$1setClientes((prev) => prev.filter((c) => c.id !== id));\n    const cli = clientes.find(x => x.id === id);\n    logEvent(\`Excluiu cliente: \${cli?.nome_fantasia || cli?.razao_social}\`);\n  };`
  },
  {
    regex: /const deletePedido = async \(id: string\) => \{([\s\S]*?)setPedidos\(\(prev\) => prev\.filter\(\(p\) => p\.id !== id\)\);\n  \};/,
    replace: `const deletePedido = async (id: string) => {$1setPedidos((prev) => prev.filter((p) => p.id !== id));\n    const ped = pedidos.find(x => x.id === id);\n    logEvent(\`Excluiu pedido do cliente: \${clientes.find(c => c.id === ped?.cliente_id)?.nome_fantasia || 'Desconhecido'}\`, ped?.valor_total);\n  };`
  },
  {
    regex: /const deleteOrcamento = async \(id: string\) => \{([\s\S]*?)setOrcamentos\(\(prev\) => prev\.filter\(\(o\) => o\.id !== id\)\);\n  \};/,
    replace: `const deleteOrcamento = async (id: string) => {$1setOrcamentos((prev) => prev.filter((o) => o.id !== id));\n    const orc = orcamentos.find(x => x.id === id);\n    logEvent(\`Excluiu orçamento\`, orc?.valor_total);\n  };`
  },
  {
    regex: /const addFornecedor = async \(f: Omit<Fornecedor, \"id\">\) => \{([\s\S]*?)setFornecedores\(\(prev\) => \[\{ \.\.\.f, id: data\[0\]\.id \}, \.\.\.prev\]\);\n  \};/,
    replace: `const addFornecedor = async (f: Omit<Fornecedor, "id">) => {$1setFornecedores((prev) => [{ ...f, id: data[0].id }, ...prev]);\n    logEvent(\`Adicionou fornecedor: \${f.nome_fantasia || f.razao_social}\`);\n  };`
  },
  {
    regex: /const deleteFornecedor = async \(id: string\) => \{([\s\S]*?)setFornecedores\(\(prev\) => prev\.filter\(\(f\) => f\.id !== id\)\);\n  \};/,
    replace: `const deleteFornecedor = async (id: string) => {$1setFornecedores((prev) => prev.filter((f) => f.id !== id));\n    const forn = fornecedores.find(x => x.id === id);\n    logEvent(\`Excluiu fornecedor: \${forn?.nome_fantasia || forn?.razao_social}\`);\n  };`
  },
  {
    regex: /const addProduto = async \(p: Omit<Produto, \"id\">\) => \{([\s\S]*?)setProdutos\(\(prev\) => \[\n        \{ \.\.\.p, id: data\.id, custos_detalhados: newCustos \},\n        \.\.\.prev,\n      \]\);\n    \}\n    return true;\n  \};/,
    replace: `const addProduto = async (p: Omit<Produto, "id">) => {$1setProdutos((prev) => [\n        { ...p, id: data.id, custos_detalhados: newCustos },\n        ...prev,\n      ]);\n    }\n    logEvent(\`Adicionou produto: \${p.nome}\`, p.preco_base);\n    return true;\n  };`
  },
  {
    regex: /const deleteProduto = async \(id: string\) => \{([\s\S]*?)setProdutos\(\(prev\) => prev\.filter\(\(p\) => p\.id !== id\)\);\n  \};/,
    replace: `const deleteProduto = async (id: string) => {$1setProdutos((prev) => prev.filter((p) => p.id !== id));\n    const prod = produtos.find(x => x.id === id);\n    logEvent(\`Excluiu produto: \${prod?.nome}\`, prod?.preco_base);\n  };`
  }
];

let changed = code;
replacements.forEach(r => {
  changed = changed.replace(r.regex, r.replace);
});

fs.writeFileSync('src/GlobalStateContext.tsx', changed);
console.log('Update done');
