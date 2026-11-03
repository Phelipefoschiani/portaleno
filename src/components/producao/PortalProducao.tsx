import React, { useState } from 'react';
import { OrdensProducaoPainel } from './OrdensProducaoPainel';
import { CadastroProducao } from '../cadastros/CadastroProducao';
import { Segmentado } from '../ui/BarraFiltros';

// Portal do perfil PRODUCAO: fila de Ordens de Produção (sem valores financeiros) + cadastro de colaboradores
export function PortalProducao() {
  const [aba, setAba] = useState<'OPS' | 'COLABORADORES'>('OPS');
  return (
    <div className="space-y-4">
      <Segmentado<'OPS' | 'COLABORADORES'>
        rotuloAria="Seções do portal da produção"
        valor={aba}
        onChange={setAba}
        className="w-full sm:w-fit [&>button]:h-10 sm:[&>button]:h-8 [&>button]:flex-1 sm:[&>button]:flex-none"
        opcoes={[
          { valor: 'OPS', rotulo: 'Fila de produção (OPs)' },
          { valor: 'COLABORADORES', rotulo: 'Colaboradores' },
        ]}
      />
      {aba === 'OPS' ? <OrdensProducaoPainel modo="PRODUCAO" /> : <CadastroProducao />}
    </div>
  );
}
