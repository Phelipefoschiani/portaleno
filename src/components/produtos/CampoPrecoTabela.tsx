import React, { useState } from 'react';
import { unitarioDaCaixa } from '../../data/precosData';

interface Props {
  /** Preço unitário atual (undefined/0 = sem valor nesta tabela) */
  unitario?: number;
  /** Quantidade do acondicionamento do produto (caixa = unitário × unidades) */
  unidades: number;
  tipoAcondicionamento: string;
  /** Recebe o novo preço unitário (undefined quando o campo foi apagado) */
  onChange: (unitario: number | undefined) => void;
  /** Quais campos mostrar (padrão: os dois quando há caixa/fardo) */
  mostrarUnitario?: boolean;
  mostrarCaixa?: boolean;
  alerta?: boolean;
  disabled?: boolean;
}

const parse = (texto: string): number | undefined => {
  const limpo = String(texto).trim().replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  if (limpo === '') return undefined;
  const n = parseFloat(limpo);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

const fmt = (n?: number) =>
  n && n > 0 ? n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';

/**
 * Par de campos sincronizados: preço unitário e preço da caixa/fardo (caixa = unitário × unidades).
 * O usuário digita qualquer um; o outro acompanha. Em branco = produto não vendido na tabela.
 */
export function CampoPrecoTabela({
  unitario,
  unidades,
  tipoAcondicionamento,
  onChange,
  mostrarUnitario = true,
  mostrarCaixa = true,
  alerta = false,
  disabled = false
}: Props) {
  const [editando, setEditando] = useState<'un' | 'cx' | null>(null);
  const [rascunho, setRascunho] = useState('');
  const un = unidades > 0 ? unidades : 1;
  const temCaixa = un > 1;
  const valorUn = unitario && unitario > 0 ? unitario : undefined;
  const valorCx = valorUn ? Math.round(valorUn * un * 100) / 100 : undefined;

  const base = `w-full bg-white border rounded-lg px-2 py-1 text-right font-mono font-bold tabular-nums focus:outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 disabled:bg-slate-100 placeholder:font-sans placeholder:font-normal placeholder:text-slate-300 ${
    alerta ? 'border-red-400 text-red-700' : 'border-slate-200 text-slate-900'
  }`;

  const campo = (qual: 'un' | 'cx') => {
    const valor = qual === 'un' ? valorUn : valorCx;
    return (
      <input
        type="text"
        inputMode="decimal"
        disabled={disabled}
        value={editando === qual ? rascunho : fmt(qual === 'un' ? (valorUn ? Math.round(valorUn * 100) / 100 : undefined) : valor)}
        placeholder="—"
        onFocus={() => {
          setEditando(qual);
          setRascunho(fmt(qual === 'un' ? (valorUn ? Math.round(valorUn * 100) / 100 : undefined) : valor));
        }}
        onBlur={() => setEditando(null)}
        onChange={(e) => {
          setRascunho(e.target.value);
          const n = parse(e.target.value);
          if (n === undefined) onChange(undefined);
          else onChange(qual === 'un' ? n : unitarioDaCaixa(n, un));
        }}
        title={qual === 'un' ? 'Preço da unidade nesta tabela' : `Preço do(a) ${tipoAcondicionamento.toLowerCase()} com ${un} un`}
        className={base}
      />
    );
  };

  const verUn = mostrarUnitario || !temCaixa;
  const verCx = mostrarCaixa && temCaixa;

  return (
    <div className={`grid gap-1.5 ${verUn && verCx ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {verUn && (
        <label className="block">
          <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400 mb-0.5">Unitário</span>
          {campo('un')}
        </label>
      )}
      {verCx && (
        <label className="block">
          <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400 mb-0.5 truncate">
            {tipoAcondicionamento} c/ {un}
          </span>
          {campo('cx')}
        </label>
      )}
    </div>
  );
}
