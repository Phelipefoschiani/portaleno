import React, { useState, useMemo } from 'react';
import { useGlobalState } from '../GlobalStateContext';
import { useAuth } from '../AuthContext';
import { Cliente } from '../types';
import { Search, Plus, Edit2, X, Building, Factory, Trash2, AlertTriangle } from 'lucide-react';


const DEFAULT_CATEGORIES = ['Distribuidor', 'Grande Varejo', 'Pequeno Varejo', 'Food Service', 'Atacado', 'Outros'];

const Clientes: React.FC<{ empresa?: string }> = ({ empresa }) => {
  const globalState = useGlobalState();
  const { user } = useAuth();

  const isEmpana = empresa === 'empana';
  const isTempera = empresa === 'tempera';

  // Local state for Tempera clients
  const [temperaClientes, setTemperaClientes] = useState<Cliente[]>(() => {
    const saved = localStorage.getItem('tempera_clientes');
    if (saved) return JSON.parse(saved);
    // 2 Fictitious clients
    return [
      { id: 't1', representante_id: '', razao_social: 'Cliente Tempera 1', nome_fantasia: 'CT1', cnpj_cpf: '00.000.000/0001-01', telefone: '(11) 99999-9999', email: 'c1@tempera.com', cep: '', endereco: '', bairro: '', cidade: 'Cidade T', estado: 'ST', data_cadastro: new Date().toISOString(), status: 'Liberado' },
      { id: 't2', representante_id: '', razao_social: 'Cliente Tempera 2', nome_fantasia: 'CT2', cnpj_cpf: '00.000.000/0001-02', telefone: '(11) 98888-8888', email: 'c2@tempera.com', cep: '', endereco: '', bairro: '', cidade: 'Cidade T', estado: 'ST', data_cadastro: new Date().toISOString(), status: 'Liberado' }
    ] as Cliente[];
  });

  // Save to local storage whenever temperaClientes changes
  React.useEffect(() => {
    if (isTempera) {
      localStorage.setItem('tempera_clientes', JSON.stringify(temperaClientes));
    }
  }, [temperaClientes, isTempera]);

  const clientes = isEmpana ? globalState.clientesEmpana : (isTempera ? temperaClientes : globalState.clientes);
  
  const addCliente = isEmpana ? globalState.addClienteEmpana : (isTempera ? (c: Omit<Cliente, 'id'>) => {
    const newCliente = { ...c, id: Date.now().toString() } as Cliente;
    setTemperaClientes(prev => [...prev, newCliente]);
  } : globalState.addCliente);

  const updateCliente = isEmpana ? globalState.updateClienteEmpana : (isTempera ? (id: string, c: Partial<Cliente>) => {
    setTemperaClientes(prev => prev.map(cl => cl.id === id ? { ...cl, ...c } : cl));
  } : globalState.updateCliente);

  const deleteCliente = isEmpana ? globalState.deleteClienteEmpana : (isTempera ? (id: string) => {
    setTemperaClientes(prev => prev.filter(cl => cl.id !== id));
  } : globalState.deleteCliente);
  
  const pedidos = globalState.pedidos;
  const orcamentos = globalState.orcamentos;

  const [searchTerm, setSearchTerm] = useState('');
  const [userFilter, setUserFilter] = useState('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [deleteStep, setDeleteStep] = useState<'none' | 'first' | 'second'>('none');

  // Custom categories state
  const [showOutroInput, setShowOutroInput] = useState(false);
  const [outroValue, setOutroValue] = useState('');

  // Form states
  const [formData, setFormData] = useState<Partial<Cliente>>({
    cnpj_cpf: '',
    inscricao_estadual: '',
    razao_social: '',
    nome_fantasia: '',
    telefone: '',
    whatsapp: '',
    email: '',
    cep: '',
    endereco: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: '',
    responsavel: '',
    categorias: [],
  });

  if (empresa !== 'estancia' && empresa !== 'empana' && empresa !== 'tempera') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-white rounded-3xl border border-gray-100 shadow-sm p-8 text-center">
        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
          <Factory size={40} className="text-gray-300" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-2">Empresa em Configuração</h2>
        <p className="text-gray-500 max-w-md font-medium">
          O painel de Clientes para esta empresa será configurado em breve.
        </p>
      </div>
    );
  }

  const availableCategories = useMemo(() => {
    const cats = new Set(DEFAULT_CATEGORIES);
    clientes.forEach(c => {
      if (c.categorias) {
        c.categorias.forEach(cat => cats.add(cat));
      }
    });
    if (formData.categorias) {
      formData.categorias.forEach(cat => cats.add(cat));
    }
    return Array.from(cats);
  }, [clientes, formData.categorias]);

  const empanaUsers = useMemo(() => {
    return globalState.usuarios.filter(u => u.perfil === 'empana');
  }, [globalState.usuarios]);

  const filteredClientes = useMemo(() => {
    let list = clientes;
    
    // Isolamento de dados para usuários empana
    if (isEmpana && user?.perfil === 'empana') {
      list = list.filter(c => c.representante_id === user.id);
    } else if (isEmpana && user?.perfil === 'gerente' && userFilter !== 'Todos') {
      list = list.filter(c => c.representante_id === userFilter);
    }

    if (!searchTerm) return list;
    const lowerSearch = searchTerm.toLowerCase();
    return list.filter(c => 
      c.razao_social?.toLowerCase().includes(lowerSearch) ||
      c.nome_fantasia?.toLowerCase().includes(lowerSearch) ||
      c.cnpj_cpf?.toLowerCase().includes(lowerSearch) ||
      c.email?.toLowerCase().includes(lowerSearch)
    );
  }, [clientes, searchTerm, isEmpana, user, userFilter]);

  const handleOpenModal = (cliente?: Cliente) => {
    if (cliente) {
      setEditingCliente(cliente);
      setFormData(cliente);
    } else {
      setEditingCliente(null);
      setFormData({
        cnpj_cpf: '',
        inscricao_estadual: '',
        razao_social: '',
        nome_fantasia: '',
        telefone: '',
        whatsapp: '',
        email: '',
        cep: '',
        endereco: '',
        numero: '',
        bairro: '',
        cidade: '',
        estado: '',
        responsavel: '',
        categorias: [],
      });
    }
    setShowOutroInput(false);
    setOutroValue('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCliente(null);
    setDeleteStep('none');
  };

  const handleDeleteClick = () => {
    setDeleteStep('first');
  };

  const confirmDeleteFirst = () => {
    if (!editingCliente) return;
    const hasData = pedidos.some(p => p.cliente_id === editingCliente.id) || orcamentos.some(o => o.cliente_id === editingCliente.id);
    if (hasData) {
      setDeleteStep('second');
    } else {
      executeDelete();
    }
  };

  const executeDelete = () => {
    if (editingCliente) {
      deleteCliente(editingCliente.id);
      handleCloseModal();
    }
  };

  const handleAddOutro = () => {
    if (outroValue.trim()) {
      const newCat = outroValue.trim();
      const current = formData.categorias || [];
      if (!current.includes(newCat)) {
        setFormData({...formData, categorias: [...current, newCat]});
      }
      setOutroValue('');
      setShowOutroInput(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.cnpj_cpf || !formData.razao_social) {
      alert("CNPJ/CPF e Razão Social são obrigatórios!");
      return;
    }

    if (editingCliente) {
      updateCliente(editingCliente.id, formData);
    } else {
      addCliente({
        ...formData,
        representante_id: user?.id || '',
        data_cadastro: new Date().toISOString(),
        status: 'Liberado',
      } as Omit<Cliente, 'id'>);
    }
    handleCloseModal();
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Clientes</h2>
          <p className="text-sm font-medium text-gray-500">Gerencie a base de clientes {empresa === 'empana' ? 'da RCA' : empresa === 'tempera' ? 'da Tempera' : 'da Estância Nova Olinda'}</p>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nome, CPF/CNPJ..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-transparent focus:border-primary rounded-xl outline-none font-medium text-sm transition-all"
            />
          </div>

          {isEmpana && user?.perfil === 'gerente' && (
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-primary rounded-xl outline-none font-black text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              <option value="Todos">Todos Usuários</option>
              {empanaUsers.map(u => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
          )}

          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white font-black text-sm uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all shadow-lg flex-shrink-0"
          >
            <Plus size={18} /> <span className="hidden sm:inline">Novo Cliente</span>
          </button>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
          <Building size={20} className="text-primary" />
          <h3 className="font-bold text-primary uppercase text-xs tracking-widest">Base de Clientes ({filteredClientes.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">CPF / CNPJ</th>
                {isEmpana && <th className="px-6 py-4">Vendedor</th>}
                <th className="px-6 py-4">Categorias</th>
                <th className="px-6 py-4">Contato</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredClientes.length === 0 ? (
                <tr>
                  <td colSpan={isEmpana ? 6 : 5} className="px-6 py-12 text-center text-gray-400 font-medium">Nenhum cliente encontrado.</td>
                </tr>
              ) : (
                filteredClientes.map(cliente => (
                  <tr key={cliente.id} className="hover:bg-gray-50/50 transition-colors text-sm font-medium text-gray-800">
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900 text-base">{cliente.razao_social}</p>
                      <p className="text-xs text-gray-500">{cliente.nome_fantasia}</p>
                    </td>
                    <td className="px-6 py-4 font-mono text-gray-600">{cliente.cnpj_cpf}</td>
                    {isEmpana && (
                      <td className="px-6 py-4">
                        <p className="text-xs font-black text-primary uppercase tracking-tight">
                          {globalState.usuarios.find(u => u.id === cliente.representante_id)?.nome || 'Sistema'}
                        </p>
                      </td>
                    )}
                    <td className="px-6 py-4 border-l border-r border-transparent">
                      <div className="flex flex-wrap gap-1 w-48">
                        {cliente.categorias && cliente.categorias.length > 0 ? (
                          cliente.categorias.map(c => (
                            <span key={c} className="px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-bold uppercase rounded-md">{c}</span>
                          ))
                        ) : (
                          <span className="text-gray-400 text-xs italic">Sem categoria</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p>{cliente.telefone}</p>
                      <p className="text-xs text-gray-500">{cliente.email}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleOpenModal(cliente)}
                        className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-primary hover:text-white transition-all shadow-sm"
                        title="Editar Cliente"
                      >
                        <Edit2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal / Slider */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-primary/40 backdrop-blur-sm">
           <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col scale-in">
              <div className="p-8 bg-primary text-white flex justify-between items-center shrink-0">
                 <div>
                    <h2 className="text-2xl font-black tracking-tight">{editingCliente ? 'Editar Cliente' : 'Novo Cliente'}</h2>
                    <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mt-1">Preencha os dados cadastrais</p>
                 </div>
                 <button onClick={handleCloseModal} className="hover:rotate-90 transition-all text-white/60 hover:text-white">
                   <X size={24} />
                 </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
                <form id="cliente-form" onSubmit={handleSave} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Header: Dados Cadastrais */}
                    <div className="col-span-1 md:col-span-3 pb-2 border-b border-gray-100">
                      <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider">Dados Principais</h3>
                    </div>

                    <div className="col-span-1 md:col-span-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Razão Social / Nome <span className="text-red-500">*</span></label>
                      <input 
                        required
                        type="text" 
                        value={formData.razao_social || ''}
                        onChange={(e) => setFormData({...formData, razao_social: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none hover:border-gray-300 focus:border-primary transition-all"
                        placeholder="Nome completo ou Razão Social"
                      />
                    </div>

                    <div className="col-span-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Nome Fantasia</label>
                      <input 
                        type="text" 
                        value={formData.nome_fantasia || ''}
                        onChange={(e) => setFormData({...formData, nome_fantasia: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none hover:border-gray-300 focus:border-primary transition-all"
                        placeholder="Nome Fantasia (Opcional)"
                      />
                    </div>

                    <div className="col-span-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">CPF / CNPJ <span className="text-red-500">*</span></label>
                      <input 
                        required
                        type="text" 
                        value={formData.cnpj_cpf || ''}
                        onChange={(e) => setFormData({...formData, cnpj_cpf: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none hover:border-gray-300 focus:border-primary transition-all"
                        placeholder="000.000.000-00 ou 00.000.000/0001-00"
                      />
                    </div>

                    <div className="col-span-1 md:col-span-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Inscrição Estadual</label>
                      <input 
                        type="text" 
                        value={formData.inscricao_estadual || ''}
                        onChange={(e) => setFormData({...formData, inscricao_estadual: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none hover:border-gray-300 focus:border-primary transition-all"
                        placeholder="000.000.000.000"
                      />
                    </div>

                    <div className="col-span-1 md:col-span-3 pb-2 border-b border-gray-100 mt-2">
                      <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider">Categorias</h3>
                    </div>

                    <div className="col-span-1 md:col-span-3 flex flex-wrap gap-2 items-center">
                       {availableCategories.map(cat => (
                         <button
                           key={cat}
                           type="button"
                           onClick={() => {
                             const current = formData.categorias || [];
                             if (current.includes(cat)) {
                               setFormData({...formData, categorias: current.filter(c => c !== cat)});
                             } else {
                               setFormData({...formData, categorias: [...current, cat]});
                             }
                           }}
                           className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${formData.categorias?.includes(cat) ? 'bg-primary text-white shadow-md' : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-900'}`}
                         >
                           {cat}
                         </button>
                       ))}
                       
                       {showOutroInput ? (
                         <div className="flex items-center gap-2">
                           <input 
                             autoFocus
                             type="text"
                             value={outroValue}
                             onChange={e => setOutroValue(e.target.value)}
                             onKeyDown={e => {
                               if (e.key === 'Enter') {
                                 e.preventDefault();
                                 handleAddOutro();
                               }
                             }}
                             className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none focus:border-primary transition-all w-32"
                             placeholder="Nome..."
                           />
                           <button type="button" onClick={handleAddOutro} className="px-3 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary/90">Add</button>
                           <button type="button" onClick={() => setShowOutroInput(false)} className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-200"><X size={14} /></button>
                         </div>
                       ) : (
                         <button
                           type="button"
                           onClick={() => setShowOutroInput(true)}
                           className="px-4 py-2 rounded-xl text-xs font-bold transition-all bg-white border border-dashed border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-900"
                         >
                           + Outro
                         </button>
                       )}
                    </div>

                    {/* Section: Contatos */}
                    <div className="col-span-1 md:col-span-3 pb-2 border-b border-gray-100 mt-2">
                      <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider">Responsável & Contato</h3>
                    </div>

                    <div className="col-span-1 md:col-span-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Responsável</label>
                      <input 
                        type="text" 
                        value={formData.responsavel || ''}
                        onChange={(e) => setFormData({...formData, responsavel: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none hover:border-gray-300 focus:border-primary transition-all"
                        placeholder="Nome do Responsável / Comprador"
                      />
                    </div>

                    <div className="col-span-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Telefone</label>
                      <input 
                        type="text" 
                        value={formData.telefone || ''}
                        onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none hover:border-gray-300 focus:border-primary transition-all"
                        placeholder="(00) 0000-0000"
                      />
                    </div>

                    <div className="col-span-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">WhatsApp</label>
                      <input 
                        type="text" 
                        value={formData.whatsapp || ''}
                        onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none hover:border-gray-300 focus:border-primary transition-all"
                        placeholder="(00) 00000-0000"
                      />
                    </div>

                    <div className="col-span-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">E-mail</label>
                      <input 
                        type="email" 
                        value={formData.email || ''}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none hover:border-gray-300 focus:border-primary transition-all"
                        placeholder="contato@empresa.com"
                      />
                    </div>

                    {/* Section: Endereço */}
                    <div className="col-span-1 md:col-span-3 pb-2 border-b border-gray-100 mt-2">
                      <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider">Endereço</h3>
                    </div>

                    <div className="col-span-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">CEP</label>
                      <input 
                        type="text" 
                        value={formData.cep || ''}
                        onChange={(e) => setFormData({...formData, cep: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none hover:border-gray-300 focus:border-primary transition-all"
                        placeholder="00000-000"
                      />
                    </div>

                    <div className="col-span-1 md:col-span-2" />

                    <div className="col-span-1 md:col-span-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Rua</label>
                      <input 
                        type="text" 
                        value={formData.endereco || ''}
                        onChange={(e) => setFormData({...formData, endereco: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none hover:border-gray-300 focus:border-primary transition-all"
                        placeholder="Nome da Rua, Avenida"
                      />
                    </div>

                    <div className="col-span-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Número</label>
                      <input 
                        type="text" 
                        value={formData.numero || ''}
                        onChange={(e) => setFormData({...formData, numero: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none hover:border-gray-300 focus:border-primary transition-all"
                        placeholder="123"
                      />
                    </div>

                    <div className="col-span-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Bairro</label>
                      <input 
                        type="text" 
                        value={formData.bairro || ''}
                        onChange={(e) => setFormData({...formData, bairro: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none hover:border-gray-300 focus:border-primary transition-all"
                        placeholder="Centro"
                      />
                    </div>

                    <div className="col-span-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Cidade</label>
                      <input 
                        type="text" 
                        value={formData.cidade || ''}
                        onChange={(e) => setFormData({...formData, cidade: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none hover:border-gray-300 focus:border-primary transition-all"
                        placeholder="São Paulo"
                      />
                    </div>

                    <div className="col-span-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Estado</label>
                      <input 
                        type="text" 
                        value={formData.estado || ''}
                        onChange={(e) => setFormData({...formData, estado: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none hover:border-gray-300 focus:border-primary transition-all"
                        placeholder="SP"
                      />
                    </div>

                  </div>

                </form>
              </div>

              <div className="p-6 bg-white border-t border-gray-100 flex justify-end gap-4 shrink-0">
                {editingCliente && (
                  <button 
                    type="button" 
                    onClick={handleDeleteClick}
                    className="px-6 py-3 bg-red-600 text-white font-black text-sm uppercase tracking-widest rounded-xl hover:bg-red-700 transition-all shadow-lg mr-auto flex items-center gap-2"
                  >
                    Deletar
                  </button>
                )}
                <button 
                  type="button" 
                  onClick={handleCloseModal}
                  className="px-6 py-3 bg-gray-100 text-gray-600 font-black text-sm uppercase tracking-widest rounded-xl hover:bg-gray-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  form="cliente-form"
                  className="px-8 py-3 bg-primary text-white font-black text-sm uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all shadow-lg"
                >
                  Salvar Cliente
                </button>
              </div>
           </div>
        </div>
      )}

      {/* Delete Confirmation Overlays */}
      {deleteStep !== 'none' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] shadow-2xl p-8 max-w-md w-full text-center scale-in">
            {deleteStep === 'first' && (
              <>
                <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Trash2 size={40} />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">Excluir Cliente?</h3>
                <p className="text-gray-500 font-medium mb-8 text-sm">Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.</p>
                <div className="flex gap-4">
                  <button onClick={() => setDeleteStep('none')} className="flex-1 py-4 bg-gray-100 text-gray-600 font-black text-sm uppercase tracking-widest rounded-xl hover:bg-gray-200 transition-all">Cancelar</button>
                  <button onClick={confirmDeleteFirst} className="flex-1 py-4 bg-red-600 text-white font-black text-sm uppercase tracking-widest rounded-xl hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all">Sim, Excluir</button>
                </div>
              </>
            )}
            {deleteStep === 'second' && (
              <>
                <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertTriangle size={40} />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">Atenção! Dados Vinculados</h3>
                <p className="text-gray-500 font-medium mb-8 text-sm">Este cliente possui pedidos ou orçamentos vinculados. Se excluir o cliente, <strong>excluirá todo o histórico vinculado a ele</strong>. Confirma a exclusão de tudo?</p>
                <div className="flex flex-col gap-3">
                  <button onClick={executeDelete} className="w-full py-4 bg-orange-600 text-white font-black text-sm uppercase tracking-widest rounded-xl hover:bg-orange-700 shadow-lg shadow-orange-600/20 transition-all">Excluir Tudo</button>
                  <button onClick={() => setDeleteStep('none')} className="w-full py-4 bg-gray-100 text-gray-600 font-black text-sm uppercase tracking-widest rounded-xl hover:bg-gray-200 transition-all">Cancelar</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default Clientes;
