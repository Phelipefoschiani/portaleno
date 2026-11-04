import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, memoryLocalCache } from 'firebase/firestore';
import { getAuth, setPersistence, browserSessionPersistence } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

/** Sistema ligado ao banco de dados na nuvem (VITE_MODO_NUVEM=1). Desligado = tudo só no navegador, como antes. */
export const MODO_NUVEM = import.meta.env.VITE_MODO_NUVEM === '1';

// Inicializa o app do Firebase
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Cache em memória: o que fica no aparelho é o localStorage (limpo ao sair); nada de um usuário
// fica guardado no navegador para o próximo que entrar.
export const db = initializeFirestore(app, { localCache: memoryLocalCache() }, firebaseConfig.firestoreDatabaseId || '(default)');

export const auth = getAuth(app);
// Fechou o navegador, saiu do sistema (como a sessão local de antes)
setPersistence(auth, browserSessionPersistence).catch(() => {});
