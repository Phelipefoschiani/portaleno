const fs = require('fs');
const file = 'src/components/Fornecedores.tsx';
let content = fs.readFileSync(file, 'utf8');

const replacement = `<button onClick={() => openAnalise(c.id)} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-bold uppercase rounded-lg hover:bg-gray-50 transition-all shadow-sm">Análise Carga</button>
                             {c.status_pagamento === 'Ordem de Compra' && (
                                <button onClick={() => exportarOrdemCompra(c.id)} className="ml-2 px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase rounded-lg hover:bg-blue-100 transition-all shadow-sm">Exportar Ordem</button>
                             )}
                             {c.ordem_compra_id && (
                                <button onClick={() => {
                                  setRelatorioOrdem({
                                     ordem_id: c.ordem_compra_id,
                                     fornecedor_id: c.fornecedor_id,
                                     total_recebido: c.quantidade_total,
                                     pesagens: c.pesagens_sacos || [],
                                     tipo_pesagem: c.tipo_pesagem || 'total'
                                  });
                                  setActiveModal('relatorioOrdem');
                                }} className="ml-2 px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold uppercase rounded-lg hover:bg-emerald-100 transition-all shadow-sm">Ver Relatório</button>
                             )}`;

content = content.replace(
  /<button onClick=\{\(\) => openAnalise\(c\.id\)\} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-bold uppercase rounded-lg hover:bg-gray-50 transition-all shadow-sm">Análise Carga<\/button>\s*\{c\.status_pagamento === 'Ordem de Compra' && \(\s*<button onClick=\{\(\) => exportarOrdemCompra\(c\.id\)\} className="ml-2 px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase rounded-lg hover:bg-blue-100 transition-all shadow-sm">Exportar Ordem<\/button>\s*\)\}/,
  replacement
);

fs.writeFileSync(file, content);
