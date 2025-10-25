import { randomUUID } from "node:crypto";
import { Router } from "express";

import { fetchChatHistories, markConversationMessagesRead, saveN8nReplyMessage } from "../chat-service";
import { sendWhatsAppMessage, type N8nMessageResponse } from "../whatsapp-service";

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

    console.log("[chat.ts] Sending message to n8n...");
    const sendResult = await sendWhatsAppMessage({
      conversationId: normalizedSessionId,
      message: trimmedMessage,
      metadata: {
        source: "message-reader",
        sentAt
      }
    });

    console.log("[chat.ts] Message sent successfully. Response status:", sendResult.status);
    console.log("[chat.ts] Response body:", JSON.stringify(sendResult.responseBody, null, 2));

    // La respuesta de n8n es un array de objetos con wa_id y message
    const responseArray = Array.isArray(sendResult.responseBody) ? sendResult.responseBody : [];
    console.log("[chat.ts] Response is array:", Array.isArray(sendResult.responseBody));
    console.log("[chat.ts] Array length:", responseArray.length);

    if (responseArray.length > 0) {
      const firstResponse = responseArray[0] as N8nMessageResponse | undefined;
      console.log("[chat.ts] First response item:", JSON.stringify(firstResponse, null, 2));

      const waId = firstResponse?.wa_id;
      const messageText = firstResponse?.message;

      console.log("[chat.ts] Extracted wa_id:", waId);
      console.log("[chat.ts] Extracted message:", messageText);

      if (waId && messageText) {
        console.log("[chat.ts] Saving n8n reply message - wa_id:", waId, "message:", messageText);
        try {
          await saveN8nReplyMessage(waId, messageText, "fromReaderApp");
          console.log("[chat.ts] ✓ Message saved to database successfully");
        } catch (saveError) {
          console.error("[chat.ts] ✗ Failed to save n8n reply message to database:", saveError);
          // No fallar la respuesta si la BD falla, pero loguear el error
        }
      } else {
        console.warn(
          "[chat.ts] ✗ Missing required fields in n8n response - wa_id:",
          waId,
          "message:",
          messageText
        );
      }
    } else {
      console.warn("[chat.ts] ✗ Response array is empty");
    }

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
