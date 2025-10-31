import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import type { NextFunction, Request, Response } from "express";

import { env } from "./env";
import { requireAuth } from "./middleware/authenticate";
import { authRouter } from "./routes/auth";
import { chatRouter } from "./routes/chat";
import { catalogRouter } from "./routes/catalog";

const app = express();

const allowedOrigins = env.clientUrl
  .split(",")
  .map((value) => value.trim())
  .filter((value) => value.length > 0);

// Log allowed origins para debugging
console.log("[CORS] Allowed origins:", allowedOrigins);

app.use(
  cors({
    origin(origin, callback) {
      // Si no hay origin (requests desde el mismo servidor), permitir
      if (!origin) {
        return callback(null, true);
      }

      // Log del origin recibido
      console.log("[CORS] Request origin:", origin);

      // Permitir si está en la lista
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // En desarrollo, permitir localhost
      if (process.env.NODE_ENV === "development" && origin.includes("localhost")) {
        return callback(null, true);
      }

      const error = `Origin ${origin} not allowed by CORS. Allowed: ${allowedOrigins.join(", ")}`;
      console.error("[CORS] Error:", error);
      return callback(new Error(error));
    },
    credentials: true
  })
);
app.use(cookieParser());
app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/chat-histories", requireAuth, chatRouter);
app.use("/api/catalog-metadata", requireAuth, catalogRouter);

app.use((error: unknown, _request: Request, response: Response, next: NextFunction) => {
  if (error instanceof Error && /not allowed by CORS/i.test(error.message)) {
    return response.status(403).json({ error: "Origen no permitido" });
  }

  return next(error);
});

app.use((request, response) => {
  response.status(404).json({ error: `Not found: ${request.path}` });
});

app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  void _next;
  console.error("Unhandled server error", error);
  response.status(500).json({ error: "Error interno del servidor" });
});

app.listen(env.port, () => {
  console.log(`Server listening on http://localhost:${env.port}`);
});
