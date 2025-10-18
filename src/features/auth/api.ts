import { API_BASE_URL, readApiError } from "@/lib/api";

import type { User } from "./types";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  fullName?: string | null;
}

interface AuthApiResponse {
  data?: {
    user?: User;
    success?: boolean;
  };
}

export async function login(payload: LoginPayload): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include",
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const message = await readApiError(response);
    throw new Error(message || "No se pudo iniciar sesión");
  }

  const data = (await response.json()) as AuthApiResponse;
  const user = data.data?.user;
  if (!user) {
    throw new Error("Respuesta inválida del servidor");
  }

  return user;
}

export async function register(payload: RegisterPayload): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include",
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const message = await readApiError(response);
    throw new Error(message || "No se pudo crear la cuenta");
  }

  const data = (await response.json()) as AuthApiResponse;
  const user = data.data?.user;
  if (!user) {
    throw new Error("Respuesta inválida del servidor");
  }

  return user;
}

export async function getCurrentUser(): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    method: "GET",
    credentials: "include"
  });

  if (!response.ok) {
    const message = await readApiError(response);
    throw new Error(message || "Sesión no válida");
  }

  const data = (await response.json()) as AuthApiResponse;
  const user = data.data?.user;
  if (!user) {
    throw new Error("Sesión no disponible");
  }

  return user;
}

export async function logout(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
    method: "POST",
    credentials: "include"
  });

  if (!response.ok) {
    const message = await readApiError(response);
    throw new Error(message || "No se pudo cerrar sesión");
  }
}
