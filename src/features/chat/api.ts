import { loadMockConversations, simulateSendMessage } from "./mock-data";
import type { Conversation, ConversationWithMessages, Message } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "http://localhost:4000";

interface ServerChatHistory {
  id: number;
  sessionId: string;
  phone: string;
  type: string;
  createdAt?: string;
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
    const response = await fetch(`${API_BASE_URL}/api/chat-histories`);
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as { data?: ServerChatHistory[] };
    const histories = payload.data ?? [];

    if (histories.length === 0) {
      return sortConversations(await loadMockConversations());
    }

    return sortConversations(fromServerHistories(histories));
  } catch (error) {
    console.warn("Falling back to mock conversations", error);
    return sortConversations(await loadMockConversations());
  }
}

export async function sendAgentReply(
  conversationId: string,
  body: string
): Promise<Message> {
  return simulateSendMessage(conversationId, body);
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
    unreadCount: 0,
    priority: parsed?.isPedido ? "high" : "normal",
    status: "open",
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
    channel: "whatsapp",
    deliveryStatus: isAgent ? "delivered" : "read"
  };
}

function buildSubject(parsed: ServerChatHistory["parsedContent"], sessionId: string): string {
  if (parsed?.pedido && parsed.pedido.length > 0) {
    return `Pedido para ${parsed.cliente ?? sessionId}`;
  }
  if (parsed?.error && parsed.error.length > 0) {
    return `Seguimiento pendiente (${parsed.error})`;
  }
  return `Conversación ${sessionId}`;
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
