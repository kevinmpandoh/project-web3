"use client";

type ServerFnArgs<T = any> = { data?: T };

async function callGameApi(action: string, data?: any): Promise<any> {
  const response = await fetch(`/api/game/${action}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ data }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error ?? `Game API request failed: ${action}`);
  }
  return payload.data;
}

export const syncPlayer = (args: ServerFnArgs) => callGameApi("syncPlayer", args.data);
export const fetchPlayer = (args: ServerFnArgs) => callGameApi("fetchPlayer", args.data);
export const getLeaderboard = (args?: ServerFnArgs) => callGameApi("getLeaderboard", args?.data);
export const getRewardsStatus = () => callGameApi("getRewardsStatus");
export const getChatMessages = () => callGameApi("getChatMessages");
export const sendChatMessage = (args: ServerFnArgs) => callGameApi("sendChatMessage", args.data);
export const logFishCatch = (args: ServerFnArgs) => callGameApi("logFishCatch", args.data);
export const getRecentCatches = () => callGameApi("getRecentCatches");
export const pingWorld = (args: ServerFnArgs) => callGameApi("pingWorld", args.data);
export const getWorldPlots = () => callGameApi("getWorldPlots");
export const plantWorldPlot = (args: ServerFnArgs) => callGameApi("plantWorldPlot", args.data);
export const harvestWorldPlot = (args: ServerFnArgs) => callGameApi("harvestWorldPlot", args.data);
