"use client";

import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WalletButton } from "@/components/WalletButton";
import { useTokenGate } from "@/hooks/useTokenGate";
import {
  useGame,
  CROPS,
  EQUIPMENT,
  DAILY_QUESTS,
  UPGRADE_PLOT_COST,
  seedBagSpace,
  streakBonus,
  cropsUnlockedAt,
  effectiveGrowMs,
  effectiveSellPrice,
  xpForLevel,
} from "@/hooks/useGame";
import { cropById, rarityColor, tierForBalance, nextTier } from "@/lib/game-logic";
import { useLeaderboard, useChat, useRecentCatches, useRewards } from "@/hooks/useVillage";
import { MIN_TOKEN_BALANCE, PUMP_FUN_URL, shortAddress } from "@/lib/solana-config";
import { toast } from "sonner";
import {
  Coins,
  Sprout,
  Zap,
  Trophy,
  MessageCircle,
  ArrowLeft,
  Sparkles,
  ShoppingBag,
  ArrowUpCircle,
  Wallet,
  Lock,
  AlertCircle,
  Pencil,
  Check,
  Cloud,
  CloudOff,
  RefreshCw,
  Warehouse,
  Wrench,
  ListChecks,
  Flame,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";


type GameApi = ReturnType<typeof useGame>;


const GUEST_KEY = "agriland-guest-address";

function getOrCreateGuestAddress(): string {
  if (typeof window === "undefined") return "guest";
  let id = window.localStorage.getItem(GUEST_KEY);
  if (!id) {
    id = "guest-" + Math.random().toString(36).slice(2, 10);
    window.localStorage.setItem(GUEST_KEY, id);
  }
  return id;
}

function GamePage() {
  const gate = useTokenGate();
  const [guest, setGuest] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(GUEST_KEY)) setGuest(getOrCreateGuestAddress());
  }, []);

  const enterGuest = () => setGuest(getOrCreateGuestAddress());
  const exitGuest = () => {
    if (typeof window !== "undefined") window.localStorage.removeItem(GUEST_KEY);
    setGuest(null);
  };

  const useGuest = !!guest && !gate.connected;

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-7xl px-3 py-6 sm:px-6 sm:py-10">
        {!gate.connected && !useGuest && <ConnectGate onGuest={enterGuest} />}
        {gate.connected && gate.status === "loading" && <LoadingGate />}
        {gate.connected && gate.status === "insufficient" && (
          <InsufficientGate balance={gate.balance} />
        )}
        {gate.connected && gate.status === "error" && <ErrorGate onRetry={gate.refresh} />}
        {gate.connected && gate.status === "granted" && (
          <Dashboard address={gate.address!} balance={gate.balance} />
        )}
        {useGuest && (
          <>
            <div className="mx-auto mb-4 flex max-w-3xl items-center justify-between gap-3 rounded-xl bg-sunset/20 px-4 py-2 text-xs text-ink ink-border">
              <span>🎮 Guest mode — progress saved on this device only.</span>
              <button onClick={exitGuest} className="pill text-xs">
                Exit guest
              </button>
            </div>
            <Dashboard address={guest!} balance={0} />
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

function GateShell({
  icon: Icon,
  title,
  children,
  tone = "ocean",
}: {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
  tone?: "ocean" | "gold";
}) {
  return (
    <div className="mx-auto mt-6 max-w-xl card-pop p-6 text-center sm:mt-8 sm:p-10">
      <div
        className={`mx-auto grid h-14 w-14 place-items-center rounded-2xl ink-border ${tone === "ocean" ? "bg-sky-deep text-ink" : "bg-sunset text-ink"}`}
      >
        <Icon className="h-7 w-7" />
      </div>
      <h2 className="pixel mt-5 text-base text-ink sm:text-xl">{title}</h2>
      {children}
      <div className="mt-6 flex justify-center">
        <Link href="/" className="pill text-xs">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
      </div>
    </div>
  );
}

function ConnectGate({ onGuest }: { onGuest: () => void }) {
  return (
    <GateShell icon={Wallet} title="Connect wallet to start farming">
      <p className="mt-3 text-ink/70">
        Hold {MIN_TOKEN_BALANCE} Ansem Land token to claim your farm.
      </p>
      <div className="mt-6 flex flex-col items-center gap-3">
        <WalletButton />
        <p className="text-xs text-muted-foreground">or</p>
        <button onClick={onGuest} className="chunky-btn chunky-btn-sky text-ink">
          🎮 Play as Guest
        </button>
        <p className="max-w-xs text-[11px] text-ink/60">
          Try the game without a wallet. Progress is saved only on this device and won't appear on
          the leaderboard.
        </p>
      </div>
    </GateShell>
  );
}

function LoadingGate() {
  return (
    <GateShell icon={Sparkles} title="Checking your wallet…">
      <p className="mt-3 text-ink/70">Hang on, reading your token balance on Solana.</p>
    </GateShell>
  );
}

function InsufficientGate({ balance }: { balance: number }) {
  return (
    <GateShell icon={Lock} title="At least 1 token needed" tone="gold">
      <p className="mt-3 text-ink/70">
        Current balance: <span className="font-semibold text-ink">{balance.toLocaleString()}</span>.
        Grab 1 token first to unlock your farm.
      </p>
      <a href={PUMP_FUN_URL} target="_blank" rel="noreferrer">
        <Button size="lg" className="mt-6 chunky-btn">
          🪙 Get Token
        </Button>
      </a>
    </GateShell>
  );
}

function ErrorGate({ onRetry }: { onRetry: () => void }) {
  return (
    <GateShell icon={AlertCircle} title="Network is muddy" tone="gold">
      <p className="mt-3 text-ink/70">
        We couldn't reach the Solana RPC. Give it another try in a moment.
      </p>
      <Button onClick={onRetry} size="lg" className="mt-6 chunky-btn">
        <RefreshCw className="mr-1.5 h-4 w-4" /> Retry balance check
      </Button>
    </GateShell>
  );
}

function Dashboard({ address, balance }: { address: string; balance: number }) {
  const tier = tierForBalance(balance);
  const game = useGame(address, tier);
  const claimable = DAILY_QUESTS.filter(
    (q) =>
      !game.state.questClaimed.includes(q.id) && (game.state.questProgress[q.track] ?? 0) >= q.goal,
  ).length;
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <ProfileCard address={address} balance={balance} game={game} />
        <Link
          href="/world"
          className="card-pop flex items-center justify-between gap-3 bg-sky-deep/40 p-4 transition hover:-translate-y-0.5"
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl" aria-hidden>
              🌍
            </span>
            <div>
              <div className="pixel text-xs text-ink">Visit the Town</div>
              <p className="text-xs text-muted-foreground">
                Walk around, meet other players, everyone shares one live map.
              </p>
            </div>
          </div>
          <span className="pill text-xs">Enter ➜</span>
        </Link>
        <Tabs defaultValue="farm" className="w-full">
          <TabsList className="grid w-full grid-cols-4 rounded-xl bg-foam p-1 ink-border">
            <TabsTrigger value="farm" className="rounded-lg">
              <Sprout className="mr-1.5 h-4 w-4" />
              Farm
            </TabsTrigger>
            <TabsTrigger value="quests" className="relative rounded-lg">
              <ListChecks className="mr-1.5 h-4 w-4" />
              Quests
              {claimable > 0 && (
                <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-sunset-deep text-[9px] font-bold text-white">
                  {claimable}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="barn" className="rounded-lg">
              <Warehouse className="mr-1.5 h-4 w-4" />
              Barn
            </TabsTrigger>
            <TabsTrigger value="shop" className="rounded-lg">
              <ShoppingBag className="mr-1.5 h-4 w-4" />
              Shop
            </TabsTrigger>
          </TabsList>
          <TabsContent value="farm" className="mt-4">
            <FarmPanel game={game} />
          </TabsContent>
          <TabsContent value="quests" className="mt-4">
            <QuestsPanel game={game} />
          </TabsContent>
          <TabsContent value="barn" className="mt-4">
            <BarnPanel game={game} />
          </TabsContent>
          <TabsContent value="shop" className="mt-4">
            <ShopPanel game={game} />
          </TabsContent>
        </Tabs>
      </div>
      <aside className="space-y-6">
        <Leaderboard meAddress={address} />
        <ActivityFeed />
        <ChatPanel address={address} />
      </aside>
    </div>
  );
}

function SyncBadge({ syncState }: { syncState: string }) {
  if (syncState === "error") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-sunset/30 px-2 py-0.5 text-[10px] font-medium text-ink"
        title="Progress is saved locally; cloud sync will retry."
      >
        <CloudOff className="h-3 w-3" /> offline
      </span>
    );
  }
  if (syncState === "synced" || syncState === "syncing") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-cyan-soft px-2 py-0.5 text-[10px] font-medium text-ocean">
        <Cloud className="h-3 w-3" /> {syncState === "syncing" ? "saving…" : "saved"}
      </span>
    );
  }
  return null;
}

