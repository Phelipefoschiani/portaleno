const fs = require('fs');

let code = fs.readFileSync('src/GlobalStateContext.tsx', 'utf8');

// Utilities to easily inject code before function returns
function injectBeforeReturn(code, markerStr, injectionStr) {
  if (!code.includes(injectionStr)) {
    return code.replace(markerStr, injectionStr + '\n    ' + markerStr.trim());
  }
  return code;
}

code = code.replace(/if \(data\) setUsuarios\(\(prev\) => \[\.\.\.prev, data\]\);/, 'if (data) { setUsuarios((prev) => [...prev, data]); logEvent(`Adicionou usuário: ${u.nome}`); }');

code = code.replace(/if \(data\) setUsuarios\(\(prev\) => prev\.map\(\(u\) => \(u\.id === id \? data : u\)\)\);/, 'if (data) { setUsuarios((prev) => prev.map((u) => (u.id === id ? data : u))); logEvent(`Atualizou usuário: ${updatedFields.nome || "Usuário"}`); }');

code = code.replace(/if \(data\) setClientes\(\(prev\) => \[\.\.\.prev, data\]\);/, 'if (data) { setClientes((prev) => [...prev, data]); logEvent(`Adicionou cliente: ${payload.nome_fantasia || payload.razao_social}`); }');


code = code.replace(/if \(data\) setFornecedores\(\(prev\) => \[\.\.\.prev, data\]\);/, 'if (data) { setFornecedores((prev) => [...prev, data]); logEvent(`Adicionou fornecedor: ${f.nome_fantasia || f.razao_social}`); }');

code = code.replace(/if \(data\) setFornecedores\(\(prev\) => prev\.map\(\(f\) => \(f\.id === id \? data : f\)\)\);/, 'if (data) { setFornecedores((prev) => prev.map((f) => (f.id === id ? data : f))); logEvent(`Atualizou fornecedor.`); }');

code = code.replace(/await supabase\.from\("fornecedores"\)\.delete\(\)\.eq\("id", id\);\n\s+setFornecedores\(\(prev\) => prev\.filter\(\(f\) => f\.id !== id\)\);/g, 'const forn = fornecedores.find(x => x.id === id); if(forn) logEvent(`Excluiu fornecedor: ${forn.nome_fantasia || forn.razao_social}`); await supabase.from("fornecedores").delete().eq("id", id); setFornecedores((prev) => prev.filter((f) => f.id !== id));');

code = code.replace(/const addCompraMandioca = async \(c: Omit<CompraMandioca, "id">\) => \{([\s\S]*?)setComprasMandioca\(\(prev\) => \[\.\.\.prev, finalData\]\);\n\s+return finalData;\n\s+\}\n\s+return null;\n\s+\};/, 'const addCompraMandioca = async (c: Omit<CompraMandioca, "id">) => {$1setComprasMandioca((prev) => [...prev, finalData]); logEvent(`Adicionou compra de mandioca`, c.valor_total); return finalData; } return null; };');

code = code.replace(/const updateCompraMandioca = async \(([\s\S]*?)const updated = \{ \.\.\.c, \.\.\.rest, pesagens_sacos: newPesagens \};\n\s+setComprasMandioca\(\(prev\) =>\n\s+prev\.map\(\(comp\) => \(comp\.id === id \? updated : comp\)\),\n\s+\);\n\s+return true;\n\s+\}\n\s+return false;\n\s+\};/, 'const updateCompraMandioca = async ($1const updated = { ...c, ...rest, pesagens_sacos: newPesagens }; setComprasMandioca((prev) => prev.map((comp) => (comp.id === id ? updated : comp))); logEvent(`Atualizou compra de mandioca`, rest.valor_total); return true; } return false; };');

code = code.replace(/const deleteCompraMandioca = async \(id: string\) => \{\n\s+await supabase\.from\("compras_mandioca"\)\.delete\(\)\.eq\("id", id\);\n\s+setComprasMandioca\(\(prev\) => prev\.filter\(\(c\) => c\.id !== id\)\);\n\s+\};/, 'const deleteCompraMandioca = async (id: string) => { const obj = comprasMandioca.find(c => c.id === id); if(obj) logEvent(`Excluiu compra de mandioca`, obj.valor_total); await supabase.from("compras_mandioca").delete().eq("id", id); setComprasMandioca((prev) => prev.filter((c) => c.id !== id)); };');

code = code.replace(/if \(data\) setProducoes\(\(prev\) => \[\.\.\.prev, data\]\);/, 'if (data) { setProducoes((prev) => [...prev, data]); logEvent(`Adicionou produção: ${data.lote}`); }');

code = code.replace(/if \(data\) setProducoes\(\(prev\) => prev\.map\(\(p\) => \(p\.id === id \? data : p\)\)\);/, 'if (data) { setProducoes((prev) => prev.map((p) => (p.id === id ? data : p))); logEvent(`Atualizou produção: ${data.lote}`); }');

code = code.replace(/const deleteProducao = async \(id: string\) => \{\n\s+await supabase\.from\("producoes"\)\.delete\(\)\.eq\("id", id\);\n\s+setProducoes\(\(prev\) => prev\.filter\(\(p\) => p\.id !== id\)\);\n\s+\};/, 'const deleteProducao = async (id: string) => { const obj = producoes.find(p => p.id === id); if(obj) logEvent(`Excluiu produção: ${obj.lote}`); await supabase.from("producoes").delete().eq("id", id); setProducoes((prev) => prev.filter((p) => p.id !== id)); };');

code = code.replace(/if \(data\) setDespesas\(\(prev\) => \[\.\.\.prev, data\]\);/, 'if (data) { setDespesas((prev) => [...prev, data]); logEvent(`Adicionou despesa: ${data.descricao}`, data.valor); }');

code = code.replace(/if \(data\) \{\n\s+const updatedList = prev\.map\(\(d\) => \(d\.id === id \? data : d\)\);\n\s+return updatedList\.sort\(\(a, b\) => new Date\(b\.data\)\.getTime\(\) - new Date\(a\.data\)\.getTime\(\)\);\n\s+\}\);\n\s+\}/, 'if (data) { setDespesas((prev) => { const updatedList = prev.map((d) => (d.id === id ? data : d)); return updatedList.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()); }); logEvent(`Atualizou despesa: ${data.descricao}`, data.valor); }');

code = code.replace(/if \(data\) setProdutos\(\(prev\) => \[\n\s+\{ \.\.\.p, id: data\.id, custos_detalhados: newCustos \},\n\s+\.\.\.prev,\n\s+\]\);\n\s+\}\n\s+return true;/, 'if (data) { setProdutos((prev) => [\n        { ...p, id: data.id, custos_detalhados: newCustos },\n        ...prev,\n      ]); logEvent(`Adicionou produto: ${p.nome}`, p.preco_base); } return true;');

code = code.replace(/const updateOrcamento = async \(([\s\S]*?)setOrcamentos\(\(prev\) =>\n\s+prev\.map\(\(o\) =>\n\s+o\.id === id \? \{ \.\.\.o, \.\.\.rest, items: updatedItems \} : o,\n\s+\),\n\s+\);\n\s+\};/, 'const updateOrcamento = async ($1setOrcamentos((prev) => prev.map((o) => o.id === id ? { ...o, ...rest, items: updatedItems } : o)); logEvent(`Atualizou orçamento`, (rest as any).valor_total); };');

code = code.replace(/          logEvent\(`Excluiu orçamento`, orc\?\.valor_total\);\n/, '');

fs.writeFileSync('src/GlobalStateContext.tsx', code);
console.log('Update 2 done');
