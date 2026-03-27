// frontend/src/components/ui/ToggleGroup.tsx

interface ToggleGroupProps {
  label?: string;
  options: (string | number)[];
  value: string;
  onChange: (v: string) => void;
  formatOption?: (v: string) => string;
  /** Use inline mode (no label, compact) for filter bars */
  inline?: boolean;
}

export function ToggleGroup({
  label,
  options,
  value,
  onChange,
  formatOption,
  inline = false,
}: ToggleGroupProps) {
  const activeClass = "border-foreground bg-foreground text-background";
  const inactiveClass = "border-border bg-background text-muted-foreground hover:border-foreground/30";

  const buttons = (
    <div className="flex gap-0.5">
      {options.map((opt) => {
        const v = String(opt);
        const active = value === v;
        const display = formatOption ? formatOption(v) : v === "0" ? "Studio" : v;
        return (
          <button
            key={v}
            onClick={() => onChange(active ? "" : v)}
            className={`h-9 rounded-sm border px-2.5 text-[11px] font-medium font-body transition-colors ${
              active ? activeClass : inactiveClass
            }`}
          >
            {display}
          </button>
        );
      })}
      <button
        onClick={() => onChange("")}
        className={`h-9 rounded-sm border px-2.5 text-[11px] font-medium font-body transition-colors ${
          value === "" ? activeClass : inactiveClass
        }`}
      >
        Any
      </button>
    </div>
  );

  if (inline || !label) return buttons;

  return (
    <div>
      <p className="mb-1.5 text-[10px] uppercase tracking-[0.15em] text-muted-foreground/60 font-body">
        {label}
      </p>
      {buttons}
    </div>
  );
}
