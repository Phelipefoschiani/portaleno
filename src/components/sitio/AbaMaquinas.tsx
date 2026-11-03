import React, { useMemo, useState } from 'react';
import { Tractor, Truck, Scissors, Cog, Wrench, Plus, Pencil } from 'lucide-react';
import {
  ControleSitioCompleto,
  DespesaSitio,
  MaquinaSitio,
  TipoMaquina,
  TipoCombustivel,
  MedidorMaquina,
  COMBUSTIVEIS,
  ROTULO_COMBUSTIVEL,
  ROTULO_TIPO_MAQUINA,
  salvarMaquina,
  metricasMaquinas,
  numSitio
} from '../../data/sitioControleData';
import { PropsAba, Folha, Campo, Segmentado, ErroBox, BotaoAcao, inputCls, fmtNum } from './ui';

type Aplicar = (novo: ControleSitioCompleto, lancamento?: DespesaSitio) => boolean;

const TIPOS: TipoMaquina[] = ['TRATOR', 'CAMINHONETE', 'ROCADEIRA', 'IMPLEMENTO', 'OUTRO'];

export function IconeMaquina({ tipo, className = 'w-5 h-5' }: { tipo: TipoMaquina; className?: string }) {
  if (tipo === 'TRATOR') return <Tractor className={className} />;
  if (tipo === 'CAMINHONETE') return <Truck className={className} />;
  if (tipo === 'ROCADEIRA') return <Scissors className={className} />;
  if (tipo === 'IMPLEMENTO') return <Cog className={className} />;
  return <Wrench className={className} />;
}

function FormMaquina({
  estado,
  aplicar,
  onFechar,
  maquina
}: {
  estado: ControleSitioCompleto;
  aplicar: Aplicar;
  onFechar: () => void;
  maquina?: MaquinaSitio;
}) {
  const [f, setF] = useState({
    nome: maquina?.nome || '',
    tipo: (maquina?.tipo || 'TRATOR') as TipoMaquina,
    combustivel: (maquina?.combustivel || 'DIESEL') as TipoCombustivel,
    medidor: (maquina?.medidor || 'HORIMETRO') as MedidorMaquina,
    leituraInicial: maquina ? String(maquina.leituraInicial || '') : '',
    ativo: maquina ? maquina.ativo : true
  });
  const [erro, setErro] = useState<string | null>(null);

  const escolherTipo = (t: TipoMaquina) =>
    setF({
      ...f,
      tipo: t,
      medidor: t === 'CAMINHONETE' ? 'HODOMETRO' : f.medidor === 'HODOMETRO' && !maquina ? 'HORIMETRO' : f.medidor,
      combustivel: !maquina && (t === 'CAMINHONETE' || t === 'ROCADEIRA') ? 'GASOLINA' : !maquina ? 'DIESEL' : f.combustivel
    });

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    const r = salvarMaquina(estado, { ...f, id: maquina?.id, leituraInicial: numSitio(f.leituraInicial) });
    if (!r.ok) return setErro(r.erro);
    aplicar(r.estado);
    onFechar();
  };

  return (
    <Folha
      titulo={maquina ? 'Editar máquina' : 'Nova máquina'}
      subtitulo="Trator, caminhonete, roçadeira ou implemento do sítio"
      icone={<IconeMaquina tipo={f.tipo} className="w-6 h-6" />}
      onFechar={onFechar}
      onSubmit={enviar}
      rotuloConfirmar={maquina ? 'Salvar' : 'Cadastrar máquina'}
    >
      <Campo rotulo="Nome">
        <input className={inputCls} required value={f.nome} onChange={e => setF({ ...f, nome: e.target.value })} placeholder="Ex.: Trator Valtra A950" />
      </Campo>
      <Campo rotulo="Tipo">
        <Segmentado<TipoMaquina> valor={f.tipo} onChange={escolherTipo} opcoes={TIPOS.map(t => ({ valor: t, rotulo: ROTULO_TIPO_MAQUINA[t] }))} />
      </Campo>
      <Campo rotulo="Combustível">
        <Segmentado<TipoCombustivel> valor={f.combustivel} onChange={v => setF({ ...f, combustivel: v })} opcoes={COMBUSTIVEIS.map(c => ({ valor: c, rotulo: ROTULO_COMBUSTIVEL[c] }))} />
      </Campo>
      <Campo rotulo="Controle por">
        <Segmentado<MedidorMaquina>
          valor={f.medidor}
          onChange={v => setF({ ...f, medidor: v })}
          opcoes={[
            { valor: 'HORIMETRO', rotulo: 'Horímetro (h)' },
            { valor: 'HODOMETRO', rotulo: 'Hodômetro (km)' }
          ]}
        />
      </Campo>
      <Campo rotulo={f.medidor === 'HODOMETRO' ? 'Hodômetro inicial (km)' : 'Horímetro inicial (h)'} dica="Leitura do painel no dia do cadastro">
        <input inputMode="decimal" type="number" step="any" min="0" className={inputCls} value={f.leituraInicial} onChange={e => setF({ ...f, leituraInicial: e.target.value })} />
      </Campo>
      <label className="flex items-center gap-3 min-h-12 px-4 rounded-xl bg-white border border-slate-200 cursor-pointer">
        <input type="checkbox" className="w-5 h-5 accent-emerald-700" checked={f.ativo} onChange={e => setF({ ...f, ativo: e.target.checked })} />
        <span className="text-sm font-bold text-slate-800">Máquina ativa</span>
        <span className="text-xs text-slate-500 ml-auto">inativa some dos formulários</span>
      </label>
      <ErroBox erro={erro} />
    </Folha>
  );
}

