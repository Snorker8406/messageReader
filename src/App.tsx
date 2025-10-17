import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

import { ConversationDetail } from "@/features/chat/components/conversation-detail";
import { ConversationList } from "@/features/chat/components/conversation-list";
import { useConversations } from "@/features/chat/hooks";

function App() {
  const { data: conversations = [], isLoading } = useConversations();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Message Reader</h1>
            <p className="text-sm text-muted-foreground">
              Revisa y gestiona conversaciones multicanal en un panel ligero.
            </p>
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

export default App;
