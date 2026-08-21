"use client";

import type { JSX } from "react";

/**
 * The official catalog stores rules text with inline markup:
 *   【Activate】     keyword badge
 *   <{R}{R}{N}>     an attack / ability cost, one pip per symbol
 *   {da} 3          damage icon followed by a number
 *   {sk}            the skill icon that prefixes skill names
 * Rendering these as plain text loses most of the card's meaning, so we parse
 * them into small inline elements instead.
 */

const PIP_COLOR: Record<string, string> = {
  R: "var(--ob-red)",
  Y: "var(--ob-yellow)",
  G: "var(--ob-green)",
  B: "var(--ob-blue)",
  P: "var(--ob-purple)",
  K: "var(--ob-black)",
  N: "var(--ob-colorless)",
};

const PIP_TITLE: Record<string, string> = {
  R: "Red",
  Y: "Yellow",
  G: "Green",
  B: "Blue",
  P: "Purple",
  K: "Black",
  N: "Pure",
};

export function CostPips({ symbols }: { symbols: string[] }) {
  if (!symbols.length) return null;
  return (
    // Evenly spaced instead of overlapping, so a run of pips fills the
    // < > brackets the way it reads on the printed card.
    <span className="mx-0.5 inline-flex items-center gap-[3px] align-middle">
      {symbols.map((s, i) => (
        <span
          key={i}
          title={PIP_TITLE[s] ?? s}
          className="inline-block size-[13px] shrink-0 rounded-full ring-[1.5px] ring-inset ring-black/15"
          style={{ background: PIP_COLOR[s] ?? "var(--ob-colorless)" }}
        />
      ))}
    </span>
  );
}

function Keyword({ children }: { children: string }) {
  return (
    <span className="mr-1 inline-block rounded-[6px] bg-[var(--ob-text)] px-1.5 py-[1px] align-middle text-[10.5px] font-bold uppercase tracking-wide text-[var(--ob-bg)]">
      {children}
    </span>
  );
}

function DamageBadge({ value }: { value: string }) {
  return (
    <span className="mx-0.5 inline-flex items-center gap-1 rounded-full bg-[var(--ob-danger)] px-1.5 py-[1px] align-middle text-[10.5px] font-bold text-white">
      <svg viewBox="0 0 24 24" className="size-2.5" fill="currentColor" aria-hidden>
        <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
      </svg>
      {value}
    </span>
  );
}

/** Splits one line of rules text into badges, cost pips and plain runs. */
function renderLine(line: string, keyPrefix: string): JSX.Element[] {
  const out: JSX.Element[] = [];
  // Order matters: {da} and {sk} must be tried before the generic {X} pip rule,
  // and cost pips can appear anywhere -- inside an attack's <{R}{R}> block or
  // mid-sentence in a condition like "<Discard 1 {R} Item card.>".
  const pattern =
    /【([^】]+)】|(?:\{da\}\s*([0-9０-９]+))|(\{sk\})|((?:\{[RYGBPKN]\})+)/g;

  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;

  while ((m = pattern.exec(line)) !== null) {
    if (m.index > last) {
      out.push(<span key={`${keyPrefix}-t${i}`}>{line.slice(last, m.index)}</span>);
    }
    if (m[1] !== undefined) {
      out.push(<Keyword key={`${keyPrefix}-k${i}`}>{m[1].trim()}</Keyword>);
    } else if (m[2] !== undefined) {
      out.push(<DamageBadge key={`${keyPrefix}-d${i}`} value={m[2]} />);
    } else if (m[3] !== undefined) {
      out.push(
        <span key={`${keyPrefix}-s${i}`} className="mr-0.5 font-semibold text-[var(--ob-accent)]">
          ◆
        </span>,
      );
    } else if (m[4] !== undefined) {
      const syms = [...m[4].matchAll(/\{([RYGBPKN])\}/g)].map((s) => s[1]);
      out.push(<CostPips key={`${keyPrefix}-c${i}`} symbols={syms} />);
    }
    last = m.index + m[0].length;
    i++;
  }

  if (last < line.length) out.push(<span key={`${keyPrefix}-tail`}>{line.slice(last)}</span>);
  return out;
}

export function CardText({
  text,
  className,
  /**
   * Renders spans instead of div/p. Needed wherever this sits inside a <p> --
   * a block element nested in a paragraph is invalid HTML and the browser
   * silently restructures it, which breaks hydration.
   */
  inline = false,
}: {
  text: string | null;
  className?: string;
  inline?: boolean;
}) {
  if (!text) return null;

  // The dump pads text with runs of \r\n; collapse them into real paragraphs.
  const paragraphs = text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (inline) {
    return (
      <span className={className}>
        {paragraphs.map((p, i) => (
          <span key={i}>
            {i > 0 && " "}
            {renderLine(p, `p${i}`)}
          </span>
        ))}
      </span>
    );
  }

  return (
    <div className={className}>
      {paragraphs.map((p, i) => (
        <p key={i} className={i > 0 ? "mt-1.5" : undefined}>
          {renderLine(p, `p${i}`)}
        </p>
      ))}
    </div>
  );
}
