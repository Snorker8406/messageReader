import { LogOut, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuthUser, useLogoutMutation } from "@/features/auth/hooks";

import { ConversationDetail } from "../components/conversation-detail";
import { ConversationList } from "../components/conversation-list";
import { useConversations } from "../hooks";

export function ChatPage() {
  const { data: conversations = [], isLoading } = useConversations();
  const user = useAuthUser();
  const logoutMutation = useLogoutMutation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSettled: () => {
        navigate("/login", { replace: true });
      }
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Message Reader</h1>
            <p className="text-sm text-muted-foreground">
              Revisa y gestiona conversaciones multicanal.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden flex-col items-end text-right text-sm sm:flex">
              <span className="font-medium">{user?.fullName ?? user?.email ?? ""}</span>
              {user?.fullName ? (
                <span className="text-muted-foreground">{user.email}</span>
              ) : null}
            </div>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="gap-2 lg:hidden">
                  <Menu className="h-4 w-4" /> Bandeja
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-full max-w-md p-0">
                <ConversationList conversations={conversations} isLoading={isLoading} />
              </SheetContent>
            </Sheet>
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
            >
              <LogOut className="h-4 w-4" />
              {logoutMutation.isPending ? "Cerrando" : "Cerrar sesión"}
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6 lg:grid lg:grid-cols-[320px_1fr] lg:gap-6">
        <section className="hidden overflow-hidden rounded-xl border lg:block">
          <ConversationList conversations={conversations} isLoading={isLoading} />
        </section>
        <section className="min-h-[70vh] rounded-xl border bg-card">
          <ConversationDetail conversations={conversations} isLoading={isLoading} />
        </section>
      </main>
    </div>
  );
}
