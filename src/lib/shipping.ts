/**
 * India-specific shipping logic: pincode zones, delivery estimates and
 * shipping option pricing. Used on product pages and in the cart/checkout flow.
 */

export const FREE_SHIPPING_THRESHOLD = 499;

export type ZoneId = "metro" | "north" | "west" | "south" | "east" | "northeast";

export interface Zone {
  id: ZoneId;
  label: string;
  standardDays: [number, number];
  expressDays: [number, number];
  surcharge: number;
  cod: boolean;
}

const ZONES: Record<ZoneId, Zone> = {
  metro: {
    id: "metro",
    label: "Metro",
    standardDays: [2, 3],
    expressDays: [1, 1],
    surcharge: 0,
    cod: true,
  },
  north: {
    id: "north",
    label: "North India",
    standardDays: [3, 5],
    expressDays: [1, 2],
    surcharge: 0,
    cod: true,
  },
  west: {
    id: "west",
    label: "West India",
    standardDays: [3, 5],
    expressDays: [1, 2],
    surcharge: 0,
    cod: true,
  },
  south: {
    id: "south",
    label: "South India",
    standardDays: [3, 6],
    expressDays: [2, 3],
    surcharge: 0,
    cod: true,
  },
  east: {
    id: "east",
    label: "East India",
    standardDays: [4, 7],
    expressDays: [2, 3],
    surcharge: 0,
    cod: true,
  },
  northeast: {
    id: "northeast",
    label: "North-East & remote",
    standardDays: [6, 9],
    expressDays: [4, 5],
    surcharge: 60,
    cod: false,
  },
};

const METRO_PREFIXES = ["110", "400", "560", "600", "700", "500", "380", "411", "122", "201"];

export function isValidPincode(pincode: string) {
  return /^[1-9][0-9]{5}$/.test(pincode);
}

export function zoneForPincode(pincode: string): Zone | null {
  if (!isValidPincode(pincode)) return null;
  if (METRO_PREFIXES.some((p) => pincode.startsWith(p))) return ZONES.metro;

  const first = Number(pincode[0]);
  if (first === 1 || first === 2) return ZONES.north;
  if (first === 3 || first === 4) return ZONES.west;
  if (first === 5 || first === 6) return ZONES.south;
  if (first === 7) return ZONES.east;
  if (first === 8) return ZONES.northeast;
  return ZONES.north;
}

export type ShippingMethodId = "standard" | "express" | "cod";

export interface ShippingOption {
  id: ShippingMethodId;
  label: string;
  note: string;
  price: number;
  free: boolean;
  window: [number, number];
  etaLabel: string;
}

function addBusinessDays(from: Date, days: number) {
  const date = new Date(from);
  let added = 0;
  while (added < days) {
    date.setDate(date.getDate() + 1);
    if (date.getDay() !== 0) added += 1; // Sunday is not a delivery day
  }
  return date;
}

const DATE_FMT = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

export function deliveryWindowLabel(window: [number, number], from = new Date()) {
  const start = addBusinessDays(from, window[0]);
  const end = addBusinessDays(from, window[1]);
  if (window[0] === window[1]) return DATE_FMT.format(start);
  return `${DATE_FMT.format(start)} – ${DATE_FMT.format(end)}`;
}

/** Cut-off for same-day dispatch is 4pm IST. */
export function dispatchNote(now = new Date()) {
  const ist = new Date(now.getTime() + (330 - -now.getTimezoneOffset()) * 0);
  const hour = ist.getHours();
  return hour < 16 ? "Ordered now, dispatched today" : "Dispatched next working day";
}

export function shippingOptions(pincode: string, subtotal: number): ShippingOption[] {
  const zone = zoneForPincode(pincode);
  if (!zone) return [];

  const standardFree = subtotal >= FREE_SHIPPING_THRESHOLD;
  const standardPrice = standardFree ? 0 : 49 + zone.surcharge;

  const options: ShippingOption[] = [
    {
      id: "standard",
      label: "Standard delivery",
      note: standardFree
        ? `Free · ${zone.label} · ${zone.standardDays[0]}–${zone.standardDays[1]} working days`
        : `${zone.label} · ${zone.standardDays[0]}–${zone.standardDays[1]} working days`,
      price: standardPrice,
      free: standardFree,
      window: zone.standardDays,
      etaLabel: deliveryWindowLabel(zone.standardDays),
    },
    {
      id: "express",
      label: "Express delivery",
      note: `Priority courier · ${zone.expressDays[0]}–${zone.expressDays[1]} working days`,
      price: 99 + zone.surcharge,
      free: false,
      window: zone.expressDays,
      etaLabel: deliveryWindowLabel(zone.expressDays),
    },
  ];

  if (zone.cod) {
    options.push({
      id: "cod",
      label: "Cash on delivery",
      note: `Pay the courier · ${zone.standardDays[0]}–${zone.standardDays[1] + 1} working days · ₹29 handling`,
      price: standardPrice + 29,
      free: false,
      window: [zone.standardDays[0], zone.standardDays[1] + 1],
      etaLabel: deliveryWindowLabel([zone.standardDays[0], zone.standardDays[1] + 1]),
    });
  }

  return options;
}
