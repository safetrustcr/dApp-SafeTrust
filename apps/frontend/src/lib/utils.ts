import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function truncateStellarAddress(address: string, prefixLen = 3, suffixLen = 4): string {
  if (!address) return "";
  if (address.length <= prefixLen + suffixLen) return address;
  return address.slice(0, prefixLen) + "..." + address.slice(-suffixLen);
}
