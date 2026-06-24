import { useState, useCallback, useEffect, ReactNode } from "react";
import { User } from "../types";
import { setAccessToken } from "../api";
import { AuthContext, AuthState } from "./AuthContext";

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

async function meFetch(token: string): Promise<User | null> {
  const res = await fetch(`${BASE}/me`, {
    headers: { Authorization: `Bearer ${token}` },
    credentials: "include",
  });
  if (!res.ok) return null;
  return res.json();
}

async function accountFetch(
  method: string,
  path: string,
  token: string,
  body?: unknown,
): Promise<Response> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message ?? `HTTP ${res.status}`);
  }
  return res;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    loading: true,
  });

  useEffect(() => {
    refreshFetch().then(async (data) => {
      if (data) {
        setAccessToken(data.access_token);
        const user = await meFetch(data.access_token);
        setState({
          user,
          accessToken: data.access_token,
          loading: false,
        });
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
    const res = await fetch(`${BASE}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.message ?? `HTTP ${res.status}`);
    }
    if (!data.access_token) {
      // Server returns 200 without tokens when the email is already registered
      // (anti-enumeration). Surface the generic message so the UI can prompt
      // the user to sign in instead.
      throw new Error(
        data.message ??
          "If this email isn't already registered, your account is ready. Try signing in.",
      );
    }
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

  const changeEmail = useCallback(
    async (email: string, currentPassword: string) => {
      if (!state.accessToken) throw new Error("Not authenticated");
      const res = await accountFetch("PUT", "/me/email", state.accessToken, {
        email,
        current_password: currentPassword,
      });
      const user: User = await res.json();
      setState((s) => ({ ...s, user }));
    },
    [state.accessToken],
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (!state.accessToken) throw new Error("Not authenticated");
      await accountFetch("PUT", "/me/password", state.accessToken, {
        current_password: currentPassword,
        new_password: newPassword,
      });
    },
    [state.accessToken],
  );

  const deleteAccount = useCallback(
    async (currentPassword: string) => {
      if (!state.accessToken) throw new Error("Not authenticated");
      await accountFetch("DELETE", "/me", state.accessToken, {
        current_password: currentPassword,
      });
      setAccessToken(null);
      setState({ user: null, accessToken: null, loading: false });
    },
    [state.accessToken],
  );

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        getToken,
        changeEmail,
        changePassword,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
