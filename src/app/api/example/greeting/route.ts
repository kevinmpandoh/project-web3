import { NextResponse } from "next/server";
import { getServerConfig } from "@/lib/config.server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const name = String(body?.data?.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  const config = getServerConfig();
  return NextResponse.json({ greeting: `Hello, ${name}!`, mode: config.nodeEnv ?? "unknown" });
}
