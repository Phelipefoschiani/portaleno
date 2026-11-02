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
import { hojeISO, paraISO } from '../../lib/datas';

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

  return (
    <div className="relative h-full w-full flex flex-col bg-[#f8faf8] text-slate-800 overflow-hidden">
      
      {/* 1. NAVEGAÇÃO DE ESTEIRA UNIFICADA */}
      <PedidosNavTabs activeTab="pedidos_a_faturar" onNavigate={onNavigate} />

      {/* 2. CABEÇALHO COMPACTO & MINIMALISTA */}
      <div className="bg-white border-b border-slate-200/80 px-6 py-3.5 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>A Faturar</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-mono">
                {metricas.total} cargas prontas
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {pedidos.length > 0 && (
              <button
                onClick={() => handleAbrirImportarNf(pedidos[0])}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                title="Importar e arquivar arquivo XML ou PDF de Nota Fiscal externa"
              >
                <FileUp className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Importar / Guardar NF</span>
              </button>
            )}
          </div>
        </div>

        {/* STAT BAR MINIMALISTA EM LINHA */}
        <div className="flex flex-wrap items-center gap-6 pt-3 mt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Saldo a Faturar:</span>
            <span className="font-mono font-bold text-emerald-900 text-sm">
              {metricas.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
          <div className="w-px h-4 bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Cargas no Pátio:</span>
            <span className="font-mono font-bold text-slate-900">
              {metricas.total} pedidos
            </span>
          </div>
          <div className="w-px h-4 bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Peso Físico:</span>
            <span className="font-mono font-bold text-slate-900">
              {(metricas.volumeTotalKg / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} Ton
            </span>
          </div>
          <div className="w-px h-4 bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Crédito Aprovado:</span>
            <span className="font-mono font-bold text-emerald-700">
              {metricas.liberados} pedidos liberados
            </span>
          </div>
        </div>
      </div>

      {toastSucesso && (
        <div className="mx-6 mt-3 p-3 bg-emerald-100 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{toastSucesso}</span>
        </div>
      )}

      {/* 3. AVISO INFORMATIVO SEFAZ EXTERNA */}
      <div className="mx-6 mt-3 p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-blue-900 text-xs flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <FileCheck2 className="w-4 h-4 text-blue-700 shrink-0" />
          <span>
            <strong>Fluxo sem conexão SEFAZ:</strong> As notas fiscais são emitidas externamente. Clique em <strong>Importar / Guardar NF</strong> em cada pedido para anexar o arquivo XML/PDF e registrar a chave de acesso.
          </span>
        </div>
      </div>

      {/* 4. BARRA DE BUSCA */}
      <div className="bg-[#f1f5f2] px-6 py-2.5 mt-3 border-b border-slate-200/80 flex items-center justify-between gap-3 shrink-0">
        <div className="flex-1 min-w-[260px] max-w-sm relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por Pedido, Lote, Cliente, CNPJ..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-700 font-medium"
          />
        </div>
      </div>

      {/* 5. TABELA DE CARGAS A FATURAR */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 text-slate-500 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-5">Pedido & Rastreabilidade</th>
                <th className="py-3 px-4">Destinatário / Praça</th>
                <th className="py-3 px-4">Produtos / Peso</th>
                <th className="py-3 px-4">Valor Faturável</th>
                <th className="py-3 px-4">Lote & Vencimento</th>
                <th className="py-3 px-4">Nota Fiscal Externa</th>
                <th className="py-3 px-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {pedidosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                    Nenhuma carga aguardando faturamento. Todos os pedidos faturados.
                  </td>
                </tr>
              ) : (
                pedidosFiltrados.map((item) => {
                  const itensResumo = item.itens.map(i => `${i.quantidade}x ${i.tipo_embalagem}`).join(' + ');

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="font-mono font-bold text-slate-900">
                          {item.numero_pedido}
                        </div>
                        {(faltasPorPedido.get(item.id) || []).length > 0 && (
                          <div
                            className="text-[10px] text-red-700 font-bold flex items-center gap-1"
                            title={(faltasPorPedido.get(item.id) || []).map(f => `${f.produto_nome}: faltam ${f.falta} pct`).join(' | ')}
                          >
                            <AlertTriangle className="w-3 h-3 text-red-600" />
                            <span>Estoque não cobre</span>
                          </div>
                        )}
                        <div className="text-[11px] text-slate-400 font-mono">
                          {item.data_emissao.split('-').reverse().join('/')}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{item.cliente_nome}</div>
                        <div className="text-[11px] text-slate-400">{item.cliente_cidade_uf}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800 truncate max-w-xs" title={itensResumo}>
                          {itensResumo}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {(item.peso_total_kg / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} Ton ({item.peso_total_kg.toLocaleString('pt-BR')} kg)
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-950">
                        {item.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        <div className="text-[10px] text-slate-400 font-normal font-sans">
                          {item.prazo_pagamento}
                        </div>
                      </td>

                      {/* Lote & Vencimento (vindos da Produção) */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-200 text-[11px] font-bold">
                          <Tag className="w-3 h-3 text-emerald-700" />
                          <span>{item.lote_producao || 'Lote Padrão'}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Venc: {item.data_vencimento || '2 anos'}
                        </div>
                      </td>

                      {/* Status da NF */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <UploadCloud className="w-3.5 h-3.5 text-amber-600" />
                          <span>Aguardando Importação</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Ver Detalhes */}
                          <button
                            onClick={() => setModalDetalhes(item)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                            title="Ver detalhes da carga"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* BOTÃO PRINCIPAL: IMPORTAR / GUARDAR NF */}
                          <button
                            onClick={() => handleAbrirImportarNf(item)}
                            className="
                              inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg
                              bg-emerald-900 hover:bg-emerald-950 text-white font-bold text-xs
                              shadow-2xs transition-colors cursor-pointer
                            "
                            title="Importar e Guardar Nota Fiscal (XML ou PDF)"
                          >
                            <FileUp className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Importar NF</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. MODAL IMPORTAR E GUARDAR NOTA FISCAL (SEM CONEXÃO SEFAZ) */}
      {modalImportarNf && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 backdrop-blur-xs p-3 sm:p-6 flex justify-center items-start animate-fadeIn">
          <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col my-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)]">
            
            {/* Topo do Modal */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <FileUp className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">
                    Importar e Guardar Nota Fiscal Emitida
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Vincule o arquivo XML ou PDF da NF emitida externamente ao pedido {modalImportarNf.numero_pedido}.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalImportarNf(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmarGuardaNf} className="p-6 space-y-5 text-xs overflow-y-auto flex-1">

              {/* Aviso de estoque de produto acabado insuficiente */}
              {(() => {
                const faltas = faltasEstoquePedido(modalImportarNf);
                if (faltas.length === 0) return null;
                return (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <span>Estoque de produto acabado não cobre este pedido (é possível faturar mesmo assim)</span>
                    </div>
                    {faltas.map(f => (
                      <div key={f.produto_id} className="text-[11px] font-mono">
                        {f.produto_nome}: pedido {f.pacotes} pct · estoque {f.disponivel} pct · <strong>faltam {f.falta} pct</strong>
                      </div>
                    ))}
                  </div>
                );
              })()}
              
              {/* Aviso explicativo */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 flex items-start gap-2.5">
                <FileCheck2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <strong>Armazenamento Fiscal:</strong> Como o faturamento oficial é processado no software emissor da empresa, anexe o arquivo (XML/PDF) e registre os números fiscais abaixo para arquivamento e rastreabilidade da carga na expedição.
                </div>
              </div>

              {/* ÁREA DE ANEXO DE ARQUIVO (XML OU PDF) */}
              <div className="p-4 bg-emerald-50/50 rounded-2xl border-2 border-dashed border-emerald-300 text-center space-y-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".xml,.pdf"
                  onChange={handleSelecionarArquivo}
                  className="hidden"
                />

                <UploadCloud className="w-8 h-8 text-emerald-700 mx-auto" />
                <div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-white border border-emerald-600 text-emerald-900 rounded-xl font-bold text-xs hover:bg-emerald-50 transition-colors shadow-2xs cursor-pointer"
                  >
                    Selecionar Arquivo da Nota Fiscal (XML ou PDF)
                  </button>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Formatos aceitos: .xml (NF-e oficial) ou .pdf (DANFE gerado)
                  </p>
                </div>

                {nomeArquivoAnexado && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-emerald-400 text-emerald-950 font-mono font-bold text-xs">
                    {tipoArquivoAnexado === 'PDF' ? (
                      <FileText className="w-4 h-4 text-red-600" />
                    ) : (
                      <FileCode className="w-4 h-4 text-emerald-700" />
                    )}
                    <span>{nomeArquivoAnexado}</span>
                    <span className="text-[10px] text-emerald-700 font-sans font-normal">(Pronto p/ guardar)</span>
                  </div>
                )}
              </div>

              {/* CAMPOS FISCAIS CONFERIDOS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Número da Nota Fiscal *
                  </label>
                  <input
                    type="text"
                    required
                    value={numeroNfImport}
                    onChange={(e) => setNumeroNfImport(e.target.value)}
                    placeholder="Ex: 24589"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-700"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Série da NF *
                  </label>
                  <input
                    type="text"
                    required
                    value={serieNfImport}
                    onChange={(e) => setSerieNfImport(e.target.value)}
                    placeholder="Ex: 1"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-700"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Data de Emissão da NF
                  </label>
                  <input
                    type="text"
                    value={dataEmissaoImport}
                    onChange={(e) => setDataEmissaoImport(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono text-slate-800 focus:outline-none focus:border-emerald-700"
                  />
                </div>
              </div>

              {/* CHAVE DE ACESSO (44 DÍGITOS) */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Chave de Acesso da NF-e (44 Dígitos) *
                </label>
                <input
                  type="text"
                  required
                  maxLength={44}
                  value={chaveAcessoImport}
                  onChange={(e) => setChaveAcessoImport(e.target.value.replace(/\s+/g, ''))}
                  placeholder="Ex: 35260908849120000109550010000245891829384756"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono font-bold text-xs text-slate-900 focus:outline-none focus:border-emerald-700 tracking-wider"
                />
                <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                  Tamanho: {chaveAcessoImport.length} de 44 caracteres
                </span>
              </div>

              {/* DADOS DE TRANSPORTE & LOGÍSTICA */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <span className="font-bold text-slate-800 uppercase tracking-wider text-xs block">
                  Transporte & Expedição da Carga
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Transportadora</label>
                    <input
                      type="text"
                      value={transportadoraInput}
                      onChange={(e) => setTransportadoraInput(e.target.value)}
                      placeholder="Ex: TransVale Logística"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-emerald-700"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Placa do Veículo</label>
                    <input
                      type="text"
                      value={placaInput}
                      onChange={(e) => setPlacaInput(e.target.value.toUpperCase())}
                      placeholder="Ex: BRA-2E19"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-mono font-bold uppercase text-slate-800 focus:outline-none focus:border-emerald-700"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Motorista</label>
                    <input
                      type="text"
                      value={motoristaInput}
                      onChange={(e) => setMotoristaInput(e.target.value)}
                      placeholder="Ex: Sebastião Antunes"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-emerald-700"
                    />
                  </div>
                </div>
              </div>

              {/* Resumo Financeiro */}
              <div className="flex items-center justify-between p-3.5 bg-emerald-950/[0.04] border border-emerald-900/20 rounded-xl">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Valor Total da Nota Fiscal
                  </span>
                  <span className="font-mono text-base font-black text-emerald-950">
                    {modalImportarNf.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Lote Vinculado
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-800">
                    {modalImportarNf.lote_producao || 'LOT-2026-PADRAO'} • Venc: {modalImportarNf.data_vencimento || '2 anos'}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalImportarNf(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-900 hover:bg-emerald-950 text-white font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm hover:shadow"
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
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 backdrop-blur-xs p-3 sm:p-6 flex justify-center items-start animate-fadeIn">
          <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col my-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)]">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
              <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                <span>Conferência da Carga - Pedido {modalDetalhes.numero_pedido}</span>
              </h3>
              <button
                onClick={() => setModalDetalhes(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block font-medium">Cliente:</span>
                  <strong className="text-slate-900 text-sm">{modalDetalhes.cliente_nome}</strong>
                  <div className="text-slate-500 font-mono mt-0.5">{modalDetalhes.cliente_cnpj_cpf}</div>
                  <div className="text-slate-500">{modalDetalhes.cliente_cidade_uf}</div>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block font-medium">Rastreabilidade da Fábrica:</span>
                  <div className="font-mono font-bold text-emerald-900 text-xs">
                    Lote: {modalDetalhes.lote_producao || 'Lote Padrão'}
                  </div>
                  <div className="text-slate-600 mt-0.5">
                    Vencimento: {modalDetalhes.data_vencimento || '2 anos'}
                  </div>
                  <div className="text-slate-500">
                    Frete: {modalDetalhes.tipo_frete}
                  </div>
                </div>
              </div>

              {/* Tabela de Produtos */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-[10px] font-bold uppercase text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Produto</th>
                      <th className="py-2.5 px-3 text-center">Embalagem</th>
                      <th className="py-2.5 px-3 text-center">Quantidade</th>
                      <th className="py-2.5 px-3 text-right">Unitário</th>
                      <th className="py-2.5 px-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-xs">
                    {modalDetalhes.itens.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 px-3 font-sans font-semibold text-slate-800">{it.produto_nome}</td>
                        <td className="py-2.5 px-3 text-center font-sans text-slate-600">{it.tipo_embalagem}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-900">{it.quantidade}</td>
                        <td className="py-2.5 px-3 text-right text-slate-700">
                          {it.preco_unitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          {it.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-emerald-950/[0.04] border border-emerald-900/20 rounded-xl">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Peso Total</span>
                  <span className="font-mono text-xs font-bold text-slate-800">
                    {(modalDetalhes.peso_total_kg / 1000).toFixed(2)} Ton ({modalDetalhes.peso_total_kg.toLocaleString('pt-BR')} kg)
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Geral</span>
                  <span className="font-mono text-base font-black text-emerald-950">
                    {modalDetalhes.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => setModalDetalhes(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Fechar
              </button>

              <button
                onClick={() => {
                  const p = modalDetalhes;
                  setModalDetalhes(null);
                  handleAbrirImportarNf(p);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-900 hover:bg-emerald-950 text-white font-bold text-xs shadow-xs cursor-pointer"
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
