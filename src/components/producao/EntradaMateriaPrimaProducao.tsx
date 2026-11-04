import React, { useEffect, useMemo, useState } from 'react';
import {
  PedidoCompraGeral,
  UNIDADES_PEDIDO_COMPRA,
  CategoriaCompra,
  carregarPedidosCompra,
  salvarPedidosCompra,
  efetivarPedidoCompra
} from '../../data/mockStore';
import { carregarMateriaPrima, normalizarUnidade, MateriaPrimaEstoque } from '../../data/produtosData';
import { carregarAgricultores, carregarFornecedores, fornecedoresDaMateriaPrima } from '../../data/cadastrosData';
import { carregarLotesMP, rotuloLoteMP, EVENTO_LOTES_MP, LoteMateriaPrima } from '../../data/lotesMateriaPrimaData';
import { hojeISO, formatarDataBR, somarDias } from '../../lib/datas';
import { CampoNumero } from '../ui/CampoNumero';
import { Painel } from '../ui/Painel';
import { BotaoPrimario } from '../ui/CabecalhoPagina';
import { CampoBusca } from '../ui/BarraFiltros';
import { TabelaDados, Th, Td } from '../ui/TabelaDados';
import { EstadoVazio } from '../ui/EstadoVazio';
import { CampoNotaFornecedor } from '../ui/CampoNotaFornecedor';
import { NotaFornecedor, guardarNotaEntrada } from '../../data/notasFornecedorData';
import { mesmoDocumento, DadosNFe } from '../../lib/nfeXml';

// Entrada de matéria-prima pela produção: grava o lote do fornecedor (rastreabilidade),
// dá entrada no estoque e já lança a conta no Contas a Pagar do financeiro.

const SEM_PARCEIRO = '__sem__';
const FORMAS: PedidoCompraGeral['forma_pagamento'][] = ['Boleto Bancário', 'PIX', 'Transferência TED', 'À Vista Dinheiro', 'Cartão Corporativo'];

const fmt = (n: number, casas = 3) => (Number(n) || 0).toLocaleString('pt-BR', { maximumFractionDigits: casas });
const moeda = (n: number) => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const ehRaiz = (mp?: MateriaPrimaEstoque) => mp?.categoria === 'Raiz In Natura';

function unidadeCompraPadrao(mp?: MateriaPrimaEstoque): PedidoCompraGeral['unidade_medida'] {
  switch (normalizarUnidade(mp?.unidade_medida)) {
    case 'TON': return 'Toneladas';
    case 'LITRO':
    case 'ML': return 'Litros';
    case 'UN': return 'Unidades';
    default: return 'KG';
  }
}

function categoriaDaMP(mp?: MateriaPrimaEstoque): CategoriaCompra {
  return mp?.categoria === 'Embalagens' ? 'Embalagens' : 'Mandioca / Matéria-Prima';
}

const campo = 'w-full bg-papel border border-linha-forte rounded-md px-3 py-2 text-tinta focus:outline-none focus:border-eno-700';
const rotulo = 'block font-bold text-tinta-2 mb-1';

// Uma linha da nota importada: qual matéria-prima é, quanto entrou e o lote
interface LinhaNota {
  incluir: boolean;
  descricao: string;
  mpId: string;
  quantidade: number;
  unidade: PedidoCompraGeral['unidade_medida'];
  lote: string;
  validade: string;
  valor: number; // parte do valor da nota (impostos e frete rateados)
}

const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Matéria-prima cadastrada que mais combina com a descrição do item da nota
function mpPelaDescricao(descricao: string, materias: MateriaPrimaEstoque[]): string {
  const d = semAcento(descricao);
  let melhor = { id: '', pontos: 0 };
  materias.filter(m => !ehRaiz(m)).forEach(m => {
    const palavras = semAcento(m.nome).split(/[^a-z0-9]+/).filter(p => p.length >= 3);
    const pontos = palavras.filter(p => d.includes(p)).length / Math.max(1, palavras.length);
    if (pontos > melhor.pontos) melhor = { id: m.id, pontos };
  });
  return melhor.pontos >= 0.5 ? melhor.id : '';
}

