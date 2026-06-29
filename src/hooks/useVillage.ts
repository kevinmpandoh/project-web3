import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getLeaderboard,
  getChatMessages,
  sendChatMessage,
  getRecentCatches,
  getRewardsStatus,
} from "@/lib/api/game.functions";
import { supabase } from "@/integrations/supabase/client";

// Live village data — backed by Supabase Realtime. Each hook subscribes to
// its source table and invalidates the React Query cache on any change, so
// the UI updates within a few hundred ms instead of waiting for a poll.
// Polling is kept as a slow fallback for missed events / reconnects.

function useRealtimeInvalidate(channel: string, table: string, queryKey: unknown[]) {
  const queryClient = useQueryClient();
  useEffect(() => {
    let sub: any;
    try {
      sub = supabase
        .channel(channel)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table },
          () => queryClient.invalidateQueries({ queryKey }),
        )
        .subscribe();
    } catch (err) {
      console.warn("[Realtime] Subscription failed:", err);
    }
    return () => {
      try {
        if (sub) supabase.removeChannel(sub);
      } catch (err) {
        console.warn("[Realtime] Cleanup failed:", err);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export function useLeaderboard(limit = 20) {
  useRealtimeInvalidate("rt-leaderboard", "users", ["leaderboard"]);
  return useQuery({
    queryKey: ["leaderboard", limit],
    queryFn: () => getLeaderboard({ data: { limit } }),
    refetchInterval: 60_000, // slow fallback
    retry: 1,
  });
}

export function useRecentCatches() {
  useRealtimeInvalidate("rt-catches", "fish_catches", ["recent-catches"]);
  return useQuery({
    queryKey: ["recent-catches"],
    queryFn: () => getRecentCatches(),
    refetchInterval: 60_000,
    retry: 1,
  });
}

export function useChat() {
  const queryClient = useQueryClient();
  useRealtimeInvalidate("rt-chat", "chat_messages", ["chat"]);

  const messages = useQuery({
    queryKey: ["chat"],
    queryFn: () => getChatMessages(),
    refetchInterval: 30_000,
    retry: 1,
  });

  const send = useMutation({
    mutationFn: (vars: { wallet: string; body: string }) => sendChatMessage({ data: vars }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chat"] }),
  });

  return { messages, send };
}

export function useRewards() {
  useRealtimeInvalidate("rt-rewards", "leaderboard_winners", ["rewards"]);
  return useQuery({
    queryKey: ["rewards"],
    queryFn: () => getRewardsStatus(),
    refetchInterval: 60_000,
    retry: 1,
  });
}
