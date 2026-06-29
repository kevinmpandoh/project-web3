"use client";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";


function Terms() {
  return (
    <div className="relative min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="pixel text-3xl text-ink sm:text-4xl">Terms of Service</h1>
        <p className="mt-2 text-xs text-ink/60">Last updated: June 12, 2026</p>

        <p className="mt-6 text-ink/80 leading-relaxed">
          By using Ansem Land at{" "}
          <a href="https://ansemland.cc" className="text-ocean underline">
            ansemland.cc
          </a>{" "}
          you agree to these terms. If you don't agree, please don't use the game.
        </p>

        <h2 className="pixel mt-10 text-xl text-ink">1. The game</h2>
        <p className="mt-4 text-ink/80 leading-relaxed">
          Ansem Land is a free-to-play, browser-based farming game currently in open beta. Features,
          balance, and game economy may change at any time. The service is provided "as is" without
          warranties of any kind.
        </p>

        <h2 className="pixel mt-10 text-xl text-ink">2. Accounts and wallets</h2>
        <p className="mt-4 text-ink/80 leading-relaxed">
          You play by connecting a Solana wallet. You are fully responsible for keeping your wallet
          and its private keys safe. We will never ask for your seed phrase. If you lose access to
          your wallet, we cannot recover your in-game progress.
        </p>

        <h2 className="pixel mt-10 text-xl text-ink">3. Token disclaimer</h2>
        <p className="mt-4 text-ink/80 leading-relaxed">
          Ansem Land may reference a community token used for cosmetics and in-game events. This
          token is <strong>not an investment</strong>, not a security, and carries no promise of
          financial return. Do not purchase any token expecting profit. Always do your own research
          and only spend what you can afford to lose.
        </p>

        <h2 className="pixel mt-10 text-xl text-ink">4. Acceptable use</h2>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-ink/80">
          <li>No cheating, exploiting bugs, automation, or botting.</li>
          <li>No harassment, hate speech, or illegal content in chat or names.</li>
          <li>No attempts to disrupt the service for other players.</li>
        </ul>
        <p className="mt-4 text-ink/80 leading-relaxed">
          We may suspend access to farms that break these rules.
        </p>

        <h2 className="pixel mt-10 text-xl text-ink">5. In-game items</h2>
        <p className="mt-4 text-ink/80 leading-relaxed">
          Crops, gold, equipment, and similar in-game items have no real-world monetary value and
          are not redeemable for cash. Balances may be adjusted during beta if needed for fairness
          or technical reasons.
        </p>

        <h2 className="pixel mt-10 text-xl text-ink">6. Limitation of liability</h2>
        <p className="mt-4 text-ink/80 leading-relaxed">
          To the maximum extent permitted by law, Ansem Land and its creators are not liable for any
          indirect, incidental, or consequential damages arising from your use of the game,
          including loss of in-game progress, wallet activity, or third-party services.
        </p>

        <h2 className="pixel mt-10 text-xl text-ink">7. Changes</h2>
        <p className="mt-4 text-ink/80 leading-relaxed">
          We may update these terms from time to time. Continued use of the game after changes means
          you accept the updated terms.
        </p>

        <h2 className="pixel mt-10 text-xl text-ink">8. Contact</h2>
        <p className="mt-4 text-ink/80 leading-relaxed">
          Questions about these terms? Reach out on X at{" "}
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
      </section>
      <Footer />
    </div>
  );
}

export default Terms;
