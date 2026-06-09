import React, { createContext, useContext, useEffect, useState } from "react";
import type { User } from "@notes-world/shared";
import { getMe, logout as apiLogout } from "../api/auth";
import {
  getToken,
  getRefreshToken,
  setAuthFailureHandler,
} from "../api/client";

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

  // When the API layer detects a dead session (refresh token rejected), reset to
  // logged-out so the app shows the login screen instead of looping on 401s.
  useEffect(() => {
    setAuthFailureHandler(() => setUser(null));
    return () => setAuthFailureHandler(null);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [token, refreshToken] = await Promise.all([
          getToken(),
          getRefreshToken(),
        ]);
        // Try to restore the session if either token is present. getMe() will
        // transparently refresh an expired access token via the refresh token,
        // so the user stays logged in across launches as long as it's valid.
        if (token || refreshToken) {
          const me = await getMe();
          setUser(me);
        }
      } catch {
        // refresh token expired or invalid — stay logged out
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
