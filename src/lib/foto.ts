// Foto do produto: recorta no centro em quadrado e reduz, para ficar leve no banco.
export const LADO_FOTO = 600;

/** Lê um arquivo de imagem e devolve uma data URL quadrada (JPEG). */
export function fotoQuadrada(arquivo: File, lado = LADO_FOTO): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => {
      const menor = Math.min(img.naturalWidth, img.naturalHeight);
      const x = (img.naturalWidth - menor) / 2;
      const y = (img.naturalHeight - menor) / 2;
      const canvas = document.createElement('canvas');
      canvas.width = lado;
      canvas.height = lado;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Não foi possível preparar a imagem.'));
        return;
      }
      ctx.drawImage(img, x, y, menor, menor, 0, 0, lado, lado);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Esse arquivo não é uma imagem válida.'));
    };
    img.src = url;
  });
}