export function AbaMaquinas({ estado, mes, aplicar }: PropsAba) {
  const [editando, setEditando] = useState<MaquinaSitio | 'NOVA' | null>(null);
  const metricas = useMemo(() => metricasMaquinas(estado, mes), [estado, mes]);
  const ordenadas = [...metricas].sort((a, b) => Number(b.maquina.ativo) - Number(a.maquina.ativo) || a.maquina.nome.localeCompare(b.maquina.nome));

  return (
    <div className="space-y-5">
      <BotaoAcao onClick={() => setEditando('NOVA')} icone={<Plus className="w-5 h-5" />} titulo="Cadastrar máquina" sub="Trator, caminhonete, roçadeira, implemento" />

      {ordenadas.length === 0 ? (
        <div className="rounded-3xl bg-white border border-slate-200 p-8 text-center text-sm text-slate-500">
          Nenhuma máquina ainda. Cadastre o trator e os outros veículos para controlar combustível e horas por máquina.
        </div>
      ) : (
        <ul className="rounded-3xl bg-white border border-slate-200 divide-y divide-slate-100 overflow-hidden">
          {ordenadas.map(({ maquina: m, leituraAtual, horasTotal }) => (
            <li key={m.id} className={`px-4 sm:px-5 py-4 flex items-center gap-3 ${m.ativo ? '' : 'opacity-60'}`}>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${m.ativo ? 'bg-emerald-900 text-emerald-200' : 'bg-slate-200 text-slate-500'}`}>
                <IconeMaquina tipo={m.tipo} className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-black text-slate-900 truncate">{m.nome}</div>
                <div className="text-xs text-slate-500">
                  {ROTULO_TIPO_MAQUINA[m.tipo]} · {ROTULO_COMBUSTIVEL[m.combustivel]}
                  {m.ativo ? '' : ' · inativa'}
                </div>
              </div>
              <div className="text-right shrink-0 hidden sm:block">
                <div className="font-black tabular-nums text-slate-900">
                  {fmtNum(leituraAtual, 1)} {m.medidor === 'HODOMETRO' ? 'km' : 'h'}
                </div>
                <div className="text-[11px] text-slate-400 tabular-nums">{fmtNum(horasTotal, 1)} h apontadas</div>
              </div>
              <button
                type="button"
                onClick={() => setEditando(m)}
                aria-label={`Editar ${m.nome}`}
                className="w-11 h-11 shrink-0 rounded-xl border border-slate-200 text-slate-600 hover:bg-emerald-50 hover:text-emerald-800 flex items-center justify-center cursor-pointer"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {editando && (
        <FormMaquina estado={estado} aplicar={aplicar} maquina={editando === 'NOVA' ? undefined : editando} onFechar={() => setEditando(null)} />
      )}
    </div>
  );
}
