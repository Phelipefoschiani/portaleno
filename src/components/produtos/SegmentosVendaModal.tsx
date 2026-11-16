import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { ModalFolha, form, BotaoIcone, Aviso } from './kitProdutos';
import { BotaoPrimario, BotaoSecundario } from '../ui/CabecalhoPagina';
import { SegmentoVenda, carregarSegmentosVenda, salvarSegmentosVenda } from '../../data/segmentosData';
import { carregarTabelasPreco, salvarTabelasPreco } from '../../data/produtosData';

interface Props {
  onFechar: () => void;
}

// Administrador adiciona, renomeia e remove os segmentos (canais de venda) das tabelas de preço
export function SegmentosVendaModal({ onFechar }: Props) {
  const [original] = useState<SegmentoVenda[]>(() => carregarSegmentosVenda());
  const [lista, setLista] = useState<SegmentoVenda[]>(() => carregarSegmentosVenda());
  const [novo, setNovo] = useState('');
  const [erro, setErro] = useState('');

  // Quantas tabelas usam o segmento (pelo nome gravado antes desta edição)
  const usosDo = (id: string) => {
    const nomeOriginal = original.find(o => o.id === id)?.nome;
    return nomeOriginal ? carregarTabelasPreco().filter(t => t.tipo === nomeOriginal).length : 0;
  };

  const alterarNome = (id: string, nome: string) => {
    setErro('');
    setLista(prev => prev.map(s => (s.id === id ? { ...s, nome } : s)));
  };

  const adicionar = () => {
    const nome = novo.trim();
    if (!nome) return;
    if (lista.some(s => s.nome.trim().toLowerCase() === nome.toLowerCase())) {
      setErro('Já existe um segmento com esse nome.');
      return;
    }
    setLista(prev => [...prev, { id: `seg_${Date.now()}`, nome }]);
    setNovo('');
    setErro('');
  };

  const remover = (s: SegmentoVenda) => {
    const usos = usosDo(s.id);
    if (usos > 0) {
      setErro(`"${s.nome}" está em ${usos} tabela(s). Troque o segmento dessas tabelas antes de remover.`);
      return;
    }
    setErro('');
    setLista(prev => prev.filter(x => x.id !== s.id));
  };

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizada = lista.map(s => ({ ...s, nome: s.nome.trim() }));
    if (normalizada.some(s => !s.nome)) {
      setErro('Todo segmento precisa de um nome.');
      return;
    }
    const nomes = normalizada.map(s => s.nome.toLowerCase());
    if (new Set(nomes).size !== nomes.length) {
      setErro('Há dois segmentos com o mesmo nome.');
      return;
    }
    // Renomeou um segmento: as tabelas que usavam o nome antigo passam a usar o novo
    const renomes = new Map<string, string>();
    original.forEach(o => {
      const atual = normalizada.find(x => x.id === o.id);
      if (atual && atual.nome !== o.nome) renomes.set(o.nome, atual.nome);
    });
    if (renomes.size > 0) {
      salvarTabelasPreco(
        carregarTabelasPreco().map(t => (renomes.has(t.tipo) ? { ...t, tipo: renomes.get(t.tipo)! } : t))
      );
    }
    salvarSegmentosVenda(normalizada);
    onFechar();
  };

  return (
    <ModalFolha
      titulo="Segmentos de venda"
      subtitulo="Canais que aparecem nas tabelas de preço. Você pode renomear, adicionar e remover."
      onFechar={onFechar}
      onSubmit={salvar}
      largura="sm:max-w-xl"
      rodape={
        <>
          <BotaoSecundario onClick={onFechar}>Cancelar</BotaoSecundario>
          <BotaoPrimario type="submit">Salvar segmentos</BotaoPrimario>
        </>
      }
    >
      <div className="space-y-2">
        {lista.map(s => (
          <div key={s.id} className="flex items-center gap-2">
            <input
              className={`${form.campo} flex-1`}
              value={s.nome}
              onChange={e => alterarNome(s.id, e.target.value)}
              aria-label="Nome do segmento"
            />
            <BotaoIcone rotulo={`Remover ${s.nome}`} perigo onClick={() => remover(s)}>
              <Trash2 className="w-4 h-4" />
            </BotaoIcone>
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <input
          className={`${form.campo} flex-1`}
          value={novo}
          onChange={e => setNovo(e.target.value)}
          placeholder="Novo segmento, ex.: Padarias da região Sul"
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              adicionar();
            }
          }}
        />
        <BotaoSecundario onClick={adicionar}>
          <Plus className="w-4 h-4" /> Adicionar
        </BotaoSecundario>
      </div>

      {erro && (
        <div className="mt-3">
          <Aviso tom="vencido">{erro}</Aviso>
        </div>
      )}
    </ModalFolha>
  );
}
