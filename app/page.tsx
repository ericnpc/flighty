import { listTrips } from "@/lib/fs-storage";
import TripList from "@/components/TripList";

export const dynamic = "force-static";

export default async function HomePage() {
  const trips = await listTrips();
  return <TripList initialTrips={trips} />;
}
