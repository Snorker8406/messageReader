import { addMinutes, subHours, subMinutes } from "date-fns";

import type { ConversationWithMessages, Message, Participant } from "./types";

const agents: Participant[] = [
  { id: "agent-1", name: "Laura Jiménez", handle: "laura" },
  { id: "agent-2", name: "Carlos Pérez", handle: "carlos" }
];

const customers: Participant[] = [
  { id: "customer-1", name: "María Rodríguez", handle: "@maria" },
  { id: "customer-2", name: "Juan Ortega", handle: "@juan" },
  { id: "customer-3", name: "Luisa Fernández", handle: "@luisa" }
];

const message = (props: Partial<Message>): Message => ({
  id: props.id ?? crypto.randomUUID(),
  conversationId: props.conversationId ?? "",
  authorId: props.authorId ?? "",
  authorType: props.authorType ?? "customer",
  body: props.body ?? "",
  sentAt: props.sentAt ?? new Date().toISOString(),
  attachments: props.attachments,
  channel: props.channel ?? "whatsapp",
  deliveryStatus: props.deliveryStatus ?? "read"
});

export const mockConversations: ConversationWithMessages[] = [
  {
    id: "conv-1",
    subject: "Problemas con la entrega",
    participants: [customers[0], agents[0]],
    lastMessagePreview: "¿Cuándo llegará mi pedido?",
    lastMessageAt: subMinutes(new Date(), 12).toISOString(),
    unreadCount: 2,
    priority: "high",
    status: "open",
    tags: ["envíos", "vip"],
    channel: "whatsapp",
    assignedTo: agents[0],
    messages: [
      message({
        id: "msg-1",
        conversationId: "conv-1",
        authorId: customers[0].id,
        authorType: "customer",
        body: "Hola, hice un pedido ayer y aún no tengo novedades.",
        sentAt: subHours(new Date(), 2).toISOString(),
        channel: "whatsapp"
      }),
      message({
        id: "msg-2",
        conversationId: "conv-1",
        authorId: agents[0].id,
        authorType: "agent",
        body: "Hola María, ya consulto con logística y te confirmo.",
        sentAt: subMinutes(new Date(), 50).toISOString(),
        channel: "whatsapp"
      }),
      message({
        id: "msg-3",
        conversationId: "conv-1",
        authorId: customers[0].id,
        authorType: "customer",
        body: "Gracias, quedo atenta.",
        sentAt: subMinutes(new Date(), 12).toISOString(),
        channel: "whatsapp",
        deliveryStatus: "delivered"
      })
    ]
  },
  {
    id: "conv-2",
    subject: "Solicitud de factura",
    participants: [customers[1], agents[1]],
    lastMessagePreview: "Te paso la factura en PDF",
    lastMessageAt: subMinutes(new Date(), 5).toISOString(),
    unreadCount: 0,
    priority: "normal",
    status: "pending",
    tags: ["facturación"],
    channel: "email",
    assignedTo: agents[1],
    messages: [
      message({
        id: "msg-4",
        conversationId: "conv-2",
        authorId: customers[1].id,
        authorType: "customer",
        body: "Buen día, necesito la factura de la compra #4532.",
        sentAt: subHours(new Date(), 4).toISOString(),
        channel: "email"
      }),
      message({
        id: "msg-5",
        conversationId: "conv-2",
        authorId: agents[1].id,
        authorType: "agent",
        body: "Hola Juan, aquí tienes la factura en PDF adjunta.",
        sentAt: subMinutes(new Date(), 5).toISOString(),
        channel: "email"
      })
    ]
  },
  {
    id: "conv-3",
    subject: "Consulta sobre garantía",
    participants: [customers[2], agents[0]],
    lastMessagePreview: "El producto tiene 12 meses de garantía.",
    lastMessageAt: subHours(new Date(), 5).toISOString(),
    unreadCount: 0,
    priority: "normal",
    status: "closed",
    tags: ["postventa"],
    channel: "messenger",
    assignedTo: agents[0],
    messages: [
      message({
        id: "msg-6",
        conversationId: "conv-3",
        authorId: customers[2].id,
        authorType: "customer",
        body: "¿Cuál es la garantía del modelo X200?",
        sentAt: subHours(new Date(), 6).toISOString(),
        channel: "messenger"
      }),
      message({
        id: "msg-7",
        conversationId: "conv-3",
        authorId: agents[0].id,
        authorType: "agent",
        body: "Tiene 12 meses de garantía oficial.",
        sentAt: subHours(new Date(), 5).toISOString(),
        channel: "messenger"
      })
    ]
  },
  {
    id: "conv-4",
    subject: "Seguimiento de devolución",
    participants: [customers[0], agents[1]],
    lastMessagePreview: "Tu devolución se procesó con éxito",
    lastMessageAt: addMinutes(new Date(), -90).toISOString(),
    unreadCount: 1,
    priority: "high",
    status: "snoozed",
    tags: ["devoluciones"],
    channel: "sms",
    assignedTo: agents[1],
    messages: [
      message({
        id: "msg-8",
        conversationId: "conv-4",
        authorId: customers[0].id,
        authorType: "customer",
        body: "Quería saber si recibieron el producto devuelto.",
        sentAt: subHours(new Date(), 10).toISOString(),
        channel: "sms"
      }),
      message({
        id: "msg-9",
        conversationId: "conv-4",
        authorId: agents[1].id,
        authorType: "agent",
        body: "Sí, lo recibimos. Estamos procesando el reintegro.",
        sentAt: subHours(new Date(), 3).toISOString(),
        channel: "sms"
      })
    ]
  }
];

export function loadMockConversations(): Promise<ConversationWithMessages[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(clone(mockConversations));
    }, 400);
  });
}

export function simulateSendMessage(
  conversationId: string,
  body: string
): Promise<Message> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const messagePayload = message({
        id: crypto.randomUUID(),
        conversationId,
        authorId: "agent-1",
        authorType: "agent",
        body,
        sentAt: new Date().toISOString(),
        channel: "whatsapp"
      });
      resolve(messagePayload);
    }, 350);
  });
}

function clone<T>(value: T): T {
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}
