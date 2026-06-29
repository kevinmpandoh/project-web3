"use client";

import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { CROPS, EQUIPMENT } from "@/lib/game-logic";
import {
  Wallet,
  Sprout,
  Warehouse,
  Trophy,
  ArrowRight,
  Zap,
  Coins,
  Globe,
  Wrench,
} from "lucide-react";


const STEPS = [
  {
    icon: Wallet,
    title: "1 · Connect & hold the token",
    body: "Connect Phantom or Solflare. The game checks (read-only, no signing) that your wallet holds 1 Ansem Land token. That's your deed to the land, nothing else is required.",
  },
  {
    icon: Sprout,
    title: "2 · Plant your field",
    body: "Buy seeds at the Seed Shop (you start with 5 tomato seeds; the bag holds max 10, plant before restocking), then pick one and click an empty plot. Planting costs 1 seed + 2 energy.",
  },
  {
    icon: Warehouse,
    title: "3 · Harvest & sell",
    body: "When a crop sparkles ✨, click it to harvest into your Barn and earn XP. Sell from the Barn whenever you like, prices rise up to +15% with market equipment.",
  },
  {
    icon: Wrench,
    title: "4 · Invest your gold",
    body: "Buy equipment at the Market: watering can, sprinkler, fertilizer, and greenhouse stack up to 55% faster growth. Expand your field from 9 plots up to 25.",
  },
  {
    icon: Trophy,
    title: "5 · Level up — forever",
    body: "Each level needs level × 100 XP. All ten crops unlock by level 10, but levels never stop — keep climbing for the leaderboard. Every day at 00:00 UTC the top 3 players win real rewards from the trading-fee pool.",
  },
  {
    icon: Trophy,
    title: "6 · Hold more, farm better",
    body: "Holding 1 token unlocks the game; holding more raises your tier (Sprout → Farmer → Rancher → Landlord) for a bigger seed bag, faster energy, and faster-growing crops. It's read-only — you never spend or stake. Finish 3 daily quests for streak bonuses too.",
  },
  {
    icon: Globe,
    title: "7 · Visit the town",
    body: "Everyone shares ONE live map with six farm fields. Plant directly on shared soil, only you can harvest your own crop, and it withers 2 hours after ripening. The Seed Shop and Market open right inside the town.",
  },
];

function HowToPlayPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="text-center">
          <h1 className="pixel text-2xl text-ink sm:text-3xl">How to Play</h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Ansem Land is meant to be slow and cozy. The full loop: plant → wait → harvest → sell →
            upgrade → repeat.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {STEPS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="card-pop p-6">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-cyan-soft text-ocean ink-border">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-4 font-semibold text-ink">{title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 card-pop p-6">
          <h2 className="pixel flex items-center gap-2 text-sm text-ink">
            <Sprout className="h-4 w-4 text-leaf" /> Crop unlocks
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
            {CROPS.map((c) => (
              <div key={c.id} className="rounded-xl bg-foam p-3 text-center ink-border">
                <div className="text-xl">{c.emoji}</div>
                <div className="font-bold text-ink">{c.name}</div>
                <div className="text-xs text-muted-foreground">Level {c.unlockLevel}</div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Full prices and grow times are in the{" "}
            <Link href="/docs" className="font-semibold text-ocean hover:underline">
              docs
            </Link>
            .
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="card-pop p-6">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Zap className="h-4 w-4 text-sunset-deep" /> Energy
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Planting costs 2 energy, and you regain 1 every 8 seconds (max 100). Energy sets the
              pace, you can't replant the whole field in one breath, and that's the point.
            </p>
          </div>
          <div className="card-pop p-6">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Wrench className="h-4 w-4 text-sunset-deep" /> Equipment
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {EQUIPMENT.length} permanent upgrades from {EQUIPMENT[0].cost}g to{" "}
              {EQUIPMENT[EQUIPMENT.length - 1].cost.toLocaleString()}g. Speed gear shortens grow
              times (up to 55% total); market gear raises sell prices (up to 15%).
            </p>
          </div>
          <div className="card-pop p-6 sm:col-span-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Coins className="h-4 w-4 text-sunset-deep" /> A note on the token
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              The token is a game key, nothing more. Ansem Land makes no promise of profit, yield, or
              returns, gold is in-game currency with no monetary value. It's here so you can plant,
              grow, and chill.
            </p>
          </div>
        </div>

        <div className="mt-10 text-center">
          <Link href="/game">
            <Button size="lg" className="chunky-btn">
              Claim your field <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default HowToPlayPage;
