import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Receipt,
  Search,
  CheckCircle2,
  DollarSign,
  Truck,
  CreditCard,
  FileCheck,
  Eye,
  AlertCircle,
  X,
  Printer,
  ShieldCheck,
  Check,
  FileUp,
  UploadCloud,
  FileCode,
  Sparkles,
  Package,
  Tag,
  Calendar,
  FileText,
  FileCheck2,
  AlertTriangle
} from 'lucide-react';
import {
  PedidoVenda,
  carregarPedidosVenda,
  salvarPedidosVenda,
  moverPedidoEtapa,
  pacotesDoItem
} from '../../data/pedidosVendaData';
import { verificarDisponibilidadeProduto } from '../../data/produtosData';
import { PedidosNavTabs } from './PedidosNavTabs';
import { CabecalhoPagina, BotaoPrimario, BotaoSecundario } from '../ui/CabecalhoPagina';
import { BarraFiltros, CampoBusca, Segmentado, SeletorFiltro } from '../ui/BarraFiltros';
import { TabelaDados, Th, Td, tabela } from '../ui/TabelaDados';
import { StatusChip } from '../ui/StatusChip';
import { EstadoVazio } from '../ui/EstadoVazio';

interface FaltaEstoqueFaturar {
  produto_id: string;
  produto_nome: string;
  pacotes: number;
  disponivel: number;
  falta: number;
}

// Compara o pedido (em pacotes, por produto) com o estoque de produto acabado
function faltasEstoquePedido(p: PedidoVenda): FaltaEstoqueFaturar[] {
  const porProduto = new Map<string, { nome: string; pacotes: number }>();
  p.itens.forEach(it => {
    const atual = porProduto.get(it.produto_id) || { nome: it.produto_nome, pacotes: 0 };
    atual.pacotes += pacotesDoItem(it);
    porProduto.set(it.produto_id, atual);
  });
  const faltas: FaltaEstoqueFaturar[] = [];
  porProduto.forEach((v, id) => {
    const d = verificarDisponibilidadeProduto(id, v.pacotes);
    if (d.falta > 0) faltas.push({ produto_id: id, produto_nome: v.nome, pacotes: v.pacotes, disponivel: d.disponivel, falta: d.falta });
  });
  return faltas;
}
import { hojeISO, paraISO, formatarDataBR } from '../../lib/datas';

interface Props {
  onNavigate?: (tabId: string) => void;
}

