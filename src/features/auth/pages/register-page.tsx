import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStatus } from "../hooks";
import { RegisterForm } from "../components/register-form";

export function RegisterPage() {
  const status = useAuthStatus();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === "authenticated") {
      navigate("/", { replace: true });
    }
  }, [status, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl font-semibold">Crear una cuenta</CardTitle>
          <CardDescription>
            Registra tus datos para gestionar conversaciones dentro del panel.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RegisterForm
            onSuccess={() => {
              navigate("/", { replace: true });
            }}
          />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>¿Ya tienes una cuenta?</span>
            <Button variant="link" className="p-0" asChild>
              <Link to="/login">Iniciar sesión</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
