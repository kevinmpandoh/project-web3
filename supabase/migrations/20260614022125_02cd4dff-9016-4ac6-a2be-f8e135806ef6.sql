GRANT SELECT ON public.users TO anon, authenticated;
GRANT ALL ON public.users TO service_role;

GRANT SELECT ON public.leaderboard_winners TO anon, authenticated;
GRANT ALL ON public.leaderboard_winners TO service_role;

GRANT SELECT ON public.chat_messages TO anon, authenticated;
GRANT ALL ON public.chat_messages TO service_role;

GRANT SELECT ON public.fish_catches TO anon, authenticated;
GRANT ALL ON public.fish_catches TO service_role;

GRANT SELECT ON public.world_plots TO anon, authenticated;
GRANT ALL ON public.world_plots TO service_role;

GRANT SELECT ON public.world_presence TO anon, authenticated;
GRANT ALL ON public.world_presence TO service_role;