import React, { useState, useEffect } from 'react';
import { Printer } from 'lucide-react';
import { CabecalhoPagina, BotaoPrimario } from '../ui/CabecalhoPagina';
import { Painel } from '../ui/Painel';
import { EstadoVazio } from '../ui/EstadoVazio';
import { Campo, form } from './kitProdutos';
import { carregarEstoqueProdutos, carregarFichasTecnicas, ProdutoEstoque } from '../../data/produtosData';
import { hojeISO, parseData, formatarDataBR } from '../../lib/datas';
import { ProdutosNavTabs } from './ProdutosNavTabs';
import { lotesConcluidosDoProduto, EVENTO_OPS, OrdemProducao } from '../../data/ordensProducaoData';

interface Props {
  onNavigate?: (tabId: string) => void;
}

export function ProdutosEtiqueta({ onNavigate }: Props) {
  // Produtos reais do estoque (Cadastro de Produtos)
  const [produtos, setProdutos] = useState<ProdutoEstoque[]>(() => carregarEstoqueProdutos());
  const [produtoSelId, setProdutoSelId] = useState(() => carregarEstoqueProdutos()[0]?.id || '');
  const [lote, setLote] = useState(`LOTE-ENO-${hojeISO().slice(2).replace(/-/g, '')}`);
  const [dataFabricacao, setDataFabricacao] = useState(hojeISO());
  const [quantidadeEtiquetas, setQuantidadeEtiquetas] = useState('1');
  // Lotes vindos das Ordens de Produção concluídas do produto
  const [lotesOP, setLotesOP] = useState<OrdemProducao[]>([]);
  const [opSelId, setOpSelId] = useState('');
  const [versaoOps, setVersaoOps] = useState(0);

  useEffect(() => {
    const atualizar = () => setProdutos(carregarEstoqueProdutos());
    const atualizarOps = () => setVersaoOps(v => v + 1);
    window.addEventListener('produtos_updated', atualizar);
    window.addEventListener(EVENTO_OPS, atualizarOps);
    return () => {
      window.removeEventListener('produtos_updated', atualizar);
      window.removeEventListener(EVENTO_OPS, atualizarOps);
    };
  }, []);

  const aplicarLoteOP = (op?: OrdemProducao) => {
    if (!op) {
      setOpSelId('');
      return;
    }
    setOpSelId(op.id);
    setLote(op.lote || '');
    if (op.data_fabricacao) setDataFabricacao(op.data_fabricacao);
  };

  // Ao trocar de produto, sugere o lote da OP concluída mais recente
  useEffect(() => {
    const lista = produtoSelId ? lotesConcluidosDoProduto(produtoSelId) : [];
    setLotesOP(lista);
    if (lista.length > 0 && !lista.some(o => o.id === opSelId)) aplicarLoteOP(lista[0]);
    if (lista.length === 0) setOpSelId('');
  }, [produtoSelId, versaoOps]);

  useEffect(() => {
    if (!produtos.some(p => p.id === produtoSelId)) setProdutoSelId(produtos[0]?.id || '');
  }, [produtos]);

  const produto = produtos.find(p => p.id === produtoSelId) || produtos[0];

  // Validade pela ficha técnica do produto (prazo em meses); 24 meses quando não informado
  const calcValidade = () => {
    const d = parseData(dataFabricacao);
    if (!d || !produto) return '-';
    const ficha = carregarFichasTecnicas().find(f => f.produto_id === produto.id || f.produto_nome === produto.nome);
    const meses = ficha?.prazo_validade_meses && ficha.prazo_validade_meses > 0 ? ficha.prazo_validade_meses : 24;
    d.setMonth(d.getMonth() + meses);
    return formatarDataBR(hojeISO(d));
  };

  if (!produto) {
    return (
      <div className="relative h-full w-full flex flex-col bg-papel-2 text-tinta overflow-hidden">
        <ProdutosNavTabs activeTab="produtos_etiqueta" onNavigate={onNavigate} />
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1700px]">
            <CabecalhoPagina titulo="Etiquetas" resumo="Nenhum produto cadastrado" />
            <div className="px-4 sm:px-6 pb-8">
              <div className="bg-papel border border-linha rounded-md">
                <EstadoVazio
                  titulo="Nenhum produto para etiquetar"
                  texto="Cadastre um produto acabado para emitir etiquetas com lote, fabricação e validade."
                  acao={<BotaoPrimario onClick={() => onNavigate?.('produtos_estoque_cadastro')}>Ir para produtos acabados</BotaoPrimario>}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const dataFabricacaoFormatada = formatarDataBR(dataFabricacao);
  const opSelecionada = lotesOP.find(o => o.id === opSelId);
  // Validade da OP quando o lote veio dela; senão calculada pela ficha técnica
  const validadeFormatada = opSelecionada?.data_validade ? formatarDataBR(opSelecionada.data_validade) : calcValidade();
  const codigoBarrasSimulado = `78989${Math.abs(produto.nome.length * 12345678).toString().padEnd(8, '0')}`;


  return (
    <div className="relative h-full w-full flex flex-col bg-papel-2 text-tinta overflow-hidden">
      {/* Abas antigas: só fora do shell */}
      <ProdutosNavTabs activeTab="produtos_etiqueta" onNavigate={onNavigate} />

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1700px]">
          <CabecalhoPagina
            titulo="Etiquetas"
            resumo="Etiqueta de paletização com lote, fabricação, validade e código de barras"
            acoes={
              <BotaoPrimario onClick={() => window.print()} className="w-full sm:w-auto h-11 sm:h-9">
                <Printer className="w-4 h-4" />
                Imprimir {quantidadeEtiquetas || 0} {Number(quantidadeEtiquetas) === 1 ? 'etiqueta' : 'etiquetas'}
              </BotaoPrimario>
            }
          />

          <div className="px-4 sm:px-6 pb-8 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Configuração */}
            <Painel titulo="Dados da etiqueta" className="lg:col-span-5">
              <div className="space-y-3">
                <Campo rotulo="Produto acabado">
                  <select value={produtoSelId} onChange={(e) => setProdutoSelId(e.target.value)} className={form.select}>
                    {produtos.map(p => (
                      <option key={p.id} value={p.id}>{p.nome} ({p.tipo_embalagem})</option>
                    ))}
                  </select>
                </Campo>

                <Campo rotulo="Lote de ordem de produção concluída">
                  <select value={opSelId} onChange={(e) => aplicarLoteOP(lotesOP.find(o => o.id === e.target.value))} className={form.select}>
                    <option value="">{lotesOP.length > 0 ? 'Lote manual (digitar abaixo)' : 'Nenhuma OP concluída deste produto'}</option>
                    {lotesOP.map(o => (
                      <option key={o.id} value={o.id}>
                        {o.lote} · {o.numero} · fab. {formatarDataBR(o.data_fabricacao)} · val. {formatarDataBR(o.data_validade)} · {o.quantidade_produzida_pacotes} pct
                      </option>
                    ))}
                  </select>
                </Campo>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Campo rotulo="Número do lote">
                    <input type="text" value={lote} onChange={(e) => { setLote(e.target.value); setOpSelId(''); }} className={`${form.campo} tabular-nums`} />
                  </Campo>
                  <Campo rotulo="Data de fabricação">
                    <input type="date" value={dataFabricacao} onChange={(e) => { setDataFabricacao(e.target.value); setOpSelId(''); }} className={form.campo} />
                  </Campo>
                </div>

                <Campo rotulo="Quantidade de etiquetas" ajuda="1 palete padrão de saco 25 kg = 40 sacos (1.000 kg).">
                  <input type="number" inputMode="numeric" min="1" value={quantidadeEtiquetas} onChange={(e) => setQuantidadeEtiquetas(e.target.value)} className={form.campoNumero} />
                </Campo>

                <dl className="rounded-md border border-linha bg-papel-2 divide-y divide-linha text-[13px]">
                  <div className="flex items-baseline justify-between gap-3 px-3 py-2">
                    <dt className="text-cinza">Validade calculada</dt>
                    <dd className="font-bold tabular-nums text-tinta">{validadeFormatada}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 px-3 py-2">
                    <dt className="text-cinza">Peso líquido unitário</dt>
                    <dd className="font-bold tabular-nums text-tinta">{produto.peso_unitario_kg.toLocaleString('pt-BR')} kg</dd>
                  </div>
                </dl>
              </div>
            </Painel>

            {/* Prévia da etiqueta */}
            <section className="lg:col-span-7 rounded-md bg-eno-900/[0.06] border border-linha px-3 py-6 sm:p-8 flex flex-col items-center">
              <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-cinza mb-3">Prévia da etiqueta</div>
              <div className="w-full max-w-md bg-papel border-2 border-tinta rounded-[3px] p-5 sm:p-6 text-tinta space-y-4 shadow-[0_18px_40px_-24px_rgba(4,32,19,0.5)]">
                <div className="text-center border-b-2 border-tinta pb-3">
                  <span className="text-[10px] font-extrabold tracking-[0.2em] uppercase block text-cinza">GRUPO ENO AGROINDUSTRIAL</span>
                  <h2 className="text-[17px] font-extrabold tracking-tight uppercase mt-1 leading-tight">{produto.nome}</h2>
                  <span className="text-[12px] font-bold text-tinta-2 tabular-nums">PESO LÍQUIDO: {produto.peso_unitario_kg} KG</span>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 border-b-2 border-tinta pb-3 tabular-nums">
                  <div>
                    <span className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-cinza block">Lote industrial</span>
                    <strong className="text-[13px] font-extrabold break-all">{lote}</strong>
                  </div>
                  <div>
                    <span className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-cinza block">Registro SIF/MAPA</span>
                    <strong className="text-[13px] font-extrabold">nº 0048/2024</strong>
                  </div>
                  <div>
                    <span className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-cinza block">Fabricação</span>
                    <strong className="text-[13px] font-bold">{dataFabricacaoFormatada}</strong>
                  </div>
                  <div>
                    <span className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-cinza block">Validade (24 meses)</span>
                    <strong className="text-[13px] font-bold">{validadeFormatada}</strong>
                  </div>
                </div>

                <div className="text-[10.5px] text-tinta-2 space-y-0.5 leading-snug">
                  <p><strong>NÃO CONTÉM GLÚTEN.</strong> Produto 100% natural obtido da raiz de mandioca fresca.</p>
                  <p>Conservar em local seco, arejado, sobre estrados e afastado de paredes.</p>
                  <p className="text-[9.5px] text-cinza">Indústria Brasileira • CNPJ 14.285.901/0001-44 • Rod. PR-180 km 12</p>
                </div>

                <div className="pt-1 flex flex-col items-center">
                  <div
                    className="h-12 w-full max-w-64"
                    aria-hidden
                    style={{ background: 'repeating-linear-gradient(90deg, var(--color-tinta) 0 2px, transparent 2px 4px, var(--color-tinta) 4px 5px, transparent 5px 8px, var(--color-tinta) 8px 11px, transparent 11px 12px)' }}
                  />
                  <span className="text-[10.5px] text-tinta-2 tracking-[0.18em] mt-1 tabular-nums">{codigoBarrasSimulado}</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
