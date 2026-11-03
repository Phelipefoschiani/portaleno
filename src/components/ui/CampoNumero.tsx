import React, { useEffect, useRef, useState } from 'react';

/**
 * Campo numérico que deixa o usuário apagar tudo e digitar de novo.
 *
 * Guarda o TEXTO digitado (permite vazio, "0,", "12,5", vírgula ou ponto) e só
 * entrega o número para fora. Mínimo/máximo são aplicados no blur, nunca durante
 * a digitação. Ao focar, seleciona todo o conteúdo para digitar por cima.
 */

type InputBase = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type' | 'min' | 'max' | 'defaultValue'
>;

export interface CampoNumeroProps extends InputBase {
  value: number | string | null | undefined;
  /** Recebe o número digitado (ou `vazioComo` quando o campo está vazio). */
  onChange: (valor: number) => void;
  /** Valor entregue quando o campo fica vazio (padrão 0). */
  vazioComo?: number;
  /** Casas decimais usadas para formatar no blur (padrão: sem arredondar). */
  casas?: number;
  /** Só aceita inteiros. */
  inteiro?: boolean;
  /** Mostra o campo vazio quando o valor é 0 (em vez de "0"). */
  ocultarZero?: boolean;
  min?: number | string;
  max?: number | string;
}

/** Converte texto digitado (pt-BR ou ponto) em número. Vazio/inválido => null. */
export function textoParaNumero(texto: string): number | null {
  let t = String(texto ?? '').trim().replace(/\s/g, '');
  if (t === '' || t === '-' || t === ',' || t === '.' || t === '-,' || t === '-.') return null;
  const temVirgula = t.includes(',');
  const pontos = (t.match(/\./g) || []).length;
  if (temVirgula) {
    t = t.replace(/\./g, '').replace(',', '.');
  } else if (pontos > 1) {
    t = t.replace(/\./g, '');
  }
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

function paraNumero(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  return textoParaNumero(v);
}

function formatar(n: number | null, casas: number | undefined, ocultarZero: boolean): string {
  if (n === null) return '';
  if (ocultarZero && n === 0) return '';
  if (casas !== undefined) return n.toFixed(casas).replace('.', ',');
  // até 6 casas, sem zeros sobrando
  const s = String(Math.round(n * 1e6) / 1e6);
  return s.replace('.', ',');
}

export function CampoNumero({
  value,
  onChange,
  vazioComo = 0,
  casas,
  inteiro = false,
  ocultarZero = false,
  min,
  max,
  onFocus,
  onBlur,
  inputMode,
  ...rest
}: CampoNumeroProps) {
  const externo = paraNumero(value);
  const [texto, setTexto] = useState<string>(() => formatar(externo, casas, ocultarZero));
  const focado = useRef(false);

  // Sincroniza quando o valor de fora muda de verdade (sem atropelar a digitação).
  useEffect(() => {
    const doTexto = textoParaNumero(texto);
    const efetivoTexto = doTexto === null ? vazioComo : doTexto;
    const efetivoExterno = externo === null ? vazioComo : externo;
    if (Math.abs(efetivoTexto - efetivoExterno) < 1e-9) return;
    setTexto(formatar(externo, casas, ocultarZero));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externo]);

  const nMin = min === undefined || min === '' ? undefined : Number(min);
  const nMax = max === undefined || max === '' ? undefined : Number(max);
  const permiteNegativo = nMin === undefined || nMin < 0;

  return (
    <input
      {...rest}
      type="text"
      inputMode={inputMode ?? (inteiro ? 'numeric' : 'decimal')}
      autoComplete="off"
      value={texto}
      onFocus={(e) => {
        focado.current = true;
        const el = e.currentTarget;
        // setTimeout: o mouseup do clique não desfaz a seleção
        setTimeout(() => {
          try { if (document.activeElement === el) el.select(); } catch { /* ignore */ }
        }, 0);
        onFocus?.(e);
      }}
      onChange={(e) => {
        let t = e.target.value;
        t = inteiro ? t.replace(/[^\d-]/g, '') : t.replace(/[^\d.,-]/g, '');
        if (!permiteNegativo) t = t.replace(/-/g, '');
        else t = t.replace(/(?!^)-/g, '');
        setTexto(t);
        const n = textoParaNumero(t);
        onChange(n === null ? vazioComo : inteiro ? Math.trunc(n) : n);
      }}
      onBlur={(e) => {
        focado.current = false;
        let n = textoParaNumero(texto);
        if (n !== null) {
          if (inteiro) n = Math.trunc(n);
          if (nMin !== undefined && Number.isFinite(nMin) && n < nMin) n = nMin;
          if (nMax !== undefined && Number.isFinite(nMax) && n > nMax) n = nMax;
          if (casas !== undefined) n = Math.round(n * 10 ** casas) / 10 ** casas;
          setTexto(formatar(n, casas, false));
          if (n !== externo) onChange(n);
        }
        onBlur?.(e);
      }}
    />
  );
}

export default CampoNumero;
