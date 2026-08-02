"use client";

import { useEffect, useRef } from "react";
import { Check, Palette } from "lucide-react";

import { Button, cn } from "@/components/ui";

export const THEMES = [
  {
    id: "light",
    label: "Hell",
    hint: "Hoher Kontrast",
    swatch: ["#f5f7f5", "#ffffff", "#216e62"]
  },
  {
    id: "papier",
    label: "Papier",
    hint: "Warm, blendet weniger",
    swatch: ["#f0eade", "#faf6ed", "#1f6b5e"]
  },
  {
    id: "dim",
    label: "Gedämpft",
    hint: "Dunkel ohne Nachleuchten",
    swatch: ["#222927", "#2a322f", "#5cc0a8"]
  },
  {
    id: "dark",
    label: "Dunkel",
    hint: "Am dunkelsten",
    swatch: ["#141a17", "#1b2320", "#4fb9a3"]
  }
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export function isThemeId(value: string | null): value is ThemeId {
  return THEMES.some((theme) => theme.id === value);
}

export default function ThemePicker({
  theme,
  onChange,
  open,
  onOpenChange
}: {
  theme: ThemeId;
  onChange: (theme: ThemeId) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        onOpenChange(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    }

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onOpenChange]);

  return (
    <div className="relative" ref={containerRef}>
      <Button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Farbschema"
        className="px-2"
        onClick={() => onOpenChange(!open)}
        title="Farbschema"
        variant="ghost"
      >
        <Palette size={18} aria-hidden="true" />
      </Button>

      {open ? (
        <div
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-60 overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-popover"
          role="menu"
        >
          {THEMES.map((entry) => {
            const active = entry.id === theme;

            return (
              <button
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors",
                  active ? "bg-surface-muted" : "hover:bg-surface-muted"
                )}
                key={entry.id}
                onClick={() => {
                  onChange(entry.id);
                  onOpenChange(false);
                }}
                role="menuitemradio"
                aria-checked={active}
                type="button"
              >
                <span
                  aria-hidden="true"
                  className="flex h-7 w-7 shrink-0 overflow-hidden rounded-full border border-border"
                >
                  {entry.swatch.map((color) => (
                    <span
                      className="h-full flex-1"
                      key={color}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </span>
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <span className="text-body-sm font-medium text-text">
                    {entry.label}
                  </span>
                  <span className="text-label text-text-subtle">{entry.hint}</span>
                </span>
                {active ? (
                  <Check className="shrink-0 text-accent" size={15} aria-hidden="true" />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
