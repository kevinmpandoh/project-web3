"use client";

import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { WalletButton } from "@/components/WalletButton";
import { useTokenGate } from "@/hooks/useTokenGate";
import { useGame, CROPS, EQUIPMENT, effectiveSellPrice, seedBagSpace } from "@/hooks/useGame";
import { cropById, tierForBalance, tierById } from "@/lib/game-logic";
import { useChat } from "@/hooks/useVillage";
import { supabase } from "@/integrations/supabase/client";
import type { StallKind } from "@/lib/world-map";
import { getWorldPlots, plantWorldPlot, harvestWorldPlot } from "@/lib/api/game.functions";
import {
  MAP_SIZE,
  NPC_ROUTES,
  SPAWN,
  buildMap,
  isWalkable,
  nearFarmland,
  stallKindAt,
  type TileKind,
  type WorldObject,
} from "@/lib/world-map";
import { PUMP_FUN_URL, shortAddress } from "@/lib/solana-config";
import { toast } from "sonner";
import {
  Wallet,
  Lock,
  AlertCircle,
  Sparkles,
  ArrowLeft,
  Users,
  Zap,
  Coins,
  Trophy,
  RefreshCw,
  ShoppingBag,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";


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

function guestDisplayName(addr: string) {
  return "Guest-" + addr.replace(/^guest-/, "").slice(0, 4).toUpperCase();
}

function WorldPage() {
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
    <div className="flex min-h-screen flex-col">
      <Navbar />
      {!gate.connected && !useGuest && (
        <Gate icon={Wallet} title="Connect wallet to enter town" connect onGuest={enterGuest} />
      )}
      {gate.connected && gate.status === "loading" && (
        <Gate icon={Sparkles} title="Checking your wallet…" />
      )}
      {gate.connected && gate.status === "insufficient" && (
        <Gate icon={Lock} title="At least 1 token needed" getToken />
      )}
      {gate.connected && gate.status === "error" && (
        <Gate icon={AlertCircle} title="Network is muddy" onRetry={gate.refresh} />
      )}
      {gate.connected && gate.status === "granted" && (
        <World address={gate.address!} balance={gate.balance} />
      )}
      {useGuest && (
        <>
          <div className="mx-auto mt-3 flex w-full max-w-3xl items-center justify-between gap-3 rounded-xl bg-sunset/20 px-4 py-2 text-xs text-ink ink-border">
            <span>🎮 Guest mode — progress saved on this device only.</span>
            <button onClick={exitGuest} className="pill text-xs">
              Exit guest
            </button>
          </div>
          <World address={guest!} balance={0} />
        </>
      )}
    </div>
  );
}

