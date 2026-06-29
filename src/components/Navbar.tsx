import Link from "next/link";
import { WalletButton } from "./WalletButton";
export function Navbar() {
  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-3 sm:gap-3 sm:px-6 sm:py-4">
        <Link href="/" className="flex min-w-0 items-center gap-2 justify-self-start">
          <span className="pixel truncate text-xs text-ink sm:text-base">
            ANSEM&nbsp;<span className="text-sunset-deep">LAND</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-2 justify-self-center md:flex">
          <Link href="/docs" className="pill">
            <span>📚</span> Docs
          </Link>
          <Link href="/how-to-play" className="pill">
            <span>📖</span> How to Play
          </Link>
          <Link href="/leaderboard" className="pill">
            <span>🏆</span> Leaderboard
          </Link>
          <a
            href="https://x.com/ansemlandcc"
            target="_blank"
            rel="noreferrer"
            className="pill"
            aria-label="Follow on X"
          >
            <span>𝕏</span>
          </a>
        </nav>
        <div className="justify-self-end">
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
