// Apontamentos feitos no app da produção (celular) que ainda não foram lançados na OP.
// "Lançar na OP" usa a mesma regra do apontamento da tela (apontarProducaoOP) e marca o registro no banco.
import React, { useEffect, useState } from 'react';
import { Check, RefreshCw, Smartphone } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { apontarProducaoOP, EVENTO_OPS } from '../../data/ordensProducaoData';
import { formatarDataBR } from '../../lib/datas';

const TABELA = 'apontamentos_producao_app';

interface ApontamentoRecebido {
  id: string;
  op_id: string;
  op_numero: string;
  produto_nome: string;
  tipo_embalagem?: string;
  pacotes: number;
  operador?: string;
  observacao?: string;
  criado_em: string;
  editado_em?: string;
  lancado_em?: string;
}

export function ApontamentosAppProducao() {
  const [lista, setLista] = useState<ApontamentoRecebido[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [lancandoId, setLancandoId] = useState<string | null>(null);

  const carregar = async () => {
    if (!supabase) {
      setErro('Banco não configurado.');
      return;
    }
    setCarregando(true);
    const { data, error } = await supabase
      .from(TABELA)
      .select('id, dados')
      .filter('dados->>lancado_em', 'is', null);
    setCarregando(false);
    if (error) {
      setErro(error.message);
      return;
    }
    setErro(null);
    const itens = (data || []).map(l => l.dados as ApontamentoRecebido).filter(a => !!a && !!a.id);
    setLista(itens.sort((a, b) => a.criado_em.localeCompare(b.criado_em)));
  };

  useEffect(() => {
    carregar();
    const aoMudar = () => carregar();
    window.addEventListener(EVENTO_OPS, aoMudar);
    return () => window.removeEventListener(EVENTO_OPS, aoMudar);
  }, []);

  const lancar = async (apt: ApontamentoRecebido) => {
    setLancandoId(apt.id);
    setErro(null);
    // Mesma regra do apontamento da tela: soma os pacotes na OP (e no pedido, se vier de pedido)
    const op = apontarProducaoOP(apt.op_id, apt.pacotes, {
      operador: apt.operador,
      observacao: apt.observacao,
    });
    if (!op) {
      setLancandoId(null);
      setErro(`Não consegui lançar na ${apt.op_numero}: a OP não existe mais aqui ou já está concluída/cancelada.`);
      return;
    }
    const { error } = await supabase!
      .from(TABELA)
      .upsert({ id: apt.id, dados: { ...apt, lancado_em: new Date().toISOString() } }, { onConflict: 'id' });
    setLancandoId(null);
    if (error) {
      setErro(`A OP foi atualizada, mas não consegui marcar o apontamento como lançado: ${error.message}. Não lance de novo.`);
      return;
    }
    setLista(atual => atual.filter(a => a.id !== apt.id));
  };

  return (
    <section className="mx-auto w-full max-w-[1700px] px-4 sm:px-6 pt-4">
      <div className="rounded-2xl border border-linha bg-papel p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-eno-900 text-ouro">
              <Smartphone className="h-4.5 w-4.5" />
            </span>
            <div>
              <h3 className="text-[15px] font-black text-tinta">Apontamentos do app da produção</h3>
              <p className="text-[12.5px] text-cinza">
                {lista.length === 0 ? 'Nada novo para lançar.' : `${lista.length} para lançar na ordem de produção`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={carregar}
            disabled={carregando}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-linha-forte px-3 text-[13px] font-semibold text-tinta-2 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${carregando ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>

        {erro && <p className="mt-3 rounded-lg bg-st-vencido-bg px-3 py-2 text-[13px] font-semibold text-st-vencido">{erro}</p>}

        {lista.length > 0 && (
          <ul className="mt-4 divide-y divide-linha">
            {lista.map(apt => (
              <li key={apt.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="text-[13px] text-cinza tabular-nums">
                    <span className="font-mono font-semibold text-tinta">{apt.op_numero}</span> · {formatarDataBR(apt.criado_em.slice(0, 10))}
                    {apt.operador ? ` · ${apt.operador}` : ''}
                  </div>
                  <div className="text-[14.5px] font-bold text-tinta">{apt.produto_nome}</div>
                  {apt.observacao && <div className="text-[13px] text-tinta-2">{apt.observacao}</div>}
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-[20px] font-black tabular-nums text-tinta leading-none">
                      {apt.pacotes.toLocaleString('pt-BR')}
                    </div>
                    <div className="text-[12px] text-cinza">{apt.tipo_embalagem || 'pacotes'}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => lancar(apt)}
                    disabled={lancandoId === apt.id}
                    className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-eno-900 px-4 text-[13.5px] font-bold text-white hover:bg-eno-950 disabled:opacity-50 cursor-pointer"
                  >
                    <Check className="h-4 w-4" />
                    {lancandoId === apt.id ? 'Lançando…' : 'Lançar na OP'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
