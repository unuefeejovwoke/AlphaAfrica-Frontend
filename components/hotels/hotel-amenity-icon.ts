import type { HugeiconsIcon } from "@hugeicons/react"
import {
  Airplane01Icon,
  ArmchairIcon,
  BeachIcon,
  Car01Icon,
  CarParking01Icon,
  ChefHatIcon,
  Coffee01Icon,
  ComputerDesk01Icon,
  CookingPotIcon,
  DrinkIcon,
  MeetingRoomIcon,
  PoolIcon,
  PowerSocket01Icon,
  RestaurantIcon,
  SecurityIcon,
  ShowerHeadIcon,
  SmartAcIcon,
  Store01Icon,
  SwimmingIcon,
  TowelsIcon,
  UmbrellaIcon,
  WashingMachineIcon,
  Wifi01Icon,
  WorkoutGymnasticsIcon,
  Yoga01Icon,
} from "@hugeicons/core-free-icons"

/**
 * The icon slot shape `@hugeicons/react` expects. Typed as a local alias so
 * this module stays JSX-free and importable from a Server Component.
 */
type AmenityIcon = React.ComponentProps<typeof HugeiconsIcon>["icon"]

/**
 * Amenity keyword to icon. Keys are lowercase substrings tested in
 * declaration order, so a more specific phrase must precede a shorter one
 * (`airport shuttle` style prefixes are handled by the shorter key here).
 *
 * `null` from `amenityIconFor` means "no confident match": the caller renders
 * a neutral check rather than guessing a wrong pictogram. Amenity names come
 * from the backend as free text, so a miss is expected and must degrade
 * quietly.
 */
const AMENITY_ICON_RULES: ReadonlyArray<
  readonly [keyword: string, icon: AmenityIcon]
> = [
  ["wifi", Wifi01Icon],
  ["wi-fi", Wifi01Icon],
  ["internet", Wifi01Icon],
  ["swimming", SwimmingIcon],
  ["pool", PoolIcon],
  ["gym", WorkoutGymnasticsIcon],
  ["fitness", WorkoutGymnasticsIcon],
  ["spa", TowelsIcon],
  ["massage", TowelsIcon],
  ["sauna", ShowerHeadIcon],
  ["restaurant", RestaurantIcon],
  ["dining", RestaurantIcon],
  ["bar", DrinkIcon],
  ["cafe", Coffee01Icon],
  ["coffee", Coffee01Icon],
  ["breakfast", CookingPotIcon],
  ["room service", CookingPotIcon],
  ["kitchen", CookingPotIcon],
  ["airport", Airplane01Icon],
  ["shuttle", Airplane01Icon],
  ["transfer", Airplane01Icon],
  ["parking", CarParking01Icon],
  ["valet", Car01Icon],
  ["car", Car01Icon],
  ["laundry", WashingMachineIcon],
  ["air conditioning", SmartAcIcon],
  ["airconditioning", SmartAcIcon],
  ["conference", MeetingRoomIcon],
  ["meeting", MeetingRoomIcon],
  ["business", ComputerDesk01Icon],
  ["workspace", ComputerDesk01Icon],
  ["shop", Store01Icon],
  ["store", Store01Icon],
  ["retail", Store01Icon],
  ["beach", BeachIcon],
  ["security", SecurityIcon],
  ["yoga", Yoga01Icon],
  ["towel", TowelsIcon],
  ["power", PowerSocket01Icon],
  ["umbrella", UmbrellaIcon],
  ["lounge", ArmchairIcon],
  ["chef", ChefHatIcon],
]

/** Best-effort icon for a free-text amenity, or null when nothing matches. */
export function amenityIconFor(amenity: string): AmenityIcon | null {
  const needle = amenity.trim().toLowerCase()
  if (needle.length === 0) return null
  for (const [keyword, icon] of AMENITY_ICON_RULES) {
    if (needle.includes(keyword)) return icon
  }
  return null
}