export function PedidosAFaturar({ onNavigate }: Props) {
  const [pedidos, setPedidos] = useState<PedidoVenda[]>([]);
  const [busca, setBusca] = useState('');
  
  // Modal de Detalhes / Conferência do Pedido
  const [modalDetalhes, setModalDetalhes] = useState<PedidoVenda | null>(null);
  
  // Modal de Importar / Guardar Nota Fiscal
  const [modalImportarNf, setModalImportarNf] = useState<PedidoVenda | null>(null);

  // Campos para importação e guarda da Nota Fiscal (XML ou PDF)
  const [numeroNfImport, setNumeroNfImport] = useState('');
  const [serieNfImport, setSerieNfImport] = useState('1');
  const [chaveAcessoImport, setChaveAcessoImport] = useState('');
  const [dataEmissaoImport, setDataEmissaoImport] = useState(new Date().toLocaleDateString('pt-BR'));
  const [valorNfImport, setValorNfImport] = useState('');
  const [nomeArquivoAnexado, setNomeArquivoAnexado] = useState<string | null>(null);
  const [tipoArquivoAnexado, setTipoArquivoAnexado] = useState<'XML' | 'PDF'>('XML');
  const [arquivoConteudo, setArquivoConteudo] = useState<string | null>(null);
  const [observacaoFiscal, setObservacaoFiscal] = useState('');

  // Dados de Transporte e Expedição
  const [placaInput, setPlacaInput] = useState('');
  const [motoristaInput, setMotoristaInput] = useState('');
  const [transportadoraInput, setTransportadoraInput] = useState('');

  const [toastSucesso, setToastSucesso] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const recarregar = () => {
    const todos = carregarPedidosVenda();
    setPedidos(todos.filter(p => p.etapa === 'A_FATURAR'));
  };

  useEffect(() => {
    recarregar();
    const handleUpdate = () => recarregar();
    window.addEventListener('pedidos_venda_updated', handleUpdate);
    window.addEventListener('produtos_updated', handleUpdate);
    return () => {
      window.removeEventListener('pedidos_venda_updated', handleUpdate);
      window.removeEventListener('produtos_updated', handleUpdate);
    };
  }, []);

  // Faltas de estoque de produto acabado por pedido (avisa, não bloqueia)
  const faltasPorPedido = useMemo(() => {
    const mapa = new Map<string, FaltaEstoqueFaturar[]>();
    pedidos.forEach(p => mapa.set(p.id, faltasEstoquePedido(p)));
    return mapa;
  }, [pedidos]);

  // Métricas
  const metricas = useMemo(() => {
    const total = pedidos.length;
    const valorTotal = pedidos.reduce((acc, p) => acc + p.valor_total, 0);
    const volumeTotalKg = pedidos.reduce((acc, p) => acc + p.peso_total_kg, 0);
    const liberados = pedidos.filter(p => p.cliente_status_credito === 'Liberado').length;

    return { total, valorTotal, volumeTotalKg, liberados };
  }, [pedidos]);

  // Filtros
  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter(p => {
      const match =
        p.numero_pedido.toLowerCase().includes(busca.toLowerCase()) ||
        p.cliente_nome.toLowerCase().includes(busca.toLowerCase()) ||
        p.cliente_cnpj_cpf.includes(busca) ||
        (p.lote_producao && p.lote_producao.toLowerCase().includes(busca.toLowerCase())) ||
        p.cliente_cidade_uf.toLowerCase().includes(busca.toLowerCase());
      return match;
    });
  }, [pedidos, busca]);

  // Abrir modal de importação e guarda da Nota Fiscal
  const handleAbrirImportarNf = (p: PedidoVenda) => {
    setModalImportarNf(p);
    const randNum = Math.floor(20000 + Math.random() * 80000);
    setNumeroNfImport(p.nota_fiscal?.numero || String(randNum));
    setSerieNfImport(p.nota_fiscal?.serie || '1');
    setChaveAcessoImport(p.nota_fiscal?.chave_acesso || `35260908849120000109550010000${randNum}1829384756`);
    setDataEmissaoImport(p.nota_fiscal?.data_emissao || new Date().toLocaleDateString('pt-BR'));
    setValorNfImport(p.valor_total.toFixed(2));
    setNomeArquivoAnexado(p.nota_fiscal?.arquivo_anexado || p.nota_fiscal?.nome_arquivo_xml || `NFe_${randNum}.xml`);
    setTipoArquivoAnexado(p.nota_fiscal?.tipo_arquivo || 'XML');
    setArquivoConteudo(p.nota_fiscal?.arquivo_conteudo || null);
    setObservacaoFiscal('');
    setTransportadoraInput(p.transportadora || 'TransVale Logística');
    setPlacaInput(p.placa_veiculo || 'BRA-2E19');
    setMotoristaInput(p.motorista_nome || 'Sebastião Antunes');
  };

  // Upload e leitura real/simulada de arquivo XML ou PDF da Nota Fiscal
  const handleSelecionarArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setNomeArquivoAnexado(file.name);
    const isPdf = file.name.toLowerCase().endsWith('.pdf');
    const isXml = file.name.toLowerCase().endsWith('.xml');
    setTipoArquivoAnexado(isPdf ? 'PDF' : 'XML');

    const reader = new FileReader();

    if (isXml) {
      reader.onload = (ev) => {
        try {
          const text = ev.target?.result as string;
          setArquivoConteudo(text);
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(text, 'text/xml');

          const nNF = xmlDoc.getElementsByTagName('nNF')[0]?.textContent;
          if (nNF) setNumeroNfImport(nNF);

          const serie = xmlDoc.getElementsByTagName('serie')[0]?.textContent;
          if (serie) setSerieNfImport(serie);

          const chNFe = xmlDoc.getElementsByTagName('chNFe')[0]?.textContent ||
                        xmlDoc.querySelector('infNFe')?.getAttribute('Id')?.replace(/^NFe/, '');
          if (chNFe) setChaveAcessoImport(chNFe);

          const dhEmi = xmlDoc.getElementsByTagName('dhEmi')[0]?.textContent ||
                        xmlDoc.getElementsByTagName('dEmi')[0]?.textContent;
          if (dhEmi) {
            const dt = new Date(dhEmi);
            if (!isNaN(dt.getTime())) {
              setDataEmissaoImport(dt.toLocaleDateString('pt-BR'));
            }
          }

          const vNF = xmlDoc.getElementsByTagName('vNF')[0]?.textContent;
          if (vNF) setValorNfImport(parseFloat(vNF).toFixed(2));
        } catch (err) {
          console.warn('Leitura do XML da NF:', err);
        }
      };
      reader.readAsText(file);
    } else {
      // PDF ou outro formato
      reader.onload = (ev) => {
        setArquivoConteudo(ev.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Tenta inferir número da nota do nome do arquivo se contiver dígitos
      const matches = file.name.match(/\d{4,8}/);
      if (matches) {
        setNumeroNfImport(matches[0]);
        setChaveAcessoImport(`35260908849120000109550010000${matches[0].padStart(8, '0')}1982348571`);
      }
    }
  };

  // Confirmar Importação e Guarda da Nota Fiscal
  const handleConfirmarGuardaNf = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalImportarNf) return;

    if (!numeroNfImport.trim()) {
      alert('Informe o Número da Nota Fiscal.');
      return;
    }
    if (!chaveAcessoImport.trim()) {
      alert('Informe a Chave de Acesso da NF-e (44 dígitos).');
      return;
    }

    // Aviso de estoque insuficiente: avisa e deixa seguir
    const faltas = faltasEstoquePedido(modalImportarNf);
    if (faltas.length > 0) {
      const lista = faltas.map(f => `• ${f.produto_nome}: pedido ${f.pacotes} pct, estoque ${f.disponivel} pct (faltam ${f.falta} pct)`).join('\n');
      if (!confirm(`Atenção: o estoque de produto acabado não cobre este pedido.\n\n${lista}\n\nO estoque desses produtos ficará zerado. Faturar mesmo assim?`)) return;
    }

    const valorFinal = parseFloat(valorNfImport) || modalImportarNf.valor_total;
    // Data de faturamento sempre AAAA-MM-DD (aceita a data digitada em DD/MM/AAAA)
    const dataFaturamento = paraISO(dataEmissaoImport) || hojeISO();

    moverPedidoEtapa(modalImportarNf.id, 'FATURADO', {
      nota_fiscal: {
        numero: numeroNfImport.trim(),
        serie: serieNfImport.trim() || '1',
        chave_acesso: chaveAcessoImport.trim(),
        data_emissao: dataFaturamento,
        xml_importado: true,
        nome_arquivo_xml: nomeArquivoAnexado || undefined,
        arquivo_anexado: nomeArquivoAnexado || `NF_${numeroNfImport}.xml`,
        tipo_arquivo: tipoArquivoAnexado,
        arquivo_conteudo: arquivoConteudo || undefined,
        valor_nota: valorFinal,
        observacao_fiscal: observacaoFiscal || undefined
      },
      data_faturamento: dataFaturamento,
      valor_faturado: valorFinal,
      saldo_a_faturar: 0,
      placa_veiculo: placaInput || modalImportarNf.placa_veiculo,
      motorista_nome: motoristaInput || modalImportarNf.motorista_nome,
      transportadora: transportadoraInput || modalImportarNf.transportadora
    });

    const msg = `Nota Fiscal nº ${numeroNfImport} importada e guardada com sucesso! Pedido transferido para Faturados / Expedição.`;
    setToastSucesso(msg);
    setTimeout(() => setToastSucesso(null), 4000);
    setModalImportarNf(null);
    if (onNavigate) onNavigate('pedidos_faturados');
  };

  const moeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const toneladas = (kg: number) => `${(kg / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} t`;

  return (
    <div className="relative h-full w-full flex flex-col bg-papel-2 text-tinta overflow-hidden">

      {/* Abas antigas do fluxo: só fora do shell */}
      <PedidosNavTabs activeTab="pedidos_a_faturar" onNavigate={onNavigate} />

      <div className="mx-auto w-full max-w-[1700px]">
        <CabecalhoPagina
          titulo="A faturar"
          resumo={
            metricas.total === 0
              ? 'Nenhuma carga pronta para faturar.'
              : `${metricas.total} ${metricas.total === 1 ? 'carga pronta' : 'cargas prontas'} · ${moeda(metricas.valorTotal)} · ${toneladas(metricas.volumeTotalKg)} · ${metricas.liberados} com crédito liberado`
          }
        >
          <p className="mt-2 text-[12px] text-cinza max-w-3xl">
            A NF-e é emitida fora do sistema. Em cada carga, use <strong className="text-tinta-2">Importar NF</strong> para guardar o XML/PDF e a chave de acesso; o pedido passa para Faturados.
          </p>
        </CabecalhoPagina>

        {toastSucesso && (
          <div className="mx-4 sm:mx-6 mb-3 px-3 py-2.5 bg-st-pago-bg rounded-md text-st-pago text-[12.5px] font-semibold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastSucesso}</span>
          </div>
        )}

        <BarraFiltros>
          <CampoBusca valor={busca} onChange={setBusca} placeholder="Buscar pedido, lote, cliente ou CNPJ" className="w-full md:w-80" />
        </BarraFiltros>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1700px] px-4 sm:px-6 pb-6">
          {pedidosFiltrados.length === 0 ? (
            <div className="bg-papel border border-linha rounded-md">
              <EstadoVazio
                titulo={pedidos.length === 0 ? 'Nenhuma carga a faturar' : 'Nada encontrado'}
                texto={
                  pedidos.length === 0
                    ? 'Pedidos chegam aqui quando a produção conclui o lote. Acompanhe o andamento em Em produção.'
                    : 'Confira o número do pedido, o lote ou o nome do cliente.'
                }
                acao={
                  pedidos.length === 0 && onNavigate ? (
                    <BotaoSecundario onClick={() => onNavigate('pedidos_em_producao')}>Ver em produção</BotaoSecundario>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <>
              {/* Celular: cartões */}
              <ul className="sm:hidden bg-papel border border-linha rounded-md">
                {pedidosFiltrados.map(item => {
                  const faltas = faltasPorPedido.get(item.id) || [];
                  return (
                    <li key={item.id} className="px-3.5 py-3 border-b border-linha last:border-b-0">
                      <button type="button" onClick={() => setModalDetalhes(item)} className="w-full text-left">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-[11.5px] text-cinza tabular-nums">
                              {item.numero_pedido} · Lote {item.lote_producao || 'padrão'}
                            </div>
                            <div className="text-[14px] font-bold text-tinta truncate">{item.cliente_nome}</div>
                            <div className="text-[11.5px] text-cinza truncate">{item.cliente_cidade_uf}</div>
                          </div>
                          {faltas.length > 0 ? (
                            <StatusChip tom="vencido" className="shrink-0">Estoque não cobre</StatusChip>
                          ) : (
                            <StatusChip tom="aguardando" className="shrink-0">Sem NF-e</StatusChip>
                          )}
                        </div>
                        <div className="flex items-end justify-between mt-2">
                          <span className="text-[11.5px] text-cinza tabular-nums">{toneladas(item.peso_total_kg)} · {item.prazo_pagamento}</span>
                          <span className="text-[17px] font-extrabold tracking-[-0.01em] tabular-nums text-tinta">{moeda(item.valor_total)}</span>
                        </div>
                      </button>
                      <div className="flex gap-2 mt-2.5">
                        <button
                          type="button"
                          onClick={() => handleAbrirImportarNf(item)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-md bg-eno-800 text-white text-[12.5px] font-semibold"
                        >
                          <FileUp className="w-3.5 h-3.5" /> Importar NF
                        </button>
                        <button
                          type="button"
                          onClick={() => setModalDetalhes(item)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-md border border-linha-forte text-tinta-2 text-[12.5px] font-semibold active:bg-papel-3"
                        >
                          <Eye className="w-3.5 h-3.5" /> Detalhes
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {/* A partir de sm: tabela densa */}
              <TabelaDados className="hidden sm:block">
                <thead className={tabela.thead}>
                  <tr>
                    <Th>Pedido</Th>
                    <Th>Cliente</Th>
                    <Th>Itens</Th>
                    <Th>Lote</Th>
                    <Th>NF-e</Th>
                    <Th numero>Valor</Th>
                    <Th className="text-right">Ações</Th>
                  </tr>
                </thead>
                <tbody>
                  {pedidosFiltrados.map(item => {
                    const itensResumo = item.itens.map(i => `${i.quantidade}x ${i.tipo_embalagem}`).join(' + ');
                    const faltas = faltasPorPedido.get(item.id) || [];
                    return (
                      <tr key={item.id} onClick={() => setModalDetalhes(item)} className={`${tabela.tr} cursor-pointer group`}>
                        <Td>
                          <div className="font-semibold text-tinta tabular-nums whitespace-nowrap group-hover:text-eno-700">{item.numero_pedido}</div>
                          <div className="text-[11.5px] text-cinza tabular-nums">{formatarDataBR(item.data_emissao)}</div>
                          {faltas.length > 0 && (
                            <div
                              className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-st-vencido"
                              title={faltas.map(f => `${f.produto_nome}: faltam ${f.falta} pct`).join(' | ')}
                            >
                              <AlertTriangle className="w-3 h-3" /> Estoque não cobre
                            </div>
                          )}
                        </Td>
                        <Td className="max-w-[260px]">
                          <div className="font-semibold text-tinta truncate">{item.cliente_nome}</div>
                          <div className="text-[11.5px] text-cinza truncate">{item.cliente_cidade_uf}</div>
                        </Td>
                        <Td className="max-w-[240px]">
                          <div className="truncate" title={itensResumo}>{itensResumo}</div>
                          <div className="text-[11.5px] text-cinza tabular-nums">{item.peso_total_kg.toLocaleString('pt-BR')} kg</div>
                        </Td>
                        <Td className="whitespace-nowrap tabular-nums">
                          <div className="font-semibold text-tinta">{item.lote_producao || 'Lote padrão'}</div>
                          <div className="text-[11.5px] text-cinza">Venc. {item.data_vencimento ? formatarDataBR(item.data_vencimento) : '2 anos'}</div>
                        </Td>
                        <Td className="whitespace-nowrap">
                          <StatusChip tom="aguardando">Aguardando importação</StatusChip>
                        </Td>
                        <Td numero>
                          <div className="font-bold text-tinta text-[13.5px]">{moeda(item.valor_total)}</div>
                          <div className="text-[11.5px] text-cinza font-normal">{item.prazo_pagamento}</div>
                        </Td>
                        <Td className="text-right">
                          <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleAbrirImportarNf(item)}
                              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-[5px] bg-eno-800 hover:bg-eno-900 text-white text-[12px] font-semibold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ouro"
                              title="Importar e guardar a nota fiscal (XML ou PDF)"
                            >
                              <FileUp className="w-3.5 h-3.5" /> Importar NF
                            </button>
                            <button
                              type="button"
                              onClick={() => setModalDetalhes(item)}
                              className="inline-flex items-center gap-1 h-7 px-2 rounded-[5px] text-tinta-2 hover:bg-papel-3 text-[12px] font-semibold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ouro"
                            >
                              <Eye className="w-3.5 h-3.5" /> Ver
                            </button>
                          </div>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </TabelaDados>
            </>
          )}
        </div>
      </div>

      {/* 6. MODAL IMPORTAR E GUARDAR NOTA FISCAL (SEM CONEXÃO SEFAZ) */}
      {modalImportarNf && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 backdrop-blur-xs p-0 sm:p-6 flex justify-center items-stretch sm:items-start animate-fadeIn">
          <div className="max-sm:[&_input:not([type=checkbox]):not([type=radio]):not([type=file])]:min-h-11 max-sm:[&_input]:text-base max-sm:[&_select]:min-h-11 max-sm:[&_select]:text-base max-sm:[&_textarea]:text-base relative w-full max-w-4xl bg-papel rounded-none sm:rounded-md shadow-2xl overflow-hidden border-0 sm:border border-linha flex flex-col sm:my-auto h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[calc(100vh-3.5rem)]">
            
            {/* Topo do Modal */}
            <div className="bg-eno-900 text-white px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between border-b border-eno-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <FileUp className="w-5 h-5 text-ouro-claro" />
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">
                    Importar e Guardar Nota Fiscal Emitida
                  </h3>
                  <p className="text-[11px] text-cinza">
                    Vincule o arquivo XML ou PDF da NF emitida externamente ao pedido {modalImportarNf.numero_pedido}.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalImportarNf(null)}
                className="inline-flex items-center justify-center w-10 h-10 -mr-2 shrink-0 rounded-md hover:bg-eno-800 text-eno-100 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmarGuardaNf} className="p-4 sm:p-6 space-y-5 text-xs overflow-y-auto flex-1">

              {/* Aviso de estoque de produto acabado insuficiente */}
              {(() => {
                const faltas = faltasEstoquePedido(modalImportarNf);
                if (faltas.length === 0) return null;
                return (
                  <div className="p-3 bg-st-vencido-bg border border-st-vencido/30 rounded-md text-st-vencido space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-st-vencido" />
                      <span>Estoque de produto acabado não cobre este pedido (é possível faturar mesmo assim)</span>
                    </div>
                    {faltas.map(f => (
                      <div key={f.produto_id} className="text-[11px] tabular-nums">
                        {f.produto_nome}: pedido {f.pacotes} pct · estoque {f.disponivel} pct · <strong>faltam {f.falta} pct</strong>
                      </div>
                    ))}
                  </div>
                );
              })()}
              
              {/* Aviso explicativo */}
              <div className="p-3 bg-papel-2 border border-linha rounded-md text-tinta-2 flex items-start gap-2.5">
                <FileCheck2 className="w-4 h-4 text-eno-700 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <strong>Armazenamento Fiscal:</strong> Como o faturamento oficial é processado no software emissor da empresa, anexe o arquivo (XML/PDF) e registre os números fiscais abaixo para arquivamento e rastreabilidade da carga na expedição.
                </div>
              </div>

              {/* ÁREA DE ANEXO DE ARQUIVO (XML OU PDF) */}
              <div className="p-4 bg-eno-50/50 rounded-md border-2 border-dashed border-eno-100 text-center space-y-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".xml,.pdf"
                  onChange={handleSelecionarArquivo}
                  className="hidden"
                />

                <UploadCloud className="w-8 h-8 text-eno-700 mx-auto" />
                <div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-papel border border-eno-600 text-eno-800 rounded-md font-bold text-xs hover:bg-eno-50 transition-colors shadow-2xs cursor-pointer"
                  >
                    Selecionar Arquivo da Nota Fiscal (XML ou PDF)
                  </button>
                  <p className="text-[10px] text-cinza mt-1">
                    Formatos aceitos: .xml (NF-e oficial) ou .pdf (DANFE gerado)
                  </p>
                </div>

                {nomeArquivoAnexado && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-papel border border-eno-600 text-eno-800 tabular-nums font-bold text-xs">
                    {tipoArquivoAnexado === 'PDF' ? (
                      <FileText className="w-4 h-4 text-st-vencido" />
                    ) : (
                      <FileCode className="w-4 h-4 text-eno-700" />
                    )}
                    <span>{nomeArquivoAnexado}</span>
                    <span className="text-[10px] text-eno-700 font-sans font-normal">(Pronto p/ guardar)</span>
                  </div>
                )}
              </div>

              {/* CAMPOS FISCAIS CONFERIDOS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-tinta-2 mb-1">
                    Número da Nota Fiscal *
                  </label>
                  <input
                    type="text"
                    required
                    value={numeroNfImport}
                    onChange={(e) => setNumeroNfImport(e.target.value)}
                    placeholder="Ex: 24589"
                    className="w-full bg-papel-2 border border-linha-forte rounded-lg px-3 py-2 tabular-nums font-bold text-tinta focus:outline-none focus:border-eno-700"
                  />
                </div>

                <div>
                  <label className="block font-bold text-tinta-2 mb-1">
                    Série da NF *
                  </label>
                  <input
                    type="text"
                    required
                    value={serieNfImport}
                    onChange={(e) => setSerieNfImport(e.target.value)}
                    placeholder="Ex: 1"
                    className="w-full bg-papel-2 border border-linha-forte rounded-lg px-3 py-2 tabular-nums font-bold text-tinta focus:outline-none focus:border-eno-700"
                  />
                </div>

                <div>
                  <label className="block font-bold text-tinta-2 mb-1">
                    Data de Emissão da NF
                  </label>
                  <input
                    type="text"
                    value={dataEmissaoImport}
                    onChange={(e) => setDataEmissaoImport(e.target.value)}
                    className="w-full bg-papel-2 border border-linha-forte rounded-lg px-3 py-2 tabular-nums text-tinta focus:outline-none focus:border-eno-700"
                  />
                </div>
              </div>

              {/* CHAVE DE ACESSO (44 DÍGITOS) */}
              <div>
                <label className="block font-bold text-tinta-2 mb-1">
                  Chave de Acesso da NF-e (44 Dígitos) *
                </label>
                <input
                  type="text"
                  required
                  maxLength={44}
                  value={chaveAcessoImport}
                  onChange={(e) => setChaveAcessoImport(e.target.value.replace(/\s+/g, ''))}
                  placeholder="Ex: 35260908849120000109550010000245891829384756"
                  className="w-full bg-papel-2 border border-linha-forte rounded-lg px-3 py-2 tabular-nums font-bold text-xs text-tinta focus:outline-none focus:border-eno-700 tracking-wider"
                />
                <span className="text-[10px] text-cinza tabular-nums mt-0.5 block">
                  Tamanho: {chaveAcessoImport.length} de 44 caracteres
                </span>
              </div>

              {/* DADOS DE TRANSPORTE & LOGÍSTICA */}
              <div className="p-4 bg-papel-2 rounded-md border border-linha space-y-3">
                <span className="font-bold text-tinta uppercase tracking-wider text-xs block">
                  Transporte & Expedição da Carga
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-tinta-2 mb-1">Transportadora</label>
                    <input
                      type="text"
                      value={transportadoraInput}
                      onChange={(e) => setTransportadoraInput(e.target.value)}
                      placeholder="Ex: TransVale Logística"
                      className="w-full bg-papel border border-linha-forte rounded-lg px-3 py-2 text-tinta font-medium focus:outline-none focus:border-eno-700"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-tinta-2 mb-1">Placa do Veículo</label>
                    <input
                      type="text"
                      value={placaInput}
                      onChange={(e) => setPlacaInput(e.target.value.toUpperCase())}
                      placeholder="Ex: BRA-2E19"
                      className="w-full bg-papel border border-linha-forte rounded-lg px-3 py-2 tabular-nums font-bold uppercase text-tinta focus:outline-none focus:border-eno-700"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-tinta-2 mb-1">Motorista</label>
                    <input
                      type="text"
                      value={motoristaInput}
                      onChange={(e) => setMotoristaInput(e.target.value)}
                      placeholder="Ex: Sebastião Antunes"
                      className="w-full bg-papel border border-linha-forte rounded-lg px-3 py-2 text-tinta font-medium focus:outline-none focus:border-eno-700"
                    />
                  </div>
                </div>
              </div>

              {/* Resumo Financeiro */}
              <div className="flex items-center justify-between p-3.5 bg-eno-950/[0.04] border border-eno-700/20 rounded-md">
                <div>
                  <span className="text-[10px] font-bold text-cinza uppercase tracking-wider block">
                    Valor Total da Nota Fiscal
                  </span>
                  <span className="tabular-nums text-base font-extrabold text-eno-800">
                    {modalImportarNf.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-cinza uppercase tracking-wider block">
                    Lote Vinculado
                  </span>
                  <span className="tabular-nums text-xs font-bold text-tinta">
                    {modalImportarNf.lote_producao || 'LOT-2026-PADRAO'} • Venc: {modalImportarNf.data_vencimento ? formatarDataBR(modalImportarNf.data_vencimento) : '2 anos'}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-linha flex items-center justify-end gap-3 max-sm:sticky max-sm:-bottom-4 max-sm:z-10 max-sm:-mx-4 max-sm:-mb-4 max-sm:px-4 max-sm:pb-4 max-sm:bg-papel max-sm:[&>button]:flex-1 max-sm:[&>button]:justify-center max-sm:[&>button]:min-h-11">
                <button
                  type="button"
                  onClick={() => setModalImportarNf(null)}
                  className="px-5 py-2.5 rounded-md bg-papel-3/60 hover:bg-linha text-tinta-2 font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-md bg-eno-900 hover:bg-eno-950 text-white font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm hover:shadow"
                >
                  <FileCheck className="w-4 h-4 stroke-[2.5]" />
                  <span>Guardar NF e Concluir Faturamento</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL DETALHES DO PEDIDO A FATURAR */}
      {modalDetalhes && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 backdrop-blur-xs p-0 sm:p-6 flex justify-center items-stretch sm:items-start animate-fadeIn">
          <div className="max-sm:[&_input:not([type=checkbox]):not([type=radio]):not([type=file])]:min-h-11 max-sm:[&_input]:text-base max-sm:[&_select]:min-h-11 max-sm:[&_select]:text-base max-sm:[&_textarea]:text-base relative w-full max-w-3xl bg-papel rounded-none sm:rounded-md shadow-2xl overflow-hidden border-0 sm:border border-linha flex flex-col sm:my-auto h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[calc(100vh-3.5rem)]">
            <div className="bg-eno-900 text-white px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between border-b border-eno-800 shrink-0">
              <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-ouro-claro" />
                <span>Conferência da Carga - Pedido {modalDetalhes.numero_pedido}</span>
              </h3>
              <button
                onClick={() => setModalDetalhes(null)}
                className="inline-flex items-center justify-center w-10 h-10 -mr-2 shrink-0 rounded-md hover:bg-eno-800 text-eno-100 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4 p-3 bg-papel-2 rounded-md border border-linha">
                <div>
                  <span className="text-cinza block font-medium">Cliente:</span>
                  <strong className="text-tinta text-sm">{modalDetalhes.cliente_nome}</strong>
                  <div className="text-cinza tabular-nums mt-0.5">{modalDetalhes.cliente_cnpj_cpf}</div>
                  <div className="text-cinza">{modalDetalhes.cliente_cidade_uf}</div>
                </div>
                <div className="text-right">
                  <span className="text-cinza block font-medium">Rastreabilidade da Fábrica:</span>
                  <div className="tabular-nums font-bold text-eno-800 text-xs">
                    Lote: {modalDetalhes.lote_producao || 'Lote Padrão'}
                  </div>
                  <div className="text-tinta-2 mt-0.5">
                    Vencimento: {modalDetalhes.data_vencimento ? formatarDataBR(modalDetalhes.data_vencimento) : '2 anos'}
                  </div>
                  <div className="text-cinza">
                    Frete: {modalDetalhes.tipo_frete}
                  </div>
                </div>
              </div>

              {/* Tabela de Produtos */}
              <div className="border border-linha rounded-md overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-papel-3/60 text-[10px] font-bold uppercase text-tinta-2 border-b border-linha">
                    <tr>
                      <th className="py-2.5 px-3">Produto</th>
                      <th className="py-2.5 px-3 text-center">Embalagem</th>
                      <th className="py-2.5 px-3 text-center">Quantidade</th>
                      <th className="py-2.5 px-3 text-right">Unitário</th>
                      <th className="py-2.5 px-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-linha tabular-nums text-xs">
                    {modalDetalhes.itens.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 px-3 font-sans font-semibold text-tinta">{it.produto_nome}</td>
                        <td className="py-2.5 px-3 text-center font-sans text-tinta-2">{it.tipo_embalagem}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-tinta">{it.quantidade}</td>
                        <td className="py-2.5 px-3 text-right text-tinta-2">
                          {it.preco_unitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-tinta">
                          {it.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-eno-950/[0.04] border border-eno-700/20 rounded-md">
                <div>
                  <span className="text-[10px] font-bold text-cinza uppercase tracking-wider block">Peso Total</span>
                  <span className="tabular-nums text-xs font-bold text-tinta">
                    {(modalDetalhes.peso_total_kg / 1000).toFixed(2)} Ton ({modalDetalhes.peso_total_kg.toLocaleString('pt-BR')} kg)
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-cinza uppercase tracking-wider block">Total Geral</span>
                  <span className="tabular-nums text-base font-extrabold text-eno-800">
                    {modalDetalhes.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-papel-2 border-t border-linha flex items-center justify-between shrink-0 gap-2 max-sm:[&>button]:flex-1 max-sm:[&>button]:justify-center max-sm:[&>button]:min-h-11">
              <button
                onClick={() => setModalDetalhes(null)}
                className="px-4 py-2 rounded-lg bg-papel-3/60 hover:bg-linha text-tinta-2 font-bold text-xs cursor-pointer"
              >
                Fechar
              </button>

              <button
                onClick={() => {
                  const p = modalDetalhes;
                  setModalDetalhes(null);
                  handleAbrirImportarNf(p);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-eno-900 hover:bg-eno-950 text-white font-bold text-xs shadow-xs cursor-pointer"
              >
                <FileUp className="w-4 h-4" />
                <span>Importar / Guardar NF deste Pedido</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
