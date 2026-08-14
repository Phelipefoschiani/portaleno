import re

with open("src/components/PedidosOrcamentos.tsx", "r") as f:
    content = f.read()

# We want to find the Visualizar Orcamento block and replace it.
# The block starts at: {isModalOpen && modalType === "Visualizar Orcamento" && selectedItem && (
# and ends right before: {/* Pedido Visualizer */}

start_marker = '{/* Proposal Visualizer */}'
end_marker = '{/* Pedido Visualizer */}'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Markers not found")
    exit(1)

# We will completely replace this section.
new_section = """{/* Proposal Visualizer */}
      {isModalOpen && modalType === "Visualizar Orcamento" && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col lg:flex-row scale-in relative" id="print-area">
            
            {/* Left Panel: Options & Actions */}
            <div className="w-full lg:w-[400px] border-r border-gray-200 bg-gray-50 flex flex-col shrink-0">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-white">
                <div>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">Opções de Exportação</h3>
                  <p className="text-xs text-gray-500 font-medium mt-1">Configurações do PDF</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                <div className="flex flex-col gap-2 p-4 bg-white border border-gray-200/80 rounded-2xl shadow-sm">
                  <span className="text-xs font-bold text-gray-800 text-left">Título do Documento</span>
                  <div className="flex flex-col gap-3 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="nomeDocumento"
                        value="Orçamento"
                        checked={exportOptionsModal.nomeDocumento === "Orçamento"}
                        onChange={(e) => setExportOptionsModal({ ...exportOptionsModal, nomeDocumento: "Orçamento" })}
                        className="accent-emerald-700"
                      />
                      <span className="text-sm text-gray-700 font-medium">Orçamento</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="nomeDocumento"
                        value="Pedido Sugestivo"
                        checked={exportOptionsModal.nomeDocumento === "Pedido Sugestivo"}
                        onChange={(e) => setExportOptionsModal({ ...exportOptionsModal, nomeDocumento: "Pedido Sugestivo" })}
                        className="accent-emerald-700"
                      />
                      <span className="text-sm text-gray-700 font-medium">Pedido Sugestivo</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="nomeDocumento"
                        value="Pedido"
                        checked={exportOptionsModal.nomeDocumento === "Pedido"}
                        onChange={(e) => setExportOptionsModal({ ...exportOptionsModal, nomeDocumento: "Pedido" })}
                        className="accent-emerald-700"
                      />
                      <span className="text-sm text-gray-700 font-medium">Pedido</span>
                    </label>
                  </div>
                </div>

                <label className="flex items-center gap-3 p-4 bg-white hover:bg-gray-50 border border-gray-200/80 rounded-2xl cursor-pointer transition-all shadow-sm">
                  <input
                    type="checkbox"
                    checked={exportOptionsModal.includeCondicao}
                    onChange={(e) => setExportOptionsModal({ ...exportOptionsModal, includeCondicao: e.target.checked })}
                    className="w-5 h-5 accent-emerald-700 rounded border-gray-300"
                  />
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-gray-800">Condição de Pagamento</span>
                    <span className="text-[10px] text-gray-400 font-semibold text-left">
                      {selectedItem.condicao_pagamento || "A Combinar"}
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 bg-white hover:bg-gray-50 border border-gray-200/80 rounded-2xl cursor-pointer transition-all shadow-sm">
                  <input
                    type="checkbox"
                    checked={exportOptionsModal.includePrazo}
                    onChange={(e) => setExportOptionsModal({ ...exportOptionsModal, includePrazo: e.target.checked })}
                    className="w-5 h-5 accent-emerald-700 rounded border-gray-300"
                  />
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-gray-800">Prazo de Entrega</span>
                    <span className="text-[10px] text-gray-400 font-semibold text-left">
                      {selectedItem.prazo_entrega || "A Combinar"}
                    </span>
                  </div>
                </label>
              </div>

              <div className="p-6 bg-white border-t border-gray-200 hide-on-print flex flex-col gap-3 shrink-0">
                <button
                  onClick={async () => {
                    await handleDownloadPDF(
                      "Orcamento",
                      "Orcamento",
                      exportOptionsModal.includeCondicao,
                      exportOptionsModal.includePrazo,
                      exportOptionsModal.nomeDocumento === "Pedido Sugestivo"
                        ? "PEDIDO SUGESTIVO"
                        : exportOptionsModal.nomeDocumento === "Pedido"
                        ? "PEDIDO"
                        : "ORÇAMENTO DE VENDA"
                    );
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
                {/* Header (Mocks the jsPDF styling) */}
                <div className="p-[40px] pb-6" style={{ backgroundColor: '#1b4332', color: 'white' }}>
                  <div className="flex justify-between items-center">
                    <div>
                      <h1 className="text-[28px] font-bold tracking-tight">ESTÂNCIA NOVA OLINDA</h1>
                      <p className="text-[16px] font-medium opacity-90 mt-1 uppercase tracking-widest">
                        {exportOptionsModal.nomeDocumento === "Pedido Sugestivo"
                          ? "PEDIDO SUGESTIVO"
                          : exportOptionsModal.nomeDocumento === "Pedido"
                          ? "PEDIDO"
                          : "ORÇAMENTO DE VENDA"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm opacity-80">Data: {new Date(selectedItem.data).toLocaleDateString("pt-BR")}</p>
                      <p className="text-sm opacity-80 mt-1">Nº {selectedItem.id.split("_")[1]}</p>
                    </div>
                  </div>
                </div>

                <div className="p-[40px] pt-6 font-sans">
                  {/* Client Data */}
                  <div className="mb-8 border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 font-bold text-xs uppercase tracking-widest text-gray-700">
                      Dados do Cliente
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="font-bold text-gray-900 text-sm mb-1">
                          {clientes.find((c) => c.id === selectedItem.cliente_id)?.razao_social || "Desconhecido"}
                        </p>
                        <p className="text-xs text-gray-600">
                          CNPJ/CPF: {clientes.find((c) => c.id === selectedItem.cliente_id)?.cnpj_cpf || "-"}
                        </p>
                      </div>
                      <div className="md:border-l border-gray-200 md:pl-4">
                        <p className="text-xs text-gray-600 mb-1">
                          <span className="font-bold">Endereço:</span> {clientes.find((c) => c.id === selectedItem.cliente_id)?.endereco || "-"}
                        </p>
                        <p className="text-xs text-gray-600">
                          <span className="font-bold">Cidade/UF:</span> {clientes.find((c) => c.id === selectedItem.cliente_id)?.cidade || "-"} - {clientes.find((c) => c.id === selectedItem.cliente_id)?.estado || "-"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Conditions */}
                  {(exportOptionsModal.includeCondicao || exportOptionsModal.includePrazo) && (
                    <div className="mb-8 grid grid-cols-2 gap-4">
                      {exportOptionsModal.includeCondicao && (
                        <div className="border border-gray-200 rounded-lg p-3">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Condição de Pagamento</p>
                          <p className="text-sm font-semibold text-gray-900">{selectedItem.condicao_pagamento || "A Combinar"}</p>
                        </div>
                      )}
                      {exportOptionsModal.includePrazo && (
                        <div className="border border-gray-200 rounded-lg p-3">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Prazo de Entrega</p>
                          <p className="text-sm font-semibold text-gray-900">{selectedItem.prazo_entrega ? (/^\d{4}-\d{2}-\d{2}/.test(selectedItem.prazo_entrega) ? new Date(selectedItem.prazo_entrega).toLocaleDateString("pt-BR", { timeZone: 'UTC' }) : selectedItem.prazo_entrega) : "A Combinar"}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Items */}
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
                          return (
                            <tr key={i} className={i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}>
                              <td className="p-3 border-b border-gray-100">
                                <span className="font-bold text-xs text-gray-900 block">{p?.nome || "Desconhecido"}</span>
                                <span className="text-[10px] text-gray-500">
                                  Peso: {p ? (p.unidade === 'g' ? ((it.quantidade * (p.quantidade_unidade || 1)) / 1000).toFixed(2) : (it.quantidade * (p.quantidade_unidade || 1)).toFixed(2)) : '0.00'} kg
                                </span>
                              </td>
                              <td className="p-3 border-b border-gray-100 font-bold text-gray-900 text-center text-xs">
                                {it.quantidade}
                              </td>
                              <td className="p-3 border-b border-gray-100 font-medium text-gray-700 text-right text-xs whitespace-nowrap">
                                R$ {formatCurrency(it.preco)}
                              </td>
                              <td className="p-3 border-b border-gray-100 font-black text-gray-900 text-right text-xs whitespace-nowrap">
                                R$ {formatCurrency((it.quantidade * it.preco))}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-gray-800">
                          <td colSpan={3} className="py-4 font-black text-right tracking-widest uppercase text-gray-600 text-[10px]">
                            Total do Orçamento
                          </td>
                          <td className="py-4 font-black text-lg text-right text-gray-900 whitespace-nowrap">
                            R$ {formatCurrency(selectedItem.valor_total)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {selectedItem.observacoes && (
                    <div className="mt-8 border-t border-gray-200 pt-4">
                      <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Observações</h3>
                      <p className="text-sm text-gray-700 italic whitespace-pre-wrap">{selectedItem.observacoes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Pedido Visualizer */}"""

new_content = content[:start_idx] + new_section + content[end_idx + len(end_marker):]

with open("src/components/PedidosOrcamentos.tsx", "w") as f:
    f.write(new_content)

print("Done")
