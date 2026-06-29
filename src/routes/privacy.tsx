"use client";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";


function Privacy() {
  return (
    <div className="relative min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 prose-sm">
        <h1 className="pixel text-3xl text-ink sm:text-4xl">Privacy Policy</h1>
        <p className="mt-2 text-xs text-ink/60">Last updated: June 12, 2026</p>

        <p className="mt-6 text-ink/80 leading-relaxed">
          This Privacy Policy explains what information Ansem Land ("we", "the game") collects when
          you visit{" "}
          <a href="https://ansemland.cc" className="text-ocean underline">
            ansemland.cc
          </a>{" "}
          and how we use it. Our goal is to collect as little as possible.
        </p>

        <h2 className="pixel mt-10 text-xl text-ink">What we collect</h2>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-ink/80">
          <li>
            <strong>Wallet address.</strong> When you connect a Solana wallet, your public address
            is used to identify your in-game farm. We never see, store, or have access to your
            private keys or seed phrase.
          </li>
          <li>
            <strong>Game state.</strong> Crops, gold, barn inventory, equipment, level, and chat
            messages you send are stored so your farm persists across sessions.
          </li>
          <li>
            <strong>Basic technical data.</strong> Standard server logs (IP address, browser type,
            timestamps) used to keep the service running and prevent abuse.
          </li>
        </ul>

        <h2 className="pixel mt-10 text-xl text-ink">What we don't collect</h2>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-ink/80">
          <li>We do not ask for your name, email, or phone number.</li>
          <li>We do not access your wallet's private keys or sign anything you don't approve.</li>
          <li>We do not sell or rent your data to third parties.</li>
        </ul>

        <h2 className="pixel mt-10 text-xl text-ink">Third-party services</h2>
        <p className="mt-4 text-ink/80 leading-relaxed">
          To read your on-chain token balance, the game connects to public Solana RPC providers.
          Your wallet address may be visible to those providers as part of normal network requests.
          We do not control their privacy practices.
        </p>

        <h2 className="pixel mt-10 text-xl text-ink">Cookies</h2>
        <p className="mt-4 text-ink/80 leading-relaxed">
          We use a minimal set of cookies and local storage entries strictly required to keep you
          signed in and remember your game preferences. We do not use advertising cookies.
        </p>

        <h2 className="pixel mt-10 text-xl text-ink">Your rights</h2>
        <p className="mt-4 text-ink/80 leading-relaxed">
          Because we identify accounts only by wallet address, simply disconnecting your wallet ends
          our active relationship with you. You can request deletion of your game data by contacting
          us on X at{" "}
          <a
            href="https://x.com/ansemlandcc"
            target="_blank"
            rel="noreferrer"
            className="text-ocean underline"
          >
            @ansemlandcc
          </a>
          .
        </p>

        <h2 className="pixel mt-10 text-xl text-ink">Changes</h2>
        <p className="mt-4 text-ink/80 leading-relaxed">
          We may update this policy from time to time. The "Last updated" date above will change
          when we do.
        </p>
      </section>
      <Footer />
    </div>
  );
}

export default Privacy;
