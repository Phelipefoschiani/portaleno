// Vite entrega a URL do arquivo quando o import termina em "?url" (worker do pdf.js)
declare module 'pdfjs-dist/build/pdf.worker.min.mjs?url' {
  const url: string;
  export default url;
}
