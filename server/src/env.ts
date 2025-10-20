import { config } from "dotenv";

config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string): string | null {
  const value = process.env[name];
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseKey: required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY"),
  clientUrl: required("CLIENT_APP_URL"),
  jwtSecret: required("JWT_SECRET"),
  sessionDurationDays: parsePositiveNumber(process.env.SESSION_DURATION_DAYS, 7),
  sessionCookieName: process.env.SESSION_COOKIE_NAME ?? "mr_session",
  n8nWhatsappWebhookUrl: optional("N8N_WHATSAPP_WEBHOOK_URL"),
  n8nWhatsappWebhookUser: optional("N8N_WHATSAPP_WEBHOOK_USER"),
  n8nWhatsappWebhookPassword: optional("N8N_WHATSAPP_WEBHOOK_PASSWORD")
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
