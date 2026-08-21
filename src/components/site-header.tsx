"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSettings } from "./settings-provider";
import { DiscordIcon } from "./icons";
import { LOCALES, LOCALE_LABELS, LOCALE_SHORT, type Locale } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";

const NAV: { href: string; key: MessageKey }[] = [
  { href: "/", key: "nav.home" },
  { href: "/cards", key: "nav.cards" },
  { href: "/decks", key: "nav.decks" },
  { href: "/products", key: "nav.products" },
  { href: "/stores", key: "nav.stores" },
  { href: "/contact", key: "nav.contact" },
];

export const DISCORD_URL = "https://discord.gg/cookierunbraverse";

export function SiteHeader() {
  const { t, locale, setLocale } = useSettings();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="ob-blur sticky top-0 z-50 border-b border-[var(--ob-line)]">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="font-display shrink-0 text-[17px] font-black tracking-tight">
          Oven<span className="text-[var(--ob-accent)]">Base</span>
        </Link>

        <nav className="ml-2 hidden items-center gap-0.5 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`rounded-full px-3 py-1.5 text-[13.5px] transition-colors ${
                isActive(item.href)
                  ? "bg-[var(--ob-surface-2)] font-semibold text-[var(--ob-text)]"
                  : "text-[var(--ob-text-soft)] hover:text-[var(--ob-text)]"
              }`}
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <LanguagePicker locale={locale} onChange={setLocale} label={t("common.language")} />

          <a
            href={DISCORD_URL}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={t("nav.discord")}
            title={t("nav.discord")}
            className="grid size-9 place-items-center rounded-full text-[var(--ob-text-soft)] transition-colors hover:bg-[var(--ob-surface-2)] hover:text-[var(--ob-text)]"
          >
            <DiscordIcon className="size-[18px]" />
          </a>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label={t("cards.filters")}
            className="grid size-9 place-items-center rounded-full text-[var(--ob-text-soft)] transition-colors hover:bg-[var(--ob-surface-2)] md:hidden"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
              {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="border-t border-[var(--ob-line)] px-4 pb-3 pt-2 md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className={`block rounded-[var(--ob-radius-sm)] px-3 py-2.5 text-[15px] ${
                isActive(item.href)
                  ? "bg-[var(--ob-surface-2)] font-semibold"
                  : "text-[var(--ob-text-soft)]"
              }`}
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

function LanguagePicker({
  locale,
  onChange,
  label,
}: {
  locale: Locale;
  onChange: (l: Locale) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        className="flex h-9 items-center gap-1 rounded-full px-2.5 text-[13px] font-semibold text-[var(--ob-text-soft)] transition-colors hover:bg-[var(--ob-surface-2)] hover:text-[var(--ob-text)]"
      >
        <svg viewBox="0 0 24 24" className="size-[17px]" fill="none" stroke="currentColor" strokeWidth="1.7">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.4 2.4 3.6 5.6 3.6 9s-1.2 6.6-3.6 9c-2.4-2.4-3.6-5.6-3.6-9S9.6 5.4 12 3z" />
        </svg>
        {LOCALE_SHORT[locale]}
      </button>

      {open && (
        <div
          role="listbox"
          className="ob-card absolute right-0 top-11 z-50 min-w-[180px] overflow-hidden p-1"
        >
          {LOCALES.map((l) => (
            <button
              key={l}
              type="button"
              role="option"
              aria-selected={l === locale}
              onClick={() => {
                onChange(l);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-[10px] px-3 py-2 text-left text-[13.5px] transition-colors hover:bg-[var(--ob-surface-2)] ${
                l === locale ? "font-semibold" : "text-[var(--ob-text-soft)]"
              }`}
            >
              {LOCALE_LABELS[l]}
              {l === locale && (
                <svg viewBox="0 0 24 24" className="size-4 text-[var(--ob-accent)]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12.5l5 5L20 6.5" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
