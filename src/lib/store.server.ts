import process from "node:process";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Server-only persistence for SawahVerse.
//
// Two backends behind one interface:
//   - SupabaseStore: used when SUPABASE_URL plus a server/admin or publishable
//     key are set (schema in supabase/schema.sql). Writes need the server key;
//     public reads can still use the publishable key so leaderboards don't
//     disappear if the privileged key is temporarily unavailable in preview.
//   - FileStore: zero-config fallback for local dev — persists to
//     .data/sawahverse.json so the app runs end-to-end without any env vars.

export type Rarity = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";

export type PlayerRow = {
  wallet_address: string;
  username: string | null;
  level: number;
  xp: number;
  coins: number;
  rice_harvested: number;
  fish_caught: number;
  created_at?: string;
  last_seen_at: string;
};

export type ChatRow = {
  id: string;
  wallet_address: string;
  display_name: string;
  body: string;
  created_at: string;
};

export type CatchRow = {
  id: string;
  wallet_address: string;
  display_name: string;
  fish_name: string;
  rarity: Rarity;
  value: number;
  caught_at: string;
};

export type PresenceRow = {
  wallet_address: string;
  name: string;
  level: number;
  tier: string;
  x: number;
  y: number;
  updated_at: string;
};

export type WorldPlotRow = {
  plot_key: string; // "x:y"
  x: number;
  y: number;
  wallet_address: string;
  crop: string;
  planted_at: string;
  ready_at: string;
  expires_at: string;
};

export type WinnerRow = {
  id: string;
  /** ISO start of the 3h reward epoch this win belongs to */
  epoch: string;
  rank: number;
  wallet_address: string;
  name: string;
  coins: number;
  created_at: string;
};

export interface GameStore {
  upsertPlayer(p: Omit<PlayerRow, "last_seen_at">): Promise<PlayerRow>;
  getPlayer(wallet: string): Promise<PlayerRow | null>;
  firstPlayerCreatedAt(): Promise<string | null>;
  topPlayers(limit: number): Promise<PlayerRow[]>;
  listChat(limit: number): Promise<ChatRow[]>;
  insertChat(wallet: string, body: string): Promise<ChatRow>;
  logCatch(c: Omit<CatchRow, "id" | "caught_at" | "display_name">): Promise<void>;
  recentCatches(limit: number): Promise<CatchRow[]>;
  upsertPresence(p: Omit<PresenceRow, "updated_at">): Promise<void>;
  listPresence(maxAgeMs: number): Promise<PresenceRow[]>;
  /** All live shared-field plots (expired ones are removed). */
  listPlots(): Promise<WorldPlotRow[]>;
  /** Plant if the plot is free. Returns false when occupied. */
  plantPlot(row: WorldPlotRow): Promise<boolean>;
  /** Remove a plot after a successful harvest. */
  removePlot(plotKey: string): Promise<void>;
  getPlot(plotKey: string): Promise<WorldPlotRow | null>;
  /** Record the top-3 snapshot for a reward epoch (idempotent per epoch). */
  recordWinners(rows: Omit<WinnerRow, "id" | "created_at">[]): Promise<void>;
  /** Most recent winners, newest epoch first. */
  listWinners(limit: number): Promise<WinnerRow[]>;
  /** ISO of the latest epoch that has winners recorded, or null. */
  latestWinnerEpoch(): Promise<string | null>;
  /** Wins recorded since the given time (for the 24h cooldown). */
  winnersSince(sinceIso: string): Promise<WinnerRow[]>;
}

export function displayName(p: { username: string | null; wallet_address: string }) {
  if (p.wallet_address.startsWith("guest-")) {
    return "Guest-" + p.wallet_address.replace(/^guest-/, "").slice(0, 4).toUpperCase();
  }
  return p.username?.trim() || `${p.wallet_address.slice(0, 4)}…${p.wallet_address.slice(-4)}`;
}

// ---------------------------------------------------------------- Supabase

class SupabaseStore implements GameStore {
  constructor(private db: SupabaseClient) {}

  async upsertPlayer(p: Omit<PlayerRow, "last_seen_at">): Promise<PlayerRow> {
    const row = { ...p, last_seen_at: new Date().toISOString() };
    const { data, error } = await this.db
      .from("users")
      .upsert(row, { onConflict: "wallet_address" })
      .select()
      .single();
    if (error) throw new Error(`upsertPlayer: ${error.message}`);
    return data as PlayerRow;
  }

  async getPlayer(wallet: string): Promise<PlayerRow | null> {
    const { data, error } = await this.db
      .from("users")
      .select()
      .eq("wallet_address", wallet)
      .maybeSingle();
    if (error) throw new Error(`getPlayer: ${error.message}`);
    return (data as PlayerRow) ?? null;
  }

