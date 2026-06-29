"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
  type ComponentType,
} from "react";
import { TokenGateContext, defaultGateState, type GateState } from "@/hooks/useTokenGate";
import { loadWalletModules } from "@/lib/wallet-loader";

// Buffer global is provided by vite-plugin-node-polyfills on the client.
// All wallet libraries are lazy-loaded client-side only so SSR never
// touches them. Loader is shared with WalletButton so both finish at the
// same instant — otherwise WalletButton can render WalletMultiButton
// before WalletProvider mounts and throw "WalletContext without provider".

const SolanaWalletReadyContext = createContext(false);

export function useSolanaWalletReady() {
  return useContext(SolanaWalletReadyContext);
}

export function SolanaProvider({ children }: { children: ReactNode }) {
  const [Inner, setInner] = useState<ComponentType<{ children: ReactNode }> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    (async () => {
      try {
        const mods = await loadWalletModules();
        const cfg = await import("@/lib/solana-config");
        if (cancelled) return;
        const {
          ConnectionProvider,
          WalletProvider,
          WalletModalProvider,
          useConnection,
          useWallet,
          PublicKey,
          wallets,
        } = mods;

      function GateBridge({ children }: { children: ReactNode }) {
        const { connection } = useConnection();
        const { publicKey, connected } = useWallet();
        const [attempt, setAttempt] = useState(0);
        const refresh = useCallback(() => setAttempt((n) => n + 1), []);
        const [state, setState] = useState<GateState>({ ...defaultGateState, refresh });

        useEffect(() => {
          if (!connected || !publicKey) {
            setState({ balance: 0, status: "idle", address: null, connected: false, refresh });
            return;
          }
          let cancel = false;
          setState((s) => ({
            ...s,
            status: "loading",
            connected: true,
            address: publicKey.toBase58(),
            refresh,
          }));
          (async () => {
            try {
              const mint = new (PublicKey as unknown as new (v: string) => unknown)(cfg.TOKEN_MINT);
              const resp = await (
                connection as unknown as {
                  getParsedTokenAccountsByOwner: (
                    owner: unknown,
                    f: { mint: unknown },
                  ) => Promise<{ value: Array<{ account: { data: { parsed: { info: { tokenAmount?: { uiAmount?: number | null } } } } } }> }>;
                }
              ).getParsedTokenAccountsByOwner(publicKey, { mint });
              let total = 0;
              for (const acc of resp.value) {
                const info = acc.account.data.parsed.info;
                total += Number(info.tokenAmount?.uiAmount ?? 0);
              }
              if (cancel) return;
              setState({
                balance: total,
                status: total >= cfg.MIN_TOKEN_BALANCE ? "granted" : "insufficient",
                address: publicKey.toBase58(),
                connected: true,
                refresh,
              });
            } catch (e) {
              console.error("token gate error", e);
              if (!cancel) setState((s) => ({ ...s, status: "error" }));
            }
          })();
          return () => {
            cancel = true;
          };
        }, [connection, publicKey, connected, attempt, refresh]);

        return <TokenGateContext.Provider value={state}>{children}</TokenGateContext.Provider>;
      }

      const Comp: ComponentType<{ children: ReactNode }> = ({ children }) => {
        const CP = ConnectionProvider as unknown as ComponentType<{
          endpoint: string;
          children: ReactNode;
        }>;
        const WP = WalletProvider as unknown as ComponentType<{
          wallets: unknown[];
          autoConnect?: boolean;
          children: ReactNode;
        }>;
        const MP = WalletModalProvider as unknown as ComponentType<{ children: ReactNode }>;
        return (
          <CP endpoint={cfg.RPC_ENDPOINT}>
            <WP wallets={wallets} autoConnect>
              <MP>
                <GateBridge>{children}</GateBridge>
              </MP>
            </WP>
          </CP>
        );
      };
        setInner(() => Comp);
      } catch (error) {
        if (!cancelled) console.warn("Solana wallet modules unavailable", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!Inner) {
    return <SolanaWalletReadyContext.Provider value={false}>{children}</SolanaWalletReadyContext.Provider>;
  }
  return (
    <SolanaWalletReadyContext.Provider value={true}>
      <Inner>{children}</Inner>
    </SolanaWalletReadyContext.Provider>
  );
}
