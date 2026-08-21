"use client";

import { useSettings } from "./settings-provider";
import {
  COLOR_OPTIONS,
  COST_COLOR_OPTIONS,
  DAMAGE_OPTIONS,
  EXCLUSIVE_OPTIONS,
  GROUP_OPTIONS,
  HP_OPTIONS,
  HP_PLUS_OPTIONS,
  KEYWORD_OPTIONS,
  LEVEL_OPTIONS,
  RARITY_OPTIONS,
  TYPE_OPTIONS,
  hpPlusEnabled,
  levelHpEnabled,
  type CardFilters,
} from "@/lib/filters";
import type { CardType } from "@/lib/types";
import { formatCount } from "@/lib/format";

const COLOR_SWATCH: Record<string, string> = {
  RED: "var(--ob-red)",
  YELLOW: "var(--ob-yellow)",
  GREEN: "var(--ob-green)",
  BLUE: "var(--ob-blue)",
  PURPLE: "var(--ob-purple)",
  BLACK: "var(--ob-black)",
  PURE: "var(--ob-pure)",
  COLORLESS: "var(--ob-colorless)",
};

interface Props {
  filters: CardFilters;
  update: (patch: Partial<CardFilters>) => void;
  reset: () => void;
  products: string[];
  maxPricePHP: number;
}

export function FilterPanel({ filters, update, reset, products, maxPricePHP }: Props) {
  const { t } = useSettings();

  const levelHpOn = levelHpEnabled(filters.types);
  const hpPlusOn = hpPlusEnabled(filters.types);

  const toggle = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={reset}
        className="w-full rounded-full border border-[var(--ob-line-strong)] py-2.5 text-[13.5px] font-semibold transition-colors hover:bg-[var(--ob-surface-2)]"
      >
        {t("cards.resetFilters")}
      </button>

      <Group label={t("filter.product")}>
        <div className="ob-scroll max-h-52 space-y-1 overflow-y-auto pr-1">
          {products.map((p) => (
            <CheckRow
              key={p}
              label={p}
              checked={filters.products.includes(p)}
              onChange={() => update({ products: toggle(filters.products, p) })}
            />
          ))}
        </div>
      </Group>

      <Group label={t("filter.type")}>
        <Chips
          options={TYPE_OPTIONS.map((v) => ({ value: v, label: titleCase(v) }))}
          selected={filters.types}
          onToggle={(v) => update({ types: toggle(filters.types, v as CardType) })}
        />
      </Group>

      <Group label={t("filter.color")}>
        <Chips
          options={COLOR_OPTIONS.map((v) => ({ value: v, label: titleCase(v), swatch: COLOR_SWATCH[v] }))}
          selected={filters.colors}
          onToggle={(v) => update({ colors: toggle(filters.colors, v) })}
        />
      </Group>

      <Group label={t("filter.costColor")}>
        <Chips
          options={COST_COLOR_OPTIONS.map((v) => ({ value: v, label: titleCase(v), swatch: COLOR_SWATCH[v] }))}
          selected={filters.costColors}
          onToggle={(v) => update({ costColors: toggle(filters.costColors, v) })}
        />
      </Group>

      <Group label={t("filter.level")} disabled={!levelHpOn} note={!levelHpOn ? t("filter.lockedToCookie") : undefined}>
        <Chips
          options={LEVEL_OPTIONS.map((v) => ({ value: String(v), label: String(v) }))}
          selected={filters.levels.map(String)}
          disabled={!levelHpOn}
          onToggle={(v) => update({ levels: toggle(filters.levels, Number(v)) })}
        />
      </Group>

      <Group label={t("filter.hp")} disabled={!levelHpOn} note={!levelHpOn ? t("filter.lockedToCookie") : undefined}>
        <Chips
          options={HP_OPTIONS.map((v) => ({ value: String(v), label: String(v) }))}
          selected={filters.hp.map(String)}
          disabled={!levelHpOn}
          onToggle={(v) => update({ hp: toggle(filters.hp, Number(v)) })}
        />
        <div className="mt-2">
          <p className="mb-1.5 text-[11.5px] font-medium text-[var(--ob-text-faint)]">
            {hpPlusOn ? "Extra modifiers" : t("filter.lockedToExtra")}
          </p>
          <Chips
            options={HP_PLUS_OPTIONS.map((v) => ({ value: String(v), label: `+${v}` }))}
            selected={filters.hpPlus.map(String)}
            disabled={!hpPlusOn}
            onToggle={(v) => update({ hpPlus: toggle(filters.hpPlus, Number(v)) })}
          />
        </div>
      </Group>

      <Group label={t("filter.damage")}>
        <Chips
          options={DAMAGE_OPTIONS.map((v) => ({ value: String(v), label: String(v) }))}
          selected={filters.damage.map(String)}
          onToggle={(v) => update({ damage: toggle(filters.damage, Number(v)) })}
        />
      </Group>

      <Group label={t("filter.keywords")}>
        <Chips
          options={KEYWORD_OPTIONS.map((v) => ({ value: v, label: v }))}
          selected={filters.keywords}
          onToggle={(v) => update({ keywords: toggle(filters.keywords, v) })}
        />
      </Group>

      <Group label={t("filter.rarity")}>
        <Chips
          options={RARITY_OPTIONS.map((v) => ({ value: v, label: v }))}
          selected={filters.rarities}
          onToggle={(v) => update({ rarities: toggle(filters.rarities, v) })}
        />
      </Group>

      <Group label={t("filter.groups")}>
        <Chips
          options={GROUP_OPTIONS.map((v) => ({ value: v, label: titleCase(v) }))}
          selected={filters.groups}
          onToggle={(v) => update({ groups: toggle(filters.groups, v) })}
        />
      </Group>

      <Group
        label={t("filter.exclusive")}
        note="Cookie Party has no source data — nothing records it."
      >
        <Chips
          options={EXCLUSIVE_OPTIONS.map((o) => ({
            value: o.key,
            label: o.label,
            unavailable: o.unavailable,
          }))}
          selected={filters.exclusive}
          onToggle={(v) => update({ exclusive: toggle(filters.exclusive, v) })}
        />
      </Group>

      <Group label={t("filter.priceRange")}>
        <div className="flex items-center gap-2">
          <NumberInput
            placeholder={t("filter.min")}
            value={filters.priceMin}
            onChange={(v) => update({ priceMin: v })}
          />
          <span className="text-[var(--ob-text-faint)]">–</span>
          <NumberInput
            placeholder={t("filter.max")}
            value={filters.priceMax}
            onChange={(v) => update({ priceMax: v })}
          />
        </div>
        <p className="mt-1.5 text-[11.5px] text-[var(--ob-text-faint)]">
          In PHP, the source currency. Highest tracked: ₱{formatCount(maxPricePHP)}
        </p>
      </Group>

      <Group label="Show only">
        <div className="space-y-1">
          <SwitchRow
            label={t("filter.hideDuplicates")}
            checked={filters.hideDuplicates}
            onChange={(v) => update({ hideDuplicates: v })}
          />
          <SwitchRow
            label={t("filter.showRestricted")}
            checked={filters.restrictedOnly}
            onChange={(v) => update({ restrictedOnly: v, bannedOnly: v ? false : filters.bannedOnly })}
          />
          <SwitchRow
            label={t("filter.showBanned")}
            checked={filters.bannedOnly}
            onChange={(v) => update({ bannedOnly: v, restrictedOnly: v ? false : filters.restrictedOnly })}
          />
        </div>
      </Group>
    </div>
  );
}

