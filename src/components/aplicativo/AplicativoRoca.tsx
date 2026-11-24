import React, { useState } from 'react';
import { CabecalhoPagina } from '../ui/CabecalhoPagina';

// Tela do menu Aplicativo: link e passo a passo para instalar o app da roça no celular Android.
export function AplicativoRoca() {
  const link = `${window.location.origin}/roca.html`;
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2500);
    } catch {
      /* navegador sem permissão de área de transferência: o link continua visível */
    }
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-papel-2 text-tinta">
      <div className="mx-auto w-full max-w-[860px] px-4 sm:px-6 pb-8">
        <CabecalhoPagina
          titulo="Aplicativo da roça"
          resumo="Pesagem e cálculo de mandioca no celular, com ou sem internet"
        />

        <div className="mt-4 space-y-4">
          <section className="rounded-2xl border border-linha bg-papel p-5">
            <div className="text-[12px] font-bold uppercase tracking-wide text-cinza">Link do app</div>
            <div className="mt-2 break-all rounded-lg bg-papel-3/60 px-3 py-2.5 font-mono text-[14px]">{link}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="h-10 px-4 inline-flex items-center rounded-md bg-eno-800 text-white text-[13px] font-bold"
              >
                Abrir o app
              </a>
              <button type="button" onClick={copiar} className="h-10 px-4 rounded-md border border-linha-forte text-[13px] font-semibold">
                {copiado ? 'Link copiado' : 'Copiar link'}
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-linha bg-papel p-5">
            <div className="text-[12px] font-bold uppercase tracking-wide text-cinza">Como instalar no Android</div>
            <ol className="mt-3 list-decimal pl-5 space-y-2 text-[14px] leading-relaxed">
              <li>Abra o link acima no <strong>Chrome</strong> do celular (ele precisa estar com internet nesta primeira vez).</li>
              <li>Toque nos <strong>três pontinhos</strong> do Chrome.</li>
              <li>Toque em <strong>Instalar aplicativo</strong> (ou "Adicionar à tela inicial").</li>
              <li>Pronto: o ícone <strong>Roça ENO</strong> fica na tela do celular.</li>
            </ol>
          </section>

          <section className="rounded-2xl border border-linha bg-papel p-5">
            <div className="text-[12px] font-bold uppercase tracking-wide text-cinza">Como funciona na roça</div>
            <ul className="mt-3 list-disc pl-5 space-y-2 text-[14px] leading-relaxed">
              <li>Depois da primeira abertura, o app abre <strong>sem internet</strong>.</li>
              <li>Pesagens e agricultores cadastrados ficam salvos no celular.</li>
              <li>Quando o celular pegar internet, tudo é <strong>enviado sozinho</strong> para o sistema. Também dá para apertar "Enviar agora".</li>
              <li>No sistema, as pesagens recebidas viram <strong>cálculos na roça</strong> com o pedido de compra, na tela Cálculo na roça.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
