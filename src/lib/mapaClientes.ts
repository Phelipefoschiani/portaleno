// Mapa de clientes: endereço -> posição (OpenStreetMap/Nominatim) e rota otimizada (OSRM).
// Sem chave de API. Uso leve: a posição é buscada uma vez por endereço, e a rota só quando o representante pede.
import type { Cliente } from '../data/clientesData';

export interface PontoMapa {
  lat: number;
  lng: number;
}

/** Centro do Brasil e zoom que mostra o país inteiro. */
export const CENTRO_BRASIL: PontoMapa = { lat: -14.2, lng: -51.9 };
export const ZOOM_BRASIL = 4;

export function enderecoDoCliente(c: Pick<Cliente, 'endereco'>): string {
  const e = c.endereco;
  if (!e) return '';
  const rua = [e.logradouro, e.numero].filter(Boolean).join(', ');
  const cidade = e.municipio && e.uf ? `${e.municipio} - ${e.uf}` : e.municipio || '';
  return [rua, e.bairro, cidade, 'Brasil'].map(s => (s || '').trim()).filter(Boolean).join(', ');
}

/** Texto do endereço normalizado: se mudar, a posição precisa ser buscada de novo. */
export function chaveEndereco(c: Pick<Cliente, 'endereco'>): string {
  return enderecoDoCliente(c).toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Precisa buscar (ou buscar de novo) a posição: sem posição, ou posição automática de outro endereço. */
export function precisaLocalizar(c: Cliente): boolean {
  if (!enderecoDoCliente(c)) return false;
  if (!c.geo) return true;
  return c.geo.origem === 'GEOCODIFICADO' && c.geo.endereco_chave !== chaveEndereco(c);
}

/** Busca a posição de um endereço (Nominatim). Null quando não encontra. Respeitar 1 requisição por segundo. */
export async function buscarPosicaoEndereco(endereco: string): Promise<PontoMapa | null> {
  if (!endereco.trim()) return null;
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(endereco)}`;
  const resposta = await fetch(url, { headers: { 'Accept-Language': 'pt-BR' } });
  if (!resposta.ok) throw new Error('Serviço de localização indisponível no momento.');
  const dados = await resposta.json();
  if (!Array.isArray(dados) || !dados[0]) return null;
  const lat = parseFloat(dados[0].lat);
  const lng = parseFloat(dados[0].lon);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

export const esperar = (ms: number) => new Promise(r => setTimeout(r, ms));

export interface RotaCalculada {
  /** Trajeto completo, em [lat, lng], para desenhar no mapa. */
  trajeto: [number, number][];
  /** Índices das paradas (na lista recebida) na ordem em que devem ser visitadas. */
  ordem: number[];
  km: number;
  minutos: number;
}

/**
 * Rota a partir de `inicio` passando por todas as `paradas`, na melhor ordem (OSRM trip).
 * Termina na última parada. Null quando não há rota possível.
 */
export async function calcularRota(inicio: PontoMapa, paradas: PontoMapa[]): Promise<RotaCalculada | null> {
  if (paradas.length === 0) return null;
  const pontos = [inicio, ...paradas];
  const coords = pontos.map(p => `${p.lng},${p.lat}`).join(';');
  const url = `https://router.project-osrm.org/trip/v1/driving/${coords}?source=first&roundtrip=false&overview=full&geometries=geojson`;
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error('Serviço de rotas indisponível no momento.');
  const dados = await resposta.json();
  if (dados.code !== 'Ok' || !dados.trips?.[0] || !Array.isArray(dados.waypoints)) return null;
  const trip = dados.trips[0];
  // waypoints vem na ordem da entrada; waypoint_index é a posição de visita
  const visitas = dados.waypoints
    .map((w: { waypoint_index: number }, i: number) => ({ i, pos: w.waypoint_index }))
    .sort((a: { pos: number }, b: { pos: number }) => a.pos - b.pos);
  const ordem = visitas.map((v: { i: number }) => v.i).filter((i: number) => i > 0).map((i: number) => i - 1);
  const trajeto = (trip.geometry.coordinates as [number, number][]).map(([lng, lat]) => [lat, lng] as [number, number]);
  return { trajeto, ordem, km: Math.round((trip.distance / 1000) * 10) / 10, minutos: Math.round(trip.duration / 60) };
}
