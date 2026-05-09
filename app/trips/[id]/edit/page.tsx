import { listTrips } from "@/lib/fs-storage";
import EditClient from "./EditClient";

export async function generateStaticParams() {
  const trips = await listTrips();
  // Always include at least one entry so static export doesn't complain when
  // there are no trips yet. The placeholder page just shows the static banner.
  if (trips.length === 0) return [{ id: "_placeholder" }];
  return trips.map((t) => ({ id: t.id }));
}

export const dynamicParams = false;

export default function TripEditPage({ params }: { params: { id: string } }) {
  return <EditClient id={params.id} />;
}
