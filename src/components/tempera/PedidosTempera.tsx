import React, { useState, useEffect } from 'react';
import { Plus, Eye, CheckCircle, XCircle, FileText, Trash2, Package, CreditCard, Edit2, RotateCcw, Send } from 'lucide-react';
import { Cliente, formatCurrency, formatWeight } from '../../types';
import { ProdutoTemperaType } from './ProdutosTempera';

interface PedidoTempera {
  id: string;
  cliente: Cliente;
  produto: ProdutoTemperaType;
  tipo: 'unidade' | 'caixa';
  quantidade: number;
  lote: string;
  data_vencimento: string;
  total: number;
  peso: number;
  status: 'normal' | 'gerado';
  data_criacao: string;
}

export const PedidosTempera: React.FC<{ empresa: string }> = ({ empresa }) => {
  const [pedidos, setPedidos] = useState<PedidoTempera[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<ProdutoTemperaType[]>([]);
  const [custos, setCustos] = useState<Record<string, any[]>>({});
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPedidoId, setEditingPedidoId] = useState<string | null>(null);
  const [selectedPedido, setSelectedPedido] = useState<PedidoTempera | null>(null);

  // Form state
  const [selectedClienteId, setSelectedClienteId] = useState('');
  const [selectedProdutoId, setSelectedProdutoId] = useState('');
  const [tipo, setTipo] = useState<'unidade' | 'caixa'>('unidade');
  const [quantidade, setQuantidade] = useState<string>('1');
  const [lote, setLote] = useState('');
  const [dataVencimento, setDataVencimento] = useState('');

  useEffect(() => {
    const savedPedidos = localStorage.getItem('tempera_pedidos');
    if (savedPedidos) setPedidos(JSON.parse(savedPedidos));
    
    const savedClientes = localStorage.getItem('tempera_clientes');
    if (savedClientes) setClientes(JSON.parse(savedClientes));
    
    const savedProdutos = localStorage.getItem('tempera_produtos');
    if (savedProdutos) setProdutos(JSON.parse(savedProdutos));

    const savedCustos = localStorage.getItem('tempera_custos_produtos');
    if (savedCustos) setCustos(JSON.parse(savedCustos));
  }, []);

  const selectedProduto = produtos.find(p => p.id === selectedProdutoId);
  const numericQuantidade = Number(quantidade) || 0;

  const calcularTotal = () => {
    if (!selectedProduto) return 0;
    return tipo === 'caixa' 
      ? selectedProduto.preco_caixa * numericQuantidade
      : selectedProduto.preco_unitario * numericQuantidade;
  };

  const calcularPeso = () => {
    if (!selectedProduto) return 0;
    return tipo === 'caixa' 
      ? selectedProduto.peso_caixa * numericQuantidade
      : (selectedProduto.gramas * numericQuantidade) / 1000;
  };

  const savePedido = () => {
    const cliente = clientes.find(c => c.id === selectedClienteId);
    if (!cliente || !selectedProduto) return;

    if (editingPedidoId) {
      const updatedPedidos = pedidos.map(p => {
        if (p.id === editingPedidoId) {
          return {
            ...p,
            cliente,
            produto: selectedProduto,
            tipo,
            quantidade: numericQuantidade,
            lote,
            data_vencimento: dataVencimento,
            total: calcularTotal(),
            peso: calcularPeso(),
          };
        }
        return p;
      });
      setPedidos(updatedPedidos);
      localStorage.setItem('tempera_pedidos', JSON.stringify(updatedPedidos));
    } else {
      const newPedido: PedidoTempera = {
        id: Date.now().toString(),
        cliente,
        produto: selectedProduto,
        tipo,
        quantidade: numericQuantidade,
        lote,
        data_vencimento: dataVencimento,
        total: calcularTotal(),
        peso: calcularPeso(),
        status: 'normal',
        data_criacao: new Date().toISOString()
      };

      const updatedPedidos = [...pedidos, newPedido];
      setPedidos(updatedPedidos);
      localStorage.setItem('tempera_pedidos', JSON.stringify(updatedPedidos));
    }

    setIsFormOpen(false);
    setEditingPedidoId(null);
    // Reset form
    setSelectedClienteId('');
    setSelectedProdutoId('');
    setQuantidade('1');
    setLote('');
    setDataVencimento('');
  };

  const handleEdit = (pedido: PedidoTempera) => {
    setEditingPedidoId(pedido.id);
    setSelectedClienteId(pedido.cliente.id);
    setSelectedProdutoId(pedido.produto.id);
    setTipo(pedido.tipo);
    setQuantidade(pedido.quantidade.toString());
    setLote(pedido.lote);
    setDataVencimento(pedido.data_vencimento);
    setIsFormOpen(true);
  };

  const toggleStatus = (pedido: PedidoTempera) => {
    const areceberSaved = localStorage.getItem('tempera_areceber');
    let areceber: any[] = areceberSaved ? JSON.parse(areceberSaved) : [];

    if (pedido.status === 'normal') {
      // Gerar Pedido -> Add to areceber
      const newEntry = {
        id: Date.now().toString(),
        pedido_id: pedido.id,
        produto_id: pedido.produto.id,
        nome_produto: pedido.produto.nome,
        valor: pedido.total,
        lote: pedido.lote,
        data: new Date().toISOString(),
        status: 'Pendente'
      };
      areceber.push(newEntry);
      localStorage.setItem('tempera_areceber', JSON.stringify(areceber));
    } else {
      // Voltar para Pré-Pedido -> Remove from areceber if not received
      const entry = areceber.find(item => item.pedido_id === pedido.id);
      if (entry && entry.status === 'Recebido') {
        alert('Este pedido já foi liquidado no financeiro e não pode ser revertido.');
        return;
      }
      areceber = areceber.filter(item => item.pedido_id !== pedido.id);
      localStorage.setItem('tempera_areceber', JSON.stringify(areceber));
    }

    const updated = pedidos.map(p => {
      if (p.id === pedido.id) {
        return { ...p, status: p.status === 'normal' ? 'gerado' : 'normal' as const };
      }
      return p;
    });
    setPedidos(updated);
    localStorage.setItem('tempera_pedidos', JSON.stringify(updated));
  };

  const getCustoDetalhes = (pedido: PedidoTempera) => {
    const prodCustos = custos[pedido.produto.id] || [];
    
    // Calcular unidades por caixa: (peso da caixa em gramas) / (gramas do pacote)
    // Ex: (2kg * 1000) / 200g = 10 pacotes
    const unidadesPorCaixa = (pedido.produto.peso_caixa * 1000) / pedido.produto.gramas;
    const multiplicador = pedido.tipo === 'caixa' ? pedido.quantidade * unidadesPorCaixa : pedido.quantidade;

    const matPrima = prodCustos.filter(c => c.tipo === 'materia_prima');
    const adicionais = prodCustos.filter(c => c.tipo === 'adicional');
    
    const totalMP = matPrima.reduce((acc, c) => acc + (c.valor_calculado * multiplicador), 0);
    const totalAdicional = adicionais.reduce((acc, c) => acc + (c.valor_calculado * multiplicador), 0);

    return { matPrima, adicionais, totalMP, totalAdicional, multiplicador };
  };

  const deletePedido = (id: string) => {
    const updated = pedidos.filter(p => p.id !== id);
    setPedidos(updated);
    localStorage.setItem('tempera_pedidos', JSON.stringify(updated));
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-primary">Pedidos (Tempera)</h2>
        <button onClick={() => {
          setEditingPedidoId(null);
          setSelectedClienteId('');
          setSelectedProdutoId('');
          setQuantidade('1');
          setLote('');
          setDataVencimento('');
          setIsFormOpen(true);
        }} className="bg-primary text-white px-4 py-2 rounded flex items-center gap-2">
          <Plus size={20} /> Novo Pedido
        </button>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-2xl">
            <h3 className="text-2xl font-black text-gray-900 mb-6 tracking-tight">
              {editingPedidoId ? 'Editar Pedido' : 'Novo Pedido'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-700">Escolha o Cliente</label>
                <select value={selectedClienteId} onChange={e => setSelectedClienteId(e.target.value)} className="p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary">
                  <option value="">Selecione o Cliente</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.razao_social}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-700">Escolha o Produto</label>
                <select value={selectedProdutoId} onChange={e => setSelectedProdutoId(e.target.value)} className="p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary">
                  <option value="">Selecione o Produto</option>
                  {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-700">Tipo de Embalagem</label>
                <select value={tipo} onChange={e => setTipo(e.target.value as any)} className="p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary">
                  <option value="unidade">Unidade</option>
                  <option value="caixa">Caixa</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-700">Quantidade</label>
                <input type="text" value={quantidade} onChange={e => setQuantidade(e.target.value)} className="p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary" placeholder="Digite a quantidade" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-700">Lote</label>
                <input type="text" value={lote} onChange={e => setLote(e.target.value)} className="p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary" placeholder="Número do lote" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-700">Data de Vencimento</label>
                <input type="date" value={dataVencimento} onChange={e => setDataVencimento(e.target.value)} className="p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <div className="mt-8 p-6 bg-gray-50 rounded-2xl border border-gray-100 flex justify-between items-center">
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total</p>
                <p className="text-3xl font-black text-gray-900">R$ {formatCurrency(calcularTotal())}</p>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Peso Total</p>
                <p className="text-3xl font-black text-gray-900">{formatWeight(calcularPeso())} kg</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => { setIsFormOpen(false); setEditingPedidoId(null); }} className="px-6 py-3 font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition">Cancelar</button>
              <button onClick={savePedido} className="px-6 py-3 font-bold text-white bg-green-600 rounded-xl hover:bg-green-700 transition">
                {editingPedidoId ? 'Salvar Alterações' : 'Salvar Pedido'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedPedido && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-all">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden animate-in fade-in zoom-in duration-300">
            {/* Header */}
            <div className="bg-gray-900 p-8 flex justify-between items-center text-white">
              <div>
                <h3 className="text-2xl font-black tracking-tight">Detalhes do Pedido</h3>
                <p className="text-white/60 font-medium">Análise financeira e técnica detalhada</p>
              </div>
              <button 
                onClick={() => setSelectedPedido(null)} 
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/40 hover:text-white"
              >
                <XCircle size={32} strokeWidth={1.5} />
              </button>
            </div>
            
            <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-6">
                {/* Linha 1: Dados do Cliente e Produto */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-xs font-black text-gray-400 uppercase">Cliente</span>
                    <span className="text-sm font-bold text-gray-900">{selectedPedido.cliente.razao_social}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-xs font-black text-gray-400 uppercase">Produto</span>
                    <span className="text-sm font-bold text-gray-900">{selectedPedido.produto.nome}</span>
                  </div>
                </div>

                {/* Linha 2: Logística e Lote */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="flex flex-col p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-[10px] font-black text-gray-400 uppercase mb-1">Quantidade</span>
                    <span className="text-sm font-bold text-gray-900">{selectedPedido.quantidade} {selectedPedido.tipo}</span>
                  </div>
                  <div className="flex flex-col p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-[10px] font-black text-gray-400 uppercase mb-1">Lote</span>
                    <span className="text-sm font-bold text-gray-900">{selectedPedido.lote || '---'}</span>
                  </div>
                  <div className="flex flex-col p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-[10px] font-black text-gray-400 uppercase mb-1">Peso Total</span>
                    <span className="text-sm font-bold text-gray-900">{formatWeight(selectedPedido.peso)} kg</span>
                  </div>
                  <div className="flex flex-col p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-[10px] font-black text-gray-400 uppercase mb-1">Vencimento</span>
                    <span className="text-sm font-bold text-gray-900">{selectedPedido.data_vencimento ? new Date(selectedPedido.data_vencimento).toLocaleDateString() : '---'}</span>
                  </div>
                </div>

                {/* Linha 3: Detalhamento de Custos (Lista Técnica) */}
                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Detalhamento de Custos (Lista Técnica)</h4>
                  {(() => {
                    const { matPrima, adicionais, totalMP, totalAdicional, multiplicador } = getCustoDetalhes(selectedPedido);
                    return (
                      <div className="space-y-2">
                        {matPrima.map(m => (
                          <div key={m.id} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div>
                              <span className="text-sm text-gray-600 font-medium">{m.nome}</span>
                            </div>
                            <span className="text-sm font-bold text-gray-900">R$ {formatCurrency(m.valor_calculado * multiplicador)}</span>
                          </div>
                        ))}
                        {adicionais.map(a => (
                          <div key={a.id} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                              <span className="text-sm text-gray-600 font-medium">{a.nome}</span>
                            </div>
                            <span className="text-sm font-bold text-gray-900">R$ {formatCurrency(a.valor_calculado * multiplicador)}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Linha 4: Resumo Financeiro */}
                {(() => {
                  const { totalMP, totalAdicional } = getCustoDetalhes(selectedPedido);
                  const custoTotal = totalMP + totalAdicional;
                  const valorVenda = selectedPedido.total;
                  const lucro = valorVenda - custoTotal;
                  const margem = valorVenda > 0 ? (lucro / valorVenda) * 100 : 0;

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                      <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
                        <p className="text-gray-400 text-[10px] font-black uppercase mb-1 text-center">Total Venda</p>
                        <p className="text-2xl font-black text-gray-900 text-center">R$ {formatCurrency(valorVenda)}</p>
                      </div>
                      <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
                        <p className="text-gray-400 text-[10px] font-black uppercase mb-1 text-center">Custo Total</p>
                        <p className="text-2xl font-black text-red-600 text-center">R$ {formatCurrency(custoTotal)}</p>
                      </div>
                      <div className={`p-5 rounded-2xl shadow-sm text-white flex flex-col items-center justify-center ${lucro >= 0 ? 'bg-primary' : 'bg-red-600'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-white/60 text-[10px] font-black uppercase tracking-tighter">Lucro Líquido</p>
                          <span className="bg-white/20 text-white text-[10px] px-2 py-0.5 rounded-full font-black">{margem.toFixed(1)}%</span>
                        </div>
                        <p className="text-2xl font-black">R$ {formatCurrency(lucro)}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
            
            <div className="bg-gray-50 border-t border-gray-100 p-6 flex justify-end">
              <button 
                onClick={() => setSelectedPedido(null)} 
                className="px-8 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition shadow-lg shadow-gray-200"
              >
                Concluído
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="p-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Cliente</th>
              <th className="p-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Produto</th>
              <th className="p-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Total Venda</th>
              <th className="p-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
              <th className="p-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {pedidos.map(p => (
              <tr key={p.id} className="hover:bg-gray-50/30 transition-colors group">
                <td className="p-4">
                  <p className="font-bold text-gray-900">{p.cliente.razao_social}</p>
                  <p className="text-[10px] font-medium text-gray-400">Criado em {new Date(p.data_criacao).toLocaleDateString()}</p>
                </td>
                <td className="p-4">
                  <span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-bold text-gray-600">
                    {p.produto.nome}
                  </span>
                </td>
                <td className="p-4">
                  <p className="font-black text-gray-900">R$ {formatCurrency(p.total)}</p>
                  <p className="text-[10px] font-medium text-gray-400">{formatWeight(p.peso)} kg</p>
                </td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                    p.status === 'gerado' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {p.status === 'gerado' ? 'Pedido Gerado' : 'Pré-Pedido'}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-center gap-4">
                    <button 
                      onClick={() => setSelectedPedido(p)} 
                      className="group flex flex-col items-center gap-1 transition-all hover:scale-110"
                      title="Ver Detalhes"
                    >
                      <div className="w-9 h-9 flex items-center justify-center bg-blue-50 text-blue-600 rounded-xl border border-blue-100 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <Eye size={18} />
                      </div>
                      <span className="text-[8px] font-black uppercase text-blue-600 transition-opacity">Ver</span>
                    </button>

                    <button 
                      onClick={() => handleEdit(p)} 
                      className="group flex flex-col items-center gap-1 transition-all hover:scale-110"
                      title="Editar Pedido"
                    >
                      <div className="w-9 h-9 flex items-center justify-center bg-amber-50 text-amber-600 rounded-xl border border-amber-100 shadow-sm group-hover:bg-amber-600 group-hover:text-white transition-all">
                        <Edit2 size={18} />
                      </div>
                      <span className="text-[8px] font-black uppercase text-amber-600 transition-opacity">Editar</span>
                    </button>

                    <button 
                      onClick={() => toggleStatus(p)} 
                      className="group flex flex-col items-center gap-1 transition-all hover:scale-110"
                      title={p.status === 'normal' ? 'Gerar Pedido' : 'Voltar para Pré-Pedido'}
                    >
                      <div className={`w-9 h-9 flex items-center justify-center rounded-xl border shadow-sm transition-all ${
                        p.status === 'normal' 
                          ? 'bg-green-50 text-green-600 border-green-100 group-hover:bg-green-600 group-hover:text-white' 
                          : 'bg-orange-50 text-orange-600 border-orange-100 group-hover:bg-orange-600 group-hover:text-white'
                      }`}>
                        {p.status === 'normal' ? <Send size={18} /> : <RotateCcw size={18} />}
                      </div>
                      <span className={`text-[8px] font-black uppercase transition-opacity ${
                        p.status === 'normal' ? 'text-green-600' : 'text-orange-600'
                      }`}>
                        {p.status === 'normal' ? 'Gerar' : 'Reverter'}
                      </span>
                    </button>
                    
                    <button 
                      onClick={() => deletePedido(p.id)} 
                      className="group flex flex-col items-center gap-1 transition-all hover:scale-110"
                      title="Excluir Pedido"
                    >
                      <div className="w-9 h-9 flex items-center justify-center bg-red-50 text-red-600 rounded-xl border border-red-100 shadow-sm group-hover:bg-red-600 group-hover:text-white transition-all">
                        <Trash2 size={18} />
                      </div>
                      <span className="text-[8px] font-black uppercase text-red-600 transition-opacity">Excluir</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pedidos.length === 0 && (
          <div className="p-20 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
              <Package size={40} />
            </div>
            <p className="text-gray-400 font-medium">Nenhum pedido registrado.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PedidosTempera;
