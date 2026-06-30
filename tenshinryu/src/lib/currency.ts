// Currency conversion utility
// Using approximate exchange rates - in production, use a real-time API

export type CurrencyCode = "USD" | "JPY" | "EUR" | "PLN";

interface ExchangeRates {
  [key: string]: number;
}

// Approximate exchange rates (base: USD)
const EXCHANGE_RATES: ExchangeRates = {
  USD: 1,
  JPY: 150,    // 1 USD ≈ 150 JPY
  EUR: 0.92,   // 1 USD ≈ 0.92 EUR
  PLN: 4.0,    // 1 USD ≈ 4 PLN
};

// Currency symbols
const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  USD: "$",
  JPY: "¥",
  EUR: "€",
  PLN: "zł",
};

// Currency display format (before or after number)
const CURRENCY_FORMAT: Record<CurrencyCode, { position: "before" | "after"; space: boolean }> = {
  USD: { position: "before", space: false },
  JPY: { position: "before", space: false },
  EUR: { position: "before", space: true },
  PLN: { position: "after", space: true },
};

/**
 * Convert USD amount to target currency
 */
export function convertCurrency(usdAmount: number, targetCurrency: CurrencyCode): number {
  const rate = EXCHANGE_RATES[targetCurrency] || 1;
  const converted = usdAmount * rate;
  
  // Round to appropriate precision
  if (targetCurrency === "JPY") {
    return Math.round(converted); // JPY doesn't use decimals
  }
  return Math.round(converted * 100) / 100;
}

/**
 * Format currency amount with symbol
 */
export function formatCurrency(amount: number, currency: CurrencyCode): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  const format = CURRENCY_FORMAT[currency];
  
  // Format number with thousand separators
  const formattedAmount = amount.toLocaleString(currency === "JPY" ? "ja-JP" : "en-US");
  
  if (format.position === "before") {
    return `${symbol}${formattedAmount}`;
  } else {
    return `${formattedAmount}${format.space ? " " : ""}${symbol}`;
  }
}

/**
 * Get currency code from locale
 */
export function getCurrencyFromLocale(locale: string): CurrencyCode {
  const localeToCurrency: Record<string, CurrencyCode> = {
    ja: "JPY",
    en: "USD",
    pl: "PLN",
    de: "EUR",
    fr: "EUR",
    it: "EUR",
    es: "EUR",
  };
  
  return localeToCurrency[locale] || "USD";
}

/**
 * Parse price string (e.g., "$4.99" or "$35") to number
 */
export function parsePrice(priceString: string): number {
  const match = priceString.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

/**
 * Convert and format price from string
 */
export function convertAndFormatPrice(priceString: string, locale: string): string {
  const usdAmount = parsePrice(priceString);
  const currency = getCurrencyFromLocale(locale);
  const converted = convertCurrency(usdAmount, currency);
  return formatCurrency(converted, currency);
}
