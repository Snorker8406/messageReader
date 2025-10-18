import { useEffect } from "react";
import {
  type QueryClient,
  type UseMutationResult,
  useMutation,
  useQuery,
  useQueryClient
} from "@tanstack/react-query";

import { useAuthStore } from "@/features/auth/store";

import { fetchConversations, markConversationAsRead, sendAgentReply } from "./api";
import type { ConversationWithMessages, Message } from "./types";
import { useChatStore } from "./store";

export const conversationsKey = ["conversations"] as const;

export function useConversations() {
  const queryClient = useQueryClient();
  const selectedConversationId = useChatStore((state) => state.selectedConversationId);
  const setSelectedConversationId = useChatStore((state) => state.setSelectedConversationId);
  const authStatus = useAuthStore((state) => state.status);
  const isAuthenticated = authStatus === "authenticated";
  const { data, ...rest } = useQuery({
    queryKey: conversationsKey,
    queryFn: fetchConversations,
    enabled: isAuthenticated
  });
  const { mutate: markAsRead, isPending: isMarkingRead } = useMutation({
    mutationFn: (conversationId: string) => markConversationAsRead(conversationId),
    onSuccess: (_count, conversationId) => {
      markMessagesAsRead(queryClient, conversationId);
    }
  });

  useEffect(() => {
    if (!isAuthenticated) {
      if (selectedConversationId !== null) {
        setSelectedConversationId(null);
      }
      return;
    }

    if (!data?.length || selectedConversationId) {
      return;
    }
    setSelectedConversationId(data[0].id);
  }, [data, selectedConversationId, setSelectedConversationId, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !data || !selectedConversationId || isMarkingRead) {
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
  }, [data, selectedConversationId, isMarkingRead, markAsRead, isAuthenticated]);

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
              updatedAt: message.updatedAt,
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
            return { ...message, status: "read", updatedAt: new Date().toISOString() };
          }
          return message;
        });

        if (!hasChanges) {
          return conversation;
        }

        const latestUpdatedAt = updatedMessages.at(-1)?.updatedAt ?? conversation.updatedAt;
        return {
          ...conversation,
          messages: updatedMessages,
          unreadCount: 0,
          updatedAt: latestUpdatedAt
        };
      })
  );
}