function unidadeDaNota(uCom: string): PedidoCompraGeral['unidade_medida'] {
  const u = semAcento(uCom).replace(/[^a-z]/g, '');
  if (['kg', 'kgs', 'quilo'].includes(u)) return 'KG';
  if (['t', 'ton', 'tn', 'tonelada'].includes(u)) return 'Toneladas';
  if (['l', 'lt', 'lts', 'litro', 'litros'].includes(u)) return 'Litros';
  if (['sc', 'saco', 'sacos'].includes(u)) return 'Sacos';
  if (['cx', 'caixa', 'caixas'].includes(u)) return 'Caixas';
  if (['pct', 'pc', 'pacote'].includes(u)) return 'Pacotes';
  if (['fd', 'fardo', 'fardos'].includes(u)) return 'Fardos';
  return 'Unidades';
}

export function EntradaMateriaPrimaProducao() {
  const [materias, setMaterias] = useState<MateriaPrimaEstoque[]>([]);
  const [lotes, setLotes] = useState<LoteMateriaPrima[]>([]);
  const [entradas, setEntradas] = useState<PedidoCompraGeral[]>([]);
  const [busca, setBusca] = useState('');

  const [mpId, setMpId] = useState('');
  const [parceiroId, setParceiroId] = useState('');
  const [parceiroLivre, setParceiroLivre] = useState('');
  const [quantidade, setQuantidade] = useState(0);
  const [unidade, setUnidade] = useState<PedidoCompraGeral['unidade_medida']>('KG');
  const [lote, setLote] = useState('');
  const [validade, setValidade] = useState('');
  const [dataEntrada, setDataEntrada] = useState(hojeISO());
  const [nota, setNota] = useState<NotaFornecedor | null>(null);
  const [linhasNota, setLinhasNota] = useState<LinhaNota[] | null>(null); // preenchido quando a nota veio por XML
  const [valorTotal, setValorTotal] = useState(0);
  const [vencimento, setVencimento] = useState('');
  const [forma, setForma] = useState<PedidoCompraGeral['forma_pagamento']>('Boleto Bancário');
  const [obs, setObs] = useState('');
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  const recarregar = () => {
    setMaterias(carregarMateriaPrima());
    setLotes(carregarLotesMP());
    setEntradas(carregarPedidosCompra().filter(p => p.origem_lancamento === 'PRODUCAO'));
  };

  useEffect(() => {
    recarregar();
    const h = () => recarregar();
    window.addEventListener(EVENTO_LOTES_MP, h);
    window.addEventListener('produtos_updated', h);
    window.addEventListener('pedidos_compra_updated', h);
    return () => {
      window.removeEventListener(EVENTO_LOTES_MP, h);
      window.removeEventListener('produtos_updated', h);
      window.removeEventListener('pedidos_compra_updated', h);
    };
  }, []);

  const mp = materias.find(m => m.id === mpId);
  const modoNota = !!linhasNota;

  // Mandioca vem dos agricultores; o resto, dos fornecedores (os vinculados à MP primeiro)
  const parceiros = useMemo(() => {
    if (!mp && !modoNota) return [] as { id: string; nome: string; doc?: string; pix?: string; vinculado?: boolean }[];
    if (mp && ehRaiz(mp) && !modoNota) {
      return carregarAgricultores()
        .filter(a => a.ativo !== false)
        .map(a => ({ id: a.id, nome: a.nome_completo, doc: a.cpf_cnpj, pix: a.chave_pix }));
    }
    const vinculados = new Set(mp ? fornecedoresDaMateriaPrima(mp).map(f => f.id) : []);
    return carregarFornecedores()
      .filter(f => f.ativo !== false)
      .map(f => ({ id: f.id, nome: f.fantasia || f.razao_nome, doc: f.cpf_cnpj, pix: f.chave_pix, vinculado: vinculados.has(f.id) }))
      .sort((a, b) => Number(!!b.vinculado) - Number(!!a.vinculado) || a.nome.localeCompare(b.nome));
  }, [mp, modoNota]);

  const escolherMp = (id: string) => {
    setMpId(id);
    const nova = materias.find(m => m.id === id);
    setUnidade(unidadeCompraPadrao(nova));
    setParceiroId('');
    setParceiroLivre('');
  };

  // XML do fornecedor: preenche fornecedor, data, valor, vencimento e os itens com lote
  const usarXml = (d: DadosNFe) => {
    const somaItens = d.itens.reduce((acc, i) => acc + i.valor_total, 0);
    const fator = somaItens > 0 && d.valor_total > 0 ? d.valor_total / somaItens : 1;
    setLinhasNota(d.itens.map(it => {
      const mpAchada = mpPelaDescricao(it.descricao, materias);
      return {
        incluir: !!mpAchada,
        descricao: it.descricao,
        mpId: mpAchada,
        quantidade: it.quantidade,
        unidade: unidadeDaNota(it.unidade),
        lote: it.lotes.map(l => l.lote).filter(Boolean).join(' / '),
        validade: it.lotes.find(l => l.data_validade)?.data_validade || '',
        valor: parseFloat((it.valor_total * fator).toFixed(2))
      };
    }));
    const fornecedor = carregarFornecedores().find(f => mesmoDocumento(f.cpf_cnpj, d.emitente.documento));
    setParceiroId(fornecedor ? fornecedor.id : SEM_PARCEIRO);
    setParceiroLivre(fornecedor ? '' : d.emitente.nome);
    if (d.data_emissao && d.data_emissao <= hojeISO()) setDataEntrada(d.data_emissao);
    setValorTotal(d.valor_total);
    if (d.duplicatas[0]?.vencimento) setVencimento(d.duplicatas[0].vencimento);
    setMpId('');
  };

  const trocarNota = (n: NotaFornecedor | null) => {
    setNota(n);
    if (!n?.importada_xml) setLinhasNota(null);
  };

  const mudarLinha = (i: number, campo: Partial<LinhaNota>) =>
    setLinhasNota(ls => (ls ? ls.map((l, j) => (j === i ? { ...l, ...campo } : l)) : ls));

  const limpar = () => {
    setMpId('');
    setParceiroId('');
    setParceiroLivre('');
    setQuantidade(0);
    setLote('');
    setValidade('');
    setDataEntrada(hojeISO());
    setNota(null);
    setLinhasNota(null);
    setValorTotal(0);
    setVencimento('');
    setForma('Boleto Bancário');
    setObs('');
  };

  // Grava um item: pedido de compra da produção + conta a pagar + estoque com lote
  const gravarItem = (item: { mp: MateriaPrimaEstoque; quantidade: number; unidade: PedidoCompraGeral['unidade_medida']; lote: string; validade: string; valor: number; parte?: string }) => {
    const parceiro = parceiros.find(p => p.id === parceiroId);
    const nomeParceiro = parceiro?.nome || parceiroLivre.trim() || nota?.emitente_nome || 'Sem fornecedor';
    const raiz = ehRaiz(item.mp) && !modoNota;
    const id = `pc_prod_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const pedido: PedidoCompraGeral = {
      id,
      data: dataEntrada,
      tipo_parceiro: raiz && parceiro ? 'AGRICULTOR' : 'FORNECEDOR',
      ...(raiz && parceiro
        ? { agricultor_id: parceiro.id, agricultor_nome: parceiro.nome, agricultor_cpf_cnpj: parceiro.doc, agricultor_chave_pix: parceiro.pix }
        : { fornecedor_id: parceiro?.id, fornecedor_nome: nomeParceiro, fornecedor_cnpj: parceiro?.doc || nota?.emitente_documento, fornecedor_chave_pix: parceiro?.pix }),
      comprador_nome: 'Produção',
      item_descricao: item.mp.nome,
      categoria: categoriaDaMP(item.mp),
      quantidade: item.quantidade,
      unidade_medida: item.unidade,
      valor_unitario: parseFloat((item.valor / item.quantidade).toFixed(4)),
      valor_total: parseFloat(item.valor.toFixed(2)),
      status_pedido: 'A Confirmar',
      forma_pagamento: forma,
      observacoes: obs.trim() || undefined,
      materia_prima_id: item.mp.id,
      lote_mp: item.lote.trim(),
      validade_mp: item.validade || undefined,
      origem_lancamento: 'PRODUCAO',
      nota_fiscal_entrada: nota || undefined
    };
    salvarPedidosCompra([pedido, ...carregarPedidosCompra()]);
    // A conta nasce no Contas a Pagar (a despesa se realiza quando o financeiro pagar)
    const res = efetivarPedidoCompra(id, {
      tipo: 'A_PAGAR',
      data: vencimento,
      numero_documento: nota ? `NF-${nota.numero}${item.parte ? ` (${item.parte})` : ''}` : undefined,
      observacao: `Lote ${item.lote.trim()}${nota ? ` · NF ${nota.numero}` : ''}${item.parte ? ` · item ${item.parte}` : ''}`
    });
    if (!res.sucesso) salvarPedidosCompra(carregarPedidosCompra().filter(p => p.id !== id));
    return { ...res, id };
  };

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    setAviso(null);
    const comum =
      !parceiroId ? 'Escolha o fornecedor (ou "Sem fornecedor cadastrado").'
      : valorTotal <= 0 ? 'Informe o valor total da nota.'
      : !vencimento ? 'Informe o vencimento da conta.'
      : '';

    if (linhasNota) {
      const usadas = linhasNota.filter(l => l.incluir);
      const erro =
        usadas.length === 0 ? 'Marque pelo menos um item da nota que é matéria-prima.'
        : usadas.find(l => !l.mpId) ? `Escolha a matéria-prima do item "${usadas.find(l => !l.mpId)!.descricao}".`
        : usadas.find(l => !(l.quantidade > 0)) ? 'Informe a quantidade de cada item marcado.'
        : usadas.find(l => !l.lote.trim()) ? `Informe o lote do item "${usadas.find(l => !l.lote.trim())!.descricao}" (vem na embalagem ou na nota).`
        : usadas.find(l => l.validade && l.validade <= dataEntrada) ? 'A validade do lote precisa ser depois da data de entrada.'
        : comum;
      if (erro) {
        setAviso({ tipo: 'erro', texto: erro });
        return;
      }
      // A nota entra uma vez nas Notas de Entrada, com todos os itens
      if (nota) guardarNotaEntrada(nota, { descricao: usadas.map(l => l.descricao).join(' + ') });
      // Valor da nota repartido entre os itens marcados (o que não é MP também entra no valor)
      const somaUsadas = usadas.reduce((acc, l) => acc + l.valor, 0);
      const fator = somaUsadas > 0 ? valorTotal / somaUsadas : 1;
      const resultados = usadas.map((l, i) => {
        const mpLinha = materias.find(m => m.id === l.mpId)!;
        const r = gravarItem({ mp: mpLinha, quantidade: l.quantidade, unidade: l.unidade, lote: l.lote, validade: l.validade, valor: l.valor * fator, parte: usadas.length > 1 ? `${i + 1}/${usadas.length}` : undefined });
        return { ...r, nome: mpLinha.nome, lote: l.lote, unidade: l.unidade, mpUn: mpLinha.unidade_medida };
      });
      const falhas = resultados.filter(r => !r.sucesso);
      const semEstoque = resultados.filter(r => r.sucesso && !r.entradaEstoque);
      setAviso({
        tipo: falhas.length || semEstoque.length ? 'erro' : 'ok',
        texto: [
          `NF ${nota?.numero}: ${resultados.length - falhas.length} ${resultados.length - falhas.length === 1 ? 'item gravado' : 'itens gravados'}, conta de ${moeda(valorTotal)} no Contas a Pagar para ${formatarDataBR(vencimento)}.`,
          ...falhas.map(f => `${f.nome}: ${f.mensagem}`),
          ...semEstoque.map(s => `${s.nome}: a unidade "${s.unidade}" não converte para ${s.mpUn}; o estoque e o lote não entraram.`)
        ].join(' ')
      });
      limpar();
      recarregar();
      return;
    }

    const erro =
      !mp ? 'Escolha a matéria-prima.'
      : comum && comum.startsWith('Escolha o fornecedor') ? comum
      : quantidade <= 0 ? 'Informe a quantidade recebida.'
      : !lote.trim() ? 'Informe o lote do fornecedor (vem na embalagem ou na nota).'
      : validade && validade <= dataEntrada ? 'A validade do lote precisa ser depois da data de entrada.'
      : comum;
    if (erro || !mp) {
      setAviso({ tipo: 'erro', texto: erro });
      return;
    }
    const res = gravarItem({ mp, quantidade, unidade, lote, validade, valor: valorTotal });
    if (!res.sucesso) {
      setAviso({ tipo: 'erro', texto: res.mensagem });
      return;
    }
    setAviso({
      tipo: res.entradaEstoque ? 'ok' : 'erro',
      texto: res.entradaEstoque
        ? `Entrada gravada: ${fmt(res.entradaEstoque.quantidade)} ${res.entradaEstoque.unidade} de ${mp.nome}, lote ${lote.trim()}. Conta de ${moeda(valorTotal)} lançada no Contas a Pagar para ${formatarDataBR(vencimento)}.`
        : `Conta lançada no Contas a Pagar, mas a unidade "${unidade}" não converte para a unidade de ${mp.nome} (${mp.unidade_medida}), então o estoque e o lote não entraram. Avise o administrativo.`
    });
    limpar();
    recarregar();
  };

  const lotesComSaldo = useMemo(() => {
    const b = busca.trim().toLowerCase();
    return lotes
      .filter(l => l.saldo > 0.0001)
      .filter(l => !b || l.materia_prima_nome.toLowerCase().includes(b) || l.lote.toLowerCase().includes(b) || (l.fornecedor_nome || '').toLowerCase().includes(b))
      .sort((a, b2) => a.materia_prima_nome.localeCompare(b2.materia_prima_nome) || (a.data_validade || '9999').localeCompare(b2.data_validade || '9999'));
  }, [lotes, busca]);

  const vencidoOuPerto = (v?: string) => {
    if (!v) return '';
    if (v < hojeISO()) return 'text-st-vencido font-bold';
    if (v <= somarDias(hojeISO(), 30)) return 'text-st-aguardando font-bold';
    return '';
  };

  return (
    <div className="space-y-4 text-xs">
      <Painel titulo="Entrada de matéria-prima">
        <form onSubmit={handleSalvar} className="space-y-3 max-sm:[&_input]:min-h-11 max-sm:[&_input]:text-base max-sm:[&_select]:min-h-11 max-sm:[&_select]:text-base">
          <CampoNotaFornecedor nota={nota} onNota={trocarNota} onXmlLido={usarXml} />

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            {!modoNota && (
              <div className="sm:col-span-5 min-w-0">
                <label className={rotulo}>Matéria-prima *</label>
                <select value={mpId} onChange={e => escolherMp(e.target.value)} className={`${campo} font-bold`}>
                  <option value="">-- Selecione --</option>
                  {materias.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.codigo ? `${m.codigo} - ` : ''}{m.nome} ({fmt(m.estoque_atual)} {m.unidade_medida} em estoque)
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className={`${modoNota ? 'sm:col-span-9' : 'sm:col-span-4'} min-w-0`}>
              <label className={rotulo}>{mp && ehRaiz(mp) && !modoNota ? 'Agricultor *' : 'Fornecedor *'}</label>
              <select value={parceiroId} onChange={e => setParceiroId(e.target.value)} disabled={!mp && !modoNota} className={`${campo} disabled:bg-papel-2 disabled:text-cinza`}>
                <option value="">{mp || modoNota ? '-- Selecione --' : 'Escolha a matéria-prima'}</option>
                {parceiros.map(p => (
                  <option key={p.id} value={p.id}>{p.nome}{p.vinculado ? ' (fornece esta MP)' : ''}</option>
                ))}
                <option value={SEM_PARCEIRO}>{modoNota ? 'Fornecedor não cadastrado (usar o nome da nota)' : 'Sem fornecedor cadastrado'}</option>
              </select>
            </div>
            <div className="sm:col-span-3">
              <label className={rotulo}>Data da entrada *</label>
              <input type="date" value={dataEntrada} max={hojeISO()} onChange={e => setDataEntrada(e.target.value || hojeISO())} className={`${campo} tabular-nums`} />
            </div>
          </div>

          {parceiroId === SEM_PARCEIRO && (
            <div>
              <label className={rotulo}>Nome de quem entregou</label>
              <input type="text" value={parceiroLivre} onChange={e => setParceiroLivre(e.target.value)} placeholder="Opcional" className={campo} />
            </div>
          )}

          {linhasNota ? (
            <div className="rounded-md border border-linha">
              <div className="bg-papel-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-cinza border-b border-linha">
                Itens da nota · marque os que são matéria-prima
              </div>
              <div className="divide-y divide-linha">
                {linhasNota.map((l, i) => (
                  <div key={i} className={`p-3 space-y-2 ${l.incluir ? '' : 'opacity-60'}`}>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input type="checkbox" checked={l.incluir} onChange={e => mudarLinha(i, { incluir: e.target.checked })} className="mt-0.5 w-4 h-4 accent-eno-800 shrink-0" />
                      <span className="min-w-0">
                        <span className="font-bold text-tinta">{l.descricao}</span>
                        <span className="block text-[11px] text-cinza tabular-nums">{fmt(l.quantidade)} {l.unidade} · {moeda(l.valor)}</span>
                      </span>
                    </label>
                    {l.incluir && (
                      <div className="grid grid-cols-2 sm:grid-cols-12 gap-2">
                        <div className="col-span-2 sm:col-span-4 min-w-0">
                          <label className={rotulo}>Matéria-prima *</label>
                          <select value={l.mpId} onChange={e => mudarLinha(i, { mpId: e.target.value })} className={`${campo} font-bold`}>
                            <option value="">-- Selecione --</option>
                            {materias.filter(m => !ehRaiz(m)).map(m => <option key={m.id} value={m.id}>{m.nome} ({m.unidade_medida})</option>)}
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <label className={rotulo}>Quantidade *</label>
                          <CampoNumero value={l.quantidade} onChange={n => mudarLinha(i, { quantidade: n })} ocultarZero className={`${campo} tabular-nums font-bold text-right`} />
                        </div>
                        <div className="sm:col-span-2">
                          <label className={rotulo}>Unidade *</label>
                          <select value={l.unidade} onChange={e => mudarLinha(i, { unidade: e.target.value as PedidoCompraGeral['unidade_medida'] })} className={campo}>
                            {UNIDADES_PEDIDO_COMPRA.map(u => <option key={u.valor} value={u.valor}>{u.rotulo}</option>)}
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <label className={rotulo}>Lote *</label>
                          <input type="text" value={l.lote} onChange={e => mudarLinha(i, { lote: e.target.value })} className={`${campo} tabular-nums font-bold`} />
                        </div>
                        <div className="sm:col-span-2">
                          <label className={rotulo}>Validade</label>
                          <input type="date" value={l.validade} min={dataEntrada} onChange={e => mudarLinha(i, { validade: e.target.value })} className={`${campo} tabular-nums`} />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-2">
                <label className={rotulo}>Quantidade *</label>
                <CampoNumero value={quantidade} onChange={setQuantidade} ocultarZero className={`${campo} tabular-nums font-bold text-right`} />
              </div>
              <div className="sm:col-span-2">
                <label className={rotulo}>Unidade *</label>
                <select value={unidade} onChange={e => setUnidade(e.target.value as PedidoCompraGeral['unidade_medida'])} className={campo}>
                  {UNIDADES_PEDIDO_COMPRA.map(u => <option key={u.valor} value={u.valor}>{u.rotulo}</option>)}
                </select>
              </div>
              <div className="col-span-2 sm:col-span-4">
                <label className={rotulo}>Lote do fornecedor *</label>
                <input type="text" value={lote} onChange={e => setLote(e.target.value)} placeholder="Como está na embalagem ou na nota" className={`${campo} tabular-nums font-bold`} />
              </div>
              <div className="col-span-2 sm:col-span-4">
                <label className={rotulo}>Validade do lote</label>
                <input type="date" value={validade} min={dataEntrada} onChange={e => setValidade(e.target.value)} className={`${campo} tabular-nums`} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-12 gap-3 pt-3 border-t border-linha">
            <div className="sm:col-span-4">
              <label className={rotulo}>Valor total da nota (R$) *</label>
              <CampoNumero value={valorTotal} onChange={setValorTotal} casas={2} ocultarZero className={`${campo} tabular-nums font-bold text-right`} />
            </div>
            <div className="sm:col-span-4">
              <label className={rotulo}>Vencimento da conta *</label>
              <input type="date" value={vencimento} min={dataEntrada} onChange={e => setVencimento(e.target.value)} className={`${campo} tabular-nums`} />
            </div>
            <div className="col-span-2 sm:col-span-4">
              <label className={rotulo}>Pagamento</label>
              <select value={forma} onChange={e => setForma(e.target.value as PedidoCompraGeral['forma_pagamento'])} className={campo}>
                {FORMAS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={rotulo}>Observação</label>
            <input type="text" value={obs} onChange={e => setObs(e.target.value)} className={campo} />
          </div>

          {aviso && (
            <div role="status" className={`p-2.5 rounded-md border font-semibold ${aviso.tipo === 'ok' ? 'bg-eno-50 border-eno-100 text-eno-800' : 'bg-st-vencido-bg border-st-vencido/30 text-st-vencido'}`}>
              {aviso.texto}
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-[11px] text-cinza">
              Ao gravar: entra no estoque com o lote, a nota vai para as Notas de Entrada e a conta para o Contas a Pagar.
            </p>
            <BotaoPrimario type="submit" className="w-full sm:w-auto h-11 sm:h-9">Gravar entrada</BotaoPrimario>
          </div>
        </form>
      </Painel>

      <Painel titulo="Lotes em estoque" contexto={`${lotesComSaldo.length}`} semPadding>
        <div className="px-4 py-3 border-b border-linha">
          <CampoBusca valor={busca} onChange={setBusca} placeholder="Buscar matéria-prima, lote ou fornecedor" className="w-full sm:w-80" />
        </div>
        {lotesComSaldo.length === 0 ? (
          <EstadoVazio titulo="Nenhum lote com saldo" texto="Cada entrada lançada aqui vira um lote. A produção escolhe de quais lotes usou ao apontar a OP." />
        ) : (
          <>
          {/* Celular: cartões */}
          <ul className="sm:hidden divide-y divide-linha">
            {lotesComSaldo.map(l => (
              <li key={l.id} className="px-4 py-3 space-y-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-bold text-tinta min-w-0 truncate">{l.materia_prima_nome}</span>
                  <span className="tabular-nums font-bold text-tinta shrink-0">{fmt(l.saldo)} {l.unidade}</span>
                </div>
                <div className="flex items-baseline justify-between gap-3 text-[11.5px] text-tinta-2">
                  <span className="tabular-nums font-bold min-w-0 break-all">Lote {rotuloLoteMP(l)}</span>
                  <span className="text-cinza tabular-nums shrink-0">de {fmt(l.quantidade_entrada)}</span>
                </div>
                <div className="text-[11px] text-cinza">
                  {l.fornecedor_nome || 'Sem fornecedor'} · entrada {formatarDataBR(l.data_entrada)}
                  {l.data_validade && <> · <span className={vencidoOuPerto(l.data_validade)}>val. {formatarDataBR(l.data_validade)}</span></>}
                </div>
              </li>
            ))}
          </ul>
          <TabelaDados className="hidden sm:block">
            <thead>
              <tr>
                <Th>Matéria-prima</Th>
                <Th>Lote</Th>
                <Th>Fornecedor</Th>
                <Th>Entrada</Th>
                <Th>Validade</Th>
                <Th numero>Saldo</Th>
              </tr>
            </thead>
            <tbody>
              {lotesComSaldo.map(l => (
                <tr key={l.id}>
                  <Td className="font-semibold text-tinta">{l.materia_prima_nome}</Td>
                  <Td className="tabular-nums font-bold whitespace-nowrap">{rotuloLoteMP(l)}</Td>
                  <Td>{l.fornecedor_nome || '-'}</Td>
                  <Td className="tabular-nums">{formatarDataBR(l.data_entrada)}</Td>
                  <Td className={`tabular-nums ${vencidoOuPerto(l.data_validade)}`}>{l.data_validade ? formatarDataBR(l.data_validade) : '-'}</Td>
                  <Td numero>{fmt(l.saldo)} / {fmt(l.quantidade_entrada)} {l.unidade}</Td>
                </tr>
              ))}
            </tbody>
          </TabelaDados>
          </>
        )}
      </Painel>

      {entradas.length > 0 && (
        <Painel titulo="Entradas lançadas" contexto={`${entradas.length}`} semPadding>
          <ul className="sm:hidden divide-y divide-linha">
            {entradas.slice(0, 50).map(p => (
              <li key={p.id} className="px-4 py-3 space-y-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-bold text-tinta min-w-0 truncate">{p.item_descricao}</span>
                  <span className="tabular-nums font-bold text-tinta shrink-0">{moeda(p.valor_total)}</span>
                </div>
                <div className="text-[11.5px] text-tinta-2 tabular-nums">
                  Lote <strong>{p.lote_mp || '-'}</strong> · {fmt(p.quantidade)} {p.unidade_medida}
                </div>
                <div className="text-[11px] text-cinza">
                  {formatarDataBR(p.data)} · {p.agricultor_nome || p.fornecedor_nome || '-'} · {p.status_pedido === 'Pago' ? 'paga' : 'a pagar'}
                </div>
              </li>
            ))}
          </ul>
          <TabelaDados className="hidden sm:block">
            <thead>
              <tr>
                <Th>Data</Th>
                <Th>Matéria-prima</Th>
                <Th>Lote</Th>
                <Th>Fornecedor</Th>
                <Th numero>Quantidade</Th>
                <Th numero>Valor</Th>
                <Th>Conta</Th>
              </tr>
            </thead>
            <tbody>
              {entradas.slice(0, 50).map(p => (
                <tr key={p.id}>
                  <Td className="tabular-nums">{formatarDataBR(p.data)}</Td>
                  <Td className="font-semibold text-tinta">{p.item_descricao}</Td>
                  <Td className="tabular-nums font-bold whitespace-nowrap">{p.lote_mp || '-'}</Td>
                  <Td>{p.agricultor_nome || p.fornecedor_nome || '-'}</Td>
                  <Td numero>{fmt(p.quantidade)} {p.unidade_medida}</Td>
                  <Td numero>{moeda(p.valor_total)}</Td>
                  <Td>{p.status_pedido === 'Pago' ? 'Paga' : 'A pagar'}</Td>
                </tr>
              ))}
            </tbody>
          </TabelaDados>
        </Painel>
      )}
    </div>
  );
}
