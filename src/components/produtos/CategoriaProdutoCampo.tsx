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
import { form, BotaoIcone } from './kitProdutos';

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

  const btn =
    'inline-flex h-11 w-11 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-md border transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-eno-700/30';

  return (
    <div className="space-y-1.5">
      <div className="flex items-stretch gap-1.5">
        <select
          value={valorNaLista ? categorias.find(c => chaveCategoria(c) === chaveCategoria(value)) : ''}
          onChange={(e) => onChange(e.target.value)}
          className={`${form.select} min-w-0 flex-1`}
        >
          <option value="" disabled>{vazio ? 'Crie uma categoria →' : 'Selecione'}</option>
          {categorias.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => { setCriando(v => !v); setGerenciando(false); setAviso(''); }}
          className={`${btn} ${vazio ? 'bg-eno-800 border-eno-800 text-white hover:bg-eno-900' : 'bg-papel border-linha-forte text-eno-700 hover:bg-papel-3'}`}
          title="Nova categoria"
          aria-label="Nova categoria"
        >
          <Plus className="w-4 h-4" />
        </button>
        {!vazio && (
          <button
            type="button"
            onClick={() => { setGerenciando(v => !v); setCriando(false); setAviso(''); }}
            className={`${btn} ${gerenciando ? 'bg-eno-900 border-eno-900 text-white' : 'bg-papel border-linha-forte text-cinza hover:text-tinta hover:bg-papel-3'}`}
            title="Gerenciar categorias"
            aria-label="Gerenciar categorias"
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
            className={`${form.campo} min-w-0 flex-1`}
          />
          <button type="button" onClick={criar} className={`${btn} bg-eno-800 border-eno-800 text-white hover:bg-eno-900`} title="Criar" aria-label="Criar categoria">
            <Check className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => setCriando(false)} className={`${btn} bg-papel border-linha-forte text-cinza hover:bg-papel-3`} title="Cancelar" aria-label="Cancelar">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {gerenciando && (
        <div className="rounded-md border border-linha bg-papel max-h-56 overflow-y-auto">
          {categorias.map(c => {
            const qtd = contarProdutosDaCategoria(c);
            return (
              <div key={c} className="flex items-center gap-1.5 px-2.5 py-1 border-b border-linha last:border-b-0">
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
                      className={`${form.campo} min-w-0 flex-1`}
                    />
                    <BotaoIcone rotulo="Salvar nome" onClick={salvarRenomear} className="text-eno-700">
                      <Check className="w-4 h-4" />
                    </BotaoIcone>
                    <BotaoIcone rotulo="Cancelar" onClick={() => setRenomeando(null)}>
                      <X className="w-4 h-4" />
                    </BotaoIcone>
                  </>
                ) : (
                  <>
                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-tinta">{c}</span>
                    <span className="text-[11px] tabular-nums text-cinza shrink-0">
                      {qtd} {qtd === 1 ? 'produto' : 'produtos'}
                    </span>
                    <BotaoIcone rotulo="Renomear (atualiza produtos e comissões por grupo)" onClick={() => { setRenomeando(c); setNomeRenomear(c); }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </BotaoIcone>
                    <BotaoIcone
                      rotulo={qtd > 0 ? `Excluir (move ${qtd} produto(s) para "${CATEGORIA_SEM_CATEGORIA}")` : 'Excluir'}
                      perigo
                      onClick={() => excluir(c)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </BotaoIcone>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {aviso && <p className="text-[11.5px] font-semibold text-st-pago">{aviso}</p>}
      {vazio && !criando && (
        <p className="text-[11.5px] font-semibold text-st-aguardando">Nenhuma categoria ainda — toque em + para criar.</p>
      )}
    </div>
  );
}
