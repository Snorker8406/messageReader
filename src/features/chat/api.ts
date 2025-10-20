import {
  API_BASE_URL,
  WHATSAPP_WEBHOOK_PASSWORD,
  WHATSAPP_WEBHOOK_URL,
  WHATSAPP_WEBHOOK_USER,
  readApiError
} from "@/lib/api";
import { loadMockConversations, simulateSendMessage } from "./mock-data";
import type { Conversation, ConversationWithMessages, Message } from "./types";

interface ServerChatHistory {
  id: number;
  sessionId: string;
  phone: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  status?: string;
  message: {
    content?: unknown;
    [key: string]: unknown;
  };
  parsedContent?: {
    isPedido?: boolean;
    pedido?: string;
    volumen?: string;
    cliente?: string;
    celular?: string;
    error?: string;
    respuesta?: string;
    [key: string]: unknown;
  };
}

export async function fetchConversations(): Promise<ConversationWithMessages[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat-histories`, {
      credentials: "include"
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error("Unauthorized");
      }
      throw new Error(`Request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as { data?: ServerChatHistory[] };
    const histories = payload.data ?? [];

    if (histories.length === 0) {
      return sortConversations(await loadMockConversations());
    }

    return sortConversations(fromServerHistories(histories));
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      throw error;
    }
    console.warn("Falling back to mock conversations", error);
    return sortConversations(await loadMockConversations());
  }
}

export async function sendAgentReply(
  conversationId: string,
  body: string
): Promise<Message> {
  const trimmedBody = body.trim();
  if (trimmedBody.length === 0) {
    throw new Error("El mensaje no puede estar vacío");
  }

  if (WHATSAPP_WEBHOOK_URL) {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };

      if (WHATSAPP_WEBHOOK_USER && WHATSAPP_WEBHOOK_PASSWORD) {
        headers.Authorization = `Basic ${encodeBasicAuth(
          WHATSAPP_WEBHOOK_USER,
          WHATSAPP_WEBHOOK_PASSWORD
        )}`;
      }

      const response = await fetch(WHATSAPP_WEBHOOK_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({
          conversationId,
          message: trimmedBody
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          errorText?.length
            ? errorText
            : `Webhook request failed with status ${response.status}`
        );
      }

      return createOptimisticAgentMessage(conversationId, trimmedBody);
    } catch (error) {
      console.warn("Failed to send message via configured webhook, falling back to API", error);
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/chat-histories/${conversationId}/reply`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({ message: trimmedBody })
    });

    if (response.status === 401 || response.status === 403) {
      const errorMessage = await readApiError(response);
      throw new Error(errorMessage || "Unauthorized");
    }

    if (!response.ok) {
      const errorMessage = await readApiError(response);
      throw new Error(errorMessage || `Request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as {
      data?: { message?: ServerAgentReply };
    };

    const serverMessage = payload.data?.message;
    if (!serverMessage) {
      throw new Error("Respuesta inválida del servidor");
    }

    return normalizeAgentReply(serverMessage);
  } catch (error) {
    if (error instanceof Error && /unauthorized/i.test(error.message)) {
      throw error;
    }

    console.warn("Falling back to simulated sendMessage", error);
    return simulateSendMessage(conversationId, trimmedBody);
  }
}

