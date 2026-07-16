const fs = require('fs');
const file = 'src/components/Fornecedores.tsx';
let content = fs.readFileSync(file, 'utf8');

const modalCode = `
      {/* --- MODAL ORDEM DE COMPRA --- */}
      {activeModal === 'ordemCompra' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-primary/40 backdrop-blur-sm">
           <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-xl max-h-[85vh] overflow-hidden flex flex-col scale-in">
              <div className="p-8 bg-primary text-white flex justify-between items-center shrink-0">
                 <div>
                    <h2 className="text-2xl font-black tracking-tight">Ordem de Compra</h2>
                    <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mt-1">Planejamento de Carga</p>
                 </div>
                 <button onClick={() => setActiveModal('none')} className="hover:rotate-90 transition-all text-white/60 hover:text-white"><X size={24} /></button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
                <form id="ordem-compra-form" onSubmit={handleSaveOrdemCompra} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-1 md:col-span-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Fornecedor <span className="text-red-500">*</span></label>
                       <select required value={ordemCompraForm.fornecedor_id} onChange={(e) => setOrdemCompraForm({...ordemCompraForm, fornecedor_id: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none hover:border-gray-300 focus:border-primary transition-all">
                          <option value="">Selecione...</option>
                          {fornecedores.map((f) => (
                             <option key={f.id} value={f.id}>{f.nome}</option>
                          ))}
                       </select>
                    </div>

                    <div className="col-span-1 md:col-span-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Quantidade Prevista (KG) <span className="text-red-500">*</span></label>
                      <input required type="number" step="0.01" min="0" value={ordemCompraForm.quantidade_total} onChange={(e) => setOrdemCompraForm({...ordemCompraForm, quantidade_total: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none hover:border-gray-300 focus:border-primary transition-all" />
                    </div>

                    <div className="col-span-1 md:col-span-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Data <span className="text-red-500">*</span></label>
                      <input required type="date" value={ordemCompraForm.data} onChange={(e) => setOrdemCompraForm({...ordemCompraForm, data: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none hover:border-gray-300 focus:border-primary transition-all" />
                    </div>
                  </div>
                </form>
              </div>
              <div className="p-6 bg-white border-t border-gray-100 flex justify-end gap-4 shrink-0">
                <button type="button" onClick={() => setActiveModal('none')} className="px-6 py-3 bg-gray-100 text-gray-600 font-black text-sm uppercase tracking-widest rounded-xl hover:bg-gray-200 transition-all">Cancelar</button>
                <button type="submit" form="ordem-compra-form" className="px-8 py-3 bg-primary text-white font-black text-sm uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all shadow-lg flex items-center gap-2">
                   Salvar Ordem
                </button>
              </div>
           </div>
        </div>
      )}
`;

content = content.replace("{/* --- MODAL 2: INCLUIR COMPRA --- */}", modalCode + "\n      {/* --- MODAL 2: INCLUIR COMPRA --- */}");
fs.writeFileSync(file, content);
