import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useGlobalState } from '../GlobalStateContext';
import { Settings, User, Shield, Bell, Users, Lock, LogOut, Plus, X, Trash2, TrendingUp } from 'lucide-react';
import { UserRole } from '../types';

export default function Configuracoes() {
  const { user } = useAuth();
  const { usuarios, addUsuario, deleteUsuario, metas, addMeta, deleteMeta } = useGlobalState();
  const isGerente = user?.perfil === 'gerente';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [novoUsuario, setNovoUsuario] = useState({
    nome: '',
    login: '',
    senha: '',
    perfil: 'representante' as UserRole
  });

  const [novaMeta, setNovaMeta] = useState({
    representante_id: '',
    ano: new Date().getFullYear(),
    mes: new Date().getMonth() + 1,
    valor: 0
  });

  const [activeMetaTab, setActiveMetaTab] = useState<'cadastro' | 'lancadas'>('lancadas');
  const [filterMetaRepresentante, setFilterMetaRepresentante] = useState<string>('');
  const [filterMetaAno, setFilterMetaAno] = useState<number>(new Date().getFullYear());

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

  const handleAddMeta = () => {
    if (!novaMeta.representante_id || novaMeta.valor <= 0) return;
    
    // Check if goal already exists for this rep/year/month
    const existingMeta = metas.find(m => m.representante_id === novaMeta.representante_id && m.ano === novaMeta.ano && m.mes === novaMeta.mes);
    if (existingMeta) {
       alert("Já existe uma meta para este representante neste mês/ano.");
       return;
    }

    addMeta({
      representante_id: novaMeta.representante_id,
      ano: novaMeta.ano,
      mes: novaMeta.mes,
      valor: novaMeta.valor
    });
    setNovaMeta({ ...novaMeta, valor: 0 });
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
                 {usuarios.filter(u => u.perfil === 'representante' || u.perfil === 'producao').map(u => (
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

         {/* Metas de Representantes Section */}
         {isGerente && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mt-6">
               <div className="p-6 bg-gray-50/50 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                 <div className="flex items-center gap-2">
                   <TrendingUp size={18} className="text-primary" />
                   <h3 className="font-bold text-gray-800 tracking-tight">Metas de Vendas</h3>
                 </div>
                 <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-100 self-start sm:self-auto">
                    <button 
                       onClick={() => setActiveMetaTab('lancadas')}
                       className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeMetaTab === 'lancadas' ? 'bg-primary text-white shadow' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                       Lançadas
                    </button>
                    <button 
                       onClick={() => setActiveMetaTab('cadastro')}
                       className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeMetaTab === 'cadastro' ? 'bg-primary text-white shadow' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                       Cadastrar
                    </button>
                 </div>
               </div>
               <div className="p-8 space-y-4">
                  {activeMetaTab === 'cadastro' && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                     <div className="md:col-span-1">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Representante</label>
                        <select 
                           value={novaMeta.representante_id}
                           onChange={e => setNovaMeta({...novaMeta, representante_id: e.target.value})}
                           className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold text-gray-700 outline-none"
                        >
                           <option value="">Selecione...</option>
                           {usuarios.filter(u => u.perfil === 'representante').map(u => (
                              <option key={u.id} value={u.id}>{u.nome}</option>
                           ))}
                        </select>
                     </div>
                     <div className="md:col-span-1">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Mês</label>
                        <select 
                           value={novaMeta.mes}
                           onChange={e => setNovaMeta({...novaMeta, mes: Number(e.target.value)})}
                           className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold text-gray-700 outline-none"
                        >
                           {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                              <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                           ))}
                        </select>
                     </div>
                     <div className="md:col-span-1">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Ano</label>
                        <select 
                           value={novaMeta.ano}
                           onChange={e => setNovaMeta({...novaMeta, ano: Number(e.target.value)})}
                           className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold text-gray-700 outline-none"
                        >
                           {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear()+1].map(y => (
                              <option key={y} value={y}>{y}</option>
                           ))}
                        </select>
                     </div>
                     <div className="md:col-span-1">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Valor da Meta</label>
                        <input 
                           type="number"
                           step="0.01"
                           placeholder="R$ 0,00"
                           value={novaMeta.valor || ''}
                           onChange={e => setNovaMeta({...novaMeta, valor: Number(e.target.value)})}
                           className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold text-gray-700 outline-none"
                        />
                     </div>
                     <div className="md:col-span-4 flex justify-end">
                        <button 
                           onClick={handleAddMeta}
                           disabled={!novaMeta.representante_id || novaMeta.valor <= 0}
                           className="px-6 py-3 bg-primary text-white rounded-xl text-sm font-bold shadow-lg hover:bg-primary/90 disabled:opacity-50 transition-all"
                        >
                           Salvar Meta
                        </button>
                     </div>
                  </div>
                  )}
                  
                  {activeMetaTab === 'lancadas' && (
                  <div className="space-y-6">
                     <div className="flex flex-col sm:flex-row gap-4 mb-4">
                        <div className="flex-1">
                           <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Filtrar por Representante</label>
                           <select 
                              value={filterMetaRepresentante}
                              onChange={e => setFilterMetaRepresentante(e.target.value)}
                              className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold text-gray-700 outline-none"
                           >
                              <option value="">Todos os Representantes</option>
                              {usuarios.filter(u => u.perfil === 'representante').map(u => (
                                 <option key={u.id} value={u.id}>{u.nome}</option>
                              ))}
                           </select>
                        </div>
                        <div className="w-full sm:w-48">
                           <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Ano</label>
                           <select 
                              value={filterMetaAno}
                              onChange={e => setFilterMetaAno(Number(e.target.value))}
                              className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold text-gray-700 outline-none"
                           >
                              {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear()+1].map(y => (
                                 <option key={y} value={y}>{y}</option>
                              ))}
                           </select>
                        </div>
                     </div>
                     <div className="space-y-3">
                        {metas
                           .filter(m => m.ano === filterMetaAno && (filterMetaRepresentante ? m.representante_id === filterMetaRepresentante : true))
                           .sort((a, b) => b.mes - a.mes)
                           .map(m => {
                           const rep = usuarios.find(u => u.id === m.representante_id);
                           return (
                              <div key={m.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors">
                                 <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                                       {rep?.nome?.charAt(0) || '?'}
                                    </div>
                                    <div>
                                       <p className="text-sm font-bold text-gray-800">{rep?.nome || 'Desconhecido'}</p>
                                       <p className="text-[10px] font-bold text-gray-400 uppercase">Mês {m.mes.toString().padStart(2, '0')} / {m.ano}</p>
                                    </div>
                                 </div>
                                 <div className="flex items-center gap-4">
                                    <span className="text-lg font-black text-primary">R$ {m.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    <button 
                                      onClick={() => deleteMeta(m.id)}
                                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-lg transition-all"
                                    >
                                       <Trash2 size={16} />
                                    </button>
                                 </div>
                              </div>
                           );
                        })}
                        {metas.filter(m => m.ano === filterMetaAno && (filterMetaRepresentante ? m.representante_id === filterMetaRepresentante : true)).length === 0 && (
                           <p className="text-xs text-gray-400 text-center py-8 italic bg-gray-50 rounded-2xl">Nenhuma meta encontrada para os filtros selecionados.</p>
                        )}
                     </div>
                  </div>
                  )}
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
