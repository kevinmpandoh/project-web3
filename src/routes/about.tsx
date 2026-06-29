"use client";

import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";


function About() {
  return (
    <div className="relative min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="pixel text-3xl text-ink sm:text-4xl">About Ansem Land</h1>
        <p className="mt-6 text-ink/80 leading-relaxed">
          Ansem Land is a cozy, browser-based farming game where players plant, grow, and harvest
          crops together on one shared map. It started as a small weekend project and grew into an
          open beta you can play right now, no download, no install, just open the page and farm.
        </p>

        <h2 className="pixel mt-10 text-xl text-ink">Our vision</h2>
        <p className="mt-4 text-ink/80 leading-relaxed">
          We want to bring back the calm, slow joy of pixel farming games, but make them multiplayer
          and a little more alive. Every crop you plant grows in real time, every harvest goes to
          your barn, and every other player you see on the map is a real person. No grind, no
          pressure, just one shared little town to grow with.
        </p>

        <h2 className="pixel mt-10 text-xl text-ink">Who we are</h2>
        <p className="mt-4 text-ink/80 leading-relaxed">
          Ansem Land is built by a tiny independent team of game and web developers. We work in the
          open and listen closely to feedback from our beta players. If you have an idea or want to
          help shape the next season, come say hi on X.
        </p>

        <h2 className="pixel mt-10 text-xl text-ink">Contact</h2>
        <p className="mt-4 text-ink/80 leading-relaxed">
          The fastest way to reach us is on X:{" "}
          <a
            href="https://x.com/ansemlandcc"
            target="_blank"
            rel="noreferrer"
            className="text-ocean underline"
          >
            @ansemlandcc
          </a>
          . For privacy or legal questions, see our{" "}
          <Link href="/privacy" className="text-ocean underline">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link href="/terms" className="text-ocean underline">
            Terms of Service
          </Link>
          .
        </p>
      </section>
      <Footer />
    </div>
  );
}

export default About;