  async firstPlayerCreatedAt(): Promise<string | null> {
    const { data, error } = await this.db
      .from("users")
      .select("created_at")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`firstPlayerCreatedAt: ${error.message}`);
    return data?.created_at ?? null;
  }

  async topPlayers(limit: number): Promise<PlayerRow[]> {
    const { data, error } = await this.db
      .from("users")
      .select()
      .order("coins", { ascending: false })
      .limit(limit);
    if (error) throw new Error(`topPlayers: ${error.message}`);
    return (data ?? []) as PlayerRow[];
  }

  async listChat(limit: number): Promise<ChatRow[]> {
    const { data, error } = await this.db
      .from("chat_messages")
      .select("id, wallet_address, body, created_at, users(username)")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(`listChat: ${error.message}`);
    type JoinedChat = ChatRow & { users: { username: string | null } | null };
    return ((data ?? []) as unknown as JoinedChat[])
      .map((m) => ({
        id: m.id,
        wallet_address: m.wallet_address,
        display_name: displayName({
          username: m.users?.username ?? null,
          wallet_address: m.wallet_address,
        }),
        body: m.body,
        created_at: m.created_at,
      }))
      .reverse();
  }

  async insertChat(wallet: string, body: string): Promise<ChatRow> {
    if (wallet.startsWith("guest-")) {
      await this.db
        .from("users")
        .upsert({ wallet_address: wallet, last_seen_at: new Date().toISOString() }, { onConflict: "wallet_address" });
    }
    const { data, error } = await this.db
      .from("chat_messages")
      .insert({ wallet_address: wallet, body })
      .select()
      .single();
    if (error) throw new Error(`insertChat: ${error.message}`);
    const player = await this.getPlayer(wallet);
    return {
      id: data.id,
      wallet_address: wallet,
      display_name: displayName({ username: player?.username ?? null, wallet_address: wallet }),
      body: data.body,
      created_at: data.created_at,
    };
  }

  async logCatch(c: Omit<CatchRow, "id" | "caught_at" | "display_name">): Promise<void> {
    const { error } = await this.db.from("fish_catches").insert(c);
    if (error) throw new Error(`logCatch: ${error.message}`);
  }

  async recentCatches(limit: number): Promise<CatchRow[]> {
    const { data, error } = await this.db
      .from("fish_catches")
      .select("id, wallet_address, fish_name, rarity, value, caught_at, users(username)")
      .order("caught_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(`recentCatches: ${error.message}`);
    type JoinedCatch = CatchRow & { users: { username: string | null } | null };
    return ((data ?? []) as unknown as JoinedCatch[]).map((c) => ({
      id: c.id,
      wallet_address: c.wallet_address,
      display_name: displayName({
        username: c.users?.username ?? null,
        wallet_address: c.wallet_address,
      }),
      fish_name: c.fish_name,
      rarity: c.rarity,
      value: c.value,
      caught_at: c.caught_at,
    }));
  }

  async upsertPresence(p: Omit<PresenceRow, "updated_at">): Promise<void> {
    const { error } = await this.db
      .from("world_presence")
      .upsert({ ...p, updated_at: new Date().toISOString() }, { onConflict: "wallet_address" });
    if (error) throw new Error(`upsertPresence: ${error.message}`);
  }

  async listPresence(maxAgeMs: number): Promise<PresenceRow[]> {
    const cutoff = new Date(Date.now() - maxAgeMs).toISOString();
    const { data, error } = await this.db
      .from("world_presence")
      .select()
      .gte("updated_at", cutoff)
      .limit(100);
    if (error) throw new Error(`listPresence: ${error.message}`);
    return (data ?? []) as PresenceRow[];
  }

  async listPlots(): Promise<WorldPlotRow[]> {
    // Opportunistic cleanup of withered plants.
    await this.db.from("world_plots").delete().lt("expires_at", new Date().toISOString());
    const { data, error } = await this.db.from("world_plots").select().limit(500);
    if (error) throw new Error(`listPlots: ${error.message}`);
    return (data ?? []) as WorldPlotRow[];
  }

  async plantPlot(row: WorldPlotRow): Promise<boolean> {
    // Plain insert: the plot_key primary key makes double-planting fail.
    const { error } = await this.db.from("world_plots").insert(row);
    if (error) {
      if (error.code === "23505") return false; // unique violation = occupied
      throw new Error(`plantPlot: ${error.message}`);
    }
    return true;
  }

  async removePlot(plotKey: string): Promise<void> {
    const { error } = await this.db.from("world_plots").delete().eq("plot_key", plotKey);
    if (error) throw new Error(`removePlot: ${error.message}`);
  }

  async getPlot(plotKey: string): Promise<WorldPlotRow | null> {
    const { data, error } = await this.db
      .from("world_plots")
      .select()
      .eq("plot_key", plotKey)
      .maybeSingle();
    if (error) throw new Error(`getPlot: ${error.message}`);
    return (data as WorldPlotRow) ?? null;
  }

  async recordWinners(rows: Omit<WinnerRow, "id" | "created_at">[]): Promise<void> {
    if (rows.length === 0) return;
    const { error } = await this.db
      .from("leaderboard_winners")
      .upsert(rows, { onConflict: "epoch,rank" });
    if (error) throw new Error(`recordWinners: ${error.message}`);
  }

  async listWinners(limit: number): Promise<WinnerRow[]> {
    const { data, error } = await this.db
      .from("leaderboard_winners")
      .select()
      .order("epoch", { ascending: false })
      .order("rank", { ascending: true })
      .limit(limit);
    if (error) throw new Error(`listWinners: ${error.message}`);
    return (data ?? []) as WinnerRow[];
  }

  async latestWinnerEpoch(): Promise<string | null> {
    const { data, error } = await this.db
      .from("leaderboard_winners")
      .select("epoch")
      .order("epoch", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`latestWinnerEpoch: ${error.message}`);
    return data?.epoch ?? null;
  }

  async winnersSince(sinceIso: string): Promise<WinnerRow[]> {
    const { data, error } = await this.db
      .from("leaderboard_winners")
      .select()
      .gte("epoch", sinceIso);
    if (error) throw new Error(`winnersSince: ${error.message}`);
    return (data ?? []) as WinnerRow[];
  }
}