function Gate({
  icon: Icon,
  title,
  connect,
  getToken,
  onRetry,
  onGuest,
}: {
  icon: LucideIcon;
  title: string;
  connect?: boolean;
  getToken?: boolean;
  onRetry?: () => void;
  onGuest?: () => void;
}) {
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10">
      <div className="card-pop p-10 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-sky-deep text-ink ink-border">
          <Icon className="h-7 w-7" />
        </div>
        <h2 className="pixel mt-5 text-xl text-ink">{title}</h2>
        {connect && (
          <div className="mt-6 flex flex-col items-center gap-3">
            <WalletButton />
            {onGuest && (
              <>
                <p className="text-xs text-muted-foreground">or</p>
                <button onClick={onGuest} className="chunky-btn chunky-btn-sky text-ink">
                  🎮 Enter as Guest
                </button>
                <p className="max-w-xs text-[11px] text-ink/60">
                  Walk around the town without a wallet. Guests stay at level 1 and aren't ranked
                  on the leaderboard.
                </p>
              </>
            )}
          </div>
        )}
        {getToken && (
          <a href={PUMP_FUN_URL} target="_blank" rel="noreferrer">
            <Button size="lg" className="mt-6 chunky-btn">
              🪙 Get Token
            </Button>
          </a>
        )}
        {onRetry && (
          <Button onClick={onRetry} size="lg" className="mt-6 chunky-btn">
            <RefreshCw className="mr-1.5 h-4 w-4" /> Retry
          </Button>
        )}
        <div className="mt-6 flex justify-center">
          <Link href="/" className="pill text-xs">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------- world

const TILE_W = 64;
const TILE_H = 32;
const SPEED = 3.4; // tiles per second
const PING_MS = 1_500;
const BUBBLE_MS = 5_000;

type Mover = {
  x: number;
  y: number;
  tx: number;
  ty: number;
  name: string;
  level: number;
  tier: string;
};

type WorldPlot = {
  x: number;
  y: number;
  wallet: string;
  crop: string;
  plantedAt: number;
  readyAt: number;
  expiresAt: number;
};

/** How close (in tiles) you must stand to plant or harvest. */
const PLOT_REACH = 2.5;
const POS_KEY = "agriland_world_pos";

const TILE_COLORS: Record<TileKind, [string, string]> = {
  grass: ["#8fd17a", "#85c870"],
  grass2: ["#9bd987", "#90cf7d"],
  dirt: ["#d2b07e", "#c8a674"],
  stone: ["#cfd4dd", "#c4c9d3"],
  soil: ["#a9805a", "#9e7651"],
  water: ["#5fb6e8", "#54aade"],
};

// 10 shirt colors × 10 hat colors = 100 avatar combos, picked
// deterministically from the wallet (or NPC name) so everyone always
// sees the same outfit for the same player. Duplicates can happen with
// many players, that's fine, it's a town.
const SHIRT_COLORS = [
  "#3a82d4", // blue
  "#e2574c", // red
  "#6cc26a", // green
  "#f48b2a", // orange
  "#9b6dd6", // purple
  "#2db3a0", // teal
  "#d6589f", // pink
  "#8a5a33", // brown
  "#5b6478", // slate
  "#e9c63f", // yellow
];
const HAT_COLORS = [
  "#ffd166", // straw
  "#f4f7fb", // white
  "#f48b2a", // orange
  "#6cc26a", // green
  "#7fc7ff", // sky
  "#d6589f", // pink
  "#9b6dd6", // purple
  "#e2574c", // red
  "#1b2240", // ink
  "#b07c4f", // leather
];

type Avatar = { shirt: string; hat: string };

function avatarFor(key: string): Avatar {
  let h1 = 0;
  let h2 = 0;
  for (let i = 0; i < key.length; i++) {
    h1 = (h1 * 31 + key.charCodeAt(i)) >>> 0;
    h2 = (h2 * 131 + key.charCodeAt(i) * 7) >>> 0;
  }
  return { shirt: SHIRT_COLORS[h1 % 10], hat: HAT_COLORS[h2 % 10] };
}

function World({ address, balance }: { address: string; balance: number }) {
  const tier = tierForBalance(balance);
  const game = useGame(address, tier);
  const { messages, send } = useChat();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Mutable world state lives in refs so the rAF loop never depends on
  // React re-renders.
  const worldRef = useRef(buildMap());
  const meRef = useRef<Mover>({
    ...SPAWN,
    tx: SPAWN.x,
    ty: SPAWN.y,
    name: "",
    level: 1,
    tier: "sprout",
  });
  const othersRef = useRef<Map<string, Mover>>(new Map());
  const npcsRef = useRef(
    NPC_ROUTES.map((r) => ({
      name: r.name,
      points: r.points,
      idx: 0,
      x: r.points[0].x,
      y: r.points[0].y,
    })),
  );
  const keysRef = useRef<Set<string>>(new Set());
  const camRef = useRef({ x: 0, y: 0, ready: false });
  const bubblesRef = useRef<Map<string, { text: string; at: number }>>(new Map());

  const plotsRef = useRef<Map<string, WorldPlot>>(new Map());
  const busyRef = useRef(false);

  const [onlineCount, setOnlineCount] = useState(1);
  const [zone, setZone] = useState<"farm" | StallKind | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [shopOpen, setShopOpen] = useState<StallKind | null>(null);
  const shopOpenRef = useRef(shopOpen);
  shopOpenRef.current = shopOpen;
  const [selectedSeed, setSelectedSeed] = useState("tomato");
  const selectedSeedRef = useRef(selectedSeed);
  selectedSeedRef.current = selectedSeed;
  const gameRef = useRef(game);
  gameRef.current = game;

  const myName =
    game.state.username ||
    (address.startsWith("guest-") ? guestDisplayName(address) : shortAddress(address));
  const nameRef = useRef(myName);
  nameRef.current = myName;
  const levelRef = useRef(game.state.level);
  levelRef.current = game.state.level;
  const tierRef = useRef(tier.id);
  tierRef.current = tier.id;

  // Restore my last position so leaving/returning doesn't reset to spawn.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(POS_KEY);
      if (!saved) return;
      const p = JSON.parse(saved) as { x: number; y: number };
      const { tiles, objects } = worldRef.current;
      if (isWalkable(tiles, objects, p.x, p.y)) {
        meRef.current.x = p.x;
        meRef.current.y = p.y;
        meRef.current.tx = p.x;
        meRef.current.ty = p.y;
      }
    } catch {
      // corrupt save, start at spawn
    }
  }, []);

  // Chat bubbles: latest fresh message per wallet.
  useEffect(() => {
    if (!messages.data) return;
    const map = new Map<string, { text: string; at: number }>();
    const cutoff = Date.now() - BUBBLE_MS;
    for (const m of messages.data) {
      const at = new Date(m.created_at).getTime();
      if (at >= cutoff) map.set(m.wallet_address, { text: m.body, at });
    }
    // keep my own just-sent bubble if it's fresher than the server copy
    const mine = bubblesRef.current.get(address);
    if (mine && Date.now() - mine.at < BUBBLE_MS && (map.get(address)?.at ?? 0) < mine.at) {
      map.set(address, mine);
    }
    bubblesRef.current = map;
  }, [messages.data]);

  // Presence via Colyseus Room (WebSocket Server)
  useEffect(() => {
    let room: any = null;
    const connectColyseus = async () => {
      const colyseusUrl =
        typeof window !== "undefined" &&
        (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
          ? "ws://localhost:2567"
          : "wss://ansemland-production.up.railway.app";
      
      // Dynamically import colyseus.js only on the client side to prevent SSR crashes
      const { Client: ColyseusClient } = await import("colyseus.js");
      const client = new ColyseusClient(colyseusUrl);
      
      try {
        const me = meRef.current;
        room = await client.joinOrCreate("world", {
          wallet: address,
          name: nameRef.current,
          level: levelRef.current,
          tier: tierRef.current,
          x: Math.round(me.x * 100) / 100,
          y: Math.round(me.y * 100) / 100
        });

        // Listen for other players joining
        room.state.players.onAdd((player: any, sessionId: string) => {
          if (!player || !player.wallet || player.wallet === address) return;
          
          othersRef.current.set(player.wallet, {
            x: player.x,
            y: player.y,
            tx: player.x,
            ty: player.y,
            name: player.name,
            level: player.level,
            tier: player.tier || "sprout",
          });
          setOnlineCount(othersRef.current.size + 1);

          // Listen for this specific player's property changes (movement)
          player.onChange(() => {
            const existing = othersRef.current.get(player.wallet);
            if (existing) {
              existing.tx = player.x;
              existing.ty = player.y;
              existing.name = player.name;
              existing.level = player.level;
              existing.tier = player.tier || "sprout";
            }
          });
        });

        // Listen for other players leaving
        room.state.players.onRemove((player: any, sessionId: string) => {
          if (player && player.wallet) {
            othersRef.current.delete(player.wallet);
            setOnlineCount(othersRef.current.size + 1);
          }
        });

      } catch (e) {
        console.error("Colyseus connection failed", e);
      }
    };

    connectColyseus();

    // Periodically send my position
    const t = setInterval(() => {
      if (room && room.connection.isOpen) {
        const me = meRef.current;
        sessionStorage.setItem(POS_KEY, JSON.stringify({ x: me.x, y: me.y }));
        room.send("move", {
          x: Math.round(me.x * 100) / 100,
          y: Math.round(me.y * 100) / 100
        });
      }
    }, PING_MS);

    return () => {
      clearInterval(t);
      if (room) room.leave();
    };
  }, [address]);

  // Shared-field plots: poll every 4s.
  useEffect(() => {
    let stopped = false;
    const tick = async () => {
      try {
        const rows = await getWorldPlots();
        if (stopped) return;
        const map = new Map<string, WorldPlot>();
        for (const r of rows) {
          map.set(`${r.x}:${r.y}`, {
            x: r.x,
            y: r.y,
            wallet: r.wallet_address,
            crop: r.crop,
            plantedAt: new Date(r.planted_at).getTime(),
            readyAt: new Date(r.ready_at).getTime(),
            expiresAt: new Date(r.expires_at).getTime(),
          });
        }
        plotsRef.current = map;
      } catch (e) {
        console.warn("plots fetch failed", e);
      }
    };
    tick();
    const t = setInterval(tick, 4_000);
    return () => {
      stopped = true;
      clearInterval(t);
    };
  }, []);

  // Plant or harvest the clicked soil tile (called from the canvas click
  // handler via ref so the closure never goes stale).
  const farmActionRef = useRef<(tx: number, ty: number) => void>(() => {});
  farmActionRef.current = async (tx: number, ty: number) => {
    if (busyRef.current) return;
    const key = `${tx}:${ty}`;
    const plot = plotsRef.current.get(key);
    const g = gameRef.current;

    if (plot) {
      if (plot.wallet !== address) {
        toast.info("This plant belongs to another player 🌱");
        return;
      }
      if (Date.now() < plot.readyAt) {
        toast.info("Still growing, be patient!");
        return;
      }
      busyRef.current = true;
      try {
        const res = await harvestWorldPlot({ data: { wallet: address, x: tx, y: ty } });
        if (res.ok) {
          plotsRef.current.delete(key);
          const crop = g.gainHarvest(res.crop);
          if (crop) toast.success(`+1 ${crop.name} ${crop.emoji} +${crop.xp} XP`);
        } else {
          plotsRef.current.delete(key);
          toast.error(res.reason);
        }
      } catch {
        toast.error("Network hiccup, try again.");
      }
      busyRef.current = false;
      return;
    }

    const crop = cropById(selectedSeedRef.current);
    if (!crop) return;
    if (crop.unlockLevel > g.state.level) {
      toast.error(`${crop.name} unlocks at level ${crop.unlockLevel}`);
      return;
    }
    if ((g.state.seeds[crop.id] ?? 0) < 1) {
      toast.error(`No ${crop.name} seeds, buy some at the Seed Shop 🌱`);
      return;
    }
    if (g.state.energy < 2) {
      toast.error("Not enough energy");
      return;
    }
    busyRef.current = true;
    try {
      const res = await plantWorldPlot({ data: { wallet: address, x: tx, y: ty, crop: crop.id } });
      if (res.ok) {
        g.spendSeed(crop.id);
        const now = Date.now();
        plotsRef.current.set(key, {
          x: tx,
          y: ty,
          wallet: address,
          crop: crop.id,
          plantedAt: now,
          readyAt: now + crop.growMs,
          expiresAt: now + crop.growMs + 2 * 60 * 60 * 1000,
        });
        toast.success(`Planted ${crop.name} ${crop.emoji}`);
      } else {
        toast.error(res.reason);
      }
    } catch {
      toast.error("Network hiccup, try again.");
    }
    busyRef.current = false;
  };

  // Keyboard movement.
  useEffect(() => {
    const MOVE_KEYS = new Set([
      "w",
      "a",
      "s",
      "d",
      "arrowup",
      "arrowdown",
      "arrowleft",
      "arrowright",
    ]);
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "escape") {
        setShopOpen(null);
        return;
      }
      if (shopOpenRef.current) return;
      if (!MOVE_KEYS.has(k)) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      e.preventDefault();
      keysRef.current.add(k);
    };
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // Main loop: simulate + draw.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { tiles, objects } = worldRef.current;
    let raf = 0;
    let last = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.parentElement!.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const iso = (x: number, y: number): [number, number] => [
      ((x - y) * TILE_W) / 2,
      ((x + y) * TILE_H) / 2,
    ];

    const moveToward = (m: Mover, dt: number, speed: number, collide: boolean) => {
      const dx = m.tx - m.x;
      const dy = m.ty - m.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.02) return;
      const step = Math.min(dist, speed * dt);
      const nx = m.x + (dx / dist) * step;
      const ny = m.y + (dy / dist) * step;
      if (!collide || isWalkable(tiles, objects, nx, ny)) {
        m.x = nx;
        m.y = ny;
      } else if (isWalkable(tiles, objects, nx, m.y)) {
        m.x = nx;
        m.tx = nx;
      } else if (isWalkable(tiles, objects, m.x, ny)) {
        m.y = ny;
        m.ty = ny;
      } else {
        m.tx = m.x;
        m.ty = m.y;
      }
    };

    const update = (dt: number) => {
      const me = meRef.current;

      const keys = keysRef.current;
      let kx = 0;
      let ky = 0;
      if (keys.has("w") || keys.has("arrowup")) {
        kx -= 1;
        ky -= 1;
      }
      if (keys.has("s") || keys.has("arrowdown")) {
        kx += 1;
        ky += 1;
      }
      if (keys.has("a") || keys.has("arrowleft")) {
        kx -= 1;
        ky += 1;
      }
      if (keys.has("d") || keys.has("arrowright")) {
        kx += 1;
        ky -= 1;
      }
      if (kx !== 0 || ky !== 0) {
        const len = Math.hypot(kx, ky);
        me.tx = me.x + (kx / len) * 0.6;
        me.ty = me.y + (ky / len) * 0.6;
      }
      moveToward(me, dt, SPEED, true);

      for (const other of othersRef.current.values()) {
        moveToward(other, dt, SPEED * 1.1, false);
      }

      // NPC villagers walk their loops
      for (const npc of npcsRef.current) {
        const target = npc.points[npc.idx];
        const dx = target.x - npc.x;
        const dy = target.y - npc.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.1) {
          npc.idx = (npc.idx + 1) % npc.points.length;
        } else {
          const step = Math.min(dist, 1.2 * dt);
          npc.x += (dx / dist) * step;
          npc.y += (dy / dist) * step;
        }
      }

      // camera follows me
      const [px, py] = iso(me.x, me.y);
      const cam = camRef.current;
      if (!cam.ready) {
        cam.x = px;
        cam.y = py;
        cam.ready = true;
      } else {
        cam.x += (px - cam.x) * Math.min(1, dt * 4);
        cam.y += (py - cam.y) * Math.min(1, dt * 4);
      }

      setZone(
        stallKindAt(objects, me.x, me.y) ?? (nearFarmland(tiles, me.x, me.y) ? "farm" : null),
      );
    };

    const drawTile = (x: number, y: number, kind: TileKind, now: number) => {
      const [sx, sy] = iso(x, y);
      const [base, alt] = TILE_COLORS[kind];
      let fill = (x + y) % 2 === 0 ? base : alt;
      if (kind === "water") {
        const wave = Math.sin(now / 700 + x * 1.3 + y * 0.9) * 0.5 + 0.5;
        fill = `hsl(203 72% ${58 + wave * 6}%)`;
      }
      ctx.beginPath();
      ctx.moveTo(sx, sy - TILE_H / 2);
      ctx.lineTo(sx + TILE_W / 2, sy);
      ctx.lineTo(sx, sy + TILE_H / 2);
      ctx.lineTo(sx - TILE_W / 2, sy);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();

      if (kind === "soil") {
        ctx.strokeStyle = "rgba(27,34,64,0.25)";
        ctx.lineWidth = 1.5;
        for (let i = 1; i <= 3; i++) {
          const f = i / 4 - 0.5;
          const [ax, ay] = iso(x + f, y - 0.3);
          const [bx, by] = iso(x + f, y + 0.3);
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.stroke();
        }
      }
      if (kind === "stone") {
        ctx.strokeStyle = "rgba(27,34,64,0.12)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx, sy - TILE_H / 2);
        ctx.lineTo(sx + TILE_W / 2, sy);
        ctx.lineTo(sx, sy + TILE_H / 2);
        ctx.lineTo(sx - TILE_W / 2, sy);
        ctx.closePath();
        ctx.stroke();
      }
    };

    const drawObject = (o: WorldObject, now: number) => {
      const [sx, sy] = iso(o.x, o.y);
      ctx.strokeStyle = "#1b2240";
      ctx.lineWidth = 2;
      if (o.kind === "tree") {
        ctx.fillStyle = "#8a5a33";
        ctx.fillRect(sx - 3, sy - 22, 6, 22);
        ctx.fillStyle = "#4f9c4a";
        ctx.beginPath();
        ctx.arc(sx, sy - 32, 14, 0, Math.PI * 2);
        ctx.arc(sx - 10, sy - 24, 10, 0, Math.PI * 2);
        ctx.arc(sx + 10, sy - 24, 10, 0, Math.PI * 2);
        ctx.fill();
      } else if (o.kind === "rock") {
        ctx.fillStyle = "#9aa3b2";
        ctx.beginPath();
        ctx.ellipse(sx, sy - 4, 11, 7, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (o.kind === "house" || o.kind === "bighouse") {
        const w = o.kind === "bighouse" ? 26 : 18;
        const h = o.kind === "bighouse" ? 34 : 24;
        ctx.fillStyle = "#f0e0c0";
        ctx.fillRect(sx - w, sy - h, w * 2, h);
        ctx.strokeRect(sx - w, sy - h, w * 2, h);
        ctx.fillStyle = o.kind === "bighouse" ? "#6b4a2f" : "#8a5a33";
        ctx.beginPath();
        ctx.moveTo(sx - w - 6, sy - h);
        ctx.lineTo(sx, sy - h - 18);
        ctx.lineTo(sx + w + 6, sy - h);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#7fc7ff";
        ctx.fillRect(sx - w + 6, sy - h + 6, 9, 9);
        if (o.kind === "bighouse") ctx.fillRect(sx + w - 15, sy - h + 6, 9, 9);
        ctx.fillStyle = "#6b4a2f";
        ctx.fillRect(sx - 5, sy - 16, 10, 16);
      } else if (o.kind === "stall") {
        ctx.fillStyle = "#c98c54";
        ctx.fillRect(sx - 18, sy - 18, 36, 16);
        ctx.strokeRect(sx - 18, sy - 18, 36, 16);
        ctx.fillStyle = "#f4f7fb";
        ctx.fillRect(sx - 22, sy - 28, 44, 10);
        ctx.fillStyle = "#6cc26a";
        for (let i = 0; i < 4; i++) ctx.fillRect(sx - 22 + i * 11 + 5, sy - 28, 6, 10);
        ctx.strokeRect(sx - 22, sy - 28, 44, 10);
        if (o.label) {
          ctx.font = "bold 9px Nunito, sans-serif";
          ctx.textAlign = "center";
          ctx.fillStyle = "#1b2240";
          ctx.fillText(o.label, sx, sy - 32);
        }
      } else if (o.kind === "fountain") {
        ctx.fillStyle = "#b9c2d4";
        ctx.beginPath();
        ctx.ellipse(sx, sy, 30, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#5fb6e8";
        ctx.beginPath();
        ctx.ellipse(sx, sy, 22, 11, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#b9c2d4";
        ctx.fillRect(sx - 3, sy - 22, 6, 22);
        const spray = Math.sin(now / 250) * 2;
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.beginPath();
        ctx.ellipse(sx, sy - 24 - spray, 7, 4, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (o.kind === "fence") {
        ctx.strokeStyle = "#8a5a33";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(sx - 14, sy - 4);
        ctx.lineTo(sx + 14, sy - 4);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(sx - 10, sy + 2);
        ctx.lineTo(sx - 10, sy - 12);
        ctx.moveTo(sx + 10, sy + 2);
        ctx.lineTo(sx + 10, sy - 12);
        ctx.stroke();
      } else if (o.kind === "sign") {
        ctx.fillStyle = "#8a5a33";
        ctx.fillRect(sx - 2, sy - 18, 4, 18);
        ctx.fillStyle = "#d9b87c";
        ctx.fillRect(sx - 22, sy - 30, 44, 14);
        ctx.strokeRect(sx - 22, sy - 30, 44, 14);
        if (o.label) {
          ctx.font = "bold 8px Nunito, sans-serif";
          ctx.textAlign = "center";
          ctx.fillStyle = "#1b2240";
          ctx.fillText(o.label, sx, sy - 20);
        }
      } else if (o.kind === "crate") {
        ctx.fillStyle = "#c98c54";
        ctx.fillRect(sx - 10, sy - 16, 20, 16);
        ctx.strokeRect(sx - 10, sy - 16, 20, 16);
        ctx.beginPath();
        ctx.moveTo(sx - 10, sy - 16);
        ctx.lineTo(sx + 10, sy);
        ctx.moveTo(sx + 10, sy - 16);
        ctx.lineTo(sx - 10, sy);
        ctx.stroke();
      } else if (o.kind === "well") {
        ctx.fillStyle = "#9aa3b2";
        ctx.beginPath();
        ctx.ellipse(sx, sy - 4, 13, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#3a82d4";
        ctx.beginPath();
        ctx.ellipse(sx, sy - 5, 8, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#8a5a33";
        ctx.fillRect(sx - 12, sy - 26, 3, 22);
        ctx.fillRect(sx + 9, sy - 26, 3, 22);
        ctx.fillStyle = "#6b4a2f";
        ctx.beginPath();
        ctx.moveTo(sx - 16, sy - 24);
        ctx.lineTo(sx, sy - 34);
        ctx.lineTo(sx + 16, sy - 24);
        ctx.closePath();
        ctx.fill();
      }
    };

    const drawPerson = (
      m: { x: number; y: number; name: string; level?: number; tier?: string },
      av: Avatar,
      opts: { isMe?: boolean; isNpc?: boolean; bubble?: string },
    ) => {
      const [sx, sy] = iso(m.x, m.y);
      ctx.fillStyle = "rgba(27,34,64,0.25)";
      ctx.beginPath();
      ctx.ellipse(sx, sy, 10, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = av.shirt;
      ctx.strokeStyle = "#1b2240";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(sx - 8, sy - 22, 16, 20, 7);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#8d5845"; // Brown skin tone
      ctx.beginPath();
      ctx.arc(sx, sy - 28, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      // Face (Eyes and white smile)
      ctx.fillStyle = "#1b2240";
      ctx.beginPath();
      ctx.arc(sx - 3, sy - 30, 1.5, 0, Math.PI * 2); // left eye
      ctx.arc(sx + 3, sy - 30, 1.5, 0, Math.PI * 2); // right eye
      ctx.fill();
      
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(sx, sy - 26, 3.5, 0, Math.PI); // smile
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      // Afro Hair
      ctx.fillStyle = "#1b2240";
      ctx.beginPath();
      ctx.arc(sx - 6, sy - 34, 5, 0, Math.PI * 2); // left puff
      ctx.arc(sx + 6, sy - 34, 5, 0, Math.PI * 2); // right puff
      ctx.arc(sx, sy - 38, 6, 0, Math.PI * 2);     // top puff
      ctx.arc(sx, sy - 34, 6, 0, Math.PI * 2);     // center fill
      ctx.fill();

      ctx.textAlign = "center";
      if (!opts.isNpc && m.level) {
        ctx.font = "bold 9px Nunito, sans-serif";
        const badge = `${tierById(m.tier ?? "sprout").emoji} Lvl ${m.level}`;
        const lw = ctx.measureText(badge).width + 10;
        ctx.fillStyle = "#1b2240";
        ctx.beginPath();
        ctx.roundRect(sx - lw / 2, sy - 62, lw, 12, 5);
        ctx.fill();
        ctx.fillStyle = "#ffd166";
        ctx.fillText(badge, sx, sy - 53);
      }
      ctx.font = "bold 11px Nunito, sans-serif";
      ctx.fillStyle = opts.isNpc ? "#5b6478" : "#1b2240";
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 3;
      ctx.strokeText(m.name, sx, sy - 42);
      ctx.fillText(m.name, sx, sy - 42);

      if (opts.bubble) {
        const text = opts.bubble.length > 28 ? `${opts.bubble.slice(0, 28)}…` : opts.bubble;
        ctx.font = "11px Nunito, sans-serif";
        const w = ctx.measureText(text).width + 14;
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.strokeStyle = "#1b2240";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(sx - w / 2, sy - 84, w, 20, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#1b2240";
        ctx.fillText(text, sx, sy - 70);
      }
    };

    const drawPlot = (p: WorldPlot) => {
      const [sx, sy] = iso(p.x, p.y);
      const crop = cropById(p.crop);
      if (!crop) return;
      const nowMs = Date.now();
      ctx.textAlign = "center";
      if (nowMs >= p.readyAt) {
        const bounce = p.wallet === address ? Math.sin(nowMs / 250) * 2 : 0;
        ctx.font = "20px serif";
        ctx.fillText(crop.emoji, sx, sy + 4 - bounce);
        ctx.font = "10px serif";
        ctx.fillText("✨", sx + 11, sy - 10 - bounce);
        if (p.expiresAt - nowMs < 15 * 60 * 1000) ctx.fillText("⏳", sx - 12, sy - 10);
      } else {
        const progress = (nowMs - p.plantedAt) / Math.max(1, p.readyAt - p.plantedAt);
        ctx.font = progress < 0.5 ? "10px serif" : "14px serif";
        ctx.fillText("🌱", sx, sy + 3);
      }
      // owner marker matches the owner's shirt color
      ctx.fillStyle = avatarFor(p.wallet).shirt;
      ctx.strokeStyle = "#1b2240";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(sx + 13, sy + 7, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    };

    const draw = (now: number) => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      const cam = camRef.current;
      ctx.fillStyle = "#bfe3ff";
      ctx.fillRect(0, 0, rect.width, rect.height);
      ctx.save();
      ctx.translate(rect.width / 2 - cam.x, rect.height / 2 - cam.y + 40);

      for (let y = 0; y < MAP_SIZE; y++) {
        for (let x = 0; x < MAP_SIZE; x++) drawTile(x, y, tiles[y][x], now);
      }

      const me = meRef.current;
      const freshBubble = (wallet: string): string | undefined => {
        const b = bubblesRef.current.get(wallet);
        return b && Date.now() - b.at < BUBBLE_MS ? b.text : undefined;
      };
      const drawables: { depth: number; fn: () => void }[] = [
        ...objects.map((o) => ({ depth: o.x + o.y, fn: () => drawObject(o, now) })),
        ...[...plotsRef.current.values()].map((p) => ({
          depth: p.x + p.y - 0.3,
          fn: () => drawPlot(p),
        })),
        {
          depth: me.x + me.y,
          fn: () =>
            drawPerson(
              {
                ...me,
                name: `⭐ ${nameRef.current}`,
                level: levelRef.current,
                tier: tierRef.current,
              },
              avatarFor(address),
              { isMe: true, bubble: freshBubble(address) },
            ),
        },
        ...[...othersRef.current.entries()].map(([wallet, m]) => ({
          depth: m.x + m.y,
          fn: () => drawPerson(m, avatarFor(wallet), { bubble: freshBubble(wallet) }),
        })),
        ...npcsRef.current.map((npc) => ({
          depth: npc.x + npc.y,
          fn: () => drawPerson(npc, avatarFor(npc.name), { isNpc: true }),
        })),
      ];
      drawables.sort((a, b) => a.depth - b.depth);
      for (const d of drawables) d.fn();

      ctx.restore();
    };

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      update(dt);
      draw(now);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onClick = (e: MouseEvent) => {
      if (shopOpenRef.current) return;
      const rect = canvas.getBoundingClientRect();
      const cam = camRef.current;
      const px = e.clientX - rect.left - rect.width / 2 + cam.x;
      const py = e.clientY - rect.top - rect.height / 2 + cam.y - 40;
      const x = px / TILE_W + py / TILE_H;
      const y = py / TILE_H - px / TILE_W;
      const tx = Math.round(x);
      const ty = Math.round(y);
      const me = meRef.current;
      // Clicking soil within reach plants/harvests; farther away just walks.
      if (tiles[ty]?.[tx] === "soil" && Math.hypot(tx - me.x, ty - me.y) <= PLOT_REACH) {
        farmActionRef.current(tx, ty);
        return;
      }
      if (isWalkable(tiles, objects, x, y)) {
        me.tx = x;
        me.ty = y;
      }
    };
    canvas.addEventListener("click", onClick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("click", onClick);
    };
  }, [address]);

  const sendChat = (e: React.FormEvent) => {
    e.preventDefault();
    const body = chatInput.trim();
    if (!body) return;
    setChatInput("");
    bubblesRef.current.set(address, { text: body, at: Date.now() });
    send.mutate(
      { wallet: address, body },
      {
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "Message failed to send"),
      },
    );
  };

  return (
    <main className="relative flex-1 overflow-hidden" style={{ minHeight: "calc(100vh - 72px)" }}>
      <canvas ref={canvasRef} className="absolute inset-0 cursor-pointer" />

      {/* HUD: stats */}
      <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-2">
        <div className="pointer-events-auto card-pop flex items-center gap-3 px-3 py-2 text-xs">
          <span className="pixel text-[10px] text-ink">{myName}</span>
          <span className="rounded-full bg-cyan-soft px-1.5 py-0.5 text-[10px] font-bold text-ink">
            {tier.emoji} {tier.name}
          </span>
          <span className="flex items-center gap-1 text-ink/80">
            <Trophy className="h-3.5 w-3.5 text-sunset-deep" /> lv {game.state.level}
          </span>
          <span className="flex items-center gap-1 text-ink/80">
            <Coins className="h-3.5 w-3.5 text-sunset-deep" /> {game.state.gold.toLocaleString()}
          </span>
          <span className="flex items-center gap-1 text-ink/80">
            <Zap className="h-3.5 w-3.5 text-sunset-deep" /> {game.state.energy}
          </span>
        </div>
      </div>

      {/* HUD: online + back */}
      <div className="absolute right-3 top-3 flex items-center gap-2">
        <div className="card-pop flex items-center gap-1.5 px-3 py-2 text-xs text-ink">
          <Users className="h-3.5 w-3.5 text-ocean" /> {onlineCount} online
        </div>
        <button onClick={() => setShopOpen("seed")} className="pill text-xs">
          🌱 Seeds
        </button>
        <button onClick={() => setShopOpen("market")} className="pill text-xs">
          <ShoppingBag className="h-3.5 w-3.5" /> Market
        </button>
        <Link href="/game" className="pill text-xs">
          <ArrowLeft className="h-3.5 w-3.5" /> My Farm
        </Link>
      </div>

      {/* Seed bar: appears at the shared fields, click soil to plant. */}
      {zone === "farm" && shopOpen === null && (
        <div className="absolute bottom-[4.5rem] left-1/2 w-[calc(100%-1rem)] max-w-2xl -translate-x-1/2 sm:bottom-16">
          <div className="card-pop flex flex-wrap items-center justify-center gap-1.5 bg-foam/95 p-2">
            <span className="pixel mr-1 text-[9px] text-ink/70">PLANT:</span>
            {CROPS.map((c) => {
              const locked = c.unlockLevel > game.state.level;
              const isSel = c.id === selectedSeed;
              return (
                <button
                  key={c.id}
                  disabled={locked}
                  onClick={() => setSelectedSeed(c.id)}
                  title={locked ? `Unlocks at level ${c.unlockLevel}` : `${c.name}, ${c.seedCost}g`}
                  className={`flex items-center gap-0.5 rounded-lg border-2 px-1.5 py-1 text-[10px] font-bold transition ${
                    isSel
                      ? "border-ink bg-sunset text-ink"
                      : locked
                        ? "border-dashed border-ink/30 bg-foam text-ink/40"
                        : "border-ink/60 bg-foam text-ink hover:bg-cyan-soft"
                  }`}
                >
                  <span className="text-sm">{locked ? "🔒" : c.emoji}</span>
                  {locked ? `L${c.unlockLevel}` : `${c.seedCost}g`}
                </button>
              );
            })}
            <span className="ml-1 hidden text-[10px] text-ink/60 sm:inline">
              click soil to plant · click your ✨ crop to harvest
            </span>
          </div>
        </div>
      )}

      {/* Stall prompts: open the matching in-world window. */}
      {(zone === "seed" || zone === "market") && shopOpen === null && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 sm:bottom-20">
          <Button onClick={() => setShopOpen(zone)} className="chunky-btn">
            {zone === "seed" ? "🌱 Open Seed Shop" : "🛠️ Open Market"}
          </Button>
        </div>
      )}

      {/* In-world shop windows */}
      {shopOpen !== null && (
        <WorldShop kind={shopOpen} game={game} onClose={() => setShopOpen(null)} />
      )}

      {/* Chat bar */}
      <form
        onSubmit={sendChat}
        className="absolute inset-x-3 bottom-3 mx-auto flex max-w-md gap-2 sm:inset-x-auto sm:left-1/2 sm:w-full sm:-translate-x-1/2"
      >
        <input
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder="Say something, it appears above your head…"
          maxLength={280}
          className="ink-border flex-1 rounded-xl bg-foam/95 px-3 py-2 text-sm outline-none focus:border-sunset-deep"
          aria-label="World chat message"
        />
        <Button type="submit" size="sm" disabled={send.isPending} className="h-auto rounded-xl">
          Send
        </Button>
      </form>

      {/* Help hint */}
      <div className="pointer-events-none absolute bottom-16 left-3 hidden text-[11px] text-ink/60 sm:block">
        WASD / arrows / click to move · plant on the fenced fields · 🛒 shop anytime
      </div>
    </main>
  );
}

function WorldShop({
  kind,
  game,
  onClose,
}: {
  kind: StallKind;
  game: ReturnType<typeof useGame>;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"buy" | "sell">("buy");
  const { state, sellCrop, buySeeds, sellSeedsBack, buyEquipment, tier } = game;
  const bagMax = tier.seedBag;

  const barnEntries = Object.entries(state.barn).filter(([, qty]) => qty > 0);
  const barnTotal = barnEntries.reduce((sum, [id, qty]) => {
    const crop = cropById(id);
    return crop ? sum + qty * effectiveSellPrice(crop, state.equipment) : sum;
  }, 0);

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-ink/40 p-3"
      onClick={onClose}
    >
      <div
        className="card-pop max-h-[85%] w-full max-w-md overflow-y-auto bg-foam p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="pixel text-sm text-ink">
            {kind === "seed" ? "🌱 Seed Shop" : "🛠️ Market"}
          </h3>
          <div className="flex items-center gap-2">
            {kind === "seed" && (
              <span
                className="rounded-full bg-cyan-soft px-2 py-0.5 text-xs font-bold text-ink"
                title="Your seed bag, plant seeds to free up space"
              >
                🎒 {bagMax - seedBagSpace(state.seeds, bagMax)}/{bagMax}
              </span>
            )}
            <span className="flex items-center gap-1 rounded-full bg-sunset/40 px-2 py-0.5 text-xs font-bold text-ink">
              <Coins className="h-3 w-3" /> {state.gold.toLocaleString()}g
            </span>
            <button
              onClick={onClose}
              className="grid h-7 w-7 place-items-center rounded-lg text-ink/70 transition hover:bg-cyan-soft"
              aria-label="Close shop"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {kind === "seed" && (
          <>
            <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-cyan-soft p-1 ink-border">
              {(
                [
                  ["buy", "🌱 Buy Seeds"],
                  ["sell", "🧺 Sell Harvest"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`rounded-lg px-2 py-1.5 text-xs font-bold transition ${
                    tab === id ? "bg-foam text-ink ink-border" : "text-ink/60"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === "buy" && (
              <ul className="mt-3 space-y-2">
                {CROPS.map((c) => {
                  const locked = c.unlockLevel > state.level;
                  const owned = state.seeds[c.id] ?? 0;
                  return (
                    <li
                      key={c.id}
                      className={`flex items-center justify-between gap-2 rounded-xl p-2.5 ink-border ${
                        locked ? "bg-foam/60 opacity-60" : "bg-white/70"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="text-lg">{locked ? "🔒" : c.emoji}</span>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-ink">
                            {c.name}
                            {owned > 0 && (
                              <span className="ml-1 text-[10px] text-ink/60">×{owned} owned</span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {locked
                              ? `Unlocks at level ${c.unlockLevel}`
                              : `${c.seedCost}g per seed`}
                          </div>
                        </div>
                      </div>
                      {!locked && (
                        <div className="flex shrink-0 items-center gap-1">
                          {owned > 0 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 rounded-lg px-2 text-[10px]"
                              title={`Sell 1 back for ${Math.floor(c.seedCost / 2)}g`}
                              onClick={() => {
                                const earned = sellSeedsBack(c.id, 1);
                                if (earned) toast.success(`+${earned}g`);
                              }}
                            >
                              −1
                            </Button>
                          )}
                          {[1, 5].map((qty) => (
                            <Button
                              key={qty}
                              size="sm"
                              variant="outline"
                              className="h-7 rounded-lg px-2 text-[10px]"
                              disabled={
                                state.gold < c.seedCost || seedBagSpace(state.seeds, bagMax) === 0
                              }
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
            )}

            {tab === "sell" &&
              (barnEntries.length === 0 ? (
                <p className="mt-4 text-center text-sm text-muted-foreground">
                  Your barn is empty, plant something on the fields! 🌱
                </p>
              ) : (
                <>
                  <ul className="mt-3 space-y-2">
                    {barnEntries.map(([id, qty]) => {
                      const crop = cropById(id)!;
                      const price = effectiveSellPrice(crop, state.equipment);
                      return (
                        <li
                          key={id}
                          className="flex items-center justify-between rounded-xl bg-white/70 p-2.5 ink-border"
                        >
                          <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                            <span className="text-lg">{crop.emoji}</span>
                            {crop.name} × {qty}
                          </span>
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
                  <Button
                    className="mt-3 w-full rounded-xl"
                    onClick={() => {
                      let earned = 0;
                      for (const [id] of barnEntries) earned += sellCrop(id);
                      if (earned) toast.success(`Sold everything for ${earned}g!`);
                    }}
                  >
                    Sell all ({barnTotal.toLocaleString()}g)
                  </Button>
                </>
              ))}
          </>
        )}

        {kind === "market" && (
          <>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Permanent upgrades, speed gear stacks up to 55% faster growth, market gear up to +15%
              sell price.
            </p>
            <ul className="mt-3 space-y-2">
              {EQUIPMENT.map((e) => {
                const owned = state.equipment.includes(e.id);
                return (
                  <li
                    key={e.id}
                    className={`flex items-center justify-between rounded-xl p-2.5 ink-border ${
                      owned ? "bg-leaf/20" : "bg-white/70"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{e.emoji}</span>
                      <div>
                        <div className="text-sm font-semibold text-ink">{e.name}</div>
                        <div className="text-[11px] text-muted-foreground">{e.desc}</div>
                      </div>
                    </div>
                    {owned ? (
                      <span className="rounded-full bg-leaf/40 px-2 py-0.5 text-[10px] font-bold text-ink">
                        Owned
                      </span>
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
          </>
        )}

        <p className="mt-3 text-center text-[10px] text-ink/50">
          Press ESC or tap outside to close
        </p>
      </div>
    </div>
  );
}

export default WorldPage;
