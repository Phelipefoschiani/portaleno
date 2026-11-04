import React, { useState } from 'react';
import { ClipboardList, PackagePlus, Users } from 'lucide-react';
import { OrdensProducaoPainel } from './OrdensProducaoPainel';
import { CadastroProducao } from '../cadastros/CadastroProducao';
import { EntradaMateriaPrimaProducao } from './EntradaMateriaPrimaProducao';
import { MolduraPortal } from '../portais/MolduraPortal';

type AbaProducao = 'OPS' | 'ENTRADA_MP' | 'COLABORADORES';

// Portal do perfil PRODUCAO: fila de Ordens de Produção, entrada de matéria-prima (lote do fornecedor) e colaboradores
export function PortalProducao({ onVoltar, conta, ehAdmin }: { onVoltar: () => void; conta?: string; ehAdmin?: boolean }) {
  const [aba, setAba] = useState<AbaProducao>('OPS');
  return (
    <MolduraPortal<AbaProducao>
      portal="Chão de fábrica"
      conta={conta}
      onVoltar={onVoltar}
      ehAdmin={ehAdmin}
      abas={[
        { id: 'OPS', rotulo: 'Ordens de produção', curto: 'Ordens', Icone: ClipboardList },
        { id: 'ENTRADA_MP', rotulo: 'Entrada de matéria-prima', curto: 'Matéria-prima', Icone: PackagePlus },
        { id: 'COLABORADORES', rotulo: 'Colaboradores', curto: 'Equipe', Icone: Users },
      ]}
      abaAtiva={aba}
      onAba={setAba}
    >
      {aba === 'OPS' && <OrdensProducaoPainel modo="PRODUCAO" />}
      {aba === 'ENTRADA_MP' && (
        <div className="px-3 sm:px-5 pt-4">
          <EntradaMateriaPrimaProducao />
        </div>
      )}
      {aba === 'COLABORADORES' && (
        <div className="px-3 sm:px-5 pt-4">
          <CadastroProducao />
        </div>
      )}
    </MolduraPortal>
  );
}
