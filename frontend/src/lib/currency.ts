/**
 * Currency formatting utility for Panama (Balboa / USD).
 * The Balboa (B/.) is pegged 1:1 to USD.
 * Panama uses: B/. 1,234.56
 */

interface FormatOptions {
  /** Show decimals (default: true) */
  decimals?: boolean;
  /** Number of decimal places (default: 2) */
  decimalPlaces?: number;
  /** Show sign for positive numbers (default: false) */
  showSign?: boolean;
  /** Compact large numbers, e.g. "B/. 1.2M" (default: false) */
  compact?: boolean;
  /** Use dollar sign instead of B/. (default: false) */
  useDollarSign?: boolean;
}

/**
 * Format a number as Panamanian Balboas.
 * @param amount - The numeric amount
 * @param options - Optional configuration
 * @returns Formatted string like "B/. 1,234.56"
 */
export function formatBalboas(amount: number, options?: FormatOptions): string {
  const {
    decimals = true,
    decimalPlaces = 2,
    showSign = false,
    compact = false,
    useDollarSign = false,
  } = options ?? {};

  const prefix = useDollarSign ? "$" : "B/.";

  if (compact) {
    if (Math.abs(amount) >= 1_000_000) {
      const millions = amount / 1_000_000;
      return `${prefix} ${millions.toFixed(1)}M`;
    }
    if (Math.abs(amount) >= 10_000) {
      const thousands = amount / 1_000;
      return `${prefix} ${thousands.toFixed(1)}K`;
    }
  }

  const formatted = amount.toLocaleString("es-PA", {
    minimumFractionDigits: decimals ? decimalPlaces : 0,
    maximumFractionDigits: decimals ? decimalPlaces : 0,
  });

  const sign = showSign && amount > 0 ? "+" : "";
  return `${prefix} ${sign}${formatted}`;
}

/**
 * Parse a Balboa-formatted string back to a number.
 * Handles: "B/. 1,234.56", "$1,234.56", "1234.56"
 */
export function parseBalboas(input: string): number {
  const cleaned = input
    .replace(/B\/\.\s?/, "")
    .replace(/\$/g, "")
    .replace(/,/g, "");
  return parseFloat(cleaned) || 0;
}
