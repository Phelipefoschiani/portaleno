import React, { useState } from 'react';
import { useGlobalState } from '../GlobalStateContext';
import { useAuth } from '../AuthContext';
import { FileCheck, Search, Download, ExternalLink, Printer, CheckCircle, Trash2, XCircle } from 'lucide-react';

export default function NotasFiscais() {
  const { user } = useAuth();
  const { pedidos, updatePedido, deletePedido } = useGlobalState();
  const isGerente = user?.perfil === 'gerente';
  const [searchTerm, setSearchTerm] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);

  // Pedidos que podem ser faturados (estão em produção ou aprovados)
  const pendentesFaturamento = pedidos.filter(p => 
    p.status === 'Em produção' || p.status === 'Aprovado'
  );

  // Simulation: Filter orders based on user role and status "Faturado"
  const faturados = pedidos.filter(p => {
    const isFaturado = p.status === 'Faturado';
    const accessMatch = isGerente ? true : p.representante_id === user?.id;
    const searchMatch = p.id.includes(searchTerm) || (p.nf_numero && p.nf_numero.includes(searchTerm));
    return isFaturado && accessMatch && searchMatch;
  });

  const handleDelete = (id: string) => {
    if (confirm('Atenção: Excluir a Nota Fiscal não exclui o pedido, mas remove o registro de faturamento deste portal. Continuar?')) {
      updatePedido(id, { status: 'Aprovado', nf_numero: undefined, nf_serie: undefined, nf_chave: undefined });
    }
  };

  const handleSimulateImport = (pedidoId: string) => {
    const nfNum = Math.floor(Math.random() * 90000) + 10000;
    const nfSerie = '001';
    const nfChave = Array.from({length: 44}, () => Math.floor(Math.random() * 10)).join('');
    
    updatePedido(pedidoId, {
      status: 'Faturado',
      nf_numero: nfNum.toString(),
      nf_serie: nfSerie,
      nf_chave: nfChave,
      nf_data_emissao: new Date().toISOString(),
      data_faturamento: new Date().toISOString()
    });
    
    setShowImportModal(false);
    alert(`Nota Fiscal ${nfNum} importada e vinculada ao pedido #PED-${pedidoId.substring(0, 8)}`);
  };

  const handleExport = () => {
    alert('Exportando XMLs do período selecionado para o seu e-mail...');
  };

  return (
    <div className="space-y-8">
      <div className="bg-primary p-10 rounded-[35px] text-white flex flex-col lg:flex-row justify-between items-center gap-6 shadow-2xl shadow-primary/20">
         <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-3xl font-black tracking-tighter">Gestão de Notas Fiscais</h2>
            <p className="text-sm font-medium opacity-70">Monitore o faturamento {isGerente ? 'geral do grupo' : 'da sua área de atuação'}</p>
         </div>
         <div className="flex flex-wrap justify-center gap-4">
            <div className="bg-white/10 px-6 py-3 rounded-2xl border border-white/10 backdrop-blur">
               <p className="text-[10px] uppercase font-bold opacity-60">Total Faturado</p>
               <p className="text-xl font-bold">R$ {faturados.reduce((acc, p) => acc + p.valor_total, 0).toLocaleString('pt-BR')}</p>
            </div>
            {isGerente && (
              <button 
                onClick={() => setShowImportModal(true)}
                className="bg-accent text-primary px-8 py-4 rounded-2xl font-bold flex items-center gap-2 hover:scale-105 transition-all shadow-lg"
              >
                 <FileCheck size={20} /> Importar XML / Danfe
              </button>
            )}
            <button 
              onClick={handleExport}
              className="bg-white/10 text-white border border-white/20 px-8 py-4 rounded-2xl font-bold flex items-center gap-2 hover:bg-white/20 transition-all"
            >
               <Download size={20} /> Exportar Notas
            </button>
         </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por NF ou Pedido..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-100 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-gray-600"
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-8 py-5">Identificação</th>
                <th className="px-8 py-5">Origem (Pedido)</th>
                <th className="px-8 py-5">Emissão</th>
                <th className="px-8 py-5">Valor</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {faturados.length > 0 ? faturados.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-8 py-5 text-sm font-bold text-gray-800">
                     <p>NF-e {p.nf_numero || '---'}</p>
                     <p className="text-[10px] text-gray-400">Série {p.nf_serie || '---'}</p>
                  </td>
                  <td className="px-8 py-5 font-bold text-primary">#PED-{p.id.substring(0, 8)}</td>
                  <td className="px-8 py-5 text-sm font-medium text-gray-500">{p.nf_data_emissao ? new Date(p.nf_data_emissao).toLocaleDateString('pt-BR') : new Date(p.data).toLocaleDateString('pt-BR')}</td>
                  <td className="px-8 py-5">
                     <span className="text-sm font-black text-gray-900">R$ {p.valor_total.toLocaleString('pt-BR')}</span>
                  </td>
                  <td className="px-8 py-5">
                     <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle size={14} />
                        <span className="text-[10px] font-bold uppercase">Autorizada</span>
                     </div>
                  </td>
                  <td className="px-8 py-5">
                     <div className="flex justify-center gap-1">
                        <button title="Visualizar" className="p-2 text-primary hover:bg-accent/30 rounded-lg transition-all"><Printer size={16} /></button>
                        <button title="Baixar" className="p-2 text-primary hover:bg-accent/30 rounded-lg transition-all"><Download size={16} /></button>
                        {isGerente && (
                          <button onClick={() => handleDelete(p.id)} title="Remover Faturamento" className="p-2 text-gray-300 hover:text-danger hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                        )}
                     </div>
                  </td>
                </tr>
              )) : (
                <tr>
                   <td colSpan={6} className="py-20 text-center">
                      <FileCheck size={48} className="mx-auto text-gray-100 mb-4" />
                      <p className="text-gray-400 font-bold tracking-tight">Nenhuma nota encontrada com os filtros atuais.</p>
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Importação de NF */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/40 backdrop-blur-sm">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col scale-in">
            <div className="p-8 bg-primary text-white flex justify-between items-center">
              <div className="flex items-center gap-4">
                <FileCheck size={32} />
                <h2 className="text-2xl font-black tracking-tight">Vincular Nota Fiscal</h2>
              </div>
              <button onClick={() => setShowImportModal(false)} className="hover:rotate-90 transition-all"><XCircle size={24} /></button>
            </div>
            
            <div className="p-10 space-y-8">
              <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                <p className="text-sm text-blue-700 font-bold leading-tight">
                  Selecione o pedido do Grupo ENO para vincular o faturamento via XML/ERP.
                </p>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Pedidos Pendentes de Faturamento</label>
                <div className="max-h-[300px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                  {pendentesFaturamento.length > 0 ? pendentesFaturamento.map(p => (
                    <div 
                      key={p.id}
                      onClick={() => handleSimulateImport(p.id)}
                      className="p-5 bg-gray-50 hover:bg-accent/20 cursor-pointer rounded-2xl border border-transparent hover:border-accent transition-all flex justify-between items-center group"
                    >
                      <div>
                        <p className="font-black text-gray-800">#PED-{p.id.substring(0, 8)}</p>
                        <p className="text-xs text-gray-500 font-bold uppercase">{p.status}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-primary">R$ {p.valor_total.toLocaleString('pt-BR')}</p>
                        <p className="text-xs text-gray-400">{new Date(p.data).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                  )) : (
                    <div className="py-10 text-center text-gray-400">
                      <p className="font-bold">Não há pedidos prontos para faturamento.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-8 bg-gray-50 flex flex-col gap-4">
              <button 
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.xml';
                  input.click();
                }}
                className="w-full py-4 bg-white border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 font-black text-xs uppercase tracking-widest hover:border-primary hover:text-primary transition-all"
              >
                Faça o upload do arquivo XML do ERP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
