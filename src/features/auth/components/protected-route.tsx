import type { PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAuthStatus } from "../hooks";

export function ProtectedRoute({ children }: PropsWithChildren) {
  const status = useAuthStatus();
  const location = useLocation();

  if (status === "initializing") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="rounded-md border bg-card px-6 py-4 text-sm text-muted-foreground shadow-sm">
          Validando sesión...
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
