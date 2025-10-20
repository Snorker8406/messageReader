import { randomUUID } from "node:crypto";
import { Router } from "express";

import { fetchChatHistories, markConversationMessagesRead } from "../chat-service";
import { sendWhatsAppMessage } from "../whatsapp-service";

export const chatRouter = Router();

chatRouter.get("/", async (request, response) => {
  try {
    const { sessionId, limit } = request.query;
    const parsedLimit =
      typeof limit === "string" ? Number.parseInt(limit, 10) : undefined;
    const histories = await fetchChatHistories({
      sessionId: typeof sessionId === "string" ? sessionId : undefined,
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined
    });
    response.json({ data: histories });
  } catch (error) {
    console.error("Failed to fetch chat histories", error);
    response.status(500).json({
      error: "Failed to fetch chat histories"
    });
  }
});

chatRouter.get("/:sessionId", async (request, response) => {
  try {
    const { sessionId } = request.params;
    const histories = await fetchChatHistories({ sessionId });
    response.json({ data: histories });
  } catch (error) {
    console.error(`Failed to fetch session ${request.params.sessionId}`, error);
    response.status(500).json({
      error: "Failed to fetch chat histories"
    });
  }
});

chatRouter.patch("/:sessionId/read", async (request, response) => {
  try {
    const { sessionId } = request.params;
    const updatedCount = await markConversationMessagesRead(sessionId);
    response.json({ data: { updatedCount } });
  } catch (error) {
    console.error(`Failed to mark session ${request.params.sessionId} messages as read`, error);
    response.status(500).json({
      error: "Failed to update message status"
    });
  }
});

chatRouter.post("/:sessionId/reply", async (request, response) => {
  try {
    const rawSessionId = request.params.sessionId;
    const normalizedSessionId = typeof rawSessionId === "string" ? rawSessionId.trim() : "";
    const { message } = request.body ?? {};

    if (!normalizedSessionId) {
      return response.status(400).json({ error: "El identificador de la conversación es obligatorio" });
    }

    if (typeof message !== "string" || message.trim().length === 0) {
      return response.status(400).json({ error: "El mensaje es obligatorio" });
    }

    const trimmedMessage = message.trim();
    const sentAt = new Date().toISOString();

    await sendWhatsAppMessage({
      conversationId: normalizedSessionId,
      message: trimmedMessage,
      metadata: {
        source: "message-reader",
        sentAt
      }
    });

    const agentMessage = {
      id: randomUUID(),
      conversationId: normalizedSessionId,
      authorId: "agent-cloud",
      authorType: "agent" as const,
      body: trimmedMessage,
      sentAt,
      updatedAt: sentAt,
      channel: "whatsapp" as const,
      deliveryStatus: "sent" as const,
      status: "pending"
    };

    response.status(201).json({ data: { message: agentMessage } });
  } catch (error) {
    console.error(`Failed to send reply for session ${request.params.sessionId}`, error);
    const message = error instanceof Error ? error.message : "No se pudo enviar el mensaje";
    response.status(502).json({
      error: message
    });
  }
});
