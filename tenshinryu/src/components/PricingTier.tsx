import Link from "next/link";
import { ShoppingCart } from "lucide-react";

type TierProps = {
  name: string;
  label?: string;
  price: string;
  originalPrice?: string;
  period?: string;
  features: string[];
  highlighted?: boolean;
  ctaHref: string;
  ctaLabel: string;
  external?: boolean;
};

export function PricingTier({
  name,
  price,
  originalPrice,
  period = "monthly",
  features,
  ctaHref,
  ctaLabel,
  external,
}: TierProps) {
  const ctaClass = "btn-payment mt-auto";
  const ctaContent = (
    <>
      <ShoppingCart size={18} aria-hidden />
      {ctaLabel}
    </>
  );

  return (
    <div className="card-dark flex flex-col h-full">
      <div className="p-5 sm:p-6 flex-1 flex flex-col">
        <h3 className="font-heading text-lg text-white mb-4 leading-snug">{name}</h3>

        <div className="mb-5 pb-5 border-b border-white/10">
          <p className="text-white text-2xl font-bold font-body">
            {originalPrice && (
              <span className="text-white/50 line-through text-lg font-normal mr-2">
                $ {originalPrice.replace("$", "")}
              </span>
            )}
            <span className="text-primary">$ {price.replace("$", "")}</span>
            <span className="text-sm font-normal text-white/60 ml-1">{period}</span>
          </p>
        </div>

        <ul className="pricing-list flex-1 mb-6">
          {features.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>

        {external ? (
          <a
            href={ctaHref}
            target="_blank"
            rel="noopener noreferrer"
            className={ctaClass}
          >
            {ctaContent}
          </a>
        ) : (
          <Link href={ctaHref} className={ctaClass}>
            {ctaContent}
          </Link>
        )}
      </div>
    </div>
  );
}
