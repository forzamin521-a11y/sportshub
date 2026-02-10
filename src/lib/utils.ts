import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseNumber(value: any): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const clean = value.replace(/,/g, '').trim();
    if (clean === '') return 0;
    const num = Number(clean);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}
