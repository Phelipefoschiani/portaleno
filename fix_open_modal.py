with open("src/components/PedidosOrcamentos.tsx", "r") as f:
    content = f.read()

find_orc = """  const handleOpenVisualizarOrcamento = (o: Orcamento) => {
    setSelectedItem(o);
    setModalType("Visualizar Orcamento");
    setIsModalOpen(true);
  };"""

repl_orc = """  const handleOpenVisualizarOrcamento = (o: Orcamento) => {
    setSelectedItem(o);
    setModalType("Visualizar Orcamento");
    setExportOptionsModal(prev => ({ ...prev, nomeDocumento: "Orçamento" }));
    setIsModalOpen(true);
  };"""

content = content.replace(find_orc, repl_orc)

find_ped = """  const handleOpenVisualizarPedido = (p: Pedido) => {
    setSelectedItem(p);
    setModalType("Visualizar Pedido");
    setIsModalOpen(true);
  };"""

repl_ped = """  const handleOpenVisualizarPedido = (p: Pedido) => {
    setSelectedItem(p);
    setModalType("Visualizar Pedido");
    setExportOptionsModal(prev => ({ ...prev, nomeDocumento: "Pedido" }));
    setIsModalOpen(true);
  };"""

content = content.replace(find_ped, repl_ped)

with open("src/components/PedidosOrcamentos.tsx", "w") as f:
    f.write(content)

print("Fixed")
