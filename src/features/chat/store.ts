import { create } from "zustand";

import type { Channel, ConversationStatus, ConversationWithMessages } from "./types";

export type StatusFilter = ConversationStatus | "all";
export type ChannelFilter = Channel | "all";

interface ChatStoreState {
  selectedConversationId: string | null;
  setSelectedConversationId: (conversationId: string | null) => void;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (value: StatusFilter) => void;
  channelFilter: ChannelFilter;
  setChannelFilter: (value: ChannelFilter) => void;
  resetFilters: () => void;
}

export const useChatStore = create<ChatStoreState>((set) => ({
  selectedConversationId: null,
  setSelectedConversationId: (conversationId) => set({ selectedConversationId: conversationId }),
  searchTerm: "",
  setSearchTerm: (value) => set({ searchTerm: value }),
  statusFilter: "all",
  setStatusFilter: (value) => set({ statusFilter: value }),
  channelFilter: "all",
  setChannelFilter: (value) => set({ channelFilter: value }),
  resetFilters: () => set({ searchTerm: "", statusFilter: "all", channelFilter: "all" })
}));

export function selectFilteredConversations(
  conversations: ConversationWithMessages[],
  searchTerm: string,
  statusFilter: StatusFilter,
  channelFilter: ChannelFilter
): ConversationWithMessages[] {
  const normalizedQuery = searchTerm.trim().toLowerCase();
  return conversations.filter((conversation) => {
    const matchesSearch =
      !normalizedQuery ||
      conversation.subject.toLowerCase().includes(normalizedQuery) ||
      conversation.participants.some((participant) =>
        participant.name.toLowerCase().includes(normalizedQuery)
      );

    const matchesStatus =
      statusFilter === "all" ? true : conversation.status === statusFilter;

    const matchesChannel =
      channelFilter === "all" ? true : conversation.channel === channelFilter;

    return matchesSearch && matchesStatus && matchesChannel;
  });
}
