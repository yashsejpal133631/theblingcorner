/**
 * Public UPI configuration.
 *
 * A UPI VPA is a public payment address, not a secret. Keeping it in one module
 * avoids scattering the value through JSX and lets the store change it through
 * NEXT_PUBLIC_UPI_VPA without touching checkout code.
 */
export const MERCHANT_NAME =
  process.env.NEXT_PUBLIC_MERCHANT_NAME?.trim() || "The Bling Corner";

export const UPI_VPA =
  process.env.NEXT_PUBLIC_UPI_VPA?.trim() ||
  process.env.NEXT_PUBLIC_UPI_ID?.trim() ||
  "tejasandodariya3525@oksbi";

export function isUpiConfigured(): boolean {
  return /^[a-zA-Z0-9.\-_]+@[a-zA-Z0-9.\-_]+$/.test(UPI_VPA);
}

export function buildUpiPayUrl(options: {
  amount: number;
  note: string;
  merchant?: string;
}): string {
  const params = new URLSearchParams({
    pa: UPI_VPA,
    pn: options.merchant || MERCHANT_NAME,
    am: options.amount.toFixed(2),
    cu: "INR",
    tn: options.note,
  });
  return `upi://pay?${params.toString()}`;
}
