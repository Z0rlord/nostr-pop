"use client";

import { useI18n } from "@/components/I18nProvider";
import { convertAndFormatPrice, parsePrice, formatCurrency, getCurrencyFromLocale, convertCurrency } from "@/lib/currency";

interface CurrencyDisplayProps {
  usdPrice: string;  // e.g., "$4.99" or "$35"
  showOriginal?: boolean;
  className?: string;
}

export default function CurrencyDisplay({ 
  usdPrice, 
  showOriginal = false,
  className = ""
}: CurrencyDisplayProps) {
  const { locale } = useI18n();
  
  const usdAmount = parsePrice(usdPrice);
  const currency = getCurrencyFromLocale(locale);
  const convertedAmount = convertCurrency(usdAmount, currency);
  const formattedPrice = formatCurrency(convertedAmount, currency);
  
  // If USD, just show the original
  if (currency === "USD") {
    return <span className={className}>{usdPrice}</span>;
  }
  
  // Show converted price, optionally with original
  if (showOriginal) {
    return (
      <span className={className}>
        <span className="font-medium">{formattedPrice}</span>
        <span className="text-muted-foreground text-sm ml-1">({usdPrice})</span>
      </span>
    );
  }
  
  return <span className={className}>{formattedPrice}</span>;
}

interface MembershipPriceProps {
  price: string;
  period: string;
  className?: string;
}

export function MembershipPrice({ price, period, className = "" }: MembershipPriceProps) {
  const { locale } = useI18n();
  
  const usdAmount = parsePrice(price);
  const currency = getCurrencyFromLocale(locale);
  const convertedAmount = convertCurrency(usdAmount, currency);
  const formattedPrice = formatCurrency(convertedAmount, currency);
  
  // Format period based on locale
  const getLocalizedPeriod = (period: string) => {
    if (locale === "ja") {
      return period.replace("/month", "/月").replace("/year", "/年");
    }
    if (locale === "pl") {
      return period.replace("/month", "/miesiąc").replace("/year", "/rok");
    }
    return period;
  };
  
  return (
    <div className={className}>
      <span className="text-3xl font-bold">{formattedPrice}</span>
      <span className="text-muted-foreground">{getLocalizedPeriod(period)}</span>
      {currency !== "USD" && (
        <span className="text-xs text-muted-foreground block">
          ≈ {price} USD
        </span>
      )}
    </div>
  );
}
