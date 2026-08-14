import React, { useState } from 'react';
import { X, Plus, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabase';

interface NewTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialImages?: string[];
}

export const NewTicketModal: React.FC<NewTicketModalProps> = ({ isOpen, onClose, onSuccess, initialImages }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [newTicket, setNewTicket] = useState({ titulo: '', descricao: '' });
  const [ticketImages, setTicketImages] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      if (initialImages && initialImages.length > 0) {
        setTicketImages(prev => {
          // Add new images that aren't already in the list
          const newImages = initialImages.filter(img => !prev.includes(img));
          const combined = [...prev, ...newImages];
          // Limit to 2 images max
          return combined.slice(0, 2);
        });
      }
    } else {
      // Reset form when modal closes
      setNewTicket({ titulo: '', descricao: '' });
      setTicketImages([]);
    }
  }, [isOpen, initialImages]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files).slice(0, 2);
      const readerPromises = filesArray.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file as Blob);
        });
      });

      Promise.all(readerPromises).then(urls => {
        setTicketImages(urls);
      });
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const novoChamado = {
        titulo: newTicket.titulo,
        descricao: newTicket.descricao,
        status: 'aberto',
        data_abertura: new Date().toISOString(),
        data_atualizacao: new Date().toISOString(),
        anexos: ticketImages
      };

      await supabase.from('chamados').insert([novoChamado]);
      
      setNewTicket({ titulo: '', descricao: '' });
      setTicketImages([]);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden bg-white border border-gray-100"
          >
            {/* Header */}
            <div className="bg-black text-white p-8 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black tracking-tight">Novo Chamado</h2>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Suporte Técnico</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Título do Problema</label>
                <input 
                  type="text" required value={newTicket.titulo}
                  onChange={(e) => setNewTicket({ ...newTicket, titulo: e.target.value })}
                  placeholder="Ex: Erro ao faturar nota"
                  className="w-full px-5 py-4 rounded-2xl border outline-none font-medium bg-gray-50 border-gray-200 text-gray-900 focus:border-black transition-all"
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Descrição Detalhada</label>
                <textarea 
                  required rows={4} value={newTicket.descricao}
                  onChange={(e) => setNewTicket({ ...newTicket, descricao: e.target.value })}
                  placeholder="Descreva o que está acontecendo..."
                  className="w-full px-5 py-4 rounded-2xl border outline-none font-medium resize-none bg-gray-50 border-gray-200 text-gray-900 focus:border-black transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Evidências (Máximo 2 fotos)</label>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full cursor-pointer transition-colors text-xs font-black text-gray-600">
                      <ImageIcon size={16} />
                      Anexar Imagens
                      <input 
                        type="file" accept="image/*" multiple
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">{ticketImages.length}/2 selecionadas</span>
                  </div>
                  
                  {ticketImages.length > 0 && (
                    <div className="flex gap-3">
                      {ticketImages.map((img, idx) => (
                        <div key={idx} className="relative group w-20 h-20 rounded-2xl overflow-hidden border-2 border-gray-100 shadow-sm transition-all hover:scale-[1.05]">
                          <img 
                            src={img} 
                            onClick={() => setPreviewImage(img)}
                            className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity" 
                          />
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTicketImages(prev => prev.filter((_, i) => i !== idx));
                            }}
                            className="absolute top-1 right-1 bg-black/60 backdrop-blur-md flex items-center justify-center p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black"
                          >
                            <X size={10} className="text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="submit" 
                  disabled={isLoading} 
                  className="flex-1 py-4 font-black rounded-2xl shadow-xl transition-all bg-black text-white hover:shadow-black/20 hover:scale-[1.02] disabled:opacity-50 disabled:scale-100"
                >
                  {isLoading ? 'ENVIANDO CHAMADO...' : 'ABRIR CHAMADO AGORA'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Image Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setPreviewImage(null)}
              className="absolute inset-0 bg-black/95 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-5xl max-h-[90vh] w-full flex items-center justify-center"
            >
              <button 
                onClick={() => setPreviewImage(null)}
                className="absolute -top-16 right-0 p-3 text-white hover:bg-white/10 rounded-full transition-colors z-10"
              >
                <X size={32} />
              </button>
              <img 
                src={previewImage} 
                alt="Preview" 
                className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/10"
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
};
