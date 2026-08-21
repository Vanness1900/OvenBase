"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { FALLBACK_RATES, guessCurrency, type RateTable } from "@/lib/currency";
import { translate, LOCALES, type Locale, type MessageKey } from "@/lib/i18n";
import { usePersistentString } from "@/lib/persistent";
import { CURRENCIES, STORES, type CurrencyCode, type StoreId } from "@/lib/types";

interface Settings {
  locale: Locale;
  setLocale: (l: Locale) => void;
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  store: StoreId;
  setStore: (s: StoreId) => void;
  rates: RateTable;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
}

const SettingsContext = createContext<Settings | null>(null);

const isLocale = (v: string): v is Locale => (LOCALES as readonly string[]).includes(v);
const isCurrency = (v: string): v is CurrencyCode => CURRENCIES.some((c) => c.code === v);
const isStore = (v: string): v is StoreId => STORES.some((s) => s.id === v);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [localeRaw, setLocaleRaw] = usePersistentString("ob:locale", "en");
  const [currencyRaw, setCurrencyRaw] = usePersistentString("ob:currency", "SGD", guessCurrency);
  const [storeRaw, setStoreRaw] = usePersistentString("ob:store", "ovenbase");

  const locale = isLocale(localeRaw) ? localeRaw : "en";
  const currency = isCurrency(currencyRaw) ? currencyRaw : "SGD";
  const store = isStore(storeRaw) ? storeRaw : "ovenbase";

  const [rates, setRates] = useState<RateTable>(FALLBACK_RATES);

  // Fetching rates is a genuine external subscription, so an effect is right
  // here -- setState happens in the async callback, not the effect body.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/rates")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d?.rates) setRates(d.rates as RateTable);
      })
      .catch(() => {
        /* keep the committed snapshot */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setLocale = useCallback(
    (l: Locale) => {
      setLocaleRaw(l);
      document.documentElement.lang = l;
    },
    [setLocaleRaw],
  );

  const setCurrency = useCallback((c: CurrencyCode) => setCurrencyRaw(c), [setCurrencyRaw]);
  const setStore = useCallback((s: StoreId) => setStoreRaw(s), [setStoreRaw]);

  const t = useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, currency, setCurrency, store, setStore, rates, t }),
    [locale, setLocale, currency, setCurrency, store, setStore, rates, t],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): Settings {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside <SettingsProvider>");
  return ctx;
}