// -------------------------------------------------------------- File (dev)

type FileData = {
  players: Record<string, PlayerRow>;
  chat: ChatRow[];
  catches: CatchRow[];
  plots: Record<string, WorldPlotRow>;
  winners: WinnerRow[];
};

const EMPTY: FileData = { players: {}, chat: [], catches: [], plots: {}, winners: [] };
const FILE_PATH = ".data/sawahverse.json";

class FileStore implements GameStore {
  private cache: FileData | null = null;

  private async load(): Promise<FileData> {
    if (this.cache) return this.cache;
    try {
      const { readFile } = await import("node:fs/promises");
      this.cache = JSON.parse(await readFile(FILE_PATH, "utf8")) as FileData;
    } catch {
      this.cache = structuredClone(EMPTY);
    }
    return this.cache;
  }

  private async save(data: FileData) {
    this.cache = data;
    try {
      const { mkdir, writeFile } = await import("node:fs/promises");
      await mkdir(".data", { recursive: true });
      await writeFile(FILE_PATH, JSON.stringify(data, null, 2));
    } catch (e) {
      // Read-only FS (e.g. serverless preview): keep working from memory.
      console.warn("FileStore: persist failed, continuing in-memory", e);
    }
  }

  async upsertPlayer(p: Omit<PlayerRow, "last_seen_at">): Promise<PlayerRow> {
    const data = await this.load();
    const now = new Date().toISOString();
    const row: PlayerRow = {
      ...data.players[p.wallet_address],
      ...p,
      created_at: data.players[p.wallet_address]?.created_at ?? now,
      last_seen_at: now,
    };
    data.players[p.wallet_address] = row;
    await this.save(data);
    return row;
  }

  async getPlayer(wallet: string): Promise<PlayerRow | null> {
    const data = await this.load();
    return data.players[wallet] ?? null;
  }

  async firstPlayerCreatedAt(): Promise<string | null> {
    const data = await this.load();
    const createdAt = Object.values(data.players)
      .map((p) => p.created_at ?? p.last_seen_at)
      .sort()[0];
    return createdAt ?? null;
  }

  async topPlayers(limit: number): Promise<PlayerRow[]> {
    const data = await this.load();
    return Object.values(data.players)
      .sort((a, b) => b.coins - a.coins)
      .slice(0, limit);
  }

  async listChat(limit: number): Promise<ChatRow[]> {
    const data = await this.load();
    return data.chat.slice(-limit);
  }

  async insertChat(wallet: string, body: string): Promise<ChatRow> {
    const data = await this.load();
    const player = data.players[wallet] ?? null;
    const row: ChatRow = {
      id: crypto.randomUUID(),
      wallet_address: wallet,
      display_name: displayName({ username: player?.username ?? null, wallet_address: wallet }),
      body,
      created_at: new Date().toISOString(),
    };
    data.chat = [...data.chat, row].slice(-200);
    await this.save(data);
    return row;
  }

  async logCatch(c: Omit<CatchRow, "id" | "caught_at" | "display_name">): Promise<void> {
    const data = await this.load();
    const player = data.players[c.wallet_address] ?? null;
    data.catches = [
      {
        ...c,
        id: crypto.randomUUID(),
        display_name: displayName({
          username: player?.username ?? null,
          wallet_address: c.wallet_address,
        }),
        caught_at: new Date().toISOString(),
      },
      ...data.catches,
    ].slice(0, 200);
    await this.save(data);
  }

