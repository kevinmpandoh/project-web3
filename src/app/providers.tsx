"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { SolanaProvider } from "@/components/SolanaProvider";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <SolanaProvider>
        {children}
        <Toaster richColors position="top-right" />
      </SolanaProvider>
    </QueryClientProvider>
  );
}
