const fs = require('fs');
const file = 'src/components/Fornecedores.tsx';
let content = fs.readFileSync(file, 'utf8');

const vinculadaHTML = `                    {compraForm.fornecedor_id && comprasMandioca.filter(c => c.fornecedor_id === compraForm.fornecedor_id && c.status_pagamento === 'Ordem de Compra').length > 0 && (
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
`;

content = content.replace(
  /<\/select>\n                    <\/div>/,
  `</select>\n                    </div>\n${vinculadaHTML}`
);

fs.writeFileSync(file, content);
