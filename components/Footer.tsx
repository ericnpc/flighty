"use client";

import { useLang, useT } from "@/lib/i18n";

export default function Footer() {
  const t = useT();
  const { lang, setLang } = useLang();
  return (
    <footer className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-4 text-xs text-neutral-500 dark:border-neutral-800">
      <span>{t("footer.note")}</span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setLang("en")}
          aria-pressed={lang === "en"}
          className={lang === "en" ? "font-semibold text-neutral-900 dark:text-neutral-100" : "hover:text-neutral-700 dark:hover:text-neutral-300"}
        >
          EN
        </button>
        <span className="text-neutral-300 dark:text-neutral-700">·</span>
        <button
          type="button"
          onClick={() => setLang("es")}
          aria-pressed={lang === "es"}
          className={lang === "es" ? "font-semibold text-neutral-900 dark:text-neutral-100" : "hover:text-neutral-700 dark:hover:text-neutral-300"}
        >
          ES
        </button>
      </div>
    </footer>
  );
}
