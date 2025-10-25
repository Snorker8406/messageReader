import { supabase } from "./supabase";
import type {
  ChatHistoryItem,
  ChatHistoryMessage,
  ChatHistoryRow,
  ParsedMessageContent
} from "./types";

const TABLE_NAME = "n8n_chat_histories";

export interface FetchChatHistoryOptions {
  sessionId?: string;
  limit?: number;
}

export async function fetchChatHistories({
  sessionId,
  limit
}: FetchChatHistoryOptions): Promise<ChatHistoryItem[]> {
  const { data, error } = await buildQuery("id, session_id, message, status, app_state, created_at, updated_at", {
    sessionId,
    limit
  });

  if (error) {
    throw new Error(`Supabase query failed: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as ChatHistoryRow[];
  return rows.map(normalizeChatHistory);
}

export async function markConversationMessagesRead(sessionId: string): Promise<number> {
  const normalizedSessionId = sessionId.trim();
  if (!normalizedSessionId) {
    throw new Error("Session ID is required to mark messages as read");
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update({ status: "read" })
    .eq("session_id", normalizedSessionId)
    .is("status", null)
    .select("id");

  if (error) {
    throw new Error(`Failed to update message status: ${error.message}`);
  }

  return data?.length ?? 0;
}

export async function saveN8nReplyMessage(
  conversationId: string,
  messageBody: string,
  appState?: string | null
): Promise<void> {
  console.log("[chat-service] saveN8nReplyMessage called with:");
  console.log("  - conversationId:", conversationId);
  console.log("  - messageBody:", messageBody);
  console.log("  - appState:", appState ?? "not provided");

  const messagePayload = {
    type: "ai",
    content: messageBody
  };
  console.log("[chat-service] Constructed payload:", JSON.stringify(messagePayload));

  console.log("[chat-service] Inserting into table:", TABLE_NAME);
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert([
      {
        session_id: conversationId,
        message: messagePayload,
        status: null,
        app_state: appState ?? null
      }
    ]);

  if (error) {
    console.error("[chat-service] ✗ Supabase insert error:", error);
    throw new Error(`Failed to save n8n reply message: ${error.message}`);
  }

  console.log("[chat-service] ✓ Insert successful. Data:", data);
}

function buildQuery(
  columns: string,
  options: FetchChatHistoryOptions
) {
  let query = supabase
    .from(TABLE_NAME)
    .select(columns);

  if (options.sessionId) {
    query = query.eq("session_id", options.sessionId.trim());
  }

  if (
    typeof options.limit === "number" &&
    Number.isFinite(options.limit) &&
    options.limit > 0
  ) {
    query = query.limit(options.limit);
  }

  return query;
}

function normalizeChatHistory(row: ChatHistoryRow): ChatHistoryItem {
  const message: ChatHistoryMessage = row.message ?? {};
  const parsedContent = parseContent(message.content);
  return {
    id: row.id,
    sessionId: row.session_id,
    phone:
      typeof parsedContent?.celular === "string" && parsedContent.celular.length > 0
        ? parsedContent.celular
        : row.session_id,
    type: typeof message.type === "string" ? message.type : "unknown",
    message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: row.status,
    appState: row.app_state ?? null,
    parsedContent
  };
}

function parseContent(content: unknown): ParsedMessageContent | undefined {
  if (!content) {
    return undefined;
  }

  if (typeof content === "object" && !Array.isArray(content)) {
    return extractPayload(content as ParsedMessageContent | { output?: ParsedMessageContent });
  }

  if (typeof content === "string") {
    const trimmed = content.trim();

    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed) as ParsedMessageContent | { output?: ParsedMessageContent };
        return extractPayload(parsed);
      } catch (error) {
        console.warn("Failed to parse message.content", error);
        return { respuesta: content } as ParsedMessageContent;
      }
    }

    return { respuesta: content } as ParsedMessageContent;
  }

  return undefined;
}

function extractPayload(value: ParsedMessageContent | { output?: ParsedMessageContent }):
  | ParsedMessageContent
  | undefined {
  if (!value) {
    return undefined;
  }

  if ("output" in value && value.output && typeof value.output === "object") {
    return value.output as ParsedMessageContent;
  }

  return value as ParsedMessageContent;
}
