"use client";

import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { WalletButton } from "@/components/WalletButton";
import { useTokenGate } from "@/hooks/useTokenGate";
import { CROPS } from "@/lib/game-logic";
import { MIN_TOKEN_BALANCE, PUMP_FUN_URL, shortAddress } from "@/lib/solana-config";
import { CheckCircle2, AlertCircle, Wallet, ArrowDown } from "lucide-react";



function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <SkyBackdrop />
      <Navbar />
      <Hero />
      <HowItWorks />
      <TokenSection />
      <Roadmap />
      <Footer />
    </div>
  );
}

/* ---------- Background ---------- */

function SkyBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute inset-0 bg-[image:var(--gradient-hero)]" />
      {/* warm sun */}
      <div
        className="absolute right-[6%] top-12 h-24 w-24 rounded-full ink-border sm:top-16 sm:h-40 sm:w-40"
        style={{
          background: "radial-gradient(circle at 35% 35%, #ffe9a8, #f3a14a 70%, #b8501e)",
          boxShadow: "0 0 80px 10px rgba(240, 161, 74, 0.35)",
          animation: "sun-pulse 6s ease-in-out infinite",
          opacity: 0.55,
        }}
      />
      {/* wheat sprigs scattered */}
      <div className="pixel-cloud cloud-float left-[6%] top-32" />
      <div
        className="pixel-cloud cloud-float left-[18%] top-64"
        style={{ animationDelay: "-2s", transform: "scale(0.8)" }}
      />
      <div
        className="pixel-cloud cloud-float left-[78%] top-[26rem]"
        style={{ animationDelay: "-4s", transform: "scale(0.9)" }}
      />
      <div
        className="pixel-cloud cloud-float left-[42%] top-[22rem]"
        style={{ animationDelay: "-3s", transform: "scale(0.7)" }}
      />
    </div>
  );
}

/* ---------- Hero ---------- */

