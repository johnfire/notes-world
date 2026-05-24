import React, { createContext, useContext, useEffect, useState } from "react";
import type { User } from "@notes-world/shared";
import { getMe, logout as apiLogout } from "../api/auth";
import { getToken } from "../api/client";

interface AuthState {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  logout: async () => {},
  setUser: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (token) {
          const me = await getMe();
          setUser(me);
        }
      } catch {
        // token expired or invalid — stay logged out
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function logout() {
    await apiLogout();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
