// Pure game rules for Ansem Land — shared by the React hook, the UI
// tables (shop, docs), and unit tests. Keep React/browser APIs out.

/**
 * Crops unlock through level 10, but levels themselves are endless —
 * keep harvesting and the number keeps climbing.
 */
export const MAX_CROP_LEVEL = 10;
/** @deprecated kept as an alias for the crop-unlock ceiling */
export const MAX_LEVEL = MAX_CROP_LEVEL;
export const PLANT_ENERGY = 2;
export const UPGRADE_PLOT_COST = 250;
export const MAX_FARM_SIZE = 25;
export const ENERGY_REGEN_MS = 8_000;

export type Crop = {
  id: string;
  name: string;
  emoji: string;
  unlockLevel: number;
  seedCost: number;
  sellPrice: number;
  growMs: number;
  xp: number;
};

// One new crop unlocks per level. Grow time scales with the crop level:
// 5 seconds per level (tomato 5s … Golden Rice 50s), and later crops pay
// far more per plot.
export const CROPS: Crop[] = [
  {
    id: "tomato",
    name: "Tomato",
    emoji: "🍅",
    unlockLevel: 1,
    seedCost: 4,
    sellPrice: 7,
    growMs: 5_000,
    xp: 8,
  },
  {
    id: "eggplant",
    name: "Eggplant",
    emoji: "🍆",
    unlockLevel: 2,
    seedCost: 6,
    sellPrice: 11,
    growMs: 10_000,
    xp: 12,
  },
  {
    id: "corn",
    name: "Corn",
    emoji: "🌽",
    unlockLevel: 3,
    seedCost: 9,
    sellPrice: 17,
    growMs: 15_000,
    xp: 18,
  },
  {
    id: "chili",
    name: "Chili",
    emoji: "🌶️",
    unlockLevel: 4,
    seedCost: 14,
    sellPrice: 26,
    growMs: 20_000,
    xp: 25,
  },
  {
    id: "cabbage",
    name: "Cabbage",
    emoji: "🥬",
    unlockLevel: 5,
    seedCost: 20,
    sellPrice: 38,
    growMs: 25_000,
    xp: 35,
  },
  {
    id: "melon",
    name: "Melon",
    emoji: "🍈",
    unlockLevel: 6,
    seedCost: 30,
    sellPrice: 58,
    growMs: 30_000,
    xp: 50,
  },
  {
    id: "pumpkin",
    name: "Pumpkin",
    emoji: "🎃",
    unlockLevel: 7,
    seedCost: 45,
    sellPrice: 88,
    growMs: 35_000,
    xp: 70,
  },
  {
    id: "strawberry",
    name: "Strawberry",
    emoji: "🍓",
    unlockLevel: 8,
    seedCost: 65,
    sellPrice: 130,
    growMs: 40_000,
    xp: 95,
  },
  {
    id: "mango",
    name: "Mango",
    emoji: "🥭",
    unlockLevel: 9,
    seedCost: 95,
    sellPrice: 195,
    growMs: 45_000,
    xp: 130,
  },
  {
    id: "golden_rice",
    name: "Golden Rice",
    emoji: "🌾",
    unlockLevel: 10,
    seedCost: 140,
    sellPrice: 300,
    growMs: 50_000,
    xp: 180,
  },
];

export function cropById(id: string): Crop | undefined {
  return CROPS.find((c) => c.id === id);
}

export function cropsUnlockedAt(level: number): Crop[] {
  return CROPS.filter((c) => c.unlockLevel <= level);
}

export type Equipment = {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  /** fraction shaved off grow time (0.1 = grows 10% faster) */
  speedBonus: number;
  /** fraction added to sell price */
  sellBonus: number;
  desc: string;
};

