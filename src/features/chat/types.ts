export type Channel = "whatsapp" | "messenger" | "email" | "sms";
export type ConversationStatus = "open" | "pending" | "closed" | "snoozed";
export type Priority = "low" | "normal" | "high" | "urgent";

export interface Participant {
  id: string;
  name: string;
  avatar?: string;
  handle?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  authorId: string;
  authorType: "agent" | "customer";
  body: string;
  sentAt: string;
  attachments?: Array<{ id: string; name: string; url: string }>;
  channel: Channel;
  deliveryStatus: "sent" | "delivered" | "read";
}

export interface Conversation {
  id: string;
  subject: string;
  participants: Participant[];
  lastMessagePreview: string;
  lastMessageAt: string;
  unreadCount: number;
  priority: Priority;
  status: ConversationStatus;
  tags: string[];
  channel: Channel;
  assignedTo?: Participant;
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}
