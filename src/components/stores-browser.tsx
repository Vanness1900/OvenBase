"use client";

import { useMemo, useState } from "react";
import { useSettings } from "./settings-provider";
import { SearchIcon } from "./icons";

export interface StoreEntry {
  id: string;
  name: string;
  country: "SG" | "PH" | "ID" | "MY";
  city: string;
  role: string;
  contact: string | null;
  url: string | null;
}

const COUNTRIES = [
  { code: "SG", label: "Singapore" },
  { code: "PH", label: "Philippines" },
  { code: "ID", label: "Indonesia" },
  { code: "MY", label: "Malaysia" },
] as const;

export function StoresBrowser({ stores }: { stores: StoreEntry[] }) {
  const { t } = useSettings();
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState<string>("");

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stores.filter((s) => {
      if (country && s.country !== country) return false;
      if (q && !`${s.name} ${s.city} ${s.role}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [stores, query, country]);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
      <h1 className="font-display text-[28px] font-black sm:text-[34px]">{t("stores.title")}</h1>
      <p className="mt-1.5 text-[14px] text-[var(--ob-text-soft)]">
        Official distributors and the shops OvenBase pulls prices from.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        <label className="relative min-w-[220px] flex-1">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--ob-text-faint)]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("stores.searchPlaceholder")}
            className="h-11 w-full rounded-full border border-[var(--ob-line)] bg-[var(--ob-surface)] pl-10 pr-4 text-[14.5px] outline-none focus:border-[var(--ob-accent)]"
          />
        </label>

        <div className="ob-segment overflow-x-auto">
          <button
            type="button"
            onClick={() => setCountry("")}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
              country === "" ? "bg-[var(--ob-surface)] shadow-sm" : "text-[var(--ob-text-soft)]"
            }`}
          >
            {t("stores.allCountries")}
          </button>
          {COUNTRIES.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => setCountry(c.code)}
              className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
                country === c.code ? "bg-[var(--ob-surface)] shadow-sm" : "text-[var(--ob-text-soft)]"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <p className="py-20 text-center text-[14px] text-[var(--ob-text-soft)]">No stores match.</p>
      ) : (
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {list.map((s) => (
            <li key={s.id} className="ob-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-[16px] font-semibold">{s.name}</h2>
                  <p className="mt-1 text-[13px] text-[var(--ob-text-soft)]">{s.city}</p>
                </div>
                <span className="shrink-0 rounded-full bg-[var(--ob-surface-2)] px-2.5 py-1 text-[11.5px] font-semibold">
                  {COUNTRIES.find((c) => c.code === s.country)?.label}
                </span>
              </div>

              <p className="mt-3 text-[12.5px] text-[var(--ob-text-faint)]">{s.role}</p>

              <div className="mt-3 flex flex-wrap gap-2">
                {s.url && (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="rounded-full border border-[var(--ob-line)] px-3 py-1.5 text-[12.5px] font-semibold transition-colors hover:bg-[var(--ob-surface-2)]"
                  >
                    Visit site
                  </a>
                )}
                {s.contact && (
                  <a
                    href={`mailto:${s.contact}`}
                    className="rounded-full border border-[var(--ob-line)] px-3 py-1.5 text-[12.5px] font-semibold transition-colors hover:bg-[var(--ob-surface-2)]"
                  >
                    {s.contact}
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-8 rounded-[var(--ob-radius-sm)] border border-dashed border-[var(--ob-line-strong)] px-4 py-4 text-[12.5px] text-[var(--ob-text-soft)]">
        The official site lists regional distributors rather than a shop directory, so this page starts
        from those. Individual partnered stores need to be added by hand.
      </p>
    </div>
  );
}
