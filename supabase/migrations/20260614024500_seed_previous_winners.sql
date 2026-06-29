-- Record the previous round's champions (prizes already sent manually).
--
-- These three wallets won the last round, so they belong in the
-- leaderboard_winners history. From there the existing rules take over:
--   * they show up in "Previous Winners" and "Champions Resting", and
--   * they sit out the current round's rankings for the 24h cooldown,
-- while every other player keeps competing on the live leaderboard.
--
-- The epoch is yesterday's 00:00 UTC (the round that just ended), matching
-- how the server snapshots winners. Rank follows the order the wallets were
-- provided (1st, 2nd, 3rd). Coins are pulled from each player's current row
-- for display, defaulting to 0 if the player isn't in the users table yet.
-- ON CONFLICT keeps this idempotent if the round was already settled.

with ep as (
  select (date_trunc('day', now() at time zone 'utc') - interval '1 day')
           at time zone 'utc' as epoch
),
podium (rank, wallet_address) as (
  values
    (1, '25wptZ1he8XnyfNKNGTiBpZCU9zwT3Z8XZLRkBZtjbHK'),
    (2, '4mT2xsLjsFZ6MKb7zr62H9APFMyVoTwrhhWUK5N3Ae6E'),
    (3, 'AGNZbek7keAWvyKP61mpaTcU3cU5GEdZUgKp2VE22LL2')
)
insert into public.leaderboard_winners (epoch, rank, wallet_address, name, coins)
select
  ep.epoch,
  p.rank,
  p.wallet_address,
  coalesce(
    nullif(trim(u.username), ''),
    left(p.wallet_address, 4) || '…' || right(p.wallet_address, 4)
  ),
  coalesce(u.coins, 0)
from podium p
cross join ep
left join public.users u on u.wallet_address = p.wallet_address
on conflict (epoch, rank) do nothing;
