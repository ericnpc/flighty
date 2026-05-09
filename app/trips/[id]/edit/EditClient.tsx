"use client";

import TripEditor from "@/components/TripEditor";

const IS_STATIC = process.env.NEXT_PUBLIC_STATIC === "1";

export default function EditClient({ id }: { id: string }) {
  if (IS_STATIC) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-700/50 dark:bg-amber-950/30">
        Editing isn't available in the published version. Run <code>npm run dev</code> locally to edit.
      </div>
    );
  }
  return <TripEditor id={id} />;
}
