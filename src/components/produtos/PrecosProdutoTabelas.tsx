import React, { useEffect, useState } from 'react';
import { Plus, AlertCircle, X, Check } from 'lucide-react';
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
import { Campo, form, BotaoIcone } from './kitProdutos';
import { tabela } from '../ui/TabelaDados';

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
    <div className="rounded-md border border-eno-100 bg-eno-50 p-3 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
      <Campo rotulo="Nome da tabela" className="sm:col-span-6">
        <input
          type="text"
          autoFocus
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCriar(); } }}
          placeholder="Ex: Atacado Região Sul"
          className={form.campo}
        />
      </Campo>
      <Campo rotulo="Mostrar preço" className="sm:col-span-4">
        <select value={novoMostrar} onChange={(e) => setNovoMostrar(e.target.value as MostrarPrecoTabela)} className={form.select}>
          {OPCOES_MOSTRAR_PRECO.map(o => (
            <option key={o.id} value={o.id}>{o.nome}</option>
          ))}
        </select>
      </Campo>
      <div className="sm:col-span-2 flex gap-2">
        <button
          type="button"
          onClick={handleCriar}
          className="flex-1 inline-flex h-11 sm:h-9 items-center justify-center gap-1 rounded-md bg-eno-800 px-3 text-[13px] font-semibold text-white hover:bg-eno-900 cursor-pointer"
          title="Criar tabela"
        >
          <Check className="w-4 h-4" /> Criar
        </button>
        <BotaoIcone rotulo="Cancelar" onClick={() => setCriando(false)} className="h-11 w-11 sm:h-9 sm:w-9 border border-linha-forte">
          <X className="w-4 h-4" />
        </BotaoIcone>
      </div>
      <p className="sm:col-span-12 text-[11.5px] text-cinza">A tabela é criada vigente a partir de hoje; digite o preço deste produto nela logo abaixo.</p>
    </div>
  );

  const algumaNegativa = tabelas.some(t => {
    const v = Number(valor[t.id]) || 0;
    return v > 0 && analisarPreco(v, custo, impostos).margem_negativa;
  });

  const margem = (tem: boolean, a: ReturnType<typeof analisarPreco>) =>
    !tem ? (
      <span className="text-[12px] font-normal text-cinza-claro">não vendido</span>
    ) : (
      <span
        className={`inline-flex items-center gap-1 font-bold ${
          a.margem_negativa ? 'text-st-vencido' : (a.margem_liquida_percentual ?? 0) < 10 ? 'text-st-aguardando' : 'text-st-pago'
        }`}
      >
        {a.margem_negativa && <AlertCircle className="w-3.5 h-3.5" />}
        {formatarMoeda(a.margem_liquida)}
        <span className="text-[11px] font-semibold">({(a.margem_liquida_percentual ?? 0).toFixed(1)}%)</span>
      </span>
    );

  return (
    <div className="space-y-2.5">
      {!criando && tabelas.length > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setCriando(true)}
            className="inline-flex items-center gap-1 h-10 sm:h-8 px-3 rounded-md border border-linha-forte bg-papel text-[12.5px] font-semibold text-eno-700 hover:bg-papel-3 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova tabela
          </button>
        </div>
      )}

      {criando && formNovaTabela}

      {tabelas.length === 0 && !criando ? (
        <div className="rounded-md border border-dashed border-linha-forte bg-papel-2 p-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[12.5px] text-cinza">Nenhuma tabela de preço ativa. O produto só é vendido com preço em uma tabela.</span>
          <button
            type="button"
            onClick={() => setCriando(true)}
            className="inline-flex items-center gap-1 h-10 sm:h-8 px-3 rounded-md bg-eno-800 text-white text-[12.5px] font-semibold hover:bg-eno-900 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova tabela
          </button>
        </div>
      ) : (
        tabelas.length > 0 && (
          <div className="rounded-md border border-linha bg-papel overflow-hidden">
            {/* Celular: um cartão por tabela */}
            <ul className="sm:hidden">
              {tabelas.map(t => {
                const atual = Number(valor[t.id]) || 0;
                const tem = atual > 0;
                const a = analisarPreco(atual, custo, impostos);
                return (
                  <li key={t.id} className={`px-3.5 py-3 border-b border-linha last:border-b-0 ${tem && a.margem_negativa ? 'bg-st-vencido-bg/50' : ''}`}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[14px] font-bold text-tinta">{t.nome}</span>
                      <span className="text-[11px] text-cinza shrink-0">mostra {nomeMostrarPreco(t).toLowerCase()}</span>
                    </div>
                    <div className="mt-2">
                      <CampoPrecoTabela
                        unitario={tem ? atual : undefined}
                        unidades={un}
                        tipoAcondicionamento={tipoAcondicionamento}
                        mostrarUnitario={mostraUnitario(t)}
                        mostrarCaixa={mostraAcondicionamento(t)}
                        alerta={tem && a.margem_negativa}
                        onChange={(v) => alterarPreco(t.id, v)}
                      />
                    </div>
                    <div className="mt-2 flex items-baseline justify-between gap-2 text-[12px] tabular-nums">
                      <span className="text-cinza">
                        custo {custo > 0 ? formatarMoeda(custo) : '—'} · imp. {tem ? formatarMoeda(a.impostos_venda) : '—'}
                      </span>
                      <span className="text-[13px]">{margem(tem, a)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Computador: tabela */}
            <table className={`hidden sm:table ${tabela.table}`}>
              <thead className={tabela.thead}>
                <tr>
                  <th className={tabela.th}>Tabela</th>
                  <th className={`${tabela.th} w-[240px]`}>Preço na tabela</th>
                  <th className={`${tabela.th} text-right`}>Custo</th>
                  <th className={`${tabela.th} text-right`}>Imp. venda</th>
                  <th className={`${tabela.th} text-right`}>Margem líquida</th>
                </tr>
              </thead>
              <tbody>
                {tabelas.map(t => {
                  const atual = Number(valor[t.id]) || 0;
                  const tem = atual > 0;
                  const a = analisarPreco(atual, custo, impostos);
                  return (
                    <tr key={t.id} className={`border-b border-linha last:border-b-0 ${tem && a.margem_negativa ? 'bg-st-vencido-bg/50' : ''}`}>
                      <td className="py-2 px-3 align-middle">
                        <div className="font-semibold text-tinta">{t.nome}</div>
                        <div className="text-[11px] text-cinza">Mostra: {nomeMostrarPreco(t)}</div>
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
                      <td className="py-2 px-3 text-right tabular-nums text-tinta-2">{custo > 0 ? formatarMoeda(custo) : '—'}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-tinta-2">{tem ? formatarMoeda(a.impostos_venda) : '—'}</td>
                      <td className="py-2 px-3 text-right tabular-nums whitespace-nowrap">{margem(tem, a)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {custo <= 0 && tabelas.length > 0 && (
        <p className="text-[11.5px] font-medium text-st-aguardando">Produto sem custo apurado: a margem considera custo zero.</p>
      )}
      {algumaNegativa && (
        <p className="text-[11.5px] font-semibold text-st-vencido flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Há tabela com margem líquida negativa (preço não cobre custo + impostos de venda).
        </p>
      )}
      <p className="text-[11.5px] text-cinza">
        Margem líquida = preço − custo − impostos de venda (por unidade). Deixe em branco nas tabelas em que o produto não é vendido.
      </p>
    </div>
  );
}
