// Decoder for Google Flights' `tfs` URL parameter — base64-url encoded
// protobuf. The schema isn't published, but the structure is stable enough
// to parse heuristically:
//
//   message Tfs {
//     repeated OneWay trip = 3;          // outbound + (optional) return
//   }
//   message OneWay {
//     string depart_date = 2;          // YYYY-MM-DD
//     repeated Leg leg = 4;
//   }
//   message Leg {
//     string origin = 1;               // IATA, e.g. "MVD"
//     string date = 2;
//     string destination = 3;
//     string airline = 5;              // IATA, e.g. "IB"
//     string flight_number = 6;
//   }
//
// Field numbers were derived by inspecting real URLs. If Google changes them,
// this file is the only thing that needs updating.

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
};

export type ParsedTfs = {
  outbound: OneWay;
  return?: OneWay;
};

function readVarint(buf: Buffer, i: number): [number, number] {
  let v = 0;
  let s = 0;
  while (i < buf.length) {
    const b = buf[i++];
    v |= (b & 0x7f) << s;
    if ((b & 0x80) === 0) return [v, i];
    s += 7;
  }
  throw new Error("Truncated varint");
}

type Field =
  | { num: number; wire: 0; value: number }
  | { num: number; wire: 2; value: Buffer };

function* readFields(buf: Buffer): Generator<Field> {
  let i = 0;
  while (i < buf.length) {
    const [tag, i1] = readVarint(buf, i);
    i = i1;
    const num = tag >>> 3;
    const wire = tag & 7;
    if (wire === 0) {
      const [v, i2] = readVarint(buf, i);
      i = i2;
      yield { num, wire: 0, value: v };
    } else if (wire === 2) {
      const [len, i2] = readVarint(buf, i);
      i = i2;
      yield { num, wire: 2, value: buf.subarray(i, i + len) };
      i += len;
    } else if (wire === 1) {
      i += 8; // 64-bit fixed
    } else if (wire === 5) {
      i += 4; // 32-bit fixed
    } else {
      return; // groups (3, 4) — deprecated; bail
    }
  }
}

function parseLeg(buf: Buffer): Leg {
  const out: Partial<Leg> = {};
  for (const f of readFields(buf)) {
    if (f.wire !== 2) continue;
    const s = f.value.toString("utf8");
    if (f.num === 1) out.origin = s;
    else if (f.num === 2) out.date = s;
    else if (f.num === 3) out.destination = s;
    else if (f.num === 5) out.airline = s;
    else if (f.num === 6) out.flightNumber = s;
  }
  if (!out.origin || !out.destination || !out.date) {
    throw new Error(`Incomplete leg in tfs: ${JSON.stringify(out)}`);
  }
  return {
    origin: out.origin,
    destination: out.destination,
    date: out.date,
    airline: out.airline ?? "",
    flightNumber: out.flightNumber ?? "",
  };
}

function parseOneWay(buf: Buffer): OneWay {
  let departDate = "";
  const legs: Leg[] = [];
  for (const f of readFields(buf)) {
    if (f.wire !== 2) continue;
    if (f.num === 2) departDate = f.value.toString("utf8");
    else if (f.num === 4) legs.push(parseLeg(f.value));
  }
  if (legs.length === 0) throw new Error("OneWay has no legs");
  return { departDate: departDate || legs[0].date, legs };
}

export function parseTfs(tfsB64: string): ParsedTfs {
  const b64 = tfsB64.replace(/-/g, "+").replace(/_/g, "/");
  const buf = Buffer.from(b64, "base64");
  const trips: OneWay[] = [];
  for (const f of readFields(buf)) {
    if (f.num === 3 && f.wire === 2) trips.push(parseOneWay(f.value));
  }
  if (trips.length === 0) throw new Error("No trips found in tfs.");
  return { outbound: trips[0], return: trips[1] };
}

export function tfsFromUrl(url: string): string {
  const u = new URL(url);
  const tfs = u.searchParams.get("tfs");
  if (!tfs) throw new Error("URL is missing the `tfs` parameter — paste a booking link, not a generic Google Flights URL.");
  return tfs;
}
