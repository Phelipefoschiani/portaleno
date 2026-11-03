import React, { useState, useEffect } from 'react';
import {
  User,
  Lock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  X,
} from 'lucide-react';
import { EMPRESA } from '../lib/empresa';
import {
  autenticar,
  criarPrimeiroAdministrador,
  existemUsuarios,
  PerfilUsuario,
  SENHA_MINIMA,
} from '../lib/auth';

export type DestinoAcesso = PerfilUsuario;

type LoginModalProps = {
  isOpen: boolean;
  onClose: () => void;
  /** Chamado após autenticação real; o destino é o perfil do usuário logado */
  onLoginSuccess: (destino: DestinoAcesso) => void;
};

export function LoginModal({ isOpen, onClose, onLoginSuccess }: LoginModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // Primeiro acesso: nenhum usuário cadastrado -> criar administrador
  const [primeiroAcesso, setPrimeiroAcesso] = useState<boolean>(() => !existemUsuarios());

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      setError('');
      setPassword('');
      setConfirmacao('');
      setPrimeiroAcesso(!existemUsuarios());
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError('');

    if (!username.trim()) {
      setError('Por favor, informe seu usuário de acesso.');
      return;
    }

    if (!password) {
      setError('Por favor, digite a sua senha.');
      return;
    }

    if (primeiroAcesso) {
      if (password.length < SENHA_MINIMA) {
        setError(`A senha deve ter no mínimo ${SENHA_MINIMA} caracteres.`);
        return;
      }
      if (password !== confirmacao) {
        setError('A confirmação não confere com a senha.');
        return;
      }
    }

    setIsLoading(true);
    try {
      if (primeiroAcesso) {
        const sessao = await criarPrimeiroAdministrador(username, password);
        setPassword('');
        setConfirmacao('');
        onLoginSuccess(sessao.perfil);
        onClose();
        return;
      }

      const resultado = await autenticar(username, password);
      if (resultado.ok === false) {
        setError(resultado.erro);
        setPassword('');
        return;
      }
      setPassword('');
      onLoginSuccess(resultado.sessao.perfil);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível concluir o acesso.');
    } finally {
      setIsLoading(false);
    }
  };

  const campo =
    'w-full h-12 sm:h-11 pl-10 pr-3.5 rounded-md border border-linha-forte bg-papel text-[16px] sm:text-[14px] font-medium text-tinta placeholder:text-cinza-claro outline-none transition-colors focus:border-eno-700 focus:ring-2 focus:ring-eno-700/15';
  const rotulo = 'block text-[11px] font-bold uppercase tracking-[0.12em] text-cinza mb-1.5';
  const icone = 'absolute left-3.5 pointer-events-none text-cinza';

  return (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto flex justify-center items-end sm:items-center bg-eno-950/70 sm:p-6 backdrop-blur-[6px] animate-[modalBackdropIn_180ms_ease-out]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <style>{`
        @keyframes modalBackdropIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalCardIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) { .login-cartao { animation: none !important; } }
      `}</style>

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-titulo"
        className="login-cartao relative w-full sm:max-w-[420px] max-h-dvh overflow-y-auto rounded-t-xl sm:rounded-md bg-papel shadow-[0_30px_80px_-20px_rgba(4,32,19,0.7)] animate-[modalCardIn_200ms_ease-out] flex flex-col"
      >
        {/* Topo verde com a marca */}
        <div className="relative shrink-0 bg-[linear-gradient(110deg,#042013_0%,#0b3d24_100%)] text-white px-5 sm:px-7 pt-5 pb-5">
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ouro"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <img src={EMPRESA.logo} alt="" className="h-9 w-9 object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]" />
            <span className="leading-none">
              <span className="block text-[15px] font-extrabold tracking-[-0.01em]">Grupo ENO</span>
              <span className="block mt-1 text-[9.5px] font-bold uppercase tracking-[0.2em] text-ouro">
                {primeiroAcesso ? 'Primeiro acesso' : 'Acesso restrito'}
              </span>
            </span>
          </div>
          <h2 id="login-titulo" className="mt-5 text-[26px] font-extrabold tracking-[-0.02em] leading-[1.05]">
            {primeiroAcesso ? 'Criar administrador' : 'Entrar'}
          </h2>
          <p className="mt-1.5 text-[13px] text-white/65 max-w-[34ch]">
            {primeiroAcesso
              ? 'Nenhum usuário cadastrado ainda. Defina o usuário e a senha de quem vai administrar o sistema.'
              : 'Use seu usuário ou e-mail. Você entra direto no portal do seu perfil.'}
          </p>
        </div>
        <div className="h-[3px] filete-ouro shrink-0" aria-hidden />

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="px-5 sm:px-7 pt-5 pb-6 space-y-4" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-md bg-st-vencido-bg px-3 py-2.5 text-[13px] font-semibold text-st-vencido">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="login-usuario" className={rotulo}>Usuário ou e-mail</label>
            <div className="relative flex items-center">
              <User className={`${icone} w-4 h-4`} />
              <input
                id="login-usuario"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={primeiroAcesso ? 'Usuário do administrador' : 'Seu usuário ou e-mail'}
                autoComplete="username"
                autoCapitalize="none"
                autoFocus
                className={campo}
              />
            </div>
          </div>

          <div>
            <label htmlFor="login-senha" className={rotulo}>Senha</label>
            <div className="relative flex items-center">
              <Lock className={`${icone} w-4 h-4`} />
              <input
                id="login-senha"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={primeiroAcesso ? `Mínimo de ${SENHA_MINIMA} caracteres` : 'Sua senha'}
                autoComplete={primeiroAcesso ? 'new-password' : 'current-password'}
                className={campo}
              />
            </div>
          </div>

          {primeiroAcesso && (
            <div>
              <label htmlFor="login-confirmacao" className={rotulo}>Confirmar senha</label>
              <div className="relative flex items-center">
                <ShieldCheck className={`${icone} w-4 h-4`} />
                <input
                  id="login-confirmacao"
                  type="password"
                  value={confirmacao}
                  onChange={(e) => setConfirmacao(e.target.value)}
                  placeholder="Repita a senha"
                  autoComplete="new-password"
                  className={campo}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 mt-1 flex items-center justify-center gap-2 rounded-md bg-eno-800 hover:bg-eno-900 text-[14px] font-semibold text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.25)] transition-colors active:translate-y-px disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ouro"
          >
            <span>
              {isLoading
                ? (primeiroAcesso ? 'Criando…' : 'Entrando…')
                : (primeiroAcesso ? 'Criar administrador e entrar' : 'Entrar')}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
