import type { DisplayCurrency, ExchangeRateView } from "@fondo/shared-types";

export function rateFor(
  rate: ExchangeRateView | null | undefined,
  currency: DisplayCurrency,
): ExchangeRateView | null {
  return rate && rate.to === currency ? rate : null;
}

export function convertMinor(
  amountMinor: number,
  rate?: ExchangeRateView | null,
): number {
  if (!rate) {
    return amountMinor;
  }
  return Math.round(amountMinor * rate.rate);
}

export function formatMinorAmount(
  amountMinor: number,
  currency: DisplayCurrency,
  rate: ExchangeRateView | null | undefined,
  locale: string,
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(convertMinor(amountMinor, rateFor(rate, currency)) / 100);
}

export function formatDate(
  date: string,
  locale: string,
  timeZone = "UTC",
): string {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    timeZone,
  }).format(new Date(date));
}
