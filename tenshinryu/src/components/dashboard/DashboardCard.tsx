import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
};

export function DashboardCard({
  children,
  className,
  title,
  description,
  action,
}: Props) {
  return (
    <section className={cn("dashboard-card", className)}>
      {(title || action) && (
        <div className="card-title-row">
          <div>
            {title && <h2 className="card-title">{title}</h2>}
            {description && <p className="card-description">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
