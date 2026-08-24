import React, { useState, useEffect } from 'react';
import { Coins, Search } from 'lucide-react';
import { formatCurrency } from '../../types';

interface AReceberType {
  id: string;
  pedido_id?: string; // Link to the original pedido
  produto_id: string;
  nome_produto: string;
  valor: number;
  lote: string;
  data: string;
  status: 'Pendente' | 'Recebido';
}

export const AReceberTempera: React.FC<{ empresa: string }> = ({ empresa }) => {
  const [areceber, setAReceber] = useState<AReceberType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = () => {
    const saved = localStorage.getItem('tempera_areceber');
    if (saved) {
      try {
        setAReceber(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const markAsReceived = (id: string) => {
    const updated = areceber.map(item => 
      item.id === id ? { ...item, status: 'Recebido' as const } : item
    );
    setAReceber(updated);
    localStorage.setItem('tempera_areceber', JSON.stringify(updated));
  };

  const filtered = areceber.filter(item => 
    item.nome_produto.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (item.lote && item.lote.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-black text-emerald-700 tracking-tight flex items-center gap-2">
            <Coins size={32} />
            A Receber
          </h2>
          <p className="text-gray-500 mt-1">Pedidos gerados pela tela de Produtos</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center gap-4 bg-gray-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text"
              placeholder="Buscar por produto ou lote..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-bold">Data</th>
                <th className="px-6 py-4 font-bold">Produto</th>
                <th className="px-6 py-4 font-bold">Lote</th>
                <th className="px-6 py-4 font-bold">Valor</th>
                <th className="px-6 py-4 font-bold text-center">Status</th>
                <th className="px-6 py-4 font-bold text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Nenhum pedido a receber encontrado.
                  </td>
                </tr>
              ) : (
                filtered.map(item => (
                  <tr key={item.id} className="hover:bg-emerald-50/30 transition-colors">
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(item.data).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900">{item.nome_produto}</td>
                    <td className="px-6 py-4 text-gray-600">{item.lote || '-'}</td>
                    <td className="px-6 py-4 font-bold text-emerald-600">R$ {formatCurrency(item.valor)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        item.status === 'Recebido' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {item.status !== 'Recebido' && (
                        <button 
                          onClick={() => markAsReceived(item.id)}
                          className="bg-emerald-600 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-emerald-700 transition shadow-sm"
                        >
                          Receber
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AReceberTempera;
