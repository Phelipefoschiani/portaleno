import React from 'react';
import { motion } from 'motion/react';
import { 
  Leaf, 
  Lock,
  Tractor,
  Sprout,
  Hammer,
  Package,
  ArrowRight
} from 'lucide-react';

interface GrupoEnoLandingProps {
  onEnterPortal: () => void;
  isLoggedIn: boolean;
}

const FloatingIcon = ({ children, delay, x, y, rotate, size = 80 }: any) => {
  return (
    <motion.div
      initial={{ opacity: 0, x, y: `calc(${y} + 50px)` }}
      animate={{ 
        opacity: 0.1,
        y: [y, `calc(${y} - 20px)`, y],
        rotate: [rotate, rotate + 10, rotate - 10, rotate]
      }}
      transition={{
        opacity: { duration: 1, delay },
        y: { duration: 4, repeat: Infinity, ease: "easeInOut", delay },
        rotate: { duration: 6, repeat: Infinity, ease: "easeInOut", delay }
      }}
      className="absolute text-emerald-800 pointer-events-none"
      style={{ left: x, top: y }}
    >
      {React.cloneElement(children, { size })}
    </motion.div>
  );
};

const GrupoEnoLanding: React.FC<GrupoEnoLandingProps> = ({ onEnterPortal, isLoggedIn }) => {
  
  const boxes = [
    { name: 'Estância Nova Olinda', icon: Tractor, color: 'text-green-700', border: 'border-green-200', bgGlow: 'from-green-300 to-green-50' },
    { name: 'Empana Fácil', icon: Package, color: 'text-amber-700', border: 'border-amber-200', bgGlow: 'from-amber-300 to-amber-50' },
    { name: 'Bigorna', icon: Hammer, color: 'text-slate-700', border: 'border-slate-200', bgGlow: 'from-slate-300 to-slate-50' },
    { name: 'Agricultores', icon: Sprout, color: 'text-emerald-700', border: 'border-emerald-200', bgGlow: 'from-emerald-300 to-emerald-50' },
  ];

  return (
    <div className="h-screen w-full flex flex-col bg-neutral-50 font-sans overflow-hidden">
      {/* Navigation Header */}
      <header className="flex-none bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm px-6 py-4 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-600 rounded-xl text-white shadow-md shadow-emerald-200">
              <Leaf size={22} className="stroke-[2.5]" />
            </div>
            <span className="text-xl font-black text-gray-900 tracking-tight">Grupo ENO</span>
          </div>
          
          <button
            onClick={onEnterPortal}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-800 transition-all shadow-lg shadow-emerald-200 hover:shadow-xl active:scale-98"
          >
            <Lock size={14} />
            Acessar
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 relative flex items-center justify-center bg-white overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        
        {/* Ambient Glassmorphism Background Blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-[50vw] h-[50vh] bg-emerald-100/40 rounded-full blur-[100px] mix-blend-multiply" />
          <div className="absolute bottom-0 right-0 w-[40vw] h-[60vh] bg-blue-50/50 rounded-full blur-[100px] mix-blend-multiply" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30vw] h-[30vw] bg-amber-50/40 rounded-full blur-[80px] mix-blend-multiply" />
        </div>

        {/* Animated Background Icons */}
        <div className="absolute inset-0 pointer-events-none">
          <FloatingIcon delay={0} x="10%" y="15%" rotate={15} size={80}>
            <Tractor />
          </FloatingIcon>
          <FloatingIcon delay={0.5} x="80%" y="20%" rotate={-10} size={100}>
            <Sprout />
          </FloatingIcon>
          <FloatingIcon delay={1} x="20%" y="65%" rotate={20} size={70}>
            <Hammer />
          </FloatingIcon>
          <FloatingIcon delay={2} x="85%" y="75%" rotate={5} size={60}>
            <Package />
          </FloatingIcon>
        </div>

        <div className="relative z-10 w-full max-w-5xl mx-auto px-6 py-12 flex flex-col items-center">
          <div className="text-center mb-12">
            <motion.h1 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: 'spring', damping: 15, duration: 0.8 }}
              className="text-5xl lg:text-7xl font-black text-gray-900 leading-[1.1] tracking-tight mb-4"
            >
              Grupo ENO
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="text-lg lg:text-xl text-gray-500 font-medium max-w-2xl mx-auto"
            >
              Sustentabilidade, inovação e excelência no agronegócio.
            </motion.p>
          </div>

          {/* 2x2 Glassmorphism Grid */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-8 w-full max-w-4xl"
          >
            {boxes.map((box, idx) => (
              <button 
                key={idx}
                onClick={onEnterPortal}
                className="group relative flex flex-col items-center justify-center p-8 lg:p-12 min-h-[200px] lg:min-h-[260px] bg-white/40 backdrop-blur-xl border border-white/60 shadow-xl hover:shadow-2xl hover:border-white/80 rounded-[2rem] overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:bg-white/60 text-center"
              >
                {/* Glowing Hover Background Inside Card */}
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-15 transition-opacity duration-700 bg-gradient-to-br ${box.bgGlow}`} />
                
                <div className={`relative z-10 p-5 lg:p-6 rounded-2xl mb-6 shadow-sm bg-white/80 backdrop-blur-md border ${box.border} ${box.color} transition-transform duration-500 group-hover:scale-110 group-hover:-translate-y-2`}>
                  <box.icon size={44} className="stroke-[1.5]" />
                </div>
                
                <h3 className="relative z-10 text-2xl lg:text-3xl font-black text-gray-900 tracking-tight transition-transform duration-500 group-hover:-translate-y-2">
                  {box.name}
                </h3>

                {/* Animated Arrow on Hover */}
                <div className="absolute bottom-6 lg:bottom-8 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-500 text-emerald-600">
                  <ArrowRight size={24} className="stroke-[2.5]" />
                </div>
              </button>
            ))}
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="flex-none bg-gray-900 text-white py-6 z-50">
        <div className="max-w-7xl mx-auto px-6 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest">
            <span>Grupo ENO © {new Date().getFullYear()} - Todos os direitos reservados.</span>
        </div>
      </footer>
    </div>
  );
};

export default GrupoEnoLanding;
