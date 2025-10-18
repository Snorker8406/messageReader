import type { PropsWithChildren } from "react";

import { useAuthBootstrap, useAuthStatus } from "../hooks";

export function AuthInitializer({ children }: PropsWithChildren) {
  const status = useAuthStatus();
  useAuthBootstrap(status === "initializing");

  if (status === "initializing") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="rounded-md border bg-card px-6 py-4 text-sm text-muted-foreground shadow-sm">
          Validando sesión...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
