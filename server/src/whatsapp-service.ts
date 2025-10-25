import { fetch } from "undici";

import { env } from "./env";

export interface SendWhatsAppMessageInput {
  conversationId: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface SendWhatsAppMessageResult {
  status: number;
  responseBody: unknown;
}

export interface N8nWebhookResponse {
  data?: {
    message?: {
      id?: string;
      conversationId?: string;
      authorId?: string;
      authorType?: string;
      body?: string;
      sentAt?: string;
      updatedAt?: string;
      channel?: string;
      deliveryStatus?: string;
      status?: string;
    };
  };
}

export interface N8nMessageResponse {
  wa_id?: string;
  message?: string;
}

export async function sendWhatsAppMessage({
  conversationId,
  message,
  metadata
}: SendWhatsAppMessageInput): Promise<SendWhatsAppMessageResult> {
  if (!env.n8nWhatsappWebhookUrl) {
    throw new Error("N8N webhook URL is not configured (N8N_WHATSAPP_WEBHOOK_URL)");
  }

  const payload = {
    conversationId,
    message,
    ...metadata
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  if (env.n8nWhatsappWebhookUser && env.n8nWhatsappWebhookPassword) {
    const credentials = Buffer.from(
      `${env.n8nWhatsappWebhookUser}:${env.n8nWhatsappWebhookPassword}`,
      "utf8"
    ).toString("base64");
    headers.Authorization = `Basic ${credentials}`;
  }

  const response = await fetch(env.n8nWhatsappWebhookUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });

  console.log("[whatsapp-service] Response status:", response.status);

  const text = await response.text();
  console.log("[whatsapp-service] Response body (raw):", text);

  let parsedBody: unknown = null;

  if (text) {
    try {
      parsedBody = JSON.parse(text) as unknown;
      console.log("[whatsapp-service] Parsed response body:", JSON.stringify(parsedBody, null, 2));
    } catch {
      console.warn("[whatsapp-service] Failed to parse response as JSON, treating as text");
      parsedBody = text;
    }
  }

  if (!response.ok) {
    const details = typeof parsedBody === "string" ? parsedBody : JSON.stringify(parsedBody);
    if (response.status === 404) {
      throw new Error(
        "El webhook de n8n no está activo o no se encuentra registrado. Abre el flujo en n8n, pulsa \"Test workflow\" y vuelve a intentar el envío (en modo test el webhook sólo acepta una llamada tras activarlo)."
      );
    }

    throw new Error(
      `Webhook request failed with status ${response.status}: ${details ?? "No response body"}`
    );
  }

  console.log("[whatsapp-service] ✓ Request successful, returning result");
  return {
    status: response.status,
    responseBody: parsedBody
  };
}
