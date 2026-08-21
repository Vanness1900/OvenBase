"use client";

import { useEffect, useId, useRef, useState } from "react";

export interface DropdownOption {
  value: string;
  label: string;
}

/**
 * A styled listbox replacing the native <select>.
 *
 * The native control couldn't be themed to match the rest of the UI, and the
 * chevron drawn beside it was a decorative sibling rather than part of the
 * control -- clicking it did nothing. Here the whole button is the trigger.
 *
 * Keyboard behaviour follows the listbox pattern: arrows move, Enter/Space
 * select, Escape closes, Home/End jump, and focus returns to the trigger.
 */
export function Dropdown({
  label,
  value,
  onChange,
  options,
  align = "start",
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: DropdownOption[];
  align?: "start" | "end";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listId = useId();

  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const selected = options[selectedIndex];

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  // Keep the highlighted row in view when navigating a long list by keyboard.
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelectorAll("li")[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  const openWith = (index: number) => {
    setActiveIndex(index);
    setOpen(true);
  };

  const commit = (index: number) => {
    const option = options[index];
    if (option) onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openWith(selectedIndex);
      }
      return;
    }

    switch (e.key) {
      case "Escape":
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        break;
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % options.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + options.length) % options.length);
        break;
      case "Home":
        e.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        e.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        commit(activeIndex);
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className ?? ""}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openWith(selectedIndex))}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={label}
        className={`inline-flex h-11 w-full items-center justify-between gap-2 rounded-full border bg-[var(--ob-surface)] pl-3.5 pr-3 text-[13.5px] font-semibold transition-colors ${
          open
            ? "border-[var(--ob-accent)] ring-2 ring-[var(--ob-accent)]/25"
            : "border-[var(--ob-line)] hover:border-[var(--ob-line-strong)]"
        }`}
      >
        <span className="truncate">{selected?.label ?? ""}</span>
        <svg
          viewBox="0 0 24 24"
          aria-hidden
          className={`size-3.5 shrink-0 text-[var(--ob-text-faint)] transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={label}
          aria-activedescendant={`${listId}-${activeIndex}`}
          tabIndex={-1}
          onKeyDown={onKeyDown}
          className={`ob-card ob-scroll absolute top-[calc(100%+6px)] z-50 max-h-[320px] min-w-full overflow-y-auto p-1 ${
            align === "end" ? "right-0" : "left-0"
          }`}
        >
          {options.map((o, i) => {
            const isSelected = o.value === value;
            const isActive = i === activeIndex;
            return (
              <li
                key={o.value}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={isSelected}
                onClick={() => commit(i)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`flex cursor-pointer items-center justify-between gap-3 whitespace-nowrap rounded-[10px] px-3 py-2 text-[13.5px] transition-colors ${
                  isActive ? "bg-[var(--ob-surface-2)]" : ""
                } ${isSelected ? "font-semibold" : "text-[var(--ob-text-soft)]"}`}
              >
                {o.label}
                {isSelected && (
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden
                    className="size-4 shrink-0 text-[var(--ob-accent)]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 12.5l5 5L20 6.5" />
                  </svg>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
