import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flighty — personal flight tracker",
  description: "Search and pin flight itineraries.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-6 py-8">
          <header className="mb-8 flex items-center justify-between">
            <Link href="/" className="text-xl font-semibold tracking-tight">
              ✈ flighty
            </Link>
            <nav className="flex gap-4 text-sm text-neutral-600 dark:text-neutral-400">
              <Link href="/" className="hover:text-neutral-900 dark:hover:text-neutral-100">Trips</Link>
            </nav>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="mt-12 border-t border-neutral-200 pt-4 text-xs text-neutral-500 dark:border-neutral-800">
            Personal use. Flight prices scraped from Google Flights — selectors may break at any time.
          </footer>
        </div>
      </body>
    </html>
  );
}