function ProfileCard({
  address,
  balance,
  game,
}: {
  address: string;
  balance: number;
  game: GameApi;
}) {
  const { state, setUsername, syncState } = game;
  const xpNeeded = xpForLevel(state.level);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const startEdit = () => {
    setDraft(state.username);
    setEditing(true);
  };
  const commit = () => {
    setUsername(draft);
    setEditing(false);
    if (draft.trim()) toast.success("Name updated");
  };

  return (
    <div className="card-pop p-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-sky-deep text-ink ink-border text-2xl">
          🧑‍🌾
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {editing ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  commit();
                }}
                className="flex items-center gap-1"
              >
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  maxLength={20}
                  autoFocus
                  placeholder="Your player name"
                  className="h-8 w-40 rounded-lg border-2 border-ink bg-foam px-2 text-sm outline-none focus:border-sunset-deep"
                />
                <Button type="submit" size="sm" variant="ghost" className="h-8 w-8 p-0">
                  <Check className="h-4 w-4" />
                </Button>
              </form>
            ) : (
              <button onClick={startEdit} className="group flex items-center gap-1.5">
                <h3 className="pixel text-base text-ink">{state.username || "Player"}</h3>
                <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
              </button>
            )}
            <Badge className="bg-leaf/20 text-ink hover:bg-leaf/30">
              <span className="mr-1">{game.tier.emoji}</span> {game.tier.name}
            </Badge>
            {game.state.streak > 0 && (
              <Badge className="bg-sunset/30 text-ink hover:bg-sunset/40">
                <Flame className="mr-1 h-3 w-3 text-sunset-deep" /> {game.state.streak}d streak
              </Badge>
            )}
            <SyncBadge syncState={syncState} />
          </div>
          <p className="text-xs text-muted-foreground">
            {shortAddress(address)} · {balance.toLocaleString()} token · {game.tier.blurb}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Stat label="Level" value={state.level} icon={Trophy} />
          <Stat label="Gold" value={state.gold} icon={Coins} />
          <Stat label="Harvests" value={state.harvests} icon={Sprout} />
        </div>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>XP</span>
            <span>
              {state.xp} / {xpNeeded}
            </span>
          </div>
          <Progress value={(state.xp / xpNeeded) * 100} className="h-2" />
        </div>
        <div>
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              Energy
            </span>
            <span>{state.energy} / 100</span>
          </div>
          <Progress value={state.energy} className="h-2" />
        </div>
      </div>
      {(() => {
        const up = nextTier(balance);
        if (!up) return null;
        const need = (up.minHold - balance).toLocaleString();
        return (
          <p className="mt-4 rounded-xl bg-sunset/15 px-3 py-2 text-center text-xs text-ink ink-border">
            Hold <span className="font-bold">{need}</span> more $ANSEM to reach {up.emoji}{" "}
            <span className="font-bold">{up.name}</span> — {up.blurb}
          </p>
        );
      })()}
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: number; icon: LucideIcon }) {
  return (
    <div className="rounded-xl bg-cyan-soft px-3 py-2 text-center">
      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="text-sm font-bold text-foreground">{value.toLocaleString()}</div>
    </div>
  );
}

