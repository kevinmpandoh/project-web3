import { NextResponse } from "next/server";
import * as handlers from "@/lib/api/game.handlers";

type HandlerName = keyof typeof handlers;

export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  const { action } = await context.params;
  const handler = handlers[action as HandlerName] as ((data?: unknown) => Promise<unknown>) | undefined;

  if (!handler) {
    return NextResponse.json({ error: "Unknown game action" }, { status: 404 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const data = await handler(body.data);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Game API error", action, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Game API error" },
      { status: 400 },
    );
  }
}
