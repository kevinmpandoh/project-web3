import { useEffect, useState, useCallback, useRef } from "react";
import {
  CROPS,
  EQUIPMENT,
  TIERS,
  DAILY_QUESTS,
  MAX_FARM_SIZE,
  MAX_LEVEL,
  PLANT_ENERGY,
  UPGRADE_PLOT_COST,
  applyXp,
  cropById,
  cropTier,
  cropsUnlockedAt,
  effectiveGrowMs,
  effectiveSellPrice,
  equipmentById,
  xpForLevel,
  seedBagSpace,
  streakBonus,
  utcDayKey,
  isYesterday,
  MAX_SEED_BAG,
  type Crop,
  type Tier,
  type QuestTrack,
} from "@/lib/game-logic";
import { syncPlayer, logFishCatch, fetchPlayer } from "@/lib/api/game.functions";

export {
  CROPS,
  EQUIPMENT,
  TIERS,
  DAILY_QUESTS,
  MAX_LEVEL,
  MAX_SEED_BAG,
  UPGRADE_PLOT_COST,
  xpForLevel,
  cropsUnlockedAt,
  effectiveGrowMs,
  effectiveSellPrice,
  seedBagSpace,
  streakBonus,
};
export type { Tier };

export type Tile = {
  id: number;
  state: "empty" | "growing" | "ready";
  plantedAt: number | null;
  crop: string | null;
  /** grow duration captured at plant time so buying gear later is fair */
  growMs: number | null;
};

export type GameState = {
  username: string;
  level: number;
  xp: number;
  gold: number;
  energy: number;
  farmSize: number;
  tiles: Tile[];
  harvests: number;
  equipment: string[];
  /** seeds owned, by crop id — buy them at the Seed Shop */
  seeds: Record<string, number>;
  /** harvested produce waiting to be sold, by crop id */
  barn: Record<string, number>;
  /** daily quests (reset 00:00 UTC) */
  questDay: string;
  questProgress: Record<QuestTrack, number>;
  questClaimed: string[];
  /** login streak (consecutive UTC days played) */
  streak: number;
  lastActiveDay: string;
};

export type SyncState = "idle" | "syncing" | "synced" | "error";

const DEFAULT_SIZE = 9;
const KEY = "agriland_game_v1";
const SYNC_DEBOUNCE_MS = 3_000;

function makeTiles(size: number): Tile[] {
  return Array.from({ length: size }, (_, i) => ({
    id: i,
    state: "empty",
    plantedAt: null,
    crop: null,
    growMs: null,
  }));
}

const initial: GameState = {
  username: "",
  level: 1,
  xp: 0,
  gold: 25,
  energy: 100,
  farmSize: DEFAULT_SIZE,
  tiles: makeTiles(DEFAULT_SIZE),
  harvests: 0,
  equipment: [],
  seeds: { tomato: 5 }, // a starter pack so new players can plant right away
  barn: {},
  questDay: "",
  questProgress: { harvest: 0, plant: 0, sell_gold: 0 },
  questClaimed: [],
  streak: 0,
  lastActiveDay: "",
};

export function loadState(): GameState {
  if (typeof window === "undefined") return initial;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initial;
    const parsed = JSON.parse(raw);
    return { ...initial, ...parsed };
  } catch {
    return initial;
  }
}

export function saveState(s: GameState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(s));
}

/**
 * The Ansem Land loop: buy seeds → plant → wait → harvest → sell → level
 * up → unlock bigger crops → invest gold in equipment → repeat.
 * Saved locally on every change and synced to the server (debounced) so
 * the global leaderboard stays live.
 */
