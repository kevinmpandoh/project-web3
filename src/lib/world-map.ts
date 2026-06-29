// The Ansem Land town map. Pure data + helpers shared by the canvas
// renderer and tests. Coordinates are tile units.

export const MAP_SIZE = 48;

export type TileKind =
  | "grass"
  | "grass2" // mowed/alt grass for variety
  | "dirt" // paths
  | "stone" // plaza
  | "soil" // tilled farm field
  | "water";

export type WorldObject = {
  kind:
    | "house"
    | "bighouse"
    | "tree"
    | "rock"
    | "stall"
    | "fountain"
    | "fence"
    | "sign"
    | "crate"
    | "well";
  x: number;
  y: number;
  label?: string;
};

const W = MAP_SIZE;

// Deterministic pseudo-random so the town is identical for everyone.
function rand(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function stampRect(
  tiles: TileKind[][],
  kind: TileKind,
  x0: number,
  y0: number,
  w: number,
  h: number,
) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      if (tiles[y]?.[x] !== undefined) tiles[y][x] = kind;
    }
  }
}

export function buildMap(): { tiles: TileKind[][]; objects: WorldObject[] } {
  const tiles: TileKind[][] = [];
  for (let y = 0; y < W; y++) {
    const row: TileKind[] = [];
    for (let x = 0; x < W; x++) {
      row.push(rand(x, y) > 0.82 ? "grass2" : "grass");
    }
    tiles.push(row);
  }

  // Lake in the north-east corner (like the reference shot).
  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      if (x + (W - y) > W + 30) tiles[y][x] = "water";
    }
  }

  // Dirt street grid.
  for (const gy of [10, 24, 38]) stampRect(tiles, "dirt", 2, gy, W - 4, 2);
  for (const gx of [10, 24, 38]) stampRect(tiles, "dirt", gx, 2, 2, W - 4);

  // Central plaza with fountain.
  stampRect(tiles, "stone", 19, 19, 12, 12);

  // Farm fields — six of them so plenty of players can plant at once.
  stampRect(tiles, "soil", 5, 28, 8, 6); // west, fenced
  stampRect(tiles, "soil", 5, 41, 8, 5); // south-west
  stampRect(tiles, "soil", 15, 41, 7, 5); // south
  stampRect(tiles, "soil", 5, 18, 4, 5); // north-west meadow
  stampRect(tiles, "soil", 41, 17, 5, 4); // east, by the lake
  stampRect(tiles, "soil", 26, 32, 6, 4); // below the plaza

  // Orchard clearing (north-west) keeps its grass.

  const objects: WorldObject[] = [
    // plaza
    { kind: "fountain", x: 24, y: 24 },
    { kind: "stall", x: 20, y: 20, label: "SEED SHOP" },
    { kind: "stall", x: 29, y: 20, label: "MARKET" },
    { kind: "sign", x: 21, y: 29, label: "ANSEM LAND" },
    { kind: "well", x: 28, y: 28 },

    // housing district (north-west & north-centre)
    { kind: "bighouse", x: 5, y: 5 },
    { kind: "house", x: 14, y: 5 },
    { kind: "house", x: 19, y: 7 },
    { kind: "house", x: 28, y: 5 },
    { kind: "bighouse", x: 33, y: 7 },
    { kind: "house", x: 5, y: 14 },
    { kind: "house", x: 14, y: 14 },
    { kind: "house", x: 28, y: 14 },
    { kind: "house", x: 33, y: 14 },

    // east village
    { kind: "house", x: 42, y: 28 },
    { kind: "house", x: 42, y: 33 },
    { kind: "bighouse", x: 33, y: 42 },
    { kind: "house", x: 28, y: 44 },

    // farm district props
    { kind: "crate", x: 14, y: 29 },
    { kind: "crate", x: 14, y: 31 },
    { kind: "sign", x: 4, y: 27, label: "FARMLAND" },
    { kind: "well", x: 14, y: 34 },
    { kind: "sign", x: 4, y: 17, label: "FARMLAND" },
    { kind: "sign", x: 40, y: 16, label: "FARMLAND" },
    { kind: "sign", x: 25, y: 31, label: "FARMLAND" },
  ];

  // Fences around the big farm field.
  for (let x = 4; x <= 13; x++) {
    objects.push({ kind: "fence", x, y: 27 });
    objects.push({ kind: "fence", x, y: 34 });
  }
  for (let y = 28; y <= 33; y++) {
    objects.push({ kind: "fence", x: 4, y });
    objects.push({ kind: "fence", x: 13, y });
  }
  // Gate: remove two fence pieces on the east side.
  const gate = objects.findIndex((o) => o.kind === "fence" && o.x === 13 && o.y === 30);
  if (gate >= 0) objects.splice(gate, 1);
  const gate2 = objects.findIndex((o) => o.kind === "fence" && o.x === 13 && o.y === 31);
  if (gate2 >= 0) objects.splice(gate2, 1);

  // Scatter trees & rocks on free grass, deterministically.
  for (let y = 3; y < W - 3; y++) {
    for (let x = 3; x < W - 3; x++) {
      const t = tiles[y][x];
      if (t !== "grass" && t !== "grass2") continue;
      if (objects.some((o) => Math.abs(o.x - x) <= 1 && Math.abs(o.y - y) <= 1)) continue;
      const r = rand(x * 3 + 7, y * 5 + 1);
      if (r > 0.965) objects.push({ kind: "tree", x, y });
      else if (r < 0.012) objects.push({ kind: "rock", x, y });
    }
  }

  return { tiles, objects };
}

