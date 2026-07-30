"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/components/ui/utils";

type HoldButtonProps = {
  onConfirm: () => void;
  label: string;
  holdLabel: string;
  children: React.ReactNode;
  className?: string;
  duration?: number;
};

const RADIUS = 15;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// A destructive action that confirms by being held instead of by a dialog. The
// ring filling around the icon is the confirmation: let go early and nothing
// happens. Keyboard users hold Enter/Space, which repeats keydown the same way.
export default function HoldButton({
  onConfirm,
  label,
  holdLabel,
  children,
  className,
  duration = 800
}: HoldButtonProps) {
  const [progress, setProgress] = useState(0);
  const [held, setHeld] = useState(false);
  // The empty track appearing on hover is the affordance: it shows there's
  // something to fill before the tooltip has a chance to explain it.
  const [hinted, setHinted] = useState(false);
  const frame = useRef(0);
  const start = useRef(0);
  const done = useRef(false);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  function begin() {
    if (held) {
      return;
    }

    setHeld(true);
    done.current = false;
    start.current = performance.now();

    function tick(nowMs: number) {
      const value = Math.min(1, (nowMs - start.current) / duration);
      setProgress(value);

      if (value >= 1) {
        if (!done.current) {
          done.current = true;
          // Fires on the frame the ring closes, so the visual and the action
          // land together.
          onConfirm();
          navigator.vibrate?.(18);
          cancel();
        }

        return;
      }

      frame.current = requestAnimationFrame(tick);
    }

    frame.current = requestAnimationFrame(tick);
  }

  function cancel() {
    cancelAnimationFrame(frame.current);
    setHeld(false);
    setProgress(0);
  }

  return (
    <button
      aria-label={label}
      className={cn(
        "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-text-subtle transition-colors",
        held ? "text-danger" : "hover:bg-surface-muted hover:text-danger",
        className
      )}
      onBlur={() => {
        setHinted(false);
        cancel();
      }}
      onContextMenu={(event) => event.preventDefault()}
      onFocus={() => setHinted(true)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          begin();
        }
      }}
      onKeyUp={cancel}
      onPointerCancel={cancel}
      onPointerDown={(event) => {
        event.preventDefault();
        begin();
      }}
      onPointerEnter={() => setHinted(true)}
      onPointerLeave={() => {
        setHinted(false);
        cancel();
      }}
      onPointerUp={cancel}
      title={holdLabel}
      type="button"
    >
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full -rotate-90"
        viewBox="0 0 36 36"
      >
        <circle
          className="transition-[stroke] duration-200"
          cx="18"
          cy="18"
          fill="none"
          r={RADIUS}
          stroke={
            held || hinted
              ? "color-mix(in srgb, var(--danger) 22%, transparent)"
              : "transparent"
          }
          strokeWidth="2.5"
        />
        <circle
          cx="18"
          cy="18"
          fill="none"
          r={RADIUS}
          stroke="var(--danger)"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
          strokeLinecap="round"
          strokeWidth="2.5"
        />
      </svg>
      <span
        className="pointer-events-none relative transition-transform"
        style={{ transform: held ? "scale(0.88)" : undefined }}
      >
        {children}
      </span>
    </button>
  );
}
