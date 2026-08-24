import React from 'react';

export const LotesTempera: React.FC<{ empresa: string }> = ({ empresa }) => {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4 text-primary">Lotes (Tempera e Empana)</h2>
      <p className="text-gray-600">Página em construção para gerenciamento de lotes de produção e estoque.</p>
    </div>
  );
};

export default LotesTempera;
