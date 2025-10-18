import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStatus } from "../hooks";
import { LoginForm } from "../components/login-form";

interface LocationState {
  from?: {
    pathname?: string;
  };
}

export function LoginPage() {
  const status = useAuthStatus();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | undefined;
  const redirectPath = state?.from?.pathname ?? "/";

  useEffect(() => {
    if (status === "authenticated") {
      navigate("/", { replace: true });
    }
  }, [status, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl font-semibold">Bienvenido de nuevo</CardTitle>
          <CardDescription>
            Usa tu correo y contraseña para acceder al panel de conversaciones.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <LoginForm
            onSuccess={() => {
              navigate(redirectPath, { replace: true });
            }}
          />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>¿Aún no tienes cuenta?</span>
            <Button variant="link" className="p-0" asChild>
              <Link to="/register">Crear cuenta</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
