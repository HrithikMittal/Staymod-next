/**
 * Structured room details are stored in `Room.amenities` as namespaced strings
 * (`sm:*`) so they round-trip without a schema migration.
 */

export type GuestAmenityGroup = {
  id: string;
  title: string;
  items: Array<{ id: string; label: string }>;
};

export const GUEST_AMENITY_GROUPS: GuestAmenityGroup[] = [
  {
    id: "general",
    title: "General amenities",
    items: [
      { id: "clothes_rack", label: "Clothes rack" },
      { id: "flat_screen_tv", label: "Flat-screen TV" },
      { id: "air_conditioning", label: "Air conditioning" },
      { id: "linen", label: "Linen" },
      { id: "desk", label: "Desk" },
      { id: "wake_up_service", label: "Wake-up service" },
      { id: "towels", label: "Towels" },
      { id: "wardrobe_or_closet", label: "Wardrobe or closet" },
      { id: "heating", label: "Heating" },
      { id: "fan", label: "Fan" },
      { id: "safety_deposit_box", label: "Safety deposit box" },
      { id: "towels_sheets_extra_fee", label: "Towels/sheets (extra fee)" },
      { id: "ground_floor_unit", label: "Entire unit located on ground floor" },
    ],
  },
  {
    id: "outdoors",
    title: "Outdoors and views",
    items: [
      { id: "balcony", label: "Balcony" },
      { id: "terrace", label: "Terrace" },
      { id: "view", label: "View" },
    ],
  },
  {
    id: "food_drink",
    title: "Food and drink",
    items: [
      { id: "electric_kettle", label: "Electric kettle" },
      { id: "tea_coffee_maker", label: "Tea/Coffee maker" },
      { id: "dining_area", label: "Dining area" },
      { id: "dining_table", label: "Dining table" },
      { id: "microwave", label: "Microwave" },
    ],
  },
];

export const BATHROOM_ITEM_DEFS = [
  { id: "toilet_paper", label: "Toilet paper" },
  { id: "shower", label: "Shower" },
  { id: "toilet", label: "Toilet" },
  { id: "hairdryer", label: "Hairdryer" },
  { id: "bath", label: "Bath" },
  { id: "free_toiletries", label: "Free toiletries" },
  { id: "slippers", label: "Slippers" },
  { id: "bathrobe", label: "Bathrobe" },
  { id: "bidet", label: "Bidet" },
  { id: "spa_bath", label: "Spa bath" },
] as const;

export type BedTypeId = "single" | "double" | "king" | "super_king" | "bunk" | "sofa" | "futon";

export const BED_TYPE_PRIMARY: Array<{
  id: BedTypeId;
  label: string;
  description: string;
}> = [
  { id: "single", label: "Single bed", description: "90 – 130 cm wide" },
  { id: "double", label: "Double bed", description: "131 – 150 cm wide" },
  { id: "king", label: "Large bed (King size)", description: "151 – 180 cm wide" },
  { id: "super_king", label: "Extra-large double bed (Super-king size)", description: "181 – 210 cm wide" },
];

export const BED_TYPE_SECONDARY: Array<{
  id: BedTypeId;
  label: string;
  description: string;
}> = [
  { id: "bunk", label: "Bunk bed", description: "Variable size" },
  { id: "sofa", label: "Sofa bed", description: "Variable size" },
  { id: "futon", label: "Futon mat", description: "Variable size" },
];

export const ALL_BED_TYPE_IDS: BedTypeId[] = [
  ...BED_TYPE_PRIMARY.map((b) => b.id),
  ...BED_TYPE_SECONDARY.map((b) => b.id),
];

export function guestAmenityKey(id: string): string {
  return `sm:guest:${id}`;
}

export function bathroomModeKey(mode: "private" | "shared"): string {
  return `sm:bathroom:${mode}`;
}

export function bathItemKey(id: string): string {
  return `sm:bitem:${id}`;
}

export function bedCountKey(type: BedTypeId, count: number): string {
  return `sm:bed:${type}:${count}`;
}

export function policyKey(id: "smoking" | "parties"): string {
  return `sm:pol:${id}`;
}
