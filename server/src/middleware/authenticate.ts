import type { NextFunction, Request, Response } from "express";

import { decodeToken } from "../auth-service";
import { env } from "../env";
import type { AuthenticatedUser } from "../types";

const AUTH_HEADER_PREFIX = "bearer ";

export function extractToken(request: Request): string | null {
  const cookieToken = (request.cookies?.[env.sessionCookieName] ?? "").trim();
  if (cookieToken) {
    return cookieToken;
  }

  const authHeader = request.get("authorization");
  if (!authHeader) {
    return null;
  }

  const normalized = authHeader.trim();
  if (normalized.toLowerCase().startsWith(AUTH_HEADER_PREFIX)) {
    return normalized.slice(AUTH_HEADER_PREFIX.length).trim();
  }

  return null;
}

export function requireAuth(request: Request, response: Response, next: NextFunction) {
  try {
    const token = extractToken(request);
    if (!token) {
      return response.status(401).json({ error: "No autorizado" });
    }

    const payload = decodeToken(token);
    if (payload.isActive === false) {
      return response.status(403).json({ error: "Cuenta deshabilitada" });
    }

    const user: AuthenticatedUser = {
      id: payload.sub,
      email: payload.email,
      role: payload.role ?? "user",
      fullName: payload.fullName ?? null,
      isActive: payload.isActive ?? true
    };

    request.user = user;
    return next();
  } catch (error) {
    console.error("Failed to verify authentication token", error);
    return response.status(401).json({ error: "Sesión inválida" });
  }
}
