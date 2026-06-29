import { createContext, useContext } from "react";

// Token-gate state lives in a context filled by the GateBridge inside
// SolanaProvider (which lazy-loads all wallet libraries client-side).
// `refresh` re-runs the balance check — used by the retry button when
// the RPC errors out.

export type GateStatus = "idle" | "loading" | "granted" | "insufficient" | "error";

export type GateState = {
  balance: number;
  status: GateStatus;
  address: string | null;
  connected: boolean;
  refresh: () => void;
};

export const defaultGateState: GateState = {
  balance: 0,
  status: "idle",
  address: null,
  connected: false,
  refresh: () => {},
};

export const TokenGateContext = createContext<GateState>(defaultGateState);

export function useTokenGate(): GateState {
  return useContext(TokenGateContext);
}
