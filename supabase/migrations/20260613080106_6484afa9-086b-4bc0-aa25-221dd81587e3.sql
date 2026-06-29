
revoke all on public.users from anon, authenticated;
revoke all on public.fish_catches from anon, authenticated;
revoke all on public.chat_messages from anon, authenticated;
revoke all on public.world_presence from anon, authenticated;
revoke all on public.world_plots from anon, authenticated;
revoke all on public.leaderboard_winners from anon, authenticated;

grant select on public.users, public.fish_catches, public.chat_messages,
  public.world_presence, public.world_plots, public.leaderboard_winners to anon, authenticated;

grant all on public.users, public.fish_catches, public.chat_messages,
  public.world_presence, public.world_plots, public.leaderboard_winners to service_role;