export async function markConversationAsRead(conversationId: string): Promise<number> {
  const response = await fetch(`${API_BASE_URL}/api/chat-histories/${conversationId}/read`, {
    method: "PATCH",
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error(`Failed to mark conversation ${conversationId} as read`);
  }

  const payload = (await response.json()) as { data?: { updatedCount?: number } };
  return payload.data?.updatedCount ?? 0;
}

function fromServerHistories(histories: ServerChatHistory[]): ConversationWithMessages[] {
  const grouped = new Map<string, ServerChatHistory[]>();

  for (const item of histories) {
    const key = item.sessionId || item.phone;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(item);
  }

  return Array.from(grouped.entries()).map(([sessionId, items]) => toConversation(sessionId, items));
}

function toConversation(sessionId: string, items: ServerChatHistory[]): ConversationWithMessages {
  const sortedItems = [...items].sort((a, b) => {
    const timeA = new Date(a.createdAt ?? 0).getTime() || 0;
    const timeB = new Date(b.createdAt ?? 0).getTime() || 0;
    return timeA - timeB;
  });
  const latest = sortedItems.at(-1);
  const parsed = latest?.parsedContent;

  const baseConversation: Conversation = {
    id: sessionId,
    subject: buildSubject(parsed, sessionId),
    participants: [
      {
        id: `customer-${sessionId}`,
        name: parsed?.cliente && parsed.cliente.length > 0 ? parsed.cliente : sessionId,
        handle: parsed?.celular ?? sessionId
      },
      {
        id: "agent-cloud",
        name: "Equipo Cloud Jeans",
        handle: "cloud-jeans"
      }
    ],
    lastMessagePreview: parsed?.respuesta ?? describeContent(latest),
    lastMessageAt: latest?.createdAt ?? new Date().toISOString(),
  updatedAt: latest?.updatedAt ?? latest?.createdAt ?? new Date().toISOString(),
    unreadCount: 0,
    priority: parsed?.isPedido ? "high" : "normal",
    status: latest?.status === "closed" ? "closed" : "open",
    tags: buildTags(parsed),
    channel: "whatsapp",
    assignedTo: {
      id: "agent-cloud",
      name: "Equipo Cloud Jeans",
      handle: "cloud-jeans"
    }
  };

  return {
    ...baseConversation,
    messages: sortedItems.map((item, index) => toMessage(sessionId, item, index))
  };
}

function toMessage(
  conversationId: string,
  item: ServerChatHistory,
  index: number
): Message {
  const parsed = item.parsedContent;
  const isAgent = item.type === "ai";
  return {
    id: `${conversationId}-${item.id}`,
    conversationId,
    authorId: isAgent ? "agent-cloud" : `customer-${conversationId}`,
    authorType: isAgent ? "agent" : "customer",
    body: isAgent
      ? parsed?.respuesta ?? describeContent(item)
      : parsed?.pedido || parsed?.respuesta || describeContent(item),
    sentAt: item.createdAt ?? new Date(Date.now() - index * 60_000).toISOString(),
    updatedAt: item.updatedAt ?? item.createdAt ?? new Date(Date.now() - index * 60_000).toISOString(),
    channel: "whatsapp",
    deliveryStatus: isAgent ? "delivered" : "read",
    status: item.status ?? null
  };
}

function buildSubject(parsed: ServerChatHistory["parsedContent"], sessionId: string): string {
  if (parsed?.pedido && parsed.pedido.length > 0) {
    return `Pedido para ${parsed.cliente ?? sessionId}`;
  }
  if (parsed?.error && parsed.error.length > 0) {
    return `Seguimiento pendiente (${parsed.error})`;
  }
  return `Conversación ${parsed?.cliente ?? sessionId.slice(3)}`;
}

function describeContent(item: ServerChatHistory | undefined): string {
  if (!item) {
    return "Mensaje sin contenido";
  }
  if (typeof item.message?.content === "string") {
    return item.message.content;
  }
  return JSON.stringify(item.message?.content ?? item.message ?? {}, null, 2).slice(0, 140);
}

function buildTags(parsed: ServerChatHistory["parsedContent"]): string[] {
  const tags = new Set<string>();
  if (parsed?.volumen) {
    tags.add(parsed.volumen);
  }
  if (parsed?.isPedido) {
    tags.add("pedido");
  }
  if (parsed?.error) {
    tags.add("requiere-revision");
  }
  return Array.from(tags);
}

function sortConversations(conversations: ConversationWithMessages[]): ConversationWithMessages[] {
  return conversations.sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  );
}

interface ServerAgentReply {
  id: string;
  conversationId: string;
  authorId: string;
  authorType: "agent" | "customer";
  body: string;
  sentAt: string;
  updatedAt: string;
  channel: string;
  deliveryStatus: "sent" | "delivered" | "read";
  status?: string | null;
  attachments?: Message["attachments"];
}

function normalizeAgentReply(reply: ServerAgentReply): Message {
  return {
    id: reply.id,
    conversationId: reply.conversationId,
    authorId: reply.authorId,
    authorType: reply.authorType,
    body: reply.body,
    sentAt: reply.sentAt,
    updatedAt: reply.updatedAt,
    channel: reply.channel as Message["channel"],
    deliveryStatus: reply.deliveryStatus,
    status: reply.status ?? null,
    attachments: reply.attachments ?? [],
    // Ensure compatibility with existing UI defaults
    // Additional fields can be expanded if backend sends more data
  };
}

function createOptimisticAgentMessage(conversationId: string, message: string): Message {
  const now = new Date().toISOString();
  const id = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${conversationId}-${Date.now()}`;

  return {
    id,
    conversationId,
    authorId: "agent-cloud",
    authorType: "agent",
    body: message,
    sentAt: now,
    updatedAt: now,
    channel: "whatsapp",
    deliveryStatus: "sent",
    status: "pending",
    attachments: []
  };
}

function encodeBasicAuth(username: string, password: string): string {
  const raw = `${username}:${password}`;
  if (typeof btoa === "function") {
    return btoa(raw);
  }
  const maybeBuffer = (globalThis as Record<string, unknown>).Buffer as
    | { from(data: string, encoding: string): { toString(encoding: string): string } }
    | undefined;
  if (maybeBuffer) {
    return maybeBuffer.from(raw, "utf8").toString("base64");
  }
  throw new Error("Basic auth encoding is not supported in this environment");
}
