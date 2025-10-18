import { config } from "dotenv";

config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseKey: required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY"),
  clientUrl: required("CLIENT_APP_URL"),
  jwtSecret: required("JWT_SECRET"),
  sessionDurationDays: parsePositiveNumber(process.env.SESSION_DURATION_DAYS, 7),
  sessionCookieName: process.env.SESSION_COOKIE_NAME ?? "mr_session"
};

function parsePositiveNumber(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}
