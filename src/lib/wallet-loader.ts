// Shared singleton loader for all Solana wallet-adapter modules.
//
// Why this exists: `SolanaProvider` and `WalletButton` both need to import
// `@solana/wallet-adapter-*` packages, and both must skip the import during
// SSR. If they each lazy-load independently, `WalletButton` can finish
// first and try to render `WalletMultiButton` BEFORE `SolanaProvider`'s
// `WalletProvider` is mounted — `useWallet()` then throws:
//   "You have tried to read 'wallets' on a WalletContext without providing one."
// and the root error boundary shows "This page didn't load".
//
// By funnelling both through this single promise, every consumer resolves
// at the same instant and the provider tree is always present before any
// component tries to read it.

import type { FC, ReactNode } from "react";

export type WalletModules = {
  ConnectionProvider: FC<{ endpoint: string; children: ReactNode }>;
  WalletProvider: FC<{ wallets: unknown[]; autoConnect?: boolean; children: ReactNode }>;
  WalletModalProvider: FC<{ children: ReactNode }>;
  WalletMultiButton: FC;
  useConnection: () => { connection: { getParsedTokenAccountsByOwner: Function } };
  useWallet: () => { publicKey: { toBase58: () => string } | null; connected: boolean };
  PublicKey: new (v: string) => unknown;
  wallets: unknown[];
};

let cached: Promise<WalletModules> | null = null;

export function loadWalletModules(): Promise<WalletModules> {
  if (typeof window === "undefined") {
    // Never load on the server.
    return new Promise(() => {});
  }
  if (cached) return cached;
  cached = (async () => {
    const [reactMod, uiMod, phantomMod, solflareMod, web3Mod] = await Promise.all([
      import("@solana/wallet-adapter-react"),
      import("@solana/wallet-adapter-react-ui"),
      import("@solana/wallet-adapter-phantom"),
      import("@solana/wallet-adapter-solflare"),
      import("@solana/web3.js"),
    ]);
    return {
      ConnectionProvider: reactMod.ConnectionProvider as unknown as WalletModules["ConnectionProvider"],
      WalletProvider: reactMod.WalletProvider as unknown as WalletModules["WalletProvider"],
      WalletModalProvider: uiMod.WalletModalProvider as unknown as WalletModules["WalletModalProvider"],
      WalletMultiButton: uiMod.WalletMultiButton as unknown as WalletModules["WalletMultiButton"],
      useConnection: reactMod.useConnection as unknown as WalletModules["useConnection"],
      useWallet: reactMod.useWallet as unknown as WalletModules["useWallet"],
      PublicKey: web3Mod.PublicKey as unknown as WalletModules["PublicKey"],
      wallets: [
        new phantomMod.PhantomWalletAdapter(),
        new solflareMod.SolflareWalletAdapter(),
      ],
    };
  })();
  return cached;
}
