import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CENTRO_BRASIL, ZOOM_BRASIL, PontoMapa } from '../../lib/mapaClientes';

export interface MarcadorMapa {
  id: string;
  lat: number;
  lng: number;
  /** Imagem dentro do pino (fachada do cliente). Sem ela, usa o símbolo do Grupo ENO. */
  imagem?: string;
  /** Número da parada na rota. */
  numero?: number;
  destacado?: boolean;
  titulo?: string;
}

interface Props {
  marcadores: MarcadorMapa[];
  /** Trajeto da rota em [lat, lng]: é desenhado e o mapa enquadra nele. */
  trajeto?: [number, number][];
  onClickMarcador?: (id: string) => void;
  /** Clique no mapa (usado para marcar a posição de um cliente à mão). */
  onClickMapa?: (p: PontoMapa) => void;
  /** Quando true, o cursor vira cruz (modo de marcar posição). */
  modoPosicionar?: boolean;
  altura?: string;
}

const escapar = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c));

// Mapa Leaflet (OpenStreetMap). Marcadores são pinos redondos com a fachada ou o símbolo do Grupo ENO.
export function MapaLeaflet({ marcadores, trajeto, onClickMarcador, onClickMapa, modoPosicionar, altura = '60vh' }: Props) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<L.Map | null>(null);
  const camadaRef = useRef<L.LayerGroup | null>(null);
  const primeiroEnquadramento = useRef(true);

  // Callbacks sempre na versão mais nova, sem recriar o mapa
  const clickMarcadorRef = useRef(onClickMarcador);
  const clickMapaRef = useRef(onClickMapa);
  clickMarcadorRef.current = onClickMarcador;
  clickMapaRef.current = onClickMapa;

  // Cria o mapa uma vez
  useEffect(() => {
    if (!elRef.current || mapaRef.current) return;
    const mapa = L.map(elRef.current, {
      center: [CENTRO_BRASIL.lat, CENTRO_BRASIL.lng],
      zoom: ZOOM_BRASIL,
      scrollWheelZoom: true,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(mapa);
    camadaRef.current = L.layerGroup().addTo(mapa);
    mapa.on('click', e => clickMapaRef.current?.({ lat: e.latlng.lat, lng: e.latlng.lng }));
    mapaRef.current = mapa;
    return () => {
      mapa.remove();
      mapaRef.current = null;
      camadaRef.current = null;
      primeiroEnquadramento.current = true;
    };
  }, []);

  // Cursor de posicionamento
  useEffect(() => {
    if (elRef.current) elRef.current.style.cursor = modoPosicionar ? 'crosshair' : '';
  }, [modoPosicionar]);

  // Marcadores
  useEffect(() => {
    const mapa = mapaRef.current;
    const camada = camadaRef.current;
    if (!mapa || !camada) return;
    camada.clearLayers();
    marcadores.forEach(m => {
      const cor = m.destacado ? '#c9a24a' : '#1f6b47';
      const img = m.imagem || '/favicon-192.png';
      const selo = m.numero
        ? `<span style="position:absolute;top:-6px;right:-6px;background:#1f6b47;color:#fff;font:700 11px/1 sans-serif;border-radius:999px;padding:4px 6px;border:2px solid #fff">${m.numero}</span>`
        : '';
      const html = `<div style="position:relative;width:40px;height:40px;border-radius:50%;background:#fff;border:3px solid ${cor};box-shadow:0 2px 6px rgba(0,0,0,.35);overflow:visible">
        <div style="width:100%;height:100%;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center">
          <img src="${escapar(img)}" alt="" style="width:100%;height:100%;object-fit:cover" />
        </div>${selo}</div>`;
      const icone = L.divIcon({ className: 'eno-marcador', html, iconSize: [40, 40], iconAnchor: [20, 20] });
      const pino = L.marker([m.lat, m.lng], { icon: icone, title: m.titulo }).addTo(camada);
      pino.on('click', () => clickMarcadorRef.current?.(m.id));
    });
    if (trajeto && trajeto.length > 1) {
      L.polyline(trajeto, { color: '#1f6b47', weight: 5, opacity: 0.85 }).addTo(camada);
    }
  }, [marcadores, trajeto]);

  // Enquadra: no primeiro carregamento com marcadores, e sempre que chegar uma rota
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa) return;
    if (trajeto && trajeto.length > 1) {
      mapa.fitBounds(L.latLngBounds(trajeto), { padding: [40, 40] });
      primeiroEnquadramento.current = false;
      return;
    }
    if (primeiroEnquadramento.current && marcadores.length > 0) {
      mapa.fitBounds(L.latLngBounds(marcadores.map(m => [m.lat, m.lng] as [number, number])), { padding: [40, 40], maxZoom: 12 });
      primeiroEnquadramento.current = false;
    }
  }, [marcadores, trajeto]);

  return <div ref={elRef} style={{ height: altura, width: '100%', borderRadius: 8 }} />;
}