export const EQUIPMENT: Equipment[] = [
  {
    id: "watering_can",
    name: "Watering Can",
    emoji: "🚿",
    cost: 150,
    speedBonus: 0.1,
    sellBonus: 0,
    desc: "Crops grow 10% faster.",
  },
  {
    id: "scarecrow",
    name: "Scarecrow",
    emoji: "🎭",
    cost: 400,
    speedBonus: 0,
    sellBonus: 0.05,
    desc: "Crops sell for 5% more.",
  },
  {
    id: "sprinkler",
    name: "Sprinkler",
    emoji: "💧",
    cost: 900,
    speedBonus: 0.2,
    sellBonus: 0,
    desc: "Crops grow 20% faster.",
  },
  {
    id: "fertilizer",
    name: "Fertilizer Kit",
    emoji: "🧪",
    cost: 1_600,
    speedBonus: 0.15,
    sellBonus: 0,
    desc: "Crops grow another 15% faster.",
  },
  {
    id: "greenhouse",
    name: "Greenhouse",
    emoji: "🏡",
    cost: 3_000,
    speedBonus: 0.25,
    sellBonus: 0,
    desc: "Crops grow another 25% faster.",
  },
  {
    id: "golden_hoe",
    name: "Golden Hoe",
    emoji: "⛏️",
    cost: 5_000,
    speedBonus: 0,
    sellBonus: 0.1,
    desc: "Crops sell for 10% more.",
  },
];

export const MAX_SPEED_BONUS = 0.55;
export const MAX_SELL_BONUS = 0.15;

export function equipmentById(id: string): Equipment | undefined {
  return EQUIPMENT.find((e) => e.id === id);
}

/**
 * Effective grow time for a crop. Equipment speed is capped at
 * MAX_SPEED_BONUS; an optional holding-tier bonus stacks multiplicatively
 * on top, so higher tiers always shave a little more off.
 */
export function effectiveGrowMs(crop: Crop, owned: string[], tierBonus = 0): number {
  let speed = 0;
  for (const id of owned) speed += equipmentById(id)?.speedBonus ?? 0;
  speed = Math.min(speed, MAX_SPEED_BONUS);
  return Math.round(crop.growMs * (1 - speed) * (1 - tierBonus));
}

/** Effective sell price for a crop given owned equipment ids. */
export function effectiveSellPrice(crop: Crop, owned: string[]): number {
  let bonus = 0;
  for (const id of owned) bonus += equipmentById(id)?.sellBonus ?? 0;
  bonus = Math.min(bonus, MAX_SELL_BONUS);
  return Math.round(crop.sellPrice * (1 + bonus));
}

export function xpForLevel(level: number) {
  return level * 100;
}

/** Add XP, carrying over level-ups. Levels are uncapped. */
export function applyXp(level: number, xp: number, gained: number): { level: number; xp: number } {
  let newXp = xp + gained;
  while (newXp >= xpForLevel(level)) {
    newXp -= xpForLevel(level);
    level += 1;
  }
  return { level, xp: newXp };
}

/** Activity-feed tier for a crop (reuses the rarity log pipeline). */
export function cropTier(crop: Crop): "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary" {
  if (crop.unlockLevel >= 9) return "Legendary";
  if (crop.unlockLevel >= 7) return "Epic";
  if (crop.unlockLevel >= 5) return "Rare";
  if (crop.unlockLevel >= 3) return "Uncommon";
  return "Common";
}

export type Rarity = ReturnType<typeof cropTier>;

export const rarityColor: Record<Rarity, string> = {
  Common: "text-muted-foreground",
  Uncommon: "text-leaf",
  Rare: "text-ocean",
  Epic: "text-violet-500",
  Legendary: "text-sunset-deep",
};

/** Shared town field: a ready crop withers if not harvested in time. */
export const WORLD_PLOT_WITHER_MS = 2 * 60 * 60 * 1000; // 2 hours

/**
 * A player's seed bag holds at most this many seeds in total — plant
 * what you have before buying more, so nobody hoards seeds while other
 * players wait for field space.
 */
export const MAX_SEED_BAG = 10;

export function seedBagCount(seeds: Record<string, number>): number {
  return Object.values(seeds).reduce((sum, n) => sum + n, 0);
}

export function seedBagSpace(seeds: Record<string, number>, max: number = MAX_SEED_BAG): number {
  return Math.max(0, max - seedBagCount(seeds));
}

// --------------------------------------------------- holding tiers

/**
 * The more $ANSEM a wallet holds, the more the town opens up. Perks are
 * pure quality-of-life/cosmetic gameplay utility — never a financial
 * promise. The balance is read-only; nothing is ever spent or staked.
 *
 * Thresholds are easy to tune; pick values that fit the token supply.
 */
export type Tier = {
  id: "sprout" | "farmer" | "rancher" | "landlord";
  name: string;
  emoji: string;
  minHold: number;
  /** seed-bag capacity at this tier */
  seedBag: number;
  /** energy regen interval (ms) — lower is faster */
  energyRegenMs: number;
  /** passive growth speed-up, stacks on top of equipment */
  growthBonus: number;
  /** tailwind text color for the badge */
  color: string;
  blurb: string;
};

