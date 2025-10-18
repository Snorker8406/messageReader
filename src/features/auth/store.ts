import { create } from "zustand";

import type { User } from "./types";

export type AuthStatus = "initializing" | "authenticated" | "unauthenticated";

interface AuthState {
  user: User | null;
  status: AuthStatus;
  setUser: (user: User) => void;
  clearUser: () => void;
  finishInitialization: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: "initializing",
  setUser: (user) => set({ user, status: "authenticated" }),
  clearUser: () => set({ user: null, status: "unauthenticated" }),
  finishInitialization: () =>
    set((state) => {
      if (state.status !== "initializing") {
        return state;
      }

      if (state.user) {
        return { status: "authenticated" };
      }

      return {
        user: null,
        status: "unauthenticated"
      };
    })
}));