function Hero() {
  const { status, balance, address, connected } = useTokenGate();
  return (
    <section className="relative">
      <div className="mx-auto flex max-w-3xl flex-col items-center px-4 pb-10 pt-6 text-center sm:px-6">
        <h1 className="pixel mt-6 text-4xl text-ink sm:text-5xl md:text-6xl">
          ANSEM&nbsp;<span className="text-sunset-deep">LAND</span>
        </h1>
        <p className="pixel mt-3 text-sm text-ocean sm:text-base">Plant · Grow · Prosper</p>

        <p className="mt-6 max-w-xl text-base leading-relaxed text-ink/80 sm:text-lg">
          Claim a field, plant a seed, and grow your farm.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {[
            ["🎁", "DAILY TOP-3 REWARDS"],
            ["✅", "NO DOWNLOAD"],
            ["🌐", "ONE SHARED MAP"],
            ["💬", "LIVE CHAT"],
          ].map(([emo, label]) => (
            <span key={label} className="pill text-xs">
              <span>{emo}</span> {label}
            </span>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center gap-3">
          <Link href="/game" className="chunky-btn chunky-btn-sky text-ink">
            PLAY NOW →
          </Link>
          <p className="mt-1 text-sm text-ink/70">
            Sign in with your Solana wallet to join the town
          </p>
          <ArrowDown className="mt-2 h-5 w-5 animate-bounce text-ink/50" />
        </div>

        <GateBanner status={status} balance={balance} address={address} connected={connected} />
      </div>
    </section>
  );
}

function GateBanner({
  status,
  balance,
  address,
  connected,
}: {
  status: string;
  balance: number;
  address: string | null;
  connected: boolean;
}) {
  return (
    <div className="mt-8 flex w-full max-w-xl flex-wrap items-center gap-3 card-pop p-4 text-left">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-sky-deep text-ink ink-border">
        <Wallet className="h-5 w-5" />
      </div>
      <div className="flex-1 text-sm">
        {!connected && (
          <p className="text-ink/70">
            Sign in with your Solana wallet to join the town and start farming.
          </p>
        )}
        {connected && status === "loading" && <p className="text-ink/70">Checking your balance…</p>}
        {connected && status === "granted" && (
          <p className="flex items-center gap-1.5 font-semibold text-leaf">
            <CheckCircle2 className="h-4 w-4" /> You're in. Balance {balance.toLocaleString()} ·{" "}
            {shortAddress(address)}
          </p>
        )}
        {connected && status === "insufficient" && (
          <p className="flex items-center gap-1.5 text-ink">
            <AlertCircle className="h-4 w-4 text-sunset-deep" /> Your balance is{" "}
            {balance.toLocaleString()}. Learn more about the project token below.
          </p>
        )}
        {connected && status === "error" && (
          <p className="text-destructive">RPC connection dropped. Try a quick refresh.</p>
        )}
      </div>
      <a href={PUMP_FUN_URL} target="_blank" rel="noreferrer" className="pill text-xs">
        🪙 Learn more
      </a>
    </div>
  );
}

/* ---------- How it works ---------- */

function HowItWorks() {
  const steps = [
    {
      emo: "🌱",
      title: "PLANT",
      desc: "Buy seeds at the Seed Shop, then click an empty plot to plant. Start with tomatoes; every level unlocks a bigger, more valuable crop.",
    },
    {
      emo: "⏳",
      title: "GROW & HARVEST",
      desc: "Crops grow in real time, 5 seconds per crop level, from a 5s tomato to a 50s Golden Rice. Harvest when they sparkle, stash everything in your barn.",
    },
    {
      emo: "💰",
      title: "SELL & UPGRADE",
      desc: "Sell the barn for gold. Spend it on sprinklers, fertilizer, and a greenhouse so crops grow up to 55% faster, then expand your field and repeat.",
    },
  ];
  return (
    <section id="how" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <p className="pixel text-xs text-ocean">The loop is simple</p>
        <h2 className="pixel mt-3 text-2xl text-ink sm:text-3xl">ONE GOLDEN FIELD.</h2>
        <p className="mt-4 text-ink/80">
          From tomatoes you can flip in seconds to Golden Rice that takes patience and pays like a
          harvest festival. Level up to unlock bigger crops, invest your gold in equipment, and
          climb the town leaderboard.
        </p>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {steps.map((s) => (
          <div key={s.title} className="card-pop p-6">
            <div className="text-4xl">{s.emo}</div>
            <h3 className="pixel mt-4 text-base text-ink">{s.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-ink/75">{s.desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 text-center">
        <Link href="/docs" className="pill text-xs">
          📚 Read the full docs. Crops, prices, equipment, FAQ
        </Link>
      </div>
    </section>
  );
}

/* ---------- Token Section ---------- */

function TokenSection() {
  return (
    <section id="token" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="card-pop overflow-hidden p-0">
        <div className="grid gap-0 md:grid-cols-[1fr_360px]">
          <div className="p-8 sm:p-10">
            <span className="pill text-xs">
              <span>🪙</span> PROJECT TOKEN
            </span>
            <h2 className="pixel mt-4 text-2xl text-ink sm:text-3xl">A SMALL PART OF THE WORLD</h2>
            <p className="mt-4 max-w-md text-ink/80">
              Ansem Land has a community token used for cosmetics, seasonal events, and town
              features. It is not an investment, not a promise of returns, and not financial advice.
              You can enjoy the game without it. Farm slowly, enjoy the seasons.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={PUMP_FUN_URL} target="_blank" rel="noreferrer" className="chunky-btn">
                🪙 LEARN MORE
              </a>
              <Link href="/game" className="chunky-btn chunky-btn-sky">
                🌱 TRY THE GAME
              </Link>
            </div>
          </div>
          <div className="relative grid place-items-center bg-sky p-8 ink-border md:border-l-2 md:border-t-0 border-t-2">
            <div className="text-7xl boat-bob" aria-hidden>
              🏡
            </div>
            <p className="pixel mt-4 text-xs text-ink/70">FIELD #1</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Roadmap ---------- */

function Roadmap() {
  const phases = [
    {
      q: "PHASE 1",
      t: "First seeds LIVE",
      d: "Open beta: 10 crops, endless levels, shared town, and daily top-3 leaderboard rewards funded by trading fees.",
    },
    {
      q: "PHASE 2",
      t: "Personal plots in town",
      d: "Your farm appears on the world map, visit other players' fields, water their crops, leave a note.",
    },
    {
      q: "PHASE 3",
      t: "Seasons & festivals",
      d: "Weather that changes growth rates, limited seasonal crops, and a harvest festival with town-wide prizes.",
    },
    {
      q: "PHASE 4",
      t: "Marketplace & cosmetics",
      d: "Player-to-player crop trading, farmhouse skins, pets, and custom hats for your player.",
    },
  ];
  return (
    <section id="roadmap" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="text-center">
        <p className="pixel text-xs text-ocean">ROADMAP</p>
        <h2 className="pixel mt-3 text-2xl text-ink sm:text-3xl">FROM SEED TO EMPIRE</h2>
      </div>
      <ol className="mt-10 grid gap-4 md:grid-cols-4">
        {phases.map((p) => (
          <li key={p.q} className="card-pop p-5">
            <span className="pixel text-xs text-sunset-deep">{p.q}</span>
            <h3 className="pixel mt-2 text-sm text-ink">{p.t}</h3>
            <p className="mt-3 text-sm leading-relaxed text-ink/75">{p.d}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default Landing;
