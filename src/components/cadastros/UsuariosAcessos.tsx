import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyRound,
  Plus,
  Save,
  Trash2,
  X,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Edit2,
} from 'lucide-react';
import {
  listarUsuarios,
  criarUsuario,
  atualizarUsuario,
  redefinirSenha,
  excluirUsuario,
  obterSessao,
  PERFIS_USUARIO,
  PerfilUsuario,
  UsuarioSistema,
  EVENTO_AUTH_ATUALIZADO,
  SENHA_MINIMA,
} from '../../lib/auth';
import {
  carregarAgricultores,
  carregarRcas,
  carregarCadastrosProvisorios,
  EVENTO_CADASTROS_ATUALIZADOS,
} from '../../data/cadastrosData';
import { formatarDataBR } from '../../lib/datas';

const PERFIS_COM_VINCULO: PerfilUsuario[] = ['AGRICULTOR', 'RCA', 'PROVISORIO'];

type FormUsuario = {
  usuario: string;
  nome: string;
  perfil: PerfilUsuario;
  vinculo_id: string;
  senha: string;
  confirmacao: string;
  ativo: boolean;
};

const FORM_VAZIO: FormUsuario = {
  usuario: '',
  nome: '',
  perfil: 'RCA',
  vinculo_id: '',
  senha: '',
  confirmacao: '',
  ativo: true,
};

