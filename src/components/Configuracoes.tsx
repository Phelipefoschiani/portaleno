import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useGlobalState } from '../GlobalStateContext';
import { User, UserRole } from '../types';
import { 
  UserPlus, 
  Edit2, 
  Trash2, 
  Key, 
  Eye, 
  EyeOff, 
  UserCheck, 
  Settings, 
  Save, 
  Plus, 
  AlertCircle,
  X,
  Check,
  ShieldAlert
} from 'lucide-react';

interface ConfiguracoesProps {
  empresa?: string;
}

export default function Configuracoes({ empresa }: ConfiguracoesProps) {
  const { user, updateSelf } = useAuth();
  const { usuarios, addUsuario, updateUsuario, deleteUsuario } = useGlobalState();

  // Own profile form state
  const [ownNome, setOwnNome] = useState(user?.nome || '');
  const [ownLogin, setOwnLogin] = useState(user?.login || '');
  const [ownPassword, setOwnPassword] = useState(() => {
    return localStorage.getItem('grupo_eno_manager_password') || 'admin';
  });
  const [showOwnPassword, setShowOwnPassword] = useState(false);
  const [ownSuccessMsg, setOwnSuccessMsg] = useState('');

  // Users management state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteConfId, setDeleteConfId] = useState<string | null>(null);
  const [showPasswordsMap, setShowPasswordsMap] = useState<Record<string, boolean>>({});

  // Form state for creating/editing users
  const [userForm, setUserForm] = useState({
    nome: '',
    login: '',
    senha: '123',
    perfil: 'representante' as UserRole,
    ativo: true
  });
  const [formError, setFormError] = useState('');

  if (empresa !== 'estancia') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-white rounded-3xl border border-gray-100 shadow-sm p-8 text-center">
        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
          <Settings size={40} className="text-gray-300" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-2">Empresa em Configuração</h2>
        <p className="text-gray-500 max-w-md font-medium">
          As Configurações do Sistema estão disponíveis apenas para a Estância Nova Olinda.
        </p>
      </div>
    );
  }

  // Handle saving manager's own credentials
  const handleSaveOwnProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownNome.trim() || !ownLogin.trim() || !ownPassword.trim()) {
      return;
    }
    updateSelf(ownNome, ownLogin, ownPassword);
    setOwnSuccessMsg('Senha e perfil atualizados com sucesso!');
    setTimeout(() => setOwnSuccessMsg(''), 4000);
  };

  // Toggle password visibility for specific user id
  const toggleUserPasswordVisibility = (id: string) => {
    setShowPasswordsMap(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Open modal for creating or editing user
  const handleOpenUserForm = (u?: User) => {
    setFormError('');
    if (u) {
      setEditingUser(u);
      setUserForm({
        nome: u.nome,
        login: u.login,
        senha: u.senha || '123',
        perfil: u.perfil,
        ativo: u.ativo
      });
    } else {
      setEditingUser(null);
      setUserForm({
        nome: '',
        login: '',
        senha: '123',
        perfil: 'representante',
        ativo: true
      });
    }
    setIsModalOpen(true);
  };

  // Handle saving user form
  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!userForm.nome.trim()) {
      setFormError('Nome do usuário é obrigatório.');
      return;
    }
    if (!userForm.login.trim()) {
      setFormError('Login é obrigatório.');
      return;
    }
    if (!userForm.senha.trim()) {
      setFormError('Senha é obrigatória.');
      return;
    }

    // Check duplicate login names
    const duplicate = usuarios.find(u => 
      u.login.toLowerCase() === userForm.login.toLowerCase() && 
      (!editingUser || u.id !== editingUser.id)
    );
    if (duplicate || userForm.login.toLowerCase() === 'admin') {
      setFormError('Este login já está sendo utilizado por outro usuário.');
      return;
    }

    const payload = {
      nome: userForm.nome.trim(),
      login: userForm.login.trim().toLowerCase(),
      senha: userForm.senha.trim(),
      perfil: userForm.perfil,
      ativo: userForm.ativo,
      data_cadastro: editingUser?.data_cadastro || new Date().toISOString().split('T')[0]
    };

    if (editingUser) {
      updateUsuario(editingUser.id, payload);
    } else {
      addUsuario(payload);
    }
    setIsModalOpen(false);
  };

  // Filter out any other manager user if they exist, to only manage Representantes and Produção users
  const manageableUsers = usuarios.filter(u => u.perfil === 'representante' || u.perfil === 'producao');

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Configurações do Sistema</h2>
        <p className="text-sm font-medium text-gray-500">
          Gerenciamento de usuários, permissões de acesso e segurança da Estância Nova Olinda
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Profile Card (Edit own password) */}
        <div className="xl:col-span-1 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm h-fit">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-6">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
              <Key size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-gray-900 text-base">Meus Dados</h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Editar minha senha</p>
            </div>
          </div>

          <form onSubmit={handleSaveOwnProfile} className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Meu Nome</label>
              <input
                required
                type="text"
                value={ownNome}
                onChange={e => setOwnNome(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 focus:border-primary rounded-xl px-4 py-2.5 text-sm font-bold text-gray-700 outline-none transition-all"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Login de Acesso</label>
              <input
                required
                type="text"
                value={ownLogin}
                onChange={e => setOwnLogin(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 focus:border-primary rounded-xl px-4 py-2.5 text-sm font-bold text-gray-700 outline-none transition-all"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Nova Senha</label>
              <div className="relative">
                <input
                  required
                  type={showOwnPassword ? 'text' : 'password'}
                  value={ownPassword}
                  onChange={e => setOwnPassword(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-primary rounded-xl pl-4 pr-12 py-2.5 text-sm font-bold text-gray-700 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowOwnPassword(!showOwnPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showOwnPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {ownSuccessMsg && (
              <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border border-emerald-100 animate-fadeIn">
                <Check size={14} className="shrink-0" />
                <span>{ownSuccessMsg}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 bg-primary text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-primary/95 shadow-sm transition-all text-center cursor-pointer"
            >
              <Save size={16} /> Salvar Alterações
            </button>
          </form>
        </div>

        {/* Users Admin Panel */}
        <div className="xl:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-orange-100 text-orange-600 rounded-xl">
                <UserCheck size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-gray-900 text-base">Gerenciar Contas de Acesso</h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Representantes & Produção</p>
              </div>
            </div>

            <button
              onClick={() => handleOpenUserForm()}
              className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-orange-600 transition-all shadow-sm shrink-0"
            >
              <Plus size={16} /> Novo Usuário
            </button>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  <th className="px-6 py-4">Nome completo</th>
                  <th className="px-6 py-4">Perfil</th>
                  <th className="px-6 py-4">Login</th>
                  <th className="px-6 py-4">Senha</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {manageableUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-medium">
                      Nenhum representante ou usuário de produção cadastrado ainda.
                    </td>
                  </tr>
                ) : (
                  manageableUsers.map(u => {
                    const passVisible = showPasswordsMap[u.id] || false;
                    return (
                      <tr key={u.id} className="hover:bg-gray-50/50 transition-colors text-sm font-medium text-gray-700">
                        <td className="px-6 py-4 font-bold text-gray-900">
                          {u.nome}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase text-center tracking-wider ${
                            u.perfil === 'representante' 
                              ? 'bg-blue-50 text-blue-600' 
                              : 'bg-indigo-50 text-indigo-600'
                          }`}>
                            {u.perfil === 'representante' ? 'REPRESENTANTE' : 'PRODUÇÃO'}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-xs bg-slate-50/20">
                          {u.login}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs">
                          <div className="flex items-center gap-2">
                            <span>{passVisible ? (u.senha || '123') : '••••••••'}</span>
                            <button
                              onClick={() => toggleUserPasswordVisibility(u.id)}
                              className="p-1 hover:text-primary transition-colors text-gray-400"
                              title={passVisible ? "Omitir senha" : "Ver senha"}
                            >
                              {passVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold ${
                            u.ativo 
                              ? 'bg-emerald-50 text-emerald-700' 
                              : 'bg-red-50 text-red-700'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${u.ativo ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            {u.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenUserForm(u)}
                              className="p-1.5 bg-gray-50 border border-gray-100 hover:border-primary/20 hover:bg-primary/5 rounded-lg text-gray-500 hover:text-primary transition-all"
                              title="Editar Usuário"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => setDeleteConfId(u.id)}
                              className="p-1.5 bg-gray-50 border border-gray-100 hover:border-red-200 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-all"
                              title="Deletar Usuário"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Account Creation / Edition Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden scale-in">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-2.5 text-primary">
                <UserPlus size={20} />
                <h3 className="font-extrabold text-gray-900 text-lg">
                  {editingUser ? 'Editar Usuário' : 'Novo Usuário de Acesso'}
                </h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 border border-gray-200 transition-all"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Nome Completo</label>
                <input
                  required
                  type="text"
                  placeholder="Ex: Carlos Silva"
                  value={userForm.nome}
                  onChange={e => setUserForm({ ...userForm, nome: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-primary rounded-xl px-4 py-2.5 text-sm font-bold text-gray-700 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Tipo de Perfil</label>
                  <select
                    value={userForm.perfil}
                    onChange={e => setUserForm({ ...userForm, perfil: e.target.value as UserRole })}
                    className="w-full bg-gray-50 border border-gray-200 focus:border-primary rounded-xl px-3 py-2.5 text-sm font-bold text-gray-700 outline-none cursor-pointer"
                  >
                    <option value="representante">Representante</option>
                    <option value="producao">Equipe Produção</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Status</label>
                  <select
                    value={userForm.ativo ? 'true' : 'false'}
                    onChange={e => setUserForm({ ...userForm, ativo: e.target.value === 'true' })}
                    className="w-full bg-gray-50 border border-gray-200 focus:border-primary rounded-xl px-3 py-2.5 text-sm font-bold text-gray-700 outline-none cursor-pointer"
                  >
                    <option value="true">Ativo / Liberado</option>
                    <option value="false">Inativo / Bloqueado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Login (Exclusivo)</label>
                  <input
                    required
                    type="text"
                    placeholder="carlossilva"
                    value={userForm.login}
                    onChange={e => setUserForm({ ...userForm, login: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 focus:border-primary rounded-xl px-4 py-2.5 text-sm font-bold text-gray-700 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Senha do Usuário</label>
                  <input
                    required
                    type="text"
                    placeholder="Senha de acesso"
                    value={userForm.senha}
                    onChange={e => setUserForm({ ...userForm, senha: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 focus:border-primary rounded-xl px-4 py-2.5 text-sm font-bold text-gray-700 outline-none transition-all"
                  />
                </div>
              </div>

              {formError && (
                <div className="bg-red-50 text-red-700 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 border border-red-100">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4 border-t border-gray-100 mt-6 bg-gray-50/50 -mx-6 -mb-6 p-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-gray-200 text-gray-600 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-gray-300 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-primary text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-primary/95 shadow-md transition-all cursor-pointer"
                >
                  Salvar Conta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {deleteConfId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] shadow-2xl p-6 max-w-sm w-full text-center scale-in">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldAlert size={32} />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-1">Excluir Conta?</h3>
            <p className="text-gray-500 text-xs font-medium mb-6">
              Esta ação desabilitará o login deste funcionário e removerá seu cadastro permanentemente do sistema.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfId(null)}
                className="flex-1 py-3 bg-gray-100 text-gray-600 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-gray-200 transition-all cursor-pointer"
              >
                Voltar
              </button>
              <button
                onClick={() => {
                  deleteUsuario(deleteConfId);
                  setDeleteConfId(null);
                }}
                className="flex-1 py-3 bg-red-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-red-700 transition-all shadow-md shadow-red-600/10 cursor-pointer"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
