import { Router } from "express";
import type { Response } from "express";

import {
  createSessionToken,
  createUser,
  findUserByEmail,
  findUserById,
  mapToUser,
  normalizeEmail,
  updateUserTimestamp,
  verifyPassword
} from "../auth-service";
import { env } from "../env";
import { requireAuth } from "../middleware/authenticate";

export const authRouter = Router();

const sessionCookieOptions = {
  httpOnly: true,
  secure: env.nodeEnv === "production",
  sameSite: env.nodeEnv === "production" ? "none" : "lax",
  maxAge: Math.round(env.sessionDurationDays * 24 * 60 * 60 * 1000),
  path: "/"
} as const;

authRouter.post("/register", async (request, response) => {
  try {
    const { email, password, fullName } = request.body ?? {};

    if (typeof email !== "string" || typeof password !== "string") {
      return response.status(400).json({ error: "Correo y contraseña son obligatorios" });
    }

    if (!isValidEmail(email)) {
      return response.status(400).json({ error: "Correo inválido" });
    }

    if (password.trim().length < 8) {
      return response.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres" });
    }

    const { user } = await createUser({
      email: normalizeEmail(email),
      password,
      fullName: typeof fullName === "string" ? fullName : null
    });

    const token = createSessionToken(user);
    setSessionCookie(response, token);

    response.status(201).json({ data: { user } });
  } catch (error) {
    console.error("Failed to register user", error);
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : undefined;

    if (code === "23505") {
      return response.status(409).json({ error: "El correo ya está registrado" });
    }

    return response.status(500).json({ error: "No se pudo crear la cuenta" });
  }
});

authRouter.post("/login", async (request, response) => {
  try {
    const { email, password } = request.body ?? {};

    if (typeof email !== "string" || typeof password !== "string") {
      return response.status(400).json({ error: "Correo y contraseña son obligatorios" });
    }

    const normalizedEmail = normalizeEmail(email);
    const existingUser = await findUserByEmail(normalizedEmail);

    if (!existingUser) {
      return response.status(401).json({ error: "Credenciales inválidas" });
    }

    if (!existingUser.is_active) {
      return response.status(403).json({ error: "La cuenta está deshabilitada" });
    }

    const isPasswordValid = await verifyPassword(password, existingUser.password_hash);
    if (!isPasswordValid) {
      return response.status(401).json({ error: "Credenciales inválidas" });
    }

    const user = mapToUser(existingUser);
    await updateUserTimestamp(user.id);

    const token = createSessionToken(user);
    setSessionCookie(response, token);

    response.json({ data: { user } });
  } catch (error) {
    console.error("Failed to login user", error);
    response.status(500).json({ error: "No se pudo iniciar sesión" });
  }
});

authRouter.post("/logout", (_request, response) => {
  clearSessionCookie(response);
  response.json({ data: { success: true } });
});

authRouter.get("/me", requireAuth, async (request, response) => {
  try {
    if (!request.user) {
      clearSessionCookie(response);
      return response.status(401).json({ error: "Sesión no válida" });
    }

    const existing = await findUserById(request.user.id);
    if (!existing) {
      clearSessionCookie(response);
      return response.status(401).json({ error: "Sesión no válida" });
    }

    const user = mapToUser(existing);
    response.json({ data: { user } });
  } catch (error) {
    console.error("Failed to fetch current user", error);
    response.status(500).json({ error: "No se pudo obtener la sesión" });
  }
});

function setSessionCookie(response: Response, token: string) {
  response.cookie(env.sessionCookieName, token, sessionCookieOptions);
}

function clearSessionCookie(response: Response) {
  response.clearCookie(env.sessionCookieName, {
    ...sessionCookieOptions,
    maxAge: 0
  });
}

function isValidEmail(value: string): boolean {
  return /.+@.+\..+/.test(value.trim());
}