function FarmPanel({ game }: { game: GameApi }) {
  const { state, plant, harvest, upgradeFarm, tier } = game;
  const unlocked = cropsUnlockedAt(state.level);
  const [selected, setSelected] = useState(unlocked[unlocked.length - 1].id);
  const selectedCrop = cropById(selected) ?? unlocked[0];
  const cols = Math.ceil(Math.sqrt(state.farmSize));

  // If a save loads at a lower level than the previous selection, snap back.
  useEffect(() => {
    if (!unlocked.some((c) => c.id === selected)) setSelected(unlocked[unlocked.length - 1].id);
  }, [unlocked, selected]);

  return (
    <div className="card-pop p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="pixel text-sm text-ink">My Field</h3>
          <p className="text-xs text-muted-foreground">
            Pick a seed, click an empty plot to plant. Harvest when it sparkles.
          </p>
        </div>
        <Button
          onClick={() => {
            upgradeFarm();
            toast.success("Field expanded!");
          }}
          disabled={state.gold < UPGRADE_PLOT_COST || state.farmSize >= 25}
          variant="outline"
          className="rounded-lg ink-border"
        >
          <ArrowUpCircle className="mr-1 h-4 w-4" /> Expand ({UPGRADE_PLOT_COST}g)
        </Button>
      </div>

      {/* Seed selector */}
      <div className="mb-4 flex flex-wrap gap-2">
        {CROPS.map((c) => {
          const locked = c.unlockLevel > state.level;
          const owned = state.seeds[c.id] ?? 0;
          const isSel = c.id === selected;
          return (
            <button
              key={c.id}
              disabled={locked}
              onClick={() => setSelected(c.id)}
              title={locked ? `Unlocks at level ${c.unlockLevel}` : `${c.name}, ${owned} seeds`}
              className={`flex items-center gap-1 rounded-xl border-2 px-2.5 py-1.5 text-xs font-semibold transition ${
                isSel
                  ? "border-ink bg-sunset text-ink"
                  : locked
                    ? "border-dashed border-ink/30 bg-foam text-ink/40"
                    : owned === 0
                      ? "border-ink/30 bg-foam text-ink/50"
                      : "border-ink/60 bg-foam text-ink hover:bg-cyan-soft"
              }`}
            >
              <span className="text-base">{locked ? "🔒" : c.emoji}</span>
              {locked ? `Lv ${c.unlockLevel}` : `×${owned}`}
            </button>
          );
        })}
      </div>

      <div
        className="grid gap-2 mx-auto max-w-md"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}
      >
        {state.tiles.map((t) => {
          const ready = t.state === "ready";
          const growing = t.state === "growing";
          const crop = t.crop ? cropById(t.crop) : null;
          const progress =
            growing && t.plantedAt && t.growMs
              ? Math.min(1, (Date.now() - t.plantedAt) / t.growMs)
              : 0;
          return (
            <button
              key={t.id}
              onClick={() => {
                if (ready) {
                  const got = harvest(t.id);
                  if (got) toast.success(`+1 ${got.name} ${got.emoji} +${got.xp} XP`);
                } else if (t.state === "empty") {
                  plant(t.id, selected);
                }
              }}
              title={
                ready
                  ? `Harvest ${crop?.name}`
                  : growing
                    ? `${crop?.name} growing…`
                    : `Plant ${selectedCrop.name} (${state.seeds[selectedCrop.id] ?? 0} seeds left)`
              }
              className={`relative aspect-square rounded-xl border-2 transition active:scale-95 ${
                ready
                  ? "border-sunset bg-sunset/40 hover:bg-sunset/60"
                  : growing
                    ? "border-leaf bg-leaf/20"
                    : "border-dashed border-ink/40 bg-foam hover:bg-sky"
              }`}
            >
              <span className="text-2xl">{ready ? crop?.emoji : growing ? "🌱" : ""}</span>
              {ready && <span className="absolute right-0.5 top-0.5 text-xs">✨</span>}
              {growing && (
                <div className="absolute inset-x-1 bottom-1 h-1 rounded-full bg-foam">
                  <div
                    className="h-full rounded-full bg-leaf transition-all"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        {selectedCrop.emoji} {selectedCrop.name}: {state.seeds[selectedCrop.id] ?? 0} seeds in bag ·
        grows in{" "}
        {Math.round(effectiveGrowMs(selectedCrop, state.equipment, tier.growthBonus) / 1000)}s ·
        sells for {effectiveSellPrice(selectedCrop, state.equipment)}g · +{selectedCrop.xp} XP, buy
        seeds in the Shop tab
      </p>
    </div>
  );
}

function BarnPanel({ game }: { game: GameApi }) {
  const { state, sellCrop } = game;
  const entries = Object.entries(state.barn).filter(([, qty]) => qty > 0);
  const total = entries.reduce((sum, [id, qty]) => {
    const crop = cropById(id);
    return crop ? sum + qty * effectiveSellPrice(crop, state.equipment) : sum;
  }, 0);

  return (
    <div className="card-pop p-6">
      <div className="flex items-center justify-between">
        <h3 className="pixel text-sm text-ink">Barn</h3>
        {entries.length > 0 && (
          <Button
            size="sm"
            className="rounded-lg"
            onClick={() => {
              let earned = 0;
              for (const [id] of entries) earned += sellCrop(id);
              toast.success(`Sold everything for ${earned}g!`);
            }}
          >
            Sell all ({total.toLocaleString()}g)
          </Button>
        )}
      </div>
      {entries.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          The barn is empty, go harvest something! 🌱
        </p>
      ) : (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {entries.map(([id, qty]) => {
            const crop = cropById(id)!;
            const price = effectiveSellPrice(crop, state.equipment);
            return (
              <li
                key={id}
                className="flex items-center justify-between rounded-xl bg-foam p-3 ink-border"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{crop.emoji}</span>
                  <div>
                    <div className="text-sm font-semibold">
                      {crop.name} × {qty}
                    </div>
                    <div className="text-xs text-muted-foreground">{price}g each</div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-lg"
                  onClick={() => {
                    const earned = sellCrop(id);
                    if (earned) toast.success(`+${earned}g`);
                  }}
                >
                  Sell {(qty * price).toLocaleString()}g
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function QuestsPanel({ game }: { game: GameApi }) {
  const { state, claimQuest } = game;
  const allClaimed = DAILY_QUESTS.every((q) => state.questClaimed.includes(q.id));
  return (
    <div className="card-pop p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="pixel flex items-center gap-2 text-sm text-ink">
          <ListChecks className="h-4 w-4 text-leaf" /> Daily Quests
        </h3>
        <span className="flex items-center gap-1 rounded-full bg-sunset/30 px-2 py-0.5 text-xs font-bold text-ink">
          <Flame className="h-3 w-3 text-sunset-deep" /> {state.streak}-day streak
        </span>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Resets at 00:00 UTC. Finish all three for a streak bonus of{" "}
        <span className="font-semibold">{streakBonus(state.streak)}g</span> — the longer your
        streak, the bigger it grows.
      </p>

      <ul className="mt-4 space-y-2">
        {DAILY_QUESTS.map((q) => {
          const progress = Math.min(state.questProgress[q.track] ?? 0, q.goal);
          const done = progress >= q.goal;
          const claimed = state.questClaimed.includes(q.id);
          return (
            <li key={q.id} className="rounded-xl bg-foam p-3 ink-border">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <span className="text-lg">{q.emoji}</span> {q.label}
                </span>
                {claimed ? (
                  <span className="rounded-full bg-leaf/30 px-2 py-0.5 text-[10px] font-bold text-ink">
                    ✓ Claimed
                  </span>
                ) : (
                  <Button
                    size="sm"
                    className="h-7 rounded-lg px-3 text-[11px]"
                    disabled={!done}
                    onClick={() => {
                      const got = claimQuest(q.id);
                      if (got) toast.success(`Quest done! +${got}g +${q.xp} XP`);
                    }}
                  >
                    {done ? `Claim +${q.reward}g` : `+${q.reward}g`}
                  </Button>
                )}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Progress value={(progress / q.goal) * 100} className="h-2 flex-1" />
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {progress.toLocaleString()}/{q.goal.toLocaleString()}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      {allClaimed && (
        <p className="mt-4 rounded-xl bg-leaf/15 p-3 text-center text-sm font-semibold text-ink ink-border">
          🎉 All quests done for today — come back after 00:00 UTC to keep your streak alive!
        </p>
      )}
    </div>
  );
}

function ShopPanel({ game }: { game: GameApi }) {
  const { state, buyEquipment, buySeeds, tier } = game;
  const bagMax = tier.seedBag;
  return (
    <div className="card-pop p-6">
      <div className="flex items-center justify-between">
        <h3 className="pixel flex items-center gap-2 text-sm text-ink">
          <Sprout className="h-4 w-4 text-leaf" /> Seed Shop
        </h3>
        <span
          className="rounded-full bg-cyan-soft px-2 py-0.5 text-xs font-bold text-ink"
          title="Your seed bag, plant seeds to free up space"
        >
          🎒 {bagMax - seedBagSpace(state.seeds, bagMax)}/{bagMax}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        The bag holds {bagMax} seeds at your {tier.emoji} {tier.name} tier — hold more $ANSEM to
        carry more. Plant before buying so other players get field space too.
      </p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {CROPS.map((c) => {
          const locked = c.unlockLevel > state.level;
          const owned = state.seeds[c.id] ?? 0;
          return (
            <li
              key={c.id}
              className={`flex items-center justify-between gap-2 rounded-xl p-2.5 ink-border ${
                locked ? "bg-foam/60 opacity-60" : "bg-foam"
              }`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="text-lg">{locked ? "🔒" : c.emoji}</span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">
                    {c.name}
                    {owned > 0 && <span className="ml-1 text-[10px] text-ink/60">×{owned}</span>}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {locked ? `Unlocks at level ${c.unlockLevel}` : `${c.seedCost}g per seed`}
                  </div>
                </div>
              </div>
              {!locked && (
                <div className="flex shrink-0 gap-1">
                  {[1, 5].map((qty) => (
                    <Button
                      key={qty}
                      size="sm"
                      variant="outline"
                      className="h-7 rounded-lg px-2 text-[10px]"
                      disabled={state.gold < c.seedCost || seedBagSpace(state.seeds, bagMax) === 0}
                      onClick={() => {
                        if (seedBagSpace(state.seeds, bagMax) === 0) {
                          toast.error(`Seed bag full (${bagMax}), plant your seeds first!`);
                          return;
                        }
                        const bought = buySeeds(c.id, qty);
                        if (bought)
                          toast.success(
                            `+${bought} ${c.name} seed${bought > 1 ? "s" : ""} (−${bought * c.seedCost}g)`,
                          );
                      }}
                    >
                      +{qty}
                    </Button>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <h3 className="pixel mt-6 flex items-center gap-2 text-sm text-ink">
        <Wrench className="h-4 w-4" /> Equipment
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Permanent upgrades. Speed gear stacks up to 55% faster growth; market gear up to +15% sell
        price.
      </p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {EQUIPMENT.map((e) => {
          const owned = state.equipment.includes(e.id);
          return (
            <li
              key={e.id}
              className={`flex items-center justify-between rounded-xl p-3 ink-border ${owned ? "bg-leaf/15" : "bg-foam"}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{e.emoji}</span>
                <div>
                  <div className="text-sm font-semibold">{e.name}</div>
                  <div className="text-xs text-muted-foreground">{e.desc}</div>
                </div>
              </div>
              {owned ? (
                <Badge className="bg-leaf/30 text-ink hover:bg-leaf/30">Owned</Badge>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-lg"
                  disabled={state.gold < e.cost}
                  onClick={() => {
                    if (buyEquipment(e.id)) toast.success(`${e.name} purchased!`);
                  }}
                >
                  {e.cost.toLocaleString()}g
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function RewardCountdown() {
  const rewards = useRewards();
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const target = rewards.data?.nextRewardAt;
  if (!target) return null;
  const ms = Math.max(0, new Date(target).getTime() - Date.now());
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const sec = Math.floor((ms % 60_000) / 1000);
  return (
    <Link
      href="/leaderboard"
      className="mt-3 flex items-center justify-between rounded-xl bg-sunset/25 px-3 py-2 text-xs ink-border transition hover:bg-sunset/40"
    >
      <span className="font-semibold text-ink">🎁 Daily rewards in</span>
      <span className="pixel text-[11px] text-ink">
        {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(sec).padStart(2, "0")}
      </span>
    </Link>
  );
}

function Leaderboard({ meAddress }: { meAddress: string }) {
  const { data, isLoading, isError, refetch } = useLeaderboard(8);
  return (
    <div className="card-pop p-5">
      <h4 className="pixel flex items-center gap-2 text-xs text-ink">
        <Trophy className="h-4 w-4 text-sunset-deep" /> Leaderboard
      </h4>
      <RewardCountdown />
      {isLoading && (
        <div className="mt-3 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-full rounded-lg" />
          ))}
        </div>
      )}
      {isError && (
        <div className="mt-3 text-center text-xs text-muted-foreground">
          Couldn't load the leaderboard.
          <Button
            variant="ghost"
            size="sm"
            className="ml-1 h-6 rounded-lg text-xs"
            onClick={() => refetch()}
          >
            Retry
          </Button>
        </div>
      )}
      {data && data.length === 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          No players ranked yet, keep playing, your progress syncs automatically.
        </p>
      )}
      {data && data.length > 0 && (
        <ol className="mt-3 space-y-1.5 text-sm">
          {data.map((r) => {
            const isMe = r.wallet === meAddress;
            return (
              <li
                key={r.wallet}
                className={`flex items-center justify-between rounded-lg px-2 py-1.5 ${isMe ? "bg-sunset text-ink" : ""}`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="w-4 shrink-0 text-xs opacity-70">#{r.rank}</span>
                  <span className="truncate font-medium">{isMe ? "You" : r.name}</span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">lv {r.level}</span>
                </div>
                <span className="shrink-0 text-xs">{r.coins.toLocaleString()}g</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function ActivityFeed() {
  const { data, isLoading } = useRecentCatches();
  return (
    <div className="card-pop p-5">
      <h4 className="pixel flex items-center gap-2 text-xs text-ink">
        <Sprout className="h-4 w-4 text-leaf" /> Recent Harvests
      </h4>
      {isLoading && (
        <div className="mt-3 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded-lg" />
          ))}
        </div>
      )}
      {data && data.length === 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          The fields are quiet… harvest a level 5+ crop to make the news!
        </p>
      )}
      {data && data.length > 0 && (
        <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
          {data.map((c) => (
            <li key={c.id} className="rounded-lg bg-foam px-3 py-2">
              <span className="font-semibold text-foreground">{c.display_name}</span> harvested a{" "}
              <span className={`font-semibold ${rarityColor[c.rarity]}`}>{c.fish_name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ChatPanel({ address }: { address: string }) {
  const { messages, send } = useChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const count = messages.data?.length ?? 0;
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [count]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = input.trim();
    if (!body) return;
    setInput("");
    send.mutate(
      { wallet: address, body },
      {
        onError: (err) => {
          setInput(body);
          toast.error(err instanceof Error ? err.message : "Message failed to send");
        },
      },
    );
  };

  return (
    <div className="card-pop p-5">
      <h4 className="pixel flex items-center gap-2 text-xs text-ink">
        <MessageCircle className="h-4 w-4 text-ocean" /> Village Chat
      </h4>
      <div ref={scrollRef} className="mt-3 max-h-48 space-y-2 overflow-y-auto pr-1 text-sm">
        {messages.isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-full rounded-lg" />
            ))}
          </div>
        )}
        {messages.isError && (
          <p className="text-xs text-muted-foreground">Chat is unreachable right now.</p>
        )}
        {messages.data && messages.data.length === 0 && (
          <p className="text-xs text-muted-foreground">No messages yet, say hi, player! 👋</p>
        )}
        {messages.data?.map((m) => (
          <div key={m.id} className="rounded-lg bg-foam px-3 py-1.5">
            <span className="font-semibold text-ocean">
              {m.wallet_address === address ? "You" : m.display_name}:{" "}
            </span>
            <span className="break-words">{m.body}</span>
          </div>
        ))}
      </div>
      <form onSubmit={submit} className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Say hi…"
          maxLength={280}
          className="flex-1 rounded-lg border-2 border-ink bg-foam px-3 py-1.5 text-sm outline-none focus:border-sunset-deep"
          aria-label="Chat message"
        />
        <Button type="submit" size="sm" disabled={send.isPending} className="rounded-lg">
          {send.isPending ? "…" : "Send"}
        </Button>
      </form>
    </div>
  );
}

export default GamePage;
