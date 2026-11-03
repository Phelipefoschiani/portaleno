import React, { useEffect, useState } from 'react';
import { Plus, Tag, AlertCircle, X, Check } from 'lucide-react';
import { carregarTabelasPreco, ImpostoProduto, TabelaPreco } from '../../data/produtosData';
import {
  OPCOES_MOSTRAR_PRECO,
  MostrarPrecoTabela,
  analisarPreco,
  criarTabelaRapida,
  mostraAcondicionamento,
  mostraUnitario,
  nomeMostrarPreco,
  tabelaPrecoAtiva
} from '../../data/precosData';
import { formatarMoeda } from '../../data/financeiroData';
import { CampoPrecoTabela } from './CampoPrecoTabela';

interface Props {
  custoUnitario: number;
  impostos: ImpostoProduto[];
  unidades: number;
  tipoAcondicionamento: string;
  valor: Record<string, number>;
  onChange: (mapa: Record<string, number>) => void;
}

/** Tabelas que aparecem no cadastro do produto (as ativas). O salvar do produto usa a mesma lista. */
export const tabelasDoCadastroDeProduto = () => carregarTabelasPreco().filter(tabelaPrecoAtiva);

/**
 * Preço do produto em cada tabela de preço ativa (usado no cadastro de produtos).
 * Não grava sozinho: só chama onChange. O salvar do produto chama salvarPrecosDoProduto.
 * Tabela com campo em branco não vende o produto.
 */
