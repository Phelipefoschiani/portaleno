import { useMemo, useState } from 'react';
import { Crosshair, Route, Check } from 'lucide-react';
import { Cliente } from '../../data/clientesData';
import { MapaLeaflet, MarcadorMapa } from '../mapa/MapaLeaflet';
import { calcularRota, enderecoDoCliente, PontoMapa, RotaCalculada } from '../../lib/mapaClientes';

interface Props {
  /** Clientes da carteira do representante. */
  clientes: Cliente[];
}

// Rotas do representante: usa a localização do aparelho, escolhe os clientes e traça a melhor ordem no mapa.
export function RotasRCA({ clientes }: Props) {
  const [inicio, setInicio] = useState<PontoMapa | null>(null);
  const [localizando, setLocalizando] = useState(false);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [rota, setRota] = useState<RotaCalculada | null>(null);
  const [paradasDaRota, setParadasDaRota] = useState<Cliente[]>([]);
  const [calculando, setCalculando] = useState(false);
  const [erro, setErro] = useState('');

  const comPosicao = useMemo(() => clientes.filter(c => c.geo), [clientes]);
  const semPosicao = useMemo(() => clientes.filter(c => !c.geo), [clientes]);

  const usarMinhaLocalizacao = () => {
    setErro('');
    if (!navigator.geolocation) {
      setErro('Este aparelho não informa a localização.');
      return;
    }
    setLocalizando(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setInicio({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocalizando(false);
      },
      () => {
        setLocalizando(false);
        setErro('Permita o acesso à localização no navegador para traçar a rota.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  };

  const alternar = (id: string) => {
    setRota(null);
    setSelecionados(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const tracar = async () => {
    setErro('');
    if (!inicio) {
      setErro('Primeiro toque em "Usar minha localização".');
      return;
    }
    const paradas = selecionados
      .map(id => clientes.find(c => c.id === id))
      .filter((c): c is Cliente => !!c && !!c.geo);
    if (paradas.length === 0) {
      setErro('Escolha pelo menos um cliente com posição no mapa.');
      return;
    }
    setCalculando(true);
    try {
      const r = await calcularRota(inicio, paradas.map(c => ({ lat: c.geo!.lat, lng: c.geo!.lng })));
      if (!r) {
        setErro('Não encontrei rota para essas paradas.');
        setRota(null);
      } else {
        setRota(r);
        setParadasDaRota(paradas);
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao traçar a rota.');
    } finally {
      setCalculando(false);
    }
  };

  // Ordem de visita (só existe depois de traçar)
  const ordemVisita: Cliente[] = rota ? rota.ordem.map(i => paradasDaRota[i]).filter(Boolean) : [];
  const numeroDe = new Map(ordemVisita.map((c, i) => [c.id, i + 1]));

  const marcadores: MarcadorMapa[] = [
    ...(inicio ? [{ id: '__inicio', lat: inicio.lat, lng: inicio.lng, titulo: 'Sua localização' }] : []),
    ...comPosicao.map(c => ({
      id: c.id,
      lat: c.geo!.lat,
      lng: c.geo!.lng,
      imagem: c.fachada_url,
      numero: numeroDe.get(c.id),
      destacado: selecionados.includes(c.id),
      titulo: c.fantasia || c.razao_nome,
    })),
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={usarMinhaLocalizacao}
          disabled={localizando}
          className="h-10 px-4 rounded-md bg-eno-800 text-white text-[13px] font-bold inline-flex items-center gap-1.5 disabled:opacity-60"
        >
          <Crosshair className="w-4 h-4" />
          {localizando ? 'Buscando localização...' : inicio ? 'Atualizar minha localização' : 'Usar minha localização'}
        </button>
        <button
          type="button"
          onClick={tracar}
          disabled={calculando || selecionados.length === 0}
          className="h-10 px-4 rounded-md border border-linha-forte text-[13px] font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
        >
          <Route className="w-4 h-4" />
          {calculando ? 'Traçando...' : `Traçar rota (${selecionados.length})`}
        </button>
        {rota && (
          <span className="text-[13px] text-cinza">
            {ordemVisita.length} {ordemVisita.length === 1 ? 'parada' : 'paradas'} · <strong className="text-tinta">{rota.km} km</strong> · cerca de{' '}
            <strong className="text-tinta">{rota.minutos} min</strong>
          </span>
        )}
      </div>

      {erro && <div className="rounded-md bg-st-vencido-bg text-st-vencido text-[13px] px-3 py-2">{erro}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-lg overflow-hidden border border-linha bg-papel">
          <MapaLeaflet
            marcadores={marcadores}
            trajeto={rota?.trajeto}
            onClickMarcador={id => {
              if (id !== '__inicio') alternar(id);
            }}
            altura="60vh"
          />
        </div>

        <div className="space-y-4">
          {rota && ordemVisita.length > 0 && (
            <div className="rounded-lg border border-linha bg-papel p-4">
              <div className="text-[12px] font-bold uppercase tracking-wide text-cinza mb-2">Ordem de visita</div>
              <ol className="space-y-2">
                {ordemVisita.map((c, i) => (
                  <li key={c.id} className="flex gap-2.5">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-eno-800 text-white text-[12px] font-bold flex items-center justify-center">{i + 1}</span>
                    <div className="min-w-0">
                      <div className="text-[14px] font-semibold truncate">{c.fantasia || c.razao_nome}</div>
                      <div className="text-[12px] text-cinza truncate">{enderecoDoCliente(c)}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="rounded-lg border border-linha bg-papel">
            <div className="px-4 py-2.5 text-[12px] font-bold uppercase tracking-wide text-cinza border-b border-linha">
              Escolha os clientes da rota
            </div>
            {comPosicao.length === 0 ? (
              <div className="p-4 text-[13px] text-cinza">Nenhum cliente com posição no mapa ainda.</div>
            ) : (
              <ul className="divide-y divide-linha max-h-[420px] overflow-y-auto">
                {comPosicao.map(c => {
                  const marcado = selecionados.includes(c.id);
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => alternar(c.id)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left"
                      >
                        <span className={`shrink-0 w-5 h-5 rounded border flex items-center justify-center ${marcado ? 'bg-eno-800 border-eno-800 text-white' : 'border-linha-forte'}`}>
                          {marcado && <Check className="w-3.5 h-3.5" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[14px] font-semibold truncate">{c.fantasia || c.razao_nome}</span>
                          <span className="block text-[12px] text-cinza truncate">{enderecoDoCliente(c)}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {semPosicao.length > 0 && (
            <div className="rounded-lg border border-linha bg-papel p-4 text-[12.5px] text-cinza">
              {semPosicao.length} {semPosicao.length === 1 ? 'cliente ainda não tem posição' : 'clientes ainda não têm posição'} no mapa.
              O administrador localiza pelo menu Mapeamento.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
