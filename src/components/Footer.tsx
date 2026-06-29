import Link from "next/link";


export function Footer() {
  return (
    <footer className="mt-20">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 py-10 text-center sm:px-6">
        <div className="flex items-center gap-2">
          <span className="pixel text-xs text-ink">ANSEM&nbsp;LAND</span>
        </div>

        <p className="max-w-md text-sm text-muted-foreground">
          A tiny farming world on Solana. Built slowly, played calmly.&nbsp;
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
          <a
            href="https://x.com/ansemlandcc"
            target="_blank"
            rel="noreferrer"
            className="pill text-xs"
          >
            <span>𝕏</span> X
          </a>
          <Link href="/about" className="pill text-xs">
            <span>👋</span> About
          </Link>
          <Link href="/how-to-play" className="pill text-xs">
            <span>📖</span> How to Play
          </Link>
          <Link href="/leaderboard" className="pill text-xs">
            <span>🏆</span> Leaderboard
          </Link>
          <Link href="/docs" className="pill text-xs">
            <span>📚</span> Docs
          </Link>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
          <Link href="/privacy" className="hover:text-ink">
            Privacy
          </Link>
          <span>·</span>
          <Link href="/terms" className="hover:text-ink">
            Terms
          </Link>
          <span>·</span>
          <a href="mailto:hello@ansemland.cc" className="hover:text-ink">
            hello@ansemland.cc
          </a>
        </div>
        <div className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Ansem Land · Open Beta on Solana
        </div>
      </div>
    </footer>
  );
}
