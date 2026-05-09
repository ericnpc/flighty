"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n";

export default function Header() {
  const t = useT();
  return (
    <header className="mb-8 flex items-center justify-between">
      <Link href="/" className="text-xl font-semibold tracking-tight">
        ✈ flighty
      </Link>
      <nav className="flex gap-4 text-sm text-neutral-600 dark:text-neutral-400">
        <Link href="/" className="hover:text-neutral-900 dark:hover:text-neutral-100">
          {t("nav.trips")}
        </Link>
      </nav>
    </header>
  );
}
