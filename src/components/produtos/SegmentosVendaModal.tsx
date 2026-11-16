import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { ModalFolha, form, BotaoIcone, Aviso } from './kitProdutos';
import { BotaoPrimario } from '../ui/CabecalhoPagina';
import { SegmentoVenda, carregarSegmentosVenda, salvarSegmentosVenda } from '../../data/segmentosData';
import { carregarTabelasPreco, salvarTabelasPreco } from '../../data/produtosData';

interface Props {
  onFechar: () => void;
}

// Administrador adiciona, renomeia e remove os segmentos (canais de venda).
// Cada mudança é salva na hora: aparece no seletor da tabela de preço e sobe para o banco.
export function SegmentosVendaModal({ onFechar }: Props) {
  // Última lista salva (base para descobrir renomeações e uso nas tabelas)
  const [salvo, setSalvo] = useState<SegmentoVenda[]>(() => carregarSegmentosVenda());
  const [lista, setLista] = useState<SegmentoVenda[]>(() => carregarSegmentosVenda());
  const [novo, setNovo] = useState('');
  const [erro, setErro] = useState('');

  // Quantas tabelas usam o segmento (pelo nome salvo)
  const usosDo = (id: string) => {
    const nomeSalvo = salvo.find(o => o.id === id)?.nome;
    return nomeSalvo ? carregarTabelasPreco().filter(t => t.tipo === nomeSalvo).length : 0;
  };

  // Grava a lista: valida, renomeia nas tabelas que usavam o nome antigo e avisa a tela
  const persistir = (proxima: SegmentoVenda[]): boolean => {
    const normalizada = proxima.map(s => ({ ...s, nome: s.nome.trim() }));
    if (normalizada.some(s => !s.nome)) {
      setErro('Todo segmento precisa de um nome.');
      return false;
    }
    const nomes = normalizada.map(s => s.nome.toLowerCase());
    if (new Set(nomes).size !== nomes.length) {
      setErro('Há dois segmentos com o mesmo nome.');
      return false;
    }
    const renomes = new Map<string, string>();
    salvo.forEach(o => {
      const atual = normalizada.find(x => x.id === o.id);
      if (atual && atual.nome !== o.nome) renomes.set(o.nome, atual.nome);
    });
    if (renomes.size > 0) {
      salvarTabelasPreco(
        carregarTabelasPreco().map(t => (renomes.has(t.tipo) ? { ...t, tipo: renomes.get(t.tipo)! } : t))
      );
    }
    salvarSegmentosVenda(normalizada);
    setSalvo(normalizada);
    setLista(normalizada);
    setErro('');
    return true;
  };

  const alterarNome = (id: string, nome: string) => {
    setErro('');
    setLista(prev => prev.map(s => (s.id === id ? { ...s, nome } : s)));
  };

  // Ao sair do campo (ou Enter), grava o nome editado
  const gravarNome = (id: string) => {
    const atual = lista.find(s => s.id === id);
    const original = salvo.find(s => s.id === id);
    if (!atual || !original || atual.nome.trim() === original.nome) return;
    persistir(lista);
  };

  const adicionar = () => {
    const nome = novo.trim();
    if (!nome) return;
    if (lista.some(s => s.nome.trim().toLowerCase() === nome.toLowerCase())) {
      setErro('Já existe um segmento com esse nome.');
      return;
    }
    if (persistir([...lista, { id: `seg_${Date.now()}`, nome }])) setNovo('');
  };

  const remover = (s: SegmentoVenda) => {
    const usos = usosDo(s.id);
    if (usos > 0) {
      setErro(`"${s.nome}" está em ${usos} tabela(s). Troque o segmento dessas tabelas antes de remover.`);
      return;
    }
    persistir(lista.filter(x => x.id !== s.id));
  };

  return (
    <ModalFolha
      titulo="Segmentos de venda"
      subtitulo="Canais que aparecem nas tabelas de preço. Cada mudança é salva na hora."
      onFechar={onFechar}
      largura="sm:max-w-xl"
      rodape={<BotaoPrimario onClick={onFechar}>Concluir</BotaoPrimario>}
    >
      <div className="space-y-2">
        {lista.map(s => (
          <div key={s.id} className="flex items-center gap-2">
            <input
              className={`${form.campo} flex-1`}
              value={s.nome}
              onChange={e => alterarNome(s.id, e.target.value)}
              onBlur={() => gravarNome(s.id)}
              onKeyDown={e => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              }}
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
        <BotaoPrimario onClick={adicionar}>
          <Plus className="w-4 h-4" /> Adicionar
        </BotaoPrimario>
      </div>

      {erro && (
        <div className="mt-3">
          <Aviso tom="vencido">{erro}</Aviso>
        </div>
      )}
    </ModalFolha>
  );
}
