-- Enable Realtime for live tables so the client gets instant updates
-- instead of waiting for 15-30s polls.

ALTER TABLE public.users REPLICA IDENTITY FULL;
ALTER TABLE public.world_presence REPLICA IDENTITY FULL;
ALTER TABLE public.fish_catches REPLICA IDENTITY FULL;
ALTER TABLE public.leaderboard_winners REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.users; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.world_presence; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.fish_catches; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.leaderboard_winners; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;