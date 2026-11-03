import React from 'react';
import { KeyRound, ShieldCheck, ShieldOff, AlertCircle, Mail, Lock, UserX, RotateCcw } from 'lucide-react';
import {
  criarUsuario,
  atualizarUsuario,
  redefinirSenha,
  excluirUsuario,
  validarLogin,
  PerfilUsuario,
  UsuarioSistema,
  SENHA_MINIMA,
} from '../../lib/auth';

/**
 * Seção "Acesso ao portal" usada nos cadastros (RCA e Cliente).
 * O login é um usuário da mesma base de "Usuários e Acessos" (perfil + vinculo_id = id do cadastro).
 */

export interface EstadoAcessoPortal {
  login: string;
  /** false = o login acompanha o e-mail do cadastro */
  loginEditado: boolean;
  senha: string;
  confirmacao: string;
  ativo: boolean;
  remover: boolean;
}

export function estadoAcessoInicial(existente?: UsuarioSistema): EstadoAcessoPortal {
  return {
    login: existente?.usuario || '',
    loginEditado: !!existente,
    senha: '',
    confirmacao: '',
    ativo: existente?.ativo ?? true,
    remover: false,
  };
}

export const loginEfetivo = (estado: EstadoAcessoPortal, emailSugerido?: string) =>
  (estado.loginEditado ? estado.login : emailSugerido || '').trim();

export type PlanoAcessoPortal =
  | { acao: 'nenhuma' }
  | { acao: 'criar'; login: string; senha: string; ativo: boolean }
  | { acao: 'atualizar'; id: string; login: string; senha?: string; ativo: boolean }
  | { acao: 'remover'; id: string };

/** Valida o que foi preenchido (sem gravar). Regra: cadastro novo só ganha acesso se a senha for informada. */
export function planejarAcessoPortal(
  estado: EstadoAcessoPortal,
  existente: UsuarioSistema | undefined,
  emailSugerido?: string
): { plano: PlanoAcessoPortal } | { erro: string } {
  if (existente && estado.remover) return { plano: { acao: 'remover', id: existente.id } };

  const temSenha = !!(estado.senha || estado.confirmacao);
  if (!existente && !temSenha) return { plano: { acao: 'nenhuma' } };

  const login = loginEfetivo(estado, emailSugerido);
  if (!login) return { erro: 'Acesso ao portal: informe o login (e-mail).' };
  let loginNormalizado: string;
  try {
    loginNormalizado = validarLogin(login, existente?.id);
  } catch (e) {
    return { erro: `Acesso ao portal: ${e instanceof Error ? e.message : 'login inválido.'}` };
  }
  if (temSenha) {
    if (estado.senha.length < SENHA_MINIMA) return { erro: `Acesso ao portal: a senha deve ter no mínimo ${SENHA_MINIMA} caracteres.` };
    if (estado.senha !== estado.confirmacao) return { erro: 'Acesso ao portal: a confirmação não confere com a senha.' };
  }
  if (existente) {
    return { plano: { acao: 'atualizar', id: existente.id, login: loginNormalizado, senha: temSenha ? estado.senha : undefined, ativo: estado.ativo } };
  }
  return { plano: { acao: 'criar', login: loginNormalizado, senha: estado.senha, ativo: estado.ativo } };
}

/** Grava o plano na base de usuários (exige sessão ADMIN). Retorna a mensagem de resultado ou null. */
export async function aplicarAcessoPortal(
  plano: PlanoAcessoPortal,
  ctx: { perfil: PerfilUsuario; vinculoId: string; nome: string }
): Promise<string | null> {
  switch (plano.acao) {
    case 'nenhuma':
      return null;
    case 'criar':
      await criarUsuario({ usuario: plano.login, nome: ctx.nome, perfil: ctx.perfil, vinculo_id: ctx.vinculoId, senha: plano.senha, ativo: plano.ativo });
      return `Acesso ao portal criado. Login: ${plano.login}`;
    case 'atualizar':
      atualizarUsuario(plano.id, { usuario: plano.login, nome: ctx.nome, ativo: plano.ativo, perfil: ctx.perfil, vinculo_id: ctx.vinculoId });
      if (plano.senha) await redefinirSenha(plano.id, plano.senha);
      return plano.senha ? 'Acesso ao portal atualizado e senha redefinida.' : null;
    case 'remover':
      excluirUsuario(plano.id);
      return 'Acesso ao portal removido.';
  }
}

interface Props {
  titulo: string;
  descricao: string;
  existente?: UsuarioSistema;
  estado: EstadoAcessoPortal;
  onChange: (e: EstadoAcessoPortal) => void;
  emailSugerido?: string;
  /** Cadastro novo exige acesso (pular só com confirmação ao salvar) */
  obrigatorio?: boolean;
  permitirRemover?: boolean;
}

const inputCls =
  'w-full bg-white border border-emerald-200 rounded-xl pl-9 pr-3 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-100 disabled:text-slate-400';

