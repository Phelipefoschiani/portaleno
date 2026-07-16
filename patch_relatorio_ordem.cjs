const fs = require('fs');
const file = 'src/components/Fornecedores.tsx';
let content = fs.readFileSync(file, 'utf8');

// Update activeModal
content = content.replace(
  /const \[activeModal, setActiveModal\] = useState<'none' \| 'form' \| 'compra' \| 'historico' \| 'analise' \| 'relatorio' \| 'ordemCompra'>\('none'\);/,
  "const [activeModal, setActiveModal] = useState<'none' | 'form' | 'compra' | 'historico' | 'analise' | 'relatorio' | 'ordemCompra' | 'relatorioOrdem'>('none');"
);

// Add relatorioOrdem state
const stateToAdd = `
  const [relatorioOrdem, setRelatorioOrdem] = useState({
     ordem_id: '',
     fornecedor_id: '',
     total_recebido: 0,
     pesagens: [] as number[],
     tipo_pesagem: 'total'
  });
`;
content = content.replace(/(const \[activeModal, setActiveModal\] = [\s\S]*?\n)/, match => match + stateToAdd);

// Generate modal JSX
const modalJSX = `
      {/* --- MODAL RELATORIO DE ORDEM DE COMPRA --- */}
      {activeModal === 'relatorioOrdem' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-8 bg-primary/40 backdrop-blur-sm">
           <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col scale-in" id="relatorio-diferenca">
              <div className="p-8 bg-primary text-white flex justify-between items-center shrink-0">
                 <div>
                    <h2 className="text-2xl font-black tracking-tight">Relatório de Recebimento</h2>
                    <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mt-1">Comparativo de Ordem de Compra</p>
                 </div>
                 <button onClick={() => setActiveModal('none')} className="hover:rotate-90 transition-all text-white/60 hover:text-white"><X size={24} /></button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 bg-gray-50 space-y-6">
                {(() => {
                  const ordem = comprasMandioca.find(c => c.id === relatorioOrdem.ordem_id);
                  const forn = fornecedores.find(f => f.id === relatorioOrdem.fornecedor_id);
                  if (!ordem || !forn) return null;
                  
                  const diferenca = relatorioOrdem.total_recebido - ordem.quantidade_total;
                  const isPos = diferenca > 0;
                  const isNeg = diferenca < 0;

                  return (
                    <>
                      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <h3 className="font-bold text-gray-800 mb-4 uppercase tracking-widest text-xs border-b pb-2">Resumo do Recebimento</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                             <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Fornecedor</span>
                             <span className="font-bold text-gray-800">{forn.nome}</span>
                          </div>
                          <div>
                             <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Data da Carga</span>
                             <span className="font-bold text-gray-800">{new Date().toLocaleDateString()}</span>
                          </div>
                          <div>
                             <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Previsto (Ordem)</span>
                             <span className="font-black text-blue-600 text-lg">{ordem.quantidade_total.toFixed(2)} kg</span>
                          </div>
                          <div>
                             <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Recebido Real</span>
                             <span className="font-black text-emerald-600 text-lg">{relatorioOrdem.total_recebido.toFixed(2)} kg</span>
                          </div>
                        </div>
                        
                        <div className={\`mt-4 p-4 rounded-xl border \${isPos ? 'bg-orange-50 border-orange-200' : isNeg ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}\`}>
                           <span className={\`text-xs font-black uppercase tracking-widest block mb-1 \${isPos ? 'text-orange-700' : isNeg ? 'text-red-700' : 'text-green-700'}\`}>Diferença</span>
                           <span className={\`text-2xl font-black \${isPos ? 'text-orange-600' : isNeg ? 'text-red-600' : 'text-green-600'}\`}>
                             {isPos ? '+' : ''}{diferenca.toFixed(2)} kg
                           </span>
                           <p className={\`text-[10px] font-bold mt-1 \${isPos ? 'text-orange-600/70' : isNeg ? 'text-red-600/70' : 'text-green-600/70'}\`}>
                             {isPos ? 'Carga excedeu a ordem de compra.' : isNeg ? 'Carga veio menor que a ordem de compra.' : 'Carga veio exatamente como a ordem de compra.'}
                           </p>
                        </div>
                      </div>

                      {relatorioOrdem.tipo_pesagem === 'sacos' && relatorioOrdem.pesagens.length > 0 && (
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                           <h3 className="font-bold text-gray-800 mb-4 uppercase tracking-widest text-xs border-b pb-2">Detalhamento dos Sacos</h3>
                           <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                             {relatorioOrdem.pesagens.map((peso, idx) => (
                               <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-center">
                                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block">Saco {idx + 1}</span>
                                  <span className="font-bold text-gray-800">{peso.toFixed(1)}</span>
                               </div>
                             ))}
                           </div>
                           <div className="mt-4 pt-4 border-t flex justify-between items-center font-black">
                              <span className="text-gray-500 uppercase tracking-widest text-xs">Total de Sacos: {relatorioOrdem.pesagens.length}</span>
                              <span className="text-gray-900">{relatorioOrdem.total_recebido.toFixed(1)} kg</span>
                           </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
              <div className="p-6 bg-white border-t border-gray-100 flex justify-end gap-4 shrink-0">
                <button type="button" onClick={() => setActiveModal('none')} className="px-6 py-3 bg-gray-100 text-gray-600 font-black text-sm uppercase tracking-widest rounded-xl hover:bg-gray-200 transition-all">Fechar</button>
                <button type="button" onClick={() => {
                  import('html2canvas').then(({ default: html2canvas }) => {
                    const el = document.getElementById('relatorio-diferenca');
                    if (el) {
                      const buttons = el.querySelector('.bg-white.border-t.border-gray-100.flex.justify-end');
                      if (buttons) (buttons as HTMLElement).style.display = 'none';
                      html2canvas(el, { scale: 2 }).then(canvas => {
                        const link = document.createElement('a');
                        link.download = \`relatorio_recebimento_\${relatorioOrdem.fornecedor_id}.jpg\`;
                        link.href = canvas.toDataURL('image/jpeg', 0.9);
                        link.click();
                        if (buttons) (buttons as HTMLElement).style.display = 'flex';
                      });
                    }
                  });
                }} className="px-8 py-3 bg-primary text-white font-black text-sm uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all shadow-lg flex items-center gap-2">
                   Salvar em JPG
                </button>
              </div>
           </div>
        </div>
      )}
`;

content = content.replace("{/* --- MODAL ORDEM DE COMPRA --- */}", modalJSX + "\n      {/* --- MODAL ORDEM DE COMPRA --- */}");

fs.writeFileSync(file, content);
