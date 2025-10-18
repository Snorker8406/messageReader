import { useEffect } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient
} from "@tanstack/react-query";

import { conversationsKey } from "@/features/chat/hooks";

import { logout, getCurrentUser, login, register } from "./api";
import { useAuthStore } from "./store";
import type { User } from "./types";

export const authQueryKey = ["auth", "current-user"] as const;

export function useAuthUser(): User | null {
  return useAuthStore((state) => state.user);
}

export function useAuthStatus() {
  return useAuthStore((state) => state.status);
}

export function useAuthBootstrap(enabled: boolean) {
  const setUser = useAuthStore((state) => state.setUser);
  const finishInitialization = useAuthStore((state) => state.finishInitialization);

  const query = useQuery({
    queryKey: authQueryKey,
    queryFn: getCurrentUser,
    enabled,
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false
  });

  useEffect(() => {
    if (query.isSuccess && query.data) {
      setUser(query.data);
    }
  }, [query.isSuccess, query.data, setUser]);

  useEffect(() => {
    if (query.isError) {
      finishInitialization();
    }
  }, [query.isError, finishInitialization]);

  return query;
}

export function useLoginMutation() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);
  const finishInitialization = useAuthStore((state) => state.finishInitialization);

  return useMutation({
    mutationFn: login,
    onSuccess: (user) => {
      setUser(user);
      queryClient.setQueryData(authQueryKey, user);
      queryClient.invalidateQueries({ queryKey: conversationsKey });
    },
    onError: () => {
      finishInitialization();
    }
  });
}

export function useRegisterMutation() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);
  const finishInitialization = useAuthStore((state) => state.finishInitialization);

  return useMutation({
    mutationFn: register,
    onSuccess: (user) => {
      setUser(user);
      queryClient.setQueryData(authQueryKey, user);
      queryClient.invalidateQueries({ queryKey: conversationsKey });
    },
    onError: () => {
      finishInitialization();
    }
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();
  const clearUser = useAuthStore((state) => state.clearUser);
  const finishInitialization = useAuthStore((state) => state.finishInitialization);

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      clearUser();
      queryClient.removeQueries({ queryKey: authQueryKey });
      queryClient.removeQueries({ queryKey: conversationsKey });
    },
    onError: () => {
      finishInitialization();
      queryClient.removeQueries({ queryKey: authQueryKey });
      queryClient.removeQueries({ queryKey: conversationsKey });
    }
  });
}
