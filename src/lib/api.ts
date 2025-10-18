export const API_BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "http://localhost:4000";

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
