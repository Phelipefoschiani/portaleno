// Componentes compartilhados das compras de mandioca (Cálculo na Roça):
// anexo de comprovante de pagamento, visualização/baixa e extrato do agricultor (portal e cadastro).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { TABELA_CARTAO } from './tabelaCartao';
import { Paperclip, FileText, Download, Eye, X, Trash2, Calendar, Scale, DollarSign, CheckCircle2, Clock } from 'lucide-react';
import {
  CalculoNaRoca,
  ComprovantePagamento,
  LinhaExtratoRoca,
  StatusExtratoRoca,
  ROTULO_STATUS_EXTRATO,
  LIMITE_COMPROVANTE_BYTES,
  EVENTO_COMPROVANTES_ATUALIZADOS,
  carregarComprovantes,
  idsComComprovante,
  removerComprovante,
  adicionarComprovante,
  baixarComprovante,
  montarExtratoRoca
} from '../../data/calculoRocaData';
import { formatarMoeda } from '../../data/financeiroData';
import { formatarDataBR, parseData, hojeISO } from '../../lib/datas';

// =====================================================================
// LEITURA DO ARQUIVO (dataURL) COM COMPRESSÃO DE IMAGENS GRANDES
// =====================================================================

export type ArquivoComprovante = Omit<ComprovantePagamento, 'id' | 'enviado_em'>;

function lerComoDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    reader.readAsDataURL(file);
  });
}

function bytesDoDataUrl(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] || '';
  return Math.floor((base64.length * 3) / 4);
}

function comprimirImagem(dataUrl: string, ladoMax = 1600, qualidade = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const escala = Math.min(1, ladoMax / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * escala));
      canvas.height = Math.max(1, Math.round(img.height * escala));
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Não foi possível processar a imagem.'));
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', qualidade));
    };
    img.onerror = () => reject(new Error('Imagem inválida.'));
    img.src = dataUrl;
  });
}

const formatarTamanho = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(2).replace('.', ',')} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** Lê imagem ou PDF; imagens acima de ~400 KB são reduzidas para JPEG. Rejeita acima de 1,5 MB. */
export async function lerArquivoComprovante(file: File): Promise<ArquivoComprovante> {
  const ehImagem = file.type.startsWith('image/');
  const ehPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!ehImagem && !ehPdf) throw new Error('Envie uma imagem (JPG, PNG...) ou um PDF.');

  let dataUrl = await lerComoDataUrl(file);
  let nome = file.name;
  let tipo = ehPdf ? 'application/pdf' : file.type;

  if (ehImagem && file.size > 400 * 1024) {
    for (const [lado, q] of [[1600, 0.75], [1280, 0.65], [1024, 0.55]] as const) {
      dataUrl = await comprimirImagem(dataUrl, lado, q);
      if (bytesDoDataUrl(dataUrl) <= LIMITE_COMPROVANTE_BYTES) break;
    }
    tipo = 'image/jpeg';
    nome = nome.replace(/\.[^.]+$/, '') + '.jpg';
  }

  const tamanho = bytesDoDataUrl(dataUrl);
  if (tamanho > LIMITE_COMPROVANTE_BYTES) {
    throw new Error(`Arquivo muito grande (${formatarTamanho(tamanho)}). O limite é 1,5 MB. ${ehPdf ? 'Gere um PDF menor ou envie uma foto do comprovante.' : 'Use uma imagem menor.'}`);
  }
  return { nome, tipo, data_url: dataUrl, tamanho_bytes: tamanho };
}

