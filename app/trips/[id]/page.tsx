"use client";

import { useParams } from "next/navigation";
import TripEditor from "@/components/TripEditor";

export default function TripDetailPage() {
  const params = useParams<{ id: string }>();
  return <TripEditor id={params.id} />;
}
