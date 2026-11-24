// App da roça: página própria (roca.html), instalável no Android. Não carrega o sistema inteiro.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import { RocaApp } from './RocaApp';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RocaApp />
  </StrictMode>,
);
