import React, { useState } from 'react';
import { CabecalhoPagina } from '../ui/CabecalhoPagina';

// Tela do menu Aplicativo: link e passo a passo para instalar os apps no celular Android.
// Dois apps: o da roça (pesagem) e o da produção (apontamento). Ambos funcionam sem internet.
const APPS = [
  {
    id: 'roca',
    titulo: 'Aplicativo da roça',
    descricao: 'Pesagem e cálculo de mandioca no celular, com ou sem internet',
    caminho: '/roca.html',
    icone: 'Roça ENO',
  },
  {
    id: 'producao',
    titulo: 'Aplicativo da produção',
    descricao: 'Apontamento do que está sendo produzido, com ou sem internet',
    caminho: '/producao.html',
    icone: 'Produção ENO',
  },
];

function CardApp({ titulo, descricao, caminho, icone }: { titulo: string; descricao: string; caminho: string; icone: string }) {
  const link = `${window.location.origin}${caminho}`;
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
    <section className="rounded-2xl border border-linha bg-papel p-5">
      <div className="text-[15px] font-bold text-tinta">{titulo}</div>
      <div className="text-[12.5px] text-cinza mt-0.5">{descricao}</div>

      <div className="mt-4 break-all rounded-lg bg-papel-3/60 px-3 py-2.5 font-mono text-[14px]">{link}</div>
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

      <div className="mt-5 border-t border-linha pt-4">
        <div className="text-[12px] font-bold uppercase tracking-wide text-cinza">Como instalar no Android</div>
        <ol className="mt-3 list-decimal pl-5 space-y-2 text-[14px] leading-relaxed">
          <li>Abra o link acima no <strong>Chrome</strong> do celular (ele precisa estar com internet nesta primeira vez).</li>
          <li>Toque nos <strong>três pontinhos</strong> do Chrome.</li>
          <li>Toque em <strong>Instalar aplicativo</strong> (ou "Adicionar à tela inicial").</li>
          <li>Pronto: o ícone <strong>{icone}</strong> fica na tela do celular.</li>
        </ol>
      </div>
    </section>
  );
}

export function AplicativoRoca() {
  return (
    <div className="h-full w-full overflow-y-auto bg-papel-2 text-tinta">
      <div className="mx-auto w-full max-w-[860px] px-4 sm:px-6 pb-8">
        <CabecalhoPagina titulo="Aplicativos" resumo="Baixe no celular Android" />

        <div className="mt-4 space-y-4">
          {APPS.map(app => (
            <div key={app.id}>
              <CardApp titulo={app.titulo} descricao={app.descricao} caminho={app.caminho} icone={app.icone} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