const WALKABLE: Record<TileKind, boolean> = {
  grass: true,
  grass2: true,
  dirt: true,
  stone: true,
  soil: true,
  water: false,
};

const BLOCKING: Record<WorldObject["kind"], boolean> = {
  house: true,
  bighouse: true,
  tree: true,
  rock: false,
  stall: true,
  fountain: true,
  fence: true,
  sign: false,
  crate: true,
  well: true,
};

export function isWalkable(
  tiles: TileKind[][],
  objects: WorldObject[],
  x: number,
  y: number,
): boolean {
  const tx = Math.round(x);
  const ty = Math.round(y);
  const tile = tiles[ty]?.[tx];
  if (!tile || !WALKABLE[tile]) return false;
  return !objects.some((o) => BLOCKING[o.kind] && o.x === tx && o.y === ty);
}

/** Standing on or next to tilled soil — farming actions allowed. */
export function nearFarmland(tiles: TileKind[][], x: number, y: number): boolean {
  const tx = Math.round(x);
  const ty = Math.round(y);
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (tiles[ty + dy]?.[tx + dx] === "soil") return true;
    }
  }
  return false;
}

export type StallKind = "seed" | "market";

/** Which stall (if any) the player is standing next to. */
export function stallKindAt(objects: WorldObject[], x: number, y: number): StallKind | null {
  const tx = Math.round(x);
  const ty = Math.round(y);
  const stall = objects.find(
    (o) => o.kind === "stall" && Math.abs(o.x - tx) <= 2 && Math.abs(o.y - ty) <= 2,
  );
  if (!stall) return null;
  return stall.label === "MARKET" ? "market" : "seed";
}

/** Town plaza — where new players appear. */
export const SPAWN = { x: 24, y: 27 };

/** Waypoint loops for ambient villager NPCs (on streets). */
export const NPC_ROUTES: { name: string; points: { x: number; y: number }[] }[] = [
  {
    name: "Elon",
    points: [
      { x: 11, y: 25 },
      { x: 11, y: 31 },
      { x: 8, y: 31 },
      { x: 8, y: 25 },
    ],
  },
  {
    name: "Kim",
    points: [
      { x: 25, y: 11 },
      { x: 36, y: 11 },
      { x: 36, y: 24 },
      { x: 25, y: 24 },
    ],
  },
  {
    name: "Adam",
    points: [
      { x: 25, y: 32 },
      { x: 25, y: 39 },
      { x: 36, y: 39 },
      { x: 36, y: 32 },
    ],
  },
];