export function PrecosProdutoTabelas({ custoUnitario, impostos, unidades, tipoAcondicionamento, valor, onChange }: Props) {
  const [tabelas, setTabelas] = useState<TabelaPreco[]>(() => tabelasDoCadastroDeProduto());
  const [criando, setCriando] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoMostrar, setNovoMostrar] = useState<MostrarPrecoTabela>('AMBOS');

  useEffect(() => {
    const h = () => setTabelas(tabelasDoCadastroDeProduto());
    window.addEventListener('tabelas_preco_updated', h);
    return () => window.removeEventListener('tabelas_preco_updated', h);
  }, []);

  const custo = Number(custoUnitario) || 0;
  const un = unidades > 0 ? unidades : 1;

  const alterarPreco = (tabelaId: string, unitario: number | undefined) => {
    const mapa = { ...valor };
    if (unitario === undefined) delete mapa[tabelaId];
    else mapa[tabelaId] = unitario;
    onChange(mapa);
  };

  const handleCriar = () => {
    if (!novoNome.trim()) {
      alert('Informe o nome da nova tabela de preço.');
      return;
    }
    criarTabelaRapida(novoNome, novoMostrar);
    setTabelas(tabelasDoCadastroDeProduto());
    setCriando(false);
    setNovoNome('');
    setNovoMostrar('AMBOS');
  };

  const formNovaTabela = (
    <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg grid grid-cols-1 sm:grid-cols-12 gap-2 items-end text-xs">
      <div className="sm:col-span-6">
        <label className="block font-bold text-slate-700 mb-1">Nome da tabela</label>
        <input
          type="text"
          autoFocus
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCriar(); } }}
          placeholder="Ex: Atacado Região Sul"
          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 focus:outline-none focus:border-emerald-700"
        />
      </div>
      <div className="sm:col-span-5">
        <label className="block font-bold text-slate-700 mb-1">Mostrar preço</label>
        <select
          value={novoMostrar}
          onChange={(e) => setNovoMostrar(e.target.value as MostrarPrecoTabela)}
          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:outline-none focus:border-emerald-700 cursor-pointer"
        >
          {OPCOES_MOSTRAR_PRECO.map(o => (
            <option key={o.id} value={o.id}>{o.nome}</option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-1 flex gap-1">
        <button
          type="button"
          onClick={handleCriar}
          className="p-2 rounded-lg bg-emerald-900 hover:bg-emerald-950 text-white cursor-pointer"
          title="Criar tabela"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setCriando(false)}
          className="p-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 cursor-pointer"
          title="Cancelar"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <p className="sm:col-span-12 text-[10px] text-slate-500">A tabela é criada vigente a partir de hoje; digite o preço deste produto nela logo abaixo.</p>
    </div>
  );

  const algumaNegativa = tabelas.some(t => {
    const v = Number(valor[t.id]) || 0;
    return v > 0 && analisarPreco(v, custo, impostos).margem_negativa;
  });

  return (
    <div className="space-y-2 text-xs">
      <div className="flex items-center justify-between">
        <span className="font-bold text-slate-700 flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-emerald-700" />
          Preço do produto em cada tabela
        </span>
        {!criando && tabelas.length > 0 && (
          <button
            type="button"
            onClick={() => setCriando(true)}
            className="text-emerald-800 hover:text-emerald-950 font-bold flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova tabela</span>
          </button>
        )}
      </div>

      {criando && formNovaTabela}

      {tabelas.length === 0 && !criando ? (
        <div className="p-3 bg-slate-50 border border-dashed border-slate-300 rounded-lg flex flex-wrap items-center justify-between gap-2">
          <span className="text-slate-500 font-medium">Nenhuma tabela de preço ativa. O produto só é vendido com preço em uma tabela.</span>
          <button
            type="button"
            onClick={() => setCriando(true)}
            className="px-3 py-1.5 rounded-lg bg-emerald-900 hover:bg-emerald-950 text-white font-bold flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova tabela</span>
          </button>
        </div>
      ) : (
        tabelas.length > 0 && (
          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full min-w-[640px] text-left border-collapse">
              <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">Tabela</th>
                  <th className="py-2 px-3 w-[220px]">Preço na tabela</th>
                  <th className="py-2 px-3 text-right">Custo</th>
                  <th className="py-2 px-3 text-right">Imp. venda</th>
                  <th className="py-2 px-3 text-right">Margem líquida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tabelas.map(t => {
                  const atual = Number(valor[t.id]) || 0;
                  const tem = atual > 0;
                  const a = analisarPreco(atual, custo, impostos);
                  return (
                    <tr key={t.id} className={tem && a.margem_negativa ? 'bg-red-50/60' : ''}>
                      <td className="py-2 px-3">
                        <div className="font-bold text-slate-900">{t.nome}</div>
                        <div className="text-[10px] text-slate-400">Mostra: {nomeMostrarPreco(t)}</div>
                      </td>
                      <td className="py-2 px-3">
                        <CampoPrecoTabela
                          unitario={tem ? atual : undefined}
                          unidades={un}
                          tipoAcondicionamento={tipoAcondicionamento}
                          mostrarUnitario={mostraUnitario(t)}
                          mostrarCaixa={mostraAcondicionamento(t)}
                          alerta={tem && a.margem_negativa}
                          onChange={(v) => alterarPreco(t.id, v)}
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-600">
                        {custo > 0 ? formatarMoeda(custo) : '—'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-600">
                        {tem ? formatarMoeda(a.impostos_venda) : '—'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums font-bold">
                        {!tem ? (
                          <span className="text-slate-300 font-normal font-sans text-[10px]">não vendido</span>
                        ) : (
                          <span className={a.margem_negativa ? 'text-red-700 inline-flex items-center gap-1' : (a.margem_liquida_percentual ?? 0) < 10 ? 'text-amber-700' : 'text-emerald-800'}>
                            {a.margem_negativa && <AlertCircle className="w-3 h-3" />}
                            {formatarMoeda(a.margem_liquida)}
                            <span className="text-[10px] font-semibold ml-1">({(a.margem_liquida_percentual ?? 0).toFixed(1)}%)</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {custo <= 0 && tabelas.length > 0 && (
        <p className="text-[10px] text-amber-700">Produto sem custo apurado: a margem considera custo zero.</p>
      )}
      {algumaNegativa && (
        <p className="text-[10px] text-red-700 font-bold flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> Há tabela com margem líquida negativa (preço não cobre custo + impostos de venda).
        </p>
      )}
      <p className="text-[10px] text-slate-400">
        Margem líquida = preço − custo − impostos de venda (por unidade). Deixe em branco nas tabelas em que o produto não é vendido.
      </p>
    </div>
  );
}
