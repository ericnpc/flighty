// Wire-format types shared with the Next.js app. Keep in sync with lib/types.ts.

export type Leg = {
  origin: string;
  destination: string;
  date: string;
  airline: string;
  flightNumber: string;
};

export type OneWay = {
  departDate: string;
  legs: Leg[];
  departTime?: string;
  arriveTime?: string;
  arriveDayOffset?: number;
};

export type Itinerary = {
  id: string;
  url: string;
  outbound: OneWay;
  return?: OneWay;
  price?: number;
  currency?: string;
  scrapedAt: string;
  priceError?: string;
};
