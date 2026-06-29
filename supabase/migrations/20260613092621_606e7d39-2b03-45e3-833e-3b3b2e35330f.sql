CREATE OR REPLACE FUNCTION public.prevent_invalid_leaderboard_winner()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  first_player_at timestamptz;
BEGIN
  SELECT min(created_at) INTO first_player_at FROM public.users;

  IF first_player_at IS NULL THEN
    RAISE EXCEPTION 'Cannot record leaderboard winners before players exist';
  END IF;

  IF now() < NEW.epoch + interval '24 hours' THEN
    RAISE EXCEPTION 'Cannot record leaderboard winners before the reward round has ended';
  END IF;

  IF first_player_at >= NEW.epoch + interval '24 hours' THEN
    RAISE EXCEPTION 'Cannot record leaderboard winners for a pre-launch reward round';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_invalid_leaderboard_winner_trigger ON public.leaderboard_winners;
CREATE TRIGGER prevent_invalid_leaderboard_winner_trigger
BEFORE INSERT OR UPDATE ON public.leaderboard_winners
FOR EACH ROW
EXECUTE FUNCTION public.prevent_invalid_leaderboard_winner();