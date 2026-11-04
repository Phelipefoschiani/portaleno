import React from 'react';

/**
 * Chave de acesso da NF-e (44 dígitos) em blocos de 4, como no DANFE.
 * Os blocos são só visuais (sem espaço no texto): copiar/selecionar continua trazendo a chave limpa,
 * e no celular a quebra de linha acontece entre blocos, nunca no meio de um número.
 */
export function ChaveAcesso({ chave }: { chave?: string | null }) {
  const blocos = (chave || '').match(/.{1,4}/g) || [];
  return (
    <>
      {blocos.map((b, i) => (
        <span key={i} className="inline-block whitespace-nowrap mr-[0.45em] last:mr-0">
          {b}
        </span>
      ))}
    </>
  );
}
