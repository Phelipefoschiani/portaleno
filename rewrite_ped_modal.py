import re

with open("src/components/PedidosOrcamentos.tsx", "r") as f:
    content = f.read()

start_marker = '{/* Pedido Visualizer */}'
end_marker = '{isNfModalOpen && selectedNfPedido && ('

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Markers not found")
    exit(1)

new_section = """{/* Pedido Visualizer */}
      {isModalOpen && modalType === "Visualizar Pedido" && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col lg:flex-row scale-in relative" id="print-area">
            
            {/* Left Panel: Options & Actions */}
            <div className="w-full lg:w-[350px] border-r border-gray-200 bg-gray-50 flex flex-col shrink-0">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-white">
                <div>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">Visualizar Pedido</h3>
                  <p className="text-xs text-gray-500 font-medium mt-1">Nº {selectedItem.id.split("_")[1] || selectedItem.id.substring(0, 6)}</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 flex-1 flex flex-col justify-center items-center text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mb-2">
                  <Package size={32} />
                </div>
                <h4 className="text-lg font-black text-gray-900">Documento de Venda</h4>
                <p className="text-sm text-gray-500 px-4">
                  Confira as informações ao lado. A exportação em PDF usará esse mesmo formato.
                </p>
              </div>

              <div className="p-6 bg-white border-t border-gray-200 hide-on-print flex flex-col gap-3 shrink-0">
                <button
                  onClick={async () => {
                    await handleDownloadPDF("Pedido", "Pedido");
                  }}
                  disabled={isGeneratingPDF}
                  className={`w-full py-4 font-black text-xs uppercase tracking-widest rounded-xl shadow-md transition-all flex items-center justify-center gap-2 ${
                    isGeneratingPDF ? "bg-emerald-800/50 text-white/50 cursor-not-allowed" : "bg-emerald-800 text-white hover:bg-emerald-900"
                  }`}
                >
                  <Download size={16} />
                  {isGeneratingPDF ? "Gerando..." : "Exportar PDF"}
                </button>
              </div>
            </div>

            {/* Right Panel: HTML Mockup Preview */}
            <div className="flex-1 bg-gray-200 relative flex flex-col items-center p-8 overflow-y-auto">
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-gray-900/80 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase z-10 shadow-xl hidden lg:block">
                Pré-visualização do Documento
              </div>
              
              <div className="bg-white shadow-2xl mt-8 mb-8 text-black w-full max-w-[800px] shrink-0 print-content" style={{ minHeight: '1122px' }}>
                <div className="p-[40px] pb-6" style={{ backgroundColor: '#1b4332', color: 'white' }}>
                  <div className="flex justify-between items-center">
                    <div>
                      <h1 className="text-[28px] font-bold tracking-tight">ESTÂNCIA NOVA OLINDA</h1>
                      <p className="text-[16px] font-medium opacity-90 mt-1 uppercase tracking-widest">
                        CONFIRMAÇÃO DE PEDIDO DE VENDA
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm opacity-80">Data: {new Date(selectedItem.data).toLocaleDateString("pt-BR")}</p>
                      <p className="text-sm opacity-80 mt-1">Nº {selectedItem.id.split("_")[1]}</p>
                    </div>
                  </div>
                </div>

                <div className="p-[40px] pt-6 font-sans">
                  <div className="mb-8 border border-gray-200 rounded-lg overflow-hidden grid grid-cols-1 md:grid-cols-2">
                    <div className="p-4 border-b md:border-b-0 md:border-r border-gray-200">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Dados do Cliente</p>
                      <p className="font-bold text-gray-900 text-sm mb-1">
                        {clientes.find((c) => c.id === selectedItem.cliente_id)?.razao_social || "Desconhecido"}
                      </p>
                      <p className="text-xs text-gray-600">
                        CNPJ/CPF: {clientes.find((c) => c.id === selectedItem.cliente_id)?.cnpj_cpf || "-"}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {clientes.find((c) => c.id === selectedItem.cliente_id)?.endereco || "-"}, {clientes.find((c) => c.id === selectedItem.cliente_id)?.cidade || "-"}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Previsão e Logística</p>
                      <p className="text-xs text-gray-600 mt-1"><strong className="text-gray-800">Prazo de Entrega:</strong> {selectedItem.prazo_entrega ? (/^\d{4}-\d{2}-\d{2}/.test(selectedItem.prazo_entrega) ? new Date(selectedItem.prazo_entrega).toLocaleDateString("pt-BR", { timeZone: 'UTC' }) : selectedItem.prazo_entrega) : "A definir"}</p>
                      {(selectedItem as any).data_vencimento && (
                        <p className="text-xs text-gray-600 mt-1"><strong className="text-gray-800">Vencimento:</strong> {new Date((selectedItem as any).data_vencimento).toLocaleDateString("pt-BR", { timeZone: 'UTC' })}</p>
                      )}
                      <p className="text-xs text-gray-600 mt-1"><strong className="text-gray-800">Vendedor:</strong> {usuarios.find(u => u.id === selectedItem.representante_id)?.nome || "Venda Direta"}</p>
                    </div>
                  </div>

                  <div className="mb-8">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr style={{ backgroundColor: '#1b4332', color: 'white' }}>
                          <th className="p-3 text-xs font-bold w-[45%]">Produto</th>
                          <th className="p-3 text-xs font-bold w-[15%] text-center">Qtd</th>
                          <th className="p-3 text-xs font-bold w-[20%] text-right">Preço Un.</th>
                          <th className="p-3 text-xs font-bold w-[20%] text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedItem.items.map((it: any, i: number) => {
                          const p = produtos.find((x) => x.id === it.produto_id);
                          const precoEf = it.tipo === 'bonificacao' ? 0 : it.preco - (it.desconto || 0);
                          return (
                            <tr key={i} className={i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}>
                              <td className="p-3 border-b border-gray-100">
                                <span className="font-bold text-xs text-gray-900">{p?.nome || "Desconhecido"}</span>
                                {it.tipo === 'bonificacao' && <span className="ml-2 text-[8px] font-black uppercase text-blue-600 bg-blue-50 px-1 py-0.5 rounded">Bonificação</span>}
                                <span className="block text-[10px] text-gray-500 mt-0.5">
                                  Peso: {p ? (p.unidade === 'g' ? ((it.quantidade * (p.quantidade_unidade || 1)) / 1000).toFixed(2) : (it.quantidade * (p.quantidade_unidade || 1)).toFixed(2)) : '0.00'} kg
                                </span>
                              </td>
                              <td className="p-3 border-b border-gray-100 font-bold text-gray-900 text-center text-xs">
                                {it.quantidade}
                              </td>
                              <td className="p-3 border-b border-gray-100 font-medium text-gray-700 text-right text-xs whitespace-nowrap">
                                R$ {formatCurrency(precoEf)}
                              </td>
                              <td className="p-3 border-b border-gray-100 font-black text-gray-900 text-right text-xs whitespace-nowrap">
                                R$ {formatCurrency((it.quantidade * precoEf))}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-gray-800">
                          <td colSpan={3} className="py-4 font-black text-right tracking-widest uppercase text-gray-600 text-[10px]">
                            Valor Total do Pedido
                          </td>
                          <td className="py-4 font-black text-lg text-right text-emerald-700 whitespace-nowrap">
                            R$ {formatCurrency(selectedItem.valor_total)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      """

new_content = content[:start_idx] + new_section + content[end_idx:]

with open("src/components/PedidosOrcamentos.tsx", "w") as f:
    f.write(new_content)

print("Done")
