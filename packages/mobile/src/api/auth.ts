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

export async function register(input: {
  email: string;
  password: string;
}): Promise<User> {
  const data = await api.post<AuthResponse>("/auth/register", input);
  await setToken(data.access_token);
  return data.user;
}

export async function logout(): Promise<void> {
  await clearToken();
}

export async function getMe(): Promise<User> {
  return api.get<User>("/auth/me");
}

export async function changeEmail(
  email: string,
  currentPassword: string,
): Promise<User> {
  return api.put<User>("/auth/me/email", {
    email,
    current_password: currentPassword,
  });
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  return api.put<void>("/auth/me/password", {
    current_password: currentPassword,
    new_password: newPassword,
  });
}

export async function deleteAccount(currentPassword: string): Promise<void> {
  return api.delete<void>("/auth/me", { current_password: currentPassword });
}
