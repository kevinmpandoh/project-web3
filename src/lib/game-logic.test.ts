import { describe, expect, test } from "bun:test";
import {
  CROPS,
  MAX_SEED_BAG,
  TIERS,
  DAILY_QUESTS,
  tierForBalance,
  nextTier,
  streakBonus,
  utcDayKey,
  isYesterday,
  REWARD_INTERVAL_MS,
  WINNER_COOLDOWN_MS,
  currentEpochStart,
  nextRewardAt,
  seedBagCount,
  seedBagSpace,
  EQUIPMENT,
  MAX_LEVEL,
  applyXp,
  cropTier,
  cropsUnlockedAt,
  effectiveGrowMs,
  effectiveSellPrice,
  xpForLevel,
} from "./game-logic";

describe("crops", () => {
  test("there are 10 crops, one unlocking per level", () => {
    expect(CROPS.length).toBe(10);
    const levels = CROPS.map((c) => c.unlockLevel);
    expect(levels).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  test("every crop is profitable per seed", () => {
    for (const c of CROPS) expect(c.sellPrice).toBeGreaterThan(c.seedCost);
  });

  test("grow time scales 5s per crop level (5s … 50s)", () => {
    for (const c of CROPS) expect(c.growMs).toBe(c.unlockLevel * 5_000);
  });

  test("level gates which crops can be planted", () => {
    expect(cropsUnlockedAt(1).map((c) => c.id)).toEqual(["tomato"]);
    expect(cropsUnlockedAt(3).length).toBe(3);
    expect(cropsUnlockedAt(MAX_LEVEL).length).toBe(10);
  });

  test("activity tiers span common to legendary", () => {
    expect(cropTier(CROPS[0])).toBe("Common");
    expect(cropTier(CROPS[9])).toBe("Legendary");
  });
});

describe("equipment", () => {
  test("speed equipment shortens grow time, capped at 55%", () => {
    const tomato = CROPS[0];
    expect(effectiveGrowMs(tomato, [])).toBe(5_000);
    expect(effectiveGrowMs(tomato, ["watering_can"])).toBe(4_500);
    const all = EQUIPMENT.map((e) => e.id);
    // total speed bonuses = 0.7 → capped at 0.55
    expect(effectiveGrowMs(tomato, all)).toBe(2_250);
  });

  test("sell equipment raises prices, capped at 15%", () => {
    const melon = CROPS.find((c) => c.id === "melon")!;
    expect(effectiveSellPrice(melon, [])).toBe(58);
    expect(effectiveSellPrice(melon, ["scarecrow"])).toBe(61);
    expect(effectiveSellPrice(melon, ["scarecrow", "golden_hoe"])).toBe(Math.round(58 * 1.15));
  });
});

describe("levels", () => {
  test("xp requirement grows with level", () => {
    expect(xpForLevel(1)).toBe(100);
    expect(xpForLevel(7)).toBe(700);
  });

  test("levels up and carries over remaining xp", () => {
    expect(applyXp(1, 90, 20)).toEqual({ level: 2, xp: 10 });
    expect(applyXp(1, 0, 305)).toEqual({ level: 3, xp: 5 });
  });

  test("levels are uncapped and keep climbing past 10", () => {
    // level 10 needs 1000 XP → 1100 lands at level 11 with 100 left over
    expect(applyXp(10, 0, 1_100)).toEqual({ level: 11, xp: 100 });
    const high = applyXp(1, 0, 1_000_000);
    expect(high.level).toBeGreaterThan(10);
  });
});

describe("seed bag", () => {
  test("holds at most 10 seeds in total", () => {
    expect(MAX_SEED_BAG).toBe(10);
    expect(seedBagCount({ tomato: 4, corn: 3 })).toBe(7);
    expect(seedBagSpace({ tomato: 4, corn: 3 })).toBe(3);
    expect(seedBagSpace({ tomato: 10 })).toBe(0);
    expect(seedBagSpace({})).toBe(MAX_SEED_BAG);
  });
});

describe("reward schedule", () => {
  test("rounds are daily and reset exactly at 00:00 UTC", () => {
    expect(REWARD_INTERVAL_MS).toBe(24 * 60 * 60 * 1000);
    expect(WINNER_COOLDOWN_MS).toBe(24 * 60 * 60 * 1000);
    const now = Date.UTC(2026, 5, 12, 7, 30); // 07:30 UTC
    expect(currentEpochStart(now)).toBe(Date.UTC(2026, 5, 12, 0, 0));
    expect(nextRewardAt(now)).toBe(Date.UTC(2026, 5, 13, 0, 0));
    // one second before midnight still belongs to the same round
    const lateNight = Date.UTC(2026, 5, 12, 23, 59, 59);
    expect(nextRewardAt(lateNight)).toBe(Date.UTC(2026, 5, 13, 0, 0));
  });
});

describe("holding tiers", () => {
  test("balance maps to the right tier", () => {
    expect(tierForBalance(0).id).toBe("sprout"); // below 1 still floors to base tier object
    expect(tierForBalance(1).id).toBe("sprout");
    expect(tierForBalance(499_999).id).toBe("sprout");
    expect(tierForBalance(500_000).id).toBe("farmer");
    expect(tierForBalance(2_500_000).id).toBe("rancher");
    expect(tierForBalance(10_000_000).id).toBe("landlord");
  });

  test("perks increase monotonically with tier", () => {
    const ids = TIERS.map((t) => t.id);
    expect(ids).toEqual(["sprout", "farmer", "rancher", "landlord"]);
    for (let i = 1; i < TIERS.length; i++) {
      expect(TIERS[i].seedBag).toBeGreaterThan(TIERS[i - 1].seedBag);
      expect(TIERS[i].energyRegenMs).toBeLessThan(TIERS[i - 1].energyRegenMs);
      expect(TIERS[i].growthBonus).toBeGreaterThanOrEqual(TIERS[i - 1].growthBonus);
    }
  });

  test("nextTier points at the upgrade target", () => {
    expect(nextTier(1)?.id).toBe("farmer");
    expect(nextTier(600_000)?.id).toBe("rancher");
    expect(nextTier(3_000_000)?.id).toBe("landlord");
    expect(nextTier(20_000_000)).toBeNull();
  });

  test("tier growth bonus stacks on top of equipment", () => {
    const tomato = CROPS[0]; // 5000ms
    // landlord 15% bonus, no gear → 5000 * 0.85 = 4250
    expect(effectiveGrowMs(tomato, [], 0.15)).toBe(4250);
    // with full gear (0.55 cap) + 15% tier → 5000 * 0.45 * 0.85 = 1912.5 → 1913
    const all = EQUIPMENT.map((e) => e.id);
    expect(effectiveGrowMs(tomato, all, 0.15)).toBe(1913);
  });

  test("seed bag space respects a tier-raised cap", () => {
    expect(seedBagSpace({ tomato: 10 }, 16)).toBe(6);
    expect(seedBagSpace({ tomato: 40 }, 40)).toBe(0);
  });
});

describe("daily quests", () => {
  test("three quests with positive goals and rewards", () => {
    expect(DAILY_QUESTS.length).toBe(3);
    for (const q of DAILY_QUESTS) {
      expect(q.goal).toBeGreaterThan(0);
      expect(q.reward).toBeGreaterThan(0);
    }
  });

  test("streak bonus grows and caps at day 7", () => {
    expect(streakBonus(1)).toBe(75);
    expect(streakBonus(7)).toBe(225);
    expect(streakBonus(99)).toBe(225);
  });

  test("UTC day key + yesterday detection", () => {
    expect(utcDayKey(Date.UTC(2026, 5, 13, 23, 59))).toBe("2026-06-13");
    expect(isYesterday("2026-06-12", "2026-06-13")).toBe(true);
    expect(isYesterday("2026-06-11", "2026-06-13")).toBe(false);
  });
});
