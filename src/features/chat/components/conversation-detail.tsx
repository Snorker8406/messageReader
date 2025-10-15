import { format, formatDistanceToNowStrict } from "date-fns";
import { es } from "date-fns/locale";
import { Bot, Loader2, Reply, Send, Users } from "lucide-react";
import { useMemo, useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

import type { ConversationWithMessages } from "../types";
import { useChatStore } from "../store";
import { useSendMessage } from "../hooks";

type ConversationDetailProps = {
  conversations?: ConversationWithMessages[];
  isLoading?: boolean;
};

export function ConversationDetail({ conversations = [], isLoading }: ConversationDetailProps) {
  const selectedConversationId = useChatStore((state) => state.selectedConversationId);
  const conversation = useMemo(
    () => conversations.find((item) => item.id === selectedConversationId),
    [conversations, selectedConversationId]
  );
  const [messageInput, setMessageInput] = useState("");
  const sendMessageMutation = useSendMessage();

  const handleSendMessage = () => {
    if (!conversation || !messageInput.trim()) {
      return;
    }

    sendMessageMutation.mutate({
      conversationId: conversation.id,
      body: messageInput.trim()
    });
    setMessageInput("");
  };

  if (isLoading && !conversation) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
        <Users className="h-6 w-6" />
        <p>Selecciona una conversación para ver el detalle.</p>
      </div>
    );
  }

  const primaryCustomer = conversation.participants.find((participant) =>
    participant.id.startsWith("customer")
  );
  const assignedAgent = conversation.assignedTo;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">{conversation.subject}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>
              {formatDistanceToNowStrict(new Date(conversation.lastMessageAt), {
                addSuffix: true,
                locale: es
              })}
            </span>
            <Separator orientation="vertical" className="h-4" />
            <span className="capitalize">Canal: {conversation.channel}</span>
            <Separator orientation="vertical" className="h-4" />
            <span className="capitalize">Estado: {conversation.status}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="uppercase">
            Prioridad {conversation.priority}
          </Badge>
          {conversation.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              #{tag}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid flex-1 gap-4 overflow-hidden p-6 lg:grid-cols-[2fr_1fr]">
        <Card className="flex flex-1 flex-col">
          <CardHeader className="flex-none pb-2">
            <CardTitle className="text-base font-semibold">Actividad reciente</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden pt-0">
            <ScrollArea className="h-full pr-4">
              <ul className="space-y-4">
                {conversation.messages.map((message) => {
                  const isAgent = message.authorType === "agent";
                  const displayName = isAgent
                    ? assignedAgent?.name ?? "Agente"
                    : primaryCustomer?.name ?? "Cliente";
                  return (
                    <li key={message.id} className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback>
                            {(displayName?.[0] ?? "?").toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium leading-none">{displayName}</p>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(message.sentAt), "PPpp", { locale: es })}
                          </span>
                        </div>
                      </div>
                      <div className="ml-11 rounded-2xl bg-muted p-3 text-sm leading-relaxed text-muted-foreground">
                        {message.body}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Información del cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback>
                    {(primaryCustomer?.name?.[0] ?? "C").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{primaryCustomer?.name ?? "Sin nombre"}</p>
                  <p className="text-muted-foreground">{primaryCustomer?.handle}</p>
                </div>
              </div>
              <Separator />
              <div className="space-y-1">
                <p className="text-muted-foreground">Asignado a</p>
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {(assignedAgent?.name?.[0] ?? "A").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{assignedAgent?.name ?? "Sin asignar"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bot className="h-4 w-4" /> Responder conversación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Escribe tu respuesta..."
                value={messageInput}
                onChange={(event) => setMessageInput(event.target.value)}
                disabled={sendMessageMutation.isPending}
                rows={4}
              />
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMessageInput(conversation.lastMessagePreview)}
                  disabled={sendMessageMutation.isPending}
                  className="gap-2"
                >
                  <Reply className="h-4 w-4" /> Usar respuesta previa
                </Button>
                <Button
                  onClick={handleSendMessage}
                  disabled={sendMessageMutation.isPending || messageInput.trim().length === 0}
                  className="gap-2"
                >
                  {sendMessageMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Enviar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
