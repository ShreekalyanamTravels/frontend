import { unserialize } from "php-serialize";

export interface ParsedSegment {
  airlineCode: string;
  airlineName: string;
  flightNumber: string;
  depCityName: string;
  arrCityName: string;
  depAirportName: string;
  depTerminal: string;
  arrAirportName: string;
  arrTerminal: string;
  depDate: string;
  depTime: string;
  arrDate: string;
  arrTime: string;
  durationLabel: string;
}

export interface ParsedItinerary {
  segments: ParsedSegment[];
  baggage: string;
}

interface FsSegment {
  ac: string;
  fl: string;
  dan: string;
  aan: string;
  dac: string;
  aac: string;
  ddt: string;
  adt: string;
  dd: string;
  ad: string;
  dt: string;
  at: string;
  bga: string;
  dur?: string;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function durationLabel(FS: FsSegment): string {
  try {
    const depDT = new Date(`${FS.ddt}T${FS.dd}:00`);
    const arrDT = new Date(`${FS.adt}T${FS.ad}:00`);
    const minutes = Math.round((arrDT.getTime() - depDT.getTime()) / 60000);
    if (Number.isFinite(minutes) && minutes > 0) {
      return `${Math.floor(minutes / 60)}h ${pad2(minutes % 60)}m`;
    }
  } catch {
    // fall through
  }
  return FS.dur || "—";
}

/**
 * Best-effort decode of the legacy flightsDataArray blob, mirroring the
 * production Blade template's traversal: fltOrder -> fltSchedule[key] -> OD[]
 * matched to this booking_root's "ORIGIN-DEST" sector string, then one
 * ParsedSegment per technical flight segment (FS) within that OD.
 * Returns null on any parse failure or if no OD matches the sector.
 */
export function parseFlightItinerary(base64: string | null, bookingRootSector: string | null): ParsedItinerary | null {
  if (!base64 || !bookingRootSector) return null;
  try {
    const text = Buffer.from(base64, "base64").toString("utf8");
    // createBooking.ts stores this as base64(PHP serialize(...)) — matching Laravel's own
    // base64_encode(serialize($flight_detail)) exactly, for both legacy/admin-created bookings
    // and ones created by this app. The JSON fallback below only exists for rows written during
    // this app's brief earlier window of storing base64(JSON.stringify(...)) instead; safe to
    // remove once no such rows remain.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let decoded: any;
    try {
      decoded = unserialize(text, {}, { strict: false });
    } catch {
      decoded = null;
    }
    if (!decoded?.data) {
      try {
        decoded = JSON.parse(text);
      } catch {
        decoded = null;
      }
    }
    const data = decoded?.data;
    if (!data) return null;

    const cityNames: Record<string, string> = data.cityNames ?? {};
    const airportNames: Record<string, string> = data.airportNames ?? {};
    const airlineNames: Record<string, string> = data.airlineNames ?? {};
    const fltOrder: Record<string, string> = data.fltOrder ?? {};

    for (const orderKey of Object.values(fltOrder)) {
      if (typeof orderKey !== "string") continue;
      const flightRoots = data.fltSchedule?.[orderKey];
      if (!flightRoots) continue;

      for (const flightRoot of Object.values(flightRoots) as Array<{ OD?: Array<{ FS?: FsSegment[]; bga?: string }> }>) {
        for (const od of flightRoot?.OD ?? []) {
          const fsList = od?.FS;
          if (!fsList || fsList.length === 0) continue;
          const currentSector = `${fsList[0].dac}-${fsList[fsList.length - 1].aac}`;
          if (currentSector !== bookingRootSector) continue;

          const segments: ParsedSegment[] = fsList.map(FS => ({
            airlineCode: FS.ac,
            airlineName: airlineNames[FS.ac] ?? FS.ac,
            flightNumber: FS.fl,
            depCityName: cityNames[FS.dac] ?? FS.dac,
            arrCityName: cityNames[FS.aac] ?? FS.aac,
            depAirportName: airportNames[FS.dac] ?? FS.dan,
            depTerminal: FS.dt ? `T${FS.dt}` : "",
            arrAirportName: airportNames[FS.aac] ?? FS.aan,
            arrTerminal: FS.at ? `T${FS.at}` : "",
            depDate: FS.ddt,
            depTime: FS.dd,
            arrDate: FS.adt,
            arrTime: FS.ad,
            durationLabel: durationLabel(FS),
          }));

          return { segments, baggage: od.bga || fsList[0].bga || "" };
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}
