"use client";

type Tab = { id: string; label: string };

type Props = {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
};

export function TabNav({ tabs, active, onChange }: Props) {
  return (
    <nav
      className="flex gap-1 mb-8 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin"
      aria-label="Sections"
    >
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`shrink-0 px-4 py-2.5 text-sm font-medium rounded-full transition-colors ${
              isActive
                ? "bg-crimson text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-surface"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
