import { formatDistanceToNowStrict } from "date-fns";
import { es } from "date-fns/locale";
import {
  Filter,
  Inbox,
  Loader2,
  Mail,
  MessageCircle,
  MessageSquareText,
  Phone
} from "lucide-react";
import type { ComponentType } from "react";
import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import type { ConversationWithMessages } from "../types";
import {
  type ChannelFilter,
  type StatusFilter,
  useChatStore,
  selectFilteredConversations
} from "../store";

const statusOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "open", label: "Abiertas" },
  { value: "pending", label: "Pendientes" },
  { value: "snoozed", label: "Pospuestas" },
  { value: "closed", label: "Cerradas" }
];

const channelOptions: Array<{ value: ChannelFilter; label: string; icon: ComponentType<{
  className?: string;
}> }> = [
  { value: "all", label: "Todos", icon: Inbox },
  { value: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { value: "messenger", label: "Messenger", icon: MessageSquareText },
  { value: "email", label: "Email", icon: Mail },
  { value: "sms", label: "SMS", icon: Phone }
];

interface ConversationListProps {
  conversations: ConversationWithMessages[];
  isLoading?: boolean;
}

export function ConversationList({ conversations, isLoading }: ConversationListProps) {
  const selectedConversationId = useChatStore((state) => state.selectedConversationId);
  const setSelectedConversationId = useChatStore((state) => state.setSelectedConversationId);
  const searchTerm = useChatStore((state) => state.searchTerm);
  const setSearchTerm = useChatStore((state) => state.setSearchTerm);
  const statusFilter = useChatStore((state) => state.statusFilter);
  const setStatusFilter = useChatStore((state) => state.setStatusFilter);
  const channelFilter = useChatStore((state) => state.channelFilter);
  const setChannelFilter = useChatStore((state) => state.setChannelFilter);
  const resetFilters = useChatStore((state) => state.resetFilters);

  const filteredConversations = useMemo(
    () =>
      selectFilteredConversations(conversations, searchTerm, statusFilter, channelFilter).sort(
        (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      ),
    [channelFilter, conversations, searchTerm, statusFilter]
  );

  return (
    <div className="flex h-full flex-col border-r bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Conversaciones</h2>
          <p className="text-sm text-muted-foreground">Gestiona todas tus bandejas en un solo lugar</p>
        </div>
        <Button variant="secondary" size="sm" onClick={resetFilters} disabled={!searchTerm && statusFilter === "all" && channelFilter === "all"}>
          <Filter className="mr-2 h-4 w-4" />
          Limpiar
        </Button>
      </div>
      <div className="space-y-3 px-4 py-3">
        <div className="relative">
          <Input
            placeholder="Buscar por nombre o asunto"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="pl-10"
          />
          <MessageCircle className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
        <div className="flex flex-wrap gap-2">
          {statusOptions.map(({ value, label }) => (
            <Badge
              key={value}
              variant={statusFilter === value ? "default" : "secondary"}
              className="cursor-pointer"
              onClick={() => setStatusFilter(value)}
            >
              {label}
            </Badge>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {channelOptions.map(({ value, label, icon: Icon }) => (
            <Button
              key={value}
              variant={channelFilter === value ? "default" : "outline"}
              size="sm"
              className="gap-2"
              onClick={() => setChannelFilter(value)}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          ))}
        </div>
      </div>
      <Separator />
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground">
            <Inbox className="h-6 w-6" />
            <p>No encontramos conversaciones con esos criterios.</p>
          </div>
        ) : (
          <ul className="space-y-1 px-2 pb-4">
            {filteredConversations.map((conversation) => {
              const isActive = conversation.id === selectedConversationId;
              return (
                <li key={conversation.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedConversationId(conversation.id)}
                    className={cn(
                      "flex w-full flex-col gap-1 rounded-xl p-3 text-left transition hover:bg-muted",
                      isActive && "bg-muted"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="line-clamp-1 text-sm font-medium">
                          {conversation.subject}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {conversation.participants[0]?.name ?? "Cliente"}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNowStrict(new Date(conversation.lastMessageAt), {
                          addSuffix: true,
                          locale: es
                        })}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {conversation.lastMessagePreview}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="uppercase">
                        {conversation.priority}
                      </Badge>
                      {conversation.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          #{tag}
                        </Badge>
                      ))}
                      {conversation.unreadCount > 0 && (
                        <span className="ml-auto inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold text-primary-foreground">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
}
