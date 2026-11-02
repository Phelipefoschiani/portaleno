import React, { useState } from 'react';
import { ClipboardList, Users } from 'lucide-react';
import { OrdensProducaoPainel } from './OrdensProducaoPainel';
import { CadastroProducao } from '../cadastros/CadastroProducao';

// Portal do perfil PRODUCAO: fila de Ordens de Produção (sem valores financeiros) + cadastro de colaboradores
export function PortalProducao() {
  const [aba, setAba] = useState<'OPS' | 'COLABORADORES'>('OPS');
  const abas = [
    { id: 'OPS' as const, rotulo: 'Fila de Produção (OPs)', icone: <ClipboardList className="w-4 h-4" /> },
    { id: 'COLABORADORES' as const, rotulo: 'Colaboradores', icone: <Users className="w-4 h-4" /> }
  ];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {abas.map(a => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
              aba === a.id ? 'bg-emerald-900 text-white shadow-xs' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {a.icone}
            <span>{a.rotulo}</span>
          </button>
        ))}
      </div>
      {aba === 'OPS' ? <OrdensProducaoPainel modo="PRODUCAO" /> : <CadastroProducao />}
    </div>
  );
}
