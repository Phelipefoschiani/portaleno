import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';

// No computador (npm run dev), atende /api/* com as mesmas funções que rodam na Vercel
function funcoesApiLocais(): Plugin {
  return {
    name: 'funcoes-api-locais',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const rota = (req.url || '').split('?')[0];
        if (!rota.startsWith('/api/')) return next();
        const nome = rota.slice(5).replace(/[^a-z0-9_-]/gi, '');
        try {
          const mod = await server.ssrLoadModule(`/api/${nome}.ts`);
          let corpo = '';
          for await (const parte of req) corpo += parte;
          const resposta = {
            status(c: number) { res.statusCode = c; return resposta; },
            json(dados: unknown) { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(dados)); },
          };
          await mod.default({ method: req.method, headers: req.headers, body: corpo }, resposta);
        } catch (e) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ erro: e instanceof Error ? e.message : 'Erro na função local' }));
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), funcoesApiLocais()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify; file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