export function AcessoPortalSecao({ titulo, descricao, existente, estado, onChange, emailSugerido, obrigatorio, permitirRemover }: Props) {
  const set = (parcial: Partial<EstadoAcessoPortal>) => onChange({ ...estado, ...parcial });
  const login = estado.loginEditado ? estado.login : emailSugerido || '';
  const bloqueado = !!existente && estado.remover;
  const senhaPreenchida = !!(estado.senha || estado.confirmacao);
  const senhasDiferentes = !!estado.confirmacao && estado.senha !== estado.confirmacao;
  const senhaCurta = !!estado.senha && estado.senha.length < SENHA_MINIMA;

  // Situação mostrada no selo do cabeçalho
  const situacao = existente
    ? estado.remover
      ? { rotulo: 'Acesso será removido', cls: 'bg-red-100 text-red-800 border-red-300', Icone: UserX }
      : estado.ativo
      ? { rotulo: 'Acesso ativo', cls: 'bg-emerald-100 text-emerald-800 border-emerald-300', Icone: ShieldCheck }
      : { rotulo: 'Acesso desativado', cls: 'bg-slate-200 text-slate-700 border-slate-300', Icone: ShieldOff }
    : senhaPreenchida
    ? { rotulo: 'Acesso será criado', cls: 'bg-lime-100 text-lime-900 border-lime-300', Icone: ShieldCheck }
    : { rotulo: obrigatorio ? 'Sem acesso (obrigatório)' : 'Sem acesso', cls: obrigatorio ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-slate-100 text-slate-600 border-slate-300', Icone: ShieldOff };

  return (
    <section className="relative overflow-hidden rounded-2xl border border-emerald-900/20 bg-[linear-gradient(135deg,#f3faf6_0%,#ffffff_55%,#eef7f1_100%)]">
      <div aria-hidden="true" className="pointer-events-none absolute -top-20 -right-16 w-56 h-56 rounded-full bg-emerald-400/15 blur-3xl" />

      {/* Cabeçalho */}
      <div className="relative flex flex-wrap items-start justify-between gap-3 px-4 sm:px-5 pt-4 pb-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-emerald-700 to-[#022013] text-emerald-200 flex items-center justify-center shadow-[0_8px_20px_-8px_rgba(6,78,59,0.8)]">
            <KeyRound className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <h3 className="text-xs font-black uppercase tracking-[0.12em] text-emerald-900">{titulo}</h3>
            <p className="text-[11px] text-slate-600 mt-0.5">{descricao}</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border ${situacao.cls}`}>
          <situacao.Icone className="w-3 h-3" />
          {situacao.rotulo}
        </span>
      </div>

      <div className="relative px-4 sm:px-5 pb-4 space-y-3">
        {existente && (
          <div className="text-[11px] text-slate-600">
            Login atual: <strong className="font-mono text-slate-900">{existente.usuario}</strong>
            {' · '}Deixe a senha em branco para manter a atual.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Login (e-mail){obrigatorio && !existente ? ' *' : ''}</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-700/60" />
              <input
                type="text"
                inputMode="email"
                autoComplete="off"
                disabled={bloqueado}
                value={login}
                onChange={e => set({ login: e.target.value, loginEditado: true })}
                placeholder={emailSugerido || 'email@exemplo.com.br'}
                className={inputCls}
              />
            </div>
            {!existente && !estado.loginEditado && (
              <p className="text-[10px] text-slate-500 mt-1">Acompanha o e-mail do cadastro. Pode editar.</p>
            )}
            {estado.loginEditado && !existente && emailSugerido && estado.login.trim().toLowerCase() !== emailSugerido.trim().toLowerCase() && (
              <button
                type="button"
                onClick={() => set({ login: '', loginEditado: false })}
                className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 hover:text-emerald-950 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Usar o e-mail do cadastro
              </button>
            )}
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              {existente ? 'Nova senha (opcional)' : `Senha${obrigatorio ? ' *' : ''}`}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-700/60" />
              <input
                type="password"
                autoComplete="new-password"
                disabled={bloqueado}
                value={estado.senha}
                onChange={e => set({ senha: e.target.value })}
                placeholder={existente ? 'Em branco = mantém' : `Mín. ${SENHA_MINIMA} caracteres`}
                className={inputCls}
              />
            </div>
            {senhaCurta && <p className="text-[10px] text-red-600 font-bold mt-1">Mínimo de {SENHA_MINIMA} caracteres.</p>}
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Confirmar senha</label>
            <div className="relative">
              <ShieldCheck className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-700/60" />
              <input
                type="password"
                autoComplete="new-password"
                disabled={bloqueado}
                value={estado.confirmacao}
                onChange={e => set({ confirmacao: e.target.value })}
                placeholder="Repita a senha"
                className={inputCls}
              />
            </div>
            {senhasDiferentes && <p className="text-[10px] text-red-600 font-bold mt-1">A confirmação não confere.</p>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1">
          <label className={`flex items-center gap-2 text-xs font-bold ${bloqueado ? 'text-slate-400' : 'text-slate-800'} cursor-pointer`}>
            <input
              type="checkbox"
              disabled={bloqueado}
              checked={estado.ativo}
              onChange={e => set({ ativo: e.target.checked })}
              className="w-4 h-4 accent-emerald-700"
            />
            Acesso ativo (pode entrar no portal)
          </label>
          {existente && permitirRemover && (
            <label className="flex items-center gap-2 text-xs font-bold text-red-700 cursor-pointer">
              <input
                type="checkbox"
                checked={estado.remover}
                onChange={e => set({ remover: e.target.checked })}
                className="w-4 h-4 accent-red-600"
              />
              Remover acesso ao salvar
            </label>
          )}
        </div>

        {!existente && !senhaPreenchida && (
          <p className={`flex items-start gap-1.5 text-[11px] ${obrigatorio ? 'text-amber-800' : 'text-slate-500'}`}>
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            {obrigatorio
              ? 'Defina a senha para liberar o portal. Salvar sem acesso pede confirmação.'
              : 'Senha em branco = cadastro sem acesso ao portal.'}
          </p>
        )}
      </div>
    </section>
  );
}
