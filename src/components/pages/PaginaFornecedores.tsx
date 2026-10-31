import React from 'react';
import { Handshake, CheckCircle2, Truck, Users, ShieldCheck } from 'lucide-react';
import { HeaderInstitucional } from '../home/HeaderInstitucional';
import { PaginaInstitucional } from '../../App';

interface PaginaFornecedoresProps {
  onVoltar: () => void;
  onNavigatePortal: () => void;
  onNavigate?: (destino: 'HOME' | PaginaInstitucional) => void;
}

export function PaginaFornecedores({ onVoltar, onNavigatePortal, onNavigate }: PaginaFornecedoresProps) {
  return (
    <div className="min-h-screen bg-[#f8faf8] text-slate-800 flex flex-col font-sans">
      <HeaderInstitucional
        paginaAtual="FORNECEDORES"
        onNavigate={onNavigate || (() => onVoltar())}
        onOpenPortal={onNavigatePortal}
      />

      <section className="relative bg-gradient-to-br from-[#07150f] via-[#0b291c] to-[#04100a] text-white py-20 px-6 sm:px-8 overflow-hidden">
        <div className="max-w-5xl mx-auto relative z-10 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-widest">
            <Handshake className="w-4 h-4" /> Relacionamento e Crescimento
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Crescendo juntos: Produtores rurais, transportadores e parceiros comerciais.
          </h1>
          <p className="text-base sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Oferecemos suporte técnico especializado, preços justos, agilidade na pesagem e pagamento pontual para quem faz o agro acontecer.
          </p>
        </div>
      </section>

      <main className="flex-1 max-w-6xl mx-auto px-6 sm:px-8 py-16 space-y-12 w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black text-slate-900">Produtores de Mandioca</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Receba assistência técnica no plantio, previsibilidade de entrega e condições especiais de parceria com nossa indústria.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Truck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black text-slate-900">Transportadores e RCAs</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Logística integrada, gestão de fretes e oportunidades comerciais para representantes e motoristas parceiros.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black text-slate-900">Insumos e Matéria-Prima</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Padrões transparentes de recebimento, laudos rápidos de teor de amido e relacionamento ético de longo prazo.
            </p>
          </div>
        </div>

        <div className="bg-emerald-900 text-white rounded-3xl p-8 sm:p-12 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2">
            <h3 className="text-2xl font-black">Já é nosso parceiro ou quer se cadastrar?</h3>
            <p className="text-slate-200 text-sm">Acesse o portal do agricultor ou entre em contato com nossa equipe de originação.</p>
          </div>
          <button
            onClick={onNavigatePortal}
            className="px-6 py-3 rounded-full bg-white text-emerald-900 font-bold text-xs uppercase tracking-wider hover:bg-emerald-50 transition-all cursor-pointer whitespace-nowrap shadow-lg"
          >
            Acessar Portal do Fornecedor
          </button>
        </div>
      </main>

      <footer className="bg-[#07150f] text-slate-400 py-8 px-6 text-center text-xs border-t border-emerald-900/40 mt-auto">
        <p>© {new Date().getFullYear()} Grupo ENO. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
