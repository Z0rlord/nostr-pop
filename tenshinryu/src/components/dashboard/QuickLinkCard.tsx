import Link from "next/link";

type Props = {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  external?: boolean;
};

export function QuickLinkCard({ href, title, description, icon, external }: Props) {
  const className =
    "group dashboard-card-interactive flex flex-col h-full";

  const inner = (
    <>
      <div className="flex items-start justify-between mb-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-container text-crimson">
          {icon}
        </span>
        <span className="text-crimson opacity-0 group-hover:opacity-100 transition-opacity text-lg">
          →
        </span>
      </div>
      <h3 className="font-heading text-lg font-bold mb-1.5 group-hover:text-crimson transition-colors">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed flex-1">
        {description}
      </p>
    </>
  );

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {inner}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {inner}
    </Link>
  );
}
