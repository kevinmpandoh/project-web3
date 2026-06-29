import { describe, expect, test } from "bun:test";
import {
  MAP_SIZE,
  NPC_ROUTES,
  SPAWN,
  buildMap,
  isWalkable,
  nearFarmland,
  stallKindAt,
} from "./world-map";

const { tiles, objects } = buildMap();

describe("world map", () => {
  test("map is 48x48", () => {
    expect(MAP_SIZE).toBe(48);
    expect(tiles.length).toBe(MAP_SIZE);
    expect(tiles.every((row) => row.length === MAP_SIZE)).toBe(true);
  });

  test("contains all districts", () => {
    const kinds = new Set(tiles.flat());
    for (const k of ["grass", "dirt", "stone", "soil", "water"]) {
      expect(kinds.has(k as never)).toBe(true);
    }
    const objKinds = new Set(objects.map((o) => o.kind));
    for (const k of ["fountain", "house", "stall", "fence", "tree", "sign"]) {
      expect(objKinds.has(k as never)).toBe(true);
    }
  });

  test("spawn point in the plaza is walkable", () => {
    expect(isWalkable(tiles, objects, SPAWN.x, SPAWN.y)).toBe(true);
  });

  test("water and buildings block movement, signs do not", () => {
    expect(isWalkable(tiles, objects, MAP_SIZE - 2, 1)).toBe(false); // lake corner
    const house = objects.find((o) => o.kind === "house")!;
    expect(isWalkable(tiles, objects, house.x, house.y)).toBe(false);
    const sign = objects.find((o) => o.kind === "sign")!;
    expect(isWalkable(tiles, objects, sign.x, sign.y)).toBe(true);
  });

  test("all six farm fields are walkable and flagged as farmland", () => {
    const fieldSpots: [number, number][] = [
      [8, 30], // west, fenced
      [8, 43], // south-west
      [18, 43], // south
      [6, 20], // north-west meadow
      [43, 18], // east, by the lake
      [28, 33], // below the plaza
    ];
    for (const [x, y] of fieldSpots) {
      expect(isWalkable(tiles, objects, x, y)).toBe(true);
      expect(nearFarmland(tiles, x, y)).toBe(true);
      expect(tiles[y][x]).toBe("soil");
    }
    expect(nearFarmland(tiles, SPAWN.x, SPAWN.y)).toBe(false);
  });

  test("stall detection distinguishes seed shop from market", () => {
    expect(stallKindAt(objects, 20, 21)).toBe("seed"); // SEED SHOP at (20,20)
    expect(stallKindAt(objects, 29, 21)).toBe("market"); // MARKET at (29,20)
    expect(stallKindAt(objects, 8, 30)).toBeNull();
  });

  test("NPC waypoints are walkable streets", () => {
    for (const route of NPC_ROUTES) {
      for (const p of route.points) {
        expect(isWalkable(tiles, objects, p.x, p.y)).toBe(true);
      }
    }
  });
});
