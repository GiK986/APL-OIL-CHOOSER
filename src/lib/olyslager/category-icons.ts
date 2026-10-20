import { Car, CarFront, Construction, Fan, Motorbike, Ship, Tractor, Truck, Van, type LucideIcon } from "lucide-react";

export const CATEGORY_ICONS: Record<number, LucideIcon> = {
  1: CarFront,
  2: Van,
  3: Truck,
  4: Motorbike,
  5: Tractor,
  9: Fan, // Compressors, Pumps and Generators (Eurol only)
  10: Construction,
  31: Ship, // Marine (Eurol only)
  32: Car, // Classic Cars (Eurol only)
};

export const DEFAULT_CATEGORY_ICON: LucideIcon = CarFront;
