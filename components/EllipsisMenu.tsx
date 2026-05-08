"use client";

import { useEffect, useRef, useState } from "react";

export default function EllipsisMenu({
  children,
  align = "right",
  label = "More options",
}: {
  // children can be a render function so action handlers can call close()
  children: React.ReactNode | ((close: () => void) => React.ReactNode);
  align?: "left" | "right";
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);
  const content = typeof children === "function" ? children(close) : children;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="rounded-md px-2 py-0.5 text-base leading-none text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
      >
        ⋯
      </button>
      {open && (
        <div
          className={`absolute top-full z-20 mt-1 min-w-[320px] rounded-lg border border-neutral-200 bg-white p-3 shadow-lg dark:border-neutral-700 dark:bg-neutral-900 ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {content}
        </div>
      )}
    </div>
  );
}
