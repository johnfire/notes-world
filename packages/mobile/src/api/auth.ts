import { api, setToken, clearToken } from "./client";
import type { User, LoginInput } from "@notes-world/shared";

interface AuthResponse {
  user: User;
  access_token: string;
  expires_in: number;
}

export async function login(input: LoginInput): Promise<User> {
  const data = await api.post<AuthResponse>("/auth/login", input);
  await setToken(data.access_token);
  return data.user;
}

export async function logout(): Promise<void> {
  await clearToken();
}

export async function getMe(): Promise<User> {
  return api.get<User>("/auth/me");
}
