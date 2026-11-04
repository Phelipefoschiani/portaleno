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
      await atualizarUsuario(plano.id, { usuario: plano.login, nome: ctx.nome, ativo: plano.ativo, perfil: ctx.perfil, vinculo_id: ctx.vinculoId });
      if (plano.senha) await redefinirSenha(plano.id, plano.senha);
      return plano.senha ? 'Acesso ao portal atualizado e senha redefinida.' : null;
    case 'remover':
      await excluirUsuario(plano.id);
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
  'w-full bg-papel border border-linha-forte rounded-md pl-9 pr-3 py-2.5 text-xs sm:text-sm font-semibold text-tinta placeholder:text-cinza-claro focus:outline-none focus:border-eno-600 focus:ring-2 focus:ring-eno-600/20 disabled:bg-papel-2 disabled:text-cinza';

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
      ? { rotulo: 'Acesso será removido', cls: 'bg-st-vencido-bg text-st-vencido border-st-vencido/30', Icone: UserX }
      : estado.ativo
      ? { rotulo: 'Acesso ativo', cls: 'bg-st-pago-bg text-st-pago', Icone: ShieldCheck }
      : { rotulo: 'Acesso desativado', cls: 'bg-papel-3 text-tinta-2 border-linha-forte', Icone: ShieldOff }
    : senhaPreenchida
    ? { rotulo: 'Acesso será criado', cls: 'bg-st-pago-bg text-st-pago', Icone: ShieldCheck }
    : { rotulo: obrigatorio ? 'Sem acesso (obrigatório)' : 'Sem acesso', cls: obrigatorio ? 'bg-st-aguardando-bg text-st-aguardando border-st-aguardando/30' : 'bg-papel-2 text-tinta-2 border-linha-forte', Icone: ShieldOff };

  return (
    <section className="relative overflow-hidden rounded-md border border-linha bg-papel">
      <div aria-hidden="true" className="h-[3px] filete-ouro" />

      {/* Cabeçalho */}
      <div className="relative flex flex-wrap items-start justify-between gap-3 px-4 sm:px-5 pt-4 pb-3">
        <div className="flex items-start gap-3 min-w-0">
          <KeyRound className="w-4 h-4 shrink-0 mt-0.5 text-ouro-escuro" />
          <div className="min-w-0">
            <h3 className="text-[15px] font-bold tracking-[-0.01em] text-tinta">{titulo}</h3>
            <p className="text-[11px] text-tinta-2 mt-0.5">{descricao}</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 px-2 py-[3px] rounded-[4px] text-[11px] font-semibold ${situacao.cls}`}>
          <situacao.Icone className="w-3 h-3" />
          {situacao.rotulo}
        </span>
      </div>

      <div className="relative px-4 sm:px-5 pb-4 space-y-3">
        {existente && (
          <div className="text-[11px] text-tinta-2">
            Login atual: <strong className="tabular-nums text-tinta">{existente.usuario}</strong>
            {' · '}Deixe a senha em branco para manter a atual.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-tinta-2 mb-1">Login (e-mail){obrigatorio && !existente ? ' *' : ''}</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-eno-700/60" />
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
              <p className="text-[10px] text-cinza mt-1">Acompanha o e-mail do cadastro. Pode editar.</p>
            )}
            {estado.loginEditado && !existente && emailSugerido && estado.login.trim().toLowerCase() !== emailSugerido.trim().toLowerCase() && (
              <button
                type="button"
                onClick={() => set({ login: '', loginEditado: false })}
                className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-eno-800 hover:text-eno-950 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Usar o e-mail do cadastro
              </button>
            )}
          </div>
          <div>
            <label className="block text-[11px] font-bold text-tinta-2 mb-1">
              {existente ? 'Nova senha (opcional)' : `Senha${obrigatorio ? ' *' : ''}`}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-eno-700/60" />
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
            {senhaCurta && <p className="text-[10px] text-st-vencido font-bold mt-1">Mínimo de {SENHA_MINIMA} caracteres.</p>}
          </div>
          <div>
            <label className="block text-[11px] font-bold text-tinta-2 mb-1">Confirmar senha</label>
            <div className="relative">
              <ShieldCheck className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-eno-700/60" />
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
            {senhasDiferentes && <p className="text-[10px] text-st-vencido font-bold mt-1">A confirmação não confere.</p>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1">
          <label className={`flex items-center gap-2 text-xs font-bold ${bloqueado ? 'text-cinza' : 'text-tinta'} cursor-pointer`}>
            <input
              type="checkbox"
              disabled={bloqueado}
              checked={estado.ativo}
              onChange={e => set({ ativo: e.target.checked })}
              className="w-4 h-4 accent-eno-700"
            />
            Acesso ativo (pode entrar no portal)
          </label>
          {existente && permitirRemover && (
            <label className="flex items-center gap-2 text-xs font-bold text-st-vencido cursor-pointer">
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
          <p className={`flex items-start gap-1.5 text-[11px] ${obrigatorio ? 'text-st-aguardando' : 'text-cinza'}`}>
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
