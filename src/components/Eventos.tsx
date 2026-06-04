import React, { useState } from 'react';
import { useGlobalState } from '../GlobalStateContext';
import { Activity, Clock, Calendar, User as UserIcon, Search, FileText } from 'lucide-react';

const Eventos: React.FC = () => {
  const { eventos } = useGlobalState();
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredEventos = eventos.filter(ev => 
    ev.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ev.usuario_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ev.data.includes(searchTerm)
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 hide-on-print">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white p-8 rounded-[32px] shadow-sm border border-gray-100">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 text-primary rounded-2xl">
              <Activity size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-gray-900">Eventos do Sistema</h1>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mt-1">Histórico completo de ações</p>
            </div>
          </div>
          <p className="text-gray-500 font-medium text-sm max-w-xl leading-relaxed">
            Acompanhe passo a passo tudo o que foi lançado, cadastrado, alterado ou faturado na plataforma.
          </p>
        </div>
        
        <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-2xl border border-gray-100 w-full md:w-auto">
          <Search size={18} className="text-gray-400 ml-2" />
          <input
            type="text"
            placeholder="Buscar evento, usuário ou data..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="bg-transparent border-none outline-none text-sm font-bold text-gray-700 placeholder-gray-400 w-full md:w-64 py-2"
          />
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="p-5 font-black text-xs text-gray-400 uppercase tracking-widest min-w-[120px]">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} /> Data
                  </div>
                </th>
                <th className="p-5 font-black text-xs text-gray-400 uppercase tracking-widest min-w-[100px]">
                  <div className="flex items-center gap-2">
                    <Clock size={14} /> Hora
                  </div>
                </th>
                <th className="p-5 font-black text-xs text-gray-400 uppercase tracking-widest min-w-[250px]">
                  <div className="flex items-center gap-2">
                    <FileText size={14} /> Descrição
                  </div>
                </th>
                <th className="p-5 font-black text-xs text-gray-400 uppercase tracking-widest min-w-[150px]">
                  <div className="flex items-center gap-2">
                    <UserIcon size={14} /> Usuário
                  </div>
                </th>
                <th className="p-5 font-black text-xs text-gray-400 uppercase tracking-widest text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredEventos.length > 0 ? (
                filteredEventos.map((ev, index) => (
                  <tr key={ev.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="p-5">
                      <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">
                        {ev.data.split('-').reverse().join('/')}
                      </span>
                    </td>
                    <td className="p-5">
                      <span className="text-xs font-bold text-gray-500 font-mono tracking-wider">
                        {ev.hora}
                      </span>
                    </td>
                    <td className="p-5">
                      <p className="text-sm font-semibold text-gray-800 leading-snug">
                        {ev.descricao}
                      </p>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black uppercase">
                          {ev.usuario_nome.charAt(0)}
                        </div>
                        <span className="text-xs font-bold text-gray-700">
                          {ev.usuario_nome}
                        </span>
                      </div>
                    </td>
                    <td className="p-5 text-right">
                      {ev.valor !== undefined ? (
                        <span className={`text-sm font-black tracking-tight ${ev.valor >= 0 ? 'text-primary' : 'text-red-500'}`}>
                          {ev.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-gray-300">-</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-gray-400">
                    <Activity size={32} className="mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-bold">Nenhum evento registrado ou encontrado.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Eventos;
