const optionalString = (value: string | undefined | null): string | null => {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeUrl = (value: string | undefined): string | null => {
  const normalized = optionalString(value);
  if (!normalized) {
    return null;
  }
  return normalized.replace(/\/$/, "");
};

export const API_BASE_URL =
  normalizeUrl(import.meta.env.VITE_API_URL) ?? "http://localhost:4000";

export const WHATSAPP_WEBHOOK_URL = normalizeUrl(import.meta.env.VITE_WHATSAPP_WEBHOOK_URL ?? undefined);
export const WHATSAPP_WEBHOOK_USER = optionalString(import.meta.env.VITE_WHATSAPP_WEBHOOK_USER ?? undefined);
export const WHATSAPP_WEBHOOK_PASSWORD = optionalString(
  import.meta.env.VITE_WHATSAPP_WEBHOOK_PASSWORD ?? undefined
);
export const IMAGE_ANALYSIS_START_URL = optionalString(
  import.meta.env.VITE_IMAGE_ANALYSIS_START_URL ?? undefined
);

export interface ApiErrorResponse {
  error?: string;
  message?: string;
  [key: string]: unknown;
}

export async function readApiError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as ApiErrorResponse;
    if (typeof payload.error === "string" && payload.error.length > 0) {
      return payload.error;
    }
    if (typeof payload.message === "string" && payload.message.length > 0) {
      return payload.message;
    }
  } catch (error) {
    console.warn("Failed to parse API error response", error);
  }

  return response.statusText || "Error inesperado";
}