/** Abre o comprovante em nova aba (via blob, pois navegadores bloqueiam abrir data: direto). */
export function abrirComprovante(comp: ComprovantePagamento): void {
  try {
    const [cabecalho, base64] = comp.data_url.split(',');
    const mime = (cabecalho.match(/data:([^;]+)/) || [])[1] || comp.tipo || 'application/octet-stream';
    const bin = atob(base64 || '');
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
    const janela = window.open(url, '_blank');
    if (!janela) baixarComprovante(comp);
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (e) {
    baixarComprovante(comp);
  }
}

// =====================================================================
// CAMPO DE ANEXO (usado nos modais de pagamento)
// =====================================================================

interface CampoAnexoProps {
  arquivo: ArquivoComprovante | null;
  onChange: (arquivo: ArquivoComprovante | null) => void;
}

export function CampoAnexoComprovante({ arquivo, onChange }: CampoAnexoProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [erro, setErro] = useState('');
  const [lendo, setLendo] = useState(false);

  const handleArquivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setErro('');
    setLendo(true);
    try {
      onChange(await lerArquivoComprovante(file));
    } catch (err) {
      onChange(null);
      setErro(err instanceof Error ? err.message : 'Não foi possível ler o arquivo.');
    } finally {
      setLendo(false);
    }
  };

  return (
    <div>
      <label className="block font-bold text-tinta-2 mb-1 text-xs">Comprovante de Pagamento (imagem ou PDF, até 1,5 MB)</label>
      <input ref={inputRef} type="file" accept="image/*,application/pdf" onChange={handleArquivo} className="hidden" />
      {arquivo ? (
        <div className="flex items-center justify-between gap-2 bg-eno-50 border border-eno-100 rounded-md px-3 py-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Paperclip className="w-4 h-4 text-eno-700 shrink-0" />
            <span className="font-bold text-eno-800 truncate">{arquivo.nome}</span>
            <span className="text-eno-700 shrink-0">({formatarTamanho(arquivo.tamanho_bytes)})</span>
          </div>
          <button type="button" onClick={() => onChange(null)} className="p-1 rounded-lg hover:bg-eno-100 text-eno-800 cursor-pointer" title="Remover anexo">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={lendo}
          onClick={() => inputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-dashed border-linha-forte bg-papel hover:bg-papel-2 text-tinta-2 font-bold text-xs cursor-pointer disabled:opacity-60"
        >
          <Paperclip className="w-4 h-4 text-cinza" />
          <span>{lendo ? 'Processando arquivo...' : 'Anexar comprovante (opcional)'}</span>
        </button>
      )}
      {erro && <p className="text-[11px] text-st-vencido font-semibold mt-1">{erro}</p>}
    </div>
  );
}

// =====================================================================
// MODAL: VER / BAIXAR COMPROVANTES DE UMA PESAGEM
// =====================================================================

interface ModalComprovantesProps {
  calculo: CalculoNaRoca;
  onFechar: () => void;
  permitirRemover?: boolean;
  /** Equipe interna pode anexar comprovante depois (ex.: título pago no Financeiro). */
  permitirAnexar?: boolean;
}

export function ModalComprovantes({ calculo, onFechar, permitirRemover = false, permitirAnexar = false }: ModalComprovantesProps) {
  const [lista, setLista] = useState<ComprovantePagamento[]>(() => carregarComprovantes(calculo.id));
  const [novoAnexo, setNovoAnexo] = useState<ArquivoComprovante | null>(null);
  const [erroAnexo, setErroAnexo] = useState('');
  const salvarNovoAnexo = () => {
    if (!novoAnexo) return;
    const res = adicionarComprovante(calculo.id, novoAnexo);
    if (res.sucesso) { setNovoAnexo(null); setErroAnexo(''); }
    else setErroAnexo(res.mensagem);
  };
  useEffect(() => {
    const h = () => setLista(carregarComprovantes(calculo.id));
    window.addEventListener(EVENTO_COMPROVANTES_ATUALIZADOS, h);
    return () => window.removeEventListener(EVENTO_COMPROVANTES_ATUALIZADOS, h);
  }, [calculo.id]);

  return (
    <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-xs flex items-stretch sm:items-center justify-center p-0 sm:p-4" onClick={onFechar}>
      <div className="min-w-0 max-sm:[&_input:not([type=checkbox]):not([type=radio]):not([type=file])]:min-h-11 max-sm:[&_input]:text-base max-sm:[&_select]:min-h-11 max-sm:[&_select]:text-base max-sm:[&_textarea]:text-base bg-papel rounded-none sm:rounded-md max-w-2xl w-full shadow-2xl border-0 sm:border border-linha h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-4 sm:px-5 py-3 border-b border-linha flex items-center justify-between gap-2 shrink-0">
          <div className="min-w-0">
            <span className="text-[10.5px] uppercase tracking-[0.14em] font-bold text-cinza">Comprovantes de pagamento</span>
            <h3 className="text-base font-extrabold text-tinta">Ticket {calculo.numero_ticket} • {calculo.fornecedor_nome}</h3>
          </div>
          <button onClick={onFechar} className="inline-flex items-center justify-center w-10 h-10 -mr-2 shrink-0 rounded-md text-cinza hover:text-tinta-2 hover:bg-papel-3/60 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {permitirAnexar && (
            <div className="p-3 rounded-md bg-papel-2 border border-linha space-y-2">
              <CampoAnexoComprovante arquivo={novoAnexo} onChange={setNovoAnexo} />
              {novoAnexo && (
                <div className="flex justify-end">
                  <button onClick={salvarNovoAnexo} className="px-4 py-2 rounded-md bg-eno-700 hover:bg-eno-800 text-white text-xs font-bold cursor-pointer">
                    Salvar comprovante
                  </button>
                </div>
              )}
              {erroAnexo && <p className="text-[11px] text-st-vencido font-semibold">{erroAnexo}</p>}
            </div>
          )}
          {lista.length === 0 ? (
            <p className="text-center text-sm text-cinza py-8">Nenhum comprovante anexado a esta pesagem.</p>
          ) : (
            lista.map(comp => (
              <div key={comp.id} className="border border-linha rounded-md overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-papel-2 border-b border-linha text-xs">
                  <div className="min-w-0">
                    <div className="font-bold text-tinta truncate">{comp.nome}</div>
                    <div className="text-[11px] text-cinza">Enviado em {formatarDataBR(comp.enviado_em)} • {formatarTamanho(comp.tamanho_bytes)}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => abrirComprovante(comp)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-papel border border-linha hover:bg-papel-3/60 text-tinta-2 font-bold cursor-pointer">
                      <Eye className="w-3.5 h-3.5" /> Abrir
                    </button>
                    <button onClick={() => baixarComprovante(comp)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-eno-700 hover:bg-eno-800 text-white font-bold cursor-pointer">
                      <Download className="w-3.5 h-3.5" /> Baixar
                    </button>
                    {permitirRemover && (
                      <button
                        onClick={() => { if (window.confirm('Remover este comprovante?')) removerComprovante(calculo.id, comp.id); }}
                        className="p-1.5 rounded-lg hover:bg-st-vencido-bg text-cinza hover:text-st-vencido cursor-pointer"
                        title="Remover comprovante"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                {comp.tipo.startsWith('image/') ? (
                  <img src={comp.data_url} alt={comp.nome} className="w-full max-h-[420px] object-contain bg-papel-3/60" />
                ) : (
                  <div className="flex items-center gap-2 px-4 py-6 text-xs text-tinta-2">
                    <FileText className="w-5 h-5 text-st-vencido" />
                    <span>Documento PDF. Use "Abrir" ou "Baixar" para visualizar.</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// EXTRATO DO AGRICULTOR (portal e cadastro)
// =====================================================================

const ESTILO_STATUS: Record<StatusExtratoRoca, string> = {
  PAGO: 'bg-st-pago-bg text-st-pago border-transparent',
  PARCIAL: 'bg-st-producao-bg text-st-producao border-transparent',
  A_RECEBER: 'bg-st-aguardando-bg text-st-aguardando border-transparent',
  VENCIDO: 'bg-st-vencido-bg text-st-vencido border-transparent'
};

export function SeloStatusExtrato({ status }: { status: StatusExtratoRoca }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-[3px] rounded-[4px] text-[11px] font-semibold whitespace-nowrap border ${ESTILO_STATUS[status]}`}>
      {status === 'PAGO' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
      {ROTULO_STATUS_EXTRATO[status]}
    </span>
  );
}

const kg = (v: number) => `${v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 3 })} kg`;

/** Hook: extrato recalculado quando pesagens, financeiro ou comprovantes mudam. */
export function useExtratoRoca(calculos: CalculoNaRoca[]): { linhas: LinhaExtratoRoca[]; comComprovante: Set<string> } {
  const [versao, setVersao] = useState(0);
  useEffect(() => {
    const h = () => setVersao(v => v + 1);
    const eventos = ['financeiro_updated', 'pedidos_compra_updated', 'calculos_roca_updated', EVENTO_COMPROVANTES_ATUALIZADOS];
    eventos.forEach(ev => window.addEventListener(ev, h));
    window.addEventListener('storage', h);
    return () => {
      eventos.forEach(ev => window.removeEventListener(ev, h));
      window.removeEventListener('storage', h);
    };
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const linhas = useMemo(() => montarExtratoRoca(calculos), [calculos, versao]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const comComprovante = useMemo(() => idsComComprovante(), [versao]);
  return { linhas, comComprovante };
}

interface ExtratoAgricultorProps {
  calculos: CalculoNaRoca[];
  onVerTicket?: (c: CalculoNaRoca) => void;
  permitirRemoverComprovante?: boolean;
}

export function ExtratoAgricultor({ calculos, onVerTicket, permitirRemoverComprovante = false }: ExtratoAgricultorProps) {
  const { linhas, comComprovante } = useExtratoRoca(calculos);
  const [periodo, setPeriodo] = useState<string>('TODOS');
  const [dataDe, setDataDe] = useState('');
  const [dataAte, setDataAte] = useState('');
  const [comprovantesDe, setComprovantesDe] = useState<CalculoNaRoca | null>(null);

  const safras = useMemo(() => {
    const anos = new Set<number>();
    calculos.forEach(c => { const d = parseData(c.data); if (d) anos.add(d.getFullYear()); });
    return Array.from(anos).sort((a, b) => b - a);
  }, [calculos]);

  const filtradas = useMemo(() => {
    const hoje = parseData(hojeISO())!;
    let ini: number | null = null;
    let fim: number | null = null;
    if (periodo === 'MES') {
      ini = new Date(hoje.getFullYear(), hoje.getMonth(), 1).getTime();
    } else if (periodo === '90D') {
      ini = hoje.getTime() - 90 * 86400000;
    } else if (periodo.startsWith('SAFRA_')) {
      const ano = Number(periodo.slice(6));
      ini = new Date(ano, 0, 1).getTime();
      fim = new Date(ano, 11, 31).getTime();
    } else if (periodo === 'PERSONALIZADO') {
      ini = parseData(dataDe)?.getTime() ?? null;
      fim = parseData(dataAte)?.getTime() ?? null;
    }
    return linhas
      .filter(l => {
        if (ini === null && fim === null) return true;
        const t = parseData(l.calculo.data)?.getTime();
        if (t === undefined) return false;
        return (ini === null || t >= ini) && (fim === null || t <= fim);
      })
      .sort((a, b) => (parseData(b.calculo.data)?.getTime() ?? 0) - (parseData(a.calculo.data)?.getTime() ?? 0));
  }, [linhas, periodo, dataDe, dataAte]);

  const totais = useMemo(() => filtradas.reduce(
    (acc, l) => ({
      kg: acc.kg + l.peso_liquido_kg,
      valor: acc.valor + l.valor_total,
      recebido: acc.recebido + l.valor_recebido,
      saldo: acc.saldo + l.saldo,
      vencido: acc.vencido + (l.status === 'VENCIDO' ? l.saldo : 0)
    }),
    { kg: 0, valor: 0, recebido: 0, saldo: 0, vencido: 0 }
  ), [filtradas]);

  return (
    <div className="space-y-4">
      {/* Totais do período */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-linha border border-linha rounded-md overflow-hidden">
        <div className="bg-papel px-4 py-3.5 min-w-0">
          <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-cinza">Entregue no período</div>
          <div className="text-[19px] sm:text-[22px] font-extrabold tracking-[-0.02em] text-tinta mt-1.5 tabular-nums truncate">{(totais.kg / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} <span className="text-sm text-cinza">ton</span></div>
          <div className="text-[11px] text-cinza mt-0.5">{kg(totais.kg)} líquidos • {filtradas.length} {filtradas.length === 1 ? 'pesagem' : 'pesagens'}</div>
        </div>
        <div className="bg-papel px-4 py-3.5 min-w-0">
          <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-cinza">Valor total</div>
          <div className="text-[19px] sm:text-[22px] font-extrabold tracking-[-0.02em] text-tinta mt-1.5 tabular-nums truncate">{formatarMoeda(totais.valor)}</div>
          <div className="text-[11px] text-cinza mt-0.5">Peso líquido × preço/kg</div>
        </div>
        <div className="bg-papel px-4 py-3.5 min-w-0">
          <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-cinza">Recebido</div>
          <div className="text-[19px] sm:text-[22px] font-extrabold tracking-[-0.02em] text-tinta mt-1.5 tabular-nums truncate">{formatarMoeda(totais.recebido)}</div>
          <div className="text-[11px] text-cinza mt-0.5">Pagamentos já realizados</div>
        </div>
        <div className="bg-papel px-4 py-3.5 min-w-0">
          <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-cinza">A receber</div>
          <div className="text-[19px] sm:text-[22px] font-extrabold tracking-[-0.02em] text-tinta mt-1.5 tabular-nums truncate">{formatarMoeda(totais.saldo)}</div>
          <div className="text-[11px] mt-0.5">
            {totais.vencido > 0.009
              ? <span className="text-st-vencido font-bold">{formatarMoeda(totais.vencido)} vencido</span>
              : <span className="text-cinza">Nenhum valor vencido</span>}
          </div>
        </div>
      </div>

      {/* Tabela do extrato */}
      <div className="bg-papel rounded-md border border-linha overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-linha flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-tinta text-[15px] tracking-[-0.01em]">Extrato de pesagens e pagamentos</h3>
            <p className="text-xs text-cinza mt-0.5">Cada compra com peso bruto, desconto, líquido, quanto já foi pago, quando e o saldo a receber</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto max-sm:[&>select]:flex-1 max-sm:[&>select]:h-11 max-sm:[&>input]:h-11 max-sm:[&>input]:flex-1">
            <select
              value={periodo}
              onChange={e => setPeriodo(e.target.value)}
              className="bg-papel border border-linha text-xs font-bold rounded-md px-3 py-1.5 outline-none cursor-pointer"
            >
              <option value="TODOS">Todo o período</option>
              <option value="MES">Este mês</option>
              <option value="90D">Últimos 90 dias</option>
              {safras.map(a => <option key={a} value={`SAFRA_${a}`}>Safra {a}</option>)}
              <option value="PERSONALIZADO">Personalizado...</option>
            </select>
            {periodo === 'PERSONALIZADO' && (
              <>
                <input type="date" value={dataDe} onChange={e => setDataDe(e.target.value)} className="bg-papel border border-linha text-xs rounded-md px-2 py-1.5 outline-none" title="De" />
                <span className="text-xs text-cinza">até</span>
                <input type="date" value={dataAte} onChange={e => setDataAte(e.target.value)} className="bg-papel border border-linha text-xs rounded-md px-2 py-1.5 outline-none" title="Até" />
              </>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className={`${TABELA_CARTAO} ${TABELA_CARTAO} w-full text-left text-xs sm:min-w-[1100px]`}>
            <thead className="bg-papel-2 text-cinza font-bold uppercase tracking-[0.12em] text-[10.5px] border-b border-linha-forte">
              <tr>
                <th className="py-3 px-4">Ticket / Data</th>
                <th className="py-3 px-3 text-right">Bruto</th>
                <th className="py-3 px-3 text-right">Desconto</th>
                <th className="py-3 px-3 text-right">Líquido</th>
                <th className="py-3 px-3 text-right">Preço/kg</th>
                <th className="py-3 px-3 text-right">Valor total</th>
                <th className="py-3 px-3 text-right">Recebido</th>
                <th className="py-3 px-3">Pago em / Forma</th>
                <th className="py-3 px-3 text-right">Saldo</th>
                <th className="py-3 px-3">Vencimento</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Documentos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linha">
              {filtradas.length === 0 ? (
                <tr>
                  <td data-rotulo="Ticket / Data" colSpan={12} className="py-12 text-center text-cinza">Nenhuma pesagem encontrada no período selecionado.</td>
                </tr>
              ) : (
                filtradas.map(l => (
                  <tr key={l.calculo.id} className="hover:bg-eno-50/30 transition-colors">
                    <td data-rotulo="Ticket / Data" className="py-3 px-4">
                      <div className="font-extrabold text-tinta tabular-nums">{l.calculo.numero_ticket}</div>
                      <div className="text-[11px] text-cinza">{formatarDataBR(l.calculo.data)} • {l.calculo.total_sacos} sc</div>
                    </td>
                    <td data-rotulo="Bruto" className="py-3 px-3 text-right tabular-nums whitespace-nowrap text-tinta-2">{kg(l.peso_bruto_kg)}</td>
                    <td data-rotulo="Desconto" className="py-3 px-3 text-right tabular-nums whitespace-nowrap text-st-aguardando">{l.desconto_kg > 0 ? `- ${kg(l.desconto_kg)}` : '—'}</td>
                    <td data-rotulo="Líquido" className="py-3 px-3 text-right tabular-nums whitespace-nowrap font-bold text-eno-800">{kg(l.peso_liquido_kg)}</td>
                    <td data-rotulo="Preço/kg" className="py-3 px-3 text-right tabular-nums whitespace-nowrap text-tinta-2">{formatarMoeda(l.calculo.preco_por_kg)}</td>
                    <td data-rotulo="Valor total" className="py-3 px-3 text-right tabular-nums whitespace-nowrap font-extrabold text-tinta">{formatarMoeda(l.valor_total)}</td>
                    <td data-rotulo="Recebido" className="py-3 px-3 text-right tabular-nums whitespace-nowrap font-bold text-eno-700">{formatarMoeda(l.valor_recebido)}</td>
                    <td data-rotulo="Pago em / Forma" className="py-3 px-3 text-tinta-2">
                      {l.pagamentos.length > 0 ? (
                        <>
                          <div className="font-bold">{formatarDataBR(l.data_ultimo_pagamento)}</div>
                          <div className="text-[11px] text-cinza">{l.forma_pagamento || '—'}{l.pagamentos.length > 1 ? ` • ${l.pagamentos.length} pagamentos` : ''}</div>
                        </>
                      ) : <span className="text-cinza">—</span>}
                    </td>
                    <td data-rotulo="Saldo" className="py-3 px-3 text-right tabular-nums whitespace-nowrap font-bold text-st-aguardando">{l.saldo > 0.009 ? formatarMoeda(l.saldo) : '—'}</td>
                    <td data-rotulo="Vencimento" className={`py-3 px-3 font-bold ${l.status === 'VENCIDO' ? 'text-st-vencido' : 'text-tinta-2'}`}>
                      {l.vencimento ? formatarDataBR(l.vencimento) : (l.saldo > 0.009 ? <span className="text-cinza font-normal">A definir</span> : '—')}
                    </td>
                    <td data-rotulo="Status" className="py-3 px-3 sm:text-center"><SeloStatusExtrato status={l.status} /></td>
                    <td data-rotulo="Documentos" className="py-3 px-4 text-right max-sm:col-span-2">
                      <div className="flex items-center sm:justify-end gap-1.5 max-sm:[&>button]:h-10 max-sm:[&>button]:flex-1 max-sm:[&>button]:justify-center">
                        {onVerTicket && (
                          <button
                            onClick={() => onVerTicket(l.calculo)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-eno-50 hover:bg-eno-100 text-eno-800 font-bold text-[11px] border border-eno-100 cursor-pointer"
                            title="Comprovante de pesagem"
                          >
                            <FileText className="w-3.5 h-3.5" /> Pesagem
                          </button>
                        )}
                        {comComprovante.has(l.calculo.id) ? (
                          <button
                            onClick={() => setComprovantesDe(l.calculo)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-eno-900 hover:bg-eno-800 text-white font-bold text-[11px] cursor-pointer"
                            title="Ver / baixar comprovante de pagamento"
                          >
                            <Paperclip className="w-3.5 h-3.5" /> Comprovante
                          </button>
                        ) : (
                          <span className="text-[10px] text-cinza px-1" title="Nenhum comprovante de pagamento anexado">Sem comprovante</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {comprovantesDe && (
        <ModalComprovantes calculo={comprovantesDe} onFechar={() => setComprovantesDe(null)} permitirRemover={permitirRemoverComprovante} />
      )}
    </div>
  );
}
