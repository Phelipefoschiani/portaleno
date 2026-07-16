const fs = require('fs');
const file = 'src/components/Fornecedores.tsx';
let content = fs.readFileSync(file, 'utf8');

const totalCalculado = `                  <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-primary uppercase text-xs tracking-widest">Total Calculado (Carga)</span>
                      <span className="text-2xl font-black text-primary">{currentTotalCompra.toFixed(1)} kg</span>
                    </div>
                    {compraForm.ordem_compra_id && (
                      (() => {
                         const ordem = comprasMandioca.find(c => c.id === compraForm.ordem_compra_id);
                         if (!ordem) return null;
                         const diferenca = currentTotalCompra - ordem.quantidade_total;
                         const isPos = diferenca > 0;
                         const isNeg = diferenca < 0;
                         return (
                           <div className={\`mt-2 p-3 rounded-lg border \${isPos ? 'bg-orange-50 border-orange-200' : isNeg ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}\`}>
                              <div className="flex justify-between items-center">
                                <span className={\`text-[10px] font-black uppercase tracking-widest \${isPos ? 'text-orange-700' : isNeg ? 'text-red-700' : 'text-green-700'}\`}>Diferença p/ Ordem:</span>
                                <span className={\`font-black \${isPos ? 'text-orange-600' : isNeg ? 'text-red-600' : 'text-green-600'}\`}>
                                   {isPos ? '+' : ''}{diferenca.toFixed(1)} kg
                                </span>
                              </div>
                           </div>
                         );
                      })()
                    )}
                  </div>`;

content = content.replace(
  /<div className="bg-primary\/5 p-4 rounded-xl border border-primary\/20 flex justify-between items-center">\s*<span className="font-bold text-primary uppercase text-xs tracking-widest">Total Calculado<\/span>\s*<span className="text-2xl font-black text-primary">\{currentTotalCompra\.toFixed\(1\)\} kg<\/span>\s*<\/div>/,
  totalCalculado
);

fs.writeFileSync(file, content);
