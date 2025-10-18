import { Navigate, Route, Routes } from "react-router-dom";

import { AuthInitializer } from "@/features/auth/components/auth-initializer";
import { ProtectedRoute } from "@/features/auth/components/protected-route";
import { LoginPage } from "@/features/auth/pages/login-page";
import { RegisterPage } from "@/features/auth/pages/register-page";
import { ChatPage } from "@/features/chat/pages/chat-page";

function App() {
  return (
    <AuthInitializer>
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthInitializer>
  );
}

export default App;
