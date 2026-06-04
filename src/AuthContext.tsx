import React, { createContext, useContext, useState, useEffect } from "react";
import { User, UserRole } from "./types";
import { supabase } from "./supabase";

interface AuthContextType {
  user: User | null;
  login: (login: string, senha: string) => Promise<boolean>;
  logout: () => void;
  updateSelf: (
    nome: string,
    loginStr: string,
    senhaStr: string,
  ) => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const savedUser = localStorage.getItem("grupo_eno_user");
      if (savedUser) {
        try {
          const u = JSON.parse(savedUser);
          const { data, error } = await supabase
            .from("usuarios")
            .select("*")
            .eq("id", u.id)
            .single();

          if (data && data.ativo) {
            setUser(data as User);
          } else {
            localStorage.removeItem("grupo_eno_user");
          }
        } catch (e) {
          console.error(e);
        }
      }
      setIsLoading(false);
    };
    checkUser();
  }, []);

  const login = async (
    loginStr: string,
    senhaStr: string,
  ): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("usuarios")
        .select("*")
        .eq("login", loginStr)
        .eq("senha", senhaStr)
        .eq("ativo", true)
        .single();

      if (data) {
        setUser(data as User);
        localStorage.setItem("grupo_eno_user", JSON.stringify(data));
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
    localStorage.removeItem("grupo_eno_user");
  };

  const updateSelf = async (
    nomeStr: string,
    loginStr: string,
    senhaStr: string,
  ) => {
    if (user) {
      const { data, error } = await supabase
        .from("usuarios")
        .update({ nome: nomeStr, login: loginStr, senha: senhaStr })
        .eq("id", user.id)
        .select()
        .single();

      if (data) {
        setUser(data as User);
        localStorage.setItem("grupo_eno_user", JSON.stringify(data));
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, login, logout, updateSelf, isLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
