"use client";

import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLeaderboard, useRewards } from "@/hooks/useVillage";
import { toast } from "sonner";
import { Trophy, Sprout, ArrowRight, RefreshCw, Copy, Timer, Gift, History } from "lucide-react";

import { useEffect, useState } from "react";


const MEDALS = ["🥇", "🥈", "🥉"];

function shortWallet(w: string) {
  return `${w.slice(0, 4)}…${w.slice(-4)}`;
}

function CopyWallet({ wallet, subtle }: { wallet: string; subtle?: boolean }) {
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(wallet);
          toast.success(`Copied ${shortWallet(wallet)}`);
        } catch {
          toast.error("Couldn't copy — select it manually");
        }
      }}
      title={`Copy ${wallet}`}
      className={`inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[10px] font-semibold transition hover:bg-cyan-soft ${
        subtle ? "text-ink/50" : "text-ocean"
      }`}
      aria-label="Copy wallet address"
    >
      <Copy className="h-3 w-3" />
      {shortWallet(wallet)}
    </button>
  );
}

function useCountdown(targetIso?: string) {
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  if (!targetIso) return null;
  const ms = Math.max(0, new Date(targetIso).getTime() - Date.now());
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function LeaderboardPage() {
  const { data, isLoading, isError, refetch } = useLeaderboard(50);
  const rewards = useRewards();
  const countdown = useCountdown(rewards.data?.nextRewardAt);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-sunset text-ink ink-border">
            <Trophy className="h-7 w-7" />
          </div>
          <h1 className="pixel mt-4 text-2xl text-ink sm:text-3xl">Leaderboard & Rewards</h1>
          <p className="mt-3 text-muted-foreground">
            The hardest-working players in town, ranked by gold.
          </p>
        </div>

        {/* Rewards program banner */}
        <div className="mt-8 card-pop bg-sunset/20 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="pixel flex items-center gap-2 text-sm text-ink">
              <Gift className="h-4 w-4 text-sunset-deep" /> Reward Round
            </h2>
            <div className="flex items-center gap-2 rounded-xl bg-ink px-3 py-1.5 ink-border">
              <Timer className="h-4 w-4 text-sunset" />
              <span className="pixel text-sm text-sunset" aria-live="polite">
                {countdown ?? "--:--:--"}
              </span>
            </div>
          </div>
          <p className="mt-3 text-sm text-ink/80">
            Every day at <span className="font-bold">00:00 UTC</span>, the top 3 players on this
            board win a share of the community reward pool — funded by{" "}
            <span className="font-bold">50% of the token's trading fees</span> (the other half funds
            development). Prizes are distributed to winners' wallets after each round.
          </p>
          <p className="mt-2 text-xs text-ink/60">
            Fair-play rule: champions rest for <span className="font-semibold">24 hours</span>{" "}
            (hidden until the next 00:00 UTC reset) and can't win two rounds back to back, so the
            podium keeps rotating. Prize amounts vary with trading activity and are not guaranteed.
          </p>
        </div>

        {/* Current standings */}
        <div className="mt-6 card-pop p-4 sm:p-6">
          <h2 className="pixel mb-3 flex items-center gap-2 text-xs text-ink">
            <Trophy className="h-4 w-4 text-sunset-deep" /> Current Standings
          </h2>
          {isLoading && (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          )}

          {isError && (
            <div className="py-10 text-center">
              <p className="text-sm text-muted-foreground">Couldn't load the leaderboard.</p>
              <Button
                onClick={() => refetch()}
                variant="outline"
                className="mt-4 rounded-xl ink-border"
              >
                <RefreshCw className="mr-1.5 h-4 w-4" /> Try again
              </Button>
            </div>
          )}

          {data && data.length === 0 && (
            <div className="py-10 text-center">
              <p className="text-muted-foreground">No players ranked yet.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Play the game and your progress will appear here automatically.
              </p>
              <Link href="/game">
                <Button className="mt-5 chunky-btn">
                  Claim your field <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}

          {data && data.length > 0 && (
            <ol className="divide-y divide-border/60">
              {data.map((r) => (
                <li key={r.wallet} className="flex items-center gap-3 px-2 py-3 sm:gap-4 sm:px-3">
                  <span className="w-9 shrink-0 text-center text-sm font-bold text-muted-foreground">
                    {MEDALS[r.rank - 1] ?? `#${r.rank}`}
                  </span>
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-cyan-soft ink-border text-lg">
                    🧑‍🌾
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{r.name}</div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      Level {r.level} · <CopyWallet wallet={r.wallet} subtle />
                    </div>
                  </div>
                  <div className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
                    <Sprout className="h-3.5 w-3.5" /> {r.harvests.toLocaleString()}
                  </div>
                  <div className="shrink-0 rounded-lg bg-foam px-2.5 py-1 text-sm font-bold ink-border">
                    {r.coins.toLocaleString()}g
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Champions on cooldown */}
        {rewards.data && rewards.data.cooldown.length > 0 && (
          <div className="mt-6 card-pop p-5">
            <h2 className="pixel flex items-center gap-2 text-xs text-ink">
              <Timer className="h-4 w-4 text-ocean" /> Champions Resting (24h cooldown)
            </h2>
            <ul className="mt-3 space-y-2">
              {rewards.data.cooldown.map((c) => (
                <li
                  key={`${c.wallet}-${c.until}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-foam p-2.5 text-sm ink-border"
                >
                  <span className="flex items-center gap-2 font-semibold text-ink">
                    {MEDALS[c.rank - 1] ?? "🏅"} {c.name}
                    <CopyWallet wallet={c.wallet} subtle />
                  </span>
                  <span className="text-xs text-muted-foreground">
                    back {new Date(c.until).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Previous winners */}
        <div className="mt-6 card-pop p-5">
          <h2 className="pixel flex items-center gap-2 text-xs text-ink">
            <History className="h-4 w-4 text-sunset-deep" /> Previous Winners
          </h2>
          {rewards.isLoading && (
            <div className="mt-3 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full rounded-lg" />
              ))}
            </div>
          )}
          {rewards.data && rewards.data.winners.length === 0 && (
            <p className="mt-3 text-sm text-muted-foreground">
              No rounds settled yet — the first podium will appear after the next reward round.
            </p>
          )}
          {rewards.data && rewards.data.winners.length > 0 && (
            <ul className="mt-3 space-y-2">
              {rewards.data.winners.map((w) => (
                <li
                  key={`${w.epoch}-${w.rank}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-foam p-2.5 text-sm ink-border"
                >
                  <span className="flex items-center gap-2 font-semibold text-ink">
                    {MEDALS[w.rank - 1]} {w.name}
                    <CopyWallet wallet={w.wallet} />
                  </span>
                  <span className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{w.coins.toLocaleString()}g</span>
                    <span>{new Date(w.epoch).toLocaleString()}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[11px] text-muted-foreground">
            Winners are snapshotted automatically at the end of each round; prizes are distributed
            to the listed wallets.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default LeaderboardPage;
