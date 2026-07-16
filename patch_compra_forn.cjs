const fs = require('fs');
const file = 'src/components/Fornecedores.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldSelect = `<select required value={compraForm.fornecedor_id} onChange={(e) => setCompraForm({...compraForm, fornecedor_id: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none hover:border-gray-300 focus:border-primary transition-all">`;

const newSelect = `<select required value={compraForm.fornecedor_id} onChange={(e) => {
                          const val = e.target.value;
                          const ordens = comprasMandioca.filter(c => c.fornecedor_id === val && c.status_pagamento === 'Ordem de Compra');
                          const novaOrdem = ordens.length > 0 ? ordens[0].id : '';
                          setCompraForm({...compraForm, fornecedor_id: val, ordem_compra_id: novaOrdem});
                       }} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none hover:border-gray-300 focus:border-primary transition-all">`;

content = content.replace(oldSelect, newSelect);

const ordemInfoHTML = `                    {compraForm.ordem_compra_id && (
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

content = content.replace(/<option value="">Nenhuma ordem vinculada<\/option>/, `<option value="">Nenhuma ordem vinculada</option>`);
// Let's just insert it right after the div containing the ordem_compra_id select
content = content.replace(/<\/select>\n                       <\/div>\n                    \)\}/, `</select>\n                       </div>\n                    )}\n${ordemInfoHTML}`);

fs.writeFileSync(file, content);
