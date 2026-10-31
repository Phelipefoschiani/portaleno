import React, { useState } from 'react';
import { X, Send, Phone, Mail, MapPin, CheckCircle2, Briefcase, FileText, ArrowRight } from 'lucide-react';

interface HomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'CONTATO' | 'TRABALHE' | 'PROPOSITO' | 'SUSTENTABILIDADE' | 'INFO';
  title?: string;
  subtitle?: string;
  onOpenPortal?: () => void;
}

export function HomeModal({ isOpen, onClose, type, title, subtitle, onOpenPortal }: HomeModalProps) {
  const [enviado, setEnviado] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    mensagem: '',
    area: 'Comercial'
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEnviado(true);
    setTimeout(() => {
      setEnviado(false);
      onClose();
    }, 2200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden text-slate-800">
        
        {/* Header */}
        <div className="bg-[#091712] text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-400">
            Grupo ENO · Atendimento
          </div>
          <h3 className="text-xl font-black mt-1 text-white">
            {title || (type === 'CONTATO' ? 'Fale Conosco' : type === 'TRABALHE' ? 'Trabalhe Conosco' : 'Institucional')}
          </h3>
          <p className="text-xs text-slate-300 mt-1">
            {subtitle || 'Conectamos produtos, marcas, tecnologia e pessoas.'}
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {enviado ? (
            <div className="py-10 text-center flex flex-col items-center">
              <CheckCircle2 className="w-14 h-14 text-emerald-600 mb-3 animate-bounce" />
              <h4 className="text-lg font-bold text-slate-900">Mensagem Enviada com Sucesso!</h4>
              <p className="text-sm text-slate-500 mt-1 max-w-xs">
                A equipe do Grupo ENO entrará em contato com você o mais breve possível.
              </p>
            </div>
          ) : type === 'CONTATO' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Seu Nome Completo
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ex: João Silva"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    E-mail
                  </label>
                  <input
                    required
                    type="email"
                    placeholder="joao@empresa.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="tel"
                    placeholder="(00) 00000-0000"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Assunto de Interesse
                </label>
                <select
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 text-sm bg-white"
                >
                  <option value="Comercial">Comercial & Vendas (Distribuição / Varejo)</option>
                  <option value="Fornecedor">Fornecimento de Matéria-Prima & Insumos</option>
                  <option value="Parcerias">Parcerias Estratégicas e Novos Negócios</option>
                  <option value="Representação">Representação Comercial (RCA)</option>
                  <option value="Geral">Outros Assuntos</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Mensagem
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Como podemos colaborar com a sua operação?"
                  value={formData.mensagem}
                  onChange={(e) => setFormData({ ...formData, mensagem: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 text-sm"
                />
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-full text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#034426] hover:bg-[#02351d] text-white text-xs font-bold uppercase tracking-wider shadow-md transition-all cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar Mensagem</span>
                </button>
              </div>
            </form>
          ) : type === 'TRABALHE' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nome Completo
                </label>
                <input
                  required
                  type="text"
                  placeholder="Seu nome"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    E-mail
                  </label>
                  <input
                    required
                    type="email"
                    placeholder="email@dominio.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    placeholder="(00) 00000-0000"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Área de Interesse
                </label>
                <select className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 text-sm bg-white">
                  <option>Operação e Produção Industrial</option>
                  <option>Logística e Expedição</option>
                  <option>Controle de Qualidade & Laboratório</option>
                  <option>Comercial & Vendas (RCA)</option>
                  <option>Administrativo e Financeiro</option>
                  <option>Agronomia & Campo</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Resumo de Experiência / Link do LinkedIn
                </label>
                <textarea
                  rows={3}
                  placeholder="Compartilhe suas qualificações, histórico profissional ou link do seu perfil."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 text-sm"
                />
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-full text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#034426] hover:bg-[#02351d] text-white text-xs font-bold uppercase tracking-wider shadow-md transition-all cursor-pointer"
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Cadastrar Perfil</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 text-sm text-slate-600">
              <p>
                O <strong>Grupo ENO</strong> é um ecossistema integrado que atua desde a originação no campo e processamento industrial até o desenvolvimento de marcas e canais de distribuição de alta escala.
              </p>
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 text-emerald-900 text-xs leading-relaxed space-y-2">
                <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Compromisso com Eficiência e Sustentabilidade
                </div>
                <p>
                  Práticas responsáveis, valorização de produtores parceiros, inovação em processos fabris e tecnologia de ponta para gestão operacional ponta a ponta.
                </p>
              </div>

              {onOpenPortal && (
                <div className="pt-2">
                  <button
                    onClick={() => {
                      onClose();
                      onOpenPortal();
                    }}
                    className="w-full py-3 px-6 rounded-full bg-[#034426] hover:bg-[#02351d] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md"
                  >
                    <span>Acessar o Portal do Grupo ENO</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
