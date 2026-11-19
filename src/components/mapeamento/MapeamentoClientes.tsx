import React, { useEffect, useMemo, useState } from 'react';
import { MapPin, Camera, Crosshair, RefreshCw } from 'lucide-react';
import { CabecalhoPagina } from '../ui/CabecalhoPagina';
import { MapaLeaflet, MarcadorMapa } from '../mapa/MapaLeaflet';
import { Cliente, carregarClientes, salvarClientes } from '../../data/clientesData';
import { carregarPedidosVenda, PedidoVenda } from '../../data/pedidosVendaData';
import { formatarMoeda } from '../../data/financeiroData';
import { formatarDataBR } from '../../lib/datas';
import { enviarFachada } from '../../lib/fachadaStorage';
import {
  buscarPosicaoEndereco,
  chaveEndereco,
  enderecoDoCliente,
  esperar,
  precisaLocalizar,
  PontoMapa,
} from '../../lib/mapaClientes';

const ROTULO_ETAPA: Record<string, string> = {
  ORCAMENTO: 'Orçamento',
  EM_PRODUCAO: 'Em produção',
  A_FATURAR: 'A faturar',
  FATURADO: 'Faturado',
  ENTREGUE: 'Entregue',
};

/** Salva uma alteração de um cliente (sem mexer nos outros). */
function atualizarCliente(id: string, fn: (c: Cliente) => Cliente) {
  const lista = carregarClientes();
  const idx = lista.findIndex(c => c.id === id);
  if (idx < 0) return;
  lista[idx] = fn(lista[idx]);
  salvarClientes(lista);
}

