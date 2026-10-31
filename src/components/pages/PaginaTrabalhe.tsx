import React, { useState } from 'react';
import { Send, CheckCircle2 } from 'lucide-react';
import { HeaderInstitucional } from '../home/HeaderInstitucional';
import { FooterMinimal } from '../FooterMinimal';
import { PaginaInstitucional } from '../../App';

interface PaginaTrabalheProps {
  onVoltar: () => void;
  onNavigatePortal: () => void;
  onNavigate?: (destino: 'HOME' | PaginaInstitucional) => void;
}

export function PaginaTrabalhe({ onVoltar, onNavigatePortal, onNavigate }: PaginaTrabalheProps) {
  const [enviado, setEnviado] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    area: 'Fábrica / Produção',
    mensagem: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.email) return;
    setEnviado(true);
  };

  return (
    <div className="min-h-screen bg-[#f9fbfa] text-slate-900 flex flex-col justify-between font-sans selection:bg-emerald-600 selection:text-white">
      <HeaderInstitucional
        paginaAtual="TRABALHE"
        onNavigate={onNavigate || (() => onVoltar())}
        onOpenPortal={onNavigatePortal}
      />

      {/* Formulário de Candidatura em Destaque Exclusivo */}
      <main className="flex-1 max-w-3xl mx-auto px-6 sm:px-10 py-12 sm:py-16 w-full flex flex-col justify-center">
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/90 shadow-xl">
          {enviado ? (
            <div className="text-center py-12 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-slate-900">Currículo Enviado com Sucesso!</h3>
              <p className="text-slate-600 text-sm max-w-md mx-auto">
                Agradecemos seu interesse em fazer parte do Grupo ENO. Nossa equipe de Recursos Humanos analisará suas informações em breve.
              </p>
              <button
                onClick={() => { setEnviado(false); setFormData({ nome: '', email: '', telefone: '', area: 'Fábrica / Produção', mensagem: '' }); }}
                className="mt-6 px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider hover:bg-emerald-700 transition-colors cursor-pointer"
              >
                Enviar Novo Currículo
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-[#004e2e]">FAÇA PARTE DO TIME</span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">Trabalhe Conosco</h2>
                <p className="text-slate-500 text-xs sm:text-sm mt-1">Preencha os campos abaixo para enviar seu currículo ao nosso banco de talentos.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: João da Silva"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 text-sm outline-none bg-slate-50/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">E-mail de Contato *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="joao@email.com"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 text-sm outline-none bg-slate-50/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Telefone / WhatsApp *</label>
                  <input
                    type="text"
                    required
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    placeholder="(44) 99999-9999"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 text-sm outline-none bg-slate-50/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Área de Interesse *</label>
                  <select
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 text-sm outline-none bg-white font-bold"
                  >
                    <option value="Fábrica / Produção">Fábrica / Produção Industrial</option>
                    <option value="Agrícola / Campo">Agrícola / Campo & Originação</option>
                    <option value="Logística & Expedição">Logística & Expedição</option>
                    <option value="Administrativo / Comercial">Administrativo / Comercial</option>
                    <option value="Qualidade & Laboratório">Qualidade & Laboratório</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Apresentação / Experiência Anterior</label>
                <textarea
                  rows={4}
                  value={formData.mensagem}
                  onChange={(e) => setFormData({ ...formData, mensagem: e.target.value })}
                  placeholder="Conte um pouco sobre sua trajetória profissional e objetivos..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 text-sm outline-none bg-slate-50/50 resize-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-4 rounded-xl bg-[#004e2e] hover:bg-[#003820] text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Enviar Candidatura</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

      <FooterMinimal />
    </div>
  );
}
