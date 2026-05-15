import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useGlobalState } from '../GlobalStateContext';
import { Settings, User, Shield, Bell, Users, Lock, LogOut, Plus, X, Trash2, TrendingUp } from 'lucide-react';
import { UserRole } from '../types';

export default function Configuracoes() {
  const { user } = useAuth();
  const { usuarios, addUsuario, deleteUsuario } = useGlobalState();
  const isGerente = user?.perfil === 'gerente';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [novoUsuario, setNovoUsuario] = useState({
    nome: '',
    login: '',
    senha: '',
    perfil: 'representante' as UserRole
  });

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoUsuario.nome || !novoUsuario.login || !novoUsuario.senha) return;
    
    addUsuario({
      nome: novoUsuario.nome,
      login: novoUsuario.login,
      senha: novoUsuario.senha,
      perfil: novoUsuario.perfil,
      ativo: true
    });
    setIsModalOpen(false);
    setNovoUsuario({ nome: '', login: '', senha: '', perfil: 'representante' });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4 mb-8">
         <div className="p-3 bg-primary text-white rounded-2xl shadow-lg ring-4 ring-primary/5"><Settings size={28} /></div>
         <div>
            <h2 className="text-2xl font-bold text-primary tracking-tight">Configurações do Sistema</h2>
            <p className="text-sm text-gray-500 font-medium">Gerencie seu perfil, usuários e preferências da plataforma</p>
         </div>
      </div>

      <div className="space-y-6">
         {/* Perfil Section */}
         <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 bg-gray-50/50 border-b border-gray-100 flex items-center gap-2">
               <User size={18} className="text-primary" />
               <h3 className="font-bold text-gray-800 tracking-tight">Meu Perfil</h3>
            </div>
            <div className="p-8 space-y-6">
               <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-full bg-accent text-primary flex items-center justify-center text-3xl font-black shadow-inner ring-4 ring-accent/20">
                     {user?.nome.charAt(0)}
                  </div>
                  <div className="flex-1 space-y-4">
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">Nome Completo</label>
                           <input type="text" defaultValue={user?.nome} className="w-full px-4 py-2 bg-gray-50 border-transparent rounded-xl text-sm font-bold text-gray-700" />
                        </div>
                        <div>
                           <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">E-mail</label>
                           <input type="email" defaultValue={user?.email} className="w-full px-4 py-2 bg-gray-50 border-transparent rounded-xl text-sm font-medium text-gray-500" disabled />
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>

         {/* Equipe Section - Manager Only */}
         {isGerente && (
           <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 bg-gray-50/50 border-b border-gray-100 flex items-center gap-2">
                 <Users size={18} className="text-secondary" />
                 <h3 className="font-bold text-gray-800 tracking-tight">Gestão de Equipe (Representantes)</h3>
              </div>
               <div className="p-8 space-y-4">
                 {(usuarios || []).filter(u => u.perfil === 'representante' || u.perfil === 'producao').map(u => (
                    <div key={u.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl hover:bg-accent/10 transition-all group">
                       <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${u.perfil === 'producao' ? 'bg-secondary/10 text-secondary' : 'bg-primary/5 text-primary'}`}>
                             {u.nome.charAt(0)}
                          </div>
                          <div>
                             <p className="text-sm font-bold text-gray-800">{u.nome}</p>
                             <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase text-gray-400 capitalize">{u.perfil}</span>
                                <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                <span className="text-[10px] font-bold text-green-600 uppercase">Ativo</span>
                             </div>
                          </div>
                       </div>
                       <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button 
                           onClick={() => deleteUsuario(u.id)}
                           className="p-2 border border-red-200 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all text-xs font-bold"
                           title="Excluir Usuário"
                         >
                            <Trash2 size={16} />
                         </button>
                       </div>
                    </div>
                 ))}
                 <button 
                   onClick={() => setIsModalOpen(true)}
                   className="w-full py-4 border-2 border-dashed border-gray-100 rounded-2xl text-xs font-bold text-gray-400 hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2 mt-4"
                 >
                    <Plus size={16} /> CONVIDAR NOVO USUÁRIO
                 </button>
              </div>
           </div>
         )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold tracking-tight text-primary flex items-center gap-2"><User size={18} /> Adicionar Novo Usuário</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Nome Completo</label>
                <input 
                  type="text" 
                  value={novoUsuario.nome}
                  onChange={(e) => setNovoUsuario({...novoUsuario, nome: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-primary/20 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Login</label>
                <input 
                  type="text" 
                  value={novoUsuario.login}
                  onChange={(e) => setNovoUsuario({...novoUsuario, login: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-primary/20 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Senha Provisória</label>
                <input 
                  type="password" 
                  value={novoUsuario.senha}
                  onChange={(e) => setNovoUsuario({...novoUsuario, senha: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-primary/20 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Perfil de Acesso</label>
                <select
                  value={novoUsuario.perfil}
                  onChange={(e) => setNovoUsuario({...novoUsuario, perfil: e.target.value as UserRole})}
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-primary/20 outline-none"
                  required
                >
                  <option value="representante">Representante (Vendas)</option>
                  <option value="producao">Produção</option>
                </select>
              </div>
              
              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-all"
                >Cancelar</button>
                <button 
                  type="submit"
                  className="flex-1 py-3 text-sm font-bold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-lg shadow-primary/20 transition-all"
                >Salvar Usuário</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
