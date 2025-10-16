import { Router } from "express";

import { fetchChatHistories, markConversationMessagesRead } from "../chat-service";

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
