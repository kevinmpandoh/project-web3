export const TOKEN_MINT = "FsjVPA2bmBRcjsjC2wsaBTk9H7CuBjnE7XL7K5B8pump";
export const MIN_TOKEN_BALANCE = 1;
// Public mainnet RPC rate-limits; set VITE_RPC_ENDPOINT (Helius/QuickNode)
// in .env for production traffic.
// api.mainnet-beta.solana.com blocks browser traffic (403). Use a public,
// CORS-enabled endpoint by default; override with VITE_RPC_ENDPOINT for prod.
export const RPC_ENDPOINT =
  "https://mainnet.helius-rpc.com/?api-key=7e952c6c-d516-4c0e-9798-1a913a359037";
export const PUMP_FUN_URL = `https://pump.fun/coin/${TOKEN_MINT}`;

export function shortAddress(addr?: string | null) {
  if (!addr) return "";
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}