/* ------------------------------------------------------------------ pieces */

function Group({
  label,
  children,
  disabled,
  note,
}: {
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
  note?: string;
}) {
  return (
    <section className={disabled ? "opacity-45" : undefined}>
      <h3 className="mb-2 text-[12px] font-bold uppercase tracking-[0.06em] text-[var(--ob-text-faint)]">
        {label}
      </h3>
      {children}
      {note && <p className="mt-1.5 text-[11.5px] italic text-[var(--ob-text-faint)]">{note}</p>}
    </section>
  );
}

function Chips({
  options,
  selected,
  onToggle,
  disabled,
}: {
  options: { value: string; label: string; swatch?: string; unavailable?: boolean }[];
  selected: string[];
  onToggle: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = selected.includes(o.value);
        const off = disabled || o.unavailable;
        return (
          <button
            key={o.value}
            type="button"
            disabled={off}
            aria-pressed={on}
            title={o.unavailable ? "No source data for this category" : undefined}
            onClick={() => onToggle(o.value)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[12.5px] transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
              on
                ? "border-transparent bg-[var(--ob-accent)] font-semibold text-[var(--ob-accent-ink)]"
                : "border-[var(--ob-line)] hover:bg-[var(--ob-surface-2)]"
            }`}
          >
            {o.swatch && (
              <span
                className="size-2.5 rounded-full ring-1 ring-inset ring-black/10"
                style={{ background: o.swatch }}
              />
            )}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded-[10px] px-1.5 py-1.5 text-[12.5px] leading-snug transition-colors hover:bg-[var(--ob-surface-2)]">
      <input type="checkbox" checked={checked} onChange={onChange} className="mt-0.5 accent-[var(--ob-accent)]" />
      <span className={checked ? "font-semibold" : "text-[var(--ob-text-soft)]"}>{label}</span>
    </label>
  );
}

function SwitchRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-1.5 text-[13px]">
      <span className={checked ? "font-semibold" : "text-[var(--ob-text-soft)]"}>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-[26px] w-[44px] shrink-0 rounded-full transition-colors ${
          checked ? "bg-[var(--ob-accent)]" : "bg-[var(--ob-line-strong)]"
        }`}
      >
        <span
          className={`absolute top-[2px] size-[22px] rounded-full bg-white shadow transition-all ${
            checked ? "left-[20px]" : "left-[2px]"
          }`}
        />
      </button>
    </label>
  );
}

function NumberInput({
  value,
  onChange,
  placeholder,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder: string;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      min={0}
      placeholder={placeholder}
      value={value ?? ""}
      onChange={(e) => {
        const raw = e.target.value.trim();
        onChange(raw === "" ? null : Number(raw));
      }}
      className="h-9 w-full min-w-0 rounded-[10px] border border-[var(--ob-line)] bg-[var(--ob-surface)] px-2.5 text-[13px] outline-none focus:border-[var(--ob-accent)]"
    />
  );
}

function titleCase(s: string) {
  return s.charAt(0) + s.slice(1).toLowerCase();
}
