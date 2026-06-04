import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from './types';

interface AuthContextType {
  user: User | null;
  login: (login: string, senha: string) => Promise<boolean>;
  logout: () => void;
  updateSelf: (nome: string, loginStr: string, senhaStr: string) => void;
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
      // 1. Check for Gerente (Manager/Admin)
      const cachedManagerPassword = localStorage.getItem('grupo_eno_manager_password') || 'admin';
      const cachedManagerLogin = localStorage.getItem('grupo_eno_manager_login') || 'admin';
      const cachedManagerNome = localStorage.getItem('grupo_eno_manager_nome') || 'Administrador';
      
      if (loginStr === cachedManagerLogin && senhaStr === cachedManagerPassword) {
         const userObj: User = { 
           id: '1', 
           nome: cachedManagerNome, 
           login: cachedManagerLogin, 
           perfil: 'gerente', 
           ativo: true 
         };
         setUser(userObj);
         localStorage.setItem('grupo_eno_user', JSON.stringify(userObj));
         return true;
      }
      
      // 2. Check for other created users in localStorage
      const usersRaw = localStorage.getItem('grupo_eno_usuarios_v2');
      if (usersRaw) {
        const usersList: User[] = JSON.parse(usersRaw);
        const matched = usersList.find(u => u.login === loginStr && u.senha === senhaStr && u.ativo);
        if (matched) {
          setUser(matched);
          localStorage.setItem('grupo_eno_user', JSON.stringify(matched));
          return true;
        }
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

  const updateSelf = (nomeStr: string, loginStr: string, senhaStr: string) => {
    localStorage.setItem('grupo_eno_manager_nome', nomeStr);
    localStorage.setItem('grupo_eno_manager_login', loginStr);
    localStorage.setItem('grupo_eno_manager_password', senhaStr);
    
    if (user && user.perfil === 'gerente') {
      const updatedUser = { ...user, nome: nomeStr, login: loginStr };
      setUser(updatedUser);
      localStorage.setItem('grupo_eno_user', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateSelf, isLoading }}>
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
