import React, { useState } from 'react';
import { Mail, Send, CheckCircle2, Phone, MapPin } from 'lucide-react';
import { HeaderInstitucional } from '../home/HeaderInstitucional';
import { PaginaInstitucional } from '../../App';

interface PaginaContatoProps {
  onVoltar: () => void;
  onNavigatePortal: () => void;
  onNavigate?: (destino: 'HOME' | PaginaInstitucional) => void;
}

export function PaginaContato({ onVoltar, onNavigatePortal, onNavigate }: PaginaContatoProps) {
  const [enviado, setEnviado] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    assunto: 'Comercial / Vendas',
    mensagem: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.email) return;
    setEnviado(true);
  };

  return (
    <div className="min-h-screen bg-[#f8faf8] text-slate-800 flex flex-col font-sans">
      <HeaderInstitucional
        paginaAtual="CONTATO"
        onNavigate={onNavigate || (() => onVoltar())}
        onOpenPortal={onNavigatePortal}
      />

      <section className="relative bg-gradient-to-br from-[#07150f] via-[#0b291c] to-[#04100a] text-white py-20 px-6 sm:px-8 overflow-hidden">
        <div className="max-w-5xl mx-auto relative z-10 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-widest">
            <Mail className="w-4 h-4" /> Central de Relacionamento
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Estamos prontos para atender você e sua empresa.
          </h1>
          <p className="text-base sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Entre em contato com nossa central para dúvidas comerciais, parcerias, fornecimento ou suporte.
          </p>
        </div>
      </section>

      <main className="flex-1 max-w-6xl mx-auto px-6 sm:px-8 py-16 grid grid-cols-1 lg:grid-cols-3 gap-12 w-full">
        <div className="space-y-8">
          <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm space-y-6">
            <h3 className="text-xl font-black text-slate-900">Canais de Contato</h3>
            
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Telefone / WhatsApp</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">(11) 99999-9999</div>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">E-mail Corporativo</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">contato@grupoeno.com.br</div>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Localização</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">Polo Agroindustrial · SP</div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/80 shadow-xl">
          {enviado ? (
            <div className="text-center py-12 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-slate-900">Mensagem Enviada com Sucesso!</h3>
              <p className="text-slate-600 text-sm max-w-md mx-auto">
                Recebemos sua mensagem e nossa equipe entrará em contato o mais breve possível.
              </p>
              <button
                onClick={() => { setEnviado(false); setFormData({ nome: '', email: '', telefone: '', assunto: 'Comercial / Vendas', mensagem: '' }); }}
                className="mt-6 px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider hover:bg-emerald-700 transition-colors cursor-pointer"
              >
                Enviar Nova Mensagem
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h3 className="text-xl font-black text-slate-900">Envie sua mensagem</h3>
                <p className="text-slate-500 text-xs mt-1">Preencha o formulário e retornaremos rapidamente.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Seu nome"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">E-mail *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="seu@email.com"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 text-sm outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Telefone</label>
                  <input
                    type="text"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    placeholder="(00) 00000-0000"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Assunto</label>
                  <select
                    value={formData.assunto}
                    onChange={(e) => setFormData({ ...formData, assunto: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 text-sm outline-none bg-white"
                  >
                    <option value="Comercial / Vendas">Comercial / Vendas</option>
                    <option value="Fornecedores / Raiz">Fornecedores / Raiz</option>
                    <option value="Imprensa / Institucional">Imprensa / Institucional</option>
                    <option value="Outros Assuntos">Outros Assuntos</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Mensagem *</label>
                <textarea
                  rows={4}
                  required
                  value={formData.mensagem}
                  onChange={(e) => setFormData({ ...formData, mensagem: e.target.value })}
                  placeholder="Escreva sua mensagem aqui..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 text-sm outline-none resize-none"
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg"
              >
                <Send className="w-4 h-4" />
                <span>Enviar Mensagem</span>
              </button>
            </form>
          )}
        </div>
      </main>

      <footer className="bg-[#07150f] text-slate-400 py-8 px-6 text-center text-xs border-t border-emerald-900/40 mt-auto">
        <p>© {new Date().getFullYear()} Grupo ENO. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
