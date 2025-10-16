export interface ChatHistoryRow {
  id: number;
  session_id: string;
  message: ChatHistoryMessage;
  created_at: string;
  updated_at: string;
  status?: string;
}

export interface ChatHistoryMessage {
  type?: string;
  content?: unknown;
  tool_calls?: unknown;
  additional_kwargs?: unknown;
  response_metadata?: unknown;
  invalid_tool_calls?: unknown;
  [key: string]: unknown;
}

export interface ParsedMessageContent {
  isPedido?: boolean;
  pedido?: string;
  volumen?: string;
  cliente?: string;
  celular?: string;
  error?: string;
  respuesta?: string;
  [key: string]: unknown;
}

export interface ChatHistoryItem {
  id: number;
  sessionId: string;
  phone: string;
  type: string;
  message: ChatHistoryMessage;
  createdAt: string;
  updatedAt: string;
  status?: string;
  parsedContent?: ParsedMessageContent;
}
