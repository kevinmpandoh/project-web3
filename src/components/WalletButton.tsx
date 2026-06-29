"use client";

import { useEffect, useState, type ComponentType } from "react";
import { useSolanaWalletReady } from "@/components/SolanaProvider";
import { loadWalletModules } from "@/lib/wallet-loader";

// Wait for the SAME loader SolanaProvider uses, so WalletMultiButton is
// never rendered before WalletProvider is mounted. Rendering it earlier
// throws "WalletContext without provider" and trips the root error
// boundary ("This page didn't load").

export function WalletButton() {
  const ready = useSolanaWalletReady();
  const [Btn, setBtn] = useState<ComponentType | null>(null);
  useEffect(() => {
    if (typeof window === "undefined" || !ready) return;
    let cancelled = false;
    loadWalletModules()
      .then((m) => {
        if (cancelled) return;
        setBtn(() => m.WalletMultiButton as unknown as ComponentType);
      })
      .catch((error) => console.warn("Wallet button unavailable", error));
    return () => {
      cancelled = true;
    };
  }, [ready]);
  if (!ready || !Btn) {
    return (
      <div
        className="h-[38px] w-28 animate-pulse rounded-xl bg-secondary sm:h-11 sm:w-36"
        aria-hidden
      />
    );
  }
  return <Btn />;
}
