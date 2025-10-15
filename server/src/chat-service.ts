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
  const { data, error } = await buildQuery("id, session_id, message", {
    sessionId,
    limit
  });

  if (error) {
    throw new Error(`Supabase query failed: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as ChatHistoryRow[];
  return rows.map(normalizeChatHistory);
}

function buildQuery(
  columns: string,
  options: FetchChatHistoryOptions
) {
  let query = supabase
    .from(TABLE_NAME)
    .select(columns)
    .order("id", { ascending: false });

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
    try {
      const parsed = JSON.parse(content) as ParsedMessageContent | { output?: ParsedMessageContent };
      return extractPayload(parsed);
    } catch (error) {
      console.warn("Failed to parse message.content", error);
      return undefined;
    }
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