/** Área "Usuários e Acessos" do Painel Geral (somente ADMIN). */
export function UsuariosAcessos() {
  const sessao = obterSessao();
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>(() => listarUsuarios());
  const [versaoCadastros, setVersaoCadastros] = useState(0);
  const [modal, setModal] = useState<{ modo: 'novo' | 'editar' | 'senha'; usuario?: UsuarioSistema } | null>(null);
  const [form, setForm] = useState<FormUsuario>(FORM_VAZIO);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const atualizarUsuarios = () => setUsuarios(listarUsuarios());
    const atualizarCadastros = () => setVersaoCadastros(v => v + 1);
    window.addEventListener(EVENTO_AUTH_ATUALIZADO, atualizarUsuarios);
    window.addEventListener(EVENTO_CADASTROS_ATUALIZADOS, atualizarCadastros);
    return () => {
      window.removeEventListener(EVENTO_AUTH_ATUALIZADO, atualizarUsuarios);
      window.removeEventListener(EVENTO_CADASTROS_ATUALIZADOS, atualizarCadastros);
    };
  }, []);

  // Opções de vínculo por perfil (cadastros reais)
  const opcoesVinculo = useMemo(() => {
    const agricultores = carregarAgricultores().map(a => ({ id: a.id, rotulo: `${a.nome_completo}${a.nome_propriedade ? ` · ${a.nome_propriedade}` : ''}` }));
    const rcas = carregarRcas().map(r => ({ id: r.id, rotulo: `${r.codigo_rca} · ${r.nome_fantasia || r.nome_completo}` }));
    const provisorios = carregarCadastrosProvisorios().map(c => ({ id: c.id, rotulo: `${c.nome_convidado} · ${c.empresa_solicitante}` }));
    return { AGRICULTOR: agricultores, RCA: rcas, PROVISORIO: provisorios } as Record<string, { id: string; rotulo: string }[]>;
  }, [versaoCadastros]);

  const rotuloVinculo = (u: UsuarioSistema) => {
    if (!PERFIS_COM_VINCULO.includes(u.perfil)) return '—';
    if (!u.vinculo_id) return 'Sem vínculo';
    return opcoesVinculo[u.perfil]?.find(o => o.id === u.vinculo_id)?.rotulo || 'Vínculo removido';
  };

  if (!sessao || sessao.perfil !== 'ADMIN') {
    return (
      <div className="flex-1 flex items-center justify-center text-sm font-bold text-red-600">
        Acesso restrito a administradores.
      </div>
    );
  }

  const abrirNovo = () => {
    setForm(FORM_VAZIO);
    setErro('');
    setModal({ modo: 'novo' });
  };

  const abrirEdicao = (u: UsuarioSistema) => {
    setForm({ ...FORM_VAZIO, usuario: u.usuario, nome: u.nome, perfil: u.perfil, vinculo_id: u.vinculo_id || '', ativo: u.ativo });
    setErro('');
    setModal({ modo: 'editar', usuario: u });
  };

  const abrirSenha = (u: UsuarioSistema) => {
    setForm({ ...FORM_VAZIO, usuario: u.usuario, nome: u.nome, perfil: u.perfil });
    setErro('');
    setModal({ modo: 'senha', usuario: u });
  };

  const executar = async (acao: () => Promise<void> | void, mensagem: string) => {
    setErro('');
    setAviso('');
    setSalvando(true);
    try {
      await acao();
      setUsuarios(listarUsuarios());
      setAviso(mensagem);
      setModal(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível concluir a operação.');
    } finally {
      setSalvando(false);
    }
  };

  const validarSenhaForm = (): boolean => {
    if (form.senha.length < SENHA_MINIMA) {
      setErro(`A senha deve ter no mínimo ${SENHA_MINIMA} caracteres.`);
      return false;
    }
    if (form.senha !== form.confirmacao) {
      setErro('A confirmação não confere com a senha.');
      return false;
    }
    return true;
  };

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modal) return;
    const vinculo = PERFIS_COM_VINCULO.includes(form.perfil) ? form.vinculo_id : '';

    if (modal.modo === 'novo') {
      if (!validarSenhaForm()) return;
      executar(async () => {
        await criarUsuario({
          usuario: form.usuario,
          nome: form.nome,
          perfil: form.perfil,
          vinculo_id: vinculo,
          senha: form.senha,
          ativo: form.ativo,
        });
      }, 'Usuário criado com sucesso.');
    } else if (modal.modo === 'editar' && modal.usuario) {
      const id = modal.usuario.id;
      executar(() => {
        atualizarUsuario(id, { usuario: form.usuario, nome: form.nome, perfil: form.perfil, vinculo_id: vinculo, ativo: form.ativo });
      }, 'Usuário atualizado.');
    } else if (modal.modo === 'senha' && modal.usuario) {
      if (!validarSenhaForm()) return;
      const id = modal.usuario.id;
      executar(() => redefinirSenha(id, form.senha), 'Senha redefinida.');
    }
  };

  const alternarAtivo = (u: UsuarioSistema) => {
    executar(() => { atualizarUsuario(u.id, { ativo: !u.ativo }); }, u.ativo ? 'Usuário desativado.' : 'Usuário ativado.');
  };

  const handleExcluir = (u: UsuarioSistema) => {
    if (!window.confirm(`Excluir o usuário "${u.usuario}"? Esta ação não pode ser desfeita.`)) return;
    executar(() => excluirUsuario(u.id), 'Usuário excluído.');
  };

  const rotuloPerfil = (p: PerfilUsuario) => PERFIS_USUARIO.find(x => x.id === p)?.rotulo || p;
  const precisaVinculo = PERFIS_COM_VINCULO.includes(form.perfil);
  const inputCls = 'w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20';

  return (
    <div className="flex-1 w-full h-full flex flex-col bg-white rounded-2xl border border-emerald-950/15 shadow-[0_10px_35px_rgba(0,0,0,0.06)] overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-3.5 border-b border-slate-200 bg-slate-50/80">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-900 text-white shadow-sm">
            <ShieldCheck className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">Usuários e Acessos</h2>
            <p className="text-xs text-slate-500">Logins do sistema, perfis de acesso e vínculo com agricultor, RCA ou cadastro provisório.</p>
          </div>
        </div>
        <button
          onClick={abrirNovo}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Usuário</span>
        </button>
      </div>

      {(erro && !modal) && (
        <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /><span>{erro}</span>
        </div>
      )}
      {aviso && (
        <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs font-semibold text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" /><span>{aviso}</span>
        </div>
      )}

      <div className="flex-1 overflow-auto p-6">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-[#022013] text-emerald-200 text-[11px] font-extrabold uppercase tracking-wider">
              <th className="py-3 px-4">Usuário</th>
              <th className="py-3 px-4">Perfil</th>
              <th className="py-3 px-4">Vínculo</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Criado em</th>
              <th className="py-3 px-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {usuarios.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-slate-400 font-semibold">Nenhum usuário cadastrado.</td></tr>
            )}
            {usuarios.map(u => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="py-3 px-4">
                  <div className="font-extrabold text-slate-900">{u.nome}</div>
                  <div className="text-xs font-mono text-slate-500">{u.usuario}{u.id === sessao.usuario_id ? ' (você)' : ''}</div>
                </td>
                <td className="py-3 px-4 text-xs font-bold text-slate-700">{rotuloPerfil(u.perfil)}</td>
                <td className="py-3 px-4 text-xs text-slate-600">{rotuloVinculo(u)}</td>
                <td className="py-3 px-4">
                  {u.ativo ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <CheckCircle2 className="w-3 h-3" /> Ativo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-slate-100 text-slate-600 border border-slate-300">
                      <XCircle className="w-3 h-3" /> Inativo
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-xs font-mono text-slate-500">{formatarDataBR(u.criado_em)}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-end gap-1.5">
                    <button onClick={() => abrirEdicao(u)} title="Editar perfil e vínculo" className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-pointer">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => abrirSenha(u)} title="Redefinir senha" className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer">
                      <KeyRound className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => alternarAtivo(u)} disabled={salvando} className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer">
                      {u.ativo ? 'Desativar' : 'Ativar'}
                    </button>
                    <button onClick={() => handleExcluir(u)} title="Excluir usuário" className="p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-600 cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form onSubmit={handleSalvar} className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-[#022013] text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-black">
                {modal.modo === 'novo' ? 'Novo Usuário' : modal.modo === 'editar' ? `Editar ${modal.usuario?.usuario}` : `Redefinir senha de ${modal.usuario?.usuario}`}
              </h3>
              <button type="button" onClick={() => setModal(null)} className="p-1 rounded-lg hover:bg-white/10 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              {erro && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" /><span>{erro}</span>
                </div>
              )}

              {modal.modo !== 'senha' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Usuário (login) *</label>
                      <input className={inputCls} value={form.usuario} onChange={e => setForm({ ...form, usuario: e.target.value })} autoComplete="off" required />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Nome</label>
                      <input className={inputCls} value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Perfil de acesso *</label>
                    <select className={inputCls} value={form.perfil} onChange={e => setForm({ ...form, perfil: e.target.value as PerfilUsuario, vinculo_id: '' })}>
                      {PERFIS_USUARIO.map(p => <option key={p.id} value={p.id}>{p.rotulo}</option>)}
                    </select>
                  </div>
                  {precisaVinculo && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {form.perfil === 'AGRICULTOR' ? 'Agricultor vinculado' : form.perfil === 'RCA' ? 'RCA vinculado' : 'Cadastro provisório vinculado'}
                      </label>
                      <select className={inputCls} value={form.vinculo_id} onChange={e => setForm({ ...form, vinculo_id: e.target.value })}>
                        <option value="">Sem vínculo (o portal não mostrará dados)</option>
                        {(opcoesVinculo[form.perfil] || []).map(o => <option key={o.id} value={o.id}>{o.rotulo}</option>)}
                      </select>
                      {(opcoesVinculo[form.perfil] || []).length === 0 && (
                        <p className="text-[11px] text-amber-600 mt-1">Nenhum cadastro disponível. Cadastre primeiro em Cadastros.</p>
                      )}
                    </div>
                  )}
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <input type="checkbox" checked={form.ativo} onChange={e => setForm({ ...form, ativo: e.target.checked })} />
                    Usuário ativo
                  </label>
                </>
              )}

              {(modal.modo === 'novo' || modal.modo === 'senha') && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">{modal.modo === 'senha' ? 'Nova senha *' : 'Senha *'}</label>
                    <input type="password" className={inputCls} value={form.senha} onChange={e => setForm({ ...form, senha: e.target.value })} autoComplete="new-password" placeholder={`Mín. ${SENHA_MINIMA} caracteres`} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Confirmar senha *</label>
                    <input type="password" className={inputCls} value={form.confirmacao} onChange={e => setForm({ ...form, confirmacao: e.target.value })} autoComplete="new-password" />
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-3.5 border-t border-slate-200 flex justify-end gap-2">
              <button type="button" onClick={() => setModal(null)} className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer">
                Cancelar
              </button>
              <button type="submit" disabled={salvando} className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold flex items-center gap-2 cursor-pointer disabled:opacity-60">
                <Save className="w-4 h-4" />
                <span>{salvando ? 'Salvando...' : 'Salvar'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
