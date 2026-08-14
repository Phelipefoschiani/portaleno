import React, { useState, useEffect } from 'react';
import { 
  LifeBuoy, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  History, 
  Search,
  Filter,
  MessageSquare,
  Image as ImageIcon,
  ChevronRight,
  RefreshCw,
  User,
  Plus,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import { NewTicketModal } from './NewTicketModal';

interface Chamado {
  id: string;
  numero: number;
  titulo: string;
  descricao: string;
  status: 'aberto' | 'recebido' | 'atualizando' | 'concluido';
  data_abertura: string;
  data_atualizacao: string;
  anexos?: string[];
}

interface SuportePortalProps {
  autoOpen?: boolean;
}

const SuportePortal: React.FC<SuportePortalProps> = ({ autoOpen = false }) => {
  const { user } = useAuth();
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [selectedChamado, setSelectedChamado] = useState<Chamado | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [newTicket, setNewTicket] = useState({ titulo: '', descricao: '' });
  const [ticketImages, setTicketImages] = useState<string[]>([]);

  const isSupport = user?.perfil === 'suporte';

  useEffect(() => {
    fetchChamados();
  }, []);

  useEffect(() => {
    if (autoOpen) {
      setIsNewTicketOpen(true);
    }
  }, [autoOpen]);

  const fetchChamados = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('chamados')
        .select('*')
        .order('numero', { ascending: false });

      if (!error && data) {
        setChamados(data);
      } else {
        const mockChamados: Chamado[] = [
          {
            id: '1',
            numero: 1,
            titulo: 'Erro ao faturar pedido #1a3a9270',
            descricao: 'O sistema apresenta um erro de permissão ao tentar anexar a nota fiscal no pedido selecionado.',
            status: 'aberto',
            data_abertura: new Date().toISOString(),
            data_atualizacao: new Date().toISOString(),
            anexos: ['https://images.unsplash.com/photo-1554224155-1696413565d3?q=80&w=1000&auto=format&fit=crop']
          },
          {
            id: '2',
            numero: 2,
            titulo: 'Sugestão: Filtro por data na produção',
            descricao: 'Gostaria de sugerir a inclusão de um filtro por data na tela de fabricação para facilitar a busca por lotes antigos.',
            status: 'recebido',
            data_abertura: new Date(Date.now() - 86400000).toISOString(),
            data_atualizacao: new Date().toISOString(),
          }
        ];
        setChamados(mockChamados);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

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

  const updateStatus = async (id: string, newStatus: 'aberto' | 'recebido' | 'atualizando' | 'concluido') => {
    setIsUpdatingStatus(true);
    try {
      await supabase
        .from('chamados')
        .update({ status: newStatus, data_atualizacao: new Date().toISOString() })
        .eq('id', id);

      setChamados(prev => prev.map(c => c.id === id ? { ...c, status: newStatus, data_atualizacao: new Date().toISOString() } : c));
      if (selectedChamado?.id === id) {
        setSelectedChamado(prev => prev ? { ...prev, status: newStatus, data_atualizacao: new Date().toISOString() } : null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const novoChamado: Partial<Chamado> = {
      numero: chamados.length > 0 ? Math.max(...chamados.map(c => c.numero)) + 1 : 1,
      titulo: newTicket.titulo,
      descricao: newTicket.descricao,
      status: 'aberto',
      data_abertura: new Date().toISOString(),
      data_atualizacao: new Date().toISOString(),
      anexos: ticketImages
    };

    try {
      const { data, error } = await supabase
        .from('chamados')
        .insert([novoChamado])
        .select()
        .single();

      if (!error && data) {
        setChamados([data, ...chamados]);
      } else {
        setChamados([{ ...novoChamado, id: Date.now().toString() } as Chamado, ...chamados]);
      }
      setIsNewTicketOpen(false);
      setNewTicket({ titulo: '', descricao: '' });
      setTicketImages([]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredChamados = chamados.filter(c => {
    const matchesSearch = c.titulo.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         c.numero.toString().includes(searchTerm);
    const matchesStatus = statusFilter === 'todos' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: chamados.length,
    aberto: chamados.filter(c => c.status === 'aberto').length,
    atendidos: chamados.filter(c => c.status === 'concluido').length,
    ultimaAtualizacao: chamados.filter(c => c.status === 'concluido').length > 0 
      ? new Date(Math.max(...chamados.filter(c => c.status === 'concluido').map(c => new Date(c.data_atualizacao).getTime()))).toLocaleDateString('pt-BR') 
      : '--/--/----'
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-0 space-y-8 animate-in fade-in duration-500">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tight flex items-center gap-3 text-gray-900">
              <LifeBuoy className="text-primary" size={40} />
              Portal de Suporte
            </h1>
            <p className="text-gray-500 font-medium mt-1">Gerenciamento de chamados técnico</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={fetchChamados}
              className="p-3 rounded-2xl transition-colors shadow-sm border bg-white border-gray-200 text-gray-600 hover:text-primary"
            >
              <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button 
              onClick={() => setIsNewTicketOpen(true)}
              className="px-6 py-3 font-bold rounded-2xl shadow-lg transition-all flex items-center gap-2 bg-black text-white shadow-black/20 hover:shadow-xl"
            >
              <Plus size={20} /> Novo Chamado
            </button>
          </div>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white border-gray-100 text-gray-900 p-6 rounded-[2rem] border shadow-sm space-y-2">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-blue-50 text-blue-600">
              <MessageSquare size={24} />
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total de Chamados</p>
            <p className="text-3xl font-black">{stats.total}</p>
          </div>
          
          <div className="bg-white border-gray-100 text-gray-900 p-6 rounded-[2rem] border shadow-sm space-y-2">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={24} />
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Atendidos</p>
            <p className="text-3xl font-black">{stats.atendidos}</p>
          </div>

          <div className="bg-white border-gray-100 text-gray-900 p-6 rounded-[2rem] border shadow-sm space-y-2">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-amber-50 text-amber-600">
              <Clock size={24} />
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Em Aberto</p>
            <p className="text-3xl font-black">{stats.aberto}</p>
          </div>

          <div className="bg-white border-gray-100 text-gray-900 p-6 rounded-[2rem] border shadow-sm space-y-2">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gray-50 text-gray-600">
              <History size={24} />
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Última Atualização</p>
            <p className="text-xl font-black">{stats.ultimaAtualizacao}</p>
          </div>
        </div>

        {/* Filters & History */}
        <div className="bg-white border-gray-100 rounded-[2rem] border shadow-sm overflow-hidden">
          <div className="p-6 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 border-gray-50">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar por título ou número..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-2xl border-transparent focus:ring-4 transition-all font-medium outline-none bg-gray-50 text-gray-900 focus:bg-white focus:border-primary focus:ring-primary/10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-gray-400 mr-1" />
              <div className="flex gap-1 p-1 rounded-xl bg-gray-50">
                {['todos', 'aberto', 'recebido', 'atualizando', 'concluido'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all capitalize ${
                      statusFilter === s 
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Número</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Título</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Abertura</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-900">
                {filteredChamados.map((c) => (
                  <tr 
                    key={c.id} 
                    onClick={() => setSelectedChamado(c)}
                    className="transition-colors cursor-pointer group hover:bg-gray-50/80"
                  >
                    <td className="px-6 py-4 font-black text-gray-500">#{c.numero}</td>
                    <td className="px-6 py-4 font-bold text-gray-900">{c.titulo}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        c.status === 'aberto' ? 'bg-gray-100 text-gray-600' :
                        c.status === 'recebido' ? 'bg-blue-50 text-blue-600' :
                        c.status === 'atualizando' ? 'bg-amber-50 text-amber-600' :
                        'bg-emerald-50 text-emerald-600'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 font-medium">
                      {new Date(c.data_abertura).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <ChevronRight size={18} className="text-gray-600 group-hover:text-primary transition-colors" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Ticket Details Modal */}
      <AnimatePresence>
        {selectedChamado && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedChamado(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] bg-white border border-gray-100"
            >
              <div className="p-8 flex justify-between items-start bg-black text-white">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-black bg-white/10 px-2 py-1 rounded-lg uppercase tracking-widest">Chamado #{selectedChamado.numero}</span>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      selectedChamado.status === 'aberto' ? 'bg-white/20 text-white' :
                      selectedChamado.status === 'recebido' ? 'bg-blue-500 text-white' :
                      selectedChamado.status === 'atualizando' ? 'bg-amber-500 text-white' :
                      'bg-emerald-500 text-white'
                    }`}>
                      {selectedChamado.status}
                    </span>
                  </div>
                  <h2 className="text-2xl font-black tracking-tight">{selectedChamado.titulo}</h2>
                </div>
                <button onClick={() => setSelectedChamado(null)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 overflow-y-auto space-y-8 flex-1 text-gray-900">
                <section>
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Descrição</h4>
                  <div className="p-6 rounded-2xl border font-medium leading-relaxed bg-gray-50 border-gray-100 text-gray-700">
                    {selectedChamado.descricao}
                  </div>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {selectedChamado.anexos && selectedChamado.anexos.length > 0 && (
                    <section>
                      <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Anexos</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {selectedChamado.anexos.map((img, idx) => (
                          <div 
                            key={idx} 
                            onClick={() => setPreviewImage(img)}
                            className="aspect-square rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 shadow-sm cursor-pointer hover:opacity-80 hover:scale-[1.02] transition-all"
                          >
                            <img src={img} alt={`Anexo ${idx + 1}`} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  <section className="space-y-6">
                    <div>
                      <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Informações</h4>
                      <div className="space-y-2 p-5 rounded-2xl bg-gray-50 border border-gray-100">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400 font-bold uppercase tracking-tighter">Abertura</span>
                          <span className="text-gray-900 font-black">{new Date(selectedChamado.data_abertura).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400 font-bold uppercase tracking-tighter">Atualização</span>
                          <span className="text-gray-900 font-black">{new Date(selectedChamado.data_atualizacao).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>
                    </div>

                    {isSupport && (
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Ações de Status</h4>
                        <div className="grid grid-cols-1 gap-2">
                          {['recebido', 'atualizando', 'concluido'].map((st) => (
                            <button 
                              key={st}
                              onClick={() => updateStatus(selectedChamado.id, st as any)}
                              disabled={isUpdatingStatus || selectedChamado.status === st}
                              className={`px-4 py-3 rounded-xl text-xs font-black transition-all capitalize border ${
                                selectedChamado.status === st 
                                  ? 'bg-black text-white border-black shadow-lg shadow-black/10' 
                                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                              }`}
                            >
                              Marcar como {st}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </section>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global New Ticket Modal (External Component) */}
      <NewTicketModal 
        isOpen={isNewTicketOpen} 
        onClose={() => setIsNewTicketOpen(false)} 
        onSuccess={fetchChamados}
      />

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
    </div>
  );
};

export default SuportePortal;
