import React, { useEffect, useState } from 'react';
import { Plus, Check, X, Trash2, Pencil, ListTree } from 'lucide-react';
import {
  CATEGORIA_SEM_CATEGORIA,
  EVENTO_CATEGORIAS_PRODUTO,
  carregarCategoriasProduto,
  chaveCategoria,
  contarProdutosDaCategoria,
  criarCategoriaProduto,
  excluirCategoriaProduto,
  renomearCategoriaProduto
} from '../../data/categoriasProdutoData';

/** Lista de categorias sempre atualizada (cadastro, filtros, comissão). */
export function useCategoriasProduto(): string[] {
  const [lista, setLista] = useState<string[]>(() => carregarCategoriasProduto());
  useEffect(() => {
    const h = () => setLista(carregarCategoriasProduto());
    window.addEventListener(EVENTO_CATEGORIAS_PRODUTO, h);
    window.addEventListener('produtos_updated', h);
    return () => {
      window.removeEventListener(EVENTO_CATEGORIAS_PRODUTO, h);
      window.removeEventListener('produtos_updated', h);
    };
  }, []);
  return lista;
}

interface Props {
  value: string;
  onChange: (categoria: string) => void;
}

/** Select de categoria com "+" para criar na hora e um pequeno gerenciador (renomear/excluir). */
export function CategoriaProdutoCampo({ value, onChange }: Props) {
  const categorias = useCategoriasProduto();
  const [criando, setCriando] = useState(false);
  const [gerenciando, setGerenciando] = useState(false);
  const [nome, setNome] = useState('');
  const [renomeando, setRenomeando] = useState<string | null>(null);
  const [nomeRenomear, setNomeRenomear] = useState('');
  const [aviso, setAviso] = useState('');

  const vazio = categorias.length === 0;
  const valorNaLista = categorias.some(c => chaveCategoria(c) === chaveCategoria(value));

  const criar = () => {
    const r = criarCategoriaProduto(nome);
    if (r.erro) {
      setAviso(r.erro);
      return;
    }
    onChange(r.nome!);
    setAviso(r.jaExistia ? `"${r.nome}" já existia e foi selecionada.` : '');
    setNome('');
    setCriando(false);
  };

  const excluir = (cat: string) => {
    const qtd = contarProdutosDaCategoria(cat);
    const ehSem = chaveCategoria(cat) === chaveCategoria(CATEGORIA_SEM_CATEGORIA);
    if (ehSem && qtd > 0) {
      alert(`"${CATEGORIA_SEM_CATEGORIA}" tem ${qtd} produto(s). Mova-os para outra categoria antes de excluir.`);
      return;
    }
    const msg = qtd > 0
      ? `Excluir a categoria "${cat}"?\n\n${qtd} produto(s) serão movidos para "${CATEGORIA_SEM_CATEGORIA}".`
      : `Excluir a categoria "${cat}"? Nenhum produto usa esta categoria.`;
    if (!window.confirm(msg)) return;
    const r = excluirCategoriaProduto(cat);
    if (r.erro) {
      alert(r.erro);
      return;
    }
    if (chaveCategoria(value) === chaveCategoria(cat)) onChange(r.movidos > 0 ? CATEGORIA_SEM_CATEGORIA : '');
    setAviso(r.movidos > 0 ? `${r.movidos} produto(s) movidos para "${CATEGORIA_SEM_CATEGORIA}".` : `Categoria "${cat}" excluída.`);
  };

  const salvarRenomear = () => {
    if (!renomeando) return;
    const r = renomearCategoriaProduto(renomeando, nomeRenomear);
    if (r.erro) {
      alert(r.erro);
      return;
    }
    if (chaveCategoria(value) === chaveCategoria(renomeando)) onChange(r.nome!);
    setRenomeando(null);
  };

  const btn = 'p-2 rounded-xl border transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30';

  return (
    <div className="space-y-1.5">
      <div className="flex items-stretch gap-1.5">
        <select
          value={valorNaLista ? categorias.find(c => chaveCategoria(c) === chaveCategoria(value)) : ''}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-emerald-700 cursor-pointer shadow-2xs"
        >
          <option value="" disabled>{vazio ? 'Crie uma categoria →' : '-- Selecione --'}</option>
          {categorias.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => { setCriando(v => !v); setGerenciando(false); setAviso(''); }}
          className={`${btn} ${vazio ? 'bg-emerald-900 border-emerald-900 text-white hover:bg-emerald-950 ring-2 ring-emerald-500/40' : 'bg-white border-slate-300 text-emerald-800 hover:bg-emerald-50'}`}
          title="Nova categoria"
        >
          <Plus className="w-4 h-4" />
        </button>
        {!vazio && (
          <button
            type="button"
            onClick={() => { setGerenciando(v => !v); setCriando(false); setAviso(''); }}
            className={`${btn} ${gerenciando ? 'bg-slate-800 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
            title="Gerenciar categorias"
          >
            <ListTree className="w-4 h-4" />
          </button>
        )}
      </div>

      {criando && (
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            autoFocus
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); criar(); }
              if (e.key === 'Escape') setCriando(false);
            }}
            placeholder="Nome da nova categoria"
            className="min-w-0 flex-1 bg-white border border-emerald-400 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 focus:outline-none focus:border-emerald-700"
          />
          <button type="button" onClick={criar} className="p-1.5 rounded-lg bg-emerald-900 hover:bg-emerald-950 text-white cursor-pointer" title="Criar">
            <Check className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={() => setCriando(false)} className="p-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 cursor-pointer" title="Cancelar">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {gerenciando && (
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-56 overflow-y-auto">
          {categorias.map(c => {
            const qtd = contarProdutosDaCategoria(c);
            return (
              <div key={c} className="flex items-center gap-2 px-2.5 py-1.5">
                {renomeando === c ? (
                  <>
                    <input
                      type="text"
                      autoFocus
                      value={nomeRenomear}
                      onChange={(e) => setNomeRenomear(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); salvarRenomear(); }
                        if (e.key === 'Escape') setRenomeando(null);
                      }}
                      className="min-w-0 flex-1 bg-white border border-emerald-400 rounded-md px-2 py-1 font-bold text-slate-800 focus:outline-none"
                    />
                    <button type="button" onClick={salvarRenomear} className="p-1 rounded-md text-emerald-800 hover:bg-emerald-50 cursor-pointer" title="Salvar nome">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => setRenomeando(null)} className="p-1 rounded-md text-slate-400 hover:bg-slate-100 cursor-pointer" title="Cancelar">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="min-w-0 flex-1 truncate font-semibold text-slate-800">{c}</span>
                    <span className="text-[10px] font-mono tabular-nums text-slate-400 shrink-0">
                      {qtd} {qtd === 1 ? 'produto' : 'produtos'}
                    </span>
                    <button
                      type="button"
                      onClick={() => { setRenomeando(c); setNomeRenomear(c); }}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                      title="Renomear (atualiza produtos e comissões por grupo)"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => excluir(c)}
                      className="p-1 rounded-md text-slate-400 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                      title={qtd > 0 ? `Excluir (move ${qtd} produto(s) para "${CATEGORIA_SEM_CATEGORIA}")` : 'Excluir'}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {aviso && <p className="text-[10px] font-semibold text-emerald-800">{aviso}</p>}
      {vazio && !criando && (
        <p className="text-[10px] font-semibold text-amber-700">Nenhuma categoria ainda — clique em + para criar.</p>
      )}
    </div>
  );
}
