import React from 'react';
import { LifeBuoy, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SupportFABProps {
  onClick: () => void;
  isVisible: boolean;
}

export const SupportFAB: React.FC<SupportFABProps> = ({ onClick, isVisible }) => {
  if (!isVisible) return null;

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className="fixed bottom-8 right-8 z-50 w-16 h-16 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center group"
      title="Abrir Chamado de Suporte"
    >
      <div className="absolute -top-2 -right-2 w-6 h-6 bg-accent text-primary rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white animate-pulse">
        !
      </div>
      <LifeBuoy className="w-8 h-8 group-hover:rotate-12 transition-transform" />
      <div className="absolute inset-0 bg-white/20 rounded-full scale-0 group-hover:scale-100 transition-transform duration-500" />
    </motion.button>
  );
};
