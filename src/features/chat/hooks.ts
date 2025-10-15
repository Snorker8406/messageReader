import { useEffect } from "react";
import {
  type QueryClient,
  type UseMutationResult,
  useMutation,
  useQuery,
  useQueryClient
} from "@tanstack/react-query";

import { fetchConversations, sendAgentReply } from "./api";
import type { ConversationWithMessages, Message } from "./types";
import { useChatStore } from "./store";

const conversationsKey = ["conversations"] as const;

export function useConversations() {
  const selectedConversationId = useChatStore((state) => state.selectedConversationId);
  const setSelectedConversationId = useChatStore((state) => state.setSelectedConversationId);
  const { data, ...rest } = useQuery({
    queryKey: conversationsKey,
    queryFn: fetchConversations
  });

  useEffect(() => {
    if (!data?.length || selectedConversationId) {
      return;
    }
    setSelectedConversationId(data[0].id);
  }, [data, selectedConversationId, setSelectedConversationId]);

  return { data, ...rest };
}

export function useSendMessage(): UseMutationResult<
  Message,
  Error,
  { conversationId: string; body: string }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, body }) => sendAgentReply(conversationId, body),
    onSuccess: (message) => {
      updateConversationMessages(queryClient, message);
    }
  });
}

function updateConversationMessages(queryClient: QueryClient, message: Message) {
  queryClient.setQueryData<ConversationWithMessages[] | undefined>(
    conversationsKey,
    (previous) =>
      previous?.map((conversation) =>
        conversation.id === message.conversationId
          ? {
              ...conversation,
              messages: [...conversation.messages, message],
              lastMessagePreview: message.body,
              lastMessageAt: message.sentAt,
              unreadCount: 0,
              status: conversation.status === "pending" ? "open" : conversation.status
            }
          : conversation
      )
  );
}
