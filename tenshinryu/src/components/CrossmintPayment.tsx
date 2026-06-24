"use client";

// Crossmint payment disabled - using Stripe instead
// TODO: Remove this file when Stripe migration is complete

interface CrossmintPaymentProps {
  amount: number;
  currency?: string;
  description: string;
  recipientEmail?: string;
  onSuccess?: (orderId: string) => void;
}

export default function CrossmintPayment({
  onSuccess,
}: CrossmintPaymentProps) {
  // Stub - Crossmint disabled, Stripe is the payment processor
  return (
    <div className="p-4 bg-neutral-900 rounded-lg text-center">
      <p className="text-sm text-muted-foreground">
        Crossmint payments temporarily disabled.
      </p>
      <p className="text-xs text-muted-foreground mt-2">
        Please use Stripe checkout.
      </p>
    </div>
  );
}
