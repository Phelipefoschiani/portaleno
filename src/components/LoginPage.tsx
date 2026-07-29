import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { LogIn, Leaf, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginPageProps {
  onBackToSite?: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onBackToSite }) => {
  const [loginStr, setLoginStr] = useState('');
  const [senhaStr, setSenhaStr] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleEntrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate slight delay for better UX feel
    setTimeout(async () => {
      const result = await login(loginStr, senhaStr);
      if (!result.success) {
        setError(result.error || 'Erro desconhecido ao realizar login.');
        setIsLoading(false);
      }
    }, 600);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      {/* Elegant Crystal Water / Leaves Background */}
      <div className="absolute inset-0 z-0 bg-emerald-900 overflow-hidden">
        {/* Imagem de folha / água cintilante */}
        <img 
          src="https://images.unsplash.com/photo-1500375592092-40eb2168fd21?q=80&w=2000&auto=format&fit=crop" 
          alt="Sparkling Water" 
          className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-50"
        />
        
        {/* Gradient Overlay verde profundo */}
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-950/90 via-primary/50 to-emerald-400/20"></div>

        {/* Efeito de Refração de Luz do sol (Sun reflection) */}
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-green-200/30 blur-[120px] rounded-full animate-pulse z-0" style={{ animationDuration: '6s' }}></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[50%] h-[50%] bg-emerald-400/20 blur-[130px] rounded-full animate-pulse z-0" style={{ animationDuration: '8s', animationDelay: '2s' }}></div>
        
        {/* Riscos cristalizados (geométricos e brilhantes) */}
        <svg className="absolute inset-0 w-full h-full opacity-30 mix-blend-screen" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="crystal-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#86efac" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
            <pattern id="diagonal-lines" width="120" height="120" patternUnits="userSpaceOnUse" patternTransform="rotate(40)">
              <path d="M0 120 L120 0 Z" stroke="url(#crystal-grad)" strokeWidth="0.5" />
              <path d="M-20 120 L120 -20 Z" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#diagonal-lines)" />
        </svg>

        {/* Camada de vidro */}
        <div className="absolute inset-0 backdrop-blur-[3px] pointer-events-none"></div>
      </div>

      {/* Login Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md bg-white rounded-[2rem] shadow-2xl p-10 lg:p-12 border border-white/20"
      >
        <div className="text-center mb-8">
          <div className="inline-flex justify-center p-4 bg-primary/5 rounded-3xl text-primary mb-6 shadow-sm border border-primary/10">
            <Leaf size={40} />
          </div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Grupo ENO</h2>
        </div>

        <form onSubmit={handleEntrar} className="space-y-6">
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-3 text-sm font-bold border border-red-100"
            >
              <AlertCircle size={18} />
              {error}
            </motion.div>
          )}

          <div className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Usuário</label>
              <input
                type="text"
                value={loginStr}
                onChange={(e) => { setLoginStr(e.target.value); setError(''); }}
                className="w-full px-5 py-4 rounded-2xl border border-gray-200 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary text-gray-900 font-medium transition-all bg-gray-50/50"
                placeholder="Seu nome de usuário"
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2 ml-1 mr-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Senha</label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={senhaStr}
                  onChange={(e) => { setSenhaStr(e.target.value); setError(''); }}
                  className="w-full px-5 py-4 rounded-2xl border border-gray-200 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary text-gray-900 font-medium transition-all tracking-widest bg-gray-50/50 pr-12"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !loginStr || !senhaStr}
            className="w-full bg-primary hover:bg-secondary text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 mt-8 disabled:opacity-50 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transform hover:-translate-y-0.5 active:translate-y-0"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn size={20} /> Acessar Portal
              </>
            )}
          </button>
        </form>

        {onBackToSite && (
          <button
            onClick={onBackToSite}
            className="w-full mt-4 bg-gray-50 hover:bg-gray-100 text-gray-500 font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 border border-gray-200 text-xs uppercase tracking-widest cursor-pointer"
          >
            Voltar para o site institucional
          </button>
        )}

        <p className="mt-8 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">
          Grupo ENO © {new Date().getFullYear()}
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage;
