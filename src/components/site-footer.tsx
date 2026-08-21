"use client";

import Link from "next/link";
import { useSettings } from "./settings-provider";
import { DiscordIcon } from "./icons";
import { DISCORD_URL } from "./site-header";
import type { MessageKey } from "@/lib/i18n";

const LINKS: { href: string; key: MessageKey }[] = [
  { href: "/", key: "nav.home" },
  { href: "/cards", key: "nav.cards" },
  { href: "/decks", key: "nav.decks" },
  { href: "/products", key: "nav.products" },
  { href: "/stores", key: "nav.stores" },
  { href: "/contact", key: "nav.contact" },
];

export function SiteFooter() {
  const { t } = useSettings();

  return (
    <footer className="mt-auto border-t border-[var(--ob-line)] bg-[var(--ob-surface)]">
      <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <div className="font-display text-[17px] font-black">
              Oven<span className="text-[var(--ob-accent)]">Base</span>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--ob-text-soft)]">
              A community price baseline for CookieRun: Braverse. Not affiliated with or endorsed by
              Devsisters Corp. Card images and data belong to their respective owners.
            </p>
            <a
              href={DISCORD_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--ob-line)] px-3.5 py-2 text-[13px] font-semibold transition-colors hover:bg-[var(--ob-surface-2)]"
            >
              <DiscordIcon className="size-[17px]" />
              {t("nav.discord")}
            </a>
          </div>

          <nav className="grid grid-cols-2 gap-x-10 gap-y-2 sm:grid-cols-1">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-[13.5px] text-[var(--ob-text-soft)] transition-colors hover:text-[var(--ob-text)]"
              >
                {t(l.key)}
              </Link>
            ))}
          </nav>
        </div>

        <p className="mt-8 border-t border-[var(--ob-line)] pt-5 text-[12px] text-[var(--ob-text-faint)]">
          © {new Date().getFullYear()} OvenBase — a fan project.
        </p>
      </div>
    </footer>
  );
}
