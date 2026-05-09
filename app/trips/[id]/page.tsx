import Link from "next/link";
import { notFound } from "next/navigation";
import { listTrips, readPriceHistory, readTrip } from "@/lib/fs-storage";
import type { PriceSnapshot } from "@/lib/fs-storage";
import TripView from "@/components/TripView";

const IS_STATIC = process.env.NEXT_PUBLIC_STATIC === "1";

export async function generateStaticParams() {
  const trips = await listTrips();
  if (trips.length === 0) return [{ id: "_placeholder" }];
  return trips.map((t) => ({ id: t.id }));
}

export const dynamicParams = false;

export default async function TripPage({ params }: { params: { id: string } }) {
  const trip = await readTrip(params.id);
  if (!trip) notFound();

  const histories: Record<string, PriceSnapshot[]> = {};
  for (const f of trip.flights) {
    histories[f.id] = await readPriceHistory(trip.id, f.id);
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-baseline justify-between">
        <Link href="/" className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100">
          ← All trips
        </Link>
        {!IS_STATIC && (
          <Link
            href={`/trips/${trip.id}/edit`}
            className="rounded-md bg-neutral-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Edit
          </Link>
        )}
      </div>
      <TripView trip={trip} histories={histories} />
    </div>
  );
}