export function useGame(walletAddress: string | null = null, tier: Tier = TIERS[0]) {
  const isGuest = !!walletAddress && walletAddress.startsWith("guest-");
  const cloudWallet = isGuest ? null : walletAddress;
  const [state, setState] = useState<GameState>(initial);
  const [mounted, setMounted] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>("idle");

  useEffect(() => {
    setState(loadState());
    setMounted(true);
  }, []);

  // Guests are always capped at level 1 with no XP, even if local storage
  // carries progress from a previous wallet session on this device.
  useEffect(() => {
    if (!mounted || !isGuest) return;
    setState((s) => (s.level === 1 && s.xp === 0 ? s : { ...s, level: 1, xp: 0 }));
  }, [mounted, isGuest]);

  // Roll over daily quests at 00:00 UTC and keep the login streak.
  useEffect(() => {
    if (!mounted) return;
    const today = utcDayKey();
    setState((s) => {
      if (s.questDay === today) return s;
      const streak =
        s.lastActiveDay === today
          ? s.streak
          : isYesterday(s.lastActiveDay, today)
            ? s.streak + 1
            : 1;
      return {
        ...s,
        questDay: today,
        questProgress: { harvest: 0, plant: 0, sell_gold: 0 },
        questClaimed: [],
        streak,
        lastActiveDay: today,
      };
    });
  }, [mounted]);

  // Increment a quest counter, auto-resetting if the UTC day flipped.
  const bumpQuest = useCallback((track: QuestTrack, amount: number) => {
    setState((s) => {
      const today = utcDayKey();
      const fresh = s.questDay !== today;
      const base = fresh ? { harvest: 0, plant: 0, sell_gold: 0 } : s.questProgress;
      return {
        ...s,
        questDay: today,
        questClaimed: fresh ? [] : s.questClaimed,
        questProgress: { ...base, [track]: base[track] + amount },
      };
    });
  }, []);

  useEffect(() => {
    if (mounted) saveState(state);
  }, [state, mounted]);

  // On wallet connect, hydrate from the server if the cloud profile is
  // more progressed than local (e.g. fresh browser/incognito). Prevents
  // the next debounced sync from overwriting cloud progress with a
  // freshly-initialized local state.
  const [hydrated, setHydrated] = useState(false);
  const hydratedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!mounted) return;
    if (!cloudWallet) {
      setHydrated(true);
      return;
    }
    if (hydratedFor.current === cloudWallet) return;
    hydratedFor.current = cloudWallet;
    setHydrated(false);
    (async () => {
      try {
        const remote = await fetchPlayer({ data: { wallet: cloudWallet } });
        if (remote) {
          setState((s) => {
            if (remote.xp <= s.xp && remote.level <= s.level && remote.coins <= s.gold) return s;
            return {
              ...s,
              username: s.username || remote.username || "",
              level: Math.max(s.level, remote.level),
              xp: Math.max(s.xp, remote.xp),
              gold: Math.max(s.gold, remote.coins),
              harvests: Math.max(s.harvests, remote.rice_harvested ?? 0),
            };
          });
        }
      } catch (e) {
        console.warn("hydrate from cloud failed", e);
      } finally {
        setHydrated(true);
      }
    })();
  }, [mounted, cloudWallet]);

  // Debounced cloud sync for the leaderboard/profile.
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!mounted || !cloudWallet || !hydrated) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(async () => {
      setSyncState("syncing");
      try {
        await syncPlayer({
          data: {
            wallet: cloudWallet,
            username: state.username || undefined,
            level: state.level,
            xp: state.xp,
            coins: state.gold,
            riceHarvested: state.harvests,
            fishCaught: 0,
          },
        });
        setSyncState("synced");
      } catch (e) {
        console.warn("cloud sync failed", e);
        setSyncState("error");
      }
    }, SYNC_DEBOUNCE_MS);
    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [mounted, hydrated, cloudWallet, state.username, state.level, state.xp, state.gold, state.harvests]);

  // 1s tick: re-render growth bars and flip grown tiles to ready.
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      force((n) => n + 1);
      setState((s) => {
        let changed = false;
        const tiles = s.tiles.map((tile) => {
          if (
            tile.state === "growing" &&
            tile.plantedAt &&
            tile.growMs &&
            Date.now() - tile.plantedAt >= tile.growMs
          ) {
            changed = true;
            return { ...tile, state: "ready" as const };
          }
          return tile;
        });
        return changed ? { ...s, tiles } : s;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // energy regen — interval shortens with holding tier
  useEffect(() => {
    const t = setInterval(() => {
      setState((s) => (s.energy < 100 ? { ...s, energy: Math.min(100, s.energy + 1) } : s));
    }, tier.energyRegenMs);
    return () => clearInterval(t);
  }, [tier.energyRegenMs]);

  const grant = useCallback((xp: number, gold = 0) => {
    setState((s) => {
      if (isGuest) {
        // Guests can earn coins but stay at level 1 with no XP progress.
        return { ...s, gold: s.gold + gold };
      }
      const leveled = applyXp(s.level, s.xp, xp);
      return { ...s, xp: leveled.xp, level: leveled.level, gold: s.gold + gold };
    });
  }, [isGuest]);

  const setUsername = (name: string) => {
    setState((s) => ({ ...s, username: name.trim().slice(0, 20) }));
  };

  /** Plant a seed from your seed bag (buy seeds at the Seed Shop). */
  const plant = (idx: number, cropId: string) => {
    setState((s) => {
      const crop = cropById(cropId);
      if (!crop) return s;
      if (crop.unlockLevel > s.level) return s;
      if ((s.seeds[crop.id] ?? 0) < 1 || s.energy < PLANT_ENERGY) return s;
      const tile = s.tiles[idx];
      if (!tile || tile.state !== "empty") return s;
      const growMs = effectiveGrowMs(crop, s.equipment, tier.growthBonus);
      const tiles = s.tiles.map((t) =>
        t.id === idx
          ? { ...t, state: "growing" as const, plantedAt: Date.now(), crop: crop.id, growMs }
          : t,
      );
      return {
        ...s,
        tiles,
        seeds: { ...s.seeds, [crop.id]: (s.seeds[crop.id] ?? 0) - 1 },
        energy: s.energy - PLANT_ENERGY,
      };
    });
    bumpQuest("plant", 1);
  };

  const harvest = (idx: number): Crop | null => {
    const tile = state.tiles[idx];
    if (!tile || tile.state !== "ready" || !tile.crop) return null;
    const crop = cropById(tile.crop);
    if (!crop) return null;
    setState((s) => {
      const tiles = s.tiles.map((t) =>
        t.id === idx
          ? { ...t, state: "empty" as const, plantedAt: null, crop: null, growMs: null }
          : t,
      );
      return {
        ...s,
        tiles,
        harvests: s.harvests + 1,
        barn: { ...s.barn, [crop.id]: (s.barn[crop.id] ?? 0) + 1 },
      };
    });
    grant(crop.xp);
    bumpQuest("harvest", 1);
    // High-tier harvests show up in the village activity feed.
    if (cloudWallet && crop.unlockLevel >= 5) {
      logFishCatch({
        data: {
          wallet: cloudWallet,
          fishName: crop.name,
          rarity: cropTier(crop),
          value: crop.sellPrice,
        },
      }).catch((e) => console.warn("harvest log failed", e));
    }
    return crop;
  };

  /** Sell everything of one crop from the barn. Returns gold earned. */
  const sellCrop = (cropId: string): number => {
    const crop = cropById(cropId);
    if (!crop) return 0;
    const qty = state.barn[cropId] ?? 0;
    if (qty === 0) return 0;
    const price = effectiveSellPrice(crop, state.equipment);
    const earned = qty * price;
    setState((s) => {
      const barn = { ...s.barn };
      delete barn[cropId];
      return { ...s, gold: s.gold + earned, barn };
    });
    bumpQuest("sell_gold", earned);
    return earned;
  };

  const buyEquipment = (id: string): boolean => {
    const item = equipmentById(id);
    if (!item) return false;
    if (state.equipment.includes(id) || state.gold < item.cost) return false;
    setState((s) => ({
      ...s,
      gold: s.gold - item.cost,
      equipment: [...s.equipment, id],
    }));
    return true;
  };

  /** World field: consume 1 seed + energy. Returns false if you have none. */
  const spendSeed = (cropId: string): boolean => {
    const crop = cropById(cropId);
    if (!crop) return false;
    if (crop.unlockLevel > state.level) return false;
    if ((state.seeds[crop.id] ?? 0) < 1 || state.energy < PLANT_ENERGY) return false;
    setState((s) => ({
      ...s,
      seeds: { ...s.seeds, [crop.id]: (s.seeds[crop.id] ?? 0) - 1 },
      energy: s.energy - PLANT_ENERGY,
    }));
    bumpQuest("plant", 1);
    return true;
  };

  /**
   * Seed Shop: buy seeds with gold. The bag holds MAX_SEED_BAG seeds in
   * total (plant before buying more); requests are clamped to the space
   * left. Returns the number of seeds actually bought (0 = failed).
   */
  const buySeeds = (cropId: string, qty: number): number => {
    const crop = cropById(cropId);
    if (!crop || qty < 1) return 0;
    if (crop.unlockLevel > state.level) return 0;
    const buyQty = Math.min(qty, seedBagSpace(state.seeds, tier.seedBag));
    if (buyQty === 0) return 0;
    const cost = crop.seedCost * buyQty;
    if (state.gold < cost) return 0;
    setState((s) => ({
      ...s,
      gold: s.gold - cost,
      seeds: { ...s.seeds, [crop.id]: (s.seeds[crop.id] ?? 0) + buyQty },
    }));
    return buyQty;
  };

  /** Seed Shop: sell seeds back at half price. Returns gold earned. */
  const sellSeedsBack = (cropId: string, qty: number): number => {
    const crop = cropById(cropId);
    if (!crop || qty < 1) return 0;
    const owned = state.seeds[crop.id] ?? 0;
    const take = Math.min(qty, owned);
    if (take === 0) return 0;
    const earned = Math.floor((crop.seedCost / 2) * take);
    setState((s) => ({
      ...s,
      gold: s.gold + earned,
      seeds: { ...s.seeds, [crop.id]: (s.seeds[crop.id] ?? 0) - take },
    }));
    return earned;
  };

  /** World field: receive a harvested crop into the barn (+XP). */
  const gainHarvest = (cropId: string): Crop | null => {
    const crop = cropById(cropId);
    if (!crop) return null;
    setState((s) => ({
      ...s,
      harvests: s.harvests + 1,
      barn: { ...s.barn, [crop.id]: (s.barn[crop.id] ?? 0) + 1 },
    }));
    grant(crop.xp);
    bumpQuest("harvest", 1);
    if (cloudWallet && crop.unlockLevel >= 5) {
      logFishCatch({
        data: {
          wallet: cloudWallet,
          fishName: crop.name,
          rarity: cropTier(crop),
          value: crop.sellPrice,
        },
      }).catch((e) => console.warn("harvest log failed", e));
    }
    return crop;
  };

  /**
   * Claim a finished daily quest's reward. Claiming the last one of the
   * day also pays a streak bonus. Returns gold awarded (0 = not ready).
   */
  const claimQuest = (questId: string): number => {
    const quest = DAILY_QUESTS.find((q) => q.id === questId);
    if (!quest) return 0;
    if (state.questClaimed.includes(questId)) return 0;
    if ((state.questProgress[quest.track] ?? 0) < quest.goal) return 0;

    const claimedAfter = [...state.questClaimed, questId];
    const allDone = DAILY_QUESTS.every((q) => claimedAfter.includes(q.id));
    const bonus = allDone ? streakBonus(state.streak) : 0;
    const total = quest.reward + bonus;

    setState((s) => {
      const leveled = applyXp(s.level, s.xp, quest.xp);
      return {
        ...s,
        xp: leveled.xp,
        level: leveled.level,
        gold: s.gold + total,
        questClaimed: claimedAfter,
      };
    });
    return total;
  };

  const upgradeFarm = () => {
    setState((s) => {
      if (s.gold < UPGRADE_PLOT_COST || s.farmSize >= MAX_FARM_SIZE) return s;
      const newSize = s.farmSize + 4;
      const extra = makeTiles(newSize)
        .slice(s.farmSize)
        .map((t, i) => ({ ...t, id: s.farmSize + i }));
      return {
        ...s,
        gold: s.gold - UPGRADE_PLOT_COST,
        farmSize: newSize,
        tiles: [...s.tiles, ...extra],
      };
    });
  };

  return {
    state,
    syncState,
    isGuest,
    setUsername,
    plant,
    harvest,
    sellCrop,
    buyEquipment,
    upgradeFarm,
    spendSeed,
    buySeeds,
    sellSeedsBack,
    gainHarvest,
    claimQuest,
    tier,
  };
}