export const TIERS: Tier[] = [
  {
    id: "sprout",
    name: "Sprout",
    emoji: "🌱",
    minHold: 1,
    seedBag: 10,
    energyRegenMs: 8_000,
    growthBonus: 0,
    color: "text-leaf",
    blurb: "Town access · 10-seed bag",
  },
  {
    id: "farmer",
    name: "Farmer",
    emoji: "🌾",
    minHold: 500_000,
    seedBag: 16,
    energyRegenMs: 7_000,
    growthBonus: 0.05,
    color: "text-ocean",
    blurb: "16-seed bag · +5% growth · faster energy",
  },
  {
    id: "rancher",
    name: "Rancher",
    emoji: "🚜",
    minHold: 2_500_000,
    seedBag: 26,
    energyRegenMs: 5_000,
    growthBonus: 0.1,
    color: "text-violet-500",
    blurb: "26-seed bag · +10% growth · 2× energy",
  },
  {
    id: "landlord",
    name: "Landlord",
    emoji: "👑",
    minHold: 10_000_000,
    seedBag: 40,
    energyRegenMs: 4_000,
    growthBonus: 0.15,
    color: "text-sunset-deep",
    blurb: "40-seed bag · +15% growth · gold crown badge",
  },
];

export function tierById(id: string): Tier {
  return TIERS.find((t) => t.id === id) ?? TIERS[0];
}

/** Highest tier whose threshold the balance meets. */
export function tierForBalance(balance: number): Tier {
  let result = TIERS[0];
  for (const t of TIERS) if (balance >= t.minHold) result = t;
  return result;
}

/** Next tier up (for "hold X more to reach…" hints), or null at the top. */
export function nextTier(balance: number): Tier | null {
  return TIERS.find((t) => balance < t.minHold) ?? null;
}

// --------------------------------------------------- daily quests

export type QuestTrack = "harvest" | "plant" | "sell_gold";

export type Quest = {
  id: string;
  label: string;
  emoji: string;
  track: QuestTrack;
  goal: number;
  reward: number; // gold
  xp: number;
};

export const DAILY_QUESTS: Quest[] = [
  {
    id: "harvest",
    label: "Harvest crops",
    emoji: "🧺",
    track: "harvest",
    goal: 12,
    reward: 50,
    xp: 30,
  },
  { id: "plant", label: "Plant seeds", emoji: "🌱", track: "plant", goal: 10, reward: 35, xp: 20 },
  {
    id: "earn",
    label: "Earn gold from sales",
    emoji: "💰",
    track: "sell_gold",
    goal: 200,
    reward: 70,
    xp: 40,
  },
];

/** Bonus gold for finishing all daily quests, scaling with login streak. */
export function streakBonus(streak: number): number {
  return 50 + Math.min(streak, 7) * 25; // day 1: 75g … day 7+: 225g
}

/** UTC calendar day key (YYYY-MM-DD). Quests reset at 00:00 UTC. */
export function utcDayKey(now: number = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

/** Whether `prev` day key is exactly the day before `today` (streak keeps). */
export function isYesterday(prev: string, today: string): boolean {
  const a = new Date(prev + "T00:00:00Z").getTime();
  const b = new Date(today + "T00:00:00Z").getTime();
  return b - a === 24 * 60 * 60 * 1000;
}

// ------------------------------------------------- leaderboard rewards

/**
 * Rewards are distributed once a day. Epochs sit on the Unix-time grid,
 * so each round closes exactly at 00:00 UTC.
 */
export const REWARD_INTERVAL_MS = 24 * 60 * 60 * 1000;
/**
 * Champions rest for 24 hours (hidden from the rankings until the next
 * 00:00 UTC reset) and can't win two rounds back to back.
 */
export const WINNER_COOLDOWN_MS = 24 * 60 * 60 * 1000;
/** Top N players win each round. */
export const REWARD_TOP_N = 3;

export function currentEpochStart(now: number): number {
  return Math.floor(now / REWARD_INTERVAL_MS) * REWARD_INTERVAL_MS;
}

export function nextRewardAt(now: number): number {
  return currentEpochStart(now) + REWARD_INTERVAL_MS;
}
