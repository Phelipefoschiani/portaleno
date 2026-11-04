import React, { useRef, useState } from 'react';
import { FileCode, X } from 'lucide-react';
import { lerNFeXml, chaveNFeValida, situacaoNFe, formatarDocumento, DadosNFe } from '../../lib/nfeXml';
import { NotaFornecedor, notaDoXml, notaEntradaJaGuardada } from '../../data/notasFornecedorData';
import { formatarDataBR, hojeISO } from '../../lib/datas';

/**
 * Nota fiscal do fornecedor numa despesa/compra: importa o XML (preenche tudo e devolve os dados
 * para a tela completar o formulário) ou deixa digitar o número de uma nota em papel.
 */
export function CampoNotaFornecedor({
  nota,
  onNota,
  onXmlLido,
  className = '',
}: {
  nota: NotaFornecedor | null;
  onNota: (nota: NotaFornecedor | null) => void;
  /** Dados completos do XML, para a tela preencher valor, data, fornecedor, itens... */
  onXmlLido?: (dados: DadosNFe) => void;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  const ler = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    setErro('');
    setAviso('');
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const d = lerNFeXml(String(ev.target?.result || ''));
        if (!chaveNFeValida(d.chave)) throw new Error('A chave de acesso deste XML não confere.');
        const repetida = notaEntradaJaGuardada(d.chave);
        if (repetida) throw new Error(`Esta nota já foi lançada: ${repetida}.`);
        const sit = situacaoNFe(d);
        if (sit === 'OUTRA') setAviso(`Atenção: a SEFAZ não autorizou esta nota (${d.status_codigo} - ${d.status_texto}).`);
        else if (sit === 'SEM_PROTOCOLO') setAviso('Atenção: o XML não tem o protocolo de autorização. Peça ao fornecedor o XML autorizado.');
        onNota(notaDoXml(d));
        onXmlLido?.(d);
      } catch (err) {
        setErro(err instanceof Error ? err.message : 'Não foi possível ler o XML.');
      }
    };
    reader.readAsText(arquivo);
  };

  const digitar = (numero: string) => {
    setErro('');
    if (!numero.trim()) {
      onNota(null);
      return;
    }
    onNota({
      numero: numero.replace(/\D/g, '') || numero.trim(),
      serie: nota?.serie || '1',
      chave: '',
      data_emissao: nota?.data_emissao || hojeISO(),
      emitente_nome: nota?.emitente_nome || '',
      emitente_documento: nota?.emitente_documento || '',
      valor: nota?.valor || 0,
      importada_xml: false,
    });
  };

  return (
    <div className={`rounded-md border border-linha bg-papel-2/60 p-3 space-y-2 text-xs ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-bold text-tinta-2">Nota fiscal do fornecedor</span>
        <input ref={inputRef} type="file" accept=".xml,text/xml,application/xml" onChange={ler} className="hidden" />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-eno-700 bg-papel text-eno-800 font-bold hover:bg-eno-50 cursor-pointer max-sm:w-full max-sm:justify-center max-sm:h-11"
        >
          <FileCode className="w-4 h-4" /> Importar XML da nota
        </button>
      </div>

      {nota?.importada_xml ? (
        <div className="flex items-start justify-between gap-2 rounded-md bg-papel border border-eno-100 px-2.5 py-2">
          <div className="min-w-0 leading-snug">
            <div className="font-bold text-tinta">
              NF {nota.numero} · série {nota.serie} · {formatarDataBR(nota.data_emissao)}
            </div>
            <div className="text-tinta-2 truncate">{nota.emitente_nome} · {formatarDocumento(nota.emitente_documento)}</div>
            <div className="text-[10.5px] text-cinza tabular-nums break-all">
              Chave {nota.chave}{nota.protocolo ? ` · protocolo ${nota.protocolo}` : ''}
            </div>
          </div>
          <button type="button" onClick={() => { onNota(null); setAviso(''); }} aria-label="Tirar a nota" className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-papel-3/60 text-cinza cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
          <label className="text-cinza shrink-0" htmlFor="nf-fornecedor-numero">Ou digite o nº da nota (papel):</label>
          <input
            id="nf-fornecedor-numero"
            type="text"
            inputMode="numeric"
            value={nota?.numero || ''}
            onChange={e => digitar(e.target.value)}
            placeholder="Sem nota"
            className="w-full sm:w-36 bg-papel border border-linha-forte rounded-md px-2.5 py-1.5 tabular-nums font-bold text-tinta focus:outline-none focus:border-eno-700"
          />
        </div>
      )}

      {aviso && <div className="text-st-aguardando font-semibold">{aviso}</div>}
      {erro && <div role="alert" className="text-st-vencido font-semibold">{erro}</div>}
    </div>
  );
}
