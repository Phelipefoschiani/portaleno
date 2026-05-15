import React, { useState } from 'react';
import { useGlobalState } from '../GlobalStateContext';
import { useAuth } from '../AuthContext';
import { Plus, Search, Eye, Edit2, History, CheckCircle, XCircle, Save, X, Trash2, ShoppingBag } from 'lucide-react';
import { Cliente, Pedido } from '../types';

export default function Clientes() {
  const { user } = useAuth();
  const { clientes, pedidos, addCliente, updateCliente, deleteCliente } = useGlobalState();
  const isGerente = user?.perfil === 'gerente';
  
  const [showModal, setShowModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState<Partial<Cliente>>({
    razao_social: '',
    nome_fantasia: '',
    cnpj_cpf: '',
    email: '',
    telefone: '',
    whatsapp: '',
    cidade: '',
    estado: '',
    endereco: '',
    bairro: '',
    cep: '',
    canal: 'Varejo',
    status: 'Aguardando liberação'
  });

  const handleOpenModal = (cliente?: Cliente) => {
    if (cliente) {
      setSelectedCliente(cliente);
      setFormData(cliente);
    } else {
      setSelectedCliente(null);
      setFormData({
        razao_social: '',
        nome_fantasia: '',
        cnpj_cpf: '',
        email: '',
        telefone: '',
        whatsapp: '',
        cidade: '',
        estado: '',
        endereco: '',
        bairro: '',
        cep: '',
        canal: 'Varejo',
        status: isGerente ? 'Liberado' : 'Aguardando liberação',
        representante_id: user?.id
      });
    }
    setShowModal(true);
    setShowHistory(false);
  };

  const handleOpenHistory = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setShowHistory(true);
  };

  const handleSave = () => {
    if (selectedCliente) {
      updateCliente(selectedCliente.id, formData);
    } else {
      addCliente({
        ...formData,
        representante_id: formData.representante_id || user?.id || '1',
      } as Cliente);
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este cliente?')) {
      deleteCliente(id);
    }
  };

  const filteredClientes = clientes.filter(c => {
    const accessMatch = isGerente ? true : c.representante_id === user?.id;
    const searchMatch = 
      c.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.nome_fantasia.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cnpj_cpf.includes(searchTerm) ||
      c.cidade.toLowerCase().includes(searchTerm.toLowerCase());
    return accessMatch && searchMatch;
  });

  const clientePedidos = selectedCliente 
    ? pedidos.filter(p => p.cliente_id === selectedCliente.id)
    : [];

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por razão social, CNPJ ou cidade..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          {(isGerente || true) && (
            <button 
              onClick={() => handleOpenModal()}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-secondary shadow-lg shadow-primary/20 transition-all"
            >
              <Plus size={18} /> Novo Cliente
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
                <th className="px-6 py-4">Código</th>
                <th className="px-6 py-4">Razão Social / Fantasia</th>
                <th className="px-6 py-4">Localização</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredClientes.map((cliente) => (
                <tr key={cliente.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-bold text-gray-300">#{cliente.id.padStart(4, '0')}</td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-gray-800">{cliente.razao_social}</p>
                    <p className="text-xs text-gray-500 font-medium">{cliente.nome_fantasia}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-accent/30 text-primary uppercase">
                        {cliente.canal}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                        cliente.status === 'Liberado' ? 'bg-green-100 text-green-700' :
                        cliente.status === 'Aguardando liberação' ? 'bg-warning/10 text-warning' :
                        cliente.status === 'Bloqueado' ? 'bg-red-100 text-red-700' :
                        'bg-gray-200 text-gray-600'
                      }`}>
                        {cliente.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-600 font-medium">{cliente.cidade} - {cliente.estado}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{cliente.cnpj_cpf}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-1">
                      <button onClick={() => handleOpenModal(cliente)} title="Ver/Editar" className="p-2 text-gray-400 hover:text-primary hover:bg-accent/30 rounded-lg transition-all"><Edit2 size={16} /></button>
                      <button onClick={() => handleOpenHistory(cliente)} title="Histórico" className="p-2 text-gray-400 hover:text-earth hover:bg-accent/30 rounded-lg transition-all"><History size={18} /></button>
                      
                      {isGerente && (
                        <>
                          <button 
                            onClick={() => updateCliente(cliente.id, { status: cliente.status === 'Inativo' ? 'Liberado' : 'Inativo' })}
                            title={cliente.status === 'Inativo' ? "Reativar" : "Inativar"} 
                            className={`p-2 rounded-lg transition-all ${cliente.status === 'Inativo' ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:text-warning hover:bg-warning/10'}`}
                          >
                            {cliente.status === 'Inativo' ? <CheckCircle size={18} /> : <XCircle size={18} />}
                          </button>
                          <button 
                            onClick={() => handleDelete(cliente.id)}
                            title="Excluir" className="p-2 text-gray-400 hover:text-danger hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal - Histórico */}
      {showHistory && selectedCliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col scale-in">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-earth text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg"><History size={20} /></div>
                <div>
                  <h2 className="text-xl font-bold">Histórico do Cliente</h2>
                  <p className="text-xs text-white/70">{selectedCliente.razao_social}</p>
                </div>
              </div>
              <button onClick={() => setShowHistory(false)} className="text-white/70 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {clientePedidos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <ShoppingBag size={48} className="mb-4 opacity-20" />
                  <p className="font-bold">Nenhum pedido encontrado para este cliente.</p>
                </div>
              ) : (
                <div className="space-y-4">
                   <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Pedidos Realizados ({clientePedidos.length})</h3>
                   <div className="overflow-x-auto">
                     <table className="w-full text-left">
                       <thead>
                        <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
                          <th className="pb-2">Pedido</th>
                          <th className="pb-2">Data</th>
                          <th className="pb-2">Valor</th>
                          <th className="pb-2">Status</th>
                        </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-50">
                        {clientePedidos.map(p => (
                          <tr key={p.id}>
                            <td className="py-3 font-bold text-gray-700 text-sm">#{p.id}</td>
                            <td className="py-3 text-sm text-gray-500">{new Date(p.data).toLocaleDateString('pt-BR')}</td>
                            <td className="py-3 text-sm font-bold text-gray-800">R$ {p.valor_total.toLocaleString('pt-BR')}</td>
                            <td className="py-3">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase">{p.status}</span>
                            </td>
                          </tr>
                        ))}
                       </tbody>
                     </table>
                   </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end bg-gray-50">
              <button 
                onClick={() => setShowHistory(false)}
                className="px-8 py-2.5 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Cliente */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col scale-in">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-primary text-white">
              <h2 className="text-xl font-bold">{selectedCliente ? 'Editar Cliente' : 'Novo Cadastro de Cliente'}</h2>
              <button onClick={() => setShowModal(false)} className="text-white/70 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-1">Dados Básicos</h3>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Razão Social</label>
                    <input 
                      type="text" 
                      value={formData.razao_social}
                      onChange={(e) => setFormData({...formData, razao_social: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Nome Fantasia</label>
                    <input 
                      type="text" 
                      value={formData.nome_fantasia}
                      onChange={(e) => setFormData({...formData, nome_fantasia: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">CNPJ / CPF</label>
                      <input 
                        type="text" 
                        value={formData.cnpj_cpf}
                        onChange={(e) => setFormData({...formData, cnpj_cpf: e.target.value})}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Inscrição Est.</label>
                      <input 
                        type="text" 
                        value={formData.inscricao_estadual}
                        onChange={(e) => setFormData({...formData, inscricao_estadual: e.target.value})}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Canal de Venda</label>
                    <select 
                      value={formData.canal}
                      onChange={(e) => setFormData({...formData, canal: e.target.value as any})}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option>Supermercado</option>
                      <option>Food Service</option>
                      <option>Distribuidor</option>
                      <option>Atacado</option>
                      <option>Varejo</option>
                      <option>Outro</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-1">Contato & Endereço</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Telefone</label>
                      <input 
                        type="text" 
                        value={formData.telefone}
                        onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">WhatsApp</label>
                      <input 
                        type="text" 
                        value={formData.whatsapp}
                        onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">E-mail</label>
                    <input 
                      type="email" 
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Endereço Completo</label>
                    <input 
                      type="text" 
                      value={formData.endereco}
                      onChange={(e) => setFormData({...formData, endereco: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20" 
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1">
                      <label className="block text-xs font-bold text-gray-600 mb-1">Bairro</label>
                      <input 
                        type="text" 
                        value={formData.bairro}
                        onChange={(e) => setFormData({...formData, bairro: e.target.value})}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20" 
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-xs font-bold text-gray-600 mb-1">Cidade</label>
                      <input 
                        type="text" 
                        value={formData.cidade}
                        onChange={(e) => setFormData({...formData, cidade: e.target.value})}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20" 
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-xs font-bold text-gray-600 mb-1">Estado</label>
                      <input 
                        type="text" 
                        value={formData.estado}
                        onChange={(e) => setFormData({...formData, estado: e.target.value})}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <label className="block text-xs font-bold text-gray-600 mb-1">Observações Comerciais</label>
                <textarea 
                  value={formData.observacoes}
                  onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                  rows={3} 
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                ></textarea>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button 
                onClick={() => setShowModal(false)}
                className="px-6 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-200 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                className="px-8 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-secondary flex items-center gap-2 shadow-lg shadow-primary/20"
              >
                <Save size={18} /> {selectedCliente ? 'Atualizar Cliente' : 'Salvar Cliente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

