import React, { useCallback, useEffect, useState } from 'react';
import { LogOut, LayoutDashboard, Fuel, Timer, Receipt, Tractor, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  ControleSitioCompleto,
  DespesaSitio,
  EVENTO_SITIO_ATUALIZADO,
  carregarControleSitio,
  salvarControleSitio,
  normalizarEstadoSitio,
  movimentoDe
} from '../../data/sitioControleData';
import { integrarDespesaSitioAoFinanceiro } from '../../data/pipelineIntegrado';
import { conferirSaldoParaPagar } from '../../data/financeiroData';
import { mesAtualKey } from '../../lib/datas';
import { AbaSitio, rotuloMes } from '../sitio/ui';
import { AbaPainel } from '../sitio/AbaPainel';
import { AbaCombustivel } from '../sitio/AbaCombustivel';
import { AbaHoras } from '../sitio/AbaHoras';
import { AbaDespesas } from '../sitio/AbaDespesas';
import { AbaMaquinas } from '../sitio/AbaMaquinas';

interface PortalControleSitioProps {
  onVoltar: () => void;
}

const ABAS: { id: AbaSitio; rotulo: string; curto: string; icone: React.ComponentType<{ className?: string }> }[] = [
  { id: 'PAINEL', rotulo: 'Painel', curto: 'Painel', icone: LayoutDashboard },
  { id: 'COMBUSTIVEL', rotulo: 'Combustível', curto: 'Combust.', icone: Fuel },
  { id: 'HORAS', rotulo: 'Horas de Máquina', curto: 'Horas', icone: Timer },
  { id: 'DESPESAS', rotulo: 'Despesas', curto: 'Despesas', icone: Receipt },
  { id: 'MAQUINAS', rotulo: 'Máquinas', curto: 'Máquinas', icone: Tractor }
];

function deslocarMes(chave: string, delta: number): string {
  const [a, m] = chave.split('-').map(Number);
  return mesAtualKey(new Date(a, m - 1 + delta, 1));
}

export function PortalControleSitio({ onVoltar }: PortalControleSitioProps) {
  const [dados, setDados] = useState<ControleSitioCompleto>(() => carregarControleSitio());
  const [aba, setAba] = useState<AbaSitio>('PAINEL');
  const [mes, setMes] = useState<string>(() => mesAtualKey());

  useEffect(() => {
    const atualizar = () => setDados(carregarControleSitio());
    window.addEventListener(EVENTO_SITIO_ATUALIZADO, atualizar);
    window.addEventListener('sistema_reset_updated', atualizar);
    return () => {
      window.removeEventListener(EVENTO_SITIO_ATUALIZADO, atualizar);
      window.removeEventListener('sistema_reset_updated', atualizar);
    };
  }, []);

  // Grava o estado e, se o lançamento envolve dinheiro, integra ao financeiro (idempotente no pipeline).
  // Abastecimento do tanque é só consumo: o dinheiro já entrou na compra.
  const aplicar = useCallback((novo: ControleSitioCompleto, lancamento?: DespesaSitio): boolean => {
    const comDinheiro = lancamento && movimentoDe(lancamento) !== 'ABASTECIMENTO';
    // Lançamento pago (compra, posto, despesa) só entra se o caixa tiver saldo
    if (comDinheiro && (lancamento!.situacao || 'PAGO') === 'PAGO') {
      const semSaldo = conferirSaldoParaPagar(Number(lancamento!.valorTotal) || 0);
      if (semSaldo) {
        alert(semSaldo);
        return false;
      }
    }
    salvarControleSitio(novo);
    setDados(normalizarEstadoSitio(novo));
    if (comDinheiro) {
      integrarDespesaSitioAoFinanceiro(lancamento!, {
        situacao: lancamento!.situacao || 'PAGO',
        dataVencimento: lancamento!.vencimento
      });
    }
    return true;
  }, []);

  const irPara = useCallback((a: AbaSitio) => {
    setAba(a);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const props = { estado: dados, mes, aplicar, irPara };
  const ehMesAtual = mes === mesAtualKey();

  return (
    <div className="min-h-screen bg-papel-2 text-tinta flex flex-col font-sans">
      <header className="bg-eno-900 text-white sticky top-0 z-30 shadow-md shadow-emerald-950/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onVoltar}
              className="inline-flex items-center gap-2 h-10 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-emerald-200 hover:text-white border border-white/10 transition-colors cursor-pointer"
              title="Sair do portal"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
            <div className="min-w-0">
              <div className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-emerald-400 truncate">Grupo ENO · Campo</div>
              <h1 className="text-lg sm:text-2xl font-black tracking-tight leading-tight">Controle do Sítio</h1>
            </div>
          </div>

          {/* Filtro por mês */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setMes(deslocarMes(mes, -1))}
              aria-label="Mês anterior"
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <label className="relative">
              <span className="sr-only">Mês</span>
              <input
                type="month"
                value={mes}
                onChange={e => e.target.value && setMes(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <span className="block h-10 min-w-[7.5rem] px-3 rounded-xl bg-white/10 text-center text-sm font-black leading-10 tabular-nums pointer-events-none">
                {rotuloMes(mes)}
              </span>
            </label>
            <button
              type="button"
              onClick={() => setMes(deslocarMes(mes, 1))}
              aria-label="Próximo mês"
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            {!ehMesAtual && (
              <button type="button" onClick={() => setMes(mesAtualKey())} className="hidden sm:block h-10 px-3 rounded-xl text-xs font-bold text-emerald-300 hover:text-white cursor-pointer">
                Hoje
              </button>
            )}
          </div>
        </div>

        {/* Abas (desktop/tablet) */}
        <nav className="hidden md:block border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-1">
            {ABAS.map(a => {
              const Icone = a.icone;
              const ativa = aba === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAba(a.id)}
                  aria-current={ativa ? 'page' : undefined}
                  className={`relative flex items-center gap-2 px-4 h-12 text-sm font-bold transition-colors cursor-pointer ${
                    ativa ? 'text-white' : 'text-emerald-200/70 hover:text-white'
                  }`}
                >
                  <Icone className="w-4 h-4" />
                  {a.rotulo}
                  {ativa && <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-t-full bg-gradient-to-r from-emerald-400 to-lime-300" />}
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-5 pb-28 md:pb-10">
        {aba === 'PAINEL' && <AbaPainel {...props} />}
        {aba === 'COMBUSTIVEL' && <AbaCombustivel {...props} />}
        {aba === 'HORAS' && <AbaHoras {...props} />}
        {aba === 'DESPESAS' && <AbaDespesas {...props} />}
        {aba === 'MAQUINAS' && <AbaMaquinas {...props} />}
      </main>

      {/* Navegação inferior (celular) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-eno-900 border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5">
          {ABAS.map(a => {
            const Icone = a.icone;
            const ativa = aba === a.id;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => irPara(a.id)}
                aria-current={ativa ? 'page' : undefined}
                className={`relative h-16 flex flex-col items-center justify-center gap-1 text-[11px] font-bold cursor-pointer ${
                  ativa ? 'text-white' : 'text-emerald-200/60'
                }`}
              >
                {ativa && <span className="absolute top-0 inset-x-4 h-[3px] rounded-b-full bg-gradient-to-r from-emerald-400 to-lime-300" />}
                <Icone className="w-5 h-5" />
                {a.curto}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
