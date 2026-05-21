import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { User } from "../types";
import { setAccessToken } from "../api";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const BASE = "/api/auth";

async function authFetch<T>(
  path: string,
  body: unknown,
): Promise<T & { access_token: string; expires_in: number; user: User }> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

async function refreshFetch(): Promise<{
  access_token: string;
  expires_in: number;
} | null> {
  const res = await fetch(`${BASE}/refresh`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) return null;
  return res.json();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    loading: true,
  });

  useEffect(() => {
    refreshFetch().then((data) => {
      if (data) {
        setAccessToken(data.access_token);
        setState((s) => ({
          ...s,
          accessToken: data.access_token,
          loading: false,
        }));
      } else {
        setState((s) => ({ ...s, loading: false }));
      }
    });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await authFetch<{ user: User }>("/login", { email, password });
    setAccessToken(data.access_token);
    setState({
      user: data.user,
      accessToken: data.access_token,
      loading: false,
    });
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const data = await authFetch<{ user: User }>("/register", {
      email,
      password,
    });
    setAccessToken(data.access_token);
    setState({
      user: data.user,
      accessToken: data.access_token,
      loading: false,
    });
  }, []);

  const logout = useCallback(async () => {
    await fetch(`${BASE}/logout`, { method: "POST", credentials: "include" });
    setAccessToken(null);
    setState({ user: null, accessToken: null, loading: false });
  }, []);

  const getToken = useCallback(() => state.accessToken, [state.accessToken]);

  return (
    <AuthContext.Provider
      value={{ ...state, login, register, logout, getToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
