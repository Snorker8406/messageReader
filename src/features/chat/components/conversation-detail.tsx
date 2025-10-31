import { format, formatDistanceToNowStrict } from "date-fns";
import { es } from "date-fns/locale";
import {
  Bot,
  CalendarClock,
  Download,
  FileText,
  Loader2,
  Reply,
  Send,
  UserRound,
  Users
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { useAuthUser } from "@/features/auth/hooks";
import type { ConversationWithMessages } from "../types";
import { useChatStore } from "../store";
import { useCatalogMetadata, useSendMessage, useTriggerCatalogGeneration } from "../hooks";

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
  const [isCatalogDialogOpen, setCatalogDialogOpen] = useState(false);
  const [catalogTriggerError, setCatalogTriggerError] = useState<string | null>(null);
  const currentUser = useAuthUser();
  const sendMessageMutation = useSendMessage();
  const triggerCatalogMutation = useTriggerCatalogGeneration();
  const {
    data: catalogMetadata,
    isLoading: isCatalogMetadataLoading,
    isFetching: isCatalogMetadataFetching
  } = useCatalogMetadata();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "auto" });
    }
  }, [conversation?.messages]);

  useEffect(() => {
    if (isCatalogDialogOpen) {
      setCatalogTriggerError(null);
    }
  }, [isCatalogDialogOpen]);

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

  const handleConfirmCatalogGeneration = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!currentUser) {
      setCatalogTriggerError("No se pudo identificar al usuario en sesión.");
      return;
    }

    const payload = {
      id: currentUser.id,
      email: currentUser.email,
      fullName: currentUser.fullName
    };

    setCatalogTriggerError(null);
    triggerCatalogMutation.mutate(payload, {
      onSuccess: () => {
        setCatalogDialogOpen(false);
      },
      onError: (error) => {
        setCatalogTriggerError(error instanceof Error ? error.message : "No se pudo iniciar la generación.");
      }
    });
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
  const latestCatalog = catalogMetadata ?? null;
  const catalogGeneratedAt = latestCatalog?.createdAt ? new Date(latestCatalog.createdAt) : null;
  const catalogGeneratedAtLabel = catalogGeneratedAt
    ? format(catalogGeneratedAt, "PPPP 'a las' p", {
        locale: es
      })
    : null;
  const catalogGeneratedRelative = catalogGeneratedAt
    ? formatDistanceToNowStrict(catalogGeneratedAt, {
        addSuffix: true,
        locale: es
      })
    : null;
  const generatedByName =
    latestCatalog?.user?.fullName ?? latestCatalog?.user?.email ?? "Usuario desconocido";
  const generatedByEmail = latestCatalog?.user?.email ?? null;
  const rawCatalogLink = latestCatalog?.link ?? null;
  const isCatalogProcessing = rawCatalogLink === "inProgress";
  const catalogDownloadUrl = rawCatalogLink && rawCatalogLink !== "inProgress" ? rawCatalogLink : null;
  const isCatalogReady = Boolean(catalogDownloadUrl);

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
        <Card id="activity" className="flex flex-1 flex-col" style={{ maxHeight: "72vh" }}>
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
                    <li
                      key={message.id}
                      className={cn(
                        "flex w-full flex-col gap-2",
                        isAgent ? "items-end" : "items-start"
                      )}
                    >
                      <div
                        className={cn(
                          "flex items-center gap-3",
                          isAgent && "flex-row-reverse"
                        )}
                      >
                        <Avatar className="h-9 w-9">
                          <AvatarFallback>
                            {(displayName?.[0] ?? "?").toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={cn(
                            "flex flex-col gap-0.5",
                            isAgent ? "items-end text-right" : "items-start text-left"
                          )}
                        >
                          <p className="text-sm font-medium leading-none">{displayName}</p>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(message.sentAt), "PPpp", { locale: es })}
                          </span>
                        </div>
                      </div>
                      <div
                        className={cn(
                          "max-w-[80%] rounded-2xl p-3 text-sm leading-relaxed shadow-sm",
                          isAgent
                            ? message.appState === "fromReaderApp"
                              ? "self-end bg-amber-500 text-white"
                              : "self-end bg-primary text-primary-foreground"
                            : "self-start bg-muted text-muted-foreground"
                        )}
                      >
                        {message.body}
                      </div>
                    </li>
                  );
                })}
                <div ref={messagesEndRef} />
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bot className="h-4 w-4" /> Generar Catálogo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-dashed bg-muted/40 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <FileText className="h-4 w-4" /> Último PDF generado
                  </div>
                  {isCatalogMetadataLoading || isCatalogMetadataFetching ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : null}
                </div>
                {latestCatalog ? (
                  <>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {catalogGeneratedAtLabel ? (
                        <Badge
                          variant="outline"
                          className="flex items-center gap-2 rounded-full border-dashed bg-background px-3 py-1 text-[0.75rem] font-medium"
                        >
                          <CalendarClock className="h-3 w-3" />
                          {catalogGeneratedAtLabel}
                        </Badge>
                      ) : null}
                      <Badge
                        variant="secondary"
                        className="flex items-center gap-2 rounded-full px-3 py-1 text-[0.75rem] font-medium"
                      >
                        <UserRound className="h-3 w-3" />
                        {generatedByName}
                      </Badge>
                    </div>
                    <Separator className="my-3" />
                    <p className="text-xs text-muted-foreground">
                      Generado {catalogGeneratedRelative ?? "recientemente"}
                      {generatedByEmail ? ` · ${generatedByEmail}` : ""}
                    </p>
                  </>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Aún no se ha generado ningún catálogo. Inicia una nueva generación para ver su estado aquí.
                  </p>
                )}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-muted-foreground/20 bg-background/80 px-3 py-2">
                  <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
                    Estado actual
                  </span>
                  {isCatalogProcessing ? (
                    <Badge
                      variant="outline"
                      className="flex items-center gap-2 rounded-full border-primary/40 bg-primary/10 px-3 py-1 text-[0.7rem] font-medium text-primary"
                    >
                      <Loader2 className="h-3 w-3 animate-spin" /> Generando catálogo…
                    </Badge>
                  ) : isCatalogReady && catalogDownloadUrl ? (
                    <Button
                      asChild
                      size="sm"
                      variant="secondary"
                      className="gap-2 rounded-full px-3 py-1 text-[0.75rem]"
                    >
                      <a href={catalogDownloadUrl} target="_blank" rel="noreferrer">
                        <Download className="h-3 w-3" /> Descargar catálogo
                      </a>
                    </Button>
                  ) : (
                    <Badge
                      variant="outline"
                      className="rounded-full border-muted-foreground/50 px-3 py-1 text-[0.7rem] text-muted-foreground"
                    >
                      Sin registros
                    </Badge>
                  )}
                </div>
              </div>
              <AlertDialog open={isCatalogDialogOpen} onOpenChange={setCatalogDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button className="w-full" size="sm" disabled={triggerCatalogMutation.isPending}>
                    Iniciar Generación
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Desea iniciar la generación de un nuevo catálogo?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esto borrará el catálogo anterior y usará únicamente las imágenes disponibles en la carpeta de Drive.
                      ¿Estás seguro de que ya tienes todas las imágenes subidas incluyendo la portada.jpg?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  {catalogTriggerError ? (
                    <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {catalogTriggerError}
                    </p>
                  ) : null}
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={triggerCatalogMutation.isPending}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleConfirmCatalogGeneration}
                      disabled={triggerCatalogMutation.isPending}
                    >
                      {triggerCatalogMutation.isPending ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" /> Iniciando…
                        </span>
                      ) : (
                        "Iniciar generación"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