  async recentCatches(limit: number): Promise<CatchRow[]> {
    const data = await this.load();
    return data.catches.slice(0, limit);
  }

  // Presence is ephemeral — in dev (single process) memory is enough,
  // no need to hammer the JSON file every ping.
  private presence = new Map<string, PresenceRow>();

  async upsertPresence(p: Omit<PresenceRow, "updated_at">): Promise<void> {
    this.presence.set(p.wallet_address, { ...p, updated_at: new Date().toISOString() });
  }

  async listPresence(maxAgeMs: number): Promise<PresenceRow[]> {
    const cutoff = Date.now() - maxAgeMs;
    const out: PresenceRow[] = [];
    for (const [wallet, row] of this.presence) {
      if (new Date(row.updated_at).getTime() >= cutoff) out.push(row);
      else this.presence.delete(wallet);
    }
    return out;
  }

  private async cleanupPlots(data: FileData) {
    const now = Date.now();
    let changed = false;
    for (const [key, plot] of Object.entries(data.plots ?? {})) {
      if (new Date(plot.expires_at).getTime() < now) {
        delete data.plots[key];
        changed = true;
      }
    }
    if (changed) await this.save(data);
  }

  async listPlots(): Promise<WorldPlotRow[]> {
    const data = await this.load();
    data.plots ??= {};
    await this.cleanupPlots(data);
    return Object.values(data.plots);
  }

  async plantPlot(row: WorldPlotRow): Promise<boolean> {
    const data = await this.load();
    data.plots ??= {};
    await this.cleanupPlots(data);
    if (data.plots[row.plot_key]) return false;
    data.plots[row.plot_key] = row;
    await this.save(data);
    return true;
  }

  async removePlot(plotKey: string): Promise<void> {
    const data = await this.load();
    data.plots ??= {};
    delete data.plots[plotKey];
    await this.save(data);
  }

  async getPlot(plotKey: string): Promise<WorldPlotRow | null> {
    const data = await this.load();
    data.plots ??= {};
    await this.cleanupPlots(data);
    return data.plots[plotKey] ?? null;
  }

  async recordWinners(rows: Omit<WinnerRow, "id" | "created_at">[]): Promise<void> {
    if (rows.length === 0) return;
    const data = await this.load();
    data.winners ??= [];
    for (const row of rows) {
      const exists = data.winners.some((w) => w.epoch === row.epoch && w.rank === row.rank);
      if (!exists) {
        data.winners.push({
          ...row,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
        });
      }
    }
    data.winners = data.winners.slice(-300);
    await this.save(data);
  }

  async listWinners(limit: number): Promise<WinnerRow[]> {
    const data = await this.load();
    data.winners ??= [];
    return [...data.winners]
      .sort((a, b) => (a.epoch === b.epoch ? a.rank - b.rank : b.epoch.localeCompare(a.epoch)))
      .slice(0, limit);
  }

  async latestWinnerEpoch(): Promise<string | null> {
    const data = await this.load();
    data.winners ??= [];
    let latest: string | null = null;
    for (const w of data.winners) if (!latest || w.epoch > latest) latest = w.epoch;
    return latest;
  }

  async winnersSince(sinceIso: string): Promise<WinnerRow[]> {
    const data = await this.load();
    data.winners ??= [];
    return data.winners.filter((w) => w.epoch >= sinceIso);
  }
}

// ----------------------------------------------------------------- Factory

let store: GameStore | null = null;
let storeIsPersistent = false;

export function getStore(): GameStore {
  if (store && storeIsPersistent) return store;
  try {
    // supabaseAdmin is a Proxy: accessing a property forces it to read env
    // vars and build the client. Throws if SUPABASE_URL / SERVICE_ROLE_KEY
    // are missing.
    void supabaseAdmin.auth;
    store = new SupabaseStore(supabaseAdmin as unknown as SupabaseClient);
    storeIsPersistent = true;
    return store;
  } catch (e) {
    console.warn("[store] admin client unavailable, trying public fallback", (e as Error)?.message);
  }
  const env = (process.env ?? {}) as Record<string, string | undefined>;
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const key =
    env.SUPABASE_SERVICE_ROLE_KEY ||
    env.SUPABASE_PUBLISHABLE_KEY ||
    env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (url && key) {
    store = new SupabaseStore(createClient(url, key, { auth: { persistSession: false } }));
    storeIsPersistent = true;
  } else {
    if (!store) store = new FileStore();
    console.warn("[store] persistent store unavailable", {
      hasUrl: !!url,
      hasServiceKey: !!env.SUPABASE_SERVICE_ROLE_KEY,
      hasPublishableKey: !!(env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY),
    });
  }
  return store;
}

export function isPersistentStore(): boolean {
  return storeIsPersistent;
}
