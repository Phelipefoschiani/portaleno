// App da produção: página própria (producao.html), instalável no celular. Não carrega o sistema inteiro.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import { ProducaoApp } from './ProducaoApp';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ProducaoApp />
  </StrictMode>,
);