export function MapeamentoClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [pedidos, setPedidos] = useState<PedidoVenda[]>([]);
  const [busca, setBusca] = useState('');
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [alvoManual, setAlvoManual] = useState<string | null>(null); // cliente cuja posição será marcada no mapa
  const [progresso, setProgresso] = useState<string>('');
  const [erro, setErro] = useState<string>('');
  const [enviandoFoto, setEnviandoFoto] = useState(false);

  const recarregar = () => {
    setClientes(carregarClientes());
    setPedidos(carregarPedidosVenda());
  };

  useEffect(() => {
    recarregar();
    const eventos = ['clientes_updated', 'pedidos_venda_updated', 'sistema_reset_updated'];
    eventos.forEach(ev => window.addEventListener(ev, recarregar));
    return () => eventos.forEach(ev => window.removeEventListener(ev, recarregar));
  }, []);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return clientes
      .filter(c => c.ativo !== false)
      .filter(c =>
        !termo ||
        (c.razao_nome || '').toLowerCase().includes(termo) ||
        (c.fantasia || '').toLowerCase().includes(termo) ||
        (c.endereco?.municipio || '').toLowerCase().includes(termo) ||
        (c.codigo_cliente || '').toLowerCase().includes(termo)
      );
  }, [clientes, busca]);

  const comPosicao = filtrados.filter(c => c.geo);
  const semPosicao = filtrados.filter(c => !c.geo && enderecoDoCliente(c));
  const precisamLocalizar = clientes.filter(c => c.ativo !== false && precisaLocalizar(c));

  const marcadores: MarcadorMapa[] = comPosicao.map(c => ({
    id: c.id,
    lat: c.geo!.lat,
    lng: c.geo!.lng,
    imagem: c.fachada_url,
    destacado: c.id === selecionadoId,
    titulo: c.fantasia || c.razao_nome,
  }));

  const selecionado = clientes.find(c => c.id === selecionadoId) || null;

  const pedidosDoCliente = useMemo(() => {
    if (!selecionado) return [];
    return pedidos
      .filter(p => p.cliente_id === selecionado.id)
      .sort((a, b) => String(b.data_emissao || '').localeCompare(String(a.data_emissao || '')));
  }, [pedidos, selecionado]);

  const totalComprado = pedidosDoCliente
    .filter(p => p.etapa === 'FATURADO' || p.etapa === 'ENTREGUE')
    .reduce((acc, p) => acc + (Number(p.valor_total) || 0), 0);

  // Busca a posição de um cliente pelo endereço
  const localizar = async (c: Cliente): Promise<boolean> => {
    const ponto = await buscarPosicaoEndereco(enderecoDoCliente(c));
    if (!ponto) return false;
    atualizarCliente(c.id, x => ({
      ...x,
      geo: { lat: ponto.lat, lng: ponto.lng, origem: 'GEOCODIFICADO', endereco_chave: chaveEndereco(x) },
    }));
    return true;
  };

  const localizarUm = async (c: Cliente) => {
    setErro('');
    try {
      const ok = await localizar(c);
      if (!ok) setErro(`Não encontrei o endereço de ${c.fantasia || c.razao_nome}. Use "Marcar no mapa".`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao localizar.');
    }
  };

  // Localiza todos, um por vez (o serviço aceita 1 pedido por segundo)
  const localizarTodos = async () => {
    setErro('');
    const lista = [...precisamLocalizar];
    let falhas = 0;
    for (let i = 0; i < lista.length; i++) {
      setProgresso(`Localizando ${i + 1} de ${lista.length}...`);
      try {
        const ok = await localizar(lista[i]);
        if (!ok) falhas++;
      } catch {
        falhas++;
      }
      if (i < lista.length - 1) await esperar(1100);
    }
    setProgresso('');
    if (falhas > 0) setErro(`${falhas} endereço(s) não foram encontrados. Ajuste pelo "Marcar no mapa".`);
  };

  const aoClicarMapa = (p: PontoMapa) => {
    if (!alvoManual) return;
    const c = clientes.find(x => x.id === alvoManual);
    if (c) {
      atualizarCliente(c.id, x => ({
        ...x,
        geo: { lat: p.lat, lng: p.lng, origem: 'MANUAL', endereco_chave: chaveEndereco(x) },
      }));
    }
    setAlvoManual(null);
  };

  const trocarFachada = async (c: Cliente, arquivo: File | undefined) => {
    if (!arquivo) return;
    setErro('');
    setEnviandoFoto(true);
    try {
      const url = await enviarFachada(c.id, arquivo);
      atualizarCliente(c.id, x => ({ ...x, fachada_url: url }));
    } catch (e) {
      setErro(e instanceof Error ? `Não foi possível enviar a foto: ${e.message}` : 'Não foi possível enviar a foto.');
    } finally {
      setEnviandoFoto(false);
    }
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-papel-2 text-tinta">
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 pb-8">
        <CabecalhoPagina
          titulo="Mapeamento"
          resumo={`${comPosicao.length} clientes no mapa · ${semPosicao.length} sem posição`}
          acoes={
            precisamLocalizar.length > 0 ? (
              <button
                type="button"
                onClick={localizarTodos}
                disabled={!!progresso}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-eno-800 text-white text-[12.5px] font-bold disabled:opacity-60"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {progresso || `Localizar ${precisamLocalizar.length} sem posição`}
              </button>
            ) : undefined
          }
        />

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Buscar cliente, código ou cidade"
                className="h-10 flex-1 min-w-[200px] rounded-md border border-linha bg-papel px-3 text-[14px]"
              />
              {alvoManual && (
                <span className="text-[12.5px] font-semibold text-st-producao">
                  Clique no mapa onde fica o cliente ·{' '}
                  <button type="button" className="underline" onClick={() => setAlvoManual(null)}>cancelar</button>
                </span>
              )}
            </div>

            {erro && <div className="rounded-md bg-st-vencido-bg text-st-vencido text-[13px] px-3 py-2">{erro}</div>}

            <div className="rounded-lg overflow-hidden border border-linha bg-papel">
              <MapaLeaflet
                marcadores={marcadores}
                onClickMarcador={id => setSelecionadoId(id)}
                onClickMapa={aoClicarMapa}
                modoPosicionar={!!alvoManual}
                altura="62vh"
              />
            </div>

            {semPosicao.length > 0 && (
              <div className="rounded-lg border border-linha bg-papel">
                <div className="px-4 py-2.5 text-[12px] font-bold uppercase tracking-wide text-cinza border-b border-linha">
                  Sem posição no mapa
                </div>
                <ul className="divide-y divide-linha">
                  {semPosicao.map(c => (
                    <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                      <div className="min-w-0">
                        <div className="text-[14px] font-semibold truncate">{c.fantasia || c.razao_nome}</div>
                        <div className="text-[12px] text-cinza truncate">{enderecoDoCliente(c)}</div>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => localizarUm(c)} className="h-8 px-3 rounded-md border border-linha-forte text-[12.5px] font-semibold">
                          Localizar
                        </button>
                        <button
                          type="button"
                          onClick={() => setAlvoManual(c.id)}
                          className="h-8 px-3 rounded-md border border-linha-forte text-[12.5px] font-semibold inline-flex items-center gap-1"
                        >
                          <Crosshair className="w-3.5 h-3.5" /> Marcar no mapa
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <aside className="rounded-lg border border-linha bg-papel overflow-hidden self-start">
            {!selecionado ? (
              <div className="p-6 text-center text-cinza text-[14px]">
                <MapPin className="w-6 h-6 mx-auto mb-2" />
                Clique em um símbolo no mapa para ver a fachada, os dados e as últimas compras do cliente.
              </div>
            ) : (
              <div>
                <div className="relative bg-papel-3 aspect-[4/3]">
                  {selecionado.fachada_url ? (
                    <img src={selecionado.fachada_url} alt={`Fachada de ${selecionado.fantasia || selecionado.razao_nome}`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-cinza text-[13px]">Sem foto da fachada</div>
                  )}
                  <label className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-papel/95 text-[12.5px] font-bold cursor-pointer shadow">
                    <Camera className="w-3.5 h-3.5" />
                    {enviandoFoto ? 'Enviando...' : selecionado.fachada_url ? 'Trocar foto' : 'Enviar foto'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={enviandoFoto}
                      onChange={e => {
                        trocarFachada(selecionado, e.target.files?.[0]);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>

                <div className="p-4 space-y-3">
                  <div>
                    <div className="text-[17px] font-extrabold leading-tight">{selecionado.fantasia || selecionado.razao_nome}</div>
                    {selecionado.fantasia && <div className="text-[12.5px] text-cinza">{selecionado.razao_nome}</div>}
                    <div className="text-[12px] text-cinza tabular-nums mt-0.5">
                      {selecionado.codigo_cliente ? `${selecionado.codigo_cliente} · ` : ''}{selecionado.cpf_cnpj}
                    </div>
                  </div>

                  <dl className="grid grid-cols-1 gap-1.5 text-[13px]">
                    <div><dt className="inline font-semibold">Endereço: </dt><dd className="inline">{enderecoDoCliente(selecionado)}</dd></div>
                    {selecionado.telefone && <div><dt className="inline font-semibold">Telefone: </dt><dd className="inline">{selecionado.telefone}</dd></div>}
                    {selecionado.email && <div><dt className="inline font-semibold">E-mail: </dt><dd className="inline">{selecionado.email}</dd></div>}
                    {selecionado.vendedor_nome && <div><dt className="inline font-semibold">Representante: </dt><dd className="inline">{selecionado.vendedor_nome}</dd></div>}
                    {selecionado.tabela_preco_nome && <div><dt className="inline font-semibold">Tabela: </dt><dd className="inline">{selecionado.tabela_preco_nome}</dd></div>}
                  </dl>

                  <button
                    type="button"
                    onClick={() => setAlvoManual(selecionado.id)}
                    className="h-9 px-3 rounded-md border border-linha-forte text-[12.5px] font-semibold inline-flex items-center gap-1.5"
                  >
                    <Crosshair className="w-3.5 h-3.5" /> Ajustar posição no mapa
                  </button>

                  <div className="pt-2 border-t border-linha">
                    <div className="flex items-baseline justify-between mb-2">
                      <div className="text-[12px] font-bold uppercase tracking-wide text-cinza">Últimas compras</div>
                      <div className="text-[12.5px] text-cinza">Faturado: <span className="font-bold text-tinta">{formatarMoeda(totalComprado)}</span></div>
                    </div>
                    {pedidosDoCliente.length === 0 ? (
                      <div className="text-[13px] text-cinza">Nenhum pedido ainda.</div>
                    ) : (
                      <ul className="space-y-1.5 max-h-[280px] overflow-y-auto">
                        {pedidosDoCliente.slice(0, 15).map(p => (
                          <li key={p.id} className="flex items-center justify-between gap-2 text-[13px]">
                            <div className="min-w-0">
                              <div className="font-semibold tabular-nums">{p.numero_pedido}</div>
                              <div className="text-[12px] text-cinza">{formatarDataBR(p.data_emissao)} · {ROTULO_ETAPA[p.etapa] || p.etapa}</div>
                            </div>
                            <div className="font-bold tabular-nums whitespace-nowrap">{formatarMoeda(Number(p.valor_total) || 0)}</div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
