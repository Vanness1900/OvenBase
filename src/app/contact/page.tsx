import { DiscordIcon } from "@/components/icons";

export const metadata = { title: "Contact — OvenBase" };

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-[720px] px-4 py-14 sm:px-6">
      <h1 className="font-display text-[28px] font-black sm:text-[34px]">Contact</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-[var(--ob-text-soft)]">
        Spotted a wrong price, a missing card, or want to help price singles? Get in touch.
      </p>

      <div className="ob-card mt-7 divide-y divide-[var(--ob-line)]">
        <Row label="Discord" value="Fastest way to reach us" href="https://discord.gg/cookierunbraverse" icon />
        <Row label="Email" value="add-your-email@example.com" href={null} />
        <Row label="Price corrections" value="Tell us the card number and what you've seen it sell for" href={null} />
      </div>

      <p className="mt-6 rounded-[var(--ob-radius-sm)] border border-dashed border-[var(--ob-line-strong)] px-4 py-4 text-[12.5px] text-[var(--ob-text-soft)]">
        Placeholder details — swap in your real email, Discord invite and any form you want here.
      </p>
    </div>
  );
}

function Row({
  label,
  value,
  href,
  icon,
}: {
  label: string;
  value: string;
  href: string | null;
  icon?: boolean;
}) {
  const body = (
    <div className="flex items-center gap-3 px-5 py-4">
      {icon && <DiscordIcon className="size-5 shrink-0 text-[var(--ob-text-soft)]" />}
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--ob-text-faint)]">{label}</p>
        <p className="mt-0.5 text-[14.5px]">{value}</p>
      </div>
    </div>
  );

  return href ? (
    <a href={href} target="_blank" rel="noreferrer noopener" className="block transition-colors hover:bg-[var(--ob-surface-2)]">
      {body}
    </a>
  ) : (
    body
  );
}
