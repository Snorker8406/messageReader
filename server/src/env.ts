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
  port: Number(process.env.PORT ?? 4000),
  supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseKey: required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY")
};
