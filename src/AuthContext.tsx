import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from './types';
import { supabase } from './supabaseClient';

interface AuthContextType {
  user: User | null;
  login: (login: string, senha: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('grupo_eno_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (loginStr: string, senhaStr: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      // Generic check for users added to the DB
      const { data, error } = await supabase.from('usuarios').select('*').eq('login', loginStr).single();
      if (data) {
         // Verifica se a tabela 'usuarios' tem a coluna 'senha' e se ela confere
         // Se não tiver a coluna (undefined), bloqueia a entrada até que seja criada.
         if (data.senha !== senhaStr) {
           console.error("Senha incorreta ou coluna 'senha' não existe na tabela 'usuarios'.");
           return false;
         }
         
         const userObj: User = { ...data };
         setUser(userObj);
         localStorage.setItem('grupo_eno_user', JSON.stringify(userObj));
         return true;
      }
      
      return false;
    } catch (e) {
      console.error("Login erro:", e);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('grupo_eno_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
