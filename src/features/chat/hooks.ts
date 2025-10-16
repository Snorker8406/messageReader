import { useEffect } from "react";
import {
  type QueryClient,
  type UseMutationResult,
  useMutation,
  useQuery,
  useQueryClient
} from "@tanstack/react-query";

import { fetchConversations, markConversationAsRead, sendAgentReply } from "./api";
import type { ConversationWithMessages, Message } from "./types";
import { useChatStore } from "./store";

const conversationsKey = ["conversations"] as const;

export function useConversations() {
  const queryClient = useQueryClient();
  const selectedConversationId = useChatStore((state) => state.selectedConversationId);
  const setSelectedConversationId = useChatStore((state) => state.setSelectedConversationId);
  const { data, ...rest } = useQuery({
    queryKey: conversationsKey,
    queryFn: fetchConversations
  });
  const { mutate: markAsRead, isPending: isMarkingRead } = useMutation({
    mutationFn: (conversationId: string) => markConversationAsRead(conversationId),
    onSuccess: (_count, conversationId) => {
      markMessagesAsRead(queryClient, conversationId);
    }
  });

  useEffect(() => {
    if (!data?.length || selectedConversationId) {
      return;
    }
    setSelectedConversationId(data[0].id);
  }, [data, selectedConversationId, setSelectedConversationId]);

  useEffect(() => {
    if (!data || !selectedConversationId || isMarkingRead) {
      return;
    }

    const activeConversation = data.find((conversation) => conversation.id === selectedConversationId);
    if (!activeConversation) {
      return;
    }

    const hasUnread = activeConversation.messages.some((message) => message.status == null);
    if (hasUnread) {
      markAsRead(selectedConversationId);
    }
  }, [data, selectedConversationId, isMarkingRead, markAsRead]);

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

function markMessagesAsRead(queryClient: QueryClient, conversationId: string) {
  queryClient.setQueryData<ConversationWithMessages[] | undefined>(
    conversationsKey,
    (previous) =>
      previous?.map((conversation) => {
        if (conversation.id !== conversationId) {
          return conversation;
        }

        let hasChanges = false;
        const updatedMessages = conversation.messages.map((message) => {
          if (message.status == null) {
            hasChanges = true;
            return { ...message, status: "read" };
          }
          return message;
        });

        if (!hasChanges) {
          return conversation;
        }

        return {
          ...conversation,
          messages: updatedMessages,
          unreadCount: 0
        };
      })
  );
}
