import React from 'react';

/** Estado vazio útil: o que é esta lista e o que fazer agora. Sem ilustração. */
export function EstadoVazio({ titulo, texto, acao, className = '' }: { titulo: string; texto?: React.ReactNode; acao?: React.ReactNode; className?: string }) {
  return (
    <div className={`px-6 py-12 text-center ${className}`}>
      <div className="mx-auto mb-4 h-[3px] w-10 filete-ouro rounded-full" aria-hidden />
      <p className="text-[17px] font-bold text-tinta">{titulo}</p>
      {texto && <p className="mt-1.5 text-[13px] text-cinza max-w-md mx-auto">{texto}</p>}
      {acao && <div className="mt-5 flex justify-center gap-2">{acao}</div>}
    </div>
  );
}
