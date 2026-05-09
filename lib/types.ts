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

export type Stay = {
  id: string;
  city: string;
  address: string;
  startDate: string;
  endDate: string;
  cost: string;
  bought: boolean;
};

export type TripFlight = {
  id: string;
  title: string;
  bought: boolean;
  googleFlightsUrl?: string;
  itinerary?: Itinerary;
  lastCheckedAt?: string;
  notes?: string;
  // Used only when no itinerary has been imported. Once an itinerary is
  // attached, the dates and cost come from there and these are ignored.
  manualDepartDate?: string;
  manualReturnDate?: string;
  manualCost?: string;
};

export type BudgetItem = {
  id: string;
  item: string;
  cost: string;
  notes: string;
};

export type TripCurrency = "USD" | "EUR";

export type Trip = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  destinations: string[];
  notes: string;
  mapsUrl: string;
  currency: TripCurrency;
  flights: TripFlight[];
  stays: Stay[];
  budget: BudgetItem[];
  createdAt: string;
};
