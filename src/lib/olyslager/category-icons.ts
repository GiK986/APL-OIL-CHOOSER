import { CarFront, Van, Motorbike, Truck, Tractor, Construction, type LucideIcon } from "lucide-react";

export const CATEGORY_ICONS: Record<number, LucideIcon> = {
  1: CarFront,
  2: Van,
  3: Truck,
  4: Motorbike,
  5: Tractor,
  10: Construction,
};

export const DEFAULT_CATEGORY_ICON: LucideIcon = CarFront;
