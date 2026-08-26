export type StatusFilterItem<T extends string> = {
  value: T;
  label: string;
  count?: number;
  color?: string;
};

type StatusFilterTabsProps<T extends string> = {
  items: readonly StatusFilterItem<T>[];
  value: T;
  onValueChange: (value: T) => void;
  tone?: "dark" | "light";
  className?: string;
};

export function StatusFilterTabs<T extends string>({ items, value, onValueChange, tone = "light", className = "" }: StatusFilterTabsProps<T>) {
  const dark = tone === "dark";
  return (
    <div className={`${dark ? "-mx-4 overflow-x-auto px-4 [scrollbar-width:none]" : "rounded-lg border border-border bg-muted/30 p-1"} ${className}`}>
      <div className={`flex ${dark ? "min-w-max gap-2 pr-4" : "gap-1"}`}>
        {items.map((item) => {
          const active = value === item.value;
          const color = item.color ?? "#0f766e";
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => onValueChange(item.value)}
              className={dark ? "inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold transition-all active:scale-95" : "rounded-md px-3 py-1.5 text-xs font-medium transition-all"}
              style={dark
                ? { color: active ? "#040a16" : color, background: active ? color : `${color}14`, border: `1px solid ${active ? color : `${color}35`}` }
                : { background: active ? "white" : "transparent", color: active ? "#0f172a" : "rgba(0,0,0,0.5)", boxShadow: active ? "0 1px 4px rgba(0,0,0,0.1)" : "none" }}
            >
              {item.label}
              {typeof item.count === "number" && <span className="rounded-full px-1.5 py-0.5 text-[10px]" style={{ background: active ? (dark ? "rgba(4,10,22,0.16)" : "rgba(15,23,42,.08)") : `${color}20` }}>{item.count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
