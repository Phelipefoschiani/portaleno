import React, { useState } from 'react';
import { useGlobalState } from '../GlobalStateContext';
import { User } from '../types';
import { 
  Users, 
  Plus, 
  Trash2, 
  UserPlus,
  Shield,
  Key,
  Search,
  AlertCircle
} from 'lucide-react';

const ConfiguracoesEmpana: React.FC = () => {
  const { usuarios, addUsuario, deleteUsuario, clientesEmpana } = useGlobalState();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Omit<User, 'id'>>({
    nome: '',
    login: '',
    senha: '',
    perfil: 'empana',
    ativo: true,
    data_cadastro: new Date().toISOString().split('T')[0]
  });

  // Filter only empana users
  const empanaUsers = usuarios.filter(u => u.perfil === 'empana');
  
  const filteredUsers = empanaUsers.filter(u => 
    u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.login.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addUsuario(formData);
    setIsModalOpen(false);
    setFormData({
      nome: '',
      login: '',
      senha: '',
      perfil: 'empana',
      ativo: true,
      data_cadastro: new Date().toISOString().split('T')[0]
    });
  };

  const handleDelete = (id: string, nome: string) => {
    const hasClients = clientesEmpana.some(c => c.representante_id === id);
    if (hasClients) {
      alert(`Não é possível excluir o usuário ${nome} pois ele possui clientes vinculados.`);
      return;
    }

    if (confirm(`Tem certeza que deseja excluir o usuário ${nome}?`)) {
      deleteUsuario(id);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Configurações Empana Fácil</h1>
        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Gerenciamento de Acessos</p>
      </div>

      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar usuário..."
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-black text-sm tracking-tight hover:bg-secondary transition-all shadow-lg shadow-primary/20"
          >
            <UserPlus size={18} />
            NOVO USUÁRIO EMPANA
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Nome / Login</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Clientes Vinculados</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredUsers.map((user) => {
                const clientCount = clientesEmpana.filter(c => c.representante_id === user.id).length;
                return (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-black">
                          {user.nome.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{user.nome}</p>
                          <p className="text-xs text-gray-500">{user.login}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black ${clientCount > 0 ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400'}`}>
                        {clientCount} {clientCount === 1 ? 'cliente' : 'clientes'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDelete(user.id, user.nome)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        title="Excluir Usuário"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-gray-400 font-medium">
                    Nenhum usuário empana encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Novo Usuário */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 bg-primary text-white">
              <h2 className="text-2xl font-black tracking-tight mb-2">Novo Usuário Empana</h2>
              <p className="text-white/60 text-sm font-medium">Cadastre um novo acesso para o painel Empana Fácil.</p>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Nome Completo</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    placeholder="Ex: João Silva"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Login / Usuário</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    placeholder="Ex: joao.empana"
                    value={formData.login}
                    onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Senha de Acesso</label>
                  <div className="relative">
                    <Key size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                    <input 
                      required
                      type="password" 
                      className="w-full pl-12 pr-5 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      placeholder="••••••••"
                      value={formData.senha}
                      onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 p-4 rounded-2xl flex items-start gap-3 border border-amber-100">
                <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                <p className="text-[11px] font-bold text-amber-700 leading-relaxed">
                  Este usuário terá acesso restrito apenas aos seus próprios clientes cadastrados no portal Empana Fácil.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black text-xs tracking-widest hover:bg-gray-200 transition-all uppercase"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-6 py-4 bg-primary text-white rounded-2xl font-black text-xs tracking-widest hover:bg-secondary transition-all shadow-lg shadow-primary/20 uppercase"
                >
                  Criar Usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfiguracoesEmpana;
