import React, { useEffect, useState } from 'react';
import { Plus, Tag, AlertCircle, X, Check, Wand2 } from 'lucide-react';
import { carregarTabelasPreco, TabelaPreco } from '../../data/produtosData';
import {
  MODOS_TABELA_PRECO,
  ModoTabelaPreco,
  criarTabelaRapida,
  descreverRegraTabela,
  nomeModoTabela,
  precoPelaRegra,
  tabelaPrecoAtiva
} from '../../data/precosData';
import { formatarMoeda } from '../../data/financeiroData';

interface Props {
  produtoId?: string;
  custoUnitario: number;
  precoBase: number;
  valor: Record<string, number>;
  onChange: (mapa: Record<string, number>) => void;
}

/**
 * Preço do produto em cada tabela de preço ativa (usado no cadastro de produtos).
 * Não grava sozinho: só chama onChange. O salvar do produto chama salvarPrecosDoProduto.
 * Tabela com campo em branco não recebe o produto.
 */
export function PrecosProdutoTabelas({ produtoId, custoUnitario, precoBase, valor, onChange }: Props) {
  const [tabelas, setTabelas] = useState<TabelaPreco[]>(() => carregarTabelasPreco().filter(tabelaPrecoAtiva));
  const [criando, setCriando] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoModo, setNovoModo] = useState<ModoTabelaPreco>('MARGEM_CUSTO');
  const [novoPercentual, setNovoPercentual] = useState<number>(30);

  useEffect(() => {
    const h = () => setTabelas(carregarTabelasPreco().filter(tabelaPrecoAtiva));
    window.addEventListener('tabelas_preco_updated', h);
    return () => window.removeEventListener('tabelas_preco_updated', h);
  }, []);

  const custo = Number(custoUnitario) || 0;
  const base = Number(precoBase) || 0;

  const sugerido = (t: TabelaPreco) => precoPelaRegra(t, custo, base, produtoId);

  const alterarPreco = (tabelaId: string, texto: string) => {
    const mapa = { ...valor };
    const n = parseFloat(String(texto).replace(',', '.'));
    if (texto === '' || !Number.isFinite(n)) delete mapa[tabelaId];
    else mapa[tabelaId] = n;
    onChange(mapa);
  };

  const handleCriar = () => {
    if (!novoNome.trim()) {
      alert('Informe o nome da nova tabela de preço.');
      return;
    }
    const nova = criarTabelaRapida(novoNome, novoModo, novoPercentual);
    setTabelas(carregarTabelasPreco().filter(tabelaPrecoAtiva));
    const preco = precoPelaRegra(nova, custo, base, produtoId).preco;
    if (preco > 0) onChange({ ...valor, [nova.id]: preco });
    setCriando(false);
    setNovoNome('');
  };

  const formNovaTabela = (
    <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg grid grid-cols-1 sm:grid-cols-12 gap-2 items-end text-xs">
      <div className="sm:col-span-5">
        <label className="block font-bold text-slate-700 mb-1">Nome da tabela</label>
        <input
          type="text"
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          placeholder="Ex: Atacado Região Sul"
          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 focus:outline-none focus:border-emerald-700"
        />
      </div>
      <div className="sm:col-span-4">
        <label className="block font-bold text-slate-700 mb-1">Como forma o preço</label>
        <select
          value={novoModo}
          onChange={(e) => setNovoModo(e.target.value as ModoTabelaPreco)}
          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:outline-none focus:border-emerald-700 cursor-pointer"
        >
          {MODOS_TABELA_PRECO.map(m => (
            <option key={m.id} value={m.id}>{m.nome}</option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="block font-bold text-slate-700 mb-1">
          {novoModo === 'MARGEM_CUSTO' ? 'Margem %' : novoModo === 'ACRESCIMO_DESCONTO' ? '± %' : '—'}
        </label>
        <input
          type="number"
          step="0.5"
          disabled={novoModo === 'PRECO_FIXO'}
          value={novoModo === 'PRECO_FIXO' ? '' : novoPercentual}
          onChange={(e) => setNovoPercentual(parseFloat(e.target.value) || 0)}
          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono font-bold text-center text-slate-800 focus:outline-none focus:border-emerald-700 disabled:bg-slate-100"
        />
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
      {novoModo === 'ACRESCIMO_DESCONTO' && (
        <p className="sm:col-span-12 text-[10px] text-slate-500">Positivo = acréscimo sobre o preço base; negativo = desconto.</p>
      )}
    </div>
  );

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
          <span className="text-slate-500 font-medium">Nenhuma tabela de preço — crie a primeira.</span>
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
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">Tabela / Regra</th>
                  <th className="py-2 px-3 text-right">Sugerido</th>
                  <th className="py-2 px-3 text-right">Preço na tabela</th>
                  <th className="py-2 px-3 text-right">Margem s/ custo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tabelas.map(t => {
                  const sug = sugerido(t);
                  const atual = valor[t.id];
                  const temValor = atual !== undefined && Number.isFinite(atual);
                  const precoEfetivo = temValor ? Number(atual) : 0;
                  const margem = custo > 0 && precoEfetivo > 0 ? ((precoEfetivo - custo) / custo) * 100 : null;
                  const abaixo = custo > 0 && temValor && precoEfetivo < custo;
                  return (
                    <tr key={t.id} className={abaixo ? 'bg-red-50/60' : ''}>
                      <td className="py-2 px-3">
                        <div className="font-bold text-slate-900">{t.nome}</div>
                        <div className="text-[10px] text-slate-400">{nomeModoTabela(t.modo_preco)} • {descreverRegraTabela(t)}</div>
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-600">
                        {sug.sem_preco && t.modo_preco !== 'ACRESCIMO_DESCONTO' ? (
                          <span className="text-[10px] text-amber-700 font-sans">
                            {t.modo_preco === 'MARGEM_CUSTO' ? 'sem custo apurado' : 'digite o preço'}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onChange({ ...valor, [t.id]: sug.preco })}
                            className="inline-flex items-center gap-1 hover:text-emerald-800 cursor-pointer"
                            title="Usar o preço sugerido pela regra da tabela"
                          >
                            <Wand2 className="w-3 h-3" />
                            {formatarMoeda(sug.preco)}
                          </button>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={temValor ? atual : ''}
                          placeholder="não vende"
                          onChange={(e) => alterarPreco(t.id, e.target.value)}
                          className={`w-28 bg-white border rounded px-2 py-1 text-right font-mono font-bold focus:outline-none focus:border-emerald-700 ${abaixo ? 'border-red-400 text-red-700' : 'border-slate-200 text-slate-900'}`}
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold">
                        {margem === null ? (
                          <span className="text-slate-300 font-normal">—</span>
                        ) : (
                          <span className={abaixo ? 'text-red-700 inline-flex items-center gap-1' : margem < 10 ? 'text-amber-700' : 'text-emerald-800'}>
                            {abaixo && <AlertCircle className="w-3 h-3" />}
                            {margem.toFixed(1)}%
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
        <p className="text-[10px] text-amber-700">Produto sem custo apurado: a margem não pode ser calculada.</p>
      )}
      {Object.keys(valor).some(id => custo > 0 && Number(valor[id]) < custo) && (
        <p className="text-[10px] text-red-700 font-bold flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> Há tabela com preço abaixo do custo do produto.
        </p>
      )}
      <p className="text-[10px] text-slate-400">Deixe o preço em branco nas tabelas em que o produto não é vendido.</p>
    </div>
  );
}
