import React, { useState, useEffect } from 'react';
import {
  User,
  Lock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Building2,
} from 'lucide-react';
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

  return (
    <div
      className="
        fixed inset-0 z-[100]
        overflow-y-auto
        flex justify-center items-center
        bg-slate-950/70
        p-4 sm:p-6
        backdrop-blur-[10px]
        animate-[modalBackdropIn_180ms_ease-out]
      "
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <style>{`
        @keyframes modalBackdropIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes modalCardIn {
          from {
            opacity: 0;
            transform: translateY(12px) scale(.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>

      <div
        className="
          relative w-full max-w-[440px]
          overflow-hidden
          rounded-[24px]
          border border-emerald-900/15
          bg-white
          shadow-[0_25px_80px_rgba(4,120,87,0.22)]
          animate-[modalCardIn_200ms_ease-out]
          flex flex-col
        "
      >
        {/* Topo com Identificação */}
        <div className="relative px-6 pt-6 sm:px-7 sm:pt-7 pb-4 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100 shrink-0">
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="
              absolute right-5 top-5
              flex h-8 w-8 items-center justify-center
              rounded-xl
              border border-slate-200/80
              bg-white
              text-slate-400
              shadow-2xs
              transition-all duration-150
              hover:bg-slate-100 hover:text-slate-700
              cursor-pointer
            "
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 6L18 18M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <div className="flex items-center gap-3">
            <div
              className="
                flex h-11 w-11 items-center justify-center
                rounded-xl
                bg-gradient-to-br from-emerald-600 to-emerald-800
                text-white
                shadow-md shadow-emerald-700/20
              "
            >
              <Building2 className="w-5 h-5" />
            </div>

            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">
                Grupo ENO
              </div>
              <h2 className="text-xl font-black tracking-tight text-slate-900">
                {primeiroAcesso ? 'Criar administrador' : 'Acessar o Sistema'}
              </h2>
            </div>
          </div>

          <p className="mt-2 text-xs text-slate-500">
            {primeiroAcesso
              ? 'Primeiro acesso: nenhum usuário cadastrado. Defina o usuário e a senha do administrador do sistema.'
              : 'Digite seu usuário (ou e-mail) e senha. Você entra direto no portal do seu perfil.'}
          </p>
        </div>

        {/* Formulário de Login */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-4">

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-700 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Campo Usuário */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Usuário ou e-mail
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3.5 pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={primeiroAcesso ? 'Defina o usuário do administrador' : 'Seu usuário ou e-mail de acesso'}
                autoComplete="username"
                autoFocus
                className="
                  w-full h-11 pl-10 pr-3.5
                  rounded-xl
                  border border-slate-200
                  bg-slate-50/70
                  text-sm font-semibold text-slate-800
                  outline-none
                  transition-all
                  focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-600/10
                "
              />
            </div>
          </div>

          {/* Campo Senha */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Senha
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3.5 pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={primeiroAcesso ? `Mínimo de ${SENHA_MINIMA} caracteres` : 'Digite sua senha'}
                autoComplete={primeiroAcesso ? 'new-password' : 'current-password'}
                className="
                  w-full h-11 pl-10 pr-3.5
                  rounded-xl
                  border border-slate-200
                  bg-slate-50/70
                  text-sm font-semibold text-slate-800
                  outline-none
                  transition-all
                  focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-600/10
                "
              />
            </div>
          </div>

          {primeiroAcesso && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Confirmar senha
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 pointer-events-none text-slate-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={confirmacao}
                  onChange={(e) => setConfirmacao(e.target.value)}
                  placeholder="Repita a senha"
                  autoComplete="new-password"
                  className="
                    w-full h-11 pl-10 pr-3.5
                    rounded-xl
                    border border-slate-200
                    bg-slate-50/70
                    text-sm font-semibold text-slate-800
                    outline-none
                    transition-all
                    focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-600/10
                  "
                />
              </div>
            </div>
          )}

          {/* Botão Entrar */}
          <button
            type="submit"
            disabled={isLoading}
            className="
              w-full h-11 sm:h-12
              mt-2
              flex items-center justify-center gap-2
              rounded-xl
              bg-emerald-600 hover:bg-emerald-700
              text-sm font-bold text-white
              shadow-md shadow-emerald-700/25
              transition-all duration-150
              hover:-translate-y-0.5
              active:translate-y-0
              disabled:opacity-60 disabled:cursor-not-allowed
              cursor-pointer
            "
          >
            <span>
              {isLoading
                ? (primeiroAcesso ? 'Criando...' : 'Entrando...')
                : (primeiroAcesso ? 'Criar administrador e entrar' : 'Entrar no Sistema')}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>

        </form>

      </div>
    </div>
  );
}
