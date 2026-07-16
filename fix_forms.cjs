const fs = require('fs');
const file = 'src/components/Fornecedores.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove from ordem-compra-form
content = content.replace(
  /                    \{compraForm\.fornecedor_id && comprasMandioca\.filter\(c => c\.fornecedor_id === compraForm\.fornecedor_id && c\.status_pagamento === 'Ordem de Compra'\)\.length > 0 && \([\s\S]*?                     <\/div>\n                    \)\}/g,
  ""
);

// 2. Add to compra-form (the right one)
const ordemInfoHTML = `                    {compraForm.fornecedor_id && comprasMandioca.filter(c => c.fornecedor_id === compraForm.fornecedor_id && c.status_pagamento === 'Ordem de Compra').length > 0 && (
                       <div className="col-span-1 md:col-span-3">
                          <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1 block">Ordem de Compra Vinculada (Opcional)</label>
                          <select value={compraForm.ordem_compra_id || ''} onChange={(e) => setCompraForm({...compraForm, ordem_compra_id: e.target.value})} className="w-full bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm font-bold text-blue-900 outline-none hover:border-blue-300 focus:border-blue-500 transition-all">
                            <option value="">Nenhuma ordem vinculada</option>
                            {comprasMandioca.filter(c => c.fornecedor_id === compraForm.fornecedor_id && c.status_pagamento === 'Ordem de Compra').map(o => (
                              <option key={o.id} value={o.id}>Ordem de {new Date(o.data).toLocaleDateString()} - {o.quantidade_total.toFixed(2)} kg</option>
                            ))}
                          </select>
                       </div>
                    )}
                    {compraForm.ordem_compra_id && (
                       <div className="col-span-1 md:col-span-3 bg-blue-50 border border-blue-100 rounded-xl p-4 flex justify-between items-center">
                          <div>
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block">Ordem de Compra Selecionada</span>
                            <span className="text-sm font-bold text-blue-900">Total Previsto:</span>
                          </div>
                          <span className="text-xl font-black text-blue-700">
                             {comprasMandioca.find(c => c.id === compraForm.ordem_compra_id)?.quantidade_total.toFixed(2)} kg
                          </span>
                       </div>
                    )}`;

const compraFormSelectEnd = `                       </select>\n                    </div>`;

content = content.replace(
  /<form id="compra-form" onSubmit=\{handleSaveCompra\} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">[\s\S]*?<\/select>\n                    <\/div>/,
  match => match + "\n" + ordemInfoHTML
);

fs.writeFileSync(file, content);
