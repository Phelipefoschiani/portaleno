import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Leaf, 
  ArrowRight, 
  ShieldCheck, 
  Lock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface GrupoEnoLandingProps {
  onEnterPortal: () => void;
  isLoggedIn: boolean;
}

const PortfolioFlipbook = () => {
  const [currentPage, setCurrentPage] = useState(0);
  const pages = [
    { title: 'Capa', content: 'Bem-vindo ao Portfólio do Grupo Eno' },
    { title: 'Sobre', content: 'História e Visão' },
    { title: 'Operações', content: 'Unidades e Estrutura' },
  ];

  const nextPage = () => setCurrentPage((prev) => Math.min(prev + 1, pages.length - 1));
  const prevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 0));

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative w-full max-w-2xl aspect-[3/4] bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 p-12 flex flex-col justify-center items-center text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ rotateY: 90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={{ rotateY: -90, opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h3 className="text-4xl font-black text-gray-900 mb-4">{pages[currentPage].title}</h3>
            <p className="text-xl text-gray-500">{pages[currentPage].content}</p>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="flex gap-4">
        <button onClick={prevPage} className="p-3 bg-white rounded-full shadow hover:bg-gray-50"><ChevronLeft /></button>
        <button onClick={nextPage} className="p-3 bg-white rounded-full shadow hover:bg-gray-50"><ChevronRight /></button>
      </div>
    </div>
  );
};

const GrupoEnoLanding: React.FC<GrupoEnoLandingProps> = ({ onEnterPortal, isLoggedIn }) => {
  const [isPortfolioOpen, setIsPortfolioOpen] = useState(false);
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50/60 text-gray-800 font-sans">
      <AnimatePresence>
        {isPortfolioOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-6"
            onClick={() => setIsPortfolioOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white p-6 rounded-3xl max-w-2xl w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-gray-900">Nosso Portfólio</h2>
                <button onClick={() => setIsPortfolioOpen(false)} className="text-gray-400 hover:text-gray-900">Fechar</button>
              </div>
              <PortfolioFlipbook />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="p-2 bg-emerald-600 rounded-xl text-white shadow-md shadow-emerald-200">
              <Leaf size={22} className="stroke-[2.5]" />
            </div>
            <span className="text-xl font-black text-gray-900 tracking-tight">Grupo ENO</span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollToSection('inicio')} className="text-sm font-bold text-gray-600 hover:text-emerald-700 transition-colors uppercase tracking-wider">Início</button>
            <button onClick={() => setIsPortfolioOpen(true)} className="text-sm font-bold text-gray-600 hover:text-emerald-700 transition-colors uppercase tracking-wider">Portfólio</button>
          </nav>

          <button
            onClick={onEnterPortal}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-800 transition-all shadow-lg shadow-emerald-200 hover:shadow-xl active:scale-98"
          >
            <Lock size={14} />
            {isLoggedIn ? 'Acessar Painel' : 'Acessar Portal'}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section id="inicio" className="relative py-16 lg:py-24 overflow-hidden bg-white">
        <div className="max-w-7xl mx-auto px-6 text-center">
            <h1 className="text-5xl lg:text-7xl font-black text-gray-900 leading-[1.1] tracking-tight mb-8">
              Grupo ENO
            </h1>
            <p className="text-xl text-gray-500 font-medium max-w-2xl mx-auto mb-12">
              Sustentabilidade, inovação e excelência no agronegócio.
            </p>
        </div>
      </section>

      {/* Placeholder Section to ensure navigation works */}
      <div id="portfolio" className="h-0" />

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest">
            <span>Grupo ENO © {new Date().getFullYear()} - Todos os direitos reservados.</span>
        </div>
      </footer>
    </div>
  );
};

export default GrupoEnoLanding;
