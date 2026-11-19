// Foto da fachada do cliente: guardada no bucket "fachadas" do Supabase Storage (leitura pública).
import { supabase } from './supabase';
import { fotoQuadrada } from './foto';

const BUCKET = 'fachadas';

/** Envia a foto (redimensionada para 800px) e devolve a URL pública. Substitui a foto anterior do cliente. */
export async function enviarFachada(clienteId: string, arquivo: File): Promise<string> {
  if (!supabase) throw new Error('Banco de dados não configurado.');
  const dataUrl = await fotoQuadrada(arquivo, 800);
  const blob = await (await fetch(dataUrl)).blob();
  const caminho = `${clienteId}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(caminho, blob, {
    upsert: true,
    contentType: 'image/jpeg',
    cacheControl: '3600',
  });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(caminho);
  // Parâmetro de versão: a imagem trocada aparece na hora, sem esperar o cache
  return `${data.publicUrl}?v=${Date.now()}`;
}
